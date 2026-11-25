// =====================================================================
//  GESTION DE TRAMITES (tablas: tramite, seguimiento_tramite)
//  Responsable: Integrante 2
//  POST   /tramite/create           -> registra y PRIORIZA con Machine Learning
//  GET    /tramites                 -> bandeja ordenada por prioridad
//  PUT    /tramite/update           -> edita y vuelve a priorizar
//  PUT    /tramite/estado           -> cambia estado + seguimiento + alerta
//  PUT    /tramite/prioridad        -> correccion manual (re-entrena el dataset)
//  GET    /tramite/seguimiento/:id  -> historial del expediente
//  DELETE /tramite/delete/:id       -> elimina
// =====================================================================
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const ml = require("../ml/priorizadorNaiveBayes");

const ESTADOS = ["REGISTRADO", "EN_REVISION", "OBSERVADO", "APROBADO", "RECHAZADO", "FINALIZADO"];

// Texto que ve el ciudadano para cada estado
const ETIQUETAS = {
    REGISTRADO: "registrado",
    EN_REVISION: "en revisión",
    OBSERVADO: "observado",
    APROBADO: "aprobado",
    RECHAZADO: "rechazado",
    FINALIZADO: "finalizado"
};

// ---------------------------------------------------------------------
// Funciones de apoyo
// ---------------------------------------------------------------------
function registrarSeguimiento(tramite_id, empleado_id, estado_anterior, estado_nuevo, observacion) {
    db.query('INSERT INTO seguimiento_tramite(tramite_id,empleado_id,estado_anterior,estado_nuevo,observacion) VALUES(?,?,?,?,?)',
        [tramite_id, empleado_id || null, estado_anterior, estado_nuevo, observacion],
        (err) => {
            if (err) console.log(err);
        }
    );
}

// Inserta la ALERTA para el ciudadano (el Integrante 3 la muestra en su modulo).
// El canal se elige segun los datos de contacto del ciudadano.
function registrarNotificacion(tramite_id, titulo, mensaje) {
    db.query(`INSERT INTO notificacion(tramite_id,ciudadano_id,titulo,mensaje,canal)
              SELECT t.id, c.id, ?, ?,
                     CASE WHEN c.correo IS NOT NULL AND c.correo <> '' THEN 'CORREO'
                          WHEN c.telefono IS NOT NULL AND c.telefono <> '' THEN 'SMS'
                          ELSE 'SISTEMA' END
              FROM tramite t INNER JOIN ciudadano c ON c.id = t.ciudadano_id
              WHERE t.id = ?`,
        [titulo, mensaje, tramite_id],
        (err) => {
            if (err) {
                console.log(err);
            } else {
                console.log("[ALERTA] " + titulo + " -> " + mensaje);
            }
        }
    );
}

// ---------------------------------------------------------------------
// REGISTRAR TRAMITE + PRIORIDAD CON MACHINE LEARNING
// ---------------------------------------------------------------------
router.post("/tramite/create", (req, res) => {
    const ciudadano_id = req.body.ciudadano_id;
    const tipo_tramite_id = req.body.tipo_tramite_id;
    const empleado_id = req.body.empleado_id || null;
    const asunto = req.body.asunto;
    const descripcion = req.body.descripcion;
    const folios = req.body.folios;
    const canal = req.body.canal;
    const documentos_completos = req.body.documentos_completos ? 1 : 0;

    if (!ciudadano_id || !tipo_tramite_id || !asunto) {
        return res.status(400).send("Ciudadano, tipo de trámite y asunto son obligatorios.");
    }

    // 1) Datos que necesita el modelo: plazo del tramite y si el ciudadano es vulnerable
    db.query('SELECT tt.plazo_dias, c.es_vulnerable FROM tipo_tramite tt, ciudadano c WHERE tt.id=? AND c.id=?',
        [tipo_tramite_id, ciudadano_id],
        (err, datos) => {
            if (err || datos.length === 0) {
                console.log(err);
                return res.status(500).send("No se encontró el tipo de trámite o el ciudadano.");
            }
            const plazo_dias = datos[0].plazo_dias;

            // 2) Prediccion con Naive Bayes
            ml.obtenerModelo((errML, modelo) => {
                if (errML) {
                    console.log(errML);
                    return res.status(500).send("No se pudo cargar el modelo de Machine Learning.");
                }
                const resultado = ml.predecir(modelo, {
                    tipo_tramite_id: tipo_tramite_id,
                    canal: canal,
                    es_vulnerable: datos[0].es_vulnerable,
                    documentos_completos: documentos_completos,
                    situacion_plazo: "A_TIEMPO"
                });

                // 3) Guardar el tramite
                db.query(`INSERT INTO tramite(ciudadano_id,tipo_tramite_id,empleado_id,asunto,descripcion,folios,canal,documentos_completos,prioridad,puntaje_prioridad,fecha_limite)
                          VALUES(?,?,?,?,?,?,?,?,?,?, CURDATE() + INTERVAL ? DAY)`,
                    [ciudadano_id, tipo_tramite_id, empleado_id, asunto, descripcion, folios, canal, documentos_completos,
                        resultado.prioridad, resultado.puntaje, plazo_dias],
                    (err2, result) => {
                        if (err2) {
                            console.log(err2);
                            return res.status(500).send("No se pudo registrar el trámite: " + err2.sqlMessage);
                        }
                        const id = result.insertId;
                        const codigo = "EXP-" + new Date().getFullYear() + "-" + String(id).padStart(6, "0");

                        // 4) Codigo de expediente, seguimiento y alerta
                        db.query('UPDATE tramite SET codigo_expediente=? WHERE id=?', [codigo, id], (err3) => {
                            if (err3) {
                                console.log(err3);
                                return res.status(500).send(err3.sqlMessage);
                            }
                            // Queda registrado QUIEN lo registro (usuario con sesion iniciada)
                            registrarSeguimiento(id, req.usuario.empleado_id || empleado_id, null, "REGISTRADO", "Expediente registrado en mesa de partes");
                            registrarNotificacion(id, "Trámite registrado",
                                "Su expediente " + codigo + " fue registrado. Plazo de atención: " + plazo_dias + (plazo_dias === 1 ? " día." : " días."));
                            res.send({
                                mensaje: "Trámite registrado con éxito!!",
                                codigo: codigo,
                                prioridad: resultado.prioridad,
                                puntaje: resultado.puntaje,
                                probabilidades: resultado.probabilidades
                            });
                        });
                    }
                );
            });
        }
    );
});

// ---------------------------------------------------------------------
// LISTAR (bandeja): primero pendientes, luego por puntaje de prioridad
// ---------------------------------------------------------------------
router.get("/tramites", (req, res) => {
    db.query(`SELECT t.*,
                     CONCAT(c.nombres,' ',c.apellidos) AS ciudadano, c.dni, c.es_vulnerable,
                     tt.nombre AS tipo_tramite, tt.plazo_dias,
                     a.nombre AS area, a.sigla,
                     CONCAT(e.nombres,' ',e.apellidos) AS responsable,
                     DATEDIFF(t.fecha_limite, CURDATE()) AS dias_restantes
              FROM tramite t
              INNER JOIN ciudadano c ON c.id = t.ciudadano_id
              INNER JOIN tipo_tramite tt ON tt.id = t.tipo_tramite_id
              INNER JOIN area a ON a.id = tt.area_id
              LEFT JOIN empleado e ON e.id = t.empleado_id
              ORDER BY (t.estado IN ('APROBADO','RECHAZADO','FINALIZADO')) ASC,
                       t.puntaje_prioridad DESC, t.fecha_limite ASC`,
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
// ACTUALIZAR datos del tramite y volver a calcular la prioridad
// ---------------------------------------------------------------------
router.put("/tramite/update", (req, res) => {
    const id = req.body.id;
    const ciudadano_id = req.body.ciudadano_id;
    const tipo_tramite_id = req.body.tipo_tramite_id;
    const empleado_id = req.body.empleado_id || null;
    const asunto = req.body.asunto;
    const descripcion = req.body.descripcion;
    const folios = req.body.folios;
    const canal = req.body.canal;
    const documentos_completos = req.body.documentos_completos ? 1 : 0;

    db.query(`SELECT tt.plazo_dias, c.es_vulnerable,
                     DATEDIFF(DATE(t.fecha_registro) + INTERVAL tt.plazo_dias DAY, CURDATE()) AS dias_restantes
              FROM tramite t, tipo_tramite tt, ciudadano c
              WHERE t.id=? AND tt.id=? AND c.id=?`,
        [id, tipo_tramite_id, ciudadano_id],
        (err, datos) => {
            if (err || datos.length === 0) {
                console.log(err);
                return res.status(500).send("No se encontró el trámite.");
            }
            ml.obtenerModelo((errML, modelo) => {
                if (errML) {
                    console.log(errML);
                    return res.status(500).send("No se pudo cargar el modelo de Machine Learning.");
                }
                const resultado = ml.predecir(modelo, {
                    tipo_tramite_id: tipo_tramite_id,
                    canal: canal,
                    es_vulnerable: datos[0].es_vulnerable,
                    documentos_completos: documentos_completos,
                    situacion_plazo: ml.calcularSituacionPlazo(datos[0].dias_restantes, datos[0].plazo_dias)
                });

                db.query(`UPDATE tramite SET ciudadano_id=?, tipo_tramite_id=?, empleado_id=?, asunto=?, descripcion=?, folios=?, canal=?,
                          documentos_completos=?, prioridad=?, puntaje_prioridad=?, prioridad_manual=0,
                          fecha_limite = DATE(fecha_registro) + INTERVAL ? DAY, fecha_actualizacion=NOW()
                          WHERE id=?`,
                    [ciudadano_id, tipo_tramite_id, empleado_id, asunto, descripcion, folios, canal,
                        documentos_completos, resultado.prioridad, resultado.puntaje, datos[0].plazo_dias, id],
                    (err2) => {
                        if (err2) {
                            console.log(err2);
                            res.status(500).send("No se pudo actualizar: " + err2.sqlMessage);
                        } else {
                            res.send({ mensaje: "Trámite actualizado con éxito!!", prioridad: resultado.prioridad, puntaje: resultado.puntaje });
                        }
                    }
                );
            });
        }
    );
});

// ---------------------------------------------------------------------
// CAMBIAR ESTADO -> guarda seguimiento y notifica al ciudadano
// ---------------------------------------------------------------------
router.put("/tramite/estado", (req, res) => {
    const id = req.body.id;
    const estado = req.body.estado;
    const observacion = req.body.observacion;
    // Trazabilidad: el cambio se atribuye al empleado que inicio sesion
    const empleado_id = req.usuario.empleado_id || req.body.empleado_id || null;

    if (ESTADOS.indexOf(estado) === -1) {
        return res.status(400).send("Estado no válido.");
    }

    db.query('SELECT estado, codigo_expediente FROM tramite WHERE id=?', id, (err, actual) => {
        if (err || actual.length === 0) {
            console.log(err);
            return res.status(500).send("No se encontró el trámite.");
        }
        const anterior = actual[0].estado;
        const codigo = actual[0].codigo_expediente;

        db.query('UPDATE tramite SET estado=?, fecha_actualizacion=NOW() WHERE id=?', [estado, id], (err2) => {
            if (err2) {
                console.log(err2);
                return res.status(500).send(err2.sqlMessage);
            }
            registrarSeguimiento(id, empleado_id, anterior, estado, observacion);

            const mensajes = {
                REGISTRADO: "fue registrado nuevamente.",
                EN_REVISION: "está en revisión en el área responsable.",
                OBSERVADO: "fue observado. Motivo: " + (observacion || "revise los requisitos") + ". Subsane para continuar.",
                APROBADO: "fue aprobado.",
                RECHAZADO: "fue rechazado. Motivo: " + (observacion || "no cumple los requisitos") + ".",
                FINALIZADO: "fue finalizado. Puede recoger su documento."
            };
            registrarNotificacion(id, "Trámite " + ETIQUETAS[estado],
                ("Su expediente " + codigo + " " + mensajes[estado]).substring(0, 255));

            res.send("Estado actualizado a " + ETIQUETAS[estado] + " y ciudadano notificado!!");
        });
    });
});

// ---------------------------------------------------------------------
// CORRECCION MANUAL DE PRIORIDAD (retroalimentacion del personal)
// El caso corregido se agrega a historico_tramite -> el modelo aprende.
// ---------------------------------------------------------------------
router.put("/tramite/prioridad", (req, res) => {
    const id = req.body.id;
    const prioridad = req.body.prioridad;
    const puntajes = { ALTA: 100, MEDIA: 50, BAJA: 0 };

    if (puntajes[prioridad] === undefined) {
        return res.status(400).send("Prioridad no válida.");
    }

    db.query(`SELECT t.tipo_tramite_id, t.canal, t.documentos_completos, c.es_vulnerable, tt.plazo_dias,
                     DATEDIFF(t.fecha_limite, CURDATE()) AS dias_restantes
              FROM tramite t
              INNER JOIN ciudadano c ON c.id = t.ciudadano_id
              INNER JOIN tipo_tramite tt ON tt.id = t.tipo_tramite_id
              WHERE t.id=?`, id, (err, datos) => {
        if (err || datos.length === 0) {
            console.log(err);
            return res.status(500).send("No se encontró el trámite.");
        }
        const d = datos[0];
        db.query('UPDATE tramite SET prioridad=?, puntaje_prioridad=?, prioridad_manual=1, fecha_actualizacion=NOW() WHERE id=?',
            [prioridad, puntajes[prioridad], id], (err2) => {
                if (err2) {
                    console.log(err2);
                    return res.status(500).send(err2.sqlMessage);
                }
                db.query(`INSERT INTO historico_tramite(tipo_tramite_id,canal,es_vulnerable,documentos_completos,situacion_plazo,prioridad_real)
                          VALUES(?,?,?,?,?,?)`,
                    [d.tipo_tramite_id, d.canal, d.es_vulnerable, d.documentos_completos,
                        ml.calcularSituacionPlazo(d.dias_restantes, d.plazo_dias), prioridad],
                    (err3) => {
                        if (err3) {
                            console.log(err3);
                            return res.status(500).send(err3.sqlMessage);
                        }
                        res.send("Prioridad corregida a " + prioridad + ". El caso se agrego al dataset para el próximo entrenamiento.");
                    }
                );
            });
    });
});

router.get("/tramite/seguimiento/:id", (req, res) => {
    const id = req.params.id;

    db.query(`SELECT s.*, CONCAT(e.nombres,' ',e.apellidos) AS empleado
              FROM seguimiento_tramite s
              LEFT JOIN empleado e ON e.id = s.empleado_id
              WHERE s.tramite_id=?
              ORDER BY s.fecha ASC, s.id ASC`, id,
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

router.delete("/tramite/delete/:id", (req, res) => {
    const id = req.params.id;

    db.query('DELETE FROM tramite WHERE id=?', id,
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("No se pudo eliminar el trámite: " + err.sqlMessage);
            } else {
                res.send(result);
            }
        }
    );
});

module.exports = router;
