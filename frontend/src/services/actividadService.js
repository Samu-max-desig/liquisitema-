import { supabase } from "../config/supabase";

// ==========================================
// OBTENER USUARIO ACTUAL
// ==========================================

const obtenerUsuarioActual = () => {
  try {
    const usuarioGuardado = sessionStorage.getItem("usuario");

    if (!usuarioGuardado) {
      return null;
    }

    return JSON.parse(usuarioGuardado);
  } catch (error) {
    console.error("Error obteniendo usuario actual:", error);

    return null;
  }
};

// ==========================================
// REGISTRAR UNA ACTIVIDAD
// ==========================================

export const registrarActividad = async ({
  usuarioId,
  tipo,
  accion,
  descripcion = null,
  referenciaId = null,
  organizacionId = null,
  usuarioAfectadoId = null,
}) => {
  try {
    const usuario = obtenerUsuarioActual();

    if (!usuario) {
      console.error(
        "No se pudo identificar al usuario que realizó la actividad.",
      );

      return {
        data: null,
        error: new Error("Usuario no identificado"),
      };
    }

    const idUsuario = usuarioId || usuario.id;

    if (!idUsuario) {
      console.error(
        "El usuario no tiene un ID válido para registrar la actividad.",
      );

      return {
        data: null,
        error: new Error("Usuario sin ID"),
      };
    }

    const organizacionFinal = organizacionId || usuario.organizacion_id || null;

    if (!organizacionFinal) {
      console.error("El usuario no tiene una organización asignada.");

      return {
        data: null,
        error: new Error("Organización no identificada"),
      };
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    console.log("========== ACTIVIDAD ==========");
    console.log("Sesión Supabase:", session);
    console.log("Usuario Auth:", session?.user?.id);
    console.log("Usuario local:", usuario);
    console.log("ID actividad:", idUsuario);
    console.log("Organización:", organizacionFinal);
    console.log("================================");

    const { data, error } = await supabase.rpc("registrar_actividad_segura", {
      p_usuario_id: idUsuario,
      p_tipo: tipo,
      p_accion: accion,
      p_descripcion: descripcion,
      p_referencia_id: referenciaId,
      p_organizacion_id: organizacionFinal,
      p_usuario_afectado_id: usuarioAfectadoId,
    });

    if (error) {
      console.error("Error registrando actividad:", error);

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
    console.error("Error inesperado registrando actividad:", error);

    return {
      data: null,
      error,
    };
  }
};
// ==========================================
// OBTENER TODAS LAS ACTIVIDADES
// ==========================================

export const obtenerActividades = async () => {
  try {
    const { data, error } = await supabase
      .from("actividades")
      .select(
        `
        id,
        usuario_id,
        tipo,
        accion,
        descripcion,
        referencia_id,
        organizacion_id,
        usuario_afectado_id,
        created_at,
        usuarios!actividades_usuario_id_fkey (
          id,
          nombre
        )
      `,
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Error obteniendo actividades:", error);

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
    console.error("Error inesperado obteniendo actividades:", error);

    return {
      data: [],
      error,
    };
  }
};

// ==========================================
// OBTENER ACTIVIDADES DE UNA ORGANIZACIÓN
// ==========================================

export const obtenerActividadesPorOrganizacion = async (
  organizacionId,
  limite = 5,
) => {
  try {
    if (!organizacionId) {
      console.error("No se recibió una organización válida.");

      return {
        data: [],
        error: new Error("Organización no identificada"),
      };
    }

    const { data, error } = await supabase
      .from("actividades")
      .select(
        `
        id,
        usuario_id,
        tipo,
        accion,
        descripcion,
        referencia_id,
        organizacion_id,
        usuario_afectado_id,
        created_at,
        usuarios!actividades_usuario_id_fkey (
          id,
          nombre
        )
      `,
      )
      .eq("organizacion_id", organizacionId)
      .order("created_at", {
        ascending: false,
      })
      .limit(limite);

    if (error) {
      console.error("Error obteniendo actividades de la organización:", error);

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
      "Error inesperado obteniendo actividades de la organización:",
      error,
    );

    return {
      data: [],
      error,
    };
  }
};

// ==========================================
// OBTENER ACTIVIDADES DE UN USUARIO
// ==========================================

export const obtenerActividadesPorUsuario = async (usuarioId) => {
  try {
    const { data, error } = await supabase
      .from("actividades")
      .select(
        `
        id,
        usuario_id,
        tipo,
        accion,
        descripcion,
        referencia_id,
        organizacion_id,
        usuario_afectado_id,
        created_at,
        usuarios!actividades_usuario_id_fkey (
          id,
          nombre
        )
      `,
      )
      .eq("usuario_id", usuarioId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Error obteniendo actividades del usuario:", error);

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
      "Error inesperado obteniendo actividades del usuario:",
      error,
    );

    return {
      data: [],
      error,
    };
  }
};
