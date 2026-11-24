// =====================================================================
//  INICIO DE SESION                             Responsable: Integrante 1
//  POST /login    -> { identificador (correo o usuario), password }
//  GET  /sesion   -> datos del usuario conectado
//  POST /logout   -> cierra la sesion (borra el token)
// =====================================================================
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 5;
const HORAS_SESION = 8;

router.post("/login", (req, res) => {
    const identificador = String(req.body.identificador || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (identificador === "" || password === "") {
        return res.status(400).send("Escriba su correo o usuario y su contraseña.");
    }

    // Se puede entrar con el CORREO o con el USUARIO (ID)
    db.query(`SELECT u.*, COALESCE(CONCAT(e.nombres,' ',e.apellidos), 'Administrador del sistema') AS nombre, e.cargo
              FROM usuario u
              LEFT JOIN empleado e ON e.id = u.empleado_id
              WHERE LOWER(u.correo)=? OR LOWER(u.usuario)=?`, [identificador, identificador],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err.sqlMessage);
            }
            // Mismo mensaje si no existe o si la clave falla: no damos pistas
            if (result.length === 0) {
                return res.status(401).send("Correo/usuario o contraseña incorrectos.");
            }
            const u = result[0];

            if (u.activo === 0) {
                return res.status(403).send("Su cuenta está desactivada. Comuníquese con el administrador.");
            }
            if (u.bloqueado_hasta && new Date(u.bloqueado_hasta.replace(" ", "T")) > new Date()) {
                return res.status(403).send("Cuenta bloqueada por varios intentos fallidos. Intente en " + MINUTOS_BLOQUEO + " minutos.");
            }

            if (!auth.compararPassword(password, u.password)) {
                const intentos = u.intentos_fallidos + 1;
                const bloquear = intentos >= MAX_INTENTOS;
                db.query(`UPDATE usuario SET intentos_fallidos=?,
                          bloqueado_hasta = IF(?, NOW() + INTERVAL ? MINUTE, NULL) WHERE id=?`,
                    [bloquear ? 0 : intentos, bloquear, MINUTOS_BLOQUEO, u.id], () => {
                        if (bloquear) {
                            res.status(403).send("Cuenta bloqueada por " + MINUTOS_BLOQUEO + " minutos tras " + MAX_INTENTOS + " intentos fallidos.");
                        } else {
                            const quedan = MAX_INTENTOS - intentos;
                            res.status(401).send("Correo/usuario o contraseña incorrectos. Le " + (quedan === 1 ? "queda 1 intento." : "quedan " + quedan + " intentos."));
                        }
                    });
                return;
            }

            // Contraseña correcta: se crea el token de la sesion
            const token = auth.generarToken();
            db.query(`UPDATE usuario SET token=?, token_expira = NOW() + INTERVAL ? HOUR,
                      intentos_fallidos=0, bloqueado_hasta=NULL, ultimo_acceso=NOW() WHERE id=?`,
                [token, HORAS_SESION, u.id], (err2) => {
                    if (err2) {
                        console.log(err2);
                        return res.status(500).send(err2.sqlMessage);
                    }
                    res.send({
                        token: token,
                        usuario: {
                            id: u.id,
                            usuario: u.usuario,
                            correo: u.correo,
                            nombre: u.nombre,
                            cargo: u.cargo || "Administrador del sistema",
                            rol: u.rol,
                            empleado_id: u.empleado_id
                        }
                    });
                });
        }
    );
});

router.get("/sesion", (req, res) => {
    res.send(req.usuario); // lo llena el middleware verificarToken
});

router.post("/logout", (req, res) => {
    db.query('UPDATE usuario SET token=NULL, token_expira=NULL WHERE id=?', req.usuario.id,
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err.sqlMessage);
            }
            res.send("Sesión cerrada.");
        }
    );
});

module.exports = router;
