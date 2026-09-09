import { useEffect, useState } from "react";
import {
  MagnifyingGlassIcon,
  UserIcon,
  CalendarDaysIcon,
  XMarkIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";

import { supabase } from "../../../config/supabase";
import styles from "./Galeria.module.css";

export default function Galeria() {
  const [comprobantes, setComprobantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [organizacionId, setOrganizacionId] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [domiciliarioFiltro, setDomiciliarioFiltro] = useState("");
  const [fechaFiltro, setFechaFiltro] = useState("");

  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);

  // ================================
  // CARGAR COMPROBANTES
  // ================================

  const cargarGaleria = async () => {
    setCargando(true);

    // Obtener usuario actual
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Error obteniendo usuario:", authError);
      setComprobantes([]);
      setCargando(false);
      return;
    }

    // Obtener organización del usuario
    // Obtener organización del usuario
    const { data: usuario, error: usuarioError } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (usuarioError || !usuario) {
      console.error("Error obteniendo usuario:", usuarioError);
      setComprobantes([]);
      setCargando(false);
      return;
    }

    let organizacionActual = null;

    // SUPER ADMIN → puede ver todas las organizaciones
    if (usuario.rol === "super_admin") {
      organizacionActual = null;
    } else {
      // ADMIN → obtener organización desde usuarios_organizaciones
      const { data: organizaciones, error: errorOrganizaciones } =
        await supabase.rpc("obtener_organizaciones_usuario");

      if (errorOrganizaciones) {
        console.error("Error obteniendo organizaciones:", errorOrganizaciones);
        setComprobantes([]);
        setCargando(false);
        return;
      }

      console.log("ORGANIZACIONES DEL USUARIO:", organizaciones);

      if (!organizaciones || organizaciones.length === 0) {
        console.error("El usuario no tiene una organización asignada.");
        setComprobantes([]);
        setCargando(false);
        return;
      }

      organizacionActual = organizaciones[0].organizacion_id;
    }

    setOrganizacionId(organizacionActual);

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
      comprobante_url,
      created_at,
      domiciliario_id,
      organizacion_id,
      usuarios!domicilios_domiciliario_id_fkey (
        id,
        nombre
      )
      `,
      )
      .eq("organizacion_id", organizacionActual)
      .not("comprobante_url", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando galería:", error);
      setComprobantes([]);
      setCargando(false);
      return;
    }

    setComprobantes(data || []);
    setCargando(false);
  };

  useEffect(() => {
    cargarGaleria();
  }, []);

  // ================================
  // DOMICILIARIOS
  // ================================

  const domiciliarios = [
    ...new Map(
      comprobantes
        .filter((item) => item.usuarios?.id)
        .map((item) => [item.usuarios.id, item.usuarios]),
    ).values(),
  ];

  // ================================
  // FILTROS
  // ================================

  const comprobantesFiltrados = comprobantes.filter((item) => {
    const cliente = item.cliente?.toLowerCase() || "";
    const domiciliario = item.usuarios?.nombre?.toLowerCase() || "";
    const texto = busqueda.toLowerCase();

    const coincideBusqueda =
      cliente.includes(texto) || domiciliario.includes(texto);

    const coincideDomiciliario =
      !domiciliarioFiltro || item.usuarios?.id === domiciliarioFiltro;

    const fechaDomicilio = item.created_at
      ? new Date(item.created_at).toISOString().split("T")[0]
      : "";

    const coincideFecha = !fechaFiltro || fechaDomicilio === fechaFiltro;

    return coincideBusqueda && coincideDomiciliario && coincideFecha;
  });

  const limpiarFiltros = () => {
    setBusqueda("");
    setDomiciliarioFiltro("");
    setFechaFiltro("");
  };

  const hayFiltros = busqueda || domiciliarioFiltro || fechaFiltro;

  // ================================
  // RENDER
  // ================================

  return (
    <div className={styles.contenedor}>
      {/* ENCABEZADO */}
      <div className={styles.encabezado}>
        <div>
          <h1>Galería</h1>

          <p>Comprobantes de los domicilios realizados.</p>
        </div>

        <div className={styles.contador}>
          <PhotoIcon />
          <span>{comprobantesFiltrados.length}</span>
          comprobante
          {comprobantesFiltrados.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* FILTROS */}
      <div className={styles.filtros}>
        {/* BUSCADOR */}
        <div className={styles.buscador}>
          <MagnifyingGlassIcon />

          <input
            type="text"
            placeholder="Buscar cliente o domiciliario..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* DOMICILIARIO */}
        <div className={styles.selectWrapper}>
          <UserIcon />

          <select
            value={domiciliarioFiltro}
            onChange={(e) => setDomiciliarioFiltro(e.target.value)}
          >
            <option value="">Todos los domiciliarios</option>

            {domiciliarios.map((domiciliario) => (
              <option key={domiciliario.id} value={domiciliario.id}>
                {domiciliario.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* FECHA */}
        <div className={styles.fecha}>
          <CalendarDaysIcon />

          <input
            type="date"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
          />
        </div>

        {/* LIMPIAR */}
        {hayFiltros && (
          <button className={styles.btnLimpiar} onClick={limpiarFiltros}>
            <XMarkIcon />
            Limpiar
          </button>
        )}
      </div>

      {/* ================================
          CONTENIDO
          ================================ */}

      {cargando ? (
        <div className={styles.estado}>
          <div className={styles.spinner}></div>

          <p>Cargando comprobantes...</p>
        </div>
      ) : comprobantesFiltrados.length === 0 ? (
        <div className={styles.vacio}>
          <div className={styles.iconoVacio}>
            <PhotoIcon />
          </div>

          <h2>No hay comprobantes</h2>

          <p>
            {hayFiltros
              ? "No encontramos comprobantes con esos filtros."
              : "Todavía no se han registrado comprobantes."}
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {comprobantesFiltrados.map((domicilio) => (
            <button
              key={domicilio.id}
              className={styles.tarjeta}
              onClick={() => setImagenSeleccionada(domicilio)}
            >
              {/* IMAGEN */}
              <div className={styles.imagenContainer}>
                <img
                  src={domicilio.comprobante_url}
                  alt={`Comprobante de ${domicilio.cliente || "cliente"}`}
                  className={styles.imagen}
                />

                <div className={styles.verImagen}>
                  <PhotoIcon />
                  Ver imagen
                </div>
              </div>

              {/* INFORMACIÓN */}
              <div className={styles.informacion}>
                <h3>{domicilio.cliente || "Cliente"}</h3>

                <div className={styles.dato}>
                  <UserIcon />

                  <span>{domicilio.usuarios?.nombre || "Domiciliario"}</span>
                </div>

                <div className={styles.dato}>
                  <CalendarDaysIcon />

                  <span>
                    {domicilio.created_at
                      ? new Date(domicilio.created_at).toLocaleString("es-CO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Sin fecha"}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ================================
          MODAL IMAGEN
          ================================ */}

      {imagenSeleccionada && (
        <div
          className={styles.overlay}
          onClick={() => setImagenSeleccionada(null)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.btnCerrar}
              onClick={() => setImagenSeleccionada(null)}
              aria-label="Cerrar imagen"
            >
              <XMarkIcon />
            </button>

            <img
              src={imagenSeleccionada.comprobante_url}
              alt={`Comprobante de ${imagenSeleccionada.cliente || "cliente"}`}
              className={styles.imagenGrande}
            />

            <div className={styles.infoModal}>
              <h2>{imagenSeleccionada.cliente || "Cliente"}</h2>

              <div>
                <UserIcon />

                <span>
                  {imagenSeleccionada.usuarios?.nombre || "Domiciliario"}
                </span>
              </div>

              {imagenSeleccionada.created_at && (
                <div>
                  <CalendarDaysIcon />

                  <span>
                    {new Date(imagenSeleccionada.created_at).toLocaleString(
                      "es-CO",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
