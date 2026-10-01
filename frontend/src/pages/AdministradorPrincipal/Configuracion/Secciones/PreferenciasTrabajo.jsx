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
    hora_inicio,
    hora_fin,
    dias_trabajo,
    meses_trabajo
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
  // GUARDAR
  // =====================================================

  const guardarConfiguracion = async () => {
    try {
      if (!organizacionId) {
        setMensaje("No se encontró la organización actual.");
        return;
      }

      setMensaje("");

      // =====================================================
      // VALIDACIONES
      // =====================================================

      if (!horaInicio || !horaFin) {
        setMensaje(
          "Debes seleccionar la hora de inicio y la hora de finalización.",
        );
        return;
      }

      if (horaInicio === horaFin) {
        setMensaje(
          "La hora de inicio y la hora de finalización no pueden ser iguales.",
        );
        return;
      }

      const hayDiaActivo = Object.values(diasTrabajo).some(Boolean);

      if (!hayDiaActivo) {
        setMensaje("Debes seleccionar al menos un día de trabajo.");
        return;
      }

      const hayMesActivo = Object.values(mesesTrabajo).some(Boolean);

      if (!hayMesActivo) {
        setMensaje("Debes seleccionar al menos un mes de trabajo.");
        return;
      }

      setGuardando(true);

      const { error } = await supabase
        .from("configuraciones_organizacion")
        .upsert(
          {
            organizacion_id: organizacionId,
            horario_activo: true,
            hora_inicio: horaInicio,
            hora_fin: horaFin,
            dias_trabajo: diasTrabajo,
            meses_trabajo: mesesTrabajo,
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
              Define el horario durante el cual los domiciliarios podrán
              registrar nuevos domicilios.
            </p>
          </div>
        </div>

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
                className={`${styles.dia} ${activo ? styles.diaActivo : ""}`}
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

            <span>Selecciona los meses en los que opera la organización.</span>
          </div>

          <div className={styles.listaMeses}>
            {Object.entries(mesesTrabajo).map(([mes, activo]) => (
              <button
                key={mes}
                type="button"
                className={`${styles.mes} ${activo ? styles.mesActivo : ""}`}
                onClick={() => cambiarMes(mes)}
              >
                {mes.charAt(0).toUpperCase() + mes.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.info}>
          <span>ⓘ</span>
          <p>
            Estas preferencias definirán posteriormente cuándo los domiciliarios
            pueden registrar nuevos domicilios. No afectan el inicio de sesión
            ni el acceso al sistema.
          </p>
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
