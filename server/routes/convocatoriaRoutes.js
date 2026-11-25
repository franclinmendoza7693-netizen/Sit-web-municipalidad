// =====================================================================
//  CRUD CONVOCATORIA  (tabla: convocatoria)      Responsable: Integrante 3
//  POST   /convocatoria/create    GET /convocatorias
//  PUT    /convocatoria/update    DELETE /convocatoria/delete/:id
// =====================================================================
const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.post("/convocatoria/create", (req, res) => {
    const area_id = req.body.area_id;
    const codigo = req.body.codigo;
    const titulo = req.body.titulo;
    const perfil_requerido = req.body.perfil_requerido;
    const experiencia_minima = req.body.experiencia_minima;
    const vacantes = req.body.vacantes;
    const fecha_inicio = req.body.fecha_inicio;
    const fecha_fin = req.body.fecha_fin;
    const estado = req.body.estado;

    db.query(`INSERT INTO convocatoria(area_id,codigo,titulo,perfil_requerido,experiencia_minima,vacantes,fecha_inicio,fecha_fin,estado)
              VALUES(?,?,?,?,?,?,?,?,?)`,
        [area_id, codigo, titulo, perfil_requerido, experiencia_minima, vacantes, fecha_inicio, fecha_fin, estado],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === "ER_DUP_ENTRY") {
                    res.status(500).send("Ya existe una convocatoria con el código " + codigo);
                } else {
                    res.status(500).send("No se pudo registrar la convocatoria: " + err.sqlMessage);
                }
            } else {
                res.send("Convocatoria registrada con éxito!!");
            }
        }
    );
});

router.get("/convocatorias", (req, res) => {
    db.query(`SELECT cv.*, a.nombre AS area,
                     (SELECT COUNT(*) FROM postulante p WHERE p.convocatoria_id = cv.id) AS postulantes
              FROM convocatoria cv
              INNER JOIN area a ON a.id = cv.area_id
              ORDER BY cv.fecha_inicio DESC, cv.id DESC`,
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

router.put("/convocatoria/update", (req, res) => {
    const id = req.body.id;
    const area_id = req.body.area_id;
    const codigo = req.body.codigo;
    const titulo = req.body.titulo;
    const perfil_requerido = req.body.perfil_requerido;
    const experiencia_minima = req.body.experiencia_minima;
    const vacantes = req.body.vacantes;
    const fecha_inicio = req.body.fecha_inicio;
    const fecha_fin = req.body.fecha_fin;
    const estado = req.body.estado;

    db.query(`UPDATE convocatoria SET area_id=?, codigo=?, titulo=?, perfil_requerido=?, experiencia_minima=?, vacantes=?,
              fecha_inicio=?, fecha_fin=?, estado=? WHERE id=?`,
        [area_id, codigo, titulo, perfil_requerido, experiencia_minima, vacantes, fecha_inicio, fecha_fin, estado, id],
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("No se pudo actualizar: " + err.sqlMessage);
            } else {
                res.send("Convocatoria actualizada con éxito!!");
            }
        }
    );
});

router.delete("/convocatoria/delete/:id", (req, res) => {
    const id = req.params.id;

    db.query('DELETE FROM convocatoria WHERE id=?', id,
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("No se pudo eliminar: " + err.sqlMessage);
            } else {
                res.send(result);
            }
        }
    );
});

module.exports = router;
