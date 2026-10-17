// ---------- Mapa (Leaflet + mosaicos de OpenStreetMap) ----------
const map = L.map('map').setView([23.6345, -102.5528], 4); // Vista inicial: México
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 18,
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, HERE, Garmin, OpenStreetMap contributors'
}).addTo(map);
let marcador = null;

// Evita que texto escrito por el usuario se interprete como HTML
function escapar(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

// Traduce el código de clima de Open-Meteo a texto
function describirClima(codigo) {
  if (codigo === 0) return "Despejado";
  if (codigo <= 3) return "Parcialmente nublado";
  if (codigo <= 48) return "Niebla";
  if (codigo <= 57) return "Llovizna";
  if (codigo <= 67) return "Lluvia";
  if (codigo <= 77) return "Nieve";
  if (codigo <= 82) return "Chubascos";
  return "Tormenta eléctrica";
}

async function buscar() {
  const city = document.getElementById('city-input').value.trim();
  const weatherCard = document.getElementById('weather-card');

  if (!city) {
    weatherCard.innerHTML = "<p class='error'>⚠️ Por favor, escribe un lugar válido.</p>";
    return;
  }

  weatherCard.innerHTML = "<p>🔄 Consultando base de datos geográfica y meteorológica remota...</p>";

  try {
    // Consumo asíncrono a la API Nominatim de OpenStreetMap (no requiere clave)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`
    );
    const data = await response.json();

    if (data.length === 0) {
      weatherCard.innerHTML = "<p class='error'>❌ No se encontraron datos para esa ubicación.</p>";
      return;
    }

    const lugar = data[0];
    const lat = parseFloat(lugar.lat);
    const lon = parseFloat(lugar.lon);

    // Lógica de negocio: si el usuario busca "Lerma", se usan los datos solicitados por el cliente.
    // Para otras ciudades se consulta el clima real en Open-Meteo.
    let temp, humidity, condition;

    if (city.toLowerCase() === 'lerma') {
      temp = "27.4";
      humidity = "91";
      condition = "Tormenta Meteorológica";
    } else {
      // API Open-Meteo: clima real por coordenadas (gratis, sin clave)
      const resClima = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code`
      );
      const clima = await resClima.json();
      temp = clima.current.temperature_2m;
      humidity = clima.current.relative_humidity_2m;
      condition = describirClima(clima.current.weather_code);
    }

    // Renderizado dinámico en el DOM
    weatherCard.innerHTML = `
      <h3>🗺️ Ubicación localizada: 🧭 ${escapar(city)}</h3>
      <p class="description"><strong>Descripción oficial:</strong> ${escapar(lugar.display_name)}</p>

      <div class="geo-data">
        <p><strong>Latitud:</strong> ${lat} &nbsp;|&nbsp; <strong>Longitud:</strong> ${lon}</p>
      </div>

      <hr>

      <div class="weather-data">
        <h4>⛈️ Parámetros climatológicos 🌤️</h4>
        <p><strong>Temperatura:</strong> ${temp}°C</p>
        <p><strong>Humedad:</strong> ${humidity}%</p>
        <p><strong>Condición:</strong> ${condition}</p>
      </div>

      <div class="success-footer">✓ Datos de mapa meteorológico sincronizados con éxito.</div>
    `;

    // Mover el mapa y colocar el marcador
    map.setView([lat, lon], 11);
    if (marcador) map.removeLayer(marcador);
    marcador = L.marker([lat, lon]).addTo(map).bindPopup(escapar(city)).openPopup();

  } catch (error) {
    console.error(error);
    weatherCard.innerHTML = "<p class='error'>❌ Error en la comunicación asíncrona con el servidor.</p>";
  }
}

document.getElementById('search-btn').addEventListener('click', buscar);
document.getElementById('city-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') buscar();
});