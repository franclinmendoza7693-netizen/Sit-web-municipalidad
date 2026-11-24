// =====================================================================
//  CONEXION A LA BASE DE DATOS (XAMPP - MySQL / MariaDB)
//  Responsable: Integrante 1 (Master)
//  Es la misma conexion que vimos en clase (mysql.createConnection),
//  solo que la sacamos a su propio archivo para que TODAS las rutas
//  la reutilicen con: const db = require("../config/db");
// =====================================================================
const mysql = require("mysql");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "municipalidad_yau",
    charset: "utf8mb4",         // para tildes y la letra ñ
    dateStrings: true // las fechas llegan como texto "AAAA-MM-DD hh:mm:ss"
});

db.connect((err) => {
    if (err) {
        console.log("Error al conectar con MySQL. Revisa que XAMPP este encendido.");
        console.log(err.message);
    } else {
        console.log("Conectado a la base de datos municipalidad_yau");
    }
});

module.exports = db;
