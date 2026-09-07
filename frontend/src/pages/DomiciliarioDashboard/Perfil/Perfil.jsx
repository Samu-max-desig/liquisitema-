import styles from "./Perfil.module.css";
import { useEffect, useState } from "react";
import { supabase } from "../../../config/supabase";
import {
  UserCircleIcon,
  IdentificationIcon,
  EnvelopeIcon,
  PhoneIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  TruckIcon,
  BanknotesIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
export default function Perfil({ usuario }) {
  const [actividadSemanal, setActividadSemanal] = useState({
    Lun: 0,
    Mar: 0,
    Mie: 0,
    Jue: 0,
    Vie: 0,
    Sab: 0,
    Dom: 0,
  });
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
    const dias = {
      Lun: 0,
      Mar: 0,
      Mie: 0,
      Jue: 0,
      Vie: 0,
      Sab: 0,
      Dom: 0,
    };

    data.forEach((domicilio) => {
      const fecha = new Date(domicilio.created_at);

      const nombresDias = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

      const dia = nombresDias[fecha.getDay()];

      dias[dia]++;
    });

    setActividadSemanal(dias);
    if (error) {
      console.error(error);
      return;
    }

    const realizados = data.length;

    const recaudado = data.reduce(
      (acc, item) => acc + Number(item.costo || 0),
      0,
    );

    const cancelados = data.filter(
      (item) => item.estado === "Cancelado",
    ).length;

    const pendientes = data.filter(
      (item) => item.estado === "Pendiente",
    ).length;

    const reportados = data.filter(
      (item) => item.estado === "Reportado",
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
        <div
          className={styles.perfilAvatar}
          onClick={() => document.getElementById("perfilInput").click()}
        >
          <UserCircleIcon className={styles.avatarIcon} />

          <div className={styles.avatarOverlay}>
            <PhotoIcon className={styles.avatarUploadIcon} />
          </div>
        </div>

        <input
          type="file"
          accept="image/*"
          id="perfilInput"
          style={{ display: "none" }}
        />
        <h1>{usuario?.nombre}</h1>
        <div className={styles.bubble1}></div>
        <div className={styles.bubble2}></div>
        <div className={styles.bubble3}></div>
        <div className={styles.bubble4}></div>
        <span className={styles.estado}>Activo</span>
      </div>
      <div className={styles.perfilContenido}>
        <div className={styles.datosCard}>
          <h2>Datos Personales</h2>

          <div className={styles.datoItem}>
            <span>Nombre</span>
            <p>{usuario?.nombre || "No registrado"}</p>
          </div>

          <div className={styles.datoItem}>
            <span>Documento</span>
            <p>{usuario?.documento || "No registrado"}</p>
          </div>

          <div className={styles.datoItem}>
            <span>Correo</span>
            <p>{usuario?.correo || "No registrado"}</p>
          </div>

          <div className={styles.datoItem}>
            <span>Teléfono</span>
            <p>{usuario?.telefono || "No registrado"}</p>
          </div>

          <div className={styles.datoItem}>
            <span>Dirección</span>
            <p>{usuario?.direccion || "No registrada"}</p>
          </div>

          <div className={styles.datoItem}>
            <span>Rol</span>
            <p>{usuario?.rol || "No registrado"}</p>
          </div>
        </div>

        <div className={styles.resumenContainer}>
          <div className={styles.resumenCard}>
            <span>Domicilios</span>
            <h3>{stats.realizados}</h3>
          </div>

          <div className={styles.resumenCard}>
            <span>Recaudado</span>
            <h3>${stats.recaudado.toLocaleString("es-CO")}</h3>
          </div>

          <div className={styles.resumenCard}>
            <span>Reportados</span>
            <h3>{stats.reportados}</h3>
          </div>
          <div className={styles.graficaCard}>
            <h3>Actividad semanal</h3>

            {Object.entries(actividadSemanal).map(([dia, cantidad]) => {
              const maximo = Math.max(...Object.values(actividadSemanal), 1);

              return (
                <div key={dia} className={styles.barraItem}>
                  <span>{dia}</span>

                  <div className={styles.barra}>
                    <div
                      className={styles.barraFill}
                      style={{
                        width: `${(cantidad / maximo) * 100}%`,
                      }}
                    ></div>
                  </div>

                  <small>{cantidad}</small>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
