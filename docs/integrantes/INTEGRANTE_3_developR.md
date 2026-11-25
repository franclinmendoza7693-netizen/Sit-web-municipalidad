# Integrante 3: Alertas al ciudadano + Selección de currículos (rama `developR`)

**Responsabilidad:** sistema de alertas y consulta en línea del ciudadano, y la evaluación de CV con **TF-IDF + similitud coseno**.

## Mis archivos

```
server/
├── ml/evaluadorCurriculos.js       ← el modelo de Machine Learning (PLN)
└── routes/
    ├── notificacionRoutes.js       ← alertas y consulta pública del ciudadano
    ├── convocatoriaRoutes.js       ← CRUD convocatorias
    └── postulanteRoutes.js         ← CRUD postulantes + evaluar CV
client/src/components/
├── alertas/
│   ├── ConsultaTramite.js          ← consulta del ciudadano (se actualiza sola)
│   └── Notificaciones.js           ← alertas enviadas (personal)
└── curriculos/
    ├── Convocatorias.js            ← CRUD convocatorias
    └── Postulantes.js              ← postulantes y ranking de CV
```
Tablas que uso: `notificacion`, `convocatoria`, `postulante`, `evaluacion_curriculum` (y leo `tramite`, `seguimiento_tramite`, `ciudadano`).

## Cómo integrar mi parte (en mi rama `developR`)

1. Copiar las carpetas `server/` y `client/` de mi zip encima del proyecto (solo agrega archivos).
2. En `server/index.js`, quitar las `//` de mi bloque:
```js
const notificacionRoutes = require("./routes/notificacionRoutes");
const convocatoriaRoutes = require("./routes/convocatoriaRoutes");
const postulanteRoutes = require("./routes/postulanteRoutes");
app.use(notificacionRoutes);
app.use(convocatoriaRoutes);
app.use(postulanteRoutes);
```
3. En `client/src/App.js`:
   - En **IMPORTS INTEGRANTE 3**, quitar las `//` de los cuatro `import`.
   - En **PORTAL INTEGRANTE 3**, **MENU INTEGRANTE 3** y **PANTALLAS INTEGRANTE 3**, borrar solo las líneas `{/*` y `*/}` que encierran mis líneas.
4. Probar: en el login pulsar *¿Eres ciudadano?* y consultar `EXP-2026-000004` con DNI `08765432`. Luego entrar como `admin` → *Evaluación de CV* → *Evaluar CV*.
5. Commit: `feat: alertas al ciudadano y evaluacion de CV con TF-IDF` → Push → Pull Request a `developer`.

## Cómo funciona

### Alertas
- Las alertas **automáticas** las crea el módulo de trámites cada vez que se registra o cambia de estado un expediente.
- Desde *Alertas enviadas* el personal también puede mandar una alerta manual (correo, SMS o sistema). El envío real se **simula** en la consola del servidor (`[ENVIO SMS] a 9xxxxxxxx...`); en producción se conectaría un proveedor de correo o SMS.

### Consulta del ciudadano "en tiempo real"
1. El ciudadano escribe su **código + DNI** (`GET /consulta/:codigo/:dni`). Se piden ambos datos para proteger su información (Ley 29733); solo se muestra la inicial del apellido.
2. Esta ruta es **pública** (no necesita login): está en la lista `RUTAS_PUBLICAS` del middleware.
3. `useEffect` + `setInterval` vuelve a consultar **cada 10 segundos**. Si llegan más alertas que antes (`useRef` guarda la cantidad anterior), aparece un aviso (toast) sin recargar la página.
4. `return () => clearInterval(intervalo)` detiene la consulta automática al salir de la pantalla.

### Evaluador de currículos (`ml/evaluadorCurriculos.js`)
1. **tokenizar:** minúsculas, quita tildes y signos, y elimina las *stopwords* (de, la, el, con...).
2. **TF (frecuencia del término):** cuántas veces aparece una palabra en el documento ÷ total de palabras.
3. **IDF (frecuencia inversa):** `ln((1 + N) / (1 + df)) + 1`. Las palabras que aparecen en todos los CV valen menos; las específicas del perfil valen más.
4. **Vector TF-IDF:** cada documento se convierte en una lista de pesos tf × idf.
5. **Similitud coseno:** `(A · B) / (|A| × |B|)` entre el vector del perfil y el del CV. 1 = iguales, 0 = nada en común.
6. **Puntaje final** = 60% similitud + 25% experiencia + 15% grado académico.
7. **APTO** si cumple la experiencia mínima **y** tiene 55 puntos o más.

El resultado se guarda en `evaluacion_curriculum` con `INSERT ... ON DUPLICATE KEY UPDATE`: si el postulante ya tenía evaluación, se actualiza en lugar de duplicarla (por eso `postulante_id` es UNIQUE, relación 1 a 1).

## Preguntas que puede hacer el profesor

**¿Por qué TF-IDF y no solo contar palabras?**
Porque contar palabras le da el mismo valor a términos comunes ("experiencia", "trabajo") que a los importantes ("Python", "mesa de partes"). IDF baja el peso de lo que todos tienen.

**¿Qué mide la similitud coseno?**
El ángulo entre dos vectores: mide qué tan parecido es el contenido, sin importar si un CV es más largo que otro.

**¿Por qué se pide código y DNI para consultar?**
Por protección de datos personales: con solo el código, cualquiera podría ver el trámite de otra persona.

**¿Es "tiempo real" de verdad?**
Es *polling*: el navegador pregunta al servidor cada 10 segundos. Es simple, funciona en cualquier red y es suficiente para el caso. La mejora sería WebSockets (socket.io), que envía el aviso al instante.

**¿Por qué existe `useRef` en ConsultaTramite?**
Para recordar cuántas alertas había en la consulta anterior sin volver a dibujar la pantalla; si el número sube, mostramos el aviso.

**¿El sistema decide a quién contratar?**
No. Ordena y recomienda; la decisión final es del comité. Así se usa la IA de forma responsable y transparente: se muestran las palabras del perfil que coincidieron con cada CV.
