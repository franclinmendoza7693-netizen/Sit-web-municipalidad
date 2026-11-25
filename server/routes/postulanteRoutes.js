// =====================================================================
//  POSTULANTES + EVALUACION DE CURRICULOS CON MACHINE LEARNING
//  (tablas: postulante, evaluacion_curriculum)    Responsable: Integrante 3
//  POST   /postulante/create             GET /postulantes/:convocatoria_id
//  PUT    /postulante/update             DELETE /postulante/delete/:id
//  POST   /curriculos/evaluar/:convocatoria_id  -> TF-IDF + coseno y guarda ranking
// =====================================================================
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const evaluador = require("../ml/evaluadorCurriculos");

router.post("/postulante/create", (req, res) => {
    const convocatoria_id = req.body.convocatoria_id;
    const dni = req.body.dni;
    const nombres = req.body.nombres;
    const apellidos = req.body.apellidos;
    const correo = req.body.correo;
    const telefono = req.body.telefono;
    const grado_academico = req.body.grado_academico;
    const anios_experiencia = req.body.anios_experiencia;
    const curriculum_texto = req.body.curriculum_texto;

    db.query(`INSERT INTO postulante(convocatoria_id,dni,nombres,apellidos,correo,telefono,grado_academico,anios_experiencia,curriculum_texto)
              VALUES(?,?,?,?,?,?,?,?,?)`,
        [convocatoria_id, dni, nombres, apellidos, correo, telefono, grado_academico, anios_experiencia, curriculum_texto],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === "ER_DUP_ENTRY") {
                    res.status(500).send("El DNI " + dni + " ya postuló a esta convocatoria.");
                } else {
                    res.status(500).send("No se pudo registrar el postulante: " + err.sqlMessage);
                }
            } else {
                res.send("Postulante registrado con éxito!!");
            }
        }
    );
});

// Lista los postulantes con su evaluacion (si ya fue evaluado) ordenados por puntaje
router.get("/postulantes/:convocatoria_id", (req, res) => {
    const convocatoria_id = req.params.convocatoria_id;

    db.query(`SELECT p.*, ev.puntaje_similitud, ev.puntaje_experiencia, ev.puntaje_grado, ev.puntaje_total,
                     ev.resultado, ev.palabras_coincidentes, ev.fecha_evaluacion
              FROM postulante p
              LEFT JOIN evaluacion_curriculum ev ON ev.postulante_id = p.id
              WHERE p.convocatoria_id=?
              ORDER BY ev.puntaje_total DESC, p.apellidos ASC`, convocatoria_id,
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send(err.sqlMessage);
            } else {
                res.send(result);
            }
        }
    );
});

router.put("/postulante/update", (req, res) => {
    const id = req.body.id;
    const dni = req.body.dni;
    const nombres = req.body.nombres;
    const apellidos = req.body.apellidos;
    const correo = req.body.correo;
    const telefono = req.body.telefono;
    const grado_academico = req.body.grado_academico;
    const anios_experiencia = req.body.anios_experiencia;
    const curriculum_texto = req.body.curriculum_texto;

    db.query(`UPDATE postulante SET dni=?, nombres=?, apellidos=?, correo=?, telefono=?, grado_academico=?,
              anios_experiencia=?, curriculum_texto=? WHERE id=?`,
        [dni, nombres, apellidos, correo, telefono, grado_academico, anios_experiencia, curriculum_texto, id],
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("No se pudo actualizar: " + err.sqlMessage);
            } else {
                // Si el CV cambio, la evaluacion anterior ya no es valida
                db.query('DELETE FROM evaluacion_curriculum WHERE postulante_id=?', id, () => {
                    res.send("Postulante actualizado con éxito!! Vuelva a evaluar los CV.");
                });
            }
        }
    );
});

router.delete("/postulante/delete/:id", (req, res) => {
    const id = req.params.id;

    db.query('DELETE FROM postulante WHERE id=?', id,
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send(err.sqlMessage);
            } else {
                res.send(result);
            }
        }
    );
});

// ---------------------------------------------------------------------
// EVALUAR CURRICULOS: ejecuta el modelo y guarda el resultado de cada uno
// ---------------------------------------------------------------------
router.post("/curriculos/evaluar/:convocatoria_id", (req, res) => {
    const convocatoria_id = req.params.convocatoria_id;

    db.query('SELECT * FROM convocatoria WHERE id=?', convocatoria_id, (err, convocatoria) => {
        if (err || convocatoria.length === 0) {
            console.log(err);
            return res.status(404).send("No se encontró la convocatoria.");
        }
        db.query('SELECT * FROM postulante WHERE convocatoria_id=?', convocatoria_id, (err2, postulantes) => {
            if (err2) {
                console.log(err2);
                return res.status(500).send(err2.sqlMessage);
            }
            if (postulantes.length === 0) {
                return res.status(400).send("La convocatoria aún no tiene postulantes.");
            }

            const ranking = evaluador.evaluarPostulantes(convocatoria[0], postulantes);
            let guardados = 0;

            ranking.forEach((r) => {
                // Si ya tenia evaluacion, se actualiza (ON DUPLICATE KEY UPDATE)
                db.query(`INSERT INTO evaluacion_curriculum(postulante_id,puntaje_similitud,puntaje_experiencia,puntaje_grado,puntaje_total,resultado,palabras_coincidentes)
                          VALUES(?,?,?,?,?,?,?)
                          ON DUPLICATE KEY UPDATE puntaje_similitud=VALUES(puntaje_similitud), puntaje_experiencia=VALUES(puntaje_experiencia),
                          puntaje_grado=VALUES(puntaje_grado), puntaje_total=VALUES(puntaje_total), resultado=VALUES(resultado),
                          palabras_coincidentes=VALUES(palabras_coincidentes), fecha_evaluacion=NOW()`,
                    [r.postulante_id, r.puntaje_similitud, r.puntaje_experiencia, r.puntaje_grado, r.puntaje_total, r.resultado, r.palabras_coincidentes],
                    (err3) => {
                        if (err3) console.log(err3);
                        guardados++;
                        if (guardados === ranking.length) {
                            const aptos = ranking.filter((x) => x.resultado === "APTO").length;
                            res.send({ mensaje: "Currículos evaluados con éxito!!", evaluados: ranking.length, aptos: aptos, ranking: ranking });
                        }
                    }
                );
            });
        });
    });
});

module.exports = router;
