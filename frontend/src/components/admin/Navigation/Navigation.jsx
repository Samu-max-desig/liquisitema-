import { useEffect, useState } from "react";

import {
  HomeIcon,
  UsersIcon,
  BuildingOffice2Icon,
  ClockIcon,
  ExclamationCircleIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ArchiveBoxIcon,
  PhotoIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

import { supabase } from "../../../config/supabase";

import styles from "./Navigation.module.css";

const opciones = [
  {
    id: "inicio",
    nombre: "Inicio",
    icono: HomeIcon,
  },
  {
    id: "usuarios",
    nombre: "Usuarios",
    icono: UsersIcon,
  },
  {
    id: "historialDia",
    nombre: "Historial del día",
    icono: ClockIcon,
  },
  {
    id: "pendientes",
    nombre: "Pendientes",
    icono: ExclamationCircleIcon,
  },
  {
    id: "reportes",
    nombre: "Reportes",
    icono: DocumentTextIcon,
  },
  {
    id: "actividad",
    nombre: "Actividad",
    icono: ClipboardDocumentListIcon,
  },
  {
    id: "historialCierres",
    nombre: "Cierres",
    icono: ArchiveBoxIcon,
  },
  {
    id: "galeria",
    nombre: "Galería",
    icono: PhotoIcon,
  },
  {
    id: "organizaciones",
    nombre: "Organizaciones",
    icono: BuildingOffice2Icon,
  },
  {
    id: "configuracion",
    nombre: "Configuración",
    icono: Cog6ToothIcon,
  },

];

export default function Navigation({ seccionActiva, setSeccionActiva }) {
  const [hayPendientes, setHayPendientes] = useState(false);

  useEffect(() => {
    let activo = true;

    const revisarPendientes = async () => {
      const { data, error } = await supabase
        .from("pendientes")
        .select("id")
        .eq("estado", "pendiente")
        .limit(1);

      if (error) {
        console.error("Error revisando pendientes:", error);
        return;
      }

      if (activo) {
        setHayPendientes(data && data.length > 0);
      }
    };

    // Revisar inmediatamente
    revisarPendientes();

    // Revisar periódicamente para detectar nuevos pendientes
    const intervalo = setInterval(() => {
      revisarPendientes();
    }, 3000);

    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, []);

  return (
    <nav className={styles.navigation}>
      <div className={styles.navContainer}>
        {opciones.map((opcion) => {
          const Icon = opcion.icono;

          return (
            <button
              key={opcion.id}
              type="button"
              className={`${styles.navItem} ${seccionActiva === opcion.id ? styles.active : ""
                }`}
              onClick={() => setSeccionActiva(opcion.id)}
            >
              <Icon className={styles.icon} />

              <span>{opcion.nombre}</span>

              {opcion.id === "pendientes" && hayPendientes && (
                <span
                  className={styles.pendienteDot}
                  title="Hay pagos pendientes"
                ></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
