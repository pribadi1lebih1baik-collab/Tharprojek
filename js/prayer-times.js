/**
 * Prayer Times Manager - Aladhan API Integration
 * Handles prayer times data and notifications
 */

class PrayerTimesManager {
    constructor(storageManager) {
        this.storageManager = storageManager;
        this.userProfile = null;
        this.prayerTimes = null;
        this.currentPrayer = null;
        this.nextPrayer = null;
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    }

    /**
     * Initialize prayer times manager
     */
    async init() {
        try {
            this.userProfile = this.storageManager.getFromLocalStorage('userProfile');
            
            if (!this.userProfile?.basicInfo?.location) {
                console.log('Location not available, skipping prayer times');
                return;
            }

            const cached = this.getCachedPrayerTimes();
            if (cached && this.isCacheValid(cached.timestamp)) {
                this.prayerTimes = cached.data;
                this.updatePrayerWidget();
                this.scheduleNextPrayer();
                return;
            }

            await this.fetchPrayerTimes();
            
        } catch (error) {
            console.error('Error initializing prayer times:', error);
        }
    }

    /**
     * Fetch prayer times from Aladhan API
     */
    async fetchPrayerTimes() {
        try {
            const location = this.userProfile.basicInfo.location;
            const city = location.city || 'Jakarta';
            
            this.showLoadingState();

            const response = await fetch(
                `https://api.aladhan.com/v1/timesByCity?city=${encodeURIComponent(city)}&country=Indonesia&method=2&school=0`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.code === 200 && data.data) {
                this.prayerTimes = data.data.timings;
                
                this.cachePrayerTimes({
                    data: this.prayerTimes,
                    timestamp: new Date().toISOString(),
                    city: city,
                    date: new Date().toISOString().split('T')[0]
                });

                this.updatePrayerWidget();
                this.scheduleNextPrayer();
                this.showSuccessState();
            } else {
                throw new Error('Invalid response from API');
            }

        } catch (error) {
            console.error('Error fetching prayer times:', error);
            this.showErrorState();
        }
    }

    /**
     * Cache prayer times data
     */
    cachePrayerTimes(data) {
        try {
            this.storageManager.saveToLocalStorage('prayerTimesCache', data);
        } catch (error) {
            console.error('Error caching prayer times:', error);
        }
    }

    /**
     * Get cached prayer times
     */
    getCachedPrayerTimes() {
        try {
            return this.storageManager.getFromLocalStorage('prayerTimesCache');
        } catch (error) {
            console.error('Error getting cached prayer times:', error);
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
     * Update prayer widget UI
     */
    updatePrayerWidget() {
        if (!this.prayerTimes) return;

        const widget = document.getElementById('prayer-widget');
        if (!widget) return;

        widget.classList.remove('hidden');

        const prayers = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
        const timeMappings = { 'subuh': 'Fajr', 'dzuhur': 'Dhuhr', 'ashar': 'Asr', 'maghrib': 'Maghrib', 'isya': 'Isha' };

        prayers.forEach(prayer => {
            const timeElement = document.getElementById(`${prayer}-time`);
            if (timeElement) {
                const apiTime = this.prayerTimes[timeMappings[prayer]];
                if (apiTime) {
                    timeElement.textContent = this.formatPrayerTime(apiTime);
                }
            }
        });

        this.calculateNextPrayer();
        this.highlightCurrentPrayer();
    }

    /**
     * Format prayer time for display
     */
    formatPrayerTime(time24) {
        try {
            const [hours, minutes] = time24.split(':');
            const hour24 = parseInt(hours);
            const minute = parseInt(minutes);
            const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
            const ampm = hour24 >= 12 ? 'PM' : 'AM';
            return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
        } catch (error) {
            return time24;
        }
    }

    /**
     * Calculate next prayer
     */
    calculateNextPrayer() {
        if (!this.prayerTimes) return;

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const prayers = [
            { name: 'Subuh', key: 'Fajr' }, { name: 'Dzuhur', key: 'Dhuhr' }, { name: 'Ashar', key: 'Asr' },
            { name: 'Maghrib', key: 'Maghrib' }, { name: 'Isya', key: 'Isha' }
        ];

        let nextPrayer = null;
        let minDiff = Infinity;

        prayers.forEach(prayer => {
            const timeStr = this.prayerTimes[prayer.key];
            if (timeStr) {
                const [hours, minutes] = timeStr.split(':').map(Number);
                const prayerTime = hours * 60 + minutes;
                let diff = prayerTime - currentTime;
                if (diff < 0) diff += 24 * 60;
                
                if (diff < minDiff) {
                    minDiff = diff;
                    nextPrayer = { name: prayer.name, time: timeStr, diff: diff };
                }
            }
        });

        this.nextPrayer = nextPrayer;
        const nextElement = document.getElementById('next-prayer');
        if (nextElement && nextPrayer) {
            const hours = Math.floor(nextPrayer.diff / 60);
            const minutes = nextPrayer.diff % 60;
            nextElement.textContent = `${nextPrayer.name} (${hours > 0 ? `${hours}j ${minutes}m` : `${minutes}m`})`;
        }
    }

    /**
     * Highlight current prayer
     */
    highlightCurrentPrayer() {
        if (!this.prayerTimes) return;

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const prayers = [
            { name: 'Subuh', key: 'Fajr', element: 'subuh' }, { name: 'Dzuhur', key: 'Dhuhr', element: 'dzuhur' },
            { name: 'Ashar', key: 'Asr', element: 'ashar' }, { name: 'Maghrib', key: 'Maghrib', element: 'maghrib' },
            { name: 'Isya', key: 'Isha', element: 'isya' }
        ];

        let currentPrayer = null;
        for (let i = prayers.length - 1; i >= 0; i--) {
            const prayer = prayers[i];
            const timeStr = this.prayerTimes[prayer.key];
            if (timeStr) {
                const [hours, minutes] = timeStr.split(':').map(Number);
                if (currentTime >= (hours * 60 + minutes)) {
                    currentPrayer = prayer;
                    break;
                }
            }
        }
        if (!currentPrayer) currentPrayer = prayers[prayers.length - 1];

        prayers.forEach(prayer => {
            const element = document.querySelector(`[data-prayer="${prayer.element}"]`);
            if (element) {
                element.classList.toggle('bg-blue-100', prayer.name === currentPrayer.name);
                element.classList.toggle('border', prayer.name === currentPrayer.name);
                element.classList.toggle('border-blue-300', prayer.name === currentPrayer.name);
            }
        });
    }

    /**
     * Schedule notification for next prayer
     */
    scheduleNextPrayer() {
        // This functionality will be handled by a central NotificationManager
    }

    showLoadingState() {
        const widget = document.getElementById('prayer-widget');
        if (widget) {
            widget.querySelectorAll('.prayer-time div:last-child').forEach(p => p.textContent = '--:--');
            document.getElementById('next-prayer').textContent = 'Memuat...';
        }
    }

    showSuccessState() {
        console.log('Prayer times loaded successfully');
    }

    showErrorState() {
        const widget = document.getElementById('prayer-widget');
        if (widget) {
            widget.classList.add('hidden');
            console.error('Failed to load prayer times');
        }
    }
}
