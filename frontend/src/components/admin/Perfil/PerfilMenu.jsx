import { useEffect, useRef, useState } from "react";
import {
  UserCircleIcon,
  BuildingOffice2Icon,
  IdentificationIcon,
  EnvelopeIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

import { supabase } from "../../../config/supabase";
import "./PerfilMenu.css";
import { useNavigate } from "react-router-dom";
export default function PerfilMenu() {
  const [abierto, setAbierto] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [organizacion, setOrganizacion] = useState(null);

  const menuRef = useRef(null);
  const navigate = useNavigate();
  // ==========================================
  // CARGAR USUARIO Y ORGANIZACIÓN
  // ==========================================

  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        // ==========================================
        // 1. USUARIO AUTENTICADO
        // ==========================================

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error("No hay usuario autenticado:", authError);
          return;
        }

        console.log("👤 Usuario Auth:", user.id);

        // ==========================================
        // 2. BUSCAR USUARIO EN usuarios
        // ==========================================

        const { data: usuarioDB, error: usuarioError } = await supabase
          .from("usuarios")
          .select(
            `
            id,
            nombre,
            telefono,
            direccion,
            documento,
            correo,
            rol,
            estado,
            organizacion_id
          `,
          )
          .eq("id", user.id)
          .single();

        if (usuarioError) {
          console.error(
            "❌ Error cargando usuario:",
            JSON.stringify(usuarioError, null, 2),
          );
          return;
        }

        console.log("✅ Usuario DB:", usuarioDB);

        setUsuario(usuarioDB);

        // ==========================================
        // 3. SUPER ADMIN
        // ==========================================

        if (usuarioDB.rol === "super_admin") {
          console.log("👑 Usuario Super Admin");
          setOrganizacion(null);
          return;
        }

        // ==========================================
        // 4. DETERMINAR ORGANIZACIÓN
        //
        // Puede venir de:
        //
        // A) usuarios.organizacion_id
        // B) usuarios_organizaciones
        //
        // Para administradores como Edith,
        // normalmente viene de B.
        // ==========================================

        let organizacionId = usuarioDB.organizacion_id || null;

        // ==========================================
        // 5. BUSCAR RELACIÓN USUARIO-ORGANIZACIÓN
        // ==========================================

        const { data: relacion, error: relacionError } = await supabase
          .from("usuarios_organizaciones")
          .select(
            `
            id,
            usuario_id,
            organizacion_id,
            rol,
            estado
          `,
          )
          .eq("usuario_id", user.id)
          .eq("estado", "activo")
          .order("id", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (relacionError) {
          console.error(
            "❌ Error buscando relación usuario-organización:",
            JSON.stringify(relacionError, null, 2),
          );
        } else if (relacion) {
          console.log("🔗 Relación encontrada:", relacion);

          // La relación tiene prioridad
          if (relacion.organizacion_id) {
            organizacionId = relacion.organizacion_id;
          }
        }

        // ==========================================
        // 6. VERIFICAR ORGANIZACIÓN
        // ==========================================

        if (!organizacionId) {
          console.warn("⚠️ El usuario no tiene organización asignada.");

          setOrganizacion(null);
          return;
        }

        console.log("🏢 ID organización:", organizacionId);

        // ==========================================
        // 7. OBTENER ORGANIZACIÓN MEDIANTE RPC
        // ==========================================

        const { data: organizacionDB, error: organizacionError } =
          await supabase.rpc("obtener_organizacion_por_id", {
            p_organizacion_id: organizacionId,
          });

        if (organizacionError) {
          console.error(
            "❌ Error cargando organización:",
            JSON.stringify(organizacionError, null, 2),
          );

          setOrganizacion(null);
          return;
        }

        // ==========================================
        // 8. EL RPC DEVUELVE UN ARRAY
        //
        // Convertimos el primer elemento en objeto
        // ==========================================

        const organizacionEncontrada = Array.isArray(organizacionDB)
          ? organizacionDB[0]
          : organizacionDB;

        if (!organizacionEncontrada) {
          console.warn("⚠️ No se encontró la organización:", organizacionId);

          setOrganizacion(null);
          return;
        }

        console.log("✅ Organización encontrada:", organizacionEncontrada);

        // ==========================================
        // 9. GUARDAR SOLO EL OBJETO
        // ==========================================

        setOrganizacion(organizacionEncontrada);
      } catch (error) {
        console.error("❌ Error cargando perfil:", error);
      }
    };

    cargarUsuario();
  }, []);

  // ==========================================
  // CERRAR AL HACER CLICK AFUERA
  // ==========================================

  useEffect(() => {
    const cerrarClickAfuera = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setAbierto(false);
      }
    };

    document.addEventListener("mousedown", cerrarClickAfuera);

    return () => {
      document.removeEventListener("mousedown", cerrarClickAfuera);
    };
  }, []);

  // ==========================================
  // DATOS VISUALES
  // ==========================================

  const inicial = usuario?.nombre
    ? usuario.nombre.charAt(0).toUpperCase()
    : "U";

  const rolTexto =
    usuario?.rol === "super_admin"
      ? "Super Administrador"
      : usuario?.rol === "admin"
        ? "Administrador"
        : usuario?.rol === "domiciliario"
          ? "Domiciliario"
          : "Usuario";

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="perfil-container" ref={menuRef}>
      {/* ICONO PERFIL */}

      <button
        className={`perfil-button ${abierto ? "activo" : ""}`}
        type="button"
        title="Perfil"
        onClick={() => setAbierto((prev) => !prev)}
      >
        <UserCircleIcon />
      </button>

      {/* MENÚ */}

      {abierto && (
        <div className="perfil-menu">
          {/* CABECERA */}

          <div className="perfil-header">
            <div className="perfil-avatar">{inicial}</div>

            <div className="perfil-identidad">
              <strong>{usuario?.nombre || "Cargando..."}</strong>

              <span>{rolTexto}</span>
            </div>
          </div>

          <div className="perfil-separador" />

          {/* INFORMACIÓN */}

          <div className="perfil-info">
            {/* DOCUMENTO */}

            <div className="perfil-dato">
              <div className="perfil-icono">
                <IdentificationIcon />
              </div>

              <div>
                <span>Documento</span>

                <strong>{usuario?.documento || "Cargando..."}</strong>
              </div>
            </div>

            {/* CORREO */}

            <div className="perfil-dato">
              <div className="perfil-icono">
                <EnvelopeIcon />
              </div>

              <div>
                <span>Correo</span>

                <strong>{usuario?.correo || "Cargando..."}</strong>
              </div>
            </div>

            {/* ORGANIZACIÓN */}

            <div className="perfil-dato">
              <div className="perfil-icono">
                <BuildingOffice2Icon />
              </div>

              <div>
                <span>Organización</span>

                <strong>{organizacion?.nombre ?? "Sin organización"}</strong>
              </div>
            </div>
          </div>

          <div className="perfil-separador" />

          {/* MI PERFIL */}

          <button className="perfil-opcion" type="button">
            <div>
              <UserCircleIcon />
              <span>Mi perfil</span>
            </div>

            <ChevronRightIcon />
          </button>

          {/* CONFIGURACIÓN */}

          <button
            className="perfil-opcion"
            type="button"
            onClick={() => {
              setAbierto(false);
              navigate("/configuracion-admin");
            }}
          >
            <div>
              <span className="perfil-config-icon">⚙</span>

              <span>Configuración</span>
            </div>

            <ChevronRightIcon />
          </button>
        </div>
      )}
    </div>
  );
}
