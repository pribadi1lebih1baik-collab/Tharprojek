/**
 * Prayer Times Manager - Aladhan API Integration
 * Handles prayer times data and notifications
 */

class PrayerTimesManager {
    constructor(storageManager) {
        if (!storageManager) {
            throw new Error("StorageManager is a required dependency for PrayerTimesManager.");
        }
        this.storageManager = storageManager;
        this.userProfile = null;
        this.prayerTimes = null;
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    }

    /**
     * Initialize prayer times manager
     */
    async init() {
        try {
            this.userProfile = this.storageManager.getFromLocalStorage('userProfile');
            if (!this.userProfile?.preferences?.prayerEnabled || !this.userProfile?.basicInfo?.location) {
                console.log('Prayer times disabled or location not available.');
                return;
            }

            const cached = this.storageManager.getFromLocalStorage('prayerTimesCache');
            if (cached && new Date().getTime() - new Date(cached.timestamp).getTime() < this.cacheExpiry) {
                this.prayerTimes = cached.data;
            } else {
                await this.fetchPrayerTimes();
            }

            if (this.prayerTimes) {
                this.updatePrayerWidget();
            }
        } catch (error) {
            console.error('Error initializing prayer times:', error);
            this.showErrorState();
        }
    }

    /**
     * Fetch prayer times from Aladhan API
     */
    async fetchPrayerTimes() {
        const location = this.userProfile.basicInfo.location;
        const city = location.city || 'Jakarta';
        this.showLoadingState();

        try {
            const response = await fetch(`https://api.aladhan.com/v1/timesByCity?city=${encodeURIComponent(city)}&country=Indonesia&method=2`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            if (data.code === 200 && data.data) {
                this.prayerTimes = data.data.timings;
                this.storageManager.saveToLocalStorage('prayerTimesCache', {
                    data: this.prayerTimes,
                    timestamp: new Date().toISOString(),
                });
            } else {
                throw new Error('Invalid response from API');
            }
        } catch (error) {
            console.error('Error fetching prayer times:', error);
            this.showErrorState();
            throw error; // Propagate error
        }
    }

    /**
     * Update prayer widget UI
     */
    updatePrayerWidget() {
        const widget = document.getElementById('prayer-widget');
        if (!widget || !this.prayerTimes) return;

        widget.classList.remove('hidden');
        const timeMappings = { subuh: 'Fajr', dzuhur: 'Dhuhr', ashar: 'Asr', maghrib: 'Maghrib', isya: 'Isha' };

        Object.entries(timeMappings).forEach(([id, apiKey]) => {
            document.getElementById(`${id}-time`).textContent = this.prayerTimes[apiKey] || '--:--';
        });
        
        this.updateNextPrayer();
    }

    /**
     * Calculate and display the next prayer time.
     */
    updateNextPrayer() {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        let nextPrayerName = 'Subuh';
        let minDiff = Infinity;
        
        const prayerOrder = [{name: 'Subuh', key: 'Fajr'}, {name: 'Dzuhur', key: 'Dhuhr'}, {name: 'Ashar', key: 'Asr'}, {name: 'Maghrib', key: 'Maghrib'}, {name: 'Isya', key: 'Isha'}];

        for (const prayer of prayerOrder) {
            const [h, m] = this.prayerTimes[prayer.key].split(':').map(Number);
            const prayerTime = h * 60 + m;
            const diff = prayerTime - currentTime;
            if (diff > 0 && diff < minDiff) {
                minDiff = diff;
                nextPrayerName = prayer.name;
            }
        }

        // If minDiff is still Infinity, it means next prayer is Fajr tomorrow.
        const nextPrayerEl = document.getElementById('next-prayer');
        if (nextPrayerEl) {
             nextPrayerEl.textContent = nextPrayerName;
        }
    }


    /**
     * Show loading state in the UI.
     */
    showLoadingState() {
        const prayerTimeElements = document.querySelectorAll('[id$="-time"]');
        prayerTimeElements.forEach(el => el.textContent = '...');
    }

    /**
     * Show error state in the UI.
     */
    showErrorState() {
        const prayerWidget = document.getElementById('prayer-widget');
        if(prayerWidget) prayerWidget.classList.add('hidden'); // Hide widget on error
    }
}
