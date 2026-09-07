import { useEffect, useState } from "react";
import {
  UsersIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShareIcon,
  PencilIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { supabase } from "../../../config/supabase";
import { registrarActividad } from "../../../services/actividadService";
import styles from "./Usuarios.module.css";

export default function Usuarios() {
  const usuarioActual = JSON.parse(sessionStorage.getItem("usuario") || "null");
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [organizaciones, setOrganizaciones] = useState([]);
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalCompartir, setModalCompartir] = useState(false);
  const [usuarioCompartir, setUsuarioCompartir] = useState(null);
  const [organizacionDestino, setOrganizacionDestino] = useState("");
  const [compartiendoUsuario, setCompartiendoUsuario] = useState(false);

  const [solicitudEntrante, setSolicitudEntrante] = useState(null);
  const [procesandoSolicitud, setProcesandoSolicitud] = useState(false);

  const [mensajeCompartir, setMensajeCompartir] = useState({
    tipo: "",
    texto: "",
  });
  const [editandoUsuario, setEditandoUsuario] = useState(false);
  const [creandoUsuario, setCreandoUsuario] = useState(false);

  // Usuario tal como estaba antes de editarlo
  const [usuarioOriginal, setUsuarioOriginal] = useState(null);

  const [mensaje, setMensaje] = useState({
    tipo: "",
    texto: "",
  });

  const [usuarioEditando, setUsuarioEditando] = useState({
    id: "",
    nombre: "",
    telefono: "",
    direccion: "",
    documento: "",
    correo: "",
    rol: "domiciliario",
    estado: "activo",
  });
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    documento: "",
    correo: "",
    rol: "domiciliario",
    estado: "activo",
    password: "",
    confirmarPassword: "",
    organizacion_id: "",
  });

  // ==========================================
  // CAMBIAR DATOS DEL USUARIO EN EDICIÓN
  // ==========================================

  const manejarCambioEditar = (e) => {
    const { name, value } = e.target;

    setUsuarioEditando((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  // ==========================================
  // ABRIR MODAL DE EDICIÓN
  // ==========================================

  const abrirModalEditar = (usuario) => {
    // Guardamos una copia del usuario original
    setUsuarioOriginal({ ...usuario });

    setUsuarioEditando({
      id: usuario.id,
      nombre: usuario.nombre || "",
      telefono: usuario.telefono || "",
      direccion: usuario.direccion || "",
      documento: usuario.documento || "",
      correo: usuario.correo || "",
      rol: usuario.rol || "domiciliario",
      estado: usuario.estado || "activo",
    });

    setMensaje({
      tipo: "",
      texto: "",
    });

    setModalEditar(true);
  };

  // ==========================================
  // CERRAR MODAL DE EDICIÓN
  // ==========================================

  const cerrarModalEditar = () => {
    if (editandoUsuario) return;

    setModalEditar(false);
    setUsuarioOriginal(null);

    setUsuarioEditando({
      id: "",
      nombre: "",
      telefono: "",
      direccion: "",
      documento: "",
      correo: "",
      rol: "domiciliario",
      estado: "activo",
    });

    setMensaje({
      tipo: "",
      texto: "",
    });
  };

  // ==========================================
  // GUARDAR EDICIÓN DEL USUARIO
  // ==========================================

  const guardarEdicionUsuario = async (e) => {
    e.preventDefault();
    const usuarioActual = JSON.parse(
      sessionStorage.getItem("usuario") || "null",
    );
    setMensaje({
      tipo: "",
      texto: "",
    });

    if (
      !usuarioEditando.nombre ||
      !usuarioEditando.documento ||
      !usuarioEditando.correo ||
      !usuarioEditando.rol
    ) {
      setMensaje({
        tipo: "error",
        texto: "Completa todos los campos obligatorios.",
      });

      return;
    }

    setEditandoUsuario(true);

    // ==========================================
    // ACTUALIZAR USUARIO
    // ==========================================

    const { error } = await supabase
      .from("usuarios")
      .update({
        nombre: usuarioEditando.nombre,
        telefono: usuarioEditando.telefono || null,
        direccion: usuarioEditando.direccion || null,
        documento: usuarioEditando.documento,
        correo: usuarioEditando.correo,
        rol: usuarioEditando.rol,
        estado: usuarioEditando.estado,
      })
      .eq("id", usuarioEditando.id);

    if (error) {
      console.error("Error editando usuario:", error);

      setMensaje({
        tipo: "error",
        texto: error.message || "No se pudo actualizar el usuario.",
      });

      setEditandoUsuario(false);

      return;
    }

    // ==========================================
    // DETECTAR CAMBIOS
    // ==========================================

    const cambioEstado = usuarioOriginal?.estado !== usuarioEditando.estado;

    const cambioInformacion =
      usuarioOriginal?.nombre !== usuarioEditando.nombre ||
      usuarioOriginal?.telefono !== usuarioEditando.telefono ||
      usuarioOriginal?.direccion !== usuarioEditando.direccion ||
      usuarioOriginal?.documento !== usuarioEditando.documento ||
      usuarioOriginal?.correo !== usuarioEditando.correo ||
      usuarioOriginal?.rol !== usuarioEditando.rol;

    // ==========================================
    // REGISTRAR EDICIÓN DE INFORMACIÓN
    // ==========================================

    if (cambioInformacion) {
      await registrarActividad({
        tipo: "usuario",
        accion: "editar",
        descripcion: `Editó la información del usuario ${usuarioEditando.nombre}.`,
        referenciaId: null,
        organizacionId: usuarioActual?.organizacion_id,
        usuarioAfectadoId: usuarioEditando.id,
      });
    }

    // ==========================================
    // REGISTRAR CAMBIO DE ESTADO
    // ==========================================

    if (cambioEstado) {
      await registrarActividad({
        tipo: "usuario",
        accion: "cambio_estado",
        descripcion: `Cambió el estado del usuario ${usuarioEditando.nombre} de ${usuarioOriginal?.estado} a ${usuarioEditando.estado}.`,
        referenciaId: null,
        organizacionId: usuarioActual?.organizacion_id,
        usuarioAfectadoId: usuarioEditando.id,
      });
    }

    // ==========================================
    // MENSAJE DE ÉXITO
    // ==========================================

    setMensaje({
      tipo: "exito",
      texto: "Usuario actualizado correctamente.",
    });

    await cargarUsuarios();

    setEditandoUsuario(false);

    setTimeout(() => {
      cerrarModalEditar();
    }, 700);
  };

  // ==========================================
  // CAMBIAR DATOS DEL NUEVO USUARIO
  // ==========================================

  const manejarCambioUsuario = (e) => {
    const { name, value } = e.target;

    setNuevoUsuario((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  // ==========================================
  // CERRAR MODAL CREAR
  // ==========================================

  const cerrarModalCrear = () => {
    if (creandoUsuario) return;

    setModalCrear(false);

    setNuevoUsuario({
      nombre: "",
      telefono: "",
      direccion: "",
      documento: "",
      correo: "",
      rol: "domiciliario",
      estado: "activo",
      password: "",
      confirmarPassword: "",
    });

    setMensaje({
      tipo: "",
      texto: "",
    });
  };

  // ==========================================
  // CARGAR USUARIOS
  // ==========================================

  useEffect(() => {
    cargarUsuarios();
    cargarOrganizaciones();
  }, []);
  useEffect(() => {
    if (!usuarioActual?.id || usuarioActual.rol !== "admin") {
      return;
    }

    const cargarSolicitudesPendientes = async () => {
      const { data, error } = await supabase
        .from("solicitudes_usuarios")
        .select(
          `
        id,
        usuario_id,
        organizacion_origen_id,
        organizacion_destino_id,
        enviado_por,
        estado,
        created_at,
        usuarios:usuario_id (
          id,
          nombre
        ),
        organizaciones:organizacion_origen_id (
          id,
          nombre
        )
      `,
        )
        .eq("organizacion_destino_id", usuarioActual.organizacion_id)
        .eq("estado", "pendiente")
        .order("created_at", {
          ascending: false,
        })
        .limit(1);

      if (error) {
        console.error("Error cargando solicitudes pendientes:", error);
        return;
      }

      if (data?.length > 0) {
        setSolicitudEntrante(data[0]);
      }
    };

    cargarSolicitudesPendientes();

    const canal = supabase
      .channel(`solicitudes-usuarios-${usuarioActual.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "solicitudes_usuarios",
        },
        async (payload) => {
          const solicitud = payload.new;

          if (
            payload.eventType === "INSERT" &&
            solicitud.organizacion_destino_id ===
              usuarioActual.organizacion_id &&
            solicitud.estado === "pendiente"
          ) {
            const { data } = await supabase
              .from("solicitudes_usuarios")
              .select(
                `
              id,
              usuario_id,
              organizacion_origen_id,
              organizacion_destino_id,
              enviado_por,
              estado,
              created_at,
              usuarios:usuario_id (
                id,
                nombre
              ),
              organizaciones:organizacion_origen_id (
                id,
                nombre
              )
            `,
              )
              .eq("id", solicitud.id)
              .single();

            if (data) {
              setSolicitudEntrante(data);
            }
          }

          if (
            payload.eventType === "UPDATE" &&
            solicitud.organizacion_origen_id ===
              usuarioActual.organizacion_id &&
            solicitud.estado === "rechazada"
          ) {
            const nombreUsuario = solicitud.usuario_id;

            const { data: usuario } = await supabase
              .from("usuarios")
              .select("nombre")
              .eq("id", nombreUsuario)
              .single();

            const { data: organizacion } = await supabase
              .from("organizaciones")
              .select("nombre")
              .eq("id", solicitud.organizacion_destino_id)
              .single();

            setMensaje({
              tipo: "error",
              texto: `${organizacion?.nombre || "El administrador"} no aceptó recibir a ${usuario?.nombre || "el usuario"}.`,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);
  const cargarUsuarios = async () => {
    setCargando(true);
    console.log("USUARIO ACTUAL:", usuarioActual);
    console.log("ORGANIZACIÓN DEL ADMIN:", usuarioActual?.organizacion_id);
    if (!usuarioActual?.id) {
      setUsuarios([]);
      setCargando(false);
      return;
    }

    // ==========================================
    // SUPER ADMIN → VE TODOS LOS USUARIOS
    // ==========================================
    const { data: pruebaRelaciones, error: errorPrueba } = await supabase
      .from("usuarios_organizaciones")
      .select("usuario_id, organizacion_id, rol, estado")
      .eq("organizacion_id", usuarioActual.organizacion_id);

    console.log("RELACIONES DIRECTAS:", pruebaRelaciones);
    console.log("ERROR RELACIONES:", errorPrueba);
    if (usuarioActual.rol === "super_admin") {
      const { data, error } = await supabase
        .from("usuarios")
        .select(
          "id, nombre, telefono, direccion, documento, correo, rol, estado, created_at",
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error("Error cargando usuarios:", error);
        setUsuarios([]);
        setCargando(false);
        return;
      }

      setUsuarios(data || []);
      console.log("USUARIOS QUE RECIBIÓ EL ADMIN:", data);
      setCargando(false);
      return;
    }

    // ==========================================
    // ADMIN → SOLO USUARIOS DE SU ORGANIZACIÓN
    // ==========================================

    if (!usuarioActual.organizacion_id) {
      console.error("El administrador no tiene organización asignada.");
      setUsuarios([]);
      setCargando(false);
      return;
    }

    const { data, error } = await supabase
      .from("usuarios")
      .select(
        `
      id,
      nombre,
      telefono,
      direccion,
      documento,
      correo,
      rol,
      estado,
      created_at,
      usuarios_organizaciones!inner (
        organizacion_id,
        estado
      )
      `,
      )
      .eq(
        "usuarios_organizaciones.organizacion_id",
        usuarioActual.organizacion_id,
      )
      .eq("usuarios_organizaciones.estado", "activo")
      .eq("rol", "domiciliario")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Error cargando usuarios:", error);
      setUsuarios([]);
      setCargando(false);
      return;
    }

    setUsuarios(data || []);
    console.log("USUARIOS QUE RECIBIÓ EL ADMIN:", data);
    setCargando(false);
  };

  // ==========================================
  // FILTRAR USUARIOS
  // ==========================================

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const texto = busqueda.toLowerCase();

    return (
      usuario.nombre?.toLowerCase().includes(texto) ||
      usuario.documento?.toLowerCase().includes(texto) ||
      usuario.telefono?.toLowerCase().includes(texto) ||
      usuario.correo?.toLowerCase().includes(texto)
    );
  });

  const cargarOrganizaciones = async () => {
    const { data, error } = await supabase.rpc(
      "obtener_organizaciones_para_compartir",
    );

    if (error) {
      console.error("Error cargando organizaciones para compartir:", error);

      setOrganizaciones([]);
      return;
    }

    console.log("ORGANIZACIONES DISPONIBLES PARA COMPARTIR:", data);

    setOrganizaciones(data || []);
  };

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  const totalUsuarios = usuarios.length;

  const usuariosActivos = usuarios.filter(
    (usuario) => usuario.estado === "activo",
  ).length;

  const domiciliarios = usuarios.filter(
    (usuario) => usuario.rol === "domiciliario",
  ).length;

  const administradores = usuarios.filter(
    (usuario) => usuario.rol === "admin",
  ).length;

  // ==========================================
  // CREAR USUARIO
  // ==========================================

  const crearUsuario = async (e) => {
    e.preventDefault();

    setMensaje({
      tipo: "",
      texto: "",
    });

    if (
      !nuevoUsuario.nombre ||
      !nuevoUsuario.documento ||
      !nuevoUsuario.correo ||
      !nuevoUsuario.password
    ) {
      setMensaje({
        tipo: "error",
        texto: "Completa todos los campos obligatorios.",
      });

      return;
    }

    if (nuevoUsuario.password.length < 6) {
      setMensaje({
        tipo: "error",
        texto: "La contraseña debe tener mínimo 6 caracteres.",
      });

      return;
    }

    if (nuevoUsuario.password !== nuevoUsuario.confirmarPassword) {
      setMensaje({
        tipo: "error",
        texto: "Las contraseñas no coinciden.",
      });

      return;
    }

    setCreandoUsuario(true);

    // ==========================================
    // CREAR USUARIO EN SUPABASE
    // ==========================================

    const { data, error } = await supabase.functions.invoke("crear-usuario", {
      body: {
        nombre: nuevoUsuario.nombre,
        telefono: nuevoUsuario.telefono,
        direccion: nuevoUsuario.direccion,
        documento: nuevoUsuario.documento,
        correo: nuevoUsuario.correo,
        rol: nuevoUsuario.rol,
        estado: nuevoUsuario.estado,
        password: nuevoUsuario.password,
        organizacion_id: nuevoUsuario.organizacion_id,
      },
    });

    if (error) {
      console.error("Error creando usuario:", error);

      if (error.context) {
        try {
          const detalle = await error.context.json();
          console.error("DETALLE DEL SERVIDOR:", detalle);

          setMensaje({
            tipo: "error",
            texto: detalle?.error || error.message,
          });
        } catch {
          setMensaje({
            tipo: "error",
            texto: error.message || "No se pudo crear el usuario.",
          });
        }
      } else {
        setMensaje({
          tipo: "error",
          texto: error.message || "No se pudo crear el usuario.",
        });
      }

      setCreandoUsuario(false);
      return;
    }

    // ==========================================
    // REGISTRAR ACTIVIDAD DE CREACIÓN
    // ==========================================

    await registrarActividad({
      tipo: "usuario",
      accion: "crear",
      descripcion: `Creó el usuario ${nuevoUsuario.nombre} con rol ${nuevoUsuario.rol}.`,
      referenciaId: null,
    });

    // ==========================================
    // FINALIZAR CREACIÓN
    // ==========================================

    setMensaje({
      tipo: "exito",
      texto: "Usuario creado correctamente.",
    });

    await cargarUsuarios();

    setCreandoUsuario(false);

    setTimeout(() => {
      cerrarModalCrear();
    }, 900);
  };
  const abrirModalCompartir = (usuario) => {
    setUsuarioCompartir(usuario);
    setOrganizacionDestino("");
    setMensajeCompartir({
      tipo: "",
      texto: "",
    });
    setModalCompartir(true);
  };

  const cerrarModalCompartir = () => {
    if (compartiendoUsuario) return;

    setModalCompartir(false);
    setUsuarioCompartir(null);
    setOrganizacionDestino("");
    setMensajeCompartir({
      tipo: "",
      texto: "",
    });
  };

  const compartirUsuario = async (e) => {
    e.preventDefault();

    if (!usuarioCompartir || !organizacionDestino) {
      setMensajeCompartir({
        tipo: "error",
        texto: "Selecciona una organización.",
      });
      return;
    }

    if (!usuarioActual?.organizacion_id) {
      setMensajeCompartir({
        tipo: "error",
        texto: "Tu administrador no tiene una organización asignada.",
      });
      return;
    }

    setCompartiendoUsuario(true);

    const { error } = await supabase.from("solicitudes_usuarios").insert({
      usuario_id: usuarioCompartir.id,
      organizacion_origen_id: usuarioActual.organizacion_id,
      organizacion_destino_id: organizacionDestino,
      enviado_por: usuarioActual.id,
      estado: "pendiente",
    });

    if (error) {
      console.error("Error enviando solicitud:", error);

      if (error.code === "23505") {
        setMensajeCompartir({
          tipo: "error",
          texto:
            "Ya existe una solicitud pendiente para este usuario y organización.",
        });
      } else {
        setMensajeCompartir({
          tipo: "error",
          texto: error.message || "No se pudo enviar la solicitud.",
        });
      }

      setCompartiendoUsuario(false);
      return;
    }

    await registrarActividad({
      tipo: "usuario",
      accion: "compartir",
      descripcion: `Solicitó compartir al usuario ${usuarioCompartir.nombre}.`,
      referenciaId: usuarioCompartir.id,
    });

    setMensajeCompartir({
      tipo: "exito",
      texto: "Solicitud enviada correctamente.",
    });

    setCompartiendoUsuario(false);

    setTimeout(() => {
      cerrarModalCompartir();
    }, 800);
  };

  const responderSolicitud = async (aceptar) => {
    if (!solicitudEntrante || procesandoSolicitud) {
      return;
    }

    setProcesandoSolicitud(true);
    if (aceptar) {
      const { data, error } = await supabase.rpc("aceptar_solicitud_usuario", {
        p_solicitud_id: solicitudEntrante.id,
      });

      if (error) {
        console.error("Error aceptando solicitud:", error);
        setProcesandoSolicitud(false);
        return;
      }

      console.log("Solicitud aceptada correctamente:", data);
    }

    const { error } = await supabase
      .from("solicitudes_usuarios")
      .update({
        estado: aceptar ? "aceptada" : "rechazada",
        respondido_at: new Date().toISOString(),
        respondido_por: usuarioActual.id,
      })
      .eq("id", solicitudEntrante.id);

    if (error) {
      console.error("Error respondiendo solicitud:", error);

      setProcesandoSolicitud(false);
      return;
    }

    if (aceptar) {
      await registrarActividad({
        tipo: "usuario",
        accion: "compartir_aceptado",
        descripcion: `Aceptó recibir al usuario ${solicitudEntrante.usuarios?.nombre || "domiciliario"}.`,
        referenciaId: solicitudEntrante.usuario_id,
      });

      await cargarUsuarios();
    } else {
      await registrarActividad({
        tipo: "usuario",
        accion: "compartir_rechazado",
        descripcion: `Rechazó recibir al usuario ${solicitudEntrante.usuarios?.nombre || "domiciliario"}.`,
        referenciaId: solicitudEntrante.usuario_id,
      });
    }

    setSolicitudEntrante(null);
    setProcesandoSolicitud(false);
  };
  return (
    <div className={styles.usuarios}>
      {/* ENCABEZADO */}

      <header className={styles.usuariosHeader}>
        <div>
          <h1>Usuarios</h1>

          <p>Gestiona los usuarios registrados en Liquisistema.</p>
        </div>

        <button
          type="button"
          className={styles.usuariosNuevoButton}
          onClick={() => setModalCrear(true)}
        >
          <PlusIcon />
          Nuevo usuario
        </button>
      </header>

      {/* ESTADÍSTICAS */}

      <section className={styles.usuariosStats}>
        <div className={styles.usuariosStatCard}>
          <div className={styles.usuariosStatIcon}>
            <UsersIcon />
          </div>

          <div>
            <span>Total usuarios</span>
            <strong>{cargando ? "..." : totalUsuarios}</strong>
          </div>
        </div>

        <div className={styles.usuariosStatCard}>
          <div className={styles.usuariosStatIcon}>
            <UserGroupIcon />
          </div>

          <div>
            <span>Usuarios activos</span>
            <strong>{cargando ? "..." : usuariosActivos}</strong>
          </div>
        </div>

        <div className={styles.usuariosStatCard}>
          <div className={styles.usuariosStatIcon}>
            <UsersIcon />
          </div>

          <div>
            <span>Domiciliarios</span>
            <strong>{cargando ? "..." : domiciliarios}</strong>
          </div>
        </div>

        <div className={styles.usuariosStatCard}>
          <div className={styles.usuariosStatIcon}>
            <ShieldCheckIcon />
          </div>

          <div>
            <span>Administradores</span>
            <strong>{cargando ? "..." : administradores}</strong>
          </div>
        </div>
      </section>

      {/* TABLA */}

      <section className={styles.usuariosPanel}>
        <div className={styles.usuariosPanelHeader}>
          <div>
            <h2>Usuarios registrados</h2>
            <p>Personas con acceso al sistema.</p>
          </div>
        </div>

        {/* BUSCADOR */}

        <div className={styles.usuariosBuscador}>
          <MagnifyingGlassIcon />

          <input
            type="text"
            placeholder="Buscar por nombre, documento, teléfono o correo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* TABLA */}

        <div className={styles.usuariosTablaContainer}>
          <table className={styles.usuariosTabla}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Documento</th>
                <th>Teléfono</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan="6" className={styles.usuariosVacio}>
                    Cargando usuarios...
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.usuariosVacio}>
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>
                      <div className={styles.usuariosNombre}>
                        <strong>{usuario.nombre}</strong>
                        <span>{usuario.correo}</span>
                      </div>
                    </td>

                    <td>{usuario.documento}</td>

                    <td>{usuario.telefono || "—"}</td>

                    <td>
                      <span
                        className={`${styles.usuariosRol} ${
                          usuario.rol === "admin"
                            ? styles.usuariosRolAdmin
                            : styles.usuariosRolDomiciliario
                        }`}
                      >
                        {usuario.rol === "admin"
                          ? "Administrador"
                          : "Domiciliario"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`${styles.usuariosEstado} ${
                          usuario.estado === "activo"
                            ? styles.usuariosEstadoActivo
                            : styles.usuariosEstadoInactivo
                        }`}
                      >
                        <span></span>
                        {usuario.estado === "activo" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      {usuarioActual?.rol === "admin" &&
                        usuario.rol === "domiciliario" && (
                          <button
                            type="button"
                            className={styles.usuariosEditarButton}
                            onClick={() => abrirModalCompartir(usuario)}
                          >
                            <ShareIcon />
                            Compartir
                          </button>
                        )}
                      <button
                        type="button"
                        className={styles.usuariosEditarButton}
                        onClick={() => abrirModalEditar(usuario)}
                      >
                        <PencilIcon />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      {modalCrear && (
        <div className={styles.usuariosModalOverlay}>
          <div className={styles.usuariosModal}>
            <div className={styles.usuariosModalHeader}>
              <div>
                <h2>Nuevo usuario</h2>
                <p>Crea una nueva cuenta para acceder a Liquisistema.</p>
              </div>

              <button
                type="button"
                className={styles.usuariosModalCerrar}
                onClick={cerrarModalCrear}
                disabled={creandoUsuario}
              >
                <XMarkIcon />
              </button>
            </div>

            <form className={styles.usuariosFormulario} onSubmit={crearUsuario}>
              <div className={styles.usuariosFormularioGrid}>
                <div className={styles.usuariosCampo}>
                  <label>Nombre *</label>

                  <input
                    type="text"
                    name="nombre"
                    value={nuevoUsuario.nombre}
                    onChange={manejarCambioUsuario}
                    placeholder="Nombre completo"
                    required
                  />
                </div>

                <div className={styles.usuariosCampo}>
                  <label>Teléfono</label>

                  <input
                    type="text"
                    name="telefono"
                    value={nuevoUsuario.telefono}
                    onChange={manejarCambioUsuario}
                    placeholder="300 000 0000"
                  />
                </div>

                <div className={styles.usuariosCampo}>
                  <label>Documento *</label>

                  <input
                    type="text"
                    name="documento"
                    value={nuevoUsuario.documento}
                    onChange={manejarCambioUsuario}
                    placeholder="Número de documento"
                    required
                  />
                </div>

                <div className={styles.usuariosCampo}>
                  <label>Correo *</label>

                  <input
                    type="email"
                    name="correo"
                    value={nuevoUsuario.correo}
                    onChange={manejarCambioUsuario}
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </div>

                <div
                  className={`${styles.usuariosCampo} ${styles.usuariosCampoCompleto}`}
                >
                  <label>Dirección</label>

                  <input
                    type="text"
                    name="direccion"
                    value={nuevoUsuario.direccion}
                    onChange={manejarCambioUsuario}
                    placeholder="Dirección de residencia"
                  />
                </div>

                <div className={styles.usuariosCampo}>
                  <label>Rol *</label>

                  <select
                    name="rol"
                    value={nuevoUsuario.rol}
                    onChange={manejarCambioUsuario}
                  >
                    <option value="domiciliario">Domiciliario</option>

                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div className={styles.usuariosCampo}>
                  <label>Estado *</label>

                  <select
                    name="estado"
                    value={nuevoUsuario.estado}
                    onChange={manejarCambioUsuario}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>

                <div className={styles.usuariosCampo}>
                  <label>Contraseña *</label>

                  <input
                    type="password"
                    name="password"
                    value={nuevoUsuario.password}
                    onChange={manejarCambioUsuario}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>

                <div className={styles.usuariosCampo}>
                  <label>Confirmar contraseña *</label>

                  <input
                    type="password"
                    name="confirmarPassword"
                    value={nuevoUsuario.confirmarPassword}
                    onChange={manejarCambioUsuario}
                    placeholder="Repite la contraseña"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              {mensaje.texto && (
                <div
                  className={`${styles.usuariosMensaje} ${
                    mensaje.tipo === "error"
                      ? styles.usuariosMensajeError
                      : styles.usuariosMensajeExito
                  }`}
                >
                  {mensaje.texto}
                </div>
              )}

              <div className={styles.usuariosFormularioAcciones}>
                <button
                  type="button"
                  className={styles.usuariosCancelarButton}
                  onClick={cerrarModalCrear}
                  disabled={creandoUsuario}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className={styles.usuariosCrearButton}
                  disabled={creandoUsuario}
                >
                  {creandoUsuario ? "Creando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {modalEditar && (
        <div className={styles.usuariosModalOverlay}>
          <div className={styles.usuariosModal}>
            <div className={styles.usuariosModalHeader}>
              <div>
                <h2>Editar usuario</h2>
                <p>Actualiza la información del usuario.</p>
              </div>

              <button
                type="button"
                className={styles.usuariosModalCerrar}
                onClick={cerrarModalEditar}
                disabled={editandoUsuario}
              >
                <XMarkIcon />
              </button>
            </div>

            <form
              className={styles.usuariosFormulario}
              onSubmit={guardarEdicionUsuario}
            >
              <div className={styles.usuariosFormularioGrid}>
                <div className={styles.usuariosCampo}>
                  <label>Nombre *</label>

                  <input
                    type="text"
                    name="nombre"
                    value={usuarioEditando.nombre}
                    onChange={manejarCambioEditar}
                    required
                  />
                </div>

                <div className={styles.usuariosCampo}>
                  <label>Teléfono</label>

                  <input
                    type="text"
                    name="telefono"
                    value={usuarioEditando.telefono}
                    onChange={manejarCambioEditar}
                  />
                </div>

                <div className={styles.usuariosCampo}>
                  <label>Documento *</label>

                  <input
                    type="text"
                    name="documento"
                    value={usuarioEditando.documento}
                    onChange={manejarCambioEditar}
                    required
                  />
                </div>

                <div className={styles.usuariosCampo}>
                  <label>Correo *</label>

                  <input
                    type="email"
                    name="correo"
                    value={usuarioEditando.correo}
                    onChange={manejarCambioEditar}
                    required
                  />
                </div>

                <div
                  className={`${styles.usuariosCampo} ${styles.usuariosCampoCompleto}`}
                >
                  <label>Dirección</label>

                  <input
                    type="text"
                    name="direccion"
                    value={usuarioEditando.direccion}
                    onChange={manejarCambioEditar}
                  />
                </div>

                <div className={styles.usuariosCampo}>
                  <label>Rol *</label>

                  <select
                    name="rol"
                    value={usuarioEditando.rol}
                    onChange={manejarCambioEditar}
                  >
                    <option value="domiciliario">Domiciliario</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div className={styles.usuariosCampo}>
                  <label>Estado *</label>

                  <select
                    name="estado"
                    value={usuarioEditando.estado}
                    onChange={manejarCambioEditar}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              {mensaje.texto && (
                <div
                  className={`${styles.usuariosMensaje} ${
                    mensaje.tipo === "error"
                      ? styles.usuariosMensajeError
                      : styles.usuariosMensajeExito
                  }`}
                >
                  {mensaje.texto}
                </div>
              )}

              <div className={styles.usuariosFormularioAcciones}>
                <button
                  type="button"
                  className={styles.usuariosCancelarButton}
                  onClick={cerrarModalEditar}
                  disabled={editandoUsuario}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className={styles.usuariosCrearButton}
                  disabled={editandoUsuario}
                >
                  {editandoUsuario ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {modalCompartir && (
        <div className={styles.usuariosModalOverlay}>
          <div className={styles.usuariosModal}>
            <div className={styles.usuariosModalHeader}>
              <div>
                <h2>Compartir usuario</h2>

                <p>
                  Comparte los datos de este domiciliario con otra organización.
                </p>
              </div>

              <button
                type="button"
                className={styles.usuariosModalCerrar}
                onClick={cerrarModalCompartir}
                disabled={compartiendoUsuario}
              >
                <XMarkIcon />
              </button>
            </div>

            <form
              className={styles.usuariosFormulario}
              onSubmit={compartirUsuario}
            >
              <div className={styles.usuariosFormularioGrid}>
                <div
                  className={`${styles.usuariosCampo} ${styles.usuariosCampoCompleto}`}
                >
                  <label>Domiciliario</label>

                  <input
                    type="text"
                    value={usuarioCompartir?.nombre || ""}
                    disabled
                  />
                </div>

                <div
                  className={`${styles.usuariosCampo} ${styles.usuariosCampoCompleto}`}
                >
                  <label>Organización destino *</label>

                  <select
                    value={organizacionDestino}
                    onChange={(e) => setOrganizacionDestino(e.target.value)}
                    required
                  >
                    <option value="">Selecciona una organización</option>

                    {organizaciones
                      .filter(
                        (organizacion) =>
                          organizacion.id !== usuarioActual?.organizacion_id,
                      )
                      .map((organizacion) => (
                        <option key={organizacion.id} value={organizacion.id}>
                          {organizacion.nombre}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {mensajeCompartir.texto && (
                <div
                  className={`${styles.usuariosMensaje} ${
                    mensajeCompartir.tipo === "error"
                      ? styles.usuariosMensajeError
                      : styles.usuariosMensajeExito
                  }`}
                >
                  {mensajeCompartir.texto}
                </div>
              )}

              <div className={styles.usuariosFormularioAcciones}>
                <button
                  type="button"
                  className={styles.usuariosCancelarButton}
                  onClick={cerrarModalCompartir}
                  disabled={compartiendoUsuario}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className={styles.usuariosCrearButton}
                  disabled={compartiendoUsuario}
                >
                  {compartiendoUsuario ? "Enviando..." : "Enviar solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {solicitudEntrante && (
        <div className={styles.usuariosModalOverlay}>
          <div className={styles.usuariosModal}>
            <div className={styles.usuariosModalHeader}>
              <div>
                <h2>Solicitud para compartir usuario</h2>

                <p>
                  Una organización quiere compartir un domiciliario contigo.
                </p>
              </div>
            </div>

            <div className={styles.usuariosFormulario}>
              <div className={styles.usuariosFormularioGrid}>
                <div
                  className={`${styles.usuariosCampo} ${styles.usuariosCampoCompleto}`}
                >
                  <label>Organización que envía</label>

                  <input
                    type="text"
                    value={
                      solicitudEntrante.organizaciones?.nombre || "Organización"
                    }
                    disabled
                  />
                </div>

                <div
                  className={`${styles.usuariosCampo} ${styles.usuariosCampoCompleto}`}
                >
                  <label>Domiciliario</label>

                  <input
                    type="text"
                    value={solicitudEntrante.usuarios?.nombre || "Domiciliario"}
                    disabled
                  />
                </div>

                <div
                  className={`${styles.usuariosCampo} ${styles.usuariosCampoCompleto}`}
                >
                  <label>Información</label>

                  <p>
                    Si aceptas, el domiciliario se guardará en tu organización y
                    podrás trabajar con sus datos.
                  </p>
                </div>
              </div>

              <div className={styles.usuariosFormularioAcciones}>
                <button
                  type="button"
                  className={styles.usuariosCancelarButton}
                  onClick={() => responderSolicitud(false)}
                  disabled={procesandoSolicitud}
                >
                  {procesandoSolicitud ? "Procesando..." : "Cancelar"}
                </button>

                <button
                  type="button"
                  className={styles.usuariosCrearButton}
                  onClick={() => responderSolicitud(true)}
                  disabled={procesandoSolicitud}
                >
                  {procesandoSolicitud ? "Procesando..." : "Aceptar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
