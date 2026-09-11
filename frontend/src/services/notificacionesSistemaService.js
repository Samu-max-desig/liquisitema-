import { supabase } from "../config/supabase";

// =========================================================
// CREAR NOTIFICACIÓN
// =========================================================

export const crearNotificacionSistema = async ({
  usuarioId,
  organizacionId,
  tipo,
  titulo,
  mensaje,
  referenciaId = null,
  referenciaTipo = null,
}) => {
  const { data, error } = await supabase
    .from("notificaciones_sistema")
    .insert({
      usuario_id: usuarioId,
      organizacion_id: organizacionId,
      tipo,
      titulo,
      mensaje,
      referencia_id: referenciaId,
      referencia_tipo: referenciaTipo,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creando notificación del sistema:", error);
    throw error;
  }

  return data;
};

// =========================================================
// OBTENER NOTIFICACIONES DEL USUARIO
// =========================================================

export const obtenerNotificacionesSistema = async (usuarioId) => {
  const { data, error } = await supabase
    .from("notificaciones_sistema")
    .select("*")
    .eq("usuario_id", usuarioId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error obteniendo notificaciones del sistema:", error);
    throw error;
  }

  return data || [];
};

// =========================================================
// CONTAR NO LEÍDAS
// =========================================================

export const contarNotificacionesSistemaNoLeidas = async (usuarioId) => {
  const { count, error } = await supabase
    .from("notificaciones_sistema")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("usuario_id", usuarioId)
    .eq("leida", false);

  if (error) {
    console.error("Error contando notificaciones no leídas:", error);
    throw error;
  }

  return count || 0;
};

// =========================================================
// MARCAR COMO LEÍDA
// =========================================================

export const marcarNotificacionSistemaLeida = async (id) => {
  const { error } = await supabase
    .from("const { error } = await supabase")
    .update({
      leida: true,
    })
    .eq("id", id);

  if (error) {
    console.error("Error marcando notificación como leída:", error);
    throw error;
  }
};

// =========================================================
// MARCAR TODAS COMO LEÍDAS
// =========================================================

export const marcarTodasNotificacionesSistemaLeidas = async (usuarioId) => {
  const { error } = await supabase
    .from("notificaciones_sistema")
    .update({
      leida: true,
    })
    .eq("usuario_id", usuarioId)
    .eq("leida", false);

  if (error) {
    console.error(
      "Error marcando todas las notificaciones como leídas:",
      error,
    );
    throw error;
  }
};

// =========================================================
// ELIMINAR NOTIFICACIÓN
// =========================================================

export const eliminarNotificacionSistema = async (id) => {
  const { error } = await supabase
    .from("notificaciones_sistema")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error eliminando notificación del sistema:", error);
    throw error;
  }
};
export const generarNotificacionActividad = async ({
  actividadId,
  usuarioId,
  organizacionId,
  descripcion,
}) => {
  const { data, error } = await supabase.rpc("generar_notificacion_actividad", {
    p_actividad_id: actividadId,
    p_usuario_id: usuarioId,
    p_organizacion_id: organizacionId,
    p_descripcion: descripcion,
  });

  if (error) {
    console.error("ERROR RPC ACTIVIDAD COMPLETO:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    throw error;
  }

  return data;
};
export const generarNotificacionUsuario = async ({
  usuarioId,
  accion,
  nombreUsuario,
}) => {
  const { data, error } = await supabase.rpc("generar_notificacion_usuario", {
    p_usuario_id: usuarioId,
    p_accion: accion,
    p_nombre_usuario: nombreUsuario,
  });

  if (error) {
    console.error("ERROR RPC NOTIFICACIÓN USUARIO:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    throw error;
  }

  return data;
};
