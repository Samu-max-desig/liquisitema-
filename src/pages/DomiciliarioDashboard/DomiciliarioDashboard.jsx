import styles from "./DomiciliarioDashboard.module.css";
import { useState, useEffect } from "react";
import { reproducirNotificacion } from "../../services/notificacionesService";
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
  SignalIcon,
  CameraIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "../../config/supabase";
import Perfil from "./Perfil/Perfil";
import Configuracion from "./Configuracion/Configuracion";
import CountUp from "react-countup";
import Swal from "sweetalert2";
console.log("CountUp:", CountUp);
export default function DomiciliarioDashboard() {
  const [mostrarComprobante, setMostrarComprobante] = useState(false);
  const [modalCerrarDia, setModalCerrarDia] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [domicilios, setDomicilios] = useState([]);
  const [modalReporte, setModalReporte] = useState(false);
  const [telefonoBusqueda, setTelefonoBusqueda] = useState("");
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  const [fotoComprobante, setFotoComprobante] = useState(null);
  const [domicilioSeleccionado, setDomicilioSeleccionado] = useState(null);
  const [vistaActual, setVistaActual] = useState("inicio");
  const [clienteNoEncontrado, setClienteNoEncontrado] = useState(false);
  const usuario = JSON.parse(sessionStorage.getItem("usuario"));
  const [mostrarImagen, setMostrarImagen] = useState(false);
  const [modoOscuro, setModoOscuro] = useState(
    localStorage.getItem("modoOscuro") === "true",
  );
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
useEffect(() => {
  if (!usuario?.id) return;

  cargarDomicilios();
}, [usuario?.id]);
  const guardarDomicilio = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (
      !formData.cliente.trim() ||
      !formData.direccion.trim() ||
      !formData.telefono.trim() ||
      !formData.valor ||
      !formData.metodo_pago
    ) {
      setError("Debes completar todos los campos obligatorios.");
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

    const numeroFactura = `FAC-${Date.now()}`;
    const { data: clienteExistente } = await supabase
      .from("clientes")
      .select("id")
      .eq("telefono", formData.telefono)
      .maybeSingle();

    if (!clienteExistente) {
      await supabase.from("clientes").insert([
        {
          nombre: formData.cliente,
          telefono: formData.telefono,
          direccion: formData.direccion,
        },
      ]);
    }
    const { data, error: supabaseError } = await supabase

      .from("domicilios")
      .insert([
        {
          numero_factura: numeroFactura,
          cliente: formData.cliente,
          telefono: formData.telefono,
          direccion: formData.direccion,
          costo: formData.valor,
          metodo_pago: formData.metodo_pago,
          observaciones: formData.observaciones,
          estado: formData.metodo_pago === "Otro" ? "Pendiente" : "Pagado",
          domiciliario_id: usuario.id,
        },
      ]);

    if (supabaseError) {
      console.error(supabaseError);
      setError("Error al guardar el domicilio.");
      return;
    }

    Swal.fire({
      icon: "success",
      title: "Domicilio guardado",
      text: "El domicilio fue registrado correctamente.",
      confirmButtonColor: "#2563eb",
    });
    await cargarDomicilios();
    if (supabaseError) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo guardar el domicilio.",
        confirmButtonColor: "#dc2626",
      });

      return;
    }
    await cargarDomicilios();

    setFormData({
      cliente: "",
      direccion: "",
      telefono: "",
      valor: "",
      propina: "",
      metodo_pago: "",
      observaciones: "",
    });

    setSubmitted(false);
    setError("");
  };

const cargarDomicilios = async () => {
  if (!usuario?.id) return;

  const { data, error } = await supabase
    .from("domicilios")
    .select("*")
    .eq("domiciliario_id", usuario.id)
    .order("id", { ascending: false });

  if (error) {
    console.error("Error cargando domicilios:", error);
    return;
  }

  setDomicilios(data || []);
};
  const confirmarReporte = async () => {
    const nuevoEstado =
      reporteData.motivo === "Cliente canceló" ? "Cancelado" : "Reportado";

    const { error } = await supabase
      .from("domicilios")
      .update({
        estado: nuevoEstado,
        observaciones: reporteData.observaciones,
      })
      .eq("id", domicilioSeleccionado.id);

    if (error) {
      console.error(error);
      return;
    }

    await cargarDomicilios();
    setModalReporte(false);
  };
  const buscarCliente = async (telefono) => {
    if (telefono.length !== 10) {
      setClienteEncontrado(null);
      setClienteNoEncontrado(false);
      return;
    }

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("telefono", telefono)
      .maybeSingle();

    if (error || !data) {
      setClienteEncontrado(null);
      setClienteNoEncontrado(true);

      setFormData((prev) => ({
        ...prev,
        cliente: "",
        direccion: "",
      }));

      return;
    }

    setClienteEncontrado(data);
    setClienteNoEncontrado(false);

    setFormData((prev) => ({
      ...prev,
      cliente: data.nombre || "",
      direccion: data.direccion || "",
      telefono: data.telefono || "",
    }));
  };

  const cerrarDia = async () => {
    const totalDomicilios = domicilios.length;

    const totalRecaudado = domicilios.reduce(
      (acc, d) => acc + Number(d.costo || 0),
      0,
    );

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

    // Guardar el cierre
    const { error: cierreError } = await supabase.from("cierres_dia").insert([
      {
        total_domicilios: totalDomicilios,
        total_recaudado: totalRecaudado,
        total_pagados: totalPagados,
        total_pendientes: totalPendientes,
        total_cancelados: totalCancelados,
        total_reportados: totalReportados,
      },
    ]);

    if (cierreError) {
      console.error(cierreError);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo realizar el cierre del día.",
      });

      return;
    }

    // Cerrar el modal ANTES de borrar los domicilios
    setModalCerrarDia(false);

    // Borrar solamente los domicilios de este domiciliario
    const { error: deleteError } = await supabase
      .from("domicilios")
      .delete()
      .eq("domiciliario_id", usuario.id);

    if (deleteError) {
      console.error(deleteError);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "El cierre se guardó, pero no se pudieron limpiar los domicilios.",
      });

      return;
    }

    await cargarDomicilios();

    Swal.fire({
      icon: "success",
      title: "Día cerrado",
      text: "El cierre fue realizado correctamente.",
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

    await supabase.auth.signOut();

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

  const totalRecaudado = domicilios.reduce(
    (acc, d) => acc + Number(d.costo || 0),
    0,
  );

  const totalPendientes = domicilios.filter(
    (d) => d.estado === "Pendiente",
  ).length;

  const totalPagados = domicilios.filter((d) => d.estado === "Pagado").length;
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

    console.log("URL pública:", data.publicUrl);

    Swal.fire({
      icon: "success",
      title: "Comprobante subido",
      text: "La foto fue subida correctamente",
    });

    e.target.value = "";
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
            onClick={() => setModalCerrarDia(true)}
          >
            <ClipboardDocumentCheckIcon className={styles.lqIcon} />
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

            <section className={styles.lqSearchContainer}>
              <MagnifyingGlassIcon className={styles.lqSearchIcon} />
              <input
                type="tel"
                placeholder="Buscar cliente por teléfono..."
                value={telefonoBusqueda}
                onChange={(e) => {
                  const telefono = e.target.value.replace(/\D/g, "");

                  setTelefonoBusqueda(telefono);
                  buscarCliente(telefono);
                }}
              />
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
                <strong>
                  $
                  <CountUp.default
                    end={totalRecaudado}
                    duration={1.8}
                    separator="."
                  />
                </strong>
              </div>
            </section>
            {clienteEncontrado && (
              <div className={styles.lqClienteCard}>
                <div className={styles.lqClienteHeader}>
                  <UserIcon className={styles.lqClienteIcon} />
                  <div>
                    <h3>{clienteEncontrado.nombre}</h3>
                    <span>Cliente encontrado</span>
                  </div>
                </div>

                <div className={styles.lqClienteInfo}>
                  <p>
                    <strong>Teléfono:</strong> {clienteEncontrado.telefono}
                  </p>

                  <p>
                    <strong>Dirección:</strong> {clienteEncontrado.direccion}
                  </p>
                </div>
              </div>
            )}
            {clienteNoEncontrado && (
              <div className={styles.lqClienteNoEncontrado}>
                <h3>Cliente no encontrado</h3>
                <p>
                  No existe ningún cliente registrado con ese número de
                  teléfono.
                </p>
              </div>
            )}
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
                        <tr key={domicilio.id}>
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
                            <div className={styles.lqActions}>
                              <PencilSquareIcon
                                className={styles.lqActionIcon}
                              />
                              <DocumentTextIcon
                                className={styles.lqActionIcon}
                                onClick={() => {
                                  setDomicilioSeleccionado(domicilio);
                                  setMostrarComprobante(true);
                                }}
                              />
                              <ExclamationTriangleIcon
                                className={styles.lqActionIcon}
                                onClick={() => {
                                  setDomicilioSeleccionado(domicilio);
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
    </div>
  );
}
