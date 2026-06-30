CREATE DATABASE IF NOT EXISTS fila_cero
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fila_cero;

CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL UNIQUE
);

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rol_id INT NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  correo VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_roles
    FOREIGN KEY (rol_id) REFERENCES roles(id)
);

CREATE TABLE establecimientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  ciudad VARCHAR(100) NOT NULL,
  direccion VARCHAR(220) NULL,
  estado ENUM('abierto', 'pausado', 'cerrado') NOT NULL DEFAULT 'abierto',
  hora_apertura TIME NOT NULL,
  hora_cierre TIME NOT NULL,
  url_publica VARCHAR(255) NOT NULL,
  url_qr VARCHAR(255) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuario_establecimiento (
  usuario_id INT NOT NULL,
  establecimiento_id INT NOT NULL,
  PRIMARY KEY (usuario_id, establecimiento_id),
  CONSTRAINT fk_ue_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_ue_establecimiento
    FOREIGN KEY (establecimiento_id) REFERENCES establecimientos(id)
);

CREATE TABLE filas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  establecimiento_id INT NOT NULL,
  prefijo VARCHAR(10) NOT NULL DEFAULT 'A',
  numero_actual INT NOT NULL DEFAULT 0,
  ultimo_numero INT NOT NULL DEFAULT 0,
  tiempo_promedio_min INT NOT NULL DEFAULT 5,
  activa TINYINT(1) NOT NULL DEFAULT 1,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_filas_establecimientos
    FOREIGN KEY (establecimiento_id) REFERENCES establecimientos(id)
);

CREATE TABLE turnos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fila_id INT NOT NULL,
  codigo VARCHAR(20) NOT NULL,
  numero INT NOT NULL,
  token_cliente CHAR(64) NOT NULL UNIQUE,
  estado ENUM('espera', 'atencion', 'atendido', 'cancelado', 'ausente') NOT NULL DEFAULT 'espera',
  origen ENUM('qr_presencial', 'admin') NOT NULL DEFAULT 'qr_presencial',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  llamado_en DATETIME NULL,
  finalizado_en DATETIME NULL,
  UNIQUE KEY uk_turno_fila_numero (fila_id, numero),
  CONSTRAINT fk_turnos_filas
    FOREIGN KEY (fila_id) REFERENCES filas(id)
);

CREATE TABLE eventos_turno (
  id INT AUTO_INCREMENT PRIMARY KEY,
  turno_id INT NOT NULL,
  usuario_id INT NULL,
  evento ENUM('creado', 'llamado', 'repetido', 'saltado', 'cancelado', 'atendido') NOT NULL,
  detalle VARCHAR(255) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_eventos_turno
    FOREIGN KEY (turno_id) REFERENCES turnos(id),
  CONSTRAINT fk_eventos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

INSERT INTO roles (nombre) VALUES
  ('admin'),
  ('operador'),
  ('cliente');

INSERT INTO usuarios (rol_id, nombre, correo, password_hash) VALUES
  (1, 'Administrador Fila-Cero', 'admin@filacero.test', '$2y$10$demo.hash.para.reemplazar'),
  (2, 'Recepción Clínica San Rafael', 'recepcion@sanrafael.test', '$2y$10$demo.hash.para.reemplazar');

INSERT INTO establecimientos
  (nombre, slug, ciudad, direccion, estado, hora_apertura, hora_cierre, url_publica, url_qr)
VALUES
  (
    'Clínica San Rafael',
    'clinica-san-rafael',
    'Penonomé',
    'Penonomé, Coclé',
    'abierto',
    '07:00:00',
    '17:00:00',
    '/publica/clinica-san-rafael',
    '/cliente/clinica-san-rafael'
  );

INSERT INTO usuario_establecimiento (usuario_id, establecimiento_id) VALUES
  (1, 1),
  (2, 1);

INSERT INTO filas (establecimiento_id, prefijo, numero_actual, ultimo_numero, tiempo_promedio_min, activa)
VALUES (1, 'A', 22, 28, 5, 1);

INSERT INTO turnos (fila_id, codigo, numero, token_cliente, estado, origen, creado_en, llamado_en) VALUES
  (1, 'A-022', 22, SHA2(CONCAT('A-022', NOW()), 256), 'atencion', 'qr_presencial', NOW() - INTERVAL 18 MINUTE, NOW() - INTERVAL 3 MINUTE),
  (1, 'A-023', 23, SHA2(CONCAT('A-023', NOW()), 256), 'espera', 'qr_presencial', NOW() - INTERVAL 15 MINUTE, NULL),
  (1, 'A-024', 24, SHA2(CONCAT('A-024', NOW()), 256), 'espera', 'qr_presencial', NOW() - INTERVAL 12 MINUTE, NULL),
  (1, 'A-025', 25, SHA2(CONCAT('A-025', NOW()), 256), 'espera', 'qr_presencial', NOW() - INTERVAL 9 MINUTE, NULL),
  (1, 'A-026', 26, SHA2(CONCAT('A-026', NOW()), 256), 'espera', 'qr_presencial', NOW() - INTERVAL 6 MINUTE, NULL),
  (1, 'A-027', 27, SHA2(CONCAT('A-027', NOW()), 256), 'espera', 'qr_presencial', NOW() - INTERVAL 3 MINUTE, NULL),
  (1, 'A-028', 28, SHA2(CONCAT('A-028', NOW()), 256), 'espera', 'qr_presencial', NOW(), NULL);

CREATE OR REPLACE VIEW vista_ocupacion_publica AS
SELECT
  e.id AS establecimiento_id,
  e.nombre,
  e.slug,
  e.ciudad,
  e.estado,
  COUNT(CASE WHEN t.estado IN ('espera', 'atencion') THEN 1 END) AS personas_en_fila,
  COUNT(CASE WHEN t.estado IN ('espera', 'atencion') THEN 1 END) * f.tiempo_promedio_min AS espera_estimada_min
FROM establecimientos e
JOIN filas f ON f.establecimiento_id = e.id
LEFT JOIN turnos t ON t.fila_id = f.id
GROUP BY e.id, e.nombre, e.slug, e.ciudad, e.estado, f.tiempo_promedio_min;
