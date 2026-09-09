import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import { supabase } from "../../../config/supabase";
import { registrarActividad } from "../../../services/actividadService";

import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  ShareIcon,
  XMarkIcon,
  CheckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

import styles from "./AdminClientes.module.css";

export default function AdminClientes() {
  // ==========================================
  // USUARIO ACTUAL
  // ==========================================

  const [usuarioActual, setUsuarioActual] = useState(null);

  // ==========================================
  // CLIENTES
  // ==========================================

  const [clientes, setClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargandoClientes, setCargandoClientes] = useState(true);

  // ==========================================
  // ORGANIZACIONES
  // ==========================================

  const [organizaciones, setOrganizaciones] = useState([]);
  const [cargandoOrganizaciones, setCargandoOrganizaciones] = useState(false);

  // ==========================================
  // COMPARTIR CLIENTE
  // ==========================================

  const [modalCompartir, setModalCompartir] = useState(false);
  const [clienteCompartir, setClienteCompartir] = useState(null);
  const [organizacionDestino, setOrganizacionDestino] = useState("");
  const [compartiendoCliente, setCompartiendoCliente] = useState(false);

  // ==========================================
  // SOLICITUDES ENTRANTES
  // ==========================================

  const [solicitudClienteEntrante, setSolicitudClienteEntrante] =
    useState(null);

  const [procesandoSolicitudCliente, setProcesandoSolicitudCliente] =
    useState(false);

  // ==========================================
  // SOLICITUDES ENVIADAS
  // ==========================================

  const [solicitudesEnviadas, setSolicitudesEnviadas] = useState([]);

  // ==========================================
  // MENSAJES
  // ==========================================

  const [mensajeCompartir, setMensajeCompartir] = useState({
    tipo: "",
    texto: "",
  });

  // ==========================================
  // OBTENER USUARIO ACTUAL
  // ==========================================

  useEffect(() => {
    const cargarUsuarioActual = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error("❌ Error obteniendo usuario autenticado:", authError);
          return;
        }

        // Obtener organización mediante la relación
        // usuario → organización
        const { data: organizacionesUsuario, error: organizacionError } =
          await supabase.rpc("obtener_organizaciones_usuario");

        if (organizacionError) {
          console.error(
            "❌ Error obteniendo organizaciones del usuario:",
            organizacionError,
          );
          return;
        }

        console.log("🏢 Organizaciones del usuario:", organizacionesUsuario);

        if (!organizacionesUsuario?.length) {
          console.error("❌ El usuario no tiene ninguna organización activa.");
          return;
        }

        // Usamos la primera organización activa
        const organizacion = organizacionesUsuario[0];

        const usuario = {
          id: user.id,
          organizacion_id: organizacion.organizacion_id,
          rol: organizacion.rol,
          estado: organizacion.estado,
        };

        console.log("👤 Usuario actual:", usuario);
        console.log("🏢 Organización actual:", organizacion.organizacion_id);

        setUsuarioActual(usuario);
      } catch (error) {
        console.error("❌ Error obteniendo usuario actual:", error);
      }
    };

    cargarUsuarioActual();
  }, []);

  // ==========================================
  // CARGAR CLIENTES
  // ==========================================

  const cargarClientes = async () => {
    if (!usuarioActual?.organizacion_id) {
      return;
    }

    setCargandoClientes(true);

    try {
      const { data, error } = await supabase
        .from("clientes")
        .select(
          `
            id,
            nombre,
            telefono,
            direccion,
            created_at,
            clientes_organizaciones (
              organizacion_id
            )
          `,
        )
        .eq(
          "clientes_organizaciones.organizacion_id",
          usuarioActual.organizacion_id,
        )
        .order("nombre", {
          ascending: true,
        });

      if (error) {
        console.error("❌ Error cargando clientes:", error);
        setClientes([]);
        return;
      }

      console.log("👥 Clientes encontrados:", data);

      setClientes(data || []);
    } catch (error) {
      console.error("❌ Error inesperado cargando clientes:", error);
      setClientes([]);
    } finally {
      setCargandoClientes(false);
    }
  };

  // ==========================================
  // CARGAR ORGANIZACIONES
  // ==========================================

  const cargarOrganizaciones = async () => {
    if (!usuarioActual?.organizacion_id) {
      return;
    }

    setCargandoOrganizaciones(true);

    try {
      console.log("🏢 Cargando organizaciones para compartir...");

      const { data, error } = await supabase.rpc(
        "obtener_organizaciones_para_compartir",
      );

      if (error) {
        console.error(
          "❌ Error obteniendo organizaciones para compartir:",
          error,
        );

        setOrganizaciones([]);
        return;
      }

      console.log("🏢 Organizaciones recibidas:", data);

      const organizacionesNormalizadas = (data || [])
        .map((organizacion) => ({
          id: organizacion.id,
          nombre: organizacion.nombre,
          nit: organizacion.nit,
        }))
        .filter(
          (organizacion) =>
            organizacion.id &&
            organizacion.nombre &&
            organizacion.id !== usuarioActual.organizacion_id,
        );

      console.log("🏢 Organizaciones disponibles:", organizacionesNormalizadas);

      setOrganizaciones(organizacionesNormalizadas);
    } catch (error) {
      console.error("❌ Error inesperado obteniendo organizaciones:", error);

      setOrganizaciones([]);
    } finally {
      setCargandoOrganizaciones(false);
    }
  };

  // ==========================================
  // CARGAR SOLICITUDES ENVIADAS
  // ==========================================

  const cargarSolicitudesEnviadas = async () => {
    if (!usuarioActual?.organizacion_id) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("solicitudes_clientes")
        .select(
          `
            id,
            cliente_id,
            organizacion_origen_id,
            organizacion_destino_id,
            estado,
            created_at,

            clientes (
              id,
              nombre,
              telefono
            )
          `,
        )
        .eq("organizacion_origen_id", usuarioActual.organizacion_id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error("❌ Error cargando solicitudes enviadas:", error);

        return;
      }

      setSolicitudesEnviadas(data || []);
    } catch (error) {
      console.error(
        "❌ Error inesperado cargando solicitudes enviadas:",
        error,
      );
    }
  };

  // ==========================================
  // CARGAR SOLICITUD ENTRANTE
  // ==========================================

  const cargarSolicitudEntrante = async () => {
    if (!usuarioActual?.organizacion_id) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("solicitudes_clientes")
        .select(
          `
            id,
            cliente_id,
            organizacion_origen_id,
            organizacion_destino_id,
            enviado_por,
            estado,
            created_at,

            clientes (
              id,
              nombre,
              telefono,
              direccion
            ),

            organizaciones!solicitudes_clientes_origen_fk (
              id,
              nombre
            ),

            usuarios!solicitudes_clientes_enviado_por_fk (
              id,
              nombre
            )
          `,
        )
        .eq("organizacion_destino_id", usuarioActual.organizacion_id)
        .eq("estado", "pendiente")
        .order("created_at", {
          ascending: true,
        })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("❌ Error cargando solicitud entrante:", error);

        return;
      }

      if (data) {
        console.log("📩 Solicitud entrante encontrada:", data);

        setSolicitudClienteEntrante(data);
      }
    } catch (error) {
      console.error("❌ Error inesperado cargando solicitud entrante:", error);
    }
  };

  // ==========================================
  // CARGA INICIAL
  // ==========================================

  useEffect(() => {
    if (!usuarioActual?.organizacion_id) {
      return;
    }

    console.log(
      "🚀 Cargando información de organización:",
      usuarioActual.organizacion_id,
    );

    cargarClientes();
    cargarOrganizaciones();
    cargarSolicitudesEnviadas();
    cargarSolicitudEntrante();
  }, [usuarioActual]);

  // ==========================================
  // FILTRAR CLIENTES
  // ==========================================

  useEffect(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      setClientesFiltrados(clientes);
      return;
    }

    const filtrados = clientes.filter(
      (cliente) =>
        cliente.nombre?.toLowerCase().includes(texto) ||
        cliente.telefono?.toLowerCase().includes(texto) ||
        cliente.direccion?.toLowerCase().includes(texto),
    );

    setClientesFiltrados(filtrados);
  }, [busqueda, clientes]);

  // ==========================================
  // TIEMPO REAL
  // ==========================================

  useEffect(() => {
    if (!usuarioActual?.organizacion_id) {
      return;
    }

    const organizacionId = usuarioActual.organizacion_id;

    console.log("📡 Creando canal Realtime:", organizacionId);

    let canal;

    const iniciarRealtime = async () => {
      canal = supabase.channel(`solicitudes-clientes-${organizacionId}`);

      canal.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "solicitudes_clientes",
          filter: `organizacion_destino_id=eq.${organizacionId}`,
        },
        async (payload) => {
          console.log("📩 NUEVA SOLICITUD RECIBIDA:", payload.new);

          const { data, error } = await supabase
            .from("solicitudes_clientes")
            .select(
              `
            id,
            cliente_id,
            organizacion_origen_id,
            organizacion_destino_id,
            enviado_por,
            estado,
            created_at,

            clientes (
              id,
              nombre,
              telefono,
              direccion
            ),

            organizaciones!solicitudes_clientes_origen_fk (
              id,
              nombre
            ),

            usuarios!solicitudes_clientes_enviado_por_fk (
              id,
              nombre
            )
          `,
            )
            .eq("id", payload.new.id)
            .maybeSingle();

          if (error) {
            console.error("❌ Error obteniendo solicitud:", error);

            return;
          }

          if (data && data.estado === "pendiente") {
            console.log("🚨 MOSTRANDO MODAL DE SOLICITUD:", data);

            setSolicitudClienteEntrante(data);
          }
        },
      );

      canal.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "solicitudes_clientes",
          filter: `organizacion_origen_id=eq.${organizacionId}`,
        },
        async (payload) => {
          console.log("🔄 SOLICITUD ACTUALIZADA:", payload.new);

          await cargarSolicitudesEnviadas();
        },
      );

      const status = await canal.subscribe();

      console.log("📡 Estado canal solicitudes:", status);
    };

    iniciarRealtime();

    return () => {
      if (canal) {
        console.log("🔌 Cerrando canal solicitudes:", organizacionId);

        supabase.removeChannel(canal);
      }
    };
  }, [usuarioActual]);
  // ==========================================
  // RESPALDO
  // COMPROBAR SOLICITUD CADA 5 SEGUNDOS
  // ==========================================

  useEffect(() => {
    if (!usuarioActual?.organizacion_id) {
      return;
    }

    const intervalo = setInterval(() => {
      cargarSolicitudEntrante();
    }, 5000);

    return () => {
      clearInterval(intervalo);
    };
  }, [usuarioActual]);

  // ==========================================
  // ABRIR MODAL COMPARTIR
  // ==========================================

  const abrirModalCompartir = async (cliente) => {
    setClienteCompartir(cliente);

    setOrganizacionDestino("");

    setMensajeCompartir({
      tipo: "",
      texto: "",
    });

    setModalCompartir(true);

    await cargarOrganizaciones();
  };

  // ==========================================
  // CERRAR MODAL COMPARTIR
  // ==========================================

  const cerrarModalCompartir = () => {
    if (compartiendoCliente) {
      return;
    }

    setModalCompartir(false);

    setClienteCompartir(null);

    setOrganizacionDestino("");

    setMensajeCompartir({
      tipo: "",
      texto: "",
    });
  };

  // ==========================================
  // COMPARTIR CLIENTE
  // ==========================================

  const compartirCliente = async (e) => {
    e.preventDefault();

    if (!clienteCompartir) {
      setMensajeCompartir({
        tipo: "error",
        texto: "No hay ningún cliente seleccionado.",
      });

      return;
    }

    if (!organizacionDestino) {
      setMensajeCompartir({
        tipo: "error",
        texto: "Selecciona una organización.",
      });

      return;
    }

    if (!usuarioActual?.organizacion_id) {
      setMensajeCompartir({
        tipo: "error",
        texto: "Tu usuario no tiene una organización asignada.",
      });

      return;
    }

    if (organizacionDestino === usuarioActual.organizacion_id) {
      setMensajeCompartir({
        tipo: "error",
        texto: "No puedes compartir un cliente con tu propia organización.",
      });

      return;
    }

    if (compartiendoCliente) {
      return;
    }

    setCompartiendoCliente(true);

    try {
      console.log("📤 Enviando solicitud:", {
        cliente_id: clienteCompartir.id,
        organizacion_origen_id: usuarioActual.organizacion_id,
        organizacion_destino_id: organizacionDestino,
        enviado_por: usuarioActual.id,
        estado: "pendiente",
      });

      const { data, error } = await supabase
        .from("solicitudes_clientes")
        .insert({
          cliente_id: clienteCompartir.id,
          organizacion_origen_id: usuarioActual.organizacion_id,
          organizacion_destino_id: organizacionDestino,
          enviado_por: usuarioActual.id,
          estado: "pendiente",
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Error enviando solicitud:", error);

        if (error.code === "23505") {
          setMensajeCompartir({
            tipo: "error",
            texto:
              "Ya existe una solicitud pendiente para este cliente y organización.",
          });
        } else if (error.code === "42501") {
          setMensajeCompartir({
            tipo: "error",
            texto:
              "No tienes permisos para enviar solicitudes. Revisa las políticas RLS de solicitudes_clientes.",
          });
        } else {
          setMensajeCompartir({
            tipo: "error",
            texto: error.message || "No se pudo enviar la solicitud.",
          });
        }

        return;
      }

      console.log("✅ Solicitud creada:", data);

      // ========================================
      // REGISTRAR ACTIVIDAD
      // ========================================

      try {
        await registrarActividad({
          usuarioId: usuarioActual.id,
          tipo: "cliente",
          accion: "compartir",
          descripcion: `Solicitó compartir al cliente ${clienteCompartir.nombre}.`,
          referenciaId: clienteCompartir.id,
          organizacionId: usuarioActual.organizacion_id,
        });
      } catch (actividadError) {
        console.error("⚠️ Error registrando actividad:", actividadError);
      }

      await cargarSolicitudesEnviadas();

      setMensajeCompartir({
        tipo: "exito",
        texto: "Solicitud enviada correctamente.",
      });

      setCompartiendoCliente(false);

      setTimeout(() => {
        cerrarModalCompartir();
      }, 1000);
    } catch (error) {
      console.error("❌ Error inesperado compartiendo cliente:", error);

      setMensajeCompartir({
        tipo: "error",
        texto: "Ocurrió un error inesperado.",
      });
    } finally {
      setCompartiendoCliente(false);
    }
  };

  // ==========================================
  // RESPONDER SOLICITUD
  // ==========================================

  const responderSolicitudCliente = async (aceptar) => {
    if (!solicitudClienteEntrante || procesandoSolicitudCliente) {
      return;
    }

    setProcesandoSolicitudCliente(true);

    const funcion = aceptar
      ? "aceptar_solicitud_cliente"
      : "rechazar_solicitud_cliente";

    try {
      console.log(
        aceptar ? "✅ Aceptando solicitud..." : "❌ Rechazando solicitud...",
      );

      const { data, error } = await supabase.rpc(funcion, {
        p_solicitud_id: solicitudClienteEntrante.id,
      });

      if (error) {
        console.error(
          aceptar
            ? "❌ Error aceptando solicitud:"
            : "❌ Error rechazando solicitud:",
          error,
        );

        Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message || "No se pudo procesar la solicitud.",
          confirmButtonColor: "#2563eb",
        });

        return;
      }

      console.log(
        aceptar ? "✅ Solicitud aceptada:" : "❌ Solicitud rechazada:",
        data,
      );

      // ========================================
      // REGISTRAR ACTIVIDAD
      // ========================================

      try {
        await registrarActividad({
          usuarioId: usuarioActual.id,
          tipo: "cliente",
          accion: aceptar ? "compartir_aceptado" : "compartir_rechazado",

          descripcion: aceptar
            ? `Aceptó recibir al cliente ${
                solicitudClienteEntrante.clientes?.nombre || "cliente"
              }.`
            : `Rechazó recibir al cliente ${
                solicitudClienteEntrante.clientes?.nombre || "cliente"
              }.`,

          referenciaId: solicitudClienteEntrante.cliente_id,

          organizacionId: usuarioActual.organizacion_id,
        });
      } catch (actividadError) {
        console.error("⚠️ Error registrando actividad:", actividadError);
      }

      // ========================================
      // ACTUALIZAR CLIENTES
      // ========================================

      if (aceptar) {
        await cargarClientes();
      }

      await cargarSolicitudEntrante();

      setSolicitudClienteEntrante(null);

      Swal.fire({
        icon: "success",
        title: aceptar ? "Cliente recibido" : "Solicitud rechazada",

        text: aceptar
          ? "El cliente ahora pertenece a tu organización."
          : "La solicitud fue rechazada correctamente.",

        confirmButtonColor: "#2563eb",
      });
    } catch (error) {
      console.error("❌ Error inesperado respondiendo solicitud:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Ocurrió un error procesando la solicitud.",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setProcesandoSolicitudCliente(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  if (!usuarioActual) {
    return null;
  }

  return (
    <div className={styles.lqClientes}>
      {/* ======================================
          ENCABEZADO
      ====================================== */}

      <div className={styles.lqClientesHeader}>
        <div>
          <h1>Clientes</h1>

          <p>Administra los clientes de tu organización.</p>
        </div>
      </div>

      {/* ======================================
          BUSCADOR
      ====================================== */}

      <div className={styles.lqClientesToolbar}>
        <div className={styles.lqClientesSearch}>
          <MagnifyingGlassIcon />

          <input
            type="text"
            placeholder="Buscar cliente por nombre, teléfono o dirección..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className={styles.lqClientesCount}>
          <UserGroupIcon />

          <span>
            {clientesFiltrados.length} cliente
            {clientesFiltrados.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ======================================
          TABLA
      ====================================== */}

      <div className={styles.lqClientesTableWrapper}>
        {cargandoClientes ? (
          <div className={styles.lqClientesEmpty}>
            <span>Cargando clientes...</span>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className={styles.lqClientesEmpty}>
            <UserGroupIcon />

            <strong>
              {busqueda
                ? "No se encontraron clientes"
                : "No hay clientes registrados"}
            </strong>

            <span>
              {busqueda
                ? "Prueba con otro nombre o teléfono."
                : "Los clientes aparecerán aquí cuando los domiciliarios registren domicilios."}
            </span>
          </div>
        ) : (
          <table className={styles.lqClientesTable}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Organizaciones</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {clientesFiltrados.map((cliente) => {
                const cantidadOrganizaciones =
                  cliente.clientes_organizaciones?.length || 0;

                const solicitudPendiente = solicitudesEnviadas.find(
                  (solicitud) =>
                    solicitud.cliente_id === cliente.id &&
                    solicitud.estado === "pendiente",
                );

                return (
                  <tr key={cliente.id}>
                    {/* CLIENTE */}

                    <td>
                      <div className={styles.lqClienteNombre}>
                        <div className={styles.lqClienteAvatar}>
                          <UserGroupIcon />
                        </div>

                        <strong>{cliente.nombre}</strong>
                      </div>
                    </td>

                    {/* TELEFONO */}

                    <td>{cliente.telefono}</td>

                    {/* DIRECCION */}

                    <td>{cliente.direccion || "Sin dirección"}</td>

                    {/* ORGANIZACIONES */}

                    <td>
                      <span className={styles.lqClienteBadge}>
                        {cantidadOrganizaciones} organización
                        {cantidadOrganizaciones !== 1 ? "es" : ""}
                      </span>
                    </td>

                    {/* ACCIONES */}

                    <td>
                      <button
                        type="button"
                        className={styles.lqClienteShareButton}
                        onClick={() => abrirModalCompartir(cliente)}
                        disabled={!!solicitudPendiente}
                      >
                        <ShareIcon />

                        {solicitudPendiente ? "Solicitud enviada" : "Compartir"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ======================================
          MODAL COMPARTIR
      ====================================== */}

      {modalCompartir && clienteCompartir && (
        <div className={styles.lqModalOverlay}>
          <div className={styles.lqModal}>
            {/* HEADER */}

            <div className={styles.lqModalHeader}>
              <div>
                <h2>Compartir cliente</h2>

                <p>Comparte este cliente con otra organización.</p>
              </div>

              <button
                type="button"
                onClick={cerrarModalCompartir}
                disabled={compartiendoCliente}
              >
                <XMarkIcon />
              </button>
            </div>

            {/* CLIENTE */}

            <div className={styles.lqModalCliente}>
              <strong>{clienteCompartir.nombre}</strong>

              <span>{clienteCompartir.telefono}</span>

              <span>{clienteCompartir.direccion || "Sin dirección"}</span>
            </div>

            {/* FORMULARIO */}

            <form onSubmit={compartirCliente}>
              <label>Organización destino</label>

              <select
                value={organizacionDestino}
                onChange={(e) => setOrganizacionDestino(e.target.value)}
                disabled={compartiendoCliente || cargandoOrganizaciones}
              >
                <option value="">
                  {cargandoOrganizaciones
                    ? "Cargando organizaciones..."
                    : "Selecciona una organización"}
                </option>

                {organizaciones.map((organizacion) => (
                  <option key={organizacion.id} value={organizacion.id}>
                    {organizacion.nombre}
                  </option>
                ))}
              </select>
              {!cargandoOrganizaciones && organizaciones.length === 0 && (
                <div className={styles.lqMensajeError}>
                  No hay otras organizaciones disponibles para compartir.
                </div>
              )}

              {/* MENSAJE */}

              {mensajeCompartir.texto && (
                <div
                  className={
                    mensajeCompartir.tipo === "error"
                      ? styles.lqMensajeError
                      : styles.lqMensajeExito
                  }
                >
                  {mensajeCompartir.texto}
                </div>
              )}

              {/* BOTONES */}

              <div className={styles.lqModalActions}>
                <button
                  type="button"
                  onClick={cerrarModalCompartir}
                  disabled={compartiendoCliente}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={compartiendoCliente || !organizacionDestino}
                >
                  <ShareIcon />

                  {compartiendoCliente ? "Enviando..." : "Compartir cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================
          MODAL SOLICITUD ENTRANTE
      ====================================== */}

      {solicitudClienteEntrante && (
        <div className={styles.lqModalOverlay}>
          <div className={styles.lqSolicitudModal}>
            {/* ICONO */}

            <div className={styles.lqSolicitudIcon}>
              <UserGroupIcon />
            </div>

            {/* TITULO */}

            <h2>Nuevo cliente compartido</h2>

            {/* ORGANIZACION */}

            <p>
              <strong>
                {solicitudClienteEntrante.organizaciones?.nombre ||
                  "Otra organización"}
              </strong>{" "}
              quiere compartir un cliente con tu organización.
            </p>

            {/* CLIENTE */}

            <div className={styles.lqSolicitudCliente}>
              <strong>{solicitudClienteEntrante.clientes?.nombre}</strong>

              <span>{solicitudClienteEntrante.clientes?.telefono}</span>

              <span>
                {solicitudClienteEntrante.clientes?.direccion ||
                  "Sin dirección"}
              </span>
            </div>

            {/* BOTONES */}

            <div className={styles.lqSolicitudActions}>
              <button
                type="button"
                onClick={() => responderSolicitudCliente(false)}
                disabled={procesandoSolicitudCliente}
              >
                <XCircleIcon />
                Rechazar
              </button>

              <button
                type="button"
                onClick={() => responderSolicitudCliente(true)}
                disabled={procesandoSolicitudCliente}
              >
                <CheckIcon />

                {procesandoSolicitudCliente ? "Procesando..." : "Aceptar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
