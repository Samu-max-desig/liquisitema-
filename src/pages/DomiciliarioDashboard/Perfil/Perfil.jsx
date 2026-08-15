import styles from "./Perfil.module.css";
import { useEffect, useState } from "react";
import { supabase } from "../../../config/supabase";
export default function Perfil({ usuario }) {
    const [stats, setStats] = useState({
  realizados: 0,
  recaudado: 0,
  cancelados: 0,
  pendientes: 0,
  reportados: 0,
});
useEffect(() => {
  cargarEstadisticas();
}, []);
const cargarEstadisticas = async () => {
  const { data, error } = await supabase
    .from("domicilios")
    .select("*")
    .eq("domiciliario_id", usuario.id);

  if (error) {
    console.error(error);
    return;
  }

  const realizados = data.length;

  const recaudado = data.reduce(
    (acc, item) => acc + Number(item.costo || 0),
    0
  );

  const cancelados = data.filter(
    (item) => item.estado === "Cancelado"
  ).length;

  const pendientes = data.filter(
    (item) => item.estado === "Pendiente"
  ).length;

  const reportados = data.filter(
    (item) => item.estado === "Reportado"
  ).length;

  setStats({
    realizados,
    recaudado,
    cancelados,
    pendientes,
    reportados,
  });
};
  return (
    <div className={styles.perfilContainer}>
      <div className={styles.perfilHeader}>
        <h1>Mi Perfil</h1>
        <p>Información personal y estadísticas del domiciliario.</p>
      </div>

      <div className={styles.perfilGrid}>
        <div className={styles.card}>
          <span>Nombre</span>
          <h3>{usuario?.nombre}</h3>
        </div>

        <div className={styles.card}>
          <span>Documento</span>
          <h3>{usuario?.documento}</h3>
        </div>

        <div className={styles.card}>
          <span>Correo</span>
          <h3>{usuario?.correo}</h3>
        </div>

        <div className={styles.card}>
          <span>Teléfono</span>
          <h3>{usuario?.telefono}</h3>
        </div>

        <div className={styles.card}>
          <span>Rol</span>
          <h3>{usuario?.rol}</h3>
        </div>

        <div className={styles.card}>
          <span>Estado</span>
          <h3>Activo</h3>
        </div>
      </div>

      <div className={styles.section}>
        <h2>📊 Estadísticas del día</h2>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span>Domicilios realizados</span>
            {stats.realizados}
          </div>

          <div className={styles.statCard}>
            <span>Total recaudado</span>
            ${stats.recaudado.toLocaleString("es-CO")}
          </div>

          <div className={styles.statCard}>
            <span>Propinas</span>
            <h3>$0</h3>
          </div>

          <div className={styles.statCard}>
            <span>Cancelados</span>
            <h3>{stats.cancelados}</h3>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Información</h2>

        <div className={styles.infoBox}>
          <p>
            Las contraseñas y credenciales son administradas únicamente por el
            administrador del sistema.
          </p>

          <p>
            Si necesitas actualizar información personal debes comunicarte con
            el administrador.
          </p>
        </div>
      </div>
    </div>
  );
}