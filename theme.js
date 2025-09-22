'use strict';
(function () {
  function getStoredTheme() {
    try { return localStorage.getItem('theme'); } catch { return null; }
  }
  function storeTheme(theme) {
    try { localStorage.setItem('theme', theme); } catch {}
  }
  function getPreferredTheme() {
    const stored = getStoredTheme();
    if (stored === 'light' || stored === 'dark') return stored;
    // Fallback to system
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
  function applyTheme(theme) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    // Update header toggle icon if present
    const btn = document.getElementById('themeToggle');
    if (btn) {
      const icon = btn.querySelector('i');
      const isDark = theme === 'dark';
      btn.setAttribute('aria-pressed', String(isDark));
      if (icon) icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
      btn.title = isDark ? 'Switch to Light' : 'Switch to Dark';
    }
    // mobile status bar color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#0b0b0f' : '#ffffff');
    }
  }
  function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    storeTheme(next);
  }

  // Init on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getPreferredTheme());
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', toggleTheme);
    // React to system changes if user hasn't chosen manually
    if (window.matchMedia) {
      try {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          const stored = getStoredTheme();
          if (!stored) {
            applyTheme(e.matches ? 'dark' : 'light');
          }
        });
      } catch {}
    }
  });
})();
