// =====================================================================
//  FEEDBACK - Retroalimentacion de ciudadanos y personal  (pregunta guia 5)
//  Responsable: Integrante 1
//  POST   /feedback/create       GET /feedbacks
//  GET    /feedback/resumen      DELETE /feedback/delete/:id
// =====================================================================
const express = require("express");
const router = express.Router();
const db = require("../config/db");

// El ciudadano escribe su codigo de expediente (opcional);
// el id del tramite se busca con una subconsulta.
router.post("/feedback/create", (req, res) => {
    const codigo_expediente = req.body.codigo_expediente;
    const tipo_usuario = req.body.tipo_usuario;
    const nombre = req.body.nombre;
    const calificacion = req.body.calificacion;
    const comentario = req.body.comentario;

    db.query(`INSERT INTO feedback(tramite_id,tipo_usuario,nombre,calificacion,comentario)
              VALUES((SELECT id FROM tramite WHERE codigo_expediente=?),?,?,?,?)`,
        [codigo_expediente, tipo_usuario, nombre, calificacion, comentario],
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("No se pudo registrar la opinión: " + err.sqlMessage);
            } else {
                res.send("¡Gracias! Su opinión fue registrada con éxito!!");
            }
        }
    );
});

router.get("/feedbacks", (req, res) => {
    db.query(`SELECT f.*, t.codigo_expediente
              FROM feedback f
              LEFT JOIN tramite t ON t.id = f.tramite_id
              ORDER BY f.fecha DESC`,
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

router.get("/feedback/resumen", (req, res) => {
    db.query(`SELECT tipo_usuario, COUNT(*) AS total, ROUND(AVG(calificacion),1) AS promedio
              FROM feedback
              GROUP BY tipo_usuario`,
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

router.delete("/feedback/delete/:id", (req, res) => {
    const id = req.params.id;

    db.query('DELETE FROM feedback WHERE id=?', id,
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

module.exports = router;
