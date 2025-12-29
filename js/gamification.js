/**
 * Gamification System - XP, Levels, and Achievements
 * Manages user progression and rewards
 */

class GamificationManager {
    constructor(storageManager) {
        if (!storageManager) {
            throw new Error("StorageManager is a required dependency for GamificationManager.");
        }
        this.storageManager = storageManager;
        this.userProfile = null;
        this.achievements = [];
    }

    /**
     * Initialize gamification system. Must be called after instantiation.
     */
    async init() {
        this.userProfile = this.storageManager.getFromLocalStorage('userProfile');
        
        // This should not happen in a normal flow post-onboarding, but as a safeguard:
        if (!this.userProfile) {
            console.warn("GamificationManager initialized without a user profile.");
            this.userProfile = { stats: { level: 1, xp: 0 }, achievements: [] };
        }
        
        await this.loadAchievements();
        // Disabling automatic check on init to be called explicitly when needed.
        // await this.checkAchievements();
    }

    /**
     * Load achievements from storage or use defaults.
     */
    async loadAchievements() {
        try {
            const stored = this.storageManager.getFromLocalStorage('achievements');
            this.achievements = stored || this.getDefaultAchievements();
        } catch (error) {
            console.error('Error loading achievements:', error);
            this.achievements = this.getDefaultAchievements();
        }
    }

    /**
     * Get default achievements list
     */
    getDefaultAchievements() {
        return [
            { id: 'first_habit', name: 'Langkah Pertama', description: 'Selesaikan habit pertama Anda', xpReward: 50, unlocked: false },
            { id: 'week_warrior', name: 'Pejuang 7 Hari', description: 'Selesaikan 7 habit secara konsisten', xpReward: 100, unlocked: false },
            // Add other achievements...
        ];
    }

    /**
     * Add XP to user and check for level up.
     */
    async addXP(amount, reason = '') {
        if (!this.userProfile) return;

        const oldLevel = this.userProfile.stats.level;
        this.userProfile.stats.xp += amount;
        this.userProfile.stats.totalXP = (this.userProfile.stats.totalXP || 0) + amount;

        const newLevel = this.calculateLevel(this.userProfile.stats.xp);
        if (newLevel > oldLevel) {
            this.userProfile.stats.level = newLevel;
            this.handleLevelUp(oldLevel, newLevel);
        }

        this.storageManager.saveToLocalStorage('userProfile', this.userProfile);
        this.showXPGain(amount, reason);

        // Globally dispatch an event instead of directly calling UI update functions.
        // This decouples the manager from the UI implementation.
        document.dispatchEvent(new CustomEvent('xpUpdated'));
    }

    /**
     * Calculate level based on XP.
     * Level thresholds: Level 2 at 100 XP, Level 3 at 300, Level 4 at 600, etc.
     * XP for level L = 50 * (L-1)^2 + 50 * (L-1)
     */
    calculateLevel(xp) {
        let level = 1;
        while (xp >= this.getXPForLevel(level + 1)) {
            level++;
        }
        return level;
    }

    getXPForLevel(level) {
        if (level <= 1) return 0;
        return 50 * (level - 1) * (level - 2) + 100 * (level-2) + 100;
         // Simplified: return 100 * (level - 1);
    }

    calculateNextLevelXP(currentLevel) {
        return this.getXPForLevel(currentLevel + 1) - this.getXPForLevel(currentLevel);
    }


    /**
     * Handle level up logic and notifications.
     */
    handleLevelUp(oldLevel, newLevel) {
        this.showLevelUpNotification(oldLevel, newLevel);
        // Future: Check for level-based achievements
    }

    /**
     * UI function to show XP gain.
     */
    showXPGain(amount, reason) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-20 right-4 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in-right';
        notification.innerHTML = `+${amount} XP ${reason ? `- ${reason}` : ''}`;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('animate-fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

    /**
     * UI function to show level up.
     */
    showLevelUpNotification(oldLevel, newLevel) {
        const notification = document.createElement('div');
        notification.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        notification.innerHTML = `
            <div class="bg-white rounded-2xl p-8 text-center animate-fade-in-up">
                <div class="text-6xl mb-4">🎉</div>
                <h2 class="text-3xl font-bold text-gray-900 mb-2">LEVEL UP!</h2>
                <div class="text-5xl font-bold text-blue-600 mb-2">${newLevel}</div>
                <button onclick="this.closest('.fixed').remove()" class="bg-blue-500 text-white font-semibold py-3 px-8 rounded-lg mt-4">Lanjutkan!</button>
            </div>
        `;
        document.body.appendChild(notification);
    }

    // Other methods (achievements, etc.) would follow...
}
