from PIL import Image

imagen = Image.open("logo-liquisistema.png")

# Convertir a RGBA para conservar transparencia
imagen = imagen.convert("RGBA")

# Generar icono con varios tamaños para Windows
imagen.save(
    "logo-liquisistema.ico",
    format="ICO",
    sizes=[
        (256, 256),
        (128, 128),
        (64, 64),
        (48, 48),
        (32, 32),
        (16, 16),
    ],
)

print("✅ Logo convertido correctamente.")
print("Archivo creado: logo-liquisistema.ico")

input("\nPresiona ENTER para cerrar...")