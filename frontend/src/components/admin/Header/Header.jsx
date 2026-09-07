import {
  BellIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

import styles from "./Header.module.css";
import PerfilMenu from "../Perfil/PerfilMenu";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <h1>Liquisistema</h1>
        <span>Panel administrativo</span>
      </div>

      <div className={styles.actions}>
        {/* NOTIFICACIONES */}
        <button
          className={styles.actionButton}
          type="button"
          title="Notificaciones"
        >
          <BellIcon />

          <span className={styles.notificationDot}></span>
        </button>

        {/* PERFIL 👤 */}
        <PerfilMenu />

        {/* CERRAR SESIÓN 🚪 */}
        <button
          className={styles.actionButton}
          type="button"
          title="Cerrar sesión"
          onClick={() => {
            localStorage.removeItem("usuario");
            window.location.href = "/";
          }}
        >
          <ArrowRightOnRectangleIcon />
        </button>
      </div>
    </header>
  );
}
