// =====================================================================
//  CRUD USUARIOS (cuentas de acceso)  - solo ADMINISTRADOR
//  Responsable: Integrante 1
//  La contraseña se envia al servidor y alli se CIFRA; nunca vuelve al cliente.
// =====================================================================
import { useEffect, useState } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { API, COLOR_SELLO, COLOR_PELIGRO, formatoFechaHora, mensajeError } from '../../config';

const MySwal = withReactContent(Swal);

function Usuarios({ usuarioActual }) {

  const [empleado_id, setEmpleadoId] = useState("");
  const [usuario, setUsuario] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("TRABAJADOR");
  const [activo, setActivo] = useState(true);
  const [id, setId] = useState("");
  const [editar, setEditar] = useState(false);

  const [usuariosList, setUsuarios] = useState([]);
  const [empleadosList, setEmpleados] = useState([]);

  const validar = () => {
    if (usuario.trim() === "" || !/^\S+@\S+\.\S+$/.test(correo)) {
      MySwal.fire({ title: "Faltan datos", text: "Escribe un usuario y un correo válido.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return false;
    }
    if ((!editar || password !== "") && (password.length < 8 || !/\d/.test(password) || !/[A-Za-z]/.test(password))) {
      MySwal.fire({ title: "Contraseña débil", text: "Usa al menos 8 caracteres, con letras y números.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return false;
    }
    return true;
  }

  const add = () => {
    if (!validar()) return;
    Axios.post(`${API}/usuario/create`, {
      empleado_id: empleado_id,
      usuario: usuario,
      correo: correo,
      password: password,
      rol: rol
    }).then(() => {
      getUsuarios();
      limpiarCampo();
      MySwal.fire({ title: "Usuario creado", text: `${usuario} ya puede iniciar sesión.`, icon: "success", confirmButtonColor: COLOR_SELLO });
    }).catch((error) => {
      MySwal.fire({ title: "No se creó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const update = () => {
    if (!validar()) return;
    Axios.put(`${API}/usuario/update`, {
      id: id,
      empleado_id: empleado_id,
      usuario: usuario,
      correo: correo,
      password: password,
      rol: rol,
      activo: activo
    }).then(() => {
      getUsuarios();
      limpiarCampo();
      MySwal.fire({ title: "Usuario actualizado", text: password ? "La contraseña cambió y su sesión anterior se cerró." : "Se guardaron los cambios.", icon: "success", confirmButtonColor: COLOR_SELLO });
    }).catch((error) => {
      MySwal.fire({ title: "No se actualizó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const deleteUsuario = (id, usuario) => {
    Swal.fire({
      title: "¿Eliminar usuario?",
      text: `${usuario} ya no podrá iniciar sesión. Si solo quieres suspenderlo, desactívalo.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: COLOR_PELIGRO,
      cancelButtonColor: "#5b6678",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`${API}/usuario/delete/${id}`).then(() => {
          getUsuarios();
          limpiarCampo();
        }).catch((error) => {
          Swal.fire({ title: "No se eliminó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
        });
      }
    });
  }

  const getUsuarios = () => {
    Axios.get(`${API}/usuarios`).then((response) => {
      setUsuarios(response.data);
    }).catch((error) => {
      MySwal.fire({ title: "Sin acceso", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  useEffect(() => {
    getUsuarios();
    Axios.get(`${API}/empleados`).then((response) => setEmpleados(response.data));
  }, []);

  // Al elegir un empleado se sugiere su correo y su usuario
  const elegirEmpleado = (valor) => {
    setEmpleadoId(valor);
    const e = empleadosList.find((x) => String(x.id) === String(valor));
    if (e && !editar) {
      if (correo === "") setCorreo(e.correo || "");
      if (usuario === "" && e.correo) setUsuario(e.correo.split("@")[0]);
    }
  }

  const editarUsuario = (val) => {
    setEditar(true);
    setEmpleadoId(val.empleado_id || "");
    setUsuario(val.usuario);
    setCorreo(val.correo);
    setPassword("");
    setRol(val.rol);
    setActivo(val.activo === 1);
    setId(val.id);
  }

  const limpiarCampo = () => {
    setEmpleadoId("");
    setUsuario("");
    setCorreo("");
    setPassword("");
    setRol("TRABAJADOR");
    setActivo(true);
    setId("");
    setEditar(false);
  }

  const estadoCuenta = (val) => {
    if (val.activo === 0) return <span className="estado estado-RECHAZADO">Inactivo</span>;
    if (val.bloqueado === 1) return <span className="estado estado-OBSERVADO">Bloqueado</span>;
    return <span className="estado estado-APROBADO">Activo</span>;
  }

  return (
    <div>
      <header className="pagina-cabecera">
        <div>
          <h1>Usuarios</h1>
          <p>Cuentas para entrar al sistema. El administrador ve todo; el trabajador, solo su operación diaria.</p>
        </div>
      </header>

      <div className="crud">
        <div className={editar ? "card formulario editando" : "card formulario"}>
          <div className="card-header">
            <span className="card-header-titulo">
              <i className={editar ? "bi bi-pencil-square" : "bi bi-person-lock"}></i>
              {editar ? "Editar usuario" : "Crear usuario"}
            </span>
          </div>
          <div className="card-body">
            <div className="input-group mb-3">
              <span className="input-group-text" id="u-emp">Empleado</span>
              <select className="form-select" value={empleado_id} aria-describedby="u-emp"
                onChange={(event) => {
                  elegirEmpleado(event.target.value);
                }}>
                <option value="">Sin empleado (cuenta general)</option>
                {empleadosList.map((e) => <option key={e.id} value={e.id}>{e.nombres} {e.apellidos} ({e.sigla})</option>)}
              </select>
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="u-usu">Usuario (ID)</span>
              <input type="text" value={usuario} maxLength={50}
                onChange={(event) => {
                  setUsuario(event.target.value.toLowerCase().replace(/\s/g, ""));
                }}
                className="form-control" placeholder="Ej. kmedina" aria-describedby="u-usu" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="u-cor">Correo</span>
              <input type="email" value={correo}
                onChange={(event) => {
                  setCorreo(event.target.value);
                }}
                className="form-control" placeholder="usuario@muniyau.gob.pe" aria-describedby="u-cor" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="u-pas">Contraseña</span>
              <input type="password" value={password} autoComplete="new-password"
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                className="form-control" placeholder={editar ? "Vacía para no cambiarla" : "Mínimo 8, letras y números"} aria-describedby="u-pas" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="u-rol">Rol</span>
              <select className="form-select" value={rol} aria-describedby="u-rol"
                onChange={(event) => {
                  setRol(event.target.value);
                }}>
                <option value="TRABAJADOR">Trabajador</option>
                <option value="ADMINISTRADOR">Administrador</option>
              </select>
            </div>

            {editar && (
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="u-act" checked={activo}
                  onChange={(event) => {
                    setActivo(event.target.checked);
                  }} />
                <label className="form-check-label" htmlFor="u-act">Cuenta activa (puede iniciar sesión)</label>
              </div>
            )}
          </div>
          <div className="card-footer text-muted">
            {
              editar ?
                <div className="d-flex gap-2">
                  <button className='btn btn-info' onClick={limpiarCampo}>Cancelar</button>
                  <button className='btn btn-warning' onClick={update}><i className="bi bi-check2"></i>Guardar cambios</button>
                </div>
                : <button className='btn btn-success' onClick={add}><i className="bi bi-plus-lg"></i>Crear usuario</button>
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-header-titulo"><i className="bi bi-people"></i>Cuentas registradas</span>
            <span className="contador">{usuariosList.length}</span>
          </div>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th scope="col">Usuario</th>
                  <th scope="col">Empleado</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Último acceso</th>
                  <th scope="col" className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {
                  usuariosList.map((val, key) => {
                    return (
                      <tr key={val.id} className={editar && id === val.id ? "fila-editando" : ""}>
                        <td className="celda-principal">
                          {val.usuario}
                          {usuarioActual && usuarioActual.id === val.id && <span className="etiqueta etiqueta-sello ms-2">Tú</span>}
                          <span className="celda-secundaria">{val.correo}</span>
                        </td>
                        <td>
                          {val.empleado || <span className="text-secondary">Cuenta general</span>}
                          {val.cargo && <span className="celda-secundaria">{val.cargo} ({val.sigla})</span>}
                        </td>
                        <td>
                          {val.rol === "ADMINISTRADOR"
                            ? <span className="etiqueta etiqueta-sello"><i className="bi bi-shield-check me-1"></i>Administrador</span>
                            : <span className="etiqueta">Trabajador</span>}
                        </td>
                        <td>{estadoCuenta(val)}</td>
                        <td className="sin-corte">{val.ultimo_acceso ? formatoFechaHora(val.ultimo_acceso) : "Nunca"}</td>
                        <td className="text-end">
                          <div className="btn-group" role="group" aria-label="Acciones">
                            <button type="button"
                              onClick={() => {
                                editarUsuario(val);
                              }}
                              className="btn btn-info">Editar</button>
                            <button type="button"
                              onClick={() => {
                                deleteUsuario(val.id, val.usuario);
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default Usuarios;
