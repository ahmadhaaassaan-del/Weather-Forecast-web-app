// 1. Setup global variables for the map so we can update them later
let myMap;
let myMarker;

// 2. This function builds and moves our interactive map
function updateMap(lat, lon) {
    // If the map doesn't exist yet, create it
    if (!myMap) {
        myMap = L.map('map').setView([lat, lon], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(myMap);
        myMarker = L.marker([lat, lon]).addTo(myMap);
    } else {
        // If the map already exists, just slide it to the new city coordinates
        myMap.setView([lat, lon], 10);
        myMarker.setLatLng([lat, lon]);
    }
}

// 3. A helper function to format dates for our API (e.g., 2026-07-03)
function getFormattedDate(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
}

// 4. The MAIN engine that fetches weather data from the internet
async function searchWeather() {
    const cityName = document.getElementById('city-input').value.trim();
    if (!cityName) return alert("Please type a city name first!");

    try {
        // STEP A: Ask the Geocoding API to find the Latitude and Longitude of the city name
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        // Check if the city actually exists
        if (!geoData.results || geoData.results.length === 0) {
            alert("City not found. Check your spelling!");
            return;
        }

        // Extract the exact coordinates and proper name
        const { latitude, longitude, name, country } = geoData.results[0];
        document.getElementById('city-name').innerText = `${name}, ${country}`;

        // Move the map to this city
        updateMap(latitude, longitude);

        // Calculate a 14-day date range (7 days ago up to 7 days from now)
        const startDate = getFormattedDate(-7);
        const endDate = getFormattedDate(7);

        // STEP B: Fetch current, past, and future weather using those coordinates
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&start_date=${startDate}&end_date=${endDate}`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();

        // STEP C: Display the current weather on the screen
        document.getElementById('temperature').innerText = `${Math.round(weatherData.current.temperature_2m)}°C`;
        document.getElementById('description').innerText = decodeWeatherCode(weatherData.current.weather_code);

        // STEP D: Build the 14-day timeline items
        renderTimeline(weatherData.daily);

    } catch (error) {
        console.error("Something went wrong:", error);
    }
}

// 5. Turns confusing API numbers into friendly weather words
function decodeWeatherCode(code) {
    if (code === 0) return "Clear Sky ☀️";
    if (code <= 3) return "Partly Cloudy ⛅";
    if (code <= 48) return "Foggy 🌫️";
    if (code <= 67) return "Light Rain 🌧️";
    if (code <= 82) return "Heavy Rain Showers ⛈️";
    return "Snow / Storm ❄️";
}

// 6. Generates individual layout cards for the 14-day row
function renderTimeline(daily) {
    const container = document.getElementById('timeline-container');
    container.innerHTML = ''; // Clear out old cards

    const todayString = getFormattedDate(0);

    // Loop through all 14 days provided by the API
    daily.time.forEach((date, index) => {
        const maxT = Math.round(daily.temperature_2m_max[index]);
        const minT = Math.round(daily.temperature_2m_min[index]);
        const code = daily.weather_code[index];
        
        // Figure out if this card is in the past or in the future
        const isPast = date < todayString;
        const cardClass = isPast ? 'past' : 'future';
        const statusLabel = isPast ? '⏪ Past' : '🔮 Forecast';

        // Create a new HTML card element dynamically
        const card = document.createElement('div');
        card.className = `weather-card ${cardClass}`;
        card.innerHTML = `
            <div style="font-size: 0.8rem; color: #94a3b8;">${date.substring(5)} (${statusLabel})</div>
            <div style="font-size: 1.1rem; font-weight: bold; margin: 5px 0;">${maxT}° / ${minT}°</div>
            <div style="font-size: 0.8rem;">${decodeWeatherCode(code)}</div>
        `;
        
        // Append the new card into our timeline box container
        container.appendChild(card);
    });
}

// 7. Event Listeners: Tell the buttons to listen for actions!
document.getElementById('search-btn').addEventListener('click', searchWeather);
document.getElementById('city-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchWeather();
});

// Run automatically for 'London' on initial page boot
window.addEventListener('DOMContentLoaded', searchWeather);
