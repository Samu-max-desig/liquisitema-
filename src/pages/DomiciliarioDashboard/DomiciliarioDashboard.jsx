import styles from "./DomiciliarioDashboard.module.css";
import { useState, useEffect } from "react";
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
} from "@heroicons/react/24/outline";
import { supabase } from "../../config/supabase";
import Perfil from "./Perfil/Perfil";
import Configuracion from "./Configuracion/Configuracion";

import Swal from "sweetalert2";
export default function DomiciliarioDashboard() {
  const [modalCerrarDia, setModalCerrarDia] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [domicilios, setDomicilios] = useState([]);
  const [modalReporte, setModalReporte] = useState(false);
  const [telefonoBusqueda, setTelefonoBusqueda] = useState("");
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  const [domicilioSeleccionado, setDomicilioSeleccionado] = useState(null);
const [vistaActual, setVistaActual] = useState("inicio");
  const [clienteNoEncontrado, setClienteNoEncontrado] = useState(false);
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  console.log("USUARIO DASHBOARD:", usuario);
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
    cargarDomicilios();
  }, []);
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
    const { data, error } = await supabase
      .from("domicilios")
      .select("*")
      .order("id", { ascending: false });

    if (!error) {
      setDomicilios(data);
    }
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
      return;
    }

    const { error: deleteError } = await supabase
      .from("domicilios")
      .delete()
      .gt("id", 0);

    if (deleteError) {
      console.error(deleteError);
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
  }, 5000);

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
  return (
    <div className={styles.lqDashboard}>
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

          <button
  className={styles.lqLogout}
  onClick={cerrarSesion}
>
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
          <h1>
  {saludo}, {usuario?.nombre}
</h1>
          <p>{mensajes[mensajeIndex]}</p>
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
              No existe ningún cliente registrado con ese número de teléfono.
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
                  submitted && !formData.direccion ? styles.lqInputError : ""
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
                  submitted && !formData.metodo_pago ? styles.lqInputError : ""
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
                          <PencilSquareIcon className={styles.lqActionIcon} />
                          <DocumentTextIcon className={styles.lqActionIcon} />
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
    <Configuracion />
  </div>
)}
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
  );}