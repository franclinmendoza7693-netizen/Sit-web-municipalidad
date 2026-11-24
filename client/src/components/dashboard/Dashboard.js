// =====================================================================
//  PANEL DE CONTROL - analisis de datos y cuellos de botella
//  Responsable: Integrante 1
//  Responde la pregunta guia 1: que tramites y areas generan mas retraso.
// =====================================================================
import { useEffect, useState } from 'react';
import Axios from 'axios';
import { API, ESTADOS, mensajeError } from '../../config';

const COLOR_ESTADO = {
  REGISTRADO: "#8a96a8",
  EN_REVISION: "#2f5da8",
  OBSERVADO: "#b7791f",
  APROBADO: "#3f7d58",
  RECHAZADO: "#b42318",
  FINALIZADO: "#1f2a44"
};

const COLOR_PRIORIDAD = { ALTA: "#c2410c", MEDIA: "#b7791f", BAJA: "#3f7d58" };

function Dashboard() {

  const [indicadores, setIndicadores] = useState(null);
  const [estadosList, setEstados] = useState([]);
  const [areasList, setAreas] = useState([]);
  const [prioridadesList, setPrioridades] = useState([]);
  const [tiposList, setTipos] = useState([]);
  const [error, setError] = useState("");

  const getDatos = () => {
    Axios.get(`${API}/dashboard/indicadores`).then((response) => {
      setIndicadores(response.data);
      setError("");
    }).catch((err) => {
      setError(mensajeError(err));
    });
    Axios.get(`${API}/dashboard/estados`).then((response) => setEstados(response.data));
    Axios.get(`${API}/dashboard/areas`).then((response) => setAreas(response.data));
    Axios.get(`${API}/dashboard/prioridades`).then((response) => setPrioridades(response.data));
    Axios.get(`${API}/dashboard/tipos`).then((response) => setTipos(response.data));
  }

  useEffect(() => {
    getDatos();
  }, []);

  const plural = (n, uno, varios) => (n === 1 ? uno : varios);

  // Frase principal del dia
  const frase = () => {
    const c = indicadores.criticos;
    const v = indicadores.vencidos;
    if (c === 0 && v === 0) {
      return <>No hay expedientes críticos ni vencidos. <b>La bandeja está al día.</b></>;
    }
    return (
      <>
        Hoy hay <b>{c} {plural(c, "expediente crítico", "expedientes críticos")}</b> y{" "}
        <b>{v} {plural(v, "vencido", "vencidos")}</b> esperando atención.
      </>
    );
  }

  const maxEstado = Math.max(1, ...estadosList.map((e) => e.total));
  const totalPendientesPrioridad = prioridadesList.reduce((s, p) => s + p.total, 0);

  const semaforo = (a) => {
    if (a.vencidos > 0) return "semaforo-rojo";
    if (a.pendientes > 2) return "semaforo-ambar";
    return "semaforo-verde";
  }

  if (error) {
    return (
      <div>
        <header className="pagina-cabecera"><div><h1>Panel de control</h1></div></header>
        <div className="card"><div className="vacio"><i className="bi bi-plug"></i>{error}</div></div>
      </div>
    );
  }

  return (
    <div>
      <header className="pagina-cabecera">
        <div>
          <h1>Panel de control</h1>
          <p>Cómo está la atención de trámites hoy y en qué áreas se acumulan los expedientes.</p>
        </div>
        <button className="btn btn-info" onClick={getDatos}><i className="bi bi-arrow-clockwise"></i>Actualizar</button>
      </header>

      {indicadores && (
        <section className="resumen-dia" aria-live="polite">
          <h2>{frase()}</h2>
          <div className="resumen-cifras numero">
            <span><b>{indicadores.pendientes}</b>pendientes</span>
            <span><b>{indicadores.atendidos}</b>atendidos</span>
            <span><b>{indicadores.total}</b>expedientes en total</span>
            <span><b>{indicadores.ciudadanos}</b>ciudadanos registrados</span>
            <span><b>{indicadores.satisfaccion || "—"}</b>de 5 en satisfacción</span>
          </div>
        </section>
      )}

      <div className="tablero">
        <div className="card">
          <div className="card-header">
            <span className="card-header-titulo"><i className="bi bi-signpost-split"></i>Cuellos de botella por área</span>
          </div>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th scope="col">Área</th>
                  <th scope="col" className="text-end">Pendientes</th>
                  <th scope="col" className="text-end">Vencidos</th>
                  <th scope="col" className="text-end">Días promedio</th>
                </tr>
              </thead>
              <tbody>
                {areasList.map((a) => (
                  <tr key={a.id}>
                    <td className="celda-principal">
                      <span className={"semaforo " + semaforo(a)} aria-hidden="true"></span>
                      {a.area}
                    </td>
                    <td className="text-end">{a.pendientes}</td>
                    <td className={a.vencidos > 0 ? "text-end plazo-vencido" : "text-end"}>{a.vencidos}</td>
                    <td className="text-end">{a.promedio_dias === null ? "—" : a.promedio_dias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-footer justify-content-start explicacion">
            <span><span className="semaforo semaforo-rojo"></span>Con vencidos</span>
            <span className="ms-3"><span className="semaforo semaforo-ambar"></span>Más de 2 pendientes</span>
            <span className="ms-3"><span className="semaforo semaforo-verde"></span>Al día</span>
          </div>
        </div>

        <div className="d-grid gap-3">
          <div className="card">
            <div className="card-header">
              <span className="card-header-titulo"><i className="bi bi-bar-chart-steps"></i>Expedientes por estado</span>
            </div>
            <div className="card-body">
              {estadosList.map((e) => (
                <div className="barra-fila" key={e.estado}>
                  <span>{ESTADOS[e.estado] || e.estado}</span>
                  <div className="barra-pista">
                    <span style={{ width: (e.total / maxEstado) * 100 + "%", background: COLOR_ESTADO[e.estado] }}></span>
                  </div>
                  <strong className="numero text-end">{e.total}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-header-titulo"><i className="bi bi-cpu"></i>Pendientes según el modelo de prioridad</span>
            </div>
            <div className="card-body">
              {["ALTA", "MEDIA", "BAJA"].map((p) => {
                const fila = prioridadesList.find((x) => x.prioridad === p);
                const total = fila ? fila.total : 0;
                return (
                  <div className="barra-fila" key={p}>
                    <span className={"prioridad prioridad-" + p}>{p.charAt(0) + p.slice(1).toLowerCase()}</span>
                    <div className="barra-pista">
                      <span style={{ width: (totalPendientesPrioridad ? (total / totalPendientesPrioridad) * 100 : 0) + "%", background: COLOR_PRIORIDAD[p] }}></span>
                    </div>
                    <strong className="numero text-end">{total}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-header">
          <span className="card-header-titulo"><i className="bi bi-hourglass-split"></i>Trámites que más demoran</span>
        </div>
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th scope="col">Tipo de trámite</th>
                <th scope="col" className="text-end">Plazo legal</th>
                <th scope="col" className="text-end">Días promedio</th>
                <th scope="col" className="text-end">Expedientes</th>
                <th scope="col" className="text-end">Vencidos</th>
              </tr>
            </thead>
            <tbody>
              {tiposList.map((t) => (
                <tr key={t.tipo}>
                  <td className="celda-principal">{t.tipo}</td>
                  <td className="text-end">{t.plazo_dias} días</td>
                  <td className={t.promedio_dias > t.plazo_dias ? "text-end plazo-vencido" : "text-end"}>{t.promedio_dias}</td>
                  <td className="text-end">{t.total}</td>
                  <td className={t.vencidos > 0 ? "text-end plazo-vencido" : "text-end"}>{t.vencidos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
