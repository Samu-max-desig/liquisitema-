import { useState } from "react";

import Sidebar from "../../components/admin/Sidebar/Sidebar";

import Inicio from "./Inicio/Inicio";
import Usuarios from "./Usuarios/Usuarios";
import Domicilios from "./Domicilios/Domicilios";
import Reportes from "./Reportes/Reportes";
import Configuracion from "./Configuracion/Configuracion";

import styles from "./AdminDashboard.module.css";

export default function AdminDashboard() {
  const [seccionActiva, setSeccionActiva] = useState("inicio");

  return (
    <div className={styles.dashboard}>
      <Sidebar
        seccionActiva={seccionActiva}
        setSeccionActiva={setSeccionActiva}
      />

      <main className={styles.content}>
        {seccionActiva === "inicio" && <Inicio />}
        {seccionActiva === "usuarios" && <Usuarios />}
        {seccionActiva === "domicilios" && <Domicilios />}
        {seccionActiva === "reportes" && <Reportes />}
        {seccionActiva === "configuracion" && <Configuracion />}
      </main>
    </div>
  );
}
