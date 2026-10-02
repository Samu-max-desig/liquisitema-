import customtkinter as ctk
import urllib.request
import urllib.error
import json
import os
import sys
import threading
from PIL import Image


# =========================================================
# CONFIGURACIÓN
# =========================================================

SUPABASE_FUNCTION_URL = (
    "https://khocbhyfqknqgzemyomu.supabase.co"
    "/functions/v1/instalar-organizacion"
)

# El token NO se guarda en el código.
# Se puede establecer como variable de entorno:
# LIQUISISTEMA_INSTALLER_TOKEN
INSTALLER_TOKEN_ENV = "LIQUISISTEMA_INSTALLER_TOKEN"

# Configuración persistente del instalador.
# Se guarda en AppData del usuario para que funcione también dentro del EXE.
APP_DATA_DIR = os.path.join(
    os.environ.get("APPDATA", os.path.expanduser("~")),
    "Liquisistema"
)
INSTALLER_CONFIG_FILE = os.path.join(
    APP_DATA_DIR,
    "installer_config.json"
)

# Colores Liquisistema
COLOR_PRINCIPAL = "#2563EB"
COLOR_PRINCIPAL_HOVER = "#1D4ED8"
COLOR_CYAN = "#06B6D4"

COLOR_FONDO = "#F4F7FB"
COLOR_CARD = "#FFFFFF"
COLOR_TEXTO = "#0F172A"
COLOR_SECUNDARIO = "#64748B"
COLOR_BORDE = "#D9E2EC"
COLOR_EXITO = "#16A34A"
COLOR_ERROR = "#DC2626"
COLOR_WARNING = "#D97706"
COLOR_SUAVE = "#F8FAFC"
COLOR_AZUL_SUAVE = "#EFF6FF"


# =========================================================
# RUTA DE RECURSOS
# =========================================================

def ruta_recurso(nombre):
    """Funciona tanto ejecutando Python como dentro del EXE."""
    if getattr(sys, "frozen", False):
        base_path = sys._MEIPASS
    else:
        base_path = os.path.dirname(os.path.abspath(__file__))

    return os.path.join(base_path, nombre)


# =========================================================
# APARIENCIA
# =========================================================

ctk.set_appearance_mode("light")
ctk.set_default_color_theme("blue")


# =========================================================
# APLICACIÓN
# =========================================================

class InstaladorLiquisistema(ctk.CTk):

    def __init__(self):
        super().__init__()

        self.title("Liquisistema — Instalador")
        self.geometry("1250x760")
        self.minsize(1050, 680)
        self.configure(fg_color=COLOR_FONDO)

        # Estado general
        self.modo = None
        self.paso_actual = 0
        self.instalando = False
        self.organizacion_seleccionada = None
        self.organizaciones = []
        self.tarjetas_admin = []

        # Token:
        # 1. Variable de entorno, si existe.
        # 2. Token guardado localmente en AppData.
        # Nunca se guarda dentro del código ni del EXE.
        token_entorno = os.environ.get(
            INSTALLER_TOKEN_ENV,
            ""
        ).strip()

        self.token = (
            token_entorno
            or self.cargar_token_guardado()
        )

        # Si vino por variable de entorno, también lo dejamos persistido
        # para que el EXE pueda seguir funcionando después.
        if token_entorno:
            self.guardar_token_local_silencioso(token_entorno)

        self.crear_variables()
        self.crear_interfaz()
        self.mostrar_inicio()

        # Al abrir el instalador:
        # - recupera el token guardado;
        # - consulta nuevamente las organizaciones en Supabase.
        # La lista no depende de la memoria de una sesión anterior.
        self.after(250, self.cargar_organizaciones)

    # =====================================================
    # VARIABLES
    # =====================================================

    def crear_variables(self):
        # Organización principal
        self.nombre_principal = ctk.StringVar()

        # Buscar organización
        self.busqueda_organizacion = ctk.StringVar()

    # =====================================================
    # INTERFAZ PRINCIPAL
    # =====================================================

    def crear_interfaz(self):

        # -------------------------------------------------
        # HEADER
        # -------------------------------------------------

        self.header = ctk.CTkFrame(
            self,
            height=84,
            fg_color=COLOR_CARD,
            corner_radius=0
        )
        self.header.pack(fill="x", side="top")
        self.header.pack_propagate(False)

        try:
            logo = Image.open(ruta_recurso("logo-liquisistema.png"))
            logo.thumbnail((55, 55))

            self.logo_img = ctk.CTkImage(
                light_image=logo,
                dark_image=logo,
                size=(55, 55)
            )

            ctk.CTkLabel(
                self.header,
                image=self.logo_img,
                text=""
            ).pack(side="left", padx=(32, 12))

        except Exception:
            pass

        titulo_frame = ctk.CTkFrame(
            self.header,
            fg_color="transparent"
        )
        titulo_frame.pack(side="left")

        ctk.CTkLabel(
            titulo_frame,
            text="Liquisistema",
            font=ctk.CTkFont(size=25, weight="bold"),
            text_color=COLOR_TEXTO
        ).pack(anchor="w")

        ctk.CTkLabel(
            titulo_frame,
            text="Instalador del sistema",
            font=ctk.CTkFont(size=13),
            text_color=COLOR_SECUNDARIO
        ).pack(anchor="w")

        # Indicador de seguridad
        self.estado_token_label = ctk.CTkLabel(
            self.header,
            text="🔐 Token no configurado",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=COLOR_WARNING
        )
        self.estado_token_label.pack(side="right", padx=(10, 18))

        ctk.CTkButton(
            self.header,
            text="Token",
            width=90,
            height=34,
            corner_radius=9,
            fg_color=COLOR_SUAVE,
            hover_color="#E2E8F0",
            text_color=COLOR_TEXTO,
            border_width=1,
            border_color=COLOR_BORDE,
            command=self.abrir_token
        ).pack(side="right", padx=(10, 0))

        # -------------------------------------------------
        # CONTENEDOR
        # -------------------------------------------------

        self.contenedor = ctk.CTkFrame(
            self,
            fg_color="transparent"
        )
        self.contenedor.pack(
            fill="both",
            expand=True,
            padx=28,
            pady=(24, 22)
        )

        # -------------------------------------------------
        # SIDEBAR
        # -------------------------------------------------

        self.sidebar = ctk.CTkFrame(
            self.contenedor,
            width=280,
            fg_color=COLOR_CARD,
            corner_radius=18,
            border_width=1,
            border_color=COLOR_BORDE
        )
        self.sidebar.pack(
            side="left",
            fill="y",
            padx=(0, 20)
        )
        self.sidebar.pack_propagate(False)

        # Botón crear
        ctk.CTkButton(
            self.sidebar,
            text="＋  CREAR ORGANIZACIÓN NUEVA",
            height=46,
            corner_radius=10,
            fg_color=COLOR_PRINCIPAL,
            hover_color=COLOR_PRINCIPAL_HOVER,
            font=ctk.CTkFont(size=13, weight="bold"),
            command=self.iniciar_nueva_organizacion
        ).pack(
            fill="x",
            padx=16,
            pady=(18, 18)
        )

        ctk.CTkLabel(
            self.sidebar,
            text="Organizaciones principales",
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color=COLOR_TEXTO
        ).pack(
            anchor="w",
            padx=18,
            pady=(0, 3)
        )

        ctk.CTkLabel(
            self.sidebar,
            text="Selecciona una organización para administrarla.",
            font=ctk.CTkFont(size=11),
            text_color=COLOR_SECUNDARIO,
            justify="left",
            wraplength=235
        ).pack(
            anchor="w",
            padx=18,
            pady=(0, 12)
        )

        # Buscador
        buscador_frame = ctk.CTkFrame(
            self.sidebar,
            fg_color=COLOR_SUAVE,
            corner_radius=9,
            border_width=1,
            border_color=COLOR_BORDE
        )
        buscador_frame.pack(
            fill="x",
            padx=16,
            pady=(0, 12)
        )

        self.entry_busqueda = ctk.CTkEntry(
            buscador_frame,
            textvariable=self.busqueda_organizacion,
            placeholder_text="Buscar organización...",
            height=38,
            border_width=0,
            fg_color="transparent",
            text_color=COLOR_TEXTO
        )
        self.entry_busqueda.pack(
            fill="x",
            padx=8,
            pady=2
        )
        self.busqueda_organizacion.trace_add(
            "write",
            lambda *_: self.renderizar_organizaciones()
        )

        # Lista desplazable
        self.lista_organizaciones = ctk.CTkScrollableFrame(
            self.sidebar,
            fg_color="transparent",
            scrollbar_button_color="#CBD5E1",
            scrollbar_button_hover_color="#94A3B8"
        )
        self.lista_organizaciones.pack(
            fill="both",
            expand=True,
            padx=8,
            pady=(0, 10)
        )

        # -------------------------------------------------
        # ZONA DERECHA
        # -------------------------------------------------

        self.zona_derecha = ctk.CTkFrame(
            self.contenedor,
            fg_color="transparent"
        )
        self.zona_derecha.pack(
            side="left",
            fill="both",
            expand=True
        )

        self.contenido = ctk.CTkScrollableFrame(
            self.zona_derecha,
            fg_color=COLOR_CARD,
            corner_radius=18,
            border_width=1,
            border_color=COLOR_BORDE
        )
        self.contenido.pack(
            fill="both",
            expand=True
        )

        # Footer
        self.footer = ctk.CTkFrame(
            self.zona_derecha,
            height=70,
            fg_color=COLOR_FONDO
        )
        self.footer.pack(
            fill="x",
            side="bottom",
            pady=(12, 0)
        )
        self.footer.pack_propagate(False)

        self.boton_atras = ctk.CTkButton(
            self.footer,
            text="← Atrás",
            width=120,
            height=42,
            fg_color="transparent",
            hover_color="#E2E8F0",
            text_color=COLOR_TEXTO,
            border_width=1,
            border_color=COLOR_BORDE,
            command=self.ir_atras
        )
        self.boton_atras.pack(side="left")

        self.boton_siguiente = ctk.CTkButton(
            self.footer,
            text="",
            width=175,
            height=42,
            corner_radius=10,
            fg_color=COLOR_PRINCIPAL,
            hover_color=COLOR_PRINCIPAL_HOVER,
            font=ctk.CTkFont(size=13, weight="bold"),
            command=self.ir_siguiente
        )
        self.boton_siguiente.pack(side="right")

        self.actualizar_estado_token()

    # =====================================================
    # TOKEN
    # =====================================================

    def guardar_token_local_silencioso(self, token):
        """Guarda el token sin mostrar ventanas durante el arranque."""
        try:
            os.makedirs(
                APP_DATA_DIR,
                exist_ok=True
            )

            with open(
                INSTALLER_CONFIG_FILE,
                "w",
                encoding="utf-8"
            ) as archivo:
                json.dump(
                    {"installer_token": token},
                    archivo,
                    ensure_ascii=False,
                    indent=2
                )

        except Exception:
            pass

    def cargar_token_guardado(self):
        """Carga el token guardado en AppData del usuario."""
        try:
            if not os.path.exists(INSTALLER_CONFIG_FILE):
                return ""

            with open(
                INSTALLER_CONFIG_FILE,
                "r",
                encoding="utf-8"
            ) as archivo:
                configuracion = json.load(archivo)

            return str(
                configuracion.get("installer_token", "")
            ).strip()

        except Exception:
            # Si el archivo está dañado o no se puede leer,
            # simplemente se solicita nuevamente el token.
            return ""

    def guardar_token_local(self, token):
        """Guarda el token fuera del EXE, en AppData del usuario."""
        try:
            os.makedirs(
                APP_DATA_DIR,
                exist_ok=True
            )

            with open(
                INSTALLER_CONFIG_FILE,
                "w",
                encoding="utf-8"
            ) as archivo:
                json.dump(
                    {"installer_token": token},
                    archivo,
                    ensure_ascii=False,
                    indent=2
                )

            return True

        except Exception as error:
            self.mostrar_error(
                "No se pudo guardar el token localmente.\n\n"
                f"{error}"
            )
            return False

    def actualizar_estado_token(self):
        if self.token:
            self.estado_token_label.configure(
                text="🔐 Token configurado",
                text_color=COLOR_EXITO
            )
        else:
            self.estado_token_label.configure(
                text="🔐 Token no configurado",
                text_color=COLOR_WARNING
            )

    def abrir_token(self):
        ventana = ctk.CTkToplevel(self)
        ventana.title("Token de instalación")
        ventana.geometry("520x270")
        ventana.resizable(False, False)
        ventana.transient(self)
        ventana.grab_set()

        ctk.CTkLabel(
            ventana,
            text="🔐 Token de instalación",
            font=ctk.CTkFont(size=20, weight="bold"),
            text_color=COLOR_TEXTO
        ).pack(pady=(28, 5))

        ctk.CTkLabel(
            ventana,
            text=(
                "El token autoriza las operaciones administrativas del instalador.\n"
                "Se guarda localmente en el equipo y no se incluye en el EXE."
            ),
            font=ctk.CTkFont(size=12),
            text_color=COLOR_SECUNDARIO,
            justify="center"
        ).pack(pady=(0, 18))

        variable = ctk.StringVar(value=self.token)

        entrada = ctk.CTkEntry(
            ventana,
            textvariable=variable,
            height=42,
            width=420,
            show="●",
            placeholder_text="Token privado"
        )
        entrada.pack()

        def guardar():
            valor = variable.get().strip()
            if not valor:
                self.mostrar_error(
                    "Debes ingresar un token de instalación.",
                    parent=ventana
                )
                return

            # Guardar primero para que sobreviva al cierre del instalador.
            if not self.guardar_token_local(valor):
                return

            self.token = valor
            self.actualizar_estado_token()
            ventana.destroy()

            # Con el token ya configurado, recargamos las organizaciones
            # directamente desde Supabase.
            self.cargar_organizaciones()

        ctk.CTkButton(
            ventana,
            text="Guardar token",
            width=150,
            height=40,
            command=guardar
        ).pack(pady=20)

    # =====================================================
    # UTILIDADES DE CONTENIDO
    # =====================================================

    def limpiar_contenido(self):
        for widget in self.contenido.winfo_children():
            widget.destroy()

    def titulo_seccion(self, titulo, descripcion):
        ctk.CTkLabel(
            self.contenido,
            text=titulo,
            font=ctk.CTkFont(size=27, weight="bold"),
            text_color=COLOR_TEXTO
        ).pack(
            anchor="w",
            padx=32,
            pady=(30, 5)
        )

        ctk.CTkLabel(
            self.contenido,
            text=descripcion,
            font=ctk.CTkFont(size=14),
            text_color=COLOR_SECUNDARIO,
            justify="left"
        ).pack(
            anchor="w",
            padx=32,
            pady=(0, 25)
        )

    def campo(self, parent, texto, variable, obligatorio=False, password=False,
              placeholder_text=""):
        frame = ctk.CTkFrame(
            parent,
            fg_color="transparent"
        )
        frame.pack(
            fill="x",
            pady=(0, 15)
        )

        texto_label = texto + (" *" if obligatorio else "")

        ctk.CTkLabel(
            frame,
            text=texto_label,
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=COLOR_TEXTO
        ).pack(
            anchor="w",
            pady=(0, 6)
        )

        entrada = ctk.CTkEntry(
            frame,
            textvariable=variable,
            height=42,
            corner_radius=9,
            border_width=1,
            border_color=COLOR_BORDE,
            fg_color="#FFFFFF",
            text_color=COLOR_TEXTO,
            show="●" if password else "",
            placeholder_text=placeholder_text
        )
        entrada.pack(fill="x")

        return entrada

    def tarjeta(self, parent, titulo, subtitulo=None):
        card = ctk.CTkFrame(
            parent,
            fg_color=COLOR_SUAVE,
            corner_radius=13,
            border_width=1,
            border_color=COLOR_BORDE
        )
        card.pack(
            fill="x",
            pady=(0, 15)
        )

        encabezado = ctk.CTkFrame(
            card,
            fg_color="transparent"
        )
        encabezado.pack(
            fill="x",
            padx=18,
            pady=(15, 8)
        )

        ctk.CTkLabel(
            encabezado,
            text=titulo,
            font=ctk.CTkFont(size=15, weight="bold"),
            text_color=COLOR_TEXTO
        ).pack(anchor="w")

        if subtitulo:
            ctk.CTkLabel(
                encabezado,
                text=subtitulo,
                font=ctk.CTkFont(size=11),
                text_color=COLOR_SECUNDARIO
            ).pack(anchor="w", pady=(2, 0))

        return card

    # =====================================================
    # INICIO
    # =====================================================

    def mostrar_inicio(self):
        self.modo = None
        self.paso_actual = 0
        self.organizacion_seleccionada = None
        self.tarjetas_admin = []

        self.boton_atras.configure(state="disabled")
        self.boton_siguiente.configure(
            state="disabled",
            text=""
        )

        self.limpiar_contenido()

        ctk.CTkLabel(
            self.contenido,
            text="Bienvenido al instalador",
            font=ctk.CTkFont(size=31, weight="bold"),
            text_color=COLOR_TEXTO
        ).pack(
            anchor="w",
            padx=42,
            pady=(70, 7)
        )

        ctk.CTkLabel(
            self.contenido,
            text=(
                "Administra las organizaciones de Liquisistema desde un solo lugar.\n"
                "Puedes crear una organización principal nueva o seleccionar una existente."
            ),
            font=ctk.CTkFont(size=15),
            text_color=COLOR_SECUNDARIO,
            justify="left"
        ).pack(
            anchor="w",
            padx=42
        )

        contenedor_cards = ctk.CTkFrame(
            self.contenido,
            fg_color="transparent"
        )
        contenedor_cards.pack(
            fill="x",
            padx=42,
            pady=(42, 20)
        )

        self.tarjeta_inicio(
            contenedor_cards,
            "＋",
            "Crear organización nueva",
            "Crea una organización principal y sus primeras suborganizaciones.",
            self.iniciar_nueva_organizacion
        )

        self.tarjeta_inicio(
            contenedor_cards,
            "🏢",
            "Administrar organización",
            "Selecciona una organización del panel izquierdo para agregar administradores.",
            lambda: None
        )

        self.mostrar_aviso_token()

    def tarjeta_inicio(self, parent, icono, titulo, descripcion, comando):
        card = ctk.CTkFrame(
            parent,
            fg_color=COLOR_CARD,
            corner_radius=15,
            border_width=1,
            border_color=COLOR_BORDE
        )
        card.pack(
            fill="x",
            pady=(0, 14)
        )

        ctk.CTkLabel(
            card,
            text=icono,
            width=52,
            height=52,
            corner_radius=12,
            fg_color=COLOR_AZUL_SUAVE,
            text_color=COLOR_PRINCIPAL,
            font=ctk.CTkFont(size=25, weight="bold")
        ).pack(
            side="left",
            padx=(18, 15),
            pady=18
        )

        textos = ctk.CTkFrame(card, fg_color="transparent")
        textos.pack(side="left", fill="x", expand=True, pady=18)

        ctk.CTkLabel(
            textos,
            text=titulo,
            font=ctk.CTkFont(size=15, weight="bold"),
            text_color=COLOR_TEXTO
        ).pack(anchor="w")

        ctk.CTkLabel(
            textos,
            text=descripcion,
            font=ctk.CTkFont(size=12),
            text_color=COLOR_SECUNDARIO,
            justify="left"
        ).pack(anchor="w", pady=(4, 0))

        ctk.CTkButton(
            card,
            text="Abrir",
            width=95,
            height=38,
            command=comando
        ).pack(
            side="right",
            padx=18
        )

    def mostrar_aviso_token(self):
        if self.token:
            texto = (
                "Token configurado. Las operaciones administrativas están listas."
            )
            color = "#ECFDF5"
            texto_color = COLOR_EXITO
        else:
            texto = (
                "Configura el token privado desde el botón “Token” del encabezado "
                "antes de realizar operaciones."
            )
            color = "#FFF7ED"
            texto_color = COLOR_WARNING

        aviso = ctk.CTkFrame(
            self.contenido,
            fg_color=color,
            corner_radius=12
        )
        aviso.pack(
            fill="x",
            padx=42,
            pady=(10, 20)
        )

        ctk.CTkLabel(
            aviso,
            text=texto,
            font=ctk.CTkFont(size=12),
            text_color=texto_color,
            justify="left",
            wraplength=650
        ).pack(
            anchor="w",
            padx=18,
            pady=14
        )

    # =====================================================
    # LISTAR ORGANIZACIONES
    # =====================================================

    def cargar_organizaciones(self):
        if not self.token:
            self.renderizar_organizaciones()
            return

        # Evita bloquear la interfaz.
        hilo = threading.Thread(
            target=self._cargar_organizaciones_hilo,
            daemon=True
        )
        hilo.start()

    def _cargar_organizaciones_hilo(self):
        try:
            respuesta = self.api_post({
                "accion": "listar_organizaciones"
            })

            if not respuesta.get("success"):
                raise Exception(
                    respuesta.get(
                        "error",
                        "No se pudieron cargar las organizaciones."
                    )
                )

            organizaciones = respuesta.get("organizaciones", [])

            self.after(
                0,
                lambda: self.organizaciones_cargadas(organizaciones)
            )

        except Exception as error:
            self.after(
                0,
                lambda: self.organizaciones_error(str(error))
            )

    def organizaciones_cargadas(self, organizaciones):
        self.organizaciones = organizaciones or []
        self.renderizar_organizaciones()

    def organizaciones_error(self, mensaje):
        self.organizaciones = []
        self.renderizar_organizaciones(
            mensaje_error="No se pudieron cargar las organizaciones."
        )

    def renderizar_organizaciones(self, mensaje_error=None):
        for widget in self.lista_organizaciones.winfo_children():
            widget.destroy()

        termino = self.busqueda_organizacion.get().strip().lower()

        filtradas = [
            org for org in self.organizaciones
            if termino in str(org.get("nombre", "")).lower()
        ]

        if mensaje_error:
            ctk.CTkLabel(
                self.lista_organizaciones,
                text=mensaje_error,
                font=ctk.CTkFont(size=11),
                text_color=COLOR_ERROR,
                wraplength=230,
                justify="left"
            ).pack(
                padx=8,
                pady=20
            )
            return

        if not filtradas:
            texto = (
                "No hay organizaciones registradas."
                if not termino
                else "No se encontraron organizaciones."
            )

            ctk.CTkLabel(
                self.lista_organizaciones,
                text=texto,
                font=ctk.CTkFont(size=11),
                text_color=COLOR_SECUNDARIO,
                wraplength=220,
                justify="left"
            ).pack(
                padx=8,
                pady=25
            )
            return

        for org in filtradas:
            self.crear_item_organizacion(org)

    def crear_item_organizacion(self, organizacion):
        seleccionado = (
            self.organizacion_seleccionada
            and self.organizacion_seleccionada.get("id") == organizacion.get("id")
        )

        card = ctk.CTkFrame(
            self.lista_organizaciones,
            fg_color=COLOR_AZUL_SUAVE if seleccionado else COLOR_CARD,
            corner_radius=11,
            border_width=1,
            border_color=COLOR_PRINCIPAL if seleccionado else COLOR_BORDE,
            cursor="hand2"
        )
        card.pack(
            fill="x",
            padx=4,
            pady=5
        )

        cantidad = organizacion.get(
            "cantidad_suborganizaciones",
            organizacion.get("suborganizaciones_count", 0)
        )

        ctk.CTkLabel(
            card,
            text="🏢",
            font=ctk.CTkFont(size=18),
            text_color=COLOR_PRINCIPAL
        ).pack(
            side="left",
            padx=(10, 7),
            pady=10
        )

        textos = ctk.CTkFrame(card, fg_color="transparent")
        textos.pack(
            side="left",
            fill="x",
            expand=True,
            padx=(0, 8),
            pady=8
        )

        ctk.CTkLabel(
            textos,
            text=str(organizacion.get("nombre", "Sin nombre")),
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=COLOR_TEXTO,
            anchor="w"
        ).pack(
            fill="x"
        )

        ctk.CTkLabel(
            textos,
            text=f"{cantidad} suborganización(es)",
            font=ctk.CTkFont(size=10),
            text_color=COLOR_SECUNDARIO,
            anchor="w"
        ).pack(
            fill="x",
            pady=(2, 0)
        )

        def seleccionar(_event=None, org=organizacion):
            self.seleccionar_organizacion(org)

        for widget in (card, textos):
            widget.bind("<Button-1>", seleccionar)

        for child in textos.winfo_children():
            child.bind("<Button-1>", seleccionar)

    def seleccionar_organizacion(self, organizacion):
        self.organizacion_seleccionada = organizacion
        self.renderizar_organizaciones()
        self.mostrar_organizacion_existente()

    # =====================================================
    # NUEVA ORGANIZACIÓN
    # =====================================================

    def iniciar_nueva_organizacion(self):
        self.modo = "nueva"
        self.paso_actual = 1
        self.organizacion_seleccionada = None
        self.nombre_principal.set("")
        self.tarjetas_admin = []

        self.boton_atras.configure(state="normal")
        self.boton_siguiente.configure(
            state="normal",
            text="Siguiente →"
        )

        self.mostrar_paso_nueva(1)

    # =====================================================
    # ORGANIZACIÓN EXISTENTE
    # =====================================================

    def mostrar_organizacion_existente(self):
        if not self.organizacion_seleccionada:
            self.mostrar_inicio()
            return

        self.modo = "existente"
        self.paso_actual = 1
        self.tarjetas_admin = []

        self.boton_atras.configure(state="normal")
        self.boton_siguiente.configure(
            state="normal",
            text="Agregar administrador →"
        )

        self.limpiar_contenido()

        nombre = self.organizacion_seleccionada.get(
            "nombre",
            "Organización"
        )

        cantidad = self.organizacion_seleccionada.get(
            "cantidad_suborganizaciones",
            self.organizacion_seleccionada.get(
                "suborganizaciones_count",
                0
            )
        )

        self.titulo_seccion(
            nombre,
            "Administración de la organización principal seleccionada."
        )

        info = ctk.CTkFrame(
            self.contenido,
            fg_color=COLOR_AZUL_SUAVE,
            corner_radius=14
        )
        info.pack(
            fill="x",
            padx=32,
            pady=(0, 22)
        )

        ctk.CTkLabel(
            info,
            text="Organización principal",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=COLOR_PRINCIPAL
        ).pack(
            anchor="w",
            padx=18,
            pady=(16, 2)
        )

        ctk.CTkLabel(
            info,
            text=nombre,
            font=ctk.CTkFont(size=20, weight="bold"),
            text_color=COLOR_TEXTO
        ).pack(
            anchor="w",
            padx=18
        )

        ctk.CTkLabel(
            info,
            text=f"{cantidad} suborganización(es) registrada(s)",
            font=ctk.CTkFont(size=12),
            text_color=COLOR_SECUNDARIO
        ).pack(
            anchor="w",
            padx=18,
            pady=(3, 16)
        )

        ctk.CTkLabel(
            self.contenido,
            text="¿Qué deseas hacer?",
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color=COLOR_TEXTO
        ).pack(
            anchor="w",
            padx=32,
            pady=(5, 12)
        )

        accion = ctk.CTkFrame(
            self.contenido,
            fg_color=COLOR_SUAVE,
            corner_radius=13,
            border_width=1,
            border_color=COLOR_BORDE
        )
        accion.pack(
            fill="x",
            padx=32,
            pady=(0, 30)
        )

        ctk.CTkLabel(
            accion,
            text="＋",
            width=48,
            height=48,
            corner_radius=12,
            fg_color=COLOR_AZUL_SUAVE,
            text_color=COLOR_PRINCIPAL,
            font=ctk.CTkFont(size=26, weight="bold")
        ).pack(
            side="left",
            padx=(18, 14),
            pady=18
        )

        textos = ctk.CTkFrame(accion, fg_color="transparent")
        textos.pack(
            side="left",
            fill="x",
            expand=True,
            pady=17
        )

        ctk.CTkLabel(
            textos,
            text="Agregar administrador",
            font=ctk.CTkFont(size=15, weight="bold"),
            text_color=COLOR_TEXTO
        ).pack(anchor="w")

        ctk.CTkLabel(
            textos,
            text=(
                "Crea una nueva suborganización y su administrador "
                "dentro de esta organización principal."
            ),
            font=ctk.CTkFont(size=11),
            text_color=COLOR_SECUNDARIO,
            wraplength=520,
            justify="left"
        ).pack(
            anchor="w",
            pady=(3, 0)
        )

        ctk.CTkButton(
            accion,
            text="Continuar →",
            width=120,
            height=38,
            command=self.iniciar_agregar_admin_existente
        ).pack(
            side="right",
            padx=18
        )

    def iniciar_agregar_admin_existente(self):
        self.modo = "existente"
        self.paso_actual = 2
        self.tarjetas_admin = []

        self.boton_atras.configure(state="normal")
        self.boton_siguiente.configure(
            state="normal",
            text="Revisar →"
        )

        self.mostrar_formulario_administradores()

    # =====================================================
    # PASOS NUEVA ORGANIZACIÓN
    # =====================================================

    def mostrar_paso_nueva(self, paso):
        self.paso_actual = paso

        if paso == 1:
            self.mostrar_formulario_principal()

        elif paso == 2:
            self.mostrar_formulario_administradores()

        elif paso == 3:
            self.mostrar_resumen_nueva()

    def mostrar_formulario_principal(self):
        self.limpiar_contenido()

        self.titulo_seccion(
            "Organización principal",
            "Define el nombre de la organización que agrupará sus suborganizaciones."
        )

        card = ctk.CTkFrame(
            self.contenido,
            fg_color=COLOR_SUAVE,
            corner_radius=14,
            border_width=1,
            border_color=COLOR_BORDE
        )
        card.pack(
            fill="x",
            padx=32,
            pady=(0, 25)
        )

        interior = ctk.CTkFrame(
            card,
            fg_color="transparent"
        )
        interior.pack(
            fill="x",
            padx=20,
            pady=20
        )

        self.campo(
            interior,
            "Nombre de la organización principal",
            self.nombre_principal,
            obligatorio=True,
            placeholder_text="Ej. Grupo Edith"
        )

        aviso = ctk.CTkFrame(
            interior,
            fg_color=COLOR_AZUL_SUAVE,
            corner_radius=10
        )
        aviso.pack(
            fill="x",
            pady=(5, 0)
        )

        ctk.CTkLabel(
            aviso,
            text=(
                "Este nombre se guardará en organizaciones_principales. "
                "Los datos de NIT, teléfono, correo y dirección pertenecen "
                "a cada suborganización."
            ),
            font=ctk.CTkFont(size=11),
            text_color=COLOR_SECUNDARIO,
            justify="left",
            wraplength=700
        ).pack(
            anchor="w",
            padx=15,
            pady=12
        )

    # =====================================================
    # ADMINISTRADORES DINÁMICOS
    # =====================================================

    def mostrar_formulario_administradores(self):
        self.limpiar_contenido()

        if self.modo == "nueva":
            titulo = "Administradores y suborganizaciones"
            descripcion = (
                "Cada administrador tendrá una suborganización propia "
                "dentro de la organización principal."
            )
        else:
            titulo = "Agregar administrador"
            descripcion = (
                "Completa los datos de la nueva suborganización y "
                "su administrador."
            )

        self.titulo_seccion(titulo, descripcion)

        contenedor = ctk.CTkFrame(
            self.contenido,
            fg_color="transparent"
        )
        contenedor.pack(
            fill="x",
            padx=32
        )

        self.admins_contenedor = contenedor

        if not self.tarjetas_admin:
            self.agregar_tarjeta_admin()

        else:
            for datos in self.tarjetas_admin:
                self.construir_tarjeta_admin(datos)

        ctk.CTkButton(
            contenedor,
            text="＋  Agregar administrador",
            height=43,
            corner_radius=10,
            fg_color=COLOR_SUAVE,
            hover_color="#E2E8F0",
            text_color=COLOR_PRINCIPAL,
            border_width=1,
            border_color=COLOR_PRINCIPAL,
            font=ctk.CTkFont(size=12, weight="bold"),
            command=self.agregar_tarjeta_admin
        ).pack(
            fill="x",
            pady=(2, 25)
        )

        aviso = ctk.CTkFrame(
            contenedor,
            fg_color="#F8FAFC",
            corner_radius=10
        )
        aviso.pack(
            fill="x",
            pady=(0, 25)
        )

        ctk.CTkLabel(
            aviso,
            text=(
                "Puedes agregar uno o varios administradores. "
                "Cada tarjeta representa exactamente una suborganización "
                "y un administrador."
            ),
            font=ctk.CTkFont(size=11),
            text_color=COLOR_SECUNDARIO,
            justify="left",
            wraplength=720
        ).pack(
            anchor="w",
            padx=15,
            pady=12
        )

    def nuevo_dato_admin(self):
        return {
            # Suborganización
            "sub_nombre": ctk.StringVar(),
            "sub_nit": ctk.StringVar(),
            "sub_telefono": ctk.StringVar(),
            "sub_correo": ctk.StringVar(),
            "sub_direccion": ctk.StringVar(),

            # Administrador
            "admin_nombre": ctk.StringVar(),
            "admin_documento": ctk.StringVar(),
            "admin_telefono": ctk.StringVar(),
            "admin_direccion": ctk.StringVar(),
            "admin_correo": ctk.StringVar(),
            "admin_password": ctk.StringVar(),
            "admin_confirmar": ctk.StringVar(),

            "frame": None
        }

    def agregar_tarjeta_admin(self):
        datos = self.nuevo_dato_admin()
        self.tarjetas_admin.append(datos)

        if hasattr(self, "admins_contenedor"):
            self.construir_tarjeta_admin(datos)

    def construir_tarjeta_admin(self, datos):
        numero = self.tarjetas_admin.index(datos) + 1

        card = ctk.CTkFrame(
            self.admins_contenedor,
            fg_color=COLOR_SUAVE,
            corner_radius=14,
            border_width=1,
            border_color=COLOR_BORDE
        )
        card.pack(
            fill="x",
            pady=(0, 18)
        )

        datos["frame"] = card

        header = ctk.CTkFrame(
            card,
            fg_color="transparent"
        )
        header.pack(
            fill="x",
            padx=18,
            pady=(15, 10)
        )

        ctk.CTkLabel(
            header,
            text=f"Administrador {numero}",
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color=COLOR_TEXTO
        ).pack(side="left")

        if len(self.tarjetas_admin) > 1:
            ctk.CTkButton(
                header,
                text="Eliminar",
                width=75,
                height=30,
                corner_radius=8,
                fg_color="#FEE2E2",
                hover_color="#FECACA",
                text_color=COLOR_ERROR,
                command=lambda d=datos: self.eliminar_tarjeta_admin(d)
            ).pack(side="right")

        body = ctk.CTkFrame(
            card,
            fg_color="transparent"
        )
        body.pack(
            fill="x",
            padx=18,
            pady=(0, 15)
        )

        # Suborganización
        ctk.CTkLabel(
            body,
            text="SUBORGANIZACIÓN",
            font=ctk.CTkFont(size=11, weight="bold"),
            text_color=COLOR_PRINCIPAL
        ).pack(
            anchor="w",
            pady=(0, 10)
        )

        self.campo(
            body,
            "Nombre",
            datos["sub_nombre"],
            obligatorio=True,
            placeholder_text="Ej. Farmacia Edith"
        )

        self.campo(
            body,
            "NIT",
            datos["sub_nit"],
            placeholder_text="Opcional"
        )

        self.campo(
            body,
            "Teléfono",
            datos["sub_telefono"],
            placeholder_text="Opcional"
        )

        self.campo(
            body,
            "Correo",
            datos["sub_correo"],
            placeholder_text="Opcional"
        )

        self.campo(
            body,
            "Dirección",
            datos["sub_direccion"],
            placeholder_text="Opcional"
        )

        # Separador
        ctk.CTkFrame(
            body,
            height=1,
            fg_color=COLOR_BORDE
        ).pack(
            fill="x",
            pady=(2, 18)
        )

        # Administrador
        ctk.CTkLabel(
            body,
            text="ADMINISTRADOR",
            font=ctk.CTkFont(size=11, weight="bold"),
            text_color=COLOR_PRINCIPAL
        ).pack(
            anchor="w",
            pady=(0, 10)
        )

        self.campo(
            body,
            "Nombre completo",
            datos["admin_nombre"],
            obligatorio=True,
            placeholder_text="Ej. Edith Acevedo"
        )

        self.campo(
            body,
            "Documento",
            datos["admin_documento"],
            obligatorio=True,
            placeholder_text="Número de documento"
        )

        self.campo(
            body,
            "Teléfono",
            datos["admin_telefono"],
            placeholder_text="Opcional"
        )

        self.campo(
            body,
            "Dirección",
            datos["admin_direccion"],
            placeholder_text="Opcional"
        )

        self.campo(
            body,
            "Correo electrónico",
            datos["admin_correo"],
            obligatorio=True,
            placeholder_text="correo@ejemplo.com"
        )

        self.campo(
            body,
            "Contraseña",
            datos["admin_password"],
            obligatorio=True,
            password=True
        )

        self.campo(
            body,
            "Confirmar contraseña",
            datos["admin_confirmar"],
            obligatorio=True,
            password=True
        )

        ctk.CTkLabel(
            body,
            text="La contraseña debe tener mínimo 6 caracteres.",
            font=ctk.CTkFont(size=11),
            text_color=COLOR_SECUNDARIO
        ).pack(
            anchor="w",
            pady=(0, 2)
        )

    def eliminar_tarjeta_admin(self, datos):
        if len(self.tarjetas_admin) <= 1:
            return

        self.tarjetas_admin.remove(datos)

        self.mostrar_formulario_administradores()

    # =====================================================
    # VALIDACIONES
    # =====================================================

    def validar_token(self):
        if not self.token:
            self.mostrar_error(
                "Configura primero el token de instalación desde el botón “Token”."
            )
            return False

        return True

    def validar_principal(self):
        if not self.nombre_principal.get().strip():
            self.mostrar_error(
                "El nombre de la organización principal es obligatorio."
            )
            return False

        return True

    def validar_admin(self, datos, numero):
        errores = []

        if not datos["sub_nombre"].get().strip():
            errores.append("• Nombre de la suborganización")

        if not datos["admin_nombre"].get().strip():
            errores.append("• Nombre del administrador")

        if not datos["admin_documento"].get().strip():
            errores.append("• Documento del administrador")

        correo = datos["admin_correo"].get().strip()

        if not correo:
            errores.append("• Correo del administrador")
        elif "@" not in correo:
            errores.append("• El correo del administrador no es válido")

        password = datos["admin_password"].get()

        if not password:
            errores.append("• Contraseña")

        elif len(password) < 6:
            errores.append("• La contraseña debe tener mínimo 6 caracteres")

        if password != datos["admin_confirmar"].get():
            errores.append("• Las contraseñas no coinciden")

        if errores:
            self.mostrar_error(
                f"Revisa el Administrador {numero}:\n\n"
                + "\n".join(errores)
            )
            return False

        return True

    def validar_administradores(self):
        if not self.tarjetas_admin:
            self.mostrar_error(
                "Debes agregar al menos un administrador."
            )
            return False

        for numero, datos in enumerate(self.tarjetas_admin, start=1):
            if not self.validar_admin(datos, numero):
                return False

        return True

    # =====================================================
    # NAVEGACIÓN
    # =====================================================

    def ir_siguiente(self):
        if self.instalando:
            return

        if not self.validar_token():
            return

        if self.modo == "nueva":
            if self.paso_actual == 1:
                if self.validar_principal():
                    self.paso_actual = 2
                    self.boton_siguiente.configure(
                        text="Revisar instalación →"
                    )
                    self.mostrar_formulario_administradores()

            elif self.paso_actual == 2:
                if self.validar_administradores():
                    self.paso_actual = 3
                    self.boton_siguiente.configure(
                        text="🚀 Crear instalación"
                    )
                    self.mostrar_resumen_nueva()

            elif self.paso_actual == 3:
                self.instalar_nueva()

        elif self.modo == "existente":
            if self.paso_actual == 1:
                self.iniciar_agregar_admin_existente()

            elif self.paso_actual == 2:
                if self.validar_administradores():
                    self.paso_actual = 3
                    self.boton_siguiente.configure(
                        text="🚀 Crear administrador"
                    )
                    self.mostrar_resumen_existente()

            elif self.paso_actual == 3:
                self.instalar_en_existente()

    def ir_atras(self):
        if self.instalando:
            return

        if self.modo == "nueva":
            if self.paso_actual == 2:
                self.paso_actual = 1
                self.boton_siguiente.configure(
                    text="Siguiente →"
                )
                self.mostrar_formulario_principal()

            elif self.paso_actual == 3:
                self.paso_actual = 2
                self.boton_siguiente.configure(
                    text="Revisar instalación →"
                )
                self.mostrar_formulario_administradores()

        elif self.modo == "existente":
            if self.paso_actual == 2:
                self.mostrar_organizacion_existente()

            elif self.paso_actual == 3:
                self.paso_actual = 2
                self.boton_siguiente.configure(
                    text="Revisar →"
                )
                self.mostrar_formulario_administradores()

    # =====================================================
    # RESÚMENES
    # =====================================================

    def tarjeta_resumen(self, titulo, datos):
        card = ctk.CTkFrame(
            self.contenido,
            fg_color=COLOR_SUAVE,
            corner_radius=12,
            border_width=1,
            border_color=COLOR_BORDE
        )
        card.pack(
            fill="x",
            padx=32,
            pady=(0, 18)
        )

        ctk.CTkLabel(
            card,
            text=titulo,
            font=ctk.CTkFont(size=11, weight="bold"),
            text_color=COLOR_PRINCIPAL
        ).pack(
            anchor="w",
            padx=18,
            pady=(15, 10)
        )

        for etiqueta, valor in datos:
            fila = ctk.CTkFrame(
                card,
                fg_color="transparent"
            )
            fila.pack(
                fill="x",
                padx=18,
                pady=3
            )

            ctk.CTkLabel(
                fila,
                text=f"{etiqueta}:",
                width=135,
                anchor="w",
                font=ctk.CTkFont(size=11),
                text_color=COLOR_SECUNDARIO
            ).pack(side="left")

            ctk.CTkLabel(
                fila,
                text=str(valor),
                anchor="w",
                font=ctk.CTkFont(size=11, weight="bold"),
                text_color=COLOR_TEXTO,
                justify="left"
            ).pack(
                side="left",
                fill="x",
                expand=True
            )

        ctk.CTkFrame(
            card,
            height=8,
            fg_color="transparent"
        ).pack()

    def mostrar_resumen_nueva(self):
        self.limpiar_contenido()

        self.titulo_seccion(
            "Revisar instalación",
            "Comprueba la organización principal y sus administradores antes de crearla."
        )

        self.tarjeta_resumen(
            "ORGANIZACIÓN PRINCIPAL",
            [
                ("Nombre", self.nombre_principal.get())
            ]
        )

        for numero, datos in enumerate(self.tarjetas_admin, start=1):
            self.tarjeta_resumen(
                f"SUBORGANIZACIÓN {numero}",
                [
                    ("Nombre", datos["sub_nombre"].get()),
                    ("NIT", datos["sub_nit"].get() or "No especificado"),
                    ("Teléfono", datos["sub_telefono"].get() or "No especificado"),
                    ("Correo", datos["sub_correo"].get() or "No especificado"),
                    ("Dirección", datos["sub_direccion"].get() or "No especificada"),
                    ("Administrador", datos["admin_nombre"].get()),
                    ("Documento", datos["admin_documento"].get()),
                    ("Correo admin", datos["admin_correo"].get()),
                    ("Rol", "admin")
                ]
            )

        self.aviso_final(
            "✓ Todo listo para instalar",
            (
                f"Se creará 1 organización principal, "
                f"{len(self.tarjetas_admin)} suborganización(es) "
                f"y {len(self.tarjetas_admin)} administrador(es)."
            ),
            COLOR_EXITO,
            "#ECFDF5"
        )

    def mostrar_resumen_existente(self):
        self.limpiar_contenido()

        nombre = self.organizacion_seleccionada.get(
            "nombre",
            "Organización"
        )

        self.titulo_seccion(
            "Revisar nuevo administrador",
            f"Se agregará una nueva suborganización dentro de “{nombre}”."
        )

        self.tarjeta_resumen(
            "ORGANIZACIÓN PRINCIPAL",
            [
                ("Nombre", nombre),
                ("ID", self.organizacion_seleccionada.get("id", "No disponible"))
            ]
        )

        datos = self.tarjetas_admin[0]

        self.tarjeta_resumen(
            "NUEVA SUBORGANIZACIÓN",
            [
                ("Nombre", datos["sub_nombre"].get()),
                ("NIT", datos["sub_nit"].get() or "No especificado"),
                ("Teléfono", datos["sub_telefono"].get() or "No especificado"),
                ("Correo", datos["sub_correo"].get() or "No especificado"),
                ("Dirección", datos["sub_direccion"].get() or "No especificada"),
                ("Administrador", datos["admin_nombre"].get()),
                ("Documento", datos["admin_documento"].get()),
                ("Correo admin", datos["admin_correo"].get()),
                ("Rol", "admin")
            ]
        )

        self.aviso_final(
            "✓ Listo para agregar",
            "Se creará una nueva suborganización con su administrador.",
            COLOR_EXITO,
            "#ECFDF5"
        )

    def aviso_final(self, titulo, texto, color, fondo):
        aviso = ctk.CTkFrame(
            self.contenido,
            fg_color=fondo,
            corner_radius=12
        )
        aviso.pack(
            fill="x",
            padx=32,
            pady=(5, 30)
        )

        ctk.CTkLabel(
            aviso,
            text=titulo,
            font=ctk.CTkFont(size=15, weight="bold"),
            text_color=color
        ).pack(
            anchor="w",
            padx=18,
            pady=(15, 3)
        )

        ctk.CTkLabel(
            aviso,
            text=texto,
            font=ctk.CTkFont(size=12),
            text_color=COLOR_SECUNDARIO,
            justify="left",
            wraplength=700
        ).pack(
            anchor="w",
            padx=18,
            pady=(0, 15)
        )

    # =====================================================
    # PAYLOAD
    # =====================================================

    def construir_admin_payload(self, datos):
        return {
            "suborganizacion": {
                "nombre": datos["sub_nombre"].get().strip(),
                "nit": datos["sub_nit"].get().strip() or None,
                "telefono": datos["sub_telefono"].get().strip() or None,
                "correo": datos["sub_correo"].get().strip().lower() or None,
                "direccion": datos["sub_direccion"].get().strip() or None
            },
            "administrador": {
                "nombre": datos["admin_nombre"].get().strip(),
                "documento": datos["admin_documento"].get().strip(),
                "telefono": datos["admin_telefono"].get().strip() or None,
                "direccion": datos["admin_direccion"].get().strip() or None,
                "correo": datos["admin_correo"].get().strip().lower(),
                "password": datos["admin_password"].get()
            }
        }

    def construir_payload_nueva(self):
        return {
            "accion": "crear_instalacion",
            "organizacion_principal": {
                "nombre": self.nombre_principal.get().strip()
            },
            "administradores": [
                self.construir_admin_payload(datos)
                for datos in self.tarjetas_admin
            ]
        }

    def construir_payload_existente(self):
        return {
            "accion": "agregar_administradores",
            "organizacion_principal_id": (
                self.organizacion_seleccionada.get("id")
            ),
            "administradores": [
                self.construir_admin_payload(datos)
                for datos in self.tarjetas_admin
            ]
        }

    # =====================================================
    # INSTALACIÓN
    # =====================================================

    def instalar_nueva(self):
        if self.instalando:
            return

        self.instalando = True

        self.boton_siguiente.configure(
            state="disabled",
            text="Creando instalación..."
        )
        self.boton_atras.configure(state="disabled")

        datos = self.construir_payload_nueva()

        threading.Thread(
            target=self.enviar_operacion,
            args=(datos, "nueva"),
            daemon=True
        ).start()

    def instalar_en_existente(self):
        if self.instalando:
            return

        self.instalando = True

        self.boton_siguiente.configure(
            state="disabled",
            text="Creando administrador..."
        )
        self.boton_atras.configure(state="disabled")

        datos = self.construir_payload_existente()

        threading.Thread(
            target=self.enviar_operacion,
            args=(datos, "existente"),
            daemon=True
        ).start()

    # =====================================================
    # API
    # =====================================================

    def api_post(self, datos):
        body = json.dumps(datos).encode("utf-8")

        request = urllib.request.Request(
            SUPABASE_FUNCTION_URL,
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "x-installer-token": self.token
            }
        )

        with urllib.request.urlopen(
            request,
            timeout=30
        ) as response:
            respuesta_texto = (
                response.read().decode("utf-8")
            )

        respuesta = json.loads(respuesta_texto)

        return respuesta

    def enviar_operacion(self, datos, tipo):
        try:
            respuesta = self.api_post(datos)

            if not respuesta.get("success"):
                raise Exception(
                    respuesta.get(
                        "error",
                        "La operación no fue completada."
                    )
                )

            self.after(
                0,
                lambda: self.operacion_exitosa(
                    respuesta,
                    tipo
                )
            )

        except urllib.error.HTTPError as error:
            try:
                detalle = (
                    error.read().decode("utf-8")
                )
                datos_error = json.loads(detalle)
                mensaje = datos_error.get(
                    "error",
                    "Error del servidor."
                )
            except Exception:
                mensaje = (
                    f"Error del servidor. Código HTTP: {error.code}"
                )

            self.after(
                0,
                lambda: self.operacion_error(mensaje)
            )

        except urllib.error.URLError as error:
            self.after(
                0,
                lambda: self.operacion_error(
                    "No se pudo conectar con Supabase.\n\n"
                    f"{error.reason}"
                )
            )

        except Exception as error:
            self.after(
                0,
                lambda: self.operacion_error(str(error))
            )

    # =====================================================
    # ÉXITO
    # =====================================================

    def operacion_exitosa(self, respuesta, tipo):
        self.instalando = False
        self.limpiar_contenido()

        ctk.CTkLabel(
            self.contenido,
            text="✓",
            font=ctk.CTkFont(size=70, weight="bold"),
            text_color=COLOR_EXITO
        ).pack(pady=(45, 5))

        titulo = (
            "Instalación completada"
            if tipo == "nueva"
            else "Administrador agregado"
        )

        descripcion = (
            "Liquisistema está listo para utilizarse."
            if tipo == "nueva"
            else "La nueva suborganización y su administrador fueron creados."
        )

        ctk.CTkLabel(
            self.contenido,
            text=titulo,
            font=ctk.CTkFont(size=30, weight="bold"),
            text_color=COLOR_TEXTO
        ).pack(pady=(0, 8))

        ctk.CTkLabel(
            self.contenido,
            text=descripcion,
            font=ctk.CTkFont(size=14),
            text_color=COLOR_SECUNDARIO
        ).pack(pady=(0, 30))

        principal = respuesta.get(
            "organizacion_principal",
            {}
        )

        if principal:
            self.tarjeta_resumen(
                "ORGANIZACIÓN PRINCIPAL",
                [
                    (
                        "Nombre",
                        principal.get(
                            "nombre",
                            self.nombre_principal.get()
                        )
                    ),
                    (
                        "ID",
                        principal.get(
                            "id",
                            self.organizacion_seleccionada.get("id")
                            if self.organizacion_seleccionada
                            else "No disponible"
                        )
                    )
                ]
            )

        suborganizaciones = respuesta.get(
            "suborganizaciones",
            []
        )

        if not suborganizaciones:
            una = respuesta.get("suborganizacion")
            if una:
                suborganizaciones = [una]

        for i, sub in enumerate(suborganizaciones, start=1):
            self.tarjeta_resumen(
                f"SUBORGANIZACIÓN {i}",
                [
                    (
                        "Nombre",
                        sub.get("nombre", "No disponible")
                    ),
                    (
                        "ID",
                        sub.get("id", "No disponible")
                    )
                ]
            )

        administradores = respuesta.get(
            "administradores",
            []
        )

        if not administradores:
            uno = respuesta.get("administrador")
            if uno:
                administradores = [uno]

        for i, admin in enumerate(administradores, start=1):
            self.tarjeta_resumen(
                f"ADMINISTRADOR {i}",
                [
                    (
                        "Nombre",
                        admin.get("nombre", "No disponible")
                    ),
                    (
                        "Correo",
                        admin.get("correo", "No disponible")
                    ),
                    (
                        "Rol",
                        admin.get("rol", "admin")
                    )
                ]
            )

        self.boton_atras.configure(state="disabled")
        self.boton_siguiente.configure(
            state="normal",
            text="Volver al inicio",
            command=self.mostrar_inicio
        )

        self.after(
            300,
            self.cargar_organizaciones
        )

    # =====================================================
    # ERROR
    # =====================================================

    def operacion_error(self, mensaje):
        self.instalando = False

        self.boton_siguiente.configure(
            state="normal"
        )
        self.boton_atras.configure(
            state="normal"
        )

        if self.modo == "nueva":
            if self.paso_actual == 3:
                self.boton_siguiente.configure(
                    text="🚀 Crear instalación"
                )
        elif self.modo == "existente":
            if self.paso_actual == 3:
                self.boton_siguiente.configure(
                    text="🚀 Crear administrador"
                )

        self.mostrar_error(mensaje)

    # =====================================================
    # ERROR MODAL
    # =====================================================

    def mostrar_error(self, mensaje, parent=None):
        padre = parent if parent is not None else self

        ventana = ctk.CTkToplevel(padre)
        ventana.title("Liquisistema")
        ventana.geometry("470x250")
        ventana.resizable(False, False)
        ventana.transient(padre)
        ventana.grab_set()

        ctk.CTkLabel(
            ventana,
            text="⚠",
            font=ctk.CTkFont(size=38, weight="bold"),
            text_color=COLOR_ERROR
        ).pack(pady=(20, 4))

        ctk.CTkLabel(
            ventana,
            text=mensaje,
            font=ctk.CTkFont(size=13),
            text_color=COLOR_TEXTO,
            wraplength=410,
            justify="center"
        ).pack(padx=25)

        ctk.CTkButton(
            ventana,
            text="Entendido",
            width=120,
            height=38,
            command=ventana.destroy
        ).pack(pady=20)

    # =====================================================
    # EJECUTAR
    # =====================================================


if __name__ == "__main__":
    app = InstaladorLiquisistema()
    app.mainloop()
