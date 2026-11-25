// =====================================================================
//  RUTAS DEL MODELO DE MACHINE LEARNING          Responsable: Integrante 2
//  POST /ml/entrenar     -> entrena con historico_tramite y guarda metricas
//  GET  /ml/evaluacion   -> metricas + matriz de confusion
//  GET  /ml/modelos      -> historial de entrenamientos (tabla modelo_ml)
//  GET  /ml/dataset      -> resumen del dataset por clase
//  POST /ml/predecir     -> simulador: predice la prioridad de un caso
//  POST /ml/repriorizar  -> recalcula la prioridad de TODOS los pendientes
// =====================================================================
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const ml = require("../ml/priorizadorNaiveBayes");

router.post("/ml/entrenar", (req, res) => {
    ml.entrenarDesdeBD((err, evaluacion) => {
        if (err) {
            console.log(err);
            res.status(500).send("No se pudo entrenar el modelo: " + err.message);
        } else {
            res.send(evaluacion);
        }
    });
});

router.get("/ml/evaluacion", (req, res) => {
    ml.obtenerEvaluacion((err, evaluacion) => {
        if (err) {
            console.log(err);
            res.status(500).send(err.message);
        } else {
            res.send(evaluacion);
        }
    });
});

router.get("/ml/modelos", (req, res) => {
    db.query('SELECT * FROM modelo_ml ORDER BY fecha_entrenamiento DESC, id DESC LIMIT 10',
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

router.get("/ml/dataset", (req, res) => {
    db.query('SELECT prioridad_real, COUNT(*) AS total FROM historico_tramite GROUP BY prioridad_real',
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

router.post("/ml/predecir", (req, res) => {
    const ejemplo = {
        tipo_tramite_id: req.body.tipo_tramite_id,
        canal: req.body.canal,
        es_vulnerable: req.body.es_vulnerable ? 1 : 0,
        documentos_completos: req.body.documentos_completos ? 1 : 0,
        situacion_plazo: req.body.situacion_plazo
    };

    ml.obtenerModelo((err, modelo) => {
        if (err) {
            console.log(err);
            res.status(500).send(err.message);
        } else {
            res.send(ml.predecir(modelo, ejemplo));
        }
    });
});

// Recorre los tramites pendientes y actualiza su prioridad segun los dias que faltan
// (respeta los que el personal corrigio a mano: prioridad_manual = 1)
router.post("/ml/repriorizar", (req, res) => {
    db.query(`SELECT t.id, t.tipo_tramite_id, t.canal, t.documentos_completos, c.es_vulnerable, tt.plazo_dias,
                     DATEDIFF(t.fecha_limite, CURDATE()) AS dias_restantes
              FROM tramite t
              INNER JOIN ciudadano c ON c.id = t.ciudadano_id
              INNER JOIN tipo_tramite tt ON tt.id = t.tipo_tramite_id
              WHERE t.estado NOT IN ('APROBADO','RECHAZADO','FINALIZADO')
                AND t.prioridad_manual = 0`,
        (err, pendientes) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err.sqlMessage);
            }
            if (pendientes.length === 0) {
                return res.send({ mensaje: "No hay trámites pendientes.", actualizados: 0 });
            }
            ml.obtenerModelo((errML, modelo) => {
                if (errML) {
                    console.log(errML);
                    return res.status(500).send(errML.message);
                }
                let terminados = 0;
                let altas = 0;
                pendientes.forEach((t) => {
                    const r = ml.predecir(modelo, {
                        tipo_tramite_id: t.tipo_tramite_id,
                        canal: t.canal,
                        es_vulnerable: t.es_vulnerable,
                        documentos_completos: t.documentos_completos,
                        situacion_plazo: ml.calcularSituacionPlazo(t.dias_restantes, t.plazo_dias)
                    });
                    if (r.prioridad === "ALTA") altas++;
                    db.query('UPDATE tramite SET prioridad=?, puntaje_prioridad=? WHERE id=?', [r.prioridad, r.puntaje, t.id], (err2) => {
                        if (err2) console.log(err2);
                        terminados++;
                        if (terminados === pendientes.length) {
                            res.send({ mensaje: "Prioridades recalculadas con éxito!!", actualizados: terminados, criticos: altas });
                        }
                    });
                });
            });
        }
    );
});

module.exports = router;
