// =====================================================================
//  BANDEJA DE EXPEDIENTES (tramites)              Responsable: Integrante 2
//  - Registrar / editar / eliminar expedientes (patron CRUD de la clase)
//  - La PRIORIDAD la calcula el servidor con Naive Bayes
//  - Atender: cambiar estado (genera seguimiento y alerta al ciudadano)
//  - Corregir prioridad: retroalimenta el dataset del modelo
// =====================================================================
import { useEffect, useState } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Dropdown from 'react-bootstrap/Dropdown';
import { API, ESTADOS, COLOR_SELLO, COLOR_PELIGRO, formatoFecha, formatoFechaHora, mensajeError } from '../../config';

const MySwal = withReactContent(Swal);

const NOMBRE_PRIORIDAD = { ALTA: "Alta", MEDIA: "Media", BAJA: "Baja" };
const PENDIENTE = (estado) => ["APROBADO", "RECHAZADO", "FINALIZADO"].indexOf(estado) === -1;

function Tramites() {

  const [ciudadano_id, setCiudadanoId] = useState("");
  const [tipo_tramite_id, setTipoTramiteId] = useState("");
  const [empleado_id, setEmpleadoId] = useState("");
  const [asunto, setAsunto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [folios, setFolios] = useState(1);
  const [canal, setCanal] = useState("PRESENCIAL");
  const [documentos_completos, setDocumentosCompletos] = useState(true);
  const [id, setId] = useState("");
  const [editar, setEditar] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [tramitesList, setTramites] = useState([]);
  const [ciudadanosList, setCiudadanos] = useState([]);
  const [tiposList, setTipos] = useState([]);
  const [empleadosList, setEmpleados] = useState([]);

  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("PENDIENTES");
  const [filtroPrioridad, setFiltroPrioridad] = useState("");

  const tipoElegido = tiposList.find((t) => String(t.id) === String(tipo_tramite_id));
  const responsables = tipoElegido ? empleadosList.filter((e) => e.area_id === tipoElegido.area_id) : empleadosList;

  const validar = () => {
    if (ciudadano_id === "" || tipo_tramite_id === "" || asunto.trim() === "") {
      MySwal.fire({ title: "Faltan datos", text: "Elige el ciudadano y el tipo de trámite, y escribe el asunto.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return false;
    }
    if (Number(folios) < 1) {
      MySwal.fire({ title: "Folios no válidos", text: "El expediente debe tener al menos 1 folio.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return false;
    }
    return true;
  }

  const datosFormulario = () => ({
    ciudadano_id: ciudadano_id,
    tipo_tramite_id: tipo_tramite_id,
    empleado_id: empleado_id,
    asunto: asunto,
    descripcion: descripcion,
    folios: folios,
    canal: canal,
    documentos_completos: documentos_completos
  });

  const add = () => {
    if (!validar()) return;
    Axios.post(`${API}/tramite/create`, datosFormulario()).then((response) => {
      const r = response.data;
      getTramites();
      limpiarCampo();
      MySwal.fire({
        title: "Expediente registrado",
        html: (
          <div>
            <p className="mb-3"><span className="expediente">{r.codigo}</span></p>
            <p className="mb-2">El modelo le asignó prioridad <span className={"prioridad prioridad-" + r.prioridad}>{NOMBRE_PRIORIDAD[r.prioridad]}</span></p>
            <p className="explicacion mb-0">
              Probabilidades: alta {r.probabilidades.ALTA}%, media {r.probabilidades.MEDIA}%, baja {r.probabilidades.BAJA}%.
              El ciudadano ya recibió la alerta de registro.
            </p>
          </div>
        ),
        icon: "success",
        confirmButtonColor: COLOR_SELLO
      });
    }).catch((error) => {
      MySwal.fire({ title: "No se registró", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const update = () => {
    if (!validar()) return;
    Axios.put(`${API}/tramite/update`, { id: id, ...datosFormulario() }).then((response) => {
      getTramites();
      limpiarCampo();
      MySwal.fire({
        title: "Expediente actualizado",
        text: `Prioridad recalculada: ${NOMBRE_PRIORIDAD[response.data.prioridad]}.`,
        icon: "success",
        confirmButtonColor: COLOR_SELLO
      });
    }).catch((error) => {
      MySwal.fire({ title: "No se actualizó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const deleteTramite = (id, codigo) => {
    Swal.fire({
      title: "¿Eliminar expediente?",
      text: `Se eliminará ${codigo} con todo su historial y alertas. Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: COLOR_PELIGRO,
      cancelButtonColor: "#5b6678",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`${API}/tramite/delete/${id}`).then(() => {
          getTramites();
          limpiarCampo();
          Swal.fire({ title: "Eliminado", text: `${codigo} fue eliminado.`, icon: "success", confirmButtonColor: COLOR_SELLO });
        }).catch((error) => {
          Swal.fire({ title: "No se eliminó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
        });
      }
    });
  };

  // Cambiar estado: el servidor guarda el seguimiento y crea la alerta
  const atender = (val) => {
    MySwal.fire({
      title: "Atender " + val.codigo_expediente,
      html: (
        <div className="swal-izquierda">
          <label className="form-label fw-bold" htmlFor="sw-estado">Nuevo estado</label>
          <select id="sw-estado" className="form-select mb-3" defaultValue={val.estado}>
            {Object.keys(ESTADOS).map((e) => <option key={e} value={e}>{ESTADOS[e]}</option>)}
          </select>
          <label className="form-label fw-bold" htmlFor="sw-obs">Observación para el ciudadano</label>
          <textarea id="sw-obs" className="form-control" placeholder="Ej. Falta el plan de seguridad firmado"></textarea>
        </div>
      ),
      showCancelButton: true,
      confirmButtonColor: COLOR_SELLO,
      cancelButtonColor: "#5b6678",
      confirmButtonText: "Guardar y notificar",
      cancelButtonText: "Cancelar",
      preConfirm: () => ({
        estado: document.getElementById("sw-estado").value,
        observacion: document.getElementById("sw-obs").value
      })
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.put(`${API}/tramite/estado`, {
          id: val.id,
          estado: result.value.estado,
          observacion: result.value.observacion,
          empleado_id: val.empleado_id
        }).then((response) => {
          getTramites();
          MySwal.fire({ title: "Estado actualizado", text: response.data, icon: "success", confirmButtonColor: COLOR_SELLO });
        }).catch((error) => {
          MySwal.fire({ title: "No se actualizó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
        });
      }
    });
  }

  const verHistorial = (val) => {
    Axios.get(`${API}/tramite/seguimiento/${val.id}`).then((response) => {
      MySwal.fire({
        title: "Historial de " + val.codigo_expediente,
        html: (
          <ul className="linea-tiempo swal-izquierda mt-2">
            {response.data.map((s) => (
              <li key={s.id}>
                <strong>{ESTADOS[s.estado_nuevo]}</strong>
                <small>{formatoFechaHora(s.fecha)}{s.empleado ? ", " + s.empleado : ""}</small>
                {s.observacion}
              </li>
            ))}
          </ul>
        ),
        confirmButtonColor: COLOR_SELLO,
        confirmButtonText: "Cerrar"
      });
    });
  }

  // El personal corrige la prioridad: el caso se suma al dataset (aprendizaje continuo)
  const corregirPrioridad = (val) => {
    MySwal.fire({
      title: "Corregir prioridad",
      text: `El modelo dijo ${NOMBRE_PRIORIDAD[val.prioridad]} para ${val.codigo_expediente}. ¿Cuál es la correcta?`,
      input: "select",
      inputOptions: NOMBRE_PRIORIDAD,
      inputValue: val.prioridad,
      showCancelButton: true,
      confirmButtonColor: COLOR_SELLO,
      cancelButtonColor: "#5b6678",
      confirmButtonText: "Guardar corrección",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.put(`${API}/tramite/prioridad`, { id: val.id, prioridad: result.value }).then((response) => {
          getTramites();
          MySwal.fire({ title: "Prioridad corregida", text: response.data, icon: "success", confirmButtonColor: COLOR_SELLO });
        }).catch((error) => {
          MySwal.fire({ title: "No se corrigió", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
        });
      }
    });
  }

  const repriorizar = () => {
    Axios.post(`${API}/ml/repriorizar`).then((response) => {
      getTramites();
      MySwal.fire({
        title: "Prioridades recalculadas",
        text: `${response.data.actualizados} expedientes pendientes revisados; ${response.data.criticos || 0} quedaron con prioridad alta.`,
        icon: "success",
        confirmButtonColor: COLOR_SELLO
      });
    }).catch((error) => {
      MySwal.fire({ title: "No se recalculó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const getTramites = () => {
    Axios.get(`${API}/tramites`).then((response) => {
      setTramites(response.data);
    }).catch((error) => {
      MySwal.fire({ title: "Sin conexión", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const getCatalogos = () => {
    Axios.get(`${API}/ciudadanos`).then((response) => setCiudadanos(response.data));
    Axios.get(`${API}/tipos`).then((response) => setTipos(response.data));
    Axios.get(`${API}/empleados`).then((response) => setEmpleados(response.data));
  }

  useEffect(() => {
    getTramites();
    getCatalogos();
  }, []);

  const editarTramite = (val) => {
    setEditar(true);
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCiudadanoId(val.ciudadano_id);
    setTipoTramiteId(val.tipo_tramite_id);
    setEmpleadoId(val.empleado_id || "");
    setAsunto(val.asunto);
    setDescripcion(val.descripcion || "");
    setFolios(val.folios);
    setCanal(val.canal);
    setDocumentosCompletos(val.documentos_completos === 1);
    setId(val.id);
  }

  const limpiarCampo = () => {
    setCiudadanoId("");
    setTipoTramiteId("");
    setEmpleadoId("");
    setAsunto("");
    setDescripcion("");
    setFolios(1);
    setCanal("PRESENCIAL");
    setDocumentosCompletos(true);
    setId("");
    setEditar(false);
    setMostrarFormulario(false);
  }

  const textoPlazo = (val) => {
    if (!PENDIENTE(val.estado)) return <span className="text-secondary">Atendido</span>;
    const d = val.dias_restantes;
    if (d < 0) return <span className="plazo-vencido">Vencido hace {-d} {-d === 1 ? "día" : "días"}</span>;
    if (d === 0) return <span className="plazo-vencido">Vence hoy</span>;
    if (d <= 2) return <span className="plazo-cerca">Vence en {d} {d === 1 ? "día" : "días"}</span>;
    return <span>Vence en {d} días</span>;
  }

  const filtrados = tramitesList.filter((t) => {
    const texto = (t.codigo_expediente + " " + t.ciudadano + " " + t.dni + " " + t.asunto).toLowerCase();
    if (!texto.includes(buscar.toLowerCase())) return false;
    if (filtroEstado === "PENDIENTES" && !PENDIENTE(t.estado)) return false;
    if (filtroEstado !== "PENDIENTES" && filtroEstado !== "" && t.estado !== filtroEstado) return false;
    if (filtroPrioridad !== "" && t.prioridad !== filtroPrioridad) return false;
    return true;
  });

  return (
    <div>
      <header className="pagina-cabecera">
        <div>
          <h1>Bandeja de expedientes</h1>
          <p>Ordenados por urgencia: el modelo de prioridad pone arriba los críticos y los que están por vencer.</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-info" onClick={repriorizar}><i className="bi bi-cpu"></i>Recalcular prioridades</button>
          {!mostrarFormulario && (
            <button className="btn btn-success" onClick={() => { setMostrarFormulario(true); }}>
              <i className="bi bi-folder-plus"></i>Nuevo expediente
            </button>
          )}
        </div>
      </header>

      <div className="crud crud-apilado">
        {mostrarFormulario && (
        <div className={editar ? "card formulario editando" : "card formulario"}>
          <div className="card-header">
            <span className="card-header-titulo">
              <i className={editar ? "bi bi-pencil-square" : "bi bi-folder-plus"}></i>
              {editar ? "Editar expediente" : "Registrar expediente"}
            </span>
          </div>
          <div className="card-body">

            <div className="input-group mb-3">
              <span className="input-group-text" id="t-ciu">Ciudadano</span>
              <select className="form-select" value={ciudadano_id} aria-describedby="t-ciu"
                onChange={(event) => {
                  setCiudadanoId(event.target.value);
                }}>
                <option value="">Elige por DNI o nombre</option>
                {ciudadanosList.map((c) => <option key={c.id} value={c.id}>{c.dni} - {c.nombres} {c.apellidos}</option>)}
              </select>
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="t-tipo">Trámite</span>
              <select className="form-select" value={tipo_tramite_id} aria-describedby="t-tipo"
                onChange={(event) => {
                  setTipoTramiteId(event.target.value);
                  setEmpleadoId("");
                }}>
                <option value="">Elige el tipo de trámite</option>
                {tiposList.map((t) => <option key={t.id} value={t.id}>{t.nombre} ({t.plazo_dias} días)</option>)}
              </select>
            </div>
            {tipoElegido && (
              <p className="ayuda"><i className="bi bi-list-check me-1"></i>Requisitos: {tipoElegido.requisitos}</p>
            )}

            <div className="input-group mb-3">
              <span className="input-group-text" id="t-resp">Responsable</span>
              <select className="form-select" value={empleado_id} aria-describedby="t-resp"
                onChange={(event) => {
                  setEmpleadoId(event.target.value);
                }}>
                <option value="">Sin asignar</option>
                {responsables.map((e) => <option key={e.id} value={e.id}>{e.nombres} {e.apellidos} ({e.sigla})</option>)}
              </select>
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="t-asu">Asunto</span>
              <input type="text" value={asunto} maxLength={200}
                onChange={(event) => {
                  setAsunto(event.target.value);
                }}
                className="form-control" placeholder="Qué solicita el ciudadano" aria-describedby="t-asu" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="t-des">Detalle</span>
              <textarea value={descripcion}
                onChange={(event) => {
                  setDescripcion(event.target.value);
                }}
                className="form-control" placeholder="Información adicional (opcional)" aria-describedby="t-des"></textarea>
            </div>

            <div className="d-flex gap-2 mb-3">
              <div className="input-group">
                <span className="input-group-text" id="t-fol" style={{ minWidth: 0 }}>Folios</span>
                <input type="number" min="1" value={folios}
                  onChange={(event) => {
                    setFolios(event.target.value);
                  }}
                  className="form-control" aria-describedby="t-fol" />
              </div>
              <div className="input-group">
                <span className="input-group-text" id="t-can" style={{ minWidth: 0 }}>Canal</span>
                <select className="form-select" value={canal} aria-describedby="t-can"
                  onChange={(event) => {
                    setCanal(event.target.value);
                  }}>
                  <option value="PRESENCIAL">Presencial</option>
                  <option value="VIRTUAL">Virtual</option>
                </select>
              </div>
            </div>

            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="t-docs" checked={documentos_completos}
                onChange={(event) => {
                  setDocumentosCompletos(event.target.checked);
                }} />
              <label className="form-check-label" htmlFor="t-docs">Presentó todos los requisitos</label>
            </div>

          </div>
          <div className="card-footer text-muted">
            {
              editar ?
                <div className="d-flex gap-2">
                  <button className='btn btn-info' onClick={limpiarCampo}>Cancelar</button>
                  <button className='btn btn-warning' onClick={update}><i className="bi bi-check2"></i>Guardar cambios</button>
                </div>
                : <div className="d-flex gap-2">
                  <button className='btn btn-info' onClick={limpiarCampo}>Cancelar</button>
                  <button className='btn btn-success' onClick={add}><i className="bi bi-plus-lg"></i>Registrar expediente</button>
                </div>
            }
          </div>
        </div>
        )}

        <div className="card">
          <div className="card-header">
            <span className="card-header-titulo"><i className="bi bi-folder2-open"></i>Expedientes</span>
            <span className="contador">{filtrados.length}</span>
          </div>
          <div className="filtros">
            <input type="search" className="form-control" placeholder="Buscar código, DNI o nombre" value={buscar}
              onChange={(event) => {
                setBuscar(event.target.value);
              }} aria-label="Buscar expediente" />
            <select className="form-select" value={filtroEstado} aria-label="Filtrar por estado"
              onChange={(event) => {
                setFiltroEstado(event.target.value);
              }}>
              <option value="PENDIENTES">Solo pendientes</option>
              <option value="">Todos los estados</option>
              {Object.keys(ESTADOS).map((e) => <option key={e} value={e}>{ESTADOS[e]}</option>)}
            </select>
            <select className="form-select" value={filtroPrioridad} aria-label="Filtrar por prioridad"
              onChange={(event) => {
                setFiltroPrioridad(event.target.value);
              }}>
              <option value="">Toda prioridad</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja</option>
            </select>
          </div>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th scope="col">Expediente</th>
                  <th scope="col">Ciudadano</th>
                  <th scope="col">Prioridad</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Plazo</th>
                  <th scope="col" className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {
                  filtrados.map((val, key) => {
                    return (
                      <tr key={val.id}
                        className={"pestana-" + val.prioridad + (PENDIENTE(val.estado) ? "" : " atendido") + (editar && id === val.id ? " fila-editando" : "")}>
                        <td className="celda-principal">
                          <span className="expediente">{val.codigo_expediente}</span>
                          <span className="celda-secundaria mt-1">{val.tipo_tramite}</span>
                        </td>
                        <td>
                          <span className="sin-corte">{val.ciudadano}</span>
                          <span className="celda-secundaria sin-corte">
                            DNI {val.dni}{val.es_vulnerable === 1 && <span className="etiqueta etiqueta-sello ms-1">Preferente</span>}
                          </span>
                        </td>
                        <td>
                          <span className={"prioridad prioridad-" + val.prioridad}>{NOMBRE_PRIORIDAD[val.prioridad]}</span>
                          {val.prioridad_manual === 1 && <i className="bi bi-person-check ms-1 text-secondary" title="Corregida por el personal"></i>}
                          <span className="puntaje" title={"Puntaje " + val.puntaje_prioridad}>
                            <span style={{ width: val.puntaje_prioridad + "%" }}></span>
                          </span>
                        </td>
                        <td><span className={"estado estado-" + val.estado}>{ESTADOS[val.estado]}</span></td>
                        <td className="sin-corte">
                          {textoPlazo(val)}
                          <span className="celda-secundaria">{formatoFecha(val.fecha_limite)}</span>
                        </td>
                        <td className="text-end">
                          <div className="btn-group" role="group" aria-label="Acciones">
                            <button type="button"
                              onClick={() => {
                                atender(val);
                              }}
                              className="btn btn-info">Atender</button>
                            <button type="button"
                              onClick={() => {
                                editarTramite(val);
                              }}
                              className="btn btn-info">Editar</button>
                            <Dropdown as="div" className="btn-group" align="end">
                              <Dropdown.Toggle variant="info" aria-label="Más acciones"></Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item onClick={() => verHistorial(val)}><i className="bi bi-clock-history me-2"></i>Ver historial</Dropdown.Item>
                                <Dropdown.Item onClick={() => corregirPrioridad(val)}><i className="bi bi-sliders me-2"></i>Corregir prioridad</Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item className="text-danger" onClick={() => deleteTramite(val.id, val.codigo_expediente)}><i className="bi bi-trash me-2"></i>Eliminar</Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
            {filtrados.length === 0 && (
              <div className="vacio"><i className="bi bi-inbox"></i>No hay expedientes con estos filtros. Registra uno nuevo o cambia el filtro.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Tramites;
