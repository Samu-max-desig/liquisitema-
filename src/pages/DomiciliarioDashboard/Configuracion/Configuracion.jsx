import styles from "./Configuracion.module.css";

export default function Configuracion() {
  return (
    <div className={styles.configContainer}>
      <div className={styles.header}>
        <h1>Configuración</h1>
        <p>Personaliza tu experiencia dentro de Liquisistema.</p>
      </div>

      <div className={styles.card}>
        <h2>Apariencia</h2>

        <div className={styles.option}>
          <div>
            <h3>Modo oscuro</h3>
            <p>Activa una interfaz oscura para trabajar más cómodo.</p>
          </div>

          <label className={styles.switch}>
            <input type="checkbox" />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>

      <div className={styles.card}>
        <h2>Información</h2>

        <div className={styles.infoBox}>
          <p>
            Las credenciales y contraseñas son administradas únicamente por el
            administrador del sistema.
          </p>

          <p>
            Si necesitas actualizar datos personales o recuperar acceso,
            comunícate con el administrador.
          </p>
        </div>
      </div>

      <div className={styles.card}>
        <h2>Versión del sistema</h2>

        <div className={styles.version}>
          <span>Liquisistema</span>
          <strong>v1.0.0</strong>
        </div>
      </div>
    </div>
  );
}