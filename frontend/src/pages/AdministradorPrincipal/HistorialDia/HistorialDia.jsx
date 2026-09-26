import { useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

import { supabase } from "../../../config/supabase";
import Swal from "sweetalert2";

import styles from "./HistorialDia.module.css";

export default function HistorialDia() {
  const [domicilios, setDomicilios] = useState([]);
  const [domiciliarios, setDomiciliarios] = useState([]);

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

      let listaUsuarios = [];

      if (idsDomiciliarios.length > 0) {
        const { data: usuarios, error: errorUsuarios } = await supabase
          .from("usuarios")
          .select("id, nombre, rol, estado")
          .in("id", idsDomiciliarios);

        if (errorUsuarios) {
          console.error("Error cargando domiciliarios:", errorUsuarios);
        } else {
          listaUsuarios = usuarios || [];
        }
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

    const { value: clave } = await Swal.fire({
      title: "Confirmar pago",
      html: `
        <p style="margin-bottom: 12px;">
          Vas a marcar como <strong>Pagado</strong> el domicilio de
          <strong>${domicilio.cliente || "este cliente"}</strong>.
        </p>
        <p style="font-size: 13px; color: #64748b; margin-bottom: 10px;">
          Ingresa la clave dinámica de edición.
        </p>
      `,
      input: "text",
      inputPlaceholder: "Clave dinámica",
      inputAttributes: {
        maxlength: "6",
        inputmode: "numeric",
        autocomplete: "off",
      },
      showCancelButton: true,
      confirmButtonText: "Confirmar pago",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      inputValidator: (value) => {
        if (!value?.trim()) return "Ingresa la clave dinámica.";
        return undefined;
      },
    });

    if (!clave) return;

    const { data: validacion, error: errorClave } = await supabase.rpc(
      "validar_y_consumir_clave_edicion",
      {
        p_clave: clave.trim(),
        p_organizacion_id: organizacionActual,
      },
    );

    if (errorClave) {
      console.error("Error validando clave:", errorClave);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo validar la clave dinámica.",
      });
      return;
    }

    if (!validacion?.valida) {
      Swal.fire({
        icon: "error",
        title: "Clave no válida",
        text:
          validacion?.mensaje ||
          "La clave es incorrecta, ya fue utilizada o ha expirado.",
      });
      return;
    }

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
        text: "La clave fue validada, pero el domicilio no pudo marcarse como pagado.",
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
      timer: 1800,
      showConfirmButton: false,
    });
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

          <FunnelIcon />
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
                  <td colSpan="8" className={styles.historialDiaTablaVacia}>
                    Cargando historial...
                  </td>
                </tr>
              ) : domiciliosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="8" className={styles.historialDiaTablaVacia}>
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

                    <td className={styles.historialDiaDireccion}>
                      {domicilio.direccion || "Sin dirección"}
                    </td>

                    <td>
                      <strong>{formatoDinero(domicilio.costo)}</strong>
                    </td>

                    <td>{domicilio.metodo_pago || "Sin método"}</td>

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
                      {domicilio.estado === "Entregado" ? (
                        <button
                          type="button"
                          className={styles.historialDiaAccion}
                          onClick={() => marcarComoPagado(domicilio)}
                        >
                          Marcar pagado
                        </button>
                      ) : (
                        <span className={styles.historialDiaAccionVacia}>
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
