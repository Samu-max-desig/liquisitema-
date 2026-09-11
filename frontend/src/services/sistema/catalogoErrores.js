// src/services/sistema/catalogoErrores.js

export const CATALOGO_ERRORES = {
  PGRST116: {
    codigo: "DB-001",
    titulo: "No encontramos la información solicitada",
    descripcion:
      "Liquisistema realizó una consulta pero no encontró el resultado esperado.",
    solucion:
      "Vuelve a ejecutar el diagnóstico. Si el problema continúa, contacta con soporte.",
    gravedad: "media",
  },

  PGRST204: {
    codigo: "DB-002",
    titulo: "La estructura de datos no coincide",
    descripcion:
      "Liquisistema intentó utilizar información que no está disponible como se esperaba.",
    solucion:
      "No realices cambios manuales. Ejecuta nuevamente el diagnóstico y contacta con soporte si continúa.",
    gravedad: "alta",
  },

  PGRST205: {
    codigo: "DB-004",
    titulo: "La tabla solicitada no está disponible",
    descripcion:
      "Liquisistema intentó consultar una tabla de la base de datos que no está disponible.",
    solucion:
      "No realices cambios manuales en la base de datos. Este problema debe ser revisado por soporte técnico.",
    gravedad: "alta",
  },

  42501: {
    codigo: "DB-003",
    titulo: "Liquisistema no tiene permisos suficientes",
    descripcion:
      "El sistema intentó acceder a información para la que no tiene los permisos necesarios.",
    solucion:
      "No modifiques permisos manualmente. Este problema debe ser revisado por soporte técnico.",
    gravedad: "alta",
  },

  401: {
    codigo: "AUTH-001",
    titulo: "Tu sesión ya no es válida",
    descripcion:
      "La sesión actual de Liquisistema no pudo ser validada correctamente.",
    solucion:
      "Intenta renovar la sesión. Si no funciona, vuelve a iniciar sesión.",
    gravedad: "alta",
  },

  403: {
    codigo: "AUTH-002",
    titulo: "No tienes permiso para realizar esta acción",
    descripcion:
      "Tu cuenta está autenticada, pero no tiene autorización para acceder a este recurso.",
    solucion:
      "Comprueba que estás utilizando la cuenta y organización correctas.",
    gravedad: "alta",
  },

  429: {
    codigo: "SRV-001",
    titulo: "Demasiadas solicitudes",
    descripcion:
      "El servidor está limitando temporalmente las solicitudes realizadas por Liquisistema.",
    solucion: "Espera unos minutos antes de volver a intentarlo.",
    gravedad: "media",
  },

  500: {
    codigo: "SRV-002",
    titulo: "El servidor encontró un problema",
    descripcion: "El servidor no pudo completar correctamente una operación.",
    solucion:
      "Vuelve a intentarlo. Si el problema continúa, contacta con soporte.",
    gravedad: "alta",
  },

  NETWORK_ERROR: {
    codigo: "CON-001",
    titulo: "Problema de conexión",
    descripcion:
      "Liquisistema no pudo comunicarse correctamente con el servidor.",
    solucion:
      "Comprueba tu conexión a Internet y vuelve a ejecutar el diagnóstico.",
    gravedad: "alta",
  },

  SESSION_MISSING: {
    codigo: "AUTH-003",
    titulo: "No hay una sesión activa",
    descripcion:
      "Liquisistema no encontró una sesión válida para el usuario actual.",
    solucion: "Intenta renovar la sesión o vuelve a iniciar sesión.",
    gravedad: "alta",
  },

  USER_MISSING: {
    codigo: "USR-001",
    titulo: "Tu usuario no está correctamente registrado",
    descripcion:
      "La cuenta autenticada no tiene un usuario asociado correctamente dentro de Liquisistema.",
    solucion: "No intentes crear otro usuario. Contacta con soporte técnico.",
    gravedad: "critica",
  },

  ORGANIZATION_MISSING: {
    codigo: "ORG-001",
    titulo: "No pudimos determinar tu organización",
    descripcion:
      "Liquisistema no pudo identificar la organización a la que pertenece tu cuenta.",
    solucion:
      "Intenta renovar la sesión. Si el problema continúa, contacta con soporte.",
    gravedad: "critica",
  },

  CONFIG_MISSING: {
    codigo: "CFG-001",
    titulo: "La configuración de la organización no está disponible",
    descripcion:
      "Liquisistema no encontró la configuración necesaria para la organización actual.",
    solucion:
      "Revisa las preferencias de trabajo. Si el problema continúa, contacta con soporte.",
    gravedad: "media",
  },

  UNKNOWN: {
    codigo: "SYS-999",
    titulo: "Liquisistema encontró un problema inesperado",
    descripcion:
      "El sistema encontró un error que no pudo identificar automáticamente.",
    solucion:
      "Vuelve a ejecutar el diagnóstico. Si el problema continúa, contacta con soporte técnico.",
    gravedad: "critica",
  },
};

export const interpretarError = (error, tipo = "UNKNOWN") => {
  const codigoError = error?.code || error?.status || error?.statusCode || null;

  const mensaje =
    error?.message || error?.error_description || String(error || "");

  // ==========================================
  // ERROR CON CÓDIGO CONOCIDO
  // ==========================================

  if (codigoError && CATALOGO_ERRORES[String(codigoError)]) {
    return {
      ...CATALOGO_ERRORES[String(codigoError)],
      errorTecnico: mensaje,
    };
  }

  // ==========================================
  // PROBLEMA DE RED
  // ==========================================

  if (
    mensaje.toLowerCase().includes("fetch") ||
    mensaje.toLowerCase().includes("network") ||
    mensaje.toLowerCase().includes("failed to fetch")
  ) {
    return {
      ...CATALOGO_ERRORES.NETWORK_ERROR,
      errorTecnico: mensaje,
    };
  }

  // ==========================================
  // TIPOS INTERNOS DE LIQUISISTEMA
  // ==========================================

  if (CATALOGO_ERRORES[tipo]) {
    return {
      ...CATALOGO_ERRORES[tipo],
      errorTecnico: mensaje,
    };
  }

  // ==========================================
  // DESCONOCIDO
  // ==========================================

  return {
    ...CATALOGO_ERRORES.UNKNOWN,
    errorTecnico: mensaje,
  };
};
