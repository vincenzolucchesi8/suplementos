# Quita el fondo blanco de cada icono RELLENANDO DESDE LOS BORDES (no por umbral: un huevo
# blanco o una coliflor se los comeria), suaviza el canto, recorta a la tinta con 6 % de aire
# y guarda un webp cuadrado de 192 px con transparencia.
# Uso: python recortar-ing.py <carpeta_png> <carpeta_webp>
import sys, pathlib
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ent, sal = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
sal.mkdir(parents=True, exist_ok=True)
for f in sorted(ent.glob("*.png")):
    im = Image.open(f).convert("RGB")
    a = np.asarray(im).astype(int)
    # "fondo" = claro y casi sin color; solo cuenta si esta conectado al borde
    claro = (a.min(axis=2) > 228) & (a.max(axis=2) - a.min(axis=2) < 22)
    lab, _ = ndimage.label(claro)
    borde = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fondo = np.isin(lab, list(borde))
    alfa = Image.fromarray(np.where(fondo, 0, 255).astype("uint8")).filter(ImageFilter.GaussianBlur(1.2))
    rgba = im.copy(); rgba.putalpha(alfa)
    caja = alfa.point(lambda v: 255 if v > 40 else 0).getbbox()
    if not caja:
        print("vacio", f.name); continue
    x0, y0, x1, y1 = caja
    lado = int(max(x1 - x0, y1 - y0) * 1.12)
    lienzo = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    lienzo.paste(rgba.crop((x0, y0, x1, y1)), ((lado - (x1 - x0)) // 2, (lado - (y1 - y0)) // 2))
    lienzo.resize((192, 192), Image.LANCZOS).save(sal / (f.stem + ".webp"), "WEBP", quality=88, method=6)
    print("ok", f.stem)
