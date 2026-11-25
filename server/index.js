// =====================================================================
//  SERVIDOR PRINCIPAL - Sistema de Tramites Municipalidad Provincial de Yau
//  Ejecutar:  node index.js   (o  npm start)   ->  http://localhost:3001
//
//  Cada integrante tiene su BLOQUE de rutas. El Master deja preparados
//  los bloques del Integrante 2 y 3 comentados; cada uno los descomenta
//  en su propia rama cuando sube sus archivos (ver docs/GUIA_GIT.md).
// =====================================================================
const express = require("express");
const app = express();
const cors = require("cors");

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------
// SEGURIDAD (Integrante 1): toda peticion pasa primero por aqui.
// verificarToken      -> exige haber iniciado sesion (menos rutas publicas)
// soloAdminEnEscritura -> crear/editar/eliminar catalogos solo administrador
// ---------------------------------------------------------------------
const auth = require("./middleware/auth");
app.use(auth.verificarToken);
app.use(auth.soloAdminEnEscritura);

// ---------------------------------------------------------------------
// Ruta de prueba: http://localhost:3001/
// ---------------------------------------------------------------------
app.get("/", (req, res) => {
    res.send("API Municipalidad Provincial de Yau funcionando correctamente");
});

// =====================================================================
// BLOQUE INTEGRANTE 1 (MASTER) : login, usuarios, catalogos, dashboard y feedback
// =====================================================================
const authRoutes = require("./routes/authRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const areaRoutes = require("./routes/areaRoutes");
const tipoTramiteRoutes = require("./routes/tipoTramiteRoutes");
const ciudadanoRoutes = require("./routes/ciudadanoRoutes");
const empleadoRoutes = require("./routes/empleadoRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");

app.use(authRoutes);
app.use(usuarioRoutes);
app.use(areaRoutes);
app.use(tipoTramiteRoutes);
app.use(ciudadanoRoutes);
app.use(empleadoRoutes);
app.use(dashboardRoutes);
app.use(feedbackRoutes);
// ===================== FIN BLOQUE INTEGRANTE 1 =======================


// =====================================================================
// BLOQUE INTEGRANTE 2 : tramites + Machine Learning (Naive Bayes)
// (descomentar estas lineas al subir los archivos del Integrante 2)
// =====================================================================
// const tramiteRoutes = require("./routes/tramiteRoutes");
// const modeloRoutes = require("./routes/modeloRoutes");
// app.use(tramiteRoutes);
// app.use(modeloRoutes);
// ===================== FIN BLOQUE INTEGRANTE 2 =======================


// =====================================================================
// BLOQUE INTEGRANTE 3 : alertas al ciudadano + seleccion de curriculos
// (descomentar estas lineas al subir los archivos del Integrante 3)
// =====================================================================
const notificacionRoutes = require("./routes/notificacionRoutes");
const convocatoriaRoutes = require("./routes/convocatoriaRoutes");
const postulanteRoutes = require("./routes/postulanteRoutes");
app.use(notificacionRoutes);
app.use(convocatoriaRoutes);
app.use(postulanteRoutes);
// ===================== FIN BLOQUE INTEGRANTE 3 =======================


app.listen(3001, () => {
    console.log("corriendo en el puerto 3001");
});
