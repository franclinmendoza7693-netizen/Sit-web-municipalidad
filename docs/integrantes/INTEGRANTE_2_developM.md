# Integrante 2: Trámites + Machine Learning (rama `developM`)

**Responsabilidad:** registro y seguimiento de expedientes, y el modelo **Naive Bayes** que prioriza los trámites críticos.

## Mis archivos

```
server/
├── ml/priorizadorNaiveBayes.js     ← el modelo de Machine Learning
└── routes/
    ├── tramiteRoutes.js            ← CRUD de trámites, cambio de estado, seguimiento
    └── modeloRoutes.js             ← entrenar, métricas, predecir, repriorizar
client/src/components/tramites/
├── Tramites.js                     ← Bandeja de expedientes
└── ModeloML.js                     ← Modelo de prioridad (métricas y simulador)
```
Tablas que uso: `tramite`, `seguimiento_tramite`, `historico_tramite`, `modelo_ml` (y leo `ciudadano`, `tipo_tramite`, `empleado`). También inserto en `notificacion` para avisar al ciudadano.

## Cómo integrar mi parte (en mi rama `developM`)

1. Copiar las carpetas `server/` y `client/` de mi zip encima del proyecto (solo agrega archivos).
2. En `server/index.js`, quitar las `//` de mi bloque:
```js
const tramiteRoutes = require("./routes/tramiteRoutes");
const modeloRoutes = require("./routes/modeloRoutes");
app.use(tramiteRoutes);
app.use(modeloRoutes);
```
3. En `client/src/App.js`:
   - En **IMPORTS INTEGRANTE 2**, quitar las `//` de los dos `import`.
   - En **MENU INTEGRANTE 2** y **PANTALLAS INTEGRANTE 2**, borrar solo las líneas `{/*` y `*/}` que encierran mis líneas.
4. Probar: `node index.js` y `npm start` → entrar como `admin` → *Bandeja de expedientes* y *Modelo de prioridad*.
5. Commit: `feat: modulo de tramites con prioridad Naive Bayes` → Push → Pull Request a `developer`.

## Cómo funciona

### Registrar un trámite (`POST /tramite/create`)
1. Busca el plazo del tipo de trámite y si el ciudadano es vulnerable.
2. **Pide la predicción al modelo** con 5 datos: tipo, canal, vulnerable, requisitos completos y situación del plazo.
3. Guarda el trámite con su prioridad, su puntaje y `fecha_limite = hoy + plazo`.
4. Genera el código `EXP-2026-000012` a partir del `id`.
5. Registra el primer seguimiento (con el empleado que inició sesión) y crea la **alerta** para el ciudadano.

### Atender (`PUT /tramite/estado`)
Cambia el estado → guarda en `seguimiento_tramite` (estado anterior, nuevo, observación, **quién lo hizo**) → crea una notificación con un mensaje claro para el ciudadano.

### Bandeja ordenada
`GET /tramites` ordena: primero los pendientes, luego por `puntaje_prioridad` de mayor a menor, y luego por fecha límite más cercana.

### El modelo Naive Bayes (`ml/priorizadorNaiveBayes.js`)
**Teorema de Bayes:** P(clase | datos) es proporcional a P(clase) × P(dato1 | clase) × P(dato2 | clase) × ...

1. **entrenar(filas):** cuenta cuántas veces aparece cada prioridad y cuántas veces aparece cada valor dentro de cada prioridad.
2. **predecir(modelo, ejemplo):** para ALTA, MEDIA y BAJA calcula:
   `log P(clase) + Σ log( (veces + 1) / (total_clase + k) )`
   - El **+1 es el suavizado de Laplace**: evita multiplicar por 0 si un valor nunca apareció.
   - Se usan **logaritmos** porque multiplicar muchas probabilidades pequeñas da números casi cero.
   - Al final se convierten a porcentajes que suman 100 (softmax).
3. **Puntaje 0-100** = P(ALTA)×100 + P(MEDIA)×50. Sirve para ordenar la bandeja.
4. **evaluar(filas):** separa 80% para entrenar y 20% para probar (cada 5.° registro) y calcula las métricas.

### Métricas (pantalla *Modelo de prioridad*)
| Métrica | Fórmula | Resultado |
|---|---|---|
| Exactitud | aciertos / total | 75.00% |
| Precisión | VP / (VP + FP) | 78.49% |
| Sensibilidad (recall) | VP / (VP + FN) | 76.20% |
| F1 | 2·P·R / (P + R) | 76.27% |

VP = verdaderos positivos, FP = falsos positivos, FN = falsos negativos. La **matriz de confusión** muestra filas = valor real y columnas = valor predicho; la diagonal son los aciertos.

### Aprendizaje continuo
Si el personal usa **Corregir prioridad**, el trámite se marca `prioridad_manual = 1` (el modelo ya no la cambia) y el caso se inserta en `historico_tramite` con la etiqueta correcta. En el siguiente **Reentrenar modelo** el modelo aprende de esa corrección.

## Preguntas que puede hacer el profesor

**¿Por qué Naive Bayes?**
Funciona bien con datos categóricos y pocos registros, entrena al instante, y se puede explicar: da probabilidades que el personal entiende.

**¿Por qué se llama "naive" (ingenuo)?**
Porque supone que las variables son independientes entre sí dada la clase. No siempre es cierto, pero en la práctica funciona bien.

**¿Qué es el suavizado de Laplace?**
Sumar 1 a cada conteo para que ningún valor tenga probabilidad 0. Sin eso, un solo dato nunca visto anularía toda la predicción.

**¿Por qué el accuracy no es 100%?**
Porque el histórico tiene un 10% de casos "ruidosos", como pasa en la vida real (decisiones humanas no siempre consistentes). Un 100% indicaría que el modelo memorizó los datos (sobreajuste).

**¿Por qué separar entrenamiento y prueba?**
Para medir el modelo con datos que no vio al aprender. Si lo midiéramos con los mismos datos, el resultado sería engañosamente alto.

**¿Qué métrica es la más importante aquí?**
La **sensibilidad de la clase ALTA**: un trámite crítico que el modelo no detecta puede vencer. La **precisión de ALTA** (88.9%) indica que casi no da falsas alarmas.

**¿Qué pasa si el servidor se reinicia?**
El modelo vive en memoria; `obtenerModelo` lo vuelve a entrenar automáticamente desde la base de datos la primera vez que se necesita.
