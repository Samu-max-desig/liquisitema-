import { useEffect, useRef, useState } from "react";

import {
  BellIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  PlayIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

import { supabase } from "../../../../config/supabase";

import {
  obtenerPreferenciasNotificaciones,
  guardarPreferenciasNotificaciones,
} from "../../../../services/preferenciasNotificacionesService";

import styles from "./Notificaciones.module.css";

const sonidosDisponibles = [
  {
    archivo: "noti1.mp3",
    nombre: "Notificación 1",
  },
  {
    archivo: "noti2.mp3",
    nombre: "Notificación 2",
  },
  {
    archivo: "noti3.mp3",
    nombre: "Notificación 3",
  },
  {
    archivo: "noti4.mp3",
    nombre: "Notificación 4",
  },
  {
    archivo: "noti5.mp3",
    nombre: "Notificación 5",
  },
  {
    archivo: "noti6.mp3",
    nombre: "Notificación 6",
  },
];

function Notificaciones() {
  const [usuario, setUsuario] = useState(null);
  const [organizacionId, setOrganizacionId] = useState(null);

  const [preferencias, setPreferencias] = useState({
    actividad: true,
    pendientes: true,
    reportes: true,
    cierres: true,
    comprobantes: true,
    sonidos: true,
    sonido_archivo: "noti1.mp3",
    volumen_sonido: 70,
  });

  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [cargando, setCargando] = useState(true);

  const audioRef = useRef(null);

  // ============================================================
  // OBTENER USUARIO Y ORGANIZACIÓN
  // ============================================================

  useEffect(() => {
    const cargarUsuarioYOrganizacion = async () => {
      try {
        const usuarioGuardado = JSON.parse(
          sessionStorage.getItem("usuario") || "null",
        );

        if (!usuarioGuardado?.id) {
          console.error("No se encontró el usuario en sesión.");
          setCargando(false);
          return;
        }

        setUsuario(usuarioGuardado);

        // Primero intentamos organización directa.
        if (usuarioGuardado.organizacion_id) {
          setOrganizacionId(usuarioGuardado.organizacion_id);
          return;
        }

        // Si es null, buscamos la relación activa.
        const { data, error } = await supabase
          .from("usuarios_organizaciones")
          .select("organizacion_id")
          .eq("usuario_id", usuarioGuardado.id)
          .eq("estado", "activo")
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error obteniendo organización del usuario:", error);
          return;
        }

        if (data?.organizacion_id) {
          setOrganizacionId(data.organizacion_id);
        }
      } catch (error) {
        console.error("Error cargando usuario y organización:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarUsuarioYOrganizacion();
  }, []);

  // ============================================================
  // CARGAR PREFERENCIAS
  // ============================================================

  useEffect(() => {
    if (!usuario?.id || !organizacionId) return;

    const cargarPreferencias = async () => {
      try {
        const data = await obtenerPreferenciasNotificaciones(
          usuario.id,
          organizacionId,
        );

        setPreferencias({
          actividad: data.actividad ?? true,
          pendientes: data.pendientes ?? true,
          reportes: data.reportes ?? true,
          cierres: data.cierres ?? true,
          comprobantes: data.comprobantes ?? true,
          sonidos: data.sonidos ?? true,
          sonido_archivo: data.sonido_archivo || "noti1.mp3",
          volumen_sonido: data.volumen_sonido ?? 70,
        });
      } catch (error) {
        console.error("Error cargando preferencias:", error);
      }
    };

    cargarPreferencias();
  }, [usuario, organizacionId]);

  // ============================================================
  // CAMBIAR PREFERENCIA
  // ============================================================

  const cambiarPreferencia = (campo) => {
    setPreferencias((actuales) => ({
      ...actuales,
      [campo]: !actuales[campo],
    }));

    setGuardado(false);
  };

  // ============================================================
  // CAMBIAR SONIDO
  // ============================================================

  const cambiarSonido = (archivo) => {
    setPreferencias((actuales) => ({
      ...actuales,
      sonido_archivo: archivo,
    }));

    setGuardado(false);
  };

  // ============================================================
  // CAMBIAR VOLUMEN
  // ============================================================

  const cambiarVolumen = (valor) => {
    setPreferencias((actuales) => ({
      ...actuales,
      volumen_sonido: Number(valor),
    }));

    setGuardado(false);
  };

  // ============================================================
  // PROBAR SONIDO
  // ============================================================

  const probarSonido = async () => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const audio = new Audio(`/sounds/${preferencias.sonido_archivo}`);

      audio.volume = preferencias.volumen_sonido / 100;

      audioRef.current = audio;

      await audio.play();
    } catch (error) {
      console.error("No se pudo reproducir el sonido:", error);
    }
  };

  // ============================================================
  // GUARDAR
  // ============================================================

  const guardar = async () => {
    if (!usuario?.id || !organizacionId) {
      console.error("No hay usuario u organización para guardar.");
      return;
    }

    try {
      setGuardando(true);
      setGuardado(false);

      await guardarPreferenciasNotificaciones({
        usuarioId: usuario.id,
        organizacionId,
        preferencias,
      });

      setGuardado(true);

      setTimeout(() => {
        setGuardado(false);
      }, 3000);
    } catch (error) {
      console.error("Error guardando preferencias:", error);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <section className={styles.contenedor}>
        <div className={styles.cargando}>Cargando preferencias...</div>
      </section>
    );
  }

  return (
    <section className={styles.contenedor}>
      <div className={styles.encabezado}>
        <div className={styles.iconoPrincipal}>
          <BellIcon />
        </div>

        <div>
          <h2>Notificaciones</h2>
          <p>
            Controla qué avisos quieres recibir y personaliza el sonido de las
            notificaciones.
          </p>
        </div>
      </div>

      {/* ======================================================
          TIPOS DE NOTIFICACIONES
          ====================================================== */}

      <div className={styles.seccion}>
        <div className={styles.tituloSeccion}>
          <h3>Tipos de notificaciones</h3>
          <p>Activa o desactiva los avisos que quieres recibir en tu panel.</p>
        </div>

        <div className={styles.lista}>
          <Preferencia
            titulo="Actividad"
            descripcion="Recibe avisos relacionados con la actividad de tu organización."
            activa={preferencias.actividad}
            onClick={() => cambiarPreferencia("actividad")}
          />

          <Preferencia
            titulo="Pendientes"
            descripcion="Recibe avisos cuando existan pendientes que requieran atención."
            activa={preferencias.pendientes}
            onClick={() => cambiarPreferencia("pendientes")}
          />

          <Preferencia
            titulo="Reportes"
            descripcion="Recibe avisos sobre nuevos reportes y solicitudes relacionadas."
            activa={preferencias.reportes}
            onClick={() => cambiarPreferencia("reportes")}
          />

          <Preferencia
            titulo="Cierres"
            descripcion="Recibe avisos relacionados con los cierres de jornada."
            activa={preferencias.cierres}
            onClick={() => cambiarPreferencia("cierres")}
          />

          <Preferencia
            titulo="Comprobantes"
            descripcion="Recibe avisos relacionados con comprobantes y movimientos."
            activa={preferencias.comprobantes}
            onClick={() => cambiarPreferencia("comprobantes")}
          />
        </div>
      </div>

      {/* ======================================================
          SONIDOS
          ====================================================== */}

      <div className={styles.seccion}>
        <div className={styles.tituloSeccion}>
          <h3>Sonidos</h3>
          <p>
            Personaliza el sonido que se reproducirá cuando recibas una
            notificación.
          </p>
        </div>

        <Preferencia
          titulo="Sonidos de notificación"
          descripcion="Reproducir un sonido cuando llegue una nueva notificación."
          activa={preferencias.sonidos}
          onClick={() => cambiarPreferencia("sonidos")}
        />

        {preferencias.sonidos && (
          <div className={styles.configuracionSonido}>
            {/* SELECTOR */}
            <div className={styles.campo}>
              <label htmlFor="sonido">Sonido de notificación</label>

              <select
                id="sonido"
                value={preferencias.sonido_archivo}
                onChange={(event) => cambiarSonido(event.target.value)}
              >
                {sonidosDisponibles.map((sonido) => (
                  <option key={sonido.archivo} value={sonido.archivo}>
                    {sonido.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* VOLUMEN */}
            <div className={styles.volumen}>
              <div className={styles.volumenHeader}>
                <label htmlFor="volumen">Volumen</label>

                <span>{preferencias.volumen_sonido}%</span>
              </div>

              <div className={styles.controlVolumen}>
                {preferencias.volumen_sonido === 0 ? (
                  <SpeakerXMarkIcon />
                ) : (
                  <SpeakerWaveIcon />
                )}

                <input
                  id="volumen"
                  type="range"
                  min="0"
                  max="100"
                  value={preferencias.volumen_sonido}
                  onChange={(event) => cambiarVolumen(event.target.value)}
                />
              </div>
            </div>

            {/* PROBAR */}
            <button
              type="button"
              className={styles.botonProbar}
              onClick={probarSonido}
            >
              <PlayIcon />
              Probar sonido
            </button>
          </div>
        )}
      </div>

      {/* ======================================================
          GUARDAR
          ====================================================== */}

      <div className={styles.footer}>
        {guardado && (
          <span className={styles.mensajeGuardado}>
            <CheckIcon />
            Cambios guardados
          </span>
        )}

        <button
          type="button"
          className={styles.botonGuardar}
          onClick={guardar}
          disabled={guardando}
        >
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </section>
  );
}

// ============================================================
// COMPONENTE PREFERENCIA
// ============================================================

function Preferencia({ titulo, descripcion, activa, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.preferencia} ${activa ? styles.activa : ""}`}
      onClick={onClick}
    >
      <div className={styles.preferenciaTexto}>
        <strong>{titulo}</strong>
        <span>{descripcion}</span>
      </div>

      <div
        className={`${styles.interruptor} ${
          activa ? styles.interruptorActivo : ""
        }`}
      >
        <div className={styles.circulo} />
      </div>
    </button>
  );
}

export default Notificaciones;
