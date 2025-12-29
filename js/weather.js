/**
 * Weather Manager - Open-Meteo API Integration
 * Handles weather data and display
 */

class WeatherManager {
    constructor(storageManager) {
        this.storageManager = storageManager;
        this.userProfile = null;
        this.weatherData = null;
        this.cacheExpiry = 60 * 60 * 1000; // 1 hour
    }

    /**
     * Initialize weather manager
     */
    async init() {
        try {
            this.userProfile = this.storageManager.getFromLocalStorage('userProfile');
            
            if (!this.userProfile?.basicInfo?.location?.city) {
                console.log('Location city not available, skipping weather');
                this.showErrorState();
                return;
            }

            const cached = this.getCachedWeather();
            if (cached && this.isCacheValid(cached.timestamp)) {
                this.weatherData = cached.data;
                this.updateWeatherWidget();
                return;
            }

            await this.fetchWeather();
            
        } catch (error) {
            console.error('Error initializing weather:', error);
            this.showErrorState();
        }
    }

    /**
     * Fetch weather from Open-Meteo API
     */
    async fetchWeather() {
        try {
            let location = this.userProfile.basicInfo.location;
            let { lat, lon, city } = location;

            // If no coordinates, try to fetch them
            if (!lat || !lon) {
                console.log(`Coordinates not found for ${city}. Fetching...`);
                await this.getCoordsForCity(city);
                // Re-read location data after attempting to fetch coords
                location = this.storageManager.getFromLocalStorage('userProfile').basicInfo.location;
                lat = location.lat;
                lon = location.lon;
            }

            // If still no coordinates after trying to fetch, exit.
            if (!lat || !lon) {
                console.log(`Could not determine coordinates for ${city}. Skipping weather.`);
                this.showErrorState();
                return;
            }

            this.showLoadingState();

            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Asia/Jakarta&forecast_days=1`
            );

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            
            if (data.current_weather) {
                this.weatherData = {
                    temperature: data.current_weather.temperature,
                    weatherCode: data.current_weather.weathercode,
                    windSpeed: data.current_weather.windspeed,
                    location: city,
                    timestamp: new Date().toISOString()
                };

                this.cacheWeather(this.weatherData);
                this.updateWeatherWidget();
                this.showSuccessState();
            } else {
                throw new Error('Invalid weather data from API');
            }

        } catch (error) {
            console.error('Error fetching weather:', error);
            this.showErrorState();
        }
    }

    async getCoordsForCity(city) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&country=indonesia&format=json&limit=1`);
            if (!response.ok) throw new Error('Failed to fetch coordinates from Nominatim');

            const data = await response.json();

            if (data.length > 0) {
                const profile = this.storageManager.getFromLocalStorage('userProfile');
                profile.basicInfo.location.lat = parseFloat(data[0].lat);
                profile.basicInfo.location.lon = parseFloat(data[0].lon);
                this.storageManager.saveToLocalStorage('userProfile', profile);
                this.userProfile = profile; // Update local instance
                console.log(`Coordinates found for ${city}: ${data[0].lat}, ${data[0].lon}`);
            } else {
                console.log(`No coordinates found for ${city}`);
            }
        } catch(error) {
            console.error(`Could not fetch coordinates for city ${city}:`, error);
        }
    }

    cacheWeather(data) {
        const cacheData = { data: data, timestamp: new Date().toISOString() };
        this.storageManager.saveToLocalStorage('weatherCache', cacheData);
    }

    getCachedWeather() {
        return this.storageManager.getFromLocalStorage('weatherCache');
    }

    isCacheValid(timestamp) {
        return (new Date().getTime() - new Date(timestamp).getTime()) < this.cacheExpiry;
    }

    updateWeatherWidget() {
        if (!this.weatherData) return;
        const widget = document.getElementById('weather-widget');
        if (!widget) return;

        widget.classList.remove('hidden');
        document.getElementById('weather-temp').textContent = `${Math.round(this.weatherData.temperature)}°C`;
        document.getElementById('weather-city').textContent = this.weatherData.location || 'Lokasi Anda';
        document.getElementById('weather-icon').textContent = this.getWeatherIcon(this.weatherData.weatherCode);
        widget.title = this.getWeatherDescription(this.weatherData.weatherCode);
    }

    getWeatherIcon(code) {
        const map = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️', 55: '🌧️', 56: '🌧️', 57: '🌧️', 61: '🌦️', 63: '🌧️', 65: '🌧️', 66: '🌧️', 67: '🌧️', 71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '🌨️', 80: '🌦️', 81: '🌧️', 82: '🌧️', 85: '🌨️', 86: '🌨️', 95: '⛈️', 96: '⛈️', 99: '⛈️' };
        return map[code] || '🌡️';
    }

    getWeatherDescription(code) {
        const map = { 0: 'Cerah', 1: 'Cerah berawan', 2: 'Berawan sebagian', 3: 'Berawan', 45: 'Berkabut', 48: 'Berkabut dengan embun beku', 51: 'Gerimis ringan', 53: 'Gerimis sedang', 55: 'Gerimis lebat', 61: 'Hujan ringan', 63: 'Hujan sedang', 65: 'Hujan lebat', 71: 'Salju ringan', 80: 'Hujan ringan', 95: 'Badai petir' };
        return map[code] || 'Kondisi cuaca tidak diketahui';
    }

    showLoadingState() {
        const widget = document.getElementById('weather-widget');
        if (widget) {
            document.getElementById('weather-temp').textContent = '--°C';
            document.getElementById('weather-city').textContent = 'Memuat...';
            document.getElementById('weather-icon').textContent = '⏳';
        }
    }

    showSuccessState() {
        const widget = document.getElementById('weather-widget');
        if (widget) widget.style.opacity = '1';
    }

    showErrorState() {
        const widget = document.getElementById('weather-widget');
        if (widget) widget.classList.add('hidden');
    }
}
