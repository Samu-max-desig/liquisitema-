import styles from "./DomiciliarioDashboard.module.css";
import { useState, useEffect, useRef } from "react";
import { registrarActividad } from "../../services/actividadService";
import {
  reproducirNotificacion,
  habilitarAudioNotificaciones,
} from "../../services/notificacionesService";
import {
  HomeIcon,
  UserIcon,
  Cog6ToothIcon,
  ClipboardDocumentCheckIcon,
  ArrowLeftOnRectangleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  TrashIcon,
  SignalIcon,
  BellIcon,
  CameraIcon,
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "../../config/supabase";
import Perfil from "./Perfil/Perfil";
import Configuracion from "./Configuracion/Configuracion";
import { generarNotificacionActividad } from "../../services/notificacionesSistemaService";
import CountUp from "react-countup";
import Swal from "sweetalert2";
console.log("CountUp:", CountUp);
export default function DomiciliarioDashboard() {
  const [modalClaveEdicion, setModalClaveEdicion] = useState(false);

  const [claveEdicion, setClaveEdicion] = useState("");

  const [validandoClave, setValidandoClave] = useState(false);
  const [guardandoDomicilio, setGuardandoDomicilio] = useState(false);
  const [modalEditarDomicilio, setModalEditarDomicilio] = useState(false);
  const [organizaciones, setOrganizaciones] = useState([]);
  const [organizacionSeleccionada, setOrganizacionSeleccionada] = useState("");
  const [editandoDomicilio, setEditandoDomicilio] = useState(false);
  const [inicioDeslizamiento, setInicioDeslizamiento] = useState(null);
  const [desplazamientoNotificacion, setDesplazamientoNotificacion] =
    useState(0);
  const [notificacionDeslizando, setNotificacionDeslizando] = useState(null);
  const [mostrarComprobante, setMostrarComprobante] = useState(false);
  const [modalCerrarDia, setModalCerrarDia] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [notificaciones, setNotificaciones] = useState([]);
  const [notificacionNueva, setNotificacionNueva] = useState(null);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const notificacionesNoLeidas = notificaciones.filter(
    (notificacion) => !notificacion.leida,
  ).length;
  const [datosEdicion, setDatosEdicion] = useState({
    cliente: "",
    telefono: "",
    direccion: "",
    costo: "",
    metodo_pago: "",
    estado: "",
  });
  const [claveSolucion, setClaveSolucion] = useState("");
  const [estadoSolucion, setEstadoSolucion] = useState("Pagado");
  const [modalSolucionReportado, setModalSolucionReportado] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [domicilios, setDomicilios] = useState([]);
  const [modalReporte, setModalReporte] = useState(false);
  const [telefonoBusqueda, setTelefonoBusqueda] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState([]);
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  const [clienteNoEncontrado, setClienteNoEncontrado] = useState(false);
  const [fotoComprobante, setFotoComprobante] = useState(null);
  const [domicilioSeleccionado, setDomicilioSeleccionado] = useState(null);
  const [vistaActual, setVistaActual] = useState("inicio");
  const usuario = JSON.parse(sessionStorage.getItem("usuario"));

  const registrarActividadYNotificar = async ({
    usuarioId,
    tipo,
    accion,
    descripcion,
    referenciaId = null,
    organizacionId = null,
  }) => {
    const resultado = await registrarActividad({
      usuarioId,
      tipo,
      accion,
      descripcion,
      referenciaId,
      organizacionId,
    });

    if (!resultado?.data?.id) {
      return resultado;
    }

    try {
      await generarNotificacionActividad({
        actividadId: resultado.data.id,
        usuarioId,
        organizacionId,
        descripcion,
      });
    } catch (error) {
      console.error(
        "La actividad se registró, pero no se pudo generar la notificación:",
        error,
      );
    }

    return resultado;
  };
  const [mostrarImagen, setMostrarImagen] = useState(false);
  const [modoOscuro, setModoOscuro] = useState(
    localStorage.getItem("modoOscuro") === "true",
  );
  const [cambioRecaudo, setCambioRecaudo] = useState(null);
  const recaudoAnteriorRef = useRef(null);
  useEffect(() => {
    const activarAudio = () => {
      habilitarAudioNotificaciones();

      document.removeEventListener("click", activarAudio);
      document.removeEventListener("touchstart", activarAudio);
    };

    document.addEventListener("click", activarAudio);
    document.addEventListener("touchstart", activarAudio);

    return () => {
      document.removeEventListener("click", activarAudio);
      document.removeEventListener("touchstart", activarAudio);
    };
  }, []);
  useEffect(() => {
    if (!usuario?.id) return;

    const cargarNotificaciones = async () => {
      const { data, error } = await supabase
        .from("notificaciones")
        .select("*")
        .eq("usuario_id", usuario.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando notificaciones:", error);
        return;
      }

      setNotificaciones(data || []);
    };

    cargarNotificaciones();

    const canal = supabase
      .channel(`notificaciones-${usuario.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificaciones",
          filter: `usuario_id=eq.${usuario.id}`,
        },
        (payload) => {
          reproducirNotificacion(usuario.id);

          setNotificaciones((anteriores) => [payload.new, ...anteriores]);

          setNotificacionNueva(payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [usuario?.id]);
  const marcarNotificacionLeida = async (id) => {
    console.log("🟡 Marcando notificación como leída:", id);

    const { error } = await supabase
      .from("notificaciones")
      .update({
        leida: true,
      })
      .eq("id", id);

    if (error) {
      console.error("❌ Error marcando notificación como leída:", error);
      return;
    }

    console.log("✅ Notificación marcada como leída");

    setNotificaciones((anteriores) =>
      anteriores.map((notificacion) =>
        notificacion.id === id
          ? { ...notificacion, leida: true }
          : notificacion,
      ),
    );
  };
  const eliminarNotificacion = async (id) => {
    const { error } = await supabase
      .from("notificaciones")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error eliminando notificación:", error);
      return;
    }

    setNotificaciones((anteriores) =>
      anteriores.filter((notificacion) => notificacion.id !== id),
    );

    setNotificacionDeslizando(null);
  };
  const iniciarDeslizamiento = (e, id) => {
    if (e.touches.length !== 1) return;

    setNotificacionDeslizando(id);
    setInicioDeslizamiento(e.touches[0].clientX);
    setDesplazamientoNotificacion(0);
  };

  const moverNotificacion = (e) => {
    if (inicioDeslizamiento === null) return;

    const posicionActual = e.touches[0].clientX;
    const diferencia = posicionActual - inicioDeslizamiento;

    if (diferencia < 0) {
      setDesplazamientoNotificacion(Math.max(diferencia, -80));
    }
  };

  const terminarDeslizamiento = () => {
    if (inicioDeslizamiento === null) return;

    if (desplazamientoNotificacion <= -40) {
      setDesplazamientoNotificacion(-80);
    } else {
      setDesplazamientoNotificacion(0);
      setNotificacionDeslizando(null);
    }

    setInicioDeslizamiento(null);
  };
  useEffect(() => {
    document.body.classList.toggle("modo-oscuro", modoOscuro);
    localStorage.setItem("modoOscuro", modoOscuro);

    return () => {
      document.body.classList.remove("modo-oscuro");
    };
  }, [modoOscuro]);

  const [reporteData, setReporteData] = useState({
    motivo: "",
    observaciones: "",
  });
  const [formData, setFormData] = useState({
    cliente: "",
    direccion: "",
    telefono: "",
    valor: "",
    propina: "",
    metodo_pago: "",
    observaciones: "",
  });
  useEffect(() => {
    if (!usuario?.id) return;

    const canal = supabase
      .channel(`domicilios-${usuario.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "domicilios",
          filter: `domiciliario_id=eq.${usuario.id}`,
        },
        async (payload) => {
          const nuevoEstado = payload.new?.estado;
          const estadoAnterior = payload.old?.estado;

          if (nuevoEstado && nuevoEstado !== estadoAnterior) {
            await reproducirNotificacion(usuario.id);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [usuario?.id]);

  const guardarDomicilio = async (e) => {
    e.preventDefault();

    if (guardandoDomicilio) return;

    setSubmitted(true);

    // ==========================================
    // VALIDACIONES
    // ==========================================

    if (
      !formData.cliente.trim() ||
      !formData.direccion.trim() ||
      !formData.telefono.trim() ||
      !formData.valor ||
      !formData.metodo_pago ||
      !organizacionSeleccionada
    ) {
      setError(
        "Debes completar todos los campos obligatorios, incluida la organización.",
      );
      return;
    }

    if (Number(formData.valor) <= 0) {
      setError("El valor debe ser mayor a 0.");
      return;
    }

    if (formData.telefono.length !== 10) {
      setError("El teléfono debe tener 10 dígitos.");
      return;
    }

    if (Number(formData.valor) < 1000) {
      setError("El valor parece inválido.");
      return;
    }

    setError("");
    setGuardandoDomicilio(true);

    try {
      // ==========================================
      // NÚMERO DE FACTURA
      // ==========================================

      const numeroFactura = `FAC-${Date.now()}`;

      // ==========================================
      // DATOS DEL CLIENTE
      // ==========================================

      const telefonoCliente = formData.telefono.trim();
      console.log("========== BUSQUEDA CLIENTE ==========");
      console.log("USUARIO:", usuario?.id);
      console.log("NOMBRE USUARIO:", usuario?.nombre);
      console.log("ORGANIZACION SELECCIONADA:", organizacionSeleccionada);
      console.log("TELEFONO CLIENTE:", telefonoCliente);
      console.log("======================================");
      // ==========================================
      // BUSCAR CLIENTE EN LA ORGANIZACIÓN
      // ==========================================
      // IMPORTANTE:
      // Se busca directamente en clientes usando:
      // teléfono + organización.
      //
      // Así, si Nicolas trabaja con:
      // f316242b-8a80-494f-bc0e-a7cac4738224
      //
      // encontrará el cliente ID 29 y no lo
      // considerará como un cliente nuevo.

      const { data: clientesExistentes, error: buscarClienteError } =
        await supabase.rpc("buscar_clientes_para_organizacion", {
          p_organizacion_id: organizacionSeleccionada,
          p_busqueda: telefonoCliente,
        });

      const clienteExistente = (clientesExistentes || []).find(
        (cliente) => cliente.telefono === telefonoCliente,
      );

      if (buscarClienteError) {
        console.error(
          "Error buscando cliente en la organización:",
          buscarClienteError,
        );

        setError("No se pudo verificar el cliente.");
        return;
      }

      // ==========================================
      // OBTENER ID DEL CLIENTE
      // ==========================================

      let clienteId = clienteExistente?.id;

      // ==========================================
      // CREAR CLIENTE SOLO SI NO EXISTE
      // ==========================================

      if (!clienteExistente) {
        console.log("⚠️ CLIENTE NO ENCONTRADO.");
        console.log("Organización buscada:", organizacionSeleccionada);
        console.log("Teléfono buscado:", telefonoCliente);

        const { data: nuevoCliente, error: clienteError } = await supabase.rpc(
          "crear_cliente_para_organizacion",
          {
            p_nombre: formData.cliente.trim(),
            p_telefono: telefonoCliente,
            p_direccion: formData.direccion.trim(),
            p_organizacion_id: organizacionSeleccionada,
          },
        );

        if (clienteError) {
          console.error("========== ERROR CREANDO CLIENTE ==========");
          console.error("ERROR:", clienteError);
          console.error("CODE:", clienteError.code);
          console.error("MESSAGE:", clienteError.message);
          console.error("DETAILS:", clienteError.details);
          console.error("HINT:", clienteError.hint);
          console.error("==========================================");

          setError(clienteError.message || "No se pudo registrar el cliente.");

          return;
        }

        if (!nuevoCliente || !nuevoCliente.id) {
          console.error(
            "El RPC no devolvió correctamente el cliente:",
            nuevoCliente,
          );

          setError(
            "El cliente fue creado, pero no se pudo obtener su información.",
          );

          return;
        }

        clienteId = nuevoCliente.id;

        console.log("✅ CLIENTE REALMENTE NUEVO:", nuevoCliente);

        // ==========================================
        // NOTIFICAR SOLO SI SE CREÓ UN CLIENTE NUEVO
        // ==========================================

        await registrarActividadYNotificar({
          usuarioId: usuario.id,
          tipo: "cliente",
          accion: "crear",
          descripcion: `Agregó al nuevo cliente ${formData.cliente}.`,
          referenciaId: clienteId,
          organizacionId: organizacionSeleccionada,
        });
      } else {
        console.log("✅ CLIENTE YA EXISTÍA:", clienteExistente);
      }

      // ==========================================
      // DEBUG DEL DOMICILIO
      // ==========================================

      console.log("========== DEBUG DOMICILIO ==========");
      console.log("AUTH USER:", usuario?.id);
      console.log("ORGANIZACIÓN SELECCIONADA:", organizacionSeleccionada);
      console.log("CLIENTE ID:", clienteId);
      console.log("====================================");

      // ==========================================
      // GUARDAR DOMICILIO
      // ==========================================

      const { data: domicilioCreado, error: domicilioError } = await supabase
        .from("domicilios")
        .insert([
          {
            numero_factura: numeroFactura,
            cliente: formData.cliente.trim(),
            telefono: telefonoCliente,
            direccion: formData.direccion.trim(),
            costo: Number(formData.valor),
            metodo_pago: formData.metodo_pago,
            observaciones: formData.observaciones,

            // "Otro" = Pendiente
            // Los demás métodos = Pagado
            estado: formData.metodo_pago === "Otro" ? "Pendiente" : "Pagado",

            domiciliario_id: usuario.id,

            // El domicilio pertenece únicamente
            // a la organización seleccionada.
            organizacion_id: organizacionSeleccionada,
          },
        ])
        .select()
        .single();

      if (domicilioError) {
        console.error("Error guardando domicilio:", domicilioError);

        setError("Error al guardar el domicilio.");
        return;
      }

      console.log("🏢 ORGANIZACIÓN DEL DOMICILIO:", organizacionSeleccionada);

      console.log("👤 CLIENTE DEL DOMICILIO:", clienteId);

      // ==========================================
      // REGISTRAR ACTIVIDAD DEL DOMICILIO
      // ==========================================

      await registrarActividadYNotificar({
        usuarioId: usuario.id,
        tipo: "domicilio",
        accion: "crear",
        descripcion: `Registró el domicilio de ${formData.cliente}.`,
        referenciaId: domicilioCreado.id,
        organizacionId: organizacionSeleccionada,
      });

      // ==========================================
      // CREAR / ACUMULAR PENDIENTE
      // ==========================================

      if (formData.metodo_pago === "Otro") {
        const { error: pendienteError } = await supabase.rpc(
          "crear_o_acumular_pendiente",
          {
            p_cliente: formData.cliente.trim(),
            p_telefono: telefonoCliente,
            p_direccion: formData.direccion.trim(),
            p_monto: Number(formData.valor),
            p_domicilio_id: domicilioCreado.id,
          },
        );

        if (pendienteError) {
          console.error("========== ERROR PENDIENTE ==========");
          console.error("ERROR COMPLETO:", pendienteError);
          console.error("CODE:", pendienteError.code);
          console.error("MESSAGE:", pendienteError.message);
          console.error("DETAILS:", pendienteError.details);
          console.error("HINT:", pendienteError.hint);
          console.error("====================================");

          await Swal.fire({
            icon: "warning",
            title: "Domicilio guardado",
            text: "El domicilio se guardó, pero no se pudo registrar la deuda.",
            confirmButtonColor: "#2563eb",
          });

          return;
        }
      }

      // ==========================================
      // ÉXITO
      // ==========================================

      await Swal.fire({
        icon: "success",
        title: "Domicilio guardado",
        text: "El domicilio fue registrado correctamente.",
        confirmButtonColor: "#2563eb",
      });

      // ==========================================
      // LIMPIAR ORGANIZACIÓN
      // ==========================================

      setOrganizacionSeleccionada("");

      // ==========================================
      // LIMPIAR FORMULARIO
      // ==========================================

      setFormData({
        cliente: "",
        direccion: "",
        telefono: "",
        valor: "",
        propina: "",
        metodo_pago: "",
        observaciones: "",
      });

      // ==========================================
      // LIMPIAR BUSCADOR
      // ==========================================

      setTelefonoBusqueda("");
      setClientesEncontrados([]);
      setClienteEncontrado(null);
      setClienteNoEncontrado(false);

      setSubmitted(false);
      setError("");
    } catch (error) {
      console.error("Error inesperado guardando domicilio:", error);

      setError("Ocurrió un error inesperado al guardar el domicilio.");
    } finally {
      // ==========================================
      // DESBLOQUEAR BOTÓN SIEMPRE
      // ==========================================

      setGuardandoDomicilio(false);
    }
  };
  const cargarDomicilios = async (organizacionId) => {
    if (!usuario?.id || !organizacionId) {
      return;
    }

    const inicioDelDia = new Date();
    inicioDelDia.setHours(0, 0, 0, 0);

    const inicioDelDiaSiguiente = new Date(inicioDelDia);
    inicioDelDiaSiguiente.setDate(inicioDelDiaSiguiente.getDate() + 1);

    const { data, error } = await supabase
      .from("domicilios")
      .select("*")
      .eq("domiciliario_id", usuario.id)
      .eq("organizacion_id", organizacionId)
      .gte("created_at", inicioDelDia.toISOString())
      .lt("created_at", inicioDelDiaSiguiente.toISOString())
      .is("cierre_id", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando domicilios:", error);
      return;
    }

    const { data: reportesExistentes, error: reportesError } = await supabase
      .from("reportes")
      .select("domicilio_id");

    if (reportesError) {
      console.error("Error cargando reportes:", reportesError);
      setDomicilios(data || []);
      return;
    }

    const idsReportados = new Set(
      (reportesExistentes || []).map((reporte) => reporte.domicilio_id),
    );

    const domiciliosConReporte = (data || []).map((domicilio) => ({
      ...domicilio,
      reporteSolucionado: idsReportados.has(domicilio.id),
    }));

    setDomicilios(domiciliosConReporte);
  };
  const cargarOrganizaciones = async () => {
    if (!usuario?.id) return;

    try {
      console.log("========== CARGANDO ORGANIZACIONES ==========");
      console.log("USUARIO:", usuario.id);

      // ==========================================
      // 1. OBTENER DATOS DEL USUARIO
      // ==========================================

      const { data: usuarioActual, error: usuarioError } = await supabase
        .from("usuarios")
        .select("id, nombre, rol, organizacion_id")
        .eq("id", usuario.id)
        .single();

      if (usuarioError) {
        console.error("Error obteniendo usuario:", usuarioError);

        setOrganizaciones([]);
        setOrganizacionSeleccionada("");
        return;
      }

      console.log("USUARIO ACTUAL:", usuarioActual);

      // ==========================================
      // 2. RESOLVER ORGANIZACIÓN BASE
      // ==========================================

      let organizacionBaseId = usuarioActual?.organizacion_id;

      // Si no tiene organización directa,
      // buscar mediante usuarios_organizaciones.
      if (!organizacionBaseId) {
        const { data: relacionUsuario, error: relacionError } = await supabase
          .from("usuarios_organizaciones")
          .select("organizacion_id")
          .eq("usuario_id", usuario.id)
          .eq("estado", "activo")
          .order("id", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (relacionError) {
          console.error(
            "Error obteniendo relación del usuario:",
            relacionError,
          );

          setOrganizaciones([]);
          setOrganizacionSeleccionada("");
          return;
        }

        organizacionBaseId = relacionUsuario?.organizacion_id;
      }

      console.log("ORGANIZACIÓN BASE:", organizacionBaseId);

      if (!organizacionBaseId) {
        console.error("No se pudo determinar la organización del usuario.");

        setOrganizaciones([]);
        setOrganizacionSeleccionada("");
        return;
      }

      // ==========================================
      // 3. OBTENER ORGANIZACIÓN BASE
      // ==========================================

      const { data: organizacionBase, error: organizacionBaseError } =
        await supabase
          .from("organizaciones")
          .select("id, nombre, estado, organizacion_principal_id")
          .eq("id", organizacionBaseId)
          .maybeSingle();

      if (organizacionBaseError) {
        console.error(
          "Error obteniendo organización base:",
          organizacionBaseError,
        );

        setOrganizaciones([]);
        setOrganizacionSeleccionada("");
        return;
      }

      if (!organizacionBase) {
        console.error("No se encontró la organización base.");

        setOrganizaciones([]);
        setOrganizacionSeleccionada("");
        return;
      }

      console.log("ORGANIZACIÓN BASE ENCONTRADA:", organizacionBase);

      // ==========================================
      // 4. DETERMINAR ORGANIZACIÓN PRINCIPAL
      // ==========================================

      const organizacionPrincipalId =
        organizacionBase.organizacion_principal_id || organizacionBase.id;

      console.log("ORGANIZACIÓN PRINCIPAL:", organizacionPrincipalId);

      // ==========================================
      // 5. OBTENER ORGANIZACIONES DE ESA PRINCIPAL
      // ==========================================

      const { data: organizacionesHijas, error: hijasError } = await supabase
        .from("organizaciones")
        .select("id, nombre, estado, organizacion_principal_id")
        .eq("organizacion_principal_id", organizacionPrincipalId)
        .eq("estado", "activa")
        .order("nombre", { ascending: true });

      if (hijasError) {
        console.error("Error obteniendo organizaciones:", hijasError);

        setOrganizaciones([]);
        setOrganizacionSeleccionada("");
        return;
      }

      // ==========================================
      // 6. ASEGURAR QUE LA ORGANIZACIÓN BASE
      //    ESTÉ INCLUIDA
      // ==========================================

      let organizacionesDisponibles = organizacionesHijas || [];

      const baseYaExiste = organizacionesDisponibles.some(
        (organizacion) => organizacion.id === organizacionBase.id,
      );

      if (organizacionBase.estado === "activa" && !baseYaExiste) {
        organizacionesDisponibles = [
          organizacionBase,
          ...organizacionesDisponibles,
        ];
      }

      console.log("ORGANIZACIONES DISPONIBLES:", organizacionesDisponibles);

      // ==========================================
      // 7. GUARDAR ORGANIZACIONES
      // ==========================================

      setOrganizaciones(organizacionesDisponibles);

      // ==========================================
      // 8. SELECCIONAR ORGANIZACIÓN
      // ==========================================

      if (organizacionesDisponibles.length === 1) {
        setOrganizacionSeleccionada(organizacionesDisponibles[0].id);
      } else if (
        organizacionesDisponibles.some(
          (organizacion) => organizacion.id === organizacionBase.id,
        )
      ) {
        // Si hay varias, seleccionar la organización
        // propia del usuario.
        setOrganizacionSeleccionada(organizacionBase.id);
      } else {
        setOrganizacionSeleccionada("");
      }

      console.log("ORGANIZACIÓN SELECCIONADA:", organizacionBase.id);

      console.log("============================================");
    } catch (error) {
      console.error("Error inesperado cargando organizaciones:", error);

      setOrganizaciones([]);
      setOrganizacionSeleccionada("");
    }
  };

  useEffect(() => {
    if (!usuario?.id) return;

    cargarOrganizaciones();
  }, [usuario?.id]);
  useEffect(() => {
    if (!usuario?.id || !organizacionSeleccionada) return;

    cargarDomicilios(organizacionSeleccionada);
  }, [usuario?.id, organizacionSeleccionada]);
  const puedeReportar = (domicilio) => {
    if (!domicilio) return false;

    if (domicilio.estado === "Reportado" || domicilio.estado === "Cancelado") {
      return false;
    }

    if (domicilio.reporteSolucionado) {
      return false;
    }

    return true;
  };

  const confirmarReporte = async () => {
    if (!domicilioSeleccionado) return;

    // No permitir reportar nuevamente un domicilio reportado o cancelado
    if (
      domicilioSeleccionado.estado === "Reportado" ||
      domicilioSeleccionado.estado === "Cancelado"
    ) {
      Swal.fire({
        icon: "warning",
        title: "Acción no permitida",
        text:
          domicilioSeleccionado.estado === "Reportado"
            ? "Este domicilio ya fue reportado."
            : "Este domicilio fue cancelado y no puede reportarse.",
        confirmButtonColor: "#2563eb",
      });

      setModalReporte(false);
      return;
    }

    const nuevoEstado =
      reporteData.motivo === "Cliente canceló" ? "Cancelado" : "Reportado";

    // 1. Actualizar el domicilio
    const { error: domicilioError } = await supabase
      .from("domicilios")
      .update({
        estado: nuevoEstado,
        observaciones: reporteData.observaciones,
      })
      .eq("id", domicilioSeleccionado.id);

    if (domicilioError) {
      console.error("Error actualizando domicilio:", domicilioError);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo actualizar el estado del domicilio.",
      });

      return;
    }

    // 2. Actualizar el detalle de la deuda
    const nuevoEstadoDetalle =
      nuevoEstado === "Cancelado" ? "cancelado" : "reportado";

    const { error: detalleError } = await supabase
      .from("pendientes_detalle")
      .update({
        estado: nuevoEstadoDetalle,
        updated_at: new Date().toISOString(),
      })
      .eq("domicilio_id", domicilioSeleccionado.id)
      .eq("estado", "pendiente");

    if (detalleError) {
      console.error("Error actualizando pendientes_detalle:", detalleError);

      Swal.fire({
        icon: "warning",
        title: "Domicilio actualizado",
        text: "El domicilio cambió de estado, pero no se pudo actualizar el detalle de la deuda.",
      });

      await cargarDomicilios(organizacionSeleccionada);
      setModalReporte(false);

      return;
    }

    // 3. Si fue reportado, crear el reporte
    if (nuevoEstado === "Reportado") {
      const { error: reporteError } = await supabase.from("reportes").insert([
        {
          usuario_id: usuario.id,
          domicilio_id: domicilioSeleccionado.id,
          descripcion: `${reporteData.motivo}: ${
            reporteData.observaciones || ""
          }`,
          estado: "Pendiente",
        },
      ]);

      if (reporteError) {
        console.error("Error creando reporte:", reporteError);

        Swal.fire({
          icon: "warning",
          title: "Domicilio reportado",
          text: "El domicilio fue reportado, pero no se pudo crear el registro del reporte.",
        });

        await cargarDomicilios(organizacionSeleccionada);
        setModalReporte(false);
      }
    }

    // 4. Actualizar la lista
    await cargarDomicilios(organizacionSeleccionada);
    // ==========================================
    // REGISTRAR ACTIVIDAD
    // ==========================================

    await registrarActividadYNotificar({
      usuarioId: usuario.id,
      tipo: "domicilio",
      accion: nuevoEstado === "Cancelado" ? "cancelar" : "reportar",
      descripcion:
        nuevoEstado === "Cancelado"
          ? `Canceló el domicilio del cliente ${domicilioSeleccionado.cliente}. Motivo: ${reporteData.motivo}.`
          : `Reportó el domicilio del cliente ${domicilioSeleccionado.cliente}. Motivo: ${reporteData.motivo}.`,
      referenciaId: domicilioSeleccionado.id,
      organizacionId: organizacionSeleccionada,
    });
    await cargarDomicilios(organizacionSeleccionada);
    // 5. Cerrar modal
    setModalReporte(false);

    Swal.fire({
      icon: "success",
      title:
        nuevoEstado === "Cancelado" ? "Domicilio cancelado" : "Reporte enviado",
      text:
        nuevoEstado === "Cancelado"
          ? "El domicilio fue cancelado correctamente."
          : "El reporte fue enviado al administrador.",
      timer: 1800,
      showConfirmButton: false,
    });
  };
  const buscarCliente = async (valor) => {
    const busqueda = valor.trim();

    console.log("========== BUSCANDO CLIENTE ==========");
    console.log("BÚSQUEDA:", busqueda);
    console.log("ORGANIZACIÓN:", organizacionSeleccionada);

    if (!busqueda) {
      setClientesEncontrados([]);
      setClienteEncontrado(null);
      setClienteNoEncontrado(false);
      return;
    }

    if (!organizacionSeleccionada) {
      console.log("NO HAY ORGANIZACIÓN SELECCIONADA");
      setClientesEncontrados([]);
      setClienteNoEncontrado(false);
      return;
    }

    try {
      const { data: clientesEncontrados, error: relacionError } =
        await supabase.rpc("buscar_clientes_para_organizacion", {
          p_organizacion_id: organizacionSeleccionada,
          p_busqueda: busqueda,
        });

      if (relacionError) {
        console.error(
          "ERROR BUSCANDO CLIENTES POR ORGANIZACIÓN:",
          relacionError,
        );

        setClientesEncontrados([]);
        setClienteEncontrado(null);
        setClienteNoEncontrado(false);
        return;
      }

      console.log("CLIENTES ENCONTRADOS:", clientesEncontrados);

      const clientes = clientesEncontrados || [];

      setClientesEncontrados(clientes);
      setClienteNoEncontrado(clientes.length === 0);
    } catch (error) {
      console.error("ERROR INESPERADO BUSCANDO CLIENTE:", error);

      setClientesEncontrados([]);
      setClienteEncontrado(null);
      setClienteNoEncontrado(false);
    }
  };
  const seleccionarCliente = (cliente) => {
    setClienteEncontrado(cliente);
    setClientesEncontrados([]);
    setClienteNoEncontrado(false);

    setTelefonoBusqueda(cliente.telefono);

    setFormData((prev) => ({
      ...prev,
      cliente: cliente.nombre,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
    }));
  };
  const cerrarDia = async () => {
    if (!organizacionSeleccionada) {
      Swal.fire({
        icon: "warning",
        title: "Selecciona una organización",
        text: "Debes seleccionar una organización antes de cerrar el día.",
      });
      return;
    }
    const totalDomicilios = domicilios.length;

    const totalRecaudado = domicilios
      .filter((d) => d.estado === "Pagado")
      .reduce((acc, d) => acc + Number(d.costo || 0), 0);

    const totalPagados = domicilios.filter((d) => d.estado === "Pagado").length;

    const totalPendientes = domicilios.filter(
      (d) => d.estado === "Pendiente",
    ).length;

    const totalCancelados = domicilios.filter(
      (d) => d.estado === "Cancelado",
    ).length;

    const totalReportados = domicilios.filter(
      (d) => d.estado === "Reportado",
    ).length;

    // ================================
    // FECHA DE LA JORNADA
    // ================================

    const inicioDelDia = new Date();
    inicioDelDia.setHours(0, 0, 0, 0);

    const inicioDelDiaSiguiente = new Date(inicioDelDia);
    inicioDelDiaSiguiente.setDate(inicioDelDiaSiguiente.getDate() + 1);

    // ================================
    // 1. CREAR CIERRE
    // ================================
    console.log("========== DATOS DEL CIERRE ==========");
    console.log("USUARIO:", usuario);
    console.log("ORGANIZACIÓN SELECCIONADA:", organizacionSeleccionada);
    console.log("TOTAL DOMICILIOS:", totalDomicilios);
    console.log("TOTAL RECAUDADO:", totalRecaudado);
    console.log("TOTAL PAGADOS:", totalPagados);
    console.log("TOTAL PENDIENTES:", totalPendientes);
    console.log("TOTAL CANCELADOS:", totalCancelados);
    console.log("TOTAL REPORTADOS:", totalReportados);
    console.log("======================================");
    console.log("🔎 UUID USUARIO:", usuario?.id);
    console.log("🔎 UUID ORGANIZACIÓN:", organizacionSeleccionada);
    const { data: cierre, error: cierreError } = await supabase
      .from("cierres_dia")
      .insert([
        {
          domiciliario_id: usuario.id,
          total_domicilios: totalDomicilios,
          total_recaudado: totalRecaudado,
          total_pagados: totalPagados,
          total_pendientes: totalPendientes,
          total_cancelados: totalCancelados,
          total_reportados: totalReportados,
          organizacion_id: organizacionSeleccionada,
        },
      ])
      .select("id")
      .single();

    if (cierreError) {
      console.error("========== ERROR CREANDO CIERRE ==========");
      console.error("ERROR COMPLETO:", cierreError);
      console.error("CODE:", cierreError.code);
      console.error("MESSAGE:", cierreError.message);
      console.error("DETAILS:", cierreError.details);
      console.error("HINT:", cierreError.hint);
      console.error("==========================================");

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo realizar el cierre del día.",
      });

      return;
    }

    // ================================
    // 2. ASOCIAR DOMICILIOS DE HOY
    // ================================

    const { error: marcarError } = await supabase
      .from("domicilios")
      .update({
        cierre_id: cierre.id,
      })
      .eq("domiciliario_id", usuario.id)
      .eq("organizacion_id", organizacionSeleccionada)
      .gte("created_at", inicioDelDia.toISOString())
      .lt("created_at", inicioDelDiaSiguiente.toISOString())
      .is("cierre_id", null);

    if (marcarError) {
      console.error("Error marcando domicilios:", marcarError);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "El cierre se creó, pero no se pudieron asociar los domicilios.",
      });

      return;
    }
    // ================================
    // REGISTRAR ACTIVIDAD
    // ================================

    await registrarActividadYNotificar({
      usuarioId: usuario.id,
      tipo: "cierre",
      accion: "cerrar_dia",
      descripcion: `Cerró el día con ${totalDomicilios} domicilios y un total recaudado de $${totalRecaudado.toLocaleString("es-CO")}.`,
      referenciaId: cierre.id,
      organizacionId: organizacionSeleccionada,
    });

    // ================================
    // 3. CERRAR MODAL
    // ================================

    setModalCerrarDia(false);

    // ================================
    // 4. ACTUALIZAR PANTALLA
    // ================================

    await cargarDomicilios(organizacionSeleccionada);

    Swal.fire({
      icon: "success",
      title: "Día cerrado",
      text: "El cierre fue realizado correctamente.",
      timer: 1800,
      showConfirmButton: false,
    });
  };

  const hora = new Date().getHours();

  let saludo = "Hola";

  if (hora >= 5 && hora < 12) {
    saludo = "Buenos días";
  } else if (hora >= 12 && hora < 18) {
    saludo = "Buenas tardes";
  } else {
    saludo = "Buenas noches";
  }
  const mensajes = [
    "Bienvenido a Liquisistema",
    "Gestiona tus domicilios fácilmente",
    "Mantén tu operación organizada",
    "Recuerda realizar el cierre del día",
    "Un buen servicio genera clientes felices",
  ];

  const [mensajeIndex, setMensajeIndex] = useState(0);
  useEffect(() => {
    const intervalo = setInterval(() => {
      setMensajeIndex((prev) => (prev + 1) % mensajes.length);
    }, 20000);

    return () => clearInterval(intervalo);
  }, []);
  const fechaActual = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const cerrarSesion = async () => {
    const resultado = await Swal.fire({
      title: "Cerrar sesión",
      text: "¿Deseas cerrar sesión?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, cerrar sesión",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
    });

    if (!resultado.isConfirmed) return;

    // ==========================================
    // REGISTRAR ACTIVIDAD
    // ==========================================

    await registrarActividadYNotificar({
      usuarioId: usuario.id,
      tipo: "sesion",
      accion: "cerrar_sesion",
      descripcion: "Cerró sesión en Liquisistema.",
      referenciaId: null,
    });

    // ==========================================
    // CERRAR SESIÓN
    // ==========================================

    await supabase.auth.signOut();

    sessionStorage.removeItem("usuario");
    localStorage.clear();

    Swal.fire({
      icon: "success",
      title: "Sesión cerrada",
      timer: 1200,
      showConfirmButton: false,
    });

    setTimeout(() => {
      window.location.href = "/";
    }, 1200);
  };
  const totalDomicilios = domicilios.length;

  const totalRecaudado = domicilios
    .filter((d) => d.estado === "Pagado")
    .reduce((acc, d) => acc + Number(d.costo || 0), 0);

  const totalPendientes = domicilios.filter(
    (d) => d.estado === "Pendiente",
  ).length;

  const totalPagados = domicilios.filter((d) => d.estado === "Pagado").length;
  useEffect(() => {
    if (recaudoAnteriorRef.current === null) {
      recaudoAnteriorRef.current = totalRecaudado;
      return;
    }

    const anterior = recaudoAnteriorRef.current;

    if (totalRecaudado < anterior) {
      setCambioRecaudo(anterior - totalRecaudado);

      setTimeout(() => {
        setCambioRecaudo(null);
      }, 1800);
    }

    recaudoAnteriorRef.current = totalRecaudado;
  }, [totalRecaudado]);
  const tomarFoto = async (e) => {
    const archivo = e.target.files[0];

    if (!archivo) return;

    setMostrarComprobante(false);

    const confirmar = await Swal.fire({
      title: "¿Subir comprobante?",
      text: "¿Deseas subir esta foto como comprobante?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, subir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#2563eb",
    });

    if (!confirmar.isConfirmed) {
      e.target.value = "";
      return;
    }

    const nombreArchivo = `${Date.now()}-${archivo.name}`;

    const { error: uploadError } = await supabase.storage
      .from("comprobantes")
      .upload(nombreArchivo, archivo);

    if (uploadError) {
      console.error("Error Storage:", uploadError);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: uploadError.message,
      });

      return;
    }

    const { data } = supabase.storage
      .from("comprobantes")
      .getPublicUrl(nombreArchivo);
    await supabase
      .from("domicilios")
      .update({
        comprobante_url: data.publicUrl,
      })
      .eq("id", domicilioSeleccionado.id);
    await registrarActividadYNotificar({
      usuarioId: usuario.id,
      tipo: "domicilio",
      accion: "comprobante",
      descripcion: `Subió el comprobante del domicilio del cliente ${domicilioSeleccionado.cliente}.`,
      referenciaId: domicilioSeleccionado.id,
      organizacionId: organizacionSeleccionada,
    });

    console.log("URL pública:", data.publicUrl);

    Swal.fire({
      icon: "success",
      title: "Comprobante subido",
      text: "La foto fue subida correctamente",
    });

    e.target.value = "";
  };
  const iniciarEdicionDomicilio = (domicilio) => {
    if (domicilio.estado === "Cancelado") return;

    setDomicilioSeleccionado(domicilio);
    setClaveEdicion("");
    setModalClaveEdicion(true);
  };
  const validarClaveEdicion = async () => {
    if (!claveEdicion.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Clave requerida",
        text: "Ingresa la clave dinámica del administrador.",
      });

      return;
    }

    setValidandoClave(true);

    const { data, error } = await supabase.rpc(
      "validar_y_consumir_clave_edicion",
      {
        p_clave: claveEdicion.trim(),
        p_organizacion_id: organizacionSeleccionada,
      },
    );

    setValidandoClave(false);

    if (error) {
      console.error("Error validando clave:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo validar la clave dinámica.",
      });

      return;
    }

    if (!data?.valida) {
      Swal.fire({
        icon: "error",
        title: "Clave no válida",
        text:
          data?.mensaje ||
          "La clave es incorrecta, ya fue utilizada o ha expirado.",
      });

      return;
    }

    // La clave ya fue consumida correctamente
    setModalClaveEdicion(false);
    setClaveEdicion("");

    // Abrimos el editor
    setDatosEdicion({
      cliente: domicilioSeleccionado?.cliente || "",
      telefono: domicilioSeleccionado?.telefono || "",
      direccion: domicilioSeleccionado?.direccion || "",
      costo: domicilioSeleccionado?.costo || "",
      metodo_pago: domicilioSeleccionado?.metodo_pago || "Efectivo",
      estado: domicilioSeleccionado?.estado || "Pendiente",
    });

    setModalEditarDomicilio(true);

    setModalEditarDomicilio(true);
  };

  const solucionarDomicilioReportado = async () => {
    if (!domicilioSeleccionado) return;

    if (!claveSolucion.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Clave requerida",
        text: "Ingresa la clave dinámica del administrador.",
      });

      return;
    }

    setValidandoClave(true);

    const { data, error } = await supabase.rpc(
      "validar_y_consumir_clave_edicion",
      {
        p_clave: claveSolucion.trim(),
        p_organizacion_id: organizacionSeleccionada,
      },
    );

    setValidandoClave(false);

    if (error) {
      console.error("Error validando clave:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo validar la clave dinámica.",
      });

      return;
    }

    if (!data?.valida) {
      Swal.fire({
        icon: "error",
        title: "Clave no válida",
        text:
          data?.mensaje ||
          "La clave es incorrecta, ya fue utilizada o ha expirado.",
      });

      return;
    }

    const estadoAnterior = domicilioSeleccionado.estado;

    const { data: domicilioActualizado, error: errorActualizacion } =
      await supabase
        .from("domicilios")
        .update({
          estado: estadoSolucion,
        })
        .eq("id", domicilioSeleccionado.id)
        .select()
        .single();

    if (errorActualizacion) {
      console.error("Error solucionando domicilio:", errorActualizacion);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "La clave fue validada, pero no se pudo actualizar el domicilio.",
      });

      return;
    }
    // ==========================================
    // MARCAR REPORTE COMO SOLUCIONADO
    // ==========================================

    await registrarActividadYNotificar({
      usuarioId: usuario.id,
      tipo: "domicilio",
      accion: "solucionar_reporte",
      descripcion: `Domiciliario ${usuario.nombre} solucionó el domicilio reportado del cliente ${domicilioSeleccionado.cliente}. Su estado cambió de ${estadoAnterior} a ${estadoSolucion}.`,
      referenciaId: domicilioSeleccionado.id,
      organizacionId: organizacionSeleccionada,
    });

    setDomicilios((prev) =>
      prev.map((domicilio) =>
        domicilio.id === domicilioActualizado.id
          ? domicilioActualizado
          : domicilio,
      ),
    );

    setDomicilioSeleccionado(null);
    setModalSolucionReportado(false);
    setClaveSolucion("");
    setEstadoSolucion("Pagado");

    Swal.fire({
      icon: "success",
      title: "Domicilio solucionado",
      text: `El domicilio ahora está ${estadoSolucion}.`,
      timer: 1800,
      showConfirmButton: false,
    });
  };
  const abrirEditorDomicilio = () => {
    if (!domicilioSeleccionado) return;

    setDatosEdicion({
      cliente: domicilioSeleccionado.cliente || "",
      telefono: domicilioSeleccionado.telefono || "",
      direccion: domicilioSeleccionado.direccion || "",
      costo: domicilioSeleccionado.costo || "",
      metodo_pago: domicilioSeleccionado.metodo_pago || "Efectivo",
    });

    setModalEditarDomicilio(true);
  };
  const guardarEdicionDomicilio = async () => {
    if (!domicilioSeleccionado) return;

    if (!datosEdicion.cliente.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Cliente requerido",
        text: "Ingresa el nombre del cliente.",
      });
      return;
    }

    if (!datosEdicion.telefono.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Teléfono requerido",
        text: "Ingresa el teléfono del cliente.",
      });
      return;
    }

    if (!datosEdicion.direccion.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Dirección requerida",
        text: "Ingresa la dirección del domicilio.",
      });
      return;
    }

    if (datosEdicion.costo === "" || Number(datosEdicion.costo) < 0) {
      Swal.fire({
        icon: "warning",
        title: "Valor inválido",
        text: "Ingresa un valor válido para el domicilio.",
      });
      return;
    }

    setEditandoDomicilio(true);

    const { data, error } = await supabase.rpc(
      "actualizar_domicilio_y_pendiente",
      {
        p_domicilio_id: domicilioSeleccionado.id,
        p_cliente: datosEdicion.cliente.trim(),
        p_telefono: datosEdicion.telefono.trim(),
        p_direccion: datosEdicion.direccion.trim(),
        p_costo: Number(datosEdicion.costo),
        p_organizacion_id: organizacionSeleccionada,
      },
    );
    if (error) {
      console.error("Error actualizando domicilio:", error);

      setEditandoDomicilio(false);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo actualizar el domicilio.",
      });

      return;
    }

    // ==========================================
    // REGISTRAR ACTIVIDAD
    // ==========================================

    await registrarActividadYNotificar({
      usuarioId: usuario.id,
      tipo: "domicilio",
      accion: "editar",
      descripcion: `Editó el domicilio del cliente ${domicilioSeleccionado.cliente}.`,
      referenciaId: domicilioSeleccionado.id,
      organizacionId: organizacionSeleccionada,
    });

    // ==========================================
    // ACTUALIZAR DOMICILIO EN PANTALLA
    // ==========================================

    setDomicilios((prev) =>
      prev.map((domicilio) => (domicilio.id === data.id ? data : domicilio)),
    );

    setDomicilioSeleccionado(data);
    setEditandoDomicilio(false);
    setModalEditarDomicilio(false);

    Swal.fire({
      icon: "success",
      title: "Domicilio actualizado",
      text: "Los cambios se guardaron correctamente.",
      timer: 1800,
      showConfirmButton: false,
    });
  };
  return (
    <div
      className={`${styles.lqDashboard} ${modoOscuro ? styles.modoOscuro : ""}`}
    >
      <aside
        className={`${styles.lqSidebar} ${
          menuOpen ? styles.lqSidebarOpen : ""
        }`}
      >
        <div className={styles.lqLogo}>
          <h2>Liquisistema</h2>

          <button
            className={styles.lqNotificationButton}
            onClick={() => setMostrarNotificaciones(!mostrarNotificaciones)}
            aria-label="Notificaciones"
          >
            <BellIcon className={styles.lqNotificationIcon} />

            {notificacionesNoLeidas > 0 && (
              <span className={styles.lqNotificationBadge}>
                {notificacionesNoLeidas > 9 ? "9+" : notificacionesNoLeidas}
              </span>
            )}
          </button>
          {mostrarNotificaciones && (
            <div className={styles.lqNotificationPanel}>
              <div className={styles.lqNotificationHeader}>
                <div>
                  <h3>Notificaciones</h3>
                  <span>
                    {notificacionesNoLeidas === 0
                      ? "No tienes notificaciones nuevas"
                      : `${notificacionesNoLeidas} sin leer`}
                  </span>
                </div>
              </div>

              <div className={styles.lqNotificationList}>
                {notificaciones.length === 0 ? (
                  <div className={styles.lqNotificationEmpty}>
                    <BellIcon />
                    <p>No tienes notificaciones.</p>
                  </div>
                ) : (
                  notificaciones.map((notificacion) => (
                    <div
                      key={notificacion.id}
                      className={styles.lqNotificationWrapper}
                    >
                      <button
                        className={styles.lqNotificationDelete}
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarNotificacion(notificacion.id);
                        }}
                        aria-label="Eliminar notificación"
                      >
                        <TrashIcon
                          className={styles.lqNotificationDeleteIcon}
                        />
                      </button>

                      <div
                        className={`${styles.lqNotificationItem} ${
                          !notificacion.leida ? styles.lqNotificationUnread : ""
                        }`}
                        style={{
                          transform:
                            notificacionDeslizando === notificacion.id
                              ? `translateX(${desplazamientoNotificacion}px)`
                              : "translateX(0)",
                        }}
                        onClick={() => {
                          if (desplazamientoNotificacion === 0) {
                            marcarNotificacionLeida(notificacion.id);
                          }
                        }}
                        onTouchStart={(e) =>
                          iniciarDeslizamiento(e, notificacion.id)
                        }
                        onTouchMove={moverNotificacion}
                        onTouchEnd={terminarDeslizamiento}
                      >
                        <div className={styles.lqNotificationItemIcon}>
                          <BellIcon />
                        </div>

                        <div className={styles.lqNotificationItemContent}>
                          <strong>{notificacion.titulo}</strong>

                          <p>{notificacion.mensaje}</p>

                          <span>
                            {new Date(notificacion.created_at).toLocaleString(
                              "es-CO",
                              {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <nav className={styles.lqMenu}>
          <button onClick={() => setVistaActual("inicio")}>
            <HomeIcon className={styles.lqIcon} />
            Inicio
          </button>

          <button onClick={() => setVistaActual("perfil")}>
            <UserIcon className={styles.lqIcon} />
            Perfil
          </button>

          <button onClick={() => setVistaActual("configuracion")}>
            <Cog6ToothIcon className={styles.lqIcon} />
            Configuración
          </button>
        </nav>

        <div className={styles.lqSidebarFooter}>
          <button
            className={styles.lqCloseDay}
            onClick={() => {
              if (!organizacionSeleccionada) {
                Swal.fire({
                  icon: "warning",
                  title: "Selecciona una organización",
                  text: "Debes seleccionar una organización antes de cerrar el día.",
                });
                return;
              }

              setModalCerrarDia(true);
            }}
          >
            <ClipboardDocumentCheckIcon />
            Cerrar Día
          </button>

          <button className={styles.lqLogout} onClick={cerrarSesion}>
            <ArrowLeftOnRectangleIcon className={styles.lqIcon} />
            Cerrar Sesión
          </button>
        </div>
      </aside>
      {menuOpen && (
        <div className={styles.lqOverlay} onClick={() => setMenuOpen(false)} />
      )}
      <div className={styles.lqMobileHeader}>
        <button
          className={styles.lqHamburger}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>

        <span>Liquisistema</span>
      </div>
      {vistaActual === "inicio" && (
        <>
          <main className={styles.lqMain}>
            <section className={styles.lqWelcomeCard}>
              <div className={styles.lqWelcomeContent}>
                <div className={styles.lqWelcomeBadge}>
                  <SignalIcon className={styles.lqBadgeIcon} />
                  <span>En línea</span>
                </div>

                <h1>{saludo}</h1>

                <h2 className={styles.lqUserName}>{usuario?.nombre}</h2>

                <p>{mensajes[mensajeIndex]}</p>
              </div>

              <div className={styles.lqWelcomeIcon}>
                <TruckIcon />
              </div>
            </section>
            <section className={styles.lqSearchWrapper}>
              <section className={styles.lqSearchContainer}>
                <MagnifyingGlassIcon className={styles.lqSearchIcon} />

                <input
                  type="text"
                  placeholder="Buscar cliente por nombre o teléfono..."
                  value={telefonoBusqueda}
                  onChange={(e) => {
                    const valor = e.target.value;

                    setTelefonoBusqueda(valor);
                    buscarCliente(valor);
                  }}
                />
              </section>

              {clientesEncontrados.length > 0 && (
                <div className={styles.lqClientesDropdown}>
                  {clientesEncontrados.map((cliente) => (
                    <button
                      type="button"
                      key={cliente.id}
                      className={styles.lqClienteOption}
                      onClick={() => seleccionarCliente(cliente)}
                    >
                      <div className={styles.lqClienteOptionIcon}>
                        <UserIcon />
                      </div>

                      <div className={styles.lqClienteOptionInfo}>
                        <strong>{cliente.nombre}</strong>

                        <span>
                          {cliente.telefono} · {cliente.direccion}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {clienteNoEncontrado &&
                telefonoBusqueda.trim() !== "" &&
                clientesEncontrados.length === 0 && (
                  <div className={styles.lqClientesDropdown}>
                    <div className={styles.lqClienteSinResultados}>
                      No se encontraron clientes
                    </div>
                  </div>
                )}
            </section>

            <section className={styles.lqStatsBar}>
              <div className={styles.lqStatsItem}>
                <span>Domicilios</span>
                <strong>{totalDomicilios}</strong>
              </div>

              <div className={styles.lqStatsItem}>
                <span>Pagados</span>
                <strong>{totalPagados}</strong>
              </div>

              <div className={styles.lqStatsItem}>
                <span>Pendientes</span>
                <strong>{totalPendientes}</strong>
              </div>

              <div className={`${styles.lqStatsItem} ${styles.lqMoney}`}>
                <span>Recaudado</span>

                <strong className={styles.lqRecaudoValor}>
                  $
                  <CountUp.default
                    end={totalRecaudado}
                    duration={1.8}
                    separator="."
                  />
                </strong>

                {cambioRecaudo !== null && (
                  <span className={styles.lqRecaudoCambio}>
                    -${cambioRecaudo.toLocaleString("es-CO")}
                  </span>
                )}
              </div>
            </section>
            <section className={styles.lqContent}>
              <div className={styles.lqFormCard}>
                <h2>Nuevo Domicilio</h2>

                <form className={styles.lqForm} onSubmit={guardarDomicilio}>
                  <input
                    type="text"
                    placeholder="Nombre del cliente"
                    value={formData.cliente}
                    className={
                      !formData.cliente && error ? styles.lqInputError : ""
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cliente: e.target.value,
                      })
                    }
                  />

                  <input
                    type="text"
                    placeholder="Dirección"
                    value={formData.direccion}
                    className={
                      submitted && !formData.direccion
                        ? styles.lqInputError
                        : ""
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        direccion: e.target.value,
                      })
                    }
                  />

                  <input
                    type="tel"
                    placeholder="Teléfono"
                    value={formData.telefono}
                    className={
                      submitted && !formData.telefono ? styles.lqInputError : ""
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        telefono: e.target.value.replace(/\D/g, ""),
                      })
                    }
                  />

                  <input
                    type="number"
                    placeholder="Valor"
                    value={formData.valor}
                    className={
                      submitted && !formData.valor ? styles.lqInputError : ""
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        valor: e.target.value,
                      })
                    }
                  />

                  <input
                    type="number"
                    placeholder="Propina"
                    value={formData.propina}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        propina: e.target.value,
                      })
                    }
                  />
                  <select
                    value={organizacionSeleccionada}
                    className={
                      submitted && !organizacionSeleccionada
                        ? styles.lqInputError
                        : ""
                    }
                    onChange={(e) => {
                      const organizacionId = e.target.value;

                      setOrganizacionSeleccionada(organizacionId);

                      if (organizacionId) {
                        cargarDomicilios(organizacionId);
                      } else {
                        setDomicilios([]);
                      }
                    }}
                  >
                    <option value="">Seleccione organización</option>

                    {organizaciones.map((organizacion) => (
                      <option key={organizacion.id} value={organizacion.id}>
                        {organizacion.nombre}
                      </option>
                    ))}
                  </select>
                  <select
                    value={formData.metodo_pago}
                    className={
                      submitted && !formData.metodo_pago
                        ? styles.lqInputError
                        : ""
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        metodo_pago: e.target.value,
                      })
                    }
                  >
                    <option value="">Seleccione método de pago</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Datáfono">Datáfono</option>
                    <option value="Otro">Otro</option>
                  </select>

                  <textarea
                    className={styles.lqTextarea}
                    placeholder="Observaciones"
                    value={formData.observaciones}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        observaciones: e.target.value,
                      })
                    }
                  />
                  {error && <p className={styles.lqError}>{error}</p>}
                  <button type="submit" className={styles.lqSaveButton}>
                    Guardar Domicilio
                  </button>
                </form>
              </div>

              <div className={styles.lqHistoryCard}>
                <h2>Historial de Domicilios</h2>
                <div className={styles.lqTableContainer}>
                  <table>
                    <thead>
                      <tr>
                        <th>Factura</th>
                        <th>Cliente</th>
                        <th>Teléfono</th>
                        <th>Dirección</th>
                        <th>Valor</th>
                        <th>Método Pago</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {domicilios.map((domicilio) => (
                        <tr
                          key={domicilio.id}
                          onClick={async () => {
                            if (domicilio.estado !== "Reportado") return;

                            const { data: reporte, error } = await supabase
                              .from("reportes")
                              .select("descripcion")
                              .eq("domicilio_id", domicilio.id)
                              .eq("estado", "Pendiente")
                              .order("created_at", { ascending: false })
                              .limit(1)
                              .maybeSingle();

                            if (error) {
                              console.error("Error obteniendo reporte:", error);

                              Swal.fire({
                                icon: "error",
                                title: "Error",
                                text: "No se pudo obtener la información del reporte.",
                              });

                              return;
                            }

                            setDomicilioSeleccionado({
                              ...domicilio,
                              reporte_descripcion:
                                reporte?.descripcion || "Problema reportado",
                            });

                            setModalSolucionReportado(true);
                          }}
                          style={{
                            cursor:
                              domicilio.estado === "Reportado"
                                ? "pointer"
                                : "default",
                          }}
                        >
                          <td>{domicilio.numero_factura}</td>

                          <td>{domicilio.cliente}</td>

                          <td>{domicilio.telefono}</td>

                          <td>{domicilio.direccion}</td>

                          <td>
                            ${Number(domicilio.costo).toLocaleString("es-CO")}
                          </td>

                          <td>{domicilio.metodo_pago}</td>

                          <td>
                            <span
                              className={
                                domicilio.estado === "Pagado"
                                  ? styles.lqEstadoPagado
                                  : domicilio.estado === "Cancelado"
                                    ? styles.lqEstadoCancelado
                                    : domicilio.estado === "Reportado"
                                      ? styles.lqEstadoReportado
                                      : styles.lqEstadoPendiente
                              }
                            >
                              {domicilio.estado}
                            </span>
                          </td>

                          <td>
                            <div
                              className={styles.lqActions}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* EDITAR */}

                              <PencilSquareIcon
                                className={`${styles.lqActionIcon} ${
                                  domicilio.estado === "Cancelado" ||
                                  domicilio.estado === "Reportado"
                                    ? styles.lqActionDisabled
                                    : ""
                                }`}
                                onClick={() => {
                                  if (
                                    domicilio.estado === "Cancelado" ||
                                    domicilio.estado === "Reportado"
                                  ) {
                                    return;
                                  }

                                  iniciarEdicionDomicilio(domicilio);
                                }}
                              />

                              {/* COMPROBANTE */}

                              <DocumentTextIcon
                                className={`${styles.lqActionIcon} ${
                                  domicilio.estado === "Cancelado"
                                    ? styles.lqActionDisabled
                                    : ""
                                }`}
                                onClick={() => {
                                  if (domicilio.estado === "Cancelado") return;

                                  setDomicilioSeleccionado(domicilio);
                                  setMostrarComprobante(true);
                                }}
                              />

                              {/* REPORTAR */}

                              <ExclamationTriangleIcon
                                className={`${styles.lqActionIcon} ${
                                  !puedeReportar(domicilio)
                                    ? styles.lqActionDisabled
                                    : ""
                                }`}
                                onClick={() => {
                                  if (!puedeReportar(domicilio)) return;

                                  setDomicilioSeleccionado(domicilio);

                                  setReporteData({
                                    motivo: "",
                                    observaciones: "",
                                  });

                                  setModalReporte(true);
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </main>
        </>
      )}
      {vistaActual === "perfil" && (
        <div className={styles.lqPerfilContainer}>
          <Perfil usuario={usuario} />
        </div>
      )}
      {vistaActual === "configuracion" && (
        <div className={styles.lqPerfilContainer}>
          <Configuracion
            modoOscuro={modoOscuro}
            setModoOscuro={setModoOscuro}
          />
        </div>
      )}
      {mostrarComprobante && (
        <div
          className={styles.lqSheetOverlay}
          onClick={() => setMostrarComprobante(false)}
        >
          <div
            className={styles.lqBottomSheet}
            onClick={(e) => e.stopPropagation()}
          >
            {domicilioSeleccionado?.comprobante_url ? (
              <button
                className={styles.lqSheetButton}
                onClick={() => setMostrarImagen(true)}
              >
                Ver comprobante
              </button>
            ) : (
              <>
                <button
                  className={styles.lqSheetButton}
                  onClick={() => document.getElementById("cameraInput").click()}
                >
                  <CameraIcon className={styles.lqSheetIcon} />
                  Tomar foto
                </button>

                <button
                  className={styles.lqSheetButton}
                  onClick={() =>
                    document.getElementById("galleryInput").click()
                  }
                >
                  <PhotoIcon className={styles.lqSheetIcon} />
                  <span>Subir imagen</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {mostrarImagen && (
        <div
          className={styles.lqImageOverlay}
          onClick={() => setMostrarImagen(false)}
        >
          <div
            className={styles.lqImageModal}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={domicilioSeleccionado.comprobante_url}
              alt="Comprobante"
              className={styles.lqImagePreview}
            />

            <button
              className={styles.lqCloseImage}
              onClick={() => setMostrarImagen(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        id="cameraInput"
        style={{ display: "none" }}
        onChange={tomarFoto}
      />
      <input
        type="file"
        accept="image/*"
        id="galleryInput"
        style={{ display: "none" }}
        onChange={tomarFoto}
      />
      {modalCerrarDia && (
        <div className={styles.lqModalOverlay}>
          <div className={styles.lqModal}>
            <h2>Cerrar Día</h2>

            <p className={styles.lqModalText}>
              ¿Deseas realizar el cierre del día?
            </p>

            <p>
              <strong>Domicilios:</strong> {domicilios.length}
            </p>

            <p>
              <strong>Total:</strong> $
              {domicilios
                .filter((d) => d.estado === "Pagado")
                .reduce((acc, d) => acc + Number(d.costo || 0), 0)
                .toLocaleString("es-CO")}
            </p>

            <div className={styles.lqModalActions}>
              <button
                className={styles.lqModalCancel}
                onClick={() => setModalCerrarDia(false)}
              >
                Cancelar
              </button>

              <button className={styles.lqModalConfirm} onClick={cerrarDia}>
                Confirmar Cierre
              </button>
            </div>
          </div>
        </div>
      )}
      {modalReporte && (
        <div className={styles.lqModalOverlay}>
          <div className={styles.lqModal}>
            <h2>Reportar Domicilio</h2>

            <select
              value={reporteData.motivo}
              onChange={(e) =>
                setReporteData({
                  ...reporteData,
                  motivo: e.target.value,
                })
              }
            >
              <option value="">Seleccione un motivo</option>
              <option value="Cliente canceló">Cliente canceló</option>
              <option value="Dirección incorrecta">Dirección incorrecta</option>
              <option value="Cliente no responde">Cliente no responde</option>
              <option value="No había producto">No había producto</option>
              <option value="Otro">Otro</option>
            </select>

            <textarea
              placeholder="Observaciones"
              value={reporteData.observaciones}
              onChange={(e) =>
                setReporteData({
                  ...reporteData,
                  observaciones: e.target.value,
                })
              }
            />

            <div className={styles.lqModalActions}>
              <button
                type="button"
                className={styles.lqModalCancel}
                onClick={() => setModalReporte(false)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={styles.lqModalConfirm}
                onClick={confirmarReporte}
              >
                Confirmar reporte
              </button>
            </div>
          </div>
        </div>
      )}
      {modalClaveEdicion && (
        <div className={styles.lqModalOverlay}>
          <div className={styles.lqModal}>
            <div className={styles.lqModalHeader}>
              <div>
                <h2>Autorización de edición</h2>
                <p>Ingresa la clave dinámica generada por el administrador.</p>
              </div>

              <button
                type="button"
                className={styles.lqModalClose}
                onClick={() => {
                  setModalClaveEdicion(false);
                  setClaveEdicion("");
                }}
              >
                <XMarkIcon />
              </button>
            </div>

            <div className={styles.lqModalBody}>
              <label className={styles.lqModalLabel}>Clave dinámica</label>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={claveEdicion}
                onChange={(e) => {
                  const valor = e.target.value.replace(/\D/g, "").slice(0, 6);

                  setClaveEdicion(valor);
                }}
                placeholder="000000"
                className={styles.lqModalInput}
                autoFocus
              />

              <p className={styles.lqModalHelp}>
                Esta clave solo puede utilizarse una vez.
              </p>
            </div>

            <div className={styles.lqModalFooter}>
              <button
                type="button"
                className={styles.lqModalCancel}
                onClick={() => {
                  setModalClaveEdicion(false);
                  setClaveEdicion("");
                }}
                disabled={validandoClave}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={styles.lqModalConfirm}
                onClick={validarClaveEdicion}
                disabled={validandoClave || claveEdicion.length !== 6}
              >
                {validandoClave ? "Validando..." : "Validar clave"}
              </button>
            </div>
          </div>
        </div>
      )}
      {modalEditarDomicilio && domicilioSeleccionado && (
        <div
          className={styles.lqEditModalOverlay}
          onClick={() => {
            if (editandoDomicilio) return;

            setModalEditarDomicilio(false);
            setDomicilioSeleccionado(null);
          }}
        >
          <div
            className={styles.lqEditModal}
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}

            <div className={styles.lqEditModalHeader}>
              <div>
                <h2>Editar domicilio</h2>

                <p>Modifica la información del domicilio.</p>
              </div>

              <button
                type="button"
                className={styles.lqEditModalClose}
                onClick={() => {
                  if (editandoDomicilio) return;

                  setModalEditarDomicilio(false);
                  setDomicilioSeleccionado(null);
                }}
                disabled={editandoDomicilio}
              >
                <XMarkIcon />
              </button>
            </div>

            {/* BODY */}

            <div className={styles.lqEditModalBody}>
              <div className={styles.lqEditGrid}>
                {/* CLIENTE */}

                <div className={styles.lqEditField}>
                  <label>Cliente</label>

                  <input
                    type="text"
                    value={datosEdicion.cliente}
                    onChange={(e) =>
                      setDatosEdicion({
                        ...datosEdicion,
                        cliente: e.target.value,
                      })
                    }
                    placeholder="Nombre del cliente"
                    disabled={editandoDomicilio}
                  />
                </div>

                {/* TELÉFONO */}

                <div className={styles.lqEditField}>
                  <label>Teléfono</label>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={datosEdicion.telefono}
                    onChange={(e) =>
                      setDatosEdicion({
                        ...datosEdicion,
                        telefono: e.target.value,
                      })
                    }
                    placeholder="Teléfono"
                    disabled={editandoDomicilio}
                  />
                </div>

                {/* DIRECCIÓN */}

                <div className={`${styles.lqEditField} ${styles.lqEditFull}`}>
                  <label>Dirección</label>

                  <input
                    type="text"
                    value={datosEdicion.direccion}
                    onChange={(e) =>
                      setDatosEdicion({
                        ...datosEdicion,
                        direccion: e.target.value,
                      })
                    }
                    placeholder="Dirección del domicilio"
                    disabled={editandoDomicilio}
                  />
                </div>

                {/* VALOR */}

                <div className={styles.lqEditField}>
                  <label>Valor</label>

                  <input
                    type="number"
                    min="0"
                    value={datosEdicion.costo}
                    onChange={(e) =>
                      setDatosEdicion({
                        ...datosEdicion,
                        costo: e.target.value,
                      })
                    }
                    placeholder="0"
                    disabled={editandoDomicilio}
                  />
                </div>
              </div>

              {/* INFORMACIÓN DEL DOMICILIO */}

              <div className={styles.lqEditInfo}>
                <div>
                  <span>ID del domicilio</span>

                  <strong>#{domicilioSeleccionado.id}</strong>
                </div>

                <div>
                  <span>Estado actual</span>

                  <strong>{domicilioSeleccionado.estado}</strong>
                </div>
              </div>
            </div>

            {/* FOOTER */}

            <div className={styles.lqEditModalFooter}>
              <button
                type="button"
                className={styles.lqEditCancel}
                onClick={() => {
                  if (editandoDomicilio) return;

                  setModalEditarDomicilio(false);
                  setDomicilioSeleccionado(null);
                }}
                disabled={editandoDomicilio}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={styles.lqEditSave}
                onClick={guardarEdicionDomicilio}
                disabled={editandoDomicilio}
              >
                {editandoDomicilio ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalSolucionReportado && domicilioSeleccionado && (
        <div className={styles.lqModalOverlay}>
          <div className={styles.lqModal}>
            <div className={styles.lqModalHeader}>
              <div>
                <h2>Solucionar domicilio reportado</h2>
                <p>Este domicilio fue reportado y requiere autorización.</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalSolucionReportado(false);
                  setDomicilioSeleccionado(null);
                  setClaveSolucion("");
                  setEstadoSolucion("Pagado");
                }}
              >
                <XMarkIcon />
              </button>
            </div>

            <div className={styles.lqModalBody}>
              <div className={styles.lqEditInfo}>
                <div>
                  <span>Cliente</span>
                  <strong>{domicilioSeleccionado.cliente}</strong>
                </div>

                <div>
                  <span>ID del domicilio</span>
                  <strong>#{domicilioSeleccionado.id}</strong>
                </div>

                <div>
                  <span>Estado actual</span>
                  <strong>{domicilioSeleccionado.estado}</strong>
                </div>
              </div>

              <div className={styles.lqEditField}>
                <label>Clave dinámica</label>

                <input
                  type="password"
                  value={claveSolucion}
                  onChange={(e) => setClaveSolucion(e.target.value)}
                  placeholder="Ingresa la clave"
                />
              </div>

              <div className={styles.lqEditField}>
                <label>Estado del domicilio</label>

                <select
                  value={estadoSolucion}
                  onChange={(e) => setEstadoSolucion(e.target.value)}
                >
                  <option value="Pagado">Pagado</option>

                  <option value="Pendiente">Pendiente</option>
                </select>
              </div>

              <div className={styles.lqEditInfo}>
                <div>
                  <span>Problema reportado</span>
                  <strong>
                    {domicilioSeleccionado.reporte_descripcion ||
                      "Problema reportado"}
                  </strong>
                </div>
              </div>
            </div>

            <div className={styles.lqEditModalFooter}>
              <button
                type="button"
                className={styles.lqEditCancel}
                onClick={() => {
                  setModalSolucionReportado(false);
                  setDomicilioSeleccionado(null);
                  setClaveSolucion("");
                  setEstadoSolucion("Pagado");
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={styles.lqEditSave}
                onClick={solucionarDomicilioReportado}
                disabled={validandoClave}
              >
                {validandoClave ? "Validando..." : "Solucionar domicilio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
