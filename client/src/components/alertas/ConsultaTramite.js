// =====================================================================
//  CONSULTA DEL CIUDADANO (portal publico)        Responsable: Integrante 3
//  - El ciudadano ingresa su CODIGO de expediente + DNI (proteccion de datos)
//  - Ve el avance, el historial y sus alertas
//  - "Tiempo real": se vuelve a consultar cada 10 segundos (setInterval)
//    y si llega una alerta nueva se muestra un aviso (toast)
// =====================================================================
import { useEffect, useRef, useState } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { API, ESTADOS, COLOR_SELLO, formatoFecha, formatoFechaHora, mensajeError } from '../../config';

const MySwal = withReactContent(Swal);

const SEGUNDOS_ACTUALIZACION = 10;
const PASOS = ["REGISTRADO", "EN_REVISION", "APROBADO", "FINALIZADO"];
const ICONO_CANAL = { CORREO: "bi-envelope", SMS: "bi-phone", SISTEMA: "bi-bell" };

function ConsultaTramite() {

  const [codigo, setCodigo] = useState("");
  const [dni, setDni] = useState("");
  const [consulta, setConsulta] = useState(null);   // {codigo, dni} que se esta siguiendo
  const [resultado, setResultado] = useState(null); // {tramite, seguimiento, notificaciones}
  const totalAlertas = useRef(0);

  const buscar = (codigoBuscar, dniBuscar, esActualizacion) => {
    Axios.get(`${API}/consulta/${encodeURIComponent(codigoBuscar)}/${encodeURIComponent(dniBuscar)}`).then((response) => {
      const datos = response.data;
      // Si hay mas alertas que antes, avisamos al ciudadano
      if (esActualizacion && datos.notificaciones.length > totalAlertas.current) {
        const nueva = datos.notificaciones[0];
        MySwal.fire({
          toast: true,
          position: "top-end",
          icon: "info",
          title: nueva.titulo,
          text: nueva.mensaje,
          showConfirmButton: false,
          timer: 6000,
          timerProgressBar: true
        });
      }
      totalAlertas.current = datos.notificaciones.length;
      setResultado(datos);
    }).catch((error) => {
      if (!esActualizacion) {
        setResultado(null);
        setConsulta(null);
        MySwal.fire({ title: "No encontrado", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
      }
    });
  }

  const consultar = () => {
    const c = codigo.trim().toUpperCase();
    if (c === "" || !/^\d{8}$/.test(dni)) {
      MySwal.fire({ title: "Faltan datos", text: "Escribe el código del expediente y tu DNI de 8 números.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return;
    }
    totalAlertas.current = 0;
    setConsulta({ codigo: c, dni: dni });
    buscar(c, dni, false);
  }

  // Actualizacion automatica mientras haya una consulta activa
  useEffect(() => {
    if (!consulta) return;
    const intervalo = setInterval(() => {
      buscar(consulta.codigo, consulta.dni, true);
    }, SEGUNDOS_ACTUALIZACION * 1000);
    return () => clearInterval(intervalo); // se limpia al salir de la pantalla
  }, [consulta]);

  const marcarLeidas = () => {
    Axios.put(`${API}/consulta/leido`, { tramite_id: resultado.tramite.id }).then(() => {
      buscar(consulta.codigo, consulta.dni, false);
    });
  }

  const dejarDeSeguir = () => {
    setConsulta(null);
    setResultado(null);
    setCodigo("");
    setDni("");
  }

  // Indice del paso actual en la linea de avance
  const pasoActual = (estado) => {
    if (estado === "OBSERVADO") return 1;
    if (estado === "RECHAZADO") return 2;
    return PASOS.indexOf(estado);
  }

  const t = resultado ? resultado.tramite : null;
  const sinLeer = resultado ? resultado.notificaciones.filter((n) => n.leido === 0).length : 0;

  return (
    <div>
      <header className="pagina-cabecera">
        <div>
          <h1>Consultar expediente</h1>
          <p>Con el código de expediente y el DNI ves en qué va el trámite, sin hacer cola. La página se actualiza sola.</p>
        </div>
        {consulta && <span className="en-vivo">Actualizando cada {SEGUNDOS_ACTUALIZACION} segundos</span>}
      </header>

      <div className="consulta">
        <div className="card">
          <div className="card-header">
            <span className="card-header-titulo"><i className="bi bi-search"></i>Buscar mi trámite</span>
          </div>
          <div className="card-body">
            <div className="input-group mb-3">
              <span className="input-group-text" id="q-cod">Expediente</span>
              <input type="text" value={codigo}
                onChange={(event) => {
                  setCodigo(event.target.value);
                }}
                onKeyDown={(event) => { if (event.key === "Enter") consultar(); }}
                className="form-control" placeholder="EXP-2026-000001" aria-describedby="q-cod" />
            </div>
            <div className="input-group mb-3">
              <span className="input-group-text" id="q-dni">DNI</span>
              <input type="text" value={dni} maxLength={8} inputMode="numeric"
                onChange={(event) => {
                  setDni(event.target.value.replace(/\D/g, ""));
                }}
                onKeyDown={(event) => { if (event.key === "Enter") consultar(); }}
                className="form-control" placeholder="DNI del titular" aria-describedby="q-dni" />
            </div>
            <p className="ayuda mt-0 mb-0">
              <i className="bi bi-shield-lock me-1"></i>Pedimos ambos datos para que nadie más vea tu trámite (Ley N.° 29733).
            </p>
          </div>
          <div className="card-footer">
            {consulta && <button className="btn btn-info" onClick={dejarDeSeguir}>Nueva consulta</button>}
            <button className="btn btn-success" onClick={consultar}><i className="bi bi-search"></i>Consultar</button>
          </div>
        </div>

        {!t && (
          <div className="card">
            <div className="vacio">
              <i className="bi bi-folder2-open"></i>
              Escribe tu código de expediente y DNI para ver el avance.<br />
              Para probar: <span className="expediente">EXP-2026-000004</span> con DNI 08765432.
            </div>
          </div>
        )}

        {t && (
          <div className="d-grid gap-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex justify-content-between flex-wrap gap-2 mb-2">
                  <div>
                    <p className="mb-1 text-secondary">Hola, {t.nombres} {t.inicial_apellido}.</p>
                    <h2 className="h4 mb-1">{t.tipo_tramite}</h2>
                    <span className="expediente">{t.codigo_expediente}</span>
                    <span className="ms-2 text-secondary">{t.area}</span>
                  </div>
                  <div className="text-end">
                    <span className={"estado estado-" + t.estado}>{ESTADOS[t.estado]}</span>
                    <p className="mb-0 mt-2 explicacion">
                      {t.dias_restantes < 0 && ["APROBADO", "RECHAZADO", "FINALIZADO"].indexOf(t.estado) === -1
                        ? <span className="plazo-vencido">Plazo vencido el {formatoFecha(t.fecha_limite)}</span>
                        : <>Fecha límite: {formatoFecha(t.fecha_limite)}</>}
                    </p>
                  </div>
                </div>

                <div className="avance" aria-label="Avance del trámite">
                  {PASOS.map((p, i) => {
                    const actual = pasoActual(t.estado);
                    let clase = "avance-paso";
                    if (i <= actual) clase += " hecho";
                    if (i === actual) clase += " actual";
                    let texto = ESTADOS[p];
                    if (i === 1 && t.estado === "OBSERVADO") texto = "Observado";
                    if (i === 2 && t.estado === "RECHAZADO") texto = "Rechazado";
                    return (
                      <div className={clase} key={p}>
                        <div className="avance-punto">{i < actual ? <i className="bi bi-check-lg"></i> : i + 1}</div>
                        {texto}
                      </div>
                    );
                  })}
                </div>

                {t.estado === "OBSERVADO" && (
                  <p className="mb-0 p-3 rounded" style={{ background: "var(--media-claro)" }}>
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Tu expediente tiene una observación. Revisa la última alerta y acércate a subsanarla.
                  </p>
                )}
              </div>
            </div>

            <div className="tablero">
              <div className="card">
                <div className="card-header">
                  <span className="card-header-titulo"><i className="bi bi-bell"></i>Mis alertas</span>
                  {sinLeer > 0
                    ? <button className="btn btn-info btn-sm" onClick={marcarLeidas}>{sinLeer === 1 ? "Marcar como leída" : "Marcar " + sinLeer + " como leídas"}</button>
                    : <span className="contador">{resultado.notificaciones.length}</span>}
                </div>
                <div className="card-body py-0">
                  {resultado.notificaciones.map((n) => (
                    <div key={n.id} className={n.leido === 0 ? "alerta-item nueva" : "alerta-item"}>
                      <i className={"bi " + (ICONO_CANAL[n.canal] || "bi-bell")}></i>
                      <div>
                        <strong>{n.titulo}</strong>
                        <div>{n.mensaje}</div>
                        <small className="text-secondary">{formatoFechaHora(n.fecha_envio)}, por {n.canal.toLowerCase()}</small>
                      </div>
                    </div>
                  ))}
                  {resultado.notificaciones.length === 0 && <div className="vacio">Aún no tienes alertas.</div>}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-header-titulo"><i className="bi bi-clock-history"></i>Historial</span>
                </div>
                <div className="card-body">
                  <ul className="linea-tiempo">
                    {resultado.seguimiento.map((s, i) => (
                      <li key={i}>
                        <strong>{ESTADOS[s.estado_nuevo]}</strong>
                        <small>{formatoFechaHora(s.fecha)}</small>
                        {s.observacion}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConsultaTramite;
