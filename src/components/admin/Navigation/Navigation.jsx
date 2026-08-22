import {
  HomeIcon,
  UsersIcon,
  ClockIcon,
  ExclamationCircleIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ArchiveBoxIcon,
  PhotoIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

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
    id: "abonos",
    nombre: "Abonos",
    icono: BanknotesIcon,
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
    id: "configuracion",
    nombre: "Configuración",
    icono: Cog6ToothIcon,
  },
];

export default function Navigation({ seccionActiva, setSeccionActiva }) {
  return (
    <nav className={styles.navigation}>
      <div className={styles.navContainer}>
        {opciones.map((opcion) => {
          const Icon = opcion.icono;

          return (
            <button
              key={opcion.id}
              type="button"
              className={`${styles.navItem} ${
                seccionActiva === opcion.id ? styles.active : ""
              }`}
              onClick={() => setSeccionActiva(opcion.id)}
            >
              <Icon className={styles.icon} />

              <span>{opcion.nombre}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
