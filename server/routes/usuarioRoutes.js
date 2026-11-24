// =====================================================================
//  CRUD USUARIOS (cuentas de acceso)  - SOLO ADMINISTRADOR
//  Responsable: Integrante 1
//  POST   /usuario/create     GET /usuarios     PUT /usuario/update
//  DELETE /usuario/delete/:id
//  Nunca se devuelve la contraseña ni el token al cliente.
// =====================================================================
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");

// Todas las rutas de este archivo exigen rol ADMINISTRADOR
router.use("/usuario", auth.soloAdministrador);
router.use("/usuarios", auth.soloAdministrador);

function passwordValida(password) {
    return typeof password === "string" && password.length >= 8 && /\d/.test(password) && /[A-Za-z]/.test(password);
}

router.post("/usuario/create", (req, res) => {
    const empleado_id = req.body.empleado_id || null;
    const usuario = String(req.body.usuario || "").trim().toLowerCase();
    const correo = String(req.body.correo || "").trim().toLowerCase();
    const password = req.body.password;
    const rol = req.body.rol;

    if (!passwordValida(password)) {
        return res.status(400).send("La contraseña debe tener al menos 8 caracteres, con letras y números.");
    }

    db.query('INSERT INTO usuario(empleado_id,usuario,correo,password,rol) VALUES(?,?,?,?,?)',
        [empleado_id, usuario, correo, auth.cifrarPassword(password), rol],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === "ER_DUP_ENTRY") {
                    res.status(500).send("Ya existe una cuenta con ese usuario, correo o empleado.");
                } else {
                    res.status(500).send("No se pudo crear la cuenta: " + err.sqlMessage);
                }
            } else {
                res.send("Usuario creado con éxito!!");
            }
        }
    );
});

router.get("/usuarios", (req, res) => {
    db.query(`SELECT u.id, u.empleado_id, u.usuario, u.correo, u.rol, u.activo, u.ultimo_acceso, u.fecha_creacion,
                     (u.bloqueado_hasta IS NOT NULL AND u.bloqueado_hasta > NOW()) AS bloqueado,
                     CONCAT(e.nombres,' ',e.apellidos) AS empleado, e.cargo, a.sigla
              FROM usuario u
              LEFT JOIN empleado e ON e.id = u.empleado_id
              LEFT JOIN area a ON a.id = e.area_id
              ORDER BY u.rol, u.usuario`,
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

// Si "password" viene vacio, se conserva la contraseña actual
router.put("/usuario/update", (req, res) => {
    const id = req.body.id;
    const empleado_id = req.body.empleado_id || null;
    const usuario = String(req.body.usuario || "").trim().toLowerCase();
    const correo = String(req.body.correo || "").trim().toLowerCase();
    const password = req.body.password;
    const rol = req.body.rol;
    const activo = req.body.activo ? 1 : 0;

    if (Number(id) === req.usuario.id && (activo === 0 || rol !== "ADMINISTRADOR")) {
        return res.status(400).send("No puede quitarse el rol de administrador ni desactivar su propia cuenta.");
    }
    if (password && !passwordValida(password)) {
        return res.status(400).send("La nueva contraseña debe tener al menos 8 caracteres, con letras y números.");
    }

    const campos = [empleado_id, usuario, correo, rol, activo];
    let sql = 'UPDATE usuario SET empleado_id=?, usuario=?, correo=?, rol=?, activo=?, intentos_fallidos=0, bloqueado_hasta=NULL';
    if (password) {
        sql += ', password=?, token=NULL'; // al cambiar la clave se cierra su sesion
        campos.push(auth.cifrarPassword(password));
    }
    if (activo === 0) {
        sql += ', token=NULL';
    }
    sql += ' WHERE id=?';
    campos.push(id);

    db.query(sql, campos, (err) => {
        if (err) {
            console.log(err);
            if (err.code === "ER_DUP_ENTRY") {
                res.status(500).send("Ya existe una cuenta con ese usuario, correo o empleado.");
            } else {
                res.status(500).send("No se pudo actualizar: " + err.sqlMessage);
            }
        } else {
            res.send("Usuario actualizado con éxito!!");
        }
    });
});

router.delete("/usuario/delete/:id", (req, res) => {
    const id = req.params.id;

    if (Number(id) === req.usuario.id) {
        return res.status(400).send("No puede eliminar su propia cuenta.");
    }
    db.query('DELETE FROM usuario WHERE id=?', id,
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
