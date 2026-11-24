// =====================================================================
//  CRUD EMPLEADO  (tabla: empleado)          Responsable: Integrante 1
//  Es el mismo CRUD de la clase, adaptado al personal municipal.
//  POST   /create  ->  /empleado/create     GET /empleados
//  PUT    /empleado/update                  DELETE /empleado/delete/:id
// =====================================================================
const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.post("/empleado/create", (req, res) => {
    const area_id = req.body.area_id;
    const dni = req.body.dni;
    const nombres = req.body.nombres;
    const apellidos = req.body.apellidos;
    const cargo = req.body.cargo;
    const correo = req.body.correo;

    db.query('INSERT INTO empleado(area_id,dni,nombres,apellidos,cargo,correo) VALUES(?,?,?,?,?,?)',
        [area_id, dni, nombres, apellidos, cargo, correo],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === "ER_DUP_ENTRY") {
                    res.status(500).send("Ya existe un empleado con el DNI " + dni);
                } else {
                    res.status(500).send("No se pudo registrar el empleado: " + err.sqlMessage);
                }
            } else {
                res.send("Empleado registrado con éxito!!");
            }
        }
    );
});

router.get("/empleados", (req, res) => {
    db.query(`SELECT e.*, a.nombre AS area, a.sigla
              FROM empleado e
              INNER JOIN area a ON a.id = e.area_id
              ORDER BY e.apellidos, e.nombres`,
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

router.put("/empleado/update", (req, res) => {
    const id = req.body.id;
    const area_id = req.body.area_id;
    const dni = req.body.dni;
    const nombres = req.body.nombres;
    const apellidos = req.body.apellidos;
    const cargo = req.body.cargo;
    const correo = req.body.correo;

    db.query('UPDATE empleado SET area_id=?, dni=?, nombres=?, apellidos=?, cargo=?, correo=? WHERE id=?',
        [area_id, dni, nombres, apellidos, cargo, correo, id],
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("No se pudo actualizar: " + err.sqlMessage);
            } else {
                res.send("Empleado actualizado con éxito!!");
            }
        }
    );
});

router.delete("/empleado/delete/:id", (req, res) => {
    const id = req.params.id;

    db.query('DELETE FROM empleado WHERE id=?', id,
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("No se pudo eliminar el empleado: " + err.sqlMessage);
            } else {
                res.send(result);
            }
        }
    );
});

module.exports = router;
