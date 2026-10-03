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
  const [entregaPendienteComprobante, setEntregaPendienteComprobante] =
    useState(null);
  const [validandoClave, setValidandoClave] = useState(false);
  const [guardandoDomicilio, setGuardandoDomicilio] = useState(false);
  const [modalEditarDomicilio, setModalEditarDomicilio] = useState(false);
  const [organizaciones, setOrganizaciones] = useState([]);
  const [organizacionSeleccionada, setOrganizacionSeleccionada] = useState("");
  const [cierreAutomaticoMinutos, setCierreAutomaticoMinutos] = useState(null);
  const [jornadaFinalizada, setJornadaFinalizada] = useState(false);
  const [cargandoConfiguracionJornada, setCargandoConfiguracionJornada] =
    useState(true);
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
    organizacion_origen_id: "",
  });
  const [metodoPagoSolucion, setMetodoPagoSolucion] = useState("");
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

  const guardarDomicilio = async (e, estadoForzado = null) => {
    const obtenerFechaLocal = (fecha = new Date()) => {
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, "0");
      const day = String(fecha.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    };
    e?.preventDefault();
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
      !organizacionSeleccionada
    ) {
      setError(
        "Debes completar todos los campos obligatorios, incluida la organización.",
      );
      return;
    }
    // =====================================================
    // VALIDAR JORNADA ANTES DE CREAR CLIENTE O DOMICILIO
    // =====================================================
    // El frontend muestra el estado de la jornada, pero el backend
    // también lo valida mediante puede_crear_domicilio_en_organizacion.
    if (jornadaFinalizada) {
      await Swal.fire({
        icon: "info",
        title: "Jornada finalizada",
        text: "No puedes registrar nuevos domicilios hasta la próxima jornada.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    const { data: puedeCrear, error: errorHorario } = await supabase.rpc(
      "puede_crear_domicilio_en_organizacion",
      {
        p_organizacion_id: organizacionSeleccionada,
      },
    );

    if (errorHorario) {
      console.error("Error verificando la jornada:", errorHorario);
      setError("No se pudo verificar el horario de trabajo.");
      return;
    }

    if (puedeCrear !== true) {
      await Swal.fire({
        icon: "info",
        title: "Jornada finalizada",
        text: "No puedes registrar nuevos domicilios hasta la próxima jornada.",
        confirmButtonColor: "#2563eb",
      });
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

      let clienteExistente = (clientesExistentes || []).find(
        (cliente) => String(cliente.telefono || "").trim() === telefonoCliente,
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
      // DATOS FINALES DEL CLIENTE
      // ==========================================
      // Si el cliente ya existe, SIEMPRE usamos sus datos reales.
      // Así no se guarda en el domicilio un nombre/dirección
      // diferente al cliente encontrado por teléfono.

      let clienteId = clienteExistente?.id;
      let clienteNombreFinal =
        clienteExistente?.nombre || formData.cliente.trim();
      let clienteTelefonoFinal = clienteExistente?.telefono || telefonoCliente;
      let clienteDireccionFinal =
        clienteExistente?.direccion || formData.direccion.trim();

      // ==========================================
      // CREAR CLIENTE SOLO SI NO EXISTE
      // ==========================================

      if (clienteExistente) {
        // Si el teléfono ya pertenece a un cliente que está disponible
        // en esta organización (incluyendo clientes compartidos),
        // podemos reutilizarlo.
        //
        // Solo bloqueamos cuando el usuario intenta registrar OTRO
        // nombre con ese mismo teléfono.
        const nombreEsElMismo =
          String(clienteNombreFinal || "")
            .trim()
            .toLowerCase() ===
          String(formData.cliente || "")
            .trim()
            .toLowerCase();

        if (!nombreEsElMismo) {
          await Swal.fire({
            icon: "warning",
            title: "Teléfono ya registrado",
            html: `El teléfono <b>${telefonoCliente}</b> ya está registrado para <b>${clienteNombreFinal}</b>.<br><br>Si quieres usar este cliente, selecciona <b>${clienteNombreFinal}</b>. Para crear otro cliente debes usar un teléfono diferente.`,
            confirmButtonText: "Entendido",
          });
          setError("");
          return;
        }

        // Es el mismo cliente: reutilizarlo sin crear otro registro.
        console.log("✅ CLIENTE EXISTENTE REUTILIZADO:", clienteExistente);
      }

      if (!clienteExistente) {
        console.log("⚠️ CLIENTE NO ENCONTRADO.");
        console.log("Organización buscada:", organizacionSeleccionada);
        console.log("Teléfono buscado:", telefonoCliente);

        const { data: nuevoClienteRespuesta, error: clienteError } =
          await supabase.rpc("crear_cliente_para_organizacion", {
            p_nombre: formData.cliente.trim(),
            p_telefono: telefonoCliente,
            p_direccion: formData.direccion.trim(),
            p_organizacion_id: organizacionSeleccionada,
          });

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

        // El RPC puede devolver un objeto o un arreglo de una fila,
        // dependiendo de cómo esté definida la función en Supabase.
        let nuevoCliente = Array.isArray(nuevoClienteRespuesta)
          ? nuevoClienteRespuesta[0]
          : nuevoClienteRespuesta;

        // Si el RPC creó el cliente pero no devolvió la fila completa,
        // la recuperamos por teléfono para no perder el cliente creado.
        if (!nuevoCliente?.id) {
          const { data: clienteRecuperado, error: errorRecuperandoCliente } =
            await supabase.rpc("buscar_clientes_para_organizacion", {
              p_organizacion_id: organizacionSeleccionada,
              p_busqueda: telefonoCliente,
            });

          if (errorRecuperandoCliente) {
            console.error(
              "Error recuperando el cliente recién creado:",
              errorRecuperandoCliente,
            );
            setError(
              "El cliente pudo haberse creado, pero no se pudo verificar.",
            );
            return;
          }

          nuevoCliente = (clienteRecuperado || []).find(
            (cliente) =>
              String(cliente.telefono || "").trim() === telefonoCliente,
          );
        }

        if (!nuevoCliente?.id) {
          console.error(
            "El cliente no pudo ser recuperado después de crearlo:",
            nuevoClienteRespuesta,
          );

          setError(
            "No se pudo confirmar el registro del cliente. El domicilio no fue creado.",
          );
          return;
        }

        clienteExistente = nuevoCliente;
        clienteId = nuevoCliente.id;
        clienteNombreFinal = nuevoCliente.nombre || formData.cliente.trim();
        clienteTelefonoFinal = nuevoCliente.telefono || telefonoCliente;
        clienteDireccionFinal =
          nuevoCliente.direccion || formData.direccion.trim();

        console.log("✅ CLIENTE REALMENTE NUEVO:", nuevoCliente);

        // ==========================================
        // NOTIFICAR SOLO SI SE CREÓ UN CLIENTE NUEVO
        // ==========================================

        await registrarActividadYNotificar({
          usuarioId: usuario.id,
          tipo: "cliente",
          accion: "crear",
          descripcion: `Agregó al nuevo cliente ${clienteNombreFinal}.`,
          referenciaId: clienteId,
          organizacionId: organizacionSeleccionada,
        });
      } else {
        console.log("✅ CLIENTE YA EXISTÍA:", clienteExistente);

        // Reflejar los datos reales del cliente seleccionado
        // en el formulario antes de guardar el domicilio.
        setFormData((prev) => ({
          ...prev,
          cliente: clienteNombreFinal,
          telefono: clienteTelefonoFinal,
          direccion: clienteDireccionFinal,
        }));
      }

      // ==========================================
      // DEBUG DEL DOMICILIO
      // ==========================================

      console.log("========== DEBUG DOMICILIO ==========");
      console.log("AUTH USER:", usuario?.id);
      console.log("ORGANIZACIÓN SELECCIONADA:", organizacionSeleccionada);
      console.log("CLIENTE ID:", clienteId);
      console.log("CLIENTE NOMBRE:", clienteNombreFinal);
      console.log("CLIENTE TELÉFONO:", clienteTelefonoFinal);
      console.log("CLIENTE DIRECCIÓN:", clienteDireccionFinal);
      console.log("====================================");

      // ==========================================
      // GUARDAR DOMICILIO
      // ==========================================

      const { data: domicilioCreado, error: domicilioError } = await supabase
        .from("domicilios")
        .insert([
          {
            numero_factura: numeroFactura,
            cliente: clienteNombreFinal,
            telefono: clienteTelefonoFinal,
            direccion: clienteDireccionFinal,
            costo: Number(formData.valor),
            // La propina se registra desde el momento en que el domiciliario
            // crea el domicilio. Si no se ingresa, se almacena como 0.
            propina: Math.max(Number(formData.propina) || 0, 0),
            // El método de pago se define posteriormente,
            // cuando el domicilio sea entregado.
            metodo_pago: null,
            observaciones: formData.observaciones,
            fecha: obtenerFechaLocal(),
            // Todo domicilio nuevo inicia su recorrido como En camino.
            // Los reportes creados desde este formulario mantienen
            // el estado forzado "Reportado".
            estado: estadoForzado || "En camino",

            domiciliario_id: usuario.id,

            // Organización desde la que salió físicamente el domicilio.
            organizacion_origen_id: organizacionSeleccionada,

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
        accion: estadoForzado === "Reportado" ? "reportar" : "crear",
        descripcion:
          estadoForzado === "Reportado"
            ? `Reportó el domicilio del cliente ${formData.cliente}. Motivo: ${reporteData.motivo}.`
            : `Registró el domicilio de ${formData.cliente}.`,
        referenciaId: domicilioCreado.id,
        organizacionId: organizacionSeleccionada,
      });

      // ==========================================
      // CREAR / ACUMULAR PENDIENTE
      // ==========================================
      if (estadoForzado === "Reportado") {
        const { error: reporteError } = await supabase.from("reportes").insert([
          {
            usuario_id: usuario.id,
            domicilio_id: domicilioCreado.id,
            descripcion: `${reporteData.motivo}: ${
              reporteData.observaciones || ""
            }`,
            estado: "Pendiente",
          },
        ]);

        if (reporteError) {
          console.error("Error creando reporte:", reporteError);

          await Swal.fire({
            icon: "warning",
            title: "Domicilio guardado",
            text: "El domicilio se guardó como reportado, pero no se pudo crear el registro del reporte.",
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
        text:
          estadoForzado === "Reportado"
            ? "El domicilio fue registrado como reportado."
            : "El domicilio fue registrado y quedó En camino.",
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
  const obtenerNombreOrganizacionOrigen = (id) => {
    const organizacion = organizaciones.find((item) => item.id === id);
    return organizacion?.nombre || "Sin origen";
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

      // =====================================================
      // ORGANIZACIONES REALMENTE ASIGNADAS AL USUARIO
      // =====================================================
      // No se deben mostrar todas las organizaciones de la principal.
      // El acceso debe depender de una asignación directa o de una
      // relación activa en usuarios_organizaciones.
      const ids = new Set();

      if (usuarioActual?.organizacion_id) {
        ids.add(usuarioActual.organizacion_id);
      }

      const { data: vinculaciones, error: vinculacionesError } = await supabase
        .from("usuarios_organizaciones")
        .select("organizacion_id, rol, estado")
        .eq("usuario_id", usuario.id)
        .eq("estado", "activo");

      if (vinculacionesError) {
        console.error(
          "Error obteniendo organizaciones vinculadas:",
          vinculacionesError,
        );
        setOrganizaciones([]);
        setOrganizacionSeleccionada("");
        return;
      }

      (vinculaciones || []).forEach((relacion) => {
        if (relacion.organizacion_id) {
          ids.add(relacion.organizacion_id);
        }
      });

      const idsArray = [...ids];

      if (!idsArray.length) {
        console.error("El usuario no tiene organizaciones asignadas.");
        setOrganizaciones([]);
        setOrganizacionSeleccionada("");
        return;
      }

      const { data: organizacionesAsignadas, error: organizacionesError } =
        await supabase
          .from("organizaciones")
          .select("id, nombre, estado, organizacion_principal_id")
          .in("id", idsArray)
          .eq("estado", "activa")
          .order("nombre", { ascending: true });

      if (organizacionesError) {
        console.error(
          "Error obteniendo organizaciones asignadas:",
          organizacionesError,
        );
        setOrganizaciones([]);
        setOrganizacionSeleccionada("");
        return;
      }

      const organizacionesDisponibles = organizacionesAsignadas || [];

      setOrganizaciones(organizacionesDisponibles);

      // Mantener la organización actual si sigue disponible.
      if (
        organizacionSeleccionada &&
        organizacionesDisponibles.some(
          (organizacion) => organizacion.id === organizacionSeleccionada,
        )
      ) {
        return;
      }

      if (
        usuarioActual?.organizacion_id &&
        organizacionesDisponibles.some(
          (organizacion) => organizacion.id === usuarioActual.organizacion_id,
        )
      ) {
        setOrganizacionSeleccionada(usuarioActual.organizacion_id);
      } else if (organizacionesDisponibles.length === 1) {
        setOrganizacionSeleccionada(organizacionesDisponibles[0].id);
      } else {
        setOrganizacionSeleccionada("");
      }

      console.log("ORGANIZACIONES ASIGNADAS:", organizacionesDisponibles);
    } catch (error) {
      console.error("Error inesperado cargando organizaciones:", error);
      setOrganizaciones([]);
      setOrganizacionSeleccionada("");
    }
  };

  // =====================================================
  // CONFIGURACIÓN DE JORNADA POR ORGANIZACIÓN
  // =====================================================

  const evaluarJornada = async (organizacionId) => {
    if (!organizacionId) {
      setCierreAutomaticoMinutos(null);
      setJornadaFinalizada(false);
      setCargandoConfiguracionJornada(false);
      return;
    }

    setCargandoConfiguracionJornada(true);

    try {
      const { data, error } = await supabase
        .from("configuraciones_organizacion")
        .select(
          "horario_activo, hora_inicio, hora_fin, dias_trabajo, meses_trabajo, cierre_automatico_minutos",
        )
        .eq("organizacion_id", organizacionId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      // Sin configuración: permitir el comportamiento normal y mostrar
      // el cierre manual.
      if (!data) {
        setCierreAutomaticoMinutos(null);
        setJornadaFinalizada(false);
        return;
      }

      const autoMinutos =
        data.cierre_automatico_minutos === null ||
        data.cierre_automatico_minutos === undefined
          ? null
          : Number(data.cierre_automatico_minutos);

      setCierreAutomaticoMinutos(autoMinutos);

      if (data.horario_activo === false) {
        setJornadaFinalizada(false);
        return;
      }

      const ahora = new Date();

      const partes = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Bogota",
        weekday: "long",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(ahora);

      const obtenerParte = (tipo) =>
        partes.find((parte) => parte.type === tipo)?.value || "";

      const mapaDias = {
        Monday: "lunes",
        Tuesday: "martes",
        Wednesday: "miercoles",
        Thursday: "jueves",
        Friday: "viernes",
        Saturday: "sabado",
        Sunday: "domingo",
      };

      const mapaMeses = {
        January: "enero",
        February: "febrero",
        March: "marzo",
        April: "abril",
        May: "mayo",
        June: "junio",
        July: "julio",
        August: "agosto",
        September: "septiembre",
        October: "octubre",
        November: "noviembre",
        December: "diciembre",
      };

      const diaActual = mapaDias[obtenerParte("weekday")];
      const mesActual = mapaMeses[obtenerParte("month")];

      const diasTrabajo = data.dias_trabajo || {};
      const mesesTrabajo = data.meses_trabajo || {};

      if (diaActual && diasTrabajo[diaActual] === false) {
        setJornadaFinalizada(true);
        return;
      }

      if (mesActual && mesesTrabajo[mesActual] === false) {
        setJornadaFinalizada(true);
        return;
      }

      const horaActual = Number(obtenerParte("hour"));
      const minutoActual = Number(obtenerParte("minute"));
      const minutosActuales = horaActual * 60 + minutoActual;

      const [inicioH = 0, inicioM = 0] = String(data.hora_inicio || "08:00")
        .slice(0, 5)
        .split(":")
        .map(Number);

      const [finH = 18, finM = 0] = String(data.hora_fin || "18:00")
        .slice(0, 5)
        .split(":")
        .map(Number);

      const minutosInicio = inicioH * 60 + inicioM;
      const minutosFin = finH * 60 + finM;

      // Con cierre automático, la jornada termina después de la tolerancia.
      // Sin cierre automático, termina exactamente en hora_fin.
      const minutosLimite =
        minutosFin + (autoMinutos === null ? 0 : autoMinutos);

      setJornadaFinalizada(
        minutosActuales < minutosInicio || minutosActuales >= minutosLimite,
      );
    } catch (error) {
      console.error("Error evaluando la jornada:", error);
      // En caso de error no bloqueamos por una decisión de frontend.
      // El backend/RLS sigue siendo la autoridad.
      setCierreAutomaticoMinutos(null);
      setJornadaFinalizada(false);
    } finally {
      setCargandoConfiguracionJornada(false);
    }
  };

  useEffect(() => {
    if (!usuario?.id) return;

    cargarOrganizaciones();
  }, [usuario?.id]);

  useEffect(() => {
    if (!organizacionSeleccionada) {
      setCierreAutomaticoMinutos(null);
      setJornadaFinalizada(false);
      setCargandoConfiguracionJornada(false);
      setDomicilios([]);
      return;
    }

    evaluarJornada(organizacionSeleccionada);
    cargarDomicilios(organizacionSeleccionada);

    const intervalo = window.setInterval(() => {
      evaluarJornada(organizacionSeleccionada);
    }, 60 * 1000);

    return () => window.clearInterval(intervalo);
  }, [organizacionSeleccionada]);

  const entregarDomicilioEnCamino = async (domicilio) => {
    if (!domicilio || domicilio.estado !== "En camino") return;

    // ==========================================
    // 1. CONFIRMAR ENTREGA
    // ==========================================

    const confirmacion = await Swal.fire({
      icon: "question",
      title: "¿Ya se entregó el domicilio?",
      html: `
      <div style="font-size: 14px; color: #64748b;">
        <strong>${domicilio.cliente}</strong><br/>
        ${domicilio.direccion}
      </div>
    `,
      showCancelButton: true,
      confirmButtonText: "Sí, ya se entregó",
      cancelButtonText: "Todavía no",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
    });

    if (!confirmacion.isConfirmed) return;

    // ==========================================
    // 2. SELECCIONAR MÉTODO DE PAGO
    // ==========================================

    const metodoPago = await Swal.fire({
      icon: "info",
      title: "Método de pago",
      text: "Selecciona cómo pagó el cliente.",
      input: "select",
      inputOptions: {
        Efectivo: "Efectivo",
        Transferencia: "Transferencia",
        Datáfono: "Datáfono",
        Otro: "Otro",
      },
      inputPlaceholder: "Selecciona un método",
      showCancelButton: true,
      confirmButtonText: "Continuar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
      inputValidator: (value) => {
        if (!value) {
          return "Debes seleccionar un método de pago.";
        }
      },
    });

    if (!metodoPago.isConfirmed) return;

    const metodoSeleccionado = metodoPago.value;

    // ==========================================
    // 3. SI ES TRANSFERENCIA → PREGUNTAR POR
    //    EL COMPROBANTE ANTES DE ACTUALIZAR
    // ==========================================

    if (metodoSeleccionado === "Transferencia") {
      const comprobante = await Swal.fire({
        icon: "question",
        title: "¿Deseas subir el comprobante?",
        text: "Puedes tomar una foto o seleccionar una imagen de la galería.",
        showCancelButton: true,
        confirmButtonText: "Sí, subir comprobante",
        cancelButtonText: "Ahora no",
        confirmButtonColor: "#2563eb",
        cancelButtonColor: "#64748b",
      });

      if (comprobante.isConfirmed) {
        // Guardamos temporalmente la entrega.
        setEntregaPendienteComprobante({
          domicilio,
          metodoPago: metodoSeleccionado,
        });

        setDomicilioSeleccionado(domicilio);

        // Abrimos las opciones de cámara / galería.
        setMostrarComprobante(true);

        // IMPORTANTE:
        // Aquí paramos la función.
        // La continuación se hará cuando termine tomarFoto().
        return;
      }
    }

    // ==========================================
    // 4. SI NO HAY COMPROBANTE,
    //    FINALIZAMOS DIRECTAMENTE
    // ==========================================

    await finalizarEntregaDomicilio(domicilio, metodoSeleccionado);
  };
  const finalizarEntregaDomicilio = async (domicilio, metodoSeleccionado) => {
    const nuevoEstado =
      metodoSeleccionado === "Otro" ? "Pendiente" : "Entregado";

    // ==========================================
    // ACTUALIZAR DOMICILIO
    // ==========================================

    const { data: domicilioActualizado, error } = await supabase
      .from("domicilios")
      .update({
        metodo_pago: metodoSeleccionado,
        estado: nuevoEstado,
      })
      .eq("id", domicilio.id)
      .eq("organizacion_id", organizacionSeleccionada)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando entrega:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo actualizar el estado del domicilio.",
        confirmButtonColor: "#2563eb",
      });

      return;
    }

    // ==========================================
    // SI ES "OTRO" → CREAR PENDIENTE
    // ==========================================

    if (metodoSeleccionado === "Otro") {
      const { error: pendienteError } = await supabase.rpc(
        "crear_o_acumular_pendiente",
        {
          p_cliente: domicilio.cliente,
          p_telefono: domicilio.telefono,
          p_direccion: domicilio.direccion,
          p_monto: Number(domicilio.costo),
          p_domicilio_id: domicilio.id,
        },
      );

      if (pendienteError) {
        console.error(
          "Error creando pendiente después de entregar:",
          pendienteError,
        );
      }
    }

    // ==========================================
    // REGISTRAR ACTIVIDAD
    // ==========================================

    await registrarActividadYNotificar({
      usuarioId: usuario.id,
      tipo: "domicilio",
      accion: "entregar",
      descripcion: `Entregó el domicilio del cliente ${domicilio.cliente}. Método de pago: ${metodoSeleccionado}. Estado: ${nuevoEstado}.`,
      referenciaId: domicilio.id,
      organizacionId: organizacionSeleccionada,
    });

    // ==========================================
    // ACTUALIZAR PANTALLA
    // ==========================================

    setDomicilioSeleccionado(domicilioActualizado);

    setDomicilios((prev) =>
      prev.map((item) =>
        item.id === domicilioActualizado.id ? domicilioActualizado : item,
      ),
    );

    // ==========================================
    // ALERTA FINAL
    // ==========================================

    await Swal.fire({
      icon: "success",
      title: "Domicilio entregado",
      html: `
      <div style="font-size: 14px; color: #64748b;">
        <strong>${domicilio.cliente}</strong><br/><br/>
        Método de pago:
        <strong>${metodoSeleccionado}</strong><br/>
        Estado:
        <strong>${nuevoEstado}</strong>
      </div>
    `,
      confirmButtonText: "Aceptar",
      confirmButtonColor: "#2563eb",
    });
  };
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
  const abrirReporteNuevo = () => {
    if (
      !formData.cliente.trim() ||
      !formData.direccion.trim() ||
      !formData.telefono.trim() ||
      !formData.valor ||
      !organizacionSeleccionada
    ) {
      setSubmitted(true);
      setError("Completa los datos del domicilio antes de reportarlo.");
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
    setDomicilioSeleccionado(null);

    setReporteData({
      motivo: "",
      observaciones: "",
    });

    setModalReporte(true);
  };
  const confirmarReporte = async () => {
    if (!domicilioSeleccionado) {
      if (!reporteData.motivo) {
        Swal.fire({
          icon: "warning",
          title: "Selecciona un motivo",
          text: "Debes indicar por qué se reporta el domicilio.",
          confirmButtonColor: "#2563eb",
        });

        return;
      }

      setModalReporte(false);

      await guardarDomicilio(null, "Reportado");

      return;
    }

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

    await Swal.fire({
      icon: "success",
      title: "Comprobante subido",
      text: "La foto fue subida correctamente",
      confirmButtonColor: "#2563eb",
    });

    e.target.value = "";

    // ==========================================
    // FINALIZAR ENTREGA DESPUÉS DEL COMPROBANTE
    // ==========================================

    if (entregaPendienteComprobante) {
      const { domicilio, metodoPago } = entregaPendienteComprobante;

      setEntregaPendienteComprobante(null);

      await finalizarEntregaDomicilio(domicilio, metodoPago);
    }
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

    if (!metodoPagoSolucion) {
      Swal.fire({
        icon: "warning",
        title: "Método de pago requerido",
        text: "Selecciona el método de pago para solucionar el domicilio.",
        confirmButtonColor: "#2563eb",
        customClass: {
          container: styles.swalSobreModal,
        },
      });

      return;
    }

    const estadoAnterior = domicilioSeleccionado.estado;

    const nuevoEstado =
      metodoPagoSolucion === "Otro" ? "Pendiente" : "Entregado";

    const { data: domicilioActualizado, error: errorActualizacion } =
      await supabase
        .from("domicilios")
        .update({
          metodo_pago: metodoPagoSolucion,
          estado: nuevoEstado,
        })
        .eq("id", domicilioSeleccionado.id)
        .select()
        .single();

    if (errorActualizacion) {
      console.error("Error solucionando domicilio:", errorActualizacion);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo actualizar el domicilio.",
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
      descripcion: `Domiciliario ${usuario.nombre} solucionó el domicilio reportado del cliente ${domicilioSeleccionado.cliente}. El método de pago quedó como ${metodoPagoSolucion} y el estado cambió de ${estadoAnterior} a ${nuevoEstado}.`,
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
    setMetodoPagoSolucion("");

    Swal.fire({
      icon: "success",
      title: "Domicilio solucionado",
      text: `El domicilio ahora está ${nuevoEstado}.`,
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
      estado: domicilioSeleccionado.estado || "Pendiente",
      organizacion_origen_id:
        domicilioSeleccionado.organizacion_origen_id ||
        organizacionSeleccionada ||
        "",
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

    const { data: domicilioConOrigen, error: errorOrigen } = await supabase
      .from("domicilios")
      .update({
        organizacion_origen_id:
          datosEdicion.organizacion_origen_id || organizacionSeleccionada,
      })
      .eq("id", domicilioSeleccionado.id)
      .eq("organizacion_id", organizacionSeleccionada)
      .select()
      .single();

    if (errorOrigen) {
      console.error("Error actualizando origen del domicilio:", errorOrigen);
      setEditandoDomicilio(false);

      Swal.fire({
        icon: "error",
        title: "No se pudo actualizar el origen",
        text: "El domicilio se actualizó, pero no fue posible guardar de dónde salió.",
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
      prev.map((domicilio) =>
        domicilio.id === domicilioConOrigen.id ? domicilioConOrigen : domicilio,
      ),
    );

    setDomicilioSeleccionado(domicilioConOrigen);
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

  const abrirSolucionReporte = async (domicilio) => {
    if (!domicilio || domicilio.estado !== "Reportado") return;

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
        confirmButtonColor: "#2563eb",
      });

      return;
    }

    setDomicilioSeleccionado({
      ...domicilio,
      reporte_descripcion: reporte?.descripcion || "Problema reportado",
    });

    setMetodoPagoSolucion("");
    setModalSolucionReportado(true);
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
          {!cargandoConfiguracionJornada &&
            cierreAutomaticoMinutos === null && (
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
            )}

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

                      setCargandoConfiguracionJornada(true);
                      setCierreAutomaticoMinutos(null);
                      setJornadaFinalizada(false);
                      setOrganizacionSeleccionada(organizacionId);

                      if (!organizacionId) {
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
                  <div className={styles.lqFormActions}>
                    <button
                      type="button"
                      className={styles.lqReportButton}
                      onClick={abrirReporteNuevo}
                    >
                      Reportar Domicilio
                    </button>

                    <button type="submit" className={styles.lqSaveButton}>
                      Guardar Domicilio
                    </button>
                  </div>
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
                        <th>Origen</th>
                        <th>Valor</th>
                        <th>Método Pago</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {domicilios.map((domicilio) => (
                        <tr key={domicilio.id}>
                          <td>{domicilio.numero_factura}</td>

                          <td>{domicilio.cliente}</td>

                          <td>{domicilio.telefono}</td>

                          <td>{domicilio.direccion}</td>

                          <td>
                            {obtenerNombreOrganizacionOrigen(
                              domicilio.organizacion_origen_id,
                            )}
                          </td>

                          <td>
                            ${Number(domicilio.costo).toLocaleString("es-CO")}
                          </td>

                          <td>{domicilio.metodo_pago}</td>

                          <td>
                            <span
                              className={
                                domicilio.estado === "En camino"
                                  ? styles.lqEstadoEnCamino
                                  : domicilio.estado === "Pagado"
                                    ? styles.lqEstadoPagado
                                    : domicilio.estado === "Cancelado"
                                      ? styles.lqEstadoCancelado
                                      : domicilio.estado === "Reportado"
                                        ? styles.lqEstadoReportado
                                        : styles.lqEstadoPendiente
                              }
                              onClick={(e) => {
                                e.stopPropagation();

                                if (domicilio.estado === "En camino") {
                                  entregarDomicilioEnCamino(domicilio);
                                  return;
                                }

                                if (domicilio.estado === "Reportado") {
                                  abrirSolucionReporte(domicilio);
                                  return;
                                }
                              }}
                              style={{
                                cursor:
                                  domicilio.estado === "En camino" ||
                                  domicilio.estado === "Reportado"
                                    ? "pointer"
                                    : "default",
                              }}
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
                                    metodo_pago: domicilio.metodo_pago || "",
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

                <div className={styles.lqEditField}>
                  <label>Salió desde</label>

                  <input
                    type="text"
                    value={obtenerNombreOrganizacionOrigen(
                      datosEdicion.organizacion_origen_id ||
                        organizacionSeleccionada,
                    )}
                    disabled
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
          <div
            className={`${styles.lqModal} ${styles.lqModalSolucionReportado}`}
          >
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
                  <span>Dirección</span>
                  <strong>{domicilioSeleccionado.direccion}</strong>
                </div>

                <div>
                  <span>Teléfono</span>
                  <strong>{domicilioSeleccionado.telefono}</strong>
                </div>
              </div>

              <div className={styles.lqEditField}>
                <label>Método de pago</label>

                <select
                  value={metodoPagoSolucion}
                  onChange={(e) => setMetodoPagoSolucion(e.target.value)}
                >
                  <option value="">Seleccione método de pago</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Datáfono">Datáfono</option>
                  <option value="Otro">Otro</option>
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
                  setMetodoPagoSolucion("");
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={styles.lqEditSave}
                onClick={solucionarDomicilioReportado}
              >
                Solucionar domicilio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
