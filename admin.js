'use strict';
(function(){
  // Init Firebase (optional)
  let auth = null, db = null;
  try {
    if (window.firebase) {
      if (!firebase.apps.length && window.FIREBASE_CONFIG) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      if (firebase.apps && firebase.apps.length) {
        auth = firebase.auth();
        db = firebase.firestore();
      }
    }
  } catch (e) { /* ignore, optional */ }

  const el = (id)=>document.getElementById(id);
  const gate = el('gate');
  const dash = el('dashboard');
  const ADMIN_USER = 'sattorov_ruslan.admin';
  const ADMIN_PASS = 'ruslan0801.8898';

  // Auth gate
  function showGate(){ gate?.classList.remove('hidden'); dash?.classList.add('hidden'); }
  function showDash(){ gate?.classList.add('hidden'); dash?.classList.remove('hidden'); }
  function isBasicAdmin(){ try { return sessionStorage.getItem('basicAdmin') === 'true'; } catch { return false; } }
  function setBasicAdmin(v){ try { if(v) sessionStorage.setItem('basicAdmin','true'); else sessionStorage.removeItem('basicAdmin'); } catch{} }

  // Local admin accounts storage (username/password pairs) — for demo only
  function getLocalAdmins(){ try { return JSON.parse(localStorage.getItem('admin_users')||'[]'); } catch { return []; } }
  function saveLocalAdmins(arr){ try { localStorage.setItem('admin_users', JSON.stringify(arr)); } catch{} }
  function findLocalAdmin(u,p){ const list=getLocalAdmins(); return list.find(x => x.u===u && x.p===p); }

  async function isAdmin(uid){
    try {
      if (!db) return false;
      const doc = await db.collection('users').doc(uid).get();
      const data = doc.exists ? doc.data() : null;
      return !!(data && data.isAdmin === true);
    } catch { return false; }
  }

  async function computeStatsUsers(users){
    const now = Date.now();
    const day = 24*60*60*1000;
    const week = 7*day;
    const total = users.length;
    const last24h = users.filter(u => u.createdAt && (now - new Date(u.createdAt).getTime() <= day)).length;
    const active7d = users.filter(u => u.lastLoginAt && (now - new Date(u.lastLoginAt).getTime() <= week)).length;
    const bannedOrInactive = users.filter(u => u.status === 'banned' || u.status === 'inactive').length;
    return { total, last24h, active7d, bannedOrInactive };
  }

  function renderStatsCards(stats){
    el('statTotalUsers').textContent = String(stats.total);
    el('statUsers24h').textContent = String(stats.last24h);
    el('statActive7d').textContent = String(stats.active7d);
    el('statBannedInactive').textContent = String(stats.bannedOrInactive);
  }

  function renderUsersTable(users){
    const tbody = el('usersTbody'); if(!tbody) return;
    const q = (el('userSearch')?.value || '').toLowerCase();
    const filtered = users.filter(u =>
      (String(u.id||u.username||'').toLowerCase().includes(q)) ||
      (String(u.name||'').toLowerCase().includes(q))
    );
    tbody.innerHTML = '';
    filtered.forEach(u => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-white/10';
      tr.innerHTML = `
        <td class="py-2 pr-4">${(u.id||u.username||'')}</td>
        <td class="py-2 pr-4">${(u.name||'').replace(/[<>]/g,'')}</td>
        <td class="py-2 pr-4">${u.createdAt? new Date(u.createdAt).toLocaleString(): ''}</td>
        <td class="py-2 pr-4">${u.lastLoginAt? new Date(u.lastLoginAt).toLocaleString(): ''}</td>
        <td class="py-2 pr-4">${u.status||'active'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderUsersChart(series){
    const ctx = document.getElementById('chartUsers');
    if (!ctx) return;
    new Chart(ctx, { type: 'line', data: { labels: series.labels, datasets: [{ label: 'Yangi foydalanuvchilar', data: series.values, borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.2)', tension: 0.3 }] }, options: { plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'#9aa4b2'}}, y:{ticks:{color:'#9aa4b2'}}}} });
  }

  function renderGenresChart(genreCounts){
    const ctx = document.getElementById('chartGenres');
    if (!ctx) return;
    const labels = Object.keys(genreCounts);
    const values = Object.values(genreCounts);
    new Chart(ctx, { type: 'doughnut', data: { labels, datasets: [{ data: values, backgroundColor: ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#22d3ee','#f97316','#84cc16']}]}, options: { plugins:{legend:{labels:{color:'#9aa4b2'}}}}});
  }

  async function loadUsersAndStats(){
    if (!db) return;
    // Read from users_basic collection (username-based auth)
    const snap = await db.collection('users_basic').limit(2000).get();
    const users = [];
    snap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
    const stats = await computeStatsUsers(users);
    renderStatsCards(stats);
    renderUsersTable(users);
    el('userSearch')?.addEventListener('input', () => renderUsersTable(users));

    // Build 30-day growth series (by createdAt)
    const map = new Map();
    const now = new Date();
    for (let i=29; i>=0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()-i);
      const key = d.toISOString().slice(0,10);
      map.set(key, 0);
    }
    users.forEach(u => {
      if (!u.createdAt) return;
      const key = new Date(u.createdAt).toISOString().slice(0,10);
      if (map.has(key)) map.set(key, (map.get(key)||0)+1);
    });
    renderUsersChart({ labels: Array.from(map.keys()), values: Array.from(map.values()) });
  }

  async function loadGenresChart(){
    // Expect collection 'cms_movies'
    const snap = await db.collection('cms_movies').limit(1000).get();
    const counts = {};
    snap.forEach(doc => {
      const g = doc.data().genres;
      const arr = Array.isArray(g) ? g : String(g||'').split(',').map(s=>s.trim()).filter(Boolean);
      arr.forEach(x => { counts[x] = (counts[x]||0)+1; });
    });
    renderGenresChart(counts);
  }

  async function contentCreate(){
    const title = el('cTitle').value.trim();
    const year = el('cYear').value.trim();
    const genres = el('cGenres').value.split(',').map(s=>s.trim()).filter(Boolean);
    const poster = el('cPoster').value.trim();
    if (!title) { el('contentCreateMsg').textContent = 'Nomi kiritilishi shart'; return; }
    try {
      const res = await db.collection('cms_movies').add({ title, year, genres, poster, createdAt: new Date().toISOString() });
      el('contentCreateMsg').textContent = 'Qo\'shildi: '+res.id;
      el('cTitle').value = el('cYear').value = el('cGenres').value = el('cPoster').value = '';
    } catch(e){ el('contentCreateMsg').textContent = 'Xatolik: '+e.message; }
  }

  async function contentLoad(){
    const id = el('editId').value.trim(); if (!id) return;
    const doc = await db.collection('cms_movies').doc(id).get();
    if (!doc.exists) { el('contentEditMsg').textContent = 'Topilmadi'; el('contentEditForm').classList.add('hidden'); return; }
    const d = doc.data();
    el('eTitle').value = d.title||''; el('eYear').value = d.year||''; el('eGenres').value = Array.isArray(d.genres)? d.genres.join(', '): (d.genres||''); el('ePoster').value = d.poster||'';
    el('contentEditForm').classList.remove('hidden');
    el('contentEditForm').onsubmit = async (e)=>{ e.preventDefault(); try{
      await db.collection('cms_movies').doc(id).set({ title: el('eTitle').value.trim(), year: el('eYear').value.trim(), genres: el('eGenres').value.split(',').map(s=>s.trim()).filter(Boolean), poster: el('ePoster').value.trim() }, { merge: true });
      el('contentEditMsg').textContent = 'Saqlandi';
    }catch(err){ el('contentEditMsg').textContent = 'Xatolik: '+err.message; } };
    el('deleteContentBtn').onclick = async ()=>{ try{ await db.collection('cms_movies').doc(id).delete(); el('contentEditMsg').textContent = 'O\'chirildi'; el('contentEditForm').classList.add('hidden'); }catch(err){ el('contentEditMsg').textContent = 'Xatolik: '+err.message; } };
  }

  function mockMonitoring(){
    el('serverStatus').textContent = 'Online';
    el('apiStats').textContent = '1200 / 1160 muvaffaqiyatli • 40 xatoli (24h)';
    el('resStats').textContent = 'CPU 32% • RAM 58% • DB OK';
  }

  // Event wiring
  document.addEventListener('DOMContentLoaded', async () => {
    // sign in/out
    el('signInAdmin')?.addEventListener('click', ()=> { if (auth) auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); });
    el('signOutAdmin')?.addEventListener('click', ()=> { setBasicAdmin(false); if (auth) auth.signOut(); });
    // Basic username/password login (demo)
    el('signInAdminBasic')?.addEventListener('click', ()=>{
      const u = (el('adminUsername')?.value || '').trim();
      const p = (el('adminPassword')?.value || '').trim();
      if (!u || !p) { alert('Login va parolni kiriting'); return; }
      const isHardcoded = (u === ADMIN_USER && p === ADMIN_PASS);
      const isLocal = !!findLocalAdmin(u,p);
      if (isHardcoded || isLocal) {
        setBasicAdmin(true);
        showDash();
        try{ mockMonitoring(); }catch{}
        try{ loadUsersAndStats(); }catch{}
        try{ loadGenresChart(); }catch{}
      } else {
        alert('Login yoki parol noto\'g\'ri. Iltimos, avval Ro\'yxatdan o\'ting (Admin).');
      }
    });

    // Basic admin sign-up: saves username/password locally
    el('signUpAdminBasic')?.addEventListener('click', ()=>{
      const u = (el('adminUsername')?.value || '').trim();
      const p = (el('adminPassword')?.value || '').trim();
      if (!u || !p) { alert('Ro\'yxatdan o\'tish uchun login va parolni kiriting'); return; }
      const list = getLocalAdmins();
      if (list.find(x => x.u === u)) { alert('Bu login bilan admin mavjud. Iltimos boshqa login tanlang yoki kirishga urinib ko\'ring.'); return; }
      list.push({ u, p, at: new Date().toISOString() });
      saveLocalAdmins(list);
      alert('Admin muvaffaqiyatli ro\'yxatdan o\'tkazildi. Endi shu login va parol bilan kirishingiz mumkin.');
    });

    auth?.onAuthStateChanged(async user => {
      // If logged in and admin in Firestore
      if (user) {
        const ok = await isAdmin(user.uid);
        if (ok) {
          showDash();
          mockMonitoring();
          try{ await loadUsersAndStats(); }catch{}
          try{ await loadGenresChart(); }catch{}
          return;
        }
      }
      // Else allow basic admin if session set OR username-based local session exists
      const localUser = (function(){ try { return JSON.parse(localStorage.getItem('local_user')||'null'); } catch { return null; } })();
      if (isBasicAdmin() || localUser) {
        showDash();
        mockMonitoring();
        try{ await loadUsersAndStats(); }catch{}
        try{ await loadGenresChart(); }catch{}
        return;
      }
      showGate();
    });

    el('contentCreateForm')?.addEventListener('submit', (e)=>{ e.preventDefault(); contentCreate(); });
    el('loadContentBtn')?.addEventListener('click', (e)=>{ e.preventDefault(); contentLoad(); });
  });
})();
