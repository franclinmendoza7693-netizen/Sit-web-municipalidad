// =====================================================================
//  CRUD TIPO DE TRAMITE  (tabla: tipo_tramite)   Responsable: Integrante 1
//  POST   /tipo/create      GET /tipos      PUT /tipo/update
//  DELETE /tipo/delete/:id
// =====================================================================
const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.post("/tipo/create", (req, res) => {
    const area_id = req.body.area_id;
    const nombre = req.body.nombre;
    const plazo_dias = req.body.plazo_dias;
    const costo = req.body.costo;
    const requisitos = req.body.requisitos;

    db.query('INSERT INTO tipo_tramite(area_id,nombre,plazo_dias,costo,requisitos) VALUES(?,?,?,?,?)',
        [area_id, nombre, plazo_dias, costo, requisitos],
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("No se pudo registrar el tipo de trámite: " + err.sqlMessage);
            } else {
                res.send("Tipo de trámite registrado con éxito!!");
            }
        }
    );
});

// Lista los tipos con el nombre del area (JOIN)
router.get("/tipos", (req, res) => {
    db.query(`SELECT t.*, a.nombre AS area, a.sigla
              FROM tipo_tramite t
              INNER JOIN area a ON a.id = t.area_id
              ORDER BY t.nombre`,
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

router.put("/tipo/update", (req, res) => {
    const id = req.body.id;
    const area_id = req.body.area_id;
    const nombre = req.body.nombre;
    const plazo_dias = req.body.plazo_dias;
    const costo = req.body.costo;
    const requisitos = req.body.requisitos;

    db.query('UPDATE tipo_tramite SET area_id=?, nombre=?, plazo_dias=?, costo=?, requisitos=? WHERE id=?',
        [area_id, nombre, plazo_dias, costo, requisitos, id],
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("No se pudo actualizar: " + err.sqlMessage);
            } else {
                res.send("Tipo de trámite actualizado con éxito!!");
            }
        }
    );
});

router.delete("/tipo/delete/:id", (req, res) => {
    const id = req.params.id;

    db.query('DELETE FROM tipo_tramite WHERE id=?', id,
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("No se puede eliminar: existen trámites registrados con este tipo.");
            } else {
                res.send(result);
            }
        }
    );
});

module.exports = router;
