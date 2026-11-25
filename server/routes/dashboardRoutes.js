// =====================================================================
//  DASHBOARD - Analisis de datos y cuellos de botella   Responsable: Integrante 1
//  GET /dashboard/indicadores  -> tarjetas principales (KPI)
//  GET /dashboard/estados      -> tramites por estado
//  GET /dashboard/areas        -> cuellos de botella por area
//  GET /dashboard/prioridades  -> pendientes por prioridad (ML)
//  GET /dashboard/tipos        -> tramites que mas demoran (pregunta guia 1)
// =====================================================================
const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Un tramite esta "pendiente" mientras no llegue a un estado final
const PENDIENTE = "t.estado NOT IN ('APROBADO','RECHAZADO','FINALIZADO')";

router.get("/dashboard/indicadores", (req, res) => {
    db.query(`SELECT
                (SELECT COUNT(*) FROM tramite) AS total,
                (SELECT COUNT(*) FROM tramite t WHERE ${PENDIENTE}) AS pendientes,
                (SELECT COUNT(*) FROM tramite t WHERE ${PENDIENTE} AND t.fecha_limite < CURDATE()) AS vencidos,
                (SELECT COUNT(*) FROM tramite t WHERE ${PENDIENTE} AND t.prioridad = 'ALTA') AS criticos,
                (SELECT COUNT(*) FROM tramite t WHERE t.estado IN ('APROBADO','FINALIZADO')) AS atendidos,
                (SELECT ROUND(AVG(calificacion),1) FROM feedback) AS satisfaccion,
                (SELECT COUNT(*) FROM ciudadano) AS ciudadanos`,
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send(err.sqlMessage);
            } else {
                res.send(result[0]);
            }
        }
    );
});

router.get("/dashboard/estados", (req, res) => {
    db.query('SELECT estado, COUNT(*) AS total FROM tramite GROUP BY estado ORDER BY total DESC',
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

router.get("/dashboard/areas", (req, res) => {
    db.query(`SELECT a.id, a.nombre AS area, a.sigla,
                     COUNT(t.id) AS total,
                     COALESCE(SUM(${PENDIENTE}),0) AS pendientes,
                     COALESCE(SUM(${PENDIENTE} AND t.fecha_limite < CURDATE()),0) AS vencidos,
                     ROUND(AVG(DATEDIFF(COALESCE(t.fecha_actualizacion, NOW()), t.fecha_registro)),1) AS promedio_dias
              FROM area a
              LEFT JOIN tipo_tramite tt ON tt.area_id = a.id
              LEFT JOIN tramite t ON t.tipo_tramite_id = tt.id
              GROUP BY a.id, a.nombre, a.sigla
              ORDER BY vencidos DESC, pendientes DESC, total DESC`,
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

router.get("/dashboard/prioridades", (req, res) => {
    db.query(`SELECT t.prioridad, COUNT(*) AS total
              FROM tramite t
              WHERE ${PENDIENTE}
              GROUP BY t.prioridad`,
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

router.get("/dashboard/tipos", (req, res) => {
    db.query(`SELECT tt.nombre AS tipo, tt.plazo_dias, COUNT(t.id) AS total,
                     ROUND(AVG(DATEDIFF(COALESCE(t.fecha_actualizacion, NOW()), t.fecha_registro)),1) AS promedio_dias,
                     COALESCE(SUM(t.fecha_limite < CURDATE() AND ${PENDIENTE}),0) AS vencidos
              FROM tipo_tramite tt
              INNER JOIN tramite t ON t.tipo_tramite_id = tt.id
              GROUP BY tt.id, tt.nombre, tt.plazo_dias
              ORDER BY vencidos DESC, promedio_dias DESC
              LIMIT 6`,
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
