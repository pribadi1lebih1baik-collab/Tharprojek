/**
 * Main Application Logic - Dashboard controller
 * Handles initialization, navigation, and core functionality
 */
class MainApp {
    constructor(storageManager, gamificationManager, prayerTimesManager, weatherManager, aiIntegration, notificationManager) {
        this.storageManager = storageManager;
        this.gamificationManager = gamificationManager;
        this.prayerTimesManager = prayerTimesManager;
        this.weatherManager = weatherManager;
        this.aiIntegration = aiIntegration;
        this.notificationManager = notificationManager;

        this.userProfile = null;
        this.isLoading = true;
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            if (!this.checkOnboardingStatus()) {
                return;
            }

            await this.storageManager.initIndexedDB();
            this.userProfile = await this.loadUserProfile();
            await this.initializeComponents();
            this.setupEventListeners();
            await this.loadDashboardData();
            this.hideLoadingScreen();
            this.showPanicButtonIfNeeded();
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Gagal memuat aplikasi. Refresh halaman.');
        }
    }

    checkOnboardingStatus() {
        const onboardingComplete = this.storageManager.getFromLocalStorage('onboardingComplete');
        if (!onboardingComplete) {
            window.location.href = 'onboarding.html';
            return false;
        }
        return true;
    }

    async loadUserProfile() {
        let profile = this.storageManager.getFromLocalStorage('userProfile');
        if (!profile) {
            profile = {
                basicInfo: { name: 'Pria 1%', age: null, location: { city: 'Jakarta', country: 'Indonesia' }, interests: [] },
                stats: { level: 1, xp: 0, totalXP: 0, joinDate: new Date().toISOString() },
                preferences: { theme: 'light', notifications: true, prayerEnabled: true, language: 'id' },
                achievements: [],
                streaks: {}
            };
            this.storageManager.saveToLocalStorage('userProfile', profile);
        }
        return profile;
    }

    async initializeComponents() {
        if (this.gamificationManager) await this.gamificationManager.init();
        if (this.userProfile?.preferences?.prayerEnabled && this.prayerTimesManager) await this.prayerTimesManager.init().catch(e => console.warn('Prayer times init failed:', e));
        if (this.weatherManager && this.userProfile?.basicInfo?.location) await this.weatherManager.init().catch(e => console.warn('Weather init failed:', e));
        if (this.notificationManager) await this.notificationManager.init().catch(e => console.warn('Notification init failed:', e));
        if (this.aiIntegration) await this.aiIntegration.init().catch(e => console.warn('AI integration init failed:', e));
    }

    setupEventListeners() {
        // Event listeners implementation...
    }

    async loadDashboardData() {
        this.updateUserStats();
        await this.loadTodayHabits();
        await this.loadStreakData();
        await this.loadFinanceHealth();
        await this.loadMentalHealth();
        await this.loadProgressChart();
    }

    updateUserStats() {
        if (!this.userProfile) return;
        const { level = 1, xp = 0 } = this.userProfile.stats;
        const xpProgress = xp % 100;
        document.getElementById('user-level').textContent = `Level ${level}`;
        document.getElementById('user-xp').textContent = xp.toLocaleString();
        document.getElementById('xp-progress-text').textContent = `${xpProgress}/100`;
        document.getElementById('xp-progress-bar').style.width = `${xpProgress}%`;
        let title = 'Pemula';
        if (level >= 31) title = 'Pria Top 1%'; else if (level >= 16) title = 'Elite'; else if (level >= 6) title = 'Pejuang';
        document.getElementById('user-title').textContent = title;
    }

    async loadTodayHabits() { /* ... implementation ... */ }
    async loadStreakData() { /* ... implementation ... */ }

    async loadFinanceHealth() {
        let transactions = [];
        try { transactions = await this.storageManager.getAllFromDB('financeDB', 'transactions'); }
        catch (e) { console.warn('Finance DB not available'); }

        const currentMonth = new Date().toISOString().slice(0, 7);
        const thisMonthTx = transactions.filter(t => t.date && t.date.startsWith(currentMonth));
        const totalIncome = thisMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
        const totalExpense = thisMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

        let healthScore = 0;
        if (totalIncome > 0 || totalExpense > 0) {
            const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : -Infinity;
            if (savingsRate >= 30) healthScore = 90;
            else if (savingsRate >= 20) healthScore = 75;
            else if (savingsRate >= 10) healthScore = 60;
            else if (savingsRate >= 0) healthScore = 45;
            else healthScore = 25;
        }
        
        const financeHealthEl = document.getElementById('finance-health');
        if (financeHealthEl) financeHealthEl.textContent = `${Math.round(healthScore)}%`;
    }

    async loadMentalHealth() { /* ... implementation ... */ }
    async loadProgressChart() { /* ... implementation ... */ }
    showPanicButtonIfNeeded() { /* ... implementation ... */ }

    hideLoadingScreen() {
        const screen = document.getElementById('loading-screen');
        if (screen) {
            screen.style.opacity = '0';
            setTimeout(() => { screen.style.display = 'none'; }, 500);
        }
    }

    showError(message) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        modal.innerHTML = `<div class="bg-white rounded-2xl p-6 text-center"><h3>Terjadi Kesalahan</h3><p>${message}</p></div>`;
        document.body.appendChild(modal);
    }
}

// === APPLICATION ENTRY POINT ===
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof StorageManager === 'undefined' || typeof GamificationManager === 'undefined') {
        console.error('Critical manager scripts are not loaded.');
        return;
    }

    const storageManager = new StorageManager();
    const gamificationManager = new GamificationManager(storageManager);
    const prayerTimesManager = typeof PrayerTimesManager !== 'undefined' ? new PrayerTimesManager(storageManager) : null;
    const weatherManager = typeof WeatherManager !== 'undefined' ? new WeatherManager(storageManager) : null;
    const aiIntegration = typeof AIIntegration !== 'undefined' ? new AIIntegration(storageManager) : null;
    const notificationManager = typeof NotificationManager !== 'undefined' ? new NotificationManager(storageManager) : null;

    const app = new MainApp(storageManager, gamificationManager, prayerTimesManager, weatherManager, aiIntegration, notificationManager);
    await app.init();
});
