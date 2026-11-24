// =====================================================================
//  CRUD CIUDADANO  (tabla: ciudadano)        Responsable: Integrante 1
//  POST   /ciudadano/create    GET /ciudadanos    PUT /ciudadano/update
//  DELETE /ciudadano/delete/:id
// =====================================================================
const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.post("/ciudadano/create", (req, res) => {
    const dni = req.body.dni;
    const nombres = req.body.nombres;
    const apellidos = req.body.apellidos;
    const correo = req.body.correo;
    const telefono = req.body.telefono;
    const direccion = req.body.direccion;
    const es_vulnerable = req.body.es_vulnerable;

    db.query('INSERT INTO ciudadano(dni,nombres,apellidos,correo,telefono,direccion,es_vulnerable) VALUES(?,?,?,?,?,?,?)',
        [dni, nombres, apellidos, correo, telefono, direccion, es_vulnerable],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === "ER_DUP_ENTRY") {
                    res.status(500).send("Ya existe un ciudadano con el DNI " + dni);
                } else {
                    res.status(500).send("No se pudo registrar el ciudadano: " + err.sqlMessage);
                }
            } else {
                res.send("Ciudadano registrado con éxito!!");
            }
        }
    );
});

router.get("/ciudadanos", (req, res) => {
    db.query('SELECT * FROM ciudadano ORDER BY apellidos, nombres',
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

router.put("/ciudadano/update", (req, res) => {
    const id = req.body.id;
    const dni = req.body.dni;
    const nombres = req.body.nombres;
    const apellidos = req.body.apellidos;
    const correo = req.body.correo;
    const telefono = req.body.telefono;
    const direccion = req.body.direccion;
    const es_vulnerable = req.body.es_vulnerable;

    db.query('UPDATE ciudadano SET dni=?, nombres=?, apellidos=?, correo=?, telefono=?, direccion=?, es_vulnerable=? WHERE id=?',
        [dni, nombres, apellidos, correo, telefono, direccion, es_vulnerable, id],
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("No se pudo actualizar: " + err.sqlMessage);
            } else {
                res.send("Ciudadano actualizado con éxito!!");
            }
        }
    );
});

router.delete("/ciudadano/delete/:id", (req, res) => {
    const id = req.params.id;

    db.query('DELETE FROM ciudadano WHERE id=?', id,
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("No se puede eliminar: el ciudadano tiene trámites registrados.");
            } else {
                res.send(result);
            }
        }
    );
});

module.exports = router;
