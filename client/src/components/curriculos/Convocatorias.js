// =====================================================================
//  CRUD CONVOCATORIAS (seleccion de personal CAS)  Responsable: Integrante 3
//  El "perfil requerido" es el texto contra el que el modelo TF-IDF
//  compara cada curriculum.
// =====================================================================
import { useEffect, useState } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { API, COLOR_SELLO, COLOR_PELIGRO, formatoFecha, mensajeError } from '../../config';

const MySwal = withReactContent(Swal);

function Convocatorias() {

  const [area_id, setAreaId] = useState("");
  const [codigo, setCodigo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [perfil_requerido, setPerfilRequerido] = useState("");
  const [experiencia_minima, setExperienciaMinima] = useState(0);
  const [vacantes, setVacantes] = useState(1);
  const [fecha_inicio, setFechaInicio] = useState("");
  const [fecha_fin, setFechaFin] = useState("");
  const [estado, setEstado] = useState("ABIERTA");
  const [id, setId] = useState("");
  const [editar, setEditar] = useState(false);

  const [convocatoriasList, setConvocatorias] = useState([]);
  const [areasList, setAreas] = useState([]);

  const validar = () => {
    if (area_id === "" || codigo.trim() === "" || titulo.trim() === "" || perfil_requerido.trim() === "" || fecha_inicio === "" || fecha_fin === "") {
      MySwal.fire({ title: "Faltan datos", text: "Completa área, código, título, perfil y las dos fechas.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return false;
    }
    if (fecha_fin < fecha_inicio) {
      MySwal.fire({ title: "Fechas no válidas", text: "La fecha de cierre no puede ser anterior a la de inicio.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return false;
    }
    return true;
  }

  const datosFormulario = () => ({
    area_id: area_id,
    codigo: codigo,
    titulo: titulo,
    perfil_requerido: perfil_requerido,
    experiencia_minima: experiencia_minima,
    vacantes: vacantes,
    fecha_inicio: fecha_inicio,
    fecha_fin: fecha_fin,
    estado: estado
  });

  const add = () => {
    if (!validar()) return;
    Axios.post(`${API}/convocatoria/create`, datosFormulario()).then(() => {
      getConvocatorias();
      limpiarCampo();
      MySwal.fire({ title: "Convocatoria registrada", text: `${codigo} ya puede recibir postulantes.`, icon: "success", confirmButtonColor: COLOR_SELLO });
    }).catch((error) => {
      MySwal.fire({ title: "No se registró", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const update = () => {
    if (!validar()) return;
    Axios.put(`${API}/convocatoria/update`, { id: id, ...datosFormulario() }).then(() => {
      getConvocatorias();
      limpiarCampo();
      MySwal.fire({ title: "Convocatoria actualizada", text: `Se guardaron los cambios de ${codigo}.`, icon: "success", confirmButtonColor: COLOR_SELLO });
    }).catch((error) => {
      MySwal.fire({ title: "No se actualizó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const deleteConvocatoria = (id, codigo) => {
    Swal.fire({
      title: "¿Eliminar convocatoria?",
      text: `Se eliminará ${codigo} junto con sus postulantes y evaluaciones.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: COLOR_PELIGRO,
      cancelButtonColor: "#5b6678",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`${API}/convocatoria/delete/${id}`).then(() => {
          getConvocatorias();
          limpiarCampo();
          Swal.fire({ title: "Eliminada", text: `${codigo} fue eliminada.`, icon: "success", confirmButtonColor: COLOR_SELLO });
        }).catch((error) => {
          Swal.fire({ title: "No se eliminó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
        });
      }
    });
  };

  const getConvocatorias = () => {
    Axios.get(`${API}/convocatorias`).then((response) => {
      setConvocatorias(response.data);
    }).catch((error) => {
      MySwal.fire({ title: "Sin conexión", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  useEffect(() => {
    getConvocatorias();
    Axios.get(`${API}/areas`).then((response) => setAreas(response.data));
  }, []);

  const editarConvocatoria = (val) => {
    setEditar(true);
    setAreaId(val.area_id);
    setCodigo(val.codigo);
    setTitulo(val.titulo);
    setPerfilRequerido(val.perfil_requerido);
    setExperienciaMinima(val.experiencia_minima);
    setVacantes(val.vacantes);
    setFechaInicio(val.fecha_inicio);
    setFechaFin(val.fecha_fin);
    setEstado(val.estado);
    setId(val.id);
  }

  const limpiarCampo = () => {
    setAreaId("");
    setCodigo("");
    setTitulo("");
    setPerfilRequerido("");
    setExperienciaMinima(0);
    setVacantes(1);
    setFechaInicio("");
    setFechaFin("");
    setEstado("ABIERTA");
    setId("");
    setEditar(false);
  }

  return (
    <div>
      <header className="pagina-cabecera">
        <div>
          <h1>Convocatorias</h1>
          <p>Procesos de selección de personal. Describe bien el perfil: el modelo compara cada CV con ese texto.</p>
        </div>
      </header>

      <div className="crud">
        <div className={editar ? "card formulario editando" : "card formulario"}>
          <div className="card-header">
            <span className="card-header-titulo">
              <i className={editar ? "bi bi-pencil-square" : "bi bi-megaphone"}></i>
              {editar ? "Editar convocatoria" : "Nueva convocatoria"}
            </span>
          </div>
          <div className="card-body">
            <div className="input-group mb-3">
              <span className="input-group-text" id="cv-area">Área</span>
              <select className="form-select" value={area_id} aria-describedby="cv-area"
                onChange={(event) => {
                  setAreaId(event.target.value);
                }}>
                <option value="">Elige el área que contrata</option>
                {areasList.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="cv-cod">Código</span>
              <input type="text" value={codigo} maxLength={20}
                onChange={(event) => {
                  setCodigo(event.target.value.toUpperCase());
                }}
                className="form-control" placeholder="Ej. CAS-003-2026" aria-describedby="cv-cod" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="cv-tit">Puesto</span>
              <input type="text" value={titulo}
                onChange={(event) => {
                  setTitulo(event.target.value);
                }}
                className="form-control" placeholder="Ej. Asistente administrativo" aria-describedby="cv-tit" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="cv-per">Perfil</span>
              <textarea value={perfil_requerido} rows={5}
                onChange={(event) => {
                  setPerfilRequerido(event.target.value);
                }}
                className="form-control" placeholder="Formación, experiencia, herramientas y conocimientos que se buscan" aria-describedby="cv-per"></textarea>
            </div>

            <div className="d-flex gap-2 mb-3">
              <div className="input-group">
                <span className="input-group-text" style={{ minWidth: 0 }} id="cv-exp">Años mín.</span>
                <input type="number" min="0" value={experiencia_minima}
                  onChange={(event) => {
                    setExperienciaMinima(event.target.value);
                  }}
                  className="form-control" aria-describedby="cv-exp" />
              </div>
              <div className="input-group">
                <span className="input-group-text" style={{ minWidth: 0 }} id="cv-vac">Vacantes</span>
                <input type="number" min="1" value={vacantes}
                  onChange={(event) => {
                    setVacantes(event.target.value);
                  }}
                  className="form-control" aria-describedby="cv-vac" />
              </div>
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="cv-ini">Inicio</span>
              <input type="date" value={fecha_inicio}
                onChange={(event) => {
                  setFechaInicio(event.target.value);
                }}
                className="form-control" aria-describedby="cv-ini" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="cv-fin">Cierre</span>
              <input type="date" value={fecha_fin}
                onChange={(event) => {
                  setFechaFin(event.target.value);
                }}
                className="form-control" aria-describedby="cv-fin" />
            </div>

            <div className="input-group mb-1">
              <span className="input-group-text" id="cv-est">Estado</span>
              <select className="form-select" value={estado} aria-describedby="cv-est"
                onChange={(event) => {
                  setEstado(event.target.value);
                }}>
                <option value="ABIERTA">Abierta</option>
                <option value="CERRADA">Cerrada</option>
              </select>
            </div>
          </div>
          <div className="card-footer text-muted">
            {
              editar ?
                <div className="d-flex gap-2">
                  <button className='btn btn-info' onClick={limpiarCampo}>Cancelar</button>
                  <button className='btn btn-warning' onClick={update}><i className="bi bi-check2"></i>Guardar cambios</button>
                </div>
                : <button className='btn btn-success' onClick={add}><i className="bi bi-plus-lg"></i>Publicar convocatoria</button>
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-header-titulo"><i className="bi bi-megaphone"></i>Convocatorias publicadas</span>
            <span className="contador">{convocatoriasList.length}</span>
          </div>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th scope="col">Convocatoria</th>
                  <th scope="col">Requisitos</th>
                  <th scope="col">Plazo</th>
                  <th scope="col" className="text-end">Postulantes</th>
                  <th scope="col" className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {
                  convocatoriasList.map((val, key) => {
                    return (
                      <tr key={val.id} className={editar && id === val.id ? "fila-editando" : ""}>
                        <td className="celda-principal">
                          <span className="expediente">{val.codigo}</span>
                          <span className="d-block mt-1">{val.titulo}</span>
                          <span className="celda-secundaria">{val.area}</span>
                        </td>
                        <td>
                          {val.experiencia_minima} {val.experiencia_minima === 1 ? "año" : "años"} de experiencia
                          <span className="celda-secundaria">{val.vacantes} {val.vacantes === 1 ? "vacante" : "vacantes"}</span>
                        </td>
                        <td>
                          {val.estado === "ABIERTA"
                            ? <span className="etiqueta etiqueta-sello">Abierta</span>
                            : <span className="etiqueta">Cerrada</span>}
                          <span className="celda-secundaria">{formatoFecha(val.fecha_inicio)} al {formatoFecha(val.fecha_fin)}</span>
                        </td>
                        <td className="text-end fw-bold">{val.postulantes}</td>
                        <td className="text-end">
                          <div className="btn-group" role="group" aria-label="Acciones">
                            <button type="button"
                              onClick={() => {
                                editarConvocatoria(val);
                              }}
                              className="btn btn-info">Editar</button>
                            <button type="button"
                              onClick={() => {
                                deleteConvocatoria(val.id, val.codigo);
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
            {convocatoriasList.length === 0 && (
              <div className="vacio"><i className="bi bi-megaphone"></i>Aún no hay convocatorias. Publica la primera con el formulario.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Convocatorias;
