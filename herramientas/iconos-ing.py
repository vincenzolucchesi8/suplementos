# Iconos de ingrediente con FLUX local (ComfyUI en 127.0.0.1:8188).
#
# Antes cada ingrediente tomaba el dibujo de un PLATO ("Huevos" mostraba revueltos con
# jamon) y 26 de 54 no tenian ninguno. Aca va uno por ingrediente, todos del mismo estilo.
# Uso: python iconos-ing.py <estilo> <salida> id1 id2 ...   (estilo: gouache | clay | plano)
# Las lecciones de la primera vuelta siguen valiendo: a 44 px se lee SILUETA y color
# dominante, nada de vajilla, el objeto grande y centrado, y el fondo se quita despues
# rellenando desde los bordes (recortar-ing.py), no por umbral de color.
import json, pathlib, sys, time, urllib.request

API = "http://127.0.0.1:8188"
MODELO = "flux1-dev-fp8.safetensors"

ESTILOS = {
    "gouache": "a gouache painting of {q}, single subject centered and filling the frame, thick opaque "
               "brush strokes, visible paper grain, warm soft light, children's cookbook illustration, "
               "isolated on a plain pure white background, no plate, no bowl, no table, no shadow, no text",
    "clay":    "a 3D rendered icon of {q}, soft matte clay material, vivid saturated colors, rounded friendly shapes, gentle studio "
               "lighting, subtle ambient occlusion, centered and filling the frame, isolated on a plain pure "
               "white background, no plate, no table, no shadow, no text",
    "plano":   "a flat vector illustration icon of {q}, bold simple shapes, two or three tones per color, "
               "no outlines, centered and filling the frame, isolated on a plain pure white background, "
               "no plate, no dish, no bowl, no tray, no table, no shadow, no text",
}

# Que se dibuja por ingrediente: el objeto crudo y reconocible, no un plato preparado
QUE = {
    "pollo": "a raw chicken breast fillet, pink and plump",
    "pescado": "a whole corvina fish, silver body with golden yellow fins, side view, floating on its own",
    "bonito": "a whole bonito fish, dark blue back with stripes",
    "trucha": "a whole rainbow trout fish with a pink stripe and speckles",
    "jurel": "a whole jack mackerel fish, blue green back and silver belly with a yellow side line, side view, floating on its own",
    "perico": "a whole mahi-mahi fish, bright green and yellow",
    "merluza": "a whole hake fish, long slender body, pale grey with a dark grey back, open mouth, side view, floating on its own",
    "salmon": "a thick raw salmon fillet steak, bright orange with white fat lines, floating on its own",
    "res": "a raw beef steak, deep red with a thin fat edge",
    "atun": "an open round silver metal tin can with pale pink tuna chunks inside, pull tab lid peeled back",
    "huevo": "three whole light brown chicken eggs grouped together, one cracked open showing the yolk",
    "yogurt": "a small white cup of thick protein yogurt with a spoon",
    "whey": "a scoop of white protein powder heaped on a measuring scoop",
    "leche": "a tall glass of milk",
    "pavo": "two folded slices of pink cooked ham floating on their own",
    "quinoa": "a heap of cooked quinoa grains",
    "lentejas": "a heap of brown lentils",
    "garbanzos": "a heap of chickpeas",
    "frejol": "a small heap of many small cream colored beans, each bean kidney shaped",
    "papa": "two whole potatoes with brown speckled skin, one cut in half showing pale yellow flesh",
    "camote": "a whole orange sweet potato cut in half showing orange flesh",
    "noquis": "a small heap of potato gnocchi",
    "wrap": "a rolled whole wheat tortilla wrap",
    "salmas": "two round white puffed rice cakes leaning against each other, textured surface",
    "granola": "a heap of golden crunchy granola clusters",
    "manzana": "a shiny red apple with a green leaf",
    "platano": "a ripe yellow banana",
    "mango": "a ripe mango, red and yellow, with a cut slice",
    "papaya": "half a papaya showing orange flesh and black seeds",
    "uvas": "a bunch of green grapes",
    "mandarina": "a mandarin orange with a leaf",
    "fresas": "three red strawberries",
    "lucuma": "a lucuma fruit cut in half showing yellow orange flesh",
    "lechuga": "a head of loose leaf green lettuce with wavy open bright green leaves",
    "tomate": "a ripe red tomato",
    "pepino": "a green cucumber with a few slices",
    "brocoli": "a fresh green broccoli floret",
    "coliflor": "a white cauliflower head",
    "zanahoria": "two upright orange carrots with green leafy tops",
    "espinaca": "a bunch of dark green spinach leaves",
    "champinones": "three large mushrooms with light brown caps and cream stems grouped together",
    "vainitas": "a bunch of green beans",
    "zapallito": "a green zucchini with a slice",
    "esparragos": "a bundle of green asparagus spears",
    "betarraga": "a beetroot cut in half, deep purple red",
    "cebolla": "a red onion",
    "pimiento": "a red bell pepper",
    "caigua": "a long curved pale green caigua gourd with soft little spines, elongated cucumber like shape",
    "rucula": "a bunch of arugula leaves",
    "palta": "half an avocado with the pit",
    "aceitunas": "a few black and purple botija olives",
    "queso": "a ball of fresh white mozzarella next to a yellow gouda cheese wedge with a red rind",
    "mani": "an open jar of peanut butter with peanuts",
    "chia": "a scattered pile of tiny black chia seeds spilled freely, with a small wooden spoon",
}


def pedir(nombre, prompt, semilla):
    g = {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": MODELO}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["1", 1], "text": prompt}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["1", 1], "text": ""}},
        "4": {"class_type": "EmptyLatentImage", "inputs": {"width": 640, "height": 640, "batch_size": 1}},
        "5": {"class_type": "KSampler", "inputs": {"model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0],
              "latent_image": ["4", 0], "seed": semilla, "steps": 22, "cfg": 1.0,
              "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
        "7": {"class_type": "SaveImage", "inputs": {"images": ["6", 0], "filename_prefix": nombre}},
    }
    req = urllib.request.Request(f"{API}/prompt", method="POST", data=json.dumps({"prompt": g}).encode(),
                                 headers={"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())["prompt_id"]


def esperar(pid, tope=600):
    t0 = time.time()
    while time.time() - t0 < tope:
        h = json.loads(urllib.request.urlopen(f"{API}/history/{pid}", timeout=20).read())
        if pid in h:
            for n in h[pid].get("outputs", {}).values():
                for im in n.get("images", []):
                    return im
            return None
        time.sleep(1.5)
    return None


if __name__ == "__main__":
    estilo, salida, ids = sys.argv[1], pathlib.Path(sys.argv[2]), sys.argv[3:]
    salida.mkdir(parents=True, exist_ok=True)
    semilla = int(__import__('os').environ.get('SEMILLA', '2026'))
    pids = [(i, pedir(f"ing_{estilo}_{i}", ESTILOS[estilo].format(q=QUE[i]), semilla + n)) for n, i in enumerate(ids)]
    for i, pid in pids:
        im = esperar(pid)
        if not im:
            print("FALLO", i); continue
        url = f"{API}/view?filename={im['filename']}&subfolder={im['subfolder']}&type={im['type']}"
        (salida / f"{i}.png").write_bytes(urllib.request.urlopen(url, timeout=60).read())
        print("ok", estilo, i, flush=True)
