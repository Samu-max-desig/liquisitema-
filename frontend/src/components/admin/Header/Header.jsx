import { useEffect, useRef, useState } from "react";
import {
  BellIcon,
  ArrowRightOnRectangleIcon,
  CheckIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

import styles from "./Header.module.css";
import PerfilMenu from "../Perfil/PerfilMenu";

import {
  obtenerNotificacionesSistema,
  marcarNotificacionSistemaLeida,
  marcarTodasNotificacionesSistemaLeidas,
} from "../../../services/notificacionesSistemaService";

import { obtenerPreferenciasNotificaciones } from "../../../services/preferenciasNotificacionesService";

import { supabase } from "../../../config/supabase";

export default function Header() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);

  const [preferenciasSonido, setPreferenciasSonido] = useState({
    sonidos: true,
    sonido_archivo: "noti1.mp3",
    volumen_sonido: 70,
  });

  const audioContextRef = useRef(null);
  const sonidoBufferRef = useRef(null);
  const preferenciasSonidoRef = useRef({
    sonidos: true,
    sonido_archivo: "noti1.mp3",
    volumen_sonido: 70,
  });
  const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");

  const notificacionesNoLeidas = notificaciones.filter(
    (notificacion) => !notificacion.leida,
  ).length;

  // ============================================================
  // OBTENER ORGANIZACIÓN DEL USUARIO
  // ============================================================

  const obtenerOrganizacionUsuario = async () => {
    if (!usuario?.id) return null;

    // Organización directa
    if (usuario.organizacion_id) {
      return usuario.organizacion_id;
    }

    // Organización mediante relación
    const { data, error } = await supabase
      .from("usuarios_organizaciones")
      .select("organizacion_id")
      .eq("usuario_id", usuario.id)
      .eq("estado", "activo")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "Error obteniendo organización para notificaciones:",
        error,
      );
      return null;
    }

    return data?.organizacion_id || null;
  };

  // ============================================================
  // CARGAR PREFERENCIAS DE SONIDO
  // ============================================================

  const cargarPreferenciasSonido = async () => {
    if (!usuario?.id) return;

    try {
      const organizacionId = await obtenerOrganizacionUsuario();

      if (!organizacionId) {
        return;
      }

      const data = await obtenerPreferenciasNotificaciones(
        usuario.id,
        organizacionId,
      );

      const nuevasPreferencias = {
        sonidos: data.sonidos ?? true,
        sonido_archivo: data.sonido_archivo || "noti1.mp3",
        volumen_sonido: data.volumen_sonido ?? 70,
      };

      setPreferenciasSonido(nuevasPreferencias);

      // Guardamos también una referencia actualizada.
      preferenciasSonidoRef.current = nuevasPreferencias;
    } catch (error) {
      console.error("Error cargando preferencias de sonido:", error);
    }
  };
  // ============================================================
  // REPRODUCIR NOTIFICACIÓN
  // ============================================================
  const desbloquearAudio = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext || window.webkitAudioContext
        )();
      }

      const contexto = audioContextRef.current;

      if (contexto.state === "suspended") {
        await contexto.resume();
      }

      // Cargamos el sonido actualmente seleccionado.
      const archivo =
        preferenciasSonidoRef.current.sonido_archivo || "noti1.mp3";

      const respuesta = await fetch(`/sounds/${archivo}`);

      if (!respuesta.ok) {
        throw new Error(`No se encontró el sonido: ${archivo}`);
      }

      const arrayBuffer = await respuesta.arrayBuffer();

      sonidoBufferRef.current = await contexto.decodeAudioData(arrayBuffer);

      console.log("Audio de notificaciones preparado.");
    } catch (error) {
      console.error("Error preparando audio:", error);
    }
  };
  useEffect(() => {
    const manejarInteraccion = () => {
      desbloquearAudio();
    };

    window.addEventListener("pointerdown", manejarInteraccion, { once: true });

    return () => {
      window.removeEventListener("pointerdown", manejarInteraccion);
    };
  }, []);
  const reproducirSonidoNotificacion = async () => {
    try {
      const preferencias = preferenciasSonidoRef.current;

      if (!preferencias.sonidos) {
        return;
      }

      if (!audioContextRef.current) {
        return;
      }

      const contexto = audioContextRef.current;

      if (contexto.state === "suspended") {
        await contexto.resume();
      }

      // Si cambió el sonido, cargamos el nuevo archivo.
      const archivo = preferencias.sonido_archivo || "noti1.mp3";

      if (!sonidoBufferRef.current) {
        const respuesta = await fetch(`/sounds/${archivo}`);

        if (!respuesta.ok) {
          throw new Error(`No se encontró el sonido: ${archivo}`);
        }

        const arrayBuffer = await respuesta.arrayBuffer();

        sonidoBufferRef.current = await contexto.decodeAudioData(arrayBuffer);
      }

      const fuente = contexto.createBufferSource();

      const ganancia = contexto.createGain();

      fuente.buffer = sonidoBufferRef.current;

      ganancia.gain.value = Math.max(
        0,
        Math.min(1, preferencias.volumen_sonido / 100),
      );

      fuente.connect(ganancia);
      ganancia.connect(contexto.destination);

      fuente.start(0);
    } catch (error) {
      console.error("Error reproduciendo notificación:", error);
    }
  };
  // ============================================================
  // CARGAR NOTIFICACIONES
  // ============================================================

  const cargarNotificaciones = async () => {
    if (!usuario?.id) return;

    try {
      const data = await obtenerNotificacionesSistema(usuario.id);

      setNotificaciones(data);
    } catch (error) {
      console.error("Error cargando notificaciones:", error);
    }
  };

  // ============================================================
  // INICIALIZAR HEADER
  // ============================================================

  useEffect(() => {
    if (!usuario?.id) return;

    cargarNotificaciones();
    cargarPreferenciasSonido();

    const canal = supabase
      .channel(`notificaciones-sistema-${usuario.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificaciones_sistema",
          filter: `usuario_id=eq.${usuario.id}`,
        },
        async (payload) => {
          // Agregar inmediatamente al Header
          setNotificaciones((actuales) => [payload.new, ...actuales]);

          // Reproducir sonido
          await reproducirSonidoNotificacion();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      sonidoBufferRef.current = null;
    };
  }, [usuario?.id]);

  // ============================================================
  // MARCAR UNA COMO LEÍDA
  // ============================================================

  const marcarComoLeida = async (id) => {
    try {
      await marcarNotificacionSistemaLeida(id);

      setNotificaciones((actuales) =>
        actuales.map((notificacion) =>
          notificacion.id === id
            ? {
                ...notificacion,
                leida: true,
              }
            : notificacion,
        ),
      );
    } catch (error) {
      console.error("Error marcando notificación:", error);
    }
  };

  // ============================================================
  // MARCAR TODAS COMO LEÍDAS
  // ============================================================

  const marcarTodasComoLeidas = async () => {
    if (!usuario?.id) return;

    try {
      await marcarTodasNotificacionesSistemaLeidas(usuario.id);

      setNotificaciones((actuales) =>
        actuales.map((notificacion) => ({
          ...notificacion,
          leida: true,
        })),
      );
    } catch (error) {
      console.error("Error marcando todas las notificaciones:", error);
    }
  };

  // ============================================================
  // FORMATEAR FECHA
  // ============================================================

  const formatearFecha = (fecha) => {
    if (!fecha) return "";

    return new Date(fecha).toLocaleString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <h1>Liquisistema</h1>
        <span>Panel administrativo</span>
      </div>

      <div className={styles.actions}>
        {/* ======================================================
            NOTIFICACIONES
            ====================================================== */}

        <div className={styles.notificationWrapper}>
          <button
            className={styles.actionButton}
            type="button"
            title="Notificaciones"
            onClick={() => setMostrarNotificaciones((actual) => !actual)}
          >
            <BellIcon />

            {notificacionesNoLeidas > 0 && (
              <span className={styles.notificationBadge}>
                {notificacionesNoLeidas > 99 ? "99+" : notificacionesNoLeidas}
              </span>
            )}
          </button>

          {mostrarNotificaciones && (
            <div className={styles.notificationPanel}>
              <div className={styles.notificationHeader}>
                <div>
                  <h3>Notificaciones</h3>

                  {notificacionesNoLeidas > 0 && (
                    <span>{notificacionesNoLeidas} sin leer</span>
                  )}
                </div>

                {notificacionesNoLeidas > 0 && (
                  <button
                    type="button"
                    className={styles.markAllButton}
                    onClick={marcarTodasComoLeidas}
                  >
                    <CheckCircleIcon />
                    Marcar todas
                  </button>
                )}
              </div>

              <div className={styles.notificationList}>
                {notificaciones.length === 0 ? (
                  <div className={styles.emptyNotifications}>
                    <BellIcon />
                    <p>No tienes notificaciones</p>
                  </div>
                ) : (
                  notificaciones.map((notificacion) => (
                    <div
                      key={notificacion.id}
                      className={`${styles.notificationItem} ${
                        !notificacion.leida ? styles.unread : ""
                      }`}
                      onClick={() => {
                        if (!notificacion.leida) {
                          marcarComoLeida(notificacion.id);
                        }
                      }}
                    >
                      <div className={styles.notificationContent}>
                        <div className={styles.notificationTitleRow}>
                          <strong>{notificacion.titulo}</strong>

                          {!notificacion.leida && (
                            <span className={styles.unreadIndicator} />
                          )}
                        </div>

                        <p>{notificacion.mensaje}</p>

                        <small>{formatearFecha(notificacion.created_at)}</small>
                      </div>

                      {!notificacion.leida && (
                        <button
                          type="button"
                          className={styles.checkButton}
                          title="Marcar como leída"
                          onClick={(event) => {
                            event.stopPropagation();

                            marcarComoLeida(notificacion.id);
                          }}
                        >
                          <CheckIcon />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* PERFIL */}
        <PerfilMenu />

        {/* CERRAR SESIÓN */}
        <button
          className={styles.actionButton}
          type="button"
          title="Cerrar sesión"
          onClick={() => {
            localStorage.removeItem("usuario");
            sessionStorage.removeItem("usuario");
            window.location.href = "/";
          }}
        >
          <ArrowRightOnRectangleIcon />
        </button>
      </div>
    </header>
  );
}
