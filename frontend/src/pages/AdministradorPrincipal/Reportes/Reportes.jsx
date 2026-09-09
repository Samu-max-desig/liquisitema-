import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../config/supabase";
import styles from "./Reportes.module.css";

export default function Reportes() {
  const [reportes, setReportes] = useState([]);
  const [organizacionSeleccionada, setOrganizacionSeleccionada] =
    useState(null);
  const [cargando, setCargando] = useState(true);
  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);
  const [accion, setAccion] = useState("");
  const [instrucciones, setInstrucciones] = useState("");
  const [mensajeRapido, setMensajeRapido] = useState("");
  const cargarReportes = async () => {
    setCargando(true);

    const usuarioGuardado = JSON.parse(
      sessionStorage.getItem("usuario") || "null",
    );

    if (!usuarioGuardado?.id) {
      setReportes([]);
      setCargando(false);
      return;
    }

    // ==========================================
    // OBTENER ORGANIZACIÓN DEL USUARIO
    // ==========================================

    const { data: usuario, error: usuarioError } = await supabase
      .from("usuarios")
      .select("organizacion_id")
      .eq("id", usuarioGuardado.id)
      .single();

    if (usuarioError) {
      console.error("Error obteniendo usuario:", usuarioError);
      setReportes([]);
      setCargando(false);
      return;
    }

    let organizacionId = usuario?.organizacion_id || null;

    // ==========================================
    // SI NO ESTÁ EN USUARIOS,
    // BUSCAR EN USUARIOS_ORGANIZACIONES
    // ==========================================

    if (!organizacionId) {
      const { data: relacion, error: relacionError } = await supabase
        .from("usuarios_organizaciones")
        .select("organizacion_id")
        .eq("usuario_id", usuarioGuardado.id)
        .eq("estado", "activo")
        .limit(1)
        .maybeSingle();

      if (relacionError) {
        console.error("Error obteniendo organización:", relacionError);
        setReportes([]);
        setCargando(false);
        return;
      }

      organizacionId = relacion?.organizacion_id || null;
    }

    // ==========================================
    // VERIFICAR ORGANIZACIÓN
    // ==========================================

    if (!organizacionId) {
      console.error("El usuario no tiene una organización asignada.");
      setReportes([]);
      setCargando(false);
      return;
    }

    console.log("ORGANIZACIÓN DE REPORTES:", organizacionId);

    setOrganizacionSeleccionada(organizacionId);

    // ==========================================
    // CARGAR REPORTES
    // ==========================================

    const { data, error } = await supabase
      .from("reportes")
      .select(
        `
      *,
      domicilios!inner (
        id,
        cliente,
        telefono,
        direccion,
        costo,
        estado,
        numero_factura,
        organizacion_id
      ),
      usuarios (
        id,
        nombre
      )
      `,
      )
      .eq("estado", "Pendiente")
      .eq("domicilios.estado", "Reportado")
      .eq("domicilios.organizacion_id", organizacionId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando reportes:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron cargar los reportes.",
      });

      setReportes([]);
    } else {
      setReportes(data || []);
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarReportes();
  }, []);

  const abrirReporte = (reporte) => {
    setReporteSeleccionado(reporte);
    setAccion("");
  };

  const cerrarReporte = () => {
    setReporteSeleccionado(null);
    setAccion("");
    setInstrucciones("");
  };

  const resolverReporte = async () => {
    if (!reporteSeleccionado) return;

    // La acción sí es obligatoria
    if (!accion && !mensajeRapido?.trim() && !instrucciones?.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Escribe una instrucción",
        text: "Selecciona una acción, un mensaje rápido o escribe una instrucción adicional.",
      });

      return;
    }
    console.log("👤 USUARIO DESTINO:", reporteSeleccionado.usuarios);
    console.log("📦 REPORTE COMPLETO:", reporteSeleccionado);
    const usuarioId = reporteSeleccionado.usuarios?.id;
    const domicilioId = reporteSeleccionado.domicilios?.id;

    if (!usuarioId || !domicilioId) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo identificar al domiciliario o al domicilio.",
      });

      return;
    }

    const accionesTexto = {
      recibir_mas_tarde: "Cliente lo recibe más tarde",
      cambio_direccion: "Cliente cambió de dirección",
      volver_intentar: "Volver a intentar la entrega",
      contactar_cliente: "Contactar nuevamente al cliente",
      cancelar: "Cancelar domicilio",
    };

    const accionTexto = accionesTexto[accion] || accion;

    // El mensaje rápido y el textarea son OPCIONALES
    const mensaje = [accionTexto, mensajeRapido?.trim(), instrucciones?.trim()]
      .filter(Boolean)
      .join("\n\n");

    const { error: notificacionError } = await supabase
      .from("notificaciones")
      .insert([
        {
          usuario_id: usuarioId,
          reporte_id: reporteSeleccionado.id,
          domicilio_id: domicilioId,
          titulo: "Nueva instrucción del administrador",
          mensaje,
          tipo: "instruccion",
          leida: false,
        },
      ]);

    if (notificacionError) {
      console.error("Error creando notificación:", notificacionError);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo enviar la instrucción al domiciliario.",
      });

      return;
    }

    Swal.fire({
      icon: "success",
      title: "Instrucción enviada",
      text: "La instrucción fue enviada al domiciliario.",
      timer: 1800,
      showConfirmButton: false,
    });

    setAccion("");
    setMensajeRapido("");
    setInstrucciones("");
    cerrarReporte();
  };

  return (
    <div className={styles.contenedor}>
      <div className={styles.encabezado}>
        <div>
          <h1>Reportes</h1>
          <p>Revisa los inconvenientes reportados durante las rutas.</p>
        </div>

        <div className={styles.resumen}>
          <span className={styles.punto}></span>
          {reportes.length} reporte
          {reportes.length !== 1 ? "s" : ""}
        </div>
      </div>

      {cargando ? (
        <div className={styles.estado}>
          <div className={styles.spinner}></div>
          <p>Cargando reportes...</p>
        </div>
      ) : reportes.length === 0 ? (
        <div className={styles.vacio}>
          <div className={styles.iconoVacio}>✓</div>

          <h2>Todo en orden</h2>

          <p>No hay reportes pendientes en este momento.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {reportes.map((reporte) => {
            const domicilio = reporte.domicilios;
            const usuario = reporte.usuarios;

            return (
              <button
                key={reporte.id}
                className={styles.tarjeta}
                onClick={() => abrirReporte(reporte)}
              >
                <div className={styles.tarjetaSuperior}>
                  <div className={styles.avatar}>
                    {domicilio?.cliente?.charAt(0).toUpperCase() || "?"}
                  </div>

                  <div className={styles.cliente}>
                    <h3>{domicilio?.cliente || "Cliente"}</h3>

                    <span>
                      Reportado por {usuario?.nombre || "Domiciliario"}
                    </span>
                  </div>

                  <div className={styles.alerta}>Pendiente</div>
                </div>

                <div className={styles.datos}>
                  <div className={styles.dato}>
                    <span>Dirección</span>
                    <strong>{domicilio?.direccion || "Sin dirección"}</strong>
                  </div>

                  <div className={styles.dato}>
                    <span>Teléfono</span>
                    <strong>{domicilio?.telefono || "Sin teléfono"}</strong>
                  </div>
                </div>

                <div className={styles.reporteInfo}>
                  <span>Motivo del reporte</span>

                  <strong>{reporte.descripcion}</strong>
                </div>

                <div className={styles.abrir}>Ver reporte →</div>
              </button>
            );
          })}
        </div>
      )}

      {reporteSeleccionado && (
        <div className={styles.overlay} onClick={cerrarReporte}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalEncabezado}>
              <div>
                <span className={styles.modalEtiqueta}>REPORTE PENDIENTE</span>

                <h2>{reporteSeleccionado.domicilios?.cliente}</h2>
              </div>

              <button className={styles.cerrar} onClick={cerrarReporte}>
                ×
              </button>
            </div>

            <div className={styles.infoCliente}>
              <div>
                <span>Teléfono</span>

                <strong>{reporteSeleccionado.domicilios?.telefono}</strong>
              </div>

              <div>
                <span>Dirección</span>

                <strong>{reporteSeleccionado.domicilios?.direccion}</strong>
              </div>
            </div>

            <div className={styles.infoReporte}>
              <span>Reporte realizado por</span>

              <strong>
                {reporteSeleccionado.usuarios?.nombre || "Domiciliario"}
              </strong>
            </div>

            <div className={styles.descripcion}>
              <span>Descripción</span>

              <p>{reporteSeleccionado.descripcion}</p>
            </div>

            <div className={styles.formulario}>
              <label htmlFor="accion">¿Qué debe hacer el domiciliario?</label>

              <select
                id="accion"
                value={accion}
                onChange={(e) => setAccion(e.target.value)}
              >
                <option value="">Seleccionar acción</option>

                <option value="recibir_mas_tarde">
                  Cliente lo recibe más tarde
                </option>

                <option value="cambio_direccion">
                  Cliente cambió de dirección
                </option>

                <option value="volver_intentar">
                  Volver a intentar la entrega
                </option>

                <option value="contactar_cliente">
                  Contactar nuevamente al cliente
                </option>

                <option value="cancelar">Cancelar domicilio</option>
              </select>
              <div className={styles.formulario}>
                <label htmlFor="mensajeRapido">
                  Mensaje para el domiciliario
                </label>

                <select
                  id="mensajeRapido"
                  value={mensajeRapido}
                  onChange={(e) => setMensajeRapido(e.target.value)}
                >
                  <option value="">Seleccionar mensaje</option>

                  <option value="Espera 5 minutos, estoy contactando al cliente.">
                    Espera 5 minutos, estoy contactando al cliente.
                  </option>

                  <option value="Espera 10 minutos, estoy contactando al cliente.">
                    Espera 10 minutos, estoy contactando al cliente.
                  </option>

                  <option value="Espera instrucciones antes de continuar.">
                    Espera instrucciones antes de continuar.
                  </option>

                  <option value="No te retires del lugar todavía.">
                    No te retires del lugar todavía.
                  </option>

                  <option value="Ya puedes continuar con la entrega.">
                    Ya puedes continuar con la entrega.
                  </option>

                  <option value="Vuelve a intentar la entrega.">
                    Vuelve a intentar la entrega.
                  </option>
                </select>
              </div>
            </div>

            <div className={styles.formulario}>
              <label htmlFor="instrucciones">Instrucciones adicionales</label>

              <textarea
                id="instrucciones"
                placeholder="Escribe aquí los detalles que debe conocer el domiciliario..."
                value={instrucciones}
                onChange={(e) => setInstrucciones(e.target.value)}
                rows={4}
              />
            </div>
            <div className={styles.botones}>
              <button className={styles.cancelar} onClick={cerrarReporte}>
                Cerrar
              </button>

              <button className={styles.confirmar} onClick={resolverReporte}>
                Dar instrucción
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
