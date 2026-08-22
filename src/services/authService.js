import { supabase } from '../config/supabase'

export const login = async (documento, password) => {
  try {
    const { data: correo, error: correoError } = await supabase
      .rpc('obtener_correo_por_documento', {
        p_documento: documento
      })

    if (correoError) {
      console.error('Error buscando documento:', correoError)
      throw new Error('Error al buscar el documento')
    }

    if (!correo) {
      throw new Error('Documento no encontrado')
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: correo,
      password
    })

    if (error) {
      throw error
    }

    if (!data?.user || !data?.session) {
      throw new Error('No se pudo iniciar la sesión')
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (usuarioError || !usuario) {
      console.error('Error cargando usuario:', usuarioError)
      await supabase.auth.signOut()
      throw new Error('No se pudo cargar la información del usuario')
    }

    if (usuario.estado !== 'activo') {
      await supabase.auth.signOut()
      throw new Error('Este usuario se encuentra inactivo')
    }

    return {
      usuario,
      session: data.session
    }

  } catch (error) {
    console.error('Error en login:', error)
    throw error
  }
}