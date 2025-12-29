/**
 * Notification Manager - Web Notifications API Handler
 * Manages browser notifications and scheduling
 */

class NotificationManager {
    constructor(storageManager) {
        this.storageManager = storageManager;
        this.permission = 'default';
        this.scheduledNotifications = [];
    }

    /**
     * Initialize notification manager
     */
    async init() {
        try {
            await this.checkPermission();
            await this.loadScheduledNotifications();
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
                // We will prompt the user contextually instead of right away
            }
            return this.permission;
        }
        return 'unsupported';
    }

    /**
     * Request notification permission with user-friendly prompt
     */
    async requestPermissionWithPrompt() {
        if ('Notification' in window && Notification.permission === 'default') {
            const shouldRequest = await this.showPermissionPrompt();
            if (shouldRequest) {
                this.permission = await Notification.requestPermission();
                if (this.permission === 'granted') this.showToast('Notifikasi diaktifkan!', 'success');
                else this.showToast('Notifikasi dinonaktifkan.', 'info');
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
                    <h3 class="text-xl font-poppins font-semibold text-gray-900 mb-2">Aktifkan Notifikasi</h3>
                    <p class="text-gray-600 mb-6">Izinkan notifikasi untuk menerima pengingat penting.</p>
                    <div class="flex space-x-3">
                        <button id="notif-deny" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg">Nanti Saja</button>
                        <button id="notif-allow" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg">Izinkan</button>
                    </div>
                </div>`;
            document.body.appendChild(modal);
            modal.querySelector('#notif-deny').addEventListener('click', () => { modal.remove(); resolve(false); });
            modal.querySelector('#notif-allow').addEventListener('click', () => { modal.remove(); resolve(true); });
        });
    }

    /**
     * Show a notification
     */
    async showNotification(title, options = {}) {
        if (this.permission !== 'granted') return false;
        const defaultOptions = {
            body: '',
            icon: '/assets/icons/icon-192x192.png',
            badge: '/assets/icons/badge-72x72.png',
            tag: 'pria1percent',
            ...options
        };
        try {
            const notification = new Notification(title, defaultOptions);
            setTimeout(() => notification.close(), 5000);
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
        const notification = {
            id: Date.now() + Math.random(),
            status: 'scheduled',
            ...notificationData
        };
        this.scheduledNotifications.push(notification);
        await this.saveScheduledNotifications();
        return notification.id;
    }

    setupNotificationChecking() {
        setInterval(() => this.checkScheduledNotifications(), 60000);
        this.checkScheduledNotifications();
    }

    async checkScheduledNotifications() {
        const now = new Date();
        const due = this.scheduledNotifications.filter(n => new Date(n.scheduledTime) <= now && n.status === 'scheduled');
        for (const n of due) {
            await this.triggerScheduledNotification(n);
            n.status = 'triggered';
        }
        if (due.length > 0) await this.saveScheduledNotifications();
    }

    async triggerScheduledNotification(notification) {
        const options = {
            body: notification.message,
            tag: `scheduled-${notification.id}`,
            data: notification
        };
        await this.showNotification(notification.title, options);
    }

    async loadScheduledNotifications() {
        const stored = this.storageManager.getFromLocalStorage('scheduledNotifications');
        this.scheduledNotifications = stored || [];
        const now = new Date();
        this.scheduledNotifications = this.scheduledNotifications.filter(n => new Date(n.scheduledTime) > now || n.status === 'scheduled');
    }

    async saveScheduledNotifications() {
        this.storageManager.saveToLocalStorage('scheduledNotifications', this.scheduledNotifications);
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const colors = {
            success: 'border-emerald-500',
            error: 'border-red-500',
            info: 'border-blue-500'
        };
        toast.className = `fixed top-20 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-50 transform translate-x-full transition-transform duration-300 ${colors[type]} border-l-4`;
        toast.innerHTML = `<div class="flex items-center"><p class="text-sm font-medium text-gray-900">${message}</p></div>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.remove('translate-x-full'), 100);
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
}
