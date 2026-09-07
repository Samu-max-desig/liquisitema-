import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../config/supabase";
import styles from "./Organizaciones.module.css";

export default function Organizaciones() {
  const [organizaciones, setOrganizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const usuarioActual = JSON.parse(sessionStorage.getItem("usuario") || "null");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [organizacionSeleccionada, setOrganizacionSeleccionada] =
    useState(null);

  const [guardando, setGuardando] = useState(false);

  const [formulario, setFormulario] = useState({
    nombre: "",
    nit: "",
    telefono: "",
    correo: "",
    direccion: "",

    administrador_nombre: "",
    administrador_telefono: "",
    administrador_documento: "",
    administrador_correo: "",
    administrador_password: "",
  });

  // ==========================================
  // CARGAR ORGANIZACIONES
  // ==========================================
  // ==========================================
  // CARGAR USUARIO ACTUAL
  // ==========================================

  useEffect(() => {
    const cargarUsuarioActual = async () => {
      try {
        const usuarioGuardado = localStorage.getItem("usuario");

        if (!usuarioGuardado) {
          console.error("No hay usuario guardado.");
          return;
        }

        const usuarioLocal = JSON.parse(usuarioGuardado);

        const { data, error } = await supabase
          .from("usuarios")
          .select("id, nombre, correo, rol, estado, organizacion_id")
          .eq("id", usuarioLocal.id)
          .single();

        if (error) {
          console.error("Error cargando usuario actual:", error);
          return;
        }

        setUsuarioActual(data);
      } catch (error) {
        console.error("Error obteniendo usuario actual:", error);
      }
    };

    cargarUsuarioActual();
  }, []);
  const cargarOrganizaciones = async () => {
    try {
      setCargando(true);

      // ==========================================
      // 1. CARGAR ORGANIZACIONES
      // ==========================================

      const { data: organizacionesData, error: organizacionesError } =
        await supabase
          .from("organizaciones")
          .select("*")
          .order("created_at", { ascending: false });

      if (organizacionesError) {
        console.error("Error cargando organizaciones:", organizacionesError);

        throw organizacionesError;
      }

      console.log("Organizaciones encontradas:", organizacionesData);

      // ==========================================
      // 2. MOSTRAR ORGANIZACIONES INMEDIATAMENTE
      // ==========================================

      const organizacionesBase = (organizacionesData || []).map(
        (organizacion) => ({
          ...organizacion,
          administradores: 0,
          domiciliarios: 0,
          usuarios: [],
        }),
      );

      setOrganizaciones(organizacionesBase);

      // ==========================================
      // 3. CARGAR USUARIOS
      // ==========================================

      const { data: usuariosData, error: usuariosError } = await supabase
        .from("usuarios")
        .select("id, nombre, correo, rol, estado, organizacion_id");

      // ==========================================
      // 4. SI USUARIOS FALLA, NO OCULTAR
      //    LAS ORGANIZACIONES
      // ==========================================

      if (usuariosError) {
        console.error("Error cargando usuarios:", usuariosError);

        return;
      }

      console.log("Usuarios encontrados:", usuariosData);

      // ==========================================
      // 5. UNIR ORGANIZACIONES + USUARIOS
      // ==========================================

      const organizacionesConUsuarios = (organizacionesData || []).map(
        (organizacion) => {
          const usuariosOrganizacion = (usuariosData || []).filter(
            (usuario) => usuario.organizacion_id === organizacion.id,
          );

          const administradores = usuariosOrganizacion.filter(
            (usuario) =>
              usuario.rol === "admin" || usuario.rol === "super_admin",
          );

          const domiciliarios = usuariosOrganizacion.filter(
            (usuario) => usuario.rol === "domiciliario",
          );

          return {
            ...organizacion,
            administradores: administradores.length,
            domiciliarios: domiciliarios.length,
            usuarios: usuariosOrganizacion,
          };
        },
      );

      // ==========================================
      // 6. ACTUALIZAR
      // ==========================================

      setOrganizaciones(organizacionesConUsuarios);
    } catch (error) {
      console.error("Error cargando organizaciones:", error);

      // Solo dejamos vacío si FALLÓ
      // realmente la consulta de organizaciones

      setOrganizaciones([]);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.message || "No se pudieron cargar las organizaciones.",
      });
    } finally {
      setCargando(false);
    }
  };

  // ==========================================
  // CARGAR AL ENTRAR
  // ==========================================

  useEffect(() => {
    cargarOrganizaciones();
  }, []);

  // ==========================================
  // CAMBIO DE INPUT
  // ==========================================

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    setFormulario((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==========================================
  // ABRIR MODAL
  // ==========================================

  const abrirModalCrear = () => {
    setFormulario({
      nombre: "",
      nit: "",
      telefono: "",
      correo: "",
      direccion: "",

      administrador_nombre: "",
      administrador_telefono: "",
      administrador_documento: "",
      administrador_correo: "",
      administrador_password: "",
    });

    setMostrarModal(true);
  };
  // ==========================================
  // CERRAR MODAL
  // ==========================================

  const cerrarModalCrear = () => {
    if (guardando) return;

    setMostrarModal(false);

    setFormulario({
      nombre: "",
      nit: "",
      telefono: "",
      correo: "",
      direccion: "",
    });
  };

  // ==========================================
  // CREAR ORGANIZACIÓN
  // ==========================================

  const crearOrganizacion = async (e) => {
    e.preventDefault();

    if (guardando) return;

    try {
      setGuardando(true);

      const datos = {
        nombre: formulario.nombre.trim(),
        nit: formulario.nit.trim(),
        telefono: formulario.telefono.trim(),
        correo: formulario.correo.trim(),
        direccion: formulario.direccion.trim(),

        administrador_nombre: formulario.administrador_nombre.trim(),

        administrador_telefono: formulario.administrador_telefono.trim(),

        administrador_documento: formulario.administrador_documento.trim(),

        administrador_correo: formulario.administrador_correo.trim(),

        administrador_password: formulario.administrador_password,
      };

      // ==========================================
      // VALIDAR ORGANIZACIÓN
      // ==========================================

      if (
        !datos.nombre ||
        !datos.nit ||
        !datos.telefono ||
        !datos.correo ||
        !datos.direccion
      ) {
        Swal.fire({
          icon: "warning",
          title: "Campos incompletos",
          text: "Completa todos los datos de la organización.",
        });

        return;
      }

      // ==========================================
      // VALIDAR ADMINISTRADOR
      // ==========================================

      if (
        !datos.administrador_nombre ||
        !datos.administrador_correo ||
        !datos.administrador_password
      ) {
        Swal.fire({
          icon: "warning",
          title: "Administrador incompleto",
          text: "Completa el nombre, correo y contraseña del administrador.",
        });

        return;
      }

      if (datos.administrador_password.length < 6) {
        Swal.fire({
          icon: "warning",
          title: "Contraseña inválida",
          text: "La contraseña debe tener mínimo 6 caracteres.",
        });

        return;
      }

      // ==========================================
      // CREAR ORGANIZACIÓN + ADMINISTRADOR
      // ==========================================

      const { data, error } = await supabase.functions.invoke(
        "rapid-responder",
        {
          body: datos,
        },
      );

      if (error) {
        console.error("Error llamando Edge Function:", error);

        throw new Error(error.message || "No se pudo crear la organización.");
      }

      if (!data?.success) {
        throw new Error(data?.error || "No se pudo crear la organización.");
      }

      console.log("Organización creada:", data.organizacion);

      console.log("Administrador creado:", data.administrador);

      // ==========================================
      // LIMPIAR
      // ==========================================

      setFormulario({
        nombre: "",
        nit: "",
        telefono: "",
        correo: "",
        direccion: "",

        administrador_nombre: "",
        administrador_telefono: "",
        administrador_documento: "",
        administrador_correo: "",
        administrador_password: "",
      });

      setMostrarModal(false);

      // ==========================================
      // RECARGAR ORGANIZACIONES
      // ==========================================

      await cargarOrganizaciones();

      // ==========================================
      // ÉXITO
      // ==========================================

      Swal.fire({
        icon: "success",
        title: "Organización creada",
        text: "La organización y su administrador fueron creados correctamente.",
        confirmButtonColor: "#2563eb",
      });
    } catch (error) {
      console.error("Error creando organización:", error);

      Swal.fire({
        icon: "error",
        title: "No se pudo crear",
        text: error?.message || "Ocurrió un error creando la organización.",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // VER ORGANIZACIÓN
  // ==========================================

  const verOrganizacion = (organizacion) => {
    setOrganizacionSeleccionada(organizacion);
  };

  // ==========================================
  // CERRAR DETALLE
  // ==========================================

  const cerrarDetalle = () => {
    setOrganizacionSeleccionada(null);
  };

  // ==========================================
  // CARGANDO
  // ==========================================

  if (cargando) {
    return (
      <div className={styles.contenedor}>
        <div className={styles.cargando}>
          <div className={styles.spinner}></div>

          <p>Cargando organizaciones...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // TOTALES
  // ==========================================

  const totalAdministradores = organizaciones.reduce(
    (total, organizacion) => total + organizacion.administradores,
    0,
  );

  const totalDomiciliarios = organizaciones.reduce(
    (total, organizacion) => total + organizacion.domiciliarios,
    0,
  );

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <div className={styles.contenedor}>
      {/* ======================================
          ENCABEZADO
      ====================================== */}

      <div className={styles.encabezado}>
        <div>
          <div className={styles.tituloSuperior}>ADMINISTRACIÓN</div>

          <h1>Organizaciones</h1>

          <p>Gestiona las organizaciones que utilizan Liquisistema.</p>
        </div>

        {usuarioActual?.rol === "super_admin" && (
          <button className={styles.botonNueva} onClick={abrirModalCrear}>
            <span className={styles.iconoMas}>+</span>
            Nueva organización
          </button>
        )}
      </div>

      {/* ======================================
          RESUMEN
      ====================================== */}

      <div className={styles.resumen}>
        <div className={styles.resumenItem}>
          <div className={styles.resumenIcono}>ORG</div>

          <div>
            <span>Organizaciones</span>

            <strong>{organizaciones.length}</strong>
          </div>
        </div>

        <div className={styles.resumenItem}>
          <div className={styles.resumenIcono}>ADM</div>

          <div>
            <span>Administradores</span>

            <strong>{totalAdministradores}</strong>
          </div>
        </div>

        <div className={styles.resumenItem}>
          <div className={styles.resumenIcono}>DOM</div>

          <div>
            <span>Domiciliarios</span>

            <strong>{totalDomiciliarios}</strong>
          </div>
        </div>
      </div>

      {/* ======================================
          LISTA
      ====================================== */}

      {organizaciones.length === 0 ? (
        <div className={styles.vacio}>
          <div className={styles.vacioIcono}>ORG</div>

          <h2>No hay organizaciones</h2>

          <p>Todavía no se ha registrado ninguna organización.</p>

          <button className={styles.botonNueva} onClick={abrirModalCrear}>
            Crear primera organización
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {organizaciones.map((organizacion) => (
            <div className={styles.tarjeta} key={organizacion.id}>
              {/* HEADER */}

              <div className={styles.tarjetaHeader}>
                <div className={styles.iconoOrganizacion}>ORG</div>

                <div className={styles.estado}>
                  <span></span>

                  {organizacion.estado === "activa" ? "Activa" : "Inactiva"}
                </div>
              </div>

              {/* INFORMACIÓN PRINCIPAL */}

              <div className={styles.infoPrincipal}>
                <h2>{organizacion.nombre}</h2>

                <p>NIT: {organizacion.nit}</p>
              </div>

              {/* DATOS */}

              <div className={styles.datos}>
                <div>
                  <span>Teléfono</span>

                  <strong>{organizacion.telefono || "No registrado"}</strong>
                </div>

                <div>
                  <span>Correo</span>

                  <strong>{organizacion.correo || "No registrado"}</strong>
                </div>

                <div className={styles.datoCompleto}>
                  <span>Dirección</span>

                  <strong>{organizacion.direccion || "No registrada"}</strong>
                </div>
              </div>

              {/* ESTADÍSTICAS */}

              <div className={styles.estadisticas}>
                <div>
                  <strong>{organizacion.administradores}</strong>

                  <span>Administradores</span>
                </div>

                <div>
                  <strong>{organizacion.domiciliarios}</strong>

                  <span>Domiciliarios</span>
                </div>
              </div>

              {/* ACCIONES */}

              <div className={styles.acciones}>
                <button onClick={() => verOrganizacion(organizacion)}>
                  Ver organización
                </button>

                <button className={styles.botonOpciones} title="Más opciones">
                  •••
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================
          MODAL CREAR
      ====================================== */}

      {mostrarModal && (
        <div className={styles.overlay} onClick={cerrarModalCrear}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span>NUEVA ORGANIZACIÓN</span>

                <h2>Crear organización</h2>

                <p>Registra los datos básicos de la organización.</p>
              </div>

              <button
                className={styles.cerrar}
                onClick={cerrarModalCrear}
                disabled={guardando}
              >
                ×
              </button>
            </div>

            <form onSubmit={crearOrganizacion}>
              <div className={styles.formGrid}>
                <div className={styles.campo}>
                  <label>Nombre de la organización</label>

                  <input
                    type="text"
                    name="nombre"
                    placeholder="Ej. Organización ABC"
                    value={formulario.nombre}
                    onChange={manejarCambio}
                    disabled={guardando}
                  />
                </div>

                <div className={styles.campo}>
                  <label>NIT / Documento</label>

                  <input
                    type="text"
                    name="nit"
                    placeholder="Ej. 900123456"
                    value={formulario.nit}
                    onChange={manejarCambio}
                    disabled={guardando}
                  />
                </div>

                <div className={styles.campo}>
                  <label>Teléfono</label>

                  <input
                    type="text"
                    name="telefono"
                    placeholder="Ej. 3001234567"
                    value={formulario.telefono}
                    onChange={manejarCambio}
                    disabled={guardando}
                  />
                </div>

                <div className={styles.campo}>
                  <label>Correo electrónico</label>

                  <input
                    type="email"
                    name="correo"
                    placeholder="correo@empresa.com"
                    value={formulario.correo}
                    onChange={manejarCambio}
                    disabled={guardando}
                  />
                </div>

                <div className={`${styles.campo} ${styles.campoCompleto}`}>
                  <label>Dirección</label>

                  <input
                    type="text"
                    name="direccion"
                    placeholder="Dirección de la organización"
                    value={formulario.direccion}
                    onChange={manejarCambio}
                    disabled={guardando}
                  />
                </div>
              </div>
              <div className={styles.separadorModal}>
                <span>Administrador de la organización</span>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.campo}>
                  <label>Nombre del administrador</label>

                  <input
                    type="text"
                    name="administrador_nombre"
                    placeholder="Ej. Juan Pérez"
                    value={formulario.administrador_nombre}
                    onChange={manejarCambio}
                    disabled={guardando}
                  />
                </div>

                <div className={styles.campo}>
                  <label>Teléfono</label>

                  <input
                    type="text"
                    name="administrador_telefono"
                    placeholder="Ej. 3001234567"
                    value={formulario.administrador_telefono}
                    onChange={manejarCambio}
                    disabled={guardando}
                  />
                </div>

                <div className={styles.campo}>
                  <label>Documento</label>

                  <input
                    type="text"
                    name="administrador_documento"
                    placeholder="Ej. 1026136391"
                    value={formulario.administrador_documento}
                    onChange={manejarCambio}
                    disabled={guardando}
                  />
                </div>

                <div className={styles.campo}>
                  <label>Correo del administrador</label>

                  <input
                    type="email"
                    name="administrador_correo"
                    placeholder="admin@empresa.com"
                    value={formulario.administrador_correo}
                    onChange={manejarCambio}
                    disabled={guardando}
                  />
                </div>

                <div className={`${styles.campo} ${styles.campoCompleto}`}>
                  <label>Contraseña</label>

                  <input
                    type="password"
                    name="administrador_password"
                    placeholder="Mínimo 6 caracteres"
                    value={formulario.administrador_password}
                    onChange={manejarCambio}
                    disabled={guardando}
                  />
                </div>
              </div>
              <div className={styles.modalAcciones}>
                <button
                  type="button"
                  className={styles.cancelar}
                  onClick={cerrarModalCrear}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className={styles.crear}
                  disabled={guardando}
                >
                  {guardando ? "Creando..." : "Crear organización"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================
          MODAL VER ORGANIZACIÓN
      ====================================== */}

      {organizacionSeleccionada && (
        <div className={styles.overlay} onClick={cerrarDetalle}>
          <div
            className={styles.modalDetalle}
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}

            <div className={styles.detalleHeader}>
              <div>
                <span className={styles.detalleEtiqueta}>ORGANIZACIÓN</span>

                <h2>{organizacionSeleccionada.nombre}</h2>

                <p>Información y configuración de la organización.</p>
              </div>

              <button className={styles.cerrar} onClick={cerrarDetalle}>
                ×
              </button>
            </div>

            {/* ESTADO */}

            <div className={styles.estadoDetalle}>
              <span></span>

              {organizacionSeleccionada.estado === "activa"
                ? "Organización activa"
                : "Organización inactiva"}
            </div>

            {/* INFORMACIÓN */}

            <div className={styles.detalleSeccion}>
              <h3>Información general</h3>

              <div className={styles.detalleGrid}>
                <div>
                  <span>NIT / Documento</span>

                  <strong>{organizacionSeleccionada.nit}</strong>
                </div>

                <div>
                  <span>Teléfono</span>

                  <strong>
                    {organizacionSeleccionada.telefono || "No registrado"}
                  </strong>
                </div>

                <div>
                  <span>Correo electrónico</span>

                  <strong>
                    {organizacionSeleccionada.correo || "No registrado"}
                  </strong>
                </div>

                <div>
                  <span>Dirección</span>

                  <strong>
                    {organizacionSeleccionada.direccion || "No registrada"}
                  </strong>
                </div>
              </div>
            </div>

            {/* USUARIOS */}

            <div className={styles.detalleSeccion}>
              <h3>Usuarios</h3>

              <div className={styles.usuariosResumen}>
                <div className={styles.usuarioCard}>
                  <span className={styles.usuarioNumero}>
                    {organizacionSeleccionada.administradores}
                  </span>

                  <div>
                    <strong>Administradores</strong>

                    <span>Usuarios administrativos</span>
                  </div>
                </div>

                <div className={styles.usuarioCard}>
                  <span className={styles.usuarioNumero}>
                    {organizacionSeleccionada.domiciliarios}
                  </span>

                  <div>
                    <strong>Domiciliarios</strong>

                    <span>Personal de entrega</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SUCURSALES */}

            <div className={styles.detalleSeccion}>
              <div className={styles.seccionTitulo}>
                <h3>Sucursales</h3>

                <span className={styles.proximamente}>Próximamente</span>
              </div>

              <div className={styles.sucursalVacia}>
                <strong>Sin sucursales registradas</strong>

                <span>
                  Las sucursales de esta organización aparecerán aquí.
                </span>
              </div>
            </div>

            {/* FOOTER */}

            <div className={styles.detalleFooter}>
              <button className={styles.cancelar} onClick={cerrarDetalle}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
