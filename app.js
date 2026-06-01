/* ================================================================
   INMOBILIARIA PRO — APP.JS
   Full Property & Tenant Management System
   ================================================================ */

'use strict';

const App = (() => {

  // ── STATE ──────────────────────────────────────────────────────
  let sb = null;           // Supabase client
  let currentUser = null;  // logged-in user object
  let currentPage = '';
  let confirmCallback = null;

  // ── SUPABASE SETUP ─────────────────────────────────────────────
  async function setupSupabase() {
    const url = document.getElementById('sb-url').value.trim();
    const key = document.getElementById('sb-key').value.trim();
    if (!url || !key) { toast('Ingresa URL y Key de Supabase', 'error'); return; }
    try {
      sb = supabase.createClient(url, key);
      // Test connection
      const { error } = await sb.from('app_users').select('id').limit(1);
      if (error && error.code !== 'PGRST116' && error.code !== '42501') throw error;
      localStorage.setItem('sb_url', url);
      localStorage.setItem('sb_key', key);
      document.getElementById('supabase-setup').classList.add('hidden');
      document.getElementById('login-screen').classList.remove('hidden');
      toast('Conectado a Supabase ✓', 'success');
    } catch(e) {
      toast('Error de conexión: ' + e.message, 'error');
    }
  }

  function initSupabase() {
    const url = localStorage.getItem('sb_url');
    const key = localStorage.getItem('sb_key');
    if (url && key) {
      sb = supabase.createClient(url, key);
      return true;
    }
    return false;
  }

  // ── DB HELPERS ─────────────────────────────────────────────────
  const DB = {
    async get(table, query = {}) {
      let q = sb.from(table).select('*');
      Object.entries(query).forEach(([k, v]) => { q = q.eq(k, v); });
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async getById(table, id) {
      const { data, error } = await sb.from(table).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    async insert(table, row) {
      const { data, error } = await sb.from(table).insert(row).select().single();
      if (error) throw error;
      return data;
    },
    async update(table, id, updates) {
      const { data, error } = await sb.from(table).update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    async delete(table, id) {
      const { error } = await sb.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    async count(table, query = {}) {
      let q = sb.from(table).select('*', { count: 'exact', head: true });
      Object.entries(query).forEach(([k, v]) => { q = q.eq(k, v); });
      const { count, error } = await q;
      if (error) return 0;
      return count || 0;
    }
  };

  // ── AUTH ───────────────────────────────────────────────────────
  async function login(e) {
    e.preventDefault();
    const rawInput = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;
    const errEl    = document.getElementById('login-error');
    errEl.classList.remove('show');
    try {
      let emailToUse = rawInput;
      if (!rawInput.includes('@')) {
        const { data: found, error: lookupErr } = await sb
          .from('app_users').select('email').eq('username', rawInput).maybeSingle();
        if (lookupErr) throw lookupErr;
        if (!found || !found.email) throw new Error('Usuario no encontrado. Verifica tu usuario o usa tu correo.');
        emailToUse = found.email;
      }
      const { data, error } = await sb.auth.signInWithPassword({ email: emailToUse, password });
      if (error) throw error;
      const { data: profile, error: profileError } = await sb
        .from('app_users').select('*').eq('id', data.user.id).single();
      if (profileError) throw profileError;
      if (!profile.active) throw new Error('Tu cuenta está desactivada. Contacta al administrador.');
      currentUser = profile;
      sessionStorage.setItem('current_user', JSON.stringify(profile));
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      initApp();
    } catch (err) {
      let msg = err.message;
      if (msg.includes('Invalid login credentials')) msg = 'Usuario o contraseña incorrectos.';
      if (msg.includes('Email not confirmed'))       msg = 'Correo no confirmado. Revisa tu bandeja.';
      errEl.textContent = msg;
      errEl.classList.add('show');
    }
  }

  function logout() {
    currentUser = null;
    sessionStorage.removeItem('current_user');
    if (sb) sb.auth.signOut();
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
  }

  function hashPassword(pass) {
    // Simple hash — in production use bcrypt on server
    let hash = 0;
    for (let i = 0; i < pass.length; i++) {
      hash = ((hash << 5) - hash) + pass.charCodeAt(i);
      hash |= 0;
    }
    return 'H' + Math.abs(hash).toString(16) + pass.length;
  }

  function isAdmin()         { return currentUser?.role === 'admin'; }
  function isSocio()         { return currentUser?.role === 'socio'; }
  function canManage()       { return isAdmin() || isSocio(); }
  function canSeeDocuments() { return canManage(); }
  function canEditUsers()    { return isAdmin(); }

  // ── INIT ───────────────────────────────────────────────────────
  async function initApp() {
    document.getElementById('sidebar-username').textContent = currentUser.display_name || currentUser.username;
    document.getElementById('sidebar-role').textContent = roleLabel(currentUser.role);
    document.getElementById('sidebar-avatar').textContent = (currentUser.display_name || currentUser.username)[0].toUpperCase();

    // Mostrar botón de configuración solo al admin
    const cfgBtn = document.getElementById('btn-config');
    if (cfgBtn) cfgBtn.style.display = isAdmin() ? '' : 'none';

    buildNav();

    // Página inicial según rol
    if (['inquilino'].includes(currentUser.role)) {
      navigate('mi-cuenta');
    } else if (['limpieza','seguridad','mantenimiento'].includes(currentUser.role)) {
      navigate('mi-cuenta');
    } else {
      navigate('dashboard'); // admin y socio van al dashboard principal
    }
  }

  function goConfig() {
    if (!canEditUsers()) { toast('No tienes permiso para acceder a Configuración.', 'error'); return; }
    navigate('configuracion');
  }

  function roleLabel(role) {
    const map = {
      admin: 'Administrador', socio: 'Socio',
      inquilino: 'Inquilino', limpieza: 'Personal de Limpieza',
      seguridad: 'Personal de Seguridad', mantenimiento: 'Mantenimiento'
    };
    return map[role] || role;
  }

  function buildNav() {
    const role = currentUser.role;
    const nav = document.getElementById('sidebar-nav');

    const adminNav = `
      <span class="nav-section-label">Principal</span>
      <div class="nav-item" data-page="dashboard">
        <span class="nav-icon">🏠</span> Dashboard
      </div>
      <div class="nav-item" data-page="inmuebles">
        <span class="nav-icon">🏗️</span> Inmuebles
      </div>
      <div class="nav-item" data-page="PEDIDOS">
        <span class="nav-icon">👥</span> PEDIDOS
      </div>
      <span class="nav-section-label">Personal</span>
      <div class="nav-item" data-page="personal">
        <span class="nav-icon">👷</span> Personal
      </div>
      <span class="nav-section-label">Finanzas</span>
      <div class="nav-item" data-page="finanzas">
        <span class="nav-icon">💰</span> Finanzas
      </div>
      <div class="nav-item" data-page="pagos">
        <span class="nav-icon">💳</span> Pagos & Cobros
      </div>
      <div class="nav-item" data-page="reportes">
        <span class="nav-icon">📊</span> Reportes
      </div>
      <span class="nav-section-label">Portal</span>
      <div class="nav-item" data-page="portal">
        <span class="nav-icon">🌐</span> Portal Público
      </div>
      <div class="nav-item" data-page="paquetes">
        <span class="nav-icon">📦</span> Paquetes
      </div>
      <span class="nav-section-label">Admin</span>
      <div class="nav-item" data-page="usuarios">
        <span class="nav-icon">🔑</span> Usuarios
      </div>
      <div class="nav-item" data-page="configuracion">
        <span class="nav-icon">⚙️</span> Configuración
      </div>
    `;

    const socioNav = `
      <span class="nav-section-label">Principal</span>
      <div class="nav-item" data-page="dashboard">
        <span class="nav-icon">🏠</span> Dashboard
      </div>
      <div class="nav-item" data-page="inmuebles">
        <span class="nav-icon">🏗️</span> Inmuebles
      </div>
      <div class="nav-item" data-page="PEDIDOS">
        <span class="nav-icon">👥</span> PEDIDOS
      </div>
      <span class="nav-section-label">Personal</span>
      <div class="nav-item" data-page="personal">
        <span class="nav-icon">👷</span> Personal
      </div>
      <span class="nav-section-label">Finanzas</span>
      <div class="nav-item" data-page="finanzas">
        <span class="nav-icon">💰</span> Finanzas
      </div>
      <div class="nav-item" data-page="pagos">
        <span class="nav-icon">💳</span> Pagos & Cobros
      </div>
      <div class="nav-item" data-page="reportes">
        <span class="nav-icon">📊</span> Reportes
      </div>
      <span class="nav-section-label">Portal</span>
      <div class="nav-item" data-page="portal">
        <span class="nav-icon">🌐</span> Portal Público
      </div>
      <div class="nav-item" data-page="paquetes">
        <span class="nav-icon">📦</span> Paquetes
      </div>
      <span class="nav-section-label">Socio</span>
      <div class="nav-item" data-page="socio-dashboard">
        <span class="nav-icon">📈</span> Mis Ganancias
      </div>
      <div class="nav-item" data-page="socio-ganancias">
        <span class="nav-icon">🏷️</span> Compra / Venta
      </div>
      <div class="nav-item" data-page="socio-PEDIDOS">
        <span class="nav-icon">📊</span> Balance PEDIDOS
      </div>
    `;

    const inquilinoNav = `
      <span class="nav-section-label">Mi Cuenta</span>
      <div class="nav-item" data-page="mi-cuenta">
        <span class="nav-icon">👤</span> Mi Información
      </div>
      <div class="nav-item" data-page="mis-pagos">
        <span class="nav-icon">💳</span> Mis Pagos
      </div>
      <div class="nav-item" data-page="mis-servicios">
        <span class="nav-icon">🛎️</span> Mis Servicios
      </div>
    `;

    const personalNav = `
      <span class="nav-section-label">Mi Panel</span>
      <div class="nav-item" data-page="mi-cuenta">
        <span class="nav-icon">👤</span> Mi Información
      </div>
      <div class="nav-item" data-page="mis-asignaciones">
        <span class="nav-icon">📋</span> Mis Asignaciones
      </div>
    `;

    if (role === 'admin') nav.innerHTML = adminNav;
    else if (role === 'socio') nav.innerHTML = socioNav;
    else if (role === 'inquilino') nav.innerHTML = inquilinoNav;
    else nav.innerHTML = personalNav;

    nav.querySelectorAll('.nav-item[data-page]').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.page));
    });
  }

  // ── NAVIGATION ─────────────────────────────────────────────────
  function navigate(page, params = {}) {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
    const titles = {
      dashboard: ['Dashboard', 'Inicio / Dashboard'],
      inmuebles: ['Inmuebles', 'Inicio / Inmuebles'],
      PEDIDOS: ['PEDIDOS', 'Inicio / PEDIDOS'],
      personal: ['Personal', 'Inicio / Personal'],
      finanzas: ['Finanzas', 'Inicio / Finanzas'],
      pagos: ['Pagos & Cobros', 'Inicio / Pagos'],
      reportes: ['Reportes', 'Inicio / Reportes'],
      portal: ['Portal Público', 'Inicio / Portal'],
      paquetes: ['Paquetes', 'Inicio / Paquetes'],
      usuarios: ['Usuarios', 'Inicio / Usuarios'],
      configuracion: ['Configuración', 'Inicio / Configuración'],
      'socio-dashboard': ['Mi Dashboard', 'Panel Socio'],
      'socio-ganancias': ['Ganancias Compra/Venta', 'Panel Socio'],
      'socio-PEDIDOS': ['Ganancias PEDIDOS', 'Panel Socio'],
      'mi-cuenta': ['Mi Cuenta', 'Mi Panel'],
      'mis-pagos': ['Mis Pagos', 'Mi Panel'],
      'mis-servicios': ['Mis Servicios', 'Mi Panel'],
      'mis-asignaciones': ['Mis Asignaciones', 'Mi Panel'],
    };
    const [title, breadcrumb] = titles[page] || [page, page];
    document.getElementById('topbar-title').textContent = title;
    document.getElementById('topbar-breadcrumb').textContent = breadcrumb;
    closeSidebar();
    const content = document.getElementById('page-content');
    content.innerHTML = `<div class="loading-overlay"><div class="spinner"></div></div>`;
    Pages[page] ? Pages[page](params) : (content.innerHTML = `<div class="empty-state"><div class="empty-icon">🚧</div><h4>Página en desarrollo</h4></div>`);
  }

  // ── SIDEBAR MOBILE ──────────────────────────────────────────────
  function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('open');
  }
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
  }

  // ── MODAL ───────────────────────────────────────────────────────
  function openModal(title, bodyHTML, footerHTML = '', size = '') {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-footer').innerHTML = footerHTML;
    const m = document.getElementById('modal');
    m.className = 'modal' + (size ? ' modal-' + size : '');
    document.getElementById('modal-overlay').classList.add('open');
  }
  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  }
  function confirm(msg, cb, title = 'Confirmar eliminación') {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent = msg;
    confirmCallback = cb;
    document.getElementById('confirm-overlay').classList.add('open');
  }
  function closeConfirm() {
    document.getElementById('confirm-overlay').classList.remove('open');
    confirmCallback = null;
  }
  function doConfirm() {
    closeConfirm();
    if (confirmCallback) confirmCallback();
  }

  // ── TOAST ───────────────────────────────────────────────────────
  function toast(msg, type = 'info') {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  // ── UTILS ───────────────────────────────────────────────────────
  function fmt(n) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);
  }
  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
  function escHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  }
  function fileToBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }
  function showNotifications() { toast('No hay notificaciones nuevas', 'info'); }

  // ── UPLOAD FILE TO SUPABASE STORAGE ────────────────────────────
  async function uploadFile(file, bucket, path) {
    const { data, error } = await sb.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: url } = sb.storage.from(bucket).getPublicUrl(path);
    return url.publicUrl;
  }

  // ════════════════════════════════════════════════════════════════
  // PAGES
  // ════════════════════════════════════════════════════════════════
  const Pages = {};

  // ── DASHBOARD ───────────────────────────────────────────────────
  Pages.dashboard = async function() {
    const pc = document.getElementById('page-content');
    try {
      const [props, tenants, staff, payments] = await Promise.all([
        DB.get('properties'),
        DB.get('tenants'),
        DB.get('staff'),
        DB.get('payments')
      ]);
      const totalRent = tenants.reduce((s, t) => s + (t.monthly_rent || 0), 0);
      const pendingPayments = payments.filter(p => p.status === 'pending');
      const totalPending = pendingPayments.reduce((s, p) => s + (p.amount || 0), 0);
      const paidThisMonth = payments.filter(p => {
        const d = new Date(p.created_at);
        const now = new Date();
        return p.status === 'paid' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce((s, p) => s + (p.amount || 0), 0);

      pc.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card gold">
            <div class="stat-icon">🏗️</div>
            <div class="stat-value">${props.length}</div>
            <div class="stat-label">Inmuebles</div>
          </div>
          <div class="stat-card blue">
            <div class="stat-icon">👥</div>
            <div class="stat-value">${tenants.length}</div>
            <div class="stat-label">PEDIDOS Activos</div>
          </div>
          <div class="stat-card green">
            <div class="stat-icon">💰</div>
            <div class="stat-value">${fmt(paidThisMonth)}</div>
            <div class="stat-label">Cobrado Este Mes</div>
          </div>
          <div class="stat-card red">
            <div class="stat-icon">⚠️</div>
            <div class="stat-value">${fmt(totalPending)}</div>
            <div class="stat-label">Pendiente de Cobro</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:24px">
          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title">Contratos</div>
                <div class="card-subtitle">Últimos registrados</div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="App.navigate('inmuebles')">Ver todos →</button>
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Nombre</th><th>Tipo</th><th>PEDIDOS</th><th>Estado</th></tr></thead>
                <tbody>
                  ${props.slice(0,5).map(p => `
                    <tr>
                      <td class="td-name">${escHtml(p.name)}</td>
                      <td>${escHtml(p.type || '—')}</td>
                      <td>${tenants.filter(t => t.property_id === p.id).length}</td>
                      <td><span class="badge badge-${p.status === 'activo' ? 'green' : 'gray'}">${p.status || 'activo'}</span></td>
                    </tr>
                  `).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">Sin inmuebles</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <div class="card-title">Resumen Mensual</div>
            </div>
            <div class="finance-summary" style="grid-template-columns:1fr">
              <div class="finance-item income">
                <div class="fi-label">Renta Total Mensual</div>
                <div class="fi-val">${fmt(totalRent)}</div>
              </div>
              <div class="finance-item">
                <div class="fi-label">Personal</div>
                <div class="fi-val" style="color:var(--text-secondary);font-size:18px">${staff.length} personas</div>
              </div>
              <div class="finance-item expense">
                <div class="fi-label">Pagos Pendientes</div>
                <div class="fi-val">${fmt(totalPending)}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">Pagos Recientes</div>
            <button class="btn btn-secondary btn-sm" onclick="App.navigate('pagos')">Ver todos →</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Inquilino</th><th>Concepto</th><th>Monto</th><th>Fecha</th><th>Estado</th></tr></thead>
              <tbody>
                ${payments.slice(0,8).map(p => {
                  const tenant = tenants.find(t => t.id === p.tenant_id);
                  return `<tr>
                    <td class="td-name">${tenant ? escHtml(tenant.name) : '—'}</td>
                    <td>${escHtml(p.concept || 'Renta')}</td>
                    <td class="text-mono">${fmt(p.amount)}</td>
                    <td>${fmtDate(p.payment_date || p.created_at)}</td>
                    <td><span class="badge badge-${p.status === 'paid' ? 'green' : p.status === 'pending' ? 'gold' : 'red'}">${p.status === 'paid' ? 'Pagado' : p.status === 'pending' ? 'Pendiente' : 'Vencido'}</span></td>
                  </tr>`;
                }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Sin pagos registrados</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch(e) {
      pc.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h4>Error cargando datos</h4><p>${e.message}</p></div>`;
    }
  };

  // ── INMUEBLES ────────────────────────────────────────────────────
  Pages.inmuebles = async function() {
    const pc = document.getElementById('page-content');
    try {
      const props = await DB.get('properties');
      pc.innerHTML = `
        <div class="section-header">
          <div>
            <div class="section-title">Inmuebles</div>
            <div class="section-subtitle">${props.length} inmueble(s) registrado(s)</div>
          </div>
          ${canManage() ? `<button class="btn btn-primary" onclick="App.modals.newProperty()">＋ Agregar Inmueble</button>` : ''}
        </div>
        <div class="toolbar">
          <div class="toolbar-left">
            <div class="search-bar">
              <span class="search-icon">🔍</span>
              <input type="text" id="prop-search" placeholder="Buscar inmueble..." oninput="App.filterProperties()"/>
            </div>
          </div>
          <div class="toolbar-right">
            <button class="btn btn-secondary btn-sm" onclick="App.exportPropertiesExcel()">📊 Excel</button>
          </div>
        </div>
        <div class="property-grid" id="property-grid">
          ${props.length ? '' : `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🏗️</div><h4>Sin inmuebles</h4><p>Agrega tu primer inmueble para comenzar.</p></div>`}
        </div>
      `;
      renderPropertyCards(props);
    } catch(e) {
      pc.innerHTML = errorState(e);
    }
  };

  function renderPropertyCards(props) {
    const grid = document.getElementById('property-grid');
    if (!grid) return;
    if (!props.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🏗️</div><h4>Sin inmuebles</h4><p>Agrega tu primer inmueble.</p></div>`;
      return;
    }
    grid.innerHTML = props.map(p => {
      const imgHtml = p.photos?.[0]
        ? `<img src="${p.photos[0]}" alt="${escHtml(p.name)}" style="width:100%;height:100%;object-fit:cover"/>`
        : `<div class="property-img-placeholder">🏢</div>`;
      return `
        <div class="property-card">
          <div class="property-img">
            ${imgHtml}
            <div class="property-status-badge">
              <span class="badge badge-${p.status === 'activo' ? 'green' : p.status === 'disponible' ? 'blue' : 'gray'}">${p.status || 'activo'}</span>
            </div>
          </div>
          <div class="property-body">
            <div class="property-name">${escHtml(p.name)}</div>
            <div class="property-type">${escHtml(p.type || '')} · ${escHtml(p.address || '')}</div>
            <div class="property-meta">
              <div class="property-meta-item">🛏️ ${p.rooms || 0} cuartos</div>
              <div class="property-meta-item">🚿 ${p.baths || 0} baños</div>
              <div class="property-meta-item">📐 ${p.area || 0} m²</div>
            </div>
            <div class="property-price">${fmt(p.price)}<span>/mes</span></div>
          </div>
          <div class="property-actions">
            <button class="btn btn-secondary btn-sm flex-1" onclick="App.navigate('inmueble-detalle', {id:'${p.id}'})">Ver Detalle</button>
            ${canManage() ? `
            <button class="btn btn-secondary btn-sm" onclick="App.modals.editProperty('${p.id}')" title="Editar">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="App.deleteProperty('${p.id}')" title="Eliminar">🗑️</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  async function filterProperties() {
    const q = document.getElementById('prop-search')?.value.toLowerCase() || '';
    const props = await DB.get('properties');
    renderPropertyCards(props.filter(p =>
      p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q) || p.type?.toLowerCase().includes(q)
    ));
  }

  // ── INMUEBLE DETAIL ──────────────────────────────────────────────
  Pages['inmueble-detalle'] = async function(params) {
    const pc = document.getElementById('page-content');
    try {
      const prop = await DB.getById('properties', params.id);
      const tenants = await DB.get('tenants', { property_id: params.id });
      const staffAssigned = await DB.get('staff_assignments', { property_id: params.id });
      const expenses = await DB.get('property_expenses', { property_id: params.id });
      const docs = canSeeDocuments() ? await DB.get('documents', { entity_id: params.id, entity_type: 'property' }) : [];

      const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const totalRent = tenants.reduce((s, t) => s + (t.monthly_rent || 0), 0);

      pc.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
          <button class="btn btn-secondary btn-sm" onclick="App.navigate('inmuebles')">← Volver</button>
          ${canManage() ? `
          <button class="btn btn-primary btn-sm" onclick="App.modals.editProperty('${prop.id}')">✏️ Editar</button>
          <button class="btn btn-secondary btn-sm" onclick="App.Reports.propertyReport('${prop.id}')">📄 Reporte PDF</button>
          <button class="btn btn-secondary btn-sm" onclick="App.Reports.propertyExcel('${prop.id}')">📊 Reporte Excel</button>
          ` : ''}
        </div>

        <div class="detail-header">
          <div class="avatar-lg" style="font-size:26px;background:linear-gradient(135deg,var(--gold-dim),var(--gold))">🏢</div>
          <div class="detail-info">
            <h2>${escHtml(prop.name)}</h2>
            <p>${escHtml(prop.type || '')} · ${escHtml(prop.address || '')} · ${escHtml(prop.city || '')}</p>
          </div>
          <span class="badge badge-${prop.status === 'activo' ? 'green' : 'gray'}" style="margin-left:auto">${prop.status || 'activo'}</span>
        </div>

        <div class="tabs" style="margin-bottom:20px">
          <button class="tab-btn active" onclick="switchTab(this,'tab-info')">Información</button>
          <button class="tab-btn" onclick="switchTab(this,'tab-tenants')">PEDIDOS (${tenants.length})</button>
          <button class="tab-btn" onclick="switchTab(this,'tab-staff')">Personal</button>
          <button class="tab-btn" onclick="switchTab(this,'tab-finance')">Finanzas</button>
          <button class="tab-btn" onclick="switchTab(this,'tab-photos')">Fotos</button>
          ${canSeeDocuments() ? `<button class="tab-btn" onclick="switchTab(this,'tab-docs')">Documentos (${docs.length})</button>` : ''}
        </div>

        <!-- TAB: Info -->
        <div class="tab-content active" id="tab-info">
          <div class="card mb-16">
            <div class="card-header"><div class="card-title">Datos del Inmueble</div></div>
            <div class="info-grid">
              <div class="info-item"><div class="ii-label">Nombre</div><div class="ii-val">${escHtml(prop.name)}</div></div>
              <div class="info-item"><div class="ii-label">Tipo</div><div class="ii-val">${escHtml(prop.type||'—')}</div></div>
              <div class="info-item"><div class="ii-label">Dirección</div><div class="ii-val">${escHtml(prop.address||'—')}</div></div>
              <div class="info-item"><div class="ii-label">Ciudad</div><div class="ii-val">${escHtml(prop.city||'—')}</div></div>
              <div class="info-item"><div class="ii-label">Precio Renta</div><div class="ii-val text-gold">${fmt(prop.price)}/mes</div></div>
              <div class="info-item"><div class="ii-label">Habitaciones</div><div class="ii-val">${prop.rooms||0}</div></div>
              <div class="info-item"><div class="ii-label">Baños</div><div class="ii-val">${prop.baths||0}</div></div>
              <div class="info-item"><div class="ii-label">Área</div><div class="ii-val">${prop.area||0} m²</div></div>
              <div class="info-item"><div class="ii-label">Registro</div><div class="ii-val">${fmtDate(prop.created_at)}</div></div>
            </div>
            ${prop.description ? `<div style="margin-top:12px"><div class="ii-label mb-4">Descripción</div><p style="color:var(--text-secondary);font-size:13.5px;line-height:1.7">${escHtml(prop.description)}</p></div>` : ''}
          </div>
        </div>

        <!-- TAB: Tenants -->
        <div class="tab-content" id="tab-tenants">
          <div class="toolbar">
            <div class="card-title">PEDIDOS del Inmueble</div>
            ${canManage() ? `<button class="btn btn-primary btn-sm" onclick="App.modals.newTenant('${prop.id}')">＋ Agregar Inquilino</button>` : ''}
          </div>
          <div class="card">
            <div class="table-wrap">
              <table>
                <thead><tr><th>Nombre</th><th>Cuarto</th><th>Renta</th><th>Desde</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                  ${tenants.map(t => `
                    <tr>
                      <td class="td-name">${escHtml(t.name)}</td>
                      <td>${escHtml(t.room||'—')}</td>
                      <td class="text-mono">${fmt(t.monthly_rent)}</td>
                      <td>${fmtDate(t.move_in_date)}</td>
                      <td><span class="badge badge-${t.status==='activo'?'green':'gray'}">${t.status||'activo'}</span></td>
                      <td><button class="btn btn-secondary btn-xs" onclick="App.navigate('inquilino-detalle',{id:'${t.id}'})">Ver →</button></td>
                    </tr>
                  `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">Sin PEDIDOS</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB: Staff -->
        <div class="tab-content" id="tab-staff">
          <div class="card">
            <div class="card-header">
              <div class="card-title">Personal Asignado</div>
              ${canManage() ? `<button class="btn btn-primary btn-sm" onclick="App.modals.assignStaff('${prop.id}')">＋ Asignar Personal</button>` : ''}
            </div>
            <div id="staff-list-${prop.id}">
              <div class="loading-overlay"><div class="spinner"></div></div>
            </div>
          </div>
        </div>

        <!-- TAB: Finance -->
        <div class="tab-content" id="tab-finance">
          <div class="finance-summary">
            <div class="finance-item income">
              <div class="fi-label">Renta Total Mensual</div>
              <div class="fi-val">${fmt(totalRent)}</div>
            </div>
            <div class="finance-item expense">
              <div class="fi-label">Gastos Totales</div>
              <div class="fi-val">${fmt(totalExpenses)}</div>
            </div>
            <div class="finance-item balance">
              <div class="fi-label">Balance</div>
              <div class="fi-val">${fmt(totalRent - totalExpenses)}</div>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <div class="card-title">Gastos del Inmueble</div>
              ${canManage() ? `<button class="btn btn-primary btn-sm" onclick="App.modals.newExpense('${prop.id}')">＋ Agregar Gasto</button>` : ''}
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Concepto</th><th>Monto</th><th>Fecha</th><th>Categoría</th>${canManage()?'<th></th>':''}</tr></thead>
                <tbody>
                  ${expenses.map(e => `
                    <tr>
                      <td class="td-name">${escHtml(e.concept)}</td>
                      <td class="text-mono">${fmt(e.amount)}</td>
                      <td>${fmtDate(e.expense_date||e.created_at)}</td>
                      <td><span class="badge badge-gray">${escHtml(e.category||'—')}</span></td>
                      ${canManage()?`<td><button class="btn btn-danger btn-xs" onclick="App.deleteExpense('${e.id}','${prop.id}')">🗑️</button></td>`:''}
                    </tr>
                  `).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Sin gastos registrados</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB: Photos -->
        <div class="tab-content" id="tab-photos">
          <div class="card">
            <div class="card-header">
              <div class="card-title">Galería de Fotos</div>
              ${canManage() ? `<label class="btn btn-primary btn-sm" style="cursor:pointer">📷 Subir Fotos<input type="file" multiple accept="image/*" style="display:none" onchange="App.uploadPropertyPhotos(this,'${prop.id}')"/></label>` : ''}
            </div>
            <div class="photo-grid" id="photo-grid-${prop.id}">
              ${(prop.photos||[]).map(url => `
                <div class="photo-thumb">
                  <img src="${url}" alt="foto"/>
                  ${canManage()?`<button class="photo-thumb-del" onclick="App.deletePropertyPhoto('${prop.id}','${url}')">✕</button>`:''}
                </div>
              `).join('') || '<p style="color:var(--text-muted);font-size:13px">Sin fotos</p>'}
            </div>
          </div>
        </div>

        ${canSeeDocuments() ? `
        <!-- TAB: Documents -->
        <div class="tab-content" id="tab-docs">
          <div class="card">
            <div class="card-header">
              <div class="card-title">Documentación</div>
              ${canManage() ? `<button class="btn btn-primary btn-sm" onclick="App.modals.uploadDocument('${prop.id}','property')">＋ Subir Documento</button>` : ''}
            </div>
            <div id="docs-list-${prop.id}-property">
              ${renderDocsList(docs, prop.id, 'property')}
            </div>
          </div>
        </div>
        ` : ''}
      `;

      // Load staff list
      loadStaffForProperty(prop.id, staffAssigned);
    } catch(e) {
      pc.innerHTML = errorState(e);
    }
  };

  async function loadStaffForProperty(propId, assignments) {
    const container = document.getElementById(`staff-list-${propId}`);
    if (!container) return;
    try {
      if (!assignments.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">👷</div><h4>Sin personal asignado</h4></div>`;
        return;
      }
      const allStaff = await DB.get('staff');
      const rows = assignments.map(a => {
        const s = allStaff.find(x => x.id === a.staff_id);
        if (!s) return '';
        return `<div class="doc-item">
          <div class="avatar">${(s.name||'?')[0]}</div>
          <div class="doc-info">
            <div class="doc-name">${escHtml(s.name)}</div>
            <div class="doc-meta">${roleLabel(s.role)} · ${escHtml(s.phone||'')}</div>
          </div>
          <div class="doc-actions">
            <span class="badge badge-${s.role==='limpieza'?'purple':s.role==='seguridad'?'gold':'blue'}">${roleLabel(s.role)}</span>
            ${canManage()?`<button class="btn btn-danger btn-xs" onclick="App.removeStaffAssignment('${a.id}','${propId}')">✕</button>`:''}
          </div>
        </div>`;
      }).join('');
      container.innerHTML = rows || `<div class="empty-state"><div class="empty-icon">👷</div><h4>Sin personal</h4></div>`;
    } catch(e) {
      container.innerHTML = `<p style="color:var(--danger)">Error: ${e.message}</p>`;
    }
  }

  function renderDocsList(docs, entityId, entityType) {
    if (!docs.length) return `<div class="empty-state"><div class="empty-icon">📄</div><h4>Sin documentos</h4></div>`;
    return docs.map(d => `
      <div class="doc-item">
        <div class="doc-icon">${d.type === 'pdf' ? '📄' : d.type === 'image' ? '🖼️' : '📁'}</div>
        <div class="doc-info">
          <div class="doc-name">${escHtml(d.name)}</div>
          <div class="doc-meta">${escHtml(d.category||'')} · ${fmtDate(d.created_at)}</div>
        </div>
        <div class="doc-actions">
          <a href="${d.url}" target="_blank" class="btn btn-secondary btn-xs">⬇️ Ver</a>
          ${canManage()?`<button class="btn btn-danger btn-xs" onclick="App.deleteDocument('${d.id}','${entityId}','${entityType}')">🗑️</button>`:''}
        </div>
      </div>
    `).join('');
  }

  // ── PEDIDOS ───────────────────────────────────────────────────
  Pages.PEDIDOS = async function() {
    const pc = document.getElementById('page-content');
    try {
      const [tenants, props] = await Promise.all([DB.get('tenants'), DB.get('properties')]);
      pc.innerHTML = `
        <div class="section-header">
          <div>
            <div class="section-title">PEDIDOS</div>
            <div class="section-subtitle">${tenants.length} inquilino(s)</div>
          </div>
          ${canManage() ? `<button class="btn btn-primary" onclick="App.modals.newTenant()">＋ Agregar Inquilino</button>` : ''}
        </div>
        <div class="toolbar">
          <div class="toolbar-left">
            <div class="search-bar">
              <span class="search-icon">🔍</span>
              <input type="text" id="tenant-search" placeholder="Buscar inquilino..." oninput="App.filterTenants()"/>
            </div>
            <select class="form-control" style="width:180px" id="tenant-prop-filter" onchange="App.filterTenants()">
              <option value="">Todos los inmuebles</option>
              ${props.map(p => `<option value="${p.id}">${escHtml(p.name)}</option>`).join('')}
            </select>
          </div>
          <div class="toolbar-right">
            <button class="btn btn-secondary btn-sm" onclick="App.exportTenantsExcel()">📊 Excel</button>
          </div>
        </div>
        <div class="card">
          <div class="table-wrap">
            <table id="tenants-table">
              <thead><tr><th>Nombre</th><th>Inmueble</th><th>Cuarto</th><th>Renta</th><th>Tel</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody id="tenants-tbody">
                ${renderTenantsRows(tenants, props)}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch(e) { pc.innerHTML = errorState(e); }
  };

  function renderTenantsRows(tenants, props) {
    if (!tenants.length) return `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">Sin PEDIDOS registrados</td></tr>`;
    return tenants.map(t => {
      const prop = props?.find(p => p.id === t.property_id);
      return `<tr>
        <td><div style="display:flex;align-items:center;gap:8px"><div class="avatar">${(t.name||'?')[0]}</div><span class="td-name">${escHtml(t.name)}</span></div></td>
        <td>${prop ? escHtml(prop.name) : '<span style="color:var(--text-muted)">Sin asignar</span>'}</td>
        <td>${escHtml(t.room||'—')}</td>
        <td class="text-mono">${fmt(t.monthly_rent)}</td>
        <td>${escHtml(t.phone||'—')}</td>
        <td><span class="badge badge-${t.status==='activo'?'green':'gray'}">${t.status||'activo'}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-secondary btn-xs" onclick="App.navigate('inquilino-detalle',{id:'${t.id}'})">Ver</button>
            ${canManage()?`<button class="btn btn-secondary btn-xs" onclick="App.modals.editTenant('${t.id}')">✏️</button>
            <button class="btn btn-danger btn-xs" onclick="App.deleteTenant('${t.id}')">🗑️</button>`:''}
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  async function filterTenants() {
    const q = document.getElementById('tenant-search')?.value.toLowerCase() || '';
    const propId = document.getElementById('tenant-prop-filter')?.value || '';
    const [tenants, props] = await Promise.all([DB.get('tenants'), DB.get('properties')]);
    const filtered = tenants.filter(t =>
      (t.name?.toLowerCase().includes(q) || t.phone?.toLowerCase().includes(q)) &&
      (!propId || t.property_id === propId)
    );
    const tbody = document.getElementById('tenants-tbody');
    if (tbody) tbody.innerHTML = renderTenantsRows(filtered, props);
  }

  // ── INQUILINO DETAIL ─────────────────────────────────────────────
  Pages['inquilino-detalle'] = async function(params) {
    const pc = document.getElementById('page-content');
    try {
      const t = await DB.getById('tenants', params.id);
      const prop = t.property_id ? await DB.getById('properties', t.property_id) : null;
      const payments = await DB.get('payments', { tenant_id: params.id });
      const services = await DB.get('tenant_services', { tenant_id: params.id });
      const docs = canSeeDocuments() ? await DB.get('documents', { entity_id: params.id, entity_type: 'tenant' }) : [];

      const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount||0), 0);
      const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount||0), 0);

      pc.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap">
          <button class="btn btn-secondary btn-sm" onclick="App.navigate('PEDIDOS')">← Volver</button>
          ${canManage()?`
          <button class="btn btn-primary btn-sm" onclick="App.modals.editTenant('${t.id}')">✏️ Editar</button>
          <button class="btn btn-secondary btn-sm" onclick="App.modals.newPayment('${t.id}')">💳 Registrar Pago</button>
          <button class="btn btn-secondary btn-sm" onclick="App.Reports.tenantReport('${t.id}','monthly')">📄 Reporte PDF</button>
          <button class="btn btn-secondary btn-sm" onclick="App.Reports.tenantExcel('${t.id}')">📊 Reporte Excel</button>
          `:''}
        </div>

        <div class="detail-header">
          <div class="avatar-lg">${(t.name||'?')[0]}</div>
          <div class="detail-info">
            <h2>${escHtml(t.name)}</h2>
            <p>${prop ? escHtml(prop.name) : 'Sin inmueble'} · Cuarto: ${escHtml(t.room||'—')}</p>
          </div>
          <span class="badge badge-${t.status==='activo'?'green':'gray'}" style="margin-left:auto">${t.status||'activo'}</span>
        </div>

        <div class="tabs">
          <button class="tab-btn active" onclick="switchTab(this,'ti-info')">Información</button>
          <button class="tab-btn" onclick="switchTab(this,'ti-payments')">Pagos (${payments.length})</button>
          <button class="tab-btn" onclick="switchTab(this,'ti-services')">Servicios (${services.length})</button>
          ${canSeeDocuments()?`<button class="tab-btn" onclick="switchTab(this,'ti-docs')">Documentos (${docs.length})</button>`:''}
        </div>

        <!-- TAB: Info -->
        <div class="tab-content active" id="ti-info">
          <div class="card mb-16">
            <div class="card-header"><div class="card-title">Datos del Inquilino</div></div>
            <div class="info-grid">
              <div class="info-item"><div class="ii-label">Nombre Completo</div><div class="ii-val">${escHtml(t.name)}</div></div>
              <div class="info-item"><div class="ii-label">Email</div><div class="ii-val">${escHtml(t.email||'—')}</div></div>
              <div class="info-item"><div class="ii-label">Teléfono</div><div class="ii-val">${escHtml(t.phone||'—')}</div></div>
              <div class="info-item"><div class="ii-label">CURP / RFC</div><div class="ii-val">${escHtml(t.curp||'—')}</div></div>
              <div class="info-item"><div class="ii-label">Inmueble</div><div class="ii-val">${prop?escHtml(prop.name):'—'}</div></div>
              <div class="info-item"><div class="ii-label">Cuarto / Unidad</div><div class="ii-val">${escHtml(t.room||'—')}</div></div>
              <div class="info-item"><div class="ii-label">Renta Mensual</div><div class="ii-val text-gold">${fmt(t.monthly_rent)}</div></div>
              <div class="info-item"><div class="ii-label">Depósito</div><div class="ii-val">${fmt(t.deposit)}</div></div>
              <div class="info-item"><div class="ii-label">Fecha Entrada</div><div class="ii-val">${fmtDate(t.move_in_date)}</div></div>
              <div class="info-item"><div class="ii-label">Contrato Hasta</div><div class="ii-val">${fmtDate(t.contract_end)}</div></div>
            </div>
            ${t.notes?`<div class="mt-16"><div class="ii-label mb-4">Notas</div><p style="color:var(--text-secondary);font-size:13.5px;line-height:1.7">${escHtml(t.notes)}</p></div>`:''}
          </div>
          <div class="finance-summary">
            <div class="finance-item income">
              <div class="fi-label">Total Pagado</div>
              <div class="fi-val">${fmt(totalPaid)}</div>
            </div>
            <div class="finance-item expense">
              <div class="fi-label">Total Pendiente</div>
              <div class="fi-val">${fmt(totalPending)}</div>
            </div>
            <div class="finance-item">
              <div class="fi-label">Pagos Registrados</div>
              <div class="fi-val" style="font-size:20px">${payments.length}</div>
            </div>
          </div>
        </div>

        <!-- TAB: Payments -->
        <div class="tab-content" id="ti-payments">
          <div class="toolbar">
            <div class="card-title">Historial de Pagos</div>
            ${canManage()?`<button class="btn btn-primary btn-sm" onclick="App.modals.newPayment('${t.id}')">＋ Registrar Pago</button>`:''}
          </div>
          <div class="card">
            <div class="table-wrap">
              <table>
                <thead><tr><th>Concepto</th><th>Monto</th><th>Período</th><th>Fecha Pago</th><th>Estado</th>${canManage()?'<th></th>':''}</tr></thead>
                <tbody>
                  ${payments.map(p => `
                    <tr>
                      <td class="td-name">${escHtml(p.concept||'Renta')}</td>
                      <td class="text-mono">${fmt(p.amount)}</td>
                      <td>${escHtml(p.period||'—')}</td>
                      <td>${fmtDate(p.payment_date||p.created_at)}</td>
                      <td><span class="badge badge-${p.status==='paid'?'green':p.status==='pending'?'gold':'red'}">${p.status==='paid'?'Pagado':p.status==='pending'?'Pendiente':'Vencido'}</span></td>
                      ${canManage()?`<td><button class="btn btn-danger btn-xs" onclick="App.deletePayment('${p.id}','${t.id}')">🗑️</button></td>`:''}
                    </tr>
                  `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">Sin pagos</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB: Services -->
        <div class="tab-content" id="ti-services">
          <div class="toolbar">
            <div class="card-title">Servicios del Inquilino</div>
            ${canManage()?`<button class="btn btn-primary btn-sm" onclick="App.modals.newService('${t.id}')">＋ Agregar Servicio</button>`:''}
          </div>
          <div class="card">
            <div class="table-wrap">
              <table>
                <thead><tr><th>Servicio</th><th>Precio</th><th>Frecuencia</th><th>Estado</th>${canManage()?'<th></th>':''}</tr></thead>
                <tbody>
                  ${services.map(s => `
                    <tr>
                      <td class="td-name">${escHtml(s.name)}</td>
                      <td class="text-mono">${fmt(s.price)}</td>
                      <td><span class="badge badge-blue">${escHtml(s.frequency||'mensual')}</span></td>
                      <td><span class="badge badge-${s.active?'green':'gray'}">${s.active?'Activo':'Inactivo'}</span></td>
                      ${canManage()?`<td><button class="btn btn-danger btn-xs" onclick="App.deleteService('${s.id}','${t.id}')">🗑️</button></td>`:''}
                    </tr>
                  `).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Sin servicios</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        ${canSeeDocuments()?`
        <!-- TAB: Docs -->
        <div class="tab-content" id="ti-docs">
          <div class="card">
            <div class="card-header">
              <div class="card-title">Documentación del Inquilino</div>
              ${canManage()?`<button class="btn btn-primary btn-sm" onclick="App.modals.uploadDocument('${t.id}','tenant')">＋ Subir Documento</button>`:''}
            </div>
            <div id="docs-list-${t.id}-tenant">${renderDocsList(docs, t.id, 'tenant')}</div>
          </div>
        </div>
        `:''}
      `;
    } catch(e) { pc.innerHTML = errorState(e); }
  };

  // ── PERSONAL ─────────────────────────────────────────────────────
  Pages.personal = async function() {
    const pc = document.getElementById('page-content');
    try {
      const [staff, props] = await Promise.all([DB.get('staff'), DB.get('properties')]);
      pc.innerHTML = `
        <div class="section-header">
          <div><div class="section-title">Personal</div><div class="section-subtitle">${staff.length} persona(s)</div></div>
          ${canManage()?`<button class="btn btn-primary" onclick="App.modals.newStaff()">＋ Agregar Personal</button>`:''}
        </div>
        <div class="card">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Nombre</th><th>Rol</th><th>Teléfono</th><th>Email</th><th>Salario</th><th>Inmuebles</th>${canManage()?'<th>Acciones</th>':''}</tr></thead>
              <tbody>
                ${staff.map(s => `
                  <tr>
                    <td><div style="display:flex;align-items:center;gap:8px"><div class="avatar">${(s.name||'?')[0]}</div><span class="td-name">${escHtml(s.name)}</span></div></td>
                    <td><span class="badge badge-${s.role==='limpieza'?'purple':s.role==='seguridad'?'gold':'blue'}">${roleLabel(s.role)}</span></td>
                    <td>${escHtml(s.phone||'—')}</td>
                    <td>${escHtml(s.email||'—')}</td>
                    <td class="text-mono">${fmt(s.salary)}</td>
                    <td id="staff-props-${s.id}">...</td>
                    ${canManage()?`<td><div style="display:flex;gap:6px">
                      <button class="btn btn-secondary btn-xs" onclick="App.modals.editStaff('${s.id}')">✏️</button>
                      <button class="btn btn-danger btn-xs" onclick="App.deleteStaff('${s.id}')">🗑️</button>
                    </div></td>`:''}
                  </tr>
                `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">Sin personal</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
      // Load property assignments per staff
      staff.forEach(async s => {
        const el = document.getElementById(`staff-props-${s.id}`);
        if (!el) return;
        const assignments = await DB.get('staff_assignments', { staff_id: s.id });
        const names = assignments.map(a => props.find(p => p.id === a.property_id)?.name).filter(Boolean);
        el.innerHTML = names.length ? names.map(n => `<span class="badge badge-gray" style="margin-right:3px">${escHtml(n)}</span>`).join('') : '<span style="color:var(--text-muted)">Sin asignar</span>';
      });
    } catch(e) { pc.innerHTML = errorState(e); }
  };

  // ── FINANZAS ─────────────────────────────────────────────────────
  Pages.finanzas = async function() {
    const pc = document.getElementById('page-content');
    try {
      const [payments, expenses, tenants, staff] = await Promise.all([
        DB.get('payments'), DB.get('property_expenses'), DB.get('tenants'), DB.get('staff')
      ]);
      const totalIncome = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount||0), 0);
      const totalExpenses = expenses.reduce((s, e) => s + (e.amount||0), 0);
      const totalStaff = staff.reduce((s, st) => s + (st.salary||0), 0);
      const balance = totalIncome - totalExpenses - totalStaff;

      pc.innerHTML = `
        <div class="section-header">
          <div class="section-title">Finanzas Generales</div>
          <div style="display:flex;gap:10px">
            <button class="btn btn-secondary btn-sm" onclick="App.Reports.financeReport()">📄 Reporte PDF</button>
            <button class="btn btn-secondary btn-sm" onclick="App.Reports.financeExcel()">📊 Excel</button>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-card green"><div class="stat-icon">💰</div><div class="stat-value">${fmt(totalIncome)}</div><div class="stat-label">Ingresos Totales</div></div>
          <div class="stat-card red"><div class="stat-icon">📉</div><div class="stat-value">${fmt(totalExpenses+totalStaff)}</div><div class="stat-label">Egresos Totales</div></div>
          <div class="stat-card gold"><div class="stat-icon">⚖️</div><div class="stat-value">${fmt(balance)}</div><div class="stat-label">Balance Neto</div></div>
          <div class="stat-card blue"><div class="stat-icon">👷</div><div class="stat-value">${fmt(totalStaff)}</div><div class="stat-label">Nómina Personal</div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div class="card">
            <div class="card-header"><div class="card-title">Últimos Ingresos</div></div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Concepto</th><th>Monto</th><th>Fecha</th></tr></thead>
                <tbody>
                  ${payments.filter(p=>p.status==='paid').slice(0,10).map(p=>`<tr><td class="td-name">${escHtml(p.concept||'Renta')}</td><td class="text-mono">${fmt(p.amount)}</td><td>${fmtDate(p.payment_date||p.created_at)}</td></tr>`).join('')||'<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:20px">Sin ingresos</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">Últimos Egresos</div></div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Concepto</th><th>Monto</th><th>Fecha</th></tr></thead>
                <tbody>
                  ${expenses.slice(0,10).map(e=>`<tr><td class="td-name">${escHtml(e.concept)}</td><td class="text-mono">${fmt(e.amount)}</td><td>${fmtDate(e.expense_date||e.created_at)}</td></tr>`).join('')||'<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:20px">Sin egresos</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch(e) { pc.innerHTML = errorState(e); }
  };

  // ── PAGOS ────────────────────────────────────────────────────────
  Pages.pagos = async function() {
    const pc = document.getElementById('page-content');
    try {
      const [payments, tenants] = await Promise.all([DB.get('payments'), DB.get('tenants')]);
      pc.innerHTML = `
        <div class="section-header">
          <div><div class="section-title">Pagos & Cobros</div><div class="section-subtitle">${payments.length} registros</div></div>
          ${canManage()?`<button class="btn btn-primary" onclick="App.modals.newPayment()">＋ Registrar Pago</button>`:''}
        </div>
        <div class="card">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Inquilino</th><th>Concepto</th><th>Monto</th><th>Período</th><th>Fecha</th><th>Estado</th>${canManage()?'<th>Acciones</th>':''}</tr></thead>
              <tbody>
                ${payments.map(p => {
                  const t = tenants.find(x => x.id === p.tenant_id);
                  return `<tr>
                    <td class="td-name">${t?escHtml(t.name):'—'}</td>
                    <td>${escHtml(p.concept||'Renta')}</td>
                    <td class="text-mono">${fmt(p.amount)}</td>
                    <td>${escHtml(p.period||'—')}</td>
                    <td>${fmtDate(p.payment_date||p.created_at)}</td>
                    <td><span class="badge badge-${p.status==='paid'?'green':p.status==='pending'?'gold':'red'}">${p.status==='paid'?'Pagado':p.status==='pending'?'Pendiente':'Vencido'}</span></td>
                    ${canManage()?`<td><div style="display:flex;gap:6px">
                      <button class="btn btn-success btn-xs" onclick="App.markPaymentPaid('${p.id}')">✓ Pagado</button>
                      <button class="btn btn-danger btn-xs" onclick="App.deletePayment('${p.id}')">🗑️</button>
                    </div></td>`:''}
                  </tr>`;
                }).join('')||'<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">Sin pagos</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch(e) { pc.innerHTML = errorState(e); }
  };

  // ── REPORTES ─────────────────────────────────────────────────────
  Pages.reportes = async function() {
    const pc = document.getElementById('page-content');
    try {
      const [props, tenants] = await Promise.all([DB.get('properties'), DB.get('tenants')]);
      pc.innerHTML = `
        <div class="section-title mb-24">Generador de Reportes</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div class="card">
            <div class="card-header"><div class="card-title">📄 Reporte por Inquilino</div></div>
            <div class="form-group mb-16">
              <label>Seleccionar Inquilino</label>
              <select class="form-control" id="rpt-tenant">
                <option value="">-- Seleccionar --</option>
                ${tenants.map(t=>`<option value="${t.id}">${escHtml(t.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group mb-16">
              <label>Período</label>
              <select class="form-control" id="rpt-period">
                <option value="monthly">Mensual</option>
                <option value="annual">Anual</option>
              </select>
            </div>
            <div style="display:flex;gap:10px">
              <button class="btn btn-primary flex-1" onclick="App.Reports.tenantReportFromPage()">📄 Generar PDF</button>
              <button class="btn btn-secondary flex-1" onclick="App.Reports.tenantExcelFromPage()">📊 Excel</button>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">🏗️ Reporte por Inmueble</div></div>
            <div class="form-group mb-16">
              <label>Seleccionar Inmueble</label>
              <select class="form-control" id="rpt-property">
                <option value="">-- Seleccionar --</option>
                ${props.map(p=>`<option value="${p.id}">${escHtml(p.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group mb-16">
              <label>Período</label>
              <select class="form-control" id="rpt-prop-period">
                <option value="monthly">Mensual</option>
                <option value="annual">Anual</option>
              </select>
            </div>
            <div style="display:flex;gap:10px">
              <button class="btn btn-primary flex-1" onclick="App.Reports.propertyReportFromPage()">📄 Generar PDF</button>
              <button class="btn btn-secondary flex-1" onclick="App.Reports.propertyExcelFromPage()">📊 Excel</button>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">💰 Reporte Financiero General</div></div>
            <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">Resumen completo de ingresos, egresos y balance.</p>
            <div style="display:flex;gap:10px">
              <button class="btn btn-primary flex-1" onclick="App.Reports.financeReport()">📄 PDF</button>
              <button class="btn btn-secondary flex-1" onclick="App.Reports.financeExcel()">📊 Excel</button>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">👷 Reporte de Personal</div></div>
            <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">Detalle de nómina y asignaciones por inmueble.</p>
            <div style="display:flex;gap:10px">
              <button class="btn btn-primary flex-1" onclick="App.Reports.staffReport()">📄 PDF</button>
              <button class="btn btn-secondary flex-1" onclick="App.Reports.staffExcel()">📊 Excel</button>
            </div>
          </div>
        </div>
      `;
    } catch(e) { pc.innerHTML = errorState(e); }
  };

  // ── PORTAL ───────────────────────────────────────────────────────
  Pages.portal = async function() {
    const pc = document.getElementById('page-content');
    try {
      const props = await DB.get('properties');
      const available = props.filter(p => p.status === 'disponible');
      pc.innerHTML = `
        <div class="section-header">
          <div><div class="section-title">Portal Público de Disponibilidad</div><div class="section-subtitle">${available.length} espacio(s) disponible(s)</div></div>
        </div>
        <div class="property-grid">
          ${available.length ? available.map(p => {
            const imgHtml = p.photos?.[0]
              ? `<img src="${p.photos[0]}" alt="${escHtml(p.name)}" style="width:100%;height:100%;object-fit:cover"/>`
              : `<div class="property-img-placeholder">🏢</div>`;
            return `
            <div class="property-card">
              <div class="property-img">
                ${imgHtml}
                <div class="property-status-badge"><span class="badge badge-green">Disponible</span></div>
              </div>
              <div class="property-body">
                <div class="property-name">${escHtml(p.name)}</div>
                <div class="property-type">${escHtml(p.type||'')} · ${escHtml(p.address||'')}</div>
                <div class="property-meta">
                  <div class="property-meta-item">🛏️ ${p.rooms||0} cuartos</div>
                  <div class="property-meta-item">🚿 ${p.baths||0} baños</div>
                  <div class="property-meta-item">📐 ${p.area||0} m²</div>
                </div>
                ${p.amenities?.length ? `<div style="margin:10px 0;display:flex;gap:6px;flex-wrap:wrap">${p.amenities.map(a=>`<span class="badge badge-blue">${escHtml(a)}</span>`).join('')}</div>` : ''}
                <div class="property-price">${fmt(p.price)}<span>/mes</span></div>
                ${p.description?`<p style="color:var(--text-muted);font-size:12.5px;margin-top:8px;line-height:1.6">${escHtml(p.description.slice(0,150))}${p.description.length>150?'...':''}</p>`:''}
              </div>
              <div class="property-actions">
                <button class="btn btn-primary btn-sm" style="flex:1" onclick="App.navigate('inmueble-detalle',{id:'${p.id}'})">Ver Detalle</button>
                ${canManage()?`<button class="btn btn-secondary btn-sm" onclick="App.modals.editProperty('${p.id}')">✏️</button>`:''}
              </div>
            </div>`;
          }).join('') : `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🏢</div><h4>Sin espacios disponibles</h4><p>Marca inmuebles como "disponible" para que aparezcan aquí.</p></div>`}
        </div>
      `;
    } catch(e) { pc.innerHTML = errorState(e); }
  };

  // ── PAQUETES ─────────────────────────────────────────────────────
  Pages.paquetes = async function() {
    const pc = document.getElementById('page-content');
    try {
      const pkgs = await DB.get('packages');
      pc.innerHTML = `
        <div class="section-header">
          <div><div class="section-title">Paquetes de Servicios</div><div class="section-subtitle">Mantenimiento & Seguridad</div></div>
          ${canManage()?`<button class="btn btn-primary" onclick="App.modals.newPackage()">＋ Crear Paquete</button>`:''}
        </div>
        <div class="pkg-grid">
          ${pkgs.map(p=>`
            <div class="pkg-card">
              <h4>${escHtml(p.name)}</h4>
              <div class="pkg-price">${fmt(p.price)}<span style="font-size:13px;color:var(--text-muted);font-family:var(--font-body)">/mes</span></div>
              <ul class="pkg-features">
                ${(p.features||[]).map(f=>`<li>${escHtml(f)}</li>`).join('')}
              </ul>
              <div style="display:flex;gap:8px">
                ${canManage()?`<button class="btn btn-secondary btn-sm flex-1" onclick="App.modals.editPackage('${p.id}')">✏️ Editar</button>
                <button class="btn btn-danger btn-sm" onclick="App.deletePackage('${p.id}')">🗑️</button>`:''}
              </div>
            </div>
          `).join('') || '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📦</div><h4>Sin paquetes</h4><p>Crea paquetes de mantenimiento y seguridad.</p></div>'}
        </div>
      `;
    } catch(e) { pc.innerHTML = errorState(e); }
  };

  // ── USUARIOS ─────────────────────────────────────────────────────
  Pages.usuarios = async function() {
    if (!canEditUsers()) { navigate('dashboard'); return; }
    const pc = document.getElementById('page-content');
    try {
      const users = await DB.get('app_users');
      pc.innerHTML = `
        <div class="section-header">
          <div><div class="section-title">Gestión de Usuarios</div><div class="section-subtitle">${users.length} usuario(s)</div></div>
          <button class="btn btn-primary" onclick="App.modals.newUser()">＋ Nuevo Usuario</button>
        </div>
        <div class="card">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Email</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                ${users.map(u=>`
                  <tr>
                    <td class="td-name text-mono">${escHtml(u.username)}</td>
                    <td>${escHtml(u.display_name||'—')}</td>
                    <td><span class="role-dot role-${u.role}"></span>${roleLabel(u.role)}</td>
                    <td>${escHtml(u.email||'—')}</td>
                    <td><span class="badge badge-${u.active?'green':'gray'}">${u.active?'Activo':'Inactivo'}</span></td>
                    <td>
                      <div style="display:flex;gap:6px">
                        <button class="btn btn-secondary btn-xs" onclick="App.modals.editUser('${u.id}')">✏️ Editar</button>
                        ${u.username!=='admin'?`
                        <button class="btn btn-${u.active?'danger':'success'} btn-xs" onclick="App.toggleUserActive('${u.id}',${!u.active})">${u.active?'Desactivar':'Activar'}</button>
                        <button class="btn btn-danger btn-xs" onclick="App.deleteUser('${u.id}')">🗑️</button>
                        `:'<span style="color:var(--text-muted);font-size:12px">Protegido</span>'}
                      </div>
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">Sin usuarios</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch(e) { pc.innerHTML = errorState(e); }
  };

  // ── SOCIO DASHBOARD ──────────────────────────────────────────────
  Pages['socio-dashboard'] = async function() {
    const pc = document.getElementById('page-content');
    try {
      const [payments, expenses, staff, transactions] = await Promise.all([
        DB.get('payments'), DB.get('property_expenses'), DB.get('staff'), DB.get('property_transactions')
      ]);
      const rentIncome = payments.filter(p=>p.status==='paid').reduce((s,p)=>s+(p.amount||0),0);
      const staffCost = staff.reduce((s,st)=>s+(st.salary||0),0);
      const expenseCost = expenses.reduce((s,e)=>s+(e.amount||0),0);
      const transactionProfit = transactions.reduce((s,t)=>s+(t.profit||0),0);
      const netIncome = rentIncome - staffCost - expenseCost;

      pc.innerHTML = `
        <div class="section-title mb-24">Mi Dashboard — Socio</div>
        <div class="stats-grid">
          <div class="stat-card green"><div class="stat-icon">💰</div><div class="stat-value">${fmt(rentIncome)}</div><div class="stat-label">Ingresos por Renta</div></div>
          <div class="stat-card gold"><div class="stat-icon">📈</div><div class="stat-value">${fmt(transactionProfit)}</div><div class="stat-label">Ganancias Compra/Venta</div></div>
          <div class="stat-card red"><div class="stat-icon">💸</div><div class="stat-value">${fmt(staffCost+expenseCost)}</div><div class="stat-label">Total Egresos</div></div>
          <div class="stat-card blue"><div class="stat-icon">⚖️</div><div class="stat-value">${fmt(netIncome+transactionProfit)}</div><div class="stat-label">Ganancia Neta Total</div></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Desglose de Egresos</div></div>
          <div class="finance-summary">
            <div class="finance-item expense"><div class="fi-label">Gastos de Inmuebles</div><div class="fi-val">${fmt(expenseCost)}</div></div>
            <div class="finance-item expense"><div class="fi-label">Nómina (Personal)</div><div class="fi-val">${fmt(staffCost)}</div></div>
            <div class="finance-item income"><div class="fi-label">Ingresos Renta</div><div class="fi-val">${fmt(rentIncome)}</div></div>
            <div class="finance-item balance"><div class="fi-label">Balance por PEDIDOS</div><div class="fi-val">${fmt(netIncome)}</div></div>
          </div>
        </div>
      `;
    } catch(e) { pc.innerHTML = errorState(e); }
  };

  Pages['socio-ganancias'] = async function() {
    const pc = document.getElementById('page-content');
    try {
      const transactions = await DB.get('property_transactions');
      pc.innerHTML = `
        <div class="section-header">
          <div><div class="section-title">Ganancias — Compra / Venta</div></div>
          ${canManage()?`<button class="btn btn-primary" onclick="App.modals.newTransaction()">＋ Registrar Transacción</button>`:''}
        </div>
        <div class="card">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Inmueble</th><th>Tipo</th><th>Precio Compra</th><th>Precio Venta</th><th>Ganancia</th><th>Fecha</th>${canManage()?'<th></th>':''}</tr></thead>
              <tbody>
                ${transactions.map(t=>`
                  <tr>
                    <td class="td-name">${escHtml(t.property_name)}</td>
                    <td><span class="badge badge-${t.type==='venta'?'green':'blue'}">${t.type}</span></td>
                    <td class="text-mono">${fmt(t.buy_price)}</td>
                    <td class="text-mono">${fmt(t.sell_price)}</td>
                    <td class="text-mono text-${(t.profit||0)>0?'success':'danger'}">${fmt(t.profit)}</td>
                    <td>${fmtDate(t.transaction_date||t.created_at)}</td>
                    ${canManage()?`<td><button class="btn btn-danger btn-xs" onclick="App.deleteTransaction('${t.id}')">🗑️</button></td>`:''}
                  </tr>
                `).join('')||'<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">Sin transacciones</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch(e) { pc.innerHTML = errorState(e); }
  };

  Pages['socio-PEDIDOS'] = async function() {
    const pc = document.getElementById('page-content');
    try {
      const [payments, expenses, staff] = await Promise.all([
        DB.get('payments'), DB.get('property_expenses'), DB.get('staff')
      ]);
      const income = payments.filter(p=>p.status==='paid').reduce((s,p)=>s+(p.amount||0),0);
      const staffCost = staff.reduce((s,st)=>s+(st.salary||0),0);
      const expCost = expenses.reduce((s,e)=>s+(e.amount||0),0);
      pc.innerHTML = `
        <div class="section-title mb-24">Ganancias por PEDIDOS</div>
        <div class="finance-summary">
          <div class="finance-item income"><div class="fi-label">Ingresos Renta Total</div><div class="fi-val">${fmt(income)}</div></div>
          <div class="finance-item expense"><div class="fi-label">Nómina Personal</div><div class="fi-val">${fmt(staffCost)}</div></div>
          <div class="finance-item expense"><div class="fi-label">Gastos Inmuebles</div><div class="fi-val">${fmt(expCost)}</div></div>
          <div class="finance-item balance"><div class="fi-label">Ganancia Neta</div><div class="fi-val">${fmt(income-staffCost-expCost)}</div></div>
        </div>
        <div class="card">
          <div class="card-title mb-16">Detalle de Personal (Egresos)</div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Nombre</th><th>Rol</th><th>Salario/mes</th></tr></thead>
              <tbody>
                ${staff.map(s=>`<tr><td class="td-name">${escHtml(s.name)}</td><td>${roleLabel(s.role)}</td><td class="text-mono">${fmt(s.salary)}</td></tr>`).join('')||'<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text-muted)">Sin personal</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch(e) { pc.innerHTML = errorState(e); }
  };

  Pages['mi-cuenta'] = async function() {
    const pc = document.getElementById('page-content');
    try {
      pc.innerHTML = `
        <div class="section-title mb-24">Mi Cuenta</div>
        <div class="card">
          <div class="detail-header">
            <div class="avatar-lg">${(currentUser.display_name||currentUser.username)[0].toUpperCase()}</div>
            <div class="detail-info">
              <h2>${escHtml(currentUser.display_name||currentUser.username)}</h2>
              <p>${roleLabel(currentUser.role)} · ${escHtml(currentUser.email||'')}</p>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-item"><div class="ii-label">Usuario</div><div class="ii-val text-mono">${escHtml(currentUser.username)}</div></div>
            <div class="info-item"><div class="ii-label">Rol</div><div class="ii-val">${roleLabel(currentUser.role)}</div></div>
            <div class="info-item"><div class="ii-label">Email</div><div class="ii-val">${escHtml(currentUser.email||'—')}</div></div>
          </div>
        </div>
      `;
    } catch(e) { pc.innerHTML = errorState(e); }
  };

  Pages['mis-pagos'] = async function() {
    const pc = document.getElementById('page-content');
    try {
      const tenantRecord = await DB.get('tenants', { user_id: currentUser.id });
      if (!tenantRecord.length) {
        pc.innerHTML = `<div class="empty-state"><div class="empty-icon">💳</div><h4>Sin información de pagos</h4><p>Contacta al administrador.</p></div>`;
        return;
      }
      const payments = await DB.get('payments', { tenant_id: tenantRecord[0].id });
      pc.innerHTML = `
        <div class="section-title mb-24">Mis Pagos</div>
        <div class="card">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Concepto</th><th>Monto</th><th>Período</th><th>Fecha</th><th>Estado</th></tr></thead>
              <tbody>
                ${payments.map(p=>`<tr>
                  <td class="td-name">${escHtml(p.concept||'Renta')}</td>
                  <td class="text-mono">${fmt(p.amount)}</td>
                  <td>${escHtml(p.period||'—')}</td>
                  <td>${fmtDate(p.payment_date||p.created_at)}</td>
                  <td><span class="badge badge-${p.status==='paid'?'green':p.status==='pending'?'gold':'red'}">${p.status==='paid'?'Pagado':p.status==='pending'?'Pendiente':'Vencido'}</span></td>
                </tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Sin pagos registrados</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch(e) { pc.innerHTML = errorState(e); }
  };

  Pages['mis-servicios'] = async function() {
    const pc = document.getElementById('page-content');
    try {
      const tenantRecord = await DB.get('tenants', { user_id: currentUser.id });
      if (!tenantRecord.length) {
        pc.innerHTML = `<div class="empty-state"><div class="empty-icon">🛎️</div><h4>Sin servicios</h4></div>`;
        return;
      }
      const services = await DB.get('tenant_services', { tenant_id: tenantRecord[0].id });
      pc.innerHTML = `
        <div class="section-title mb-24">Mis Servicios</div>
        <div class="card">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Servicio</th><th>Precio</th><th>Frecuencia</th><th>Estado</th></tr></thead>
              <tbody>
                ${services.map(s=>`<tr>
                  <td class="td-name">${escHtml(s.name)}</td>
                  <td class="text-mono">${fmt(s.price)}</td>
                  <td>${escHtml(s.frequency||'mensual')}</td>
                  <td><span class="badge badge-${s.active?'green':'gray'}">${s.active?'Activo':'Inactivo'}</span></td>
                </tr>`).join('')||'<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">Sin servicios</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch(e) { pc.innerHTML = errorState(e); }
  };

  Pages['mis-asignaciones'] = async function() {
    const pc = document.getElementById('page-content');
    try {
      const staffRecord = await DB.get('staff', { user_id: currentUser.id });
      if (!staffRecord.length) { pc.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><h4>Sin asignaciones</h4></div>`; return; }
      const assignments = await DB.get('staff_assignments', { staff_id: staffRecord[0].id });
      const props = await DB.get('properties');
      pc.innerHTML = `
        <div class="section-title mb-24">Mis Asignaciones</div>
        <div class="property-grid">
          ${assignments.map(a => {
            const p = props.find(x => x.id === a.property_id);
            if (!p) return '';
            return `<div class="property-card">
              <div class="property-img"><div class="property-img-placeholder">🏢</div></div>
              <div class="property-body"><div class="property-name">${escHtml(p.name)}</div><div class="property-type">${escHtml(p.address||'')}</div></div>
            </div>`;
          }).join('')||'<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📋</div><h4>Sin asignaciones</h4></div>'}
        </div>
      `;
    } catch(e) { pc.innerHTML = errorState(e); }
  };

  Pages.configuracion = async function() {
    if (!canEditUsers()) { navigate('dashboard'); return; }
    const pc = document.getElementById('page-content');
    pc.innerHTML = `
      <div class="section-title mb-24">Configuración</div>
      <div class="card mb-16">
        <div class="card-header"><div class="card-title">Base de Datos</div></div>
        <p style="color:var(--text-muted);font-size:13.5px;margin-bottom:16px">Conexión actual con Supabase.</p>
        <div class="info-grid">
          <div class="info-item"><div class="ii-label">URL</div><div class="ii-val text-mono" style="font-size:12px;word-break:break-all">${localStorage.getItem('sb_url')||'—'}</div></div>
        </div>
        <button class="btn btn-danger btn-sm mt-16" onclick="App.resetConnection()">🔌 Cambiar Conexión</button>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Acerca del Sistema</div></div>
        <div class="info-grid">
          <div class="info-item"><div class="ii-label">Versión</div><div class="ii-val">InmobiliariaPro v1.0</div></div>
          <div class="info-item"><div class="ii-label">Usuario Admin</div><div class="ii-val text-mono">admin</div></div>
        </div>
      </div>
    `;
  };

  function resetConnection() {
    localStorage.removeItem('sb_url');
    localStorage.removeItem('sb_key');
    location.reload();
  }

  function errorState(e) {
    return `<div class="empty-state"><div class="empty-icon">⚠️</div><h4>Error</h4><p>${e?.message||'Error desconocido'}</p></div>`;
  }

  // ════════════════════════════════════════════════════════════════
  // MODALS — Forms
  // ════════════════════════════════════════════════════════════════
  const modals = {};

  modals.newProperty = async function() {
    openModal('Agregar Inmueble', `
      <div class="form-grid">
        <div class="form-group"><label>Nombre *</label><input class="form-control" id="f-name" placeholder="Hotel Las Palmas"/></div>
        <div class="form-group"><label>Tipo</label>
          <select class="form-control" id="f-type">
            <option>Hotel</option><option>Departamento</option><option>Casa</option><option>Local Comercial</option><option>Cuarto</option><option>Otro</option>
          </select>
        </div>
        <div class="form-group"><label>Dirección</label><input class="form-control" id="f-address" placeholder="Calle, número"/></div>
        <div class="form-group"><label>Ciudad</label><input class="form-control" id="f-city" placeholder="Ciudad de México"/></div>
        <div class="form-group"><label>Precio Renta (MXN/mes)</label><input type="number" class="form-control" id="f-price" placeholder="0.00"/></div>
        <div class="form-group"><label>Estado</label>
          <select class="form-control" id="f-status"><option value="activo">Activo</option><option value="disponible">Disponible</option><option value="inactivo">Inactivo</option></select>
        </div>
        <div class="form-group"><label>Habitaciones</label><input type="number" class="form-control" id="f-rooms" value="1"/></div>
        <div class="form-group"><label>Baños</label><input type="number" class="form-control" id="f-baths" value="1"/></div>
        <div class="form-group"><label>Área (m²)</label><input type="number" class="form-control" id="f-area" value="0"/></div>
        <div class="form-group full"><label>Descripción</label><textarea class="form-control" id="f-desc" rows="3" placeholder="Descripción del inmueble..."></textarea></div>
        <div class="form-group full"><label>Amenidades (separadas por coma)</label><input class="form-control" id="f-amenities" placeholder="Estacionamiento, WiFi, Seguridad..."/></div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.saveProperty()">Guardar Inmueble</button>
    `);
  };

  modals.editProperty = async function(id) {
    const p = await DB.getById('properties', id);
    openModal('Editar Inmueble', `
      <input type="hidden" id="f-id" value="${p.id}"/>
      <div class="form-grid">
        <div class="form-group"><label>Nombre *</label><input class="form-control" id="f-name" value="${escHtml(p.name)}"/></div>
        <div class="form-group"><label>Tipo</label>
          <select class="form-control" id="f-type">
            ${['Hotel','Departamento','Casa','Local Comercial','Cuarto','Otro'].map(t=>`<option${p.type===t?' selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Dirección</label><input class="form-control" id="f-address" value="${escHtml(p.address||'')}"/></div>
        <div class="form-group"><label>Ciudad</label><input class="form-control" id="f-city" value="${escHtml(p.city||'')}"/></div>
        <div class="form-group"><label>Precio Renta</label><input type="number" class="form-control" id="f-price" value="${p.price||0}"/></div>
        <div class="form-group"><label>Estado</label>
          <select class="form-control" id="f-status">
            ${['activo','disponible','inactivo'].map(s=>`<option value="${s}"${p.status===s?' selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Habitaciones</label><input type="number" class="form-control" id="f-rooms" value="${p.rooms||0}"/></div>
        <div class="form-group"><label>Baños</label><input type="number" class="form-control" id="f-baths" value="${p.baths||0}"/></div>
        <div class="form-group"><label>Área (m²)</label><input type="number" class="form-control" id="f-area" value="${p.area||0}"/></div>
        <div class="form-group full"><label>Descripción</label><textarea class="form-control" id="f-desc" rows="3">${escHtml(p.description||'')}</textarea></div>
        <div class="form-group full"><label>Amenidades</label><input class="form-control" id="f-amenities" value="${(p.amenities||[]).join(', ')}"/></div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.saveProperty()">Actualizar</button>
    `);
  };

  async function saveProperty() {
    const id = document.getElementById('f-id')?.value;
    const data = {
      name: document.getElementById('f-name').value.trim(),
      type: document.getElementById('f-type').value,
      address: document.getElementById('f-address').value.trim(),
      city: document.getElementById('f-city').value.trim(),
      price: parseFloat(document.getElementById('f-price').value)||0,
      status: document.getElementById('f-status').value,
      rooms: parseInt(document.getElementById('f-rooms').value)||0,
      baths: parseInt(document.getElementById('f-baths').value)||0,
      area: parseFloat(document.getElementById('f-area').value)||0,
      description: document.getElementById('f-desc').value.trim(),
      amenities: document.getElementById('f-amenities').value.split(',').map(s=>s.trim()).filter(Boolean),
    };
    if (!data.name) { toast('El nombre es obligatorio', 'error'); return; }
    try {
      id ? await DB.update('properties', id, data) : await DB.insert('properties', data);
      closeModal(); toast(id ? 'Inmueble actualizado' : 'Inmueble creado', 'success');
      navigate('inmuebles');
    } catch(e) { toast('Error: ' + e.message, 'error'); }
  }

  async function deleteProperty(id) {
    confirm('¿Eliminar este inmueble? Se eliminarán todos sus datos relacionados.', async () => {
      try {
        await DB.delete('properties', id);
        toast('Inmueble eliminado', 'success');
        navigate('inmuebles');
      } catch(e) { toast('Error: ' + e.message, 'error'); }
    });
  }

  // TENANT MODALS
  modals.newTenant = async function(propId) {
    const props = await DB.get('properties');
    openModal('Agregar Inquilino', `
      <div class="form-grid">
        <div class="form-group"><label>Nombre Completo *</label><input class="form-control" id="t-name" placeholder="Juan Pérez"/></div>
        <div class="form-group"><label>Email</label><input type="email" class="form-control" id="t-email"/></div>
        <div class="form-group"><label>Teléfono</label><input class="form-control" id="t-phone"/></div>
        <div class="form-group"><label>CURP / RFC</label><input class="form-control" id="t-curp"/></div>
        <div class="form-group"><label>Inmueble *</label>
          <select class="form-control" id="t-prop">
            <option value="">-- Seleccionar --</option>
            ${props.map(p=>`<option value="${p.id}"${propId===p.id?' selected':''}>${escHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Cuarto / Unidad</label><input class="form-control" id="t-room" placeholder="101"/></div>
        <div class="form-group"><label>Renta Mensual (MXN)</label><input type="number" class="form-control" id="t-rent" value="0"/></div>
        <div class="form-group"><label>Depósito (MXN)</label><input type="number" class="form-control" id="t-deposit" value="0"/></div>
        <div class="form-group"><label>Fecha de Entrada</label><input type="date" class="form-control" id="t-movein"/></div>
        <div class="form-group"><label>Fin de Contrato</label><input type="date" class="form-control" id="t-contractend"/></div>
        <div class="form-group full"><label>Notas</label><textarea class="form-control" id="t-notes" rows="2"></textarea></div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.saveTenant()">Guardar Inquilino</button>
    `);
  };

  modals.editTenant = async function(id) {
    const [t, props] = await Promise.all([DB.getById('tenants', id), DB.get('properties')]);
    openModal('Editar Inquilino', `
      <input type="hidden" id="t-id" value="${t.id}"/>
      <div class="form-grid">
        <div class="form-group"><label>Nombre *</label><input class="form-control" id="t-name" value="${escHtml(t.name)}"/></div>
        <div class="form-group"><label>Email</label><input type="email" class="form-control" id="t-email" value="${escHtml(t.email||'')}"/></div>
        <div class="form-group"><label>Teléfono</label><input class="form-control" id="t-phone" value="${escHtml(t.phone||'')}"/></div>
        <div class="form-group"><label>CURP / RFC</label><input class="form-control" id="t-curp" value="${escHtml(t.curp||'')}"/></div>
        <div class="form-group"><label>Inmueble *</label>
          <select class="form-control" id="t-prop">
            ${props.map(p=>`<option value="${p.id}"${t.property_id===p.id?' selected':''}>${escHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Cuarto</label><input class="form-control" id="t-room" value="${escHtml(t.room||'')}"/></div>
        <div class="form-group"><label>Renta Mensual</label><input type="number" class="form-control" id="t-rent" value="${t.monthly_rent||0}"/></div>
        <div class="form-group"><label>Depósito</label><input type="number" class="form-control" id="t-deposit" value="${t.deposit||0}"/></div>
        <div class="form-group"><label>Fecha Entrada</label><input type="date" class="form-control" id="t-movein" value="${t.move_in_date||''}"/></div>
        <div class="form-group"><label>Fin Contrato</label><input type="date" class="form-control" id="t-contractend" value="${t.contract_end||''}"/></div>
        <div class="form-group"><label>Estado</label>
          <select class="form-control" id="t-status">
            <option value="activo"${t.status==='activo'?' selected':''}>Activo</option>
            <option value="inactivo"${t.status==='inactivo'?' selected':''}>Inactivo</option>
          </select>
        </div>
        <div class="form-group full"><label>Notas</label><textarea class="form-control" id="t-notes" rows="2">${escHtml(t.notes||'')}</textarea></div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.saveTenant()">Actualizar</button>
    `);
  };

  async function saveTenant() {
    const id = document.getElementById('t-id')?.value;
    const propId = document.getElementById('t-prop').value;
    if (!propId) { toast('Selecciona un inmueble', 'error'); return; }
    const data = {
      name: document.getElementById('t-name').value.trim(),
      email: document.getElementById('t-email')?.value.trim(),
      phone: document.getElementById('t-phone')?.value.trim(),
      curp: document.getElementById('t-curp')?.value.trim(),
      property_id: propId,
      room: document.getElementById('t-room')?.value.trim(),
      monthly_rent: parseFloat(document.getElementById('t-rent')?.value)||0,
      deposit: parseFloat(document.getElementById('t-deposit')?.value)||0,
      move_in_date: document.getElementById('t-movein')?.value||null,
      contract_end: document.getElementById('t-contractend')?.value||null,
      status: document.getElementById('t-status')?.value||'activo',
      notes: document.getElementById('t-notes')?.value.trim(),
    };
    if (!data.name) { toast('El nombre es obligatorio', 'error'); return; }
    try {
      id ? await DB.update('tenants', id, data) : await DB.insert('tenants', data);
      closeModal(); toast(id?'Inquilino actualizado':'Inquilino creado', 'success');
      navigate('PEDIDOS');
    } catch(e) { toast('Error: '+e.message, 'error'); }
  }

  async function deleteTenant(id) {
    confirm('¿Eliminar este inquilino y todos sus datos?', async()=>{
      try { await DB.delete('tenants', id); toast('Inquilino eliminado', 'success'); navigate('PEDIDOS'); }
      catch(e) { toast('Error: '+e.message, 'error'); }
    });
  }

  // STAFF MODALS
  modals.newStaff = function() {
    openModal('Agregar Personal', `
      <div class="form-grid">
        <div class="form-group"><label>Nombre Completo *</label><input class="form-control" id="s-name"/></div>
        <div class="form-group"><label>Rol *</label>
          <select class="form-control" id="s-role">
            <option value="limpieza">Personal de Limpieza</option>
            <option value="seguridad">Personal de Seguridad</option>
            <option value="mantenimiento">Mantenimiento</option>
          </select>
        </div>
        <div class="form-group"><label>Teléfono</label><input class="form-control" id="s-phone"/></div>
        <div class="form-group"><label>Email</label><input type="email" class="form-control" id="s-email"/></div>
        <div class="form-group"><label>Salario Mensual (MXN)</label><input type="number" class="form-control" id="s-salary" value="0"/></div>
        <div class="form-group"><label>Fecha Inicio</label><input type="date" class="form-control" id="s-start"/></div>
        <div class="form-group full"><label>Notas</label><textarea class="form-control" id="s-notes" rows="2"></textarea></div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.saveStaff()">Guardar Personal</button>
    `);
  };

  modals.editStaff = async function(id) {
    const s = await DB.getById('staff', id);
    openModal('Editar Personal', `
      <input type="hidden" id="s-id" value="${s.id}"/>
      <div class="form-grid">
        <div class="form-group"><label>Nombre *</label><input class="form-control" id="s-name" value="${escHtml(s.name)}"/></div>
        <div class="form-group"><label>Rol</label>
          <select class="form-control" id="s-role">
            ${['limpieza','seguridad','mantenimiento'].map(r=>`<option value="${r}"${s.role===r?' selected':''}>${roleLabel(r)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Teléfono</label><input class="form-control" id="s-phone" value="${escHtml(s.phone||'')}"/></div>
        <div class="form-group"><label>Email</label><input type="email" class="form-control" id="s-email" value="${escHtml(s.email||'')}"/></div>
        <div class="form-group"><label>Salario</label><input type="number" class="form-control" id="s-salary" value="${s.salary||0}"/></div>
        <div class="form-group"><label>Fecha Inicio</label><input type="date" class="form-control" id="s-start" value="${s.start_date||''}"/></div>
        <div class="form-group full"><label>Notas</label><textarea class="form-control" id="s-notes" rows="2">${escHtml(s.notes||'')}</textarea></div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.saveStaff()">Actualizar</button>
    `);
  };

  async function saveStaff() {
    const id = document.getElementById('s-id')?.value;
    const data = {
      name: document.getElementById('s-name').value.trim(),
      role: document.getElementById('s-role').value,
      phone: document.getElementById('s-phone')?.value.trim(),
      email: document.getElementById('s-email')?.value.trim(),
      salary: parseFloat(document.getElementById('s-salary')?.value)||0,
      start_date: document.getElementById('s-start')?.value||null,
      notes: document.getElementById('s-notes')?.value.trim(),
    };
    if (!data.name) { toast('El nombre es obligatorio','error'); return; }
    try {
      id ? await DB.update('staff', id, data) : await DB.insert('staff', data);
      closeModal(); toast('Personal guardado','success'); navigate('personal');
    } catch(e) { toast('Error: '+e.message,'error'); }
  }

  async function deleteStaff(id) {
    confirm('¿Eliminar este personal?', async()=>{
      try { await DB.delete('staff', id); toast('Personal eliminado','success'); navigate('personal'); }
      catch(e) { toast('Error: '+e.message,'error'); }
    });
  }

  modals.assignStaff = async function(propId) {
    const staff = await DB.get('staff');
    openModal('Asignar Personal al Inmueble', `
      <div class="form-group">
        <label>Seleccionar Personal</label>
        <select class="form-control" id="assign-staff-id">
          <option value="">-- Seleccionar --</option>
          ${staff.map(s=>`<option value="${s.id}">${escHtml(s.name)} — ${roleLabel(s.role)}</option>`).join('')}
        </select>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.doAssignStaff('${propId}')">Asignar</button>
    `);
  };

  async function doAssignStaff(propId) {
    const staffId = document.getElementById('assign-staff-id')?.value;
    if (!staffId) { toast('Selecciona personal','error'); return; }
    try {
      await DB.insert('staff_assignments', { property_id: propId, staff_id: staffId });
      closeModal(); toast('Personal asignado','success');
      navigate('inmueble-detalle', { id: propId });
    } catch(e) { toast('Error: '+e.message,'error'); }
  }

  async function removeStaffAssignment(assignmentId, propId) {
    try {
      await DB.delete('staff_assignments', assignmentId);
      toast('Asignación eliminada','success');
      navigate('inmueble-detalle', { id: propId });
    } catch(e) { toast('Error: '+e.message,'error'); }
  }

  // PAYMENT MODALS
  modals.newPayment = async function(tenantId) {
    const tenants = tenantId ? [await DB.getById('tenants', tenantId)] : await DB.get('tenants');
    openModal('Registrar Pago', `
      <div class="form-grid">
        <div class="form-group"><label>Inquilino *</label>
          <select class="form-control" id="p-tenant">
            ${tenants.map(t=>`<option value="${t.id}"${tenantId===t.id?' selected':''}>${escHtml(t.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Concepto</label>
          <select class="form-control" id="p-concept">
            <option>Renta</option><option>Mantenimiento</option><option>Servicio Extra</option><option>Depósito</option><option>Otro</option>
          </select>
        </div>
        <div class="form-group"><label>Monto (MXN) *</label><input type="number" class="form-control" id="p-amount" value="0"/></div>
        <div class="form-group"><label>Período (ej. Enero 2025)</label><input class="form-control" id="p-period" placeholder="Enero 2025"/></div>
        <div class="form-group"><label>Fecha de Pago</label><input type="date" class="form-control" id="p-date"/></div>
        <div class="form-group"><label>Estado</label>
          <select class="form-control" id="p-status">
            <option value="paid">Pagado</option><option value="pending">Pendiente</option><option value="overdue">Vencido</option>
          </select>
        </div>
        <div class="form-group full"><label>Notas</label><textarea class="form-control" id="p-notes" rows="2"></textarea></div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.savePayment()">Registrar Pago</button>
    `);
  };

  async function savePayment() {
    const data = {
      tenant_id: document.getElementById('p-tenant').value,
      concept: document.getElementById('p-concept').value,
      amount: parseFloat(document.getElementById('p-amount').value)||0,
      period: document.getElementById('p-period').value.trim(),
      payment_date: document.getElementById('p-date').value||null,
      status: document.getElementById('p-status').value,
      notes: document.getElementById('p-notes').value.trim(),
    };
    if (!data.tenant_id) { toast('Selecciona un inquilino','error'); return; }
    try {
      await DB.insert('payments', data);
      closeModal(); toast('Pago registrado','success');
      navigate(currentPage);
    } catch(e) { toast('Error: '+e.message,'error'); }
  }

  async function deletePayment(id, tenantId) {
    confirm('¿Eliminar este pago?', async()=>{
      try { await DB.delete('payments', id); toast('Pago eliminado','success'); if(tenantId) navigate('inquilino-detalle',{id:tenantId}); else navigate('pagos'); }
      catch(e) { toast('Error: '+e.message,'error'); }
    });
  }

  async function markPaymentPaid(id) {
    try { await DB.update('payments', id, { status: 'paid', payment_date: new Date().toISOString().split('T')[0] }); toast('Marcado como pagado','success'); navigate('pagos'); }
    catch(e) { toast('Error: '+e.message,'error'); }
  }

  // EXPENSE MODAL
  modals.newExpense = function(propId) {
    openModal('Agregar Gasto', `
      <div class="form-grid">
        <div class="form-group full"><label>Concepto *</label><input class="form-control" id="e-concept"/></div>
        <div class="form-group"><label>Monto (MXN) *</label><input type="number" class="form-control" id="e-amount" value="0"/></div>
        <div class="form-group"><label>Categoría</label>
          <select class="form-control" id="e-category">
            <option>Mantenimiento</option><option>Servicios</option><option>Reparación</option><option>Limpieza</option><option>Otro</option>
          </select>
        </div>
        <div class="form-group"><label>Fecha</label><input type="date" class="form-control" id="e-date"/></div>
        <div class="form-group full"><label>Notas</label><textarea class="form-control" id="e-notes" rows="2"></textarea></div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.saveExpense('${propId}')">Guardar Gasto</button>
    `);
  };

  async function saveExpense(propId) {
    const data = {
      property_id: propId,
      concept: document.getElementById('e-concept').value.trim(),
      amount: parseFloat(document.getElementById('e-amount').value)||0,
      category: document.getElementById('e-category').value,
      expense_date: document.getElementById('e-date').value||null,
      notes: document.getElementById('e-notes').value.trim(),
    };
    if (!data.concept) { toast('El concepto es obligatorio','error'); return; }
    try {
      await DB.insert('property_expenses', data);
      closeModal(); toast('Gasto registrado','success');
      navigate('inmueble-detalle',{id:propId});
    } catch(e) { toast('Error: '+e.message,'error'); }
  }

  async function deleteExpense(id, propId) {
    confirm('¿Eliminar este gasto?', async()=>{
      try { await DB.delete('property_expenses', id); toast('Gasto eliminado','success'); navigate('inmueble-detalle',{id:propId}); }
      catch(e) { toast('Error: '+e.message,'error'); }
    });
  }

  // SERVICE MODAL
  modals.newService = function(tenantId) {
    openModal('Agregar Servicio', `
      <div class="form-grid">
        <div class="form-group full"><label>Nombre del Servicio *</label><input class="form-control" id="sv-name" placeholder="WiFi, Cable, Estacionamiento..."/></div>
        <div class="form-group"><label>Precio (MXN)</label><input type="number" class="form-control" id="sv-price" value="0"/></div>
        <div class="form-group"><label>Frecuencia</label>
          <select class="form-control" id="sv-freq">
            <option value="mensual">Mensual</option><option value="semanal">Semanal</option><option value="anual">Anual</option><option value="unico">Único</option>
          </select>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.saveService('${tenantId}')">Guardar Servicio</button>
    `);
  };

  async function saveService(tenantId) {
    const data = {
      tenant_id: tenantId,
      name: document.getElementById('sv-name').value.trim(),
      price: parseFloat(document.getElementById('sv-price').value)||0,
      frequency: document.getElementById('sv-freq').value,
      active: true,
    };
    if (!data.name) { toast('El nombre es obligatorio','error'); return; }
    try {
      await DB.insert('tenant_services', data);
      closeModal(); toast('Servicio agregado','success');
      navigate('inquilino-detalle',{id:tenantId});
    } catch(e) { toast('Error: '+e.message,'error'); }
  }

  async function deleteService(id, tenantId) {
    confirm('¿Eliminar este servicio?', async()=>{
      try { await DB.delete('tenant_services', id); toast('Servicio eliminado','success'); navigate('inquilino-detalle',{id:tenantId}); }
      catch(e) { toast('Error: '+e.message,'error'); }
    });
  }

  // USER MODALS
  modals.newUser = function() {
    openModal('Nuevo Usuario', `
      <div class="form-grid">
        <div class="form-group"><label>Nombre de Usuario *</label><input class="form-control" id="u-username" placeholder="juanperez"/></div>
        <div class="form-group"><label>Nombre Completo</label><input class="form-control" id="u-name"/></div>
        <div class="form-group full"><label>Correo Electrónico * <small style="color:var(--text-muted)">(para iniciar sesión)</small></label>
          <input type="email" class="form-control" id="u-email" placeholder="correo@ejemplo.com"/></div>
        <div class="form-group"><label>Contraseña * <small style="color:var(--text-muted)">(mín. 6 caracteres)</small></label>
          <input type="password" class="form-control" id="u-pass" placeholder="••••••••"/></div>
        <div class="form-group"><label>Rol *</label>
          <select class="form-control" id="u-role">
            <option value="socio">Socio</option>
            <option value="inquilino">Inquilino</option>
            <option value="limpieza">Personal de Limpieza</option>
            <option value="seguridad">Personal de Seguridad</option>
            <option value="mantenimiento">Mantenimiento</option>
          </select>
        </div>
      </div>
      <div id="user-save-error" style="color:var(--danger);font-size:13px;margin-top:12px;display:none"></div>
      <p style="font-size:12px;color:var(--text-muted);margin-top:12px">
        ⓘ El usuario podrá iniciar sesión con su <strong>nombre de usuario</strong> o su <strong>correo</strong>.
      </p>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.saveUser()">Crear Usuario</button>
    `);
  };

  modals.editUser = async function(id) {
    const u = await DB.getById('app_users', id);
    openModal('Editar Usuario', `
      <input type="hidden" id="u-id" value="${u.id}"/>
      <div class="form-grid">
        <div class="form-group"><label>Nombre de Usuario</label>
          <input class="form-control" id="u-username" value="${escHtml(u.username||'')}"/></div>
        <div class="form-group"><label>Nombre Completo</label>
          <input class="form-control" id="u-name" value="${escHtml(u.display_name||'')}"/></div>
        <div class="form-group full"><label>Email</label>
          <input type="email" class="form-control" id="u-email" value="${escHtml(u.email||'')}" disabled style="opacity:.6"/>
          <small style="color:var(--text-muted);font-size:11px">El email no se puede cambiar aquí por seguridad.</small></div>
        <div class="form-group"><label>Rol *</label>
          <select class="form-control" id="u-role">
            ${['socio','inquilino','limpieza','seguridad','mantenimiento'].map(r=>`<option value="${r}"${u.role===r?' selected':''}>${roleLabel(r)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Estado</label>
          <select class="form-control" id="u-active">
            <option value="true"${u.active?' selected':''}>Activo</option>
            <option value="false"${!u.active?' selected':''}>Inactivo</option>
          </select>
        </div>
        <div class="form-group full"><label>Nueva Contraseña <small style="color:var(--text-muted)">(vacío = no cambiar)</small></label>
          <input type="password" class="form-control" id="u-pass" placeholder="••••••••"/></div>
      </div>
      <div id="user-save-error" style="color:var(--danger);font-size:13px;margin-top:12px;display:none"></div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.saveUser()">Guardar Cambios</button>
    `);
  };

  async function saveUser() {
    const id       = document.getElementById('u-id')?.value;
    const username = document.getElementById('u-username')?.value.trim().toLowerCase();
    const name     = document.getElementById('u-name')?.value.trim();
    const email    = document.getElementById('u-email')?.value.trim();
    const pass     = document.getElementById('u-pass')?.value;
    const role     = document.getElementById('u-role')?.value;
    const activeVal= document.getElementById('u-active')?.value;
    const errDiv   = document.getElementById('user-save-error');
    const showErr  = (msg) => { if(errDiv){errDiv.textContent=msg;errDiv.style.display='block';} toast(msg,'error'); };

    if (id) {
      // EDIT MODE
      const updates = { role, display_name: name };
      if (username) updates.username = username;
      if (activeVal !== undefined) updates.active = activeVal === 'true';
      try {
        await DB.update('app_users', id, updates);
        if (pass && pass.length >= 6) {
          toast('Contraseña: para cambiarla usa Supabase → Authentication → Users → editar.', 'info');
        }
        closeModal(); toast('Usuario actualizado ✓', 'success'); navigate('usuarios');
      } catch(e) { showErr('Error: ' + e.message); }
      return;
    }

    // CREATE MODE
    if (!email || !pass) { showErr('Email y contraseña son obligatorios'); return; }
    if (pass.length < 6) { showErr('La contraseña debe tener al menos 6 caracteres'); return; }
    if (!email.includes('@')) { showErr('Ingresa un correo válido'); return; }
    try {
      if (username) {
        const { data: ex } = await sb.from('app_users').select('id').eq('username', username).maybeSingle();
        if (ex) { showErr('Ese nombre de usuario ya está en uso'); return; }
      }
      const adminSession = (await sb.auth.getSession()).data.session;
      const { data: authData, error: authErr } = await sb.auth.signUp({ email, password: pass });
      if (authErr) throw authErr;
      if (adminSession?.access_token) {
        await sb.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
      }
      const newId = authData?.user?.id;
      if (!newId) throw new Error('No se pudo obtener el ID del usuario creado.');
      await DB.insert('app_users', {
        id: newId, username: username || email.split('@')[0],
        role, display_name: name || username || email.split('@')[0], email, active: true,
      });
      closeModal(); toast('Usuario creado ✓', 'success'); navigate('usuarios');
    } catch(e) {
      let msg = e.message;
      if (msg.includes('already registered')) msg = 'Ese correo ya está registrado.';
      if (msg.includes('weak_password'))      msg = 'Contraseña muy débil (mín. 6 caracteres).';
      showErr(msg);
    }
  }

  async function toggleUserActive(id, active) {
    try {
      await DB.update('app_users', id, { active });
      toast(`Usuario ${active?'activado':'desactivado'} ✓`, 'success');
      navigate('usuarios');
    } catch(e) { toast('Error: '+e.message,'error'); }
  }

  async function deleteUser(id) {
    confirm('¿Eliminar este usuario permanentemente?', async () => {
      try {
        await DB.delete('app_users', id);
        toast('Usuario eliminado ✓', 'success');
        navigate('usuarios');
      } catch(e) { toast('Error: '+e.message,'error'); }
    });
  }

  // DOCUMENT UPLOAD MODAL
  modals.uploadDocument = function(entityId, entityType) {
    openModal('Subir Documento', `
      <div class="form-grid">
        <div class="form-group full"><label>Nombre del Documento *</label><input class="form-control" id="d-name" placeholder="Contrato de arrendamiento..."/></div>
        <div class="form-group"><label>Categoría</label>
          <select class="form-control" id="d-category">
            <option>Contrato</option><option>Identificación</option><option>Comprobante</option><option>Escritura</option><option>Permiso</option><option>Otro</option>
          </select>
        </div>
        <div class="form-group"><label>Tipo</label>
          <select class="form-control" id="d-type"><option value="pdf">PDF</option><option value="image">Imagen</option><option value="other">Otro</option></select>
        </div>
        <div class="form-group full"><label>Archivo</label><input type="file" class="form-control" id="d-file"/></div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.saveDocument('${entityId}','${entityType}')">Subir Documento</button>
    `);
  };

  async function saveDocument(entityId, entityType) {
    const name = document.getElementById('d-name').value.trim();
    const category = document.getElementById('d-category').value;
    const type = document.getElementById('d-type').value;
    const fileInput = document.getElementById('d-file');
    if (!name) { toast('El nombre es obligatorio','error'); return; }
    let url = '';
    if (fileInput.files[0]) {
      try {
        url = await uploadFile(fileInput.files[0], 'documents', `${entityType}/${entityId}/${Date.now()}_${fileInput.files[0].name}`);
      } catch(e) {
        // If storage not configured, store as base64
        url = await fileToBase64(fileInput.files[0]);
      }
    }
    try {
      await DB.insert('documents', { name, category, type, url, entity_id: entityId, entity_type: entityType });
      closeModal(); toast('Documento subido','success');
      navigate(currentPage);
    } catch(e) { toast('Error: '+e.message,'error'); }
  }

  async function deleteDocument(id, entityId, entityType) {
    confirm('¿Eliminar este documento?', async()=>{
      try { await DB.delete('documents', id); toast('Documento eliminado','success'); navigate(currentPage); }
      catch(e) { toast('Error: '+e.message,'error'); }
    });
  }

  // PACKAGE MODAL
  modals.newPackage = function() {
    openModal('Crear Paquete', `
      <div class="form-grid">
        <div class="form-group full"><label>Nombre del Paquete *</label><input class="form-control" id="pk-name" placeholder="Paquete Básico"/></div>
        <div class="form-group"><label>Precio Mensual (MXN)</label><input type="number" class="form-control" id="pk-price" value="0"/></div>
        <div class="form-group full"><label>Características (una por línea)</label><textarea class="form-control" id="pk-features" rows="5" placeholder="Limpieza semanal\nSeguridad 24h\nMantenimiento mensual"></textarea></div>
        <div class="form-group full"><label>Descripción</label><textarea class="form-control" id="pk-desc" rows="2"></textarea></div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.savePackage()">Crear Paquete</button>
    `);
  };

  modals.editPackage = async function(id) {
    const pk = await DB.getById('packages', id);
    openModal('Editar Paquete', `
      <input type="hidden" id="pk-id" value="${pk.id}"/>
      <div class="form-grid">
        <div class="form-group full"><label>Nombre *</label><input class="form-control" id="pk-name" value="${escHtml(pk.name)}"/></div>
        <div class="form-group"><label>Precio Mensual</label><input type="number" class="form-control" id="pk-price" value="${pk.price||0}"/></div>
        <div class="form-group full"><label>Características (una por línea)</label><textarea class="form-control" id="pk-features" rows="5">${(pk.features||[]).join('\n')}</textarea></div>
        <div class="form-group full"><label>Descripción</label><textarea class="form-control" id="pk-desc" rows="2">${escHtml(pk.description||'')}</textarea></div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.savePackage()">Actualizar</button>
    `);
  };

  async function savePackage() {
    const id = document.getElementById('pk-id')?.value;
    const data = {
      name: document.getElementById('pk-name').value.trim(),
      price: parseFloat(document.getElementById('pk-price').value)||0,
      features: document.getElementById('pk-features').value.split('\n').map(s=>s.trim()).filter(Boolean),
      description: document.getElementById('pk-desc').value.trim(),
    };
    if (!data.name) { toast('El nombre es obligatorio','error'); return; }
    try {
      id ? await DB.update('packages', id, data) : await DB.insert('packages', data);
      closeModal(); toast('Paquete guardado','success'); navigate('paquetes');
    } catch(e) { toast('Error: '+e.message,'error'); }
  }

  async function deletePackage(id) {
    confirm('¿Eliminar este paquete?', async()=>{
      try { await DB.delete('packages', id); toast('Paquete eliminado','success'); navigate('paquetes'); }
      catch(e) { toast('Error: '+e.message,'error'); }
    });
  }

  // TRANSACTION MODAL (Socio)
  modals.newTransaction = function() {
    openModal('Registrar Transacción', `
      <div class="form-grid">
        <div class="form-group full"><label>Nombre del Inmueble *</label><input class="form-control" id="tr-propname"/></div>
        <div class="form-group"><label>Tipo</label>
          <select class="form-control" id="tr-type"><option value="venta">Venta</option><option value="compra">Compra</option></select>
        </div>
        <div class="form-group"><label>Precio Compra (MXN)</label><input type="number" class="form-control" id="tr-buy" value="0"/></div>
        <div class="form-group"><label>Precio Venta (MXN)</label><input type="number" class="form-control" id="tr-sell" value="0"/></div>
        <div class="form-group"><label>Fecha</label><input type="date" class="form-control" id="tr-date"/></div>
        <div class="form-group full"><label>Notas</label><textarea class="form-control" id="tr-notes" rows="2"></textarea></div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.saveTransaction()">Registrar</button>
    `);
  };

  async function saveTransaction() {
    const buy = parseFloat(document.getElementById('tr-buy').value)||0;
    const sell = parseFloat(document.getElementById('tr-sell').value)||0;
    const data = {
      property_name: document.getElementById('tr-propname').value.trim(),
      type: document.getElementById('tr-type').value,
      buy_price: buy, sell_price: sell,
      profit: sell - buy,
      transaction_date: document.getElementById('tr-date').value||null,
      notes: document.getElementById('tr-notes').value.trim(),
    };
    if (!data.property_name) { toast('El nombre es obligatorio','error'); return; }
    try {
      await DB.insert('property_transactions', data);
      closeModal(); toast('Transacción registrada','success');
      navigate('socio-ganancias');
    } catch(e) { toast('Error: '+e.message,'error'); }
  }

  async function deleteTransaction(id) {
    confirm('¿Eliminar esta transacción?', async()=>{
      try { await DB.delete('property_transactions', id); toast('Eliminado','success'); navigate('socio-ganancias'); }
      catch(e) { toast('Error: '+e.message,'error'); }
    });
  }

  // PHOTO UPLOAD
  async function uploadPropertyPhotos(input, propId) {
    const files = Array.from(input.files);
    if (!files.length) return;
    toast('Subiendo fotos...','info');
    try {
      const prop = await DB.getById('properties', propId);
      const photos = prop.photos || [];
      for (const file of files) {
        let url;
        try {
          url = await uploadFile(file, 'photos', `properties/${propId}/${Date.now()}_${file.name}`);
        } catch {
          url = await fileToBase64(file);
        }
        photos.push(url);
      }
      await DB.update('properties', propId, { photos });
      toast('Fotos subidas','success');
      navigate('inmueble-detalle',{id:propId});
    } catch(e) { toast('Error: '+e.message,'error'); }
  }

  async function deletePropertyPhoto(propId, url) {
    confirm('¿Eliminar esta foto?', async()=>{
      try {
        const prop = await DB.getById('properties', propId);
        const photos = (prop.photos||[]).filter(p=>p!==url);
        await DB.update('properties', propId, { photos });
        toast('Foto eliminada','success');
        navigate('inmueble-detalle',{id:propId});
      } catch(e) { toast('Error: '+e.message,'error'); }
    });
  }

  // ── EXCEL EXPORTS ───────────────────────────────────────────────
  async function exportPropertiesExcel() {
    const props = await DB.get('properties');
    const data = props.map(p => ({
      Nombre: p.name, Tipo: p.type, Dirección: p.address, Ciudad: p.city,
      'Precio/mes': p.price, Habitaciones: p.rooms, Baños: p.baths,
      'Área m²': p.area, Estado: p.status
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inmuebles');
    XLSX.writeFile(wb, 'inmuebles.xlsx');
  }

  async function exportTenantsExcel() {
    const [tenants, props] = await Promise.all([DB.get('tenants'), DB.get('properties')]);
    const data = tenants.map(t => {
      const p = props.find(x => x.id === t.property_id);
      return { Nombre: t.name, Inmueble: p?.name||'—', Cuarto: t.room, 'Renta Mensual': t.monthly_rent, Teléfono: t.phone, Email: t.email, Estado: t.status };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PEDIDOS');
    XLSX.writeFile(wb, 'PEDIDOS.xlsx');
  }

  // ── REPORTS ─────────────────────────────────────────────────────
  const Reports = {
    async tenantReport(tenantId, period = 'monthly') {
      const [t, payments, services, props] = await Promise.all([
        DB.getById('tenants', tenantId),
        DB.get('payments', { tenant_id: tenantId }),
        DB.get('tenant_services', { tenant_id: tenantId }),
        DB.get('properties')
      ]);
      const prop = props.find(p => p.id === t.property_id);
      const now = new Date();
      const monthPayments = period === 'monthly'
        ? payments.filter(p => { const d = new Date(p.created_at); return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear(); })
        : payments.filter(p => new Date(p.created_at).getFullYear()===now.getFullYear());

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const gold = [201,168,76];
      const dark = [26,26,46];

      // Header
      doc.setFillColor(...dark);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(...gold);
      doc.setFontSize(22);
      doc.text('InmobiliariaPro', 15, 18);
      doc.setFontSize(11);
      doc.setTextColor(200,200,200);
      doc.text('Reporte de Inquilino — ' + (period==='monthly'?`${now.toLocaleString('es-MX',{month:'long',year:'numeric'})}`:now.getFullYear().toString()), 15, 28);
      doc.text(`Generado: ${fmtDate(now.toISOString())}`, 15, 36);

      // Tenant info
      doc.setTextColor(...dark);
      doc.setFontSize(15);
      doc.text(t.name, 15, 55);
      doc.setFontSize(10);
      doc.setTextColor(80,80,80);
      doc.text(`Inmueble: ${prop?.name||'—'} | Cuarto: ${t.room||'—'} | Renta: ${fmt(t.monthly_rent)}/mes`, 15, 63);
      doc.text(`Entrada: ${fmtDate(t.move_in_date)} | Contrato hasta: ${fmtDate(t.contract_end)}`, 15, 70);

      // Payments table
      doc.setFontSize(12);
      doc.setTextColor(...dark);
      doc.text('Historial de Pagos', 15, 85);
      doc.autoTable({
        startY: 90,
        head: [['Concepto','Período','Monto','Fecha','Estado']],
        body: monthPayments.map(p => [p.concept||'Renta', p.period||'—', fmt(p.amount), fmtDate(p.payment_date||p.created_at), p.status==='paid'?'Pagado':p.status==='pending'?'Pendiente':'Vencido']),
        headStyles: { fillColor: dark, textColor: gold, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245,245,250] },
      });

      let y = doc.lastAutoTable.finalY + 10;
      // Services
      if (services.length) {
        doc.text('Servicios Contratados', 15, y+5);
        doc.autoTable({
          startY: y+10,
          head: [['Servicio','Precio','Frecuencia','Estado']],
          body: services.map(s => [s.name, fmt(s.price), s.frequency||'mensual', s.active?'Activo':'Inactivo']),
          headStyles: { fillColor: dark, textColor: gold, fontSize: 9 },
          bodyStyles: { fontSize: 9 },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // Summary
      const totalPaid = monthPayments.filter(p=>p.status==='paid').reduce((s,p)=>s+(p.amount||0),0);
      const totalPending = monthPayments.filter(p=>p.status==='pending').reduce((s,p)=>s+(p.amount||0),0);
      const totalServices = services.filter(s=>s.active).reduce((s,sv)=>s+(sv.price||0),0);

      doc.setFillColor(245,245,250);
      doc.rect(14, y, 182, 32, 'F');
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text(`Total Pagado: ${fmt(totalPaid)}`, 20, y+10);
      doc.text(`Total Pendiente: ${fmt(totalPending)}`, 80, y+10);
      doc.text(`Servicios Mensuales: ${fmt(totalServices)}`, 140, y+10);
      doc.setFontSize(12);
      doc.setTextColor(...gold);
      doc.text(`Renta Mensual: ${fmt(t.monthly_rent)}`, 20, y+24);

      doc.save(`reporte_${t.name.replace(/\s/g,'_')}_${period}.pdf`);
      toast('Reporte PDF generado','success');
    },

    async tenantExcel(tenantId) {
      const [t, payments, services] = await Promise.all([
        DB.getById('tenants', tenantId),
        DB.get('payments', { tenant_id: tenantId }),
        DB.get('tenant_services', { tenant_id: tenantId }),
      ]);
      const wb = XLSX.utils.book_new();
      // Sheet 1: Payments
      const payData = payments.map(p => ({ Concepto: p.concept||'Renta', Monto: p.amount, Período: p.period||'—', Fecha: fmtDate(p.payment_date||p.created_at), Estado: p.status==='paid'?'Pagado':'Pendiente' }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payData), 'Pagos');
      // Sheet 2: Services
      const svcData = services.map(s => ({ Servicio: s.name, Precio: s.price, Frecuencia: s.frequency||'mensual', Estado: s.active?'Activo':'Inactivo' }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(svcData), 'Servicios');
      XLSX.writeFile(wb, `reporte_${t.name.replace(/\s/g,'_')}.xlsx`);
      toast('Excel generado','success');
    },

    async propertyReport(propId) {
      const [prop, tenants, expenses, payments] = await Promise.all([
        DB.getById('properties', propId),
        DB.get('tenants', { property_id: propId }),
        DB.get('property_expenses', { property_id: propId }),
        DB.get('payments')
      ]);
      const propPayments = payments.filter(p => tenants.some(t => t.id === p.tenant_id));
      const totalRent = tenants.reduce((s,t)=>s+(t.monthly_rent||0),0);
      const totalExp = expenses.reduce((s,e)=>s+(e.amount||0),0);
      const totalIncome = propPayments.filter(p=>p.status==='paid').reduce((s,p)=>s+(p.amount||0),0);

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const gold = [201,168,76];
      const dark = [26,26,46];

      doc.setFillColor(...dark);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(...gold);
      doc.setFontSize(22);
      doc.text('InmobiliariaPro', 15, 18);
      doc.setFontSize(11);
      doc.setTextColor(200,200,200);
      doc.text(`Reporte de Inmueble — ${prop.name}`, 15, 28);
      doc.text(`Generado: ${fmtDate(new Date().toISOString())}`, 15, 36);

      doc.setTextColor(...dark);
      doc.setFontSize(15);
      doc.text(prop.name, 15, 55);
      doc.setFontSize(10);
      doc.setTextColor(80,80,80);
      doc.text(`${prop.type||''} · ${prop.address||''} · ${prop.city||''}`, 15, 63);

      doc.setFontSize(12);
      doc.setTextColor(...dark);
      doc.text('PEDIDOS', 15, 78);
      doc.autoTable({
        startY: 83,
        head: [['Nombre','Cuarto','Renta/mes','Desde','Estado']],
        body: tenants.map(t => [t.name, t.room||'—', fmt(t.monthly_rent), fmtDate(t.move_in_date), t.status||'activo']),
        headStyles: { fillColor: dark, textColor: gold, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
      });

      let y = doc.lastAutoTable.finalY + 10;
      doc.text('Gastos del Inmueble', 15, y+5);
      doc.autoTable({
        startY: y+10,
        head: [['Concepto','Categoría','Monto','Fecha']],
        body: expenses.map(e => [e.concept, e.category||'—', fmt(e.amount), fmtDate(e.expense_date||e.created_at)]),
        headStyles: { fillColor: dark, textColor: gold, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
      });

      y = doc.lastAutoTable.finalY + 15;
      doc.setFillColor(245,245,250);
      doc.rect(14, y, 182, 38, 'F');
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text(`Renta Total Mensual: ${fmt(totalRent)}`, 20, y+12);
      doc.text(`Total Egresos: ${fmt(totalExp)}`, 110, y+12);
      doc.text(`Total Ingresos Cobrados: ${fmt(totalIncome)}`, 20, y+22);
      doc.setFontSize(13);
      doc.setTextColor(...gold);
      doc.text(`Balance Estimado: ${fmt(totalRent - totalExp)}`, 20, y+34);

      doc.save(`reporte_inmueble_${prop.name.replace(/\s/g,'_')}.pdf`);
      toast('Reporte PDF generado','success');
    },

    async propertyExcel(propId) {
      const [prop, tenants, expenses] = await Promise.all([
        DB.getById('properties', propId),
        DB.get('tenants', { property_id: propId }),
        DB.get('property_expenses', { property_id: propId }),
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tenants.map(t=>({ Nombre:t.name, Cuarto:t.room, 'Renta/mes':t.monthly_rent, Estado:t.status }))), 'PEDIDOS');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenses.map(e=>({ Concepto:e.concept, Categoría:e.category, Monto:e.amount, Fecha:fmtDate(e.expense_date||e.created_at) }))), 'Gastos');
      XLSX.writeFile(wb, `reporte_inmueble_${prop.name.replace(/\s/g,'_')}.xlsx`);
      toast('Excel generado','success');
    },

    async financeReport() {
      const [payments, expenses, staff] = await Promise.all([DB.get('payments'), DB.get('property_expenses'), DB.get('staff')]);
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const gold = [201,168,76]; const dark = [26,26,46];
      doc.setFillColor(...dark);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(...gold); doc.setFontSize(22);
      doc.text('InmobiliariaPro', 15, 18);
      doc.setFontSize(11); doc.setTextColor(200,200,200);
      doc.text('Reporte Financiero General', 15, 28);
      doc.text(`Generado: ${fmtDate(new Date().toISOString())}`, 15, 36);

      doc.setTextColor(...dark); doc.setFontSize(12);
      doc.text('Registro de Pagos', 15, 55);
      doc.autoTable({
        startY: 60,
        head: [['Concepto','Monto','Fecha','Estado']],
        body: payments.slice(0,30).map(p=>[p.concept||'Renta', fmt(p.amount), fmtDate(p.payment_date||p.created_at), p.status==='paid'?'Pagado':'Pendiente']),
        headStyles: { fillColor: dark, textColor: gold, fontSize: 9 }, bodyStyles: { fontSize: 8 },
      });
      let y = doc.lastAutoTable.finalY + 10;
      doc.text('Gastos', 15, y);
      doc.autoTable({
        startY: y+5,
        head: [['Concepto','Categoría','Monto','Fecha']],
        body: expenses.slice(0,20).map(e=>[e.concept, e.category||'—', fmt(e.amount), fmtDate(e.expense_date||e.created_at)]),
        headStyles: { fillColor: dark, textColor: gold, fontSize: 9 }, bodyStyles: { fontSize: 8 },
      });

      const totalIn = payments.filter(p=>p.status==='paid').reduce((s,p)=>s+(p.amount||0),0);
      const totalEx = expenses.reduce((s,e)=>s+(e.amount||0),0);
      const staffCost = staff.reduce((s,st)=>s+(st.salary||0),0);
      y = doc.lastAutoTable.finalY + 15;
      doc.setFillColor(245,245,250); doc.rect(14, y, 182, 30, 'F');
      doc.setFontSize(10); doc.setTextColor(...dark);
      doc.text(`Ingresos: ${fmt(totalIn)}  |  Gastos: ${fmt(totalEx)}  |  Nómina: ${fmt(staffCost)}`, 20, y+12);
      doc.setFontSize(13); doc.setTextColor(...gold);
      doc.text(`Balance Neto: ${fmt(totalIn - totalEx - staffCost)}`, 20, y+24);
      doc.save('reporte_financiero.pdf');
      toast('Reporte financiero generado','success');
    },

    async financeExcel() {
      const [payments, expenses, staff] = await Promise.all([DB.get('payments'), DB.get('property_expenses'), DB.get('staff')]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payments.map(p=>({ Concepto:p.concept||'Renta', Monto:p.amount, Fecha:fmtDate(p.payment_date||p.created_at), Estado:p.status }))), 'Pagos');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenses.map(e=>({ Concepto:e.concept, Categoría:e.category, Monto:e.amount, Fecha:fmtDate(e.expense_date||e.created_at) }))), 'Gastos');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staff.map(s=>({ Nombre:s.name, Rol:roleLabel(s.role), Salario:s.salary }))), 'Personal');
      XLSX.writeFile(wb, 'reporte_financiero.xlsx');
      toast('Excel generado','success');
    },

    async staffReport() {
      const staff = await DB.get('staff');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const gold = [201,168,76]; const dark = [26,26,46];
      doc.setFillColor(...dark); doc.rect(0,0,210,40,'F');
      doc.setTextColor(...gold); doc.setFontSize(22); doc.text('InmobiliariaPro', 15, 18);
      doc.setFontSize(11); doc.setTextColor(200,200,200); doc.text('Reporte de Personal', 15, 28);
      doc.text(`Generado: ${fmtDate(new Date().toISOString())}`, 15, 36);
      doc.setTextColor(...dark); doc.setFontSize(12); doc.text('Nómina', 15, 55);
      doc.autoTable({
        startY: 60,
        head: [['Nombre','Rol','Teléfono','Salario/mes','Inicio']],
        body: staff.map(s=>[s.name, roleLabel(s.role), s.phone||'—', fmt(s.salary), fmtDate(s.start_date)]),
        headStyles: { fillColor: dark, textColor: gold, fontSize: 9 }, bodyStyles: { fontSize: 9 },
      });
      const total = staff.reduce((s,st)=>s+(st.salary||0),0);
      const y = doc.lastAutoTable.finalY + 15;
      doc.setFillColor(245,245,250); doc.rect(14,y,182,20,'F');
      doc.setFontSize(12); doc.setTextColor(...gold);
      doc.text(`Nómina Total Mensual: ${fmt(total)}`, 20, y+13);
      doc.save('reporte_personal.pdf');
      toast('Reporte de personal generado','success');
    },

    async staffExcel() {
      const staff = await DB.get('staff');
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staff.map(s=>({ Nombre:s.name, Rol:roleLabel(s.role), Teléfono:s.phone||'—', Email:s.email||'—', Salario:s.salary, Inicio:fmtDate(s.start_date) }))), 'Personal');
      XLSX.writeFile(wb, 'reporte_personal.xlsx');
      toast('Excel generado','success');
    },

    async tenantReportFromPage() {
      const id = document.getElementById('rpt-tenant')?.value;
      const period = document.getElementById('rpt-period')?.value || 'monthly';
      if (!id) { toast('Selecciona un inquilino','error'); return; }
      await Reports.tenantReport(id, period);
    },

    async tenantExcelFromPage() {
      const id = document.getElementById('rpt-tenant')?.value;
      if (!id) { toast('Selecciona un inquilino','error'); return; }
      await Reports.tenantExcel(id);
    },

    async propertyReportFromPage() {
      const id = document.getElementById('rpt-property')?.value;
      if (!id) { toast('Selecciona un inmueble','error'); return; }
      await Reports.propertyReport(id);
    },

    async propertyExcelFromPage() {
      const id = document.getElementById('rpt-property')?.value;
      if (!id) { toast('Selecciona un inmueble','error'); return; }
      await Reports.propertyExcel(id);
    },
  };

  // ── TABS HELPER ─────────────────────────────────────────────────
  // exposed globally
  window.switchTab = function(btn, targetId) {
    const container = btn.closest('.tabs') || btn.parentElement;
    const allBtns = container.querySelectorAll('.tab-btn');
    allBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const mainContent = document.getElementById('page-content');
    mainContent.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const target = document.getElementById(targetId);
    if (target) target.classList.add('active');
  };

  // ── INIT ON LOAD ────────────────────────────────────────────────
  function boot() {
    const hasConn = initSupabase();
    if (hasConn) {
      document.getElementById('supabase-setup').classList.add('hidden');
      const savedUser = sessionStorage.getItem('current_user');
      if (savedUser) {
        try {
          currentUser = JSON.parse(savedUser);
          document.getElementById('login-screen').classList.add('hidden');
          document.getElementById('app').classList.remove('hidden');
          initApp();
        } catch {
          sessionStorage.removeItem('current_user');
          document.getElementById('login-screen').classList.remove('hidden');
        }
      } else {
        document.getElementById('login-screen').classList.remove('hidden');
      }
    }
  }

  document.addEventListener('DOMContentLoaded', boot);

  // ── PUBLIC API ──────────────────────────────────────────────────
  return {
    setupSupabase, login, logout,
    navigate, openSidebar, closeSidebar,
    openModal, closeModal, confirm, closeConfirm, doConfirm,
    toast, fmt, fmtDate, escHtml,
    isAdmin, isSocio, canSeeDocuments,
    filterProperties, filterTenants,
    saveProperty, deleteProperty,
    saveTenant, deleteTenant,
    saveStaff, deleteStaff,
    doAssignStaff, removeStaffAssignment,
    savePayment, deletePayment, markPaymentPaid,
    saveExpense, deleteExpense,
    saveService, deleteService,
    saveUser, toggleUserActive, deleteUser,
    saveDocument, deleteDocument,
    savePackage, deletePackage,
    saveTransaction, deleteTransaction,
    uploadPropertyPhotos, deletePropertyPhoto,
    exportPropertiesExcel, exportTenantsExcel,
    resetConnection, showNotifications, goConfig,
    modals, Reports, DB,
  };

})();
