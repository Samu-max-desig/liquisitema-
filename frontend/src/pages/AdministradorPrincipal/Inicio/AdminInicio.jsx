import { useEffect, useRef, useState } from "react";
import {
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  BanknotesIcon,
  UserGroupIcon,
  BoltIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { obtenerActividadesPorOrganizacion } from "../../../services/actividadService";
import { supabase } from "../../../config/supabase";

import styles from "./AdminInicio.module.css";

export default function AdminInicio() {
  // =========================================================
  // ESTADÍSTICAS PRINCIPALES
  // =========================================================
  const [modalReporteIngresos, setModalReporteIngresos] = useState(false);
  const [periodoReporte, setPeriodoReporte] = useState("hoy");
  const [formatoReporte, setFormatoReporte] = useState("excel");
  const [historialIngresos, setHistorialIngresos] = useState([]);
  const [rangoReporteIngresos, setRangoReporteIngresos] = useState(null);
  const [opcionesReporteIngresos, setOpcionesReporteIngresos] = useState([]);
  const [cargandoReporteIngresos, setCargandoReporteIngresos] = useState(false);
  const [estadisticas, setEstadisticas] = useState({
    domicilios: 0,
    pendientes: 0,
    pagados: 0,
    recaudado: 0,
    efectivo: 0,
    transferencia: 0,
    datafono: 0,
    otro: 0,
    domiciliarios: 0,
  });

  // =========================================================
  // PREFERENCIAS DE TRABAJO
  // =========================================================

  const [preferencias, setPreferencias] = useState({
    horarioActivo: true,
    horaInicio: "08:00",
    horaFin: "18:00",

    diasTrabajo: {
      lunes: true,
      martes: true,
      miercoles: true,
      jueves: true,
      viernes: true,
      sabado: true,
      domingo: false,
    },

    mesesTrabajo: {
      enero: true,
      febrero: true,
      marzo: true,
      abril: true,
      mayo: true,
      junio: true,
      julio: true,
      agosto: true,
      septiembre: true,
      octubre: true,
      noviembre: true,
      diciembre: true,
    },
  });

  // =========================================================
  // GRÁFICAS
  // =========================================================

  const [graficas, setGraficas] = useState([
    {
      id: "horas",
      titulo: "Domicilios por hora",
      descripcion: "Distribución de domicilios durante la jornada.",
      icono: ClockIcon,
      datos: [],
    },
    {
      id: "dias",
      titulo: "Movimientos por día",
      descripcion: "Actividad registrada durante los días laborales.",
      icono: CalendarDaysIcon,
      datos: [],
    },
    {
      id: "meses",
      titulo: "Movimientos por mes",
      descripcion: "Actividad registrada según el período configurado.",
      icono: ChartBarIcon,
      datos: [],
    },
  ]);

  const [graficaActiva, setGraficaActiva] = useState(0);

  // =========================================================
  // INGRESOS
  // =========================================================

  const [ingresos, setIngresos] = useState({
    hoy: 0,
    semana: 0,
    mes: 0,
    anio: 0,
  });

  // =========================================================
  // ESTADOS GENERALES
  // =========================================================

  const [cargando, setCargando] = useState(true);

  const [actividades, setActividades] = useState([]);
  const [cargandoActividades, setCargandoActividades] = useState(true);

  const [claveDinamica, setClaveDinamica] = useState("");
  const [claveAnimacion, setClaveAnimacion] = useState(0);

  const animacionInicializada = useRef(false);
  const timeoutClave = useRef(null);

  // =========================================================
  // UTILIDADES DE FECHA
  // =========================================================

  const obtenerFechaLocal = (fecha = new Date()) => {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const obtenerInicioSemana = (fecha = new Date()) => {
    const resultado = new Date(fecha);
    const dia = resultado.getDay();

    const diferencia = dia === 0 ? 6 : dia - 1;

    resultado.setHours(0, 0, 0, 0);
    resultado.setDate(resultado.getDate() - diferencia);

    return resultado;
  };

  const obtenerFinSemana = (fecha = new Date()) => {
    const resultado = obtenerInicioSemana(fecha);

    resultado.setDate(resultado.getDate() + 6);
    resultado.setHours(23, 59, 59, 999);

    return resultado;
  };

  const obtenerNombreDia = (fecha) => {
    const dias = [
      "domingo",
      "lunes",
      "martes",
      "miercoles",
      "jueves",
      "viernes",
      "sabado",
    ];

    return dias[fecha.getDay()];
  };

  const obtenerNombreMes = (numeroMes) => {
    const meses = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];

    return meses[numeroMes];
  };

  const formatearHora = (hora) => {
    if (!hora) return "";

    const [horas, minutos] = hora.substring(0, 5).split(":").map(Number);

    const periodo = horas >= 12 ? "PM" : "AM";
    const hora12 = horas % 12 || 12;

    return `${hora12}:${String(minutos).padStart(2, "0")} ${periodo}`;
  };

  const generarHorasJornada = (horaInicio, horaFin) => {
    if (!horaInicio || !horaFin) {
      return [];
    }

    const [inicioHora, inicioMinuto] = horaInicio
      .substring(0, 5)
      .split(":")
      .map(Number);

    const [finHora, finMinuto] = horaFin.substring(0, 5).split(":").map(Number);

    const inicio = inicioHora * 60 + inicioMinuto;
    const fin = finHora * 60 + finMinuto;

    const resultado = [];

    let cursor = Math.floor(inicio / 60) * 60;

    while (cursor <= fin) {
      const hora = Math.floor(cursor / 60);
      const minutos = cursor % 60;

      resultado.push({
        hora,
        minutos,
        etiqueta: formatearHora(
          `${String(hora).padStart(2, "0")}:${String(minutos).padStart(
            2,
            "0",
          )}`,
        ),
        valor: 0,
      });

      cursor += 60;
    }

    return resultado;
  };

  // =========================================================
  // OBTENER ORGANIZACIÓN ACTUAL
  // =========================================================

  const obtenerOrganizacionActual = async (userId) => {
    try {
      // -----------------------------------------------------
      // 1. ORGANIZACIÓN DIRECTA
      // -----------------------------------------------------

      const { data: usuarioActual, error: usuarioError } = await supabase
        .from("usuarios")
        .select("organizacion_id")
        .eq("id", userId)
        .maybeSingle();

      if (usuarioError) {
        console.error("Error obteniendo usuario:", usuarioError);
      }

      if (usuarioActual?.organizacion_id) {
        console.log(
          "ORGANIZACIÓN ACTUAL POR ASIGNACIÓN DIRECTA:",
          usuarioActual.organizacion_id,
        );

        return usuarioActual.organizacion_id;
      }

      // -----------------------------------------------------
      // 2. ORGANIZACIÓN MEDIANTE RELACIÓN
      // -----------------------------------------------------

      const { data: relacion, error: relacionError } = await supabase
        .from("usuarios_organizaciones")
        .select("organizacion_id, rol, estado")
        .eq("usuario_id", userId)
        .eq("estado", "activo")
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (relacionError) {
        console.error(
          "Error obteniendo relación de organización:",
          relacionError,
        );

        return null;
      }

      if (relacion?.organizacion_id) {
        console.log(
          "ORGANIZACIÓN ACTUAL POR RELACIÓN:",
          relacion.organizacion_id,
        );

        return relacion.organizacion_id;
      }

      console.error("El usuario no tiene una organización activa.");

      return null;
    } catch (error) {
      console.error("Error inesperado obteniendo organización:", error);

      return null;
    }
  };

  // =========================================================
  // CARGAR PREFERENCIAS
  // =========================================================

  const cargarPreferencias = async (organizacionId) => {
    try {
      const { data, error } = await supabase
        .from("configuraciones_organizacion")
        .select(
          `
            horario_activo,
            hora_inicio,
            hora_fin,
            dias_trabajo,
            meses_trabajo,
            periodo_estadisticas,
            estadisticas
          `,
        )
        .eq("organizacion_id", organizacionId)
        .maybeSingle();

      if (error) {
        console.error("Error cargando preferencias:", error);
        return preferencias;
      }

      if (!data) {
        return preferencias;
      }

      const nuevasPreferencias = {
        horarioActivo: data.horario_activo ?? preferencias.horarioActivo,

        horaInicio:
          data.hora_inicio?.substring(0, 5) || preferencias.horaInicio,

        horaFin: data.hora_fin?.substring(0, 5) || preferencias.horaFin,

        diasTrabajo: {
          ...preferencias.diasTrabajo,
          ...(data.dias_trabajo || {}),
        },

        mesesTrabajo: {
          ...preferencias.mesesTrabajo,
          ...(data.meses_trabajo || {}),
        },

        periodoEstadisticas:
          data.periodo_estadisticas || preferencias.periodoEstadisticas,

        estadisticas: {
          ...preferencias.estadisticas,
          ...(data.estadisticas || {}),
        },
      };

      setPreferencias(nuevasPreferencias);

      console.log("PREFERENCIAS DE TRABAJO:", nuevasPreferencias);

      return nuevasPreferencias;
    } catch (error) {
      console.error("Error inesperado cargando preferencias:", error);

      return preferencias;
    }
  };

  // =========================================================
  // GUARDAR ESTADÍSTICAS DEL DÍA
  // =========================================================

  const guardarEstadisticaDelDia = async (
    organizacionId,
    listaDomicilios,
    fecha,
    prefs,
  ) => {
    try {
      if (!organizacionId) {
        console.warn("No hay organización para guardar estadísticas.");
        return;
      }

      const horaInicio = prefs?.horaInicio || "08:00";
      const horaFin = prefs?.horaFin || "18:00";

      // IMPORTANTE:
      // Si fecha ya viene como YYYY-MM-DD, NO usamos new Date(fecha)
      // porque puede cambiar el día por la zona horaria.
      const fechaISO =
        typeof fecha === "string"
          ? fecha.substring(0, 10)
          : obtenerFechaLocal(fecha);

      console.log("📊 Preparando estadísticas:", {
        organizacionId,
        fechaISO,
        jornada: `${horaInicio} - ${horaFin}`,
        domiciliosRecibidos: listaDomicilios?.length || 0,
      });

      // =====================================================
      // DOMICILIOS DE LA JORNADA
      // =====================================================

      const domiciliosJornada = (
        Array.isArray(listaDomicilios) ? listaDomicilios : []
      ).filter((domicilio) => {
        if (!domicilio.fecha) return false;

        return String(domicilio.fecha).substring(0, 10) === fechaISO;
      });

      console.log("📊 Domicilios de la fecha:", domiciliosJornada.length);

      // =====================================================
      // ESTADOS
      // =====================================================

      const domiciliosTotal = domiciliosJornada.length;

      const domiciliosPagados = domiciliosJornada.filter((domicilio) => {
        const estado = String(domicilio.estado || "")
          .trim()
          .toLowerCase();

        return estado === "pagado";
      }).length;

      const domiciliosPendientes = domiciliosJornada.filter((domicilio) => {
        const estado = String(domicilio.estado || "")
          .trim()
          .toLowerCase();

        return estado === "pendiente";
      }).length;

      // =====================================================
      // INGRESOS
      // =====================================================

      let efectivo = 0;
      let transferencia = 0;
      let datafono = 0;
      let otro = 0;

      domiciliosJornada.forEach((domicilio) => {
        const estado = String(domicilio.estado || "")
          .trim()
          .toLowerCase();

        // Solo los PAGADOS generan ingresos
        if (estado !== "pagado") {
          return;
        }

        const costo = Number(domicilio.costo || 0);

        const metodo = String(domicilio.metodo_pago || "")
          .trim()
          .toLowerCase();

        if (metodo === "efectivo") {
          efectivo += costo;
        } else if (metodo === "transferencia") {
          transferencia += costo;
        } else if (metodo === "datáfono" || metodo === "datafono") {
          datafono += costo;
        } else if (metodo === "otro") {
          otro += costo;
        }
      });

      // =====================================================
      // MOVIMIENTOS POR HORA
      // =====================================================

      const movimientosPorHora = {};

      domiciliosJornada.forEach((domicilio) => {
        if (!domicilio.created_at) return;

        const fechaCreacion = new Date(domicilio.created_at);

        const hora = `${String(fechaCreacion.getHours()).padStart(2, "0")}:00`;

        movimientosPorHora[hora] = (movimientosPorHora[hora] || 0) + 1;
      });

      // =====================================================
      // DATOS DE ESTADÍSTICA
      // =====================================================

      const datosEstadistica = {
        organizacion_id: organizacionId,
        fecha: fechaISO,

        domicilios_total: domiciliosTotal,
        domicilios_pagados: domiciliosPagados,
        domicilios_pendientes: domiciliosPendientes,

        efectivo,
        transferencia,
        datafono,
        otro,

        movimientos_por_hora: movimientosPorHora,

        updated_at: new Date().toISOString(),
      };

      console.log("📊 Datos reales que se guardarán:", datosEstadistica);

      // =====================================================
      // GUARDAR / ACTUALIZAR
      // =====================================================

      const { error } = await supabase
        .from("estadisticas_organizacion")
        .upsert(datosEstadistica, {
          onConflict: "organizacion_id,fecha",
        });

      if (error) {
        throw error;
      }

      console.log("✅ Estadística guardada correctamente:", datosEstadistica);
    } catch (error) {
      console.error("❌ Error guardando estadística del día:", error);
    }
  };
  // =========================================================
  // CARGAR ESTADÍSTICAS HISTÓRICAS
  // =========================================================

  const cargarEstadisticasHistoricas = async (organizacionId, prefs) => {
    try {
      const fechaActual = new Date();
      const anioActual = fechaActual.getFullYear();

      const inicioAnio = `${anioActual}-01-01`;

      const { data, error } = await supabase
        .from("estadisticas_organizacion")
        .select(
          `
            fecha,
            domicilios_total,
            domicilios_pagados,
            domicilios_pendientes,
            efectivo,
            transferencia,
            datafono,
            otro,
            movimientos_por_hora
          `,
        )
        .eq("organizacion_id", organizacionId)
        .gte("fecha", inicioAnio)
        .lte("fecha", obtenerFechaLocal(fechaActual))
        .order("fecha", { ascending: true });

      if (error) {
        console.error("Error cargando estadísticas históricas:", error);

        return [];
      }

      return data || [];
    } catch (error) {
      console.error(
        "Error inesperado cargando estadísticas históricas:",
        error,
      );

      return [];
    }
  };

  // =========================================================
  // CONSTRUIR GRÁFICA POR HORA
  // =========================================================

  const construirGraficaHoras = (listaDomicilios, prefs) => {
    const ahora = new Date();

    const nombreDiaActual = obtenerNombreDia(ahora);
    const nombreMesActual = obtenerNombreMes(ahora.getMonth());

    const diaActivo = prefs.diasTrabajo?.[nombreDiaActual] !== false;

    const mesActivo = prefs.mesesTrabajo?.[nombreMesActual] !== false;

    if (!diaActivo || !mesActivo) {
      return [];
    }

    const horas = generarHorasJornada(prefs.horaInicio, prefs.horaFin);

    listaDomicilios.forEach((domicilio) => {
      if (!domicilio.created_at) return;

      const fecha = new Date(domicilio.created_at);

      if (obtenerFechaLocal(fecha) !== obtenerFechaLocal(ahora)) {
        return;
      }

      const hora = fecha.getHours();

      const indice = horas.findIndex((item) => item.hora === hora);

      if (indice !== -1) {
        horas[indice].valor += 1;
      }
    });

    return horas;
  };

  // =========================================================
  // CONSTRUIR GRÁFICA POR DÍA
  // =========================================================

  const construirGraficaDias = (estadisticasHistoricas, prefs) => {
    const hoy = new Date();
    const anioActual = hoy.getFullYear();

    const dias = [
      {
        clave: "lunes",
        etiqueta: "Lun",
        numero: 1,
      },
      {
        clave: "martes",
        etiqueta: "Mar",
        numero: 2,
      },
      {
        clave: "miercoles",
        etiqueta: "Mié",
        numero: 3,
      },
      {
        clave: "jueves",
        etiqueta: "Jue",
        numero: 4,
      },
      {
        clave: "viernes",
        etiqueta: "Vie",
        numero: 5,
      },
      {
        clave: "sabado",
        etiqueta: "Sáb",
        numero: 6,
      },
      {
        clave: "domingo",
        etiqueta: "Dom",
        numero: 0,
      },
    ];

    return dias
      .filter((dia) => prefs.diasTrabajo?.[dia.clave] !== false)
      .map((dia) => {
        let valor = 0;

        estadisticasHistoricas.forEach((estadistica) => {
          if (!estadistica.fecha) return;

          const fecha = new Date(`${estadistica.fecha}T00:00:00`);

          if (fecha.getFullYear() !== anioActual) {
            return;
          }

          if (fecha.getDay() === dia.numero) {
            valor += Number(estadistica.domicilios_total || 0);
          }
        });

        return {
          etiqueta: dia.etiqueta,
          valor,
        };
      });
  };

  // =========================================================
  // CONSTRUIR GRÁFICA POR MES
  // =========================================================

  const construirGraficaMeses = (estadisticasHistoricas, prefs) => {
    const meses = [
      {
        clave: "enero",
        etiqueta: "Ene",
        numero: 0,
      },
      {
        clave: "febrero",
        etiqueta: "Feb",
        numero: 1,
      },
      {
        clave: "marzo",
        etiqueta: "Mar",
        numero: 2,
      },
      {
        clave: "abril",
        etiqueta: "Abr",
        numero: 3,
      },
      {
        clave: "mayo",
        etiqueta: "May",
        numero: 4,
      },
      {
        clave: "junio",
        etiqueta: "Jun",
        numero: 5,
      },
      {
        clave: "julio",
        etiqueta: "Jul",
        numero: 6,
      },
      {
        clave: "agosto",
        etiqueta: "Ago",
        numero: 7,
      },
      {
        clave: "septiembre",
        etiqueta: "Sep",
        numero: 8,
      },
      {
        clave: "octubre",
        etiqueta: "Oct",
        numero: 9,
      },
      {
        clave: "noviembre",
        etiqueta: "Nov",
        numero: 10,
      },
      {
        clave: "diciembre",
        etiqueta: "Dic",
        numero: 11,
      },
    ];

    const anioActual = new Date().getFullYear();

    let mesesPermitidos = meses.filter(
      (mes) => prefs.mesesTrabajo?.[mes.clave] !== false,
    );

    // -------------------------------------------------------
    // SI ES TRIMESTRAL:
    // mostrar solamente el trimestre actual.
    // -------------------------------------------------------

    if (prefs.periodoEstadisticas === "trimestral") {
      const mesActual = new Date().getMonth();

      const trimestreInicio = Math.floor(mesActual / 3) * 3;

      const trimestreFin = trimestreInicio + 2;

      mesesPermitidos = mesesPermitidos.filter(
        (mes) => mes.numero >= trimestreInicio && mes.numero <= trimestreFin,
      );
    }

    return mesesPermitidos.map((mes) => {
      let valor = 0;

      estadisticasHistoricas.forEach((estadistica) => {
        const fecha = new Date(`${estadistica.fecha}T00:00:00`);

        if (
          fecha.getFullYear() === anioActual &&
          fecha.getMonth() === mes.numero
        ) {
          valor += Number(estadistica.domicilios_total || 0);
        }
      });

      return {
        etiqueta: mes.etiqueta,
        valor,
      };
    });
  };

  // =========================================================
  // CONSTRUIR GRÁFICAS
  // =========================================================

  const construirGraficas = (
    listaDomicilios,
    estadisticasHistoricas,
    prefs,
  ) => {
    const horas = construirGraficaHoras(listaDomicilios, prefs);

    const dias = construirGraficaDias(estadisticasHistoricas, prefs);

    const meses = construirGraficaMeses(estadisticasHistoricas, prefs);

    setGraficas([
      {
        id: "horas",
        titulo: "Domicilios por hora",
        descripcion: prefs.horarioActivo
          ? `Distribución entre ${formatearHora(
              prefs.horaInicio,
            )} y ${formatearHora(prefs.horaFin)}.`
          : "Distribución de domicilios durante el día.",
        icono: ClockIcon,
        datos: horas,
      },

      {
        id: "dias",
        titulo: "Movimientos por día",
        descripcion: "Actividad registrada durante los días laborales.",
        icono: CalendarDaysIcon,
        datos: dias,
      },

      {
        id: "meses",
        titulo: "Movimientos por mes",
        descripcion:
          prefs.periodoEstadisticas === "trimestral"
            ? "Actividad registrada durante el trimestre actual."
            : "Actividad registrada durante el año.",
        icono: ChartBarIcon,
        datos: meses,
      },
    ]);
  };

  // =========================================================
  // CARGAR INGRESOS REALES
  // =========================================================

  // =========================================================
  // CARGAR INGRESOS REALES
  // =========================================================

  const cargarIngresos = async (organizacionId, ahora, prefs) => {
    try {
      if (!organizacionId) return;

      const horaInicio = prefs?.horaInicio || "08:00";

      const diasTrabajo = prefs?.diasTrabajo || {
        lunes: true,
        martes: true,
        miercoles: true,
        jueves: true,
        viernes: true,
        sabado: true,
        domingo: false,
      };

      const mesesTrabajo = prefs?.mesesTrabajo || {
        enero: true,
        febrero: true,
        marzo: true,
        abril: true,
        mayo: true,
        junio: true,
        julio: true,
        agosto: true,
        septiembre: true,
        octubre: true,
        noviembre: true,
        diciembre: true,
      };

      const nombresDias = [
        "domingo",
        "lunes",
        "martes",
        "miercoles",
        "jueves",
        "viernes",
        "sabado",
      ];

      const nombresMeses = [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
      ];

      // =========================================================
      // HORA DE INICIO
      // =========================================================

      const [hora, minuto] = horaInicio.substring(0, 5).split(":").map(Number);

      const fechaActual = new Date(ahora);

      const minutosActuales =
        fechaActual.getHours() * 60 + fechaActual.getMinutes();

      const minutosInicio = hora * 60 + minuto;

      // =========================================================
      // FECHA DE LA JORNADA ACTUAL
      //
      // Antes de la hora de inicio seguimos viendo la jornada
      // anterior.
      //
      // Ejemplo:
      // 10 de septiembre 08:00
      // jornada = 9 de septiembre
      //
      // 10 de septiembre 08:30
      // jornada = 10 de septiembre
      // =========================================================

      const fechaJornada = new Date(fechaActual);

      if (minutosActuales < minutosInicio) {
        fechaJornada.setDate(fechaJornada.getDate() - 1);
      }

      fechaJornada.setHours(0, 0, 0, 0);

      // =========================================================
      // HELPERS
      // =========================================================

      const convertirISO = (fecha) => {
        return [
          fecha.getFullYear(),
          String(fecha.getMonth() + 1).padStart(2, "0"),
          String(fecha.getDate()).padStart(2, "0"),
        ].join("-");
      };

      const esDiaTrabajo = (fecha) => {
        const nombreDia = nombresDias[fecha.getDay()];
        return diasTrabajo[nombreDia] !== false;
      };

      const esMesTrabajo = (fecha) => {
        const nombreMes = nombresMeses[fecha.getMonth()];
        return mesesTrabajo[nombreMes] !== false;
      };

      // =========================================================
      // OBTENER ESTADÍSTICAS
      // =========================================================

      const { data, error } = await supabase
        .from("estadisticas_organizacion")
        .select(
          `
        fecha,
        efectivo,
        transferencia,
        datafono,
        otro
      `,
        )
        .eq("organizacion_id", organizacionId)
        .order("fecha", { ascending: true });

      if (error) throw error;

      const estadisticas = data || [];

      setHistorialIngresos(estadisticas);

      // =========================================================
      // TOTAL DE UNA JORNADA
      // =========================================================

      const obtenerTotal = (fila) => {
        return (
          Number(fila?.efectivo || 0) +
          Number(fila?.transferencia || 0) +
          Number(fila?.datafono || 0) +
          Number(fila?.otro || 0)
        );
      };

      // =========================================================
      // HOY
      //
      // Se reinicia cuando comienza una nueva jornada.
      //
      // Ejemplo:
      // Jueves 08:30 -> empieza nuevo "Hoy"
      // =========================================================

      let ingresoHoy = 0;

      if (esDiaTrabajo(fechaJornada) && esMesTrabajo(fechaJornada)) {
        const fechaJornadaISO = convertirISO(fechaJornada);

        ingresoHoy = estadisticas
          .filter((fila) => fila.fecha === fechaJornadaISO)
          .reduce((total, fila) => total + obtenerTotal(fila), 0);
      }

      // =========================================================
      // ESTA SEMANA
      //
      // IMPORTANTE:
      // NO usamos lunes como inicio.
      //
      // La semana empieza en el PRIMER DÍA DE TRABAJO configurado.
      //
      // Ejemplo:
      //
      // Jueves ✅
      // Viernes ✅
      // Sábado ✅
      // Domingo ✅
      //
      // La semana es:
      // Jueves -> Domingo
      //
      // El siguiente jueves comienza una nueva semana.
      // =========================================================

      const inicioSemana = new Date(fechaJornada);

      // Retrocedemos hasta encontrar el día de trabajo
      // que inicia el período actual.
      while (!esDiaTrabajo(inicioSemana)) {
        inicioSemana.setDate(inicioSemana.getDate() - 1);
      }

      inicioSemana.setHours(0, 0, 0, 0);

      const inicioSemanaISO = convertirISO(inicioSemana);
      const fechaJornadaISO = convertirISO(fechaJornada);

      let ingresoSemana = 0;

      if (esMesTrabajo(fechaJornada)) {
        ingresoSemana = estadisticas
          .filter((fila) => {
            if (fila.fecha < inicioSemanaISO) return false;
            if (fila.fecha > fechaJornadaISO) return false;

            const fecha = new Date(`${fila.fecha}T00:00:00`);

            return esDiaTrabajo(fecha) && esMesTrabajo(fecha);
          })
          .reduce((total, fila) => total + obtenerTotal(fila), 0);
      }

      // =========================================================
      // ESTE MES
      //
      // Se reinicia al comenzar un nuevo mes.
      //
      // Ejemplo:
      // 1 de octubre -> Este mes comienza en 0.
      // =========================================================

      const inicioMes = new Date(
        fechaJornada.getFullYear(),
        fechaJornada.getMonth(),
        1,
      );

      inicioMes.setHours(0, 0, 0, 0);

      const inicioMesISO = convertirISO(inicioMes);

      let ingresoMes = 0;

      if (esMesTrabajo(fechaJornada)) {
        ingresoMes = estadisticas
          .filter((fila) => {
            if (fila.fecha < inicioMesISO) return false;
            if (fila.fecha > fechaJornadaISO) return false;

            const fecha = new Date(`${fila.fecha}T00:00:00`);

            return esDiaTrabajo(fecha) && esMesTrabajo(fecha);
          })
          .reduce((total, fila) => total + obtenerTotal(fila), 0);
      }

      // =========================================================
      // ESTE AÑO
      //
      // Se reinicia al comenzar un nuevo año.
      //
      // Además respeta los meses de trabajo configurados.
      // =========================================================

      const inicioAnio = new Date(fechaJornada.getFullYear(), 0, 1);

      inicioAnio.setHours(0, 0, 0, 0);

      const inicioAnioISO = convertirISO(inicioAnio);

      let ingresoAnio = 0;

      if (esMesTrabajo(fechaJornada)) {
        ingresoAnio = estadisticas
          .filter((fila) => {
            if (fila.fecha < inicioAnioISO) return false;
            if (fila.fecha > fechaJornadaISO) return false;

            const fecha = new Date(`${fila.fecha}T00:00:00`);

            return esDiaTrabajo(fecha) && esMesTrabajo(fecha);
          })
          .reduce((total, fila) => total + obtenerTotal(fila), 0);
      }

      // =========================================================
      // GUARDAR INGRESOS
      // =========================================================

      setIngresos({
        hoy: ingresoHoy,
        semana: ingresoSemana,
        mes: ingresoMes,
        anio: ingresoAnio,
      });
    } catch (error) {
      console.error("Error cargando ingresos:", error);

      setIngresos({
        hoy: 0,
        semana: 0,
        mes: 0,
        anio: 0,
      });
    }
  };

  // =========================================================
  // CARGAR ACTIVIDADES
  // =========================================================

  useEffect(() => {
    const cargarActividades = async () => {
      try {
        setCargandoActividades(true);

        const usuarioGuardado = sessionStorage.getItem("usuario");

        if (!usuarioGuardado) {
          setActividades([]);
          return;
        }

        const usuario = JSON.parse(usuarioGuardado);

        const organizacionId = await obtenerOrganizacionActual(usuario.id);

        if (!organizacionId) {
          setActividades([]);
          return;
        }

        const { data, error } = await obtenerActividadesPorOrganizacion(
          organizacionId,
          5,
        );

        if (error) {
          console.error("Error cargando actividad reciente:", error);

          setActividades([]);

          return;
        }

        setActividades(data || []);
      } catch (error) {
        console.error("Error inesperado cargando actividades:", error);

        setActividades([]);
      } finally {
        setCargandoActividades(false);
      }
    };

    cargarActividades();
  }, []);

  // =========================================================
  // CARGAR DATOS PRINCIPALES
  // =========================================================

  const cargarDatos = async () => {
    let resumenVisible = true;

    setCargando(true);

    try {
      // -----------------------------------------------------
      // USUARIO AUTENTICADO
      // -----------------------------------------------------

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("No hay usuario autenticado:", authError);

        setCargando(false);

        return;
      }

      // -----------------------------------------------------
      // ORGANIZACIÓN
      // -----------------------------------------------------

      const organizacionId = await obtenerOrganizacionActual(user.id);

      if (!organizacionId) {
        setCargando(false);

        return;
      }

      console.log("=== INICIO ADMIN ===");
      console.log("USUARIO:", user.id);
      console.log("ORGANIZACIÓN ACTUAL:", organizacionId);

      // -----------------------------------------------------
      // PREFERENCIAS
      // -----------------------------------------------------

      const prefs = await cargarPreferencias(organizacionId);

      // -----------------------------------------------------
      // HORARIO
      // -----------------------------------------------------

      if (prefs?.horarioActivo && prefs?.horaFin) {
        const ahora = new Date();

        const [horaFin, minutoFin] = prefs.horaFin
          .substring(0, 5)
          .split(":")
          .map(Number);

        const horaLimite = new Date(ahora);

        horaLimite.setHours(horaFin, minutoFin + 60, 0, 0);

        if (ahora >= horaLimite) {
          resumenVisible = false;
        }
      }

      // -----------------------------------------------------
      // DOMICILIARIOS DIRECTOS
      // -----------------------------------------------------

      const { data: domiciliariosDirectos, error: errorDomiciliariosDirectos } =
        await supabase
          .from("usuarios")
          .select("id, nombre, rol, estado, organizacion_id")
          .eq("organizacion_id", organizacionId)
          .eq("rol", "domiciliario")
          .eq("estado", "activo");

      if (errorDomiciliariosDirectos) {
        console.error(
          "Error obteniendo domiciliarios directos:",
          errorDomiciliariosDirectos,
        );
      }

      // -----------------------------------------------------
      // DOMICILIARIOS POR RELACIÓN
      // -----------------------------------------------------

      const { data: relacionesDomiciliarios, error: errorRelaciones } =
        await supabase
          .from("usuarios_organizaciones")
          .select("usuario_id, rol, estado")
          .eq("organizacion_id", organizacionId)
          .eq("estado", "activo")
          .eq("rol", "domiciliario");

      if (errorRelaciones) {
        console.error(
          "Error obteniendo relaciones de domiciliarios:",
          errorRelaciones,
        );
      }

      const idsRelacionados = (relacionesDomiciliarios || []).map(
        (relacion) => relacion.usuario_id,
      );

      let domiciliariosPorRelacion = [];

      if (idsRelacionados.length > 0) {
        const { data: usuariosRelacionados, error: errorUsuariosRelacionados } =
          await supabase
            .from("usuarios")
            .select("id, nombre, rol, estado, organizacion_id")
            .in("id", idsRelacionados)
            .eq("rol", "domiciliario")
            .eq("estado", "activo");

        if (errorUsuariosRelacionados) {
          console.error(
            "Error obteniendo domiciliarios relacionados:",
            errorUsuariosRelacionados,
          );
        } else {
          domiciliariosPorRelacion = usuariosRelacionados || [];
        }
      }

      // -----------------------------------------------------
      // UNIFICAR DOMICILIARIOS
      // -----------------------------------------------------

      const todosLosDomiciliarios = [
        ...(domiciliariosDirectos || []),
        ...domiciliariosPorRelacion,
      ];

      const domiciliariosActivos = Array.from(
        new Map(
          todosLosDomiciliarios.map((usuario) => [usuario.id, usuario]),
        ).values(),
      );

      console.log("👤 DOMICILIARIOS DIRECTOS:", domiciliariosDirectos);

      console.log("🔗 DOMICILIARIOS POR RELACIÓN:", domiciliariosPorRelacion);

      console.log("✅ DOMICILIARIOS ACTIVOS:", domiciliariosActivos);

      // -----------------------------------------------------
      // FECHA ACTUAL
      // -----------------------------------------------------

      const ahora = new Date();

      const hoy = obtenerFechaLocal(ahora);

      // -----------------------------------------------------
      // DOMICILIOS DE HOY
      // -----------------------------------------------------

      const { data: domicilios, error: errorDomicilios } = await supabase
        .from("domicilios")
        .select("*")
        .eq("fecha", hoy)
        .eq("organizacion_id", organizacionId);

      if (errorDomicilios) {
        console.error("Error cargando domicilios:", errorDomicilios);

        setCargando(false);

        return;
      }

      const lista = domicilios || [];

      // -----------------------------------------------------
      // CALCULAR ESTADÍSTICAS
      // -----------------------------------------------------

      let efectivo = 0;
      let transferencia = 0;
      let datafono = 0;
      let otro = 0;

      if (resumenVisible) {
        lista
          .filter((item) => item.estado === "Pagado")
          .forEach((item) => {
            const valor = Number(item.costo || 0);

            const metodo = String(item.metodo_pago || "")
              .trim()
              .toLowerCase();

            if (metodo === "efectivo") {
              efectivo += valor;
            } else if (metodo === "transferencia") {
              transferencia += valor;
            } else if (metodo === "datáfono" || metodo === "datafono") {
              datafono += valor;
            } else {
              otro += valor;
            }
          });
      }

      const pendientes = lista.filter(
        (item) => item.estado === "Pendiente",
      ).length;

      const pagados = lista.filter((item) => item.estado === "Pagado").length;

      const recaudado = lista
        .filter((item) => item.estado === "Pagado")
        .reduce((total, item) => total + Number(item.costo || 0), 0);

      setEstadisticas({
        domicilios: lista.length,
        pendientes,
        pagados,
        recaudado,
        efectivo,
        transferencia,
        datafono,
        otro,
        domiciliarios: domiciliariosActivos.length,
      });

      // -----------------------------------------------------
      // GUARDAR ESTADÍSTICA DEL DÍA
      // -----------------------------------------------------

      await guardarEstadisticaDelDia(organizacionId, lista, hoy, prefs);

      // -----------------------------------------------------
      // CARGAR HISTÓRICOS
      // -----------------------------------------------------

      const estadisticasHistoricas = await cargarEstadisticasHistoricas(
        organizacionId,
        prefs,
      );

      // -----------------------------------------------------
      // CONSTRUIR GRÁFICAS
      // -----------------------------------------------------

      construirGraficas(lista, estadisticasHistoricas, prefs);

      // -----------------------------------------------------
      // INGRESOS
      // -----------------------------------------------------

      await cargarIngresos(organizacionId, ahora, prefs);

      console.log("DOMICILIOS HOY:", lista.length);

      console.log("PENDIENTES:", pendientes);

      console.log("PAGADOS:", pagados);

      console.log("RECAUDADO:", recaudado);
    } catch (error) {
      console.error("Error inesperado cargando datos de Inicio:", error);
    } finally {
      setCargando(false);
    }
  };

  // =========================================================
  // CLAVE DINÁMICA
  // =========================================================

  const cargarClaveDinamica = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No hay usuario autenticado");

        return;
      }

      const organizacionId = await obtenerOrganizacionActual(user.id);

      if (!organizacionId) {
        return;
      }

      const { data, error } = await supabase.rpc(
        "obtener_estado_clave_edicion",
        {
          p_organizacion_id: organizacionId,
        },
      );

      if (error) {
        console.error("Error obteniendo clave dinámica:", error);

        return;
      }

      if (!data) {
        return;
      }

      setClaveDinamica(data.clave);

      const tiempoRestante = Number(data.tiempo_restante);

      const tiempoTranscurrido = 60000 - tiempoRestante;

      if (!animacionInicializada.current) {
        setClaveAnimacion(tiempoTranscurrido);

        animacionInicializada.current = true;
      }

      if (timeoutClave.current) {
        clearTimeout(timeoutClave.current);
      }

      timeoutClave.current = setTimeout(() => {
        cargarClaveDinamica();
      }, tiempoRestante);
    } catch (error) {
      console.error("Error cargando clave dinámica:", error);
    }
  };

  // =========================================================
  // INICIALIZACIÓN
  // =========================================================

  useEffect(() => {
    cargarDatos();
    cargarClaveDinamica();

    return () => {
      if (timeoutClave.current) {
        clearTimeout(timeoutClave.current);
      }
    };
  }, []);

  // =========================================================
  // NAVEGACIÓN DE GRÁFICAS
  // =========================================================

  const siguienteGrafica = () => {
    setGraficaActiva((actual) => (actual + 1) % graficas.length);
  };

  const anteriorGrafica = () => {
    setGraficaActiva(
      (actual) => (actual - 1 + graficas.length) % graficas.length,
    );
  };

  const graficaActual = graficas[graficaActiva];

  const valorMaximo = graficaActual?.datos?.length
    ? Math.max(...graficaActual.datos.map((dato) => Number(dato.valor) || 0), 1)
    : 1;

  // =========================================================
  // FORMATO DINERO
  // =========================================================

  const formatoDinero = (valor) =>
    `$${Number(valor || 0).toLocaleString("es-CO")}`;

  // =========================================================
  // RENDER
  // =========================================================
  // =========================================================
  // EXPLORADOR DE INGRESOS
  // =========================================================

  const obtenerFechaJornadaActual = () => {
    const ahora = new Date();
    const horaInicio = preferencias?.horaInicio || "08:00";
    const [hora, minuto] = horaInicio.substring(0, 5).split(":").map(Number);
    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
    const minutosInicio = hora * 60 + minuto;
    const fecha = new Date(ahora);

    if (minutosActuales < minutosInicio) {
      fecha.setDate(fecha.getDate() - 1);
    }

    fecha.setHours(0, 0, 0, 0);
    return fecha;
  };

  const esDiaTrabajoIngreso = (fecha) => {
    const dias = [
      "domingo",
      "lunes",
      "martes",
      "miercoles",
      "jueves",
      "viernes",
      "sabado",
    ];

    return preferencias?.diasTrabajo?.[dias[fecha.getDay()]] !== false;
  };

  const esMesTrabajoIngreso = (fecha) => {
    const meses = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];

    return preferencias?.mesesTrabajo?.[meses[fecha.getMonth()]] !== false;
  };

  const convertirFechaIngreso = (fecha) => {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatearFechaIngreso = (fecha, incluirAnio = true) =>
    fecha.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      ...(incluirAnio ? { year: "numeric" } : {}),
    });

  const obtenerInicioSemanaTrabajo = (fecha) => {
    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);

    while (!esDiaTrabajoIngreso(inicio)) {
      inicio.setDate(inicio.getDate() - 1);
    }

    return inicio;
  };

  const obtenerOpcionesReporteIngresos = (tipo) => {
    const fechaJornada = obtenerFechaJornadaActual();
    const opciones = [];

    if (tipo === "hoy") {
      let cursor = new Date(fechaJornada);
      let encontrados = 0;

      while (encontrados < 30) {
        if (esDiaTrabajoIngreso(cursor) && esMesTrabajoIngreso(cursor)) {
          const iso = convertirFechaIngreso(cursor);

          opciones.push({
            id: `dia-${iso}`,
            tipo,
            inicio: new Date(cursor),
            fin: new Date(cursor),
            titulo: formatearFechaIngreso(cursor),
            subtitulo:
              encontrados === 0 ? "Jornada actual" : "Jornada anterior",
          });

          encontrados += 1;
        }

        cursor.setDate(cursor.getDate() - 1);
      }

      return opciones;
    }

    if (tipo === "semana") {
      let inicio = obtenerInicioSemanaTrabajo(fechaJornada);

      for (let i = 0; i < 12; i += 1) {
        const fin = new Date(inicio);
        fin.setDate(fin.getDate() + 6);
        fin.setHours(0, 0, 0, 0);

        opciones.push({
          id: `semana-${convertirFechaIngreso(inicio)}`,
          tipo,
          inicio: new Date(inicio),
          fin,
          titulo: `Semana del ${formatearFechaIngreso(inicio, false)}`,
          subtitulo: `${formatearFechaIngreso(inicio, false)} – ${formatearFechaIngreso(fin)}`,
        });

        inicio.setDate(inicio.getDate() - 7);
      }

      return opciones;
    }

    if (tipo === "mes") {
      let cursor = new Date(
        fechaJornada.getFullYear(),
        fechaJornada.getMonth(),
        1,
      );

      for (let i = 0; i < 12; i += 1) {
        if (esMesTrabajoIngreso(cursor)) {
          const fin = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
          fin.setHours(0, 0, 0, 0);

          opciones.push({
            id: `mes-${cursor.getFullYear()}-${cursor.getMonth()}`,
            tipo,
            inicio: new Date(cursor),
            fin,
            titulo: cursor.toLocaleDateString("es-CO", {
              month: "long",
              year: "numeric",
            }),
            subtitulo: i === 0 ? "Mes actual" : "Mes anterior",
          });
        }

        cursor.setMonth(cursor.getMonth() - 1);
      }

      return opciones;
    }

    if (tipo === "anio") {
      const anioActual = fechaJornada.getFullYear();
      const anioMinimoConDatos = historialIngresos.length
        ? Math.min(
            ...historialIngresos
              .filter((fila) => fila.fecha)
              .map((fila) => Number(String(fila.fecha).substring(0, 4)))
              .filter(Number.isFinite),
          )
        : anioActual;

      const anioMinimo = Math.min(anioMinimoConDatos, anioActual);

      for (let anio = anioActual; anio >= anioMinimo; anio -= 1) {
        const inicio = new Date(anio, 0, 1);
        const fin = new Date(anio, 11, 31);
        inicio.setHours(0, 0, 0, 0);
        fin.setHours(0, 0, 0, 0);

        opciones.push({
          id: `anio-${anio}`,
          tipo,
          inicio,
          fin,
          titulo: String(anio),
          subtitulo: anio === anioActual ? "Año actual" : "Año anterior",
        });
      }
    }

    return opciones;
  };

  const construirFilasRangoIngresos = (rango) => {
    if (!rango) return [];

    const filas = [];
    const cursor = new Date(rango.inicio);
    const fin = new Date(rango.fin);
    const horaInicio = preferencias?.horaInicio || "08:00";
    const horaFin = preferencias?.horaFin || "18:00";

    cursor.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);

    while (cursor <= fin) {
      const fechaISO = convertirFechaIngreso(cursor);
      const activa = esDiaTrabajoIngreso(cursor) && esMesTrabajoIngreso(cursor);

      if (activa) {
        const estadistica = historialIngresos.find(
          (fila) => String(fila.fecha).substring(0, 10) === fechaISO,
        );

        const efectivo = Number(estadistica?.efectivo || 0);
        const transferencia = Number(estadistica?.transferencia || 0);
        const datafono = Number(estadistica?.datafono || 0);
        const otro = Number(estadistica?.otro || 0);
        const total = efectivo + transferencia + datafono + otro;

        filas.push({
          Fecha: fechaISO,
          Jornada: `${horaInicio} - ${horaFin}`,
          Domicilios: Number(estadistica?.domicilios_total || 0),
          Pagados: Number(estadistica?.domicilios_pagados || 0),
          Pendientes: Number(estadistica?.domicilios_pendientes || 0),
          Efectivo: efectivo,
          Transferencia: transferencia,
          Datáfono: datafono,
          Otro: otro,
          Total: total,
        });
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return filas;
  };

  const obtenerResumenRangoIngresos = (rango) => {
    const filas = construirFilasRangoIngresos(rango);

    return filas.reduce(
      (acumulado, fila) => ({
        domicilios: acumulado.domicilios + fila.Domicilios,
        pagados: acumulado.pagados + fila.Pagados,
        pendientes: acumulado.pendientes + fila.Pendientes,
        efectivo: acumulado.efectivo + fila.Efectivo,
        transferencia: acumulado.transferencia + fila.Transferencia,
        datafono: acumulado.datafono + fila.Datáfono,
        otro: acumulado.otro + fila.Otro,
        total: acumulado.total + fila.Total,
      }),
      {
        domicilios: 0,
        pagados: 0,
        pendientes: 0,
        efectivo: 0,
        transferencia: 0,
        datafono: 0,
        otro: 0,
        total: 0,
      },
    );
  };

  const abrirReporteIngresos = (tipo = "hoy") => {
    const opciones = obtenerOpcionesReporteIngresos(tipo);
    const primeraOpcion = opciones[0] || null;

    setPeriodoReporte(tipo);
    setFormatoReporte("excel");
    setOpcionesReporteIngresos(opciones);
    setRangoReporteIngresos(primeraOpcion);
    setModalReporteIngresos(true);
  };

  const seleccionarRangoReporteIngresos = (rango) => {
    setRangoReporteIngresos(rango);
  };

  const descargarReporteIngresos = async () => {
    try {
      setCargandoReporteIngresos(true);

      if (!rangoReporteIngresos) {
        alert("Selecciona un período para generar el reporte.");
        return;
      }

      const filas = construirFilasRangoIngresos(rangoReporteIngresos);
      const resumen = obtenerResumenRangoIngresos(rangoReporteIngresos);

      if (filas.length === 0) {
        alert("No hay jornadas de trabajo configuradas para este período.");
        return;
      }

      const nombreArchivo = `${rangoReporteIngresos.tipo}-${convertirFechaIngreso(
        rangoReporteIngresos.inicio,
      )}`;

      if (formatoReporte === "excel") {
        // =====================================================
        // EXCEL PROFESIONAL — SOLO REPORTE DE INGRESOS
        // =====================================================

        const workbook = new ExcelJS.Workbook();

        workbook.creator = "Liquisistema";
        workbook.lastModifiedBy = "Liquisistema";
        workbook.created = new Date();
        workbook.modified = new Date();

        const colorPrincipal = "2563EB";
        const colorOscuro = "172033";
        const colorSuave = "F3F6FA";
        const colorBorde = "D9E2F0";
        const colorVerde = "E8F7EF";
        const colorAmarillo = "FFF7DB";

        const formatoMonedaExcel = "$#,##0";
        const formatoFechaExcel = "dd/mm/yyyy";

        // =====================================================
        // HOJA 1 — RESUMEN
        // =====================================================

        const hojaResumen = workbook.addWorksheet("Resumen", {
          views: [{ showGridLines: false }],
        });

        hojaResumen.columns = [
          { width: 24 },
          { width: 30 },
          { width: 4 },
          { width: 22 },
          { width: 22 },
          { width: 22 },
        ];

        hojaResumen.mergeCells("A1:F1");
        const titulo = hojaResumen.getCell("A1");
        titulo.value = "LIQUISISTEMA";
        titulo.font = {
          name: "Calibri",
          size: 20,
          bold: true,
          color: { argb: "FFFFFFFF" },
        };
        titulo.alignment = {
          horizontal: "left",
          vertical: "middle",
        };
        titulo.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: colorOscuro },
        };
        hojaResumen.getRow(1).height = 34;

        hojaResumen.mergeCells("A2:F2");
        const subtitulo = hojaResumen.getCell("A2");
        subtitulo.value = "REPORTE DE INGRESOS";
        subtitulo.font = {
          name: "Calibri",
          size: 12,
          bold: true,
          color: { argb: "FFFFFFFF" },
        };
        subtitulo.alignment = {
          horizontal: "left",
          vertical: "middle",
        };
        subtitulo.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: colorPrincipal },
        };
        hojaResumen.getRow(2).height = 24;

        hojaResumen.getCell("A4").value = "Período";
        hojaResumen.getCell("B4").value = rangoReporteIngresos.titulo;

        hojaResumen.getCell("A5").value = "Rango";
        hojaResumen.getCell("B5").value =
          `${formatearFechaIngreso(rangoReporteIngresos.inicio)} – ${formatearFechaIngreso(rangoReporteIngresos.fin)}`;

        hojaResumen.getCell("A6").value = "Jornada";
        hojaResumen.getCell("B6").value =
          `${preferencias?.horaInicio || "08:00"} - ${preferencias?.horaFin || "18:00"}`;

        ["A4", "A5", "A6"].forEach((direccion) => {
          const celda = hojaResumen.getCell(direccion);
          celda.font = { bold: true, color: { argb: colorOscuro } };
          celda.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: colorSuave },
          };
          celda.border = {
            bottom: { style: "thin", color: { argb: colorBorde } },
          };
        });

        ["B4", "B5", "B6"].forEach((direccion) => {
          const celda = hojaResumen.getCell(direccion);
          celda.font = { color: { argb: colorOscuro } };
          celda.border = {
            bottom: { style: "thin", color: { argb: colorBorde } },
          };
        });

        hojaResumen.mergeCells("A8:F8");
        const tituloResumen = hojaResumen.getCell("A8");
        tituloResumen.value = "RESUMEN DEL PERÍODO";
        tituloResumen.font = {
          bold: true,
          size: 12,
          color: { argb: "FFFFFFFF" },
        };
        tituloResumen.alignment = {
          horizontal: "left",
          vertical: "middle",
        };
        tituloResumen.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: colorPrincipal },
        };
        hojaResumen.getRow(8).height = 24;

        const indicadores = [
          ["Domicilios", resumen.domicilios],
          ["Pagados", resumen.pagados],
          ["Pendientes", resumen.pendientes],
          ["Efectivo", resumen.efectivo],
          ["Transferencia", resumen.transferencia],
          ["Datáfono", resumen.datafono],
          ["Otro", resumen.otro],
          ["TOTAL RECAUDADO", resumen.total],
        ];

        indicadores.forEach(([etiqueta, valor], indice) => {
          const fila = 9 + indice;
          const celdaEtiqueta = hojaResumen.getCell(`A${fila}`);
          const celdaValor = hojaResumen.getCell(`B${fila}`);

          celdaEtiqueta.value = etiqueta;
          celdaValor.value = Number(valor || 0);

          celdaEtiqueta.border = {
            bottom: { style: "thin", color: { argb: colorBorde } },
          };
          celdaValor.border = {
            bottom: { style: "thin", color: { argb: colorBorde } },
          };

          if (etiqueta === "TOTAL RECAUDADO") {
            celdaEtiqueta.font = {
              bold: true,
              size: 12,
              color: { argb: "FFFFFFFF" },
            };
            celdaValor.font = {
              bold: true,
              size: 14,
              color: { argb: "FFFFFFFF" },
            };

            celdaEtiqueta.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: colorPrincipal },
            };
            celdaValor.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: colorPrincipal },
            };

            celdaValor.numFmt = formatoMonedaExcel;
          } else {
            celdaEtiqueta.font = {
              bold: etiqueta === "Domicilios" || etiqueta === "Pagados",
              color: { argb: colorOscuro },
            };

            celdaValor.font = {
              bold: true,
              color: { argb: colorOscuro },
            };

            if (
              ["Efectivo", "Transferencia", "Datáfono", "Otro"].includes(
                etiqueta,
              )
            ) {
              celdaValor.numFmt = formatoMonedaExcel;
            }

            if (etiqueta === "Pendientes") {
              celdaEtiqueta.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: colorAmarillo },
              };
              celdaValor.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: colorAmarillo },
              };
            }
          }
        });

        hojaResumen.getCell("D18").value = "INFORMACIÓN DEL REPORTE";
        hojaResumen.getCell("D18").font = {
          bold: true,
          color: { argb: "FFFFFFFF" },
        };
        hojaResumen.getCell("D18").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: colorPrincipal },
        };

        hojaResumen.mergeCells("D18:F18");

        hojaResumen.getCell("D19").value = "Generado";
        hojaResumen.getCell("E19").value = new Date();
        hojaResumen.getCell("E19").numFmt = "dd/mm/yyyy hh:mm";

        hojaResumen.getCell("D20").value = "Tipo";
        hojaResumen.getCell("E20").value =
          rangoReporteIngresos.tipo === "hoy"
            ? "Jornada"
            : rangoReporteIngresos.tipo === "semana"
              ? "Semana"
              : rangoReporteIngresos.tipo === "mes"
                ? "Mes"
                : "Año";

        hojaResumen.getCell("D21").value = "Jornadas incluidas";
        hojaResumen.getCell("E21").value = filas.length;

        hojaResumen.getCell("D22").value = "Moneda";
        hojaResumen.getCell("E22").value = "COP";

        ["D19", "D20", "D21", "D22"].forEach((direccion) => {
          hojaResumen.getCell(direccion).font = {
            bold: true,
            color: { argb: colorOscuro },
          };
        });

        ["E19", "E20", "E21", "E22"].forEach((direccion) => {
          hojaResumen.getCell(direccion).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: colorSuave },
          };
        });

        hojaResumen.getRow(17).height = 8;

        hojaResumen.mergeCells("A23:F23");
        const nota = hojaResumen.getCell("A23");
        nota.value =
          "Los valores monetarios corresponden únicamente a domicilios registrados como Pagados.";
        nota.font = {
          italic: true,
          size: 10,
          color: { argb: "64748B" },
        };
        nota.alignment = {
          wrapText: true,
        };

        // =====================================================
        // HOJA 2 — DETALLE DIARIO
        // =====================================================

        const hojaDetalle = workbook.addWorksheet("Detalle diario", {
          views: [{ showGridLines: false }],
        });

        hojaDetalle.columns = [
          { header: "Fecha", key: "Fecha", width: 15 },
          { header: "Jornada", key: "Jornada", width: 19 },
          { header: "Domicilios", key: "Domicilios", width: 14 },
          { header: "Pagados", key: "Pagados", width: 12 },
          { header: "Pendientes", key: "Pendientes", width: 14 },
          { header: "Efectivo", key: "Efectivo", width: 17 },
          { header: "Transferencia", key: "Transferencia", width: 19 },
          { header: "Datáfono", key: "Datáfono", width: 16 },
          { header: "Otro", key: "Otro", width: 15 },
          { header: "Total", key: "Total", width: 18 },
        ];

        filas.forEach((fila) => {
          const filaExcel = hojaDetalle.addRow({
            Fecha: new Date(`${fila.Fecha}T00:00:00`),
            Jornada: fila.Jornada,
            Domicilios: fila.Domicilios,
            Pagados: fila.Pagados,
            Pendientes: fila.Pendientes,
            Efectivo: fila.Efectivo,
            Transferencia: fila.Transferencia,
            Datáfono: fila.Datáfono,
            Otro: fila.Otro,
            Total: fila.Total,
          });

          filaExcel.getCell("Fecha").numFmt = formatoFechaExcel;

          ["Efectivo", "Transferencia", "Datáfono", "Otro", "Total"].forEach(
            (columna) => {
              filaExcel.getCell(columna).numFmt = formatoMonedaExcel;
            },
          );
        });

        const encabezadoDetalle = hojaDetalle.getRow(1);

        encabezadoDetalle.height = 28;

        encabezadoDetalle.eachCell((celda) => {
          celda.font = {
            bold: true,
            color: { argb: "FFFFFFFF" },
          };
          celda.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: colorPrincipal },
          };
          celda.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          celda.border = {
            top: { style: "thin", color: { argb: "FFFFFFFF" } },
            bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
          };
        });

        for (let fila = 2; fila <= hojaDetalle.rowCount; fila += 1) {
          const filaActual = hojaDetalle.getRow(fila);

          filaActual.eachCell((celda) => {
            celda.border = {
              bottom: { style: "hair", color: { argb: colorBorde } },
            };
            celda.alignment = {
              vertical: "middle",
            };
          });

          if (fila % 2 === 0) {
            filaActual.eachCell((celda) => {
              celda.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "F8FAFC" },
              };
            });
          }

          filaActual.getCell("Total").font = {
            bold: true,
            color: { argb: colorOscuro },
          };
        }

        hojaDetalle.views = [{ state: "frozen", ySplit: 1 }];

        if (filas.length > 0) {
          hojaDetalle.autoFilter = {
            from: "A1",
            to: `J${filas.length + 1}`,
          };
          hojaDetalle.autoFilter = {
            from: "A1",
            to: `J${filas.length + 1}`,
          };
        }

        // =====================================================
        // DESCARGA EN EL NAVEGADOR
        // =====================================================

        const buffer = await workbook.xlsx.writeBuffer();

        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const url = window.URL.createObjectURL(blob);
        const enlace = document.createElement("a");

        enlace.href = url;
        enlace.download = `reporte-ingresos-${nombreArchivo}.xlsx`;

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        window.URL.revokeObjectURL(url);

        setModalReporteIngresos(false);
        return;
      }

      if (formatoReporte === "pdf") {
        const doc = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4",
        });

        // =====================================================
        // CONFIGURACIÓN VISUAL
        // =====================================================

        const anchoPagina = doc.internal.pageSize.getWidth();
        const altoPagina = doc.internal.pageSize.getHeight();

        const azulPrincipal = [37, 99, 235];
        const azulOscuro = [15, 23, 42];
        const azulSuave = [239, 246, 255];
        const grisTexto = [71, 85, 105];
        const grisBorde = [226, 232, 240];
        const grisFondo = [248, 250, 252];
        const verde = [22, 163, 74];
        const amarillo = [245, 158, 11];

        const moneda = (valor) =>
          `$${Number(valor || 0).toLocaleString("es-CO")}`;

        // =====================================================
        // ENCABEZADO PRINCIPAL
        // =====================================================

        doc.setFillColor(...azulOscuro);
        doc.rect(0, 0, anchoPagina, 17, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("LIQUISISTEMA", 14, 11);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("Sistema de gestión de domicilios", anchoPagina - 14, 10, {
          align: "right",
        });

        // =====================================================
        // TÍTULO
        // =====================================================

        doc.setTextColor(...azulOscuro);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.text("REPORTE DE INGRESOS", 14, 29);

        doc.setTextColor(grisTexto[0], grisTexto[1], grisTexto[2]);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);

        doc.text(`Período: ${rangoReporteIngresos.titulo}`, 14, 36);

        doc.text(
          `Rango: ${formatearFechaIngreso(
            rangoReporteIngresos.inicio,
          )} - ${formatearFechaIngreso(rangoReporteIngresos.fin)}`,
          14,
          42,
        );

        doc.text(
          `Jornada: ${preferencias?.horaInicio || "08:00"} - ${
            preferencias?.horaFin || "18:00"
          }`,
          14,
          48,
        );

        // =====================================================
        // INFORMACIÓN DEL REPORTE
        // =====================================================

        const infoX = anchoPagina - 92;
        const infoY = 24;
        const infoW = 78;
        const infoH = 29;

        doc.setFillColor(...grisFondo);
        doc.setDrawColor(...grisBorde);
        doc.roundedRect(infoX, infoY, infoW, infoH, 3, 3, "FD");

        doc.setFillColor(...azulPrincipal);
        doc.roundedRect(infoX, infoY, infoW, 8, 3, 3, "F");

        // Cubrimos la parte inferior de las esquinas superiores
        doc.rect(infoX, infoY + 4, infoW, 4, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("INFORMACIÓN DEL REPORTE", infoX + 4, infoY + 5.5);

        doc.setTextColor(...grisTexto);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text("Generado", infoX + 4, infoY + 14);

        doc.text("Tipo", infoX + 4, infoY + 20);

        doc.text("Jornadas", infoX + 4, infoY + 26);

        doc.setFont("helvetica", "normal");

        doc.text(
          new Date().toLocaleString("es-CO", {
            dateStyle: "short",
            timeStyle: "short",
          }),
          infoX + 25,
          infoY + 14,
        );

        doc.text(
          rangoReporteIngresos.tipo === "hoy"
            ? "Jornada"
            : rangoReporteIngresos.tipo === "semana"
              ? "Semana"
              : rangoReporteIngresos.tipo === "mes"
                ? "Mes"
                : "Año",
          infoX + 25,
          infoY + 20,
        );

        doc.text(String(filas.length), infoX + 25, infoY + 26);

        // =====================================================
        // RESUMEN DEL PERÍODO
        // =====================================================

        const resumenY = 59;

        doc.setFillColor(...azulPrincipal);
        doc.roundedRect(14, resumenY, anchoPagina - 28, 9, 3, 3, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("RESUMEN DEL PERÍODO", 18, resumenY + 6);

        // =====================================================
        // TARJETAS DE RESUMEN
        // =====================================================

        const tarjetaY = resumenY + 13;
        const separacion = 4;
        const margen = 14;
        const anchoDisponible = anchoPagina - margen * 2;
        const anchoTarjeta = (anchoDisponible - separacion * 3) / 4;

        const tarjetas = [
          {
            titulo: "DOMICILIOS",
            valor: resumen.domicilios,
            color: azulPrincipal,
          },
          {
            titulo: "PAGADOS",
            valor: resumen.pagados,
            color: verde,
          },
          {
            titulo: "PENDIENTES",
            valor: resumen.pendientes,
            color: amarillo,
          },
          {
            titulo: "TOTAL RECAUDADO",
            valor: moneda(resumen.total),
            color: azulPrincipal,
          },
        ];

        tarjetas.forEach((tarjeta, index) => {
          const x = margen + index * (anchoTarjeta + separacion);

          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(...grisBorde);
          doc.roundedRect(x, tarjetaY, anchoTarjeta, 23, 3, 3, "FD");

          doc.setFillColor(...tarjeta.color);
          doc.roundedRect(x, tarjetaY, 3, 23, 1.5, 1.5, "F");

          doc.setTextColor(...grisTexto);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.text(tarjeta.titulo, x + 7, tarjetaY + 7);

          doc.setTextColor(...azulOscuro);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(index === 3 ? 13 : 15);

          doc.text(String(tarjeta.valor), x + 7, tarjetaY + 17);
        });

        // =====================================================
        // MÉTODOS DE PAGO
        // =====================================================

        const pagosY = tarjetaY + 30;

        doc.setTextColor(...azulOscuro);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("DESGLOSE POR MÉTODO DE PAGO", 14, pagosY);

        const pagos = [
          ["Efectivo", resumen.efectivo],
          ["Transferencia", resumen.transferencia],
          ["Datáfono", resumen.datafono],
          ["Otro", resumen.otro],
        ];

        const pagoAncho = (anchoPagina - 28 - separacion * 3) / 4;

        pagos.forEach(([nombre, valor], index) => {
          const x = 14 + index * (pagoAncho + separacion);

          doc.setFillColor(...grisFondo);
          doc.setDrawColor(...grisBorde);
          doc.roundedRect(x, pagosY + 4, pagoAncho, 17, 2.5, 2.5, "FD");

          doc.setTextColor(...grisTexto);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.text(nombre, x + 5, pagosY + 11);

          doc.setTextColor(...azulOscuro);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.text(moneda(valor), x + pagoAncho - 5, pagosY + 11, {
            align: "right",
          });
        });

        // =====================================================
        // DETALLE DIARIO
        // =====================================================

        const columnas = [
          "Fecha",
          "Jornada",
          "Domicilios",
          "Pagados",
          "Pendientes",
          "Efectivo",
          "Transferencia",
          "Datáfono",
          "Otro",
          "Total",
        ];

        const filasPDF = filas.map((fila) => [
          fila.Fecha,
          fila.Jornada,
          fila.Domicilios,
          fila.Pagados,
          fila.Pendientes,
          moneda(fila.Efectivo),
          moneda(fila.Transferencia),
          moneda(fila.Datáfono),
          moneda(fila.Otro),
          moneda(fila.Total),
        ]);

        const detalleY = pagosY + 29;

        doc.setTextColor(...azulOscuro);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("DETALLE DIARIO", 14, detalleY);

        autoTable(doc, {
          head: [columnas],
          body: filasPDF,

          startY: detalleY + 4,

          theme: "grid",

          margin: {
            left: 14,
            right: 14,
            top: 20,
            bottom: 16,
          },

          styles: {
            font: "helvetica",
            fontSize: 7,
            cellPadding: 2.5,
            textColor: [51, 65, 85],
            lineColor: grisBorde,
            lineWidth: 0.2,
            valign: "middle",
          },

          headStyles: {
            fillColor: azulPrincipal,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 7,
            halign: "center",
            valign: "middle",
          },

          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },

          columnStyles: {
            0: {
              cellWidth: 24,
              halign: "center",
            },
            1: {
              cellWidth: 27,
              halign: "center",
            },
            2: {
              cellWidth: 21,
              halign: "center",
            },
            3: {
              cellWidth: 19,
              halign: "center",
            },
            4: {
              cellWidth: 22,
              halign: "center",
            },
            5: {
              cellWidth: 27,
              halign: "right",
            },
            6: {
              cellWidth: 30,
              halign: "right",
            },
            7: {
              cellWidth: 27,
              halign: "right",
            },
            8: {
              cellWidth: 24,
              halign: "right",
            },
            9: {
              cellWidth: 27,
              halign: "right",
              fontStyle: "bold",
            },
          },

          didDrawPage: (data) => {
            // Línea superior del pie
            doc.setDrawColor(...grisBorde);
            doc.setLineWidth(0.3);
            doc.line(14, altoPagina - 12, anchoPagina - 14, altoPagina - 12);

            // Pie izquierdo
            doc.setTextColor(...grisTexto);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);

            doc.text("Liquisistema · Reporte de ingresos", 14, altoPagina - 7);

            // Número de página
            doc.text(
              `Página ${data.pageNumber}`,
              anchoPagina - 14,
              altoPagina - 7,
              { align: "right" },
            );
          },
        });

        // =====================================================
        // NOTA FINAL
        // =====================================================

        const ultimaY = doc.lastAutoTable.finalY + 8;

        if (ultimaY < altoPagina - 20) {
          doc.setFillColor(...azulSuave);
          doc.setDrawColor(...grisBorde);

          doc.roundedRect(14, ultimaY, anchoPagina - 28, 11, 2.5, 2.5, "FD");

          doc.setTextColor(...grisTexto);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(7.5);

          doc.text(
            "Los valores monetarios corresponden únicamente a domicilios registrados como Pagados.",
            18,
            ultimaY + 7,
          );
        }

        // =====================================================
        // GUARDAR
        // =====================================================

        doc.save(`reporte-ingresos-${nombreArchivo}.pdf`);

        setModalReporteIngresos(false);
      }
    } catch (error) {
      console.error("Error generando reporte de ingresos:", error);
      alert("No fue posible generar el reporte.");
    } finally {
      setCargandoReporteIngresos(false);
    }
  };

  const resumenRangoActivo = rangoReporteIngresos
    ? obtenerResumenRangoIngresos(rangoReporteIngresos)
    : null;

  return (
    <div className={styles.adminInicio}>
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className={styles.adminInicioHeader}>
        <div>
          <h1>Inicio</h1>

          <div className={styles.adminInicioClave}>
            <span>Clave dinámica de edición</span>

            <div className={styles.adminInicioClaveBox}>
              <svg
                className={styles.adminInicioClaveSvg}
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
                style={{
                  "--clave-offset": `-${claveAnimacion}ms`,
                }}
              >
                <rect
                  className={styles.adminInicioClaveRastro}
                  x="1"
                  y="1"
                  width="98"
                  height="38"
                  rx="8"
                  pathLength="100"
                />
              </svg>

              <strong>{claveDinamica || "------"}</strong>
            </div>
          </div>
        </div>

        <div className={styles.adminInicioFecha}>
          {new Date().toLocaleDateString("es-CO", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
      </div>

      {/* =====================================================
          ESTADÍSTICAS PRINCIPALES
      ====================================================== */}

      <section className={styles.adminInicioStats}>
        <div className={styles.adminInicioStatCard}>
          <div className={styles.adminInicioStatIcon}>
            <TruckIcon />
          </div>

          <div>
            <span>Domicilios del día</span>

            <strong>{cargando ? "..." : estadisticas.domicilios}</strong>
          </div>
        </div>

        <div className={styles.adminInicioStatCard}>
          <div className={styles.adminInicioStatIcon}>
            <ClockIcon />
          </div>

          <div>
            <span>Pendientes</span>

            <strong>{cargando ? "..." : estadisticas.pendientes}</strong>
          </div>
        </div>

        <div className={styles.adminInicioStatCard}>
          <div className={styles.adminInicioStatIcon}>
            <CheckCircleIcon />
          </div>

          <div>
            <span>Pagados</span>

            <strong>{cargando ? "..." : estadisticas.pagados}</strong>
          </div>
        </div>

        <div className={styles.adminInicioStatCard}>
          <div className={styles.adminInicioStatIcon}>
            <BanknotesIcon />
          </div>

          <div>
            <span>Recaudado</span>

            <strong>
              {cargando ? "..." : formatoDinero(estadisticas.recaudado)}
            </strong>
          </div>
        </div>
      </section>

      {/* =====================================================
          PARTE CENTRAL
      ====================================================== */}

      <section className={styles.adminInicioGrid}>
        {/* ---------------------------------------------------
            ACTIVIDAD
        ---------------------------------------------------- */}

        <div className={styles.adminInicioPanel}>
          <div className={styles.adminInicioPanelHeader}>
            <div>
              <h2>Actividad reciente</h2>

              <p>Movimientos registrados durante el día.</p>
            </div>

            <BoltIcon />
          </div>

          <div className={styles.adminInicioActivity}>
            {cargandoActividades ? (
              <div className={styles.adminInicioActivityItem}>
                <div className={styles.adminInicioActivityDot}></div>

                <div>
                  <strong>Cargando actividad...</strong>

                  <span>Consultando los movimientos recientes.</span>
                </div>
              </div>
            ) : actividades.length === 0 ? (
              <div className={styles.adminInicioActivityItem}>
                <div className={styles.adminInicioActivityDot}></div>

                <div>
                  <strong>Sin actividad reciente</strong>

                  <span>Aún no hay movimientos registrados.</span>
                </div>
              </div>
            ) : (
              actividades.slice(0, 5).map((actividad) => (
                <div
                  className={styles.adminInicioActivityItem}
                  key={actividad.id}
                >
                  <div className={styles.adminInicioActivityDot}></div>

                  <div>
                    <strong>
                      {actividad.usuarios?.nombre || "Usuario"}{" "}
                      {actividad.tipo === "domicilio"
                        ? "creó un domicilio"
                        : actividad.tipo === "cliente"
                          ? "creó un cliente"
                          : actividad.accion === "crear"
                            ? "creó un usuario"
                            : actividad.accion === "editar"
                              ? "editó un usuario"
                              : actividad.accion === "cambio_estado"
                                ? "cambió el estado de un usuario"
                                : actividad.accion === "compartir"
                                  ? "compartió un usuario"
                                  : actividad.accion === "compartir_aceptado"
                                    ? "aceptó un usuario compartido"
                                    : actividad.accion === "compartir_rechazado"
                                      ? "rechazó un usuario compartido"
                                      : actividad.accion}
                    </strong>

                    <span>
                      {actividad.descripcion ||
                        "Se realizó una acción en el sistema."}
                    </span>
                  </div>

                  <small>
                    {new Date(actividad.created_at).toLocaleString("es-CO", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ---------------------------------------------------
            DOMICILIARIOS
        ---------------------------------------------------- */}

        <div className={styles.adminInicioPanel}>
          <div className={styles.adminInicioPanelHeader}>
            <div>
              <h2>Domiciliarios</h2>

              <p>Usuarios registrados como domiciliarios.</p>
            </div>

            <UserGroupIcon />
          </div>

          <div className={styles.adminInicioDomiciliarios}>
            <div className={styles.adminInicioDomiciliarioTotal}>
              <strong>{cargando ? "..." : estadisticas.domiciliarios}</strong>

              <span>Domiciliarios registrados</span>
            </div>

            <div className={styles.adminInicioEstado}>
              <span className={styles.adminInicioEstadoPunto}></span>
              Sistema conectado
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          RESUMEN DEL DÍA
      ====================================================== */}

      <section className={styles.adminInicioResumen}>
        <div className={styles.adminInicioResumenHeader}>
          <div>
            <h2>Resumen del día</h2>

            <p>Recaudación distribuida por método de pago.</p>
          </div>
        </div>

        <div className={styles.adminInicioPagos}>
          <div className={styles.adminInicioPago}>
            <span>Efectivo</span>

            <strong>
              {cargando ? "..." : formatoDinero(estadisticas.efectivo)}
            </strong>
          </div>

          <div className={styles.adminInicioPago}>
            <span>Transferencia</span>

            <strong>
              {cargando ? "..." : formatoDinero(estadisticas.transferencia)}
            </strong>
          </div>

          <div className={styles.adminInicioPago}>
            <span>Datáfono</span>

            <strong>
              {cargando ? "..." : formatoDinero(estadisticas.datafono)}
            </strong>
          </div>

          <div className={styles.adminInicioPago}>
            <span>Otro</span>

            <strong>
              {cargando ? "..." : formatoDinero(estadisticas.otro)}
            </strong>
          </div>
        </div>
      </section>

      {/* =====================================================
          ANÁLISIS DE ACTIVIDAD
      ====================================================== */}

      <div className={styles.adminInicioAnalisis}>
        {/* ---------------------------------------------------
            GRÁFICAS
        ---------------------------------------------------- */}

        <section className={styles.adminInicioGraficas}>
          <div className={styles.adminInicioGraficasHeader}>
            <div>
              <h2>{graficaActual.titulo}</h2>

              <p>{graficaActual.descripcion}</p>
            </div>

            <div className={styles.adminInicioGraficasControles}>
              <button
                type="button"
                onClick={anteriorGrafica}
                aria-label="Gráfica anterior"
              >
                <ChevronLeftIcon />
              </button>

              <button
                type="button"
                onClick={siguienteGrafica}
                aria-label="Siguiente gráfica"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>

          <div className={styles.adminInicioGrafica}>
            {graficaActual.datos.length === 0 ? (
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "220px",
                  opacity: 0.7,
                }}
              >
                No hay datos para mostrar en el período configurado.
              </div>
            ) : (
              graficaActual.datos.map((dato) => (
                <div
                  key={dato.etiqueta}
                  className={styles.adminInicioGraficaColumna}
                >
                  <strong>{dato.valor}</strong>

                  <div className={styles.adminInicioGraficaBarraContenedor}>
                    <div
                      className={styles.adminInicioGraficaBarra}
                      style={{
                        height: `${(Number(dato.valor) / valorMaximo) * 100}%`,
                      }}
                    />
                  </div>

                  <span>{dato.etiqueta}</span>
                </div>
              ))
            )}
          </div>

          <div className={styles.adminInicioGraficasPuntos}>
            {graficas.map((grafica, indice) => (
              <button
                key={grafica.id}
                type="button"
                className={
                  indice === graficaActiva
                    ? styles.adminInicioGraficaPuntoActivo
                    : styles.adminInicioGraficaPunto
                }
                onClick={() => setGraficaActiva(indice)}
                aria-label={`Mostrar ${grafica.titulo}`}
              />
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------
            INGRESOS
        ---------------------------------------------------- */}

        <div className={styles.adminInicioIngresos}>
          <h2>Ingresos</h2>

          <p>
            Resumen de recaudación real. Selecciona un período para explorar sus
            jornadas.
          </p>

          <div className={styles.adminInicioIngresosLista}>
            <button
              type="button"
              className={styles.adminInicioIngresoItem}
              onClick={() => abrirReporteIngresos("hoy")}
            >
              <span>Hoy</span>
              <strong>{cargando ? "..." : formatoDinero(ingresos.hoy)}</strong>
              <small>Explorar fechas →</small>
            </button>

            <button
              type="button"
              className={styles.adminInicioIngresoItem}
              onClick={() => abrirReporteIngresos("semana")}
            >
              <span>Esta semana</span>
              <strong>
                {cargando ? "..." : formatoDinero(ingresos.semana)}
              </strong>
              <small>Explorar semanas →</small>
            </button>

            <button
              type="button"
              className={styles.adminInicioIngresoItem}
              onClick={() => abrirReporteIngresos("mes")}
            >
              <span>Este mes</span>
              <strong>{cargando ? "..." : formatoDinero(ingresos.mes)}</strong>
              <small>Explorar meses →</small>
            </button>

            <button
              type="button"
              className={styles.adminInicioIngresoItem}
              onClick={() => abrirReporteIngresos("anio")}
            >
              <span>Este año</span>
              <strong>{cargando ? "..." : formatoDinero(ingresos.anio)}</strong>
              <small>Explorar años →</small>
            </button>
          </div>
        </div>
      </div>

      {modalReporteIngresos && (
        <div
          className={styles.modalReporteOverlay}
          onClick={() => setModalReporteIngresos(false)}
        >
          <div
            className={styles.modalReporteExplorador}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalReporteHeader}>
              <div>
                <span className={styles.modalReporteEyebrow}>Ingresos</span>
                <h2>
                  {periodoReporte === "hoy"
                    ? "Explorar jornadas"
                    : periodoReporte === "semana"
                      ? "Explorar semanas"
                      : periodoReporte === "mes"
                        ? "Explorar meses"
                        : "Explorar años"}
                </h2>
                <p>
                  Consulta períodos anteriores sin cambiar el resumen principal.
                </p>
              </div>

              <button
                type="button"
                className={styles.modalReporteCerrar}
                onClick={() => setModalReporteIngresos(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className={styles.ingresosExplorador}>
              <div className={styles.ingresosPeriodos}>
                <div className={styles.ingresosPeriodosHeader}>
                  <div>
                    <strong>
                      {periodoReporte === "hoy"
                        ? "Fechas de trabajo"
                        : periodoReporte === "semana"
                          ? "Semanas de trabajo"
                          : periodoReporte === "mes"
                            ? "Meses de operación"
                            : "Años disponibles"}
                    </strong>
                    <span>Selecciona un período</span>
                  </div>
                </div>

                <div className={styles.ingresosPeriodosLista}>
                  {opcionesReporteIngresos.length === 0 ? (
                    <div className={styles.ingresosSinPeriodos}>
                      No hay períodos configurados para mostrar.
                    </div>
                  ) : (
                    opcionesReporteIngresos.map((opcion) => (
                      <button
                        key={opcion.id}
                        type="button"
                        className={
                          rangoReporteIngresos?.id === opcion.id
                            ? styles.ingresosPeriodoActivo
                            : styles.ingresosPeriodo
                        }
                        onClick={() => seleccionarRangoReporteIngresos(opcion)}
                      >
                        <span>
                          <strong>{opcion.titulo}</strong>
                          <small>{opcion.subtitulo}</small>
                        </span>
                        <b>→</b>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className={styles.ingresosDetalle}>
                {rangoReporteIngresos && resumenRangoActivo ? (
                  <>
                    <div className={styles.ingresosDetalleHeader}>
                      <div>
                        <span>Período seleccionado</span>
                        <h3>{rangoReporteIngresos.titulo}</h3>
                        <p>
                          {formatearFechaIngreso(rangoReporteIngresos.inicio)}
                          {rangoReporteIngresos.inicio.getTime() !==
                          rangoReporteIngresos.fin.getTime()
                            ? ` – ${formatearFechaIngreso(rangoReporteIngresos.fin)}`
                            : ""}
                        </p>
                      </div>

                      <div className={styles.ingresosDetalleTotal}>
                        <span>Total recaudado</span>
                        <strong>
                          {formatoDinero(resumenRangoActivo.total)}
                        </strong>
                      </div>
                    </div>

                    <div className={styles.ingresosResumenGrid}>
                      <div>
                        <span>Domicilios</span>
                        <strong>{resumenRangoActivo.domicilios}</strong>
                      </div>
                      <div>
                        <span>Pagados</span>
                        <strong>{resumenRangoActivo.pagados}</strong>
                      </div>
                      <div>
                        <span>Pendientes</span>
                        <strong>{resumenRangoActivo.pendientes}</strong>
                      </div>
                    </div>

                    <div className={styles.ingresosMetodos}>
                      <div>
                        <span>Efectivo</span>
                        <strong>
                          {formatoDinero(resumenRangoActivo.efectivo)}
                        </strong>
                      </div>
                      <div>
                        <span>Transferencia</span>
                        <strong>
                          {formatoDinero(resumenRangoActivo.transferencia)}
                        </strong>
                      </div>
                      <div>
                        <span>Datáfono</span>
                        <strong>
                          {formatoDinero(resumenRangoActivo.datafono)}
                        </strong>
                      </div>
                      <div>
                        <span>Otro</span>
                        <strong>
                          {formatoDinero(resumenRangoActivo.otro)}
                        </strong>
                      </div>
                    </div>

                    <div className={styles.ingresosDescarga}>
                      <div>
                        <span>Descargar este período</span>
                        <small>Excel incluye resumen y detalle diario.</small>
                      </div>

                      <div className={styles.ingresosFormatos}>
                        <button
                          type="button"
                          className={
                            formatoReporte === "excel"
                              ? styles.modalReporteOpcionActiva
                              : styles.modalReporteOpcion
                          }
                          onClick={() => setFormatoReporte("excel")}
                        >
                          📊 Excel
                        </button>
                        <button
                          type="button"
                          className={
                            formatoReporte === "pdf"
                              ? styles.modalReporteOpcionActiva
                              : styles.modalReporteOpcion
                          }
                          onClick={() => setFormatoReporte("pdf")}
                        >
                          📄 PDF
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={styles.ingresosSinSeleccion}>
                    Selecciona un período para ver sus ingresos.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalReporteAcciones}>
              <button
                type="button"
                className={styles.modalReporteCancelar}
                onClick={() => setModalReporteIngresos(false)}
              >
                Cerrar
              </button>

              <button
                type="button"
                className={styles.modalReporteDescargar}
                onClick={descargarReporteIngresos}
                disabled={cargandoReporteIngresos || !rangoReporteIngresos}
              >
                {cargandoReporteIngresos ? "Generando..." : "Descargar reporte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
