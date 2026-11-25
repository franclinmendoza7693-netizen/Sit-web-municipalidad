// =====================================================================
//  SISTEMA DE ALERTAS AL CIUDADANO  (tabla: notificacion)
//  Responsable: Integrante 3
//  POST   /notificacion/create        -> alerta manual del personal
//  GET    /notificaciones             -> bandeja de alertas enviadas
//  GET    /notificacion/tramites      -> lista de expedientes para el combo
//  PUT    /notificacion/leido/:id     -> marcar como leida
//  DELETE /notificacion/delete/:id    -> eliminar
//  GET    /consulta/:codigo/:dni      -> CONSULTA PUBLICA del ciudadano
//  PUT    /consulta/leido             -> el ciudadano marca sus alertas como leidas
//
//  Proteccion de datos (Ley 29733): la consulta publica exige CODIGO + DNI
//  y devuelve el nombre del ciudadano parcialmente oculto.
// =====================================================================
const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Simula el envio por correo o SMS (en produccion se conectaria un proveedor)
function simularEnvio(canal, destino, mensaje) {
    console.log("[ENVIO " + canal + "] a " + (destino || "bandeja del sistema") + ": " + mensaje);
}

router.post("/notificacion/create", (req, res) => {
    const tramite_id = req.body.tramite_id;
    const titulo = req.body.titulo;
    const mensaje = req.body.mensaje;
    const canal = req.body.canal;

    if (!tramite_id || !titulo || !mensaje) {
        return res.status(400).send("Expediente, título y mensaje son obligatorios.");
    }

    db.query(`INSERT INTO notificacion(tramite_id,ciudadano_id,titulo,mensaje,canal)
              SELECT id, ciudadano_id, ?, ?, ? FROM tramite WHERE id=?`,
        [titulo, mensaje, canal, tramite_id],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send("No se pudo enviar la alerta: " + err.sqlMessage);
            }
            db.query('SELECT c.correo, c.telefono FROM tramite t INNER JOIN ciudadano c ON c.id=t.ciudadano_id WHERE t.id=?', tramite_id,
                (err2, datos) => {
                    if (!err2 && datos.length > 0) {
                        simularEnvio(canal, canal === "SMS" ? datos[0].telefono : datos[0].correo, mensaje);
                    }
                    res.send("Alerta enviada con éxito!!");
                }
            );
        }
    );
});

router.get("/notificaciones", (req, res) => {
    db.query(`SELECT n.*, t.codigo_expediente, t.estado,
                     CONCAT(c.nombres,' ',c.apellidos) AS ciudadano, c.correo, c.telefono
              FROM notificacion n
              INNER JOIN tramite t ON t.id = n.tramite_id
              INNER JOIN ciudadano c ON c.id = n.ciudadano_id
              ORDER BY n.fecha_envio DESC, n.id DESC`,
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

router.get("/notificacion/tramites", (req, res) => {
    db.query(`SELECT t.id, t.codigo_expediente, t.estado, CONCAT(c.nombres,' ',c.apellidos) AS ciudadano
              FROM tramite t INNER JOIN ciudadano c ON c.id = t.ciudadano_id
              ORDER BY t.id DESC`,
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

router.put("/notificacion/leido/:id", (req, res) => {
    const id = req.params.id;

    db.query('UPDATE notificacion SET leido=1 WHERE id=?', id,
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send(err.sqlMessage);
            } else {
                res.send("Notificación marcada como leída");
            }
        }
    );
});

router.delete("/notificacion/delete/:id", (req, res) => {
    const id = req.params.id;

    db.query('DELETE FROM notificacion WHERE id=?', id,
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
// CONSULTA PUBLICA: el ciudadano ve su tramite, historial y alertas
// ---------------------------------------------------------------------
router.get("/consulta/:codigo/:dni", (req, res) => {
    const codigo = req.params.codigo;
    const dni = req.params.dni;

    db.query(`SELECT t.id, t.codigo_expediente, t.asunto, t.estado, t.prioridad, t.fecha_registro, t.fecha_limite,
                     t.fecha_actualizacion, DATEDIFF(t.fecha_limite, CURDATE()) AS dias_restantes,
                     c.nombres, LEFT(c.apellidos,1) AS inicial_apellido,
                     tt.nombre AS tipo_tramite, a.nombre AS area
              FROM tramite t
              INNER JOIN ciudadano c ON c.id = t.ciudadano_id
              INNER JOIN tipo_tramite tt ON tt.id = t.tipo_tramite_id
              INNER JOIN area a ON a.id = tt.area_id
              WHERE t.codigo_expediente=? AND c.dni=?`,
        [codigo, dni],
        (err, tramite) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err.sqlMessage);
            }
            if (tramite.length === 0) {
                return res.status(404).send("No existe un expediente con ese código y DNI.");
            }
            const t = tramite[0];
            db.query('SELECT estado_anterior, estado_nuevo, observacion, fecha FROM seguimiento_tramite WHERE tramite_id=? ORDER BY fecha, id', t.id,
                (err2, seguimiento) => {
                    if (err2) {
                        console.log(err2);
                        return res.status(500).send(err2.sqlMessage);
                    }
                    db.query('SELECT id, titulo, mensaje, canal, leido, fecha_envio FROM notificacion WHERE tramite_id=? ORDER BY fecha_envio DESC, id DESC', t.id,
                        (err3, notificaciones) => {
                            if (err3) {
                                console.log(err3);
                                return res.status(500).send(err3.sqlMessage);
                            }
                            res.send({ tramite: t, seguimiento: seguimiento, notificaciones: notificaciones });
                        }
                    );
                }
            );
        }
    );
});

router.put("/consulta/leido", (req, res) => {
    const tramite_id = req.body.tramite_id;

    db.query('UPDATE notificacion SET leido=1 WHERE tramite_id=?', tramite_id,
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send(err.sqlMessage);
            } else {
                res.send("Notificaciones marcadas como leídas");
            }
        }
    );
});

module.exports = router;
