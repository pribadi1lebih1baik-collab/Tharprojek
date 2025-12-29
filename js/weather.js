/**
 * Weather Manager - Open-Meteo API Integration
 * Handles weather data and display
 */

class WeatherManager {
    constructor(storageManager) {
        if (!storageManager) {
            throw new Error("StorageManager is a required dependency for WeatherManager.");
        }
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
            if (!this.userProfile?.basicInfo?.location || !this.userProfile.basicInfo.location.lat) {
                console.log('Location with coordinates not available, skipping weather.');
                this.showErrorState();
                return;
            }

            const cached = this.storageManager.getFromLocalStorage('weatherCache');
            if (cached && new Date().getTime() - new Date(cached.timestamp).getTime() < this.cacheExpiry) {
                this.weatherData = cached.data;
            } else {
                await this.fetchWeather();
            }
            
            this.updateWeatherWidget();

        } catch (error) {
            console.error('Error initializing weather:', error);
            this.showErrorState();
        }
    }

    /**
     * Fetch weather from Open-Meteo API
     */
    async fetchWeather() {
        const { lat, lon, city } = this.userProfile.basicInfo.location;
        if (!lat || !lon) return;

        this.showLoadingState();
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        if (data.current_weather) {
            this.weatherData = {
                temperature: data.current_weather.temperature,
                weatherCode: data.current_weather.weathercode,
                location: city || 'Current Location',
            };
            this.storageManager.saveToLocalStorage('weatherCache', {
                data: this.weatherData,
                timestamp: new Date().toISOString()
            });
        } else {
            throw new Error('Invalid weather data from API');
        }
    }

    /**
     * Update weather widget UI
     */
    updateWeatherWidget() {
        const widget = document.getElementById('weather-widget');
        if (!widget) return;

        if (!this.weatherData) {
            widget.classList.add('hidden');
            return;
        }

        widget.classList.remove('hidden');
        document.getElementById('weather-temp').textContent = `${Math.round(this.weatherData.temperature)}°C`;
        document.getElementById('weather-city').textContent = this.weatherData.location;
        document.getElementById('weather-icon').textContent = this.getWeatherIcon(this.weatherData.weatherCode);
    }

    /**
     * Get weather icon based on WMO weather code.
     */
    getWeatherIcon(code) {
        const iconMap = {
            0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
            51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
            80: '🌧️', 81: '🌧️', 82: '⛈️', 95: '⛈️', 96: '⛈️', 99: '⛈️'
        };
        return iconMap[code] || '🌡️';
    }

    showLoadingState() {
        const widget = document.getElementById('weather-widget');
        if (widget) {
            widget.classList.remove('hidden');
            document.getElementById('weather-temp').textContent = `--°C`;
            document.getElementById('weather-icon').textContent = `⏳`;
        }
    }

    showErrorState() {
        const widget = document.getElementById('weather-widget');
        if (widget) {
            widget.classList.add('hidden');
        }
    }
}
