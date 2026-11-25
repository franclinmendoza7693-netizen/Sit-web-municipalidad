// =====================================================================
//  CRUD AREA  (tabla: area)                Responsable: Integrante 1
//  POST   /area/create       -> registrar
//  GET    /areas             -> listar
//  PUT    /area/update       -> actualizar
//  DELETE /area/delete/:id   -> eliminar
// =====================================================================
const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.post("/area/create", (req, res) => {
    const nombre = req.body.nombre;
    const sigla = req.body.sigla;
    const descripcion = req.body.descripcion;

    db.query('INSERT INTO area(nombre,sigla,descripcion) VALUES(?,?,?)', [nombre, sigla, descripcion],
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("No se pudo registrar el área: " + err.sqlMessage);
            } else {
                res.send("Área registrada con éxito!!");
            }
        }
    );
});

router.get("/areas", (req, res) => {
    db.query('SELECT * FROM area ORDER BY nombre',
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

router.put("/area/update", (req, res) => {
    const id = req.body.id;
    const nombre = req.body.nombre;
    const sigla = req.body.sigla;
    const descripcion = req.body.descripcion;

    db.query('UPDATE area SET nombre=?, sigla=?, descripcion=? WHERE id=?', [nombre, sigla, descripcion, id],
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("No se pudo actualizar el área: " + err.sqlMessage);
            } else {
                res.send("Área actualizada con éxito!!");
            }
        }
    );
});

router.delete("/area/delete/:id", (req, res) => {
    const id = req.params.id;

    db.query('DELETE FROM area WHERE id=?', id,
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("No se puede eliminar: el área tiene trámites, empleados o convocatorias asociadas.");
            } else {
                res.send(result);
            }
        }
    );
});

module.exports = router;
