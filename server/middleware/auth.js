// =====================================================================
//  SEGURIDAD: cifrado de contraseñas y verificacion de sesion
//  Responsable: Integrante 1 (Master)
//
//  - Las contraseñas se guardan cifradas con SCRYPT (modulo "crypto" que
//    ya trae Node, no hay que instalar nada). Formato: "sal:hash".
//  - Al iniciar sesion se genera un TOKEN aleatorio que se guarda en la
//    tabla usuario y vence en 8 horas.
//  - El cliente envia el token en cada peticion:
//        Authorization: Bearer <token>
//  - verificarToken revisa el token antes de dejar pasar a cualquier ruta.
// =====================================================================
const crypto = require("crypto");
const db = require("../config/db");

// Rutas que se pueden usar SIN iniciar sesion
const RUTAS_PUBLICAS = ["/", "/login", "/consulta"];

// "MiClave123" -> "a1b2...:9f8e..."
function cifrarPassword(password) {
    const sal = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, sal, 64).toString("hex");
    return sal + ":" + hash;
}

// Compara la contraseña escrita con la guardada (sin descifrarla)
function compararPassword(password, guardada) {
    const partes = String(guardada).split(":");
    if (partes.length !== 2) return false;
    const hashCalculado = crypto.scryptSync(password, partes[0], 64);
    const hashGuardado = Buffer.from(partes[1], "hex");
    return hashGuardado.length === hashCalculado.length && crypto.timingSafeEqual(hashCalculado, hashGuardado);
}

function generarToken() {
    return crypto.randomBytes(32).toString("hex");
}

// ---------------------------------------------------------------------
// Middleware: se ejecuta antes de cada ruta
// ---------------------------------------------------------------------
function verificarToken(req, res, next) {
    const esPublica = RUTAS_PUBLICAS.some((ruta) =>
        ruta === "/" ? req.path === "/" : req.path === ruta || req.path.startsWith(ruta + "/")
    );
    if (esPublica) {
        return next();
    }

    const cabecera = req.headers.authorization || "";
    const token = cabecera.startsWith("Bearer ") ? cabecera.substring(7) : "";
    if (!token) {
        return res.status(401).send("Debe iniciar sesión para usar el sistema.");
    }

    db.query(`SELECT u.id, u.usuario, u.correo, u.rol, u.empleado_id,
                     COALESCE(CONCAT(e.nombres,' ',e.apellidos), 'Administrador del sistema') AS nombre
              FROM usuario u
              LEFT JOIN empleado e ON e.id = u.empleado_id
              WHERE u.token=? AND u.token_expira > NOW() AND u.activo=1`, token,
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err.sqlMessage);
            }
            if (result.length === 0) {
                return res.status(401).send("Su sesión venció. Inicie sesión nuevamente.");
            }
            req.usuario = result[0]; // las rutas pueden saber QUIEN hace la accion
            next();
        }
    );
}

// Rutas donde SOLO el administrador puede crear, editar o eliminar
// (el trabajador si puede consultarlas con GET)
const RUTAS_SOLO_ADMIN = ["/area", "/tipo", "/empleado", "/usuario", "/ml/entrenar", "/convocatoria", "/postulante", "/curriculos"];

function soloAdminEnEscritura(req, res, next) {
    const esEscritura = req.method !== "GET";
    const esRutaAdmin = RUTAS_SOLO_ADMIN.some((ruta) => req.path === ruta || req.path.startsWith(ruta + "/"));
    if (esEscritura && esRutaAdmin && (!req.usuario || req.usuario.rol !== "ADMINISTRADOR")) {
        return res.status(403).send("Su rol de trabajador no permite esta acción. Pida ayuda a un administrador.");
    }
    next();
}

// Middleware: solo el ADMINISTRADOR puede continuar
function soloAdministrador(req, res, next) {
    if (req.usuario && req.usuario.rol === "ADMINISTRADOR") {
        return next();
    }
    res.status(403).send("Solo un administrador puede realizar esta acción.");
}

module.exports = { cifrarPassword, compararPassword, generarToken, verificarToken, soloAdminEnEscritura, soloAdministrador };
