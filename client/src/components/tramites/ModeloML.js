// =====================================================================
//  MODELO DE PRIORIDAD (Machine Learning)        Responsable: Integrante 2
//  - Muestra las metricas de evaluacion (pregunta guia 3)
//  - Matriz de confusion y resultados por clase
//  - Simulador para probar el modelo con un caso
//  - Historial de entrenamientos (tabla modelo_ml)
// =====================================================================
import { useEffect, useState } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { API, COLOR_SELLO, formatoFechaHora, mensajeError } from '../../config';

const MySwal = withReactContent(Swal);

const NOMBRE_PRIORIDAD = { ALTA: "Alta", MEDIA: "Media", BAJA: "Baja" };
const COLOR_PRIORIDAD = { ALTA: "#c2410c", MEDIA: "#b7791f", BAJA: "#3f7d58" };

function ModeloML() {

  const [evaluacion, setEvaluacion] = useState(null);
  const [modelosList, setModelos] = useState([]);
  const [tiposList, setTipos] = useState([]);
  const [entrenando, setEntrenando] = useState(false);

  // Simulador
  const [tipo_tramite_id, setTipoTramiteId] = useState("");
  const [canal, setCanal] = useState("PRESENCIAL");
  const [situacion_plazo, setSituacionPlazo] = useState("A_TIEMPO");
  const [es_vulnerable, setEsVulnerable] = useState(false);
  const [documentos_completos, setDocumentosCompletos] = useState(true);
  const [prediccion, setPrediccion] = useState(null);

  const getEvaluacion = () => {
    Axios.get(`${API}/ml/evaluacion`).then((response) => {
      setEvaluacion(response.data);
      getModelos(); // si el modelo se entreno recien, aparece en el historial
    }).catch((error) => {
      MySwal.fire({ title: "Sin conexión", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const getModelos = () => {
    Axios.get(`${API}/ml/modelos`).then((response) => setModelos(response.data));
  }

  useEffect(() => {
    getEvaluacion();
    Axios.get(`${API}/tipos`).then((response) => setTipos(response.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entrenar = () => {
    setEntrenando(true);
    Axios.post(`${API}/ml/entrenar`).then((response) => {
      setEvaluacion(response.data);
      getModelos();
      setEntrenando(false);
      MySwal.fire({
        title: "Modelo reentrenado",
        text: `Aprendió de ${response.data.total_registros} casos. Exactitud en prueba: ${response.data.accuracy}%.`,
        icon: "success",
        confirmButtonColor: COLOR_SELLO
      });
    }).catch((error) => {
      setEntrenando(false);
      MySwal.fire({ title: "No se entrenó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const predecir = () => {
    if (tipo_tramite_id === "") {
      MySwal.fire({ title: "Falta el trámite", text: "Elige un tipo de trámite para probar el modelo.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return;
    }
    Axios.post(`${API}/ml/predecir`, {
      tipo_tramite_id: tipo_tramite_id,
      canal: canal,
      situacion_plazo: situacion_plazo,
      es_vulnerable: es_vulnerable,
      documentos_completos: documentos_completos
    }).then((response) => {
      setPrediccion(response.data);
    }).catch((error) => {
      MySwal.fire({ title: "No se calculó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  // Intensidad del color de cada celda de la matriz segun cuantos casos tiene
  const colorCelda = (real, pred, valor) => {
    const maximo = Math.max(1, ...evaluacion.clases.map((c) => evaluacion.matriz_confusion[c][c]));
    const alfa = Math.min(1, valor / maximo);
    if (real === pred) {
      return { background: `rgba(14, 124, 123, ${0.12 + alfa * 0.75})`, color: alfa > 0.5 ? "#fff" : "#1f2a44" };
    }
    return { background: valor > 0 ? `rgba(180, 35, 24, ${0.08 + alfa * 0.4})` : "#f5f7fa", color: "#1f2a44" };
  }

  return (
    <div>
      <header className="pagina-cabecera">
        <div>
          <h1>Modelo de prioridad</h1>
          <p>Naive Bayes entrenado con el historial de trámites de la municipalidad. Aquí se ve qué tan bien acierta y se puede probar con un caso.</p>
        </div>
        <button className="btn btn-success" onClick={entrenar} disabled={entrenando}>
          <i className="bi bi-arrow-repeat"></i>{entrenando ? "Entrenando..." : "Reentrenar modelo"}
        </button>
      </header>

      {evaluacion && (
        <div className="card mb-3">
          <div className="card-header">
            <span className="card-header-titulo"><i className="bi bi-clipboard-data"></i>Resultados en datos de prueba</span>
            <span className="explicacion fw-normal">
              {evaluacion.registros_entrenamiento} casos para aprender, {evaluacion.registros_prueba} para evaluar
            </span>
          </div>
          <div className="metricas">
            <div className="metrica"><strong>{evaluacion.accuracy}%</strong><span>Exactitud: casos que acertó</span></div>
            <div className="metrica"><strong>{evaluacion.precision_macro}%</strong><span>Precisión: cuando asigna una prioridad, acierta</span></div>
            <div className="metrica"><strong>{evaluacion.recall_macro}%</strong><span>Sensibilidad: casos de cada prioridad que detecta</span></div>
            <div className="metrica"><strong>{evaluacion.f1_macro}%</strong><span>F1: balance de las dos anteriores</span></div>
          </div>
          <div className="card-body">
            <div className="tablero">
              <div>
                <h3 className="h6 fw-bold mb-3">Matriz de confusión</h3>
                <div className="matriz" role="table" aria-label="Matriz de confusión">
                  <div className="eje">Real \ Predicho</div>
                  {evaluacion.clases.map((c) => <div className="eje fw-bold" key={"h" + c}>{NOMBRE_PRIORIDAD[c]}</div>)}
                  {evaluacion.clases.map((real) => [
                    <div className="eje fw-bold text-start" key={"r" + real}>{NOMBRE_PRIORIDAD[real]}</div>,
                    ...evaluacion.clases.map((pred) => (
                      <div className="celda" key={real + pred} style={colorCelda(real, pred, evaluacion.matriz_confusion[real][pred])}>
                        {evaluacion.matriz_confusion[real][pred]}
                      </div>
                    ))
                  ])}
                </div>
                <p className="explicacion mt-2 mb-0">La diagonal verde son los aciertos; las celdas rojas, las confusiones.</p>
              </div>
              <div>
                <h3 className="h6 fw-bold mb-3">Resultados por prioridad</h3>
                <table className="table">
                  <thead>
                    <tr><th>Prioridad</th><th className="text-end">Precisión</th><th className="text-end">Sensibilidad</th><th className="text-end">F1</th><th className="text-end">Casos</th></tr>
                  </thead>
                  <tbody>
                    {evaluacion.por_clase.map((c) => (
                      <tr key={c.clase}>
                        <td><span className={"prioridad prioridad-" + c.clase}>{NOMBRE_PRIORIDAD[c.clase]}</span></td>
                        <td className="text-end">{c.precision}%</td>
                        <td className="text-end">{c.recall}%</td>
                        <td className="text-end fw-bold">{c.f1}%</td>
                        <td className="text-end">{c.soporte}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="tablero">
        <div className="card">
          <div className="card-header">
            <span className="card-header-titulo"><i className="bi bi-joystick"></i>Probar el modelo</span>
          </div>
          <div className="card-body">
            <div className="input-group mb-3">
              <span className="input-group-text" id="m-tipo">Trámite</span>
              <select className="form-select" value={tipo_tramite_id} aria-describedby="m-tipo"
                onChange={(event) => {
                  setTipoTramiteId(event.target.value);
                }}>
                <option value="">Elige el tipo de trámite</option>
                {tiposList.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div className="d-flex gap-2 mb-3">
              <div className="input-group">
                <span className="input-group-text" style={{ minWidth: 0 }} id="m-canal">Canal</span>
                <select className="form-select" value={canal} aria-describedby="m-canal"
                  onChange={(event) => {
                    setCanal(event.target.value);
                  }}>
                  <option value="PRESENCIAL">Presencial</option>
                  <option value="VIRTUAL">Virtual</option>
                </select>
              </div>
              <div className="input-group">
                <span className="input-group-text" style={{ minWidth: 0 }} id="m-plazo">Plazo</span>
                <select className="form-select" value={situacion_plazo} aria-describedby="m-plazo"
                  onChange={(event) => {
                    setSituacionPlazo(event.target.value);
                  }}>
                  <option value="A_TIEMPO">A tiempo</option>
                  <option value="POR_VENCER">Por vencer</option>
                  <option value="VENCIDO">Vencido</option>
                </select>
              </div>
            </div>
            <div className="form-check mb-1">
              <input className="form-check-input" type="checkbox" id="m-vul" checked={es_vulnerable}
                onChange={(event) => {
                  setEsVulnerable(event.target.checked);
                }} />
              <label className="form-check-label" htmlFor="m-vul">Ciudadano con atención preferente</label>
            </div>
            <div className="form-check mb-3">
              <input className="form-check-input" type="checkbox" id="m-docs" checked={documentos_completos}
                onChange={(event) => {
                  setDocumentosCompletos(event.target.checked);
                }} />
              <label className="form-check-label" htmlFor="m-docs">Presentó todos los requisitos</label>
            </div>

            {prediccion && (
              <div className="border-top pt-3" aria-live="polite">
                <p className="mb-3">
                  Prioridad sugerida <span className={"prioridad prioridad-" + prediccion.prioridad}>{NOMBRE_PRIORIDAD[prediccion.prioridad]}</span>
                  <span className="explicacion ms-2">puntaje {prediccion.puntaje} de 100</span>
                </p>
                {["ALTA", "MEDIA", "BAJA"].map((c) => (
                  <div className="probabilidad" key={c}>
                    <span>{NOMBRE_PRIORIDAD[c]}</span>
                    <div className="barra-pista"><span style={{ width: prediccion.probabilidades[c] + "%", background: COLOR_PRIORIDAD[c] }}></span></div>
                    <strong className="numero text-end">{prediccion.probabilidades[c]}%</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card-footer">
            <button className="btn btn-success" onClick={predecir}><i className="bi bi-calculator"></i>Calcular prioridad</button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-header-titulo"><i className="bi bi-lightbulb"></i>Cómo decide el modelo</span>
          </div>
          <div className="card-body explicacion">
            <p className="mb-1">Para cada expediente nuevo, el modelo:</p>
            <ol>
              <li>Cuenta cuántas veces cada prioridad aparece en el historial (probabilidad previa).</li>
              <li>Mira cinco datos: tipo de trámite, canal, atención preferente, requisitos completos y situación del plazo.</li>
              <li>Calcula qué tan común es cada dato dentro de cada prioridad, con suavizado de Laplace para no dar cero.</li>
              <li>Multiplica todo (Teorema de Bayes) y elige la prioridad más probable.</li>
              <li>Convierte las probabilidades en un puntaje de 0 a 100 para ordenar la bandeja.</li>
            </ol>
            <p className="mt-2 mb-0">Cuando el personal corrige una prioridad, ese caso se agrega al historial y el modelo aprende en el siguiente entrenamiento.</p>
          </div>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-header">
          <span className="card-header-titulo"><i className="bi bi-clock-history"></i>Historial de entrenamientos</span>
          <span className="contador">{modelosList.length}</span>
        </div>
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Algoritmo</th>
                <th className="text-end">Casos</th>
                <th className="text-end">Exactitud</th>
                <th className="text-end">Precisión</th>
                <th className="text-end">Sensibilidad</th>
                <th className="text-end">F1</th>
              </tr>
            </thead>
            <tbody>
              {modelosList.map((m) => (
                <tr key={m.id}>
                  <td>{formatoFechaHora(m.fecha_entrenamiento)}</td>
                  <td>{m.algoritmo}</td>
                  <td className="text-end">{m.total_registros}</td>
                  <td className="text-end fw-bold">{m.accuracy}%</td>
                  <td className="text-end">{m.precision_macro}%</td>
                  <td className="text-end">{m.recall_macro}%</td>
                  <td className="text-end">{m.f1_macro}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ModeloML;
