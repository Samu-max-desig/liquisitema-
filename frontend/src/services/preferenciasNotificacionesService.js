import { supabase } from "../config/supabase";

// ============================================================
// OBTENER PREFERENCIAS
// ============================================================

export const obtenerPreferenciasNotificaciones = async (
  usuarioId,
  organizacionId,
) => {
  const { data, error } = await supabase
    .from("preferencias_notificaciones")
    .select("*")
    .eq("usuario_id", usuarioId)
    .eq("organizacion_id", organizacionId)
    .maybeSingle();

  if (error) {
    console.error("Error obteniendo preferencias de notificaciones:", error);
    throw error;
  }

  // Si todavía no existen, devolvemos valores por defecto.
  if (!data) {
    return {
      actividad: true,
      pendientes: true,
      reportes: true,
      cierres: true,
      comprobantes: true,
      sonidos: true,
      sonido_archivo: "noti1.mp3",
      volumen_sonido: 70,
    };
  }

  return data;
};

// ============================================================
// GUARDAR PREFERENCIAS
// ============================================================

export const guardarPreferenciasNotificaciones = async ({
  usuarioId,
  organizacionId,
  preferencias,
}) => {
  const { data, error } = await supabase
    .from("preferencias_notificaciones")
    .upsert(
      {
        usuario_id: usuarioId,
        organizacion_id: organizacionId,

        actividad: preferencias.actividad,
        pendientes: preferencias.pendientes,
        reportes: preferencias.reportes,
        cierres: preferencias.cierres,
        comprobantes: preferencias.comprobantes,

        sonidos: preferencias.sonidos,
        sonido_archivo: preferencias.sonido_archivo,
        volumen_sonido: preferencias.volumen_sonido,

        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "usuario_id,organizacion_id",
      },
    )
    .select()
    .single();

  if (error) {
    console.error("Error guardando preferencias de notificaciones:", error);
    throw error;
  }

  return data;
};
