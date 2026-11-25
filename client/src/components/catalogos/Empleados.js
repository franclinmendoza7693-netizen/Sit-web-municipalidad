// =====================================================================
//  CRUD PERSONAL MUNICIPAL (tabla empleado)      Responsable: Integrante 1
//  Es el CRUD de empleados que hicimos en clase, adaptado: ahora cada
//  empleado pertenece a un area (llave foranea area_id).
// =====================================================================
import { useEffect, useState } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { API, COLOR_SELLO, COLOR_PELIGRO, mensajeError } from '../../config';

const MySwal = withReactContent(Swal);

function Empleados() {

  const [area_id, setAreaId] = useState("");
  const [dni, setDni] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [cargo, setCargo] = useState("");
  const [correo, setCorreo] = useState("");
  const [id, setId] = useState("");
  const [editar, setEditar] = useState(false);

  const [empleadosList, setEmpleados] = useState([]);
  const [areasList, setAreas] = useState([]);

  const validar = () => {
    if (area_id === "" || !/^\d{8}$/.test(dni) || nombres.trim() === "" || apellidos.trim() === "" || cargo.trim() === "") {
      MySwal.fire({ title: "Faltan datos", text: "Completa área, DNI de 8 números, nombres, apellidos y cargo.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return false;
    }
    return true;
  }

  const add = () => {
    if (!validar()) return;
    Axios.post(`${API}/empleado/create`, {
      area_id: area_id,
      dni: dni,
      nombres: nombres,
      apellidos: apellidos,
      cargo: cargo,
      correo: correo
    }).then(() => {
      getEmpleados();
      limpiarCampo();
      MySwal.fire({ title: "Empleado registrado", text: `${nombres} ${apellidos} ya puede atender expedientes.`, icon: "success", confirmButtonColor: COLOR_SELLO });
    }).catch((error) => {
      MySwal.fire({ title: "No se registró", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const update = () => {
    if (!validar()) return;
    Axios.put(`${API}/empleado/update`, {
      id: id,
      area_id: area_id,
      dni: dni,
      nombres: nombres,
      apellidos: apellidos,
      cargo: cargo,
      correo: correo
    }).then(() => {
      getEmpleados();
      limpiarCampo();
      MySwal.fire({ title: "Empleado actualizado", text: `Se guardaron los cambios de ${nombres} ${apellidos}.`, icon: "success", confirmButtonColor: COLOR_SELLO });
    }).catch((error) => {
      MySwal.fire({ title: "No se actualizó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const deleteEmple = (id, nombre) => {
    Swal.fire({
      title: "¿Eliminar empleado?",
      text: `Se eliminará a ${nombre}. Sus expedientes quedarán sin responsable.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: COLOR_PELIGRO,
      cancelButtonColor: "#5b6678",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`${API}/empleado/delete/${id}`).then(() => {
          getEmpleados();
          limpiarCampo();
          Swal.fire({ title: "Eliminado", text: `${nombre} fue eliminado.`, icon: "success", confirmButtonColor: COLOR_SELLO });
        }).catch((error) => {
          Swal.fire({ title: "No se eliminó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
        });
      }
    });
  };

  const getEmpleados = () => {
    Axios.get(`${API}/empleados`).then((response) => {
      setEmpleados(response.data);
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
    getEmpleados();
    getAreas();
  }, []);

  const editarEmpleado = (val) => {
    setEditar(true);
    setAreaId(val.area_id);
    setDni(val.dni);
    setNombres(val.nombres);
    setApellidos(val.apellidos);
    setCargo(val.cargo);
    setCorreo(val.correo || "");
    setId(val.id);
  }

  const limpiarCampo = () => {
    setAreaId("");
    setDni("");
    setNombres("");
    setApellidos("");
    setCargo("");
    setCorreo("");
    setId("");
    setEditar(false);
  }

  return (
    <div>
      <header className="pagina-cabecera">
        <div>
          <h1>Personal municipal</h1>
          <p>Servidores que revisan los expedientes. Cada uno pertenece a un área.</p>
        </div>
      </header>

      <div className="crud">
        <div className={editar ? "card formulario editando" : "card formulario"}>
          <div className="card-header">
            <span className="card-header-titulo">
              <i className={editar ? "bi bi-pencil-square" : "bi bi-person-plus"}></i>
              {editar ? "Editar empleado" : "Registrar empleado"}
            </span>
          </div>
          <div className="card-body">

            <div className="input-group mb-3">
              <span className="input-group-text" id="e-area">Área</span>
              <select className="form-select" value={area_id} aria-describedby="e-area"
                onChange={(event) => {
                  setAreaId(event.target.value);
                }}>
                <option value="">Elige el área</option>
                {areasList.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="e-dni">DNI</span>
              <input type="text" value={dni} maxLength={8} inputMode="numeric"
                onChange={(event) => {
                  setDni(event.target.value.replace(/\D/g, ""));
                }}
                className="form-control" placeholder="8 dígitos" aria-describedby="e-dni" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="e-nom">Nombres</span>
              <input type="text" value={nombres}
                onChange={(event) => {
                  setNombres(event.target.value);
                }}
                className="form-control" placeholder="Ingrese los nombres" aria-describedby="e-nom" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="e-ape">Apellidos</span>
              <input type="text" value={apellidos}
                onChange={(event) => {
                  setApellidos(event.target.value);
                }}
                className="form-control" placeholder="Ingrese los apellidos" aria-describedby="e-ape" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="e-car">Cargo</span>
              <input type="text" value={cargo}
                onChange={(event) => {
                  setCargo(event.target.value);
                }}
                className="form-control" placeholder="Ej. Especialista en licencias" aria-describedby="e-car" />
            </div>

            <div className="input-group mb-1">
              <span className="input-group-text" id="e-cor">Correo</span>
              <input type="email" value={correo}
                onChange={(event) => {
                  setCorreo(event.target.value);
                }}
                className="form-control" placeholder="usuario@muniyau.gob.pe" aria-describedby="e-cor" />
            </div>

          </div>
          <div className="card-footer text-muted">
            {
              editar ?
                <div className="d-flex gap-2">
                  <button className='btn btn-info' onClick={limpiarCampo}>Cancelar</button>
                  <button className='btn btn-warning' onClick={update}><i className="bi bi-check2"></i>Guardar cambios</button>
                </div>
                : <button className='btn btn-success' onClick={add}><i className="bi bi-plus-lg"></i>Registrar empleado</button>
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-header-titulo"><i className="bi bi-person-badge"></i>Personal registrado</span>
            <span className="contador">{empleadosList.length}</span>
          </div>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th scope="col">DNI</th>
                  <th scope="col">Nombre</th>
                  <th scope="col">Área</th>
                  <th scope="col">Correo</th>
                  <th scope="col" className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {
                  empleadosList.map((val, key) => {
                    return (
                      <tr key={val.id} className={editar && id === val.id ? "fila-editando" : ""}>
                        <td className="numero">{val.dni}</td>
                        <td className="celda-principal">
                          {val.nombres} {val.apellidos}
                          <span className="celda-secundaria">{val.cargo}</span>
                        </td>
                        <td><span className="etiqueta etiqueta-sello">{val.sigla}</span></td>
                        <td>{val.correo}</td>
                        <td className="text-end">
                          <div className="btn-group" role="group" aria-label="Acciones">
                            <button type="button"
                              onClick={() => {
                                editarEmpleado(val);
                              }}
                              className="btn btn-info">Editar</button>
                            <button type="button"
                              onClick={() => {
                                deleteEmple(val.id, val.nombres + " " + val.apellidos);
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
            {empleadosList.length === 0 && (
              <div className="vacio"><i className="bi bi-person-badge"></i>Aún no hay personal. Registra al primero con el formulario.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Empleados;
