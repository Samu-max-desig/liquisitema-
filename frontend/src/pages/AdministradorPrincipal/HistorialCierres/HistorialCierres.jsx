import { useEffect, useState } from "react";
import {
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  EyeIcon,
  XMarkIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  CreditCardIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";

import { supabase } from "../../../config/supabase";
import styles from "./HistorialCierres.module.css";

export default function HistorialCierres() {
  const [cierres, setCierres] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [fechaFiltro, setFechaFiltro] = useState("");

  const [cierreSeleccionado, setCierreSeleccionado] = useState(null);

  const [organizacionSeleccionada, setOrganizacionSeleccionada] =
    useState(null);

  const [organizacionCargada, setOrganizacionCargada] = useState(false);

  const [domiciliosCierre, setDomiciliosCierre] = useState([]);

  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // ==========================================
  // CARGAR ORGANIZACIÓN DEL USUARIO
  // ==========================================

  const cargarOrganizacionUsuario = async () => {
    try {
      const {
        data: { user },
        error: errorAuth,
      } = await supabase.auth.getUser();

      if (errorAuth || !user) {
        console.error("Error obteniendo usuario:", errorAuth);
        setOrganizacionCargada(true);
        return;
      }

      // Obtener rol del usuario
      const { data: usuario, error: errorUsuario } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", user.id)
        .single();

      if (errorUsuario || !usuario) {
        console.error("Error obteniendo usuario:", errorUsuario);
        setOrganizacionCargada(true);
        return;
      }

      console.log("USUARIO EN CIERRES:", usuario);

      // SUPER ADMIN → puede ver todas las organizaciones
      if (usuario.rol === "super_admin") {
        setOrganizacionSeleccionada(null);
        setOrganizacionCargada(true);
        return;
      }

      // ADMIN → obtener sus organizaciones asociadas
      const { data: organizaciones, error: errorOrganizaciones } =
        await supabase.rpc("obtener_organizaciones_usuario");

      if (errorOrganizaciones) {
        console.error(
          "Error obteniendo organizaciones del usuario:",
          errorOrganizaciones,
        );
        setOrganizacionCargada(true);
        return;
      }

      console.log("ORGANIZACIONES DEL USUARIO:", organizaciones);

      if (!organizaciones || organizaciones.length === 0) {
        console.error("El usuario no tiene una organización asignada.");
        setOrganizacionCargada(true);
        return;
      }

      // Usar la primera organización activa
      setOrganizacionSeleccionada(organizaciones[0].organizacion_id);

      setOrganizacionCargada(true);
    } catch (error) {
      console.error("Error cargando organización:", error);
      setOrganizacionCargada(true);
    }
  };

  // ==========================================
  // CARGAR CIERRES
  // ==========================================

  const cargarCierres = async () => {
    setCargando(true);

    try {
      let consulta = supabase
        .from("cierres_dia")
        .select(
          `
        id,
        fecha,
        domiciliario_id,
        organizacion_id,
        total_domicilios,
        total_recaudado,
        total_pagados,
        total_pendientes,
        total_cancelados,
        total_reportados,
        usuarios!cierres_dia_domiciliario_id_fkey (
          id,
          nombre
        )
      `,
        )
        .order("fecha", { ascending: false });

      // ADMIN → solamente su organización
      if (organizacionSeleccionada) {
        consulta = consulta.eq("organizacion_id", organizacionSeleccionada);
      }

      const { data, error } = await consulta;

      if (error) {
        console.error("Error cargando cierres:", error);
        setCierres([]);
        return;
      }

      console.log("CIERRES CARGADOS:", data);

      setCierres(data || []);
    } catch (error) {
      console.error("Error general cargando cierres:", error);
      setCierres([]);
    } finally {
      setCargando(false);
    }
  };

  // ==========================================
  // CARGAR AL ENTRAR
  // ==========================================

  useEffect(() => {
    cargarOrganizacionUsuario();
  }, []);

  useEffect(() => {
    if (!organizacionCargada) return;

    cargarCierres();
  }, [organizacionCargada, organizacionSeleccionada]);
  // ==========================================
  // FILTROS
  // ==========================================

  const cierresFiltrados = cierres.filter((cierre) => {
    const nombre = cierre.usuarios?.nombre?.toLowerCase() || "";

    const coincideBusqueda = nombre.includes(busqueda.toLowerCase());

    const fechaCierre = cierre.fecha
      ? new Date(cierre.fecha).toISOString().split("T")[0]
      : "";

    const coincideFecha = !fechaFiltro || fechaCierre === fechaFiltro;

    return coincideBusqueda && coincideFecha;
  });

  // ==========================================
  // VER DETALLE
  // ==========================================

  const verDetalle = async (cierre) => {
    setCierreSeleccionado(cierre);
    setDomiciliosCierre([]);
    setCargandoDetalle(true);

    const { data, error } = await supabase
      .from("domicilios")
      .select(
        `
        id,
        cliente,
        telefono,
        direccion,
        costo,
        estado,
        metodo_pago,
        comprobante_url,
        created_at
        `,
      )
      .eq("cierre_id", cierre.id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Error cargando detalle del cierre:", error);

      setDomiciliosCierre([]);
    } else {
      setDomiciliosCierre(data || []);
    }

    setCargandoDetalle(false);
  };

  const cerrarDetalle = () => {
    setCierreSeleccionado(null);
    setDomiciliosCierre([]);
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setFechaFiltro("");
  };

  const hayFiltros = busqueda || fechaFiltro;

  // ==========================================
  // CALCULAR MÉTODOS DE PAGO
  // ==========================================

  const calcularMetodoPago = (metodo) => {
    const domicilios = domiciliosCierre.filter(
      (domicilio) =>
        (domicilio.metodo_pago || "").toLowerCase() === metodo.toLowerCase(),
    );

    const cantidad = domicilios.length;

    const total = domicilios
      .filter((domicilio) => domicilio.estado === "Pagado")
      .reduce((acc, domicilio) => acc + Number(domicilio.costo || 0), 0);

    return {
      cantidad,
      total,
    };
  };

  const efectivo = calcularMetodoPago("Efectivo");
  const transferencia = calcularMetodoPago("Transferencia");
  const datafono = calcularMetodoPago("Datáfono");
  const otro = calcularMetodoPago("Otro");

  // ==========================================
  // FORMATO DINERO
  // ==========================================

  const formatoDinero = (valor) => {
    return `$${Number(valor || 0).toLocaleString("es-CO")}`;
  };

  return (
    <div className={styles.contenedor}>
      {/* =====================================
          ENCABEZADO
          ===================================== */}

      <div className={styles.encabezado}>
        <div>
          <h1>Historial de cierres</h1>

          <p>Consulta los cierres realizados por los domiciliarios.</p>
        </div>

        <div className={styles.contador}>
          <ClipboardDocumentListIcon />
          <span>{cierresFiltrados.length}</span>
          cierre
          {cierresFiltrados.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* =====================================
          FILTROS
          ===================================== */}

      <div className={styles.filtros}>
        <div className={styles.buscador}>
          <MagnifyingGlassIcon />

          <input
            type="text"
            placeholder="Buscar domiciliario..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className={styles.fecha}>
          <CalendarDaysIcon />

          <input
            type="date"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
          />
        </div>

        {hayFiltros && (
          <button className={styles.btnLimpiar} onClick={limpiarFiltros}>
            <XMarkIcon />
            Limpiar
          </button>
        )}
      </div>

      {/* =====================================
          LISTA DE CIERRES
          ===================================== */}

      {cargando ? (
        <div className={styles.estado}>
          <div className={styles.spinner}></div>
          <p>Cargando cierres...</p>
        </div>
      ) : cierresFiltrados.length === 0 ? (
        <div className={styles.vacio}>
          <ClipboardDocumentListIcon />

          <h2>No hay cierres registrados</h2>

          <p>
            {hayFiltros
              ? "No encontramos cierres con esos filtros."
              : "Todavía no se ha realizado ningún cierre."}
          </p>
        </div>
      ) : (
        <div className={styles.lista}>
          {cierresFiltrados.map((cierre) => (
            <div key={cierre.id} className={styles.tarjeta}>
              <div className={styles.tarjetaPrincipal}>
                <div className={styles.icono}>
                  <UserIcon />
                </div>

                <div className={styles.informacion}>
                  <h3>{cierre.usuarios?.nombre || "Domiciliario"}</h3>

                  <span>
                    {cierre.fecha
                      ? new Date(cierre.fecha).toLocaleString("es-CO", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Sin fecha"}
                  </span>
                </div>
              </div>

              <div className={styles.estadisticas}>
                <div>
                  <span>Domicilios</span>

                  <strong>{cierre.total_domicilios ?? 0}</strong>
                </div>

                <div>
                  <span>Pagados</span>

                  <strong>{cierre.total_pagados ?? 0}</strong>
                </div>

                <div>
                  <span>Pendientes</span>

                  <strong>{cierre.total_pendientes ?? 0}</strong>
                </div>

                <div>
                  <span>Recaudado</span>

                  <strong>{formatoDinero(cierre.total_recaudado)}</strong>
                </div>
              </div>

              <button
                className={styles.btnVer}
                onClick={() => verDetalle(cierre)}
              >
                <EyeIcon />
                Ver
              </button>
            </div>
          ))}
        </div>
      )}

      {/* =====================================
          MODAL DETALLE
          ===================================== */}

      {cierreSeleccionado && (
        <div className={styles.overlay} onClick={cerrarDetalle}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {/* HEADER */}

            <div className={styles.modalHeader}>
              <div>
                <h2>Detalle del cierre</h2>

                <p>{cierreSeleccionado.usuarios?.nombre || "Domiciliario"}</p>
              </div>

              <button className={styles.btnCerrar} onClick={cerrarDetalle}>
                <XMarkIcon />
              </button>
            </div>

            {/* =================================
                RESUMEN DEL CIERRE
                ================================= */}

            <div className={styles.resumen}>
              <div>
                <span>Fecha</span>

                <strong>
                  {cierreSeleccionado.fecha
                    ? new Date(cierreSeleccionado.fecha).toLocaleDateString(
                        "es-CO",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )
                    : "Sin fecha"}
                </strong>
              </div>

              <div>
                <span>Domicilios</span>

                <strong>{cierreSeleccionado.total_domicilios ?? 0}</strong>
              </div>

              <div>
                <span>Total recaudado</span>

                <strong>
                  {formatoDinero(cierreSeleccionado.total_recaudado)}
                </strong>
              </div>
            </div>

            {/* =================================
                MÉTODOS DE PAGO
                ================================= */}

            {!cargandoDetalle && (
              <div className={styles.metodosPago}>
                <h3>Resumen de pagos</h3>

                <div className={styles.metodosGrid}>
                  {/* EFECTIVO */}

                  <div
                    className={`${styles.metodoCard} ${styles.metodoEfectivo}`}
                  >
                    <div className={styles.metodoIcono}>
                      <BanknotesIcon />
                    </div>

                    <div className={styles.metodoInfo}>
                      <span>Efectivo</span>

                      <strong>{efectivo.cantidad}</strong>

                      <small>{formatoDinero(efectivo.total)}</small>
                    </div>
                  </div>

                  {/* TRANSFERENCIA */}

                  <div
                    className={`${styles.metodoCard} ${styles.metodoTransferencia}`}
                  >
                    <div className={styles.metodoIcono}>
                      <ArrowsRightLeftIcon />
                    </div>

                    <div className={styles.metodoInfo}>
                      <span>Transferencia</span>

                      <strong>{transferencia.cantidad}</strong>

                      <small>{formatoDinero(transferencia.total)}</small>
                    </div>
                  </div>

                  {/* DATÁFONO */}

                  <div
                    className={`${styles.metodoCard} ${styles.metodoDatafono}`}
                  >
                    <div className={styles.metodoIcono}>
                      <CreditCardIcon />
                    </div>

                    <div className={styles.metodoInfo}>
                      <span>Datáfono</span>

                      <strong>{datafono.cantidad}</strong>

                      <small>{formatoDinero(datafono.total)}</small>
                    </div>
                  </div>

                  {/* OTRO */}

                  <div className={`${styles.metodoCard} ${styles.metodoOtro}`}>
                    <div className={styles.metodoIcono}>
                      <ClipboardDocumentListIcon />
                    </div>

                    <div className={styles.metodoInfo}>
                      <span>Otro</span>

                      <strong>{otro.cantidad}</strong>

                      <small>{formatoDinero(otro.total)}</small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================
                DOMICILIOS
                ================================= */}

            <div className={styles.domicilios}>
              <h3>Domicilios del cierre</h3>

              {cargandoDetalle ? (
                <div className={styles.cargandoDetalle}>
                  <div className={styles.spinner}></div>

                  <span>Cargando domicilios...</span>
                </div>
              ) : domiciliosCierre.length === 0 ? (
                <div className={styles.sinDomicilios}>
                  <ClipboardDocumentListIcon />

                  <p>No hay domicilios asociados a este cierre.</p>
                </div>
              ) : (
                <div className={styles.tablaWrapper}>
                  <table>
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Valor</th>
                        <th>Método</th>
                        <th>Estado</th>
                        <th>Comprobante</th>
                      </tr>
                    </thead>

                    <tbody>
                      {domiciliosCierre.map((domicilio) => (
                        <tr key={domicilio.id}>
                          <td>
                            <strong>{domicilio.cliente || "Cliente"}</strong>
                          </td>

                          <td>{formatoDinero(domicilio.costo)}</td>

                          <td>{domicilio.metodo_pago || "Sin método"}</td>

                          <td>
                            <span className={styles.estadoDomicilio}>
                              {domicilio.estado}
                            </span>
                          </td>

                          <td>
                            {domicilio.comprobante_url ? (
                              <a
                                href={domicilio.comprobante_url}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.verComprobante}
                              >
                                Ver
                              </a>
                            ) : (
                              <span>Sin comprobante</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
