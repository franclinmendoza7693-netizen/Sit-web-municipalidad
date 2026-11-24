-- =====================================================================
--  BASE DE DATOS : municipalidad_yau
--  PROYECTO      : Sistema automatizado de gestion documental (tramites)
--                  y seleccion de curriculos con Machine Learning
--  ENTIDAD       : Municipalidad Provincial de Yau
--  MOTOR         : MySQL / MariaDB (XAMPP)  -  Cotejamiento utf8mb4_general_ci
--  RESPONSABLE   : Integrante 1 (Master)
-- ---------------------------------------------------------------------
--  ORDEN DE CREACION (primero las tablas que NO dependen de otras):
--
--   BLOQUE A - CATALOGOS, PERSONAS Y USUARIOS
--     01. area                  (catalogo de areas / gerencias)
--     02. tipo_tramite          (FK area_id)
--     03. ciudadano             (personas que realizan tramites)
--     04. empleado              (personal municipal, FK area_id)
--     05. usuario               (cuentas de acceso al sistema, FK empleado_id)
--
--   BLOQUE B - GESTION DE TRAMITES
--     06. tramite               (FK ciudadano_id, tipo_tramite_id, empleado_id)
--     07. seguimiento_tramite   (FK tramite_id, empleado_id)
--
--   BLOQUE C - ALERTAS Y RETROALIMENTACION
--     08. notificacion          (FK tramite_id, ciudadano_id)
--     09. feedback              (FK tramite_id)
--
--   BLOQUE D - MACHINE LEARNING (PRIORIZACION)
--     10. historico_tramite     (dataset de entrenamiento, FK tipo_tramite_id)
--     11. modelo_ml             (historial de entrenamientos y metricas)
--
--   BLOQUE E - SELECCION DE CURRICULOS
--     12. convocatoria          (FK area_id)
--     13. postulante            (FK convocatoria_id)
--     14. evaluacion_curriculum (FK postulante_id)
--
--  CONVENCIONES (estandar del curso):
--   * Nombre de tabla en singular y minusculas.
--   * Llave primaria: id int(11) NOT NULL AUTO_INCREMENT.
--   * Llave foranea: <tabla>_id  (ej. area_id, ciudadano_id).
--   * Textos cortos varchar(100), correos varchar(150), textos largos text.
--   * Montos decimal(10,2), fechas date / datetime.
-- =====================================================================

DROP DATABASE IF EXISTS municipalidad_yau;
CREATE DATABASE municipalidad_yau CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE municipalidad_yau;
SET NAMES utf8mb4;

-- =====================================================================
-- BLOQUE A - CATALOGOS, PERSONAS Y USUARIOS
-- =====================================================================

-- ---------------------------------------------------------------------
-- 01. area : gerencias / oficinas de la municipalidad
-- ---------------------------------------------------------------------
CREATE TABLE area (
  id          int(11)      NOT NULL AUTO_INCREMENT,
  nombre      varchar(100) NOT NULL,
  sigla       varchar(10)  NOT NULL,
  descripcion varchar(255) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_area_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------
-- 02. tipo_tramite : procedimientos del TUPA con plazo y costo
-- ---------------------------------------------------------------------
CREATE TABLE tipo_tramite (
  id          int(11)       NOT NULL AUTO_INCREMENT,
  area_id     int(11)       NOT NULL,
  nombre      varchar(150)  NOT NULL,
  plazo_dias  int(11)       NOT NULL,
  costo       decimal(10,2) NOT NULL DEFAULT 0.00,
  requisitos  text          DEFAULT NULL,
  PRIMARY KEY (id),
  KEY fk_tipo_tramite_area (area_id),
  CONSTRAINT fk_tipo_tramite_area FOREIGN KEY (area_id) REFERENCES area (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------
-- 03. ciudadano : persona natural que realiza tramites
--     es_vulnerable = 1 -> adulto mayor, persona con discapacidad o gestante
-- ---------------------------------------------------------------------
CREATE TABLE ciudadano (
  id             int(11)      NOT NULL AUTO_INCREMENT,
  dni            varchar(8)   NOT NULL,
  nombres        varchar(100) NOT NULL,
  apellidos      varchar(100) NOT NULL,
  correo         varchar(150) DEFAULT NULL,
  telefono       varchar(15)  DEFAULT NULL,
  direccion      varchar(150) DEFAULT NULL,
  es_vulnerable  tinyint(1)   NOT NULL DEFAULT 0,
  fecha_registro datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ciudadano_dni (dni)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------
-- 04. empleado : personal municipal que atiende los tramites
-- ---------------------------------------------------------------------
CREATE TABLE empleado (
  id        int(11)      NOT NULL AUTO_INCREMENT,
  area_id   int(11)      NOT NULL,
  dni       varchar(8)   NOT NULL,
  nombres   varchar(100) NOT NULL,
  apellidos varchar(100) NOT NULL,
  cargo     varchar(100) NOT NULL,
  correo    varchar(150) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_empleado_dni (dni),
  KEY fk_empleado_area (area_id),
  CONSTRAINT fk_empleado_area FOREIGN KEY (area_id) REFERENCES area (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------
-- 05. usuario : cuentas para iniciar sesion (correo o usuario + contraseña)
--     rol      : ADMINISTRADOR | TRABAJADOR
--     password : guardada CIFRADA con scrypt -> "sal:hash" (nunca texto plano)
--     token    : sesion activa (expira a las 8 horas)
--     intentos_fallidos / bloqueado_hasta : bloqueo por 5 intentos fallidos
-- ---------------------------------------------------------------------
CREATE TABLE usuario (
  id                int(11)      NOT NULL AUTO_INCREMENT,
  empleado_id       int(11)      DEFAULT NULL,
  usuario           varchar(50)  NOT NULL,
  correo            varchar(150) NOT NULL,
  password          varchar(255) NOT NULL,
  rol               varchar(20)  NOT NULL DEFAULT 'TRABAJADOR',
  activo            tinyint(1)   NOT NULL DEFAULT 1,
  intentos_fallidos int(11)      NOT NULL DEFAULT 0,
  bloqueado_hasta   datetime     DEFAULT NULL,
  token             varchar(100) DEFAULT NULL,
  token_expira      datetime     DEFAULT NULL,
  ultimo_acceso     datetime     DEFAULT NULL,
  fecha_creacion    datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_usuario_usuario (usuario),
  UNIQUE KEY uk_usuario_correo (correo),
  UNIQUE KEY uk_usuario_empleado (empleado_id),
  KEY idx_usuario_token (token),
  CONSTRAINT fk_usuario_empleado FOREIGN KEY (empleado_id) REFERENCES empleado (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================================
-- BLOQUE B - GESTION DE TRAMITES
-- =====================================================================

-- ---------------------------------------------------------------------
-- 06. tramite : expediente presentado por un ciudadano
--     estado    : REGISTRADO | EN_REVISION | OBSERVADO | APROBADO | RECHAZADO | FINALIZADO
--     prioridad : ALTA | MEDIA | BAJA   (calculada por el modelo Naive Bayes)
--     canal     : PRESENCIAL | VIRTUAL
--     prioridad_manual = 1 -> el personal corrigio la prioridad (el ML no la sobrescribe)
-- ---------------------------------------------------------------------
CREATE TABLE tramite (
  id                   int(11)      NOT NULL AUTO_INCREMENT,
  codigo_expediente    varchar(20)  DEFAULT NULL,
  ciudadano_id         int(11)      NOT NULL,
  tipo_tramite_id      int(11)      NOT NULL,
  empleado_id          int(11)      DEFAULT NULL,
  asunto               varchar(200) NOT NULL,
  descripcion          text         DEFAULT NULL,
  folios               int(11)      NOT NULL DEFAULT 1,
  canal                varchar(20)  NOT NULL DEFAULT 'PRESENCIAL',
  documentos_completos tinyint(1)   NOT NULL DEFAULT 1,
  estado               varchar(20)  NOT NULL DEFAULT 'REGISTRADO',
  prioridad            varchar(10)  NOT NULL DEFAULT 'MEDIA',
  puntaje_prioridad    decimal(5,2) NOT NULL DEFAULT 0.00,
  prioridad_manual     tinyint(1)   NOT NULL DEFAULT 0,
  fecha_registro       datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_limite         date         DEFAULT NULL,
  fecha_actualizacion  datetime     DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_tramite_codigo (codigo_expediente),
  KEY fk_tramite_ciudadano (ciudadano_id),
  KEY fk_tramite_tipo (tipo_tramite_id),
  KEY fk_tramite_empleado (empleado_id),
  KEY idx_tramite_estado (estado),
  CONSTRAINT fk_tramite_ciudadano FOREIGN KEY (ciudadano_id) REFERENCES ciudadano (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tramite_tipo FOREIGN KEY (tipo_tramite_id) REFERENCES tipo_tramite (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tramite_empleado FOREIGN KEY (empleado_id) REFERENCES empleado (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------
-- 07. seguimiento_tramite : historial de cambios de estado (trazabilidad)
-- ---------------------------------------------------------------------
CREATE TABLE seguimiento_tramite (
  id              int(11)      NOT NULL AUTO_INCREMENT,
  tramite_id      int(11)      NOT NULL,
  empleado_id     int(11)      DEFAULT NULL,
  estado_anterior varchar(20)  DEFAULT NULL,
  estado_nuevo    varchar(20)  NOT NULL,
  observacion     varchar(255) DEFAULT NULL,
  fecha           datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY fk_seguimiento_tramite (tramite_id),
  KEY fk_seguimiento_empleado (empleado_id),
  CONSTRAINT fk_seguimiento_tramite FOREIGN KEY (tramite_id) REFERENCES tramite (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_seguimiento_empleado FOREIGN KEY (empleado_id) REFERENCES empleado (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================================
-- BLOQUE C - ALERTAS Y RETROALIMENTACION
-- =====================================================================

-- ---------------------------------------------------------------------
-- 08. notificacion : alertas enviadas al ciudadano sobre su tramite
--     canal : SISTEMA | CORREO | SMS
-- ---------------------------------------------------------------------
CREATE TABLE notificacion (
  id           int(11)      NOT NULL AUTO_INCREMENT,
  tramite_id   int(11)      NOT NULL,
  ciudadano_id int(11)      NOT NULL,
  titulo       varchar(100) NOT NULL,
  mensaje      varchar(255) NOT NULL,
  canal        varchar(20)  NOT NULL DEFAULT 'SISTEMA',
  leido        tinyint(1)   NOT NULL DEFAULT 0,
  fecha_envio  datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY fk_notificacion_tramite (tramite_id),
  KEY fk_notificacion_ciudadano (ciudadano_id),
  CONSTRAINT fk_notificacion_tramite FOREIGN KEY (tramite_id) REFERENCES tramite (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_notificacion_ciudadano FOREIGN KEY (ciudadano_id) REFERENCES ciudadano (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------
-- 09. feedback : opinion del ciudadano o del personal (mejora continua)
--     tipo_usuario : CIUDADANO | PERSONAL     calificacion : 1 a 5
-- ---------------------------------------------------------------------
CREATE TABLE feedback (
  id           int(11)      NOT NULL AUTO_INCREMENT,
  tramite_id   int(11)      DEFAULT NULL,
  tipo_usuario varchar(20)  NOT NULL,
  nombre       varchar(100) NOT NULL,
  calificacion int(11)      NOT NULL,
  comentario   text         DEFAULT NULL,
  fecha        datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY fk_feedback_tramite (tramite_id),
  CONSTRAINT fk_feedback_tramite FOREIGN KEY (tramite_id) REFERENCES tramite (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_feedback_calificacion CHECK (calificacion BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================================
-- BLOQUE D - MACHINE LEARNING (PRIORIZACION DE TRAMITES)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 10. historico_tramite : dataset historico etiquetado para entrenar
--     situacion_plazo : A_TIEMPO | POR_VENCER | VENCIDO
--     prioridad_real  : ALTA | MEDIA | BAJA  (etiqueta asignada por expertos)
-- ---------------------------------------------------------------------
CREATE TABLE historico_tramite (
  id                   int(11)     NOT NULL AUTO_INCREMENT,
  tipo_tramite_id      int(11)     NOT NULL,
  canal                varchar(20) NOT NULL,
  es_vulnerable        tinyint(1)  NOT NULL,
  documentos_completos tinyint(1)  NOT NULL,
  situacion_plazo      varchar(20) NOT NULL,
  prioridad_real       varchar(10) NOT NULL,
  PRIMARY KEY (id),
  KEY fk_historico_tipo (tipo_tramite_id),
  CONSTRAINT fk_historico_tipo FOREIGN KEY (tipo_tramite_id) REFERENCES tipo_tramite (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------
-- 11. modelo_ml : cada entrenamiento guarda sus metricas
-- ---------------------------------------------------------------------
CREATE TABLE modelo_ml (
  id                  int(11)      NOT NULL AUTO_INCREMENT,
  nombre              varchar(100) NOT NULL,
  algoritmo           varchar(100) NOT NULL,
  total_registros     int(11)      NOT NULL,
  registros_prueba    int(11)      NOT NULL,
  accuracy            decimal(5,2) NOT NULL,
  precision_macro     decimal(5,2) NOT NULL,
  recall_macro        decimal(5,2) NOT NULL,
  f1_macro            decimal(5,2) NOT NULL,
  fecha_entrenamiento datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================================
-- BLOQUE E - SELECCION DE CURRICULOS
-- =====================================================================

-- ---------------------------------------------------------------------
-- 12. convocatoria : proceso de seleccion de personal (CAS)
--     estado : ABIERTA | CERRADA
-- ---------------------------------------------------------------------
CREATE TABLE convocatoria (
  id                 int(11)      NOT NULL AUTO_INCREMENT,
  area_id            int(11)      NOT NULL,
  codigo             varchar(20)  NOT NULL,
  titulo             varchar(150) NOT NULL,
  perfil_requerido   text         NOT NULL,
  experiencia_minima int(11)      NOT NULL DEFAULT 0,
  vacantes           int(11)      NOT NULL DEFAULT 1,
  fecha_inicio       date         NOT NULL,
  fecha_fin          date         NOT NULL,
  estado             varchar(20)  NOT NULL DEFAULT 'ABIERTA',
  PRIMARY KEY (id),
  UNIQUE KEY uk_convocatoria_codigo (codigo),
  KEY fk_convocatoria_area (area_id),
  CONSTRAINT fk_convocatoria_area FOREIGN KEY (area_id) REFERENCES area (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------
-- 13. postulante : persona que postula a una convocatoria con su CV
--     grado_academico : SECUNDARIA | TECNICO | BACHILLER | TITULADO | MAESTRIA
-- ---------------------------------------------------------------------
CREATE TABLE postulante (
  id                int(11)      NOT NULL AUTO_INCREMENT,
  convocatoria_id   int(11)      NOT NULL,
  dni               varchar(8)   NOT NULL,
  nombres           varchar(100) NOT NULL,
  apellidos         varchar(100) NOT NULL,
  correo            varchar(150) DEFAULT NULL,
  telefono          varchar(15)  DEFAULT NULL,
  grado_academico   varchar(20)  NOT NULL,
  anios_experiencia int(11)      NOT NULL DEFAULT 0,
  curriculum_texto  text         NOT NULL,
  fecha_postulacion datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_postulante_convocatoria_dni (convocatoria_id, dni),
  CONSTRAINT fk_postulante_convocatoria FOREIGN KEY (convocatoria_id) REFERENCES convocatoria (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------
-- 14. evaluacion_curriculum : resultado del modelo TF-IDF + similitud coseno
--     resultado : APTO | NO APTO
-- ---------------------------------------------------------------------
CREATE TABLE evaluacion_curriculum (
  id                    int(11)      NOT NULL AUTO_INCREMENT,
  postulante_id         int(11)      NOT NULL,
  puntaje_similitud     decimal(5,2) NOT NULL,
  puntaje_experiencia   decimal(5,2) NOT NULL,
  puntaje_grado         decimal(5,2) NOT NULL,
  puntaje_total         decimal(5,2) NOT NULL,
  resultado             varchar(10)  NOT NULL,
  palabras_coincidentes varchar(255) DEFAULT NULL,
  fecha_evaluacion      datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_evaluacion_postulante (postulante_id),
  CONSTRAINT fk_evaluacion_postulante FOREIGN KEY (postulante_id) REFERENCES postulante (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- #####################################################################
--  DATOS DE PRUEBA (respetando el mismo orden de las tablas)
-- #####################################################################

-- 01. area
INSERT INTO area (id, nombre, sigla, descripcion) VALUES
(1, 'Trámite Documentario y Archivo', 'TDA', 'Mesa de partes, recepción y derivación de expedientes'),
(2, 'Administración Tributaria', 'GAT', 'Impuesto predial, arbitrios, fraccionamientos y reclamos'),
(3, 'Desarrollo Urbano', 'GDU', 'Licencias de edificación, parámetros y posesión'),
(4, 'Registro Civil', 'RC', 'Partidas, matrimonios y actas'),
(5, 'Licencias y Comercialización', 'GLC', 'Licencias de funcionamiento y autorizaciones'),
(6, 'Defensa Civil', 'GDC', 'Inspecciones técnicas de seguridad en edificaciones'),
(7, 'Recursos Humanos', 'RRHH', 'Selección de personal y convocatorias CAS'),
(8, 'Desarrollo Social', 'GDS', 'Programas sociales y empadronamiento');

-- 02. tipo_tramite
INSERT INTO tipo_tramite (id, area_id, nombre, plazo_dias, costo, requisitos) VALUES
(1, 5, 'Licencia de funcionamiento', 15, 180.50, 'Solicitud con declaración jurada, copia de DNI, vigencia de poder (si es persona jurídica)'),
(2, 6, 'Inspección técnica de seguridad (ITSE)', 9, 210.00, 'Solicitud, plano de ubicación, plan de seguridad'),
(3, 3, 'Licencia de edificación', 25, 350.00, 'FUE, copia literal de dominio, planos firmados por profesional'),
(4, 3, 'Certificado de parámetros urbanísticos', 5, 85.00, 'Solicitud y plano de ubicación'),
(5, 4, 'Copia certificada de partida de nacimiento', 1, 12.00, 'DNI del solicitante y numero de acta'),
(6, 4, 'Matrimonio civil', 30, 150.00, 'Partidas de nacimiento, DNI, certificado médico, declaración de testigos'),
(7, 2, 'Fraccionamiento de deuda tributaria', 10, 0.00, 'Solicitud, DNI y pago de cuota inicial'),
(8, 2, 'Reclamo tributario', 30, 0.00, 'Escrito fundamentado, DNI y pruebas'),
(9, 1, 'Acceso a la información pública (Ley 27806)', 10, 0.00, 'Formato de solicitud con datos del solicitante'),
(10, 8, 'Empadronamiento en programa social', 7, 0.00, 'DNI, ficha socioeconómica y recibo de servicio'),
(11, 2, 'Constancia de no adeudo', 3, 15.00, 'DNI y código de contribuyente'),
(12, 3, 'Certificado de posesión', 20, 95.00, 'Declaración jurada, constancia de vecinos y plano');

-- 03. ciudadano  (datos ficticios)
INSERT INTO ciudadano (id, dni, nombres, apellidos, correo, telefono, direccion, es_vulnerable) VALUES
(1, '45871236', 'María Elena', 'Quispe Huamán', 'maria.quispe@correo.com', '987654321', 'Jr. Los Andes 245', 0),
(2, '10234587', 'Juan Carlos', 'Mamani Torres', 'juan.mamani@correo.com', '965874123', 'Av. Principal 1020', 1),
(3, '72589634', 'Rosa Angélica', 'Flores Condori', 'rosa.flores@correo.com', '912345678', 'Calle Lima 330', 0),
(4, '08765432', 'Pedro Pablo', 'Huamán Ccori', 'pedro.huaman@correo.com', '956321478', 'Jr. Ayacucho 118', 1),
(5, '46598712', 'Lucía Fernanda', 'Rojas Paredes', 'lucia.rojas@correo.com', '978451236', 'Av. Los Incas 560', 0),
(6, '70123456', 'Carlos Alberto', 'Ramos Vilca', 'carlos.ramos@correo.com', '945612378', 'Pasaje Sol 12', 0),
(7, '09871234', 'Teodora', 'Ccahuana Puma', 'teodora.ccahuana@correo.com', '932145698', 'Comunidad San Juan s/n', 1),
(8, '48712596', 'Miguel Angel', 'Vargas Soto', 'miguel.vargas@correo.com', '921478563', 'Jr. Grau 455', 0);

-- 04. empleado
INSERT INTO empleado (id, area_id, dni, nombres, apellidos, cargo, correo) VALUES
(1, 1, '41236587', 'Ana Lucía', 'Paredes Rios', 'Jefa de Mesa de Partes', 'aparedes@muniyau.gob.pe'),
(2, 2, '42365874', 'Jorge Luis', 'Salazar Cruz', 'Especialista Tributario', 'jsalazar@muniyau.gob.pe'),
(3, 3, '43658741', 'Karina', 'Medina López', 'Arquitecta Revisora', 'kmedina@muniyau.gob.pe'),
(4, 4, '44587123', 'Rubén Darío', 'Chavez Nina', 'Registrador Civil', 'rchavez@muniyau.gob.pe'),
(5, 5, '45123698', 'Silvia', 'Torres Aguilar', 'Especialista en Licencias', 'storres@muniyau.gob.pe'),
(6, 6, '46321587', 'Héctor', 'Quispe Lazo', 'Inspector ITSE', 'hquispe@muniyau.gob.pe'),
(7, 7, '47852136', 'Patricia', 'Gómez Inca', 'Analista de Recursos Humanos', 'pgomez@muniyau.gob.pe'),
(8, 8, '40125896', 'Luis Alberto', 'Apaza Ticona', 'Promotor Social', 'lapaza@muniyau.gob.pe');

-- 05. usuario   (contraseñas de prueba -> admin: Admin2026!   trabajadores: Yau2026!)
INSERT INTO usuario (id, empleado_id, usuario, correo, password, rol) VALUES
(1, NULL, 'admin', 'admin@muniyau.gob.pe', '6aca48345a5e17c935c3851ae7492afa:ee819a60dcdaf7ea6dd62ea4a7dbe13c43c55d1d171bc9b2b31e971700bb53ea84fb9089cab69eb32d324bd4daffddedd9179d3b28ecebc41cf8a1fe153afb57', 'ADMINISTRADOR'),
(2, 1, 'aparedes', 'aparedes@muniyau.gob.pe', '616abec3d03b9de9d1fc2b206410a046:8001cf71a003f926ea2a514e3f3ef714cf41805e59a88c3dee2906596e89e4e498f81e6161af41b860bbfe6434778ace833bf1ec23b585db3cb17c857018d011', 'TRABAJADOR'),
(3, 2, 'jsalazar', 'jsalazar@muniyau.gob.pe', '1ecc16d4efe729d5e0df291decc4e30e:b60c7e4b7e58499971b67d87a7729d27df0efdbb9fea7da3136844b900f52215a062641802c8946a64e50ecd2c75f1e48b622f8aabac153b762491a31bb4766e', 'TRABAJADOR'),
(4, 7, 'pgomez', 'pgomez@muniyau.gob.pe', '582fc86f5d026325320914aa3f6dee01:fb64730cda5194d022bdaf0a5bc36dbbedf0c6a4cbb37800d5f5e1b39293857db23bedf05be6d0d16ba0a73e8dad9ebf819877305302f2a5591f2b3171ecd8b6', 'ADMINISTRADOR');

-- 06. tramite  (fechas relativas a la fecha de importacion para que el ejemplo siempre tenga sentido)
INSERT INTO tramite (id, codigo_expediente, ciudadano_id, tipo_tramite_id, empleado_id, asunto, descripcion, folios, canal, documentos_completos, estado, prioridad, puntaje_prioridad, fecha_registro, fecha_limite, fecha_actualizacion) VALUES
(1, 'EXP-2026-000001', 1, 1, 5, 'Licencia para bodega Santa Rosa', 'Apertura de bodega de abarrotes en Jr. Los Andes', 12, 'PRESENCIAL', 1, 'EN_REVISION', 'ALTA', 81.40, NOW() - INTERVAL 10 DAY, CURDATE() + INTERVAL 5 DAY, NOW() - INTERVAL 6 DAY),
(2, 'EXP-2026-000002', 2, 10, 8, 'Inscripción al programa Vaso de Leche', 'Adulto mayor solicita empadronamiento', 4, 'PRESENCIAL', 1, 'REGISTRADO', 'ALTA', 90.08, NOW() - INTERVAL 6 DAY, CURDATE() + INTERVAL 1 DAY, NULL),
(3, 'EXP-2026-000003', 3, 5, 4, 'Copia certificada de partida', 'Para trámite de pasaporte', 1, 'VIRTUAL', 1, 'FINALIZADO', 'MEDIA', 60.00, NOW() - INTERVAL 20 DAY, CURDATE() - INTERVAL 19 DAY, NOW() - INTERVAL 19 DAY),
(4, 'EXP-2026-000004', 4, 2, 6, 'ITSE para taller de carpinteria', 'Inspección de riesgo medio', 8, 'PRESENCIAL', 0, 'OBSERVADO', 'ALTA', 86.62, NOW() - INTERVAL 12 DAY, CURDATE() - INTERVAL 3 DAY, NOW() - INTERVAL 4 DAY),
(5, 'EXP-2026-000005', 5, 3, 3, 'Licencia de edificación vivienda', 'Construcción de vivienda de 2 pisos', 35, 'PRESENCIAL', 1, 'EN_REVISION', 'BAJA', 25.15, NOW() - INTERVAL 5 DAY, CURDATE() + INTERVAL 20 DAY, NOW() - INTERVAL 2 DAY),
(6, 'EXP-2026-000006', 6, 9, 1, 'Solicitud de presupuesto ejecutado 2025', 'Pedido de información pública', 2, 'VIRTUAL', 1, 'REGISTRADO', 'MEDIA', 64.23, NOW() - INTERVAL 8 DAY, CURDATE() + INTERVAL 2 DAY, NULL),
(7, 'EXP-2026-000007', 7, 7, 2, 'Fraccionamiento de impuesto predial', 'Deuda de 3 años', 3, 'PRESENCIAL', 1, 'APROBADO', 'MEDIA', 64.00, NOW() - INTERVAL 15 DAY, CURDATE() - INTERVAL 5 DAY, NOW() - INTERVAL 7 DAY),
(8, 'EXP-2026-000008', 8, 11, 2, 'Constancia de no adeudo', 'Para venta de inmueble', 1, 'VIRTUAL', 1, 'REGISTRADO', 'BAJA', 25.39, NOW() - INTERVAL 1 DAY, CURDATE() + INTERVAL 2 DAY, NULL),
(9, 'EXP-2026-000009', 1, 4, 3, 'Parámetros urbanísticos lote 15', 'Consulta para proyecto de vivienda', 2, 'VIRTUAL', 1, 'EN_REVISION', 'MEDIA', 55.18, NOW() - INTERVAL 4 DAY, CURDATE() + INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY),
(10, 'EXP-2026-000010', 4, 8, 2, 'Reclamo por cobro de arbitrios', 'Cobro duplicado de arbitrios 2026', 6, 'PRESENCIAL', 0, 'REGISTRADO', 'MEDIA', 37.30, NOW() - INTERVAL 3 DAY, CURDATE() + INTERVAL 27 DAY, NULL);

-- 07. seguimiento_tramite
INSERT INTO seguimiento_tramite (tramite_id, empleado_id, estado_anterior, estado_nuevo, observacion, fecha) VALUES
(1, 1, NULL, 'REGISTRADO', 'Expediente recibido en mesa de partes', NOW() - INTERVAL 10 DAY),
(1, 5, 'REGISTRADO', 'EN_REVISION', 'Derivado a Licencias para evaluación', NOW() - INTERVAL 6 DAY),
(2, 1, NULL, 'REGISTRADO', 'Expediente recibido en mesa de partes', NOW() - INTERVAL 6 DAY),
(3, 1, NULL, 'REGISTRADO', 'Solicitud virtual recibida', NOW() - INTERVAL 20 DAY),
(3, 4, 'REGISTRADO', 'FINALIZADO', 'Copia certificada entregada', NOW() - INTERVAL 19 DAY),
(4, 1, NULL, 'REGISTRADO', 'Expediente recibido en mesa de partes', NOW() - INTERVAL 12 DAY),
(4, 6, 'REGISTRADO', 'OBSERVADO', 'Falta plan de seguridad firmado', NOW() - INTERVAL 4 DAY),
(5, 1, NULL, 'REGISTRADO', 'Expediente recibido en mesa de partes', NOW() - INTERVAL 5 DAY),
(5, 3, 'REGISTRADO', 'EN_REVISION', 'En revisión de planos', NOW() - INTERVAL 2 DAY),
(6, 1, NULL, 'REGISTRADO', 'Solicitud virtual recibida', NOW() - INTERVAL 8 DAY),
(7, 1, NULL, 'REGISTRADO', 'Expediente recibido en mesa de partes', NOW() - INTERVAL 15 DAY),
(7, 2, 'REGISTRADO', 'APROBADO', 'Fraccionamiento aprobado en 6 cuotas', NOW() - INTERVAL 7 DAY),
(8, 1, NULL, 'REGISTRADO', 'Solicitud virtual recibida', NOW() - INTERVAL 1 DAY),
(9, 1, NULL, 'REGISTRADO', 'Solicitud virtual recibida', NOW() - INTERVAL 4 DAY),
(9, 3, 'REGISTRADO', 'EN_REVISION', 'En evaluación técnica', NOW() - INTERVAL 1 DAY),
(10, 1, NULL, 'REGISTRADO', 'Expediente recibido en mesa de partes', NOW() - INTERVAL 3 DAY);

-- 08. notificacion
INSERT INTO notificacion (tramite_id, ciudadano_id, titulo, mensaje, canal, leido, fecha_envio) VALUES
(1, 1, 'Trámite registrado', 'Su expediente EXP-2026-000001 fue registrado correctamente.', 'SISTEMA', 1, NOW() - INTERVAL 10 DAY),
(1, 1, 'Trámite en revisión', 'Su expediente EXP-2026-000001 pasó a revisión.', 'CORREO', 0, NOW() - INTERVAL 6 DAY),
(2, 2, 'Trámite registrado', 'Su expediente EXP-2026-000002 fue registrado correctamente.', 'SMS', 0, NOW() - INTERVAL 6 DAY),
(3, 3, 'Trámite finalizado', 'Su expediente EXP-2026-000003 fue finalizado. Puede recoger su documento.', 'CORREO', 1, NOW() - INTERVAL 19 DAY),
(4, 4, 'Trámite observado', 'Su expediente EXP-2026-000004 fue observado: falta el plan de seguridad firmado. Subsane para continuar.', 'SMS', 0, NOW() - INTERVAL 4 DAY),
(7, 7, 'Trámite aprobado', 'Su expediente EXP-2026-000007 fue aprobado.', 'SMS', 0, NOW() - INTERVAL 7 DAY);

-- 09. feedback
INSERT INTO feedback (tramite_id, tipo_usuario, nombre, calificacion, comentario, fecha) VALUES
(3, 'CIUDADANO', 'Rosa Flores', 5, 'Muy rápido, recibí la notificación por correo.', NOW() - INTERVAL 18 DAY),
(7, 'CIUDADANO', 'Teodora Ccahuana', 4, 'Me avisaron por SMS, pero tuve que venir dos veces.', NOW() - INTERVAL 6 DAY),
(4, 'CIUDADANO', 'Pedro Huamán', 2, 'No sabía qué requisito faltaba hasta que me observaron.', NOW() - INTERVAL 3 DAY),
(NULL, 'PERSONAL', 'Ana Paredes', 4, 'La prioridad automática ayuda a ordenar la bandeja del día.', NOW() - INTERVAL 2 DAY),
(NULL, 'PERSONAL', 'Jorge Salazar', 3, 'Falta capacitación para usar el panel de métricas.', NOW() - INTERVAL 1 DAY);

-- 10. historico_tramite  (dataset para entrenar el modelo Naive Bayes)
INSERT INTO historico_tramite (tipo_tramite_id, canal, es_vulnerable, documentos_completos, situacion_plazo, prioridad_real) VALUES
(2, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(4, 'VIRTUAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(8, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(2, 'PRESENCIAL', 1, 0, 'A_TIEMPO', 'MEDIA'),
(7, 'PRESENCIAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(12, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(5, 'PRESENCIAL', 1, 1, 'POR_VENCER', 'ALTA'),
(12, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(8, 'PRESENCIAL', 0, 0, 'VENCIDO', 'MEDIA'),
(7, 'VIRTUAL', 0, 1, 'VENCIDO', 'ALTA'),
(9, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(9, 'VIRTUAL', 1, 1, 'A_TIEMPO', 'ALTA'),
(4, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(9, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(9, 'VIRTUAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(5, 'PRESENCIAL', 1, 1, 'POR_VENCER', 'ALTA'),
(9, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'ALTA'),
(8, 'PRESENCIAL', 0, 0, 'VENCIDO', 'MEDIA'),
(2, 'PRESENCIAL', 0, 0, 'POR_VENCER', 'MEDIA'),
(3, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(8, 'PRESENCIAL', 1, 1, 'A_TIEMPO', 'MEDIA'),
(1, 'PRESENCIAL', 1, 1, 'VENCIDO', 'ALTA'),
(4, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(11, 'PRESENCIAL', 1, 1, 'POR_VENCER', 'ALTA'),
(8, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(10, 'VIRTUAL', 0, 1, 'POR_VENCER', 'ALTA'),
(10, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(7, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(11, 'PRESENCIAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(11, 'PRESENCIAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(10, 'PRESENCIAL', 1, 1, 'A_TIEMPO', 'ALTA'),
(10, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(3, 'PRESENCIAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(11, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(4, 'VIRTUAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(5, 'PRESENCIAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(3, 'PRESENCIAL', 0, 0, 'VENCIDO', 'MEDIA'),
(3, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(5, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(11, 'PRESENCIAL', 0, 0, 'VENCIDO', 'MEDIA'),
(1, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(4, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(10, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(2, 'PRESENCIAL', 1, 1, 'POR_VENCER', 'ALTA'),
(3, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(5, 'PRESENCIAL', 1, 1, 'A_TIEMPO', 'ALTA'),
(5, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(2, 'VIRTUAL', 0, 0, 'VENCIDO', 'MEDIA'),
(8, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(10, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'ALTA'),
(6, 'VIRTUAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(6, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(5, 'VIRTUAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(6, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(12, 'PRESENCIAL', 1, 1, 'A_TIEMPO', 'MEDIA'),
(10, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(7, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(3, 'VIRTUAL', 1, 1, 'POR_VENCER', 'ALTA'),
(5, 'PRESENCIAL', 1, 1, 'POR_VENCER', 'ALTA'),
(6, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(11, 'VIRTUAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(1, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'ALTA'),
(11, 'VIRTUAL', 0, 0, 'VENCIDO', 'MEDIA'),
(6, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(8, 'VIRTUAL', 0, 0, 'VENCIDO', 'MEDIA'),
(5, 'PRESENCIAL', 1, 1, 'A_TIEMPO', 'MEDIA'),
(9, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(9, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(9, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(7, 'VIRTUAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(9, 'PRESENCIAL', 1, 1, 'A_TIEMPO', 'ALTA'),
(1, 'VIRTUAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(9, 'PRESENCIAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(1, 'VIRTUAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(9, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(1, 'PRESENCIAL', 0, 0, 'POR_VENCER', 'MEDIA'),
(2, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'ALTA'),
(2, 'PRESENCIAL', 0, 0, 'POR_VENCER', 'MEDIA'),
(10, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(9, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(2, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(11, 'PRESENCIAL', 1, 1, 'POR_VENCER', 'ALTA'),
(12, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(4, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(10, 'PRESENCIAL', 1, 1, 'POR_VENCER', 'ALTA'),
(7, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(5, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(2, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(6, 'VIRTUAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(11, 'VIRTUAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(6, 'VIRTUAL', 0, 0, 'POR_VENCER', 'BAJA'),
(12, 'PRESENCIAL', 1, 1, 'POR_VENCER', 'ALTA'),
(8, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(5, 'PRESENCIAL', 1, 1, 'A_TIEMPO', 'ALTA'),
(11, 'PRESENCIAL', 1, 1, 'POR_VENCER', 'ALTA'),
(3, 'PRESENCIAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(12, 'PRESENCIAL', 1, 1, 'POR_VENCER', 'ALTA'),
(3, 'PRESENCIAL', 1, 0, 'A_TIEMPO', 'BAJA'),
(9, 'PRESENCIAL', 0, 0, 'POR_VENCER', 'MEDIA'),
(6, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(1, 'VIRTUAL', 0, 1, 'VENCIDO', 'ALTA'),
(8, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(10, 'PRESENCIAL', 0, 0, 'POR_VENCER', 'MEDIA'),
(9, 'VIRTUAL', 0, 0, 'VENCIDO', 'MEDIA'),
(9, 'VIRTUAL', 0, 1, 'POR_VENCER', 'ALTA'),
(2, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(9, 'VIRTUAL', 0, 1, 'VENCIDO', 'ALTA'),
(1, 'PRESENCIAL', 1, 1, 'VENCIDO', 'ALTA'),
(4, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(6, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(3, 'VIRTUAL', 0, 0, 'POR_VENCER', 'BAJA'),
(11, 'VIRTUAL', 1, 1, 'A_TIEMPO', 'MEDIA'),
(3, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(3, 'VIRTUAL', 1, 1, 'A_TIEMPO', 'MEDIA'),
(8, 'VIRTUAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(2, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(9, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(12, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(2, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(11, 'PRESENCIAL', 1, 1, 'VENCIDO', 'ALTA'),
(7, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(8, 'VIRTUAL', 0, 1, 'VENCIDO', 'ALTA'),
(2, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'ALTA'),
(4, 'VIRTUAL', 0, 0, 'VENCIDO', 'MEDIA'),
(9, 'PRESENCIAL', 0, 0, 'POR_VENCER', 'MEDIA'),
(6, 'PRESENCIAL', 1, 1, 'VENCIDO', 'ALTA'),
(8, 'PRESENCIAL', 1, 1, 'A_TIEMPO', 'MEDIA'),
(7, 'VIRTUAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(5, 'VIRTUAL', 1, 1, 'POR_VENCER', 'ALTA'),
(9, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(8, 'VIRTUAL', 1, 0, 'VENCIDO', 'ALTA'),
(10, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(2, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(2, 'VIRTUAL', 0, 1, 'VENCIDO', 'ALTA'),
(3, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(4, 'PRESENCIAL', 1, 0, 'A_TIEMPO', 'ALTA'),
(10, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'ALTA'),
(8, 'VIRTUAL', 1, 0, 'A_TIEMPO', 'MEDIA'),
(3, 'PRESENCIAL', 1, 1, 'A_TIEMPO', 'MEDIA'),
(12, 'VIRTUAL', 1, 1, 'POR_VENCER', 'ALTA'),
(2, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(7, 'PRESENCIAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(4, 'PRESENCIAL', 1, 1, 'A_TIEMPO', 'MEDIA'),
(6, 'PRESENCIAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(11, 'VIRTUAL', 0, 0, 'POR_VENCER', 'BAJA'),
(8, 'VIRTUAL', 0, 1, 'VENCIDO', 'ALTA'),
(4, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(2, 'PRESENCIAL', 1, 1, 'POR_VENCER', 'ALTA'),
(5, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(10, 'VIRTUAL', 1, 0, 'POR_VENCER', 'ALTA'),
(7, 'PRESENCIAL', 1, 1, 'A_TIEMPO', 'MEDIA'),
(8, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(6, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(2, 'VIRTUAL', 0, 0, 'POR_VENCER', 'MEDIA'),
(4, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(9, 'PRESENCIAL', 1, 0, 'A_TIEMPO', 'MEDIA'),
(11, 'PRESENCIAL', 0, 1, 'VENCIDO', 'BAJA'),
(10, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(5, 'VIRTUAL', 0, 1, 'POR_VENCER', 'ALTA'),
(9, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'ALTA'),
(10, 'PRESENCIAL', 1, 1, 'VENCIDO', 'ALTA'),
(9, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(3, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(7, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(6, 'PRESENCIAL', 0, 0, 'VENCIDO', 'MEDIA'),
(8, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(8, 'PRESENCIAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(4, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(4, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(10, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'ALTA'),
(9, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(4, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(3, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(11, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(9, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'ALTA'),
(9, 'PRESENCIAL', 0, 0, 'POR_VENCER', 'MEDIA'),
(6, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(6, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(1, 'PRESENCIAL', 1, 1, 'POR_VENCER', 'ALTA'),
(3, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(2, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(11, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(6, 'VIRTUAL', 1, 1, 'A_TIEMPO', 'MEDIA'),
(4, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'ALTA'),
(3, 'PRESENCIAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(7, 'PRESENCIAL', 1, 1, 'A_TIEMPO', 'MEDIA'),
(8, 'PRESENCIAL', 1, 1, 'POR_VENCER', 'ALTA'),
(7, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(7, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(5, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(2, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'ALTA'),
(7, 'VIRTUAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(3, 'VIRTUAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(5, 'PRESENCIAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(12, 'VIRTUAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(5, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(6, 'VIRTUAL', 0, 0, 'POR_VENCER', 'BAJA'),
(7, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(6, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(1, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(6, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(9, 'PRESENCIAL', 1, 1, 'A_TIEMPO', 'ALTA'),
(12, 'PRESENCIAL', 1, 1, 'A_TIEMPO', 'MEDIA'),
(12, 'PRESENCIAL', 0, 0, 'POR_VENCER', 'BAJA'),
(10, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(7, 'PRESENCIAL', 1, 0, 'VENCIDO', 'ALTA'),
(2, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(9, 'VIRTUAL', 1, 1, 'A_TIEMPO', 'ALTA'),
(9, 'VIRTUAL', 0, 1, 'VENCIDO', 'ALTA'),
(3, 'PRESENCIAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(1, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(11, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(7, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(6, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(8, 'PRESENCIAL', 1, 1, 'A_TIEMPO', 'MEDIA'),
(6, 'VIRTUAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(2, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'ALTA'),
(8, 'VIRTUAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(9, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'ALTA'),
(4, 'PRESENCIAL', 0, 0, 'A_TIEMPO', 'BAJA'),
(10, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(9, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(1, 'PRESENCIAL', 1, 1, 'VENCIDO', 'ALTA'),
(12, 'PRESENCIAL', 1, 1, 'VENCIDO', 'ALTA'),
(2, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(1, 'PRESENCIAL', 0, 1, 'VENCIDO', 'ALTA'),
(9, 'PRESENCIAL', 1, 1, 'A_TIEMPO', 'ALTA'),
(2, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(12, 'VIRTUAL', 1, 1, 'POR_VENCER', 'ALTA'),
(11, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(4, 'VIRTUAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(9, 'PRESENCIAL', 0, 0, 'POR_VENCER', 'MEDIA'),
(11, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(7, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'BAJA'),
(2, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(11, 'PRESENCIAL', 1, 1, 'POR_VENCER', 'ALTA'),
(7, 'VIRTUAL', 1, 1, 'POR_VENCER', 'ALTA'),
(7, 'PRESENCIAL', 0, 1, 'A_TIEMPO', 'MEDIA'),
(6, 'PRESENCIAL', 0, 1, 'POR_VENCER', 'MEDIA'),
(8, 'PRESENCIAL', 0, 0, 'A_TIEMPO', 'BAJA');

-- 11. modelo_ml : se llena automaticamente al entrenar desde el sistema

-- 12. convocatoria
INSERT INTO convocatoria (id, area_id, codigo, titulo, perfil_requerido, experiencia_minima, vacantes, fecha_inicio, fecha_fin, estado) VALUES
(1, 7, 'CAS-001-2026', 'Asistente de Trámite Documentario',
 'Técnico o bachiller en administración, secretariado o computación. Experiencia en mesa de partes, trámite documentario, archivo y atención al ciudadano. Manejo de Office, Excel, sistemas de gestión documental y redacción de documentos. Conocimiento de la Ley 27444 de procedimiento administrativo general.',
 1, 2, CURDATE() - INTERVAL 5 DAY, CURDATE() + INTERVAL 10 DAY, 'ABIERTA'),
(2, 7, 'CAS-002-2026', 'Analista de Datos para Machine Learning',
 'Bachiller o titulado en ingeniería de sistemas, informática o estadística. Experiencia en análisis de datos, Python, SQL, MySQL, machine learning, modelos predictivos y visualización con Power BI. Deseable experiencia en sector público y desarrollo de aplicaciones web con React y Node.',
 2, 1, CURDATE() - INTERVAL 3 DAY, CURDATE() + INTERVAL 12 DAY, 'ABIERTA');

-- 13. postulante
INSERT INTO postulante (convocatoria_id, dni, nombres, apellidos, correo, telefono, grado_academico, anios_experiencia, curriculum_texto) VALUES
(1, '71234598', 'Sofía', 'Huamán Rojas', 'sofia.huaman@correo.com', '951236478', 'TECNICO',
 3, 'Técnica en secretariado ejecutivo. Tres años en mesa de partes de la UGEL recibiendo y derivando expedientes, archivo documentario, atención al ciudadano. Manejo de Office y Excel avanzado, redacción de oficios y memorandos. Curso de Ley 27444.'),
(1, '72365418', 'Diego', 'Salas Mendoza', 'diego.salas@correo.com', '963258741', 'BACHILLER',
 1, 'Bachiller en administración. Prácticas en area de logística, elaboración de ordenes de compra, manejo de Excel. Atencion al cliente en tienda comercial.'),
(1, '73698521', 'Carmen', 'López Aguirre', 'carmen.lopez@correo.com', '974125896', 'SECUNDARIA',
 0, 'Secundaria completa. Experiencia como vendedora y cajera. Conocimientos basicos de computación.'),
(2, '70321456', 'Renzo', 'Ccori Valdivia', 'renzo.ccori@correo.com', '985632147', 'TITULADO',
 4, 'Ingeniero de sistemas titulado. Cuatro años como analista de datos en gobierno regional: Python, SQL, MySQL, modelos predictivos de machine learning con scikit-learn, tableros en Power BI. Desarrollo de aplicaciones web con React y Node.'),
(2, '74125836', 'Valeria', 'Torres Palomino', 'valeria.torres@correo.com', '912587463', 'BACHILLER',
 2, 'Bachiller en estadística. Dos años en análisis de datos de encuestas, R, Excel, SQL basico y visualización de datos. Investigación en modelos de regresión.'),
(2, '75896321', 'Kevin', 'Apaza Quispe', 'kevin.apaza@correo.com', '936985214', 'TECNICO',
 1, 'Técnico en computación e informática. Soporte técnico, mantenimiento de computadoras, redes e instalacion de software.');


-- 14. evaluacion_curriculum : se llena automaticamente al evaluar los CV desde el sistema

-- =====================================================================
-- FIN DEL SCRIPT
-- =====================================================================
