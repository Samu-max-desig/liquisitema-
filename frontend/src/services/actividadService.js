import { supabase } from "../config/supabase";

// ==========================================
// OBTENER USUARIO ACTUAL
// ==========================================

const obtenerUsuarioActual = () => {
  try {
    const usuarioGuardado = localStorage.getItem("usuario");

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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    console.log("=== DEBUG ACTIVIDAD ===");
    console.log("SESSION:", session);
    console.log("USER ID:", session?.user?.id);
    console.log("ROLE:", session?.user?.role);
    console.log("=======================");
    const usuarioGuardado = sessionStorage.getItem("usuario");

    if (!usuarioGuardado) {
      console.error(
        "No se pudo identificar al usuario que realizó la actividad.",
      );

      return {
        data: null,
        error: new Error("Usuario no identificado"),
      };
    }

    const usuario = JSON.parse(usuarioGuardado);

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

    // Si no se especifica una organización,
    // usamos la organización del usuario actual.
    const organizacionFinal = organizacionId || usuario.organizacion_id || null;

    const { error } = await supabase.from("actividades").insert([
      {
        usuario_id: idUsuario,
        tipo,
        accion,
        descripcion,
        referencia_id: referenciaId,
        organizacion_id: organizacionFinal,
        usuario_afectado_id: usuarioAfectadoId,
      },
    ]);

    if (error) {
      console.error("Error registrando actividad:", error);

      return {
        data: null,
        error,
      };
    }

    return {
      data: true,
      error: null,
    };

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
