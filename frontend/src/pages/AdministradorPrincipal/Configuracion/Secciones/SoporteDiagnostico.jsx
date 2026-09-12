import { useEffect, useState } from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  WrenchScrewdriverIcon,
  ComputerDesktopIcon,
  InformationCircleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import {
  CATALOGO_ERRORES,
  interpretarError,
} from "../../../../services/sistema/catalogoErrores";
import { obtenerPoliticaReparacion } from "../../../../services/sistema/politicaReparaciones";
import styles from "./SoporteDiagnostico.module.css";
import { supabase } from "../../../../config/supabase";
import { registrarIncidente } from "../../../../services/sistema/incidenteService";
import {
  obtenerIncidentes,
  actualizarEstadoIncidente,
} from "../../../../services/sistema/incidenteService";
import {
  ejecutarReparacion,
  obtenerReparacionesIncidente,
} from "../../../../services/sistema/reparacionService";
const crearPrueba = (id, nombre, descripcion) => ({
  id,
  nombre,
  descripcion,
  estado: "pendiente",
  mensaje: descripcion,
  errorTecnico: null,
});
const pruebasIniciales = [
  crearPrueba(
    "conexion",
    "Conexión con el servidor",
    "Comprobando comunicación con Liquisistema.",
  ),
  crearPrueba(
    "sesion",
    "Autenticación",
    "Verificando la sesión del usuario actual.",
  ),
  crearPrueba(
    "usuario",
    "Usuario actual",
    "Comprobando que el usuario exista correctamente en el sistema.",
  ),
  crearPrueba(
    "organizacion",
    "Organización",
    "Verificando el acceso a la organización actual.",
  ),
  crearPrueba(
    "base_datos",
    "Base de datos",
    "Verificando disponibilidad de los datos.",
  ),
  crearPrueba(
    "configuracion",
    "Configuración",
    "Comprobando la configuración de la organización.",
  ),
];

function SoporteDiagnostico() {
  const [diagnosticando, setDiagnosticando] = useState(false);
  const [mostrarTecnico, setMostrarTecnico] = useState(false);
  const [pruebaExpandida, setPruebaExpandida] = useState(null);
  const [ultimaComprobacion, setUltimaComprobacion] = useState(null);
  const [pruebas, setPruebas] = useState(pruebasIniciales);
  const [incidentes, setIncidentes] = useState([]);
  const [cargandoIncidentes, setCargandoIncidentes] = useState(false);
  const [estadoSistema, setEstadoSistema] = useState("pendiente");
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState(null);
  const [problemas, setProblemas] = useState([]);
  const [busquedaIncidentes, setBusquedaIncidentes] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroGravedad, setFiltroGravedad] = useState("todas");
  const [datosDiagnostico, setDatosDiagnostico] = useState({
    usuario: null,
    organizacionId: null,
  });
  const [reparandoIncidente, setReparandoIncidente] = useState(null);
  const [resultadoReparacion, setResultadoReparacion] = useState({});
  const totalPendientes = incidentes.filter(
    (incidente) => incidente.estado === "pendiente",
  ).length;
  const [historialReparaciones, setHistorialReparaciones] = useState({});
  const totalRevision = incidentes.filter(
    (incidente) => incidente.estado === "en_revision",
  ).length;

  const totalResueltos = incidentes.filter(
    (incidente) => incidente.estado === "resuelto",
  ).length;

  const totalCriticos = incidentes.filter(
    (incidente) => incidente.gravedad === "critica",
  ).length;
  const actualizarPrueba = (id, cambios) => {
    setPruebas((actuales) =>
      actuales.map((prueba) =>
        prueba.id === id
          ? {
              ...prueba,
              ...cambios,
            }
          : prueba,
      ),
    );
  };
  const totalPruebas = pruebas.length;

  const pruebasCorrectas = pruebas.filter(
    (prueba) => prueba.estado === "ok",
  ).length;

  const pruebasConProblema = pruebas.filter(
    (prueba) => prueba.estado === "error",
  ).length;

  const pruebasOmitidas = pruebas.filter(
    (prueba) => prueba.estado === "omitido",
  ).length;
  const pruebasConError = pruebas.filter((prueba) => prueba.estado === "error");
  const problemasCriticos = problemas.filter(
    (problema) => problema.gravedad === "critica",
  ).length;

  const problemasAlta = problemas.filter(
    (problema) => problema.gravedad === "alta",
  ).length;

  const problemasMedia = problemas.filter(
    (problema) => problema.gravedad === "media",
  ).length;
  const incidentesPendientes = incidentes.filter(
    (incidente) =>
      incidente.estado === "pendiente" || incidente.estado === "en_revision",
  );

  const incidentesCriticosPendientes = incidentesPendientes.filter(
    (incidente) => incidente.gravedad === "critica",
  );

  const totalIncidentesPendientes = incidentesPendientes.length;

  const totalIncidentesCriticosPendientes = incidentesCriticosPendientes.length;
  const estadoResumen =
    totalIncidentesCriticosPendientes > 0
      ? "critical"
      : problemasCriticos > 0
        ? "critical"
        : totalIncidentesPendientes > 0
          ? "warning"
          : estadoSistema;
  const crearProblema = ({
    error = null,
    tipo = "UNKNOWN",
    codigo = null,
    titulo = null,
    descripcion = null,
    solucion = null,
    gravedad = null,
  }) => {
    const interpretado = interpretarError(error, tipo);

    return {
      codigo: codigo || interpretado.codigo,
      titulo: titulo || interpretado.titulo,
      descripcion: descripcion || interpretado.descripcion,
      solucion: solucion || interpretado.solucion,
      gravedad: gravedad || interpretado.gravedad,
      errorTecnico: interpretado.errorTecnico,
    };
  };
  const repararIncidente = async (incidente) => {
    const politica = obtenerPoliticaReparacion(incidente.codigo_error);

    // ==========================================
    // SEGURIDAD
    // ==========================================

    if (
      incidente.estado !== "pendiente" ||
      politica.nivel !== "reparable" ||
      !politica.accion
    ) {
      return;
    }

    setReparandoIncidente(incidente.id);

    setResultadoReparacion((actual) => ({
      ...actual,
      [incidente.id]: null,
    }));

    try {
      const resultado = await ejecutarReparacion({
        incidenteId: incidente.id,
        codigoError: incidente.codigo_error,
        contexto: incidente.contexto || {},
      });

      setResultadoReparacion((actual) => ({
        ...actual,
        [incidente.id]: resultado,
      }));
    } catch (error) {
      console.error("[LIQUISISTEMA] Error ejecutando reparación:", error);

      setResultadoReparacion((actual) => ({
        ...actual,
        [incidente.id]: {
          exito: false,
          ejecutada: false,
          mensaje: "No fue posible ejecutar la reparación.",
          errorTecnico: error?.message || String(error),
        },
      }));
    } finally {
      setReparandoIncidente(null);
    }
  };
  const registrarProblemaComoIncidente = async (
    problema,
    { error = null, prueba = null, operacion = null, contexto = {} } = {},
  ) => {
    try {
      await registrarIncidente({
        codigoError: problema.codigo,

        titulo: problema.titulo,
        descripcion: problema.descripcion,
        solucion: problema.solucion,
        gravedad: problema.gravedad,

        pagina: typeof window !== "undefined" ? window.location.pathname : null,

        componente: "SoporteDiagnostico",

        operacion,

        errorTecnico: problema.errorTecnico,

        contexto: {
          ...contexto,

          origen: "diagnostico_sistema",

          pruebaId: prueba,
          codigoDiagnostico: problema.codigo,

          codigoTecnico:
            error?.code || error?.status || error?.statusCode || null,
        },

        navegador:
          typeof navigator !== "undefined" ? navigator.userAgent : null,

        url: typeof window !== "undefined" ? window.location.href : null,
      });
    } catch (errorRegistro) {
      console.error(
        "[LIQUISISTEMA] El diagnóstico detectó un problema, pero no pudo registrarlo como incidente:",
        errorRegistro,
      );
    }
  };
  const cambiarEstadoIncidente = async (incidenteId, estado) => {
    const resultado = await actualizarEstadoIncidente({
      incidenteId,
      estado,
    });

    if (resultado.error) {
      console.error(
        "[LIQUISISTEMA] No se pudo cambiar el estado del incidente:",
        resultado.error,
      );

      return;
    }

    setIncidentes((actuales) =>
      actuales.map((incidente) =>
        incidente.id === incidenteId
          ? {
              ...incidente,
              ...resultado.data,
            }
          : incidente,
      ),
    );
  };
  const incidentesFiltrados = incidentes.filter((incidente) => {
    const texto = busquedaIncidentes.toLowerCase().trim();

    const coincideBusqueda =
      !texto ||
      incidente.codigo_incidente?.toLowerCase().includes(texto) ||
      incidente.codigo_error?.toLowerCase().includes(texto) ||
      incidente.titulo?.toLowerCase().includes(texto) ||
      incidente.descripcion?.toLowerCase().includes(texto) ||
      incidente.error_tecnico?.toLowerCase().includes(texto);

    const coincideEstado =
      filtroEstado === "todos" || incidente.estado === filtroEstado;

    const coincideGravedad =
      filtroGravedad === "todas" || incidente.gravedad === filtroGravedad;

    return coincideBusqueda && coincideEstado && coincideGravedad;
  });
  const cargarHistorialReparaciones = async (incidenteId) => {
    const resultado = await obtenerReparacionesIncidente({
      incidenteId,
    });

    if (resultado.error) {
      console.error(
        "[LIQUISISTEMA] No se pudo cargar el historial de reparaciones:",
        resultado.error,
      );

      return;
    }

    setHistorialReparaciones((actual) => ({
      ...actual,
      [incidenteId]: resultado.data || [],
    }));
  };
  const cargarIncidentes = async () => {
    setCargandoIncidentes(true);

    const resultado = await obtenerIncidentes({
      limite: 50,
    });

    if (resultado.error) {
      console.error(
        "[LIQUISISTEMA] No se pudo cargar el historial de incidentes:",
        resultado.error,
      );

      setIncidentes([]);
      setCargandoIncidentes(false);
      return;
    }

    setIncidentes(resultado.data || []);
    setCargandoIncidentes(false);
  };
  useEffect(() => {
    cargarIncidentes();
  }, []);
  const ejecutarDiagnostico = async () => {
    if (diagnosticando) return;

    setDiagnosticando(true);
    setProblemas([]);
    setDatosDiagnostico({
      usuario: null,
      organizacionId: null,
    });

    setPruebas(
      pruebasIniciales.map((prueba) => ({
        ...prueba,
        estado: "analizando",
        mensaje: "Comprobando...",
        errorTecnico: null,
      })),
    );

    const problemasEncontrados = [];
    let organizacionDetectada = null;
    // ==========================================
    // 1. CONEXIÓN CON SUPABASE
    // ==========================================

    try {
      const inicio = performance.now();

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl) {
        throw new Error("No se encontró la URL de Supabase.");
      }

      const respuesta = await fetch(`${supabaseUrl}/auth/v1/health`, {
        method: "GET",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      const tiempo = Math.round(performance.now() - inicio);

      if (!respuesta.ok) {
        throw new Error(
          `El servidor respondió con estado HTTP ${respuesta.status}.`,
        );
      }

      actualizarPrueba("conexion", {
        estado: "ok",
        mensaje: `Servidor disponible (${tiempo} ms).`,
      });
    } catch (error) {
      console.error("Diagnóstico - conexión:", error);

      const problema = crearProblema({
        error,
        tipo: "NETWORK_ERROR",
      });

      problemasEncontrados.push(problema);

      actualizarPrueba("conexion", {
        estado: "error",
        mensaje: problema.descripcion,
        errorTecnico: problema.errorTecnico,
      });

      await registrarProblemaComoIncidente(problema, {
        error,
        prueba: "conexion",
        operacion: "diagnostico_conexion",
        contexto: {
          servicio: "Supabase",
        },
      });
    }

    // ==========================================
    // 2. SESIÓN / AUTENTICACIÓN
    // ==========================================

    let usuarioAuth = null;

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      if (!data?.user) {
        throw new Error("No existe una sesión autenticada.");
      }

      usuarioAuth = data.user;

      actualizarPrueba("sesion", {
        estado: "ok",
        mensaje: "La sesión actual está activa.",
      });
    } catch (error) {
      console.error("Diagnóstico - sesión:", error);
      const problema = crearProblema({
        error,
        tipo: "SESSION_MISSING",
      });

      problemasEncontrados.push(problema);

      actualizarPrueba("sesion", {
        estado: "error",
        mensaje: problema.descripcion,
        errorTecnico: problema.errorTecnico,
      });
      await registrarProblemaComoIncidente(problema, {
        error,
        prueba: "sesion",
        operacion: "diagnostico_sesion",
        contexto: {
          servicio: "Supabase Auth",
        },
      });
    }

    // ==========================================
    // 3. USUARIO EN public.usuarios
    // ==========================================

    let usuarioSistema = null;

    if (usuarioAuth?.id) {
      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", usuarioAuth.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(
            "La cuenta autenticada no tiene un usuario asociado en el sistema.",
          );
        }

        usuarioSistema = data;

        setDatosDiagnostico((actual) => ({
          ...actual,
          usuario: data,
        }));

        actualizarPrueba("usuario", {
          estado: "ok",
          mensaje: "El usuario está correctamente registrado.",
        });
      } catch (error) {
        console.error("Diagnóstico - usuario:", error);

        const problema = crearProblema({
          error,
          tipo: "USER_MISSING",
        });

        problemasEncontrados.push(problema);

        actualizarPrueba("usuario", {
          estado: "error",
          mensaje: problema.descripcion,
          errorTecnico: problema.errorTecnico,
        });
        await registrarProblemaComoIncidente(problema, {
          error,
          prueba: "usuario",
          operacion: "diagnostico_usuario",
          contexto: {
            tabla: "usuarios",
          },
        });
      }
    } else {
      actualizarPrueba("usuario", {
        estado: "omitido",
        mensaje: "No se puede comprobar sin una sesión activa.",
      });
    }
    // ==========================================
    // 4. ORGANIZACIÓN
    // ==========================================

    if (usuarioAuth?.id && usuarioSistema) {
      try {
        // Obtener la organización actual usando la misma
        // función que utiliza Liquisistema.
        const { data: organizacionActual, error: errorOrganizacion } =
          await supabase.rpc("usuario_actual_organizacion");

        if (errorOrganizacion) {
          throw errorOrganizacion;
        }

        if (!organizacionActual) {
          throw new Error(
            "No se pudo determinar la organización actual del usuario.",
          );
        }

        organizacionDetectada = organizacionActual;

        // Comprobar que la organización realmente existe.
        const { data: organizacion, error: errorConsultaOrganizacion } =
          await supabase
            .from("organizaciones")
            .select("id")
            .eq("id", organizacionActual)
            .maybeSingle();

        if (errorConsultaOrganizacion) {
          throw errorConsultaOrganizacion;
        }

        if (!organizacion) {
          throw new Error("La organización actual no existe en el sistema.");
        }

        // ==========================================
        // VALIDACIÓN SEGÚN EL ROL
        // ==========================================

        if (usuarioSistema.rol === "domiciliario") {
          // Los domiciliarios utilizan usuarios.organizacion_id.

          if (!usuarioSistema.organizacion_id) {
            throw new Error(
              "El domiciliario no tiene una organización asignada.",
            );
          }

          if (usuarioSistema.organizacion_id !== organizacionActual) {
            throw new Error(
              "La organización asignada al usuario no coincide con la organización actual.",
            );
          }
        }

        if (usuarioSistema.rol === "admin") {
          // Los administradores utilizan usuarios_organizaciones.

          const { data: relacion, error: errorRelacion } = await supabase
            .from("usuarios_organizaciones")
            .select("id, organizacion_id, estado")
            .eq("usuario_id", usuarioAuth.id)
            .eq("organizacion_id", organizacionActual)
            .eq("estado", "activo")
            .maybeSingle();

          if (errorRelacion) {
            throw errorRelacion;
          }

          if (!relacion) {
            throw new Error(
              "El administrador no tiene una relación activa con la organización actual.",
            );
          }
        }

        setDatosDiagnostico((actual) => ({
          ...actual,
          organizacionId: organizacionActual,
        }));

        actualizarPrueba("organizacion", {
          estado: "ok",
          mensaje:
            usuarioSistema.rol === "admin"
              ? "La organización es válida y la relación del administrador está activa."
              : "La organización es válida y coincide con la asignada al usuario.",
        });
      } catch (error) {
        console.error("Diagnóstico - organización:", error);

        const problema = crearProblema({
          error,
          tipo: "ORGANIZATION_MISSING",
          titulo: "Problema con la organización",
          descripcion:
            error?.message ||
            "No se pudo validar correctamente la organización actual.",
          solucion:
            "Revisa la relación entre el usuario y la organización. No realices cambios manuales en la base de datos.",
          gravedad: "alta",
        });

        problemasEncontrados.push(problema);

        actualizarPrueba("organizacion", {
          estado: "error",
          mensaje: problema.descripcion,
          errorTecnico: problema.errorTecnico,
        });

        await registrarProblemaComoIncidente(problema, {
          error,
          prueba: "organizacion",
          operacion: "diagnostico_organizacion",
          contexto: {
            usuarioId: usuarioAuth.id,
            rol: usuarioSistema.rol,
            organizacionDetectada: organizacionDetectada,
          },
        });
      }
    } else {
      actualizarPrueba("organizacion", {
        estado: "omitido",
        mensaje: "No se puede comprobar sin usuario activo.",
      });
    }
    // ==========================================
    // 5. BASE DE DATOS
    // ==========================================

    try {
      const tablasCriticas = [
        {
          nombre: "usuarios",
          etiqueta: "usuarios",
        },
        {
          nombre: "domicilios",
          etiqueta: "domicilios",
        },
        {
          nombre: "configuraciones_organizacion",
          etiqueta: "configuraciones_organizacion",
        },
      ];

      const resultadosTablas = [];

      for (const tabla of tablasCriticas) {
        const inicioTabla = performance.now();

        const { error } = await supabase
          .from(tabla.nombre)
          .select("id")
          .limit(1);

        const tiempoTabla = Math.round(performance.now() - inicioTabla);

        if (error) {
          resultadosTablas.push({
            ...tabla,
            estado: "error",
            error,
            tiempo: tiempoTabla,
          });
        } else {
          resultadosTablas.push({
            ...tabla,
            estado: "ok",
            error: null,
            tiempo: tiempoTabla,
          });
        }
      }

      const tablasConError = resultadosTablas.filter(
        (resultado) => resultado.estado === "error",
      );

      if (tablasConError.length > 0) {
        const primeraFalla = tablasConError[0];

        const problema = crearProblema({
          error: primeraFalla.error,
          tipo: "UNKNOWN",
          titulo: "Problema en la base de datos",
          descripcion: `La tabla "${primeraFalla.etiqueta}" no respondió correctamente.`,
          solucion:
            "Revisa la disponibilidad de la tabla y su configuración de acceso. No realices cambios manuales en la base de datos.",
          gravedad: "alta",
        });

        problemasEncontrados.push(problema);

        actualizarPrueba("base_datos", {
          estado: "error",
          mensaje: `Se detectó un problema en ${primeraFalla.etiqueta}.`,
          errorTecnico: primeraFalla.error?.message || null,
        });

        await registrarProblemaComoIncidente(problema, {
          error: primeraFalla.error,
          prueba: "base_datos",
          operacion: "diagnostico_base_datos",
          contexto: {
            tablasComprobadas: resultadosTablas.map((resultado) => ({
              tabla: resultado.etiqueta,
              estado: resultado.estado,
              tiempo: resultado.tiempo,
            })),
            tablaConError: primeraFalla.etiqueta,
          },
        });
      } else {
        actualizarPrueba("base_datos", {
          estado: "ok",
          mensaje: `Base de datos disponible. ${resultadosTablas.length} tablas comprobadas.`,
          errorTecnico: null,
        });
      }
    } catch (error) {
      console.error("Diagnóstico - base de datos:", error);

      const problema = crearProblema({
        error,
        tipo: "UNKNOWN",
        titulo: "No se pudo comprobar la base de datos",
        descripcion:
          "Liquisistema no pudo completar la comprobación de la base de datos.",
        solucion:
          "Revisa la conexión con el servidor y vuelve a ejecutar el diagnóstico.",
        gravedad: "alta",
      });

      problemasEncontrados.push(problema);

      actualizarPrueba("base_datos", {
        estado: "error",
        mensaje: problema.descripcion,
        errorTecnico: problema.errorTecnico,
      });

      await registrarProblemaComoIncidente(problema, {
        error,
        prueba: "base_datos",
        operacion: "diagnostico_base_datos",
        contexto: {
          servicio: "Supabase",
        },
      });
    }

    // ==========================================
    // 6. CONFIGURACIÓN
    // ==========================================

    const organizacionId = organizacionDetectada;

    if (organizacionId) {
      try {
        const { data, error } = await supabase
          .from("configuraciones_organizacion")
          .select(
            `
        id,
        organizacion_id,
        horario_activo,
        hora_inicio,
        hora_fin,
        dias_trabajo,
        meses_trabajo,
        periodo_estadisticas,
        periodo_reportes
      `,
          )
          .eq("organizacion_id", organizacionId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(
            "No existe configuración para la organización actual.",
          );
        }

        const problemasConfiguracion = [];

        // ==========================================
        // VALIDAR HORARIO
        // ==========================================

        if (data.horario_activo) {
          if (!data.hora_inicio || !data.hora_fin) {
            problemasConfiguracion.push(
              "El horario está activo, pero falta la hora de inicio o finalización.",
            );
          } else if (data.hora_inicio >= data.hora_fin) {
            problemasConfiguracion.push(
              "La hora de inicio debe ser anterior a la hora de finalización.",
            );
          }
        }

        // ==========================================
        // VALIDAR DÍAS DE TRABAJO
        // ==========================================

        const diasTrabajo = data.dias_trabajo || {};

        const diasActivos = Object.values(diasTrabajo).filter(
          (dia) => dia === true,
        ).length;

        if (data.horario_activo && diasActivos === 0) {
          problemasConfiguracion.push("No hay ningún día de trabajo activo.");
        }

        // ==========================================
        // VALIDAR MESES DE TRABAJO
        // ==========================================

        const mesesTrabajo = data.meses_trabajo || {};

        const mesesActivos = Object.values(mesesTrabajo).filter(
          (mes) => mes === true,
        ).length;

        if (mesesActivos === 0) {
          problemasConfiguracion.push("No hay ningún mes de trabajo activo.");
        }

        // ==========================================
        // VALIDAR PERÍODO DE ESTADÍSTICAS
        // ==========================================

        const periodosEstadisticasValidos = ["anual", "trimestral"];

        if (!periodosEstadisticasValidos.includes(data.periodo_estadisticas)) {
          problemasConfiguracion.push(
            "El período de estadísticas configurado no es válido.",
          );
        }

        // ==========================================
        // VALIDAR PERÍODO DE REPORTES
        // ==========================================

        const periodosReportesValidos = [
          "manual",
          "diario",
          "semanal",
          "mensual",
          "anual",
        ];

        if (!periodosReportesValidos.includes(data.periodo_reportes)) {
          problemasConfiguracion.push(
            "El período de reportes configurado no es válido.",
          );
        }

        // ==========================================
        // RESULTADO DE LA VALIDACIÓN
        // ==========================================

        if (problemasConfiguracion.length > 0) {
          const descripcion =
            problemasConfiguracion.length === 1
              ? problemasConfiguracion[0]
              : `Se encontraron ${problemasConfiguracion.length} problemas en la configuración de la organización.`;

          const detalleProblemas = problemasConfiguracion.join(" ");

          const problema = crearProblema({
            error: new Error(detalleProblemas),
            tipo: "CONFIG_MISSING",
            titulo: "Configuración de la organización requiere revisión",
            descripcion,
            solucion:
              "Revisa la configuración de horario, días, meses y períodos desde Configuración → Preferencias de trabajo.",
            gravedad: "media",
          });

          problemasEncontrados.push(problema);

          actualizarPrueba("configuracion", {
            estado: "error",
            mensaje: descripcion,
            errorTecnico: problema.errorTecnico,
          });

          await registrarProblemaComoIncidente(problema, {
            error: new Error(detalleProblemas),
            prueba: "configuracion",
            operacion: "diagnostico_configuracion",
            contexto: {
              tabla: "configuraciones_organizacion",
              organizacionId,
              configuracionId: data.id,
              problemas: problemasConfiguracion,
              horarioActivo: data.horario_activo,
              horaInicio: data.hora_inicio,
              horaFin: data.hora_fin,
              diasActivos,
              mesesActivos,
              periodoEstadisticas: data.periodo_estadisticas,
              periodoReportes: data.periodo_reportes,
            },
          });
        } else {
          actualizarPrueba("configuracion", {
            estado: "ok",
            mensaje:
              "La configuración está disponible y sus parámetros son válidos.",
            errorTecnico: null,
          });
        }
      } catch (error) {
        console.error("Diagnóstico - configuración:", error);

        const problema = crearProblema({
          error,
          tipo: "CONFIG_MISSING",
        });

        problemasEncontrados.push(problema);

        actualizarPrueba("configuracion", {
          estado: "error",
          mensaje: problema.descripcion,
          errorTecnico: problema.errorTecnico,
        });

        await registrarProblemaComoIncidente(problema, {
          error,
          prueba: "configuracion",
          operacion: "diagnostico_configuracion",
          contexto: {
            tabla: "configuraciones_organizacion",
            organizacionId,
          },
        });
      }
    } else {
      actualizarPrueba("configuracion", {
        estado: "omitido",
        mensaje: "No se puede comprobar sin una organización activa.",
      });
    }

    // ==========================================
    // RESULTADO FINAL
    // ==========================================

    setProblemas(problemasEncontrados);
    setUltimaComprobacion(new Date());
    const hayCriticos = problemasEncontrados.some(
      (problema) => problema.gravedad === "critica",
    );

    const hayErrores = problemasEncontrados.some(
      (problema) =>
        problema.gravedad === "alta" || problema.gravedad === "media",
    );

    if (hayCriticos) {
      setEstadoSistema("critical");
    } else if (hayErrores) {
      setEstadoSistema("warning");
    } else {
      setEstadoSistema("ok");
    }

    setDiagnosticando(false);
  };
  const irAProblema = (pruebaId) => {
    setPruebaExpandida(pruebaId);

    setTimeout(() => {
      const elemento = document.getElementById(`prueba-${pruebaId}`);

      if (elemento) {
        elemento.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 50);
  };
  const renderIconoEstado = (estado) => {
    if (estado === "ok") {
      return <CheckCircleIcon />;
    }

    if (estado === "error") {
      return <XCircleIcon />;
    }

    if (estado === "analizando") {
      return <ArrowPathIcon className={styles.girando} />;
    }

    if (estado === "omitido") {
      return <InformationCircleIcon />;
    }

    return <InformationCircleIcon />;
  };

  const getClaseEstado = (estado) => {
    if (estado === "ok") return styles.ok;
    if (estado === "error") return styles.error;
    if (estado === "analizando") return styles.analizando;
    return styles.pendiente;
  };

  const tituloEstado =
    estadoSistema === "ok"
      ? "Liquisistema funciona correctamente"
      : estadoSistema === "warning"
        ? "Se detectaron algunos problemas"
        : estadoSistema === "critical"
          ? "Se detectó un problema crítico"
          : "Diagnóstico pendiente";

  const descripcionEstado =
    estadoSistema === "ok"
      ? "Las comprobaciones realizadas no encontraron problemas."
      : estadoSistema === "warning"
        ? "Algunas comprobaciones requieren atención."
        : estadoSistema === "critical"
          ? "Una parte importante del sistema no está respondiendo correctamente."
          : "Ejecuta un diagnóstico para comprobar el estado de Liquisistema.";

  return (
    <div className={styles.contenedor}>
      {/* ENCABEZADO */}
      <div className={styles.encabezado}>
        <div>
          <span className={styles.etiqueta}>SOPORTE</span>

          <h2>Soporte y diagnóstico</h2>

          <p>
            Comprueba el estado de Liquisistema, detecta problemas y encuentra
            soluciones antes de contactar con soporte técnico.
          </p>
        </div>

        <button
          type="button"
          className={styles.botonDiagnostico}
          onClick={ejecutarDiagnostico}
          disabled={diagnosticando}
        >
          <ArrowPathIcon className={diagnosticando ? styles.girando : ""} />

          {diagnosticando ? "Analizando sistema..." : "Ejecutar diagnóstico"}
        </button>
      </div>

      {/* ESTADO GENERAL */}
      <section
        className={`${styles.estadoGeneral} ${
          estadoSistema === "warning"
            ? styles.estadoAdvertencia
            : estadoSistema === "critical"
              ? styles.estadoCritico
              : ""
        }`}
      >
        <div className={styles.estadoIcono}>
          {estadoSistema === "ok" ? (
            <CheckCircleIcon />
          ) : estadoSistema === "warning" ? (
            <ExclamationTriangleIcon />
          ) : estadoSistema === "critical" ? (
            <XCircleIcon />
          ) : (
            <InformationCircleIcon />
          )}
        </div>

        <div className={styles.estadoTexto}>
          <span className={styles.estadoEtiqueta}>ESTADO DEL SISTEMA</span>

          <h3>{tituloEstado}</h3>

          <p>{descripcionEstado}</p>
        </div>

        <span
          className={`${styles.estadoBadge} ${
            estadoSistema === "ok"
              ? styles.estadoOk
              : estadoSistema === "warning"
                ? styles.estadoWarning
                : estadoSistema === "critical"
                  ? styles.estadoCritical
                  : styles.estadoPendiente
          }`}
        >
          {estadoSistema === "ok"
            ? "Operativo"
            : estadoSistema === "warning"
              ? "Revisar"
              : estadoSistema === "critical"
                ? "Crítico"
                : "Pendiente"}
        </span>
      </section>
      {/* RESUMEN INTELIGENTE */}
      <section className={styles.seccion}>
        <div className={styles.seccionTitulo}>
          <InformationCircleIcon />

          <div>
            <h3>Resumen del estado</h3>

            <p>Resumen de las comprobaciones realizadas en Liquisistema.</p>
          </div>
        </div>

        <div className={styles.resumenSistema}>
          <div className={styles.resumenSistemaPrincipal}>
            <div
              className={`${styles.resumenSistemaIcono} ${
                estadoResumen === "ok"
                  ? styles.resumenSistemaOk
                  : estadoResumen === "warning"
                    ? styles.resumenSistemaWarning
                    : estadoResumen === "critical"
                      ? styles.resumenSistemaCritical
                      : styles.resumenSistemaPendiente
              }`}
            >
              {estadoResumen === "ok" ? (
                <CheckCircleIcon />
              ) : estadoResumen === "warning" ? (
                <ExclamationTriangleIcon />
              ) : estadoResumen === "critical" ? (
                <XCircleIcon />
              ) : (
                <InformationCircleIcon />
              )}
            </div>

            <div>
              <span>ESTADO GENERAL</span>

              <strong>
                {estadoResumen === "ok"
                  ? "Sistema operativo"
                  : estadoResumen === "warning"
                    ? "Requiere atención"
                    : estadoResumen === "critical"
                      ? "Problema crítico"
                      : "Diagnóstico pendiente"}
              </strong>

              <p>
                {estadoResumen === "critical"
                  ? totalIncidentesCriticosPendientes > 0
                    ? `Se detectó ${
                        totalIncidentesCriticosPendientes === 1
                          ? "1 incidente crítico pendiente"
                          : `${totalIncidentesCriticosPendientes} incidentes críticos pendientes`
                      } que requiere atención inmediata.`
                    : problemasCriticos > 0
                      ? `Se detectó ${
                          problemasCriticos === 1
                            ? "1 problema crítico"
                            : `${problemasCriticos} problemas críticos`
                        } durante el diagnóstico.`
                      : "El sistema presenta una condición crítica."
                  : estadoResumen === "warning"
                    ? totalIncidentesPendientes > 0
                      ? `Hay ${
                          totalIncidentesPendientes === 1
                            ? "1 incidente pendiente"
                            : `${totalIncidentesPendientes} incidentes pendientes`
                        } que requiere revisión.`
                      : pruebasConError.length > 0
                        ? `La comprobación ${
                            pruebasConError.length === 1
                              ? `"${pruebasConError[0].nombre}"`
                              : "de uno o más servicios"
                          } requiere revisión.`
                        : "Algunas comprobaciones requieren atención."
                    : estadoResumen === "ok"
                      ? "Todas las comprobaciones funcionan correctamente y no hay incidentes pendientes."
                      : "Ejecuta un diagnóstico para conocer el estado actual del sistema."}
              </p>
              {pruebasConError.length > 0 && (
                <button
                  type="button"
                  className={styles.botonVerProblema}
                  onClick={() => irAProblema(pruebasConError[0].id)}
                >
                  Ver comprobación
                </button>
              )}
            </div>
          </div>

          <div className={styles.resumenSistemaDatos}>
            <div>
              <strong>{totalPruebas}</strong>
              <span>Comprobaciones</span>
            </div>

            <div>
              <strong>{pruebasCorrectas}</strong>
              <span>Correctas</span>
            </div>

            <div>
              <strong>{pruebasConProblema}</strong>
              <span>Con problemas</span>
            </div>

            <div>
              <strong>{totalIncidentesCriticosPendientes}</strong>
              <span>Críticas pendientes</span>
            </div>
          </div>
        </div>

        <div className={styles.resumenSistemaPie}>
          <span>Última comprobación</span>

          <strong>
            {ultimaComprobacion
              ? ultimaComprobacion.toLocaleString("es-CO")
              : "Todavía no se ha ejecutado"}
          </strong>
        </div>
      </section>

      {/* DIAGNÓSTICO */}
      <section className={styles.seccion}>
        <div className={styles.seccionEncabezado}>
          <div>
            <h3>Diagnóstico del sistema</h3>
            {ultimaComprobacion && (
              <span className={styles.ultimaComprobacion}>
                Última comprobación:{" "}
                {ultimaComprobacion.toLocaleString("es-CO")}
              </span>
            )}
            <p>
              Estas comprobaciones analizan los servicios principales de
              Liquisistema.
            </p>
          </div>
        </div>

        <div className={styles.pruebas}>
          {pruebas.map((prueba) => (
            <div
              className={styles.pruebaContenedor}
              key={prueba.id}
              id={`prueba-${prueba.id}`}
            >
              <button
                type="button"
                className={styles.prueba}
                onClick={() => {
                  if (prueba.errorTecnico) {
                    setPruebaExpandida(
                      pruebaExpandida === prueba.id ? null : prueba.id,
                    );
                  }
                }}
                disabled={!prueba.errorTecnico}
              >
                <div
                  className={`${styles.pruebaIcono} ${getClaseEstado(
                    prueba.estado,
                  )}`}
                >
                  {renderIconoEstado(prueba.estado)}
                </div>

                <div>
                  <strong>{prueba.nombre}</strong>

                  <span>{prueba.mensaje || prueba.descripcion}</span>
                </div>

                <span
                  className={`${styles.pruebaEstado} ${getClaseEstado(
                    prueba.estado,
                  )}`}
                >
                  {prueba.estado === "ok"
                    ? "Correcto"
                    : prueba.estado === "error"
                      ? "Problema"
                      : prueba.estado === "analizando"
                        ? "Analizando"
                        : prueba.estado === "omitido"
                          ? "Omitido"
                          : "Pendiente"}
                </span>
              </button>

              {pruebaExpandida === prueba.id && prueba.errorTecnico && (
                <div className={styles.detalleTecnicoPrueba}>
                  <div>
                    <span>Código de diagnóstico</span>
                    <strong>{prueba.id.toUpperCase()}</strong>
                  </div>

                  <div>
                    <span>Error técnico</span>
                    <code>{prueba.errorTecnico}</code>
                  </div>

                  <div>
                    <span>Estado</span>
                    <strong>{prueba.estado}</strong>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* PROBLEMAS */}
      <section className={styles.seccion}>
        <div className={styles.seccionTitulo}>
          <ExclamationTriangleIcon />

          <div>
            <h3>Problemas detectados</h3>

            <p>
              Los problemas encontrados durante el diagnóstico aparecerán aquí.
            </p>
          </div>
        </div>

        {problemas.length === 0 ? (
          <div className={styles.sinProblemas}>
            <CheckCircleIcon />

            <strong>
              {estadoSistema === "pendiente"
                ? "Todavía no se ha ejecutado un diagnóstico"
                : "No se han detectado problemas"}
            </strong>

            <span>
              {estadoSistema === "pendiente"
                ? "Ejecuta el diagnóstico para comprobar el estado real del sistema."
                : "Liquisistema no encontró problemas que requieran atención."}
            </span>
          </div>
        ) : (
          <div className={styles.listaProblemas}>
            {problemas.map((problema) => (
              <div
                className={`${styles.problema} ${
                  problema.gravedad === "critica"
                    ? styles.problemaCritico
                    : problema.gravedad === "alta"
                      ? styles.problemaAlto
                      : styles.problemaMedio
                }`}
                key={problema.codigo}
              >
                <div className={styles.problemaCabecera}>
                  <div>
                    <strong>{problema.titulo}</strong>

                    <span>{problema.codigo}</span>
                  </div>

                  <span className={styles.gravedad}>
                    {problema.gravedad === "critica"
                      ? "Crítico"
                      : problema.gravedad === "alta"
                        ? "Alta"
                        : "Media"}
                  </span>
                  <span className={styles.estadoIncidente}>
                    {problema.gravedad === "critica"
                      ? "🔴 Crítico"
                      : problema.gravedad === "alta"
                        ? "🟠 Atención"
                        : "🟡 Revisar"}
                  </span>
                </div>

                <p>{problema.descripcion}</p>

                <div className={styles.solucion}>
                  <strong>Qué puedes hacer:</strong>

                  <span>{problema.solucion}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {/* HISTORIAL DE INCIDENTES */}
      <section className={styles.seccion}>
        <div className={styles.seccionTitulo}>
          <InformationCircleIcon />

          <div>
            <h3>Historial de incidentes</h3>

            <p>
              Consulta los errores registrados automáticamente por Liquisistema.
            </p>
          </div>
        </div>

        {/* RESUMEN */}
        <div className={styles.resumenIncidentes}>
          <div className={styles.resumenIncidente}>
            <strong>{totalPendientes}</strong>
            <span>Pendientes</span>
          </div>

          <div className={styles.resumenIncidente}>
            <strong>{totalRevision}</strong>
            <span>En revisión</span>
          </div>

          <div className={styles.resumenIncidente}>
            <strong>{totalResueltos}</strong>
            <span>Resueltos</span>
          </div>

          <div className={styles.resumenIncidente}>
            <strong>{totalCriticos}</strong>
            <span>Críticos</span>
          </div>
        </div>

        {/* FILTROS */}
        <div className={styles.filtrosIncidentes}>
          <div className={styles.busquedaIncidentes}>
            <span>🔎</span>

            <input
              type="text"
              value={busquedaIncidentes}
              onChange={(e) => setBusquedaIncidentes(e.target.value)}
              placeholder="Buscar por código, error o descripción..."
            />
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="en_revision">En revisión</option>
            <option value="resuelto">Resueltos</option>
            <option value="ignorado">Ignorados</option>
          </select>

          <select
            value={filtroGravedad}
            onChange={(e) => setFiltroGravedad(e.target.value)}
          >
            <option value="todas">Todas las gravedades</option>
            <option value="critica">Críticos</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>

        {/* ESTADOS DE CARGA */}
        {cargandoIncidentes ? (
          <div className={styles.sinProblemas}>
            <ArrowPathIcon className={styles.girando} />

            <strong>Cargando historial...</strong>

            <span>Consultando los incidentes registrados.</span>
          </div>
        ) : incidentes.length === 0 ? (
          <div className={styles.sinProblemas}>
            <CheckCircleIcon />

            <strong>No hay incidentes registrados</strong>

            <span>Liquisistema todavía no ha registrado ningún incidente.</span>
          </div>
        ) : incidentesFiltrados.length === 0 ? (
          <div className={styles.sinResultadosIncidentes}>
            <InformationCircleIcon />

            <strong>No se encontraron incidentes</strong>

            <span>
              No hay incidentes que coincidan con los filtros seleccionados.
            </span>
          </div>
        ) : (
          /* LISTA */
          <div className={styles.listaIncidentes}>
            {incidentesFiltrados.map((incidente) => (
              <div
                key={incidente.id}
                className={`${styles.incidente} ${
                  incidente.gravedad === "critica"
                    ? styles.incidenteCritico
                    : incidente.gravedad === "alta"
                      ? styles.incidenteAlto
                      : incidente.gravedad === "media"
                        ? styles.incidenteMedio
                        : styles.incidenteBajo
                }`}
              >
                {/* CABECERA */}
                <button
                  type="button"
                  className={styles.incidenteCabecera}
                  onClick={() => {
                    const abrir = incidenteSeleccionado !== incidente.id;

                    setIncidenteSeleccionado(abrir ? incidente.id : null);

                    if (abrir) {
                      cargarHistorialReparaciones(incidente.id);
                    }
                  }}
                >
                  <div className={styles.incidenteIcono}>
                    {incidente.gravedad === "critica" ? (
                      <XCircleIcon />
                    ) : incidente.gravedad === "alta" ? (
                      <ExclamationTriangleIcon />
                    ) : (
                      <InformationCircleIcon />
                    )}
                  </div>

                  <div className={styles.incidenteResumen}>
                    <strong>
                      {incidente.titulo || "Incidente del sistema"}
                    </strong>

                    <span>
                      {incidente.codigo_error} · {incidente.codigo_incidente}
                    </span>
                  </div>

                  <div className={styles.incidenteMeta}>
                    {/* GRAVEDAD */}
                    <span className={styles.gravedad}>
                      {incidente.gravedad === "critica"
                        ? "Crítico"
                        : incidente.gravedad === "alta"
                          ? "Alta"
                          : incidente.gravedad === "media"
                            ? "Media"
                            : "Baja"}
                    </span>

                    {/* ESTADO */}
                    <span
                      className={`${styles.estadoIncidente} ${
                        incidente.estado === "resuelto"
                          ? styles.estadoResuelto
                          : incidente.estado === "en_revision"
                            ? styles.estadoRevision
                            : incidente.estado === "ignorado"
                              ? styles.estadoIgnorado
                              : styles.estadoPendiente
                      }`}
                    >
                      {incidente.estado === "resuelto"
                        ? "✓ Resuelto"
                        : incidente.estado === "en_revision"
                          ? "◐ En revisión"
                          : incidente.estado === "ignorado"
                            ? "— Ignorado"
                            : "● Pendiente"}
                    </span>

                    {/* FECHA */}
                    <span>
                      {new Date(incidente.created_at).toLocaleString("es-CO")}
                    </span>
                  </div>

                  <ChevronDownIcon
                    className={
                      incidenteSeleccionado === incidente.id ? styles.rotar : ""
                    }
                  />
                </button>

                {/* DETALLE */}
                {incidenteSeleccionado === incidente.id && (
                  <div className={styles.detalleIncidente}>
                    <div className={styles.detalleIncidenteDescripcion}>
                      <span>Qué ocurrió</span>

                      <p>
                        {incidente.descripcion ||
                          "No hay una descripción disponible."}
                      </p>
                    </div>

                    {/* SOLUCIÓN */}
                    <div className={styles.solucion}>
                      <strong>Solución recomendada:</strong>

                      <span>
                        {incidente.solucion ||
                          "No hay una solución registrada para este incidente."}
                      </span>
                    </div>
                    {(() => {
                      const politica = obtenerPoliticaReparacion(
                        incidente.codigo_error,
                      );

                      const incidenteResuelto =
                        incidente.estado === "resuelto" ||
                        incidente.estado === "ignorado";

                      if (incidenteResuelto) {
                        return (
                          <div
                            className={`${styles.politicaReparacion} ${styles.politicaResuelta}`}
                          >
                            <div className={styles.politicaReparacionIcono}>
                              ✓
                            </div>

                            <div className={styles.politicaReparacionContenido}>
                              <strong>
                                {incidente.estado === "resuelto"
                                  ? "Incidente resuelto"
                                  : "Incidente ignorado"}
                              </strong>

                              <span>
                                {incidente.estado === "resuelto"
                                  ? "Este incidente ya fue gestionado y no requiere ninguna acción."
                                  : "Este incidente fue marcado como ignorado y no requiere ninguna acción."}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          className={`${styles.politicaReparacion} ${
                            politica.nivel === "reparable"
                              ? styles.politicaReparable
                              : politica.nivel === "critico"
                                ? styles.politicaCritica
                                : styles.politicaRevision
                          }`}
                        >
                          <div className={styles.politicaReparacionIcono}>
                            {politica.nivel === "reparable"
                              ? "🔄"
                              : politica.nivel === "critico"
                                ? "🛡️"
                                : "⚠️"}
                          </div>

                          <div className={styles.politicaReparacionContenido}>
                            <strong>
                              {politica.nivel === "reparable"
                                ? "Reparación segura disponible"
                                : politica.nivel === "critico"
                                  ? "Requiere soporte técnico"
                                  : "Requiere revisión"}
                            </strong>

                            <span>{politica.descripcion}</span>
                            {politica.nivel === "reparable" &&
                              politica.accion &&
                              incidente.estado === "pendiente" && (
                                <button
                                  type="button"
                                  className={styles.botonReparar}
                                  onClick={() => repararIncidente(incidente)}
                                  disabled={reparandoIncidente === incidente.id}
                                >
                                  {reparandoIncidente === incidente.id
                                    ? "Reparando..."
                                    : "🔄 Reintentar conexión"}
                                </button>
                              )}
                            {resultadoReparacion[incidente.id] && (
                              <div
                                className={`${styles.resultadoReparacion} ${
                                  resultadoReparacion[incidente.id].exito
                                    ? styles.resultadoReparacionExito
                                    : styles.resultadoReparacionError
                                }`}
                              >
                                <strong>
                                  {resultadoReparacion[incidente.id].bloqueada
                                    ? "🛡️ Reparación automática detenida"
                                    : resultadoReparacion[incidente.id].exito
                                      ? "✓ Reparación completada"
                                      : "✕ La reparación no solucionó el problema"}
                                </strong>

                                <span>
                                  {resultadoReparacion[incidente.id].mensaje}
                                </span>

                                {resultadoReparacion[incidente.id]
                                  .errorTecnico && (
                                  <code>
                                    {
                                      resultadoReparacion[incidente.id]
                                        .errorTecnico
                                    }
                                  </code>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {historialReparaciones[incidente.id] && (
                      <div className={styles.historialReparaciones}>
                        <div className={styles.historialReparacionesTitulo}>
                          <strong>🔧 Historial de reparaciones</strong>

                          <span>
                            {historialReparaciones[incidente.id].length}{" "}
                            {historialReparaciones[incidente.id].length === 1
                              ? "intento"
                              : "intentos"}
                          </span>
                        </div>

                        {historialReparaciones[incidente.id].length === 0 ? (
                          <p className={styles.sinReparaciones}>
                            No se han realizado intentos de reparación.
                          </p>
                        ) : (
                          <div className={styles.listaReparaciones}>
                            {historialReparaciones[incidente.id].map(
                              (reparacion) => (
                                <div
                                  key={reparacion.id}
                                  className={styles.reparacionHistorialItem}
                                >
                                  <div
                                    className={
                                      reparacion.resultado === "exitoso"
                                        ? styles.reparacionIconoExito
                                        : styles.reparacionIconoError
                                    }
                                  >
                                    {reparacion.resultado === "exitoso"
                                      ? "✓"
                                      : "✕"}
                                  </div>

                                  <div
                                    className={
                                      styles.reparacionHistorialContenido
                                    }
                                  >
                                    <strong>
                                      {reparacion.resultado === "exitoso"
                                        ? "Reparación exitosa"
                                        : "Reparación fallida"}
                                    </strong>

                                    <span>Acción: {reparacion.accion}</span>

                                    {reparacion.mensaje && (
                                      <span>{reparacion.mensaje}</span>
                                    )}

                                    {reparacion.error_tecnico && (
                                      <code>{reparacion.error_tecnico}</code>
                                    )}

                                    <small>
                                      {new Date(
                                        reparacion.created_at,
                                      ).toLocaleString("es-CO")}
                                    </small>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {/* INFORMACIÓN TÉCNICA */}
                    <div className={styles.detallesTecnicosIncidente}>
                      <div>
                        <span>Código del incidente</span>
                        <strong>{incidente.codigo_incidente}</strong>
                      </div>

                      <div>
                        <span>Código del error</span>
                        <strong>{incidente.codigo_error}</strong>
                      </div>

                      <div>
                        <span>Estado</span>
                        <strong>{incidente.estado}</strong>
                      </div>

                      <div>
                        <span>Página</span>
                        <strong>{incidente.pagina || "No disponible"}</strong>
                      </div>

                      <div>
                        <span>Componente</span>
                        <strong>
                          {incidente.componente || "No disponible"}
                        </strong>
                      </div>

                      <div>
                        <span>Operación</span>
                        <strong>
                          {incidente.operacion || "No disponible"}
                        </strong>
                      </div>

                      <div>
                        <span>Fecha</span>
                        <strong>
                          {new Date(incidente.created_at).toLocaleString(
                            "es-CO",
                          )}
                        </strong>
                      </div>
                    </div>

                    {/* ERROR TÉCNICO */}
                    {incidente.error_tecnico && (
                      <div className={styles.errorTecnicoIncidente}>
                        <span>Error técnico</span>

                        <code>{incidente.error_tecnico}</code>
                      </div>
                    )}

                    {/* GESTIÓN */}
                    <div className={styles.accionesIncidente}>
                      <span>Gestionar incidente</span>

                      <div className={styles.botonesEstado}>
                        <button
                          type="button"
                          className={styles.botonEstadoRevision}
                          disabled={incidente.estado === "en_revision"}
                          onClick={() =>
                            cambiarEstadoIncidente(incidente.id, "en_revision")
                          }
                        >
                          En revisión
                        </button>

                        <button
                          type="button"
                          className={styles.botonEstadoResuelto}
                          disabled={incidente.estado === "resuelto"}
                          onClick={() =>
                            cambiarEstadoIncidente(incidente.id, "resuelto")
                          }
                        >
                          Marcar como resuelto
                        </button>

                        <button
                          type="button"
                          className={styles.botonEstadoIgnorado}
                          disabled={incidente.estado === "ignorado"}
                          onClick={() =>
                            cambiarEstadoIncidente(incidente.id, "ignorado")
                          }
                        >
                          Ignorar
                        </button>

                        {incidente.estado !== "pendiente" && (
                          <button
                            type="button"
                            className={styles.botonEstadoPendiente}
                            onClick={() =>
                              cambiarEstadoIncidente(incidente.id, "pendiente")
                            }
                          >
                            Volver a pendiente
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      {/* HERRAMIENTAS */}
      <section className={styles.seccion}>
        <div className={styles.seccionTitulo}>
          <WrenchScrewdriverIcon />

          <div>
            <h3>Herramientas de reparación</h3>

            <p>
              Acciones seguras que pueden ayudar a solucionar problemas
              temporales.
            </p>
          </div>
        </div>

        <div className={styles.herramientas}>
          <button
            type="button"
            className={styles.herramienta}
            onClick={ejecutarDiagnostico}
          >
            <ArrowPathIcon />

            <div>
              <strong>Reintentar conexión</strong>

              <span>Comprueba nuevamente la conexión con el servidor.</span>
            </div>
          </button>

          <button
            type="button"
            className={styles.herramienta}
            onClick={async () => {
              await supabase.auth.refreshSession();
              await ejecutarDiagnostico();
            }}
          >
            <ArrowPathIcon />

            <div>
              <strong>Renovar sesión</strong>

              <span>
                Actualiza la sesión actual y vuelve a comprobar el sistema.
              </span>
            </div>
          </button>

          <button
            type="button"
            className={styles.herramienta}
            onClick={() => window.location.reload()}
          >
            <ComputerDesktopIcon />

            <div>
              <strong>Recargar sistema</strong>

              <span>Vuelve a cargar completamente la aplicación.</span>
            </div>
          </button>
        </div>
      </section>

      {/* ACTUALIZACIÓN */}
      <section className={styles.seccion}>
        <div className={styles.actualizacion}>
          <div className={styles.actualizacionIcono}>
            <ArrowPathIcon />
          </div>

          <div className={styles.actualizacionTexto}>
            <span className={styles.estadoEtiqueta}>
              ACTUALIZACIÓN DEL SISTEMA
            </span>

            <h3>Liquisistema está actualizado</h3>

            <p>
              El sistema comprobará aquí si existe una versión más reciente.
            </p>

            <div className={styles.version}>
              Versión instalada: <strong>v1.0.0</strong>
            </div>
          </div>

          <button
            type="button"
            className={styles.botonSecundario}
            onClick={() => window.location.reload()}
          >
            Buscar actualización
          </button>
        </div>
      </section>

      {/* INFORMACIÓN TÉCNICA */}
      <section className={styles.seccion}>
        <button
          type="button"
          className={styles.tecnicoBoton}
          onClick={() => setMostrarTecnico(!mostrarTecnico)}
        >
          <div className={styles.seccionTitulo}>
            <InformationCircleIcon />

            <div>
              <h3>Información técnica</h3>

              <p>Información útil para diagnóstico y soporte del sistema.</p>
            </div>
          </div>

          <ChevronDownIcon className={mostrarTecnico ? styles.rotar : ""} />
        </button>

        {mostrarTecnico && (
          <div className={styles.informacionTecnica}>
            <div>
              <span>Versión</span>
              <strong>v1.0.0</strong>
            </div>

            <div>
              <span>Entorno</span>
              <strong>
                {import.meta.env.MODE === "production"
                  ? "Producción"
                  : "Desarrollo"}
              </strong>
            </div>

            <div>
              <span>Estado de sesión</span>
              <strong>
                {datosDiagnostico.usuario ? "Activa" : "No comprobada"}
              </strong>
            </div>

            <div>
              <span>Organización</span>
              <strong>
                {datosDiagnostico.organizacionId
                  ? "Detectada"
                  : "No comprobada"}
              </strong>
            </div>

            <div>
              <span>Problemas encontrados</span>
              <strong>{problemas.length}</strong>
            </div>

            <div>
              <span>Último diagnóstico</span>
              <strong>
                {estadoSistema === "pendiente" ? "No ejecutado" : "Completado"}
              </strong>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default SoporteDiagnostico;
