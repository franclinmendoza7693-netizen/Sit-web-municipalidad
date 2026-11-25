// =====================================================================
//  INICIO DE SESION                              Responsable: Integrante 1
//  - Ingreso con CORREO o con USUARIO (ID) + contraseña
//  - Si es correcto, guarda el token (guardarSesion) y avisa a App.js
//  - Enlace para que el ciudadano consulte su expediente sin cuenta
// =====================================================================
import { useState } from 'react';
import Axios from 'axios';
import { API, guardarSesion, mensajeError } from '../../config';

function Login({ onLogin, onConsultaPublica }) {

  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const iniciarSesion = (event) => {
    event.preventDefault(); // evita que el formulario recargue la pagina
    if (identificador.trim() === "" || password === "") {
      setError("Escribe tu correo o usuario y tu contraseña.");
      return;
    }
    setCargando(true);
    setError("");
    Axios.post(`${API}/login`, {
      identificador: identificador,
      password: password
    }).then((response) => {
      guardarSesion(response.data.token, response.data.usuario);
      onLogin(response.data.usuario);
    }).catch((err) => {
      setError(mensajeError(err));
      setPassword("");
      setCargando(false);
    });
  }

  return (
    <div className="login">
      <section className="login-marca">
        <div className="marca">
          <div className="marca-sello" aria-hidden="true">MPY</div>
          <div className="marca-texto">
            <strong>Municipalidad Provincial de Yau</strong>
            <span>Sistema de trámites</span>
          </div>
        </div>
        <h1>Cada expediente, atendido a tiempo y con el ciudadano informado.</h1>
        <ul className="login-puntos">
          <li><i className="bi bi-cpu"></i>La bandeja se ordena sola: primero lo crítico.</li>
          <li><i className="bi bi-bell"></i>El ciudadano recibe una alerta en cada cambio.</li>
          <li><i className="bi bi-shield-lock"></i>Acceso solo para personal autorizado.</li>
        </ul>
      </section>

      <section className="login-formulario">
        <form className="card" onSubmit={iniciarSesion} noValidate>
          <div className="card-body p-4">
            <h2 className="h3 mb-1">Iniciar sesión</h2>
            <p className="text-secondary mb-4">Ingresa con tu correo institucional o tu usuario.</p>

            {error && (
              <div className="login-error" role="alert">
                <i className="bi bi-exclamation-circle"></i>{error}
              </div>
            )}

            <label className="form-label fw-bold" htmlFor="login-id">Correo o usuario</label>
            <div className="input-group mb-3">
              <span className="input-group-text login-icono"><i className="bi bi-person"></i></span>
              <input id="login-id" type="text" autoComplete="username" autoFocus value={identificador}
                onChange={(event) => {
                  setIdentificador(event.target.value);
                }}
                className="form-control" placeholder="usuario@muniyau.gob.pe" />
            </div>

            <label className="form-label fw-bold" htmlFor="login-pass">Contraseña</label>
            <div className="input-group mb-4">
              <span className="input-group-text login-icono"><i className="bi bi-key"></i></span>
              <input id="login-pass" type={verPassword ? "text" : "password"} autoComplete="current-password" value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                className="form-control" placeholder="Tu contraseña" />
              <button type="button" className="btn btn-info" aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => {
                  setVerPassword(!verPassword);
                }}>
                <i className={verPassword ? "bi bi-eye-slash" : "bi bi-eye"}></i>
              </button>
            </div>

            <button type="submit" className="btn btn-success w-100 py-2" disabled={cargando}>
              {cargando ? "Verificando..." : <><i className="bi bi-box-arrow-in-right"></i>Iniciar sesión</>}
            </button>
          </div>
          <div className="card-footer justify-content-center">
            <button type="button" className="btn btn-link login-enlace" onClick={onConsultaPublica}>
              ¿Eres ciudadano? Consulta tu expediente sin cuenta
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default Login;
