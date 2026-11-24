// =====================================================================
//  OPINIONES (feedback de ciudadanos y personal)   Responsable: Integrante 1
//  Mecanismo de retroalimentacion de la pregunta guia 5.
// =====================================================================
import { useEffect, useState } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { API, COLOR_SELLO, COLOR_PELIGRO, formatoFecha, mensajeError } from '../../config';

const MySwal = withReactContent(Swal);

const TEXTO_ESTRELLAS = ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"];

function Feedback() {

  const [tipo_usuario, setTipoUsuario] = useState("CIUDADANO");
  const [nombre, setNombre] = useState("");
  const [codigo_expediente, setCodigoExpediente] = useState("");
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState("");

  const [feedbackList, setFeedback] = useState([]);
  const [resumenList, setResumen] = useState([]);

  const add = () => {
    if (nombre.trim() === "" || calificacion === 0) {
      MySwal.fire({ title: "Faltan datos", text: "Escribe tu nombre y elige de 1 a 5 estrellas.", icon: "warning", confirmButtonColor: COLOR_SELLO });
      return;
    }
    Axios.post(`${API}/feedback/create`, {
      tipo_usuario: tipo_usuario,
      nombre: nombre,
      codigo_expediente: codigo_expediente.trim().toUpperCase(),
      calificacion: calificacion,
      comentario: comentario
    }).then(() => {
      getFeedback();
      limpiarCampo();
      MySwal.fire({ title: "Opinión registrada", text: "Gracias. Usamos estas opiniones para mejorar la atención.", icon: "success", confirmButtonColor: COLOR_SELLO });
    }).catch((error) => {
      MySwal.fire({ title: "No se registró", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
  }

  const deleteFeedback = (id, nombre) => {
    Swal.fire({
      title: "¿Eliminar opinión?",
      text: `Se eliminará la opinión de ${nombre}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: COLOR_PELIGRO,
      cancelButtonColor: "#5b6678",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`${API}/feedback/delete/${id}`).then(() => {
          getFeedback();
        }).catch((error) => {
          Swal.fire({ title: "No se eliminó", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
        });
      }
    });
  }

  const getFeedback = () => {
    Axios.get(`${API}/feedbacks`).then((response) => {
      setFeedback(response.data);
    }).catch((error) => {
      MySwal.fire({ title: "Sin conexión", text: mensajeError(error), icon: "error", confirmButtonColor: COLOR_SELLO });
    });
    Axios.get(`${API}/feedback/resumen`).then((response) => {
      setResumen(response.data);
    });
  }

  useEffect(() => {
    getFeedback();
  }, []);

  const limpiarCampo = () => {
    setTipoUsuario("CIUDADANO");
    setNombre("");
    setCodigoExpediente("");
    setCalificacion(0);
    setComentario("");
  }

  const mostrarEstrellas = (n) => (
    <span className="estrellas" aria-label={n + " de 5 estrellas"}>
      {[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= n ? "bi bi-star-fill llena" : "bi bi-star-fill"}></i>)}
    </span>
  );

  return (
    <div>
      <header className="pagina-cabecera">
        <div>
          <h1>Opiniones</h1>
          <p>Lo que dicen ciudadanos y personal sobre el sistema. Las calificaciones bajas señalan qué ajustar.</p>
        </div>
        <div className="d-flex gap-2">
          {resumenList.map((r) => (
            <span key={r.tipo_usuario} className="etiqueta etiqueta-sello">
              {r.tipo_usuario === "CIUDADANO" ? "Ciudadanos" : "Personal"}: {r.promedio} de 5 ({r.total})
            </span>
          ))}
        </div>
      </header>

      <div className="crud">
        <div className="card formulario">
          <div className="card-header">
            <span className="card-header-titulo"><i className="bi bi-chat-square-heart"></i>Dejar una opinión</span>
          </div>
          <div className="card-body">

            <div className="input-group mb-3">
              <span className="input-group-text" id="f-tipo">Soy</span>
              <select className="form-select" value={tipo_usuario} aria-describedby="f-tipo"
                onChange={(event) => {
                  setTipoUsuario(event.target.value);
                }}>
                <option value="CIUDADANO">Ciudadano</option>
                <option value="PERSONAL">Personal municipal</option>
              </select>
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="f-nom">Nombre</span>
              <input type="text" value={nombre}
                onChange={(event) => {
                  setNombre(event.target.value);
                }}
                className="form-control" placeholder="Tu nombre" aria-describedby="f-nom" />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text" id="f-exp">Expediente</span>
              <input type="text" value={codigo_expediente}
                onChange={(event) => {
                  setCodigoExpediente(event.target.value);
                }}
                className="form-control" placeholder="Opcional, ej. EXP-2026-000003" aria-describedby="f-exp" />
            </div>

            <div className="mb-3">
              <div className="estrellas" role="radiogroup" aria-label="Calificación">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button key={i} type="button" role="radio" aria-checked={calificacion === i}
                    aria-label={i + " estrellas"}
                    className={i <= calificacion ? "llena" : ""}
                    onClick={() => {
                      setCalificacion(i);
                    }}>
                    <i className="bi bi-star-fill"></i>
                  </button>
                ))}
              </div>
              <span className="ms-2 text-secondary">{calificacion ? TEXTO_ESTRELLAS[calificacion] : "Elige una calificación"}</span>
            </div>

            <div className="input-group mb-1">
              <span className="input-group-text" id="f-com">Comentario</span>
              <textarea value={comentario}
                onChange={(event) => {
                  setComentario(event.target.value);
                }}
                className="form-control" placeholder="Qué funcionó y qué mejorarías" aria-describedby="f-com"></textarea>
            </div>

          </div>
          <div className="card-footer text-muted">
            <button className='btn btn-success' onClick={add}><i className="bi bi-send"></i>Enviar opinión</button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-header-titulo"><i className="bi bi-chat-left-text"></i>Opiniones recibidas</span>
            <span className="contador">{feedbackList.length}</span>
          </div>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th scope="col">Persona</th>
                  <th scope="col">Calificación</th>
                  <th scope="col">Comentario</th>
                  <th scope="col" className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {
                  feedbackList.map((val, key) => {
                    return (
                      <tr key={val.id}>
                        <td className="celda-principal">
                          {val.nombre}
                          <span className="celda-secundaria">
                            {val.tipo_usuario === "CIUDADANO" ? "Ciudadano" : "Personal"}, {formatoFecha(val.fecha)}
                          </span>
                        </td>
                        <td>{mostrarEstrellas(val.calificacion)}</td>
                        <td>
                          {val.comentario}
                          {val.codigo_expediente && <span className="celda-secundaria"><span className="expediente">{val.codigo_expediente}</span></span>}
                        </td>
                        <td className="text-end">
                          <button type="button"
                            onClick={() => {
                              deleteFeedback(val.id, val.nombre);
                            }}
                            className="btn btn-danger btn-sm">Eliminar</button>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
            {feedbackList.length === 0 && (
              <div className="vacio"><i className="bi bi-chat-square"></i>Todavía no hay opiniones.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Feedback;
