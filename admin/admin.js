/* ============================================================
   KRONOX FORGE — Panel de administración
   Reutiliza de ../js/app.js: $, $$, esc, money, toast, openModal,
   Store, State, PRODUCTS, CATEGORIES, PROMOS, ICONS, uid, catImg.
   Los cambios se guardan en localStorage y la tienda pública los
   aplica al arrancar (ver applyAdminCatalog / applyAdminPromos).
   ============================================================ */
'use strict';

const ADMIN_EMAIL = 'admin@kronoxlabs.com';
const ICON_OPTS = ['laptop', 'monitor', 'cpu', 'board', 'ram', 'ssd', 'gpu', 'psu', 'case', 'os', 'keyboard', 'mouse', 'headset', 'dock', 'cam', 'ups', 'cooler', 'box'];
const USE_OPTS = ['estudio', 'oficina', 'programacion', 'diseno', 'gaming', 'video'];

/* ---------- Sesión de administrador (sessionStorage, independiente de la tienda) ---------- */
const AdminAuth = {
  get session() { try { return JSON.parse(sessionStorage.getItem('kf_admin_session') || 'null'); } catch { return null; } },
  set session(v) { v ? sessionStorage.setItem('kf_admin_session', JSON.stringify(v)) : sessionStorage.removeItem('kf_admin_session'); }
};

function initGate() {
  const form = $('#gateForm');
  $('#gEye').innerHTML = ICONS.eye || '';
  $('#gEye').addEventListener('click', () => {
    const inp = $('#gPass');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = $('#gEmail').value.trim().toLowerCase();
    const pass = $('#gPass').value;
    const fail = m => { $('#gErr').textContent = m; };
    const u = State.users.find(x => x.email === email && x.password === pass);
    if (!u) return fail('Correo o contraseña incorrectos.');
    if (u.email !== ADMIN_EMAIL) return fail('Esta cuenta no tiene permisos de administrador.');
    AdminAuth.session = { email: u.email, name: u.name, ts: Date.now() };
    enterPanel();
  });
}

function enterPanel() {
  $('#adminGate').classList.add('hidden');
  $('#adminApp').classList.remove('hidden');
  renderSection(CUR_SEC);
}

function logout() {
  AdminAuth.session = null;
  location.reload();
}

/* ---------- Persistencia ---------- */
const saveCatalog = () => Store.set('admin_catalog', PRODUCTS);
const savePromos = () => Store.set('admin_promos', PROMOS);

/* ---------- Navegación entre secciones ---------- */
let CUR_SEC = 'resumen';
function renderSection(sec) {
  CUR_SEC = sec;
  $$('.adm-tab').forEach(b => b.classList.toggle('active', b.dataset.sec === sec));
  $$('.adm-sec').forEach(s => s.classList.toggle('hidden', s.id !== 'sec-' + sec));
  ({ resumen: renderResumen, productos: renderProductos, cupones: renderCupones, usuarios: renderUsuarios, cotizaciones: renderCotizaciones, pedidos: renderPedidos })[sec]();
}

/* ============================================================
   RESUMEN
   ============================================================ */
function allQuotes() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('kf_history_')) continue;
    const user = key.slice('kf_history_'.length);
    const recs = Store.get(key.slice(3), []);
    if (Array.isArray(recs)) recs.forEach(r => out.push({ ...r, user }));
  }
  return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function renderResumen() {
  const totalVal = PRODUCTS.reduce((s, p) => s + p.price * p.stock, 0);
  const out = PRODUCTS.filter(p => p.stock === 0);
  const low = PRODUCTS.filter(p => p.stock > 0 && p.stock <= 3).sort((a, b) => a.stock - b.stock);
  const quotes = allQuotes();
  const users = State.users;

  $('#sec-resumen').innerHTML = `
    <div class="page-head-row">
      <div><h1>Resumen</h1><p>Estado general de la tienda. Los cambios que hagas aquí se reflejan al instante en el catálogo público.</p></div>
      <button class="btn btn-sm" id="goProducts">Gestionar productos</button>
    </div>
    <div class="stats">
      <div class="stat"><div class="n">${PRODUCTS.length}</div><div class="l">Productos en catálogo</div></div>
      <div class="stat"><div class="n">${money(totalVal)}</div><div class="l">Valor del inventario</div></div>
      <div class="stat"><div class="n" style="color:${out.length ? 'var(--err)' : 'inherit'}">${out.length}</div><div class="l">Agotados</div></div>
      <div class="stat"><div class="n" style="color:${low.length ? 'var(--warn)' : 'inherit'}">${low.length}</div><div class="l">Stock bajo (≤ 3)</div></div>
      <div class="stat"><div class="n">${users.length}</div><div class="l">Usuarios registrados</div></div>
      <div class="stat"><div class="n">${quotes.length}</div><div class="l">Cotizaciones guardadas</div></div>
    </div>
    <div class="grid-2">
      <div class="card card-pad-lg">
        <h3 style="margin-bottom:10px">Alertas de inventario</h3>
        ${low.concat(out).length ? `
          <div class="table-wrap"><table class="adm-table">
            <thead><tr><th>Producto</th><th>Categoría</th><th class="num">Precio</th><th class="num">Stock</th></tr></thead>
            <tbody>${low.concat(out).slice(0, 8).map(p => `
              <tr>
                <td><div class="cell-prod">${prodThumb(p)}<div><b>${esc(p.name)}</b><small>${esc(p.brand)}</small></div></div></td>
                <td>${esc(catName(p.category))}</td>
                <td class="num">${money(p.price)}</td>
                <td class="num ${p.stock === 0 ? 'stock-out' : 'stock-low'}">${p.stock === 0 ? 'Agotado' : p.stock}</td>
              </tr>`).join('')}</tbody>
          </table></div>` : '<p class="tiny muted">Sin alertas: todos los productos tienen stock suficiente.</p>'}
      </div>
      <div class="card card-pad-lg">
        <h3 style="margin-bottom:10px">Últimas cotizaciones</h3>
        ${quotes.length ? `
          <div class="table-wrap"><table class="adm-table">
            <thead><tr><th>ID</th><th>Usuario</th><th>Fecha</th><th class="num">Total</th></tr></thead>
            <tbody>${quotes.slice(0, 6).map(q => `
              <tr><td><b>${esc(q.id)}</b></td><td>${esc(q.user)}</td><td>${esc(q.date)}</td><td class="num">${money(q.total)}</td></tr>`).join('')}</tbody>
          </table></div>` : '<p class="tiny muted">Aún no hay cotizaciones guardadas en este navegador.</p>'}
      </div>
    </div>`;
  $('#goProducts')?.addEventListener('click', () => renderSection('productos'));
}

const prodThumb = p => {
  const src = catImg(p);
  return src ? `<img src="${esc(src)}" alt="">` : `<span class="picon">${ICONS[p.icon] || ICONS.box}</span>`;
};

/* ============================================================
   PRODUCTOS — CRUD
   ============================================================ */
let prodFilter = { q: '', cat: '' };

function renderProductos() {
  const host = $('#sec-productos');
  host.innerHTML = `
    <div class="page-head-row">
      <div><h1>Productos</h1><p>${PRODUCTS.length} productos · añade, edita o elimina artículos del catálogo público.</p></div>
      <div class="btn-group">
        <button class="btn btn-sm btn-danger" id="resetCat">Restaurar catálogo de fábrica</button>
        <button class="btn btn-sm btn-primary" id="addProd">+ Añadir producto</button>
      </div>
    </div>
    <div class="adm-toolbar card" style="padding:12px">
      <div class="search-input-wrap">
        ${ICONS.search.replace('<svg', '<svg width="14" height="14"')}
        <input type="search" id="pq" placeholder="Buscar por nombre, marca o etiqueta…" value="${esc(prodFilter.q)}" aria-label="Buscar producto">
      </div>
      <select id="pcat" class="btn" style="max-width:220px" aria-label="Filtrar por categoría">
        <option value="">Todas las categorías</option>
        ${CATEGORIES.map(c => `<option value="${c.id}" ${prodFilter.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
      </select>
    </div>
    <div id="prodTable"></div>`;

  $('#pq').addEventListener('input', e => { prodFilter.q = e.target.value; drawProdTable(); });
  $('#pcat').addEventListener('change', e => { prodFilter.cat = e.target.value; drawProdTable(); });
  $('#addProd').addEventListener('click', () => prodForm(null));
  $('#resetCat').addEventListener('click', confirmResetCatalog);
  drawProdTable();
}

function filteredProducts() {
  const q = prodFilter.q.trim().toLowerCase();
  return PRODUCTS.filter(p =>
    (!prodFilter.cat || p.category === prodFilter.cat) &&
    (!q || (p.name + ' ' + p.brand + ' ' + (p.tags || []).join(' ')).toLowerCase().includes(q))
  );
}

function drawProdTable() {
  const list = filteredProducts();
  $('#prodTable').innerHTML = list.length ? `
    <div class="table-wrap"><table class="adm-table">
      <thead><tr>
        <th>Producto</th><th>Categoría</th><th>Marca</th><th class="num">Precio</th><th class="num">Stock</th><th style="text-align:right">Acciones</th>
      </tr></thead>
      <tbody>${list.map(p => `
        <tr>
          <td><div class="cell-prod">${prodThumb(p)}<div><b>${esc(p.name)}</b><small>${esc(p.id)}</small></div></div></td>
          <td>${esc(catName(p.category))}</td>
          <td>${esc(p.brand)}</td>
          <td class="num"><b>${money(p.price)}</b></td>
          <td class="num ${p.stock === 0 ? 'stock-out' : p.stock <= 3 ? 'stock-low' : 'stock-ok'}">${p.stock}</td>
          <td><div class="row-actions">
            <button class="btn" data-edit="${esc(p.id)}">Editar</button>
            <button class="btn btn-clear" data-del="${esc(p.id)}">Eliminar</button>
          </div></td>
        </tr>`).join('')}</tbody>
    </table></div>
    <p class="tiny muted" style="margin-top:8px">Mostrando ${list.length} de ${PRODUCTS.length} productos.</p>` :
    '<div class="card card-pad-lg center"><p class="muted">Sin resultados para ese filtro.</p></div>';

  $$('#prodTable [data-edit]').forEach(b => b.addEventListener('click', () => prodForm(byId(b.dataset.edit))));
  $$('#prodTable [data-del]').forEach(b => b.addEventListener('click', () => confirmDeleteProduct(b.dataset.del)));
}

function confirmDeleteProduct(id) {
  const p = byId(id);
  if (!p) return;
  const m = openModal(`
    <div class="modal-head"><h3>Eliminar producto</h3><button class="x-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
    <div class="modal-body">
      <p>¿Eliminar <b>${esc(p.name)}</b> del catálogo? Esta acción solo afecta la copia administrada; puedes restaurar el catálogo de fábrica después.</p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-sm" data-close>Cancelar</button>
      <button class="btn btn-sm btn-danger" id="okDel">Eliminar</button>
    </div>`, { size: 'modal-lg' });
  $('#okDel', m.el).addEventListener('click', () => {
    const i = PRODUCTS.findIndex(x => x.id === id);
    if (i >= 0) PRODUCTS.splice(i, 1);
    saveCatalog();
    m.close();
    toast('Producto eliminado: ' + p.name, 'ok');
    drawProdTable();
  });
}

function confirmResetCatalog() {
  const m = openModal(`
    <div class="modal-head"><h3>Restaurar catálogo</h3><button class="x-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
    <div class="modal-body"><p>Se descartarán <b>todos</b> los cambios hechos desde el panel (altas, ediciones y bajas) y la tienda volverá a mostrar el catálogo original del sitio. ¿Continuar?</p></div>
    <div class="modal-foot">
      <button class="btn btn-sm" data-close>Cancelar</button>
      <button class="btn btn-sm btn-danger" id="okReset">Restaurar</button>
    </div>`, { size: 'modal-lg' });
  $('#okReset', m.el).addEventListener('click', () => { Store.del('admin_catalog'); location.reload(); });
}

/* ---------- Formulario de alta / edición ---------- */
const num = v => (v === '' || v == null || isNaN(Number(v)) ? undefined : Number(v));
const DIAC = new RegExp("[" + String.fromCharCode(768) + "-" + String.fromCharCode(879) + "]", "g");
const slug = s => s.toLowerCase().normalize("NFD").replace(DIAC, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "prod";
const specsToText = sp => Object.entries(sp || {}).map(([k, v]) => `${k}: ${v}`).join('\n');
const textToSpecs = tx => {
  const out = {};
  tx.split('\n').forEach(l => {
    const i = l.indexOf(':');
    if (i > 0) { const k = l.slice(0, i).trim(); const v = l.slice(i + 1).trim(); if (k && v) out[k] = v; }
  });
  return out;
};
const csv = tx => tx.split(',').map(s => s.trim()).filter(Boolean);

function prodForm(prod) {
  const isNew = !prod;
  const p = prod || { tags: [], specs: {}, perf: {}, uses: {} };
  const val = (k, d = '') => (p[k] == null ? d : p[k]);
  const specVal = k => (p.specs && p.specs[k]) || '';

  const m = openModal(`
    <div class="modal-head"><h3>${isNew ? 'Añadir producto' : 'Editar: ' + esc(p.name)}</h3><button class="x-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
    <div class="modal-body"><form id="pform" class="pform" novalidate>
      <div class="pform-sec">
        <h3>Información básica</h3>
        <div class="pform-grid">
          <label class="field wide"><span>Nombre *</span><input type="text" id="fName" value="${esc(val('name'))}" placeholder="Ej: ASUS ROG Strix G16"></label>
          <label class="field"><span>Marca *</span><input type="text" id="fBrand" value="${esc(val('brand'))}" placeholder="Ej: ASUS"></label>
          <label class="field"><span>Categoría *</span><select id="fCat">${CATEGORIES.map(c => `<option value="${c.id}" ${p.category === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
          <label class="field"><span>Precio (USD) *</span><input type="number" id="fPrice" min="0" step="0.01" value="${esc(val('price'))}" placeholder="0.00"></label>
          <label class="field"><span>Stock *</span><input type="number" id="fStock" min="0" step="1" value="${esc(val('stock', 0))}"></label>
          <label class="field"><span>Icono</span><select id="fIcon">${ICON_OPTS.map(i => `<option value="${i}" ${p.icon === i ? 'selected' : ''}>${i}</option>`).join('')}</select></label>
          <label class="field"><span>Etiquetas (separadas por coma)</span><input type="text" id="fTags" value="${esc((p.tags || []).join(', '))}" placeholder="i7, 16GB, RTX 4060"></label>
          <label class="field wide"><span>Imagen (ruta o URL, opcional)</span><input type="text" id="fImg" value="${esc(val('img'))}" placeholder="img/Img/mi-producto.jpg o https://…"></label>
        </div>
      </div>
      <div class="pform-sec">
        <h3>Especificaciones (una por línea: “Clave: Valor”)</h3>
        <label class="field"><textarea id="fSpecs" rows="6" placeholder="Procesador: Intel Core i7-13650HX&#10;Memoria: 16 GB DDR5">${esc(specsToText(p.specs))}</textarea></label>
      </div>
      <div class="pform-sec">
        <h3>Compatibilidad (opcional, según el tipo de producto)</h3>
        <div class="pform-grid">
          <label class="field"><span>Socket (CPU / placa / disipador)</span><input type="text" id="fSocket" value="${esc(val('socket'))}" placeholder="LGA1700, AM5…"></label>
          <label class="field"><span>Chipset (placa)</span><input type="text" id="fChipset" value="${esc(val('chipset'))}" placeholder="B760, X670E…"></label>
          <label class="field"><span>TDP / consumo (W)</span><input type="number" id="fTdp" min="0" value="${esc(val('tdp'))}" placeholder="65"></label>
          <label class="field"><span>Tipos de memoria soportados</span><input type="text" id="fRamTypes" value="${esc((p.ramTypes || []).join(', '))}" placeholder="DDR4, DDR5"></label>
          <label class="field"><span>Tipo de memoria del producto</span><input type="text" id="fRamType" value="${esc(val('ramType'))}" placeholder="DDR5"></label>
          <label class="field"><span>Velocidad de memoria (MHz)</span><input type="number" id="fRamSpeed" min="0" value="${esc(val('ramSpeed'))}" placeholder="5600"></label>
          <label class="field"><span>RAM total (GB)</span><input type="number" id="fRamGB" min="0" value="${esc(val('ramGB'))}" placeholder="16"></label>
          <label class="field"><span>Potencia de fuente (W)</span><input type="number" id="fWatts" min="0" value="${esc(val('watts'))}" placeholder="750"></label>
          <label class="field"><span>Certificación de fuente</span><input type="text" id="fEff" value="${esc(val('efficiency'))}" placeholder="80+ Gold"></label>
          <label class="field"><span>Factor de forma (placa)</span><input type="text" id="fFF" value="${esc(val('formFactor'))}" placeholder="ATX, mATX"></label>
          <label class="field"><span>Formatos que admite el gabinete</span><input type="text" id="fFFs" value="${esc((p.formFactors || []).join(', '))}" placeholder="ATX, mATX, Mini-ITX"></label>
          <label class="field"><span>Altura de disipador (mm)</span><input type="number" id="fHeight" min="0" value="${esc(val('height'))}" placeholder="158"></label>
          <label class="field"><span>Sockets del disipador</span><input type="text" id="fSockets" value="${esc((p.sockets || []).join(', '))}" placeholder="LGA1700, AM5, AM4"></label>
        </div>
      </div>
      <div class="pform-sec">
        <h3>Rendimiento y aptitudes</h3>
        <div class="pform-grid">
          <label class="field"><span>Índice CPU (0-100)</span><input type="number" id="fCpu" min="0" max="100" value="${esc(p.perf && p.perf.cpu != null ? p.perf.cpu : '')}"></label>
          <label class="field"><span>Índice GPU (0-100)</span><input type="number" id="fGpu" min="0" max="100" value="${esc(p.perf && p.perf.gpu != null ? p.perf.gpu : '')}"></label>
        </div>
        <div class="uses-grid" style="margin-top:10px">
          ${USE_OPTS.map(u => `<label>${esc(u)} (0-3)<input type="number" min="0" max="3" id="use-${u}" value="${esc(p.uses && p.uses[u] != null ? p.uses[u] : '')}"></label>`).join('')}
        </div>
      </div>
      <div class="err-text" id="fErr"></div>
      <div class="btn-group" style="justify-content:flex-end">
        <button type="button" class="btn" data-close>Cancelar</button>
        <button type="submit" class="btn btn-primary">${isNew ? 'Crear producto' : 'Guardar cambios'}</button>
      </div>
    </form></div>`, { size: 'modal-lg' });

  $('#pform', m.el).addEventListener('submit', e => {
    e.preventDefault();
    const fail = msg => { $('#fErr', m.el).textContent = msg; };
    const name = $('#fName', m.el).value.trim();
    const brand = $('#fBrand', m.el).value.trim();
    const price = Number($('#fPrice', m.el).value);
    const stock = Number($('#fStock', m.el).value);
    if (name.length < 3) return fail('Ingresa un nombre de producto válido.');
    if (!brand) return fail('Ingresa la marca.');
    if (!(price >= 0) || $('#fPrice', m.el).value === '') return fail('Ingresa un precio válido.');
    if (!(stock >= 0) || !Number.isInteger(stock)) return fail('El stock debe ser un entero mayor o igual a 0.');

    const specs = textToSpecs($('#fSpecs', m.el).value);
    const uses = {};
    USE_OPTS.forEach(u => { const v = num($('#use-' + u, m.el).value); if (v != null) uses[u] = clamp(Math.round(v), 0, 3); });
    const perf = {};
    const pc = num($('#fCpu', m.el).value), pg = num($('#fGpu', m.el).value);
    if (pc != null) perf.cpu = clamp(Math.round(pc), 0, 100);
    if (pg != null) perf.gpu = clamp(Math.round(pg), 0, 100);

    const next = {
      ...p,
      id: isNew ? uniqueId(slug(name)) : p.id,
      name, brand,
      category: $('#fCat', m.el).value,
      price: Math.round(price * 100) / 100,
      stock,
      icon: $('#fIcon', m.el).value,
      tags: csv($('#fTags', m.el).value),
      specs,
      uses,
      perf
    };
    const img = $('#fImg', m.el).value.trim();
    if (img) next.img = img; else delete next.img;

    const opt = [
      ['socket', '#fSocket'], ['chipset', '#fChipset'], ['tdp', '#fTdp', num], ['ramType', '#fRamType'],
      ['ramSpeed', '#fRamSpeed', num], ['ramGB', '#fRamGB', num], ['watts', '#fWatts', num],
      ['efficiency', '#fEff'], ['formFactor', '#fFF'], ['height', '#fHeight', num]
    ];
    opt.forEach(([k, sel, conv]) => {
      const raw = $(sel, m.el).value.trim();
      if (raw === '') delete next[k];
      else { const v = conv ? conv(raw) : raw; if (v !== undefined) next[k] = v; else delete next[k]; }
    });
    const lists = [
      ['ramTypes', csv($('#fRamTypes', m.el).value)],
      ['formFactors', csv($('#fFFs', m.el).value)],
      ['sockets', csv($('#fSockets', m.el).value)]
    ];
    lists.forEach(([k, v]) => { if (v.length) next[k] = v; else delete next[k]; });

    if (isNew) PRODUCTS.push(next);
    else Object.assign(p, next);

    saveCatalog();
    m.close();
    toast(isNew ? 'Producto creado: ' + name : 'Cambios guardados: ' + name, 'ok');
    drawProdTable();
  });
}

function uniqueId(base) {
  let id = base, n = 1;
  while (PRODUCTS.some(p => p.id === id)) id = `${base}-${++n}`;
  return id;
}

/* ============================================================
   CUPONES — CRUD
   ============================================================ */
function renderCupones() {
  const host = $('#sec-cupones');
  host.innerHTML = `
    <div class="page-head-row">
      <div><h1>Cupones</h1><p>${Object.keys(PROMOS).length} códigos de descuento activos en el cotizador.</p></div>
      <button class="btn btn-sm btn-danger" id="resetPromos">Restaurar cupones de fábrica</button>
    </div>
    <div class="card card-pad-lg">
      <h3 style="margin-bottom:10px">Añadir código</h3>
      <form id="promoForm" class="adm-toolbar" novalidate>
        <input type="text" id="pmCode" placeholder="CÓDIGO" style="text-transform:uppercase;max-width:160px" aria-label="Código">
        <input type="number" id="pmPct" min="1" max="90" placeholder="% descuento" style="max-width:130px" aria-label="Porcentaje">
        <input type="text" id="pmDesc" placeholder="Descripción" style="flex:2;min-width:180px" aria-label="Descripción">
        <button class="btn btn-primary" type="submit">Añadir</button>
      </form>
      <div class="err-text" id="pmErr"></div>
    </div>
    <div class="table-wrap"><table class="adm-table">
      <thead><tr><th>Código</th><th>Descripción</th><th class="num">Descuento</th><th style="text-align:right">Acciones</th></tr></thead>
      <tbody>${Object.entries(PROMOS).map(([k, v]) => `
        <tr>
          <td><b>${esc(k)}</b></td>
          <td>${esc(v.desc || '')}</td>
          <td class="num"><span class="badge badge-ok">−${v.pct}%</span></td>
          <td><div class="row-actions">
            <button class="btn" data-pedit="${esc(k)}">Editar</button>
            <button class="btn btn-clear" data-pdel="${esc(k)}">Eliminar</button>
          </div></td>
        </tr>`).join('')}</tbody>
    </table></div>`;

  $('#resetPromos').addEventListener('click', () => {
    const m = openModal(`
      <div class="modal-head"><h3>Restaurar cupones</h3><button class="x-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <div class="modal-body"><p>Se descartarán los cambios hechos a los códigos de promoción y volverán los 6 códigos originales.</p></div>
      <div class="modal-foot"><button class="btn btn-sm" data-close>Cancelar</button><button class="btn btn-sm btn-danger" id="okRP">Restaurar</button></div>`, { size: 'modal-lg' });
    $('#okRP', m.el).addEventListener('click', () => { Store.del('admin_promos'); location.reload(); });
  });

  $('#promoForm').addEventListener('submit', e => {
    e.preventDefault();
    const code = $('#pmCode').value.trim().toUpperCase();
    const pct = Number($('#pmPct').value);
    const desc = $('#pmDesc').value.trim();
    const fail = msg => { $('#pmErr').textContent = msg; };
    if (!/^[A-Z0-9]{3,15}$/.test(code)) return fail('El código debe tener 3-15 letras/números sin espacios.');
    if (PROMOS[code]) return fail('Ese código ya existe.');
    if (!(pct >= 1 && pct <= 90)) return fail('El descuento debe estar entre 1 y 90%.');
    PROMOS[code] = { pct: Math.round(pct), label: code, desc: desc || 'Código de descuento' };
    savePromos();
    toast('Cupón creado: ' + code, 'ok');
    renderCupones();
  });

  $$('#sec-cupones [data-pdel]').forEach(b => b.addEventListener('click', () => {
    const code = b.dataset.pdel;
    const m = openModal(`
      <div class="modal-head"><h3>Eliminar cupón</h3><button class="x-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <div class="modal-body"><p>¿Eliminar el código <b>${esc(code)}</b>? Dejará de funcionar en el cotizador.</p></div>
      <div class="modal-foot"><button class="btn btn-sm" data-close>Cancelar</button><button class="btn btn-sm btn-danger" id="okPD">Eliminar</button></div>`, { size: 'modal-lg' });
    $('#okPD', m.el).addEventListener('click', () => { delete PROMOS[code]; savePromos(); m.close(); toast('Cupón eliminado: ' + code, 'ok'); renderCupones(); });
  }));

  $$('#sec-cupones [data-pedit]').forEach(b => b.addEventListener('click', () => {
    const code = b.dataset.pedit;
    const pr = PROMOS[code];
    const m = openModal(`
      <div class="modal-head"><h3>Editar cupón ${esc(code)}</h3><button class="x-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <div class="modal-body"><form id="pmForm" novalidate>
        <label class="field"><span>Descuento (%)</span><input type="number" id="epPct" min="1" max="90" value="${pr.pct}"></label>
        <label class="field"><span>Descripción</span><input type="text" id="epDesc" value="${esc(pr.desc || '')}"></label>
        <div class="err-text" id="epErr"></div>
        <div class="btn-group" style="justify-content:flex-end;margin-top:10px">
          <button type="button" class="btn" data-close>Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form></div>`, { size: 'modal-lg' });
    $('#pmForm', m.el).addEventListener('submit', e => {
      e.preventDefault();
      const pct = Number($('#epPct', m.el).value);
      if (!(pct >= 1 && pct <= 90)) { $('#epErr', m.el).textContent = 'El descuento debe estar entre 1 y 90%.'; return; }
      pr.pct = Math.round(pct);
      pr.desc = $('#epDesc', m.el).value.trim() || pr.desc;
      savePromos(); m.close(); toast('Cupón actualizado: ' + code, 'ok'); renderCupones();
    });
  }));
}

/* ============================================================
   USUARIOS
   ============================================================ */
function renderUsuarios() {
  const users = State.users;
  $('#sec-usuarios').innerHTML = `
    <div class="page-head-row">
      <div><h1>Usuarios</h1><p>${users.length} cuentas registradas en este navegador (almacenamiento local).</p></div>
    </div>
    <div class="table-wrap"><table class="adm-table">
      <thead><tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Rol</th><th style="text-align:right">Acciones</th></tr></thead>
      <tbody>${users.map(u => `
        <tr>
          <td><b>${esc(u.name || '—')}</b></td>
          <td>${esc(u.email)}</td>
          <td>${esc(u.phone || '—')}</td>
          <td>${u.email === ADMIN_EMAIL ? '<span class="badge badge-accent">Administrador</span>' : '<span class="badge">Cliente</span>'}</td>
          <td><div class="row-actions">
            ${u.email !== ADMIN_EMAIL ? `<button class="btn btn-clear" data-udel="${esc(u.email)}">Eliminar</button>` : '<span class="tiny muted">protegida</span>'}
          </div></td>
        </tr>`).join('')}</tbody>
    </table></div>
    <p class="tiny muted">Al eliminar una cuenta también queda su historial de cotizaciones local.</p>`;

  $$('#sec-usuarios [data-udel]').forEach(b => b.addEventListener('click', () => {
    const email = b.dataset.udel;
    const m = openModal(`
      <div class="modal-head"><h3>Eliminar usuario</h3><button class="x-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <div class="modal-body"><p>¿Eliminar la cuenta <b>${esc(email)}</b>? Se borrará también su historial de cotizaciones.</p></div>
      <div class="modal-foot"><button class="btn btn-sm" data-close>Cancelar</button><button class="btn btn-sm btn-danger" id="okUD">Eliminar</button></div>`, { size: 'modal-lg' });
    $('#okUD', m.el).addEventListener('click', () => {
      State.saveUsers(State.users.filter(x => x.email !== email));
      Store.del('history_' + email);
      m.close(); toast('Usuario eliminado: ' + email, 'ok'); renderUsuarios();
    });
  }));
}

/* ============================================================
   COTIZACIONES
   ============================================================ */
function renderCotizaciones() {
  const quotes = allQuotes();
  $('#sec-cotizaciones').innerHTML = `
    <div class="page-head-row">
      <div><h1>Cotizaciones</h1><p>${quotes.length} cotizaciones guardadas por los usuarios de este navegador.</p></div>
    </div>
    ${quotes.length ? `
    <div class="table-wrap"><table class="adm-table">
      <thead><tr><th>ID</th><th>Usuario</th><th>Fecha</th><th>Artículos</th><th>Cupón</th><th class="num">Subtotal</th><th class="num">Descuento</th><th class="num">Total (con IVA)</th><th></th></tr></thead>
      <tbody>${quotes.map(q => `
        <tr>
          <td><b>${esc(q.id)}</b></td>
          <td>${esc(q.user)}</td>
          <td>${esc(q.date)}</td>
          <td>${q.items.reduce((n, i) => n + i.qty, 0)}</td>
          <td>${q.promo ? `<span class="badge badge-ok">${esc(q.promo)}</span>` : '—'}</td>
          <td class="num">${money(q.subtotal)}</td>
          <td class="num">${q.discount ? '−' + money(q.discount) : '—'}</td>
          <td class="num"><b>${money(q.total)}</b></td>
          <td><div class="row-actions"><button class="btn" data-q="${esc(q.id)}|${esc(q.user)}">Ver</button></div></td>
        </tr>`).join('')}</tbody>
    </table></div>` :
    `<div class="card card-pad-lg center"><p class="muted">Aún no hay cotizaciones registradas.</p></div>`}`;

  $$('#sec-cotizaciones [data-q]').forEach(b => b.addEventListener('click', () => {
    const [id, user] = b.dataset.q.split('|');
    const q = allQuotes().find(x => x.id === id && x.user === user);
    if (!q) return;
    openModal(`
      <div class="modal-head"><h3>Cotización ${esc(q.id)}</h3><button class="x-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <div class="modal-body">
        <p class="tiny muted" style="margin-bottom:10px">${esc(q.user)} · ${esc(q.date)}${q.promo ? ' · cupón ' + esc(q.promo) : ''}</p>
        <div class="table-wrap"><table class="adm-table">
          <thead><tr><th>Artículo</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Importe</th></tr></thead>
          <tbody>${q.items.map(i => `<tr><td>${esc(i.name)}</td><td class="num">${i.qty}</td><td class="num">${money(i.price)}</td><td class="num">${money(i.price * i.qty)}</td></tr>`).join('')}</tbody>
        </table></div>
        <div class="divider"></div>
        <div class="row-between"><span class="muted">Subtotal</span><b>${money(q.subtotal)}</b></div>
        ${q.discount ? `<div class="row-between"><span class="muted">Descuento</span><b style="color:var(--ok)">−${money(q.discount)}</b></div>` : ''}
        <div class="row-between"><span>Total (IVA ${Math.round(IVA * 100)}%)</span><b>${money(q.total)}</b></div>
      </div>
      <div class="modal-foot"><button class="btn btn-sm" data-close>Cerrar</button></div>`, { size: 'modal-lg' });
  }));
}

/* ============================================================
   PEDIDOS (compras pagadas: contacto, envio, facturacion)
   ============================================================ */
function allOrders() {
  const list = Store.get('orders', []);
  return Array.isArray(list) ? list.slice() : [];
}

function fmtAddr(a) {
  if (!a) return '—';
  return [a.street, a.city, a.zip, a.country].filter(Boolean).join(', ');
}

function renderPedidos() {
  const orders = allOrders();
  $('#sec-pedidos').innerHTML = `
    <div class="page-head-row">
      <div><h1>Pedidos</h1><p>${orders.length} pedido(s) pagados con datos de contacto y entrega. Se actualizan al instante cuando un cliente completa una compra.</p></div>
    </div>
    ${orders.length ? `
    <div class="table-wrap"><table class="adm-table">
      <thead><tr><th>Pedido</th><th>Cliente</th><th>Correo</th><th>Teléfono</th><th>Fecha</th><th class="num">Artículos</th><th class="num">Total</th><th></th></tr></thead>
      <tbody>${orders.map((o, idx) => `
        <tr>
          <td><b>${esc(o.order || o.id || '')}</b></td>
          <td>${esc(o.client || '—')}</td>
          <td>${esc(o.email || '—')}</td>
          <td>${esc(o.phone || '—')}</td>
          <td>${esc(o.datetime || o.date || '')}</td>
          <td class="num">${(o.items || []).reduce((n, i) => n + i.qty, 0)}</td>
          <td class="num"><b>${money(o.total || 0)}</b></td>
          <td><div class="row-actions"><button class="btn" data-ord="${idx}">Ver</button></div></td>
        </tr>`).join('')}</tbody>
    </table></div>` :
    `<div class="card card-pad-lg center"><p class="muted">Aún no hay pedidos pagados registrados.</p></div>`}`;

  $$('#sec-pedidos [data-ord]').forEach(b => b.addEventListener('click', () => {
    const o = allOrders()[Number(b.dataset.ord)];
    if (!o) return;
    const last4 = o.cardLast4 || (o.card || '').replace(/\D/g, '').slice(-4) || '****';
    openModal(`
      <div class="modal-head"><h3>Pedido ${esc(o.order || o.id || '')}</h3><button class="x-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <div class="modal-body">
        <p class="tiny muted" style="margin-bottom:12px">${esc(o.datetime || o.date || '')}${o.promo ? ' · cupón ' + esc(o.promo) : ''}</p>
        <div class="ord-grid">
          <div class="ord-box">
            <h4>Contacto</h4>
            <div class="row-between"><span class="muted">Nombre</span><b>${esc(o.client || '—')}</b></div>
            <div class="row-between"><span class="muted">Correo</span><b>${esc(o.email || '—')}</b></div>
            <div class="row-between"><span class="muted">Teléfono</span><b>${esc(o.phone || '—')}</b></div>
            <div class="row-between"><span class="muted">Tarjeta</span><b>${esc((o.brand || 'Tarjeta') + ' ****' + last4)}</b></div>
          </div>
          <div class="ord-box">
            <h4>Dirección de envío</h4>
            <p class="ord-addr">${esc(fmtAddr(o.shipping))}</p>
            <h4 style="margin-top:12px">Dirección de facturación</h4>
            <p class="ord-addr">${o.billing && o.billing.same ? 'Igual que el envío' : esc(fmtAddr(o.billing))}</p>
          </div>
        </div>
        <div class="divider"></div>
        <div class="table-wrap"><table class="adm-table">
          <thead><tr><th>Artículo</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Importe</th></tr></thead>
          <tbody>${(o.items || []).map(i => `<tr><td>${esc(i.name)}</td><td class="num">${i.qty}</td><td class="num">${money(i.price)}</td><td class="num">${money(i.price * i.qty)}</td></tr>`).join('')}</tbody>
        </table></div>
        <div class="divider"></div>
        <div class="row-between"><span class="muted">Subtotal</span><b>${money(o.subtotal || 0)}</b></div>
        ${o.discount ? `<div class="row-between"><span class="muted">Descuento</span><b style="color:var(--ok)">−${money(o.discount)}</b></div>` : ''}
        <div class="row-between"><span>Total pagado (IVA ${Math.round(IVA * 100)}%)</span><b>${money(o.total || 0)}</b></div>
      </div>
      <div class="modal-foot"><button class="btn btn-sm" data-close>Cerrar</button></div>`, { size: 'modal-lg' });
  }));
}

/* ---------- Arranque ---------- */
function initAdmin() {
  $('#admTabs').addEventListener('click', e => {
    const b = e.target.closest('.adm-tab');
    if (b) renderSection(b.dataset.sec);
  });
  $('#admLogout').addEventListener('click', logout);
  document.addEventListener('kf:order', () => { if (CUR_SEC === 'pedidos' || CUR_SEC === 'resumen') renderSection(CUR_SEC); });
  if (AdminAuth.session) enterPanel();
}

initAdmin();
initGate();
