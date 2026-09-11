// src/services/sistema/incidenteService.js

import { supabase } from "../../config/supabase";

/**
 * Registra un incidente del sistema.
 *
 * Este servicio:
 * - Obtiene el usuario autenticado.
 * - Detecta su organización actual.
 * - Guarda el incidente en Supabase.
 */
export const registrarIncidente = async ({
  codigoError = "UNKNOWN",
  titulo = null,
  descripcion = null,
  solucion = null,
  gravedad = "media",
  pagina = null,
  componente = null,
  operacion = null,
  errorTecnico = null,
  contexto = {},
  navegador = null,
  url = null,
} = {}) => {
  try {
    // ==========================================
    // USUARIO AUTENTICADO
    // ==========================================

    const {
      data: { user },
      error: errorUsuario,
    } = await supabase.auth.getUser();

    if (errorUsuario) {
      console.error(
        "[LIQUISISTEMA] No se pudo obtener el usuario para registrar el incidente:",
        errorUsuario,
      );

      return {
        data: null,
        error: errorUsuario,
      };
    }

    // ==========================================
    // ORGANIZACIÓN ACTUAL
    // ==========================================

    const { data: organizacionId, error: errorOrganizacion } =
      await supabase.rpc("usuario_actual_organizacion");

    if (errorOrganizacion) {
      console.error(
        "[LIQUISISTEMA] No se pudo determinar la organización del incidente:",
        errorOrganizacion,
      );
    }

    // ==========================================
    // INSERTAR INCIDENTE
    // ==========================================

    const { data, error } = await supabase
      .from("incidentes_sistema")
      .insert({
        usuario_id: user?.id || null,
        organizacion_id: organizacionId || null,

        codigo_error: String(codigoError),

        titulo,
        descripcion,
        solucion,

        gravedad,

        pagina,
        componente,
        operacion,

        error_tecnico: errorTecnico,

        contexto,

        navegador:
          navegador ||
          (typeof navigator !== "undefined" ? navigator.userAgent : null),

        url:
          url || (typeof window !== "undefined" ? window.location.href : null),
      })
      .select()
      .single();

    if (error) {
      console.error("[LIQUISISTEMA] No se pudo registrar el incidente:", error);

      return {
        data: null,
        error,
      };
    }

    console.info("[LIQUISISTEMA] Incidente registrado correctamente:", data);

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error(
      "[LIQUISISTEMA] Error inesperado registrando incidente:",
      error,
    );

    return {
      data: null,
      error,
    };
  }
};

export const obtenerIncidentes = async ({ limite = 50 } = {}) => {
  try {
    const { data, error } = await supabase
      .from("incidentes_sistema")
      .select(
        `
        id,
        codigo_incidente,
        usuario_id,
        organizacion_id,
        codigo_error,
        titulo,
        descripcion,
        solucion,
        gravedad,
        pagina,
        componente,
        operacion,
        error_tecnico,
        contexto,
        navegador,
        url,
        estado,
        resuelto,
        resuelto_at,
        resuelto_por,
        created_at
      `,
      )
      .order("created_at", { ascending: false })
      .limit(limite);

    if (error) {
      console.error(
        "[LIQUISISTEMA] No se pudieron obtener los incidentes:",
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
      "[LIQUISISTEMA] Error inesperado obteniendo incidentes:",
      error,
    );

    return {
      data: [],
      error,
    };
  }
};
export const actualizarEstadoIncidente = async ({ incidenteId, estado }) => {
  try {
    const estadosPermitidos = [
      "pendiente",
      "en_revision",
      "resuelto",
      "ignorado",
    ];

    if (!incidenteId || !estadosPermitidos.includes(estado)) {
      return {
        data: null,
        error: new Error("Estado o incidente inválido."),
      };
    }

    const { data, error } = await supabase
      .from("incidentes_sistema")
      .update({
        estado,
        resuelto: estado === "resuelto",
        resuelto_at: estado === "resuelto" ? new Date().toISOString() : null,
        resuelto_por:
          estado === "resuelto"
            ? (await supabase.auth.getUser()).data.user?.id
            : null,
      })
      .eq("id", incidenteId)
      .select()
      .single();

    if (error) {
      console.error(
        "[LIQUISISTEMA] No se pudo actualizar el incidente:",
        error,
      );

      return {
        data: null,
        error,
      };
    }

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error(
      "[LIQUISISTEMA] Error inesperado actualizando incidente:",
      error,
    );

    return {
      data: null,
      error,
    };
  }
};
