// =====================================================================
//  CRUD TIPOS DE TRAMITE (procedimientos del TUPA)   Responsable: Integrante 1
// =====================================================================
import { useEffect, useState } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { API, COLOR_SELLO, COLOR_PELIGRO, mensajeError } from '../../config';

const MySwal = withReactContent(Swal);

function TiposTramite() {

  const [area_id, setAreaId] = useState("");
  const [nombre, setNombre] = useState("");
  const [plazo_dias, setPlazoDias] = useState("");
  const [costo, setCosto] = useState("");
  const [requisitos, setRequisitos] = useState("");
  const [id, setId] = useState("");
  const [editar, setEditar] = useState(false);

  const [tiposList, setTipos] = useState([]);
  const [areasList, setAreas] = useState([]);

  const validar = () => {
    if (area_id === "" || nombre.trim() === "" || plazo_dias === "") {
      MySwal.fire({ title: "Faltan datos", text: "Elige el área y escribe el nombre y el plazo en días.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return false;
    }
    if (Number(plazo_dias) < 1) {
      MySwal.fire({ title: "Plazo no válido", text: "El plazo debe ser de al menos 1 día.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return false;
    }
    return true;
  }

  const add = () => {
    if (!validar()) return;
    Axios.post(`${API}/tipo/create`, {
      area_id: area_id,
      nombre: nombre,
      plazo_dias: plazo_dias,
      costo: costo || 0,
      requisitos: requisitos
    }).then(() => {
      getTipos();
      limpiarCampo();
      MySwal.fire({ title: "Tipo de trámite registrado", text: `${nombre} ya se puede usar en mesa de partes.`, icon: "success", confirmButtonColor: COLOR_SELLO });
    }).catch((error) => {
      MySwal.fire({ title: "No se registró", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const update = () => {
    if (!validar()) return;
    Axios.put(`${API}/tipo/update`, {
      id: id,
      area_id: area_id,
      nombre: nombre,
      plazo_dias: plazo_dias,
      costo: costo || 0,
      requisitos: requisitos
    }).then(() => {
      getTipos();
      limpiarCampo();
      MySwal.fire({ title: "Tipo de trámite actualizado", text: `Se guardaron los cambios de ${nombre}.`, icon: "success", confirmButtonColor: COLOR_SELLO });
    }).catch((error) => {
      MySwal.fire({ title: "No se actualizó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const deleteTipo = (id, nombre) => {
    Swal.fire({
      title: "¿Eliminar tipo de trámite?",
      text: `Se eliminará ${nombre}. Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: COLOR_PELIGRO,
      cancelButtonColor: "#5b6678",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`${API}/tipo/delete/${id}`).then(() => {
          getTipos();
          limpiarCampo();
          Swal.fire({ title: "Eliminado", text: `${nombre} fue eliminado.`, icon: "success", confirmButtonColor: COLOR_SELLO });
        }).catch((error) => {
          Swal.fire({ title: "No se eliminó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
        });
      }
    });
  };

  const getTipos = () => {
    Axios.get(`${API}/tipos`).then((response) => {
      setTipos(response.data);
    }).catch((error) => {
      MySwal.fire({ title: "Sin conexión", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const getAreas = () => {
    Axios.get(`${API}/areas`).then((response) => {
      setAreas(response.data);
    });
  }

  useEffect(() => {
    getTipos();
    getAreas();
  }, []);

  const editarTipo = (val) => {
    setEditar(true);
    setAreaId(val.area_id);
    setNombre(val.nombre);
    setPlazoDias(val.plazo_dias);
    setCosto(val.costo);
    setRequisitos(val.requisitos || "");
    setId(val.id);
  }

  const limpiarCampo = () => {
    setAreaId("");
    setNombre("");
    setPlazoDias("");
    setCosto("");
    setRequisitos("");
    setId("");
    setEditar(false);
  }

  return (
    <div>
      <header className="pagina-cabecera">
        <div>
          <h1>Tipos de trámite</h1>
          <p>Cada procedimiento con su área responsable, plazo legal y costo. El plazo se usa para calcular la fecha límite y la prioridad.</p>
        </div>
      </header>

      <div className="crud">
        <div className={editar ? "card formulario editando" : "card formulario"}>
          <div className="card-header">
            <span className="card-header-titulo">
              <i className={editar ? "bi bi-pencil-square" : "bi bi-plus-square"}></i>
              {editar ? "Editar tipo de trámite" : "Registrar tipo de trámite"}
            </span>
          </div>
          <div className="card-body">

            <div className="input-group mb-3">
              <span className="input-group-text" id="tt-area">Área</span>
              <select className="form-select" value={area_id} aria-describedby="tt-area"
                onChange={(event) => {
                  setAreaId(event.target.value);
                }}>
                <option value="">Elige el área responsable</option>
                {areasList.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="tt-nombre">Nombre</span>
              <input type="text" value={nombre}
                onChange={(event) => {
                  setNombre(event.target.value);
                }}
                className="form-control" placeholder="Ej. Licencia de funcionamiento" aria-describedby="tt-nombre" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="tt-plazo">Plazo (días)</span>
              <input type="number" min="1" value={plazo_dias}
                onChange={(event) => {
                  setPlazoDias(event.target.value);
                }}
                className="form-control" placeholder="Ej. 15" aria-describedby="tt-plazo" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="tt-costo">Costo (S/)</span>
              <input type="number" min="0" step="0.10" value={costo}
                onChange={(event) => {
                  setCosto(event.target.value);
                }}
                className="form-control" placeholder="0.00 si es gratuito" aria-describedby="tt-costo" />
            </div>

            <div className="input-group mb-1">
              <span className="input-group-text" id="tt-req">Requisitos</span>
              <textarea value={requisitos}
                onChange={(event) => {
                  setRequisitos(event.target.value);
                }}
                className="form-control" placeholder="Documentos que debe presentar el ciudadano" aria-describedby="tt-req"></textarea>
            </div>

          </div>
          <div className="card-footer text-muted">
            {
              editar ?
                <div className="d-flex gap-2">
                  <button className='btn btn-info' onClick={limpiarCampo}>Cancelar</button>
                  <button className='btn btn-warning' onClick={update}><i className="bi bi-check2"></i>Guardar cambios</button>
                </div>
                : <button className='btn btn-success' onClick={add}><i className="bi bi-plus-lg"></i>Registrar tipo</button>
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-header-titulo"><i className="bi bi-journal-text"></i>Procedimientos registrados</span>
            <span className="contador">{tiposList.length}</span>
          </div>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th scope="col">Trámite</th>
                  <th scope="col">Área</th>
                  <th scope="col" className="text-end">Plazo</th>
                  <th scope="col" className="text-end">Costo</th>
                  <th scope="col" className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {
                  tiposList.map((val, key) => {
                    return (
                      <tr key={val.id} className={editar && id === val.id ? "fila-editando" : ""}>
                        <td className="celda-principal">
                          {val.nombre}
                          <span className="celda-secundaria">{val.requisitos}</span>
                        </td>
                        <td><span className="etiqueta etiqueta-sello">{val.sigla}</span></td>
                        <td className="text-end">{val.plazo_dias} días</td>
                        <td className="text-end">{Number(val.costo) === 0 ? "Gratuito" : "S/ " + Number(val.costo).toFixed(2)}</td>
                        <td className="text-end">
                          <div className="btn-group" role="group" aria-label="Acciones">
                            <button type="button"
                              onClick={() => {
                                editarTipo(val);
                              }}
                              className="btn btn-info">Editar</button>
                            <button type="button"
                              onClick={() => {
                                deleteTipo(val.id, val.nombre);
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
            {tiposList.length === 0 && (
              <div className="vacio"><i className="bi bi-journal-text"></i>Aún no hay tipos de trámite. Registra el primero con el formulario.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TiposTramite;
