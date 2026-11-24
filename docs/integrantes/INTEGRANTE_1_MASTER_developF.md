# Integrante 1: Master (rama `developF`)

**Responsabilidad:** base del proyecto, **base de datos completa**, conexión, **seguridad (login y usuarios)**, catálogos, panel de control, opiniones, sistema de diseño y administración del repositorio en GitHub.

## Mis archivos

```
database/municipalidad_yau.sql          ← las 14 tablas en orden + datos de prueba
server/
├── index.js                            ← servidor principal (bloques de cada integrante)
├── config/db.js                        ← conexión a MySQL (mysql.createConnection)
├── middleware/auth.js                  ← contraseñas cifradas, token, roles
└── routes/
    ├── authRoutes.js                   ← /login  /sesion  /logout
    ├── usuarioRoutes.js                ← CRUD de usuarios (solo administrador)
    ├── areaRoutes.js                   ← CRUD áreas
    ├── tipoTramiteRoutes.js            ← CRUD tipos de trámite
    ├── ciudadanoRoutes.js              ← CRUD ciudadanos
    ├── empleadoRoutes.js               ← CRUD personal (el CRUD de la clase)
    ├── dashboardRoutes.js              ← indicadores y cuellos de botella
    └── feedbackRoutes.js               ← opiniones
client/src/
├── App.js                              ← sesión, menú por rol y pantallas
├── App.css                             ← sistema de diseño (colores, tablas, botones)
├── config.js                           ← URL del API, sesión y formato de fechas
├── index.js
└── components/
    ├── auth/Login.js
    ├── seguridad/Usuarios.js
    ├── dashboard/Dashboard.js
    ├── catalogos/Areas.js  TiposTramite.js  Ciudadanos.js  Empleados.js
    └── feedback/Feedback.js
docs/                                   ← informe, diagramas, guía Git, API
```

## Cómo funciona mi parte

### Base de datos
- 14 tablas en 5 bloques. Se crean **primero las tablas padre** (área, ciudadano), luego las que dependen de ellas (tipo_tramite, empleado, usuario) y al final las hijas (trámite, seguimiento, notificación...). Si se creara `tramite` antes que `ciudadano`, MySQL daría error porque la llave foránea apunta a una tabla que aún no existe.
- `ON DELETE RESTRICT`: no deja borrar un ciudadano que tiene trámites.
- `ON DELETE CASCADE`: si se borra un trámite, se borran sus seguimientos y alertas.
- `ON DELETE SET NULL`: si se borra un empleado, sus trámites quedan "sin responsable".

### Servidor (mismo estándar de la clase)
```js
const express = require("express");
const app = express();
const cors = require("cors");
app.use(cors());
app.use(express.json());
...
app.listen(3001, () => { console.log("corriendo en el puerto 3001"); });
```
La diferencia con la clase: las rutas están en archivos separados (`express.Router()`) para que cada integrante trabaje en su archivo sin chocar, y la conexión está en `config/db.js` para reutilizarla.

### Inicio de sesión (paso a paso)
1. `Login.js` envía `{ identificador, password }` a `POST /login`.
2. `authRoutes.js` busca al usuario por **correo o usuario** (`WHERE correo=? OR usuario=?`).
3. Compara la contraseña con `compararPassword` (scrypt). La contraseña **nunca** se guarda en texto plano: se guarda `sal:hash`.
4. Si es correcta, genera un **token** aleatorio (`crypto.randomBytes`), lo guarda en `usuario.token` con vencimiento de 8 horas y lo devuelve.
5. El cliente guarda el token (`guardarSesion`) y Axios lo envía en cada petición: `Authorization: Bearer <token>`.
6. `verificarToken` (middleware en `index.js`) revisa el token antes de **cualquier** ruta. Las únicas rutas públicas son `/login` y `/consulta` (la del ciudadano).
7. Si falla 5 veces, la cuenta se bloquea 5 minutos (`intentos_fallidos`, `bloqueado_hasta`).

### Roles
| Rol | Puede |
|---|---|
| ADMINISTRADOR | Todo: usuarios, catálogos, modelo de ML, convocatorias y CV |
| TRABAJADOR | Panel, ciudadanos, bandeja de expedientes, alertas, opiniones |

Se controla en **dos lugares**: en el cliente (`opcion(..., true)` oculta el menú) y en el servidor (`soloAdminEnEscritura` y `soloAdministrador` responden 403). Ocultar el menú no basta: el servidor es el que realmente protege.

### Patrón CRUD de cada componente (igual a la clase)
`useState` por campo → `add` (Axios.post) → `getX` (Axios.get) → `editarX` (llena el formulario y `setEditar(true)`) → `update` (Axios.put) → `deleteX` (Swal de confirmación + Axios.delete) → `limpiarCampo`.

## Cómo probar
1. Importar `database/municipalidad_yau.sql` en phpMyAdmin.
2. `cd server` → `npm install` → `node index.js`.
3. `cd client` → `npm install` → `npm start`.
4. Entrar con `admin` / `Admin2026!` y luego con `aparedes` / `Yau2026!` para ver la diferencia de menús.

## Preguntas que puede hacer el profesor

**¿Por qué las tablas están en ese orden?**
Porque una tabla con llave foránea solo se puede crear si la tabla a la que apunta ya existe. Por eso van primero `area` y `ciudadano`, después `tipo_tramite`, `empleado` y `usuario`, y al final `tramite` y sus tablas hijas.

**¿Cómo se guardan las contraseñas?**
Cifradas con scrypt y una "sal" aleatoria distinta para cada usuario. Para validar, se vuelve a cifrar lo que escribió el usuario y se compara con el hash guardado. No se puede "descifrar" la contraseña.

**¿Qué es el token y para qué sirve?**
Es una llave temporal que se entrega al iniciar sesión. El cliente la manda en cada petición y el middleware la busca en la base de datos; si no existe o venció, responde 401 y el cliente vuelve al login.

**¿Qué es un middleware?**
Una función que se ejecuta antes de las rutas (`app.use(auth.verificarToken)`). Si llama a `next()`, la petición continúa; si responde con error, la petición se detiene ahí.

**¿Cómo evitan la inyección SQL?**
Con consultas parametrizadas: `db.query('... WHERE id=?', [id])`. El valor nunca se pega directamente en el texto SQL.

**¿Qué hace `cors`?**
Permite que el cliente en el puerto 3000 pueda llamar al servidor en el puerto 3001.

**¿Cómo se detectan los cuellos de botella?**
`dashboardRoutes.js` agrupa los trámites por área (`GROUP BY`) y cuenta pendientes y vencidos (`fecha_limite < CURDATE()`), además del promedio de días de atención (`DATEDIFF`).

**¿Por qué el `App.js` tiene bloques comentados?**
Son los puntos de integración de cada integrante. Cada uno descomenta solo su bloque en su rama, así Git puede combinar los cambios sin conflictos.
