import { supabase } from "../config/supabase";

export const login = async (documento, password) => {
  try {
    // ==========================================
    // 1. BUSCAR USUARIO POR DOCUMENTO
    // ==========================================

    const { data: usuarioEncontrado, error: usuarioBusquedaError } =
      await supabase
        .from("usuarios")
        .select("*")
        .eq("documento", documento.trim())
        .maybeSingle();

    if (usuarioBusquedaError) {
      console.error(
        "ERROR COMPLETO:",
        JSON.stringify(usuarioBusquedaError, null, 2),
      );
      throw new Error("Error al buscar el documento");
    }

    if (!usuarioEncontrado) {
      throw new Error("Documento no encontrado");
    }

    // ==========================================
    // 2. VERIFICAR ESTADO
    // ==========================================

    if (usuarioEncontrado.estado !== "activo") {
      throw new Error("Este usuario se encuentra inactivo");
    }

    // ==========================================
    // 3. INICIAR SESIÓN CON EL CORREO
    // ==========================================

    const { data, error } = await supabase.auth.signInWithPassword({
      email: usuarioEncontrado.correo,
      password,
    });

    if (error) {
      console.error("Error autenticando:", error);
      throw error;
    }

    if (!data?.user || !data?.session) {
      throw new Error("No se pudo iniciar la sesión");
    }

    // ==========================================
    // 4. DEVOLVER USUARIO Y SESIÓN
    // ==========================================

    return {
      usuario: usuarioEncontrado,
      session: data.session,
    };
  } catch (error) {
    console.error("Error en login:", error);
    throw error;
  }
};
