import { useEffect, useState } from "react";
import styles from "./Configuracion.module.css";
import { Howl } from "howler";
import {
  BellIcon,
  MoonIcon,
  SpeakerWaveIcon,
  DevicePhoneMobileIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

export default function Configuracion({ modoOscuro, setModoOscuro, usuario }) {
  const [resumenJornada, setResumenJornada] = useState(true);
  const [mostrarProyecto, setMostrarProyecto] = useState(false);
  const [sonido, setSonido] = useState(true);
  const [tipoSonido, setTipoSonido] = useState("noti1");
  const [vibracion, setVibracion] = useState(true);
  const [cargandoPreferencias, setCargandoPreferencias] = useState(true);
  useEffect(() => {
    cargarPreferencias();
  }, []);

  const cargarPreferencias = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    let { data, error } = await supabase
      .from("preferencias_domiciliario")
      .select("*")
      .eq("usuario_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error cargando preferencias:", error);
      return;
    }

    // Si todavía no existen, las creamos
    if (!data) {
      const { data: nuevasPreferencias, error: errorInsert } = await supabase
        .from("preferencias_domiciliario")
        .insert({
          usuario_id: user.id,
        })
        .select()
        .single();

      if (errorInsert) {
        console.error("Error creando preferencias:", errorInsert);
        return;
      }

      data = nuevasPreferencias;
    }

    setResumenJornada(data.resumen_jornada);
    setSonido(data.sonido);
    setTipoSonido(data.tipo_sonido);
    setVibracion(data.vibracion);

    setCargandoPreferencias(false);
  };
  const guardarPreferencia = async (campo, valor) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("preferencias_domiciliario")
      .update({
        [campo]: valor,
        updated_at: new Date().toISOString(),
      })
      .eq("usuario_id", user.id);

    if (error) {
      console.error("Error guardando preferencia:", error);
    }
  };
  const sonidos = {
    noti1: "/sounds/noti1.mp3",
    noti2: "/sounds/noti2.mp3",
    noti3: "/sounds/noti3.mp3",
    noti4: "/sounds/noti4.mp3",
    noti5: "/sounds/noti5.mp3",
    noti6: "/sounds/noti6.mp3",
  };

  const reproducirSonido = (tipo) => {
    if (!sonido) return;

    const audio = new Howl({
      src: [`/sounds/${tipo}.mp3`],
      volume: 0.7,
    });

    audio.play();
  };

  const cambiarSonido = (tipo) => {
    setTipoSonido(tipo);
    localStorage.setItem("tipoSonido", tipo);
    reproducirSonido(tipo);
  };
  const [resumenDatos, setResumenDatos] = useState({
    domicilios: 0,
    pagados: 0,
    pendientes: 0,
    recaudado: 0,
    reportados: 0,
  });

  const cargarResumenJornada = async () => {
    const hoy = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("domicilios")
      .select("costo, estado")
      .eq("domiciliario_id", usuario.id)
      .eq("fecha", hoy);

    if (error) {
      console.error("Error cargando resumen:", error);
      return;
    }

    const domicilios = data.length;

    const pagados = data.filter((item) => item.estado === "Pagado").length;

    const pendientes = data.filter(
      (item) => item.estado === "Pendiente",
    ).length;

    const reportados = data.filter(
      (item) => item.estado === "Reportado",
    ).length;

    const recaudado = data.reduce(
      (total, item) => total + Number(item.costo || 0),
      0,
    );

    setResumenDatos({
      domicilios,
      pagados,
      pendientes,
      recaudado,
      reportados,
    });
  };
  return (
    <div className={styles.configContainer}>
      {/* ENCABEZADO */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Cog6ToothIcon />
        </div>

        <div>
          <h1>Configuración</h1>
          <p>Personaliza tu experiencia dentro de Liquisistema.</p>
        </div>
      </div>

      {/* APARIENCIA */}
      <div className={styles.card}>
        <div className={styles.sectionTitle}>
          <div className={styles.sectionIcon}>
            <MoonIcon />
          </div>

          <div>
            <h2>Apariencia</h2>
            <p>Personaliza cómo se ve la aplicación.</p>
          </div>
        </div>

        <div className={styles.option}>
          <div className={styles.optionInfo}>
            <h3>Modo oscuro</h3>
            <p>Activa una interfaz oscura para trabajar más cómodo.</p>
          </div>

          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={modoOscuro}
              onChange={(e) => {
                const nuevoModo = e.target.checked;
                setModoOscuro(nuevoModo);
                localStorage.setItem("modoOscuro", nuevoModo);
              }}
            />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>

      {/* NOTIFICACIONES */}
      <div className={styles.card}>
        <div className={styles.sectionTitle}>
          <div className={styles.sectionIcon}>
            <BellIcon />
          </div>

          <div>
            <h2>Notificaciones</h2>
            <p>Controla los avisos que recibes durante tu jornada.</p>
          </div>
        </div>

        <div className={styles.option}>
          <div className={styles.optionInfoWithIcon}>
            <ChartBarIcon />

            <div>
              <h3>Resumen de jornada</h3>
              <p>Recibir un resumen de tu actividad al finalizar el día.</p>
            </div>
          </div>

          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={resumenJornada}
              onChange={(e) => {
                const valor = e.target.checked;
                setResumenJornada(valor);
                guardarPreferencia("resumen_jornada", valor);
              }}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.divider}></div>

        <div className={styles.optionSonido}>
          <div className={styles.optionInfoWithIcon}>
            <SpeakerWaveIcon />

            <div>
              <h3>Sonido</h3>
              <p>
                Elige si quieres recibir sonidos y personaliza cuál utilizar.
              </p>
            </div>
          </div>

          <div className={styles.controlSonido}>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={sonido}
                onChange={(e) => {
                  const valor = e.target.checked;
                  setSonido(valor);
                  guardarPreferencia("sonido", valor);
                }}
              />
              <span className={styles.slider}></span>
            </label>

            {sonido && (
              <div className={styles.selectorSonido}>
                <select
                  value={tipoSonido}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setTipoSonido(valor);
                    guardarPreferencia("tipo_sonido", valor);
                  }}
                >
                  <option value="noti1">Sonido 1</option>
                  <option value="noti2">Sonido 2</option>
                  <option value="noti3">Sonido 3</option>
                  <option value="noti4">Sonido 4</option>
                  <option value="noti5">Sonido 5</option>
                  <option value="noti6">Sonido 6</option>
                </select>

                <button
                  type="button"
                  onClick={() => reproducirSonido(tipoSonido)}
                  className={styles.botonSonido}
                >
                  <SpeakerWaveIcon />
                  Escuchar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.divider}></div>

        <div className={styles.option}>
          <div className={styles.optionInfoWithIcon}>
            <DevicePhoneMobileIcon />

            <div>
              <h3>Vibración</h3>
              <p>Activar vibración en dispositivos compatibles.</p>
            </div>
          </div>

          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={vibracion}
              onChange={(e) => {
                const valor = e.target.checked;
                setVibracion(valor);
                guardarPreferencia("vibracion", valor);
              }}
            />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>

      {/* INFORMACIÓN */}
      <div className={styles.card}>
        <div className={styles.sectionTitle}>
          <div className={styles.sectionIcon}>
            <InformationCircleIcon />
          </div>

          <div>
            <h2>Información</h2>
            <p>Información importante sobre tu cuenta.</p>
          </div>
        </div>

        <div className={styles.infoBox}>
          <p>
            Las credenciales y contraseñas son administradas únicamente por el
            administrador del sistema.
          </p>

          <p>
            Si necesitas actualizar datos personales o recuperar acceso,
            comunícate con el administrador.
          </p>
        </div>

        <button
          type="button"
          className={styles.botonInfo}
          onClick={() => setMostrarProyecto(!mostrarProyecto)}
        >
          {mostrarProyecto
            ? "Ocultar información"
            : "Ver más sobre el proyecto"}
        </button>

        {mostrarProyecto && (
          <div className={styles.proyectoInfo}>
            <h3>Sobre Liquisistema</h3>

            <p>
              Liquisistema es un proyecto desarrollado con fines educativos como
              parte del proceso de formación de estudiantes de la Institución
              Educativa José Manuel Restrepo Vélez, en convenio con el CEFIT de
              Envigado.
            </p>

            <div className={styles.autores}>
              <div className={styles.autor}>
                <span>Desarrolladores</span>

                <strong>Andrés Felipe Posada Botero</strong>
                <strong>Samuel Acevedo</strong>
              </div>
            </div>

            <p className={styles.proyectoNota}>
              Proyecto académico creado por estudiantes para aplicar
              conocimientos de programación, desarrollo web y gestión de
              información.
            </p>
          </div>
        )}
      </div>

      {/* VERSION */}
      <div className={styles.versionCard}>
        <div>
          <span>Liquisistema</span>
          <p>Versión del sistema</p>
        </div>

        <strong>v1.0.0</strong>
      </div>
    </div>
  );
}
