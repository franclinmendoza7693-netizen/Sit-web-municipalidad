// =====================================================================
//  ALERTAS ENVIADAS (bandeja del personal)        Responsable: Integrante 3
//  - Lista todas las alertas (las automaticas y las manuales)
//  - Enviar una alerta manual a un ciudadano
//  - Marcar como leida / eliminar
// =====================================================================
import { useEffect, useState } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { API, ESTADOS, COLOR_SELLO, COLOR_PELIGRO, formatoFechaHora, mensajeError } from '../../config';

const MySwal = withReactContent(Swal);

const CANALES = { SISTEMA: "Sistema", CORREO: "Correo", SMS: "SMS" };
const ICONO_CANAL = { CORREO: "bi-envelope", SMS: "bi-phone", SISTEMA: "bi-bell" };

function Notificaciones() {

  const [tramite_id, setTramiteId] = useState("");
  const [canal, setCanal] = useState("CORREO");
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [notificacionesList, setNotificaciones] = useState([]);
  const [tramitesList, setTramites] = useState([]);
  const [buscar, setBuscar] = useState("");
  const [soloSinLeer, setSoloSinLeer] = useState(false);

  const add = () => {
    if (tramite_id === "" || titulo.trim() === "" || mensaje.trim() === "") {
      MySwal.fire({ title: "Faltan datos", text: "Elige el expediente y escribe el título y el mensaje.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return;
    }
    Axios.post(`${API}/notificacion/create`, {
      tramite_id: tramite_id,
      canal: canal,
      titulo: titulo,
      mensaje: mensaje
    }).then(() => {
      getNotificaciones();
      limpiarCampo();
      MySwal.fire({ title: "Alerta enviada", text: `El ciudadano la recibirá por ${CANALES[canal].toLowerCase()} y en su consulta en línea.`, icon: "success", confirmButtonColor: COLOR_SELLO });
    }).catch((error) => {
      MySwal.fire({ title: "No se envió", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const marcarLeida = (id) => {
    Axios.put(`${API}/notificacion/leido/${id}`).then(() => {
      getNotificaciones();
    });
  }

  const deleteNotificacion = (id, titulo) => {
    Swal.fire({
      title: "¿Eliminar alerta?",
      text: `Se eliminará "${titulo}" del historial del ciudadano.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: COLOR_PELIGRO,
      cancelButtonColor: "#5b6678",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`${API}/notificacion/delete/${id}`).then(() => {
          getNotificaciones();
        }).catch((error) => {
          Swal.fire({ title: "No se eliminó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
        });
      }
    });
  }

  const getNotificaciones = () => {
    Axios.get(`${API}/notificaciones`).then((response) => {
      setNotificaciones(response.data);
    }).catch((error) => {
      MySwal.fire({ title: "Sin conexión", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  useEffect(() => {
    getNotificaciones();
    Axios.get(`${API}/notificacion/tramites`).then((response) => setTramites(response.data));
  }, []);

  const limpiarCampo = () => {
    setTramiteId("");
    setCanal("CORREO");
    setTitulo("");
    setMensaje("");
  }

  const filtradas = notificacionesList.filter((n) => {
    const texto = (n.codigo_expediente + " " + n.ciudadano + " " + n.titulo).toLowerCase();
    if (!texto.includes(buscar.toLowerCase())) return false;
    if (soloSinLeer && n.leido === 1) return false;
    return true;
  });

  const sinLeer = notificacionesList.filter((n) => n.leido === 0).length;

  return (
    <div>
      <header className="pagina-cabecera">
        <div>
          <h1>Alertas enviadas</h1>
          <p>Cada registro y cada cambio de estado avisa al ciudadano automáticamente. Desde aquí también puedes enviarle un aviso.</p>
        </div>
        <span className="etiqueta etiqueta-sello">{sinLeer} sin leer por los ciudadanos</span>
      </header>

      <div className="crud">
        <div className="card formulario">
          <div className="card-header">
            <span className="card-header-titulo"><i className="bi bi-send"></i>Enviar alerta</span>
          </div>
          <div className="card-body">
            <div className="input-group mb-3">
              <span className="input-group-text" id="n-tra">Expediente</span>
              <select className="form-select" value={tramite_id} aria-describedby="n-tra"
                onChange={(event) => {
                  setTramiteId(event.target.value);
                }}>
                <option value="">Elige el expediente</option>
                {tramitesList.map((t) => <option key={t.id} value={t.id}>{t.codigo_expediente} - {t.ciudadano} ({ESTADOS[t.estado]})</option>)}
              </select>
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="n-can">Canal</span>
              <select className="form-select" value={canal} aria-describedby="n-can"
                onChange={(event) => {
                  setCanal(event.target.value);
                }}>
                <option value="CORREO">Correo</option>
                <option value="SMS">SMS</option>
                <option value="SISTEMA">Solo en el sistema</option>
              </select>
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="n-tit">Título</span>
              <input type="text" value={titulo} maxLength={100}
                onChange={(event) => {
                  setTitulo(event.target.value);
                }}
                className="form-control" placeholder="Ej. Recordatorio de requisitos" aria-describedby="n-tit" />
            </div>

            <div className="input-group mb-1">
              <span className="input-group-text" id="n-men">Mensaje</span>
              <textarea value={mensaje} maxLength={255}
                onChange={(event) => {
                  setMensaje(event.target.value);
                }}
                className="form-control" placeholder="Qué debe saber o hacer el ciudadano" aria-describedby="n-men"></textarea>
            </div>
            <p className="ayuda mt-2 mb-0 text-end numero">{mensaje.length} de 255 caracteres</p>
          </div>
          <div className="card-footer">
            <button className="btn btn-success" onClick={add}><i className="bi bi-send"></i>Enviar alerta</button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-header-titulo"><i className="bi bi-bell"></i>Historial de alertas</span>
            <span className="contador">{filtradas.length}</span>
          </div>
          <div className="filtros align-items-center">
            <input type="search" className="form-control" placeholder="Buscar expediente o ciudadano" value={buscar}
              onChange={(event) => {
                setBuscar(event.target.value);
              }} aria-label="Buscar alerta" />
            <div className="form-check mb-0">
              <input className="form-check-input" type="checkbox" id="n-sinleer" checked={soloSinLeer}
                onChange={(event) => {
                  setSoloSinLeer(event.target.checked);
                }} />
              <label className="form-check-label" htmlFor="n-sinleer">Solo sin leer</label>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th scope="col">Alerta</th>
                  <th scope="col">Expediente</th>
                  <th scope="col">Canal</th>
                  <th scope="col">Lectura</th>
                  <th scope="col" className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {
                  filtradas.map((val, key) => {
                    return (
                      <tr key={val.id}>
                        <td>
                          <strong>{val.titulo}</strong>
                          <span className="celda-secundaria">{val.mensaje}</span>
                          <span className="celda-secundaria">{formatoFechaHora(val.fecha_envio)}</span>
                        </td>
                        <td>
                          <span className="expediente">{val.codigo_expediente}</span>
                          <span className="celda-secundaria mt-1">{val.ciudadano}</span>
                        </td>
                        <td><i className={"bi " + ICONO_CANAL[val.canal] + " me-1"}></i>{CANALES[val.canal]}</td>
                        <td>
                          {val.leido === 1
                            ? <span className="etiqueta">Leída</span>
                            : <span className="etiqueta etiqueta-sello">Sin leer</span>}
                        </td>
                        <td className="text-end">
                          <div className="btn-group" role="group" aria-label="Acciones">
                            {val.leido === 0 && (
                              <button type="button"
                                onClick={() => {
                                  marcarLeida(val.id);
                                }}
                                className="btn btn-info">Marcar leída</button>
                            )}
                            <button type="button"
                              onClick={() => {
                                deleteNotificacion(val.id, val.titulo);
                              }}
                              className="btn btn-danger">Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
            {filtradas.length === 0 && (
              <div className="vacio"><i className="bi bi-bell-slash"></i>No hay alertas con este filtro.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Notificaciones;
