// =====================================================================
//  CRUD AREAS                                    Responsable: Integrante 1
//  Mismo patron de la clase: useState por campo, add / update /
//  deleteArea / getAreas / editarArea / limpiarCampo + Axios + SweetAlert2
// =====================================================================
import { useEffect, useState } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { API, COLOR_SELLO, COLOR_PELIGRO, mensajeError } from '../../config';

const MySwal = withReactContent(Swal);

function Areas() {

  const [nombre, setNombre] = useState("");
  const [sigla, setSigla] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [id, setId] = useState("");
  const [editar, setEditar] = useState(false);

  const [areasList, setAreas] = useState([]);

  const validar = () => {
    if (nombre.trim() === "" || sigla.trim() === "") {
      MySwal.fire({ title: "Faltan datos", text: "Escribe el nombre y la sigla del área.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return false;
    }
    return true;
  }

  const add = () => {
    if (!validar()) return;
    Axios.post(`${API}/area/create`, {
      nombre: nombre,
      sigla: sigla,
      descripcion: descripcion
    }).then(() => {
      getAreas();
      limpiarCampo();
      MySwal.fire({ title: "Área registrada", text: `${nombre} ya está disponible para los trámites.`, icon: "success", confirmButtonColor: COLOR_SELLO });
    }).catch((error) => {
      MySwal.fire({ title: "No se registró", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const update = () => {
    if (!validar()) return;
    Axios.put(`${API}/area/update`, {
      id: id,
      nombre: nombre,
      sigla: sigla,
      descripcion: descripcion
    }).then(() => {
      getAreas();
      limpiarCampo();
      MySwal.fire({ title: "Área actualizada", text: `Se guardaron los cambios de ${nombre}.`, icon: "success", confirmButtonColor: COLOR_SELLO });
    }).catch((error) => {
      MySwal.fire({ title: "No se actualizó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const deleteArea = (id, nombre) => {
    Swal.fire({
      title: "¿Eliminar área?",
      text: `Se eliminará ${nombre}. Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: COLOR_PELIGRO,
      cancelButtonColor: "#5b6678",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`${API}/area/delete/${id}`).then(() => {
          getAreas();
          limpiarCampo();
          Swal.fire({ title: "Área eliminada", text: `${nombre} fue eliminada.`, icon: "success", confirmButtonColor: COLOR_SELLO });
        }).catch((error) => {
          Swal.fire({ title: "No se eliminó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
        });
      }
    });
  };

  const getAreas = () => {
    Axios.get(`${API}/areas`).then((response) => {
      setAreas(response.data);
    }).catch((error) => {
      MySwal.fire({ title: "Sin conexión", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  useEffect(() => {
    getAreas();
  }, []);

  const editarArea = (val) => {
    setEditar(true);
    setNombre(val.nombre);
    setSigla(val.sigla);
    setDescripcion(val.descripcion || "");
    setId(val.id);
  }

  const limpiarCampo = () => {
    setNombre("");
    setSigla("");
    setDescripcion("");
    setId("");
    setEditar(false);
  }

  return (
    <div>
      <header className="pagina-cabecera">
        <div>
          <h1>Áreas municipales</h1>
          <p>Las gerencias y oficinas que reciben y atienden los expedientes.</p>
        </div>
      </header>

      <div className="crud">
        <div className={editar ? "card formulario editando" : "card formulario"}>
          <div className="card-header">
            <span className="card-header-titulo">
              <i className={editar ? "bi bi-pencil-square" : "bi bi-plus-square"}></i>
              {editar ? "Editar área" : "Registrar área"}
            </span>
          </div>
          <div className="card-body">

            <div className="input-group mb-3">
              <span className="input-group-text" id="basic-addon1">Nombre</span>
              <input type="text" value={nombre}
                onChange={(event) => {
                  setNombre(event.target.value);
                }}
                className="form-control" placeholder="Ej. Desarrollo Urbano" aria-label="Nombre" aria-describedby="basic-addon1" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="basic-addon2">Sigla</span>
              <input type="text" value={sigla} maxLength={10}
                onChange={(event) => {
                  setSigla(event.target.value.toUpperCase());
                }}
                className="form-control" placeholder="Ej. GDU" aria-label="Sigla" aria-describedby="basic-addon2" />
            </div>

            <div className="input-group mb-1">
              <span className="input-group-text" id="basic-addon3">Descripción</span>
              <textarea value={descripcion}
                onChange={(event) => {
                  setDescripcion(event.target.value);
                }}
                className="form-control" placeholder="Qué trámites atiende" aria-label="Descripción" aria-describedby="basic-addon3"></textarea>
            </div>

          </div>
          <div className="card-footer text-muted">
            {
              editar ?
                <div className="d-flex gap-2">
                  <button className='btn btn-info' onClick={limpiarCampo}>Cancelar</button>
                  <button className='btn btn-warning' onClick={update}><i className="bi bi-check2"></i>Guardar cambios</button>
                </div>
                : <button className='btn btn-success' onClick={add}><i className="bi bi-plus-lg"></i>Registrar área</button>
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-header-titulo"><i className="bi bi-diagram-3"></i>Áreas registradas</span>
            <span className="contador">{areasList.length}</span>
          </div>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Área</th>
                  <th scope="col">Sigla</th>
                  <th scope="col">Descripción</th>
                  <th scope="col" className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {
                  areasList.map((val, key) => {
                    return (
                      <tr key={val.id} className={editar && id === val.id ? "fila-editando" : ""}>
                        <th>{val.id}</th>
                        <td className="celda-principal">{val.nombre}</td>
                        <td><span className="etiqueta etiqueta-sello">{val.sigla}</span></td>
                        <td className="text-secondary">{val.descripcion}</td>
                        <td className="text-end">
                          <div className="btn-group" role="group" aria-label="Acciones">
                            <button type="button"
                              onClick={() => {
                                editarArea(val);
                              }}
                              className="btn btn-info">Editar</button>
                            <button type="button"
                              onClick={() => {
                                deleteArea(val.id, val.nombre);
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
            {areasList.length === 0 && (
              <div className="vacio"><i className="bi bi-diagram-3"></i>Aún no hay áreas. Registra la primera con el formulario.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Areas;
