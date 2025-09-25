'use strict';

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');
    const googleBtn = document.getElementById('googleSignInBtn');
    const githubBtn = document.getElementById('githubSignInBtn');
    const authModal = document.getElementById('authModal');
    const authModalClose = document.getElementById('authModalClose');
    const authModalTitle = document.getElementById('authModalTitle');
    const authForm = document.getElementById('authForm');
    const nameRow = document.getElementById('nameRow');
    const switchAuthText = document.getElementById('switchAuthText');
    const switchToSignUp = document.getElementById('switchToSignUp');
    const togglePassVis = document.getElementById('togglePassVis');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const userAvatarImg = document.getElementById('userAvatarImg');
    const userDisplayName = document.getElementById('userDisplayName');
    const userMenu = document.getElementById('userMenu');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');

    // Toast helper
    function showToast(title, message) {
      const container = document.getElementById('toastContainer');
      if (!container) return alert(`${title}: ${message}`);
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `
        <div class="icon"><i class="fas fa-info-circle"></i></div>
        <div class="content">
          <div class="title">${title}</div>
          <div class="message">${message}</div>
        </div>
      `;
      container.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('show'));
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
      }, 3200);
    }

    const comingSoon = () => showToast('Tez orada', "Bu funksiya tez orada qo'shiladi");

    function openAuth(mode) {
      if (!authModal) return;
      // mode: 'signin' | 'signup'
      const isSignUp = mode === 'signup';
      authModalTitle.textContent = isSignUp ? 'Sign Up' : 'Sign In';
      if (nameRow) nameRow.hidden = !isSignUp;
      // Switch link text
      if (switchAuthText) {
        switchAuthText.innerHTML = isSignUp
          ? 'Already have an account? <a href="#" id="switchToSignIn">Sign In</a>'
          : "Don't have an account? <a href=\"#\" id=\"switchToSignUp\">Sign Up</a>";
      }
      authModal.removeAttribute('hidden');
      authModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      wireSwitchLinks();
    }

    function closeAuth() {
      if (!authModal) return;
      authModal.setAttribute('aria-hidden', 'true');
      authModal.setAttribute('hidden', '');
      document.body.style.overflow = '';
    }

    function wireSwitchLinks() {
      const toSignUp = document.getElementById('switchToSignUp');
      const toSignIn = document.getElementById('switchToSignIn');
      if (toSignUp) toSignUp.addEventListener('click', (e) => { e.preventDefault(); setMode('signup'); });
      if (toSignIn) toSignIn.addEventListener('click', (e) => { e.preventDefault(); setMode('signin'); });
    }

    if (authModalClose) authModalClose.addEventListener('click', closeAuth);
    if (authModal) authModal.addEventListener('click', (e) => { if (e.target === authModal) closeAuth(); });

    // Track current mode
    let currentMode = 'signin'; // or 'signup'

    function setMode(mode) {
      currentMode = mode;
      openAuth(mode);
    }

    if (signInBtn) signInBtn.addEventListener('click', () => setMode('signin'));
    if (signUpBtn) signUpBtn.addEventListener('click', () => setMode('signup'));

    // Password visibility toggle
    if (togglePassVis) {
      togglePassVis.addEventListener('click', () => {
        const passInput = /** @type {HTMLInputElement} */(document.getElementById('authPassword'));
        if (!passInput) return;
        const isPwd = passInput.type === 'password';
        passInput.type = isPwd ? 'text' : 'password';
        const icon = togglePassVis.querySelector('i');
        if (icon) icon.className = isPwd ? 'fas fa-eye-slash' : 'fas fa-eye';
      });
    }

    // Firebase initialization (compat) if config is provided
    let auth = null;
    let db = null;
    if (window.FIREBASE_CONFIG && window.firebase) {
      try {
        const app = (firebase.apps && firebase.apps.length)
          ? firebase.app()
          : firebase.initializeApp(window.FIREBASE_CONFIG);
        auth = firebase.auth(app);
        if (firebase.firestore) db = firebase.firestore(app);
      } catch (e) {
        console.warn('Firebase init failed:', e);
      }
    }

    // Local session helpers (for email-less sign in)
    function getLocalUser(){ try { return JSON.parse(localStorage.getItem('local_user')||'null'); } catch { return null; } }
    function setLocalUser(u){ try { localStorage.setItem('local_user', JSON.stringify(u)); } catch {} }
    function clearLocalUser(){ try { localStorage.removeItem('local_user'); } catch {} }
    // Local users_basic fallback
    function getLocalUsersBasic(){ try { return JSON.parse(localStorage.getItem('users_basic')||'[]'); } catch { return []; } }
    function saveLocalUsersBasic(arr){ try { localStorage.setItem('users_basic', JSON.stringify(arr)); } catch {} }
    function findLocalUserBasic(username){ const list=getLocalUsersBasic(); return list.find(u=>u.username===username); }

    // Crypto helpers (SHA-256 + random salt)
    async function sha256Hex(str){
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest('SHA-256', enc.encode(str));
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }
    function randomSalt(len=16){
      const arr = new Uint8Array(len);
      crypto.getRandomValues(arr);
      return Array.from(arr).map(b=>b.toString(16).padStart(2,'0')).join('');
    }
    async function hashPasswordWithSalt(password, salt){
      return sha256Hex(`${salt}:${password}`);
    }

    // Handle form submit
    function setAuthLoading(loading) {
      if (!authSubmitBtn) return;
      if (loading) {
        authSubmitBtn.disabled = true;
        authSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yuklanmoqda...';
      } else {
        authSubmitBtn.disabled = false;
        authSubmitBtn.innerHTML = '<i class="fas fa-unlock"></i> Continue';
      }
    }

    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    if (authForm) authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = /** @type {HTMLInputElement} */(document.getElementById('authEmail'))?.value?.trim();
      const username = /** @type {HTMLInputElement} */(document.getElementById('authUsername'))?.value?.trim();
      const password = /** @type {HTMLInputElement} */(document.getElementById('authPassword'))?.value || '';
      const fullName = /** @type {HTMLInputElement} */(document.getElementById('authName'))?.value?.trim();

      // Validation: Email butunlay majburiy emas
      if (!username) return showToast('Xatolik', 'Username kiriting');
      if (!password) return showToast('Xatolik', 'Parolni kiriting');

      // Firebase talabini faqat email bilan ishlaganda tekshiramiz

      try {
        setAuthLoading(true);
        if (currentMode === 'signup') {
          // Username/Parol bilan ro'yxatdan o'tish: Firestore (users_basic) yoki fallback local
          if (!fullName) { showToast('Xatolik', 'Ismni kiriting'); return; }
          let usedFirestore = false;
          if (db) {
            try {
              const docRef = db.collection('users_basic').doc(username);
              const snap = await docRef.get();
              if (snap.exists) { showToast('Xatolik', 'Bu username band. Boshqasini tanlang.'); return; }
              const salt = randomSalt();
              const passwordHash = await hashPasswordWithSalt(password, salt);
              await docRef.set({ username, passwordHash, salt, name: fullName, createdAt: new Date().toISOString(), status: 'active' });
              usedFirestore = true;
              showToast('Muvaffaqiyatli', 'Ro‘yxatdan o‘tildi');
            } catch (permErr) {
              console.warn('Firestore signup blocked, falling back to local:', permErr);
              showToast('Eslatma', 'Server ruxsatlari cheklangan. Lokal rejimda ro‘yxatdan o‘tyapsiz.');
            }
          }
          if (!usedFirestore) {
            const list = getLocalUsersBasic();
            if (list.find(u=>u.username===username)) { showToast('Xatolik', 'Bu username band. Boshqasini tanlang.'); return; }
            const salt = randomSalt();
            const passwordHash = await hashPasswordWithSalt(password, salt);
            list.push({ username, passwordHash, salt, name: fullName, createdAt: new Date().toISOString(), status: 'active' });
            saveLocalUsersBasic(list);
            showToast('Muvaffaqiyatli', 'Ro‘yxatdan o‘tildi (lokal)');
          }
          // Auto sign in after sign up
          setLocalUser({ displayName: fullName, at: new Date().toISOString(), username });
          updateUIForUser({ displayName: fullName });
        } else {
          // Sign In: Firestore users_basic bo'yicha tekshirish, topilmasa Sign Up taklif qilish
          let profile = null; let triedFirestore = false; let fsError = null;
          if (db) {
            try {
              triedFirestore = true;
              const snap = await db.collection('users_basic').doc(username).get();
              if (snap.exists) profile = snap.data();
            } catch (eGet) {
              fsError = eGet;
              console.warn('Firestore signin blocked, will fallback to local:', eGet);
            }
          }
          if (!profile) {
            // Fallback to local
            const local = findLocalUserBasic(username);
            if (local) profile = local;
          }
          if (!profile) {
            if (confirm('Bunday username topilmadi. Ro\'yxatdan o\'tasizmi?')) {
              // emulate switch to signup mode requirements
              showToast('Eslatma', 'Ro\'yxatdan o\'tish uchun ismni ham kiriting');
              return; // User should switch to Sign Up from UI
            } else {
              const append = (triedFirestore && fsError) ? ' (Server ruxsatlari cheklangan bo\'lishi mumkin)' : '';
              showToast('Xatolik', 'Kirish amalga oshmadi' + append);
              return;
            }
          }
          // Banned enforcement
          if (profile.status === 'banned') { showToast('Xatolik', 'Hisobingiz bloklangan.'); return; }
          // Verify password (migrate plain -> hash if needed)
          if (profile.passwordHash && profile.salt) {
            const calc = await hashPasswordWithSalt(password, profile.salt);
            if (calc !== profile.passwordHash) { showToast('Xatolik', 'Parol noto\'g\'ri.'); return; }
          } else if (profile.password) {
            // Legacy plain migration
            if (String(profile.password) !== String(password)) { showToast('Xatolik', 'Parol noto\'g\'ri.'); return; }
            const newSalt = randomSalt();
            const newHash = await hashPasswordWithSalt(password, newSalt);
            if (db && triedFirestore) {
              try { await db.collection('users_basic').doc(username).set({ passwordHash: newHash, salt: newSalt, password: null }, { merge: true }); } catch {}
            } else {
              // migrate local
              const list = getLocalUsersBasic();
              const idx = list.findIndex(u=>u.username===username);
              if (idx>=0) { list[idx].passwordHash=newHash; list[idx].salt=newSalt; delete list[idx].password; saveLocalUsersBasic(list); }
            }
          } else {
            // No password info at all (e.g., OAuth-only account) – allow sign-in if OAuth session exists
          }
          const disp = profile.name || fullName || username;
          setLocalUser({ displayName: disp, at: new Date().toISOString(), username });
          updateUIForUser({ displayName: disp });
          showToast('Xush kelibsiz', 'Kirish muvaffaqiyatli');
        }
        closeAuth();
      } catch (err) {
        console.error('Auth error:', err);
        const msg = err && err.message ? err.message : 'Xatolik yuz berdi';
        showToast('Xatolik', msg);
      }
      finally {
        setAuthLoading(false);
      }
    });

    async function afterProviderLogin(user){
      try {
        const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Foydalanuvchi');
        const username = user.uid; // stable unique id
        const photoURL = user.photoURL || '';
        // Upsert users_basic in Firestore if available
        if (db) {
          const ref = db.collection('users_basic').doc(username);
          const snap = await ref.get();
          const nowIso = new Date().toISOString();
          if (!snap.exists) {
            await ref.set({ username, name: displayName, password: null, createdAt: nowIso, lastLoginAt: nowIso, provider: user.providerData?.[0]?.providerId || 'oauth', photoURL });
          } else {
            await ref.set({ lastLoginAt: nowIso, photoURL }, { merge: true });
          }
        }
        setLocalUser({ displayName, at: new Date().toISOString(), username, photoURL });
        updateUIForUser({ displayName, photoURL });
        showToast('Xush kelibsiz', 'Hisobga kirildi');
        closeAuth();
      } catch (e) {
        console.warn('afterProviderLogin error:', e);
      }
    }

    async function signInWithProvider(provider){
      if (!auth) { showToast('Sozlash kerak', 'Firebase sozlamalarini to‘ldiring'); return; }
      try {
        setAuthLoading(true);
        const cred = await auth.signInWithPopup(provider);
        if (cred && cred.user) {
          await afterProviderLogin(cred.user);
        }
      } catch (e) {
        console.error('Provider signin error:', e);
        const msg = e && e.message ? e.message : 'Kirishda xatolik';
        showToast('Xatolik', msg);
      } finally {
        setAuthLoading(false);
      }
    }

    if (googleBtn) googleBtn.addEventListener('click', async () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      await signInWithProvider(provider);
    });
    if (githubBtn) githubBtn.addEventListener('click', async () => {
      const provider = new firebase.auth.GithubAuthProvider();
      await signInWithProvider(provider);
    });

    // Reset password flow
    // Email ishlatilmaydi: parolni tiklash funksiyasi o'chirib qo'yildi

    // Keep dropdown behavior (for future when user is signed in)
    if (userMenuBtn && userDropdown && userMenu) {
      userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = userDropdown.hasAttribute('hidden');
        userDropdown.toggleAttribute('hidden', !isHidden);
        userMenuBtn.setAttribute('aria-expanded', String(isHidden));
      });
      document.addEventListener('click', (e) => {
        if (!userMenu.contains(e.target)) {
          userDropdown.setAttribute('hidden', '');
          userMenuBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Sign out helper
    async function doSignOut(){
      try { if (auth) await auth.signOut(); } catch {}
      clearLocalUser();
      updateUIForUser(null);
      showToast('Chiqildi', 'Hisobdan chiqildi');
    }
    // Sign out (dropdown item)
    if (signOutBtn) { signOutBtn.addEventListener('click', async () => { await doSignOut(); }); }

    // Reflect auth state in UI
    // UI switching helpers
    function updateUIForUser(user) {
      if (user) {
        // Logged-in: hide Sign In/Up, show user menu with avatar + name
        document.body.classList.add('logged-in');
        if (signInBtn) signInBtn.setAttribute('hidden', '');
        if (signUpBtn) signUpBtn.setAttribute('hidden', '');
        if (userMenu) userMenu.removeAttribute('hidden');
        if (userDisplayName) userDisplayName.textContent = user.displayName || user.email || 'Foydalanuvchi';
        if (userAvatarImg) userAvatarImg.src = user.photoURL || 'https://via.placeholder.com/32x32';
      } else {
        // Logged-out: show Sign In/Up, hide user menu
        document.body.classList.remove('logged-in');
        if (signInBtn) {
          signInBtn.removeAttribute('hidden');
          signInBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        }
        if (signUpBtn) signUpBtn.removeAttribute('hidden');
        if (userMenu) userMenu.setAttribute('hidden', '');
        if (userDropdown) userDropdown.setAttribute('hidden', '');
        if (userMenuBtn) userMenuBtn.setAttribute('aria-expanded', 'false');
      }
    }

    if (auth) {
      auth.onAuthStateChanged(updateUIForUser);
    }
    // Restore local session if present
    const lu = getLocalUser();
    if (lu) updateUIForUser({ displayName: lu.displayName || 'Foydalanuvchi', photoURL: lu.photoURL || null });
  });
})();
