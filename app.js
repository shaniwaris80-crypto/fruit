/* ============================================================
   🥝 ARSLAN PRO V10.4 — KIWI Edition
   app.js — Build estable (Supabase CDN, no ES Modules)
   - Conexión global Supabase (window.supabase)
   - Sync universal (clientes, productos, facturas) + Realtime
   - IVA 4% informativo + botón "Añadir 4%" (aplica al total)
   - Transporte 10% opcional
   - PDF + QR estables
   - Historial de precios (últimos 10)
   - KPIs / Charts / CSV / Backup & Restore
   ============================================================ */

(() => {
  "use strict";

  // Evita ejecutar dos veces si el archivo se carga por duplicado
  if (window.__ARSLAN_V104_BOOTED__) {
    console.warn("ARSLAN PRO ya estaba iniciado. Previniendo doble arranque.");
    return;
  }
  window.__ARSLAN_V104_BOOTED__ = true;

  /* ============ SUPABASE (global) ============ */
  const SUPABASE_URL = "https://fjfbokkcdbmralwzsest.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZmJva2tjZGJtcmFsd3pzZXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MjYzMjcsImV4cCI6MjA3NzQwMjMyN30.sX3U2V9GKtcS5eWApVJy0doQOeTW2MZrLHqndgfyAUU";

  if (!window.supabase || !window.supabase.createClient) {
    console.warn("Supabase CDN no cargado aún. app.js seguirá funcionando offline.");
  }
  const sb = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

  /* ============ HELPERS GENERALES ============ */
  const $  = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const money = n => (isNaN(n) ? 0 : n).toFixed(2).replace(".", ",") + " €";
  const parseNum = v => { const n = parseFloat(String(v).replace(",", ".")); return isNaN(n) ? 0 : n; };
  const todayISO = () => new Date().toISOString();
  const fmtDateDMY = d => `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
  const escapeHTML = s => String(s||"").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
  const uid = () => 'c' + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
  const unMoney = s => parseFloat(String(s).replace(/\./g,"").replace(",",".").replace(/[^\d.]/g,"")) || 0;

  // LocalStorage safe helpers
  function loadLS(k, fallback) {
    try { const v = JSON.parse(localStorage.getItem(k) || ""); return v ?? fallback; } catch { return fallback; }
  }
  function saveLS(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

  function normalizeObjectKeys(obj) {
    if (!obj || typeof obj !== "object") return obj;
    const clean = {};
    for (const [k, v] of Object.entries(obj)) clean[String(k).toLowerCase()] = v;
    return clean;
  }
  const safeJSON = data => { try { return JSON.parse(JSON.stringify(data)); } catch { return []; } };
  const sameId = (a,b) => a && b && a.id && b.id && a.id === b.id;

  /* ============ KEYS LS ============ */
  const K_CLIENTES  = "arslan_v104_clientes";
  const K_PRODUCTOS = "arslan_v104_productos";
  const K_FACTURAS  = "arslan_v104_facturas";
  const K_PRICEHIST = "arslan_v104_pricehist";

  /* ============ ESTADO ============ */
  let clientes  = loadLS(K_CLIENTES, []);
  let productos = loadLS(K_PRODUCTOS, []);
  let facturas  = loadLS(K_FACTURAS, []);
  let priceHist = loadLS(K_PRICEHIST, {}); // { [name]: [{price, date}] }

  // Pagos temporales en la UI de factura
  let pagosTemp = [];

  /* ============ TABS ============ */
  function switchTab(id) {
    $$("button.tab").forEach(b => b.classList.toggle("active", b.dataset.tab===id));
    $$("section.panel").forEach(p => p.classList.toggle("active", p.dataset.tabPanel===id));
    if (id==="ventas")   { drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); }
    if (id==="pendientes") renderPendientes();
    if (id==="resumen")    drawResumen();
  }
  $$("button.tab").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));

  /* ============ SEED DATA (1ª vez) ============ */
  function ensureClienteIds() { clientes.forEach(c => { if(!c.id) c.id = uid(); }); }
  function uniqueByName(arr) {
    const map = new Map();
    arr.forEach(c => { const k=(c.nombre||"").trim().toLowerCase(); if(k && !map.has(k)) map.set(k,c); });
    return [...map.values()];
  }
  function seedClientesIfEmpty() {
    if (clientes.length) { ensureClienteIds(); return; }
    clientes = uniqueByName([
      {id:uid(), nombre:"Riviera — CONOR ESY SLU", nif:"B16794893", dir:"Paseo del Espolón, 09003 Burgos"},
      {id:uid(), nombre:"Alesal Pan / Café de Calle San Lesmes — Alesal Pan y Café S.L.", nif:"B09582420", dir:"C/ San Lesmes 1, Burgos"},
      {id:uid(), nombre:"Al Pan Pan Burgos, S.L.", nif:"B09569344", dir:"C/ Miranda 17, Bajo, 09002 Burgos", tel:"947 277 977", email:"bertiz.miranda@gmail.com"},
      {id:uid(), nombre:"Cuevas Palacios Restauración S.L. (Con/sentidos)", nif:"B10694792", dir:"C/ San Lesmes, 1 – 09004 Burgos", tel:"947 20 35 51"},
      {id:uid(), nombre:"Café Bar Nuovo (Einy Mercedes Olivo Jiménez)", nif:"120221393", dir:"C/ San Juan de Ortega 14, 09007 Burgos"},
      {id:uid(), nombre:"Golden Garden — David Herrera Estalayo", nif:"71281665L", dir:"Trinidad, 12, 09003 Burgos"},
      {id:uid(), nombre:"Abbas — Locutorio Gamonal", dir:"C/ Derechos Humanos 45, Burgos"},
      {id:uid(), nombre:"Nadeem Bhai — RIA Locutorio", dir:"C/ Vitoria 137, Burgos"},
      {id:uid(), nombre:"Adnan Asif", nif:"X7128589S", dir:"C/ Padre Flórez 3, Burgos"},
      {id:uid(), nombre:"Domingo"}
    ]);
    saveLS(K_CLIENTES, clientes);
  }

  const PRODUCT_NAMES = [
    "GRANNY FRANCIA","MANZANA PINK LADY","MANDARINA COLOMBE","KIWI ZESPRI GOLD","PARAGUAYO","KIWI TOMASIN PLANCHA","PERA RINCON DEL SOTO",
    "MELOCOTON PRIMERA","AGUACATE GRANEL","MARACUYÁ","MANZANA GOLDEN 24","PLATANO CANARIO PRIMERA","MANDARINA HOJA","MANZANA GOLDEN 20",
    "NARANJA TOMASIN","NECTARINA","SANDIA","LIMON SEGUNDA","MANZANA FUJI","NARANJA MESA SONRISA","JENGIBRE","BATATA","AJO PRIMERA","CEBOLLA NORMAL",
    "CALABAZA GRANDE","PATATA LAVADA","TOMATE CHERRY RAMA","TOMATE DANIELA","TOMATE ROSA PRIMERA","CEBOLLINO","TOMATE RAMA","PIMIENTO PADRON",
    "ZANAHORIA","PEPINO","CEBOLLETA","PUERROS","BROCOLI","JUDIA VERDE","BERENJENA","PIMIENTO ITALIANO VERDE","PIMIENTO ITALIANO ROJO","CHAMPIÑON",
    "UVA ROJA","UVA BLANCA","ALCACHOFA","CALABACIN","COLIFLOR","BATAVIA","ICEBERG","MANDARINA SEGUNDA","NARANJA ZUMO","KIWI SEGUNDA","PLATANO CANARIO SUELTO",
    "FRESAS","ARANDANOS","ESPINACA","PEREJIL","CILANTRO","PIMIENTO VERDE","PIMIENTO ROJO","YUCA","CEBOLLA ROJA","HABANERO","POMELO","PAPAYA","TOMATE PERA",
    "TOMATE BOLA","TOMATE PINK","VALVENOSTA GOLDEN","MELON GALIA","APIO","MANGO","MELOCOTON AMARILLO","PIÑA","PERA CONFERENCIA SEGUNDA","CEBOLLA DULCE",
    "ESPARRAGOS TRIGUEROS","AGUACATE PRIMERA","COCO","GUINDILLA","PATATA 25KG","REPOLLO","KIWI ZESPRI","MELON","TOMATE ROSA","ALOE VERA PIEZAS","LIMA",
    "GUINEO VERDE","SETAS","BONIATO","PERA AGUA","YAUTIA","YAME","OKRA","MANZANA MELASSI","SANDIA NEGRA","SANDIA RAYADA","KUMATO","KIWI CHILE","REMOLACHA",
    "LECHUGA ROMANA","KAKI","PERA LIMONERA","UVA ALVILLO","PITAHAYA ROJA","GRANADA","CHIRIMOYA","PIMIENTO CALIFORNIA VERDE","PIMIENTO CALIFORNIA ROJO",
    "CASTAÑA","MANDARINA PRIMERA","UVA ROJA PRIMERA","UVA BLANCA PRIMERA"
  ];
  function seedProductsIfEmpty() {
    if (productos.length) return;
    productos = PRODUCT_NAMES.map(n => ({ name:n }));
    saveLS(K_PRODUCTOS, productos);
  }

 function setProviderDefaultsIfEmpty(){
  const n = $("#provNombre"), i = $("#provNif"), d = $("#provDir"), t = $("#provTel"), e = $("#provEmail");
  if (n && !n.value) n.value = "Mohammad Arslan Waris";
  if (i && !i.value) i.value = "X6389988J";
  if (d && !d.value) d.value = "Calle San Pablo 17, 09003 Burgos";
  if (t && !t.value) t.value = "631 667 893";
  if (e && !e.value) e.value = "shaniwaris80@gmail.com";
}


  /* ============ HISTORIAL DE PRECIOS ============ */
  function lastPrice(name) { const arr = priceHist[name]; return arr?.length ? arr[0].price : null; }
  function pushPriceHistory(name, price) {
    if (!name || !(price>0)) return;
    const arr = priceHist[name] || [];
    arr.unshift({ price, date: todayISO() });
    priceHist[name] = arr.slice(0,10);
    saveLS(K_PRICEHIST, priceHist);
  }
  function renderPriceHistory(name) {
    const panel = $("#pricePanel"), body = $("#ppBody");
    if (!panel || !body) return;
    panel.removeAttribute("hidden");
    const hist = priceHist[name] || [];
    if (hist.length === 0) {
      body.innerHTML = `<div class="pp-row"><span>${escapeHTML(name)}</span><strong>Sin datos</strong></div>`;
      hidePanelSoon(); return;
    }
    body.innerHTML = `<div class="pp-row" style="justify-content:center"><strong>${escapeHTML(name)}</strong></div>` +
      hist.map(h => `<div class="pp-row"><span>${fmtDateDMY(new Date(h.date))}</span><strong>${money(h.price)}</strong></div>`).join("");
    hidePanelSoon();
  }
  function hidePanelSoon() {
    clearTimeout(hidePanelSoon.t);
    hidePanelSoon.t = setTimeout(() => $("#pricePanel")?.setAttribute("hidden",""), 4800);
  }

  /* ============ CLIENTES UI ============ */
  function renderClientesSelect(){
    const sel = $("#selCliente"); if (!sel) return;
    sel.innerHTML = `<option value="">— Seleccionar cliente —</option>`;
    const arr = [...clientes].sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||""));
    arr.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id; opt.textContent = c.nombre || "(Sin nombre)";
      sel.appendChild(opt);
    });
  }
  function fillClientFields(c){
    $("#cliNombre").value = c.nombre || "";
    $("#cliNif").value    = c.nif    || "";
    $("#cliDir").value    = c.dir    || "";
    $("#cliTel").value    = c.tel    || "";
    $("#cliEmail").value  = c.email  || "";
  }
  function renderClientesLista(){
    const cont = $("#listaClientes"); if (!cont) return;
    cont.innerHTML = "";
    const q = ($("#buscarCliente")?.value||"").toLowerCase();
    const arr = [...clientes].sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||""));
    const view = q ? arr.filter(c =>
      (c.nombre||"").toLowerCase().includes(q) ||
      (c.nif||"").toLowerCase().includes(q) ||
      (c.dir||"").toLowerCase().includes(q)) : arr;

    if (view.length===0) { cont.innerHTML = '<div class="item">Sin clientes.</div>'; return; }

    view.forEach(c => {
      const row = document.createElement("div"); row.className = "item";
      row.innerHTML = `
        <div>
          <strong>${escapeHTML(c.nombre||"(Sin nombre)")}</strong>
          <div class="muted">${escapeHTML(c.nif||"")} · ${escapeHTML(c.dir||"")}</div>
        </div>
        <div class="row">
          <button class="ghost" data-e="use"  data-id="${c.id}">Usar</button>
          <button class="ghost" data-e="edit" data-id="${c.id}">Editar</button>
          <button class="ghost" data-e="del"  data-id="${c.id}">Borrar</button>
        </div>`;
      cont.appendChild(row);
    });

    cont.querySelectorAll("button").forEach(b => {
      const id = b.dataset.id;
      b.addEventListener("click", async () => {
        const i = clientes.findIndex(x => x.id === id); if (i<0) return;
        if (b.dataset.e === "use") {
          const c = clientes[i]; if (!c) return; fillClientFields(c); switchTab("factura");
        } else if (b.dataset.e === "edit") {
          const c = clientes[i];
          const nombre = prompt("Nombre", c.nombre||"") ?? c.nombre;
          const nif    = prompt("NIF", c.nif||"") ?? c.nif;
          const dir    = prompt("Dirección", c.dir||"") ?? c.dir;
          const tel    = prompt("Tel", c.tel||"") ?? c.tel;
          const email  = prompt("Email", c.email||"") ?? c.email;
          clientes[i] = { ...c, nombre, nif, dir, tel, email };
          saveLS(K_CLIENTES, clientes); renderClientesSelect(); renderClientesLista();
          // subida best-effort
          if (sb) {
            try {
              await sb.from("clientes").upsert([{ id: clientes[i].id, nombre, direccion: dir, nif, telefono: tel, email }]);
            } catch(e){ console.warn("Supabase upsert cliente:", e.message); }
          }
        } else if (b.dataset.e === "del") {
          if (confirm("¿Eliminar cliente?")) {
            const del = clientes.splice(i,1)[0];
            saveLS(K_CLIENTES, clientes); renderClientesSelect(); renderClientesLista();
            if (sb && del?.id) {
              try { await sb.from("clientes").delete().eq("id", del.id); } catch(e){ console.warn("Supabase delete cliente:", e.message); }
            }
          }
        }
      });
    });
  }

  /* ============ PRODUCTOS UI ============ */
  function populateProductDatalist(){
    const dl = $("#productNamesList"); if (!dl) return;
    dl.innerHTML = "";
    productos.forEach(p => { const o=document.createElement("option"); o.value=p.name; dl.appendChild(o); });
  }
  function renderProductos(){
    const cont = $("#listaProductos"); if (!cont) return;
    cont.innerHTML = "";
    const q = ($("#buscarProducto")?.value||"").toLowerCase();
    const view = q ? productos.filter(p => (p.name||"").toLowerCase().includes(q)) : productos;
    if (view.length===0) { cont.innerHTML='<div class="item">Sin resultados.</div>'; return; }

    view.forEach((p, idx) => {
      const row = document.createElement("div"); row.className="product-row";
      row.innerHTML = `
        <input value="${escapeHTML(p.name||"")}" data-f="name" />
        <select data-f="mode">
          <option value="">—</option>
          <option value="kg"${p.mode==='kg'?' selected':''}>kg</option>
          <option value="unidad"${p.mode==='unidad'?' selected':''}>unidad</option>
          <option value="caja"${p.mode==='caja'?' selected':''}>caja</option>
        </select>
        <input type="number" step="0.01" data-f="boxkg" placeholder="Kg/caja" value="${p.boxkg??""}" />
        <input type="number" step="0.01" data-f="price" placeholder="€ base" value="${p.price??""}" />
        <input data-f="origin" placeholder="Origen" value="${escapeHTML(p.origin||"")}" />
        <button data-e="save" data-i="${idx}">💾 Guardar</button>
        <button class="ghost" data-e="del" data-i="${idx}">✖</button>
      `;
      cont.appendChild(row);
    });

    cont.querySelectorAll("button").forEach(b => {
      const i = +b.dataset.i;
      b.addEventListener("click", async () => {
        if (b.dataset.e === "del") {
          if (confirm("¿Eliminar producto?")) {
            const del = productos.splice(i,1)[0];
            saveLS(K_PRODUCTOS, productos); populateProductDatalist(); renderProductos();
            if (sb && del?.id) { try { await sb.from("productos").delete().eq("id", del.id); } catch(e){ console.warn("Supabase delete producto:", e.message); } }
          }
        } else {
          const row = b.closest(".product-row");
          const get = f => row.querySelector(`[data-f="${f}"]`).value.trim();
          const name = get("name");
          const mode = (get("mode") || null);
          const boxkgStr = get("boxkg");
          const boxkg = boxkgStr==="" ? null : parseNum(boxkgStr);
          const priceStr = get("price");
          const price = priceStr==="" ? null : parseNum(priceStr);
          const origin = get("origin") || null;
          productos[i] = { ...(productos[i]||{}), name, mode, boxkg, price, origin };
          saveLS(K_PRODUCTOS, productos); populateProductDatalist(); renderProductos();

          if (sb) {
            try {
              await sb.from("productos").upsert([{
                id: productos[i].id || uid(),
                name, mode, boxkg, price, origin
              }]);
            } catch(e){ console.warn("Supabase upsert producto:", e.message); }
          }
        }
      });
    });
  }
  $("#buscarProducto")?.addEventListener("input", renderProductos);

  /* ============ FACTURA: LÍNEAS ============ */
  function findProducto(name){ return productos.find(p => (p.name||"").toLowerCase() === String(name).toLowerCase()); }

  function addLinea(){
    const tb = $("#lineasBody"); if (!tb) return;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input class="name" list="productNamesList" placeholder="Producto (↓ para ver lista)" /></td>
      <td>
        <select class="mode">
          <option value="">—</option>
          <option value="kg">kg</option>
          <option value="unidad">unidad</option>
          <option value="caja">caja</option>
        </select>
      </td>
      <td><input class="qty" type="number" step="1"  placeholder="Cant." /></td>
      <td><input class="gross" type="number" step="0.01" placeholder="Bruto" /></td>
      <td><input class="tare"  type="number" step="0.01" placeholder="Tara" /></td>
      <td><input class="net"   type="number" step="0.01" placeholder="Neto" disabled /></td>
      <td><input class="price" type="number" step="0.01" placeholder="Precio" /></td>
      <td><input class="origin" placeholder="Origen (opcional)" /></td>
      <td><input class="amount" placeholder="Importe" disabled /></td>
      <td><button class="del">✕</button></td>
    `;
    tb.appendChild(tr);

    const name   = tr.querySelector(".name");
    const mode   = tr.querySelector(".mode");
    const qty    = tr.querySelector(".qty");
    const gross  = tr.querySelector(".gross");
    const tare   = tr.querySelector(".tare");
    const net    = tr.querySelector(".net");
    const price  = tr.querySelector(".price");
    const origin = tr.querySelector(".origin");
    const amount = tr.querySelector(".amount");

    const showHist = () => { const n = name.value.trim(); if (n) renderPriceHistory(n); };
    name.addEventListener("focus", showHist);
    price.addEventListener("focus", showHist);

    name.addEventListener("change", ()=>{
      const p = findProducto(name.value.trim());
      if (p) {
        if (p.mode)   mode.value  = p.mode;
        if (p.price!=null) price.value = p.price;
        if (p.origin) origin.value = p.origin;
        const lp = lastPrice(p.name); if (lp!=null && !p.price) price.value = lp;
        renderPriceHistory(p.name);
      }
      recalcLine();
    });

    [mode, qty, gross, tare, price].forEach(i => i.addEventListener("input", recalcLine));
    tr.querySelector(".del").addEventListener("click", () => { tr.remove(); recalc(); });

    function recalcLine() {
      const m = (mode.value||"").toLowerCase();
      const q = Math.max(0, Math.floor(parseNum(qty.value||0)));
      const g = Math.max(0, parseNum(gross.value||0));
      const t = Math.max(0, parseNum(tare.value||0));
      const pr= Math.max(0, parseNum(price.value||0));
      let n = 0;

      if (g>0 || t>0) { n = Math.max(0, g - t); }
      else if (m === "caja") { const p=findProducto(name.value); const kg=p?.boxkg||0; n = q*kg; }
      else if (m === "kg" || m === "unidad") { n = q; }

      net.value = n ? n.toFixed(2) : "";
      const amt = (m==="unidad") ? q*pr : n*pr;
      amount.value = amt>0 ? amt.toFixed(2) : "";
      recalc();
    }
  }

  function captureLineas(){
    return $$("#lineasBody tr").map(r => {
      const name = r.querySelector(".name").value.trim();
      const mode = r.querySelector(".mode").value.trim().toLowerCase();
      const qty  = Math.max(0, Math.floor(parseNum(r.querySelector(".qty").value||0)));
      const gross= Math.max(0, parseNum(r.querySelector(".gross").value||0));
      const tare = Math.max(0, parseNum(r.querySelector(".tare").value||0));
      const net  = Math.max(0, parseNum(r.querySelector(".net").value||0));
      const price= Math.max(0, parseNum(r.querySelector(".price").value||0));
      const origin = r.querySelector(".origin").value.trim();
      return { name, mode, qty, gross, tare, net, price, origin };
    }).filter(l => l.name && (l.qty>0 || l.net>0 || l.gross>0));
  }
  const lineImporte = l => (l.mode==="unidad") ? l.qty*l.price : l.net*l.price;

  /* ============ PAGOS PARCIALES UI ============ */
  function renderPagosTemp(){
    const list = $("#listaPagos"); if (!list) return;
    list.innerHTML = "";
    if (pagosTemp.length===0) { list.innerHTML='<div class="item">Sin pagos parciales.</div>'; return; }
    pagosTemp.forEach((p,i)=>{
      const div = document.createElement("div"); div.className="item";
      div.innerHTML = `<div>${fmtDateDMY(new Date(p.date))} · <strong>${money(p.amount)}</strong></div><button class="ghost" data-i="${i}">✖</button>`;
      list.appendChild(div);
    });
    list.querySelectorAll("button").forEach(b=>{
      b.addEventListener("click", ()=>{ pagosTemp.splice(+b.dataset.i,1); renderPagosTemp(); recalc(); });
    });
  }
  $("#btnAddPago")?.addEventListener("click", ()=>{
    const amt = parseNum($("#inpPagoParcial").value||0); if (!(amt>0)) return;
    pagosTemp.unshift({ date: todayISO(), amount: amt });
    $("#inpPagoParcial").value = "";
    renderPagosTemp(); recalc();
  });

  /* ============ RECALC + PRINT FILL ============ */
  function recalc(){
    const ls = captureLineas();
    let subtotal = 0; ls.forEach(l => subtotal += lineImporte(l));
    const transporte = $("#chkTransporte")?.checked ? subtotal*0.10 : 0;
    const baseMasTrans = subtotal + transporte;
    const iva = baseMasTrans * 0.04;  // informativo por defecto (no sumado a total)
    const total = baseMasTrans;

    const manual = parseNum($("#pagado")?.value||0);
    const parcial = pagosTemp.reduce((a,b)=>a+(b.amount||0),0);
    const pagadoTotal = manual + parcial;
    const pendiente = Math.max(0, total - pagadoTotal);

    $("#subtotal").textContent = money(subtotal);
    $("#transp").textContent   = money(transporte);
    $("#iva").textContent      = money(iva);
    $("#total").textContent    = money(total);
    $("#pendiente").textContent= money(pendiente);

    if (total<=0) $("#estado").value="pendiente";
    else if (pagadoTotal<=0) $("#estado").value="pendiente";
    else if (pagadoTotal<total) $("#estado").value="parcial";
    else $("#estado").value="pagado";

    const foot=$("#pdf-foot-note");
    if (foot) {
      foot.textContent = $("#chkIvaIncluido")?.checked
        ? "IVA incluido en los precios."
        : "IVA (4%) mostrado como informativo. Transporte 10% opcional.";
    }

    fillPrint(ls, {subtotal, transporte, iva, total}, null, null);
    drawResumen();
  }
  ["chkTransporte","chkIvaIncluido","estado","pagado"].forEach(id => $("#"+id)?.addEventListener("input", recalc));

  function fillPrint(lines, totals, _temp=null, f=null){
    $("#p-num").textContent = f?.numero || "(Sin guardar)";
    $("#p-fecha").textContent = (f?new Date(f.fecha):new Date()).toLocaleString();

    $("#p-prov").innerHTML = `
      <div><strong>${escapeHTML(f?.proveedor?.nombre || $("#provNombre").value || "")}</strong></div>
      <div>${escapeHTML(f?.proveedor?.nif || $("#provNif").value || "")}</div>
      <div>${escapeHTML(f?.proveedor?.dir || $("#provDir").value || "")}</div>
      <div>${escapeHTML(f?.proveedor?.tel || $("#provTel").value || "")} · ${escapeHTML(f?.proveedor?.email || $("#provEmail").value || "")}</div>
    `;
    $("#p-cli").innerHTML = `
      <div><strong>${escapeHTML(f?.cliente?.nombre || $("#cliNombre").value || "")}</strong></div>
      <div>${escapeHTML(f?.cliente?.nif || $("#cliNif").value || "")}</div>
      <div>${escapeHTML(f?.cliente?.dir || $("#cliDir").value || "")}</div>
      <div>${escapeHTML(f?.cliente?.tel || $("#cliTel").value || "")} · ${escapeHTML(f?.cliente?.email || $("#cliEmail").value || "")}</div>
    `;

    const tbody = $("#p-tabla tbody"); tbody.innerHTML="";
    (lines||[]).forEach(l=>{
      const tr=document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHTML(l.name)}</td>
        <td>${escapeHTML(l.mode||"")}</td>
        <td>${l.qty||""}</td>
        <td>${l.gross?l.gross.toFixed(2):""}</td>
        <td>${l.tare?l.tare.toFixed(2):""}</td>
        <td>${l.net?l.net.toFixed(2):""}</td>
        <td>${money(l.price)}</td>
        <td>${escapeHTML(l.origin||"")}</td>
        <td>${money((l.mode==='unidad') ? l.qty*l.price : l.net*l.price)}</td>
      `;
      tbody.appendChild(tr);
    });

    $("#p-sub").textContent = money(totals?.subtotal||0);
    $("#p-tra").textContent = money(totals?.transporte||0);
    $("#p-iva").textContent = money(totals?.iva||0);
    $("#p-tot").textContent = money(totals?.total||0);
    $("#p-estado").textContent = f?.estado || $("#estado")?.value || "Impagada";
    $("#p-metodo").textContent = f?.metodo || $("#metodoPago")?.value || "Efectivo";
    $("#p-obs").textContent    = f?.obs    || ($("#observaciones")?.value||"—");

    try {
      const canvas = $("#p-qr");
      const numero = f?.numero || "(Sin guardar)";
      const cliente = f?.cliente?.nombre || $("#cliNombre").value || "";
      const payload = `ARSLAN-Factura|${numero}|${cliente}|${money(totals?.total||0)}|${$("#p-estado").textContent}`;
      if (window.QRCode && window.QRCode.toCanvas) {
        window.QRCode.toCanvas(canvas, payload, { width:92, margin:0 });
      }
    } catch(e){}
  }

  /* ============ GUARDAR / NUEVA / PDF ============ */
  function genNumFactura(){
    const d=new Date(), pad=n=>String(n).padStart(2,"0");
    return `FA-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  $("#btnGuardar")?.addEventListener("click", async ()=>{
    const ls = captureLineas(); if (ls.length===0) { alert("Añade al menos una línea."); return; }
    const numero = genNumFactura(); const now = todayISO();
    ls.forEach(l => pushPriceHistory(l.name, l.price));

    const subtotal   = unMoney($("#subtotal").textContent);
    const transporte = unMoney($("#transp").textContent);
    const iva        = unMoney($("#iva").textContent);
    const total      = unMoney($("#total").textContent);

    const manual   = parseNum($("#pagado").value||0);
    const pagos    = [...pagosTemp];
    const pagParc  = pagos.reduce((a,b)=>a+(b.amount||0),0);
    const pagTotal = manual + pagParc;
    const pendiente= Math.max(0, total - pagTotal);

    const estado = (pagTotal<=0) ? "pendiente" : (pagTotal<total ? "parcial" : "pagado");

    const f = {
      id: uid(),
      numero, fecha: now,
      proveedor: {
        nombre: $("#provNombre").value, nif: $("#provNif").value, dir: $("#provDir").value,
        tel: $("#provTel").value, email: $("#provEmail").value
      },
      cliente: {
        nombre: $("#cliNombre").value, nif: $("#cliNif").value, dir: $("#cliDir").value,
        tel: $("#cliTel").value, email: $("#cliEmail").value
      },
      lineas: ls,
      transporte: $("#chkTransporte").checked,
      ivaIncluido: $("#chkIvaIncluido").checked,
      estado, metodo: $("#metodoPago").value, obs: $("#observaciones").value,
      totals: { subtotal, transporte, iva, total, pagado: pagTotal, pendiente },
      pagos
    };

    facturas.unshift(f); saveLS(K_FACTURAS, facturas);
    pagosTemp = []; renderPagosTemp();
    alert(`Factura ${numero} guardada.`);
    renderFacturas(); renderPendientes(); drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen();
    fillPrint(ls, {subtotal,transporte,iva,total}, null, f);

    if (sb) {
      try { await sb.from("facturas").upsert([{
        id: f.id, numero: f.numero, fecha: f.fecha,
        cliente_id: null, // Opcional si manejas relación
        subtotal, iva, transporte, total,
        estado: f.estado, lineas: f.lineas, metodo: f.metodo, obs: f.obs,
        cliente: f.cliente, proveedor: f.proveedor, pagos: f.pagos, totals: f.totals
      }]); } catch(e){ console.warn("Supabase upsert factura:", e.message); }
    }
  });

  $("#btnNueva")?.addEventListener("click", ()=>{
    const tb = $("#lineasBody"); tb.innerHTML="";
    for (let i=0;i<5;i++) addLinea();
    $("#chkTransporte").checked = false;
    $("#chkIvaIncluido").checked = true;
    $("#estado").value = "pendiente";
    $("#pagado").value = "";
    $("#metodoPago").value = "Efectivo";
    $("#observaciones").value = "";
    // Reactiva el botón IVA por si estaba bloqueado
    const btn = $("#btnSumarIVA"); if (btn){ btn.disabled = false; btn.textContent = "➕ Añadir 4 % IVA al total"; }
    pagosTemp = []; renderPagosTemp(); recalc();
  });

  $("#btnImprimir")?.addEventListener("click", ()=>{
    recalc();
    const element = $("#printArea");
    const d = new Date();
    const file = `Factura-${($("#cliNombre").value||"Cliente").replace(/\s+/g,"")}-${fmtDateDMY(d)}.pdf`;
    const opt = { margin:[10,10,10,10], filename:file, image:{type:"jpeg",quality:0.98}, html2canvas:{scale:2,useCORS:true}, jsPDF:{unit:"mm",format:"a4",orientation:"portrait"} };
    if (window.html2pdf) window.html2pdf().set(opt).from(element).save();
  });

  // Botón: Añadir 4 % IVA al total (aplica y bloquea doble suma)
  $("#btnSumarIVA")?.addEventListener("click", ()=>{
    const subtotal = unMoney($("#subtotal").textContent);
    const transporte = unMoney($("#transp").textContent);
    const iva = (subtotal + transporte) * 0.04;
    const total = subtotal + transporte + iva;

    $("#iva").textContent   = money(iva);
    $("#total").textContent = money(total);

    // Desactivar para evitar doble suma
    const btn = $("#btnSumarIVA");
    btn.disabled = true;
    btn.textContent = "✔ IVA añadido";

    // Actualiza PDF
    $("#p-iva").textContent = money(iva);
    $("#p-tot").textContent = money(total);

    const foot = $("#pdf-foot-note");
    if (foot) foot.textContent = "IVA (4%) añadido al total de la factura. Transporte 10% opcional.";

    // Reevalúa estado / pendiente
    const manual = parseNum($("#pagado")?.value || 0);
    const pagParc = pagosTemp.reduce((a,b)=>a+(b.amount||0),0);
    const pagTotal = manual + pagParc;
    const pendiente = Math.max(0, total - pagTotal);
    $("#pendiente").textContent = money(pendiente);

    if (total <= 0) $("#estado").value = "pendiente";
    else if (pagTotal <= 0) $("#estado").value = "pendiente";
    else if (pagTotal < total) $("#estado").value = "parcial";
    else $("#estado").value = "pagado";

    console.log(`✅ IVA (4%) añadido — Nuevo total: ${money(total)} — Pendiente: ${money(pendiente)}`);
  });

  /* ============ LISTA FACTURAS ============ */
  function badgeEstado(f){
    const tot = f.totals?.total||0, pag = f.totals?.pagado||0;
    if (pag>=tot) return `<span class="state-badge state-green">Pagada</span>`;
    if (pag>0 && pag<tot) return `<span class="state-badge state-amber">Parcial (${money(pag)} / ${money(tot)})</span>`;
    return `<span class="state-badge state-red">Impagada</span>`;
  }
  function renderFacturas(){
    const cont = $("#listaFacturas"); if (!cont) return;
    cont.innerHTML = "";
    const q = ($("#buscaCliente")?.value||"").toLowerCase();
    const fe = $("#filtroEstado")?.value || "todas";
    let arr = facturas.slice();
    if (fe!=="todas") arr = arr.filter(f => f.estado===fe);
    if (q) arr = arr.filter(f => (f.cliente?.nombre||"").toLowerCase().includes(q));
    if (arr.length===0) { cont.innerHTML = '<div class="item">No hay facturas.</div>'; return; }

    arr.slice(0,400).forEach((f,idx)=>{
      const fecha = new Date(f.fecha).toLocaleString();
      const div = document.createElement("div"); div.className="item";
      div.innerHTML = `
        <div>
          <strong>${escapeHTML(f.numero)}</strong> ${badgeEstado(f)}
          <div class="muted">${fecha} · ${escapeHTML(f.cliente?.nombre||"")}</div>
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

    cont.querySelectorAll("button").forEach(b => {
      const i = +b.dataset.i;
      b.addEventListener("click", ()=>{
        const f = facturas[i]; if (!f) return;
        if (b.dataset.e==="ver") {
          fillPrint(f.lineas, f.totals, null, f);
          switchTab("factura");
          $("#printArea")?.scrollIntoView({behavior:"smooth"});
        } else if (b.dataset.e==="cobrar") {
          const tot=f.totals.total||0;
          f.totals.pagado = tot; f.totals.pendiente=0; f.estado="pagado";
          (f.pagos??=[]).push({date:todayISO(), amount: tot});
          saveLS(K_FACTURAS, facturas);
          renderFacturas(); renderPendientes(); drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen();
        } else if (b.dataset.e==="parcial") {
          const max=f.totals.total-(f.totals.pagado||0);
          const val=parseNum(prompt(`Importe abonado (pendiente ${money(max)}):`)||0);
          if (val>0){
            f.pagos=f.pagos||[]; f.pagos.push({date:todayISO(), amount:val});
            f.totals.pagado=(f.totals.pagado||0)+val;
            f.totals.pendiente=Math.max(0,(f.totals.total||0)-f.totals.pagado);
            f.estado = f.totals.pendiente>0 ? (f.totals.pagado>0?"parcial":"pendiente") : "pagado";
            saveLS(K_FACTURAS, facturas);
            renderFacturas(); renderPendientes(); drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen();
          }
        } else if (b.dataset.e==="pdf") {
          fillPrint(f.lineas, f.totals, null, f);
          const dt = new Date(f.fecha);
          const nombreCliente=(f.cliente?.nombre||"Cliente").replace(/\s+/g,"");
          const filename=`Factura-${nombreCliente}-${fmtDateDMY(dt)}.pdf`;
          const opt={ margin:[10,10,10,10], filename, image:{type:"jpeg",quality:0.98}, html2canvas:{scale:2,useCORS:true}, jsPDF:{unit:"mm",format:"a4",orientation:"portrait"} };
          if (window.html2pdf) window.html2pdf().set(opt).from($("#printArea")).save();
        }
      });
    });
  }
  $("#filtroEstado")?.addEventListener("input", renderFacturas);
  $("#buscaCliente")?.addEventListener("input", renderFacturas);

  /* ============ PENDIENTES ============ */
  function renderPendientes(){
    const tb = $("#tblPendientes tbody"); if (!tb) return;
    tb.innerHTML = "";
    const map = new Map(); // cliente -> {count, total, lastDate}
    facturas.forEach(f => {
      const pend = f.totals?.pendiente||0; if (pend<=0) return;
      const nom = f.cliente?.nombre || "(s/cliente)";
      const cur = map.get(nom) || { count:0, total:0, lastDate:null };
      cur.count++; cur.total+=pend;
      cur.lastDate = !cur.lastDate || new Date(f.fecha)>new Date(cur.lastDate) ? f.fecha : cur.lastDate;
      map.set(nom, cur);
    });
    let global=0;
    const rows=[...map.entries()].sort((a,b)=>b[1].total-a[1].total);
    rows.forEach(([nom,info])=>{
      global+=info.total;
      const tr=document.createElement("tr");
      const color = info.total>500 ? "state-red" : info.total>=100 ? "state-amber" : "state-green";
      tr.innerHTML = `
        <td>${escapeHTML(nom)}</td>
        <td>${info.count}</td>
        <td><span class="state-badge ${color}">${money(info.total)}</span></td>
        <td>${new Date(info.lastDate).toLocaleString()}</td>
        <td><button class="ghost" data-c="${escapeHTML(nom)}">Ver facturas</button></td>
      `;
      tb.appendChild(tr);
    });
    $("#resGlobal").textContent = money(global);

    tb.querySelectorAll("button").forEach(b=>{
      b.addEventListener("click", ()=>{
        const nombre=b.dataset.c;
        $("#buscaCliente").value=nombre;
        switchTab("facturas");
        renderFacturas();
      });
    });
  }

  /* ============ VENTAS / KPI / CHARTS ============ */
  function sumBetween(d1,d2, filterClient=null){
    let sum=0;
    facturas.forEach(f=>{
      const d=new Date(f.fecha);
      if (d>=d1 && d<d2 && (!filterClient || (f.cliente?.nombre||"")===filterClient))
        sum += (f.totals?.total||0);
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
    $("#vHoy").textContent=money(hoy);
    $("#vSemana").textContent=money(semana);
    $("#vMes").textContent=money(mes);
    $("#vTotal").textContent=money(total);
    $("#rHoy").textContent=money(hoy);
    $("#rSemana").textContent=money(semana);
    $("#rMes").textContent=money(mes);
    $("#rTotal").textContent=money(total);
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
    for(let i=n-1;i>=0;i--){ const d=new Date(now); d.setMonth(d.getMonth()-i); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; buckets.push({k,label:k,sum:0}); }
    facturas.forEach(f=>{ const d=new Date(f.fecha); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; const b=buckets.find(x=>x.k===k); if(b) b.sum+=(f.totals?.total||0); });
    return buckets;
  }
  function drawCharts(){
    if (typeof Chart==="undefined") return;
    const daily=groupDaily(7); const monthly=groupMonthly(12);
    if (chart1) chart1.destroy(); if (chart2) chart2.destroy();
    chart1=new Chart($("#chartDiario").getContext("2d"), {type:"bar", data:{labels:daily.map(d=>d.label), datasets:[{label:"Ventas diarias", data:daily.map(d=>d.sum)}]}, options:{responsive:true, plugins:{legend:{display:false}}}});
    chart2=new Chart($("#chartMensual").getContext("2d"), {type:"line", data:{labels:monthly.map(d=>d.label), datasets:[{label:"Ventas mensuales", data:monthly.map(d=>d.sum)}]}, options:{responsive:true, plugins:{legend:{display:false}}}});
  }
  function drawTop(){
    if (typeof Chart==="undefined") return;
    const map=new Map();
    facturas.forEach(f=>{
      (f.lineas||[]).forEach(l=>{
        const amt = (l.mode==='unidad') ? l.qty*l.price : l.net*l.price;
        map.set(l.name, (map.get(l.name)||0)+amt);
      });
    });
    const pairs=[...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
    const labels=pairs.map(p=>p[0]); const data=pairs.map(p=>p[1]);
    if (chartTop) chartTop.destroy();
    chartTop=new Chart($("#chartTop").getContext("2d"), {type:"bar", data:{labels, datasets:[{label:"Top productos (€)", data}]}, options:{responsive:true, plugins:{legend:{display:false}}}});
  }
  function renderVentasCliente(){
    const tb=$("#tblVentasCliente tbody"); if (!tb) return;
    tb.innerHTML="";
    const now=new Date();
    const sDay=startOfDay(now), eDay=endOfDay(now);
    const sWeek=startOfWeek(now), eWeek=endOfDay(now);
    const sMonth=startOfMonth(now), eMonth=endOfDay(now);

    const byClient=new Map(); // cliente -> {hoy,semana,mes,total}
    facturas.forEach(f=>{
      const nom=f.cliente?.nombre||"(s/cliente)";
      const d=new Date(f.fecha); const tot=f.totals?.total||0;
      const cur=byClient.get(nom)||{hoy:0,semana:0,mes:0,total:0};
      if(d>=sDay && d<=eDay) cur.hoy+=tot;
      if(d>=sWeek&&d<=eWeek) cur.semana+=tot;
      if(d>=sMonth&&d<=eMonth) cur.mes+=tot;
      cur.total+=tot;
      byClient.set(nom,cur);
    });

    [...byClient.entries()].sort((a,b)=>b[1].total-a[1].total).forEach(([nom,v])=>{
      const tr=document.createElement("tr");
      const highlight = v.hoy>0 ? "state-green" : "";
      tr.innerHTML=`<td>${escapeHTML(nom)}</td><td class="${highlight}">${money(v.hoy)}</td><td>${money(v.semana)}</td><td>${money(v.mes)}</td><td><strong>${money(v.total)}</strong></td>`;
      tb.appendChild(tr);
    });
  }

  /* ============ BACKUP/RESTORE + EXPORTS ============ */
  $("#btnBackup")?.addEventListener("click", ()=>{
    const payload={clientes, productos, facturas, priceHist, fecha: todayISO(), version:"ARSLAN PRO V10.4"};
    const filename=`backup-${fmtDateDMY(new Date())}.json`;
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
  $("#btnRestore")?.addEventListener("click", ()=>{
    const inp=document.createElement("input"); inp.type="file"; inp.accept="application/json";
    inp.onchange=e=>{
      const f=e.target.files[0]; if(!f) return;
      const reader=new FileReader(); reader.onload=()=>{
        try{
          const obj=JSON.parse(reader.result);
          if(obj.clientes){ clientes=obj.clientes; ensureClienteIds(); }
          if(obj.productos) productos=obj.productos;
          if(obj.facturas)  facturas=obj.facturas;
          if(obj.priceHist) priceHist=obj.priceHist;
          saveLS(K_CLIENTES,clientes); saveLS(K_PRODUCTOS,productos); saveLS(K_FACTURAS,facturas); saveLS(K_PRICEHIST,priceHist);
          renderAll(); alert("Copia restaurada ✔️");
        }catch{ alert("JSON inválido"); }
      }; reader.readAsText(f);
    };
    inp.click();
  });

  function downloadJSON(obj, filename){
    const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function uploadJSON(cb){
    const inp=document.createElement("input"); inp.type="file"; inp.accept="application/json";
    inp.onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ cb(JSON.parse(r.result)); }catch{ alert("JSON inválido"); } }; r.readAsText(f); };
    inp.click();
  }

  $("#btnExportClientes")?.addEventListener("click", ()=>downloadJSON(clientes,"clientes-arslan-v104.json"));
  $("#btnImportClientes")?.addEventListener("click", ()=>uploadJSON(arr=>{
    if(Array.isArray(arr)){ clientes=uniqueByName(arr).map(c=>({ ...c, id:c.id||uid() })); saveLS(K_CLIENTES,clientes); renderClientesSelect(); renderClientesLista(); }
  }));
  $("#btnExportProductos")?.addEventListener("click", ()=>downloadJSON(productos,"productos-arslan-v104.json"));
  $("#btnImportProductos")?.addEventListener("click", ()=>uploadJSON(arr=>{
    if(Array.isArray(arr)){ productos=arr; saveLS(K_PRODUCTOS,productos); populateProductDatalist(); renderProductos(); }
  }));
  $("#btnExportFacturas")?.addEventListener("click", ()=>downloadJSON(facturas,"facturas-arslan-v104.json"));
  $("#btnImportFacturas")?.addEventListener("click", ()=>uploadJSON(arr=>{
    if(Array.isArray(arr)){ facturas=arr; saveLS(K_FACTURAS,facturas); renderFacturas(); renderPendientes(); drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen(); }
  }));

  $("#btnExportVentas")?.addEventListener("click", ()=>{
    const rows=[["Cliente","Fecha","Nº","Total","Pagado","Pendiente","Estado"]];
    facturas.forEach(f=>{
      rows.push([f.cliente?.nombre||"", new Date(f.fecha).toLocaleString(), f.numero, (f.totals?.total||0), (f.totals?.pagado||0), (f.totals?.pendiente||0), f.estado]);
    });
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="ventas.csv"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  /* ============ SUPABASE SYNC (UNIVERSAL) ============ */
  async function syncTable(tableName, columns="*"){
    if (!sb) return [];
    const table = String(tableName).toLowerCase();
    console.log(`🔁 Sincronizando tabla: ${table}...`);
    try{
      const { data: remoto, error } = await sb.from(table).select(columns);
      if (error) throw error;
      const local = safeJSON(loadLS(table, []));
      const combinados = [...local];

      (remoto||[]).forEach(r=>{
        const rNorm = normalizeObjectKeys(r);
        const idx = combinados.findIndex(l=> sameId(l, rNorm));
        if (idx===-1) combinados.push(rNorm);
        else combinados[idx] = { ...combinados[idx], ...rNorm };
      });

      saveLS(table, combinados);

      for (const item of local) {
        if (!(remoto||[]).some(r => r.id === item.id)) {
          const toUpload = normalizeObjectKeys(item);
          const { error: insErr } = await sb.from(table).insert([toUpload]);
          if (insErr) console.warn(`⚠️ Error subiendo a ${table}:`, insErr.message);
          else console.log(`⬆️ ${table} → fila subida (${item.id || "nuevo"})`);
        }
      }
      console.log(`✅ ${table} sincronizada (${combinados.length} filas).`);
      return combinados;
    } catch(err){
      console.error(`🚨 Error sincronizando ${table}:`, err.message);
      return [];
    }
  }
  async function syncClientes(){ return await syncTable("clientes", "id, nombre, nif, direccion, email, telefono, created_at"); }
  async function syncProductos(){ return await syncTable("productos", "id, name, mode, boxkg, price, origin, created_at"); }
  async function syncFacturas(){ return await syncTable("facturas", "id, numero, fecha, subtotal, iva, transporte, total, estado, lineas, cliente, proveedor, pagos, totals, created_at"); }

  async function syncAll(){
    if (!sb) return;
    console.log("☁️ Sincronización global iniciada...");
    await Promise.all([syncClientes(), syncProductos(), syncFacturas()]);
    console.log("✅ Sincronización global completada.");
    // Mezcla con estructuras internas (para UI)
    const lc = loadLS("clientes", []); if (Array.isArray(lc) && lc.length) { clientes = safeJSON(clientes).length ? clientes : lc; }
    const lp = loadLS("productos",[]); if (Array.isArray(lp) && lp.length) { productos = safeJSON(productos).length? productos: lp; }
    const lf = loadLS("facturas", []); if (Array.isArray(lf) && lf.length) { facturas = safeJSON(facturas).length ? facturas : lf; }
    renderAll();
  }

  function startRealtimeSync(){
    if (!sb) return;
    console.log("📡 Activando Realtime Supabase...");
    const tablas = ["clientes","productos","facturas"];
    for (const tabla of tablas) {
      sb.channel("rt-"+tabla)
        .on("postgres_changes", { event:"*", schema:"public", table: tabla }, async (payload)=>{
          console.log(`🔔 Cambio remoto en ${tabla}: ${payload.eventType}`);
          await syncTable(tabla);
          renderAll();
        })
        .subscribe();
    }
  }

  /* ============ EVENTOS GENERALES ============ */
  $("#btnAddLinea")?.addEventListener("click", addLinea);
  $("#btnVaciarLineas")?.addEventListener("click", ()=>{
    if (confirm("¿Vaciar líneas?")) {
      const tb=$("#lineasBody"); tb.innerHTML="";
      for (let i=0;i<5;i++) addLinea();
      recalc();
    }
  });
  $("#btnNuevoCliente")?.addEventListener("click", ()=>switchTab("clientes"));
  $("#selCliente")?.addEventListener("change", ()=>{
    const id=$("#selCliente").value; if(!id) return; const c=clientes.find(x=>x.id===id); if(!c) return; fillClientFields(c);
  });
  $("#btnAddCliente")?.addEventListener("click", async ()=>{
    const nombre = prompt("Nombre del cliente:"); if (!nombre) return;
    const nif = prompt("NIF/CIF:") || "";
    const dir = prompt("Dirección:") || "";
    const tel = prompt("Teléfono:") || "";
    const email = prompt("Email:") || "";
    const nuevo = { id: uid(), nombre, nif, dir, tel, email };
    clientes.push(nuevo); saveLS(K_CLIENTES, clientes); renderClientesSelect(); renderClientesLista();
    if (sb) { try { await sb.from("clientes").upsert([{ id:nuevo.id, nombre, direccion: dir, nif, telefono: tel, email }]); } catch(e){ console.warn("Supabase upsert cliente:", e.message); } }
  });

  /* ============ RENDER ALL + BOOT ============ */
  function renderAll(){
    renderClientesSelect(); renderClientesLista();
    populateProductDatalist(); renderProductos(); renderFacturas(); renderPendientes();
    drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen();
  }
  const drawResumen = () => drawKPIs();

  // BOOT
  function boot(){
    seedClientesIfEmpty();
    ensureClienteIds();
    seedProductsIfEmpty();
    setProviderDefaultsIfEmpty();
    const tb = $("#lineasBody");
    if (tb && tb.children.length===0) for (let i=0;i<5;i++) addLinea();
    renderPagosTemp();
    renderAll();
    recalc();

    // Iniciar Supabase sync si hay cliente global
    if (sb) {
      syncAll();
      startRealtimeSync();
      // Reintento cada 10 min
      setInterval(()=>{ console.log("♻️ Verificación de conexión Supabase..."); syncAll(); }, 10*60*1000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
