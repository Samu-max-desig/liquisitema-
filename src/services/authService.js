import { supabase } from '../config/supabase'

export const login = async (documento, password) => {
  try {
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('documento', documento)
      .single()

    if (usuarioError || !usuario) {
      throw new Error('Documento no encontrado')
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: usuario.correo,
      password
    })

    if (error) {
      throw error
    }

    return {
      usuario,
      session: data.session
    }
  } catch (error) {
    throw error
  }
}