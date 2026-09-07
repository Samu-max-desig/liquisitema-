import json
import getpass
import urllib.request
import urllib.error
import os
import time


# =========================================================
# CONFIGURACIÓN
# =========================================================

SUPABASE_FUNCTION_URL = (
    "https://khocbhyfqknqgzemyomu.supabase.co"
    "/functions/v1/instalar-organizacion"
)


# =========================================================
# COLORES
# =========================================================

AZUL = "\033[94m"
CELESTE = "\033[96m"
BLANCO = "\033[97m"
VERDE = "\033[92m"
ROJO = "\033[91m"
AMARILLO = "\033[93m"
GRIS = "\033[90m"
NEGRITA = "\033[1m"
RESET = "\033[0m"


# =========================================================
# UTILIDADES VISUALES
# =========================================================

def limpiar():
    os.system("cls" if os.name == "nt" else "clear")


def linea(caracter="═"):
    print(AZUL + caracter * 64 + RESET)


def titulo(texto):
    print()
    linea()
    print(f"{NEGRITA}{CELESTE}{texto.center(64)}{RESET}")
    linea()


def encabezado():
    limpiar()

    print()
    print(AZUL + "        ██╗     ██╗ ██████╗ ██╗   ██╗██╗███████╗" + RESET)
    print(AZUL + "        ██║     ██║██╔═══██╗██║   ██║██║██╔════╝" + RESET)
    print(CELESTE + "        ██║     ██║██║   ██║██║   ██║██║███████╗" + RESET)
    print(CELESTE + "        ██║     ██║██║   ██║╚██╗ ██╔╝██║╚════██║" + RESET)
    print(AZUL + "        ███████╗██║╚██████╔╝ ╚████╔╝ ██║███████║" + RESET)
    print(AZUL + "        ╚══════╝╚═╝ ╚═════╝   ╚═══╝  ╚═╝╚══════╝" + RESET)

    print()
    print(f"{NEGRITA}{BLANCO}                 INSTALADOR LIQUISISTEMA{RESET}")
    print(f"{GRIS}                 Instalación del sistema{RESET}")
    print()


def exito(texto):
    print(f"{VERDE}✓ {texto}{RESET}")


def error(texto):
    print(f"{ROJO}✗ {texto}{RESET}")


def aviso(texto):
    print(f"{AMARILLO}! {texto}{RESET}")


def paso(numero, total, texto):
    print(
        f"{AZUL}{NEGRITA}[{numero}/{total}]{RESET} "
        f"{BLANCO}{texto}{RESET}"
    )


def pedir(texto, obligatorio=True):
    while True:
        valor = input(
            f"{CELESTE}{texto}{RESET}"
        ).strip()

        if obligatorio and not valor:
            error("Este campo es obligatorio.")
            continue

        return valor


def pedir_password():
    while True:
        password = getpass.getpass(
            f"{CELESTE}Contraseña del administrador: {RESET}"
        )

        if len(password) < 6:
            error("La contraseña debe tener mínimo 6 caracteres.")
            continue

        confirmar = getpass.getpass(
            f"{CELESTE}Confirmar contraseña: {RESET}"
        )

        if password != confirmar:
            error("Las contraseñas no coinciden.")
            continue

        return password


def pausa():
    print()
    input(
        f"{GRIS}Presiona ENTER para cerrar...{RESET}"
    )


# =========================================================
# INSTALACIÓN
# =========================================================

def instalar():

    encabezado()

    print(f"{BLANCO}Este programa permite instalar una nueva organización")
    print(f"y su administrador en Liquisistema.{RESET}")
    print()
    print(f"{GRIS}El instalador es independiente del panel administrativo.")
    print(f"No modifica organizaciones existentes.{RESET}")

    # =====================================================
    # TOKEN
    # =====================================================

    titulo("SEGURIDAD")

    token = getpass.getpass(
        f"{CELESTE}Token de instalación: {RESET}"
    )

    if not token:
        error("Debes ingresar el token.")
        return

    exito("Token recibido.")

    # =====================================================
    # ORGANIZACIÓN
    # =====================================================

    titulo("DATOS DE LA ORGANIZACIÓN")

    nombre_organizacion = pedir(
        "Nombre de la organización: "
    )

    nit = pedir(
        "NIT (opcional): ",
        obligatorio=False
    )

    telefono_organizacion = pedir(
        "Teléfono (opcional): ",
        obligatorio=False
    )

    correo_organizacion = pedir(
        "Correo (opcional): ",
        obligatorio=False
    )

    direccion_organizacion = pedir(
        "Dirección (opcional): ",
        obligatorio=False
    )

    # =====================================================
    # ADMINISTRADOR
    # =====================================================

    titulo("DATOS DEL ADMINISTRADOR")

    nombre_admin = pedir(
        "Nombre completo: "
    )

    documento_admin = pedir(
        "Documento: "
    )

    telefono_admin = pedir(
        "Teléfono (opcional): ",
        obligatorio=False
    )

    direccion_admin = pedir(
        "Dirección (opcional): ",
        obligatorio=False
    )

    correo_admin = pedir(
        "Correo: "
    ).lower()

    password_admin = pedir_password()

    # =====================================================
    # RESUMEN
    # =====================================================

    titulo("RESUMEN DE INSTALACIÓN")

    print()
    print(f"{NEGRITA}{CELESTE}ORGANIZACIÓN{RESET}")
    print(f"  Nombre:       {nombre_organizacion}")
    print(f"  NIT:          {nit or 'No especificado'}")
    print(f"  Teléfono:     {telefono_organizacion or 'No especificado'}")
    print(f"  Correo:       {correo_organizacion or 'No especificado'}")
    print(f"  Dirección:    {direccion_organizacion or 'No especificada'}")

    print()
    print(f"{NEGRITA}{CELESTE}ADMINISTRADOR{RESET}")
    print(f"  Nombre:       {nombre_admin}")
    print(f"  Documento:    {documento_admin}")
    print(f"  Teléfono:     {telefono_admin or 'No especificado'}")
    print(f"  Dirección:    {direccion_admin or 'No especificada'}")
    print(f"  Correo:       {correo_admin}")
    print(f"  Rol:          admin")

    print()
    linea("─")

    confirmar = input(
        f"{AMARILLO}¿Deseas crear esta instalación? [S/N]: {RESET}"
    ).strip().lower()

    if confirmar != "s":
        print()
        aviso("Instalación cancelada.")
        return

    # =====================================================
    # DATOS PARA SUPABASE
    # =====================================================

    datos = {
        "organizacion": {
            "nombre": nombre_organizacion,
            "nit": nit or None,
            "telefono": telefono_organizacion or None,
            "correo": correo_organizacion or None,
            "direccion": direccion_organizacion or None,
        },
        "administrador": {
            "nombre": nombre_admin,
            "documento": documento_admin,
            "telefono": telefono_admin or None,
            "direccion": direccion_admin or None,
            "correo": correo_admin,
            "password": password_admin,
        },
    }

    # =====================================================
    # INSTALACIÓN
    # =====================================================

    limpiar()

    titulo("INSTALANDO LIQUISISTEMA")

    paso(1, 4, "Conectando con el servidor...")
    time.sleep(0.4)

    try:

        body = json.dumps(datos).encode("utf-8")

        request = urllib.request.Request(
            SUPABASE_FUNCTION_URL,
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "x-installer-token": token,
            },
        )

        paso(2, 4, "Creando organización...")

        with urllib.request.urlopen(
            request,
            timeout=30
        ) as response:

            respuesta_texto = response.read().decode("utf-8")
            respuesta = json.loads(respuesta_texto)

        if not respuesta.get("success"):

            print()
            error("La instalación no fue completada.")
            print()

            print(
                respuesta.get(
                    "error",
                    "Error desconocido."
                )
            )

            return

        paso(3, 4, "Creando administrador...")
        time.sleep(0.3)

        paso(4, 4, "Asociando administrador...")
        time.sleep(0.3)

        # =================================================
        # ÉXITO
        # =================================================

        print()
        titulo("INSTALACIÓN COMPLETADA")

        print()
        exito("Organización creada correctamente.")

        print()
        print(f"{NEGRITA}{CELESTE}Organización:{RESET}")
        print(f"  {respuesta['organizacion']['nombre']}")

        print()
        print(f"{NEGRITA}{CELESTE}ID de organización:{RESET}")
        print(f"  {respuesta['organizacion']['id']}")

        print()
        print(f"{NEGRITA}{CELESTE}Administrador:{RESET}")
        print(f"  {respuesta['administrador']['nombre']}")

        print()
        print(f"{NEGRITA}{CELESTE}Correo:{RESET}")
        print(f"  {respuesta['administrador']['correo']}")

        print()
        print(f"{NEGRITA}{CELESTE}Rol:{RESET}")
        print(f"  {respuesta['administrador']['rol']}")

        print()
        linea()

        print(
            f"{VERDE}{NEGRITA}"
            "El administrador ya puede iniciar sesión."
            f"{RESET}"
        )

        linea()

    except urllib.error.HTTPError as error_http:

        print()
        titulo("ERROR DEL SERVIDOR")

        try:
            detalle = error_http.read().decode("utf-8")
            datos_error = json.loads(detalle)

            error(
                datos_error.get(
                    "error",
                    detalle
                )
            )

        except Exception:
            error(f"Código HTTP: {error_http.code}")
            error(error_http.reason)

    except urllib.error.URLError as error_url:

        print()
        titulo("ERROR DE CONEXIÓN")

        error(
            "No se pudo conectar con Supabase."
        )

        print()
        print(error_url.reason)

    except Exception as error_general:

        print()
        titulo("ERROR INESPERADO")

        error(str(error_general))


# =========================================================
# PROGRAMA PRINCIPAL
# =========================================================

if __name__ == "__main__":

    try:

        instalar()

    except KeyboardInterrupt:

        print()
        print()
        error("Instalación cancelada.")

    print()
    pausa()