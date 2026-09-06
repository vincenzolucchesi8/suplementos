# Protocolo v8 — menú de 28 días, notificaciones push y mudanza a Vercel

Fecha: 2026-09-06 · Aprobado por Vinz el mismo día.

## Qué problema resuelve

La v7 dejó el tablero cubriendo suplementos + nutrición, pero con tres huecos:

1. **No hay calendario de comidas.** El plan de Alexia Macher es un catálogo de opciones
   por comida más reglas de frecuencia semanal. Vinz tiene que decidir cada día qué comer
   y llevar a mano la cuenta de pescado, menestras y carne roja.
2. **No hay notificaciones.** Solo existe un recordatorio de suplementos por Slack, que
   no cubre agua, comidas, permisos ni pesaje, y no es accionable.
3. **El sync está caído** desde que el free tier de Supabase pausó `zentum-suplementos`.

## Alcance

### 1. Menú de 28 días

Rotación de 4 semanas. Cada día define desayuno, almuerzo y cena (media mañana y merienda
quedan opcionales, como en el plan). El menú se **genera y se valida con un script**, no se
escribe a ojo: `menu/validar.js` mide cada semana contra las reglas del PDF y falla si alguna
no se cumple.

Reglas que el validador exige, todas del PDF de Alexia (páginas 5, 8 y 10):

| Regla | Cota |
|---|---|
| Pescado | 3 a 4 días por semana |
| Menestras o quinoa | 2 a 3 días por semana |
| Menestras de noche | prohibido (molestias digestivas) |
| Carne roja | máximo 2 días por semana |
| Huevos | máximo 1 toma al día (desayuno **o** cena, nunca las dos) |
| Verduras | en almuerzo y cena, todos los días |
| Carbohidrato en la cena | porción reducida: ¾ taza de quinoa, ½ papa pequeña o ¾ taza de ñoquis |
| Grasa extra en la cena | prohibida en la opción plato (basta el aceite de oliva de las verduras) |
| Postre o dulce | 1 al día, y el menú lo coloca en la cena (recomendación explícita de Alexia) |
| Fruta | al menos interdiario |
| Variedad | ninguna proteína principal se repite dos días seguidos |

El menú vive en `menu/menu.json` como dato, no incrustado en el HTML, para poder
regenerarlo y validarlo aparte.

### 2. La app

Sigue siendo **un solo `index.html` estático**, extendiendo el sistema visual ya aprobado
("Longevidad claro"). Se agrega:

- **Card "Hoy toca"**: el plato del día con botón de marcar y botón de cambiar. El cambio
  solo ofrece alternativas que no rompan la frecuencia de la semana en curso.
- **Vista calendario**: la semana navegable con el plato principal de cada día.
- **Lista de compras** de la semana derivada del menú, agrupada por verdulería, carnes y
  pescado, abarrotes y lácteos, con checks que persisten.
- **Marcado automático de frecuencias**: al marcar "Almorcé" en un día cuyo menú trae
  pescado, el contador semanal de pescado sube solo. Hoy eso es manual.
- **Card de avisos**: activar o desactivar el push y editar los horarios.

### 3. Notificaciones

Web Push con VAPID. La PWA se instala en el celular y recibe avisos con la app cerrada.

Cada notificación trae acciones: **"Ya lo hice"**, **"En 15 min"** y **"Hoy no"**. La acción
se resuelve en el service worker contra la API, sin abrir la app.

Avisos por defecto, todos editables desde la app:

| Hora | Aviso |
|---|---|
| 07:00 | Vaso de agua tibia en ayunas |
| 08:00 | Desayuno (el del menú de hoy) |
| 11:00 | Media mañana, opcional |
| 13:00 | Almuerzo + suplementos de la fase |
| 16:00 | Agua, solo si vas atrasado respecto de la meta |
| 17:30 | Merienda, opcional |
| 20:00 | Cena + suplementos + el postre del día |
| 07:00 miércoles | Pesaje en ayunas |
| 18:00 domingo | Lista de compras de la semana que entra |

**El reloj lo pone el A1.** En plan Hobby los crons de Vercel corren una vez al día, así que
un cron del A1 cada 5 minutos llama a `/api/tick` con un secreto y Vercel manda el push que
corresponda. Un aviso ya mandado no se repite: se registra el disparo por día y por id.

### 4. Infraestructura

- Hosting: Vercel, proyecto propio, dominio `protocolo.papelito.online`.
- Almacenamiento: Vercel Blob (estado, suscripciones push, config de horarios), bajo un
  prefijo secreto que vive en variable de entorno.
- API, tres funciones en `/api`:
  - `estado` — GET y POST del estado con el mismo merge last-write-wins de la v7.
  - `push` — alta y baja de suscripción, y resolución de las acciones de la notificación.
  - `tick` — disparo de avisos, protegido por secreto.
- El formato de claves de la v7 (`YYYY-MM-DD:<Comida>:<id>`, `:R:`, `:P:`, `:S:`, `:W:`) se
  mantiene tal cual, así que lo ya marcado no se pierde. Al abrir la app nueva, lo que haya
  en localStorage se sube.

## Fuera de alcance

- Reescribir la app en un framework. Sigue siendo HTML plano.
- Tocar el recordatorio de Slack del A1, que sigue vivo tal como está.
- Revivir el proyecto Supabase pausado.

## Verificación

- `node menu/validar.js` pasa las 4 semanas contra las 11 reglas.
- Captura real de la app en móvil y escritorio, mirada, no solo medida.
- Un push real recibido en el celular de Vinz, con las tres acciones probadas.
