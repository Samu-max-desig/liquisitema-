import {
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

import { useNavigate } from "react-router-dom";

import styles from "./Header.module.css";

export default function Header() {
  const navigate = useNavigate();

  const cerrarSesion = () => {
    localStorage.removeItem("usuario");
    navigate("/");
  };

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <h1>Liquisistema</h1>
        <span>Panel administrativo</span>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.actionButton}
          type="button"
          title="Notificaciones"
        >
          <BellIcon />
          <span className={styles.notificationDot}></span>
        </button>

        <button className={styles.actionButton} type="button" title="Perfil">
          <UserCircleIcon />
        </button>

        <button
          className={styles.actionButton}
          type="button"
          title="Cerrar sesión"
          onClick={cerrarSesion}
        >
          <ArrowRightOnRectangleIcon />
        </button>
      </div>
    </header>
  );
}
