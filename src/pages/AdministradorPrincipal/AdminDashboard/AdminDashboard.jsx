import { useState } from "react";

import Header from "../../../components/admin/Header/Header";
import Navigation from "../../../components/admin/Navigation/Navigation";

import AdminInicio from "../Inicio/AdminInicio";
import Usuarios from "../Usuarios/Usuarios";
import HistorialDia from "../HistorialDia/HistorialDia";
import Pendientes from "../Pendientes/Pendientes";
import Abonos from "../Abonos/Abonos";
import Reportes from "../Reportes/Reportes";
import Actividad from "../Actividad/Actividad";
import HistorialCierres from "../HistorialCierres/HistorialCierres";
import Galeria from "../Galeria/Galeria";
import AdminConfiguracion from "../Configuracion/AdminConfiguracion";

import styles from "./AdminDashboard.module.css";

export default function AdminDashboard() {
  const [seccionActiva, setSeccionActiva] = useState("inicio");

  const renderizarSeccion = () => {
    switch (seccionActiva) {
      case "inicio":
        return <AdminInicio />;

      case "usuarios":
        return <Usuarios />;

      case "historialDia":
        return <HistorialDia />;

      case "pendientes":
        return <Pendientes />;

      case "abonos":
        return <Abonos />;

      case "reportes":
        return <Reportes />;

      case "actividad":
        return <Actividad />;

      case "historialCierres":
        return <HistorialCierres />;

      case "galeria":
        return <Galeria />;

      case "configuracion":
        return <AdminConfiguracion />;

      default:
        return <AdminInicio />;
    }
  };

  return (
    <div className={styles.dashboard}>
      <Header />

      <Navigation
        seccionActiva={seccionActiva}
        setSeccionActiva={setSeccionActiva}
      />

      <main className={styles.content}>{renderizarSeccion()}</main>
    </div>
  );
}
