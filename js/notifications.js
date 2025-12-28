/**
 * Notification Manager - Web Notifications API Handler
 * Manages browser notifications and scheduling
 */

class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.scheduledNotifications = [];
    }

    /**
     * Initialize notification manager
     */
    async init() {
        try {
            // Check notification permission
            await this.checkPermission();
            
            // Load scheduled notifications
            await this.loadScheduledNotifications();
            
            // Setup notification checking
            this.setupNotificationChecking();
            
        } catch (error) {
            console.error('Error initializing notifications:', error);
        }
    }

    /**
     * Check and request notification permission
     */
    async checkPermission() {
        if ('Notification' in window) {
            this.permission = Notification.permission;
            
            if (this.permission === 'default') {
                this.permission = await Notification.requestPermission();
            }
            
            console.log('Notification permission:', this.permission);
            return this.permission;
        } else {
            console.log('Notifications not supported');
            return 'unsupported';
        }
    }

    /**
     * Request notification permission with user-friendly prompt
     */
    async requestPermissionWithPrompt() {
        if ('Notification' in window && Notification.permission === 'default') {
            // Show custom permission prompt
            const shouldRequest = await this.showPermissionPrompt();
            
            if (shouldRequest) {
                this.permission = await Notification.requestPermission();
                
                if (this.permission === 'granted') {
                    this.showSuccessMessage('Notifikasi diaktifkan! Anda akan menerima reminder.');
                } else if (this.permission === 'denied') {
                    this.showInfoMessage('Notifikasi dinonaktifkan. Anda bisa mengaktifkannya di pengaturan browser.');
                }
            }
        }
        
        return this.permission;
    }

    /**
     * Show custom permission prompt
     */
    showPermissionPrompt() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="bg-white rounded-2xl max-w-md w-full p-6 text-center">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM4 19h6v-2H4v2zM16 3H8v2h8V3zM4 3v2h6V3H4z"></path>
                        </svg>
                    </div>
                    <h3 class="text-xl font-poppins font-semibold text-gray-900 mb-2">Aktifkan Notifikasi</h3>
                    <p class="text-gray-600 mb-6">Dengan mengaktifkan notifikasi, Anda akan menerima reminder untuk shalat, habits, dan evaluasi harian.</p>
                    <div class="flex space-x-3">
                        <button id="notif-deny" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors">
                            Nanti Saja
                        </button>
                        <button id="notif-allow" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors">
                            Izinkan
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('notif-deny').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(false);
            });

            document.getElementById('notif-allow').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(true);
            });
        });
    }

    /**
     * Show a notification
     */
    async showNotification(title, options = {}) {
        // Check permission
        if (this.permission !== 'granted') {
            console.log('Notification permission not granted');
            return false;
        }

        // Default options
        const defaultOptions = {
            body: '',
            icon: '/assets/icons/icon-192x192.png',
            badge: '/assets/icons/badge-72x72.png',
            tag: 'pria1percent',
            requireInteraction: false,
            silent: false,
            ...options
        };

        try {
            const notification = new Notification(title, defaultOptions);
            
            // Auto close after 5 seconds if not requiring interaction
            if (!defaultOptions.requireInteraction) {
                setTimeout(() => {
                    if (notification.close) {
                        notification.close();
                    }
                }, 5000);
            }

            return notification;
        } catch (error) {
            console.error('Error showing notification:', error);
            return false;
        }
    }

    /**
     * Schedule a notification
     */
    async scheduleNotification(notificationData) {
        const { type, title, message, scheduledTime, ...extraData } = notificationData;
        
        const notification = {
            id: Date.now() + Math.random(),
            type,
            title,
            message,
            scheduledTime: new Date(scheduledTime).toISOString(),
            status: 'scheduled',
            ...extraData
        };

        this.scheduledNotifications.push(notification);
        await this.saveScheduledNotifications();
        
        return notification.id;
    }

    /**
     * Cancel a scheduled notification
     */
    async cancelNotification(notificationId) {
        this.scheduledNotifications = this.scheduledNotifications.filter(
            n => n.id !== notificationId
        );
        await this.saveScheduledNotifications();
    }

    /**
     * Setup notification checking interval
     */
    setupNotificationChecking() {
        // Check every minute
        setInterval(() => {
            this.checkScheduledNotifications();
        }, 60000);

        // Also check immediately
        this.checkScheduledNotifications();
    }

    /**
     * Check and trigger scheduled notifications
     */
    async checkScheduledNotifications() {
        const now = new Date();
        const dueNotifications = this.scheduledNotifications.filter(notification => {
            const scheduledTime = new Date(notification.scheduledTime);
            return scheduledTime <= now && notification.status === 'scheduled';
        });

        for (const notification of dueNotifications) {
            await this.triggerScheduledNotification(notification);
            notification.status = 'triggered';
        }

        if (dueNotifications.length > 0) {
            await this.saveScheduledNotifications();
        }
    }

    /**
     * Trigger a scheduled notification
     */
    async triggerScheduledNotification(notification) {
        const options = {
            body: notification.message,
            tag: `scheduled-${notification.id}`,
            requireInteraction: this.shouldRequireInteraction(notification.type),
            data: {
                type: notification.type,
                id: notification.id,
                ...notification.extraData
            }
        };

        // Add type-specific options
        switch (notification.type) {
            case 'prayer':
                options.icon = '/assets/icons/prayer.png';
                options.badge = '/assets/icons/prayer-badge.png';
                break;
            case 'habit':
                options.icon = '/assets/icons/habit.png';
                options.badge = '/assets/icons/habit-badge.png';
                break;
            case 'mood':
                options.icon = '/assets/icons/mood.png';
                options.badge = '/assets/icons/mood-badge.png';
                break;
            default:
                options.icon = '/assets/icons/icon-192x192.png';
                options.badge = '/assets/icons/badge-72x72.png';
        }

        const notificationObj = await this.showNotification(notification.title, options);
        
        if (notificationObj) {
            // Handle notification click
            notificationObj.onclick = () => {
                this.handleNotificationClick(notification);
            };
        }
    }

    /**
     * Determine if notification should require interaction
     */
    shouldRequireInteraction(type) {
        const interactiveTypes = ['prayer', 'important-habit', 'weekly-review'];
        return interactiveTypes.includes(type);
    }

    /**
     * Handle notification click
     */
    handleNotificationClick(notification) {
        // Focus the app window
        if (window.focus) {
            window.focus();
        }

        // Handle type-specific actions
        switch (notification.type) {
            case 'prayer':
                // Navigate to prayer times or main dashboard
                if (window.location.pathname !== '/index.html') {
                    window.location.href = 'index.html';
                }
                break;
            case 'habit':
                // Navigate to habits page
                if (window.location.pathname !== '/habits.html') {
                    window.location.href = 'habits.html';
                }
                break;
            case 'mood':
                // Navigate to mental health page
                if (window.location.pathname !== '/mental.html') {
                    window.location.href = 'mental.html';
                }
                break;
            default:
                // Navigate to main dashboard
                if (window.location.pathname !== '/index.html') {
                    window.location.href = 'index.html';
                }
        }

        // Close notification
        if (notification.close) {
            notification.close();
        }
    }

    /**
     * Schedule daily notifications
     */
    async scheduleDailyNotifications() {
        const userProfile = window.storageManager.getFromLocalStorage('userProfile');
        const today = new Date();

        // Morning routine notification
        await this.scheduleNotification({
            type: 'habit',
            title: '🌅 Waktunya Morning Routine',
            message: 'Mulai hari dengan habits positif Anda',
            scheduledTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 6, 0, 0).toISOString()
        });

        // Daily reflection notification
        await this.scheduleNotification({
            type: 'mood',
            title: '🌙 Evaluasi Harian',
            message: 'Sudah waktunya mengevaluasi hari Anda',
            scheduledTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 21, 0, 0).toISOString()
        });

        // Weekly review notification (if it's Sunday)
        if (today.getDay() === 0) {
            await this.scheduleNotification({
                type: 'weekly-review',
                title: '📊 Review Mingguan',
                message: 'Review progres Anda selama seminggu',
                scheduledTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0).toISOString()
            });
        }

        // Prayer notifications (if enabled)
        if (userProfile?.preferences?.prayerEnabled) {
            await this.schedulePrayerNotifications();
        }
    }

    /**
     * Schedule prayer notifications
     */
    async schedulePrayerNotifications() {
        if (!window.prayerTimesManager || !window.prayerTimesManager.prayerTimes) {
            return;
        }

        const prayers = [
            { name: 'Subuh', key: 'Fajr' },
            { name: 'Dzuhur', key: 'Dhuhr' },
            { name: 'Ashar', key: 'Asr' },
            { name: 'Maghrib', key: 'Maghrib' },
            { name: 'Isya', key: 'Isha' }
        ];

        for (const prayer of prayers) {
            const timeStr = window.prayerTimesManager.prayerTimes[prayer.key];
            if (timeStr) {
                const [hours, minutes] = timeStr.split(':').map(Number);
                const scheduledTime = new Date();
                scheduledTime.setHours(hours, minutes - 15, 0, 0); // 15 minutes before

                if (scheduledTime > new Date()) {
                    await this.scheduleNotification({
                        type: 'prayer',
                        title: `🕌 Waktu ${prayer.name} sebentar lagi`,
                        message: 'Siapkan diri untuk shalat',
                        scheduledTime: scheduledTime.toISOString(),
                        prayerName: prayer.name
                    });
                }
            }
        }
    }

    /**
     * Load scheduled notifications from storage
     */
    async loadScheduledNotifications() {
        try {
            const stored = window.storageManager.getFromLocalStorage('scheduledNotifications');
            this.scheduledNotifications = stored || [];
            
            // Clean up old notifications
            const now = new Date();
            this.scheduledNotifications = this.scheduledNotifications.filter(notification => {
                const scheduledTime = new Date(notification.scheduledTime);
                return scheduledTime > now || notification.status === 'scheduled';
            });
            
        } catch (error) {
            console.error('Error loading scheduled notifications:', error);
            this.scheduledNotifications = [];
        }
    }

    /**
     * Save scheduled notifications to storage
     */
    async saveScheduledNotifications() {
        try {
            window.storageManager.saveToLocalStorage('scheduledNotifications', this.scheduledNotifications);
        } catch (error) {
            console.error('Error saving scheduled notifications:', error);
        }
    }

    /**
     * Clear all scheduled notifications
     */
    async clearScheduledNotifications() {
        this.scheduledNotifications = [];
        await this.saveScheduledNotifications();
    }

    /**
     * Get notification statistics
     */
    getNotificationStats() {
        const total = this.scheduledNotifications.length;
        const triggered = this.scheduledNotifications.filter(n => n.status === 'triggered').length;
        const scheduled = this.scheduledNotifications.filter(n => n.status === 'scheduled').length;
        
        return { total, triggered, scheduled };
    }

    /**
     * Show success message
     */
    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }

    /**
     * Show error message
     */
    showErrorMessage(message) {
        this.showToast(message, 'error');
    }

    /**
     * Show info message
     */
    showInfoMessage(message) {
        this.showToast(message, 'info');
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-20 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-50 transform translate-x-full transition-transform duration-300 ${
            type === 'success' ? 'border-l-4 border-emerald-500' :
            type === 'error' ? 'border-l-4 border-red-500' :
            'border-l-4 border-blue-500'
        }`;
        
        toast.innerHTML = `
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium text-gray-900">${message}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-gray-400 hover:text-gray-600">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        // Auto remove after 4 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }
}

// Global instance will be created in main.js