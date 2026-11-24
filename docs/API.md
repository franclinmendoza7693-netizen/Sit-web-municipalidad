# Rutas de la API (servidor `http://localhost:3001`)

Todas las rutas exigen haber iniciado sesión (cabecera `Authorization: Bearer <token>`), **excepto** las marcadas como *pública*.
Las marcadas como *admin* solo las puede usar el rol ADMINISTRADOR (para crear, editar o eliminar).

| Integrante | Archivo | Método | Ruta | Acceso |
|---|---|---|---|---|
| 1 | `routes/areaRoutes.js` | POST | `/area/create` | admin |
| 1 | `routes/areaRoutes.js` | GET | `/areas` | con sesión |
| 1 | `routes/areaRoutes.js` | PUT | `/area/update` | admin |
| 1 | `routes/areaRoutes.js` | DELETE | `/area/delete/:id` | admin |
| 1 | `routes/authRoutes.js` | POST | `/login` | pública |
| 1 | `routes/authRoutes.js` | GET | `/sesion` | con sesión |
| 1 | `routes/authRoutes.js` | POST | `/logout` | con sesión |
| 1 | `routes/ciudadanoRoutes.js` | POST | `/ciudadano/create` | con sesión |
| 1 | `routes/ciudadanoRoutes.js` | GET | `/ciudadanos` | con sesión |
| 1 | `routes/ciudadanoRoutes.js` | PUT | `/ciudadano/update` | con sesión |
| 1 | `routes/ciudadanoRoutes.js` | DELETE | `/ciudadano/delete/:id` | con sesión |
| 1 | `routes/dashboardRoutes.js` | GET | `/dashboard/indicadores` | con sesión |
| 1 | `routes/dashboardRoutes.js` | GET | `/dashboard/estados` | con sesión |
| 1 | `routes/dashboardRoutes.js` | GET | `/dashboard/areas` | con sesión |
| 1 | `routes/dashboardRoutes.js` | GET | `/dashboard/prioridades` | con sesión |
| 1 | `routes/dashboardRoutes.js` | GET | `/dashboard/tipos` | con sesión |
| 1 | `routes/empleadoRoutes.js` | POST | `/empleado/create` | admin |
| 1 | `routes/empleadoRoutes.js` | GET | `/empleados` | con sesión |
| 1 | `routes/empleadoRoutes.js` | PUT | `/empleado/update` | admin |
| 1 | `routes/empleadoRoutes.js` | DELETE | `/empleado/delete/:id` | admin |
| 1 | `routes/feedbackRoutes.js` | POST | `/feedback/create` | con sesión |
| 1 | `routes/feedbackRoutes.js` | GET | `/feedbacks` | con sesión |
| 1 | `routes/feedbackRoutes.js` | GET | `/feedback/resumen` | con sesión |
| 1 | `routes/feedbackRoutes.js` | DELETE | `/feedback/delete/:id` | con sesión |
| 1 | `routes/tipoTramiteRoutes.js` | POST | `/tipo/create` | admin |
| 1 | `routes/tipoTramiteRoutes.js` | GET | `/tipos` | con sesión |
| 1 | `routes/tipoTramiteRoutes.js` | PUT | `/tipo/update` | admin |
| 1 | `routes/tipoTramiteRoutes.js` | DELETE | `/tipo/delete/:id` | admin |
| 1 | `routes/usuarioRoutes.js` | POST | `/usuario/create` | admin |
| 1 | `routes/usuarioRoutes.js` | GET | `/usuarios` | admin |
| 1 | `routes/usuarioRoutes.js` | PUT | `/usuario/update` | admin |
| 1 | `routes/usuarioRoutes.js` | DELETE | `/usuario/delete/:id` | admin |
| 2 | `routes/modeloRoutes.js` | POST | `/ml/entrenar` | admin |
| 2 | `routes/modeloRoutes.js` | GET | `/ml/evaluacion` | con sesión |
| 2 | `routes/modeloRoutes.js` | GET | `/ml/modelos` | con sesión |
| 2 | `routes/modeloRoutes.js` | GET | `/ml/dataset` | con sesión |
| 2 | `routes/modeloRoutes.js` | POST | `/ml/predecir` | con sesión |
| 2 | `routes/modeloRoutes.js` | POST | `/ml/repriorizar` | con sesión |
| 2 | `routes/tramiteRoutes.js` | POST | `/tramite/create` | con sesión |
| 2 | `routes/tramiteRoutes.js` | GET | `/tramites` | con sesión |
| 2 | `routes/tramiteRoutes.js` | PUT | `/tramite/update` | con sesión |
| 2 | `routes/tramiteRoutes.js` | PUT | `/tramite/estado` | con sesión |
| 2 | `routes/tramiteRoutes.js` | PUT | `/tramite/prioridad` | con sesión |
| 2 | `routes/tramiteRoutes.js` | GET | `/tramite/seguimiento/:id` | con sesión |
| 2 | `routes/tramiteRoutes.js` | DELETE | `/tramite/delete/:id` | con sesión |
| 3 | `routes/convocatoriaRoutes.js` | POST | `/convocatoria/create` | admin |
| 3 | `routes/convocatoriaRoutes.js` | GET | `/convocatorias` | con sesión |
| 3 | `routes/convocatoriaRoutes.js` | PUT | `/convocatoria/update` | admin |
| 3 | `routes/convocatoriaRoutes.js` | DELETE | `/convocatoria/delete/:id` | admin |
| 3 | `routes/notificacionRoutes.js` | POST | `/notificacion/create` | con sesión |
| 3 | `routes/notificacionRoutes.js` | GET | `/notificaciones` | con sesión |
| 3 | `routes/notificacionRoutes.js` | GET | `/notificacion/tramites` | con sesión |
| 3 | `routes/notificacionRoutes.js` | PUT | `/notificacion/leido/:id` | con sesión |
| 3 | `routes/notificacionRoutes.js` | DELETE | `/notificacion/delete/:id` | con sesión |
| 3 | `routes/notificacionRoutes.js` | GET | `/consulta/:codigo/:dni` | pública |
| 3 | `routes/notificacionRoutes.js` | PUT | `/consulta/leido` | pública |
| 3 | `routes/postulanteRoutes.js` | POST | `/postulante/create` | admin |
| 3 | `routes/postulanteRoutes.js` | GET | `/postulantes/:convocatoria_id` | con sesión |
| 3 | `routes/postulanteRoutes.js` | PUT | `/postulante/update` | admin |
| 3 | `routes/postulanteRoutes.js` | DELETE | `/postulante/delete/:id` | admin |
| 3 | `routes/postulanteRoutes.js` | POST | `/curriculos/evaluar/:convocatoria_id` | admin |
