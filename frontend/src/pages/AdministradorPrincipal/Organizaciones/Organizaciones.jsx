import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../config/supabase";
import styles from "./Organizaciones.module.css";

const FORMULARIO_INICIAL = {
  nombre: "",
  nit: "",
  telefono: "",
  correo: "",
  direccion: "",
  organizacion_principal_id: "",
};

export default function Organizaciones() {
  const [organizaciones, setOrganizaciones] = useState([]);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [organizacionSeleccionada, setOrganizacionSeleccionada] =
    useState(null);

  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);

  // =========================================================
  // CARGAR USUARIO ACTUAL
  // =========================================================

  useEffect(() => {
    const cargarUsuarioActual = async () => {
      try {
        const usuarioGuardado = sessionStorage.getItem("usuario");

        if (!usuarioGuardado) {
          console.error("No hay usuario guardado en sessionStorage.");
          return;
        }

        const usuarioLocal = JSON.parse(usuarioGuardado);

        if (!usuarioLocal?.id) {
          console.error("El usuario guardado no tiene id.");
          return;
        }

        const { data, error } = await supabase
          .from("usuarios")
          .select("id, nombre, correo, rol, estado, organizacion_id")
          .eq("id", usuarioLocal.id)
          .maybeSingle();

        if (error) {
          console.error("Error cargando usuario actual:", error);
          return;
        }

        if (!data) {
          console.error("No se encontró el usuario actual.");
          return;
        }

        setUsuarioActual(data);
      } catch (error) {
        console.error("Error obteniendo usuario actual:", error);
      }
    };

    cargarUsuarioActual();
  }, []);

  // =========================================================
  // CARGAR ORGANIZACIONES + RELACIONES + USUARIOS
  // =========================================================

  const cargarOrganizaciones = async () => {
    try {
      setCargando(true);

      // -------------------------------------------------------
      // 1. ORGANIZACIONES
      // -------------------------------------------------------

      const { data: organizacionesData, error: organizacionesError } =
        await supabase
          .from("organizaciones")
          .select(
            `
              id,
              nombre,
              nit,
              telefono,
              correo,
              direccion,
              estado,
              organizacion_principal_id,
              created_at
            `,
          )
          .order("created_at", { ascending: false });

      if (organizacionesError) {
        throw organizacionesError;
      }

      // -------------------------------------------------------
      // 2. RELACIONES USUARIO ↔ ORGANIZACIÓN
      //    Los administradores usan esta tabla.
      // -------------------------------------------------------

      const { data: relacionesData, error: relacionesError } = await supabase
        .from("usuarios_organizaciones")
        .select("usuario_id, organizacion_id, rol, estado")
        .eq("estado", "activo");

      if (relacionesError) {
        throw relacionesError;
      }

      // -------------------------------------------------------
      // 3. USUARIOS
      //    Los domiciliarios usan usuarios.organizacion_id.
      // -------------------------------------------------------

      const { data: usuariosData, error: usuariosError } = await supabase
        .from("usuarios")
        .select("id, nombre, correo, rol, estado, organizacion_id");

      if (usuariosError) {
        throw usuariosError;
      }

      const relaciones = relacionesData || [];
      const usuarios = usuariosData || [];

      // -------------------------------------------------------
      // 4. ARMAR INFORMACIÓN DE CADA SUBORGANIZACIÓN
      // -------------------------------------------------------

      const organizacionesProcesadas = (organizacionesData || []).map(
        (organizacion) => {
          const relacionesOrg = relaciones.filter(
            (relacion) =>
              relacion.organizacion_id === organizacion.id &&
              relacion.estado === "activo",
          );

          const administradores = relacionesOrg
            .filter((relacion) => relacion.rol === "admin")
            .map((relacion) =>
              usuarios.find((usuario) => usuario.id === relacion.usuario_id),
            )
            .filter(Boolean)
            .filter((usuario) => usuario.estado === "activo");

          const domiciliarios = usuarios.filter(
            (usuario) =>
              usuario.rol === "domiciliario" &&
              usuario.estado === "activo" &&
              usuario.organizacion_id === organizacion.id,
          );

          return {
            ...organizacion,
            administradores,
            domiciliarios,
            administradoresCount: administradores.length,
            domiciliariosCount: domiciliarios.length,
          };
        },
      );

      setOrganizaciones(organizacionesProcesadas);
    } catch (error) {
      console.error("Error cargando organizaciones:", error);

      setOrganizaciones([]);

      Swal.fire({
        icon: "error",
        title: "No se pudieron cargar",
        text: error?.message || "Ocurrió un error cargando las organizaciones.",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setCargando(false);
    }
  };

  // =========================================================
  // CARGAR AL ENTRAR
  // =========================================================

  useEffect(() => {
    cargarOrganizaciones();
  }, []);

  // =========================================================
  // ORGANIZACIONES PRINCIPALES DISPONIBLES
  //
  // No existe una tabla independiente de "principales".
  // La principal se representa mediante
  // organizaciones.organizacion_principal_id.
  // =========================================================

  const gruposPrincipales = useMemo(() => {
    const grupos = new Map();

    organizaciones.forEach((organizacion) => {
      const principalId =
        organizacion.organizacion_principal_id || organizacion.id;

      if (!grupos.has(principalId)) {
        grupos.set(principalId, {
          id: principalId,
          organizaciones: [],
        });
      }

      grupos.get(principalId).organizaciones.push(organizacion);
    });

    return Array.from(grupos.values()).sort((a, b) => {
      const nombreA = a.organizaciones[0]?.nombre || "";
      const nombreB = b.organizaciones[0]?.nombre || "";

      return nombreA.localeCompare(nombreB);
    });
  }, [organizaciones]);

  // =========================================================
  // AGRUPAR ORGANIZACIONES POR PRINCIPAL
  // =========================================================

  const gruposOrganizaciones = useMemo(() => {
    const grupos = new Map();

    organizaciones.forEach((organizacion) => {
      const principalId =
        organizacion.organizacion_principal_id || organizacion.id;

      if (!grupos.has(principalId)) {
        grupos.set(principalId, {
          principalId,
          organizaciones: [],
        });
      }

      grupos.get(principalId).organizaciones.push(organizacion);
    });

    return Array.from(grupos.values());
  }, [organizaciones]);

  // =========================================================
  // TOTALES
  // =========================================================

  const totalAdministradores = organizaciones.reduce(
    (total, organizacion) => total + (organizacion.administradoresCount || 0),
    0,
  );

  const totalDomiciliarios = organizaciones.reduce(
    (total, organizacion) => total + (organizacion.domiciliariosCount || 0),
    0,
  );

  // =========================================================
  // CAMBIO DE FORMULARIO
  // =========================================================

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  // =========================================================
  // ABRIR MODAL
  // =========================================================

  const abrirModalCrear = () => {
    const primeraPrincipal = gruposPrincipales[0]?.id || "";

    setFormulario({
      ...FORMULARIO_INICIAL,
      organizacion_principal_id: primeraPrincipal,
    });

    setMostrarModal(true);
  };

  // =========================================================
  // CERRAR MODAL
  // =========================================================

  const cerrarModalCrear = () => {
    if (guardando) return;

    setMostrarModal(false);
    setFormulario(FORMULARIO_INICIAL);
  };

  // =========================================================
  // CREAR SUBORGANIZACIÓN
  //
  // IMPORTANTE:
  // Aquí NO se crea ningún administrador.
  // El administrador se crea después desde Usuarios.
  // =========================================================

  const crearOrganizacion = async (e) => {
    e.preventDefault();

    if (guardando) return;

    if (usuarioActual?.rol !== "super_admin") {
      Swal.fire({
        icon: "warning",
        title: "Acción no permitida",
        text: "Solo un super_admin puede crear organizaciones.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    const nombre = formulario.nombre.trim();
    const nit = formulario.nit.trim();
    const telefono = formulario.telefono.trim();
    const correo = formulario.correo.trim();
    const direccion = formulario.direccion.trim();
    const organizacionPrincipalId = formulario.organizacion_principal_id.trim();

    if (
      !nombre ||
      !nit ||
      !telefono ||
      !correo ||
      !direccion ||
      !organizacionPrincipalId
    ) {
      Swal.fire({
        icon: "warning",
        title: "Campos incompletos",
        text: "Completa todos los datos de la suborganización.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    try {
      setGuardando(true);

      // Evitar NIT duplicado desde la interfaz.
      const nitExistente = organizaciones.some(
        (organizacion) =>
          String(organizacion.nit || "")
            .trim()
            .toLowerCase() === nit.toLowerCase(),
      );

      if (nitExistente) {
        Swal.fire({
          icon: "warning",
          title: "NIT ya registrado",
          text: "Ya existe una organización con ese NIT.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }

      // Verificar que la principal seleccionada exista.
      const principalExiste = organizaciones.some(
        (organizacion) =>
          organizacion.id === organizacionPrincipalId ||
          organizacion.organizacion_principal_id === organizacionPrincipalId,
      );

      if (!principalExiste) {
        Swal.fire({
          icon: "warning",
          title: "Organización principal inválida",
          text: "La organización principal seleccionada ya no está disponible.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }

      const { data, error } = await supabase
        .from("organizaciones")
        .insert({
          nombre,
          nit,
          telefono,
          correo,
          direccion,
          estado: "activa",
          organizacion_principal_id: organizacionPrincipalId,
        })
        .select(
          `
            id,
            nombre,
            nit,
            telefono,
            correo,
            direccion,
            estado,
            organizacion_principal_id,
            created_at
          `,
        )
        .single();

      if (error) {
        console.error("Error creando suborganización:", error);
        throw error;
      }

      console.log("Suborganización creada:", data);

      setMostrarModal(false);
      setFormulario(FORMULARIO_INICIAL);

      await cargarOrganizaciones();

      Swal.fire({
        icon: "success",
        title: "Suborganización creada",
        text: `${nombre} quedó asociada correctamente a su organización principal.`,
        confirmButtonColor: "#2563eb",
      });
    } catch (error) {
      console.error("Error creando organización:", error);

      Swal.fire({
        icon: "error",
        title: "No se pudo crear",
        text: error?.message || "Ocurrió un error creando la suborganización.",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setGuardando(false);
    }
  };

  // =========================================================
  // VER ORGANIZACIÓN
  // =========================================================

  const verOrganizacion = (organizacion) => {
    const principalId =
      organizacion.organizacion_principal_id || organizacion.id;

    const asociadas = organizaciones.filter((item) => {
      const itemPrincipal = item.organizacion_principal_id || item.id;

      return itemPrincipal === principalId;
    });

    setOrganizacionSeleccionada({
      ...organizacion,
      organizacionesAsociadas: asociadas,
      organizacionPrincipalId: principalId,
    });
  };

  // =========================================================
  // CERRAR DETALLE
  // =========================================================

  const cerrarDetalle = () => {
    setOrganizacionSeleccionada(null);
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (cargando) {
    return (
      <div className={styles.contenedor}>
        <div className={styles.cargando}>
          <div className={styles.spinner}></div>
          <p>Cargando estructura de organizaciones...</p>
        </div>
      </div>
    );
  }

  // =========================================================
  // INTERFAZ
  // =========================================================

  return (
    <div className={styles.contenedor}>
      {/* =====================================================
          ENCABEZADO
      ===================================================== */}

      <header className={styles.encabezado}>
        <div>
          <div className={styles.tituloSuperior}>ADMINISTRACIÓN</div>

          <h1>Organizaciones</h1>

          <p>
            Administra las suborganizaciones y su estructura dentro de
            Liquisistema.
          </p>
        </div>

        {usuarioActual?.rol === "super_admin" && (
          <button className={styles.botonNueva} onClick={abrirModalCrear}>
            <span className={styles.iconoMas}>+</span>
            Nueva suborganización
          </button>
        )}
      </header>

      {/* =====================================================
          RESUMEN
      ===================================================== */}

      <section className={styles.resumen}>
        <div className={styles.resumenItem}>
          <div className={styles.resumenIcono}>ORG</div>

          <div>
            <span>Suborganizaciones</span>
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
      </section>

      {/* =====================================================
          ESTRUCTURA
      ===================================================== */}

      {gruposOrganizaciones.length === 0 ? (
        <section className={styles.vacio}>
          <div className={styles.vacioIcono}>ORG</div>

          <h2>No hay suborganizaciones</h2>

          <p>
            Todavía no se ha registrado ninguna organización en Liquisistema.
          </p>

          {usuarioActual?.rol === "super_admin" && (
            <button className={styles.botonNueva} onClick={abrirModalCrear}>
              Crear suborganización
            </button>
          )}
        </section>
      ) : (
        <section className={styles.listaPrincipal}>
          {gruposOrganizaciones.map((grupo) => {
            const principal =
              grupo.organizaciones.find(
                (organizacion) => organizacion.id === grupo.principalId,
              ) || grupo.organizaciones[0];

            return (
              <article className={styles.grupo} key={grupo.principalId}>
                <div className={styles.grupoHeader}>
                  <div className={styles.principalInfo}>
                    <div className={styles.principalIcono}>⌂</div>

                    <div>
                      <span className={styles.etiqueta}>
                        ORGANIZACIÓN PRINCIPAL
                      </span>

                      <h2>{principal?.nombre || "Grupo principal"}</h2>

                      <p>
                        {grupo.organizaciones.length}{" "}
                        {grupo.organizaciones.length === 1
                          ? "suborganización"
                          : "suborganizaciones"}{" "}
                        asociadas
                      </p>
                    </div>
                  </div>

                  <div className={styles.principalId}>
                    <span>ID principal</span>
                    <strong>{grupo.principalId}</strong>
                  </div>
                </div>

                <div className={styles.suborganizaciones}>
                  {grupo.organizaciones.map((organizacion) => {
                    const esPrincipal = organizacion.id === grupo.principalId;

                    return (
                      <div className={styles.tarjeta} key={organizacion.id}>
                        <div className={styles.tarjetaTop}>
                          <div className={styles.organizacionIcono}>
                            {esPrincipal ? "ORG" : "SUB"}
                          </div>

                          <span
                            className={
                              organizacion.estado === "activa"
                                ? styles.estadoActiva
                                : styles.estadoInactiva
                            }
                          >
                            <span></span>
                            {organizacion.estado === "activa"
                              ? "Activa"
                              : "Inactiva"}
                          </span>
                        </div>

                        <div className={styles.tarjetaTitulo}>
                          <h3>{organizacion.nombre}</h3>

                          <span>NIT {organizacion.nit || "No registrado"}</span>
                        </div>

                        <div className={styles.administrador}>
                          <div className={styles.avatar}>
                            {organizacion.administradores?.[0]?.nombre
                              ?.charAt(0)
                              ?.toUpperCase() || "—"}
                          </div>

                          <div>
                            <span>Administrador</span>

                            <strong>
                              {organizacion.administradores?.[0]?.nombre ||
                                "Sin administrador"}
                            </strong>
                          </div>
                        </div>

                        <div className={styles.datosRapidos}>
                          <div>
                            <span>Domiciliarios</span>
                            <strong>{organizacion.domiciliariosCount}</strong>
                          </div>

                          <div>
                            <span>Teléfono</span>
                            <strong>
                              {organizacion.telefono || "No registrado"}
                            </strong>
                          </div>
                        </div>

                        <div className={styles.asociacion}>
                          <span>Principal</span>
                          <strong>
                            {esPrincipal
                              ? "Organización raíz del grupo"
                              : principal?.nombre || "Grupo principal"}
                          </strong>
                        </div>

                        <div className={styles.acciones}>
                          <button onClick={() => verOrganizacion(organizacion)}>
                            Ver detalles
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* =====================================================
          MODAL CREAR
      ===================================================== */}

      {mostrarModal && (
        <div className={styles.overlay} onClick={cerrarModalCrear}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalEtiqueta}>
                  NUEVA SUBORGANIZACIÓN
                </span>

                <h2>Crear suborganización</h2>

                <p>
                  Registra una nueva suborganización dentro de una organización
                  principal existente.
                </p>
              </div>

              <button
                className={styles.cerrar}
                onClick={cerrarModalCrear}
                disabled={guardando}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <form onSubmit={crearOrganizacion}>
              <div className={styles.formularioSeccion}>
                <div className={styles.seccionEncabezado}>
                  <div className={styles.seccionNumero}>01</div>

                  <div>
                    <h3>Organización principal</h3>
                    <p>
                      Todas las suborganizaciones del mismo grupo compartirán
                      este identificador principal.
                    </p>
                  </div>
                </div>

                <div className={styles.campo}>
                  <label htmlFor="organizacion_principal_id">Pertenece a</label>

                  <select
                    id="organizacion_principal_id"
                    name="organizacion_principal_id"
                    value={formulario.organizacion_principal_id}
                    onChange={manejarCambio}
                    disabled={guardando || gruposPrincipales.length === 0}
                    required
                  >
                    {gruposPrincipales.length === 0 ? (
                      <option value="">
                        No hay organizaciones principales disponibles
                      </option>
                    ) : (
                      gruposPrincipales.map((grupo) => {
                        const nombrePrincipal =
                          grupo.organizaciones[0]?.nombre ||
                          "Organización principal";

                        return (
                          <option key={grupo.id} value={grupo.id}>
                            {nombrePrincipal} · {grupo.organizaciones.length}{" "}
                            {grupo.organizaciones.length === 1
                              ? "asociada"
                              : "asociadas"}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>
              </div>

              <div className={styles.formularioSeccion}>
                <div className={styles.seccionEncabezado}>
                  <div className={styles.seccionNumero}>02</div>

                  <div>
                    <h3>Datos de la suborganización</h3>
                    <p>Información propia de esta suborganización.</p>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.campo}>
                    <label htmlFor="nombre">Nombre de la suborganización</label>

                    <input
                      id="nombre"
                      type="text"
                      name="nombre"
                      placeholder="Ej. Farmacia Nueva"
                      value={formulario.nombre}
                      onChange={manejarCambio}
                      disabled={guardando}
                      required
                    />
                  </div>

                  <div className={styles.campo}>
                    <label htmlFor="nit">NIT</label>

                    <input
                      id="nit"
                      type="text"
                      name="nit"
                      placeholder="Ej. 900123456"
                      value={formulario.nit}
                      onChange={manejarCambio}
                      disabled={guardando}
                      required
                    />
                  </div>

                  <div className={styles.campo}>
                    <label htmlFor="telefono">Teléfono</label>

                    <input
                      id="telefono"
                      type="text"
                      name="telefono"
                      placeholder="Ej. 3001234567"
                      value={formulario.telefono}
                      onChange={manejarCambio}
                      disabled={guardando}
                      required
                    />
                  </div>

                  <div className={styles.campo}>
                    <label htmlFor="correo">Correo electrónico</label>

                    <input
                      id="correo"
                      type="email"
                      name="correo"
                      placeholder="correo@empresa.com"
                      value={formulario.correo}
                      onChange={manejarCambio}
                      disabled={guardando}
                      required
                    />
                  </div>

                  <div className={`${styles.campo} ${styles.campoCompleto}`}>
                    <label htmlFor="direccion">Dirección</label>

                    <input
                      id="direccion"
                      type="text"
                      name="direccion"
                      placeholder="Dirección de la suborganización"
                      value={formulario.direccion}
                      onChange={manejarCambio}
                      disabled={guardando}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className={styles.aviso}>
                <div className={styles.avisoIcono}>i</div>

                <div>
                  <strong>Los usuarios se administran aparte</strong>

                  <p>
                    Esta acción solamente crea la suborganización. Después
                    podrás crear y asignar su administrador desde el módulo de
                    Usuarios.
                  </p>
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
                  disabled={guardando || gruposPrincipales.length === 0}
                >
                  {guardando ? "Creando..." : "Crear suborganización"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL DETALLE
      ===================================================== */}

      {organizacionSeleccionada && (
        <div className={styles.overlay} onClick={cerrarDetalle}>
          <div
            className={styles.modalDetalle}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.detalleHeader}>
              <div>
                <span className={styles.modalEtiqueta}>SUBORGANIZACIÓN</span>

                <h2>{organizacionSeleccionada.nombre}</h2>

                <p>
                  Información, organización principal y entidades asociadas.
                </p>
              </div>

              <button
                className={styles.cerrar}
                onClick={cerrarDetalle}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className={styles.detalleEstadoFila}>
              <span
                className={
                  organizacionSeleccionada.estado === "activa"
                    ? styles.estadoActiva
                    : styles.estadoInactiva
                }
              >
                <span></span>
                {organizacionSeleccionada.estado === "activa"
                  ? "Organización activa"
                  : "Organización inactiva"}
              </span>
            </div>

            {/* INFORMACIÓN */}

            <section className={styles.detalleSeccion}>
              <div className={styles.detalleTitulo}>
                <div>
                  <span>01</span>
                  <h3>Información general</h3>
                </div>
              </div>

              <div className={styles.detalleGrid}>
                <div>
                  <span>NIT</span>
                  <strong>
                    {organizacionSeleccionada.nit || "No registrado"}
                  </strong>
                </div>

                <div>
                  <span>Teléfono</span>
                  <strong>
                    {organizacionSeleccionada.telefono || "No registrado"}
                  </strong>
                </div>

                <div>
                  <span>Correo</span>
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
            </section>

            {/* PRINCIPAL */}

            <section className={styles.detalleSeccion}>
              <div className={styles.detalleTitulo}>
                <div>
                  <span>02</span>
                  <h3>Organización principal</h3>
                </div>
              </div>

              <div className={styles.principalDetalle}>
                <div className={styles.principalDetalleIcono}>⌂</div>

                <div>
                  <span>Grupo principal</span>

                  <strong>
                    {organizacionSeleccionada.organizacionesAsociadas?.[0]
                      ?.nombre || "Organización principal"}
                  </strong>

                  <small>
                    ID: {organizacionSeleccionada.organizacionPrincipalId}
                  </small>
                </div>
              </div>
            </section>

            {/* ASOCIADAS */}

            <section className={styles.detalleSeccion}>
              <div className={styles.detalleTituloConContador}>
                <div className={styles.detalleTitulo}>
                  <div>
                    <span>03</span>
                    <h3>Suborganizaciones asociadas</h3>
                  </div>
                </div>

                <span className={styles.contador}>
                  {organizacionSeleccionada.organizacionesAsociadas?.length ||
                    0}
                </span>
              </div>

              <div className={styles.listaAsociadas}>
                {(organizacionSeleccionada.organizacionesAsociadas || []).map(
                  (asociada) => {
                    const esActual =
                      asociada.id === organizacionSeleccionada.id;

                    return (
                      <div
                        className={`${styles.asociada} ${
                          esActual ? styles.asociadaActual : ""
                        }`}
                        key={asociada.id}
                      >
                        <div className={styles.asociadaIcono}>
                          {esActual ? "✓" : "SUB"}
                        </div>

                        <div className={styles.asociadaInfo}>
                          <strong>{asociada.nombre}</strong>

                          <span>NIT {asociada.nit || "No registrado"}</span>
                        </div>

                        <div className={styles.asociadaMeta}>
                          <span>
                            {asociada.administradoresCount || 0} admin.
                          </span>

                          <span>{asociada.domiciliariosCount || 0} domic.</span>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </section>

            {/* USUARIOS */}

            <section className={styles.detalleSeccion}>
              <div className={styles.detalleTitulo}>
                <div>
                  <span>04</span>
                  <h3>Usuarios de esta suborganización</h3>
                </div>
              </div>

              <div className={styles.usuariosDetalle}>
                <div className={styles.usuarioDetalleCard}>
                  <div className={styles.usuarioDetalleNumero}>
                    {organizacionSeleccionada.administradoresCount || 0}
                  </div>

                  <div>
                    <strong>Administradores</strong>
                    <span>
                      Usuarios administrativos asignados a esta suborganización.
                    </span>
                  </div>
                </div>

                <div className={styles.usuarioDetalleCard}>
                  <div className={styles.usuarioDetalleNumero}>
                    {organizacionSeleccionada.domiciliariosCount || 0}
                  </div>

                  <div>
                    <strong>Domiciliarios</strong>
                    <span>
                      Personal asignado directamente a esta suborganización.
                    </span>
                  </div>
                </div>
              </div>
            </section>

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
