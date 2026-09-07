import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../config/supabase";
import styles from "./Pendientes.module.css";
import { registrarActividad } from "../../../services/actividadService";
export default function Pendientes() {
  const [pendientes, setPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);
  const [abono, setAbono] = useState("");

  const cargarPendientes = async () => {
    setCargando(true);

    try {
      // ==========================================
      // 1. OBTENER USUARIO ACTUAL
      // ==========================================

      const {
        data: { user },
        error: errorAuth,
      } = await supabase.auth.getUser();

      if (errorAuth || !user) {
        console.error("Error obteniendo usuario autenticado:", errorAuth);

        setPendientes([]);
        return;
      }

      // ==========================================
      // 2. OBTENER DATOS DEL USUARIO
      // ==========================================

      const { data: usuarioActual, error: errorUsuario } = await supabase
        .from("usuarios")
        .select("id, rol, estado, organizacion_id")
        .eq("id", user.id)
        .single();

      if (errorUsuario || !usuarioActual) {
        console.error("Error obteniendo usuario:", errorUsuario);

        setPendientes([]);
        return;
      }

      // ==========================================
      // 3. CARGAR PENDIENTES
      // ==========================================

      const { data: listaPendientes, error: errorPendientes } = await supabase
        .from("pendientes")
        .select("*")
        .eq("estado", "pendiente")
        .order("created_at", {
          ascending: false,
        });

      if (errorPendientes) {
        console.error("Error cargando pendientes:", errorPendientes);

        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar los pendientes.",
        });

        setPendientes([]);
        return;
      }

      let pendientesFiltrados = listaPendientes || [];

      // ==========================================
      // 4. FILTRAR POR ORGANIZACIÓN
      // ==========================================

      if (usuarioActual.rol !== "super_admin") {
        if (!usuarioActual.organizacion_id) {
          console.error("El usuario no tiene una organización asignada.");

          setPendientes([]);
          return;
        }

        pendientesFiltrados = pendientesFiltrados.filter(
          (pendiente) =>
            pendiente.organizacion_id === usuarioActual.organizacion_id,
        );
      }

      // ==========================================
      // DEBUG
      // ==========================================

      console.log("========== PENDIENTES ==========");
      console.log("USUARIO ACTUAL:", usuarioActual);
      console.log("PENDIENTES ORIGINALES:", listaPendientes);
      console.log("PENDIENTES FILTRADOS:", pendientesFiltrados);
      console.log("CANTIDAD:", pendientesFiltrados.length);
      console.log("================================");

      // ==========================================
      // 5. ACTUALIZAR ESTADO
      // ==========================================

      setPendientes(pendientesFiltrados);
    } catch (error) {
      console.error("Error general cargando pendientes:", error);

      setPendientes([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPendientes();
  }, []);

  const calcularSaldo = (pendiente) => {
    return Number(pendiente.total_deuda) - Number(pendiente.total_abonado);
  };

  const abrirModal = (pendiente) => {
    setSeleccionado(pendiente);
    setAbono("");
  };

  const cerrarModal = () => {
    setSeleccionado(null);
    setAbono("");
  };

  const registrarAbono = async () => {
    if (!seleccionado) return;

    const valorAbono = Number(abono);
    const saldoActual = calcularSaldo(seleccionado);

    // ==========================================
    // VALIDAR ABONO
    // ==========================================

    if (!valorAbono || valorAbono <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Abono inválido",
        text: "Ingresa un valor mayor a $0.",
      });

      return;
    }

    if (valorAbono > saldoActual) {
      Swal.fire({
        icon: "warning",
        title: "Abono demasiado alto",
        text: `El cliente solamente debe $${saldoActual.toLocaleString(
          "es-CO",
        )}.`,
      });

      return;
    }

    // ==========================================
    // CALCULAR NUEVO SALDO
    // ==========================================

    const nuevoAbonado = Number(seleccionado.total_abonado) + valorAbono;

    const nuevoSaldo = Number(seleccionado.total_deuda) - nuevoAbonado;

    const nuevoEstado =
      nuevoAbonado >= Number(seleccionado.total_deuda) ? "pagado" : "pendiente";

    // ==========================================
    // ACTUALIZAR PENDIENTE
    // ==========================================

    const { error: pendienteError } = await supabase
      .from("pendientes")
      .update({
        total_abonado: nuevoAbonado,
        estado: nuevoEstado,
        updated_at: new Date().toISOString(),
      })
      .eq("id", seleccionado.id);

    if (pendienteError) {
      console.error("Error registrando abono:", pendienteError);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo registrar el abono.",
      });

      return;
    }

    // ==========================================
    // SI SE PAGÓ COMPLETAMENTE
    // BUSCAR LOS DOMICILIOS RELACIONADOS
    // ==========================================

    if (nuevoEstado === "pagado") {
      const { data: detalles, error: detallesError } = await supabase
        .from("pendientes_detalle")
        .select("domicilio_id")
        .eq("pendiente_id", seleccionado.id);

      if (detallesError) {
        console.error(
          "Error obteniendo domicilios relacionados:",
          detallesError,
        );
      } else if (detalles && detalles.length > 0) {
        const idsDomicilios = detalles
          .map((detalle) => detalle.domicilio_id)
          .filter(Boolean);

        if (idsDomicilios.length > 0) {
          const { error: domiciliosError } = await supabase
            .from("domicilios")
            .update({
              estado: "Pagado",
            })
            .in("id", idsDomicilios)
            .eq("estado", "Pendiente");

          if (domiciliosError) {
            console.error(
              "La deuda se pagó, pero no se pudieron actualizar los domicilios:",
              domiciliosError,
            );
          }
        }
      }
    }

    // ==========================================
    // REGISTRAR ACTIVIDAD
    // ==========================================

    if (nuevoEstado === "pagado") {
      await registrarActividad({
        tipo: "domicilio",
        accion: "abono_completo",
        descripcion: `Abonó por completo el domicilio pendiente del cliente ${seleccionado.cliente}. Su estado cambió a Pagado.`,
        referenciaId: seleccionado.id,
      });
    } else {
      await registrarActividad({
        tipo: "domicilio",
        accion: "abono",
        descripcion: `Abonó $${valorAbono.toLocaleString(
          "es-CO",
        )} al domicilio pendiente del cliente ${
          seleccionado.cliente
        }. Saldo restante: $${nuevoSaldo.toLocaleString("es-CO")}.`,
        referenciaId: seleccionado.id,
      });
    }

    // ==========================================
    // ACTUALIZAR PANTALLA
    // ==========================================

    await cargarPendientes();
    cerrarModal();

    // ==========================================
    // MENSAJE FINAL
    // ==========================================

    Swal.fire({
      icon: "success",
      title: nuevoEstado === "pagado" ? "Deuda pagada" : "Abono registrado",
      text:
        nuevoEstado === "pagado"
          ? "La deuda fue abonada por completo y los domicilios ahora están Pagados."
          : `Se abonaron $${valorAbono.toLocaleString(
              "es-CO",
            )}. Nuevo saldo: $${nuevoSaldo.toLocaleString("es-CO")}.`,
      timer: 1800,
      showConfirmButton: false,
    });
  };

  const formatearDinero = (valor) => {
    return `$${Number(valor).toLocaleString("es-CO")}`;
  };

  return (
    <div className={styles.contenedor}>
      <div className={styles.encabezado}>
        <div>
          <h1>Pendientes</h1>
          <p>Clientes con pagos pendientes y abonos registrados.</p>
        </div>

        <div className={styles.resumen}>
          <span className={styles.punto}></span>
          {pendientes.length} pendiente
          {pendientes.length !== 1 ? "s" : ""}
        </div>
      </div>

      {cargando ? (
        <div className={styles.estado}>
          <div className={styles.spinner}></div>
          <p>Cargando pendientes...</p>
        </div>
      ) : pendientes.length === 0 ? (
        <div className={styles.vacio}>
          <div className={styles.iconoVacio}>✓</div>

          <h2>Todo al día</h2>

          <p>No hay clientes con pagos pendientes en este momento.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {pendientes.map((pendiente) => {
            const saldo = calcularSaldo(pendiente);

            return (
              <button
                key={pendiente.id}
                className={styles.tarjeta}
                onClick={() => abrirModal(pendiente)}
              >
                <div className={styles.tarjetaSuperior}>
                  <div className={styles.avatar}>
                    {pendiente.cliente.charAt(0).toUpperCase()}
                  </div>

                  <div className={styles.cliente}>
                    <h3>{pendiente.cliente}</h3>
                    <span>Pago pendiente</span>
                  </div>

                  <div className={styles.alerta}>Pendiente</div>
                </div>

                <div className={styles.datos}>
                  <div className={styles.dato}>
                    <span>Dirección</span>
                    <strong>{pendiente.direccion}</strong>
                  </div>

                  <div className={styles.dato}>
                    <span>Teléfono</span>
                    <strong>{pendiente.telefono}</strong>
                  </div>
                </div>

                <div className={styles.deuda}>
                  <div>
                    <span>Saldo pendiente</span>
                    <strong>{formatearDinero(saldo)}</strong>
                  </div>

                  <div className={styles.abonarTexto}>Abonar →</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {seleccionado && (
        <div className={styles.overlay} onClick={cerrarModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalEncabezado}>
              <div>
                <span className={styles.modalEtiqueta}>PAGO PENDIENTE</span>

                <h2>{seleccionado.cliente}</h2>
              </div>

              <button className={styles.cerrar} onClick={cerrarModal}>
                ×
              </button>
            </div>

            <div className={styles.infoCliente}>
              <div>
                <span>Teléfono</span>
                <strong>{seleccionado.telefono}</strong>
              </div>

              <div>
                <span>Dirección</span>
                <strong>{seleccionado.direccion}</strong>
              </div>
            </div>

            <div className={styles.deudaModal}>
              <span>Saldo pendiente</span>

              <strong>{formatearDinero(calcularSaldo(seleccionado))}</strong>
            </div>

            <div className={styles.formulario}>
              <label htmlFor="abono">Valor del abono</label>

              <div className={styles.inputDinero}>
                <span>$</span>

                <input
                  id="abono"
                  type="number"
                  min="1"
                  max={calcularSaldo(seleccionado)}
                  placeholder="0"
                  value={abono}
                  onChange={(e) => setAbono(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.botones}>
              <button className={styles.cancelar} onClick={cerrarModal}>
                Cancelar
              </button>

              <button className={styles.confirmar} onClick={registrarAbono}>
                Registrar abono
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
