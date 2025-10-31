// --- GLOBAL FIX FOR KEYS AND LOAD/SAVE ---
window.K_CLIENTES   = 'arslan_v104_clientes';
window.K_PRODUCTOS  = 'arslan_v104_productos';
window.K_FACTURAS   = 'arslan_v104_facturas';
window.K_PRICEHIST  = 'arslan_v104_pricehist';

window.load = function (k, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(k) || '');
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

window.save = function (k, v) {
  localStorage.setItem(k, JSON.stringify(v));
};

// --- SUPABASE INIT ---
if (typeof SUPABASE_URL === 'undefined') {
  const SUPABASE_URL = 'https://fjfbokkcdbmralwzsest.supabase.co';
  const SUPABASE_ANON_KEY = 'xxx...';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ✅ Selección sin comillas extra
  supabase.from('clientes').select('id,nombre,direccion,nif,telefono,email')
    .then(console.log)
    .catch(console.error);
}


/* =======================================================
   ARSLAN PRO V10.4 — KIWI Edition (Full, estable)
   - Misma base funcional + mejoras de totales, PDF, UX rápido
   - 4 paletas, sin splash, logo kiwi solo en PDF, "FACTURA"
   - Clientes: selección segura por ID (evita datos cruzados)
======================================================= */
(function(){
"use strict";

/* ---------- HELPERS ---------- */
const $  = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
const money = n => (isNaN(n)?0:n).toFixed(2).replace('.', ',') + " €";
const parseNum = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
const escapeHTML = s => String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
const todayISO = () => new Date().toISOString();
const fmtDateDMY = d => `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
const unMoney = s => parseFloat(String(s).replace(/\./g,'').replace(',','.').replace(/[^\d.]/g,'')) || 0;
const uid = ()=>'c'+Math.random().toString(36).slice(2,10)+Date.now().toString(36);

/* ---------- KEYS ---------- */
const K_CLIENTES='arslan_v104_clientes';
const K_PRODUCTOS='arslan_v104_productos';
const K_FACTURAS='arslan_v104_facturas';
const K_PRICEHIST='arslan_v104_pricehist';

/* ---------- ESTADO ---------- */
let clientes  = load(K_CLIENTES, []);
let productos = load(K_PRODUCTOS, []);
let facturas  = load(K_FACTURAS, []);
let priceHist = load(K_PRICEHIST, {});

function load(k, fallback){ try{ const v = JSON.parse(localStorage.getItem(k)||''); return v ?? fallback; } catch{ return fallback; } }
function save(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

/* ---------- TABS ---------- */
function switchTab(id){
  $$('button.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  $$('section.panel').forEach(p=>p.classList.toggle('active', p.dataset.tabPanel===id));
  if(id==='ventas'){ drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); }
  if(id==='pendientes'){ renderPendientes(); }
  if(id==='resumen'){ drawResumen(); }
}
$$('button.tab').forEach(b=>b.addEventListener('click', ()=>switchTab(b.dataset.tab)));

/* ---------- SEED DATA ---------- */
function uniqueByName(arr){
  const map=new Map();
  arr.forEach(c=>{ const k=(c.nombre||'').trim().toLowerCase(); if(k && !map.has(k)) map.set(k,c); });
  return [...map.values()];
}
function ensureClienteIds(){
  clientes.forEach(c=>{ if(!c.id) c.id=uid(); });
}
function seedClientesIfEmpty(){
  if(clientes.length) return ensureClienteIds();
  clientes = uniqueByName([
    {id:uid(), nombre:'Riviera — CONOR ESY SLU', nif:'B16794893', dir:'Paseo del Espolón, 09003 Burgos'},
    {id:uid(), nombre:'Alesal Pan / Café de Calle San Lesmes — Alesal Pan y Café S.L.', nif:'B09582420', dir:'C/ San Lesmes 1, Burgos'},
    {id:uid(), nombre:'Al Pan Pan Burgos, S.L.', nif:'B09569344', dir:'C/ Miranda 17, Bajo, 09002 Burgos', tel:'947 277 977', email:'bertiz.miranda@gmail.com'},
    {id:uid(), nombre:'Cuevas Palacios Restauración S.L. (Con/sentidos)', nif:'B10694792', dir:'C/ San Lesmes, 1 – 09004 Burgos', tel:'947 20 35 51'},
    {id:uid(), nombre:'Café Bar Nuovo (Einy Mercedes Olivo Jiménez)', nif:'120221393', dir:'C/ San Juan de Ortega 14, 09007 Burgos'},
    {id:uid(), nombre:'Hotel Cordon'},
    {id:uid(), nombre:'Vaivén Hostelería'},
    {id:uid(), nombre:'Grupo Resicare'},
    {id:uid(), nombre:'Carlos Alameda Peralta & Seis Más'},
    {id:uid(), nombre:'Tabalou Development SLU', nif:'ES B09567769'},
    {id:uid(), nombre:'Golden Garden — David Herrera Estalayo', nif:'71281665L', dir:'Trinidad, 12, 09003 Burgos'},
    {id:uid(), nombre:'Romina — PREMIER', dir:'C/ Madrid 42, Burgos'},
    {id:uid(), nombre:'Abbas — Locutorio Gamonal', dir:'C/ Derechos Humanos 45, Burgos'},
    {id:uid(), nombre:'Nadeem Bhai — RIA Locutorio', dir:'C/ Vitoria 137, Burgos'},
    {id:uid(), nombre:'Mehmood — Mohsin Telecom', dir:'C/ Vitoria 245, Burgos'},
    {id:uid(), nombre:'Adnan Asif', nif:'X7128589S', dir:'C/ Padre Flórez 3, Burgos'},
    {id:uid(), nombre:'Imran Khan — Estambul', dir:'Avda. del Cid, Burgos'},
    {id:uid(), nombre:'Waqas Sohail', dir:'C/ Vitoria, Burgos'},
    {id:uid(), nombre:'Malik — Locutorio Malik', dir:'C/ Progreso, Burgos'},
    {id:uid(), nombre:'Angela', dir:'C/ Madrid, Burgos'},
    {id:uid(), nombre:'Aslam — Locutorio Aslam', dir:'Avda. del Cid, Burgos'},
    {id:uid(), nombre:'Victor Pelu — Tienda Centro', dir:'Burgos Centro'},
    {id:uid(), nombre:'Domingo'},
    {id:uid(), nombre:'Bar Tropical'},
    {id:uid(), nombre:'Bar Punta Cana — PUNTA CANA', dir:'C/ Los Titos, Burgos'},
    {id:uid(), nombre:'Jose — Alimentación Patxi', dir:'C/ Camino Casa la Vega 33, Burgos'},
    {id:uid(), nombre:'Ideal — Ideal Supermercado', dir:'Avda. del Cid, Burgos'}
  ]);
  save(K_CLIENTES, clientes);
}
const PRODUCT_NAMES = [
"GRANNY FRANCIA","MANZANA PINK LADY","MANDARINA COLOMBE","KIWI ZESPRI GOLD","PARAGUAYO","KIWI TOMASIN PLANCHA","PERA RINCON DEL SOTO","MELOCOTON PRIMERA","AGUACATE GRANEL","MARACUYÁ",
"MANZANA GOLDEN 24","PLATANO CANARIO PRIMERA","MANDARINA HOJA","MANZANA GOLDEN 20","NARANJA TOMASIN","NECTARINA","NUECES","SANDIA","LIMON SEGUNDA","MANZANA FUJI",
"NARANJA MESA SONRISA","JENGIBRE","BATATA","AJO PRIMERA","CEBOLLA NORMAL","CALABAZA GRANDE","PATATA LAVADA","TOMATE CHERRY RAMA","TOMATE CHERRY PERA","TOMATE DANIELA","TOMATE ROSA PRIMERA",
"CEBOLLINO","TOMATE ASURCADO MARRON","TOMATE RAMA","PIMIENTO PADRON","ZANAHORIA","PEPINO","CEBOLLETA","PUERROS","BROCOLI","JUDIA VERDE","BERENJENA","PIMIENTO ITALIANO VERDE",
"PIMIENTO ITALIANO ROJO","CHAMPIÑON","UVA ROJA","UVA BLANCA","ALCACHOFA","CALABACIN","COLIFLOR","BATAVIA","ICEBERG","MANDARINA SEGUNDA","MANZANA GOLDEN 28","NARANJA ZUMO","KIWI SEGUNDA",
"MANZANA ROYAL GALA 24","PLATANO CANARIO SUELTO","CEREZA","FRESAS","ARANDANOS","ESPINACA","PEREJIL","CILANTRO","ACELGAS","PIMIENTO VERDE","PIMIENTO ROJO","MACHO VERDE","MACHO MADURO",
"YUCA","AVOCADO","CEBOLLA ROJA","MENTA","HABANERO","RABANITOS","POMELO","PAPAYA","REINETA 28","NISPERO","ALBARICOQUE","TOMATE PERA","TOMATE BOLA","TOMATE PINK","VALVENOSTA GOLDEN",
"MELOCOTON ROJO","MELON GALIA","APIO","NARANJA SANHUJA","LIMON PRIMERA","MANGO","MELOCOTON AMARILLO","VALVENOSTA ROJA","PIÑA","NARANJA HOJA","PERA CONFERENCIA SEGUNDA","CEBOLLA DULCE",
"TOMATE ASURCADO AZUL","ESPARRAGOS BLANCOS","ESPARRAGOS TRIGUEROS","REINETA PRIMERA","AGUACATE PRIMERA","COCO","NECTARINA SEGUNDA","REINETA 24","NECTARINA CARNE BLANCA","GUINDILLA",
"REINETA VERDE","PATATA 25KG","PATATA 5 KG","TOMATE RAFF","REPOLLO","KIWI ZESPRI","PARAGUAYO SEGUNDA","MELON","REINETA 26","TOMATE ROSA","MANZANA CRIPS",
"ALOE VERA PIEZAS","TOMATE ENSALADA","PATATA 10KG","MELON BOLLO","CIRUELA ROJA","LIMA","GUINEO VERDE","SETAS","BANANA","BONIATO","FRAMBUESA","BREVAS","PERA AGUA","YAUTIA","YAME",
"OKRA","MANZANA MELASSI","CACAHUETE","SANDIA NEGRA","SANDIA RAYADA","HIGOS","KUMATO","KIWI CHILE","MELOCOTON AMARILLO SEGUNDA","HIERBABUENA","REMOLACHA","LECHUGA ROMANA","CEREZA",
"KAKI","CIRUELA CLAUDIA","PERA LIMONERA","CIRUELA AMARILLA","HIGOS BLANCOS","UVA ALVILLO","LIMON EXTRA","PITAHAYA ROJA","HIGO CHUMBO","CLEMENTINA","GRANADA","NECTARINA PRIMERA BIS",
"CHIRIMOYA","UVA CHELVA","PIMIENTO CALIFORNIA VERDE","KIWI TOMASIN","PIMIENTO CALIFORNIA ROJO","MANDARINA SATSUMA","CASTAÑA","CAKI","MANZANA KANZI","PERA ERCOLINA","NABO",
"UVA ALVILLO NEGRA","CHAYOTE","ROYAL GALA 28","MANDARINA PRIMERA","PIMIENTO PINTON","MELOCOTON AMARILLO DE CALANDA","HINOJOS","MANDARINA DE HOJA","UVA ROJA PRIMERA","UVA BLANCA PRIMERA"
];
function seedProductsIfEmpty(){
  if(productos.length) return;
  productos = PRODUCT_NAMES.map(n=>({name:n}));
  save(K_PRODUCTOS, productos);
}

/* ---------- PROVIDER DEFAULTS (tus datos) ---------- */
function setProviderDefaultsIfEmpty(){
  if(!$('#provNombre').value) $('#provNombre').value = 'Mohammad Arslan Waris';
  if(!$('#provNif').value)    $('#provNif').value    = 'X6389988J';
  if(!$('#provDir').value)    $('#provDir').value    = 'Calle San Pablo 17, 09003 Burgos';
  if(!$('#provTel').value)    $('#provTel').value    = '631 667 893';
  if(!$('#provEmail').value)  $('#provEmail').value  = 'shaniwaris80@gmail.com';
}

/* ---------- HISTORIAL DE PRECIOS ---------- */
function lastPrice(name){ const arr = priceHist[name]; return arr?.length ? arr[0].price : null; }
function pushPriceHistory(name, price){
  if(!name || !(price>0)) return;
  const arr = priceHist[name] || [];
  arr.unshift({price, date: todayISO()});
  priceHist[name] = arr.slice(0,10);
  save(K_PRICEHIST, priceHist);
}
function renderPriceHistory(name){
  const panel=$('#pricePanel'), body=$('#ppBody'); if(!panel||!body) return;
  panel.removeAttribute('hidden');
  const hist=priceHist[name]||[];
  if(hist.length===0){ body.innerHTML=`<div class="pp-row"><span>${escapeHTML(name)}</span><strong>Sin datos</strong></div>`; hidePanelSoon(); return; }
  body.innerHTML=`<div class="pp-row" style="justify-content:center"><strong>${escapeHTML(name)}</strong></div>` +
    hist.map(h=>`<div class="pp-row"><span>${fmtDateDMY(new Date(h.date))}</span><strong>${money(h.price)}</strong></div>`).join('');
  hidePanelSoon();
}
function hidePanelSoon(){ clearTimeout(hidePanelSoon.t); hidePanelSoon.t=setTimeout(()=>$('#pricePanel')?.setAttribute('hidden',''), 4800); }

/* ---------- CLIENTES UI (IDs seguras) ---------- */
function saveClientes(){ save(K_CLIENTES, clientes); }
function renderClientesSelect(){
  const sel = $('#selCliente'); if(!sel) return;
  sel.innerHTML = `<option value="">— Seleccionar cliente —</option>`;
  const arr = [...clientes].sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''));
  arr.forEach((c)=>{
    const opt=document.createElement('option'); opt.value=c.id; opt.textContent=c.nombre||'(Sin nombre)'; sel.appendChild(opt);
  });
}
function renderClientesLista(){
  const cont = $('#listaClientes'); if(!cont) return;
  cont.innerHTML='';
  const q = ($('#buscarCliente')?.value||'').toLowerCase();
  const arr = [...clientes].sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''));
  const view = q ? arr.filter(c=>(c.nombre||'').toLowerCase().includes(q) || (c.nif||'').toLowerCase().includes(q) || (c.dir||'').toLowerCase().includes(q)) : arr;
  if(view.length===0){ cont.innerHTML='<div class="item">Sin clientes.</div>'; return; }
  view.forEach((c)=>{
    const row=document.createElement('div'); row.className='item';
    row.innerHTML=`
      <div>
        <strong>${escapeHTML(c.nombre||'(Sin nombre)')}</strong>
        <div class="muted">${escapeHTML(c.nif||'')} · ${escapeHTML(c.dir||'')}</div>
      </div>
      <div class="row">
        <button class="ghost" data-e="use" data-id="${c.id}">Usar</button>
        <button class="ghost" data-e="edit" data-id="${c.id}">Editar</button>
        <button class="ghost" data-e="del" data-id="${c.id}">Borrar</button>
      </div>
    `;
    cont.appendChild(row);
  });
  cont.querySelectorAll('button').forEach(b=>{
    const id=b.dataset.id;
    b.addEventListener('click', ()=>{
      const i=clientes.findIndex(x=>x.id===id); if(i<0) return;
      if(b.dataset.e==='use'){
        const c=clientes[i]; if(!c) return;
        fillClientFields(c); switchTab('factura');
      }else if(b.dataset.e==='edit'){
        const c=clientes[i];
        const nombre=prompt('Nombre',c.nombre||'')??c.nombre;
        const nif=prompt('NIF',c.nif||'')??c.nif;
        const dir=prompt('Dirección',c.dir||'')??c.dir;
        const tel=prompt('Tel',c.tel||'')??c.tel;
        const email=prompt('Email',c.email||'')??c.email;
        clientes[i]={...c,nombre,nif,dir,tel,email}; saveClientes(); renderClientesSelect(); renderClientesLista();
      }else{
        if(confirm('¿Eliminar cliente?')){ clientes.splice(i,1); saveClientes(); renderClientesSelect(); renderClientesLista(); }
      }
    });
  });
}
function fillClientFields(c){
  $('#cliNombre').value=c.nombre||''; $('#cliNif').value=c.nif||''; $('#cliDir').value=c.dir||''; $('#cliTel').value=c.tel||''; $('#cliEmail').value=c.email||'';
}
$('#selCliente')?.addEventListener('change', e=>{
  const id=e.target.value;
  const c = clientes.find(x=>x.id===id);
  if(c) fillClientFields(c);
});
$('#btnAddCliente')?.addEventListener('click', ()=>{
  const nombre=prompt('Nombre cliente'); if(!nombre) return;
  const nif=prompt('NIF'); const dir=prompt('Dirección'); const tel=prompt('Teléfono'); const email=prompt('Email');
  const c = {id:uid(), nombre, nif, dir, tel, email};
  clientes.push(c); saveClientes(); renderClientesSelect(); renderClientesLista();
});
$('#buscarCliente')?.addEventListener('input', renderClientesLista);
$('#btnExportClientes')?.addEventListener('click', ()=>downloadJSON(clientes,'clientes.json'));
$('#btnImportClientes')?.addEventListener('click', ()=>{
  uploadJSON(arr=>{
    if(Array.isArray(arr)){
      clientes=uniqueByName(arr);
      ensureClienteIds();
      saveClientes(); renderClientesSelect(); renderClientesLista();
    }
  });
});

/* ---------- PRODUCTOS UI ---------- */
function saveProductos(){ save(K_PRODUCTOS, productos); }
function populateProductDatalist(){
  const dl=$('#productNamesList'); if(!dl) return;
  dl.innerHTML=''; productos.forEach(p=>{ const o=document.createElement('option'); o.value=p.name; dl.appendChild(o); });
}
function renderProductos(){
  const cont=$('#listaProductos'); if(!cont) return;
  cont.innerHTML='';
  const q=($('#buscarProducto')?.value||'').toLowerCase();
  const arr=[...productos].sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const view=q?arr.filter(p=>(p.name||'').toLowerCase().includes(q)):arr;
  if(view.length===0){ cont.innerHTML='<div class="item">Sin productos.</div>'; return; }
  view.forEach((p,i)=>{
    const row=document.createElement('div'); row.className='item';
    row.innerHTML=`
      <div><strong>${escapeHTML(p.name)}</strong></div>
      <div class="row">
        <button class="ghost" data-e="edit" data-i="${i}">Editar</button>
        <button class="ghost" data-e="del" data-i="${i}">Borrar</button>
      </div>`;
    cont.appendChild(row);
  });
  cont.querySelectorAll('button').forEach(b=>{
    const i=+b.dataset.i;
    b.addEventListener('click', ()=>{
      if(b.dataset.e==='edit'){
        const name=prompt('Nombre producto',productos[i].name||'');
        if(name){ productos[i].name=name; saveProductos(); populateProductDatalist(); renderProductos(); }
      }else{
        if(confirm('¿Eliminar producto?')){ productos.splice(i,1); saveProductos(); populateProductDatalist(); renderProductos(); }
      }
    });
  });
}
$('#btnAddProducto')?.addEventListener('click', ()=>{
  const name=prompt('Nombre producto'); if(!name) return;
  productos.push({name}); saveProductos(); populateProductDatalist(); renderProductos();
});
$('#buscarProducto')?.addEventListener('input', renderProductos);
$('#btnExportProductos')?.addEventListener('click', ()=>downloadJSON(productos,'productos.json'));
$('#btnImportProductos')?.addEventListener('click', ()=>{
  uploadJSON(arr=>{
    if(Array.isArray(arr)){
      productos=arr;
      saveProductos(); populateProductDatalist(); renderProductos();
    }
  });
});

/* ---------- FACTURAS ---------- */
function saveFacturas(){ save(K_FACTURAS, facturas); }

/* ---------- LINEAS FACTURA ---------- */
function addLinea(obj={}){
  const tb=$('#lineasBody'); if(!tb) return;
  const tr=document.createElement('tr');
  tr.innerHTML=`
    <td><input list="productNamesList" class="name" placeholder="Producto" value="${obj.name||''}" /></td>
    <td>
      <select class="mode">
        <option value="kg" ${obj.mode==='kg'?'selected':''}>kg</option>
        <option value="unidad" ${obj.mode==='unidad'?'selected':''}>ud</option>
      </select>
    </td>
    <td><input type="number" class="qty" step="0.01" value="${obj.qty||''}" /></td>
    <td><input type="number" class="gross" step="0.01" value="${obj.gross||''}" /></td>
    <td><input type="number" class="tara" step="0.01" value="${obj.tara||''}" /></td>
    <td class="net"></td>
    <td><input type="number" step="0.01" class="price" value="${obj.price||''}" /></td>
    <td><input class="origin" placeholder="Origen" value="${obj.origin||''}" /></td>
    <td class="import"></td>
    <td><button class="ghost btnDel">✖</button></td>
  `;
  tb.appendChild(tr);
  updateLinea(tr);

  tr.querySelectorAll('input,select').forEach(inp=>{
    inp.addEventListener('input', ()=>updateLinea(tr));
  });
  tr.querySelector('.btnDel').addEventListener('click',()=>{ tr.remove(); recalcTotals(); });
}
function updateLinea(tr){
  const mode=tr.querySelector('.mode')?.value;
  const qty = parseNum(tr.querySelector('.qty')?.value);
  const gross=parseNum(tr.querySelector('.gross')?.value);
  const tara = parseNum(tr.querySelector('.tara')?.value);
  const price=parseNum(tr.querySelector('.price')?.value);
  const net =(mode==='unidad')?qty:(gross-tara);
  tr.querySelector('.net').textContent=net.toFixed(2);
  const importVal = net*price;
  tr.querySelector('.import').textContent = importVal.toFixed(2);
  recalcTotals();
}
$('#btnAddLinea')?.addEventListener('click',()=>addLinea());
$('#btnVaciarLineas')?.addEventListener('click',()=>{ $('#lineasBody').innerHTML=''; recalcTotals(); });

/* ---------- TOTALES FACTURA ---------- */
function recalcTotals(){
  let subtotal=0;
  $$('#lineasBody tr').forEach(tr=>{
    const imp = parseNum(tr.querySelector('.import')?.textContent);
    subtotal += imp;
  });
  $('#subtotal').textContent = money(subtotal);

  const transp = $('#chkTransporte')?.checked ? subtotal*0.10 : 0;
  $('#transp').textContent = money(transp);

  const conIvaIncl = $('#chkIvaIncluido')?.checked;
  const iva = conIvaIncl ? (subtotal+transp)*0.04 : 0;
  $('#iva').textContent = money(iva);

  const total = subtotal + transp + iva;
  $('#total').textContent = money(total);

  const pagado=parseNum($('#pagado')?.value);
  const pendiente = Math.max(0, total-pagado);
  $('#pendiente').textContent = money(pendiente);
}
$('#chkTransporte')?.addEventListener('change', recalcTotals);
$('#chkIvaIncluido')?.addEventListener('change', recalcTotals);
$('#pagado')?.addEventListener('input', recalcTotals);
$('#btnSumarIVA')?.addEventListener('click',()=>{
  const total=unMoney($('#total')?.textContent);
  const iva=total*0.04;
  $('#iva').textContent=money(iva);
  $('#total').textContent=money(total+iva);
  recalcTotals();
});

/* ---------- PAGOS PARCIALES ---------- */
$('#btnAddPago')?.addEventListener('click', ()=>{
  const val=parseNum($('#inpPagoParcial')?.value);
  if(!(val>0)) return;
  const div=document.createElement('div');
  div.className='row small';
  div.innerHTML=`<span>${money(val)}</span> <button class="ghost">✖</button>`;
  $('#listaPagos')?.appendChild(div);
  div.querySelector('button').addEventListener('click',()=>{ div.remove(); recalcTotals(); });
  $('#inpPagoParcial').value='';
});

/* ---------- GUARDAR FACTURA ---------- */
$('#btnGuardar')?.addEventListener('click', ()=>{
  const prov={
    nombre:$('#provNombre').value.trim(),
    nif:$('#provNif').value.trim(),
    dir:$('#provDir').value.trim(),
    tel:$('#provTel').value.trim(),
    email:$('#provEmail').value.trim(),
  };
  const cli={
    nombre:$('#cliNombre').value.trim(),
    nif:$('#cliNif').value.trim(),
    dir:$('#cliDir').value.trim(),
    tel:$('#cliTel').value.trim(),
    email:$('#cliEmail').value.trim(),
  };
  const estado=$('#estado')?.value;
  const metodo=$('#metodoPago')?.value;
  const pagado=parseNum($('#pagado')?.value);
  const subtotal=unMoney($('#subtotal')?.textContent);
  const transp =unMoney($('#transp')?.textContent);
  const iva=unMoney($('#iva')?.textContent);
  const total=unMoney($('#total')?.textContent);
  const lineas=[];
  $$('#lineasBody tr').forEach(tr=>{
    const name=tr.querySelector('.name')?.value.trim();
    const mode=tr.querySelector('.mode')?.value;
    const qty =parseNum(tr.querySelector('.qty')?.value);
    const gross=parseNum(tr.querySelector('.gross')?.value);
    const tara =parseNum(tr.querySelector('.tara')?.value);
    const net  =parseNum(tr.querySelector('.net')?.textContent);
    const price=parseNum(tr.querySelector('.price')?.value);
    const origin=tr.querySelector('.origin')?.value.trim();
    lineas.push({name,mode,qty,gross,tara,net,price,origin});
    if(price>0) pushPriceHistory(name,price);
  });
  const pagos=[];
  $$('#listaPagos .row').forEach(div=>{
    const amt = parseNum(div.querySelector('span')?.textContent);
    pagos.push({date:todayISO(),amount:amt});
  });

  const f={
    id:uid(),
    fecha:todayISO(),
    numero: `FA-${new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,12)}`,
    proveedor:prov,
    cliente:cli,
    estado,
    metodo,
    lineas,
    totals:{subtotal,transp,iva,total,pagado:0,pendiente:total},
    pagos,
    observ:$('#observaciones')?.value.trim()
  };
  pagos.forEach(p=>{ f.totals.pagado+=p.amount; });
  f.totals.pendiente = Math.max(0, total-f.totals.pagado);
  if(f.totals.pendiente<=0) f.estado='pagado';
  else if(f.totals.pagado>0) f.estado='parcial';
  else f.estado='pendiente';

  facturas.push(f); saveFacturas();
  alert('Factura guardada ✔');

  // Reset UI
  $('#lineasBody').innerHTML='';
  $('#subtotal').textContent='0,00 €'; $('#transp').textContent='0,00 €'; $('#iva').textContent='0,00 €'; $('#total').textContent='0,00 €';
  $('#listaPagos').innerHTML=''; $('#pagado').value=''; $('#pendiente').textContent='0,00 €'; $('#observaciones').value='';
  renderFacturas(); renderPendientes(); drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen();
});
$('#btnNueva')?.addEventListener('click',()=>{
  if(confirm('¿Vaciar formulario actual?')){
    $('#lineasBody').innerHTML=''; $('#listaPagos').innerHTML='';
    $('#subtotal').textContent='0,00 €'; $('#transp').textContent='0,00 €'; $('#iva').textContent='0,00 €'; $('#total').textContent='0,00 €';
    $('#cliNombre').value=''; $('#cliNif').value=''; $('#cliDir').value=''; $('#cliTel').value=''; $('#cliEmail').value='';
    $('#observaciones').value='';
  }
});

/* ---------- RENDER FACTURAS LIST ---------- */
function badgeEstado(f){
  const tot=f.totals?.total||0, pag=f.totals?.pagado||0;
  if(pag>=tot) return `<span class="state-badge state-green">Pagada</span>`;
  if(pag>0 && pag<tot) return `<span class="state-badge state-amber">Parcial (${money(pag)} / ${money(tot)})</span>`;
  return `<span class="state-badge state-red">Impagada</span>`;
}
function renderFacturas(){
  const cont=$('#listaFacturas'); if(!cont) return;
  cont.innerHTML='';
  const q=($('#buscaCliente')?.value||'').toLowerCase();
  const fe=$('#filtroEstado')?.value||'todas';
  let arr=facturas.slice();
  if(fe!=='todas') arr=arr.filter(f=>f.estado===fe);
  if(q) arr=arr.filter(f=>(f.cliente?.nombre||'').toLowerCase().includes(q));
  if(arr.length===0){ cont.innerHTML='<div class="item">No hay facturas.</div>'; return; }

  arr.slice(0,400).forEach((f,idx)=>{
    const fecha=new Date(f.fecha).toLocaleString();
    const div=document.createElement('div'); div.className='item';
    div.innerHTML=`
      <div>
        <strong>${escapeHTML(f.numero)}</strong> ${badgeEstado(f)}
        <div class="muted">${fecha} · ${escapeHTML(f.cliente?.nombre||'')}</div>
      </div>
      <div class="row">
        <strong>${money(f.totals.total)}</strong>
        <button class="ghost" data-e="ver" data-i="${idx}">Ver</button>
        <button data-e="cobrar" data-i="${idx}">💶 Cobrar</button>
        <button class="ghost" data-e="parcial" data-i="${idx}">+ Parcial</button>
        <button class="ghost" data-e="pdf" data-i="${idx}">PDF</button>
      </div>`;
    cont.appendChild(div);
  });

  cont.querySelectorAll('button').forEach(b=>{
    const i=+b.dataset.i;
    b.addEventListener('click', ()=>{
      const f=facturas[i]; if(!f) return;
      if(b.dataset.e==='ver'){
        fillPrint(f.lineas,f.totals,null,f); switchTab('factura'); document.getElementById('printArea')?.scrollIntoView({behavior:'smooth'});
      }else if(b.dataset.e==='cobrar'){
        const tot=f.totals.total||0;
        f.totals.pagado=tot; f.totals.pendiente=0; f.estado='pagado';
        (f.pagos??=[]).push({date:todayISO(), amount: tot});
        saveFacturas(); renderFacturas(); renderPendientes(); drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen();
      }else if(b.dataset.e==='parcial'){
        const max=f.totals.total-(f.totals.pagado||0);
        const val=parseNum(prompt(`Importe abonado (pendiente ${money(max)}):`)||0);
        if(val>0){
          f.pagos=f.pagos||[]; f.pagos.push({date:todayISO(), amount:val});
          f.totals.pagado=(f.totals.pagado||0)+val;
          f.totals.pendiente=Math.max(0,(f.totals.total||0)-f.totals.pagado);
          f.estado = f.totals.pendiente>0 ? (f.totals.pagado>0?'parcial':'pendiente') : 'pagado';
          saveFacturas(); renderFacturas(); renderPendientes(); drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen();
        }
      }else if(b.dataset.e==='pdf'){
        fillPrint(f.lineas,f.totals,null,f);
        const dt=new Date(f.fecha);
        const nombreCliente=(f.cliente?.nombre||'Cliente').replace(/\s+/g,'');
        const filename=`Factura-${nombreCliente}-${fmtDateDMY(dt)}.pdf`;
        const opt={ margin:[10,10,10,10], filename, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2,useCORS:true}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} };
        window.html2pdf().set(opt).from(document.getElementById('printArea')).save();
      }
    });
  });
}
$('#filtroEstado')?.addEventListener('input', renderFacturas);
$('#buscaCliente')?.addEventListener('input', renderFacturas);

/* ---------- PENDIENTES ---------- */
function renderPendientes(){
  const tb=$('#tblPendientes tbody'); if(!tb) return;
  tb.innerHTML='';
  const map=new Map(); // cliente -> {count, total, lastDate}
  facturas.forEach(f=>{
    const pend=f.totals?.pendiente||0; if(pend<=0) return;
    const nom=f.cliente?.nombre||'(s/cliente)';
    const cur=map.get(nom)||{count:0,total:0,lastDate:null};
    cur.count++; cur.total+=pend; cur.lastDate = !cur.lastDate || new Date(f.fecha)>new Date(cur.lastDate) ? f.fecha : cur.lastDate;
    map.set(nom,cur);
  });
  let global=0;
  const rows=[...map.entries()].sort((a,b)=>b[1].total-a[1].total);
  rows.forEach(([nom,info])=>{
    global+=info.total;
    const tr=document.createElement('tr');
    const color = info.total>500 ? 'state-red' : info.total>=100 ? 'state-amber' : 'state-green';
    tr.innerHTML=`
      <td>${escapeHTML(nom)}</td>
      <td>${info.count}</td>
      <td><span class="state-badge ${color}">${money(info.total)}</span></td>
      <td>${new Date(info.lastDate).toLocaleString()}</td>
      <td><button class="ghost" data-c="${escapeHTML(nom)}">Ver facturas</button></td>
    `;
    tb.appendChild(tr);
  });
  $('#resGlobal').textContent = money(global);

  tb.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=>{
      const nombre=b.dataset.c;
      $('#buscaCliente').value=nombre;
      switchTab('facturas');
      renderFacturas();
    });
  });
}
/* ---------- VENTAS (KPIs, gráficos, top, por cliente) ---------- */
function sumBetween(d1,d2,filterClient=null){
  let sum=0;
  facturas.forEach(f=>{
    const d=new Date(f.fecha);
    if(d>=d1 && d<d2 && (!filterClient || (f.cliente?.nombre||'')===filterClient)) sum+=(f.totals?.total||0);
  });
  return sum;
}
function startOfDay(d=new Date()){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d=new Date()){ const x=new Date(d); x.setHours(23,59,59,999); return x; }
function startOfWeek(d=new Date()){ const x=new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; }
function startOfMonth(d=new Date()){ return new Date(d.getFullYear(), d.getMonth(), 1); }

function drawKPIs(){
  const now=new Date();
  const hoy = sumBetween(startOfDay(now), endOfDay(now));
  const semana = sumBetween(startOfWeek(now), endOfDay(now));
  const mes = sumBetween(startOfMonth(now), endOfDay(now));
  const total = facturas.reduce((a,f)=>a+(f.totals?.total||0),0);
  $('#vHoy').textContent=money(hoy);
  $('#vSemana').textContent=money(semana);
  $('#vMes').textContent=money(mes);
  $('#vTotal').textContent=money(total);

  // Espejo para Resumen
  $('#rHoy').textContent=money(hoy);
  $('#rSemana').textContent=money(semana);
  $('#rMes').textContent=money(mes);
  $('#rTotal').textContent=money(total);
}

let chart1, chart2, chartTop;
function groupDaily(n=7){
  const now=new Date(); const buckets=[];
  for(let i=n-1;i>=0;i--){ const d=new Date(now); d.setDate(d.getDate()-i); const k=d.toISOString().slice(0,10); buckets.push({k,label:k.slice(5),sum:0}); }
  facturas.forEach(f=>{ const k=f.fecha.slice(0,10); const b=buckets.find(x=>x.k===k); if(b) b.sum+=(f.totals?.total||0); });
  return buckets;
}
function groupMonthly(n=12){
  const now=new Date(); const buckets=[];
  for(let i=n-1;i>=0;i--){ const d=new Date(now); d.setMonth(d.getMonth()-i); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; buckets.push({k,label:k,sum:0}); }
  facturas.forEach(f=>{ const d=new Date(f.fecha); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; const b=buckets.find(x=>x.k===k); if(b) b.sum+=(f.totals?.total||0); });
  return buckets;
}
function drawCharts(){
  if(typeof Chart==='undefined') return;
  const daily=groupDaily(7); const monthly=groupMonthly(12);
  if(chart1) chart1.destroy(); if(chart2) chart2.destroy();
  chart1=new Chart(document.getElementById('chartDiario').getContext('2d'), {
    type:'bar',
    data:{labels:daily.map(d=>d.label), datasets:[{label:'Ventas diarias', data:daily.map(d=>d.sum)}]},
    options:{responsive:true, plugins:{legend:{display:false}}}
  });
  chart2=new Chart(document.getElementById('chartMensual').getContext('2d'), {
    type:'line',
    data:{labels:monthly.map(d=>d.label), datasets:[{label:'Ventas mensuales', data:monthly.map(d=>d.sum)}]},
    options:{responsive:true, plugins:{legend:{display:false}}}
  });
}
function drawTop(){
  if(typeof Chart==='undefined') return;
  const map=new Map(); // name -> total €
  facturas.forEach(f=>{
    (f.lineas||[]).forEach(l=>{
      const amt = (l.mode==='unidad') ? l.qty*l.price : l.net*l.price;
      map.set(l.name,(map.get(l.name)||0)+amt);
    });
  });
  const pairs=[...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
  const labels=pairs.map(p=>p[0]); const data=pairs.map(p=>p[1]);
  if(chartTop) chartTop.destroy();
  chartTop=new Chart(document.getElementById('chartTop').getContext('2d'), {
    type:'bar',
    data:{labels, datasets:[{label:'Top productos (€)', data}]},
    options:{responsive:true, plugins:{legend:{display:false}}}
  });
}

function renderVentasCliente(){
  const tb=$('#tblVentasCliente tbody'); if(!tb) return;
  tb.innerHTML='';
  const now=new Date();
  const sDay=startOfDay(now), eDay=endOfDay(now);
  const sWeek=startOfWeek(now), eWeek=endOfDay(now);
  const sMonth=startOfMonth(now), eMonth=endOfDay(now);

  const byClient=new Map(); // cliente -> {hoy,semana,mes,total}
  facturas.forEach(f=>{
    const nom=f.cliente?.nombre||'(s/cliente)';
    const d=new Date(f.fecha); const tot=f.totals?.total||0;
    const cur=byClient.get(nom)||{hoy:0,semana:0,mes:0,total:0};
    if(d>=sDay && d<=eDay) cur.hoy+=tot;
    if(d>=sWeek&&d<=eWeek) cur.semana+=tot;
    if(d>=sMonth&&d<=eMonth) cur.mes+=tot;
    cur.total+=tot;
    byClient.set(nom,cur);
  });

  [...byClient.entries()].sort((a,b)=>b[1].total-a[1].total).forEach(([nom,v])=>{
    const tr=document.createElement('tr');
    const highlight = v.hoy>0 ? 'state-green' : '';
    tr.innerHTML=`<td>${escapeHTML(nom)}</td><td class="${highlight}">${money(v.hoy)}</td><td>${money(v.semana)}</td><td>${money(v.mes)}</td><td><strong>${money(v.total)}</strong></td>`;
    tb.appendChild(tr);
  });
}

/* ---------- RESPALDO / RESTAURACIÓN / EXPORTS ---------- */
$('#btnBackup')?.addEventListener('click', ()=>{
  const payload={clientes, productos, facturas, priceHist, fecha: todayISO(), version:'ARSLAN PRO V10.4'};
  const filename=`backup-${fmtDateDMY(new Date())}.json`;
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});
$('#btnRestore')?.addEventListener('click', ()=>{
  const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
  inp.onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    const reader=new FileReader(); reader.onload=()=>{
      try{
        const obj=JSON.parse(reader.result);
        if(obj.clientes){ clientes=obj.clientes; ensureClienteIds(); }
        if(obj.productos) productos=obj.productos;
        if(obj.facturas) facturas=obj.facturas;
        if(obj.priceHist) priceHist=obj.priceHist;
        save(K_CLIENTES,clientes); save(K_PRODUCTOS,productos); save(K_FACTURAS,facturas); save(K_PRICEHIST,priceHist);
        renderAll(); alert('Copia restaurada ✔️');
      }catch{ alert('JSON inválido'); }
    }; reader.readAsText(f);
  };
  inp.click();
});
$('#btnExportClientes')?.addEventListener('click', ()=>downloadJSON(clientes,'clientes-arslan-v104.json'));
$('#btnImportClientes')?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ clientes=arr; ensureClienteIds(); save(K_CLIENTES,clientes); renderClientesSelect(); renderClientesLista(); } }));
$('#btnExportProductos')?.addEventListener('click', ()=>downloadJSON(productos,'productos-arslan-v104.json'));
$('#btnImportProductos')?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ productos=arr; save(K_PRODUCTOS,productos); populateProductDatalist(); renderProductos(); } }));
$('#btnExportFacturas')?.addEventListener('click', ()=>downloadJSON(facturas,'facturas-arslan-v104.json'));
$('#btnImportFacturas')?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ facturas=arr; save(K_FACTURAS,facturas); renderFacturas(); renderPendientes(); drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen(); } }));
$('#btnExportVentas')?.addEventListener('click', exportVentasCSV);

function downloadJSON(obj, filename){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function uploadJSON(cb){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
  inp.onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ cb(JSON.parse(r.result)); }catch{ alert('JSON inválido'); } }; r.readAsText(f); };
  inp.click();
}
function exportVentasCSV(){
  const rows=[['Cliente','Fecha','Nº','Total','Pagado','Pendiente','Estado']];
  facturas.forEach(f=>{
    rows.push([f.cliente?.nombre||'', new Date(f.fecha).toLocaleString(), f.numero, (f.totals?.total||0), (f.totals?.pagado||0), (f.totals?.pendiente||0), f.estado]);
  });
  const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='ventas.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/* ---------- EVENTOS GENERALES ---------- */
$('#btnAddLinea')?.addEventListener('click', addLinea);
$('#btnVaciarLineas')?.addEventListener('click', ()=>{ if(confirm('¿Vaciar líneas?')){ const tb=$('#lineasBody'); tb.innerHTML=''; for(let i=0;i<5;i++) addLinea(); recalcTotals(); }});
$('#btnNuevoCliente')?.addEventListener('click', ()=>switchTab('clientes'));
$('#selCliente')?.addEventListener('change', ()=>{
  const id=$('#selCliente').value; if(!id) return; const c=clientes.find(x=>x.id===id); if(!c) return;
  fillClientFields(c);
});
/* ---------- IMPRESIÓN / PDF ---------- */
function fillPrint(lines, totals, _tmp=null, f=null){
  // Nº y fecha
  $('#p-num').textContent = f?.numero || '(Sin guardar)';
  $('#p-fecha').textContent = (f?new Date(f.fecha):new Date()).toLocaleString();

  // Proveedor
  $('#p-prov').innerHTML = `
    <div><strong>${escapeHTML(f?.proveedor?.nombre || $('#provNombre').value || '')}</strong></div>
    <div>${escapeHTML(f?.proveedor?.nif || $('#provNif').value || '')}</div>
    <div>${escapeHTML(f?.proveedor?.dir || $('#provDir').value || '')}</div>
    <div>${escapeHTML(f?.proveedor?.tel || $('#provTel').value || '')} · ${escapeHTML(f?.proveedor?.email || $('#provEmail').value || '')}</div>
  `;

  // Cliente
  $('#p-cli').innerHTML = `
    <div><strong>${escapeHTML(f?.cliente?.nombre || $('#cliNombre').value || '')}</strong></div>
    <div>${escapeHTML(f?.cliente?.nif || $('#cliNif').value || '')}</div>
    <div>${escapeHTML(f?.cliente?.dir || $('#cliDir').value || '')}</div>
    <div>${escapeHTML(f?.cliente?.tel || $('#cliTel').value || '')} · ${escapeHTML(f?.cliente?.email || $('#cliEmail').value || '')}</div>
  `;

  // Tabla
  const tbody=$('#p-tabla tbody'); tbody.innerHTML='';
  (lines||[]).forEach(l=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${escapeHTML(l.name||'')}</td>
      <td>${escapeHTML(l.mode||'')}</td>
      <td>${l.qty??''}</td>
      <td>${(l.gross??'')!==''?Number(l.gross).toFixed(2):''}</td>
      <td>${(l.tara??'')!==''?Number(l.tara).toFixed(2):''}</td>
      <td>${(l.net??'')!==''?Number(l.net).toFixed(2):''}</td>
      <td>${money(l.price||0)}</td>
      <td>${escapeHTML(l.origin||'')}</td>
      <td>${money((l.mode==='unidad') ? (l.qty||0)*(l.price||0) : (l.net||0)*(l.price||0))}</td>
    `;
    tbody.appendChild(tr);
  });

  // Totales
  $('#p-sub').textContent = money(totals?.subtotal||0);
  $('#p-tra').textContent = money(totals?.transp||0);
  $('#p-iva').textContent = money(totals?.iva||0);
  $('#p-tot').textContent = money(totals?.total||0);

  // Estado y método
  $('#p-estado').textContent = f?.estado || $('#estado')?.value || 'Impagada';
  $('#p-metodo').textContent = f?.metodo || $('#metodoPago')?.value || 'Efectivo';

  // Observaciones
  $('#p-obs').textContent = f?.observ || ($('#observaciones')?.value || '—');

  // Pie
  const foot=$('#pdf-foot-note');
  if(foot){
    const conIncl = $('#chkIvaIncluido')?.checked;
    foot.textContent = conIncl ? 'IVA incluido en los precios.' : 'IVA (4%) mostrado como informativo. Transporte 10% opcional.';
  }

  // QR
  try{
    const canvas=$('#p-qr');
    const numero = f?.numero || '(Sin guardar)';
    const cliente = f?.cliente?.nombre || $('#cliNombre').value || '';
    const payload = `ARSLAN-Factura|${numero}|${cliente}|${money(totals?.total||0)}|${$('#p-estado').textContent}`;
    window.QRCode.toCanvas(canvas, payload, {width:92, margin:0});
  }catch(e){}
}

$('#btnImprimir')?.addEventListener('click', ()=>{
  // Asegurar totales actualizados
  recalcTotals();

  // Rellenar vista previa con lo actual del formulario (sin guardar)
  const subtotal=unMoney($('#subtotal').textContent);
  const transp  =unMoney($('#transp').textContent);
  const iva     =unMoney($('#iva').textContent);
  const total   =unMoney($('#total').textContent);

  const lineas=[];
  $$('#lineasBody tr').forEach(tr=>{
    const name=tr.querySelector('.name')?.value.trim();
    const mode=tr.querySelector('.mode')?.value;
    const qty =parseNum(tr.querySelector('.qty')?.value);
    const gross=parseNum(tr.querySelector('.gross')?.value);
    const tara =parseNum(tr.querySelector('.tara')?.value);
    const net  =parseNum(tr.querySelector('.net')?.textContent);
    const price=parseNum(tr.querySelector('.price')?.value);
    const origin=tr.querySelector('.origin')?.value.trim();
    lineas.push({name,mode,qty,gross,tara,net,price,origin});
  });

  fillPrint(lineas, {subtotal,transp,iva,total}, null, null);

  const d=new Date(); const file=`Factura-${($('#cliNombre').value||'Cliente').replace(/\s+/g,'')}-${fmtDateDMY(d)}.pdf`;
  const opt = {
    margin:[10,10,10,10],
    filename:file,
    image:{type:'jpeg',quality:0.98},
    html2canvas:{scale:2,useCORS:true},
    jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}
  };
  window.html2pdf().set(opt).from(document.getElementById('printArea')).save();
});

/* ---------- RESUMEN espejo ---------- */
function drawResumen(){ drawKPIs(); }

/* ---------- RENDER TODO ---------- */
function renderAll(){
  renderClientesSelect(); renderClientesLista();
  populateProductDatalist(); renderProductos(); renderFacturas(); renderPendientes();
  drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen();
}

/* ---------- SEMILLA + BOOT ---------- */
(function boot(){
  seedClientesIfEmpty();
  ensureClienteIds();
  seedProductsIfEmpty();
  setProviderDefaultsIfEmpty();

  const tb=$('#lineasBody');
  if(tb && tb.children.length===0){
    for(let i=0;i<5;i++) addLinea();
  }
  renderAll();
  recalcTotals();
})();
/* ===========================================================
   ☁️ SUPABASE SYNC LITE (append-only, tolerante a errores)
   - No modifica nada del flujo anterior.
   - Sincroniza CLIENTES y PRODUCTOS de forma bidireccional simple.
   - Intenta subir RESÚMENES básicos (KPI) si existe la tabla.
   - Ignora errores de RLS o tablas inexistentes (logs en consola).
   =========================================================== */

async function supaSafeSelect(table) {
  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn(`⚠️ Supabase select falló en ${table}:`, e.message || e);
    return [];
  }
}

async function supaSafeInsert(table, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  try {
    const { error } = await supabase.from(table).insert(rows);
    if (error) throw error;
  } catch (e) {
    console.warn(`⚠️ Supabase insert falló en ${table}:`, e.message || e);
  }
}

async function supaSafeUpsert(table, rows, onConflictCols) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  try {
    const { error } = await supabase.from(table).upsert(rows, onConflictCols ? { onConflict: onConflictCols } : {});
    if (error) throw error;
  } catch (e) {
    console.warn(`⚠️ Supabase upsert falló en ${table}:`, e.message || e);
  }
}

/* ---- CLIENTES: merge por id o nombre ---- */
async function syncClientesLite() {
  const cloud = await supaSafeSelect('clientes');
  if (!Array.isArray(clientes)) clientes = [];
  let merged = [...clientes];
  ...
}




  // Merge de nube -> local
  for (const r of cloud) {
    const id = r.id || null;
    const nombre = (r.nombre || '').trim();
    const matchById   = id ? merged.find(x => x.id === id) : null;
    const matchByName = !matchById && nombre ? merged.find(x => (x.nombre||'').trim().toLowerCase() === nombre.toLowerCase()) : null;

    if (!matchById && !matchByName) {
      merged.push({
        id: id || uid(),
        nombre,
        nif: r.nif || '',
        dir: r.direccion || r.dir || '',
        tel: r.telefono || r.tel || '',
        email: r.email || ''
      });
    }
  }

  // Local -> nube (solo los que no existan por id o nombre)
  const toUpload = [];
  for (const c of clientes) {
    const exists = cloud.some(r =>
      (r.id && c.id && r.id === c.id) ||
      ((r.nombre || '').trim().toLowerCase() === (c.nombre || '').trim().toLowerCase())
    );
    if (!exists) {
      toUpload.push({
        id: c.id,
        nombre: c.nombre || '',
        direccion: c.dir || '',
        nif: c.nif || '',
        telefono: c.tel || '',
        email: c.email || ''
      });
    }
  }

  if (toUpload.length) await supaSafeInsert('clientes', toUpload);

  // Guarda el merge local y refresca UI si cambió algo
  const changed = JSON.stringify(merged) !== JSON.stringify(clientes);
  if (changed) {
    clientes = merged;
    save(K_CLIENTES, clientes);
    renderClientesSelect(); renderClientesLista();
  }
}

/* ---- PRODUCTOS: merge por name ---- */
async function syncProductosLite() {
  const cloud = await supaSafeSelect('productos');
  if (!Array.isArray(productos)) productos = [];
  let merged = [...productos];

  for (const r of cloud) {
    const name = (r.name || '').trim();
    if (!name) continue;
    const exists = merged.some(p => (p.name || '').trim().toLowerCase() === name.toLowerCase());
    if (!exists) {
      merged.push({
        name,
        mode: r.mode || null,
        boxkg: r.boxkg ?? null,
        price: r.price ?? null,
        origin: r.origin || null
      });
    }
  }

  const toUpload = [];
  for (const p of productos) {
    const exists = cloud.some(r => (r.name || '').trim().toLowerCase() === (p.name || '').trim().toLowerCase());
    if (!exists) {
      toUpload.push({
        name: p.name || '',
        mode: p.mode || null,
        boxkg: p.boxkg ?? null,
        price: p.price ?? null,
        origin: p.origin || null
      });
    }
  }

  if (toUpload.length) await supaSafeInsert('productos', toUpload);

  const changed = JSON.stringify(merged) !== JSON.stringify(productos);
  if (changed) {
    productos = merged;
    save(K_PRODUCTOS, productos);
    populateProductDatalist(); renderProductos();
  }
}

/* ---- RESÚMENES KPI: upsert si existe tabla 'resumenes' ---- */
async function syncResumenesLite() {
  try {
    const total_clientes = Array.isArray(clientes) ? clientes.length : 0;
    const total_facturas = Array.isArray(facturas) ? facturas.length : 0;
    const ventas_totales = Array.isArray(facturas) ? facturas.reduce((a,f)=>a+(f.totals?.total||0),0) : 0;
    const pendientes = Array.isArray(facturas) ? facturas.filter(f=>f.estado!=='pagado').length : 0;

    await supaSafeUpsert('resumenes', [{
      fecha_sync: new Date().toISOString(),
      total_clientes,
      total_facturas,
      ventas_totales,
      pendientes
    }], ['fecha_sync']);
  } catch (e) {
    console.warn('⚠️ No se pudo subir resumenes:', e.message || e);
  }
}

/* ---- Sincronización orquestada ---- */
async function supaSyncLite() {
  if (!navigator.onLine) {
    console.log('📴 Offline — Supabase Sync Lite se aplaza.');
    return;
  }
  console.log('☁️ Supabase Sync Lite — iniciando…');
  await syncClientesLite();
  await syncProductosLite();
  await syncResumenesLite();
  console.log('✅ Supabase Sync Lite — completada.');
}

/* Ejecuta al cargar si hay conexión y reintenta al reconectar */
if (navigator.onLine) { supaSyncLite(); }
window.addEventListener('online', supaSyncLite);

/* ===========================================================
   🔚 FIN DEL MÓDULO PRINCIPAL
   =========================================================== */
})(); // ← Cierre del IIFE abierto al inicio
