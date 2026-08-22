import { useEffect, useState } from "react";
import {
  UsersIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { supabase } from "../../../config/supabase";

import styles from "./Usuarios.module.css";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState(false);

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
  const manejarCambioEditar = (e) => {
    const { name, value } = e.target;

    setUsuarioEditando((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  const abrirModalEditar = (usuario) => {
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

  const cerrarModalEditar = () => {
    if (editandoUsuario) return;

    setModalEditar(false);

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

  const guardarEdicionUsuario = async (e) => {
    e.preventDefault();

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
  const [creandoUsuario, setCreandoUsuario] = useState(false);

  const [mensaje, setMensaje] = useState({
    tipo: "",
    texto: "",
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
  });
  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    setCargando(true);

    const { data, error } = await supabase
      .from("usuarios")
      .select(
        "id, nombre, telefono, direccion, documento, correo, rol, estado, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando usuarios:", error);
      setCargando(false);
      return;
    }

    setUsuarios(data || []);
    setCargando(false);
  };

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const texto = busqueda.toLowerCase();

    return (
      usuario.nombre?.toLowerCase().includes(texto) ||
      usuario.documento?.toLowerCase().includes(texto) ||
      usuario.telefono?.toLowerCase().includes(texto) ||
      usuario.correo?.toLowerCase().includes(texto)
    );
  });

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
  const manejarCambioUsuario = (e) => {
    const { name, value } = e.target;

    setNuevoUsuario((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

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
      },
    });

    if (error) {
      console.error("Error creando usuario:", error);

      setMensaje({
        tipo: "error",
        texto: error.message || "No se pudo crear el usuario.",
      });

      setCreandoUsuario(false);

      return;
    }

    if (data?.error) {
      setMensaje({
        tipo: "error",
        texto: data.error,
      });

      setCreandoUsuario(false);

      return;
    }

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
    </div>
  );
}
