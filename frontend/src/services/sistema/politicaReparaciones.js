// ==========================================
// POLÍTICA DE REPARACIONES DE LIQUISISTEMA
// ==========================================
//
// Este archivo define qué incidentes pueden tener
// una acción automática y cuáles deben quedar
// exclusivamente para revisión técnica.
//
// IMPORTANTE:
// Aquí NO se ejecutan reparaciones.
// Solo se define qué está permitido.
//

const REPARABLE = "reparable";
const REVISION = "requiere_revision";
const CRITICO = "critico";

export const POLITICA_REPARACIONES = {
  // ==========================================
  // CONEXIÓN
  // ==========================================

  "CON-001": {
    nivel: REPARABLE,
    accion: "reintentar_conexion",
    descripcion:
      "Liquisistema puede volver a comprobar la conexión con el servidor.",
  },

  // ==========================================
  // AUTENTICACIÓN
  // ==========================================

  "AUTH-001": {
    nivel: REPARABLE,
    accion: "revalidar_sesion",
    descripcion: "Liquisistema puede intentar revalidar la sesión actual.",
  },

  "AUTH-003": {
    nivel: REPARABLE,
    accion: "revalidar_sesion",
    descripcion:
      "Liquisistema puede comprobar nuevamente la sesión del usuario.",
  },

  // ==========================================
  // BASE DE DATOS
  // ==========================================

  "DB-001": {
    nivel: REPARABLE,
    accion: "reintentar_consulta",
    descripcion: "Liquisistema puede volver a intentar la consulta.",
  },

  "DB-002": {
    nivel: REVISION,
    accion: null,
    descripcion:
      "La estructura esperada de los datos no coincide con la disponible.",
  },

  "DB-003": {
    nivel: CRITICO,
    accion: null,
    descripcion:
      "El acceso a la base de datos está siendo rechazado. Requiere revisión técnica.",
  },

  "DB-004": {
    nivel: CRITICO,
    accion: null,
    descripcion:
      "No se encontró una tabla requerida. No se realizarán cambios automáticos.",
  },

  // ==========================================
  // SERVIDOR
  // ==========================================

  "SRV-001": {
    nivel: REPARABLE,
    accion: "reintentar_operacion",
    descripcion:
      "El servidor está limitando temporalmente las solicitudes. Se puede intentar nuevamente.",
  },

  "SRV-002": {
    nivel: REVISION,
    accion: null,
    descripcion:
      "El servidor devolvió un error interno. Requiere revisión si persiste.",
  },

  // ==========================================
  // ORGANIZACIÓN
  // ==========================================

  "ORG-001": {
    nivel: CRITICO,
    accion: null,
    descripcion:
      "No se pudo determinar una organización válida. Requiere revisión técnica.",
  },

  // ==========================================
  // USUARIO
  // ==========================================

  "USR-001": {
    nivel: CRITICO,
    accion: null,
    descripcion:
      "El usuario autenticado no tiene un registro válido en Liquisistema.",
  },

  // ==========================================
  // AUTORIZACIÓN
  // ==========================================

  "AUTH-002": {
    nivel: CRITICO,
    accion: null,
    descripcion:
      "El usuario no tiene permisos suficientes para realizar la operación.",
  },

  // ==========================================
  // CONFIGURACIÓN
  // ==========================================

  "CFG-001": {
    nivel: REVISION,
    accion: null,
    descripcion: "La configuración de la organización requiere revisión.",
  },

  // ==========================================
  // DESCONOCIDO
  // ==========================================

  UNKNOWN: {
    nivel: REVISION,
    accion: null,
    descripcion:
      "Liquisistema no pudo determinar con seguridad la causa del problema.",
  },
};

// ==========================================
// OBTENER POLÍTICA DE UN ERROR
// ==========================================

export const obtenerPoliticaReparacion = (codigoError) => {
  return POLITICA_REPARACIONES[codigoError] || POLITICA_REPARACIONES.UNKNOWN;
};

// ==========================================
// COMPROBAR SI ES REPARABLE
// ==========================================

export const esReparable = (codigoError) => {
  const politica = obtenerPoliticaReparacion(codigoError);

  return politica.nivel === REPARABLE;
};

// ==========================================
// COMPROBAR SI REQUIERE SOPORTE
// ==========================================

export const requiereSoporte = (codigoError) => {
  const politica = obtenerPoliticaReparacion(codigoError);

  return politica.nivel === REVISION || politica.nivel === CRITICO;
};
