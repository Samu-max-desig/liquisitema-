import { useEffect, useState } from "react";
import {
  LockClosedIcon,
  KeyIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

import styles from "./Seguridad.module.css";

import { supabase } from "../../../../config/supabase";

// =====================================================
// SEGURIDAD
// =====================================================

const Seguridad = () => {
  // =====================================================
  // CAMBIAR CONTRASEÑA DEL ADMINISTRADOR
  // =====================================================

  const [passwordActual, setPasswordActual] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");

  const [mostrarPasswordActual, setMostrarPasswordActual] = useState(false);
  const [mostrarNuevaPassword, setMostrarNuevaPassword] = useState(false);
  const [mostrarConfirmarPassword, setMostrarConfirmarPassword] =
    useState(false);

  const [cargandoPasswordAdmin, setCargandoPasswordAdmin] = useState(false);
  const [nuevoCorreoAdmin, setNuevoCorreoAdmin] = useState("");
  const [cargandoCorreoAdmin, setCargandoCorreoAdmin] = useState(false);
  const [mensajeCorreoAdmin, setMensajeCorreoAdmin] = useState("");
  const [errorCorreoAdmin, setErrorCorreoAdmin] = useState("");
  const [mensajeAdmin, setMensajeAdmin] = useState("");
  const [errorAdmin, setErrorAdmin] = useState("");

  // =====================================================
  // RECUPERAR CONTRASEÑA
  // =====================================================

  const [correoRecuperacion, setCorreoRecuperacion] = useState("");

  const [cargandoRecuperacion, setCargandoRecuperacion] = useState(false);

  const [mensajeRecuperacion, setMensajeRecuperacion] = useState("");
  const [errorRecuperacion, setErrorRecuperacion] = useState("");

  // =====================================================
  // CONTRASEÑA DOMICILIARIO
  // =====================================================

  const [domiciliarios, setDomiciliarios] = useState([]);
  const [cargandoDomiciliarios, setCargandoDomiciliarios] = useState(true);

  const [domiciliarioSeleccionado, setDomiciliarioSeleccionado] = useState("");

  const [nuevaPasswordDomiciliario, setNuevaPasswordDomiciliario] =
    useState("");

  const [confirmarPasswordDomiciliario, setConfirmarPasswordDomiciliario] =
    useState("");

  const [
    mostrarNuevaPasswordDomiciliario,
    setMostrarNuevaPasswordDomiciliario,
  ] = useState(false);

  const [
    mostrarConfirmarPasswordDomiciliario,
    setMostrarConfirmarPasswordDomiciliario,
  ] = useState(false);

  const [cargandoDomiciliario, setCargandoDomiciliario] = useState(false);

  const [mensajeDomiciliario, setMensajeDomiciliario] = useState("");

  const [errorDomiciliario, setErrorDomiciliario] = useState("");

  // =====================================================
  // CARGAR DOMICILIARIOS
  // =====================================================

  useEffect(() => {
    cargarDomiciliarios();
  }, []);

  const cargarDomiciliarios = async () => {
    try {
      setCargandoDomiciliarios(true);

      const {
        data: { user },
        error: errorAuth,
      } = await supabase.auth.getUser();

      if (errorAuth || !user) {
        console.error("No se pudo obtener el usuario autenticado:", errorAuth);

        setDomiciliarios([]);
        return;
      }

      const { data: relacionAdmin, error: errorRelacion } = await supabase
        .from("usuarios_organizaciones")
        .select("organizacion_id")
        .eq("usuario_id", user.id)
        .eq("estado", "activo")
        .limit(1)
        .maybeSingle();

      if (errorRelacion) {
        console.error(
          "Error obteniendo organización del administrador:",
          errorRelacion,
        );

        setDomiciliarios([]);
        return;
      }

      const organizacionId = relacionAdmin?.organizacion_id;

      if (!organizacionId) {
        console.error("El administrador no tiene una organización activa.");

        setDomiciliarios([]);
        return;
      }

      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nombre, telefono, correo")
        .eq("organizacion_id", organizacionId)
        .eq("rol", "domiciliario")
        .eq("estado", "activo")
        .order("nombre", { ascending: true });

      if (error) {
        console.error("Error cargando domiciliarios:", error);

        setDomiciliarios([]);
        return;
      }

      setDomiciliarios(data || []);
    } catch (error) {
      console.error("Error inesperado cargando domiciliarios:", error);

      setDomiciliarios([]);
    } finally {
      setCargandoDomiciliarios(false);
    }
  };

  // =====================================================
  // CAMBIAR CONTRASEÑA DEL DOMICILIARIO
  // =====================================================

  const cambiarPasswordDomiciliario = async (e) => {
    e.preventDefault();

    setMensajeDomiciliario("");
    setErrorDomiciliario("");

    if (!domiciliarioSeleccionado) {
      setErrorDomiciliario("Selecciona un domiciliario.");
      return;
    }

    if (!nuevaPasswordDomiciliario) {
      setErrorDomiciliario("Ingresa una nueva contraseña.");
      return;
    }

    if (nuevaPasswordDomiciliario.length < 6) {
      setErrorDomiciliario("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    if (nuevaPasswordDomiciliario !== confirmarPasswordDomiciliario) {
      setErrorDomiciliario("Las contraseñas no coinciden.");
      return;
    }

    try {
      setCargandoDomiciliario(true);

      const { data, error } = await supabase.functions.invoke(
        "cambiar-password-domiciliario",
        {
          body: {
            domiciliario_id: domiciliarioSeleccionado,
            nueva_password: nuevaPasswordDomiciliario,
          },
        },
      );

      if (error) {
        console.error("Error cambiando contraseña del domiciliario:", error);

        setErrorDomiciliario(
          error.message || "No se pudo cambiar la contraseña.",
        );

        return;
      }

      if (!data?.success) {
        setErrorDomiciliario(
          data?.error || "No se pudo cambiar la contraseña.",
        );

        return;
      }

      setMensajeDomiciliario(
        `Contraseña actualizada correctamente para ${data.domiciliario_nombre}.`,
      );

      setNuevaPasswordDomiciliario("");
      setConfirmarPasswordDomiciliario("");
      setDomiciliarioSeleccionado("");
    } catch (error) {
      console.error("Error inesperado cambiando contraseña:", error);

      setErrorDomiciliario("Ocurrió un error al cambiar la contraseña.");
    } finally {
      setCargandoDomiciliario(false);
    }
  };

  // =====================================================
  // CAMBIAR CONTRASEÑA DEL ADMIN
  // =====================================================
  const cambiarCorreoAdmin = async (e) => {
    e.preventDefault();

    setMensajeCorreoAdmin("");
    setErrorCorreoAdmin("");

    const correo = nuevoCorreoAdmin.trim().toLowerCase();

    if (!correo) {
      setErrorCorreoAdmin("Ingresa el nuevo correo.");
      return;
    }

    const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formatoCorreo.test(correo)) {
      setErrorCorreoAdmin("Ingresa un correo electrónico válido.");
      return;
    }

    try {
      setCargandoCorreoAdmin(true);

      const { data, error } = await supabase.functions.invoke(
        "cambiar-correo-admin",
        {
          body: {
            nuevo_correo: correo,
          },
        },
      );

      if (error) {
        console.error("Error cambiando correo:", error);

        setErrorCorreoAdmin(error.message || "No se pudo cambiar el correo.");

        return;
      }

      if (!data?.success) {
        setErrorCorreoAdmin(data?.error || "No se pudo cambiar el correo.");

        return;
      }

      setMensajeCorreoAdmin(
        `Correo actualizado correctamente a ${data.correo}.`,
      );

      setNuevoCorreoAdmin("");

      /*
       * IMPORTANTE:
       * Después de cambiar el correo de Auth,
       * la sesión actual puede quedar asociada
       * al correo anterior dependiendo de la configuración.
       */
    } catch (error) {
      console.error("Error inesperado cambiando correo:", error);

      setErrorCorreoAdmin("Ocurrió un error al cambiar el correo.");
    } finally {
      setCargandoCorreoAdmin(false);
    }
  };
  const cambiarPasswordAdmin = async (e) => {
    e.preventDefault();

    setMensajeAdmin("");
    setErrorAdmin("");

    if (!passwordActual) {
      setErrorAdmin("Ingresa tu contraseña actual.");
      return;
    }

    if (!nuevaPassword) {
      setErrorAdmin("Ingresa una nueva contraseña.");
      return;
    }

    if (nuevaPassword.length < 6) {
      setErrorAdmin("La nueva contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setErrorAdmin("Las contraseñas no coinciden.");
      return;
    }

    if (passwordActual === nuevaPassword) {
      setErrorAdmin("La nueva contraseña debe ser diferente a la actual.");
      return;
    }

    try {
      setCargandoPasswordAdmin(true);

      // Obtener usuario autenticado
      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario || !user) {
        console.error(
          "No se pudo obtener el usuario autenticado:",
          errorUsuario,
        );

        setErrorAdmin("No se pudo verificar tu cuenta.");
        return;
      }

      if (!user.email) {
        setErrorAdmin("Tu cuenta no tiene un correo electrónico asociado.");
        return;
      }

      // =================================================
      // 1. VERIFICAR CONTRASEÑA ACTUAL
      // =================================================

      const { error: errorVerificacion } =
        await supabase.auth.signInWithPassword({
          email: user.email,
          password: passwordActual,
        });

      if (errorVerificacion) {
        console.error("Contraseña actual incorrecta:", errorVerificacion);

        setErrorAdmin("La contraseña actual es incorrecta.");
        return;
      }

      // =================================================
      // 2. CAMBIAR CONTRASEÑA
      // =================================================

      const { error: errorCambio } = await supabase.auth.updateUser({
        password: nuevaPassword,
      });

      if (errorCambio) {
        console.error("Error actualizando contraseña:", errorCambio);

        setErrorAdmin(
          errorCambio.message || "No se pudo actualizar la contraseña.",
        );
        return;
      }

      // =================================================
      // 3. ÉXITO
      // =================================================

      setMensajeAdmin("Tu contraseña fue actualizada correctamente.");

      setPasswordActual("");
      setNuevaPassword("");
      setConfirmarPassword("");
    } catch (error) {
      console.error("Error inesperado cambiando contraseña:", error);

      setErrorAdmin("Ocurrió un error al cambiar la contraseña.");
    } finally {
      setCargandoPasswordAdmin(false);
    }
  };

  // =====================================================
  // RECUPERAR CONTRASEÑA
  // =====================================================

  const recuperarPassword = async (e) => {
    e.preventDefault();

    setMensajeRecuperacion("");
    setErrorRecuperacion("");

    const correo = correoRecuperacion.trim();

    if (!correo) {
      setErrorRecuperacion("Ingresa tu correo electrónico.");
      return;
    }

    try {
      setCargandoRecuperacion(true);

      const { error } = await supabase.auth.resetPasswordForEmail(correo, {
        redirectTo: `${window.location.origin}/recuperar-password`,
      });

      if (error) {
        console.error("Error enviando recuperación:", error);

        setErrorRecuperacion(
          error.message || "No se pudo enviar el correo de recuperación.",
        );

        return;
      }

      setMensajeRecuperacion(
        "Si el correo está registrado, recibirás un enlace para recuperar tu contraseña.",
      );

      setCorreoRecuperacion("");
    } catch (error) {
      console.error("Error inesperado enviando recuperación:", error);

      setErrorRecuperacion(
        "Ocurrió un error al enviar el correo de recuperación.",
      );
    } finally {
      setCargandoRecuperacion(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className={styles.seguridad}>
      {/* =================================================
          ENCABEZADO
      ================================================= */}

      <div className={styles.encabezado}>
        <div className={styles.iconoEncabezado}>
          <LockClosedIcon />
        </div>

        <div>
          <span className={styles.etiqueta}>SEGURIDAD</span>

          <h2>Seguridad de la cuenta</h2>

          <p>
            Administra contraseñas y opciones básicas de seguridad de acceso.
          </p>
        </div>
      </div>

      {/* =================================================
          CAMBIAR CONTRASEÑA ADMIN
      ================================================= */}

      <div className={styles.tarjeta}>
        <div className={styles.tarjetaEncabezado}>
          <div className={styles.iconoTarjeta}>
            <KeyIcon />
          </div>

          <div>
            <h3>Cambiar mi contraseña</h3>

            <p>Actualiza la contraseña de tu cuenta de administrador.</p>
          </div>
        </div>

        <form className={styles.formulario} onSubmit={cambiarPasswordAdmin}>
          <div className={styles.campo}>
            <label>Contraseña actual</label>

            <div className={styles.inputWrapper}>
              <input
                type={mostrarPasswordActual ? "text" : "password"}
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                placeholder="Ingresa tu contraseña actual"
              />

              <button
                type="button"
                className={styles.botonMostrar}
                onClick={() => setMostrarPasswordActual(!mostrarPasswordActual)}
              >
                {mostrarPasswordActual ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div className={styles.fila}>
            <div className={styles.campo}>
              <label>Nueva contraseña</label>

              <div className={styles.inputWrapper}>
                <input
                  type={mostrarNuevaPassword ? "text" : "password"}
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />

                <button
                  type="button"
                  className={styles.botonMostrar}
                  onClick={() => setMostrarNuevaPassword(!mostrarNuevaPassword)}
                >
                  {mostrarNuevaPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className={styles.campo}>
              <label>Confirmar contraseña</label>

              <div className={styles.inputWrapper}>
                <input
                  type={mostrarConfirmarPassword ? "text" : "password"}
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                />

                <button
                  type="button"
                  className={styles.botonMostrar}
                  onClick={() =>
                    setMostrarConfirmarPassword(!mostrarConfirmarPassword)
                  }
                >
                  {mostrarConfirmarPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
          </div>

          {mensajeAdmin && (
            <p className={styles.mensajeExito}>{mensajeAdmin}</p>
          )}

          {errorAdmin && <p className={styles.mensajeError}>{errorAdmin}</p>}

          <div className={styles.acciones}>
            <button
              type="submit"
              className={styles.botonPrincipal}
              disabled={cargandoPasswordAdmin}
            >
              {cargandoPasswordAdmin ? "Actualizando..." : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      </div>
      <div className={styles.tarjeta}>
        <div className={styles.tarjetaEncabezado}>
          <div className={styles.iconoTarjeta}>
            <KeyIcon />
          </div>

          <div>
            <h3>Cambiar correo electrónico</h3>

            <p>Actualiza el correo asociado a tu cuenta de administrador.</p>
          </div>
        </div>

        <form className={styles.formulario} onSubmit={cambiarCorreoAdmin}>
          <div className={styles.campo}>
            <label>Nuevo correo electrónico</label>

            <input
              type="email"
              value={nuevoCorreoAdmin}
              onChange={(e) => {
                setNuevoCorreoAdmin(e.target.value);
                setMensajeCorreoAdmin("");
                setErrorCorreoAdmin("");
              }}
              placeholder="correo@ejemplo.com"
            />
          </div>

          {mensajeCorreoAdmin && (
            <p className={styles.mensajeExito}>{mensajeCorreoAdmin}</p>
          )}

          {errorCorreoAdmin && (
            <p className={styles.mensajeError}>{errorCorreoAdmin}</p>
          )}

          <div className={styles.acciones}>
            <button
              type="submit"
              className={styles.botonPrincipal}
              disabled={cargandoCorreoAdmin}
            >
              {cargandoCorreoAdmin ? "Actualizando..." : "Cambiar correo"}
            </button>
          </div>
        </form>
      </div>
      {/* =================================================
          RECUPERAR CONTRASEÑA
      ================================================= */}

      <div className={styles.tarjeta}>
        <div className={styles.tarjetaEncabezado}>
          <div className={styles.iconoTarjeta}>
            <ArrowPathIcon />
          </div>

          <div>
            <h3>Recuperar contraseña</h3>

            <p>Envía un correo para recuperar el acceso a tu cuenta.</p>
          </div>
        </div>

        <form className={styles.formulario} onSubmit={recuperarPassword}>
          <div className={styles.campo}>
            <label>Correo electrónico</label>

            <input
              type="email"
              value={correoRecuperacion}
              onChange={(e) => setCorreoRecuperacion(e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </div>

          {mensajeRecuperacion && (
            <p className={styles.mensajeExito}>{mensajeRecuperacion}</p>
          )}

          {errorRecuperacion && (
            <p className={styles.mensajeError}>{errorRecuperacion}</p>
          )}

          <div className={styles.acciones}>
            <button
              type="submit"
              className={styles.botonSecundario}
              disabled={cargandoRecuperacion}
            >
              {cargandoRecuperacion ? "Enviando..." : "Enviar recuperación"}
            </button>
          </div>
        </form>
      </div>

      {/* =================================================
          CONTRASEÑA DOMICILIARIOS
      ================================================= */}

      <div className={styles.tarjeta}>
        <div className={styles.tarjetaEncabezado}>
          <div className={styles.iconoTarjeta}>
            <UserIcon />
          </div>

          <div>
            <h3>Contraseña de domiciliarios</h3>

            <p>
              Cambia la contraseña de un domiciliario perteneciente a tu
              organización.
            </p>
          </div>
        </div>

        <form
          className={styles.formulario}
          onSubmit={cambiarPasswordDomiciliario}
        >
          <div className={styles.campo}>
            <label>Domiciliario</label>

            <select
              value={domiciliarioSeleccionado}
              onChange={(e) => {
                setDomiciliarioSeleccionado(e.target.value);
                setMensajeDomiciliario("");
                setErrorDomiciliario("");
              }}
              disabled={cargandoDomiciliarios}
            >
              <option value="">
                {cargandoDomiciliarios
                  ? "Cargando domiciliarios..."
                  : "Selecciona un domiciliario"}
              </option>

              {domiciliarios.map((domiciliario) => (
                <option key={domiciliario.id} value={domiciliario.id}>
                  {domiciliario.nombre}
                  {domiciliario.telefono ? ` - ${domiciliario.telefono}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fila}>
            <div className={styles.campo}>
              <label>Nueva contraseña</label>

              <div className={styles.inputWrapper}>
                <input
                  type={mostrarNuevaPasswordDomiciliario ? "text" : "password"}
                  value={nuevaPasswordDomiciliario}
                  onChange={(e) => setNuevaPasswordDomiciliario(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />

                <button
                  type="button"
                  className={styles.botonMostrar}
                  onClick={() =>
                    setMostrarNuevaPasswordDomiciliario(
                      !mostrarNuevaPasswordDomiciliario,
                    )
                  }
                >
                  {mostrarNuevaPasswordDomiciliario ? (
                    <EyeSlashIcon />
                  ) : (
                    <EyeIcon />
                  )}
                </button>
              </div>
            </div>

            <div className={styles.campo}>
              <label>Confirmar contraseña</label>

              <div className={styles.inputWrapper}>
                <input
                  type={
                    mostrarConfirmarPasswordDomiciliario ? "text" : "password"
                  }
                  value={confirmarPasswordDomiciliario}
                  onChange={(e) =>
                    setConfirmarPasswordDomiciliario(e.target.value)
                  }
                  placeholder="Repite la contraseña"
                />

                <button
                  type="button"
                  className={styles.botonMostrar}
                  onClick={() =>
                    setMostrarConfirmarPasswordDomiciliario(
                      !mostrarConfirmarPasswordDomiciliario,
                    )
                  }
                >
                  {mostrarConfirmarPasswordDomiciliario ? (
                    <EyeSlashIcon />
                  ) : (
                    <EyeIcon />
                  )}
                </button>
              </div>
            </div>
          </div>

          {mensajeDomiciliario && (
            <p className={styles.mensajeExito}>{mensajeDomiciliario}</p>
          )}

          {errorDomiciliario && (
            <p className={styles.mensajeError}>{errorDomiciliario}</p>
          )}

          <div className={styles.acciones}>
            <button
              type="submit"
              className={styles.botonPrincipal}
              disabled={cargandoDomiciliario}
            >
              {cargandoDomiciliario ? "Actualizando..." : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Seguridad;
