import { useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  TruckIcon,
  CreditCardIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import {
  obtenerActividades,
} from "../../../services/actividadService";

import styles from "./Actividad.module.css";

export default function Actividad() {
  const [actividades, setActividades] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [fechaFiltro, setFechaFiltro] = useState("");

  // ==========================================
  // CARGAR ACTIVIDADES
  // ==========================================

  const cargarActividades = async () => {
    setCargando(true);

    const { data, error } =
      await obtenerActividades();

    if (error) {
      console.error(
        "Error cargando actividades:",
        error,
      );

      setActividades([]);
    } else {
      setActividades(data || []);
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarActividades();
  }, []);

  // ==========================================
  // FILTRAR ACTIVIDADES
  // ==========================================

  const actividadesFiltradas = useMemo(() => {
    return actividades.filter((actividad) => {
      const nombreUsuario =
        actividad.usuarios?.nombre?.toLowerCase() || "";

      const textoActividad =
        `${actividad.accion || ""} ${
          actividad.descripcion || ""
        }`.toLowerCase();

      const textoBusqueda =
        busqueda.toLowerCase().trim();

      const coincideBusqueda =
        !textoBusqueda ||
        nombreUsuario.includes(textoBusqueda) ||
        textoActividad.includes(textoBusqueda);

      const coincideTipo =
        tipoFiltro === "todos" ||
        actividad.tipo === tipoFiltro;

      const fechaActividad = actividad.created_at
        ? new Date(actividad.created_at)
            .toISOString()
            .split("T")[0]
        : "";

      const coincideFecha =
        !fechaFiltro ||
        fechaActividad === fechaFiltro;

      return (
        coincideBusqueda &&
        coincideTipo &&
        coincideFecha
      );
    });
  }, [
    actividades,
    busqueda,
    tipoFiltro,
    fechaFiltro,
  ]);

  // ==========================================
  // LIMPIAR FILTROS
  // ==========================================

  const limpiarFiltros = () => {
    setBusqueda("");
    setTipoFiltro("todos");
    setFechaFiltro("");
  };

  const hayFiltros =
    busqueda ||
    tipoFiltro !== "todos" ||
    fechaFiltro;

  // ==========================================
  // ICONO SEGÚN EL TIPO
  // ==========================================

  const obtenerIcono = (tipo) => {
    switch (tipo) {
      case "domicilio":
        return <TruckIcon />;

      case "pago":
        return <CreditCardIcon />;

      case "reporte":
        return <DocumentTextIcon />;

      case "usuario":
        return <UserIcon />;

      case "configuracion":
        return <Cog6ToothIcon />;

      case "sistema":
        return (
          <ArrowRightStartOnRectangleIcon />
        );

      case "cierre":
        return <ClipboardDocumentListIcon />;

      default:
        return <ClipboardDocumentListIcon />;
    }
  };

  // ==========================================
  // NOMBRE DEL TIPO
  // ==========================================

  const obtenerNombreTipo = (tipo) => {
    switch (tipo) {
      case "domicilio":
        return "Domicilio";

      case "pago":
        return "Pago";

      case "reporte":
        return "Reporte";

      case "usuario":
        return "Usuario";

      case "configuracion":
        return "Configuración";

      case "sistema":
        return "Sistema";

      case "cierre":
        return "Cierre";

      default:
        return "Actividad";
    }
  };

  // ==========================================
  // FORMATEAR FECHA
  // ==========================================

  const formatearFecha = (fecha) => {
    if (!fecha) return "Sin fecha";

    return new Date(fecha).toLocaleString(
      "es-CO",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );
  };

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  const totalActividades =
    actividadesFiltradas.length;

  const actividadesDomicilios =
    actividadesFiltradas.filter(
      (actividad) =>
        actividad.tipo === "domicilio",
    ).length;

  const actividadesPagos =
    actividadesFiltradas.filter(
      (actividad) =>
        actividad.tipo === "pago",
    ).length;

  const actividadesCierres =
    actividadesFiltradas.filter(
      (actividad) =>
        actividad.tipo === "cierre",
    ).length;

  return (
    <div className={styles.contenedor}>
      {/* =====================================
          ENCABEZADO
          ===================================== */}

      <div className={styles.encabezado}>
        <div>
          <h1>Actividad</h1>

          <p>
            Historial de acciones realizadas en
            Liquisistema.
          </p>
        </div>

        <div className={styles.contador}>
          <ClipboardDocumentListIcon />

          <strong>{totalActividades}</strong>

          <span>
            actividad
            {totalActividades !== 1
              ? "es"
              : ""}
          </span>
        </div>
      </div>

      {/* =====================================
          ESTADÍSTICAS
          ===================================== */}

      <div className={styles.estadisticas}>
        <div className={styles.estadistica}>
          <div className={styles.estadisticaIcono}>
            <ClipboardDocumentListIcon />
          </div>

          <div>
            <span>Total</span>
            <strong>
              {totalActividades}
            </strong>
          </div>
        </div>

        <div className={styles.estadistica}>
          <div className={styles.estadisticaIcono}>
            <TruckIcon />
          </div>

          <div>
            <span>Domicilios</span>
            <strong>
              {actividadesDomicilios}
            </strong>
          </div>
        </div>

        <div className={styles.estadistica}>
          <div className={styles.estadisticaIcono}>
            <CreditCardIcon />
          </div>

          <div>
            <span>Pagos</span>
            <strong>
              {actividadesPagos}
            </strong>
          </div>
        </div>

        <div className={styles.estadistica}>
          <div className={styles.estadisticaIcono}>
            <CalendarDaysIcon />
          </div>

          <div>
            <span>Cierres</span>
            <strong>
              {actividadesCierres}
            </strong>
          </div>
        </div>
      </div>

      {/* =====================================
          FILTROS
          ===================================== */}

      <div className={styles.filtros}>
        <div className={styles.buscador}>
          <MagnifyingGlassIcon />

          <input
            type="text"
            placeholder="Buscar actividad..."
            value={busqueda}
            onChange={(e) =>
              setBusqueda(e.target.value)
            }
          />
        </div>

        <div className={styles.selectWrapper}>
          <select
            value={tipoFiltro}
            onChange={(e) =>
              setTipoFiltro(e.target.value)
            }
          >
            <option value="todos">
              Todos los tipos
            </option>

            <option value="domicilio">
              Domicilios
            </option>

            <option value="pago">
              Pagos
            </option>

            <option value="reporte">
              Reportes
            </option>

            <option value="usuario">
              Usuarios
            </option>

            <option value="cierre">
              Cierres
            </option>

            <option value="configuracion">
              Configuración
            </option>

            <option value="sistema">
              Sistema
            </option>
          </select>
        </div>

        <div className={styles.fecha}>
          <CalendarDaysIcon />

          <input
            type="date"
            value={fechaFiltro}
            onChange={(e) =>
              setFechaFiltro(e.target.value)
            }
          />
        </div>

        {hayFiltros && (
          <button
            className={styles.btnLimpiar}
            onClick={limpiarFiltros}
          >
            <XMarkIcon />
            Limpiar
          </button>
        )}
      </div>

      {/* =====================================
          ACTIVIDADES
          ===================================== */}

      {cargando ? (
        <div className={styles.estado}>
          <div className={styles.spinner}></div>

          <p>
            Cargando actividades...
          </p>
        </div>
      ) : actividadesFiltradas.length ===
        0 ? (
        <div className={styles.vacio}>
          <ClipboardDocumentListIcon />

          <h2>
            No hay actividades
          </h2>

          <p>
            {hayFiltros
              ? "No encontramos actividades con esos filtros."
              : "Todavía no se han registrado actividades."}
          </p>
        </div>
      ) : (
        <div className={styles.lista}>
          {actividadesFiltradas.map(
            (actividad) => (
              <div
                key={actividad.id}
                className={styles.actividad}
              >
                {/* Línea de tiempo */}

                <div
                  className={styles.linea}
                ></div>

                {/* Icono */}

                <div className={styles.icono}>
                  {obtenerIcono(
                    actividad.tipo,
                  )}
                </div>

                {/* Contenido */}

                <div
                  className={
                    styles.contenido
                  }
                >
                  <div
                    className={
                      styles.parteSuperior
                    }
                  >
                    <div>
                      <h3>
                        {actividad.accion ||
                          "Actividad"}
                      </h3>

                      <span
                        className={
                          styles.tipo
                        }
                      >
                        {obtenerNombreTipo(
                          actividad.tipo,
                        )}
                      </span>
                    </div>

                    <time>
                      {formatearFecha(
                        actividad.created_at,
                      )}
                    </time>
                  </div>

                  <p>
                    {actividad.descripcion ||
                      "Sin descripción."}
                  </p>

                  <div
                    className={
                      styles.usuario
                    }
                  >
                    <UserIcon />

                    <span>
                      {actividad.usuarios
                        ?.nombre ||
                        "Usuario del sistema"}
                    </span>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}