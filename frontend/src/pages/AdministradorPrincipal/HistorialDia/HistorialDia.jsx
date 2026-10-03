import { useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ClockIcon,
  PencilSquareIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { supabase } from "../../../config/supabase";
import Swal from "sweetalert2";

import styles from "./HistorialDia.module.css";

export default function HistorialDia() {
  const [domicilios, setDomicilios] = useState([]);
  const [domiciliarios, setDomiciliarios] = useState([]);
  const [organizacionesOrigen, setOrganizacionesOrigen] = useState([]);

  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [domiciliarioFiltro, setDomiciliarioFiltro] = useState("todos");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [metodoFiltro, setMetodoFiltro] = useState("todos");

  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    const hoy = new Date();
    const offset = hoy.getTimezoneOffset();
    return new Date(hoy.getTime() - offset * 60000).toISOString().split("T")[0];
  });

  const [organizacionActual, setOrganizacionActual] = useState("");
  const [modalDomicilio, setModalDomicilio] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [domicilioEditando, setDomicilioEditando] = useState(null);
  const [guardandoDomicilio, setGuardandoDomicilio] = useState(false);
  const [formDomicilio, setFormDomicilio] = useState({
    cliente: "",
    telefono: "",
    direccion: "",
    costo: "",
    propina: "",
    metodo_pago: "",
    estado: "Entregado",
    domiciliario_id: "",
    organizacion_origen_id: "",
    observaciones: "",
  });

  // Clientes para el buscador del formulario "Nuevo domicilio".
  // Se limita la búsqueda a la organización actual mediante el RPC existente.
  const [clientesEncontrados, setClientesEncontrados] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [busquedaClienteModal, setBusquedaClienteModal] = useState("");

  useEffect(() => {
    cargarDatos();
  }, [fechaSeleccionada]);

  const cargarDatos = async () => {
    setCargando(true);

    try {
      const {
        data: { user },
        error: errorAuth,
      } = await supabase.auth.getUser();

      if (errorAuth || !user) {
        console.error("Error obteniendo usuario autenticado:", errorAuth);

        setDomicilios([]);
        setDomiciliarios([]);
        return;
      }

      const { data: usuarioActual, error: errorUsuario } = await supabase
        .from("usuarios")
        .select("id, nombre, rol, estado, organizacion_id")
        .eq("id", user.id)
        .single();

      if (errorUsuario || !usuarioActual) {
        console.error("Error obteniendo datos del usuario:", errorUsuario);

        setDomicilios([]);
        setDomiciliarios([]);
        return;
      }

      // ==========================================
      // OBTENER ORGANIZACIÓN
      // ==========================================

      let organizacionId = usuarioActual.organizacion_id;

      // Si el usuario no tiene organizacion_id,
      // buscarla en usuarios_organizaciones
      if (!organizacionId) {
        const { data: relacionOrganizacion, error: errorOrganizacion } =
          await supabase
            .from("usuarios_organizaciones")
            .select("organizacion_id")
            .eq("usuario_id", user.id)
            .eq("estado", "activo")
            .limit(1)
            .maybeSingle();

        if (errorOrganizacion) {
          console.error(
            "Error obteniendo organización desde usuarios_organizaciones:",
            errorOrganizacion,
          );
        } else if (relacionOrganizacion?.organizacion_id) {
          organizacionId = relacionOrganizacion.organizacion_id;
        }
      }

      console.log("USUARIO ACTUAL:", usuarioActual);
      console.log("ORGANIZACIÓN FINAL:", organizacionId);

      setOrganizacionActual(organizacionId || "");

      // Organizaciones disponibles como origen:
      // todas las suborganizaciones activas del mismo principal.
      // Así, por ejemplo, Samuel puede indicar que un domicilio salió
      // desde Santiago cuando ambas pertenecen al mismo principal.
      let organizacionesDisponibles = [];

      if (organizacionId) {
        const { data: organizacionActualData, error: errorOrgActual } =
          await supabase
            .from("organizaciones")
            .select("id, nombre, organizacion_principal_id")
            .eq("id", organizacionId)
            .maybeSingle();

        if (errorOrgActual) {
          console.error(
            "Error obteniendo la organización actual para origen:",
            errorOrgActual,
          );
        }

        if (organizacionActualData?.organizacion_principal_id) {
          const { data: organizacionesData, error: organizacionesError } =
            await supabase
              .from("organizaciones")
              .select("id, nombre")
              .eq(
                "organizacion_principal_id",
                organizacionActualData.organizacion_principal_id,
              )
              .eq("estado", "activa")
              .order("nombre", { ascending: true });

          if (organizacionesError) {
            console.error(
              "Error cargando organizaciones del mismo principal:",
              organizacionesError,
            );
          } else {
            organizacionesDisponibles = organizacionesData || [];
          }
        } else if (organizacionActualData) {
          organizacionesDisponibles = [organizacionActualData];
        }
      }

      setOrganizacionesOrigen(organizacionesDisponibles);

      let consultaDomicilios = supabase
        .from("domicilios")
        .select("*")
        .eq("fecha", fechaSeleccionada);

      if (!organizacionId) {
        console.error("El usuario no tiene organización asignada.");

        setDomicilios([]);
        setDomiciliarios([]);
        return;
      }

      consultaDomicilios = consultaDomicilios.eq(
        "organizacion_id",
        organizacionId,
      );

      const { data: listaDomicilios, error: errorDomicilios } =
        await consultaDomicilios.order("created_at", {
          ascending: false,
        });

      if (errorDomicilios) {
        console.error("Error cargando historial:", errorDomicilios);

        setDomicilios([]);
        setDomiciliarios([]);
        return;
      }

      const domiciliosDelDia = listaDomicilios || [];

      const idsDomiciliarios = [
        ...new Set(
          domiciliosDelDia
            .map((domicilio) => domicilio.domiciliario_id)
            .filter(Boolean),
        ),
      ];

      // Cargar todos los domiciliarios activos que pueden trabajar
      // en la organización actual. También se incluyen los vinculados
      // mediante usuarios_organizaciones.
      const { data: vinculacionesDomiciliarios, error: errorVinculaciones } =
        await supabase
          .from("usuarios_organizaciones")
          .select("usuario_id")
          .eq("organizacion_id", organizacionId)
          .eq("rol", "domiciliario")
          .eq("estado", "activo");

      if (errorVinculaciones) {
        console.error(
          "Error cargando vinculaciones de domiciliarios:",
          errorVinculaciones,
        );
      }

      const idsDomiciliariosAsignables = [
        ...new Set([
          ...idsDomiciliarios,
          ...(vinculacionesDomiciliarios || []).map((item) => item.usuario_id),
        ]),
      ];

      let listaUsuarios = [];

      if (idsDomiciliariosAsignables.length > 0) {
        const { data: usuarios, error: errorUsuarios } = await supabase
          .from("usuarios")
          .select("id, nombre, rol, estado, organizacion_id")
          .eq("rol", "domiciliario")
          .eq("estado", "activo")
          .in("id", idsDomiciliariosAsignables);

        if (errorUsuarios) {
          console.error("Error cargando domiciliarios:", errorUsuarios);
        } else {
          listaUsuarios = usuarios || [];
        }
      }

      // Domiciliarios con organizacion_id directo que todavía no aparecen
      // en usuarios_organizaciones.
      const { data: usuariosDirectos, error: errorDirectos } = await supabase
        .from("usuarios")
        .select("id, nombre, rol, estado, organizacion_id")
        .eq("organizacion_id", organizacionId)
        .eq("rol", "domiciliario")
        .eq("estado", "activo");

      if (!errorDirectos && usuariosDirectos?.length) {
        const mapaUsuarios = new Map(
          [...listaUsuarios, ...usuariosDirectos].map((item) => [
            item.id,
            item,
          ]),
        );
        listaUsuarios = Array.from(mapaUsuarios.values());
      }

      console.log("USUARIO ACTUAL:", usuarioActual);

      console.log("DOMICILIOS DEL DÍA:", domiciliosDelDia);

      console.log("IDS DE DOMICILIARIOS:", idsDomiciliarios);

      console.log("USUARIOS ENCONTRADOS:", listaUsuarios);

      setDomicilios(domiciliosDelDia);

      setDomiciliarios(listaUsuarios);
    } catch (error) {
      console.error("Error general cargando historial:", error);

      setDomicilios([]);
      setDomiciliarios([]);
    } finally {
      setCargando(false);
    }
  };

  const obtenerNombreDomiciliario = (id) => {
    const usuario = domiciliarios.find((item) => item.id === id);

    return usuario?.nombre || "Sin asignar";
  };

  const obtenerNombreOrganizacionOrigen = (id) => {
    const organizacion = organizacionesOrigen.find((item) => item.id === id);

    return organizacion?.nombre || "Sin origen";
  };

  const formatearHora = (fecha) => {
    if (!fecha) return "--:--";

    return new Date(fecha).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatoDinero = (valor) => {
    return `$${Number(valor || 0).toLocaleString("es-CO")}`;
  };

  const domiciliosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return domicilios.filter((domicilio) => {
      const coincideBusqueda =
        !texto ||
        domicilio.cliente?.toLowerCase().includes(texto) ||
        domicilio.telefono?.toLowerCase().includes(texto) ||
        domicilio.direccion?.toLowerCase().includes(texto) ||
        domicilio.numero_factura?.toLowerCase().includes(texto);

      const coincideDomiciliario =
        domiciliarioFiltro === "todos" ||
        domicilio.domiciliario_id === domiciliarioFiltro;

      const coincideEstado =
        estadoFiltro === "todos" || domicilio.estado === estadoFiltro;

      const coincideMetodo =
        metodoFiltro === "todos" || domicilio.metodo_pago === metodoFiltro;

      return (
        coincideBusqueda &&
        coincideDomiciliario &&
        coincideEstado &&
        coincideMetodo
      );
    });
  }, [domicilios, domiciliarioFiltro, estadoFiltro, metodoFiltro, busqueda]);

  const estadisticas = useMemo(() => {
    const total = domiciliosFiltrados.length;

    const pagados = domiciliosFiltrados.filter(
      (item) => item.estado === "Pagado",
    ).length;

    const pendientes = domiciliosFiltrados.filter(
      (item) => item.estado === "Pendiente",
    ).length;

    const recaudado = domiciliosFiltrados
      .filter((item) => item.estado === "Pagado")
      .reduce((total, item) => total + Number(item.costo || 0), 0);

    return {
      total,
      pagados,
      pendientes,
      recaudado,
    };
  }, [domiciliosFiltrados]);

  const marcarComoPagado = async (domicilio) => {
    if (!domicilio?.id || domicilio.estado !== "Entregado") return;

    if (!organizacionActual) {
      Swal.fire({
        icon: "error",
        title: "Organización no disponible",
        text: "No se pudo determinar la organización del administrador.",
      });
      return;
    }

    const confirmacion = await Swal.fire({
      icon: "question",
      title: "¿Marcar como pagado?",
      html: `El domicilio de <strong>${domicilio.cliente || "este cliente"}</strong> pasará a estado <strong>Pagado</strong>.`,
      showCancelButton: true,
      confirmButtonText: "Sí, marcar pagado",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      confirmButtonColor: "#2563eb",
    });

    if (!confirmacion.isConfirmed) return;

    const { data: domicilioActualizado, error: errorActualizacion } =
      await supabase
        .from("domicilios")
        .update({ estado: "Pagado" })
        .eq("id", domicilio.id)
        .eq("organizacion_id", organizacionActual)
        .eq("estado", "Entregado")
        .select()
        .single();

    if (errorActualizacion) {
      console.error("Error actualizando domicilio:", errorActualizacion);
      Swal.fire({
        icon: "error",
        title: "No se pudo actualizar",
        text: "El domicilio no pudo marcarse como pagado.",
      });
      return;
    }

    setDomicilios((prev) =>
      prev.map((item) =>
        item.id === domicilioActualizado.id ? domicilioActualizado : item,
      ),
    );

    Swal.fire({
      icon: "success",
      title: "Pago confirmado",
      text: "El domicilio ahora está marcado como Pagado.",
      timer: 1600,
      showConfirmButton: false,
    });
  };

  const buscarClientesParaDomicilio = async (valor) => {
    const busqueda = valor.trim();

    setClienteSeleccionado(null);

    if (!busqueda || !organizacionActual) {
      setClientesEncontrados([]);
      setBuscandoCliente(false);
      return;
    }

    setBuscandoCliente(true);

    try {
      const { data, error } = await supabase.rpc(
        "buscar_clientes_para_organizacion",
        {
          p_organizacion_id: organizacionActual,
          p_busqueda: busqueda,
        },
      );

      if (error) {
        console.error("Error buscando clientes:", error);
        setClientesEncontrados([]);
        return;
      }

      setClientesEncontrados(data || []);
    } catch (error) {
      console.error("Error inesperado buscando clientes:", error);
      setClientesEncontrados([]);
    } finally {
      setBuscandoCliente(false);
    }
  };

  const seleccionarClienteParaDomicilio = (cliente) => {
    setClienteSeleccionado(cliente);
    setClientesEncontrados([]);

    setFormDomicilio((prev) => ({
      ...prev,
      cliente: cliente.nombre || "",
      telefono: cliente.telefono || "",
      direccion: cliente.direccion || "",
    }));
  };

  const limpiarBuscadorCliente = () => {
    setClientesEncontrados([]);
    setClienteSeleccionado(null);
    setBuscandoCliente(false);
    setBusquedaClienteModal("");
  };

  const limpiarFormularioDomicilio = () => {
    setFormDomicilio({
      cliente: "",
      telefono: "",
      direccion: "",
      costo: "",
      propina: "",
      metodo_pago: "",
      estado: "Entregado",
      domiciliario_id: "",
      organizacion_origen_id: organizacionActual || "",
      observaciones: "",
    });

    limpiarBuscadorCliente();
  };

  const abrirNuevoDomicilio = () => {
    const hoy = (() => {
      const ahora = new Date();
      const offset = ahora.getTimezoneOffset();
      return new Date(ahora.getTime() - offset * 60000)
        .toISOString()
        .split("T")[0];
    })();

    if (fechaSeleccionada !== hoy) {
      Swal.fire({
        icon: "info",
        title: "Fecha histórica",
        text: "Los domicilios nuevos solo se pueden registrar en la jornada actual. Cambia la fecha a hoy para crear uno.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    limpiarFormularioDomicilio();
    setDomicilioEditando(null);
    setModoEdicion(false);
    setModalDomicilio(true);
  };

  const abrirEditarDomicilio = (domicilio) => {
    limpiarBuscadorCliente();
    setDomicilioEditando(domicilio);
    setModoEdicion(true);
    setFormDomicilio({
      cliente: domicilio.cliente || "",
      telefono: domicilio.telefono || "",
      direccion: domicilio.direccion || "",
      costo: domicilio.costo ?? "",
      propina: domicilio.propina ?? "",
      metodo_pago: domicilio.metodo_pago || "",
      estado: domicilio.estado || "Entregado",
      domiciliario_id: domicilio.domiciliario_id || "",
      organizacion_origen_id:
        domicilio.organizacion_origen_id || organizacionActual || "",
      observaciones: domicilio.observaciones || "",
    });
    setModalDomicilio(true);
  };

  const cerrarModalDomicilio = () => {
    if (guardandoDomicilio) return;
    setModalDomicilio(false);
    setModoEdicion(false);
    setDomicilioEditando(null);
    limpiarFormularioDomicilio();
  };

  const cambiarCampoDomicilio = (campo, valor) => {
    if (campo === "cliente" || campo === "telefono") {
      setClienteSeleccionado(null);
    }

    setFormDomicilio((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const notificarPropinaAlDomiciliario = async ({
    domiciliarioId,
    domicilioId,
    cliente,
    costo,
    propina,
  }) => {
    if (!domiciliarioId || !domicilioId || Number(propina) <= 0) return;

    const mensaje = `El cliente ${cliente} dejó una propina de $${Number(
      propina,
    ).toLocaleString("es-CO")} para tu domicilio de $${Number(
      costo,
    ).toLocaleString("es-CO")}.`;

    const { error } = await supabase.from("notificaciones").insert([
      {
        usuario_id: domiciliarioId,
        domicilio_id: domicilioId,
        titulo: "Propina recibida",
        mensaje,
        tipo: "propina",
        leida: false,
      },
    ]);

    if (error) {
      console.error("No se pudo enviar la notificación de propina:", error);
    }
  };

  const guardarDomicilioDesdeHistorial = async (e) => {
    e.preventDefault();

    const cliente = formDomicilio.cliente.trim();
    const telefono = formDomicilio.telefono.trim();
    const direccion = formDomicilio.direccion.trim();
    const costo = Number(formDomicilio.costo);
    const propina = Math.max(Number(formDomicilio.propina) || 0, 0);

    if (!cliente || !telefono || !direccion || !formDomicilio.metodo_pago) {
      Swal.fire({
        icon: "warning",
        title: "Campos incompletos",
        text: "Completa cliente, teléfono, dirección y método de pago.",
      });
      return;
    }

    if (telefono.length !== 10) {
      Swal.fire({
        icon: "warning",
        title: "Teléfono inválido",
        text: "El teléfono debe tener 10 dígitos.",
      });
      return;
    }

    if (!Number.isFinite(costo) || costo <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Valor inválido",
        text: "El costo debe ser mayor a 0.",
      });
      return;
    }

    if (!organizacionActual) {
      Swal.fire({
        icon: "error",
        title: "Organización no disponible",
        text: "No se pudo determinar la organización actual.",
      });
      return;
    }

    if (!formDomicilio.domiciliario_id) {
      Swal.fire({
        icon: "warning",
        title: "Domiciliario requerido",
        text: "Selecciona quién llevará el domicilio.",
      });
      return;
    }

    if (!formDomicilio.organizacion_origen_id) {
      Swal.fire({
        icon: "warning",
        title: "Origen requerido",
        text: "Selecciona desde qué organización salió el domicilio.",
      });
      return;
    }

    setGuardandoDomicilio(true);

    try {
      // ==========================================
      // CLIENTE
      // ==========================================
      // En "Nuevo domicilio", el cliente debe existir en la tabla
      // clientes y quedar relacionado con la organización actual.
      // Si ya existe, se selecciona desde el buscador. Si no existe, se crea.
      let clienteExistente = clienteSeleccionado;
      let clienteGuardado = cliente;
      let telefonoGuardado = telefono;
      let direccionGuardada = direccion;

      if (!modoEdicion) {
        const clienteFueSeleccionado = Boolean(clienteSeleccionado);

        // Si el usuario escribió manualmente los datos sin seleccionar
        // una sugerencia, verificamos por teléfono para evitar duplicados.
        if (!clienteExistente) {
          const { data: clientesPorTelefono, error: errorBusquedaCliente } =
            await supabase.rpc("buscar_clientes_para_organizacion", {
              p_organizacion_id: organizacionActual,
              p_busqueda: telefono,
            });

          if (errorBusquedaCliente) {
            throw errorBusquedaCliente;
          }

          clienteExistente =
            (clientesPorTelefono || []).find(
              (item) => String(item.telefono || "") === telefono,
            ) || null;
        }

        // Si el teléfono ya pertenece a un cliente disponible en esta
        // organización (incluyendo clientes compartidos), podemos reutilizarlo.
        // Solo bloqueamos cuando se intenta registrar OTRO nombre con ese teléfono.
        if (clienteExistente && !clienteFueSeleccionado) {
          const nombreExistente = String(clienteExistente.nombre || "").trim();
          const nombreIngresado = String(cliente || "").trim();
          const nombreEsElMismo =
            nombreExistente.toLowerCase() === nombreIngresado.toLowerCase();

          if (!nombreEsElMismo) {
            await Swal.fire({
              icon: "warning",
              title: "Teléfono ya registrado",
              html: `El teléfono <b>${telefono}</b> ya está registrado para <b>${nombreExistente || "registrado"}</b>.<br><br>Si quieres usar este cliente, selecciónalo desde el buscador. Para crear otro cliente debes usar un teléfono diferente.`,
              confirmButtonText: "Entendido",
            });
            setGuardandoDomicilio(false);
            return;
          }

          console.log(
            "✅ CLIENTE COMPARTIDO/EXISTENTE REUTILIZADO:",
            clienteExistente,
          );
        }

        if (!clienteExistente) {
          const { data: nuevoCliente, error: errorCliente } =
            await supabase.rpc("crear_cliente_para_organizacion", {
              p_nombre: cliente,
              p_telefono: telefono,
              p_direccion: direccion,
              p_organizacion_id: organizacionActual,
            });

          if (errorCliente) {
            throw errorCliente;
          }

          if (!nuevoCliente?.id) {
            throw new Error(
              "El cliente se registró, pero no se pudo obtener su información.",
            );
          }

          clienteExistente = nuevoCliente;
        }

        // Si el usuario seleccionó un cliente existente desde el buscador,
        // o acabamos de crear uno nuevo, usamos sus datos reales.
        clienteGuardado = clienteExistente?.nombre || cliente;
        telefonoGuardado = clienteExistente?.telefono || telefono;
        direccionGuardada = clienteExistente?.direccion || direccion;
      }

      if (modoEdicion && domicilioEditando) {
        const propinaAnterior = Number(domicilioEditando.propina || 0);

        const { data: domicilioActualizado, error } = await supabase
          .from("domicilios")
          .update({
            cliente,
            telefono,
            direccion,
            costo,
            propina,
            metodo_pago: formDomicilio.metodo_pago,
            estado: formDomicilio.estado,
            domiciliario_id: formDomicilio.domiciliario_id || null,
            organizacion_origen_id: formDomicilio.organizacion_origen_id,
            observaciones: formDomicilio.observaciones.trim() || null,
          })
          .eq("id", domicilioEditando.id)
          .eq("organizacion_id", organizacionActual)
          .select()
          .single();

        if (error) throw error;

        setDomicilios((prev) =>
          prev.map((item) =>
            item.id === domicilioActualizado.id ? domicilioActualizado : item,
          ),
        );

        if (propina > propinaAnterior) {
          await notificarPropinaAlDomiciliario({
            domiciliarioId: formDomicilio.domiciliario_id,
            domicilioId: domicilioActualizado.id,
            cliente,
            costo,
            propina: propina - propinaAnterior,
          });
        }

        await Swal.fire({
          icon: "success",
          title: "Domicilio actualizado",
          text: "Los cambios fueron guardados correctamente.",
          timer: 1600,
          showConfirmButton: false,
        });
      } else {
        const numeroFactura = `FAC-${Date.now()}`;

        const { data: domicilioCreado, error } = await supabase
          .from("domicilios")
          .insert([
            {
              numero_factura: numeroFactura,
              cliente: clienteGuardado,
              telefono: telefonoGuardado,
              direccion: direccionGuardada,
              costo,
              propina,
              metodo_pago: formDomicilio.metodo_pago,
              estado: formDomicilio.estado,
              domiciliario_id: formDomicilio.domiciliario_id,
              organizacion_origen_id: formDomicilio.organizacion_origen_id,
              observaciones: formDomicilio.observaciones.trim() || null,
              fecha: fechaSeleccionada,
              organizacion_id: organizacionActual,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        setDomicilios((prev) => [domicilioCreado, ...prev]);

        if (propina > 0) {
          await notificarPropinaAlDomiciliario({
            domiciliarioId: formDomicilio.domiciliario_id,
            domicilioId: domicilioCreado.id,
            cliente: clienteExistente?.nombre || cliente,
            costo,
            propina,
          });
        }

        await Swal.fire({
          icon: "success",
          title: "Domicilio creado",
          text: "El domicilio fue registrado correctamente.",
          timer: 1600,
          showConfirmButton: false,
        });
      }

      cerrarModalDomicilio();
    } catch (error) {
      console.error("Error guardando domicilio desde historial:", error);

      Swal.fire({
        icon: "error",
        title: "No se pudo guardar",
        text:
          error?.message ||
          "Ocurrió un error al guardar el domicilio. Verifica los datos e inténtalo nuevamente.",
      });
    } finally {
      setGuardandoDomicilio(false);
    }
  };

  return (
    <div className={styles.historialDia}>
      {/* HEADER */}

      <div className={styles.historialDiaHeader}>
        <div>
          <h1>Historial del día</h1>
          <p>Consulta los movimientos registrados durante la jornada.</p>
        </div>

        <div className={styles.historialDiaFecha}>
          <ClockIcon />
          {new Date(`${fechaSeleccionada}T12:00:00`).toLocaleDateString(
            "es-CO",
            {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            },
          )}
        </div>
      </div>

      {/* SELECTOR DE FECHA */}

      <section className={styles.historialDiaFechaPanel}>
        <div>
          <span>Fecha del historial</span>
          <p>Consulta los domicilios registrados en cualquier fecha.</p>
        </div>

        <div className={styles.historialDiaFechaControl}>
          <ClockIcon />
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            max={(() => {
              const hoy = new Date();
              const offset = hoy.getTimezoneOffset();
              return new Date(hoy.getTime() - offset * 60000)
                .toISOString()
                .split("T")[0];
            })()}
          />
        </div>
      </section>

      {/* FILTROS */}

      <section className={styles.historialDiaPanel}>
        <div className={styles.historialDiaFiltrosHeader}>
          <div>
            <h2>Movimientos</h2>
            <p>Filtra los domicilios de la fecha seleccionada.</p>
          </div>

          <div className={styles.historialDiaPanelAcciones}>
            <button
              type="button"
              className={styles.historialDiaNuevoButton}
              onClick={abrirNuevoDomicilio}
            >
              <PlusIcon />
              Nuevo domicilio
            </button>
            <FunnelIcon />
          </div>
        </div>

        <div className={styles.historialDiaFiltros}>
          <div className={styles.historialDiaBusqueda}>
            <MagnifyingGlassIcon />

            <input
              type="text"
              placeholder="Buscar cliente, teléfono, dirección..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <select
            value={domiciliarioFiltro}
            onChange={(e) => setDomiciliarioFiltro(e.target.value)}
          >
            <option value="todos">Todos los domiciliarios</option>

            {domiciliarios.map((domiciliario) => (
              <option key={domiciliario.id} value={domiciliario.id}>
                {domiciliario.nombre}
              </option>
            ))}
          </select>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
          >
            <option value="todos">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Entregado">Entregado</option>
            <option value="Pagado">Pagado</option>
            <option value="Reportado">Reportado</option>
            <option value="Cancelado">Cancelado</option>
          </select>

          <select
            value={metodoFiltro}
            onChange={(e) => setMetodoFiltro(e.target.value)}
          >
            <option value="todos">Todos los métodos</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Datáfono">Datáfono</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
      </section>

      {/* TABLA */}

      <section className={styles.historialDiaTablaPanel}>
        <div className={styles.historialDiaTablaWrapper}>
          <table className={styles.historialDiaTabla}>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Domiciliario</th>
                <th>Origen</th>
                <th>Dirección</th>
                <th>Costo</th>
                <th>Método</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan="9" className={styles.historialDiaTablaVacia}>
                    Cargando historial...
                  </td>
                </tr>
              ) : domiciliosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="9" className={styles.historialDiaTablaVacia}>
                    No hay movimientos que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                domiciliosFiltrados.map((domicilio) => (
                  <tr key={domicilio.id}>
                    <td>
                      <span className={styles.historialDiaHora}>
                        {formatearHora(domicilio.created_at)}
                      </span>
                    </td>

                    <td>
                      <strong>{domicilio.cliente || "Sin cliente"}</strong>

                      {domicilio.telefono && (
                        <small>{domicilio.telefono}</small>
                      )}
                    </td>

                    <td>
                      {obtenerNombreDomiciliario(domicilio.domiciliario_id)}
                    </td>

                    <td>
                      <span className={styles.historialDiaOrigen}>
                        {obtenerNombreOrganizacionOrigen(
                          domicilio.organizacion_origen_id,
                        )}
                      </span>
                    </td>

                    <td className={styles.historialDiaDireccion}>
                      {domicilio.direccion || "Sin dirección"}
                    </td>

                    <td>
                      <strong>{formatoDinero(domicilio.costo)}</strong>
                    </td>

                    <td>
                      <span
                        className={`${styles.historialDiaMetodo} ${
                          domicilio.metodo_pago === "Efectivo"
                            ? styles.historialDiaMetodoEfectivo
                            : domicilio.metodo_pago === "Transferencia"
                              ? styles.historialDiaMetodoTransferencia
                              : domicilio.metodo_pago === "Datáfono"
                                ? styles.historialDiaMetodoDatafono
                                : styles.historialDiaMetodoOtro
                        }`}
                      >
                        {domicilio.metodo_pago || "Sin método"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`${styles.historialDiaEstado} ${
                          domicilio.estado === "Pagado"
                            ? styles.historialDiaEstadoPagado
                            : domicilio.estado === "Entregado"
                              ? styles.historialDiaEstadoEntregado
                              : domicilio.estado === "Reportado"
                                ? styles.historialDiaEstadoReportado
                                : domicilio.estado === "Cancelado"
                                  ? styles.historialDiaEstadoCancelado
                                  : styles.historialDiaEstadoPendiente
                        }`}
                      >
                        <span></span>
                        {domicilio.estado || "Sin estado"}
                      </span>
                    </td>

                    <td>
                      <div className={styles.historialDiaAcciones}>
                        {domicilio.estado === "Entregado" && (
                          <button
                            type="button"
                            className={styles.historialDiaAccion}
                            onClick={() => marcarComoPagado(domicilio)}
                          >
                            Marcar pagado
                          </button>
                        )}

                        <button
                          type="button"
                          className={styles.historialDiaEditarButton}
                          onClick={() => abrirEditarDomicilio(domicilio)}
                          title="Editar domicilio"
                        >
                          <PencilSquareIcon />
                        </button>

                        {domicilio.estado !== "Entregado" && (
                          <span className={styles.historialDiaAccionVacia}>
                            —
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalDomicilio && (
        <div
          className={styles.historialDiaModalOverlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cerrarModalDomicilio();
          }}
        >
          <div className={styles.historialDiaModal}>
            <div className={styles.historialDiaModalHeader}>
              <div>
                <h2>{modoEdicion ? "Editar domicilio" : "Nuevo domicilio"}</h2>
                <p>
                  {modoEdicion
                    ? "Actualiza la información del domicilio."
                    : "Registra un domicilio directamente desde el historial."}
                </p>
              </div>

              <button
                type="button"
                className={styles.historialDiaModalCerrar}
                onClick={cerrarModalDomicilio}
                disabled={guardandoDomicilio}
              >
                <XMarkIcon />
              </button>
            </div>

            {!modoEdicion && (
              <div className={styles.historialDiaClienteBuscador}>
                <div className={styles.historialDiaClienteInputWrap}>
                  <MagnifyingGlassIcon />
                  <input
                    type="text"
                    value={busquedaClienteModal}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setBusquedaClienteModal(valor);
                      buscarClientesParaDomicilio(valor);
                    }}
                    placeholder="Buscar cliente por nombre o teléfono"
                    autoFocus
                    autoComplete="off"
                  />
                </div>

                {(buscandoCliente ||
                  clientesEncontrados.length > 0 ||
                  (busquedaClienteModal.trim().length > 0 &&
                    !buscandoCliente &&
                    !clienteSeleccionado)) && (
                  <div className={styles.historialDiaClienteResultados}>
                    {buscandoCliente ? (
                      <div className={styles.historialDiaClienteResultadoVacio}>
                        Buscando clientes...
                      </div>
                    ) : clientesEncontrados.length > 0 ? (
                      clientesEncontrados.map((cliente) => (
                        <button
                          key={cliente.id}
                          type="button"
                          className={styles.historialDiaClienteResultado}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() =>
                            seleccionarClienteParaDomicilio(cliente)
                          }
                        >
                          <strong>{cliente.nombre}</strong>
                          <span>{cliente.telefono || "Sin teléfono"}</span>
                          <small>{cliente.direccion || "Sin dirección"}</small>
                        </button>
                      ))
                    ) : (
                      <div className={styles.historialDiaClienteResultadoVacio}>
                        No se encontraron clientes. Puedes continuar y registrar
                        uno nuevo.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <form
              className={styles.historialDiaForm}
              onSubmit={guardarDomicilioDesdeHistorial}
            >
              <div className={styles.historialDiaFormGrid}>
                <label>
                  <span>Cliente *</span>
                  <input
                    type="text"
                    value={formDomicilio.cliente}
                    onChange={(e) =>
                      cambiarCampoDomicilio("cliente", e.target.value)
                    }
                    placeholder="Nombre del cliente"
                    autoComplete="off"
                  />
                </label>

                <label>
                  <span>Teléfono *</span>
                  <input
                    type="tel"
                    value={formDomicilio.telefono}
                    onChange={(e) =>
                      cambiarCampoDomicilio(
                        "telefono",
                        e.target.value.replace(/\D/g, "").slice(0, 10),
                      )
                    }
                    placeholder="3001234567"
                    inputMode="numeric"
                  />
                </label>

                <label className={styles.historialDiaFormFull}>
                  <span>Dirección *</span>
                  <input
                    type="text"
                    value={formDomicilio.direccion}
                    onChange={(e) =>
                      cambiarCampoDomicilio("direccion", e.target.value)
                    }
                    placeholder="Dirección del domicilio"
                  />
                </label>

                <label>
                  <span>Valor *</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formDomicilio.costo}
                    onChange={(e) =>
                      cambiarCampoDomicilio("costo", e.target.value)
                    }
                    placeholder="0"
                  />
                </label>

                <label>
                  <span>Propina</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formDomicilio.propina}
                    onChange={(e) =>
                      cambiarCampoDomicilio("propina", e.target.value)
                    }
                    placeholder="0"
                  />
                </label>

                <label>
                  <span>Método de pago *</span>
                  <select
                    value={formDomicilio.metodo_pago}
                    onChange={(e) =>
                      cambiarCampoDomicilio("metodo_pago", e.target.value)
                    }
                  >
                    <option value="">Selecciona un método</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Datáfono">Datáfono</option>
                    <option value="Otro">Otro</option>
                  </select>
                </label>

                <label>
                  <span>Estado *</span>
                  <select
                    value={formDomicilio.estado}
                    onChange={(e) =>
                      cambiarCampoDomicilio("estado", e.target.value)
                    }
                  >
                    <option value="En camino">En camino</option>
                    <option value="Entregado">Entregado</option>
                    <option value="Pagado">Pagado</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Reportado">Reportado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </label>

                <label className={styles.historialDiaFormFull}>
                  <span>Domiciliario *</span>
                  <select
                    value={formDomicilio.domiciliario_id}
                    onChange={(e) =>
                      cambiarCampoDomicilio("domiciliario_id", e.target.value)
                    }
                  >
                    <option value="">
                      Selecciona quién llevará el domicilio
                    </option>
                    {domiciliarios.map((domiciliario) => (
                      <option key={domiciliario.id} value={domiciliario.id}>
                        {domiciliario.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.historialDiaFormFull}>
                  <span>Salió desde *</span>
                  <select
                    value={formDomicilio.organizacion_origen_id}
                    onChange={(e) =>
                      cambiarCampoDomicilio(
                        "organizacion_origen_id",
                        e.target.value,
                      )
                    }
                  >
                    <option value="">Selecciona de dónde salió</option>
                    {organizacionesOrigen.map((organizacion) => (
                      <option key={organizacion.id} value={organizacion.id}>
                        {organizacion.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.historialDiaFormFull}>
                  <span>Observaciones</span>
                  <textarea
                    value={formDomicilio.observaciones}
                    onChange={(e) =>
                      cambiarCampoDomicilio("observaciones", e.target.value)
                    }
                    placeholder="Observaciones opcionales"
                    rows="3"
                  />
                </label>
              </div>

              <div className={styles.historialDiaModalFooter}>
                <button
                  type="button"
                  className={styles.historialDiaCancelarButton}
                  onClick={cerrarModalDomicilio}
                  disabled={guardandoDomicilio}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className={styles.historialDiaGuardarButton}
                  disabled={guardandoDomicilio}
                >
                  {guardandoDomicilio
                    ? "Guardando..."
                    : modoEdicion
                      ? "Guardar cambios"
                      : "Crear domicilio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
