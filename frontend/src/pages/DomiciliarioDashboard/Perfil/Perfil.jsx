import styles from "./Perfil.module.css";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../config/supabase";
import {
  UserCircleIcon,
  IdentificationIcon,
  EnvelopeIcon,
  PhoneIcon,
  ShieldCheckIcon,
  TruckIcon,
  BanknotesIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const DIAS = [
  { key: "lunes", short: "Lun" },
  { key: "martes", short: "Mar" },
  { key: "miercoles", short: "Mié" },
  { key: "jueves", short: "Jue" },
  { key: "viernes", short: "Vie" },
  { key: "sabado", short: "Sáb" },
  { key: "domingo", short: "Dom" },
];

const formatterCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const formatCOP = (value) => formatterCOP.format(Number(value || 0));

const getFechaColombia = (fecha = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);

const parseFechaLocal = (fecha) => {
  const [year, month, day] = fecha.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const obtenerLunes = (fecha) => {
  const copia = new Date(fecha);
  const dia = copia.getDay();
  const diferencia = dia === 0 ? -6 : 1 - dia;
  copia.setDate(copia.getDate() + diferencia);
  return copia;
};

const sumarDias = (fecha, cantidad) => {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + cantidad);
  return copia;
};

const fechaISO = (fecha) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(
    fecha.getDate(),
  ).padStart(2, "0")}`;

export default function Perfil({ usuario }) {
  const [domicilios, setDomicilios] = useState([]);
  const [organizaciones, setOrganizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!usuario?.id) return;

    let activo = true;

    const cargarPerfil = async () => {
      setCargando(true);
      setError("");

      try {
        const organizacionIds = new Set();

        if (usuario.organizacion_id) {
          organizacionIds.add(usuario.organizacion_id);
        }

        const { data: vinculaciones, error: vinculacionesError } =
          await supabase
            .from("usuarios_organizaciones")
            .select("organizacion_id")
            .eq("usuario_id", usuario.id)
            .eq("estado", "activo");

        if (vinculacionesError) {
          console.warn(
            "No se pudieron cargar las organizaciones vinculadas:",
            vinculacionesError,
          );
        }

        (vinculaciones || []).forEach((item) => {
          if (item.organizacion_id) organizacionIds.add(item.organizacion_id);
        });

        const ids = [...organizacionIds];

        if (!ids.length) {
          if (activo) {
            setOrganizaciones([]);
            setDomicilios([]);
          }
          return;
        }

        const { data: organizacionesData, error: organizacionesError } =
          await supabase
            .from("organizaciones")
            .select("id, nombre")
            .in("id", ids);

        if (organizacionesError) {
          throw organizacionesError;
        }

        // Cargar la configuración de cada organización por separado.
        // Así cada tarjeta queda ligada explícitamente a su propia organización.
        const organizacionesDetalle = await Promise.all(
          (organizacionesData || []).map(async (organizacion) => {
            const { data: configuracion, error: configuracionError } =
              await supabase
                .from("configuraciones_organizacion")
                .select(
                  "organizacion_id, dias_trabajo, hora_inicio, hora_fin, cierre_automatico_minutos",
                )
                .eq("organizacion_id", organizacion.id)
                .maybeSingle();

            if (configuracionError) {
              console.warn(
                `No se pudo cargar la configuración de ${organizacion.nombre}:`,
                configuracionError,
              );
            }

            return {
              ...organizacion,
              configuracion: configuracion || null,
            };
          }),
        );

        organizacionesDetalle.sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es"),
        );

        const fechaHoy = getFechaColombia();
        const inicioSemana = obtenerLunes(parseFechaLocal(fechaHoy));
        const inicioSemanaISO = fechaISO(inicioSemana);
        const finSemanaISO = fechaISO(sumarDias(inicioSemana, 6));

        const { data: domiciliosData, error: domiciliosError } = await supabase
          .from("domicilios")
          .select(
            "id, fecha, created_at, costo, propina, estado, organizacion_id, domiciliario_id",
          )
          .eq("domiciliario_id", usuario.id)
          .in("organizacion_id", ids)
          .gte("fecha", inicioSemanaISO)
          .lte("fecha", finSemanaISO)
          .order("fecha", { ascending: true });

        if (domiciliosError) {
          throw domiciliosError;
        }

        if (!activo) return;

        setOrganizaciones(organizacionesDetalle);
        setDomicilios(domiciliosData || []);
      } catch (err) {
        console.error("Error cargando perfil del domiciliario:", err);

        if (!activo) return;

        setError(
          "No pudimos cargar el resumen del perfil. Intenta actualizar la página.",
        );
        setDomicilios([]);
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargarPerfil();

    return () => {
      activo = false;
    };
  }, [usuario?.id, usuario?.organizacion_id]);

  const construirResumenOrganizacion = (organizacion) => {
    const registros = domicilios.filter(
      (domicilio) => domicilio.organizacion_id === organizacion.id,
    );

    const diasConfig = organizacion.configuracion?.dias_trabajo || {};

    const dias = DIAS.map((dia) => {
      const registrosDia = registros.filter((domicilio) => {
        if (!domicilio.fecha) return false;

        const fecha = parseFechaLocal(domicilio.fecha);
        const indice = fecha.getDay() === 0 ? 6 : fecha.getDay() - 1;

        return DIAS[indice]?.key === dia.key;
      });

      return {
        ...dia,
        activo: diasConfig[dia.key] === true,
        cantidad: registrosDia.length,
        propinas: registrosDia.reduce(
          (total, domicilio) => total + Number(domicilio.propina || 0),
          0,
        ),
      };
    });

    const diasConPropina = dias.filter((dia) => dia.propinas > 0);
    const mejorDia = dias.reduce(
      (mejor, dia) => (dia.propinas > mejor.propinas ? dia : mejor),
      { short: "—", propinas: 0 },
    );

    return {
      registros,
      totalPropinas: registros.reduce(
        (total, domicilio) => total + Number(domicilio.propina || 0),
        0,
      ),
      totalDomicilios: registros.length,
      // El recaudo solo cuenta domicilios efectivamente pagados.
      // En camino, Entregado, Pendiente, Reportado y Cancelado no suman.
      totalRecaudado: registros.reduce(
        (total, domicilio) =>
          domicilio.estado === "Pagado"
            ? total + Number(domicilio.costo || 0)
            : total,
        0,
      ),
      entregados: registros.filter((domicilio) =>
        ["Entregado", "Pagado"].includes(domicilio.estado),
      ).length,
      pendientes: registros.filter(
        (domicilio) => domicilio.estado === "Pendiente",
      ).length,
      reportados: registros.filter(
        (domicilio) => domicilio.estado === "Reportado",
      ).length,
      dias,
      diasConPropina: diasConPropina.length,
      mejorDia,
    };
  };

  const resumenGeneral = useMemo(() => {
    return organizaciones.reduce(
      (acumulado, organizacion) => {
        const resumen = construirResumenOrganizacion(organizacion);

        acumulado.totalDomicilios += resumen.totalDomicilios;
        acumulado.totalRecaudado += resumen.totalRecaudado;
        acumulado.totalPropinas += resumen.totalPropinas;
        acumulado.entregados += resumen.entregados;
        acumulado.pendientes += resumen.pendientes;
        acumulado.reportados += resumen.reportados;

        return acumulado;
      },
      {
        totalDomicilios: 0,
        totalRecaudado: 0,
        totalPropinas: 0,
        entregados: 0,
        pendientes: 0,
        reportados: 0,
      },
    );
  }, [organizaciones, domicilios]);

  const promedioPropina =
    resumenGeneral.totalDomicilios > 0
      ? resumenGeneral.totalPropinas / resumenGeneral.totalDomicilios
      : 0;

  const organizacionesTexto = organizaciones.length
    ? organizaciones.map((org) => org.nombre).join(" · ")
    : "Sin organización asignada";

  const formatearHora = (hora) => {
    if (!hora) return "No configurada";
    return String(hora).slice(0, 5);
  };

  const formatearCierre = (minutos) => {
    if (minutos === null || minutos === undefined) return "Manual";
    if (Number(minutos) === 0) return "Al finalizar";
    return `${minutos} min después`;
  };

  return (
    <div className={styles.perfilContainer}>
      <section className={styles.perfilHeader}>
        <div className={styles.headerGlow} />
        <div className={styles.perfilAvatar}>
          <UserCircleIcon className={styles.avatarIcon} />
        </div>

        <div className={styles.headerInfo}>
          <span className={styles.rolBadge}>
            <TruckIcon />
            Domiciliario
          </span>

          <h1>{usuario?.nombre || "Usuario"}</h1>

          <div className={styles.estado}>
            <span className={styles.estadoDot} />
            {usuario?.estado === "activo" ? "Activo" : "Inactivo"}
          </div>

          <p>{organizacionesTexto}</p>
        </div>
      </section>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <section className={styles.metricGrid}>
        <article className={`${styles.metricCard} ${styles.metricPrimary}`}>
          <div className={styles.metricIcon}>
            <BanknotesIcon />
          </div>
          <div>
            <span>Propinas esta semana</span>
            <strong>{formatCOP(resumenGeneral.totalPropinas)}</strong>
          </div>
        </article>

        <article className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <TruckIcon />
          </div>
          <div>
            <span>Domicilios</span>
            <strong>{resumenGeneral.totalDomicilios}</strong>
          </div>
        </article>

        <article className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <CurrencyDollarIcon />
          </div>
          <div>
            <span>Recaudado</span>
            <strong>{formatCOP(resumenGeneral.totalRecaudado)}</strong>
          </div>
        </article>

        <article className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <ChartBarIcon />
          </div>
          <div>
            <span>Promedio por domicilio</span>
            <strong>{formatCOP(promedioPropina)}</strong>
          </div>
        </article>
      </section>

      <section className={styles.mainGrid}>
        <article className={styles.card}>
          <div className={styles.cardHeaderCompact}>
            <div>
              <span className={styles.eyebrow}>
                <ChartBarIcon />
                Actividad semanal
              </span>
              <h2>Resumen de la jornada</h2>
            </div>
          </div>

          <div className={styles.statusList}>
            <div>
              <span>Entregados / Pagados</span>
              <strong>{resumenGeneral.entregados}</strong>
            </div>
            <div>
              <span>Pendientes</span>
              <strong>{resumenGeneral.pendientes}</strong>
            </div>
            <div>
              <span>Reportados</span>
              <strong>{resumenGeneral.reportados}</strong>
            </div>
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeaderCompact}>
            <div>
              <span className={styles.eyebrow}>
                <SparklesIcon />
                Propinas
              </span>
              <h2>Propinas de hoy</h2>
            </div>
          </div>

          <div className={styles.todayTips}>
            {organizaciones.map((organizacion) => {
              const resumen = construirResumenOrganizacion(organizacion);
              const hoy = getFechaColombia();
              const propinaHoy = resumen.registros
                .filter((domicilio) => domicilio.fecha === hoy)
                .reduce(
                  (total, domicilio) => total + Number(domicilio.propina || 0),
                  0,
                );

              return (
                <div className={styles.todayTipRow} key={organizacion.id}>
                  <span>{organizacion.nombre}</span>
                  <strong>{formatCOP(propinaHoy)}</strong>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className={styles.datosGrid}>
        <article className={styles.card}>
          <div className={styles.cardHeaderCompact}>
            <div>
              <span className={styles.eyebrow}>
                <IdentificationIcon />
                Información
              </span>
              <h2>Datos personales</h2>
            </div>
            <ShieldCheckIcon className={styles.secureIcon} />
          </div>

          <div className={styles.dataGrid}>
            <div className={styles.dataItem}>
              <IdentificationIcon />
              <div>
                <span>Documento</span>
                <strong>{usuario?.documento || "No registrado"}</strong>
              </div>
            </div>

            <div className={styles.dataItem}>
              <EnvelopeIcon />
              <div>
                <span>Correo</span>
                <strong>{usuario?.correo || "No registrado"}</strong>
              </div>
            </div>

            <div className={styles.dataItem}>
              <PhoneIcon />
              <div>
                <span>Teléfono</span>
                <strong>{usuario?.telefono || "No registrado"}</strong>
              </div>
            </div>

            <div className={styles.dataItem}>
              <TruckIcon />
              <div>
                <span>Rol</span>
                <strong>{usuario?.rol || "No registrado"}</strong>
              </div>
            </div>
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeaderCompact}>
            <div>
              <span className={styles.eyebrow}>
                <CalendarDaysIcon />
                Organizaciones
              </span>
              <h2>Jornadas por organización</h2>
            </div>
          </div>

          <div className={styles.organizationMiniList}>
            {organizaciones.map((organizacion) => {
              const config = organizacion.configuracion;
              const dias = config?.dias_trabajo || {};

              return (
                <div
                  className={styles.organizationMiniRow}
                  key={organizacion.id}
                >
                  <strong>{organizacion.nombre}</strong>
                  <span>
                    {formatearHora(config?.hora_inicio)} –{" "}
                    {formatearHora(config?.hora_fin)}
                    {" · "}
                    {formatearCierre(config?.cierre_automatico_minutos)}
                  </span>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className={styles.organizationSection}>
        <div className={styles.sectionTitle}>
          <div>
            <span className={styles.eyebrow}>
              <CalendarDaysIcon />
              Configuración independiente
            </span>
            <h2>Jornada y propinas por organización</h2>
            <p>
              Cada organización conserva sus propios días de trabajo. Si una
              persona trabaja en dos organizaciones, aquí se muestran por
              separado.
            </p>
          </div>
        </div>

        {cargando ? (
          <div className={styles.loadingBox}>Cargando información...</div>
        ) : organizaciones.length ? (
          <div className={styles.organizationGrid}>
            {organizaciones.map((organizacion) => {
              const resumen = construirResumenOrganizacion(organizacion);
              const maxPropina = Math.max(
                ...resumen.dias.map((dia) => dia.propinas),
                1,
              );
              const config = organizacion.configuracion;

              return (
                <article
                  className={styles.organizationCard}
                  key={organizacion.id}
                >
                  <div className={styles.organizationHeader}>
                    <div>
                      <h3>{organizacion.nombre}</h3>
                    </div>
                    <div className={styles.organizationTotals}>
                      <span>Propinas semana</span>
                      <strong>{formatCOP(resumen.totalPropinas)}</strong>
                    </div>
                  </div>

                  <div className={styles.organizationMeta}>
                    <span>
                      Horario: {formatearHora(config?.hora_inicio)} –{" "}
                      {formatearHora(config?.hora_fin)}
                    </span>
                    <span>
                      Cierre:{" "}
                      {formatearCierre(config?.cierre_automatico_minutos)}
                    </span>
                  </div>

                  <div className={styles.scheduleGrid}>
                    {resumen.dias.map((dia) => (
                      <div
                        key={dia.key}
                        className={`${styles.scheduleDay} ${
                          dia.activo ? styles.scheduleDayActive : ""
                        }`}
                      >
                        <span>{dia.short}</span>
                        <small>{dia.activo ? "Trabajo" : "Descanso"}</small>
                      </div>
                    ))}
                  </div>

                  <div className={styles.organizationTips}>
                    <div className={styles.organizationTipsHeader}>
                      <span>Propinas por día</span>
                      <strong>Mejor: {resumen.mejorDia.short}</strong>
                    </div>

                    {resumen.dias.map((dia) => (
                      <div className={styles.dayRow} key={dia.key}>
                        <div className={styles.dayName}>
                          <span>{dia.short}</span>
                          <small>{dia.cantidad} domicilios</small>
                        </div>

                        <div className={styles.dayBar}>
                          <div className={styles.dayBarTrack}>
                            <div
                              className={styles.dayBarFill}
                              style={{
                                width: `${
                                  dia.propinas
                                    ? Math.max(
                                        (dia.propinas / maxPropina) * 100,
                                        7,
                                      )
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        <strong className={styles.dayAmount}>
                          {formatCOP(dia.propinas)}
                        </strong>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyBox}>
            <CalendarDaysIcon />
            <strong>No hay organizaciones asignadas</strong>
            <span>
              Este domiciliario todavía no tiene una organización activa.
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
