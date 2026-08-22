import { useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ClockIcon,
  UserGroupIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

import { supabase } from "../../../config/supabase";

import styles from "./HistorialDia.module.css";

export default function HistorialDia() {
  const [domicilios, setDomicilios] = useState([]);
  const [domiciliarios, setDomiciliarios] = useState([]);

  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [domiciliarioFiltro, setDomiciliarioFiltro] = useState("todos");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [metodoFiltro, setMetodoFiltro] = useState("todos");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
  setCargando(true);
const {
  data: { user },
} = await supabase.auth.getUser();

console.log("USUARIO AUTH:", user);
  try {
    const hoy = new Date().toISOString().split("T")[0];

    // 1. Cargar domicilios del día
    const { data: listaDomicilios, error: errorDomicilios } =
      await supabase
        .from("domicilios")
        .select("*")
        .eq("fecha", hoy)
        .order("created_at", { ascending: false });

    if (errorDomicilios) {
      console.error("Error cargando historial:", errorDomicilios);
      setDomicilios([]);
      setDomiciliarios([]);
      return;
    }

    const domiciliosDelDia = listaDomicilios || [];

    // 2. Obtener únicamente los IDs de domiciliarios
    // que realmente aparecen en los domicilios de hoy
    const idsDomiciliarios = [
      ...new Set(
        domiciliosDelDia
          .map((domicilio) => domicilio.domiciliario_id)
          .filter(Boolean),
      ),
    ];

    let listaUsuarios = [];

    // 3. Buscar esos usuarios en la tabla usuarios
    if (idsDomiciliarios.length > 0) {
      const { data: usuarios, error: errorUsuarios } = await supabase
        .from("usuarios")
        .select("id, nombre, rol, estado")
        .in("id", idsDomiciliarios);

      if (errorUsuarios) {
        console.error(
          "Error cargando domiciliarios:",
          errorUsuarios,
        );
      } else {
        listaUsuarios = usuarios || [];
      }
    }

    // DEBUG TEMPORAL
    console.log("DOMICILIOS DEL DÍA:", domiciliosDelDia);
    console.log("IDS DE DOMICILIARIOS:", idsDomiciliarios);
    console.log("USUARIOS ENCONTRADOS:", listaUsuarios);

    setDomicilios(domiciliosDelDia);
    setDomiciliarios(listaUsuarios);
  } catch (error) {
    console.error("Error general cargando historial:", error);

    setDomicilios([]);
    setDomiciliarios([]);
  } finally {
    setCargando(false);
  }
  
};


  const obtenerNombreDomiciliario = (id) => {
    const usuario = domiciliarios.find((item) => item.id === id);

    return usuario?.nombre || "Sin asignar";
  };

  const formatearHora = (fecha) => {
    if (!fecha) return "--:--";

    return new Date(fecha).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatoDinero = (valor) => {
    return `$${Number(valor || 0).toLocaleString("es-CO")}`;
  };

  const domiciliosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return domicilios.filter((domicilio) => {
      const coincideBusqueda =
        !texto ||
        domicilio.cliente?.toLowerCase().includes(texto) ||
        domicilio.telefono?.toLowerCase().includes(texto) ||
        domicilio.direccion?.toLowerCase().includes(texto) ||
        domicilio.numero_factura?.toLowerCase().includes(texto);

      const coincideDomiciliario =
        domiciliarioFiltro === "todos" ||
        domicilio.domiciliario_id === domiciliarioFiltro;

      const coincideEstado =
        estadoFiltro === "todos" ||
        domicilio.estado === estadoFiltro;

      const coincideMetodo =
        metodoFiltro === "todos" ||
        domicilio.metodo_pago === metodoFiltro;

      return (
        coincideBusqueda &&
        coincideDomiciliario &&
        coincideEstado &&
        coincideMetodo
      );
    });
  }, [
    domicilios,
    domiciliarioFiltro,
    estadoFiltro,
    metodoFiltro,
    busqueda,
  ]);

  const estadisticas = useMemo(() => {
    const total = domiciliosFiltrados.length;

    const pagados = domiciliosFiltrados.filter(
      (item) => item.estado === "Pagado",
    ).length;

    const pendientes = domiciliosFiltrados.filter(
      (item) => item.estado === "Pendiente",
    ).length;

    const recaudado = domiciliosFiltrados
      .filter((item) => item.estado === "Pagado")
      .reduce((total, item) => total + Number(item.costo || 0), 0);

    return {
      total,
      pagados,
      pendientes,
      recaudado,
    };
  }, [domiciliosFiltrados]);

  return (
    <div className={styles.historialDia}>
      {/* HEADER */}

      <div className={styles.historialDiaHeader}>
        <div>
          <h1>Historial del día</h1>
          <p>
            Consulta los movimientos registrados durante la jornada.
          </p>
        </div>

        <div className={styles.historialDiaFecha}>
          <ClockIcon />
          {new Date().toLocaleDateString("es-CO", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
      </div>

      {/* RESUMEN */}

      <section className={styles.historialDiaResumen}>
        <div className={styles.historialDiaResumenCard}>
          <div className={styles.historialDiaResumenIcon}>
            <UserGroupIcon />
          </div>

          <div>
            <span>Domicilios</span>
            <strong>{cargando ? "..." : estadisticas.total}</strong>
          </div>
        </div>

        <div className={styles.historialDiaResumenCard}>
          <div className={styles.historialDiaResumenIcon}>
            <CheckCircleIcon />
          </div>

          <div>
            <span>Pagados</span>
            <strong>{cargando ? "..." : estadisticas.pagados}</strong>
          </div>
        </div>

        <div className={styles.historialDiaResumenCard}>
          <div className={styles.historialDiaResumenIcon}>
            <ExclamationCircleIcon />
          </div>

          <div>
            <span>Pendientes</span>
            <strong>{cargando ? "..." : estadisticas.pendientes}</strong>
          </div>
        </div>

        <div className={styles.historialDiaResumenCard}>
          <div className={styles.historialDiaResumenIcon}>
            <BanknotesIcon />
          </div>

          <div>
            <span>Recaudado</span>
            <strong>
              {cargando ? "..." : formatoDinero(estadisticas.recaudado)}
            </strong>
          </div>
        </div>
      </section>

      {/* FILTROS */}

      <section className={styles.historialDiaPanel}>
        <div className={styles.historialDiaFiltrosHeader}>
          <div>
            <h2>Movimientos</h2>
            <p>Filtra los domicilios registrados durante el día.</p>
          </div>

          <FunnelIcon />
        </div>

        <div className={styles.historialDiaFiltros}>
          <div className={styles.historialDiaBusqueda}>
            <MagnifyingGlassIcon />

            <input
              type="text"
              placeholder="Buscar cliente, teléfono, dirección..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <select
            value={domiciliarioFiltro}
            onChange={(e) => setDomiciliarioFiltro(e.target.value)}
          >
            <option value="todos">Todos los domiciliarios</option>

            {domiciliarios.map((domiciliario) => (
              <option key={domiciliario.id} value={domiciliario.id}>
                {domiciliario.nombre}
              </option>
            ))}
          </select>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
          >
            <option value="todos">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Pagado">Pagado</option>
          </select>

          <select
            value={metodoFiltro}
            onChange={(e) => setMetodoFiltro(e.target.value)}
          >
            <option value="todos">Todos los métodos</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Datáfono">Datáfono</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
      </section>

      {/* TABLA */}

      <section className={styles.historialDiaTablaPanel}>
        <div className={styles.historialDiaTablaWrapper}>
          <table className={styles.historialDiaTabla}>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Domiciliario</th>
                <th>Dirección</th>
                <th>Costo</th>
                <th>Método</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody>
              {cargando ? (
                <tr>
                  <td
                    colSpan="7"
                    className={styles.historialDiaTablaVacia}
                  >
                    Cargando historial...
                  </td>
                </tr>
              ) : domiciliosFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className={styles.historialDiaTablaVacia}
                  >
                    No hay movimientos que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                domiciliosFiltrados.map((domicilio) => (
                  <tr key={domicilio.id}>
                    <td>
                      <span className={styles.historialDiaHora}>
                        {formatearHora(domicilio.created_at)}
                      </span>
                    </td>

                    <td>
                      <strong>{domicilio.cliente || "Sin cliente"}</strong>

                      {domicilio.telefono && (
                        <small>{domicilio.telefono}</small>
                      )}
                    </td>

                    <td>
                      {obtenerNombreDomiciliario(
                        domicilio.domiciliario_id,
                      )}
                    </td>

                    <td className={styles.historialDiaDireccion}>
                      {domicilio.direccion || "Sin dirección"}
                    </td>

                    <td>
                      <strong>
                        {formatoDinero(domicilio.costo)}
                      </strong>
                    </td>

                    <td>
                      {domicilio.metodo_pago || "Sin método"}
                    </td>

                    <td>
                      <span
                        className={`${styles.historialDiaEstado} ${
                          domicilio.estado === "Pagado"
                            ? styles.historialDiaEstadoPagado
                            : styles.historialDiaEstadoPendiente
                        }`}
                      >
                        <span></span>
                        {domicilio.estado || "Sin estado"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}