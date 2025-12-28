/**
 * Weather Manager - Open-Meteo API Integration
 * Handles weather data and display
 */

class WeatherManager {
    constructor() {
        this.userProfile = null;
        this.weatherData = null;
        this.cacheExpiry = 60 * 60 * 1000; // 1 hour
    }

    /**
     * Initialize weather manager
     */
    async init() {
        try {
            this.userProfile = window.storageManager.getFromLocalStorage('userProfile');
            
            if (!this.userProfile?.basicInfo?.location) {
                console.log('Location not available, skipping weather');
                return;
            }

            // Check cache first
            const cached = this.getCachedWeather();
            if (cached && this.isCacheValid(cached.timestamp)) {
                this.weatherData = cached.data;
                this.updateWeatherWidget();
                return;
            }

            // Fetch fresh data
            await this.fetchWeather();
            
        } catch (error) {
            console.error('Error initializing weather:', error);
        }
    }

    /**
     * Fetch weather from Open-Meteo API
     */
    async fetchWeather() {
        try {
            const location = this.userProfile.basicInfo.location;
            const lat = location.lat;
            const lon = location.lon;

            if (!lat || !lon) {
                console.log('Invalid location coordinates');
                return;
            }

            // Show loading state
            this.showLoadingState();

            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m&timezone=Asia/Jakarta&forecast_days=1`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.current_weather) {
                this.weatherData = {
                    temperature: data.current_weather.temperature,
                    weatherCode: data.current_weather.weathercode,
                    windSpeed: data.current_weather.windspeed,
                    location: location.city,
                    timestamp: new Date().toISOString()
                };

                // Cache the data
                this.cacheWeather(this.weatherData);

                // Update UI
                this.updateWeatherWidget();
                this.showSuccessState();
                
            } else {
                throw new Error('Invalid weather data');
            }

        } catch (error) {
            console.error('Error fetching weather:', error);
            this.showErrorState();
        }
    }

    /**
     * Cache weather data
     */
    cacheWeather(data) {
        try {
            const cacheData = {
                data: data,
                timestamp: new Date().toISOString()
            };
            window.storageManager.saveToLocalStorage('weatherCache', cacheData);
        } catch (error) {
            console.error('Error caching weather:', error);
        }
    }

    /**
     * Get cached weather
     */
    getCachedWeather() {
        try {
            return window.storageManager.getFromLocalStorage('weatherCache');
        } catch (error) {
            console.error('Error getting cached weather:', error);
            return null;
        }
    }

    /**
     * Check if cache is valid
     */
    isCacheValid(timestamp) {
        try {
            const cacheTime = new Date(timestamp).getTime();
            const now = new Date().getTime();
            return (now - cacheTime) < this.cacheExpiry;
        } catch (error) {
            return false;
        }
    }

    /**
     * Update weather widget UI
     */
    updateWeatherWidget() {
        if (!this.weatherData) return;

        const widget = document.getElementById('weather-widget');
        if (!widget) return;

        // Show widget
        widget.classList.remove('hidden');

        // Update temperature
        const tempElement = document.getElementById('weather-temp');
        if (tempElement) {
            tempElement.textContent = `${Math.round(this.weatherData.temperature)}°C`;
        }

        // Update city
        const cityElement = document.getElementById('weather-city');
        if (cityElement) {
            cityElement.textContent = this.weatherData.location || 'Lokasi Anda';
        }

        // Update weather icon
        const iconElement = document.getElementById('weather-icon');
        if (iconElement) {
            const icon = this.getWeatherIcon(this.weatherData.weatherCode);
            iconElement.textContent = icon;
        }

        // Add weather details tooltip
        widget.title = this.getWeatherDescription(this.weatherData.weatherCode);
    }

    /**
     * Get weather icon based on weather code
     */
    getWeatherIcon(weatherCode) {
        // WMO Weather interpretation codes (WW)
        const iconMap = {
            0: '☀️',  // Clear sky
            1: '🌤️',  // Mainly clear
            2: '⛅',  // Partly cloudy
            3: '☁️',  // Overcast
            45: '🌫️', // Fog
            48: '🌫️', // Depositing rime fog
            51: '🌦️', // Light drizzle
            53: '🌦️', // Moderate drizzle
            55: '🌧️', // Dense drizzle
            56: '🌧️', // Light freezing drizzle
            57: '🌧️', // Dense freezing drizzle
            61: '🌦️', // Slight rain
            63: '🌧️', // Moderate rain
            65: '🌧️', // Heavy rain
            66: '🌧️', // Light freezing rain
            67: '🌧️', // Heavy freezing rain
            71: '🌨️', // Slight snow fall
            73: '🌨️', // Moderate snow fall
            75: '🌨️', // Heavy snow fall
            77: '🌨️', // Snow grains
            80: '🌦️', // Slight rain showers
            81: '🌧️', // Moderate rain showers
            82: '🌧️', // Violent rain showers
            85: '🌨️', // Slight snow showers
            86: '🌨️', // Heavy snow showers
            95: '⛈️', // Thunderstorm
            96: '⛈️', // Thunderstorm with slight hail
            99: '⛈️'   // Thunderstorm with heavy hail
        };

        return iconMap[weatherCode] || '🌡️';
    }

    /**
     * Get weather description based on weather code
     */
    getWeatherDescription(weatherCode) {
        const descriptionMap = {
            0: 'Cerah',
            1: 'Cerah berawan',
            2: 'Berawan sebagian',
            3: 'Berawan',
            45: 'Berkabut',
            48: 'Berkabut dengan embun beku',
            51: 'Gerimis ringan',
            53: 'Gerimis sedang',
            55: 'Gerimis lebat',
            56: 'Gerimis beku ringan',
            57: 'Gerimis beku lebat',
            61: 'Hujan ringan',
            63: 'Hujan sedang',
            65: 'Hujan lebat',
            66: 'Hujan beku ringan',
            67: 'Hujan beku lebat',
            71: 'Salju ringan',
            73: 'Salju sedang',
            75: 'Salju lebat',
            77: 'Butir salju',
            80: 'Hujan ringan',
            81: 'Hujan sedang',
            82: 'Hujan lebat',
            85: 'Salju ringan',
            86: 'Salju lebat',
            95: 'Badai petir',
            96: 'Badai petir dengan hujan es ringan',
            99: 'Badai petir dengan hujan es lebat'
        };

        return descriptionMap[weatherCode] || 'Kondisi cuaca tidak diketahui';
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const widget = document.getElementById('weather-widget');
        if (widget) {
            document.getElementById('weather-temp').textContent = '--°C';
            document.getElementById('weather-city').textContent = 'Memuat...';
            document.getElementById('weather-icon').textContent = '⏳';
        }
    }

    /**
     * Show success state
     */
    showSuccessState() {
        // Add subtle success styling if needed
        const widget = document.getElementById('weather-widget');
        if (widget) {
            widget.style.opacity = '1';
        }
    }

    /**
     * Show error state
     */
    showErrorState() {
        const widget = document.getElementById('weather-widget');
        if (widget) {
            // Hide the widget on error
            widget.classList.add('hidden');
            console.log('Weather widget hidden due to error');
        }
    }

    /**
     * Refresh weather data (call this periodically)
     */
    async refreshWeather() {
        // Clear cache
        window.storageManager.removeFromLocalStorage('weatherCache');
        
        // Fetch new data
        await this.fetchWeather();
    }

    /**
     * Get current weather data
     */
    getCurrentWeather() {
        return this.weatherData;
    }

    /**
     * Get weather forecast (extended)
     */
    async getWeatherForecast(days = 7) {
        try {
            const location = this.userProfile.basicInfo.location;
            const lat = location.lat;
            const lon = location.lon;

            if (!lat || !lon) {
                throw new Error('Invalid location coordinates');
            }

            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Asia/Jakarta&forecast_days=${days}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.daily) {
                return {
                    dates: data.daily.time,
                    maxTemps: data.daily.temperature_2m_max,
                    minTemps: data.daily.temperature_2m_min,
                    weatherCodes: data.daily.weathercode
                };
            }

            throw new Error('Invalid forecast data');

        } catch (error) {
            console.error('Error fetching weather forecast:', error);
            return null;
        }
    }

    /**
     * Convert weather code to description
     */
    getWeatherCodeDescription(weatherCode) {
        const descriptions = {
            0: 'Langit cerah',
            1: 'Sebagian berawan',
            2: 'Berawan',
            3: 'Mendung',
            45: 'Kabut',
            48: 'Kabut dengan embun beku',
            51: 'Gerimis ringan',
            53: 'Gerimis sedang',
            55: 'Gerimis lebat',
            56: 'Gerimis beku ringan',
            57: 'Gerimis beku lebat',
            61: 'Hujan ringan',
            63: 'Hujan sedang',
            65: 'Hujan lebat',
            66: 'Hujan beku ringan',
            67: 'Hujan beku lebat',
            71: 'Salju ringan',
            73: 'Salju sedang',
            75: 'Salju lebat',
            77: 'Butir salju',
            80: 'Hujan ringan',
            81: 'Hujan sedang',
            82: 'Hujan lebat',
            85: 'Salju ringan',
            86: 'Salju lebat',
            95: 'Badai petir',
            96: 'Badai petir dengan hujan es',
            99: 'Badai petir dengan hujan es lebat'
        };

        return descriptions[weatherCode] || 'Kondisi cuaca tidak diketahui';
    }

    /**
     * Get temperature trend
     */
    getTemperatureTrend(currentTemp, forecastData) {
        if (!forecastData || !forecastData.maxTemps || forecastData.maxTemps.length < 2) {
            return 'stable';
        }

        const nextDayTemp = forecastData.maxTemps[1];
        const diff = nextDayTemp - currentTemp;

        if (diff > 2) return 'rising';
        if (diff < -2) return 'falling';
        return 'stable';
    }

    /**
     * Get weather recommendations based on current conditions
     */
    getWeatherRecommendations(weatherCode, temperature) {
        const recommendations = [];

        // Temperature-based recommendations
        if (temperature < 20) {
            recommendations.push('Cuaca dingin, gunakan pakaian hangat');
        } else if (temperature > 30) {
            recommendations.push('Cuaca panas, minum banyak air dan hindari sinar matahari langsung');
        }

        // Weather code-based recommendations
        if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
            recommendations.push('Hujan, jangan lupa bawa payung');
        }

        if ([95, 96, 99].includes(weatherCode)) {
            recommendations.push('Badai petir, hindari aktivitas outdoor');
        }

        if ([45, 48].includes(weatherCode)) {
            recommendations.push('Berkabut, berhati-hati saat berkendara');
        }

        return recommendations;
    }
}

// Global instance will be created in main.js