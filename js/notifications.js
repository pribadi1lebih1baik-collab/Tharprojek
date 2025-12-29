/**
 * Notification Manager - Web Notifications API Handler
 * Manages browser notifications and scheduling
 */

class NotificationManager {
    constructor(storageManager) {
        if (!storageManager) {
            throw new Error("StorageManager is a required dependency for NotificationManager.");
        }
        this.storageManager = storageManager;
        this.permission = 'default';
        this.scheduledNotifications = [];
    }

    /**
     * Initialize notification manager
     */
    async init() {
        if (!('Notification' in window)) {
            console.log('This browser does not support desktop notification');
            return;
        }
        this.permission = Notification.permission;
        this.loadScheduledNotifications();
        // Check for due notifications periodically
        setInterval(() => this.checkScheduledNotifications(), 60 * 1000);
    }

    /**
     * Request notification permission from the user.
     */
    async requestPermission() {
        if (this.permission === 'default') {
            const permission = await Notification.requestPermission();
            this.permission = permission;
        }
        return this.permission;
    }

    /**
     * Show a notification immediately.
     * @param {string} title - The title of the notification.
     * @param {object} options - Options for the notification (e.g., body, icon).
     */
    showNotification(title, options = {}) {
        if (this.permission !== 'granted') {
            console.warn("Notification permission not granted.");
            return;
        }
        new Notification(title, { body: options.body, icon: 'icon.png', ...options });
    }

    /**
     * Schedule a notification to be shown at a later time.
     * @param {object} notificationData - Data for the notification.
     */
    scheduleNotification(notificationData) {
        const newNotif = {
            id: Date.now(),
            status: 'scheduled',
            ...notificationData,
        };
        this.scheduledNotifications.push(newNotif);
        this.saveScheduledNotifications();
    }

    /**
     * Checks for and triggers any due notifications.
     */
    checkScheduledNotifications() {
        const now = new Date().getTime();
        this.scheduledNotifications.forEach(notif => {
            if (notif.status === 'scheduled' && new Date(notif.scheduledTime).getTime() <= now) {
                this.showNotification(notif.title, { body: notif.message });
                notif.status = 'triggered';
            }
        });
        this.saveScheduledNotifications();
    }


    /**
     * Load scheduled notifications from storage.
     */
    loadScheduledNotifications() {
        this.scheduledNotifications = this.storageManager.getFromLocalStorage('scheduledNotifications') || [];
    }

    /**
     * Save scheduled notifications to storage.
     */
    saveScheduledNotifications() {
        this.storageManager.saveToLocalStorage('scheduledNotifications', this.scheduledNotifications);
    }
}
