// =====================================================================
//  MODELO DE MACHINE LEARNING: NAIVE BAYES CATEGORICO
//  Objetivo : predecir la PRIORIDAD de un tramite (ALTA / MEDIA / BAJA)
//  Responsable: Integrante 2
//
//  IDEA (Teorema de Bayes):
//     P(clase | datos) ~ P(clase) * P(dato1 | clase) * P(dato2 | clase) * ...
//  - P(clase): que tan frecuente es cada prioridad en el historico.
//  - P(dato | clase): que tan frecuente es ese valor dentro de esa prioridad.
//  - Se usa SUAVIZADO DE LAPLACE (+1) para que nunca salga probabilidad 0.
//  - Se trabaja con logaritmos para no multiplicar numeros muy pequenos.
//
//  DATASET  : tabla historico_tramite (240 casos etiquetados)
//  VARIABLES: tipo_tramite_id, canal, es_vulnerable,
//             documentos_completos, situacion_plazo
//  VALIDACION: 80% entrenamiento / 20% prueba (cada 5to registro es prueba)
//  METRICAS : accuracy, precision, recall, F1 y matriz de confusion
// =====================================================================
const db = require("../config/db");

const CLASES = ["ALTA", "MEDIA", "BAJA"];
const ATRIBUTOS = ["tipo_tramite_id", "canal", "es_vulnerable", "documentos_completos", "situacion_plazo"];

let modelo = null;           // modelo entrenado con el 100% de los datos (se usa para predecir)
let ultimaEvaluacion = null; // metricas de la ultima evaluacion 80/20

// ---------------------------------------------------------------------
// 1. ENTRENAR: contar frecuencias
// ---------------------------------------------------------------------
function entrenar(filas) {
    const conteoClase = {};
    const conteoValor = {};   // conteoValor[atributo][clase][valor]
    const valoresPosibles = {}; // valores distintos de cada atributo

    CLASES.forEach((c) => { conteoClase[c] = 0; });
    ATRIBUTOS.forEach((a) => {
        conteoValor[a] = {};
        valoresPosibles[a] = new Set();
        CLASES.forEach((c) => { conteoValor[a][c] = {}; });
    });

    filas.forEach((fila) => {
        const clase = fila.prioridad_real;
        conteoClase[clase]++;
        ATRIBUTOS.forEach((a) => {
            const valor = String(fila[a]);
            valoresPosibles[a].add(valor);
            conteoValor[a][clase][valor] = (conteoValor[a][clase][valor] || 0) + 1;
        });
    });

    return { total: filas.length, conteoClase, conteoValor, valoresPosibles };
}

// ---------------------------------------------------------------------
// 2. PREDECIR: aplicar Bayes con Laplace y devolver probabilidades
// ---------------------------------------------------------------------
function predecir(m, ejemplo) {
    const logProb = {};

    CLASES.forEach((c) => {
        // P(clase) con Laplace
        let lp = Math.log((m.conteoClase[c] + 1) / (m.total + CLASES.length));
        ATRIBUTOS.forEach((a) => {
            const valor = String(ejemplo[a]);
            const veces = m.conteoValor[a][c][valor] || 0;
            const k = m.valoresPosibles[a].size + 1; // +1 por si llega un valor nunca visto
            lp += Math.log((veces + 1) / (m.conteoClase[c] + k));
        });
        logProb[c] = lp;
    });

    // Convertimos los logaritmos a probabilidades que suman 1 (softmax)
    const maximo = Math.max(...CLASES.map((c) => logProb[c]));
    let suma = 0;
    const prob = {};
    CLASES.forEach((c) => { prob[c] = Math.exp(logProb[c] - maximo); suma += prob[c]; });
    CLASES.forEach((c) => { prob[c] = prob[c] / suma; });

    const prioridad = CLASES.reduce((mejor, c) => (prob[c] > prob[mejor] ? c : mejor), CLASES[0]);

    // Puntaje 0-100 para ORDENAR la bandeja: ALTA pesa 100, MEDIA 50, BAJA 0
    const puntaje = Math.round((prob.ALTA * 100 + prob.MEDIA * 50) * 100) / 100;

    return {
        prioridad: prioridad,
        puntaje: puntaje,
        probabilidades: {
            ALTA: Math.round(prob.ALTA * 10000) / 100,
            MEDIA: Math.round(prob.MEDIA * 10000) / 100,
            BAJA: Math.round(prob.BAJA * 10000) / 100
        }
    };
}

// ---------------------------------------------------------------------
// 3. EVALUAR: 80% entrena / 20% prueba -> metricas (pregunta guia 3)
// ---------------------------------------------------------------------
function evaluar(filas) {
    const entrenamiento = filas.filter((f, i) => i % 5 !== 0);
    const prueba = filas.filter((f, i) => i % 5 === 0);
    const m = entrenar(entrenamiento);

    // matriz[real][predicho]
    const matriz = {};
    CLASES.forEach((r) => { matriz[r] = {}; CLASES.forEach((p) => { matriz[r][p] = 0; }); });

    let aciertos = 0;
    prueba.forEach((fila) => {
        const pred = predecir(m, fila).prioridad;
        matriz[fila.prioridad_real][pred]++;
        if (pred === fila.prioridad_real) aciertos++;
    });

    const porClase = CLASES.map((c) => {
        const vp = matriz[c][c];                                              // verdaderos positivos
        const fp = CLASES.reduce((s, r) => s + (r !== c ? matriz[r][c] : 0), 0); // falsos positivos
        const fn = CLASES.reduce((s, p) => s + (p !== c ? matriz[c][p] : 0), 0); // falsos negativos
        const precision = vp + fp === 0 ? 0 : vp / (vp + fp);
        const recall = vp + fn === 0 ? 0 : vp / (vp + fn);
        const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
        return {
            clase: c,
            soporte: vp + fn,
            precision: Math.round(precision * 10000) / 100,
            recall: Math.round(recall * 10000) / 100,
            f1: Math.round(f1 * 10000) / 100
        };
    });

    const promedio = (campo) => Math.round((porClase.reduce((s, x) => s + x[campo], 0) / CLASES.length) * 100) / 100;

    return {
        total_registros: filas.length,
        registros_entrenamiento: entrenamiento.length,
        registros_prueba: prueba.length,
        accuracy: Math.round((aciertos / prueba.length) * 10000) / 100,
        precision_macro: promedio("precision"),
        recall_macro: promedio("recall"),
        f1_macro: promedio("f1"),
        por_clase: porClase,
        matriz_confusion: matriz,
        clases: CLASES
    };
}

// ---------------------------------------------------------------------
// 4. ENTRENAR DESDE LA BASE DE DATOS y guardar metricas en modelo_ml
// ---------------------------------------------------------------------
function entrenarDesdeBD(callback) {
    db.query('SELECT * FROM historico_tramite ORDER BY id', (err, filas) => {
        if (err) {
            return callback(err);
        }
        if (filas.length < 10) {
            return callback(new Error("Se necesitan al menos 10 registros históricos para entrenar"));
        }

        ultimaEvaluacion = evaluar(filas);
        modelo = entrenar(filas); // el modelo final aprende de TODOS los datos

        const e = ultimaEvaluacion;
        db.query(`INSERT INTO modelo_ml(nombre,algoritmo,total_registros,registros_prueba,accuracy,precision_macro,recall_macro,f1_macro)
                  VALUES(?,?,?,?,?,?,?,?)`,
            ["Priorizador de trámites", "Naive Bayes categorico (Laplace)", e.total_registros, e.registros_prueba,
                e.accuracy, e.precision_macro, e.recall_macro, e.f1_macro],
            (err2) => {
                if (err2) {
                    return callback(err2);
                }
                console.log("Modelo Naive Bayes entrenado. Accuracy: " + e.accuracy + "%");
                callback(null, ultimaEvaluacion);
            }
        );
    });
}

// Si el servidor se reinicio y aun no hay modelo, se entrena solo
function obtenerModelo(callback) {
    if (modelo) {
        return callback(null, modelo);
    }
    entrenarDesdeBD((err) => {
        if (err) {
            return callback(err);
        }
        callback(null, modelo);
    });
}

function obtenerEvaluacion(callback) {
    if (ultimaEvaluacion) {
        return callback(null, ultimaEvaluacion);
    }
    entrenarDesdeBD(callback);
}

// Situacion del plazo segun los dias que faltan para la fecha limite
function calcularSituacionPlazo(diasRestantes, plazoDias) {
    if (diasRestantes < 0) return "VENCIDO";
    if (diasRestantes <= plazoDias * 0.5) return "POR_VENCER";
    return "A_TIEMPO";
}

module.exports = {
    CLASES,
    ATRIBUTOS,
    predecir,
    entrenarDesdeBD,
    obtenerModelo,
    obtenerEvaluacion,
    calcularSituacionPlazo
};
