import styles from "./Sidebar.module.css";
import {
  HomeIcon,
  UsersIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
export default function Sidebar({ seccionActiva, setSeccionActiva }) {
  const navigate = useNavigate();
  const cerrarSesion = () => {
    localStorage.removeItem("usuario");
    navigate("/");
  };
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <h2>Liquisistema</h2>
      </div>

      <nav className={styles.menu}>
        <button
          className={seccionActiva === "inicio" ? styles.active : ""}
          onClick={() => setSeccionActiva("inicio")}
        >
          <HomeIcon className={styles.icon} />
          Inicio
        </button>

        <button
          className={seccionActiva === "usuarios" ? styles.active : ""}
          onClick={() => setSeccionActiva("usuarios")}
        >
          <UsersIcon className={styles.icon} />
          Usuarios
        </button>

        <button
          className={seccionActiva === "domicilios" ? styles.active : ""}
          onClick={() => setSeccionActiva("domicilios")}
        >
          <TruckIcon className={styles.icon} />
          Domicilios
        </button>

        <button
          className={seccionActiva === "reportes" ? styles.active : ""}
          onClick={() => setSeccionActiva("reportes")}
        >
          <ClipboardDocumentListIcon className={styles.icon} />
          Reportes
        </button>

        <button
          className={seccionActiva === "configuracion" ? styles.active : ""}
          onClick={() => setSeccionActiva("configuracion")}
        >
          <Cog6ToothIcon className={styles.icon} />
          Configuración
        </button>
      </nav>

      <button className={styles.logout} onClick={cerrarSesion}>
        <ArrowLeftOnRectangleIcon className={styles.icon} />
        Cerrar Sesión
      </button>
    </aside>
  );
}
