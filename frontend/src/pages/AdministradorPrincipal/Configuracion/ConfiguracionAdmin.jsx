import { useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  BellIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
  PaintBrushIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import SoporteDiagnostico from "./Secciones/SoporteDiagnostico";
import styles from "./ConfiguracionAdmin.module.css";
import Notificaciones from "./Secciones/Notificaciones";
import PreferenciasTrabajo from "./Secciones/PreferenciasTrabajo";
import Seguridad from "./Secciones/Seguridad";
const secciones = [
  {
    id: "preferencias",
    titulo: "Preferencias de trabajo",
    descripcion:
      "Configura horarios de trabajo y las preferencias que utilizará el sistema para tus estadísticas.",
    icono: AdjustmentsHorizontalIcon,
  },
  {
    id: "notificaciones",
    titulo: "Notificaciones",
    descripcion:
      "Controla avisos de actividad, pendientes, reportes, cierres, comprobantes y sonidos.",
    icono: BellIcon,
  },
  {
    id: "seguridad",
    titulo: "Seguridad",
    descripcion:
      "Administra tu contraseña y las opciones básicas de seguridad de acceso.",
    icono: ShieldCheckIcon,
  },
  {
    id: "soporte",
    titulo: "Soporte y diagnóstico",
    descripcion:
      "Revisa el estado del sistema y encuentra posibles problemas de conexión o funcionamiento.",
    icono: WrenchScrewdriverIcon,
  },
  {
    id: "apariencia",
    titulo: "Apariencia",
    descripcion:
      "Personaliza el estilo, los colores y la forma en que se presenta tu panel.",
    icono: PaintBrushIcon,
  },
];

function ConfiguracionAdmin() {
  const navigate = useNavigate();

  const [seccionActiva, setSeccionActiva] = useState(null);

  const volverAConfiguracion = () => {
    setSeccionActiva(null);
  };

  const renderSeccion = () => {
    switch (seccionActiva) {
      case "preferencias":
        return <PreferenciasTrabajo />;

      case "notificaciones":
        return <Notificaciones />;
      case "seguridad":
        return <Seguridad />;
      case "soporte":
        return <SoporteDiagnostico />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.contenedor}>
      {/* ==========================================
          ENCABEZADO
          ========================================== */}

      <header className={styles.encabezado}>
        <button
          type="button"
          className={styles.botonVolver}
          onClick={() => navigate("/admin")}
        >
          <ArrowLeftIcon />
          <span>Volver al panel</span>
        </button>

        <div>
          <span className={styles.etiqueta}>ADMINISTRACIÓN</span>

          <h1>Configuración</h1>

          <p>
            Personaliza el funcionamiento y la experiencia de tu organización.
          </p>
        </div>
      </header>

      {/* ==========================================
          VISTA PRINCIPAL
          ========================================== */}

      {!seccionActiva && (
        <main className={styles.contenido}>
          <div className={styles.introduccion}>
            <h2>Configuración del sistema</h2>

            <p>
              Selecciona una sección para administrar las preferencias de tu
              panel.
            </p>
          </div>

          <div className={styles.grid}>
            {secciones.map((seccion) => {
              const Icono = seccion.icono;

              return (
                <button
                  key={seccion.id}
                  type="button"
                  className={styles.tarjeta}
                  onClick={() => setSeccionActiva(seccion.id)}
                >
                  <div className={styles.tarjetaSuperior}>
                    <div className={styles.icono}>
                      <Icono />
                    </div>

                    <ChevronRightIcon className={styles.flecha} />
                  </div>

                  <div className={styles.tarjetaTexto}>
                    <h3>{seccion.titulo}</h3>

                    <p>{seccion.descripcion}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </main>
      )}

      {/* ==========================================
          SECCIÓN ACTIVA
          ========================================== */}

      {seccionActiva && (
        <main className={styles.seccionActiva}>
          <button
            type="button"
            className={styles.botonRegresar}
            onClick={volverAConfiguracion}
          >
            <ArrowLeftIcon />
            <span>Configuración</span>
          </button>

          {renderSeccion()}
        </main>
      )}
    </div>
  );
}

export default ConfiguracionAdmin;
