// =====================================================================
//  CONFIGURACION COMPARTIDA DEL CLIENTE          Responsable: Integrante 1
//  Todos los modulos importan de aqui la URL del servidor y
//  pequeñas funciones de formato, para no repetir codigo.
// =====================================================================

import Axios from 'axios';

// Direccion del servidor Node (server/index.js escucha en el puerto 3001)
export const API = "http://localhost:3001";

// ---------------------------------------------------------------------
// SESION: el token se guarda en el navegador (localStorage) y Axios lo
// envia en TODAS las peticiones con la cabecera Authorization.
// ---------------------------------------------------------------------
const CLAVE_SESION = "sesion_muniyau";

export const guardarSesion = (token, usuario) => {
    try {
        localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: token, usuario: usuario }));
    } catch (e) {
        // si el navegador bloquea localStorage, la sesion dura hasta recargar
    }
    Axios.defaults.headers.common["Authorization"] = "Bearer " + token;
};

export const leerSesion = () => {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE_SESION));
        if (datos && datos.token) {
            Axios.defaults.headers.common["Authorization"] = "Bearer " + datos.token;
            return datos;
        }
    } catch (e) {
        return null;
    }
    return null;
};

export const borrarSesion = () => {
    try {
        localStorage.removeItem(CLAVE_SESION);
    } catch (e) {
        // nada que borrar
    }
    delete Axios.defaults.headers.common["Authorization"];
};

// Nombres legibles de los estados del tramite
export const ESTADOS = {
    REGISTRADO: "Registrado",
    EN_REVISION: "En revisión",
    OBSERVADO: "Observado",
    APROBADO: "Aprobado",
    RECHAZADO: "Rechazado",
    FINALIZADO: "Finalizado"
};

// Color de los botones de SweetAlert2 (mismo color "sello" del App.css)
export const COLOR_SELLO = "#0e7c7b";
export const COLOR_PELIGRO = "#b42318";

// "2026-11-24" o "2026-11-24 10:30:00"  ->  "24 nov. 2026"
export const formatoFecha = (texto) => {
    if (!texto) return "—";
    const iso = texto.length === 10 ? texto + "T00:00:00" : texto.replace(" ", "T");
    return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
};

// "2026-11-24 10:30:00"  ->  "24 nov. 2026, 10:30"
export const formatoFechaHora = (texto) => {
    if (!texto) return "—";
    return new Date(texto.replace(" ", "T")).toLocaleString("es-PE", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
};

// Mensaje claro cuando el servidor responde con error o esta apagado
export const mensajeError = (error) => {
    if (error.response && typeof error.response.data === "string") {
        return error.response.data;
    }
    return "No hay conexión con el servidor. Verifica que XAMPP y el servidor (node index.js) estén encendidos.";
};
