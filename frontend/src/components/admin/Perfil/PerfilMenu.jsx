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

export default function PerfilMenu() {
  const [abierto, setAbierto] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [organizacion, setOrganizacion] = useState(null);

  const menuRef = useRef(null);

  // ==========================================
  // CARGAR USUARIO Y ORGANIZACIÓN ACTUAL
  // ==========================================

  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        // ==========================================
        // 1. OBTENER USUARIO AUTENTICADO
        // ==========================================

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error("No hay usuario autenticado:", authError);
          return;
        }

        console.log("Usuario Auth:", user.id);

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
            estado
          `,
          )
          .eq("id", user.id)
          .single();

        if (usuarioError) {
          console.error(
            "Error cargando usuario:",
            JSON.stringify(usuarioError, null, 2),
          );
          return;
        }

        console.log("Usuario DB:", usuarioDB);

        setUsuario(usuarioDB);

        // ==========================================
        // 3. SUPER ADMIN
        // ==========================================

        if (usuarioDB.rol === "super_admin") {
          setOrganizacion(null);
          return;
        }

        // ==========================================
        // 4. BUSCAR ORGANIZACIÓN MEDIANTE
        // usuarios_organizaciones
        // ==========================================

        const { data: relacion, error: relacionError } = await supabase
          .from("usuarios_organizaciones")
          .select(
            `
            organizacion_id,
            rol,
            estado,
            organizaciones (
              id,
              nombre,
              nit,
              organizacion_principal_id
            )
          `,
          )
          .eq("usuario_id", user.id)
          .eq("estado", "activo")
          .limit(1)
          .maybeSingle();

        if (relacionError) {
          console.error(
            "Error cargando relación usuario-organización:",
            JSON.stringify(relacionError, null, 2),
          );

          setOrganizacion(null);
          return;
        }

        console.log("Relación usuario-organización:", relacion);

        // ==========================================
        // 5. VERIFICAR QUE EXISTA ORGANIZACIÓN
        // ==========================================

        if (!relacion?.organizaciones) {
          console.warn("El usuario no tiene una organización activa asignada.");

          setOrganizacion(null);
          return;
        }

        // ==========================================
        // 6. GUARDAR ORGANIZACIÓN
        // ==========================================

        const organizacionDB = relacion.organizaciones;

        console.log("Organización actual:", organizacionDB);
        console.log(
          "Organización primaria:",
          organizacionDB.organizacion_principal_id,
        );

        setOrganizacion(organizacionDB);
      } catch (error) {
        console.error("Error cargando perfil:", error);
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

  return (
    <div className="perfil-container" ref={menuRef}>
      {/* ICONO ORIGINAL 👤 */}

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

                <strong>
                  {organizacion?.nombre ||
                    (usuario?.rol === "super_admin"
                      ? "Panel general"
                      : "Sin organización")}
                </strong>
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

          <button className="perfil-opcion" type="button">
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
