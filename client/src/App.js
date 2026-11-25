// =====================================================================
//  APP PRINCIPAL - sesion, menu lateral y cambio de pantallas
//  Responsable: Integrante 1 (Master)
//
//  1. Si NO hay sesion  -> pantalla de Login (o el portal del ciudadano)
//  2. Si hay sesion     -> menu segun el ROL (ADMINISTRADOR / TRABAJADOR)
//
//  Cada integrante tiene BLOQUES en este archivo (imports, menu, pantallas
//  y portal). Los del Integrante 2 y 3 estan comentados; cada uno los
//  descomenta en su rama (developM / developR) al subir sus componentes.
// =====================================================================
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css'; // va DESPUES de Bootstrap para que nuestro diseño tenga prioridad
import { useEffect, useState } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { API, COLOR_SELLO, leerSesion, borrarSesion } from './config';

// ===================== IMPORTS INTEGRANTE 1 (MASTER) =====================
import Login from './components/auth/Login';
import Usuarios from './components/seguridad/Usuarios';
import Dashboard from './components/dashboard/Dashboard';
import Areas from './components/catalogos/Areas';
import TiposTramite from './components/catalogos/TiposTramite';
import Ciudadanos from './components/catalogos/Ciudadanos';
import Empleados from './components/catalogos/Empleados';
import Feedback from './components/feedback/Feedback';
// ===================== FIN IMPORTS INTEGRANTE 1 ==========================


// ===================== IMPORTS INTEGRANTE 2 ==============================
// import Tramites from './components/tramites/Tramites';
// import ModeloML from './components/tramites/ModeloML';
// ===================== FIN IMPORTS INTEGRANTE 2 ==========================


// ===================== IMPORTS INTEGRANTE 3 ==============================
import ConsultaTramite from './components/alertas/ConsultaTramite';
import Notificaciones from './components/alertas/Notificaciones';
import Convocatorias from './components/curriculos/Convocatorias';
import Postulantes from './components/curriculos/Postulantes';
// ===================== FIN IMPORTS INTEGRANTE 3 ==========================


function App() {

  const sesionGuardada = leerSesion();
  const [usuario, setUsuario] = useState(sesionGuardada ? sesionGuardada.usuario : null);
  const [vista, setVista] = useState("dashboard");
  const [portalCiudadano, setPortalCiudadano] = useState(false);

  const esAdmin = usuario && usuario.rol === "ADMINISTRADOR";

  // Si el servidor responde 401 (token vencido), se cierra la sesion
  useEffect(() => {
    const interceptor = Axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const esLogin = error.config && error.config.url && error.config.url.endsWith("/login");
        if (error.response && error.response.status === 401 && !esLogin) {
          borrarSesion();
          setUsuario(null);
          Swal.fire({ title: "Sesión vencida", text: "Vuelve a iniciar sesión para continuar.", icon: "info", confirmButtonColor: COLOR_SELLO });
        }
        return Promise.reject(error);
      }
    );
    return () => Axios.interceptors.response.eject(interceptor);
  }, []);

  // Al abrir la pagina se confirma que la sesion guardada siga vigente
  useEffect(() => {
    if (sesionGuardada) {
      Axios.get(`${API}/sesion`).catch(() => {
        borrarSesion();
        setUsuario(null);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iniciarSesion = (datosUsuario) => {
    setUsuario(datosUsuario);
    setVista("dashboard");
  }

  const cerrarSesion = () => {
    Swal.fire({
      title: "¿Cerrar sesión?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: COLOR_SELLO,
      cancelButtonColor: "#5b6678",
      confirmButtonText: "Sí, salir",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.post(`${API}/logout`).finally(() => {
          borrarSesion();
          setUsuario(null);
        });
      }
    });
  }

  const hoy = new Date().toLocaleDateString("es-PE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  // Dibuja un boton del menu lateral. soloAdmin = true lo oculta al TRABAJADOR
  const opcion = (id, icono, texto, soloAdmin) => {
    if (soloAdmin && !esAdmin) return null;
    return (
      <button
        type="button"
        className={vista === id ? "menu-item activo" : "menu-item"}
        aria-current={vista === id ? "page" : undefined}
        onClick={() => {
          setVista(id);
        }}>
        <i className={"bi " + icono}></i>
        <span>{texto}</span>
      </button>
    );
  };

  // ---------------------------------------------------------------
  // SIN SESION: portal del ciudadano o pantalla de login
  // ---------------------------------------------------------------
  if (!usuario) {
    if (portalCiudadano) {
      return (
        <div className="portal">
          <header className="portal-cabecera">
            <div className="marca">
              <div className="marca-sello" aria-hidden="true">MPY</div>
              <div className="marca-texto">
                <strong>Municipalidad Provincial de Yau</strong>
                <span>Consulta de expedientes</span>
              </div>
            </div>
            <button className="btn btn-info" onClick={() => { setPortalCiudadano(false); }}>
              <i className="bi bi-person-lock"></i>Ingreso del personal
            </button>
          </header>
          <main className="contenido portal-contenido">

            {/* ================= PORTAL INTEGRANTE 3 ======================== */}
            
            <ConsultaTramite />
            
            {/* ================= FIN PORTAL INTEGRANTE 3 ==================== */}

          </main>
        </div>
      );
    }
    return <Login onLogin={iniciarSesion} onConsultaPublica={() => { setPortalCiudadano(true); }} />;
  }

  // ---------------------------------------------------------------
  // CON SESION: sistema completo
  // ---------------------------------------------------------------
  return (
    <div className="app">

      <aside className="menu">
        <div className="marca">
          <div className="marca-sello" aria-hidden="true">MPY</div>
          <div className="marca-texto">
            <strong>Municipalidad Provincial de Yau</strong>
            <span>Sistema de trámites</span>
          </div>
        </div>

        <nav aria-label="Menú principal">

          {/* ================= MENU INTEGRANTE 1 (MASTER) ================= */}
          <p className="menu-grupo">General</p>
          {opcion("dashboard", "bi-speedometer2", "Panel de control")}
          <p className="menu-grupo">Catálogos</p>
          {opcion("areas", "bi-diagram-3", "Áreas", true)}
          {opcion("tipos", "bi-journal-text", "Tipos de trámite", true)}
          {opcion("ciudadanos", "bi-people", "Ciudadanos")}
          {opcion("empleados", "bi-person-badge", "Personal municipal", true)}
          {/* ================= FIN MENU INTEGRANTE 1 ====================== */}


          {/* ================= MENU INTEGRANTE 2 ========================== */}
          {/*
          <p className="menu-grupo">Gestión de trámites</p>
          {opcion("tramites", "bi-folder2-open", "Bandeja de expedientes")}
          {opcion("modelo", "bi-cpu", "Modelo de prioridad", true)}
          */}
          {/* ================= FIN MENU INTEGRANTE 2 ====================== */}


          {/* ================= MENU INTEGRANTE 3 ========================== */}
          
          <p className="menu-grupo">Atención al ciudadano</p>
          {opcion("consulta", "bi-search", "Consultar expediente")}
          {opcion("notificaciones", "bi-bell", "Alertas enviadas")}
          {esAdmin && <p className="menu-grupo">Selección de personal</p>}
          {opcion("convocatorias", "bi-megaphone", "Convocatorias", true)}
          {opcion("postulantes", "bi-file-earmark-person", "Evaluación de CV", true)}
          
          {/* ================= FIN MENU INTEGRANTE 3 ====================== */}


          {/* ================= MENU INTEGRANTE 1 (cierre) ================= */}
          <p className="menu-grupo">Mejora continua</p>
          {opcion("feedback", "bi-chat-square-heart", "Opiniones")}
          {esAdmin && <p className="menu-grupo">Seguridad</p>}
          {opcion("usuarios", "bi-person-lock", "Usuarios", true)}
        </nav>

        <div className="menu-pie">
          Trabajo final del curso<br />
          Taller de Desarrollo de Aplicaciones con Machine Learning
        </div>
      </aside>

      <main className="contenido">
        <div className="barra-superior">
          <span className="fecha"><i className="bi bi-calendar3"></i>{hoy}</span>
          <div className="sesion">
            <span className="sesion-avatar" aria-hidden="true">
              {usuario.nombre.split(" ").filter((p) => ["de", "del", "la", "las", "los", "y"].indexOf(p.toLowerCase()) === -1).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("")}
            </span>
            <span className="sesion-datos">
              <strong>{usuario.nombre}</strong>
              <span>{esAdmin ? "Administrador" : "Trabajador"}{usuario.cargo && usuario.cargo !== usuario.nombre ? ", " + usuario.cargo : ""}</span>
            </span>
            <button className="btn btn-info btn-sm" onClick={cerrarSesion}>
              <i className="bi bi-box-arrow-right"></i>Cerrar sesión
            </button>
          </div>
        </div>

        {/* ================= PANTALLAS INTEGRANTE 1 (MASTER) ============== */}
        {vista === "dashboard" && <Dashboard />}
        {vista === "areas" && esAdmin && <Areas />}
        {vista === "tipos" && esAdmin && <TiposTramite />}
        {vista === "ciudadanos" && <Ciudadanos />}
        {vista === "empleados" && esAdmin && <Empleados />}
        {vista === "feedback" && <Feedback />}
        {vista === "usuarios" && esAdmin && <Usuarios usuarioActual={usuario} />}
        {/* ================= FIN PANTALLAS INTEGRANTE 1 =================== */}


        {/* ================= PANTALLAS INTEGRANTE 2 ======================= */}
        {/*
        {vista === "tramites" && <Tramites />}
        {vista === "modelo" && esAdmin && <ModeloML />}
        */}
        {/* ================= FIN PANTALLAS INTEGRANTE 2 =================== */}


        {/* ================= PANTALLAS INTEGRANTE 3 ======================= */}
        
        {vista === "consulta" && <ConsultaTramite />}
        {vista === "notificaciones" && <Notificaciones />}
        {vista === "convocatorias" && esAdmin && <Convocatorias />}
        {vista === "postulantes" && esAdmin && <Postulantes />}
        
        {/* ================= FIN PANTALLAS INTEGRANTE 3 =================== */}
      </main>

    </div>
  );
}

export default App;
