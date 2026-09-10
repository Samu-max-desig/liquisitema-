import { useEffect, useState } from "react";
import { supabase } from "../../../../config/supabase";
import styles from "./PreferenciasTrabajo.module.css";

export default function PreferenciasTrabajo() {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [organizacionId, setOrganizacionId] = useState(null);

  // =====================================================
  // HORARIO
  // =====================================================

  const [horarioActivo, setHorarioActivo] = useState(true);
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("18:00");

  // =====================================================
  // DÍAS DE TRABAJO
  // =====================================================

  const [diasTrabajo, setDiasTrabajo] = useState({
    lunes: true,
    martes: true,
    miercoles: true,
    jueves: true,
    viernes: true,
    sabado: true,
    domingo: false,
  });

  // =====================================================
  // MESES DE TRABAJO
  // =====================================================

  const [mesesTrabajo, setMesesTrabajo] = useState({
    enero: true,
    febrero: true,
    marzo: true,
    abril: true,
    mayo: true,
    junio: true,
    julio: true,
    agosto: true,
    septiembre: true,
    octubre: true,
    noviembre: true,
    diciembre: true,
  });

  // =====================================================
  // PERÍODO DE ESTADÍSTICAS
  // =====================================================

  const [periodoEstadisticas, setPeriodoEstadisticas] = useState("anual");

  // =====================================================
  // ESTADÍSTICAS PRIORITARIAS
  // =====================================================

  const [estadisticas, setEstadisticas] = useState({
    ventas: true,
    domicilios: true,
    pendientes: true,
    reportes: true,
  });

  // =====================================================
  // OBTENER ORGANIZACIÓN DEL USUARIO ACTUAL
  // =====================================================

  const obtenerOrganizacion = async () => {
    const {
      data: { user },
      error: errorAuth,
    } = await supabase.auth.getUser();

    if (errorAuth || !user) {
      throw new Error("No se pudo obtener la sesión actual.");
    }

    // Primero: organización directa del usuario
    const { data: usuario, error: errorUsuario } = await supabase
      .from("usuarios")
      .select("organizacion_id")
      .eq("id", user.id)
      .maybeSingle();

    if (errorUsuario) {
      throw errorUsuario;
    }

    if (usuario?.organizacion_id) {
      return usuario.organizacion_id;
    }

    // Segundo: organización mediante usuarios_organizaciones
    const { data: relacion, error: errorRelacion } = await supabase
      .from("usuarios_organizaciones")
      .select("organizacion_id")
      .eq("usuario_id", user.id)
      .eq("estado", "activo")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (errorRelacion) {
      throw errorRelacion;
    }

    if (!relacion?.organizacion_id) {
      throw new Error("El usuario no tiene una organización activa asignada.");
    }

    return relacion.organizacion_id;
  };

  // =====================================================
  // CARGAR CONFIGURACIÓN
  // =====================================================

  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        setCargando(true);
        setMensaje("");

        const orgId = await obtenerOrganizacion();

        setOrganizacionId(orgId);

        const { data, error } = await supabase
          .from("configuraciones_organizacion")
          .select(
            `
              horario_activo,
              hora_inicio,
              hora_fin,
              dias_trabajo,
              meses_trabajo,
              periodo_estadisticas,
              estadisticas
            `,
          )
          .eq("organizacion_id", orgId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        // Si todavía no existe configuración,
        // mantenemos los valores predeterminados.
        if (data) {
          setHorarioActivo(data.horario_activo ?? true);

          setHoraInicio(
            data.hora_inicio ? data.hora_inicio.substring(0, 5) : "08:00",
          );

          setHoraFin(data.hora_fin ? data.hora_fin.substring(0, 5) : "18:00");

          if (data.dias_trabajo) {
            setDiasTrabajo((actual) => ({
              ...actual,
              ...data.dias_trabajo,
            }));
          }

          if (data.meses_trabajo) {
            setMesesTrabajo((actual) => ({
              ...actual,
              ...data.meses_trabajo,
            }));
          }

          if (data.periodo_estadisticas) {
            setPeriodoEstadisticas(data.periodo_estadisticas);
          }

          if (data.estadisticas) {
            setEstadisticas((actual) => ({
              ...actual,
              ...data.estadisticas,
            }));
          }
        }
      } catch (error) {
        console.error("Error cargando configuración:", error);
        setMensaje(error.message || "No se pudo cargar la configuración.");
      } finally {
        setCargando(false);
      }
    };

    cargarConfiguracion();
  }, []);

  // =====================================================
  // CAMBIAR DÍA
  // =====================================================

  const cambiarDia = (dia) => {
    setDiasTrabajo((actual) => ({
      ...actual,
      [dia]: !actual[dia],
    }));
  };

  // =====================================================
  // CAMBIAR MES
  // =====================================================

  const cambiarMes = (mes) => {
    setMesesTrabajo((actual) => ({
      ...actual,
      [mes]: !actual[mes],
    }));
  };

  // =====================================================
  // CAMBIAR ESTADÍSTICA
  // =====================================================

  const cambiarEstadistica = (estadistica) => {
    setEstadisticas((actual) => ({
      ...actual,
      [estadistica]: !actual[estadistica],
    }));
  };

  // =====================================================
  // GUARDAR
  // =====================================================

  const guardarConfiguracion = async () => {
    try {
      if (!organizacionId) {
        setMensaje("No se encontró la organización actual.");
        return;
      }

      setGuardando(true);
      setMensaje("");

      const { error } = await supabase
        .from("configuraciones_organizacion")
        .upsert(
          {
            organizacion_id: organizacionId,
            horario_activo: horarioActivo,
            hora_inicio: horaInicio,
            hora_fin: horaFin,
            dias_trabajo: diasTrabajo,
            meses_trabajo: mesesTrabajo,
            periodo_estadisticas: periodoEstadisticas,
            estadisticas: estadisticas,
          },
          {
            onConflict: "organizacion_id",
          },
        );

      if (error) {
        throw error;
      }

      setMensaje("✓ Configuración guardada correctamente.");
    } catch (error) {
      console.error("Error guardando configuración:", error);
      setMensaje(error.message || "No se pudo guardar la configuración.");
    } finally {
      setGuardando(false);
    }
  };

  // =====================================================
  // CARGANDO
  // =====================================================

  if (cargando) {
    return (
      <div className={styles.contenedor}>
        <div className={styles.cargando}>Cargando preferencias...</div>
      </div>
    );
  }

  return (
    <div className={styles.contenedor}>
      {/* =====================================================
          ENCABEZADO
      ===================================================== */}

      <div className={styles.encabezado}>
        <div>
          <h2>Preferencias de trabajo</h2>
          <p>Personaliza cómo funciona el sistema para tu organización.</p>
        </div>
      </div>

      {/* =====================================================
          HORARIO
      ===================================================== */}

      <section className={styles.seccion}>
        <div className={styles.tituloSeccion}>
          <div>
            <h3>Horario de trabajo</h3>
            <p>
              Define el horario que se utilizará como referencia para
              estadísticas y análisis.
            </p>
          </div>

          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={horarioActivo}
              onChange={(e) => setHorarioActivo(e.target.checked)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        {horarioActivo && (
          <>
            <div className={styles.horarios}>
              <div className={styles.campo}>
                <label>Hora de inicio</label>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                />
              </div>

              <div className={styles.campo}>
                <label>Hora de finalización</label>
                <input
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                />
              </div>
            </div>

            {/* DÍAS */}

            <div className={styles.dias}>
              <label>Días de trabajo</label>

              <div className={styles.listaDias}>
                {Object.entries(diasTrabajo).map(([dia, activo]) => (
                  <button
                    key={dia}
                    type="button"
                    className={`${styles.dia} ${
                      activo ? styles.diaActivo : ""
                    }`}
                    onClick={() => cambiarDia(dia)}
                  >
                    {dia.charAt(0).toUpperCase() + dia.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* =====================================================
                MESES
            ===================================================== */}

            <div className={styles.meses}>
              <div className={styles.subtituloBloque}>
                <label>Meses de trabajo</label>

                <span>
                  Selecciona los meses en los que opera la organización.
                </span>
              </div>

              <div className={styles.listaMeses}>
                {Object.entries(mesesTrabajo).map(([mes, activo]) => (
                  <button
                    key={mes}
                    type="button"
                    className={`${styles.mes} ${
                      activo ? styles.mesActivo : ""
                    }`}
                    onClick={() => cambiarMes(mes)}
                  >
                    {mes.charAt(0).toUpperCase() + mes.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className={styles.info}>
          <span>ⓘ</span>
          <p>
            El horario no bloquea el inicio de sesión. Se utilizará únicamente
            como referencia para estadísticas, reportes y análisis de actividad.
          </p>
        </div>
      </section>

      {/* =====================================================
          PERÍODO DE ESTADÍSTICAS
      ===================================================== */}

      <section className={styles.seccion}>
        <div className={styles.tituloSeccion}>
          <div>
            <h3>Período de estadísticas</h3>
            <p>
              Define cómo quieres consultar el comportamiento de la organización
              durante el año.
            </p>
          </div>
        </div>

        <div className={styles.periodos}>
          <button
            type="button"
            className={`${styles.periodo} ${
              periodoEstadisticas === "anual" ? styles.periodoActivo : ""
            }`}
            onClick={() => setPeriodoEstadisticas("anual")}
          >
            <strong>Anual</strong>
            <span>Visualiza las estadísticas de todo el año.</span>
          </button>

          <button
            type="button"
            className={`${styles.periodo} ${
              periodoEstadisticas === "trimestral" ? styles.periodoActivo : ""
            }`}
            onClick={() => setPeriodoEstadisticas("trimestral")}
          >
            <strong>Trimestral</strong>
            <span>Divide el año en períodos de 3 meses.</span>
          </button>
        </div>
      </section>

      {/* =====================================================
          ESTADÍSTICAS PRIORITARIAS
      ===================================================== */}

      <section className={styles.seccion}>
        <div className={styles.tituloSeccion}>
          <div>
            <h3>Estadísticas prioritarias</h3>
            <p>
              Selecciona las estadísticas que quieres priorizar en el panel
              principal.
            </p>
          </div>
        </div>

        <div className={styles.listaEstadisticas}>
          <label className={styles.opcion}>
            <input
              type="checkbox"
              checked={estadisticas.ventas}
              onChange={() => cambiarEstadistica("ventas")}
            />
            <span>
              <strong>Ventas</strong>
              <small>Ingresos y comportamiento de ventas.</small>
            </span>
          </label>

          <label className={styles.opcion}>
            <input
              type="checkbox"
              checked={estadisticas.domicilios}
              onChange={() => cambiarEstadistica("domicilios")}
            />
            <span>
              <strong>Domicilios</strong>
              <small>Actividad y cantidad de domicilios.</small>
            </span>
          </label>

          <label className={styles.opcion}>
            <input
              type="checkbox"
              checked={estadisticas.pendientes}
              onChange={() => cambiarEstadistica("pendientes")}
            />
            <span>
              <strong>Pendientes</strong>
              <small>Control de pagos y cuentas pendientes.</small>
            </span>
          </label>

          <label className={styles.opcion}>
            <input
              type="checkbox"
              checked={estadisticas.reportes}
              onChange={() => cambiarEstadistica("reportes")}
            />
            <span>
              <strong>Reportes</strong>
              <small>Incidencias y novedades registradas.</small>
            </span>
          </label>
        </div>
      </section>

      {/* =====================================================
          GUARDAR
      ===================================================== */}

      <div className={styles.pie}>
        {mensaje && <span className={styles.mensaje}>{mensaje}</span>}

        <button
          type="button"
          className={styles.botonGuardar}
          onClick={guardarConfiguracion}
          disabled={guardando}
        >
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
