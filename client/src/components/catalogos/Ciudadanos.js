// =====================================================================
//  CRUD CIUDADANOS                               Responsable: Integrante 1
//  es_vulnerable: adulto mayor, persona con discapacidad o gestante.
//  Este dato lo usa el modelo de Machine Learning para priorizar.
// =====================================================================
import { useEffect, useState } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { API, COLOR_SELLO, COLOR_PELIGRO, mensajeError } from '../../config';

const MySwal = withReactContent(Swal);

function Ciudadanos() {

  const [dni, setDni] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [es_vulnerable, setEsVulnerable] = useState(false);
  const [id, setId] = useState("");
  const [editar, setEditar] = useState(false);

  const [ciudadanosList, setCiudadanos] = useState([]);
  const [buscar, setBuscar] = useState("");

  const validar = () => {
    if (!/^\d{8}$/.test(dni)) {
      MySwal.fire({ title: "DNI no válido", text: "El DNI debe tener 8 números.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return false;
    }
    if (nombres.trim() === "" || apellidos.trim() === "") {
      MySwal.fire({ title: "Faltan datos", text: "Escribe los nombres y apellidos.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return false;
    }
    if (correo !== "" && !/^\S+@\S+\.\S+$/.test(correo)) {
      MySwal.fire({ title: "Correo no válido", text: "Revisa el correo; se usa para enviar las alertas.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return false;
    }
    return true;
  }

  const add = () => {
    if (!validar()) return;
    Axios.post(`${API}/ciudadano/create`, {
      dni: dni,
      nombres: nombres,
      apellidos: apellidos,
      correo: correo,
      telefono: telefono,
      direccion: direccion,
      es_vulnerable: es_vulnerable ? 1 : 0
    }).then(() => {
      getCiudadanos();
      limpiarCampo();
      MySwal.fire({ title: "Ciudadano registrado", text: `${nombres} ${apellidos} ya puede presentar trámites.`, icon: "success", confirmButtonColor: COLOR_SELLO });
    }).catch((error) => {
      MySwal.fire({ title: "No se registró", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const update = () => {
    if (!validar()) return;
    Axios.put(`${API}/ciudadano/update`, {
      id: id,
      dni: dni,
      nombres: nombres,
      apellidos: apellidos,
      correo: correo,
      telefono: telefono,
      direccion: direccion,
      es_vulnerable: es_vulnerable ? 1 : 0
    }).then(() => {
      getCiudadanos();
      limpiarCampo();
      MySwal.fire({ title: "Ciudadano actualizado", text: `Se guardaron los cambios de ${nombres} ${apellidos}.`, icon: "success", confirmButtonColor: COLOR_SELLO });
    }).catch((error) => {
      MySwal.fire({ title: "No se actualizó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const deleteCiudadano = (id, nombre) => {
    Swal.fire({
      title: "¿Eliminar ciudadano?",
      text: `Se eliminará a ${nombre}. Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: COLOR_PELIGRO,
      cancelButtonColor: "#5b6678",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`${API}/ciudadano/delete/${id}`).then(() => {
          getCiudadanos();
          limpiarCampo();
          Swal.fire({ title: "Eliminado", text: `${nombre} fue eliminado.`, icon: "success", confirmButtonColor: COLOR_SELLO });
        }).catch((error) => {
          Swal.fire({ title: "No se eliminó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
        });
      }
    });
  };

  const getCiudadanos = () => {
    Axios.get(`${API}/ciudadanos`).then((response) => {
      setCiudadanos(response.data);
    }).catch((error) => {
      MySwal.fire({ title: "Sin conexión", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  useEffect(() => {
    getCiudadanos();
  }, []);

  const editarCiudadano = (val) => {
    setEditar(true);
    setDni(val.dni);
    setNombres(val.nombres);
    setApellidos(val.apellidos);
    setCorreo(val.correo || "");
    setTelefono(val.telefono || "");
    setDireccion(val.direccion || "");
    setEsVulnerable(val.es_vulnerable === 1);
    setId(val.id);
  }

  const limpiarCampo = () => {
    setDni("");
    setNombres("");
    setApellidos("");
    setCorreo("");
    setTelefono("");
    setDireccion("");
    setEsVulnerable(false);
    setId("");
    setEditar(false);
  }

  const filtrados = ciudadanosList.filter((c) =>
    (c.dni + " " + c.nombres + " " + c.apellidos).toLowerCase().includes(buscar.toLowerCase())
  );

  return (
    <div>
      <header className="pagina-cabecera">
        <div>
          <h1>Ciudadanos</h1>
          <p>Personas que presentan trámites. El correo y el teléfono se usan para avisarles cada cambio en su expediente.</p>
        </div>
      </header>

      <div className="crud">
        <div className={editar ? "card formulario editando" : "card formulario"}>
          <div className="card-header">
            <span className="card-header-titulo">
              <i className={editar ? "bi bi-pencil-square" : "bi bi-person-plus"}></i>
              {editar ? "Editar ciudadano" : "Registrar ciudadano"}
            </span>
          </div>
          <div className="card-body">

            <div className="input-group mb-3">
              <span className="input-group-text" id="c-dni">DNI</span>
              <input type="text" value={dni} maxLength={8} inputMode="numeric"
                onChange={(event) => {
                  setDni(event.target.value.replace(/\D/g, ""));
                }}
                className="form-control" placeholder="8 dígitos" aria-describedby="c-dni" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="c-nom">Nombres</span>
              <input type="text" value={nombres}
                onChange={(event) => {
                  setNombres(event.target.value);
                }}
                className="form-control" placeholder="Ej. María Elena" aria-describedby="c-nom" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="c-ape">Apellidos</span>
              <input type="text" value={apellidos}
                onChange={(event) => {
                  setApellidos(event.target.value);
                }}
                className="form-control" placeholder="Ej. Quispe Huamán" aria-describedby="c-ape" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="c-cor">Correo</span>
              <input type="email" value={correo}
                onChange={(event) => {
                  setCorreo(event.target.value);
                }}
                className="form-control" placeholder="Para alertas por correo" aria-describedby="c-cor" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="c-tel">Teléfono</span>
              <input type="text" value={telefono} maxLength={15}
                onChange={(event) => {
                  setTelefono(event.target.value);
                }}
                className="form-control" placeholder="Para alertas por SMS" aria-describedby="c-tel" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="c-dir">Dirección</span>
              <input type="text" value={direccion}
                onChange={(event) => {
                  setDireccion(event.target.value);
                }}
                className="form-control" placeholder="Ej. Jr. Los Andes 245" aria-describedby="c-dir" />
            </div>

            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="c-vul" checked={es_vulnerable}
                onChange={(event) => {
                  setEsVulnerable(event.target.checked);
                }} />
              <label className="form-check-label" htmlFor="c-vul">
                Atención preferente (adulto mayor, discapacidad o gestante)
              </label>
            </div>

          </div>
          <div className="card-footer text-muted">
            {
              editar ?
                <div className="d-flex gap-2">
                  <button className='btn btn-info' onClick={limpiarCampo}>Cancelar</button>
                  <button className='btn btn-warning' onClick={update}><i className="bi bi-check2"></i>Guardar cambios</button>
                </div>
                : <button className='btn btn-success' onClick={add}><i className="bi bi-plus-lg"></i>Registrar ciudadano</button>
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-header-titulo"><i className="bi bi-people"></i>Ciudadanos registrados</span>
            <span className="contador">{filtrados.length}</span>
          </div>
          <div className="filtros">
            <input type="search" className="form-control" placeholder="Buscar por DNI o nombre" value={buscar}
              onChange={(event) => {
                setBuscar(event.target.value);
              }} aria-label="Buscar ciudadano" />
          </div>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th scope="col">DNI</th>
                  <th scope="col">Ciudadano</th>
                  <th scope="col">Contacto</th>
                  <th scope="col">Atención</th>
                  <th scope="col" className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {
                  filtrados.map((val, key) => {
                    return (
                      <tr key={val.id} className={editar && id === val.id ? "fila-editando" : ""}>
                        <td className="numero">{val.dni}</td>
                        <td className="celda-principal">
                          {val.nombres} {val.apellidos}
                          <span className="celda-secundaria">{val.direccion}</span>
                        </td>
                        <td>
                          {val.correo || "Sin correo"}
                          <span className="celda-secundaria">{val.telefono || "Sin teléfono"}</span>
                        </td>
                        <td>
                          {val.es_vulnerable === 1
                            ? <span className="etiqueta etiqueta-sello"><i className="bi bi-heart-pulse me-1"></i>Preferente</span>
                            : <span className="etiqueta">Regular</span>}
                        </td>
                        <td className="text-end">
                          <div className="btn-group" role="group" aria-label="Acciones">
                            <button type="button"
                              onClick={() => {
                                editarCiudadano(val);
                              }}
                              className="btn btn-info">Editar</button>
                            <button type="button"
                              onClick={() => {
                                deleteCiudadano(val.id, val.nombres + " " + val.apellidos);
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
            {filtrados.length === 0 && (
              <div className="vacio"><i className="bi bi-people"></i>No hay ciudadanos que coincidan. Registra uno nuevo con el formulario.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Ciudadanos;
