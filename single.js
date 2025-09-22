// single.js

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

// Film ma'lumotlarini JSON fayldan yuklash
async function loadMoviesFromJSON() {
  try {
    const response = await fetch('movies.json');
    return await response.json();
  } catch (error) {
    console.error('JSON yuklashda xatolik:', error);
    return [];
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Film ma'lumotlarini yuklash
    const movies = await loadMoviesFromJSON();
    
    // localStorage dan film ID ni olish
    const movieId = localStorage.getItem('selectedMovieId');
    
    // Film ma'lumotlarini topish
    const movie = movies.find(m => m.id == movieId);
    
    if (movie) {
      // Film topildi, sahifani to'ldirish
      displayMovieDetails(movie);
    } else {
      console.error("Film topilmadi!");
    }
  } catch (error) {
    console.error("Xatolik yuz berdi:", error);
  } finally {
    // Yuklash animatsiyasini yashirish
    setTimeout(() => {
      hideLoader();
    }, 1000);
  }
});

// Film ma'lumotlarini sahifaga joylashtirish
function displayMovieDetails(movie) {

    // HTML elementlarni olish
    const titleEl = document.querySelector(".movie-title");
    const yearEl = document.querySelector(".movie-year");
    const typeEl = document.querySelector(".movie-type");
    const durationEl = document.querySelector(".movie-duration");
    const descriptionEl = document.querySelector(".movie-description");
    const posterEl = document.querySelector(".movie-poster img");
    const videoEl = document.querySelector(".movie-video iframe");

    // Film ma'lumotlarini o'rnatish
    if (titleEl) titleEl.textContent = movie.title || movie.name || "Nomsiz film";
    if (yearEl) yearEl.textContent = movie.year || "N/A";
    if (typeEl) typeEl.textContent = movie.category || movie.type || "Film";
    if (durationEl) durationEl.textContent = (movie.duration || "120") + " min";
    if (descriptionEl) descriptionEl.textContent = movie.overview || movie.description || movie.details || "Ma'lumot mavjud emas";
    
    // Poster rasmini o'rnatish
    if (posterEl) {
        const posterUrl = movie.poster_path || movie.poster || movie.poster_img || movie.image;
        if (posterUrl) {
            posterEl.src = posterUrl.startsWith('http') ? posterUrl : 'https://image.tmdb.org/t/p/w500' + posterUrl;
            posterEl.alt = movie.title || movie.name || "Film posteri";
        }
    }

    // Video src ni to'g'rilash
    if (videoEl && movie.video) {
        let videoSrc = movie.video;

        // OK.ru linklar uchun https qo'shish
        if (videoSrc.startsWith("//ok.ru")) {
            videoSrc = "https:" + videoSrc;
        }

        // iframe src ni o'rnatish
        videoEl.src = videoSrc;
    }
}
