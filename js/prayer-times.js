/**
 * Prayer Times Manager - Aladhan API Integration
 * Handles prayer times data and notifications
 */

class PrayerTimesManager {
    constructor() {
        this.userProfile = null;
        this.prayerTimes = null;
        this.currentPrayer = null;
        this.nextPrayer = null;
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
        this.init();
    }

    /**
     * Initialize prayer times manager
     */
    async init() {
        try {
            this.userProfile = window.storageManager.getFromLocalStorage('userProfile');
            
            if (!this.userProfile?.basicInfo?.location) {
                console.log('Location not available, skipping prayer times');
                return;
            }

            // Check cache first
            const cached = this.getCachedPrayerTimes();
            if (cached && this.isCacheValid(cached.timestamp)) {
                this.prayerTimes = cached.data;
                this.updatePrayerWidget();
                this.scheduleNextPrayer();
                return;
            }

            // Fetch fresh data
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
            
            // Show loading state
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
                
                // Cache the data
                this.cachePrayerTimes({
                    data: this.prayerTimes,
                    timestamp: new Date().toISOString(),
                    city: city,
                    date: new Date().toISOString().split('T')[0]
                });

                // Update UI
                this.updatePrayerWidget();
                this.scheduleNextPrayer();
                
                // Show success state
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
            window.storageManager.saveToLocalStorage('prayerTimesCache', data);
        } catch (error) {
            console.error('Error caching prayer times:', error);
        }
    }

    /**
     * Get cached prayer times
     */
    getCachedPrayerTimes() {
        try {
            return window.storageManager.getFromLocalStorage('prayerTimesCache');
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

        // Show widget
        widget.classList.remove('hidden');

        // Update prayer times
        const prayers = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
        const timeMappings = {
            'subuh': 'Fajr',
            'dzuhur': 'Dhuhr',
            'ashar': 'Asr',
            'maghrib': 'Maghrib',
            'isya': 'Isha'
        };

        prayers.forEach(prayer => {
            const timeElement = document.getElementById(`${prayer}-time`);
            if (timeElement) {
                const apiTime = this.prayerTimes[timeMappings[prayer]];
                if (apiTime) {
                    // Convert 24-hour format to 12-hour format with Indonesian formatting
                    const formattedTime = this.formatPrayerTime(apiTime);
                    timeElement.textContent = formattedTime;
                }
            }
        });

        // Calculate next prayer
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
            
            // Convert to 12-hour format
            const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
            const ampm = hour24 >= 12 ? 'PM' : 'AM';
            
            return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
        } catch (error) {
            return time24; // Return original if formatting fails
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
            { name: 'Subuh', key: 'Fajr' },
            { name: 'Dzuhur', key: 'Dhuhr' },
            { name: 'Ashar', key: 'Asr' },
            { name: 'Maghrib', key: 'Maghrib' },
            { name: 'Isya', key: 'Isha' }
        ];

        let nextPrayer = null;
        let minDiff = Infinity;

        prayers.forEach(prayer => {
            const timeStr = this.prayerTimes[prayer.key];
            if (timeStr) {
                const [hours, minutes] = timeStr.split(':').map(Number);
                const prayerTime = hours * 60 + minutes;
                
                let diff = prayerTime - currentTime;
                
                // If prayer time has passed today, calculate for tomorrow
                if (diff < 0) {
                    diff += 24 * 60; // Add 24 hours
                }
                
                if (diff < minDiff) {
                    minDiff = diff;
                    nextPrayer = {
                        name: prayer.name,
                        time: timeStr,
                        diff: diff
                    };
                }
            }
        });

        this.nextPrayer = nextPrayer;

        // Update next prayer display
        const nextElement = document.getElementById('next-prayer');
        if (nextElement && nextPrayer) {
            const hours = Math.floor(nextPrayer.diff / 60);
            const minutes = nextPrayer.diff % 60;
            
            if (hours > 0) {
                nextElement.textContent = `${nextPrayer.name} (${hours}j ${minutes}m)`;
            } else {
                nextElement.textContent = `${nextPrayer.name} (${minutes}m)`;
            }
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
            { name: 'Subuh', key: 'Fajr', element: 'subuh' },
            { name: 'Dzuhur', key: 'Dhuhr', element: 'dzuhur' },
            { name: 'Ashar', key: 'Asr', element: 'ashar' },
            { name: 'Maghrib', key: 'Maghrib', element: 'maghrib' },
            { name: 'Isya', key: 'Isha', element: 'isya' }
        ];

        let currentPrayer = null;

        // Find current prayer (the one that just passed)
        for (let i = prayers.length - 1; i >= 0; i--) {
            const prayer = prayers[i];
            const timeStr = this.prayerTimes[prayer.key];
            if (timeStr) {
                const [hours, minutes] = timeStr.split(':').map(Number);
                const prayerTime = hours * 60 + minutes;
                
                if (currentTime >= prayerTime) {
                    currentPrayer = prayer;
                    break;
                }
            }
        }

        // If no prayer found (before Subuh), highlight Isya from yesterday
        if (!currentPrayer) {
            currentPrayer = prayers[prayers.length - 1]; // Isya
        }

        // Highlight current prayer
        prayers.forEach(prayer => {
            const element = document.querySelector(`[data-prayer="${prayer.element}"]`);
            if (element) {
                if (prayer.name === currentPrayer.name) {
                    element.classList.add('bg-blue-100', 'border', 'border-blue-300');
                } else {
                    element.classList.remove('bg-blue-100', 'border', 'border-blue-300');
                }
            }
        });
    }

    /**
     * Schedule notification for next prayer
     */
    scheduleNextPrayer() {
        if (!this.nextPrayer || !window.notificationManager) return;

        const now = new Date();
        const notificationTime = new Date(now.getTime() + (this.nextPrayer.diff * 60 * 1000) - (15 * 60 * 1000)); // 15 minutes before

        // Schedule notification
        window.notificationManager.scheduleNotification({
            type: 'prayer',
            title: `Waktu ${this.nextPrayer.name} sebentar lagi`,
            message: 'Siapkan diri untuk shalat',
            scheduledTime: notificationTime.toISOString(),
            prayerName: this.nextPrayer.name
        });
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const widget = document.getElementById('prayer-widget');
        if (widget) {
            const prayers = widget.querySelectorAll('.prayer-time div:last-child');
            prayers.forEach(p => p.textContent = '--:--');
            document.getElementById('next-prayer').textContent = 'Memuat...';
        }
    }

    /**
     * Show success state
     */
    showSuccessState() {
        // Add subtle success indicator if needed
        console.log('Prayer times loaded successfully');
    }

    /**
     * Show error state
     */
    showErrorState() {
        const widget = document.getElementById('prayer-widget');
        if (widget) {
            // Hide the widget on error
            widget.classList.add('hidden');
            
            // Show error message in console
            console.error('Failed to load prayer times');
        }
    }

    /**
     * Check if prayer time is approaching (within 15 minutes)
     */
    isPrayerTimeApproaching(prayerTimeStr) {
        try {
            const [hours, minutes] = prayerTimeStr.split(':').map(Number);
            const prayerMinutes = hours * 60 + minutes;
            
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            
            const diff = prayerMinutes - currentMinutes;
            return diff >= 0 && diff <= 15; // Within 15 minutes
        } catch (error) {
            return false;
        }
    }

    /**
     * Get prayer time for specific prayer
     */
    getPrayerTime(prayerName) {
        if (!this.prayerTimes) return null;

        const mappings = {
            'subuh': 'Fajr',
            'dzuhur': 'Dhuhr',
            'ashar': 'Asr',
            'maghrib': 'Maghrib',
            'isya': 'Isha'
        };

        const apiKey = mappings[prayerName.toLowerCase()];
        if (apiKey) {
            return this.prayerTimes[apiKey];
        }

        return null;
    }

    /**
     * Refresh prayer times (call this once a day)
     */
    async refreshPrayerTimes() {
        // Clear cache
        window.storageManager.removeFromLocalStorage('prayerTimesCache');
        
        // Fetch new data
        await this.fetchPrayerTimes();
    }

    /**
     * Get all prayer times for today
     */
    getAllPrayerTimes() {
        if (!this.prayerTimes) return null;

        return {
            subuh: this.formatPrayerTime(this.prayerTimes.Fajr),
            dzuhur: this.formatPrayerTime(this.prayerTimes.Dhuhr),
            ashar: this.formatPrayerTime(this.prayerTimes.Asr),
            maghrib: this.formatPrayerTime(this.prayerTimes.Maghrib),
            isya: this.formatPrayerTime(this.prayerTimes.Isha)
        };
    }
}

// Create global instance
window.prayerTimesManager = new PrayerTimesManager();