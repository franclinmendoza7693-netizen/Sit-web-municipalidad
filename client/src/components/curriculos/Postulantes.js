// =====================================================================
//  POSTULANTES Y EVALUACION DE CV CON MACHINE LEARNING  Responsable: Integrante 3
//  - CRUD de postulantes de la convocatoria elegida
//  - Boton "Evaluar CV": el servidor aplica TF-IDF + similitud coseno
//    y devuelve el ranking (puntaje 0-100, APTO / NO APTO)
// =====================================================================
import { useEffect, useState } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { API, COLOR_SELLO, COLOR_PELIGRO, formatoFechaHora, mensajeError } from '../../config';

const MySwal = withReactContent(Swal);

const GRADOS = { SECUNDARIA: "Secundaria", TECNICO: "Técnico", BACHILLER: "Bachiller", TITULADO: "Titulado", MAESTRIA: "Maestría" };

function Postulantes() {

  const [convocatoria_id, setConvocatoriaId] = useState("");
  const [dni, setDni] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [grado_academico, setGradoAcademico] = useState("BACHILLER");
  const [anios_experiencia, setAniosExperiencia] = useState(0);
  const [curriculum_texto, setCurriculumTexto] = useState("");
  const [id, setId] = useState("");
  const [editar, setEditar] = useState(false);

  const [postulantesList, setPostulantes] = useState([]);
  const [convocatoriasList, setConvocatorias] = useState([]);

  const convocatoria = convocatoriasList.find((c) => String(c.id) === String(convocatoria_id));
  const evaluados = postulantesList.filter((p) => p.puntaje_total !== null);

  const validar = () => {
    if (convocatoria_id === "") {
      MySwal.fire({ title: "Elige la convocatoria", text: "Primero selecciona a qué convocatoria postula.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return false;
    }
    if (!/^\d{8}$/.test(dni) || nombres.trim() === "" || apellidos.trim() === "" || curriculum_texto.trim().length < 30) {
      MySwal.fire({ title: "Faltan datos", text: "Completa DNI de 8 números, nombres, apellidos y un CV de al menos 30 caracteres.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return false;
    }
    return true;
  }

  const datosFormulario = () => ({
    convocatoria_id: convocatoria_id,
    dni: dni,
    nombres: nombres,
    apellidos: apellidos,
    correo: correo,
    telefono: telefono,
    grado_academico: grado_academico,
    anios_experiencia: anios_experiencia,
    curriculum_texto: curriculum_texto
  });

  const add = () => {
    if (!validar()) return;
    Axios.post(`${API}/postulante/create`, datosFormulario()).then(() => {
      getPostulantes(convocatoria_id);
      limpiarCampo();
      MySwal.fire({ title: "Postulante registrado", text: "Evalúa los CV para actualizar el ranking.", icon: "success", confirmButtonColor: COLOR_SELLO });
    }).catch((error) => {
      MySwal.fire({ title: "No se registró", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const update = () => {
    if (!validar()) return;
    Axios.put(`${API}/postulante/update`, { id: id, ...datosFormulario() }).then((response) => {
      getPostulantes(convocatoria_id);
      limpiarCampo();
      MySwal.fire({ title: "Postulante actualizado", text: response.data, icon: "success", confirmButtonColor: COLOR_SELLO });
    }).catch((error) => {
      MySwal.fire({ title: "No se actualizó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const deletePostulante = (id, nombre) => {
    Swal.fire({
      title: "¿Eliminar postulante?",
      text: `Se eliminará a ${nombre} y su evaluación.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: COLOR_PELIGRO,
      cancelButtonColor: "#5b6678",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`${API}/postulante/delete/${id}`).then(() => {
          getPostulantes(convocatoria_id);
          limpiarCampo();
        }).catch((error) => {
          Swal.fire({ title: "No se eliminó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
        });
      }
    });
  }

  // Ejecuta el modelo de Machine Learning en el servidor
  const evaluar = () => {
    Axios.post(`${API}/curriculos/evaluar/${convocatoria_id}`).then((response) => {
      getPostulantes(convocatoria_id);
      MySwal.fire({
        title: "CV evaluados",
        text: `${response.data.evaluados} postulantes evaluados; ${response.data.aptos} cumplen el perfil.`,
        icon: "success",
        confirmButtonColor: COLOR_SELLO
      });
    }).catch((error) => {
      MySwal.fire({ title: "No se evaluó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const verCV = (val) => {
    MySwal.fire({
      title: val.nombres + " " + val.apellidos,
      html: (
        <div className="swal-izquierda">
          <p className="text-secondary">{GRADOS[val.grado_academico]}, {val.anios_experiencia} años de experiencia. {val.correo}</p>
          <p>{val.curriculum_texto}</p>
          {val.palabras_coincidentes && (
            <p className="mb-0">
              <strong>Coincide con el perfil en:</strong><br />
              {val.palabras_coincidentes.split(", ").map((p) => <span key={p} className="etiqueta etiqueta-sello">{p}</span>)}
            </p>
          )}
        </div>
      ),
      confirmButtonColor: COLOR_SELLO,
      confirmButtonText: "Cerrar"
    });
  }

  const getPostulantes = (idConvocatoria) => {
    if (!idConvocatoria) {
      setPostulantes([]);
      return;
    }
    Axios.get(`${API}/postulantes/${idConvocatoria}`).then((response) => {
      setPostulantes(response.data);
    }).catch((error) => {
      MySwal.fire({ title: "Sin conexión", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  useEffect(() => {
    Axios.get(`${API}/convocatorias`).then((response) => {
      setConvocatorias(response.data);
      if (response.data.length > 0) {
        setConvocatoriaId(response.data[0].id);
        getPostulantes(response.data[0].id);
      }
    });
  }, []);

  const editarPostulante = (val) => {
    setEditar(true);
    setDni(val.dni);
    setNombres(val.nombres);
    setApellidos(val.apellidos);
    setCorreo(val.correo || "");
    setTelefono(val.telefono || "");
    setGradoAcademico(val.grado_academico);
    setAniosExperiencia(val.anios_experiencia);
    setCurriculumTexto(val.curriculum_texto);
    setId(val.id);
  }

  const limpiarCampo = () => {
    setDni("");
    setNombres("");
    setApellidos("");
    setCorreo("");
    setTelefono("");
    setGradoAcademico("BACHILLER");
    setAniosExperiencia(0);
    setCurriculumTexto("");
    setId("");
    setEditar(false);
  }

  return (
    <div>
      <header className="pagina-cabecera">
        <div>
          <h1>Evaluación de CV</h1>
          <p>El modelo compara cada currículum con el perfil de la convocatoria (TF-IDF y similitud coseno) y arma el ranking. La decisión final es del comité.</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <select className="form-select" value={convocatoria_id} aria-label="Convocatoria"
            onChange={(event) => {
              setConvocatoriaId(event.target.value);
              getPostulantes(event.target.value);
              limpiarCampo();
            }}>
            <option value="">Elige la convocatoria</option>
            {convocatoriasList.map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.titulo}</option>)}
          </select>
        </div>
      </header>

      {convocatoria && (
        <div className="card mb-3">
          <div className="card-body">
            <strong>Perfil buscado: </strong>
            <span className="text-secondary">{convocatoria.perfil_requerido}</span>
            <span className="d-block mt-1 explicacion">
              Experiencia mínima: {convocatoria.experiencia_minima} {convocatoria.experiencia_minima === 1 ? "año" : "años"}. Vacantes: {convocatoria.vacantes}.
            </span>
          </div>
        </div>
      )}

      <div className="crud">
        <div className={editar ? "card formulario editando" : "card formulario"}>
          <div className="card-header">
            <span className="card-header-titulo">
              <i className={editar ? "bi bi-pencil-square" : "bi bi-person-plus"}></i>
              {editar ? "Editar postulante" : "Registrar postulante"}
            </span>
          </div>
          <div className="card-body">
            <div className="input-group mb-3">
              <span className="input-group-text" id="p-dni">DNI</span>
              <input type="text" value={dni} maxLength={8} inputMode="numeric"
                onChange={(event) => {
                  setDni(event.target.value.replace(/\D/g, ""));
                }}
                className="form-control" placeholder="8 dígitos" aria-describedby="p-dni" />
            </div>
            <div className="input-group mb-3">
              <span className="input-group-text" id="p-nom">Nombres</span>
              <input type="text" value={nombres}
                onChange={(event) => {
                  setNombres(event.target.value);
                }}
                className="form-control" aria-describedby="p-nom" />
            </div>
            <div className="input-group mb-3">
              <span className="input-group-text" id="p-ape">Apellidos</span>
              <input type="text" value={apellidos}
                onChange={(event) => {
                  setApellidos(event.target.value);
                }}
                className="form-control" aria-describedby="p-ape" />
            </div>
            <div className="input-group mb-3">
              <span className="input-group-text" id="p-cor">Correo</span>
              <input type="email" value={correo}
                onChange={(event) => {
                  setCorreo(event.target.value);
                }}
                className="form-control" aria-describedby="p-cor" />
            </div>
            <div className="input-group mb-3">
              <span className="input-group-text" id="p-tel">Teléfono</span>
              <input type="text" value={telefono} maxLength={15}
                onChange={(event) => {
                  setTelefono(event.target.value);
                }}
                className="form-control" aria-describedby="p-tel" />
            </div>
            <div className="d-flex gap-2 mb-3">
              <div className="input-group">
                <span className="input-group-text" style={{ minWidth: 0 }} id="p-gra">Grado</span>
                <select className="form-select" value={grado_academico} aria-describedby="p-gra"
                  onChange={(event) => {
                    setGradoAcademico(event.target.value);
                  }}>
                  {Object.keys(GRADOS).map((g) => <option key={g} value={g}>{GRADOS[g]}</option>)}
                </select>
              </div>
              <div className="input-group" style={{ maxWidth: 160 }}>
                <span className="input-group-text" style={{ minWidth: 0 }} id="p-exp">Años</span>
                <input type="number" min="0" value={anios_experiencia}
                  onChange={(event) => {
                    setAniosExperiencia(event.target.value);
                  }}
                  className="form-control" aria-describedby="p-exp" />
              </div>
            </div>
            <div className="input-group mb-1">
              <span className="input-group-text" id="p-cv">CV</span>
              <textarea value={curriculum_texto} rows={6}
                onChange={(event) => {
                  setCurriculumTexto(event.target.value);
                }}
                className="form-control" placeholder="Pega aquí el resumen del currículum: estudios, experiencia, cursos y herramientas" aria-describedby="p-cv"></textarea>
            </div>
          </div>
          <div className="card-footer text-muted">
            {
              editar ?
                <div className="d-flex gap-2">
                  <button className='btn btn-info' onClick={limpiarCampo}>Cancelar</button>
                  <button className='btn btn-warning' onClick={update}><i className="bi bi-check2"></i>Guardar cambios</button>
                </div>
                : <button className='btn btn-success' onClick={add}><i className="bi bi-plus-lg"></i>Registrar postulante</button>
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-header-titulo"><i className="bi bi-trophy"></i>Ranking de postulantes</span>
            <button className="btn btn-success btn-sm" onClick={evaluar} disabled={postulantesList.length === 0}>
              <i className="bi bi-cpu"></i>Evaluar CV
            </button>
          </div>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th scope="col">Puesto</th>
                  <th scope="col">Postulante</th>
                  <th scope="col">Puntaje</th>
                  <th scope="col">Desglose</th>
                  <th scope="col">Resultado</th>
                  <th scope="col" className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {
                  postulantesList.map((val, key) => {
                    const evaluado = val.puntaje_total !== null;
                    return (
                      <tr key={val.id} className={editar && id === val.id ? "fila-editando" : ""}>
                        <td>{evaluado ? <span className={"puesto" + (key === 0 ? " puesto-1" : "")}>{key + 1}</span> : "—"}</td>
                        <td className="celda-principal">
                          {val.nombres} {val.apellidos}
                          <span className="celda-secundaria">{GRADOS[val.grado_academico]}, {val.anios_experiencia} {Number(val.anios_experiencia) === 1 ? "año" : "años"}</span>
                        </td>
                        <td>
                          {evaluado ? (
                            <>
                              <strong className="fs-5 numero">{val.puntaje_total}</strong>
                              <span className="puntaje"><span style={{ width: val.puntaje_total + "%", background: "var(--sello)" }}></span></span>
                            </>
                          ) : <span className="text-secondary">Sin evaluar</span>}
                        </td>
                        <td className="explicacion">
                          {evaluado && (
                            <>
                              Perfil {val.puntaje_similitud}<br />
                              Experiencia {val.puntaje_experiencia}<br />
                              Grado {val.puntaje_grado}
                            </>
                          )}
                        </td>
                        <td>
                          {evaluado && (val.resultado === "APTO"
                            ? <span className="estado estado-APROBADO">Apto</span>
                            : <span className="estado estado-RECHAZADO">No apto</span>)}
                          {evaluado && <span className="celda-secundaria">{formatoFechaHora(val.fecha_evaluacion)}</span>}
                        </td>
                        <td className="text-end">
                          <div className="btn-group" role="group" aria-label="Acciones">
                            <button type="button" onClick={() => { verCV(val); }} className="btn btn-info">Ver CV</button>
                            <button type="button" onClick={() => { editarPostulante(val); }} className="btn btn-info">Editar</button>
                            <button type="button" onClick={() => { deletePostulante(val.id, val.nombres + " " + val.apellidos); }} className="btn btn-danger">Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
            {postulantesList.length === 0 && (
              <div className="vacio"><i className="bi bi-file-earmark-person"></i>Esta convocatoria aún no tiene postulantes. Registra el primero con el formulario.</div>
            )}
          </div>
          {postulantesList.length > 0 && (
            <div className="card-footer justify-content-start explicacion">
              {evaluados.length === postulantesList.length
                ? "Puntaje = 60% coincidencia con el perfil + 25% experiencia + 15% grado. Apto desde 55 puntos y con la experiencia mínima."
                : "Hay postulantes sin evaluar. Pulsa Evaluar CV para actualizar el ranking."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Postulantes;
