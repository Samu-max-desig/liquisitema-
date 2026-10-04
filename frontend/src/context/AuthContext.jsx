import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../config/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargarUsuario = async (userId) => {
    if (!userId) {
      setUsuario(null);
      return null;
    }

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error recuperando usuario:", error);
      setUsuario(null);
      return null;
    }

    if (!data) {
      console.warn("No se encontró el usuario en la tabla usuarios.");
      setUsuario(null);
      return null;
    }

    if (data.estado !== "activo") {
      console.warn("El usuario está inactivo.");
      setUsuario(null);
      return null;
    }

    setUsuario(data);

    return data;
  };

  useEffect(() => {
    let montado = true;

    const inicializarSesion = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error obteniendo sesión:", error);
          return;
        }

        if (!montado) return;

        setSesion(session);

        if (session?.user?.id) {
          await cargarUsuario(session.user.id);
        } else {
          setUsuario(null);
        }
      } catch (error) {
        console.error("Error inicializando autenticación:", error);
      } finally {
        if (montado) {
          setCargando(false);
        }
      }
    };

    inicializarSesion();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!montado) return;

      setSesion(session);

      if (session?.user?.id) {
        await cargarUsuario(session.user.id);
      } else {
        setUsuario(null);
      }

      setCargando(false);
    });

    return () => {
      montado = false;
      subscription.unsubscribe();
    };
  }, []);

  const cerrarSesion = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error cerrando sesión:", error);
      throw error;
    }

    setUsuario(null);
    setSesion(null);
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        sesion,
        cargando,
        cerrarSesion,
        cargarUsuario,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error("useAuth debe utilizarse dentro de AuthProvider");
  }

  return contexto;
}
