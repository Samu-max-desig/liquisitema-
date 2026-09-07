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


# =========================================================
# RUTA DE RECURSOS
# =========================================================

def ruta_recurso(nombre):
    """
    Funciona tanto ejecutando Python como dentro del EXE.
    """

    if getattr(sys, "frozen", False):
        base_path = sys._MEIPASS
    else:
        base_path = os.path.dirname(os.path.abspath(__file__))

    return os.path.join(base_path, nombre)


# =========================================================
# CONFIGURACIÓN DE APARIENCIA
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
        self.geometry("1100x720")
        self.minsize(950, 650)

        self.configure(fg_color=COLOR_FONDO)

        self.paso_actual = 1
        self.instalando = False

        self.crear_variables()
        self.crear_interfaz()

        self.mostrar_paso(1)


    # =====================================================
    # VARIABLES
    # =====================================================

    def crear_variables(self):

        # Seguridad
        self.token = ctk.StringVar()

        # Organización
        self.nombre_organizacion = ctk.StringVar()
        self.nit = ctk.StringVar()
        self.telefono_organizacion = ctk.StringVar()
        self.correo_organizacion = ctk.StringVar()
        self.direccion_organizacion = ctk.StringVar()

        # Administrador
        self.nombre_admin = ctk.StringVar()
        self.documento_admin = ctk.StringVar()
        self.telefono_admin = ctk.StringVar()
        self.direccion_admin = ctk.StringVar()
        self.correo_admin = ctk.StringVar()
        self.password_admin = ctk.StringVar()
        self.confirmar_password = ctk.StringVar()


    # =====================================================
    # INTERFAZ PRINCIPAL
    # =====================================================

    def crear_interfaz(self):

        # -------------------------------------------------
        # HEADER
        # -------------------------------------------------

        self.header = ctk.CTkFrame(
            self,
            height=82,
            fg_color=COLOR_CARD,
            corner_radius=0
        )

        self.header.pack(
            fill="x",
            side="top"
        )

        self.header.pack_propagate(False)

        # Logo
        try:

            logo = Image.open(
                ruta_recurso("logo-liquisistema.png")
            )

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
            ).pack(
                side="left",
                padx=(35, 12)
            )

        except Exception:

            pass


        # Nombre
        titulo_frame = ctk.CTkFrame(
            self.header,
            fg_color="transparent"
        )

        titulo_frame.pack(
            side="left"
        )

        ctk.CTkLabel(
            titulo_frame,
            text="Liquisistema",
            font=ctk.CTkFont(
                size=25,
                weight="bold"
            ),
            text_color=COLOR_TEXTO
        ).pack(
            anchor="w"
        )

        ctk.CTkLabel(
            titulo_frame,
            text="Instalador del sistema",
            font=ctk.CTkFont(size=13),
            text_color=COLOR_SECUNDARIO
        ).pack(
            anchor="w"
        )


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
            padx=30,
            pady=(25, 20)
        )


        # -------------------------------------------------
        # SIDEBAR
        # -------------------------------------------------

        self.sidebar = ctk.CTkFrame(
            self.contenedor,
            width=230,
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


        ctk.CTkLabel(
            self.sidebar,
            text="Nueva instalación",
            font=ctk.CTkFont(
                size=19,
                weight="bold"
            ),
            text_color=COLOR_TEXTO
        ).pack(
            anchor="w",
            padx=22,
            pady=(25, 5)
        )

        ctk.CTkLabel(
            self.sidebar,
            text="Configura una organización\nnueva en Liquisistema.",
            justify="left",
            font=ctk.CTkFont(size=13),
            text_color=COLOR_SECUNDARIO
        ).pack(
            anchor="w",
            padx=22
        )


        self.paso1_label = self.crear_paso_sidebar(
            1,
            "Organización",
            "Datos de la empresa"
        )

        self.paso2_label = self.crear_paso_sidebar(
            2,
            "Administrador",
            "Credenciales principales"
        )

        self.paso3_label = self.crear_paso_sidebar(
            3,
            "Finalizar",
            "Crear instalación"
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


        # -------------------------------------------------
        # CONTENIDO DESPLAZABLE
        # -------------------------------------------------

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


        # -------------------------------------------------
        # BOTONES FIJOS
        # -------------------------------------------------

        self.footer = ctk.CTkFrame(
            self.zona_derecha,
            height=72,
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

        self.boton_atras.pack(
            side="left"
        )


        self.boton_siguiente = ctk.CTkButton(
            self.footer,
            text="Siguiente →",
            width=150,
            height=42,
            corner_radius=10,
            fg_color=COLOR_PRINCIPAL,
            hover_color=COLOR_PRINCIPAL_HOVER,
            font=ctk.CTkFont(
                size=14,
                weight="bold"
            ),
            command=self.ir_siguiente
        )

        self.boton_siguiente.pack(
            side="right"
        )


    # =====================================================
    # SIDEBAR
    # =====================================================

    def crear_paso_sidebar(self, numero, titulo, descripcion):

        frame = ctk.CTkFrame(
            self.sidebar,
            fg_color="transparent"
        )

        frame.pack(
            fill="x",
            padx=15,
            pady=(25, 0)
        )

        circulo = ctk.CTkLabel(
            frame,
            text=str(numero),
            width=34,
            height=34,
            corner_radius=17,
            fg_color="#E2E8F0",
            text_color=COLOR_SECUNDARIO,
            font=ctk.CTkFont(
                size=14,
                weight="bold"
            )
        )

        circulo.pack(
            side="left",
            padx=(5, 12)
        )

        textos = ctk.CTkFrame(
            frame,
            fg_color="transparent"
        )

        textos.pack(
            side="left"
        )

        ctk.CTkLabel(
            textos,
            text=titulo,
            font=ctk.CTkFont(
                size=14,
                weight="bold"
            ),
            text_color=COLOR_TEXTO
        ).pack(
            anchor="w"
        )

        ctk.CTkLabel(
            textos,
            text=descripcion,
            font=ctk.CTkFont(size=11),
            text_color=COLOR_SECUNDARIO
        ).pack(
            anchor="w"
        )

        return circulo


    # =====================================================
    # LIMPIAR CONTENIDO
    # =====================================================

    def limpiar_contenido(self):

        for widget in self.contenido.winfo_children():
            widget.destroy()


    # =====================================================
    # MOSTRAR PASO
    # =====================================================

    def mostrar_paso(self, paso):

        self.paso_actual = paso

        self.limpiar_contenido()

        # Actualizar sidebar
        circulos = [
            self.paso1_label,
            self.paso2_label,
            self.paso3_label
        ]

        for i, circulo in enumerate(circulos, start=1):

            if i == paso:

                circulo.configure(
                    fg_color=COLOR_PRINCIPAL,
                    text_color="white"
                )

            elif i < paso:

                circulo.configure(
                    fg_color=COLOR_EXITO,
                    text_color="white"
                )

            else:

                circulo.configure(
                    fg_color="#E2E8F0",
                    text_color=COLOR_SECUNDARIO
                )


        if paso == 1:
            self.mostrar_organizacion()

        elif paso == 2:
            self.mostrar_administrador()

        elif paso == 3:
            self.mostrar_resumen()


        self.contenido._parent_canvas.yview_moveto(0)


        # Botones

        if paso == 1:

            self.boton_atras.configure(
                state="disabled"
            )

            self.boton_siguiente.configure(
                text="Siguiente →"
            )

        elif paso == 2:

            self.boton_atras.configure(
                state="normal"
            )

            self.boton_siguiente.configure(
                text="Revisar instalación →"
            )

        else:

            self.boton_atras.configure(
                state="normal"
            )

            self.boton_siguiente.configure(
                text="🚀 Crear organización"
            )


    # =====================================================
    # TITULO DE SECCIÓN
    # =====================================================

    def titulo_seccion(self, titulo, descripcion):

        ctk.CTkLabel(
            self.contenido,
            text=titulo,
            font=ctk.CTkFont(
                size=28,
                weight="bold"
            ),
            text_color=COLOR_TEXTO
        ).pack(
            anchor="w",
            padx=30,
            pady=(30, 5)
        )

        ctk.CTkLabel(
            self.contenido,
            text=descripcion,
            font=ctk.CTkFont(size=14),
            text_color=COLOR_SECUNDARIO
        ).pack(
            anchor="w",
            padx=30,
            pady=(0, 25)
        )


    # =====================================================
    # CAMPO
    # =====================================================

    def campo(self, texto, variable, obligatorio=False, password=False):

        frame = ctk.CTkFrame(
            self.contenido,
            fg_color="transparent"
        )

        frame.pack(
            fill="x",
            padx=30,
            pady=(0, 17)
        )

        texto_label = texto

        if obligatorio:
            texto_label += " *"

        ctk.CTkLabel(
            frame,
            text=texto_label,
            font=ctk.CTkFont(
                size=13,
                weight="bold"
            ),
            text_color=COLOR_TEXTO
        ).pack(
            anchor="w",
            pady=(0, 6)
        )

        entrada = ctk.CTkEntry(
            frame,
            textvariable=variable,
            height=44,
            corner_radius=9,
            border_width=1,
            border_color=COLOR_BORDE,
            fg_color="#FFFFFF",
            text_color=COLOR_TEXTO,
            show="●" if password else ""
        )

        entrada.pack(
            fill="x"
        )

        return entrada


    # =====================================================
    # PASO 1 - ORGANIZACIÓN
    # =====================================================

    def mostrar_organizacion(self):

        self.titulo_seccion(
            "Crear organización",
            "Ingresa los datos básicos de la organización."
        )


        # Token

        token_frame = ctk.CTkFrame(
            self.contenido,
            fg_color="#EFF6FF",
            corner_radius=12
        )

        token_frame.pack(
            fill="x",
            padx=30,
            pady=(0, 25)
        )

        ctk.CTkLabel(
            token_frame,
            text="🔐 Token de instalación",
            font=ctk.CTkFont(
                size=14,
                weight="bold"
            ),
            text_color=COLOR_PRINCIPAL
        ).pack(
            anchor="w",
            padx=18,
            pady=(15, 3)
        )

        ctk.CTkLabel(
            token_frame,
            text="Token autorizado para crear nuevas organizaciones.",
            font=ctk.CTkFont(size=12),
            text_color=COLOR_SECUNDARIO
        ).pack(
            anchor="w",
            padx=18,
            pady=(0, 8)
        )

        ctk.CTkEntry(
            token_frame,
            textvariable=self.token,
            height=42,
            show="●",
            corner_radius=8,
            border_color="#BFDBFE"
        ).pack(
            fill="x",
            padx=18,
            pady=(0, 15)
        )


        self.campo(
            "Nombre de la organización",
            self.nombre_organizacion,
            obligatorio=True
        )

        self.campo(
            "NIT",
            self.nit
        )

        self.campo(
            "Teléfono",
            self.telefono_organizacion
        )

        self.campo(
            "Correo electrónico",
            self.correo_organizacion
        )

        self.campo(
            "Dirección",
            self.direccion_organizacion
        )


    # =====================================================
    # PASO 2 - ADMINISTRADOR
    # =====================================================

    def mostrar_administrador(self):

        self.titulo_seccion(
            "Administrador principal",
            "Crea las credenciales del administrador de la organización."
        )


        self.campo(
            "Nombre completo",
            self.nombre_admin,
            obligatorio=True
        )

        self.campo(
            "Documento",
            self.documento_admin,
            obligatorio=True
        )

        self.campo(
            "Teléfono",
            self.telefono_admin
        )

        self.campo(
            "Dirección",
            self.direccion_admin
        )

        self.campo(
            "Correo electrónico",
            self.correo_admin,
            obligatorio=True
        )

        self.campo(
            "Contraseña",
            self.password_admin,
            obligatorio=True,
            password=True
        )

        self.campo(
            "Confirmar contraseña",
            self.confirmar_password,
            obligatorio=True,
            password=True
        )


        aviso = ctk.CTkFrame(
            self.contenido,
            fg_color="#F8FAFC",
            corner_radius=10
        )

        aviso.pack(
            fill="x",
            padx=30,
            pady=(5, 30)
        )

        ctk.CTkLabel(
            aviso,
            text="La contraseña debe tener mínimo 6 caracteres.",
            font=ctk.CTkFont(size=12),
            text_color=COLOR_SECUNDARIO
        ).pack(
            anchor="w",
            padx=15,
            pady=12
        )


    # =====================================================
    # PASO 3 - RESUMEN
    # =====================================================

    def mostrar_resumen(self):

        self.titulo_seccion(
            "Revisar instalación",
            "Comprueba la información antes de crear la organización."
        )


        self.tarjeta_resumen(
            "ORGANIZACIÓN",
            [
                ("Nombre", self.nombre_organizacion.get()),
                ("NIT", self.nit.get() or "No especificado"),
                ("Teléfono", self.telefono_organizacion.get() or "No especificado"),
                ("Correo", self.correo_organizacion.get() or "No especificado"),
                ("Dirección", self.direccion_organizacion.get() or "No especificada"),
            ]
        )


        self.tarjeta_resumen(
            "ADMINISTRADOR",
            [
                ("Nombre", self.nombre_admin.get()),
                ("Documento", self.documento_admin.get()),
                ("Teléfono", self.telefono_admin.get() or "No especificado"),
                ("Dirección", self.direccion_admin.get() or "No especificada"),
                ("Correo", self.correo_admin.get()),
                ("Rol", "Administrador"),
            ]
        )


        aviso = ctk.CTkFrame(
            self.contenido,
            fg_color="#ECFDF5",
            corner_radius=12
        )

        aviso.pack(
            fill="x",
            padx=30,
            pady=(5, 30)
        )

        ctk.CTkLabel(
            aviso,
            text="✓ Todo listo para instalar",
            font=ctk.CTkFont(
                size=15,
                weight="bold"
            ),
            text_color=COLOR_EXITO
        ).pack(
            anchor="w",
            padx=18,
            pady=(15, 3)
        )

        ctk.CTkLabel(
            aviso,
            text="Al continuar se creará la organización y su administrador.",
            font=ctk.CTkFont(size=12),
            text_color=COLOR_SECUNDARIO
        ).pack(
            anchor="w",
            padx=18,
            pady=(0, 15)
        )


    # =====================================================
    # TARJETA RESUMEN
    # =====================================================

    def tarjeta_resumen(self, titulo, datos):

        card = ctk.CTkFrame(
            self.contenido,
            fg_color="#F8FAFC",
            corner_radius=12,
            border_width=1,
            border_color=COLOR_BORDE
        )

        card.pack(
            fill="x",
            padx=30,
            pady=(0, 18)
        )


        ctk.CTkLabel(
            card,
            text=titulo,
            font=ctk.CTkFont(
                size=12,
                weight="bold"
            ),
            text_color=COLOR_PRINCIPAL
        ).pack(
            anchor="w",
            padx=18,
            pady=(15, 12)
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
                width=110,
                anchor="w",
                font=ctk.CTkFont(size=12),
                text_color=COLOR_SECUNDARIO
            ).pack(
                side="left"
            )

            ctk.CTkLabel(
                fila,
                text=valor,
                anchor="w",
                font=ctk.CTkFont(
                    size=12,
                    weight="bold"
                ),
                text_color=COLOR_TEXTO
            ).pack(
                side="left",
                fill="x",
                expand=True
            )


        ctk.CTkFrame(
            card,
            height=10,
            fg_color="transparent"
        ).pack()


    # =====================================================
    # VALIDAR ORGANIZACIÓN
    # =====================================================

    def validar_organizacion(self):

        if not self.token.get().strip():

            self.mostrar_error(
                "Debes ingresar el token de instalación."
            )

            return False


        if not self.nombre_organizacion.get().strip():

            self.mostrar_error(
                "El nombre de la organización es obligatorio."
            )

            return False


        return True


    # =====================================================
    # VALIDAR ADMINISTRADOR
    # =====================================================

    def validar_administrador(self):

        if not self.nombre_admin.get().strip():

            self.mostrar_error(
                "El nombre del administrador es obligatorio."
            )

            return False


        if not self.documento_admin.get().strip():

            self.mostrar_error(
                "El documento es obligatorio."
            )

            return False


        if not self.correo_admin.get().strip():

            self.mostrar_error(
                "El correo del administrador es obligatorio."
            )

            return False


        password = self.password_admin.get()

        if not password:

            self.mostrar_error(
                "Debes ingresar una contraseña."
            )

            return False


        if len(password) < 6:

            self.mostrar_error(
                "La contraseña debe tener mínimo 6 caracteres."
            )

            return False


        if password != self.confirmar_password.get():

            self.mostrar_error(
                "Las contraseñas no coinciden."
            )

            return False


        return True


    # =====================================================
    # NAVEGACIÓN
    # =====================================================

    def ir_siguiente(self):

        if self.paso_actual == 1:

            if self.validar_organizacion():
                self.mostrar_paso(2)

        elif self.paso_actual == 2:

            if self.validar_administrador():
                self.mostrar_paso(3)

        elif self.paso_actual == 3:

            self.instalar()


    def ir_atras(self):

        if self.paso_actual > 1:

            self.mostrar_paso(
                self.paso_actual - 1
            )


    # =====================================================
    # ERROR
    # =====================================================

    def mostrar_error(self, mensaje):

        ventana = ctk.CTkToplevel(self)

        ventana.title("Liquisistema")
        ventana.geometry("430x210")
        ventana.resizable(False, False)

        ventana.transient(self)
        ventana.grab_set()

        ctk.CTkLabel(
            ventana,
            text="⚠",
            font=ctk.CTkFont(
                size=35,
                weight="bold"
            ),
            text_color=COLOR_ERROR
        ).pack(
            pady=(20, 5)
        )

        ctk.CTkLabel(
            ventana,
            text=mensaje,
            font=ctk.CTkFont(size=14),
            text_color=COLOR_TEXTO,
            wraplength=370
        ).pack(
            padx=25
        )

        ctk.CTkButton(
            ventana,
            text="Entendido",
            width=120,
            command=ventana.destroy
        ).pack(
            pady=20
        )


    # =====================================================
    # INSTALAR
    # =====================================================

    def instalar(self):

        if self.instalando:
            return

        self.instalando = True

        self.boton_siguiente.configure(
            state="disabled",
            text="Creando instalación..."
        )

        self.boton_atras.configure(
            state="disabled"
        )


        datos = {

            "organizacion": {

                "nombre":
                    self.nombre_organizacion.get().strip(),

                "nit":
                    self.nit.get().strip() or None,

                "telefono":
                    self.telefono_organizacion.get().strip() or None,

                "correo":
                    self.correo_organizacion.get().strip() or None,

                "direccion":
                    self.direccion_organizacion.get().strip() or None,
            },

            "administrador": {

                "nombre":
                    self.nombre_admin.get().strip(),

                "documento":
                    self.documento_admin.get().strip(),

                "telefono":
                    self.telefono_admin.get().strip() or None,

                "direccion":
                    self.direccion_admin.get().strip() or None,

                "correo":
                    self.correo_admin.get().strip().lower(),

                "password":
                    self.password_admin.get(),
            }
        }


        hilo = threading.Thread(
            target=self.enviar_instalacion,
            args=(datos,),
            daemon=True
        )

        hilo.start()


    # =====================================================
    # ENVIAR A SUPABASE
    # =====================================================

    def enviar_instalacion(self, datos):

        try:

            body = json.dumps(datos).encode("utf-8")


            request = urllib.request.Request(
                SUPABASE_FUNCTION_URL,
                data=body,
                method="POST",
                headers={
                    "Content-Type": "application/json",
                    "x-installer-token": self.token.get().strip()
                }
            )


            with urllib.request.urlopen(
                request,
                timeout=30
            ) as response:

                respuesta_texto = (
                    response
                    .read()
                    .decode("utf-8")
                )

                respuesta = json.loads(
                    respuesta_texto
                )


            if not respuesta.get("success"):

                raise Exception(
                    respuesta.get(
                        "error",
                        "La instalación no fue completada."
                    )
                )


            self.after(
                0,
                lambda: self.instalacion_exitosa(
                    respuesta
                )
            )


        except urllib.error.HTTPError as error:

            try:

                detalle = (
                    error
                    .read()
                    .decode("utf-8")
                )

                datos_error = json.loads(
                    detalle
                )

                mensaje = datos_error.get(
                    "error",
                    "Error del servidor."
                )

            except Exception:

                mensaje = (
                    f"Error del servidor. "
                    f"Código HTTP: {error.code}"
                )


            self.after(
                0,
                lambda: self.instalacion_error(
                    mensaje
                )
            )


        except urllib.error.URLError as error:

            self.after(
                0,
                lambda: self.instalacion_error(
                    f"No se pudo conectar con Supabase.\n\n"
                    f"{error.reason}"
                )
            )


        except Exception as error:

            self.after(
                0,
                lambda: self.instalacion_error(
                    str(error)
                )
            )


    # =====================================================
    # INSTALACIÓN EXITOSA
    # =====================================================

    def instalacion_exitosa(self, respuesta):

        self.instalando = False


        # Limpiar
        self.limpiar_contenido()


        # Icono
        ctk.CTkLabel(
            self.contenido,
            text="✓",
            font=ctk.CTkFont(
                size=65,
                weight="bold"
            ),
            text_color=COLOR_EXITO
        ).pack(
            pady=(45, 5)
        )


        ctk.CTkLabel(
            self.contenido,
            text="Instalación completada",
            font=ctk.CTkFont(
                size=30,
                weight="bold"
            ),
            text_color=COLOR_TEXTO
        ).pack(
            pady=(0, 8)
        )


        ctk.CTkLabel(
            self.contenido,
            text="Liquisistema está listo para utilizarse.",
            font=ctk.CTkFont(size=14),
            text_color=COLOR_SECUNDARIO
        ).pack(
            pady=(0, 30)
        )


        organizacion = respuesta.get(
            "organizacion",
            {}
        )

        administrador = respuesta.get(
            "administrador",
            {}
        )


        self.tarjeta_resumen(
            "ORGANIZACIÓN CREADA",
            [
                (
                    "Nombre",
                    organizacion.get(
                        "nombre",
                        self.nombre_organizacion.get()
                    )
                ),

                (
                    "ID",
                    organizacion.get(
                        "id",
                        "No disponible"
                    )
                )
            ]
        )


        self.tarjeta_resumen(
            "ADMINISTRADOR",
            [
                (
                    "Nombre",
                    administrador.get(
                        "nombre",
                        self.nombre_admin.get()
                    )
                ),

                (
                    "Correo",
                    administrador.get(
                        "correo",
                        self.correo_admin.get()
                    )
                ),

                (
                    "Rol",
                    administrador.get(
                        "rol",
                        "admin"
                    )
                )
            ]
        )


        self.boton_atras.pack_forget()
        self.boton_siguiente.pack_forget()


        ctk.CTkButton(
            self.footer,
            text="Cerrar instalador",
            width=180,
            height=42,
            corner_radius=10,
            fg_color=COLOR_PRINCIPAL,
            hover_color=COLOR_PRINCIPAL_HOVER,
            font=ctk.CTkFont(
                size=14,
                weight="bold"
            ),
            command=self.destroy
        ).pack(
            side="right"
        )


        # Paso 3 queda verde
        self.paso3_label.configure(
            fg_color=COLOR_EXITO,
            text_color="white"
        )


    # =====================================================
    # ERROR DE INSTALACIÓN
    # =====================================================

    def instalacion_error(self, mensaje):

        self.instalando = False

        self.boton_siguiente.configure(
            state="normal",
            text="🚀 Crear organización"
        )

        self.boton_atras.configure(
            state="normal"
        )

        self.mostrar_error(
            mensaje
        )


# =========================================================
# EJECUTAR
# =========================================================

if __name__ == "__main__":

    app = InstaladorLiquisistema()

    app.mainloop()