// ============ AJM OIL AND GAS MONITORING APP ============
const SUPABASE_URL = "https://kygaopzqvrqmjpmzixte.supabase.co";
const SUPABASE_KEY = "sb_publishable_TLHTEriqjU1lQg7O6N7VYw_shr7ZHr7";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CEO_NAME = "Ayobami Olujide";
const CEO_PASS_KEY = "ajm_ceo_pass"; // stored in localStorage after first change, else default
const CEO_DEFAULT_PASS = "Olujide@2026";

// ---------- Global State ----------
let STATE = {
  session: null, // { type:'ceo' } or { type:'manager', branchId, branchName }
  branches: [],
  view: 'splash',
  tab: 'home',
  loading: false,
};

const $app = document.getElementById('app');

function toast(msg, type='success'){
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2600);
}

function money(n){
  n = Number(n)||0;
  return '₦' + n.toLocaleString('en-NG', {maximumFractionDigits:2});
}
function litres(n){
  n = Number(n)||0;
  return n.toLocaleString('en-NG', {maximumFractionDigits:2}) + 'L';
}
function fmtDate(d){
  if(!d) return '-';
  const dt = new Date(d+'T00:00:00');
  return dt.toLocaleDateString('en-NG', {day:'2-digit', month:'short', year:'numeric'});
}
function todayISO(){
  const d = new Date();
  return d.toISOString().slice(0,10);
}
function uid(){ return Math.random().toString(36).slice(2,10); }

async function withLoading(fn){
  STATE.loading = true;
  render();
  try{ await fn(); } finally { STATE.loading = false; }
}

// ---------- Session persistence (sessionStorage so it clears when they close the app/browser fully, safer for shared phones) ----------
function saveSession(){
  sessionStorage.setItem('ajm_session', JSON.stringify(STATE.session));
}
function loadSession(){
  try{
    const s = sessionStorage.getItem('ajm_session');
    if(s) STATE.session = JSON.parse(s);
  }catch(e){}
}
function getCeoPass(){
  return localStorage.getItem(CEO_PASS_KEY) || CEO_DEFAULT_PASS;
}

// ---------- Data fetchers ----------
async function fetchBranches(){
  const {data, error} = await db.from('ajm_branches').select('*').order('created_at');
  if(error){ console.error(error); return []; }
  return data;
}

async function refreshBranches(){
  STATE.branches = await fetchBranches();
}

// ---------- INIT ----------
async function init(){
  loadSession();
  await refreshBranches();
  if(STATE.session && STATE.session.type){
    STATE.view = STATE.session.type === 'ceo' ? 'ceo-dashboard' : 'mgr-dashboard';
  } else {
    STATE.view = 'splash';
  }
  render();
}

function logout(){
  STATE.session = null;
  sessionStorage.removeItem('ajm_session');
  STATE.view = 'splash';
  STATE.tab = 'home';
  render();
}

init();

// ============ RENDER: SPLASH / ROLE SELECT ============
function renderSplash(){
  $app.innerHTML = `
    <div class="splash">
      <div class="brand-mark">AJM</div>
      <div class="brand-title">AJM Oil and Gas</div>
      <div class="brand-sub">Energy · Solutions · Future</div>
      <div class="brand-tag">Business monitoring system for daily sales, stock, remittance, expenses and staff records.</div>
      <div class="role-cards">
        <div class="role-card" onclick="goTo('ceo-login')">
          <div class="role-icon gold">CEO</div>
          <div>
            <div class="role-title">CEO / Admin</div>
            <div class="role-desc">Ayobami Olujide — full oversight of all branches</div>
          </div>
        </div>
        <div class="role-card" onclick="goTo('mgr-login')">
          <div class="role-icon">B</div>
          <div>
            <div class="role-title">Branch Manager</div>
            <div class="role-desc">Submit daily reports for your branch</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function goTo(view){ STATE.view = view; render(); }

// ============ RENDER: CEO LOGIN ============
function renderCeoLogin(){
  $app.innerHTML = `
    <div class="splash">
      <div class="brand-mark">AJM</div>
      <div class="login-box">
        <h3>CEO Login</h3>
        <p class="hint">Enter the admin password to access the full dashboard.</p>
        <div id="ceo-login-error"></div>
        <div class="field">
          <label>Password</label>
          <input type="password" id="ceo-pass-input" placeholder="Enter password" autocomplete="current-password">
        </div>
        <button class="btn btn-gold" onclick="doCeoLogin()">Sign In</button>
        <div class="back-link" onclick="goTo('splash')">Back</div>
      </div>
    </div>
  `;
  setTimeout(()=>{
    const inp = document.getElementById('ceo-pass-input');
    if(inp){
      inp.focus();
      inp.addEventListener('keydown', e=>{ if(e.key==='Enter') doCeoLogin(); });
    }
  },50);
}

function doCeoLogin(){
  const val = document.getElementById('ceo-pass-input').value;
  if(val === getCeoPass()){
    STATE.session = {type:'ceo', name: CEO_NAME};
    saveSession();
    STATE.view = 'ceo-dashboard';
    STATE.tab = 'home';
    render();
    toast('Welcome back, ' + CEO_NAME);
  } else {
    document.getElementById('ceo-login-error').innerHTML =
      '<div class="error-msg">Incorrect password. Please try again.</div>';
  }
}

// ============ RENDER: MANAGER LOGIN ============
function renderMgrLogin(){
  const opts = STATE.branches.map(b=>'<option value="'+b.id+'">'+b.name+'</option>').join('');
  $app.innerHTML = `
    <div class="splash">
      <div class="brand-mark">AJM</div>
      <div class="login-box">
        <h3>Branch Manager Login</h3>
        <p class="hint">Select your branch and enter your PIN.</p>
        <div id="mgr-login-error"></div>
        <div class="field">
          <label>Branch</label>
          <select id="mgr-branch-select">${opts}</select>
        </div>
        <div class="field">
          <label>PIN</label>
          <input type="password" inputmode="numeric" id="mgr-pin-input" placeholder="Enter PIN">
        </div>
        <div class="field">
          <label>Your Name</label>
          <input type="text" id="mgr-name-input" placeholder="e.g. Tunde Bakare">
        </div>
        <button class="btn btn-primary" onclick="doMgrLogin()">Sign In</button>
        <div class="back-link" onclick="goTo('splash')">Back</div>
      </div>
    </div>
  `;
}

async function doMgrLogin(){
  const branchId = document.getElementById('mgr-branch-select').value;
  const pin = document.getElementById('mgr-pin-input').value.trim();
  const name = document.getElementById('mgr-name-input').value.trim();
  const errBox = document.getElementById('mgr-login-error');
  if(!name){
    errBox.innerHTML = '<div class="error-msg">Please enter your name.</div>';
    return;
  }
  const branch = STATE.branches.find(b=>b.id === branchId);
  if(!branch){
    errBox.innerHTML = '<div class="error-msg">Branch not found.</div>';
    return;
  }
  if(pin !== branch.manager_pin){
    errBox.innerHTML = '<div class="error-msg">Incorrect PIN for this branch.</div>';
    return;
  }
  STATE.session = {type:'manager', branchId: branch.id, branchName: branch.name, managerName: name};
  saveSession();
  STATE.view = 'mgr-dashboard';
  STATE.tab = 'home';
  render();
  toast('Welcome, ' + name);
}

// ============ MANAGER DASHBOARD DATA ============
let MGR_DATA_CACHE = {};

async function loadMgrData(){
  const bid = STATE.session.branchId;
  const [deliv, sales, remit, exp] = await Promise.all([
    db.from('ajm_deliveries').select('*').eq('branch_id', bid).order('delivery_date', {ascending:false}),
    db.from('ajm_sales').select('*').eq('branch_id', bid).order('sale_date', {ascending:false}),
    db.from('ajm_remittances').select('*').eq('branch_id', bid).order('remit_date', {ascending:false}),
    db.from('ajm_expenses').select('*').eq('branch_id', bid).order('expense_date', {ascending:false}),
  ]);
  MGR_DATA_CACHE = {
    deliveries: deliv.data || [],
    sales: sales.data || [],
    remittances: remit.data || [],
    expenses: exp.data || [],
  };
}

function calcStockBalance(){
  const totalIn = MGR_DATA_CACHE.deliveries.filter(d=>d.status==='approved').reduce((s,d)=>s+Number(d.litres),0);
  const totalOut = MGR_DATA_CACHE.sales.filter(s=>s.status==='approved').reduce((s,x)=>s+Number(x.litres_sold),0);
  return totalIn - totalOut;
}

function currentPricePerLitre(){
  const lastSale = MGR_DATA_CACHE.sales[0];
  if(lastSale) return Number(lastSale.price_per_litre);
  const lastDeliv = MGR_DATA_CACHE.deliveries[0];
  if(lastDeliv) return Number(lastDeliv.price_per_litre);
  return 0;
}

// ============ RENDER: MANAGER DASHBOARD ============
async function renderMgrDashboard(){
  $app.innerHTML = '<div class="center-pad"><div class="loader"></div></div>';
  await loadMgrData();
  const stock = calcStockBalance();
  const branch = STATE.branches.find(b=>b.id===STATE.session.branchId) || {};
  const lowStock = stock <= Number(branch.low_stock_threshold || 500);

  const pendingCount = MGR_DATA_CACHE.deliveries.filter(d=>d.status==='pending').length
    + MGR_DATA_CACHE.sales.filter(d=>d.status==='pending').length
    + MGR_DATA_CACHE.remittances.filter(d=>d.status==='pending').length
    + MGR_DATA_CACHE.expenses.filter(d=>d.status==='pending').length;

  let html = `
    <div class="topbar">
      <div class="who">
        <div class="name">${STATE.session.managerName}</div>
        <div class="role">${STATE.session.branchName}</div>
      </div>
      <div class="icon-btn" onclick="logout()">Exit</div>
    </div>
    <div class="content" id="mgr-content">
  `;

  if(STATE.tab === 'home'){
    html += `
      <div class="section-title">Stock Overview</div>
      <div class="stat-grid">
        <div class="stat-card ${lowStock?'alert':'good'}">
          <div class="label">Fuel In Stock</div>
          <div class="value">${litres(stock)}</div>
          <div class="sub">${lowStock ? 'Low stock — reorder soon' : 'Stock level healthy'}</div>
        </div>
        <div class="stat-card">
          <div class="label">Current Price/Litre</div>
          <div class="value">${money(currentPricePerLitre())}</div>
          <div class="sub">Last recorded rate</div>
        </div>
      </div>
      <div class="section-title">Quick Actions</div>
      <div class="card" style="padding:10px;">
        <div class="row-2" style="margin-bottom:10px;">
          <button class="btn btn-primary btn-sm" style="width:100%;" onclick="openDeliveryForm()">+ Delivery</button>
          <button class="btn btn-primary btn-sm" style="width:100%;" onclick="openSalesForm()">+ Daily Sale</button>
        </div>
        <div class="row-2">
          <button class="btn btn-outline btn-sm" style="width:100%;" onclick="openRemitForm()">+ Remittance</button>
          <button class="btn btn-outline btn-sm" style="width:100%;" onclick="openExpenseForm()">+ Expense</button>
        </div>
      </div>
      <div class="section-title">Recent Activity ${pendingCount>0?'<span class="pill pill-pending">'+pendingCount+' pending</span>':''}</div>
      ${renderMgrRecentActivity()}
    `;
  } else if(STATE.tab === 'reports'){
    html += renderMgrReportsTab();
  } else if(STATE.tab === 'staff'){
    html += `<div id="staff-tab-content"><div class="center-pad"><div class="loader"></div></div></div>`;
  }

  html += `</div>`;
  html += renderMgrBottomNav(pendingCount);
  $app.innerHTML = html;

  if(STATE.tab === 'staff'){
    renderStaffTab(STATE.session.branchId, 'staff-tab-content', false);
  }
}

function renderMgrRecentActivity(){
  const items = [];
  MGR_DATA_CACHE.deliveries.slice(0,3).forEach(d=>items.push({type:'Delivery', date:d.delivery_date, status:d.status, desc: litres(d.litres)+' @ '+money(d.price_per_litre)+'/L'}));
  MGR_DATA_CACHE.sales.slice(0,3).forEach(d=>items.push({type:'Sale', date:d.sale_date, status:d.status, desc: litres(d.litres_sold)+' sold, revenue '+money(d.expected_revenue)}));
  MGR_DATA_CACHE.remittances.slice(0,3).forEach(d=>items.push({type:'Remittance', date:d.remit_date, status:d.status, desc: money(d.amount_remitted)+' remitted'}));
  MGR_DATA_CACHE.expenses.slice(0,3).forEach(d=>items.push({type:'Expense', date:d.expense_date, status:d.status, desc: money(d.amount)+' — '+(d.category||'')}));
  items.sort((a,b)=> new Date(b.date) - new Date(a.date));
  if(items.length===0){
    return `<div class="empty-state"><div class="icon">📋</div><p>No activity yet. Start by logging today's delivery or sales.</p></div>`;
  }
  return items.slice(0,8).map(it=>`
    <div class="card">
      <div class="card-row">
        <div>
          <div class="card-title">${it.type}</div>
          <div class="card-meta">${fmtDate(it.date)}</div>
        </div>
        <span class="pill pill-${it.status}">${it.status}</span>
      </div>
      <div class="card-body">${it.desc}</div>
    </div>
  `).join('');
}

function renderMgrReportsTab(){
  const totalRevenue = MGR_DATA_CACHE.sales.filter(s=>s.status==='approved').reduce((s,x)=>s+Number(x.expected_revenue),0);
  const totalRemitted = MGR_DATA_CACHE.remittances.filter(r=>r.status==='approved').reduce((s,x)=>s+Number(x.amount_remitted),0);
  const totalExpenses = MGR_DATA_CACHE.expenses.filter(e=>e.status==='approved').reduce((s,x)=>s+Number(x.amount),0);
  const gap = totalRevenue - totalRemitted;
  return `
    <div class="section-title">Summary (All Time, Approved)</div>
    <div class="stat-grid">
      <div class="stat-card"><div class="label">Expected Revenue</div><div class="value">${money(totalRevenue)}</div></div>
      <div class="stat-card"><div class="label">Total Remitted</div><div class="value">${money(totalRemitted)}</div></div>
      <div class="stat-card ${gap>0?'alert':'good'}"><div class="label">Revenue Gap</div><div class="value">${money(gap)}</div><div class="sub">${gap>0?'Under-remitted':'On track'}</div></div>
      <div class="stat-card"><div class="label">Total Expenses</div><div class="value">${money(totalExpenses)}</div></div>
    </div>
    <div class="section-title">All Deliveries</div>
    ${MGR_DATA_CACHE.deliveries.map(d=>`
      <div class="card"><div class="card-row"><div>
        <div class="card-title">${litres(d.litres)}</div>
        <div class="card-meta">${fmtDate(d.delivery_date)} · ${d.supplier||'No supplier noted'}</div>
      </div><span class="pill pill-${d.status}">${d.status}</span></div>
      <div class="card-body">Price: <b>${money(d.price_per_litre)}</b>/L · Submitted by ${d.submitted_by||'-'}</div></div>
    `).join('') || '<div class="empty-state"><p>No deliveries logged.</p></div>'}
    <div class="section-title">All Sales</div>
    ${MGR_DATA_CACHE.sales.map(s=>`
      <div class="card"><div class="card-row"><div>
        <div class="card-title">${litres(s.litres_sold)} sold</div>
        <div class="card-meta">${fmtDate(s.sale_date)}</div>
      </div><span class="pill pill-${s.status}">${s.status}</span></div>
      <div class="card-body">Revenue: <b>${money(s.expected_revenue)}</b> at ${money(s.price_per_litre)}/L</div></div>
    `).join('') || '<div class="empty-state"><p>No sales logged.</p></div>'}
    <div class="section-title">All Remittances</div>
    ${MGR_DATA_CACHE.remittances.map(r=>`
      <div class="card"><div class="card-row"><div>
        <div class="card-title">${money(r.amount_remitted)}</div>
        <div class="card-meta">${fmtDate(r.remit_date)}</div>
      </div><span class="pill pill-${r.status}">${r.status}</span></div>
      ${r.expected_amount ? '<div class="card-body">Expected: '+money(r.expected_amount)+' · Diff: '+money(r.discrepancy)+'</div>' : ''}
      ${r.manager_note ? '<div class="card-body">Note: '+r.manager_note+'</div>' : ''}
      </div>
    `).join('') || '<div class="empty-state"><p>No remittances logged.</p></div>'}
    <div class="section-title">All Expenses</div>
    ${MGR_DATA_CACHE.expenses.map(e=>`
      <div class="card"><div class="card-row"><div>
        <div class="card-title">${money(e.amount)} — ${e.category||'General'}</div>
        <div class="card-meta">${fmtDate(e.expense_date)}</div>
      </div><span class="pill pill-${e.status}">${e.status}</span></div>
      <div class="card-body">${e.description||''}</div></div>
    `).join('') || '<div class="empty-state"><p>No expenses logged.</p></div>'}
  `;
}

function renderMgrBottomNav(pendingCount){
  return `
    <div class="bottom-nav">
      <div class="nav-item ${STATE.tab==='home'?'active':''}" onclick="setMgrTab('home')">
        <div class="nav-icon">⌂</div><div class="nav-label">Home</div>
      </div>
      <div class="nav-item ${STATE.tab==='reports'?'active':''}" onclick="setMgrTab('reports')">
        <div class="nav-icon">▤</div><div class="nav-label">Reports</div>
        ${pendingCount>0?'<div class="badge-dot">'+pendingCount+'</div>':''}
      </div>
      <div class="nav-item ${STATE.tab==='staff'?'active':''}" onclick="setMgrTab('staff')">
        <div class="nav-icon">☺</div><div class="nav-label">Staff</div>
      </div>
    </div>
  `;
}

function setMgrTab(tab){ STATE.tab = tab; render(); }

// ============ SHEET INFRASTRUCTURE ============
function openSheet(html){
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.id = 'active-sheet-overlay';
  overlay.onclick = (e)=>{ if(e.target === overlay) closeSheet(); };
  overlay.innerHTML = `<div class="sheet" onclick="event.stopPropagation()"><div class="sheet-handle"></div>${html}</div>`;
  document.body.appendChild(overlay);
}
function closeSheet(){
  const el = document.getElementById('active-sheet-overlay');
  if(el) el.remove();
}

// ============ DELIVERY FORM ============
function openDeliveryForm(){
  openSheet(`
    <div class="sheet-header"><h3>Log Fuel Delivery</h3><div class="sheet-close" onclick="closeSheet()">&times;</div></div>
    <div id="deliv-form-err"></div>
    <div class="field"><label>Delivery Date</label><input type="date" id="deliv-date" value="${todayISO()}"></div>
    <div class="row-2">
      <div class="field"><label>Litres Delivered</label><input type="number" id="deliv-litres" placeholder="e.g. 5000" min="0" step="0.01"></div>
      <div class="field"><label>Price per Litre (₦)</label><input type="number" id="deliv-price" placeholder="e.g. 850" min="0" step="0.01"></div>
    </div>
    <div class="field"><label>Supplier / Depot</label><input type="text" id="deliv-supplier" placeholder="e.g. NNPC Depot, Apapa"></div>
    <button class="btn btn-primary" onclick="submitDelivery()">Submit for Approval</button>
  `);
}

async function submitDelivery(){
  const date = document.getElementById('deliv-date').value;
  const l = document.getElementById('deliv-litres').value;
  const p = document.getElementById('deliv-price').value;
  const supplier = document.getElementById('deliv-supplier').value.trim();
  const err = document.getElementById('deliv-form-err');
  if(!date || !l || !p || Number(l)<=0 || Number(p)<=0){
    err.innerHTML = '<div class="error-msg">Please fill in date, litres and price correctly.</div>';
    return;
  }
  const {error} = await db.from('ajm_deliveries').insert({
    branch_id: STATE.session.branchId,
    delivery_date: date,
    litres: Number(l),
    price_per_litre: Number(p),
    supplier: supplier || null,
    submitted_by: STATE.session.managerName,
    status: 'pending'
  });
  if(error){ err.innerHTML = '<div class="error-msg">Error: '+error.message+'</div>'; return; }
  closeSheet();
  toast('Delivery submitted for CEO approval');
  render();
}

// ============ SALES FORM ============
function openSalesForm(){
  const stock = calcStockBalance();
  openSheet(`
    <div class="sheet-header"><h3>Log Daily Sale</h3><div class="sheet-close" onclick="closeSheet()">&times;</div></div>
    <p class="hint" style="margin-bottom:14px;color:var(--text-dim);font-size:12px;">Current available stock: <b style="color:var(--text)">${litres(stock)}</b></p>
    <div id="sales-form-err"></div>
    <div class="field"><label>Sale Date</label><input type="date" id="sales-date" value="${todayISO()}"></div>
    <div class="row-2">
      <div class="field"><label>Litres Sold</label><input type="number" id="sales-litres" placeholder="e.g. 1200" min="0" step="0.01"></div>
      <div class="field"><label>Price per Litre (₦)</label><input type="number" id="sales-price" placeholder="e.g. 900" min="0" step="0.01" value="${currentPricePerLitre()||''}"></div>
    </div>
    <button class="btn btn-primary" onclick="submitSales()">Submit for Approval</button>
  `);
}

async function submitSales(){
  const date = document.getElementById('sales-date').value;
  const l = document.getElementById('sales-litres').value;
  const p = document.getElementById('sales-price').value;
  const err = document.getElementById('sales-form-err');
  if(!date || !l || !p || Number(l)<=0 || Number(p)<=0){
    err.innerHTML = '<div class="error-msg">Please fill in date, litres sold and price correctly.</div>';
    return;
  }
  const stock = calcStockBalance();
  if(Number(l) > stock){
    err.innerHTML = '<div class="error-msg">Litres sold ('+litres(l)+') exceeds available stock ('+litres(stock)+'). Please check your figures.</div>';
    return;
  }
  const {error} = await db.from('ajm_sales').insert({
    branch_id: STATE.session.branchId,
    sale_date: date,
    litres_sold: Number(l),
    price_per_litre: Number(p),
    submitted_by: STATE.session.managerName,
    status: 'pending'
  });
  if(error){ err.innerHTML = '<div class="error-msg">Error: '+error.message+'</div>'; return; }
  closeSheet();
  toast('Sales report submitted for CEO approval');
  render();
}

// ============ REMITTANCE FORM ============
function openRemitForm(){
  openSheet(`
    <div class="sheet-header"><h3>Log Remittance</h3><div class="sheet-close" onclick="closeSheet()">&times;</div></div>
    <p class="hint" style="margin-bottom:14px;color:var(--text-dim);font-size:12px;">Enter the amount actually banked/remitted to the company account for this date. The system will compare it against expected sales revenue and flag any shortfall automatically.</p>
    <div id="remit-form-err"></div>
    <div class="field"><label>Date</label><input type="date" id="remit-date" value="${todayISO()}"></div>
    <div class="field"><label>Amount Remitted (₦)</label><input type="number" id="remit-amount" placeholder="e.g. 950000" min="0" step="0.01"></div>
    <div class="field"><label>Note (optional)</label><textarea id="remit-note" placeholder="Any explanation, e.g. partial remittance, bank delay, etc."></textarea></div>
    <button class="btn btn-primary" onclick="submitRemit()">Submit for Approval</button>
  `);
}

async function submitRemit(){
  const date = document.getElementById('remit-date').value;
  const amt = document.getElementById('remit-amount').value;
  const note = document.getElementById('remit-note').value.trim();
  const err = document.getElementById('remit-form-err');
  if(!date || !amt || Number(amt)<0){
    err.innerHTML = '<div class="error-msg">Please fill in date and amount correctly.</div>';
    return;
  }
  // find expected revenue for that date from sales
  const saleForDate = MGR_DATA_CACHE.sales.find(s=>s.sale_date === date);
  const expected = saleForDate ? Number(saleForDate.expected_revenue) : null;

  const {error} = await db.from('ajm_remittances').insert({
    branch_id: STATE.session.branchId,
    remit_date: date,
    amount_remitted: Number(amt),
    expected_amount: expected,
    manager_note: note || null,
    submitted_by: STATE.session.managerName,
    status: 'pending'
  });
  if(error){ err.innerHTML = '<div class="error-msg">Error: '+error.message+'</div>'; return; }
  closeSheet();
  toast('Remittance submitted for CEO approval');
  render();
}

// ============ EXPENSE FORM ============
function openExpenseForm(){
  openSheet(`
    <div class="sheet-header"><h3>Log Expense</h3><div class="sheet-close" onclick="closeSheet()">&times;</div></div>
    <div id="exp-form-err"></div>
    <div class="field"><label>Date</label><input type="date" id="exp-date" value="${todayISO()}"></div>
    <div class="field"><label>Amount (₦)</label><input type="number" id="exp-amount" placeholder="e.g. 25000" min="0" step="0.01"></div>
    <div class="field"><label>Category</label>
      <select id="exp-category">
        <option>Fuel Transport</option>
        <option>Equipment Maintenance</option>
        <option>Utilities</option>
        <option>Salaries</option>
        <option>Security</option>
        <option>Miscellaneous</option>
      </select>
    </div>
    <div class="field"><label>What was it spent on?</label><textarea id="exp-desc" placeholder="Describe the expense"></textarea></div>
    <button class="btn btn-primary" onclick="submitExpense()">Submit for Approval</button>
  `);
}

async function submitExpense(){
  const date = document.getElementById('exp-date').value;
  const amt = document.getElementById('exp-amount').value;
  const cat = document.getElementById('exp-category').value;
  const desc = document.getElementById('exp-desc').value.trim();
  const err = document.getElementById('exp-form-err');
  if(!date || !amt || Number(amt)<=0 || !desc){
    err.innerHTML = '<div class="error-msg">Please fill in all fields.</div>';
    return;
  }
  const {error} = await db.from('ajm_expenses').insert({
    branch_id: STATE.session.branchId,
    expense_date: date,
    amount: Number(amt),
    category: cat,
    description: desc,
    submitted_by: STATE.session.managerName,
    status: 'pending'
  });
  if(error){ err.innerHTML = '<div class="error-msg">Error: '+error.message+'</div>'; return; }
  closeSheet();
  toast('Expense submitted for CEO approval');
  render();
}

// ============ STAFF REGISTRY (shared: manager view = own branch, ceo view = all) ============
let STAFF_CACHE = [];

async function renderStaffTab(branchId, containerId, isCeo){
  let query = db.from('ajm_staff').select('*, ajm_branches(name)').order('created_at', {ascending:false});
  if(branchId) query = query.eq('branch_id', branchId);
  const {data, error} = await query;
  STAFF_CACHE = data || [];
  const container = document.getElementById(containerId);
  if(!container) return;

  const totalSalary = STAFF_CACHE.filter(s=>s.active).reduce((s,x)=>s+Number(x.salary||0),0);

  let html = `
    <div class="section-title">Staff Overview</div>
    <div class="stat-grid">
      <div class="stat-card"><div class="label">Total Staff</div><div class="value">${STAFF_CACHE.filter(s=>s.active).length}</div></div>
      <div class="stat-card"><div class="label">Monthly Salary Bill</div><div class="value">${money(totalSalary)}</div></div>
    </div>
    <button class="btn btn-primary" style="margin:14px 0;" onclick="openStaffForm(${branchId?`'${branchId}'`:'null'})">+ Add Staff Member</button>
  `;

  if(STAFF_CACHE.length===0){
    html += `<div class="empty-state"><div class="icon">👥</div><p>No staff records yet.</p></div>`;
  } else {
    STAFF_CACHE.forEach(s=>{
      html += `
        <div class="card">
          <div style="display:flex;gap:12px;">
            <div style="width:56px;height:56px;border-radius:12px;overflow:hidden;flex-shrink:0;background:var(--navy-deep);display:flex;align-items:center;justify-content:center;">
              ${s.photo_url ? `<img src="${s.photo_url}" style="width:100%;height:100%;object-fit:cover;">` : '<span style="font-size:22px;color:var(--text-dim);">?</span>'}
            </div>
            <div style="flex:1;">
              <div class="card-title">${s.full_name} ${!s.active?'<span class="pill pill-rejected">inactive</span>':''}</div>
              <div class="card-meta">${s.role||'Staff'} ${isCeo && s.ajm_branches ? '· '+s.ajm_branches.name : ''}</div>
            </div>
          </div>
          <div class="card-body">
            <b>Salary:</b> ${money(s.salary)}/month<br>
            <b>Address:</b> ${s.address||'-'}<br>
            <b>Guarantor:</b> ${s.guarantor_name||'-'} (${s.guarantor_contact||'-'})
          </div>
          <div class="card-actions">
            <button class="btn btn-outline btn-sm" onclick="toggleStaffActive('${s.id}', ${!s.active})">${s.active?'Mark Inactive':'Reactivate'}</button>
          </div>
        </div>
      `;
    });
  }
  container.innerHTML = html;
}

function openStaffForm(branchId){
  const branchOptions = STATE.branches.map(b=>`<option value="${b.id}" ${b.id===branchId?'selected':''}>${b.name}</option>`).join('');
  const branchField = STATE.session.type === 'ceo'
    ? `<div class="field"><label>Branch</label><select id="staff-branch">${branchOptions}</select></div>`
    : '';
  openSheet(`
    <div class="sheet-header"><h3>Add Staff Member</h3><div class="sheet-close" onclick="closeSheet()">&times;</div></div>
    <div id="staff-form-err"></div>
    ${branchField}
    <div class="field"><label>Photograph</label>
      <div class="photo-upload" id="staff-photo-preview">
        <span>Tap to upload photo</span>
        <input type="file" accept="image/*" id="staff-photo-input" onchange="previewStaffPhoto(event)">
      </div>
    </div>
    <div class="field"><label>Full Name</label><input type="text" id="staff-name" placeholder="e.g. Musa Ibrahim"></div>
    <div class="field"><label>Role</label><input type="text" id="staff-role" placeholder="e.g. Pump Attendant, Cashier"></div>
    <div class="field"><label>Address</label><textarea id="staff-address" placeholder="Residential address"></textarea></div>
    <div class="field"><label>Monthly Salary (₦)</label><input type="number" id="staff-salary" placeholder="e.g. 60000" min="0"></div>
    <div class="row-2">
      <div class="field"><label>Guarantor Name</label><input type="text" id="staff-guarantor-name" placeholder="Full name"></div>
      <div class="field"><label>Guarantor Contact</label><input type="text" id="staff-guarantor-contact" placeholder="Phone number"></div>
    </div>
    <button class="btn btn-primary" onclick="submitStaff(${branchId?`'${branchId}'`:'null'})">Save Staff Record</button>
  `);
}

let PENDING_STAFF_PHOTO_FILE = null;
function previewStaffPhoto(e){
  const file = e.target.files[0];
  if(!file) return;
  PENDING_STAFF_PHOTO_FILE = file;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    document.getElementById('staff-photo-preview').innerHTML =
      `<img src="${ev.target.result}"><input type="file" accept="image/*" id="staff-photo-input" onchange="previewStaffPhoto(event)" style="position:absolute;inset:0;opacity:0;">`;
  };
  reader.readAsDataURL(file);
}

async function submitStaff(defaultBranchId){
  const err = document.getElementById('staff-form-err');
  const branchSelect = document.getElementById('staff-branch');
  const branchId = branchSelect ? branchSelect.value : defaultBranchId;
  const name = document.getElementById('staff-name').value.trim();
  const role = document.getElementById('staff-role').value.trim();
  const address = document.getElementById('staff-address').value.trim();
  const salary = document.getElementById('staff-salary').value;
  const gName = document.getElementById('staff-guarantor-name').value.trim();
  const gContact = document.getElementById('staff-guarantor-contact').value.trim();

  if(!branchId || !name || !salary){
    err.innerHTML = '<div class="error-msg">Please fill in at least name, branch and salary.</div>';
    return;
  }

  let photoUrl = null;
  if(PENDING_STAFF_PHOTO_FILE){
    const fileName = 'staff_' + Date.now() + '_' + uid() + '.' + PENDING_STAFF_PHOTO_FILE.name.split('.').pop();
    const {data: upData, error: upErr} = await db.storage.from('ajm-photos').upload(fileName, PENDING_STAFF_PHOTO_FILE);
    if(upErr){
      err.innerHTML = '<div class="error-msg">Photo upload failed: '+upErr.message+'</div>';
      return;
    }
    const {data: pubUrl} = db.storage.from('ajm-photos').getPublicUrl(fileName);
    photoUrl = pubUrl.publicUrl;
  }

  const {error} = await db.from('ajm_staff').insert({
    branch_id: branchId,
    full_name: name,
    role: role || null,
    address: address || null,
    salary: Number(salary),
    guarantor_name: gName || null,
    guarantor_contact: gContact || null,
    photo_url: photoUrl,
    active: true
  });
  if(error){ err.innerHTML = '<div class="error-msg">Error: '+error.message+'</div>'; return; }
  PENDING_STAFF_PHOTO_FILE = null;
  closeSheet();
  toast('Staff member added');
  render();
}

async function toggleStaffActive(staffId, newActive){
  await db.from('ajm_staff').update({active:newActive}).eq('id', staffId);
  toast(newActive ? 'Staff reactivated' : 'Staff marked inactive');
  render();
}

// ============ CEO DASHBOARD DATA ============
let CEO_DATA_CACHE = {};

async function loadCeoData(){
  const [deliv, sales, remit, exp, staff, branches] = await Promise.all([
    db.from('ajm_deliveries').select('*, ajm_branches(name)').order('created_at', {ascending:false}),
    db.from('ajm_sales').select('*, ajm_branches(name)').order('created_at', {ascending:false}),
    db.from('ajm_remittances').select('*, ajm_branches(name)').order('created_at', {ascending:false}),
    db.from('ajm_expenses').select('*, ajm_branches(name)').order('created_at', {ascending:false}),
    db.from('ajm_staff').select('*'),
    db.from('ajm_branches').select('*').order('created_at'),
  ]);
  CEO_DATA_CACHE = {
    deliveries: deliv.data || [],
    sales: sales.data || [],
    remittances: remit.data || [],
    expenses: exp.data || [],
    staff: staff.data || [],
  };
  STATE.branches = branches.data || [];
}

function allPendingItems(){
  const items = [];
  CEO_DATA_CACHE.deliveries.filter(d=>d.status==='pending').forEach(d=>items.push({kind:'delivery', row:d}));
  CEO_DATA_CACHE.sales.filter(d=>d.status==='pending').forEach(d=>items.push({kind:'sale', row:d}));
  CEO_DATA_CACHE.remittances.filter(d=>d.status==='pending').forEach(d=>items.push({kind:'remittance', row:d}));
  CEO_DATA_CACHE.expenses.filter(d=>d.status==='pending').forEach(d=>items.push({kind:'expense', row:d}));
  items.sort((a,b)=> new Date(b.row.created_at) - new Date(a.row.created_at));
  return items;
}

function allFlaggedDiscrepancies(){
  return CEO_DATA_CACHE.remittances.filter(r=>r.status==='approved' && r.expected_amount!=null && Number(r.discrepancy) < -0.01);
}

// ============ RENDER: CEO DASHBOARD ============
async function renderCeoDashboard(){
  $app.innerHTML = '<div class="center-pad"><div class="loader"></div></div>';
  await loadCeoData();

  const pending = allPendingItems();
  const flagged = allFlaggedDiscrepancies();

  let html = `
    <div class="topbar">
      <div class="who">
        <div class="name">${CEO_NAME}</div>
        <div class="role">CEO / Admin</div>
      </div>
      <div class="icon-btn" onclick="logout()">Exit</div>
    </div>
    <div class="content" id="ceo-content">
  `;

  if(STATE.tab === 'home'){
    html += renderCeoHomeTab(pending, flagged);
  } else if(STATE.tab === 'approvals'){
    html += renderCeoApprovalsTab(pending);
  } else if(STATE.tab === 'branches'){
    html += renderCeoBranchesTab();
  } else if(STATE.tab === 'staff'){
    html += `<div id="staff-tab-content"><div class="center-pad"><div class="loader"></div></div></div>`;
  } else if(STATE.tab === 'audit'){
    html += renderCeoAuditTab();
  } else if(STATE.tab === 'settings'){
    html += renderCeoSettingsTab();
  }

  html += `</div>`;
  html += renderCeoBottomNav(pending.length);
  $app.innerHTML = html;

  if(STATE.tab === 'staff'){
    renderStaffTab(null, 'staff-tab-content', true);
  }
}

function branchTotals(branchId){
  const revenue = CEO_DATA_CACHE.sales.filter(s=>s.branch_id===branchId && s.status==='approved').reduce((s,x)=>s+Number(x.expected_revenue),0);
  const remitted = CEO_DATA_CACHE.remittances.filter(r=>r.branch_id===branchId && r.status==='approved').reduce((s,x)=>s+Number(x.amount_remitted),0);
  const expenses = CEO_DATA_CACHE.expenses.filter(e=>e.branch_id===branchId && e.status==='approved').reduce((s,x)=>s+Number(x.amount),0);
  const salaries = CEO_DATA_CACHE.staff.filter(s=>s.branch_id===branchId && s.active).reduce((s,x)=>s+Number(x.salary||0),0);
  const litresIn = CEO_DATA_CACHE.deliveries.filter(d=>d.branch_id===branchId && d.status==='approved').reduce((s,x)=>s+Number(x.litres),0);
  const litresOut = CEO_DATA_CACHE.sales.filter(s=>s.branch_id===branchId && s.status==='approved').reduce((s,x)=>s+Number(x.litres_sold),0);
  return {revenue, remitted, expenses, salaries, stock: litresIn-litresOut, profit: remitted - expenses - salaries};
}

function renderCeoHomeTab(pending, flagged){
  const totalRevenue = CEO_DATA_CACHE.sales.filter(s=>s.status==='approved').reduce((s,x)=>s+Number(x.expected_revenue),0);
  const totalRemitted = CEO_DATA_CACHE.remittances.filter(r=>r.status==='approved').reduce((s,x)=>s+Number(x.amount_remitted),0);
  const totalExpenses = CEO_DATA_CACHE.expenses.filter(e=>e.status==='approved').reduce((s,x)=>s+Number(x.amount),0);
  const totalSalaries = CEO_DATA_CACHE.staff.filter(s=>s.active).reduce((s,x)=>s+Number(x.salary||0),0);
  const gap = totalRevenue - totalRemitted;

  let flagHtml = '';
  if(flagged.length > 0){
    flagHtml = `
      <div class="discrepancy-banner">
        <div class="ic">⚠</div>
        <div class="txt"><b>${flagged.length} remittance shortfall${flagged.length>1?'s':''} detected.</b> Amount remitted was less than expected sales revenue on ${flagged.length} occasion${flagged.length>1?'s':''}. Review under Approvals → Discrepancy Log.</div>
      </div>
    `;
  }

  let branchCards = STATE.branches.map(b=>{
    const t = branchTotals(b.id);
    return `
      <div class="card">
        <div class="card-row"><div class="card-title">${b.name}</div><span class="pill ${t.profit>=0?'pill-approved':'pill-rejected'}">${t.profit>=0?'Profitable':'Loss'}</span></div>
        <div class="card-body">
          <b>Stock:</b> ${litres(t.stock)} &nbsp; <b>Revenue:</b> ${money(t.revenue)}<br>
          <b>Remitted:</b> ${money(t.remitted)} &nbsp; <b>Expenses:</b> ${money(t.expenses)}<br>
          <b>Net (after salaries):</b> ${money(t.profit)}
        </div>
      </div>
    `;
  }).join('');

  return `
    ${flagHtml}
    <div class="section-title">Company-Wide Summary (Approved)</div>
    <div class="stat-grid">
      <div class="stat-card"><div class="label">Total Revenue</div><div class="value">${money(totalRevenue)}</div></div>
      <div class="stat-card"><div class="label">Total Remitted</div><div class="value">${money(totalRemitted)}</div></div>
      <div class="stat-card ${gap>0?'alert':'good'}"><div class="label">Revenue Gap</div><div class="value">${money(gap)}</div></div>
      <div class="stat-card"><div class="label">Total Expenses</div><div class="value">${money(totalExpenses)}</div></div>
      <div class="stat-card"><div class="label">Monthly Salary Bill</div><div class="value">${money(totalSalaries)}</div></div>
      <div class="stat-card"><div class="label">Pending Approvals</div><div class="value">${pending.length}</div></div>
    </div>
    <div class="section-title">Branch Performance</div>
    ${branchCards}
  `;
}

function renderCeoApprovalsTab(pending){
  let flagged = allFlaggedDiscrepancies();
  return `
    <div class="tabs">
      <div class="tab ${(!STATE.approvalSubTab || STATE.approvalSubTab==='queue')?'active':''}" onclick="setApprovalSubTab('queue')">Pending</div>
      <div class="tab ${STATE.approvalSubTab==='discrepancy'?'active':''}" onclick="setApprovalSubTab('discrepancy')">Discrepancies</div>
      <div class="tab ${STATE.approvalSubTab==='records'?'active':''}" onclick="setApprovalSubTab('records')">Approved Reports</div>
    </div>
    ${STATE.approvalSubTab === 'discrepancy' ? renderDiscrepancyLog(flagged)
      : STATE.approvalSubTab === 'records' ? renderAllRecordsTab()
      : renderApprovalQueue(pending)}
  `;
}

function renderAllRecordsTab(){
  const branchOptions = '<option value="all">All Branches</option>' + STATE.branches.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
  const filterBranch = STATE.recordsFilterBranch || 'all';
  let html = `
    <p class="hint" style="color:var(--text-dim);font-size:12px;margin-bottom:14px;">This is a dedicated space for already-approved reports. Deleting here is permanent and cannot be undone — use it only to correct genuine errors after approval.</p>
    <div class="field"><label>Filter by Branch</label>
      <select id="records-branch-filter" onchange="setRecordsFilterBranch(this.value)">${branchOptions}</select>
    </div>
  `;

  const matches = (row) => (filterBranch === 'all' || row.branch_id === filterBranch) && row.status === 'approved';

  const sections = [
    {label:'Deliveries', kind:'delivery', rows: CEO_DATA_CACHE.deliveries.filter(matches), render: r=>litres(r.litres)+' @ '+money(r.price_per_litre)+'/L · '+fmtDate(r.delivery_date)},
    {label:'Sales', kind:'sale', rows: CEO_DATA_CACHE.sales.filter(matches), render: r=>litres(r.litres_sold)+' sold, revenue '+money(r.expected_revenue)+' · '+fmtDate(r.sale_date)},
    {label:'Remittances', kind:'remittance', rows: CEO_DATA_CACHE.remittances.filter(matches), render: r=>money(r.amount_remitted)+' remitted · '+fmtDate(r.remit_date)},
    {label:'Expenses', kind:'expense', rows: CEO_DATA_CACHE.expenses.filter(matches), render: r=>money(r.amount)+' — '+(r.category||'')+' · '+fmtDate(r.expense_date)},
  ];

  const totalApproved = sections.reduce((s,sec)=>s+sec.rows.length,0);
  if(totalApproved === 0){
    html += `<div class="empty-state"><div class="icon">✓</div><p>No approved reports yet for this filter.</p></div>`;
    return html;
  }

  sections.forEach(sec=>{
    html += `<div class="section-title">${sec.label} (${sec.rows.length})</div>`;
    if(sec.rows.length===0){
      html += `<div class="empty-state"><p>No approved ${sec.label.toLowerCase()}.</p></div>`;
    } else {
      sec.rows.forEach(r=>{
        html += `
          <div class="card">
            <div class="card-row">
              <div><div class="card-title">${r.ajm_branches?r.ajm_branches.name:''}</div><div class="card-meta">${sec.render(r)}</div></div>
              <span class="pill pill-approved">approved</span>
            </div>
            <div class="card-actions">
              <button class="btn btn-outline btn-sm" style="flex:1;color:#ff9d9f;border-color:#5c1f22;" onclick="confirmDeleteItem('${sec.kind}','${r.id}')">Delete This Report</button>
            </div>
          </div>
        `;
      });
    }
  });
  return html;
}

function setRecordsFilterBranch(v){ STATE.recordsFilterBranch = v; render(); }

function setApprovalSubTab(t){ STATE.approvalSubTab = t; render(); }

function renderApprovalQueue(pending){
  if(pending.length===0){
    return `<div class="empty-state"><div class="icon">✓</div><p>No pending reports. All caught up.</p></div>`;
  }
  return pending.map(item=>{
    const r = item.row;
    const branchName = r.ajm_branches ? r.ajm_branches.name : '';
    let title='', body='', flagBanner='';
    if(item.kind==='delivery'){
      title = 'Fuel Delivery — ' + litres(r.litres);
      body = 'Price: <b>'+money(r.price_per_litre)+'</b>/L · Supplier: '+(r.supplier||'-')+'<br>Date: '+fmtDate(r.delivery_date);
    } else if(item.kind==='sale'){
      title = 'Daily Sale — ' + litres(r.litres_sold)+' sold';
      body = 'Revenue: <b>'+money(r.expected_revenue)+'</b> at '+money(r.price_per_litre)+'/L<br>Date: '+fmtDate(r.sale_date);
    } else if(item.kind==='remittance'){
      title = 'Remittance — ' + money(r.amount_remitted);
      body = 'Date: '+fmtDate(r.remit_date);
      if(r.expected_amount!=null){
        body += '<br>Expected: <b>'+money(r.expected_amount)+'</b> · Difference: <b>'+money(r.discrepancy)+'</b>';
        if(Number(r.discrepancy) < -0.01){
          flagBanner = '<div class="discrepancy-banner" style="margin-top:10px;margin-bottom:0;"><div class="ic">⚠</div><div class="txt">This remittance is <b>'+money(Math.abs(r.discrepancy))+' short</b> of expected sales revenue.</div></div>';
        }
      }
      if(r.manager_note) body += '<br>Note: '+r.manager_note;
    } else if(item.kind==='expense'){
      title = 'Expense — ' + money(r.amount) + ' ('+(r.category||'')+')';
      body = r.description + '<br>Date: '+fmtDate(r.expense_date);
    }
    return `
      <div class="card">
        <div class="card-row">
          <div><div class="card-title">${title}</div><div class="card-meta">${branchName} · by ${r.submitted_by||'-'}</div></div>
          <span class="pill pill-pending">pending</span>
        </div>
        <div class="card-body">${body}</div>
        ${flagBanner}
        <div class="card-actions">
          <button class="btn btn-primary btn-sm" style="flex:1;" onclick="approveItem('${item.kind}','${r.id}')">Approve</button>
          <button class="btn btn-danger btn-sm" style="flex:1;" onclick="rejectItem('${item.kind}','${r.id}')">Reject</button>
        </div>
        <div class="card-actions">
          <button class="btn btn-outline btn-sm" style="flex:1;color:#ff9d9f;border-color:#5c1f22;" onclick="confirmDeleteItem('${item.kind}','${r.id}')">Delete Permanently</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderDiscrepancyLog(flagged){
  if(flagged.length===0){
    return `<div class="empty-state"><div class="icon">✓</div><p>No discrepancies recorded. All remittances match expected revenue.</p></div>`;
  }
  return flagged.map(r=>`
    <div class="card">
      <div class="card-row"><div class="card-title">${r.ajm_branches?r.ajm_branches.name:''}</div><span class="pill pill-flag">shortfall</span></div>
      <div class="card-body">
        <b>Date:</b> ${fmtDate(r.remit_date)}<br>
        <b>Expected:</b> ${money(r.expected_amount)}<br>
        <b>Remitted:</b> ${money(r.amount_remitted)}<br>
        <b>Shortfall:</b> ${money(Math.abs(r.discrepancy))}<br>
        ${r.manager_note ? '<b>Manager note:</b> '+r.manager_note : ''}
      </div>
    </div>
  `).join('');
}

async function approveItem(kind, id){
  const table = {delivery:'ajm_deliveries', sale:'ajm_sales', remittance:'ajm_remittances', expense:'ajm_expenses'}[kind];
  await db.from(table).update({status:'approved', approved_at: new Date().toISOString()}).eq('id', id);
  toast('Approved');
  render();
}
async function rejectItem(kind, id){
  const table = {delivery:'ajm_deliveries', sale:'ajm_sales', remittance:'ajm_remittances', expense:'ajm_expenses'}[kind];
  await db.from(table).update({status:'rejected'}).eq('id', id);
  toast('Rejected', 'error');
  render();
}

// ============ DELETE WITH CONFIRMATION ============
function confirmDeleteItem(kind, id){
  openSheet(`
    <div class="sheet-header"><h3>Delete Report?</h3><div class="sheet-close" onclick="closeSheet()">&times;</div></div>
    <div class="discrepancy-banner">
      <div class="ic">⚠</div>
      <div class="txt"><b>This action is permanent and cannot be undone.</b> If this report was already approved, deleting it will also remove it from all totals, stock calculations, and monthly audits. Only proceed if this entry was made in error or needs correction.</div>
    </div>
    <button class="btn btn-danger" onclick="executeDeleteItem('${kind}','${id}')">Yes, Delete This Report</button>
    <div style="height:10px;"></div>
    <button class="btn btn-outline" onclick="closeSheet()">Cancel</button>
  `);
}

async function executeDeleteItem(kind, id){
  const table = {delivery:'ajm_deliveries', sale:'ajm_sales', remittance:'ajm_remittances', expense:'ajm_expenses'}[kind];
  const {error} = await db.from(table).delete().eq('id', id);
  closeSheet();
  if(error){ toast('Error deleting: '+error.message, 'error'); return; }
  toast('Record deleted');
  render();
}

function renderCeoBranchesTab(){
  let html = `
    <div class="section-title">Manage Branches</div>
    <button class="btn btn-primary" style="margin-bottom:14px;" onclick="openBranchForm()">+ Add New Branch</button>
  `;
  STATE.branches.forEach(b=>{
    html += `
      <div class="card">
        <div class="card-title">${b.name}</div>
        <div class="card-meta">${b.location}</div>
        <div class="card-body">Manager PIN: <b>${b.manager_pin}</b> · Low stock alert below <b>${litres(b.low_stock_threshold)}</b></div>
        <div class="card-actions">
          <button class="btn btn-outline btn-sm" onclick="openEditBranchForm('${b.id}')">Edit</button>
        </div>
      </div>
    `;
  });
  return html;
}

function openBranchForm(){
  openSheet(`
    <div class="sheet-header"><h3>Add New Branch</h3><div class="sheet-close" onclick="closeSheet()">&times;</div></div>
    <div id="branch-form-err"></div>
    <div class="field"><label>Branch Name</label><input type="text" id="branch-name" placeholder="e.g. Bodija Branch"></div>
    <div class="field"><label>Location</label><input type="text" id="branch-location" placeholder="e.g. Bodija Area, Ibadan"></div>
    <div class="field"><label>Manager PIN (4 digits)</label><input type="text" inputmode="numeric" id="branch-pin" placeholder="e.g. 3333" maxlength="6"></div>
    <div class="field"><label>Low Stock Alert Threshold (Litres)</label><input type="number" id="branch-threshold" value="500"></div>
    <button class="btn btn-primary" onclick="submitNewBranch()">Create Branch</button>
  `);
}

async function submitNewBranch(){
  const name = document.getElementById('branch-name').value.trim();
  const loc = document.getElementById('branch-location').value.trim();
  const pin = document.getElementById('branch-pin').value.trim();
  const threshold = document.getElementById('branch-threshold').value;
  const err = document.getElementById('branch-form-err');
  if(!name || !loc || !pin){
    err.innerHTML = '<div class="error-msg">Please fill in all fields.</div>';
    return;
  }
  const {error} = await db.from('ajm_branches').insert({
    name, location: loc, manager_pin: pin, low_stock_threshold: Number(threshold)||500
  });
  if(error){ err.innerHTML = '<div class="error-msg">Error: '+error.message+'</div>'; return; }
  closeSheet();
  toast('Branch created');
  render();
}

function openEditBranchForm(branchId){
  const b = STATE.branches.find(x=>x.id===branchId);
  if(!b) return;
  openSheet(`
    <div class="sheet-header"><h3>Edit ${b.name}</h3><div class="sheet-close" onclick="closeSheet()">&times;</div></div>
    <div id="edit-branch-err"></div>
    <div class="field"><label>Branch Name</label><input type="text" id="edit-branch-name" value="${b.name}"></div>
    <div class="field"><label>Location</label><input type="text" id="edit-branch-location" value="${b.location}"></div>
    <div class="field"><label>Manager PIN</label><input type="text" inputmode="numeric" id="edit-branch-pin" value="${b.manager_pin}" maxlength="6"></div>
    <div class="field"><label>Low Stock Alert Threshold (Litres)</label><input type="number" id="edit-branch-threshold" value="${b.low_stock_threshold}"></div>
    <button class="btn btn-primary" onclick="submitEditBranch('${b.id}')">Save Changes</button>
  `);
}

async function submitEditBranch(id){
  const name = document.getElementById('edit-branch-name').value.trim();
  const loc = document.getElementById('edit-branch-location').value.trim();
  const pin = document.getElementById('edit-branch-pin').value.trim();
  const threshold = document.getElementById('edit-branch-threshold').value;
  const err = document.getElementById('edit-branch-err');
  if(!name || !loc || !pin){
    err.innerHTML = '<div class="error-msg">Please fill in all fields.</div>';
    return;
  }
  const {error} = await db.from('ajm_branches').update({
    name, location: loc, manager_pin: pin, low_stock_threshold: Number(threshold)||500
  }).eq('id', id);
  if(error){ err.innerHTML = '<div class="error-msg">Error: '+error.message+'</div>'; return; }
  closeSheet();
  toast('Branch updated');
  render();
}

// ============ MONTHLY AUDIT ============
function currentMonthValue(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}

function renderCeoAuditTab(){
  if(!STATE.auditMonth) STATE.auditMonth = currentMonthValue();
  if(!STATE.auditBranch) STATE.auditBranch = STATE.branches[0] ? STATE.branches[0].id : '';

  const branchOptions = STATE.branches.map(b=>`<option value="${b.id}" ${b.id===STATE.auditBranch?'selected':''}>${b.name}</option>`).join('');

  let html = `
    <div class="section-title">Monthly Audit</div>
    <div class="card">
      <div class="row-2">
        <div class="field"><label>Branch</label>
          <select id="audit-branch-select" onchange="setAuditBranch(this.value)">${branchOptions}</select>
        </div>
        <div class="field"><label>Month</label>
          <input type="month" id="audit-month-select" value="${STATE.auditMonth}" onchange="setAuditMonth(this.value)">
        </div>
      </div>
    </div>
  `;

  html += buildAuditReport(STATE.auditBranch, STATE.auditMonth);
  return html;
}

function setAuditBranch(v){ STATE.auditBranch = v; render(); }
function setAuditMonth(v){ STATE.auditMonth = v; render(); }

function buildAuditReport(branchId, monthValue){
  const branch = STATE.branches.find(b=>b.id===branchId);
  if(!branch) return '<div class="empty-state"><p>Select a branch to audit.</p></div>';

  const [year, month] = monthValue.split('-').map(Number);
  const monthStart = monthValue + '-01';
  const monthEndDate = new Date(year, month, 0); // last day of month
  const monthEnd = monthEndDate.toISOString().slice(0,10);

  const inRange = (dateStr) => dateStr >= monthStart && dateStr <= monthEnd;
  const beforeRange = (dateStr) => dateStr < monthStart;

  // Only consider approved records for the audit — this is the CEO's official reconciliation
  const deliveriesInMonth = CEO_DATA_CACHE.deliveries.filter(d=>d.branch_id===branchId && d.status==='approved' && inRange(d.delivery_date));
  const salesInMonth = CEO_DATA_CACHE.sales.filter(s=>s.branch_id===branchId && s.status==='approved' && inRange(s.sale_date));
  const remitInMonth = CEO_DATA_CACHE.remittances.filter(r=>r.branch_id===branchId && r.status==='approved' && inRange(r.remit_date));
  const expInMonth = CEO_DATA_CACHE.expenses.filter(e=>e.branch_id===branchId && e.status==='approved' && inRange(e.expense_date));

  // Opening stock = everything approved before this month
  const deliveriesBefore = CEO_DATA_CACHE.deliveries.filter(d=>d.branch_id===branchId && d.status==='approved' && beforeRange(d.delivery_date));
  const salesBefore = CEO_DATA_CACHE.sales.filter(s=>s.branch_id===branchId && s.status==='approved' && beforeRange(s.sale_date));
  const openingStock = deliveriesBefore.reduce((s,x)=>s+Number(x.litres),0) - salesBefore.reduce((s,x)=>s+Number(x.litres_sold),0);

  const litresIn = deliveriesInMonth.reduce((s,x)=>s+Number(x.litres),0);
  const litresOut = salesInMonth.reduce((s,x)=>s+Number(x.litres_sold),0);
  const closingStock = openingStock + litresIn - litresOut;

  const expectedRevenue = salesInMonth.reduce((s,x)=>s+Number(x.expected_revenue),0);
  const actualRemitted = remitInMonth.reduce((s,x)=>s+Number(x.amount_remitted),0);
  const totalExpenses = expInMonth.reduce((s,x)=>s+Number(x.amount),0);
  const activeStaffAtBranch = CEO_DATA_CACHE.staff.filter(s=>s.branch_id===branchId && s.active);
  const monthlySalaries = activeStaffAtBranch.reduce((s,x)=>s+Number(x.salary||0),0);

  const revenueGap = expectedRevenue - actualRemitted;
  const netProfit = actualRemitted - totalExpenses - monthlySalaries;

  const monthDiscrepancies = remitInMonth.filter(r=>r.expected_amount!=null && Number(r.discrepancy) < -0.01);
  const totalDeliveryCost = deliveriesInMonth.reduce((s,x)=>s+Number(x.litres)*Number(x.price_per_litre),0);

  const monthLabel = new Date(year, month-1, 1).toLocaleDateString('en-NG', {month:'long', year:'numeric'});

  let discrepancyRows = '';
  if(monthDiscrepancies.length > 0){
    discrepancyRows = monthDiscrepancies.map(r=>`
      <div class="card" style="border-color:#5c1f22;">
        <div class="card-title" style="color:#ff9d9f;">Shortfall on ${fmtDate(r.remit_date)}</div>
        <div class="card-body">Expected: <b>${money(r.expected_amount)}</b> · Remitted: <b>${money(r.amount_remitted)}</b> · Missing: <b>${money(Math.abs(r.discrepancy))}</b>
        ${r.manager_note ? '<br>Note: '+r.manager_note : ''}</div>
      </div>
    `).join('');
  } else {
    discrepancyRows = '<div class="empty-state"><p>No shortfalls this month. All remittances match expected revenue.</p></div>';
  }

  return `
    <div class="section-title">${branch.name} — ${monthLabel}</div>

    <div class="section-title" style="margin-top:12px;">Stock Reconciliation</div>
    <div class="stat-grid">
      <div class="stat-card"><div class="label">Opening Stock</div><div class="value">${litres(openingStock)}</div></div>
      <div class="stat-card"><div class="label">Delivered This Month</div><div class="value">${litres(litresIn)}</div></div>
      <div class="stat-card"><div class="label">Sold This Month</div><div class="value">${litres(litresOut)}</div></div>
      <div class="stat-card ${closingStock<0?'alert':''}"><div class="label">Closing Stock</div><div class="value">${litres(closingStock)}</div></div>
    </div>

    <div class="section-title" style="margin-top:18px;">Financial Reconciliation</div>
    <div class="stat-grid">
      <div class="stat-card"><div class="label">Cost of Fuel Delivered</div><div class="value">${money(totalDeliveryCost)}</div></div>
      <div class="stat-card"><div class="label">Expected Sales Revenue</div><div class="value">${money(expectedRevenue)}</div></div>
      <div class="stat-card"><div class="label">Actual Amount Remitted</div><div class="value">${money(actualRemitted)}</div></div>
      <div class="stat-card ${revenueGap>0?'alert':'good'}"><div class="label">Revenue Gap</div><div class="value">${money(revenueGap)}</div><div class="sub">${revenueGap>0?'Under-remitted':'Fully accounted'}</div></div>
      <div class="stat-card"><div class="label">Total Expenses</div><div class="value">${money(totalExpenses)}</div></div>
      <div class="stat-card"><div class="label">Salary Bill (${activeStaffAtBranch.length} staff)</div><div class="value">${money(monthlySalaries)}</div></div>
    </div>

    <div class="card" style="margin-top:14px;border-color:${netProfit>=0?'var(--success)':'var(--danger)'};">
      <div class="card-title">Net Result for ${monthLabel}</div>
      <div style="font-size:24px;font-weight:800;margin-top:6px;color:${netProfit>=0?'#7de3ab':'#ff9d9f'};">${money(netProfit)}</div>
      <div class="card-meta">Remitted minus expenses minus salaries</div>
    </div>

    <div class="section-title" style="margin-top:18px;">Discrepancies Flagged This Month</div>
    ${discrepancyRows}

    <div class="section-title" style="margin-top:18px;">Activity Count</div>
    <div class="stat-grid">
      <div class="stat-card"><div class="label">Deliveries Logged</div><div class="value">${deliveriesInMonth.length}</div></div>
      <div class="stat-card"><div class="label">Sales Days Logged</div><div class="value">${salesInMonth.length}</div></div>
      <div class="stat-card"><div class="label">Remittances Logged</div><div class="value">${remitInMonth.length}</div></div>
      <div class="stat-card"><div class="label">Expenses Logged</div><div class="value">${expInMonth.length}</div></div>
    </div>

    <button class="btn btn-gold" style="margin-top:16px;" onclick="copyAuditSummary('${branch.name}','${monthLabel}',${openingStock},${litresIn},${litresOut},${closingStock},${totalDeliveryCost},${expectedRevenue},${actualRemitted},${revenueGap},${totalExpenses},${monthlySalaries},${netProfit},${monthDiscrepancies.length})">Copy Audit Summary as Text</button>
  `;
}

function copyAuditSummary(branchName, monthLabel, openingStock, litresIn, litresOut, closingStock, deliveryCost, expectedRevenue, actualRemitted, revenueGap, totalExpenses, salaries, netProfit, discrepancyCount){
  const text = `AJM OIL AND GAS — MONTHLY AUDIT REPORT
Branch: ${branchName}
Period: ${monthLabel}
Prepared for: Ayobami Olujide (CEO)

STOCK RECONCILIATION
Opening Stock: ${litres(openingStock)}
Delivered This Month: ${litres(litresIn)}
Sold This Month: ${litres(litresOut)}
Closing Stock: ${litres(closingStock)}

FINANCIAL RECONCILIATION
Cost of Fuel Delivered: ${money(deliveryCost)}
Expected Sales Revenue: ${money(expectedRevenue)}
Actual Amount Remitted: ${money(actualRemitted)}
Revenue Gap: ${money(revenueGap)}
Total Expenses: ${money(totalExpenses)}
Salary Bill: ${money(salaries)}

NET RESULT: ${money(netProfit)}

Discrepancies Flagged: ${discrepancyCount}
`;
  navigator.clipboard.writeText(text).then(()=>{
    toast('Audit summary copied to clipboard');
  }).catch(()=>{
    toast('Could not copy — please screenshot instead', 'error');
  });
}

function renderCeoSettingsTab(){
  return `
    <div class="section-title">Account Settings</div>
    <div class="card">
      <div class="card-title">Change Admin Password</div>
      <div id="pass-change-err" style="margin-top:10px;"></div>
      <div class="field" style="margin-top:10px;"><label>Current Password</label><input type="password" id="current-pass"></div>
      <div class="field"><label>New Password</label><input type="password" id="new-pass"></div>
      <div class="field"><label>Confirm New Password</label><input type="password" id="confirm-pass"></div>
      <button class="btn btn-gold" onclick="changeCeoPassword()">Update Password</button>
    </div>
    <div class="section-title">About</div>
    <div class="card">
      <div class="card-body">
        AJM Oil and Gas Monitoring System<br>
        CEO: Ayobami Olujide<br>
        Head Office: Muslim Area, Ibadan<br>
        Branches: ${STATE.branches.length}
      </div>
    </div>
  `;
}

function changeCeoPassword(){
  const cur = document.getElementById('current-pass').value;
  const nw = document.getElementById('new-pass').value;
  const conf = document.getElementById('confirm-pass').value;
  const err = document.getElementById('pass-change-err');
  if(cur !== getCeoPass()){
    err.innerHTML = '<div class="error-msg">Current password is incorrect.</div>';
    return;
  }
  if(!nw || nw.length < 6){
    err.innerHTML = '<div class="error-msg">New password must be at least 6 characters.</div>';
    return;
  }
  if(nw !== conf){
    err.innerHTML = '<div class="error-msg">New password and confirmation do not match.</div>';
    return;
  }
  localStorage.setItem(CEO_PASS_KEY, nw);
  err.innerHTML = '';
  toast('Password updated successfully');
  render();
}

function renderCeoBottomNav(pendingCount){
  return `
    <div class="bottom-nav">
      <div class="nav-item ${STATE.tab==='home'?'active':''}" onclick="setCeoTab('home')">
        <div class="nav-icon">⌂</div><div class="nav-label">Home</div>
      </div>
      <div class="nav-item ${STATE.tab==='approvals'?'active':''}" onclick="setCeoTab('approvals')">
        <div class="nav-icon">✓</div><div class="nav-label">Approve</div>
        ${pendingCount>0?'<div class="badge-dot">'+pendingCount+'</div>':''}
      </div>
      <div class="nav-item ${STATE.tab==='audit'?'active':''}" onclick="setCeoTab('audit')">
        <div class="nav-icon">▦</div><div class="nav-label">Audit</div>
      </div>
      <div class="nav-item ${STATE.tab==='branches'?'active':''}" onclick="setCeoTab('branches')">
        <div class="nav-icon">⌘</div><div class="nav-label">Branches</div>
      </div>
      <div class="nav-item ${STATE.tab==='staff'?'active':''}" onclick="setCeoTab('staff')">
        <div class="nav-icon">☺</div><div class="nav-label">Staff</div>
      </div>
      <div class="nav-item ${STATE.tab==='settings'?'active':''}" onclick="setCeoTab('settings')">
        <div class="nav-icon">⚙</div><div class="nav-label">Setup</div>
      </div>
    </div>
  `;
}

function setCeoTab(tab){ STATE.tab = tab; STATE.approvalSubTab = 'queue'; render(); }

// ============ MASTER RENDER DISPATCH ============
function render(){
  switch(STATE.view){
    case 'splash': renderSplash(); break;
    case 'ceo-login': renderCeoLogin(); break;
    case 'mgr-login': renderMgrLogin(); break;
    case 'ceo-dashboard': renderCeoDashboard(); break;
    case 'mgr-dashboard': renderMgrDashboard(); break;
    default: renderSplash();
  }
}
