import { useEffect, useRef, useState } from "react";
import {
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  BanknotesIcon,
  UserGroupIcon,
  BoltIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

import { supabase } from "../../../config/supabase";

import styles from "./AdminInicio.module.css";

export default function AdminInicio() {
  const [estadisticas, setEstadisticas] = useState({
    domicilios: 0,
    pendientes: 0,
    pagados: 0,
    recaudado: 0,
    efectivo: 0,
    transferencia: 0,
    datafono: 0,
    otro: 0,
    domiciliarios: 0,
  });
  const [graficaActiva, setGraficaActiva] = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
    cargarClaveDinamica();

    return () => {
      if (timeoutClave.current) {
        clearTimeout(timeoutClave.current);
      }
    };
  }, []);
  const [claveDinamica, setClaveDinamica] = useState("");
  const [claveAnimacion, setClaveAnimacion] = useState(0);

  const animacionInicializada = useRef(false);
  const timeoutClave = useRef(null);
  const cargarClaveDinamica = async () => {
    const { data, error } = await supabase.rpc("obtener_estado_clave_edicion");

    if (error) {
      console.error("Error obteniendo clave dinámica:", error);
      return;
    }

    setClaveDinamica(data.clave);

    const tiempoRestante = Number(data.tiempo_restante);
    const tiempoTranscurrido = 60000 - tiempoRestante;

    /*
    SOLO LA PRIMERA VEZ:
    sincronizamos visualmente la animación
    con el tiempo real de Supabase.
  */
    if (!animacionInicializada.current) {
      setClaveAnimacion(tiempoTranscurrido);
      animacionInicializada.current = true;
    }

    /*
    Cuando llegue la expiración:
    solamente obtenemos la nueva clave.

    NO volvemos a tocar la animación.
  */
    timeoutClave.current = setTimeout(() => {
      cargarClaveDinamica();
    }, tiempoRestante);
  };
  const cargarDatos = async () => {
    setCargando(true);

    const hoy = new Date().toISOString().split("T")[0];

    const { data: domicilios, error: errorDomicilios } = await supabase
      .from("domicilios")
      .select("*")
      .eq("fecha", hoy);

    if (errorDomicilios) {
      console.error("Error cargando domicilios:", errorDomicilios);
      setCargando(false);
      return;
    }

    const { data: usuarios, error: errorUsuarios } = await supabase
      .from("usuarios")
      .select("id, rol, estado")
      .eq("rol", "Domiciliario");

    if (errorUsuarios) {
      console.error("Error cargando usuarios:", errorUsuarios);
    }

    const lista = domicilios || [];

    const pendientes = lista.filter(
      (item) => item.estado === "Pendiente",
    ).length;

    const pagados = lista.filter((item) => item.estado === "Pagado").length;

    const recaudado = lista
      .filter((item) => item.estado === "Pagado")
      .reduce((total, item) => total + Number(item.costo || 0), 0);

    const efectivo = lista
      .filter(
        (item) => item.estado === "Pagado" && item.metodo_pago === "Efectivo",
      )
      .reduce((total, item) => total + Number(item.costo || 0), 0);

    const transferencia = lista
      .filter(
        (item) =>
          item.estado === "Pagado" && item.metodo_pago === "Transferencia",
      )
      .reduce((total, item) => total + Number(item.costo || 0), 0);

    const datafono = lista
      .filter(
        (item) => item.estado === "Pagado" && item.metodo_pago === "Datáfono",
      )
      .reduce((total, item) => total + Number(item.costo || 0), 0);

    const otro = lista
      .filter((item) => item.estado === "Pagado" && item.metodo_pago === "Otro")
      .reduce((total, item) => total + Number(item.costo || 0), 0);

    setEstadisticas({
      domicilios: lista.length,
      pendientes,
      pagados,
      recaudado,
      efectivo,
      transferencia,
      datafono,
      otro,
      domiciliarios: usuarios?.length || 0,
    });

    setCargando(false);
  };

  const formatoDinero = (valor) => `$${Number(valor).toLocaleString("es-CO")}`;
  const graficas = [
    {
      id: "horas",
      titulo: "Domicilios por hora",
      descripcion: "Distribución de domicilios durante la jornada.",
      icono: ClockIcon,
      datos: [
        { etiqueta: "7 AM", valor: 3 },
        { etiqueta: "9 AM", valor: 7 },
        { etiqueta: "11 AM", valor: 12 },
        { etiqueta: "1 PM", valor: 8 },
        { etiqueta: "3 PM", valor: 15 },
        { etiqueta: "5 PM", valor: 21 },
        { etiqueta: "7 PM", valor: 17 },
        { etiqueta: "9 PM", valor: 9 },
      ],
    },

    {
      id: "dias",
      titulo: "Movimientos por día",
      descripcion: "Actividad registrada durante la semana.",
      icono: CalendarDaysIcon,
      datos: [
        { etiqueta: "Lun", valor: 32 },
        { etiqueta: "Mar", valor: 41 },
        { etiqueta: "Mié", valor: 28 },
        { etiqueta: "Jue", valor: 47 },
        { etiqueta: "Vie", valor: 56 },
        { etiqueta: "Sáb", valor: 64 },
        { etiqueta: "Dom", valor: 18 },
      ],
    },

    {
      id: "meses",
      titulo: "Movimientos por mes",
      descripcion: "Actividad registrada durante el año.",
      icono: ChartBarIcon,
      datos: [
        { etiqueta: "Ene", valor: 120 },
        { etiqueta: "Feb", valor: 145 },
        { etiqueta: "Mar", valor: 132 },
        { etiqueta: "Abr", valor: 178 },
        { etiqueta: "May", valor: 194 },
        { etiqueta: "Jun", valor: 210 },
        { etiqueta: "Jul", valor: 238 },
        { etiqueta: "Ago", valor: 256 },
      ],
    },
  ];

  const siguienteGrafica = () => {
    setGraficaActiva((actual) => (actual + 1) % graficas.length);
  };

  const anteriorGrafica = () => {
    setGraficaActiva(
      (actual) => (actual - 1 + graficas.length) % graficas.length,
    );
  };

  const graficaActual = graficas[graficaActiva];

  const valorMaximo = Math.max(
    ...graficaActual.datos.map((dato) => dato.valor),
  );
  return (
    <div className={styles.adminInicio}>
      <div className={styles.adminInicioHeader}>
        <div>
          <h1>Inicio</h1>
          <div className={styles.adminInicioClave}>
            <span>Clave dinámica de edición</span>
            <div className={styles.adminInicioClaveBox}>
              <svg
                className={styles.adminInicioClaveSvg}
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
                style={{
                  "--clave-offset": `-${claveAnimacion}ms`,
                }}
              >
                <rect
                  className={styles.adminInicioClaveRastro}
                  x="1"
                  y="1"
                  width="98"
                  height="38"
                  rx="8"
                  pathLength="100"
                />
              </svg>

              <strong>{claveDinamica || "------"}</strong>
            </div>
          </div>
        </div>

        <div className={styles.adminInicioFecha}>
          {new Date().toLocaleDateString("es-CO", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
      </div>

      {/* ESTADÍSTICAS PRINCIPALES */}

      <section className={styles.adminInicioStats}>
        <div className={styles.adminInicioStatCard}>
          <div className={styles.adminInicioStatIcon}>
            <TruckIcon />
          </div>

          <div>
            <span>Domicilios del día</span>
            <strong>{cargando ? "..." : estadisticas.domicilios}</strong>
          </div>
        </div>

        <div className={styles.adminInicioStatCard}>
          <div className={styles.adminInicioStatIcon}>
            <ClockIcon />
          </div>

          <div>
            <span>Pendientes</span>
            <strong>{cargando ? "..." : estadisticas.pendientes}</strong>
          </div>
        </div>

        <div className={styles.adminInicioStatCard}>
          <div className={styles.adminInicioStatIcon}>
            <CheckCircleIcon />
          </div>

          <div>
            <span>Pagados</span>
            <strong>{cargando ? "..." : estadisticas.pagados}</strong>
          </div>
        </div>

        <div className={styles.adminInicioStatCard}>
          <div className={styles.adminInicioStatIcon}>
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

      {/* PARTE CENTRAL */}

      <section className={styles.adminInicioGrid}>
        <div className={styles.adminInicioPanel}>
          <div className={styles.adminInicioPanelHeader}>
            <div>
              <h2>Actividad reciente</h2>
              <p>Movimientos registrados durante el día.</p>
            </div>

            <BoltIcon />
          </div>

          <div className={styles.adminInicioActivity}>
            <div className={styles.adminInicioActivityItem}>
              <div className={styles.adminInicioActivityDot}></div>

              <div>
                <strong>Actividad del sistema</strong>
                <span>Los movimientos reales aparecerán aquí.</span>
              </div>

              <small>Ahora</small>
            </div>

            <div className={styles.adminInicioActivityItem}>
              <div className={styles.adminInicioActivityDot}></div>

              <div>
                <strong>Domicilios registrados</strong>
                <span>
                  {estadisticas.domicilios} domicilios registrados hoy.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.adminInicioPanel}>
          <div className={styles.adminInicioPanelHeader}>
            <div>
              <h2>Domiciliarios</h2>
              <p>Usuarios registrados como domiciliarios.</p>
            </div>

            <UserGroupIcon />
          </div>

          <div className={styles.adminInicioDomiciliarios}>
            <div className={styles.adminInicioDomiciliarioTotal}>
              <strong>{cargando ? "..." : estadisticas.domiciliarios}</strong>

              <span>Domiciliarios registrados</span>
            </div>

            <div className={styles.adminInicioEstado}>
              <span className={styles.adminInicioEstadoPunto}></span>
              Sistema conectado
            </div>
          </div>
        </div>
      </section>

      {/* RESUMEN DEL DÍA */}

      <section className={styles.adminInicioResumen}>
        <div className={styles.adminInicioResumenHeader}>
          <div>
            <h2>Resumen del día</h2>
            <p>Recaudación distribuida por método de pago.</p>
          </div>
        </div>

        <div className={styles.adminInicioPagos}>
          <div className={styles.adminInicioPago}>
            <span>Efectivo</span>
            <strong>
              {cargando ? "..." : formatoDinero(estadisticas.efectivo)}
            </strong>
          </div>

          <div className={styles.adminInicioPago}>
            <span>Transferencia</span>
            <strong>
              {cargando ? "..." : formatoDinero(estadisticas.transferencia)}
            </strong>
          </div>

          <div className={styles.adminInicioPago}>
            <span>Datáfono</span>
            <strong>
              {cargando ? "..." : formatoDinero(estadisticas.datafono)}
            </strong>
          </div>

          <div className={styles.adminInicioPago}>
            <span>Otro</span>
            <strong>
              {cargando ? "..." : formatoDinero(estadisticas.otro)}
            </strong>
          </div>
        </div>
      </section>
      {/* ANÁLISIS DE ACTIVIDAD */}
      <div className={styles.adminInicioAnalisis}>
        <section className={styles.adminInicioGraficas}>
          <div className={styles.adminInicioGraficasHeader}>
            <div>
              <h2>{graficaActual.titulo}</h2>
              <p>{graficaActual.descripcion}</p>
            </div>

            <div className={styles.adminInicioGraficasControles}>
              <button
                type="button"
                onClick={anteriorGrafica}
                aria-label="Gráfica anterior"
              >
                <ChevronLeftIcon />
              </button>

              <button
                type="button"
                onClick={siguienteGrafica}
                aria-label="Siguiente gráfica"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>

          <div className={styles.adminInicioGrafica}>
            {graficaActual.datos.map((dato) => (
              <div
                key={dato.etiqueta}
                className={styles.adminInicioGraficaColumna}
              >
                <strong>{dato.valor}</strong>

                <div className={styles.adminInicioGraficaBarraContenedor}>
                  <div
                    className={styles.adminInicioGraficaBarra}
                    style={{
                      height: `${(dato.valor / valorMaximo) * 100}%`,
                    }}
                  />
                </div>

                <span>{dato.etiqueta}</span>
              </div>
            ))}
          </div>

          <div className={styles.adminInicioGraficasPuntos}>
            {graficas.map((grafica, indice) => (
              <button
                key={grafica.id}
                type="button"
                className={
                  indice === graficaActiva
                    ? styles.adminInicioGraficaPuntoActivo
                    : styles.adminInicioGraficaPunto
                }
                onClick={() => setGraficaActiva(indice)}
                aria-label={`Mostrar ${grafica.titulo}`}
              />
            ))}
          </div>
        </section>

        <div className={styles.adminInicioIngresos}>
          <h2>Ingresos</h2>
          <p>Resumen de recaudación.</p>

          <div className={styles.adminInicioIngresosLista}>
            <div>
              <span>Hoy</span>
              <strong>$98.000</strong>
            </div>

            <div>
              <span>Esta semana</span>
              <strong>$540.000</strong>
            </div>

            <div>
              <span>Este mes</span>
              <strong>$2.340.000</strong>
            </div>

            <div>
              <span>Este año</span>
              <strong>$18.720.000</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
