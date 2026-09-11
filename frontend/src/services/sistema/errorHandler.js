// src/services/sistema/errorHandler.js

/**
 * Capturador central de errores de Liquisistema.
 *
 * Se encarga de:
 * - Normalizar errores.
 * - Capturar errores globales de JavaScript.
 * - Capturar promesas rechazadas sin manejar.
 *
 * Por ahora NO guarda nada en Supabase.
 */
import { registrarIncidente } from "./incidenteService";
let capturadorGlobalActivo = false;
import { interpretarError } from "./catalogoErrores";
export const capturarError = ({
  error,
  pagina = null,
  componente = null,
  operacion = null,
  contexto = {},
} = {}) => {
  const errorTecnico =
    error?.message ||
    error?.error_description ||
    String(error || "Error desconocido");
  const interpretado = interpretarError(
    error,
    contexto?.tipoError || "UNKNOWN",
  );

  const codigoError = interpretado.codigo;
  const incidente = {
    codigoError: String(codigoError),

    codigoTecnico:
      error?.code || error?.status || error?.statusCode || "UNKNOWN",

    titulo: interpretado.titulo,
    descripcion: interpretado.descripcion,
    solucion: interpretado.solucion,
    gravedad: interpretado.gravedad,

    errorTecnico: interpretado.errorTecnico,

    pagina,
    componente,
    operacion,

    contexto,

    fecha: new Date().toISOString(),

    navegador: typeof navigator !== "undefined" ? navigator.userAgent : null,

    url: typeof window !== "undefined" ? window.location.href : null,
  };
  void registrarIncidente({
    codigoError: incidente.codigoTecnico,
    titulo: incidente.titulo,
    descripcion: incidente.descripcion,
    solucion: incidente.solucion,
    gravedad: incidente.gravedad,
    pagina: incidente.pagina,
    componente: incidente.componente,
    operacion: incidente.operacion,

    errorTecnico: incidente.errorTecnico,

    contexto: incidente.contexto,

    navegador: incidente.navegador,
    url: incidente.url,
  }).catch((errorRegistro) => {
    console.error(
      "[LIQUISISTEMA] No se pudo guardar automáticamente el incidente:",
      errorRegistro,
    );
  });

  console.error("[LIQUISISTEMA] Error capturado:", incidente);

  return incidente;
};

/**
 * Activa los capturadores globales del navegador.
 *
 * Evita registrarlos varias veces.
 */
export const iniciarCapturadorGlobal = () => {
  if (capturadorGlobalActivo) {
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  capturadorGlobalActivo = true;

  // ==========================================
  // ERRORES JAVASCRIPT GLOBALES
  // ==========================================

  window.addEventListener("error", (evento) => {
    const esErrorDeRecurso = evento.target && evento.target !== window;

    capturarError({
      error:
        evento.error ||
        new Error(evento.message || "Error global de JavaScript"),

      pagina: window.location.pathname,

      componente: esErrorDeRecurso ? "Recurso externo" : "JavaScript global",

      operacion: esErrorDeRecurso ? "carga_recurso" : "ejecucion_javascript",

      contexto: {
        tipo: "window_error",
        archivo: evento.filename || null,
        linea: evento.lineno || null,
        columna: evento.colno || null,
        recurso: esErrorDeRecurso
          ? evento.target?.src || evento.target?.href || null
          : null,
      },
    });
  });

  // ==========================================
  // PROMESAS RECHAZADAS SIN MANEJAR
  // ==========================================

  window.addEventListener("unhandledrejection", (evento) => {
    capturarError({
      error: evento.reason,

      pagina: window.location.pathname,

      componente: "Promesa no controlada",

      operacion: "unhandled_promise_rejection",

      contexto: {
        tipo: "unhandled_rejection",
      },
    });
  });

  console.info("[LIQUISISTEMA] Capturador global de errores activo.");
};
