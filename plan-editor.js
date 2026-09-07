/* =============================================================================
   EDITOR DEL PLAN.

   Cuando Alexia ajusta algo en una consulta, hasta ahora hacia falta que
   alguien editara codigo y desplegara. Este editor cubre exactamente lo que
   cambia en una consulta: la fecha de arranque, las metas del dia, los
   permisos, las frecuencias de la semana y los suplementos por fase.

   Lo que NO se edita desde aca es el catalogo de platos, que son las opciones
   textuales del plan y cambian solo si la nutricionista entrega uno nuevo.
   ============================================================================= */

const MEALS = ['Desayuno', 'Almuerzo', 'Cena'];

function campoNum(etiqueta, valor, min, max, alGuardar) {
  const fila = document.createElement('label');
  fila.className = 'ed-fila';
  fila.innerHTML = `<span class="ed-lbl">${etiqueta}</span>`;
  const inp = document.createElement('input');
  inp.type = 'number'; inp.value = valor; inp.min = min; inp.max = max; inp.inputMode = 'numeric';
  inp.className = 'ed-num';
  inp.onchange = () => alGuardar(Math.max(min, Math.min(max, parseInt(inp.value, 10) || min)));
  fila.appendChild(inp);
  return fila;
}

function seccionEd(titulo, sub) {
  const d = document.createElement('div');
  d.className = 'ed-sec';
  d.innerHTML = `<div class="ed-h"><span>${titulo}</span></div>` + (sub ? `<p class="ed-sub">${sub}</p>` : '');
  return d;
}

function abrirEditorPlan() {
  // Se trabaja sobre una copia: nada cambia hasta tocar Guardar
  const borrador = JSON.parse(JSON.stringify(PLAN));

  abrirHoja('Editar el plan', cont => {
    // ---- Arranque
    const s0 = seccionEd('Arranque', 'El día 1 del programa. Cambiarlo mueve todo el calendario.');
    const f = document.createElement('label');
    f.className = 'ed-fila';
    f.innerHTML = '<span class="ed-lbl">Primer día</span>';
    const fecha = document.createElement('input');
    fecha.type = 'date'; fecha.value = borrador.inicio; fecha.className = 'ed-fecha';
    fecha.onchange = () => { if (fecha.value) borrador.inicio = fecha.value; };
    f.appendChild(fecha); s0.appendChild(f);
    cont.appendChild(s0);

    // ---- Metas del dia
    const s1 = seccionEd('Cada día', 'Lo que hay que llenar todos los días.');
    borrador.raciones.forEach(r => {
      s1.appendChild(campoNum(r.name === 'Agua' ? 'Vasos de agua' : r.name, r.meta, 0, 20, v => { r.meta = v; }));
    });
    cont.appendChild(s1);

    // ---- Permisos
    const s2 = seccionEd('Permisos', 'Cuánto se puede gastar sin pasarse.');
    borrador.permisos.forEach(p => {
      s2.appendChild(campoNum(`${p.name} · por ${p.ciclo === 'dia' ? 'día' : 'semana'}`, p.tope, 0, 14, v => {
        p.tope = v;
        p.sub = p.ciclo === 'dia'
          ? (v === 1 ? '1 al día' : `máximo ${v} al día`)
          : `${v} por semana`;
      }));
    });
    cont.appendChild(s2);

    // ---- Frecuencias
    const s3 = seccionEd('Cada semana', 'Las tres primeras también mandan en cómo se arma el menú.');
    borrador.semanales.forEach(sm => {
      s3.appendChild(campoNum(
        sm.name + (sm.tipo === 'max' ? ' · máximo' : ' · mínimo'), sm.meta, 0, 7, v => {
          sm.meta = v;
          if (sm.tipo === 'min') sm.alto = Math.max(v, sm.alto || v);
          sm.goal = sm.tipo === 'max'
            ? `máximo ${v} veces` + (sm.menu ? ' · se llena con el menú' : '')
            : `${v}${sm.alto > v ? ' a ' + sm.alto : ''} días` + (sm.menu ? ' · se llena con el menú' : '');
        }));
    });
    cont.appendChild(s3);

    // ---- Suplementos por fase
    const s4 = seccionEd('Suplementos', 'Qué se toma en cada tramo del programa, y con qué comida.');
    borrador.fases.forEach((fase, i) => {
      const bloque = document.createElement('div');
      bloque.className = 'ed-fase';
      const hasta = fase.hasta > 9000 ? '' : fase.hasta;
      bloque.innerHTML =
        `<div class="ed-fase-h"><b>${fase.nombre}</b>
           <span>día ${fase.desde}${hasta ? ' al ' + hasta : ' en adelante'}</span></div>`;
      const lista = document.createElement('div');
      fase.items.forEach((it, j) => {
        const fila = document.createElement('div');
        fila.className = 'ed-supl';
        fila.innerHTML =
          `<select class="ed-sel" aria-label="Comida">${MEALS.map(m =>
            `<option${m === it.meal ? ' selected' : ''}>${m}</option>`).join('')}</select>` +
          `<input class="ed-txt" value="${(it.name || '').replace(/"/g, '&quot;')}" aria-label="Suplemento">` +
          `<input class="ed-dosis" value="${(it.dose || '').replace(/"/g, '&quot;')}" aria-label="Dosis">` +
          `<button class="ed-x" type="button" aria-label="Quitar">&times;</button>`;
        fila.querySelector('.ed-sel').onchange = e => { it.meal = e.target.value; };
        fila.querySelector('.ed-txt').onchange = e => { it.name = e.target.value.trim() || it.name; };
        fila.querySelector('.ed-dosis').onchange = e => { it.dose = e.target.value.trim(); };
        fila.querySelector('.ed-x').onclick = () => { fase.items.splice(j, 1); abrirEditorPlan(); };
        lista.appendChild(fila);
      });
      bloque.appendChild(lista);
      const mas = document.createElement('button');
      mas.type = 'button'; mas.className = 'ed-mas'; mas.textContent = 'Agregar uno';
      mas.onclick = () => {
        fase.items.push({ meal: 'Almuerzo', name: 'Nuevo suplemento', dose: '1 cápsula', tag: '', id: 'x' + Date.now().toString(36).slice(-4) });
        PLAN = borrador; abrirEditorPlan();
      };
      bloque.appendChild(mas);
      s4.appendChild(bloque);
    });
    cont.appendChild(s4);

    // ---- Guardar
    const pie = document.createElement('div');
    pie.className = 'btns';
    pie.style.marginTop = '22px';
    pie.innerHTML = `<button class="btn btn-p" type="button" style="flex:1">Guardar el plan</button>`;
    pie.querySelector('button').onclick = async () => {
      const btn = pie.querySelector('button');
      btn.disabled = true; btn.textContent = 'Guardando…';
      const antes = PlanLib.reglasDeMenu(PLAN);
      await planGuardar(borrador);
      const ahora = PlanLib.reglasDeMenu(PLAN);
      // Si cambiaron las reglas que gobiernan el menu, hay que rearmarlo
      if (!PlanLib.mismasReglas(antes, ahora) && typeof rearmarMenu === 'function') {
        const r = rearmarMenu();
        if (!r.ok) {
          btn.disabled = false; btn.textContent = 'Guardar el plan';
          alert('El plan quedó guardado, pero con esas frecuencias no se puede armar una semana que las cumpla todas. El menú sigue con el anterior.');
          return;
        }
      }
      cerrarHoja();
      location.reload();
    };
    cont.appendChild(pie);

    cont.insertAdjacentHTML('beforeend',
      `<div class="sheet-nota"><p>Los platos y sus opciones vienen del plan de Alexia y no se editan acá: eso cambia solo si ella entrega uno nuevo.</p></div>`);
  });
}

function montarCardPlan() {
  const btn = document.getElementById('planBtn');
  const nom = document.getElementById('planNombre');
  if (!btn) return;
  if (nom) {
    const d = new Date(Date.parse(PLAN.inicio + 'T00:00:00Z'));
    nom.textContent = `${PLAN.nombre} · empezó el ${d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', timeZone: 'UTC' })}`;
  }
  btn.onclick = abrirEditorPlan;
}
