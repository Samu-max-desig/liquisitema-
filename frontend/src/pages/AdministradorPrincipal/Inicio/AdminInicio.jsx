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
import * as XLSX from "xlsx";
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
  const [periodoReporte, setPeriodoReporte] = useState("todos");
  const [formatoReporte, setFormatoReporte] = useState("excel");
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

    periodoEstadisticas: "anual",

    estadisticas: {
      ventas: true,
      domicilios: true,
      pendientes: true,
      reportes: true,
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
  const abrirReporteIngresos = (periodo = "todos") => {
    setPeriodoReporte(periodo);
    setFormatoReporte("excel");
    setModalReporteIngresos(true);
  };
  const descargarReporteIngresos = async () => {
    try {
      // =====================================================
      // USUARIO AUTENTICADO
      // =====================================================

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("No hay usuario autenticado:", authError);
        return;
      }

      // =====================================================
      // ORGANIZACIÓN ACTUAL
      // =====================================================

      const organizacionId = await obtenerOrganizacionActual(user.id);

      if (!organizacionId) {
        console.error("No se encontró la organización.");
        return;
      }

      /*
       * Traemos las estadísticas reales.
       */
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
        otro
      `,
        )
        .eq("organizacion_id", organizacionId)
        .order("fecha", { ascending: true });

      if (error) throw error;

      let estadisticas = data || [];

      /*
       * Fecha de la jornada actual.
       */
      const ahora = new Date();

      const horaInicio = preferencias?.horaInicio || "08:00";

      const [hora, minuto] = horaInicio.split(":").map(Number);

      const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();

      const minutosInicio = hora * 60 + minuto;

      const fechaJornada = new Date(ahora);

      if (minutosActuales < minutosInicio) {
        fechaJornada.setDate(fechaJornada.getDate() - 1);
      }

      const fechaJornadaISO = [
        fechaJornada.getFullYear(),
        String(fechaJornada.getMonth() + 1).padStart(2, "0"),
        String(fechaJornada.getDate()).padStart(2, "0"),
      ].join("-");

      /*
       * =========================
       * FILTRO DEL PERIODO
       * =========================
       */

      if (periodoReporte !== "todos") {
        let fechaInicio;

        if (periodoReporte === "hoy") {
          fechaInicio = new Date(fechaJornada);
        }

        if (periodoReporte === "semana") {
          fechaInicio = new Date(fechaJornada);

          const dia = fechaInicio.getDay();

          const diasDesdeLunes = dia === 0 ? 6 : dia - 1;

          fechaInicio.setDate(fechaInicio.getDate() - diasDesdeLunes);
        }

        if (periodoReporte === "mes") {
          fechaInicio = new Date(
            fechaJornada.getFullYear(),
            fechaJornada.getMonth(),
            1,
          );
        }

        if (periodoReporte === "anio") {
          fechaInicio = new Date(fechaJornada.getFullYear(), 0, 1);
        }

        const fechaInicioISO = [
          fechaInicio.getFullYear(),
          String(fechaInicio.getMonth() + 1).padStart(2, "0"),
          String(fechaInicio.getDate()).padStart(2, "0"),
        ].join("-");

        estadisticas = estadisticas.filter(
          (fila) =>
            fila.fecha >= fechaInicioISO && fila.fecha <= fechaJornadaISO,
        );
      }

      /*
       * =========================
       * PREPARAR DATOS
       * =========================
       */

      const filas = estadisticas.map((fila) => {
        const efectivo = Number(fila.efectivo || 0);

        const transferencia = Number(fila.transferencia || 0);

        const datafono = Number(fila.datafono || 0);

        const otro = Number(fila.otro || 0);

        const total = efectivo + transferencia + datafono + otro;

        return {
          Fecha: fila.fecha,
          Jornada: `${horaInicio} - ${preferencias?.horaFin || "18:00"}`,
          Domicilios: Number(fila.domicilios_total || 0),
          Pagados: Number(fila.domicilios_pagados || 0),
          Pendientes: Number(fila.domicilios_pendientes || 0),
          Efectivo: efectivo,
          Transferencia: transferencia,
          Datáfono: datafono,
          Otro: otro,
          Total: total,
        };
      });

      /*
       * Si no existen datos.
       */
      if (filas.length === 0) {
        alert("No hay estadísticas disponibles para el periodo seleccionado.");
        return;
      }

      /*
       * =========================
       * EXCEL
       * =========================
       */

      if (formatoReporte === "excel") {
        const hoja = XLSX.utils.json_to_sheet(filas);

        hoja["!cols"] = [
          { wch: 14 },
          { wch: 18 },
          { wch: 12 },
          { wch: 10 },
          { wch: 12 },
          { wch: 15 },
          { wch: 18 },
          { wch: 14 },
          { wch: 12 },
          { wch: 15 },
        ];

        const libro = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(libro, hoja, "Ingresos");

        const nombrePeriodo =
          periodoReporte === "todos" ? "todos-los-dias" : periodoReporte;

        XLSX.writeFile(libro, `reporte-ingresos-${nombrePeriodo}.xlsx`);

        setModalReporteIngresos(false);

        return;
      }

      /*
       * =========================
       * PDF
       * =========================
       */

      if (formatoReporte === "pdf") {
        const doc = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4",
        });

        doc.setFontSize(18);
        doc.text("Reporte de ingresos", 14, 15);

        doc.setFontSize(10);

        const nombresPeriodo = {
          todos: "Todos los días",
          hoy: "Hoy",
          semana: "Esta semana",
          mes: "Este mes",
          anio: "Este año",
        };

        doc.text(`Periodo: ${nombresPeriodo[periodoReporte]}`, 14, 22);

        doc.text(
          `Jornada: ${horaInicio} - ${preferencias?.horaFin || "18:00"}`,
          14,
          28,
        );

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
          `$${fila.Efectivo.toLocaleString("es-CO")}`,
          `$${fila.Transferencia.toLocaleString("es-CO")}`,
          `$${fila.Datáfono.toLocaleString("es-CO")}`,
          `$${fila.Otro.toLocaleString("es-CO")}`,
          `$${fila.Total.toLocaleString("es-CO")}`,
        ]);

        autoTable(doc, {
          head: [columnas],
          body: filasPDF,
          startY: 34,
          styles: {
            fontSize: 7,
          },
          headStyles: {
            fontSize: 7,
          },
        });

        const nombrePeriodo =
          periodoReporte === "todos" ? "todos-los-dias" : periodoReporte;

        doc.save(`reporte-ingresos-${nombrePeriodo}.pdf`);

        setModalReporteIngresos(false);
      }
    } catch (error) {
      console.error("Error generando reporte:", error);

      alert("No fue posible generar el reporte.");
    }
  };
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

          <p>Resumen de recaudación real.</p>

          <div className={styles.adminInicioIngresosLista}>
            {/* HOY */}
            <button
              type="button"
              className={styles.adminInicioIngresoItem}
              onClick={() => abrirReporteIngresos("hoy")}
            >
              <span>Hoy</span>

              <strong>{cargando ? "..." : formatoDinero(ingresos.hoy)}</strong>

              <small>Ver reporte →</small>
            </button>

            {/* SEMANA */}
            <button
              type="button"
              className={styles.adminInicioIngresoItem}
              onClick={() => abrirReporteIngresos("semana")}
            >
              <span>Esta semana</span>

              <strong>
                {cargando ? "..." : formatoDinero(ingresos.semana)}
              </strong>

              <small>Ver reporte →</small>
            </button>

            {/* MES */}
            <button
              type="button"
              className={styles.adminInicioIngresoItem}
              onClick={() => abrirReporteIngresos("mes")}
            >
              <span>Este mes</span>

              <strong>{cargando ? "..." : formatoDinero(ingresos.mes)}</strong>

              <small>Ver reporte →</small>
            </button>

            {/* AÑO */}
            <button
              type="button"
              className={styles.adminInicioIngresoItem}
              onClick={() => abrirReporteIngresos("anio")}
            >
              <span>Este año</span>

              <strong>{cargando ? "..." : formatoDinero(ingresos.anio)}</strong>

              <small>Ver reporte →</small>
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
            className={styles.modalReporte}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ENCABEZADO */}
            <div className={styles.modalReporteHeader}>
              <div>
                <h2>Descargar reporte de ingresos</h2>

                <p>Selecciona el periodo y el formato del reporte.</p>
              </div>

              <button
                type="button"
                className={styles.modalReporteCerrar}
                onClick={() => setModalReporteIngresos(false)}
              >
                ×
              </button>
            </div>

            {/* PERIODO */}
            <div className={styles.modalReporteSeccion}>
              <h3>Periodo del reporte</h3>

              <div className={styles.modalReporteOpciones}>
                <button
                  type="button"
                  className={
                    periodoReporte === "todos"
                      ? styles.modalReporteOpcionActiva
                      : styles.modalReporteOpcion
                  }
                  onClick={() => setPeriodoReporte("todos")}
                >
                  Todos los días
                </button>

                <button
                  type="button"
                  className={
                    periodoReporte === "semana"
                      ? styles.modalReporteOpcionActiva
                      : styles.modalReporteOpcion
                  }
                  onClick={() => setPeriodoReporte("semana")}
                >
                  Semana
                </button>

                <button
                  type="button"
                  className={
                    periodoReporte === "mes"
                      ? styles.modalReporteOpcionActiva
                      : styles.modalReporteOpcion
                  }
                  onClick={() => setPeriodoReporte("mes")}
                >
                  Mes
                </button>

                <button
                  type="button"
                  className={
                    periodoReporte === "anio"
                      ? styles.modalReporteOpcionActiva
                      : styles.modalReporteOpcion
                  }
                  onClick={() => setPeriodoReporte("anio")}
                >
                  Año
                </button>
              </div>
            </div>

            {/* FORMATO */}
            <div className={styles.modalReporteSeccion}>
              <h3>Formato</h3>

              <div className={styles.modalReporteOpciones}>
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

            {/* RESUMEN */}
            <div className={styles.modalReporteResumen}>
              <span>Periodo seleccionado</span>

              <strong>
                {periodoReporte === "todos" && "Todos los días"}
                {periodoReporte === "semana" && "Esta semana"}
                {periodoReporte === "mes" && "Este mes"}
                {periodoReporte === "anio" && "Este año"}
              </strong>

              <span>Formato</span>

              <strong>
                {formatoReporte === "excel" ? "Excel (.xlsx)" : "PDF (.pdf)"}
              </strong>
            </div>

            {/* BOTONES */}
            <div className={styles.modalReporteAcciones}>
              <button
                type="button"
                className={styles.modalReporteCancelar}
                onClick={() => setModalReporteIngresos(false)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={styles.modalReporteDescargar}
                onClick={descargarReporteIngresos}
              >
                Descargar reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
