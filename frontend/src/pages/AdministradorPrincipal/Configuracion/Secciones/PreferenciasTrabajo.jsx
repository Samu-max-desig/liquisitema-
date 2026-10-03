import { useEffect, useState } from "react";
import { supabase } from "../../../../config/supabase";
import styles from "./PreferenciasTrabajo.module.css";

export default function PreferenciasTrabajo() {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [organizacionId, setOrganizacionId] = useState(null);
  const [organizaciones, setOrganizaciones] = useState([]);

  // =====================================================
  // HORARIO
  // =====================================================

  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("18:00");

  // CIERRE AUTOMÁTICO
  // null = desactivado, 15/30/60 = minutos después de la hora de cierre
  const [cierreAutomaticoMinutos, setCierreAutomaticoMinutos] = useState(null);

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
  // ORGANIZACIONES DEL USUARIO
  // =====================================================

  const cargarOrganizaciones = async () => {
    const {
      data: { user },
      error: errorAuth,
    } = await supabase.auth.getUser();

    if (errorAuth || !user) {
      throw new Error("No se pudo obtener la sesión actual.");
    }

    const { data: usuario, error: errorUsuario } = await supabase
      .from("usuarios")
      .select("id, organizacion_id")
      .eq("id", user.id)
      .maybeSingle();

    if (errorUsuario) {
      throw errorUsuario;
    }

    const ids = new Set();

    if (usuario?.organizacion_id) {
      ids.add(usuario.organizacion_id);
    }

    const { data: vinculaciones, error: vinculacionesError } = await supabase
      .from("usuarios_organizaciones")
      .select("organizacion_id, rol, estado")
      .eq("usuario_id", user.id)
      .eq("estado", "activo");

    if (vinculacionesError) {
      throw vinculacionesError;
    }

    (vinculaciones || []).forEach((relacion) => {
      if (relacion.organizacion_id && relacion.rol === "admin") {
        ids.add(relacion.organizacion_id);
      }
    });

    const idsArray = [...ids];

    if (!idsArray.length) {
      throw new Error("El usuario no tiene una organización activa asignada.");
    }

    const { data, error } = await supabase
      .from("organizaciones")
      .select("id, nombre, estado")
      .in("id", idsArray)
      .eq("estado", "activa")
      .order("nombre", { ascending: true });

    if (error) {
      throw error;
    }

    const disponibles = data || [];

    if (!disponibles.length) {
      throw new Error(
        "No hay organizaciones activas disponibles para configurar.",
      );
    }

    setOrganizaciones(disponibles);

    return disponibles;
  };

  // =====================================================
  // CARGAR CONFIGURACIÓN DE UNA ORGANIZACIÓN
  // =====================================================

  const cargarConfiguracion = async (orgId) => {
    if (!orgId) return;

    setCargando(true);
    setMensaje("");

    try {
      const { data, error } = await supabase
        .from("configuraciones_organizacion")
        .select(
          `
          hora_inicio,
          hora_fin,
          dias_trabajo,
          meses_trabajo,
          cierre_automatico_minutos
        `,
        )
        .eq("organizacion_id", orgId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      // Restablecer valores antes de aplicar la configuración
      // de la organización seleccionada.
      setHoraInicio(
        data?.hora_inicio ? data.hora_inicio.substring(0, 5) : "08:00",
      );
      setHoraFin(data?.hora_fin ? data.hora_fin.substring(0, 5) : "18:00");

      setDiasTrabajo({
        lunes: true,
        martes: true,
        miercoles: true,
        jueves: true,
        viernes: true,
        sabado: true,
        domingo: false,
        ...(data?.dias_trabajo || {}),
      });

      setMesesTrabajo({
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
        ...(data?.meses_trabajo || {}),
      });

      setCierreAutomaticoMinutos(data?.cierre_automatico_minutos ?? null);
    } catch (error) {
      console.error("Error cargando configuración:", error);
      setMensaje(error.message || "No se pudo cargar la configuración.");
    } finally {
      setCargando(false);
    }
  };

  // =====================================================
  // CARGA INICIAL
  // =====================================================

  useEffect(() => {
    const iniciar = async () => {
      try {
        setCargando(true);
        setMensaje("");

        const disponibles = await cargarOrganizaciones();

        // Si solamente tiene una organización, queda seleccionada
        // automáticamente. Si tiene varias, se selecciona la primera
        // solo como valor inicial y el usuario puede cambiarla.
        const primera = disponibles[0]?.id || null;

        if (primera) {
          setOrganizacionId(primera);
          await cargarConfiguracion(primera);
        }
      } catch (error) {
        console.error("Error inicializando preferencias:", error);
        setMensaje(
          error.message || "No se pudieron cargar las organizaciones.",
        );
        setCargando(false);
      }
    };

    iniciar();
  }, []);

  // =====================================================
  // CAMBIAR ORGANIZACIÓN
  // =====================================================

  const cambiarOrganizacion = async (orgId) => {
    setOrganizacionId(orgId);

    if (!orgId) {
      return;
    }

    await cargarConfiguracion(orgId);
  };

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
            cierre_automatico_minutos: cierreAutomaticoMinutos,
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
          ORGANIZACIÓN
      ===================================================== */}

      {organizaciones.length > 1 && (
        <section className={styles.seccion}>
          <div className={styles.tituloSeccion}>
            <div>
              <h3>Organización</h3>
              <p>
                Selecciona la farmacia cuyas preferencias deseas configurar.
              </p>
            </div>
          </div>

          <div className={styles.campo}>
            <label>Organización</label>
            <select
              value={organizacionId || ""}
              onChange={(e) => cambiarOrganizacion(e.target.value)}
              disabled={guardando}
            >
              <option value="">Seleccione una organización</option>
              {organizaciones.map((organizacion) => (
                <option key={organizacion.id} value={organizacion.id}>
                  {organizacion.nombre}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

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

        {/* CIERRE AUTOMÁTICO */}

        <div className={styles.campo}>
          <label>Cierre automático</label>

          <select
            value={cierreAutomaticoMinutos ?? ""}
            onChange={(e) =>
              setCierreAutomaticoMinutos(
                e.target.value ? Number(e.target.value) : null,
              )
            }
          >
            <option value="">Desactivado</option>
            <option value="15">15 minutos después</option>
            <option value="30">30 minutos después</option>
            <option value="60">1 hora después</option>
          </select>

          <span>
            Al finalizar el horario, el sistema cerrará automáticamente la
            jornada después del tiempo seleccionado.
          </span>
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
