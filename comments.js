(function(){
  'use strict';
  // Global Comments module with Firestore (compat) fallback to localStorage
  const g = (typeof window !== 'undefined') ? window : globalThis;
  const Comments = {};

  let db = null; // Firestore db if available
  let isFirebaseReady = false;
  let warnedLocal = false;

  function initFirebaseIfPossible(){
    try {
      // Using compat builds loaded by HTML: firebase-app-compat.js and firebase-firestore-compat.js
      if (!g.firebase || !g.firebase.apps) return;
      if (!g.firebase.apps.length) {
        // firebase-config.js should define g.firebaseConfig
        if (!g.firebaseConfig) return; // not configured yet
        g.firebase.initializeApp(g.firebaseConfig);
      }
      if (g.firebase.firestore) {
        db = g.firebase.firestore();
        isFirebaseReady = true;
      }
    } catch(err) {
      console.debug('Firebase init skipped', err);
    }
  }

  function useLocal(){
    if (!warnedLocal) {
      console.debug('Comments: using localStorage fallback');
      warnedLocal = true;
    }
    return true;
  }

  function getLocalAll(){
    try { return JSON.parse(localStorage.getItem('comments_all')||'{}'); } catch { return {}; }
  }
  function setLocalAll(obj){
    try { localStorage.setItem('comments_all', JSON.stringify(obj)); } catch {}
  }

  // Public API
  // Subscribe to comments list for movieId. Calls onChange(list)
  Comments.subscribe = function(movieId, onChange){
    initFirebaseIfPossible();
    if (isFirebaseReady && db) {
      const ref = db.collection('comments').doc(String(movieId)).collection('items').orderBy('at','desc').limit(200);
      return ref.onSnapshot((snap)=>{
        const list = [];
        snap.forEach(doc=>list.push({ id: doc.id, ...doc.data() }));
        // Pinned first
        list.sort((a,b)=> (b.pinned?1:0)-(a.pinned?1:0) || String(b.at).localeCompare(String(a.at)));
        if (typeof onChange === 'function') onChange(list);
      }, (err)=>{
        console.debug('Firestore subscribe error', err);
      });
    }
    // local fallback
    useLocal();
    const all = getLocalAll();
    const list = Array.isArray(all[movieId]) ? all[movieId] : [];
    list.sort((a,b)=> (b.pinned?1:0)-(a.pinned?1:0) || String(b.at).localeCompare(String(a.at)));
    if (typeof onChange === 'function') onChange(list);
    return function unsubscribe(){};
  };

  // Add a comment: {name, text}
  Comments.add = async function(movieId, data){
    initFirebaseIfPossible();
    const payload = {
      name: (data.name||'Mehmon').toString().slice(0,80),
      text: (data.text||'').toString().slice(0,1000),
      at: new Date().toISOString(),
      pinned: !!data.pinned,
      admin: !!data.admin
    };
    if (!payload.text.trim()) return { ok:false, error:'Matn bo\'sh' };
    if (isFirebaseReady && db) {
      try {
        const ref = await db.collection('comments').doc(String(movieId)).collection('items').add(payload);
        return { ok:true, id: ref.id, data: payload };
      } catch(err){
        console.debug('Firestore add error', err);
        // fallback write to local too
      }
    }
    // local fallback
    useLocal();
    const all = getLocalAll();
    const list = Array.isArray(all[movieId]) ? all[movieId] : [];
    const id = 'loc_'+Date.now()+Math.random().toString(16).slice(2);
    list.unshift({ id, ...payload });
    all[movieId] = list.slice(0, 200);
    setLocalAll(all);
    return { ok:true, local:true, id, data: payload };
  };

  // Pin/unpin a comment and optionally mark as admin
  Comments.pin = async function(movieId, commentId, options){
    initFirebaseIfPossible();
    const { pinned = true, admin = false } = options || {};
    if (isFirebaseReady && db) {
      try {
        const docRef = db.collection('comments').doc(String(movieId)).collection('items').doc(String(commentId));
        await docRef.set({ pinned: !!pinned, admin: !!admin }, { merge: true });
        return { ok: true };
      } catch(err){ console.debug('Firestore pin error', err); }
    }
    // local fallback
    const all = getLocalAll();
    const list = Array.isArray(all[movieId]) ? all[movieId] : [];
    const idx = list.findIndex(i => String(i.id) === String(commentId));
    if (idx !== -1) {
      list[idx].pinned = !!pinned;
      if (admin) list[idx].admin = true;
      setLocalAll({ ...all, [movieId]: list });
      return { ok:true, local:true };
    }
    return { ok:false };
  };

  // Get count (no realtime) - returns Promise<number>
  Comments.getCount = async function(movieId){
    initFirebaseIfPossible();
    if (isFirebaseReady && db) {
      try {
        const snap = await db.collection('comments').doc(String(movieId)).collection('items').get();
        return snap.size || 0;
      } catch(err){
        console.debug('Firestore count error', err);
      }
    }
    const all = getLocalAll();
    return Array.isArray(all[movieId]) ? all[movieId].length : 0;
  };

  // Mount single page comment UI
  Comments.mountSinglePage = function(opts){
    const { movieId, formEl, nameInput, textInput, listEl } = opts || {};
    if (!movieId || !formEl || !textInput || !listEl) return;

    function render(list){
      listEl.innerHTML = '';
      if (!list.length) {
        const li = document.createElement('li');
        li.style.color = 'var(--muted)';
        li.textContent = "Hozircha sharh yo'q.";
        listEl.appendChild(li);
        return;
      }
      list.forEach(r => {
        const li = document.createElement('li');
        li.style.background = 'var(--bg-light)';
        li.style.border = '1px solid rgba(255,255,255,0.08)';
        li.style.borderRadius = '10px';
        li.style.padding = '0.6rem 0.75rem';
        const badges = [r.pinned ? '<span style="background:#ffb300;color:#000;padding:2px 6px;border-radius:999px;font-size:0.75rem;margin-right:6px">📌 Pinned</span>' : '', r.admin ? '<span style="background:#e11d48;color:#fff;padding:2px 6px;border-radius:999px;font-size:0.75rem;margin-right:6px">Admin</span>' : ''].join('');
        li.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><strong>${badges}${r.name ? (r.name.replace(/[<>]/g,'') + ' • ') : ''}<span>🗨️</span></strong><span style="color:var(--muted);font-size:0.8rem">${new Date(r.at).toLocaleString()}</span></div>${r.text?`<div>${(r.text||'').replace(/[<>]/g,'')}</div>`:''}`;
        listEl.appendChild(li);
      });
    }

    const unsub = Comments.subscribe(movieId, render);

    formEl.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const name = (nameInput && nameInput.value || '').trim();
      const text = (textInput.value||'').trim();
      if (!text) return;
      textInput.disabled = true;
      if (nameInput) nameInput.disabled = true;
      try {
        await Comments.add(movieId, { name, text });
        if (textInput) textInput.value = '';
      } finally {
        textInput.disabled = false;
        if (nameInput) nameInput.disabled = false;
      }
    });

    return unsub;
  };

  g.Comments = Comments;
})();