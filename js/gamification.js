/**
 * Gamification System - XP, Levels, and Achievements
 * Manages user progression and rewards
 */

class GamificationManager {
    constructor() {
        this.userProfile = null;
        this.achievements = [];
    }

    /**
     * Initialize gamification system
     */
    async init() {
        this.userProfile = window.storageManager.getFromLocalStorage('userProfile');
        
        // Ensure user profile has proper structure with 0 values
        if (!this.userProfile) {
            this.userProfile = {
                stats: {
                    level: 1,
                    xp: 0,
                    totalXP: 0,
                    joinDate: new Date().toISOString()
                },
                achievements: []
            };
        } else {
            // Ensure stats structure exists
            this.userProfile.stats = this.userProfile.stats || {};
            this.userProfile.stats.level = this.userProfile.stats.level || 1;
            this.userProfile.stats.xp = this.userProfile.stats.xp || 0;
            this.userProfile.stats.totalXP = this.userProfile.stats.totalXP || 0;
            this.userProfile.stats.joinDate = this.userProfile.stats.joinDate || new Date().toISOString();
        }
        
        await this.loadAchievements();
        await this.checkAchievements();
    }

    /**
     * Load achievements from storage
     */
    async loadAchievements() {
        try {
            const stored = window.storageManager.getFromLocalStorage('achievements');
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
            {
                id: 'first_habit',
                name: 'Langkah Pertama',
                description: 'Selesaikan habit pertama Anda',
                icon: '🎯',
                xpReward: 50,
                unlocked: false,
                category: 'habits'
            },
            {
                id: 'week_warrior',
                name: 'Pejuang 7 Hari',
                description: 'Selesaikan 7 habit secara konsisten',
                icon: '🏆',
                xpReward: 100,
                unlocked: false,
                category: 'habits'
            },
            {
                id: 'month_master',
                name: 'Master Bulanan',
                description: 'Selesaikan 30 habit dalam sebulan',
                icon: '👑',
                xpReward: 250,
                unlocked: false,
                category: 'habits'
            },
            {
                id: 'level_5',
                name: 'Pemula Berhasil',
                description: 'Capai level 5',
                icon: '📈',
                xpReward: 150,
                unlocked: false,
                category: 'level'
            },
            {
                id: 'level_15',
                name: 'Pejuang Sejati',
                description: 'Capai level 15',
                icon: '💪',
                xpReward: 300,
                unlocked: false,
                category: 'level'
            },
            {
                id: 'first_income',
                name: 'Pemasukan Pertama',
                description: 'Catat pemasukan pertama di finance tracker',
                icon: '💰',
                xpReward: 75,
                unlocked: false,
                category: 'finance'
            },
            {
                id: 'budget_master',
                name: 'Master Budget',
                description: 'Tetapkan budget untuk 5 kategori',
                icon: '📊',
                xpReward: 125,
                unlocked: false,
                category: 'finance'
            },
            {
                id: 'skill_learner',
                name: 'Pembelajar Aktif',
                description: 'Selesaikan skill pertama di learning path',
                icon: '📚',
                xpReward: 100,
                unlocked: false,
                category: 'learning'
            },
            {
                id: 'mood_tracker',
                name: 'Pencatat Suasana',
                description: 'Catat mood selama 7 hari berturut-turut',
                icon: '😊',
                xpReward: 80,
                unlocked: false,
                category: 'mental'
            },
            {
                id: 'clean_week',
                name: 'Minggu Bersih',
                description: '7 hari tanpa trigger negatif',
                icon: '🌟',
                xpReward: 200,
                unlocked: false,
                category: 'special'
            },
            {
                id: 'early_bird',
                name: 'Burung Pagi',
                description: 'Bangun sebelum jam 6 pagi selama 5 hari',
                icon: '🐦',
                xpReward: 120,
                unlocked: false,
                category: 'habits'
            },
            {
                id: 'financial_freedom',
                name: 'Menuju Freedom',
                description: 'Capai savings rate 30%',
                icon: '🏦',
                xpReward: 400,
                unlocked: false,
                category: 'finance'
            },
            {
                id: 'knowledge_seeker',
                name: 'Pencari Ilmu',
                description: 'Selesaikan 10 skill di learning path',
                icon: '🎓',
                xpReward: 350,
                unlocked: false,
                category: 'learning'
            },
            {
                id: 'mental_warrior',
                name: 'Prajurit Mental',
                description: 'Pertahankan mental health di atas 80% selama 14 hari',
                icon: '🧘',
                xpReward: 250,
                unlocked: false,
                category: 'mental'
            },
            {
                id: 'consistency_king',
                name: 'Raja Konsistensi',
                description: '100 hari streak habit',
                icon: '🔥',
                xpReward: 1000,
                unlocked: false,
                category: 'special'
            }
        ];
    }

    /**
     * Add XP to user and check for level up
     */
    async addXP(amount, reason = '') {
        if (!this.userProfile) return;

        const oldLevel = this.calculateLevel(this.userProfile.stats.xp);
        this.userProfile.stats.xp += amount;
        this.userProfile.stats.totalXP = (this.userProfile.stats.totalXP || 0) + amount;
        const newLevel = this.calculateLevel(this.userProfile.stats.xp);

        // Save updated profile
        window.storageManager.setToLocalStorage('userProfile', this.userProfile);

        // Check for level up
        if (newLevel > oldLevel) {
            this.userProfile.stats.level = newLevel;
            await this.handleLevelUp(oldLevel, newLevel);
            // Save again after level update
            window.storageManager.setToLocalStorage('userProfile', this.userProfile);
        }

        // Show XP notification
        this.showXPGain(amount, reason);

        // Update dashboard if on main page
        if (typeof window.mainApp !== 'undefined' && window.mainApp.updateUserStats) {
            window.mainApp.updateUserStats();
        }

        return { oldLevel, newLevel, xp: this.userProfile.stats.xp };
    }

    /**
     * Calculate level from XP
     */
    calculateLevel(xp) {
        return Math.floor(Math.sqrt(xp / 100)) + 1;
    }

    /**
     * Handle level up
     */
    async handleLevelUp(oldLevel, newLevel) {
        // Show level up notification
        this.showLevelUpNotification(oldLevel, newLevel);

        // Check for level achievements
        if (newLevel >= 5) await this.unlockAchievement('level_5');
        if (newLevel >= 15) await this.unlockAchievement('level_15');

        // Save updated profile
        window.storageManager.saveToLocalStorage('userProfile', this.userProfile);
    }

    /**
     * Show XP gain notification
     */
    showXPGain(amount, reason) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-20 right-4 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
        notification.innerHTML = `
            <div class="flex items-center">
                <span class="text-2xl mr-2">✨</span>
                <div>
                    <div class="font-semibold">+${amount} XP</div>
                    ${reason ? `<div class="text-sm opacity-90">${reason}</div>` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        // Animate out and remove
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    /**
     * Show level up notification
     */
    showLevelUpNotification(oldLevel, newLevel) {
        const notification = document.createElement('div');
        notification.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        notification.innerHTML = `
            <div class="bg-white rounded-2xl max-w-md w-full p-8 text-center transform scale-95 animate-pulse">
                <div class="text-6xl mb-4">🎉</div>
                <h2 class="text-3xl font-poppins font-bold text-gray-900 mb-2">LEVEL UP!</h2>
                <div class="text-5xl font-bold text-blue-600 mb-2">${newLevel}</div>
                <p class="text-gray-600 mb-6">Selamat! Anda naik dari level ${oldLevel} ke level ${newLevel}</p>
                <button onclick="this.closest('.fixed').remove()" class="bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors">
                    Lanjutkan!
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 5000);
    }

    /**
     * Unlock achievement
     */
    async unlockAchievement(achievementId) {
        const achievement = this.achievements.find(a => a.id === achievementId);
        if (!achievement || achievement.unlocked) return;

        achievement.unlocked = true;
        achievement.unlockedAt = new Date().toISOString();

        // Award XP
        await this.addXP(achievement.xpReward, `Achievement unlocked: ${achievement.name}`);

        // Save achievements
        window.storageManager.saveToLocalStorage('achievements', this.achievements);

        // Show achievement notification
        this.showAchievementNotification(achievement);

        return achievement;
    }

    /**
     * Show achievement notification
     */
    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-lg shadow-xl z-50 animate-bounce';
        notification.innerHTML = `
            <div class="flex items-center">
                <span class="text-3xl mr-4">${achievement.icon}</span>
                <div>
                    <div class="font-bold text-lg">Achievement Unlocked!</div>
                    <div class="font-semibold">${achievement.name}</div>
                    <div class="text-sm opacity-90">+${achievement.xpReward} XP</div>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 500);
        }, 4000);
    }

    /**
     * Check for new achievements
     */
    async checkAchievements() {
        if (!this.userProfile) return;

        const stats = this.userProfile.stats;

        // Level achievements
        if (stats.level >= 5) await this.unlockAchievement('level_5');
        if (stats.level >= 15) await this.unlockAchievement('level_15');

        // Check habit achievements
        await this.checkHabitAchievements();

        // Check finance achievements
        await this.checkFinanceAchievements();

        // Check learning achievements
        await this.checkLearningAchievements();

        // Check mental health achievements
        await this.checkMentalAchievements();

        // Check special achievements
        await this.checkSpecialAchievements();
    }

    /**
     * Check habit-related achievements
     */
    async checkHabitAchievements() {
        try {
            const habits = await window.storageManager.getAllFromDB('habitsDB', 'dailyHabits');
            const logs = await window.storageManager.getAllFromDB('habitsDB', 'habitLogs');

            // First habit
            if (logs.length > 0) await this.unlockAchievement('first_habit');

            // Week warrior (7 habits in a week)
            const lastWeekLogs = this.getLogsInLastDays(logs, 7);
            const completedThisWeek = lastWeekLogs.filter(log => log.status === 'completed').length;
            if (completedThisWeek >= 7) await this.unlockAchievement('week_warrior');

            // Month master (30 habits in a month)
            const lastMonthLogs = this.getLogsInLastDays(logs, 30);
            const completedThisMonth = lastMonthLogs.filter(log => log.status === 'completed').length;
            if (completedThisMonth >= 30) await this.unlockAchievement('month_master');

            // Early bird (wake up before 6 AM for 5 days)
            const earlyLogs = logs.filter(log => {
                if (log.status !== 'completed') return false;
                const logDate = new Date(log.timestamp);
                return logDate.getHours() < 6;
            });
            const uniqueEarlyDays = [...new Set(earlyLogs.map(log => log.date))].length;
            if (uniqueEarlyDays >= 5) await this.unlockAchievement('early_bird');

        } catch (error) {
            console.error('Error checking habit achievements:', error);
        }
    }

    /**
     * Check finance achievements
     */
    async checkFinanceAchievements() {
        try {
            const transactions = await window.storageManager.getAllFromDB('financeDB', 'transactions');
            const budgets = await window.storageManager.getAllFromDB('financeDB', 'budgets');

            // First income
            const hasIncome = transactions.some(t => t.type === 'income');
            if (hasIncome) await this.unlockAchievement('first_income');

            // Budget master (5 budgets)
            if (budgets.length >= 5) await this.unlockAchievement('budget_master');

            // Financial freedom (30% savings rate)
            const currentMonth = new Date().toISOString().slice(0, 7);
            const thisMonthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
            const totalIncome = thisMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const totalExpense = thisMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

            if (savingsRate >= 30) await this.unlockAchievement('financial_freedom');

        } catch (error) {
            console.error('Error checking finance achievements:', error);
        }
    }

    /**
     * Check learning achievements
     */
    async checkLearningAchievements() {
        try {
            const skills = await window.storageManager.getAllFromDB('learningDB', 'skills');
            const completedSkills = skills.filter(s => s.status === 'completed');

            // Skill learner (first skill)
            if (completedSkills.length > 0) await this.unlockAchievement('skill_learner');

            // Knowledge seeker (10 skills)
            if (completedSkills.length >= 10) await this.unlockAchievement('knowledge_seeker');

        } catch (error) {
            console.error('Error checking learning achievements:', error);
        }
    }

    /**
     * Check mental health achievements
     */
    async checkMentalAchievements() {
        try {
            const moodLogs = await window.storageManager.getAllFromDB('mentalDB', 'moodLogs');

            // Mood tracker (7 consecutive days)
            const last7Days = this.getLastNDates(7);
            const hasConsecutiveMood = last7Days.every(date => 
                moodLogs.some(log => log.date === date)
            );
            if (hasConsecutiveMood) await this.unlockAchievement('mood_tracker');

            // Mental warrior (80% mental health for 14 days)
            const last14Days = this.getLastNDates(14);
            const recentMoodLogs = moodLogs.filter(log => last14Days.includes(log.date));
            const highMoodDays = recentMoodLogs.filter(log => log.mood >= 8).length;
            if (highMoodDays >= 14) await this.unlockAchievement('mental_warrior');

        } catch (error) {
            console.error('Error checking mental achievements:', error);
        }
    }

    /**
     * Check special achievements
     */
    async checkSpecialAchievements() {
        try {
            // Clean week (7 days without porn reports)
            const reports = await window.storageManager.getAllFromDB('systemDB', 'pornReports');
            const last7Days = this.getLastNDates(7);
            const hasReportsInLast7Days = reports.some(report => {
                const reportDate = new Date(report.timestamp).toISOString().split('T')[0];
                return last7Days.includes(reportDate);
            });

            if (!hasReportsInLast7Days && reports.length > 0) {
                await this.unlockAchievement('clean_week');
            }

            // Consistency king (100 day streak)
            const streaks = await window.storageManager.getAllFromDB('habitsDB', 'streaks');
            const maxStreak = streaks.reduce((max, streak) => 
                Math.max(max, streak.bestStreak || 0), 0);
            if (maxStreak >= 100) await this.unlockAchievement('consistency_king');

        } catch (error) {
            console.error('Error checking special achievements:', error);
        }
    }

    /**
     * Get logs from last N days
     */
    getLogsInLastDays(logs, days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        return logs.filter(log => {
            const logDate = new Date(log.date || log.timestamp);
            return logDate >= cutoffDate;
        });
    }

    /**
     * Get last N dates as strings
     */
    getLastNDates(days) {
        const dates = [];
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
    }

    /**
     * Get unlocked achievements
     */
    getUnlockedAchievements() {
        return this.achievements.filter(a => a.unlocked);
    }

    /**
     * Get achievement by category
     */
    getAchievementsByCategory(category) {
        return this.achievements.filter(a => a.category === category);
    }

    /**
     * Get total XP from achievements
     */
    getTotalAchievementXP() {
        return this.achievements
            .filter(a => a.unlocked)
            .reduce((total, a) => total + a.xpReward, 0);
    }
}

// Global instance will be created in main.js