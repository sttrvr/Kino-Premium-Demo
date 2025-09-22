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
      if (toSignUp) toSignUp.addEventListener('click', (e) => { e.preventDefault(); openAuth('signup'); });
      if (toSignIn) toSignIn.addEventListener('click', (e) => { e.preventDefault(); openAuth('signin'); });
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

    // Firebase initialization (compat) if config is provided
    let auth = null;
    if (window.FIREBASE_CONFIG && window.firebase) {
      try {
        const app = (firebase.apps && firebase.apps.length)
          ? firebase.app()
          : firebase.initializeApp(window.FIREBASE_CONFIG);
        auth = firebase.auth(app);
      } catch (e) {
        console.warn('Firebase init failed:', e);
      }
    }

    // Handle form submit
    if (authForm) authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = /** @type {HTMLInputElement} */(document.getElementById('authEmail'))?.value?.trim();
      const password = /** @type {HTMLInputElement} */(document.getElementById('authPassword'))?.value || '';
      const fullName = /** @type {HTMLInputElement} */(document.getElementById('authName'))?.value?.trim();

      if (!email || !password) {
        showToast('Xatolik', 'Email va parolni kiriting');
        return;
      }

      if (!auth) {
        showToast('Sozlash kerak', 'Iltimos, firebase-config.js faylida Firebase sozlamalarini to‘ldiring');
        return;
      }

      try {
        if (currentMode === 'signup') {
          if (!fullName) {
            showToast('Xatolik', 'Ismni kiriting');
            return;
          }
          const cred = await auth.createUserWithEmailAndPassword(email, password);
          if (cred.user) {
            await cred.user.updateProfile({ displayName: fullName });
          }
          showToast('Muvaffaqiyatli', 'Ro‘yxatdan o‘tish yakunlandi');
        } else {
          await auth.signInWithEmailAndPassword(email, password);
          showToast('Xush kelibsiz', 'Kirish muvaffaqiyatli');
        }
        closeAuth();
      } catch (err) {
        console.error('Auth error:', err);
        const msg = err && err.message ? err.message : 'Xatolik yuz berdi';
        showToast('Xatolik', msg);
      }
    });

    if (googleBtn) googleBtn.addEventListener('click', comingSoon);
    if (githubBtn) githubBtn.addEventListener('click', comingSoon);

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

    // Sign out
    if (signOutBtn) {
      signOutBtn.addEventListener('click', async () => {
        if (!auth) {
          showToast('Sozlash kerak', 'Firebase sozlamalarini to‘ldiring');
          return;
        }
        try {
          await auth.signOut();
          showToast('Chiqildi', 'Hisobdan chiqildi');
        } catch (e) {
          showToast('Xatolik', 'Chiqishda xatolik');
        }
      });
    }

    // Reflect auth state in UI
    function updateUIForUser(user) {
      if (user) {
        // Hide sign buttons, show user menu
        if (signInBtn) signInBtn.setAttribute('hidden', '');
        if (signUpBtn) signUpBtn.setAttribute('hidden', '');
        if (userMenu) userMenu.removeAttribute('hidden');
        if (userDisplayName) userDisplayName.textContent = user.displayName || user.email || 'Foydalanuvchi';
        if (userAvatarImg) userAvatarImg.src = user.photoURL || 'https://via.placeholder.com/32x32';
      } else {
        if (signInBtn) signInBtn.removeAttribute('hidden');
        if (signUpBtn) signUpBtn.removeAttribute('hidden');
        if (userMenu) userMenu.setAttribute('hidden', '');
        if (userDropdown) userDropdown.setAttribute('hidden', '');
        if (userMenuBtn) userMenuBtn.setAttribute('aria-expanded', 'false');
      }
    }

    if (auth) {
      auth.onAuthStateChanged(updateUIForUser);
    }
  });
})();
