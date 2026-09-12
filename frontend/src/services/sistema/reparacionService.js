import { obtenerPoliticaReparacion } from "./politicaReparaciones";
import { supabase } from "../../config/supabase";
// ==========================================
// REPARACIÓN: REINTENTAR CONEXIÓN
// ==========================================

const reintentarConexion = async () => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        exito: false,
        mensaje:
          "No se encontró la configuración necesaria para comprobar el servidor.",
      };
    }

    const inicio = performance.now();

    const respuesta = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
      },
    });

    const tiempo = Math.round(performance.now() - inicio);

    if (!respuesta.ok) {
      return {
        exito: false,
        mensaje: `El servidor respondió con estado HTTP ${respuesta.status}.`,
      };
    }

    return {
      exito: true,
      mensaje: `Conexión restablecida correctamente. Servidor disponible (${tiempo} ms).`,
      tiempo,
    };
  } catch (error) {
    console.error("[LIQUISISTEMA] Reparación de conexión fallida:", error);

    return {
      exito: false,
      mensaje: "No fue posible restablecer la conexión con el servidor.",
      errorTecnico: error?.message || String(error),
    };
  }
};
const verificarLimiteReparaciones = async (incidenteId) => {
  if (!incidenteId) {
    return {
      permitido: true,
      fallosConsecutivos: 0,
    };
  }

  const { data, error } = await supabase
    .from("reparaciones_sistema")
    .select("resultado, created_at")
    .eq("incidente_id", incidenteId)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error(
      "[LIQUISISTEMA] No se pudo verificar el límite de reparaciones:",
      error,
    );

    // Si no podemos comprobar el historial,
    // NO bloqueamos una reparación segura.
    return {
      permitido: true,
      fallosConsecutivos: 0,
      error,
    };
  }

  const reparaciones = data || [];

  const fallosConsecutivos = reparaciones.filter(
    (reparacion) => reparacion.resultado === "fallido",
  ).length;

  const todasFallidas =
    reparaciones.length === 3 &&
    reparaciones.every((reparacion) => reparacion.resultado === "fallido");

  return {
    permitido: !todasFallidas,
    fallosConsecutivos: todasFallidas ? 3 : fallosConsecutivos,
  };
};
// ==========================================
// EJECUTAR REPARACIÓN SEGURA
// ==========================================
export const ejecutarReparacion = async ({
  incidenteId,
  codigoError,
  contexto = {},
}) => {
  const politica = obtenerPoliticaReparacion(codigoError);
  const usuarioActual = await supabase.auth.getUser();
  const usuarioId = usuarioActual.data.user?.id || null;
  // ==========================================
  // BLOQUEO DE SEGURIDAD
  // ==========================================

  if (politica.nivel !== "reparable") {
    return {
      exito: false,
      ejecutada: false,
      mensaje: "Esta incidencia no tiene una reparación automática autorizada.",
      codigoError,
      politica,
    };
  }

  if (!politica.accion) {
    return {
      exito: false,
      ejecutada: false,
      mensaje:
        "La incidencia está marcada como reparable, pero no tiene una acción definida.",
      codigoError,
      politica,
    };
  }

  // ==========================================
  // LISTA BLANCA DE REPARACIONES
  // ==========================================

  switch (politica.accion) {
    case "reintentar_conexion": {
      const limite = await verificarLimiteReparaciones(incidenteId);

      if (!limite.permitido) {
        return {
          exito: false,
          ejecutada: false,
          bloqueada: true,
          mensaje:
            "La reparación automática fue detenida después de 3 intentos fallidos consecutivos. Se requiere revisión técnica.",
          codigoError,
          politica,
          contexto,
          fallosConsecutivos: 3,
        };
      }
      const resultado = await reintentarConexion();

      let historialRegistrado = false;
      let errorHistorial = null;

      if (incidenteId && usuarioId) {
        const { error } = await supabase.from("reparaciones_sistema").insert({
          incidente_id: incidenteId,
          usuario_id: usuarioId,
          codigo_error: codigoError,
          accion: politica.accion,
          resultado: resultado.exito ? "exitoso" : "fallido",
          mensaje: resultado.mensaje || null,
          error_tecnico: resultado.errorTecnico || null,
          contexto,
        });

        if (error) {
          console.error(
            "[LIQUISISTEMA] No se pudo registrar el historial de reparación:",
            error,
          );

          errorHistorial = error.message;
        } else {
          historialRegistrado = true;
        }
      }

      return {
        ...resultado,
        ejecutada: true,
        codigoError,
        politica,
        contexto,
        historialRegistrado,
        errorHistorial,
      };
    }
    default:
      return {
        exito: false,
        ejecutada: false,
        mensaje: "La reparación solicitada no está implementada.",
        codigoError,
        politica,
      };
  }
};
export const obtenerReparacionesIncidente = async ({
  incidenteId,
  limite = 20,
} = {}) => {
  try {
    if (!incidenteId) {
      return {
        data: [],
        error: new Error("No se proporcionó el incidente."),
      };
    }

    const { data, error } = await supabase
      .from("reparaciones_sistema")
      .select(
        `
        id,
        incidente_id,
        usuario_id,
        codigo_error,
        accion,
        resultado,
        mensaje,
        error_tecnico,
        contexto,
        created_at
      `,
      )
      .eq("incidente_id", incidenteId)
      .order("created_at", { ascending: false })
      .limit(limite);

    if (error) {
      console.error(
        "[LIQUISISTEMA] No se pudo obtener el historial de reparaciones:",
        error,
      );

      return {
        data: [],
        error,
      };
    }

    return {
      data: data || [],
      error: null,
    };
  } catch (error) {
    console.error(
      "[LIQUISISTEMA] Error inesperado obteniendo reparaciones:",
      error,
    );

    return {
      data: [],
      error,
    };
  }
};
