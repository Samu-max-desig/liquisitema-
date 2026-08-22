import { supabase } from "../config/supabase";
import { Howl } from "howler";

export const obtenerPreferencias = async (usuarioId) => {
  const { data, error } = await supabase
    .from("preferencias_domiciliario")
    .select("*")
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (error) {
    console.error("Error obteniendo preferencias:", error);
    return null;
  }

  return data;
};

export const reproducirNotificacion = async (usuarioId) => {
  const preferencias = await obtenerPreferencias(usuarioId);

  if (!preferencias) return;

  // SONIDO
  if (preferencias.sonido) {
    const audio = new Howl({
      src: [`/sounds/${preferencias.tipo_sonido}.mp3`],
      volume: 0.7,
    });

    audio.play();
  }

  // VIBRACIÓN
  if (preferencias.vibracion && "vibrate" in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
};
