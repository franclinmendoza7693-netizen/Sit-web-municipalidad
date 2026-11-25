// =====================================================================
//  MODELO DE MACHINE LEARNING (PLN): TF-IDF + SIMILITUD COSENO
//  Objetivo : comparar cada curriculum con el perfil de la convocatoria
//             y generar un RANKING de postulantes.
//  Responsable: Integrante 3
//
//  PASOS:
//   1. Normalizar texto: minusculas, sin tildes, sin signos, sin "stopwords".
//   2. TF  (frecuencia del termino): cuantas veces aparece la palabra en el documento.
//   3. IDF (frecuencia inversa): las palabras que aparecen en TODOS los CV valen menos.
//          idf = ln( (1 + N) / (1 + df) ) + 1
//   4. Cada documento se vuelve un VECTOR de pesos tf*idf.
//   5. Similitud coseno entre el vector del perfil y el de cada CV (0 a 1).
//
//  PUNTAJE FINAL (0 a 100):
//      60% similitud del CV con el perfil
//    + 25% experiencia (respecto a la experiencia minima)
//    + 15% grado academico
//  REGLA: si no cumple la experiencia minima o el total < 55 -> NO APTO
// =====================================================================

const STOPWORDS = new Set([
    "a", "al", "algo", "ante", "antes", "como", "con", "contra", "cual", "cuando", "de", "del", "desde", "donde",
    "durante", "e", "el", "ella", "ellos", "en", "entre", "era", "es", "esa", "ese", "eso", "esta", "este", "esto",
    "fue", "ha", "hace", "hasta", "hay", "la", "las", "le", "les", "lo", "los", "mas", "me", "mi", "muy", "no", "nos",
    "o", "otra", "otro", "para", "pero", "por", "que", "se", "sea", "ser", "si", "sin", "sobre", "su", "sus", "tambien",
    "tiene", "todo", "tu", "un", "una", "uno", "unos", "y", "ya", "anios", "anos", "ano", "experiencia", "conocimiento",
    "conocimientos", "manejo", "deseable", "nivel"
]);

const PUNTAJE_GRADO = { SECUNDARIA: 20, TECNICO: 60, BACHILLER: 75, TITULADO: 90, MAESTRIA: 100 };

// 1. Normalizar y separar en palabras (tokens)
function tokenizar(texto) {
    return String(texto || "")
        .toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "") // quita tildes
        .replace(/[^a-z0-9\s]/g, " ")                    // quita signos
        .split(/\s+/)
        .filter((p) => p.length > 2 && !STOPWORDS.has(p));
}

// 2. Frecuencia de terminos (TF normalizado por la longitud del documento)
function calcularTF(tokens) {
    const tf = {};
    tokens.forEach((t) => { tf[t] = (tf[t] || 0) + 1; });
    Object.keys(tf).forEach((t) => { tf[t] = tf[t] / tokens.length; });
    return tf;
}

// 3. IDF de todo el corpus (perfil + curriculums)
function calcularIDF(documentosTokens) {
    const N = documentosTokens.length;
    const df = {};
    documentosTokens.forEach((tokens) => {
        new Set(tokens).forEach((t) => { df[t] = (df[t] || 0) + 1; });
    });
    const idf = {};
    Object.keys(df).forEach((t) => { idf[t] = Math.log((1 + N) / (1 + df[t])) + 1; });
    return idf;
}

// 4. Vector TF-IDF
function vectorTFIDF(tokens, idf) {
    const tf = calcularTF(tokens);
    const vector = {};
    Object.keys(tf).forEach((t) => { vector[t] = tf[t] * (idf[t] || 0); });
    return vector;
}

// 5. Similitud coseno = (A . B) / (|A| * |B|)
function similitudCoseno(a, b) {
    let producto = 0;
    let normaA = 0;
    let normaB = 0;
    Object.keys(a).forEach((t) => {
        normaA += a[t] * a[t];
        if (b[t]) producto += a[t] * b[t];
    });
    Object.keys(b).forEach((t) => { normaB += b[t] * b[t]; });
    if (normaA === 0 || normaB === 0) return 0;
    return producto / (Math.sqrt(normaA) * Math.sqrt(normaB));
}

function redondear(n) {
    return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------
// FUNCION PRINCIPAL: evalua a todos los postulantes de una convocatoria
// ---------------------------------------------------------------------
function evaluarPostulantes(convocatoria, postulantes) {
    const tokensPerfil = tokenizar(convocatoria.perfil_requerido + " " + convocatoria.titulo);
    const tokensCV = postulantes.map((p) => tokenizar(p.curriculum_texto));
    const idf = calcularIDF([tokensPerfil].concat(tokensCV));
    const vPerfil = vectorTFIDF(tokensPerfil, idf);

    const resultados = postulantes.map((p, i) => {
        const vCV = vectorTFIDF(tokensCV[i], idf);
        const coseno = similitudCoseno(vPerfil, vCV);

        // Un CV muy bueno rara vez supera 0.5 de coseno con un perfil corto,
        // por eso se escala x2 (tope 100) para expresarlo de 0 a 100.
        const similitud = Math.min(100, coseno * 200);

        const minimo = convocatoria.experiencia_minima;
        let experiencia;
        if (minimo === 0) {
            experiencia = Math.min(100, 60 + p.anios_experiencia * 10);
        } else if (p.anios_experiencia >= minimo) {
            experiencia = Math.min(100, 70 + (p.anios_experiencia - minimo) * 10);
        } else {
            experiencia = (p.anios_experiencia / minimo) * 50;
        }

        const grado = PUNTAJE_GRADO[p.grado_academico] || 0;
        const total = similitud * 0.6 + experiencia * 0.25 + grado * 0.15;
        const cumpleMinimo = p.anios_experiencia >= minimo;

        // Palabras del perfil que tambien estan en el CV (ordenadas por peso)
        const coincidentes = Object.keys(vPerfil)
            .filter((t) => vCV[t])
            .sort((x, y) => vPerfil[y] - vPerfil[x])
            .slice(0, 8)
            .join(", ");

        return {
            postulante_id: p.id,
            puntaje_similitud: redondear(similitud),
            puntaje_experiencia: redondear(experiencia),
            puntaje_grado: redondear(grado),
            puntaje_total: redondear(total),
            resultado: cumpleMinimo && total >= 55 ? "APTO" : "NO APTO",
            palabras_coincidentes: coincidentes
        };
    });

    return resultados.sort((a, b) => b.puntaje_total - a.puntaje_total);
}

module.exports = { tokenizar, evaluarPostulantes };
