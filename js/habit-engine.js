/**
 * Habit Engine - Habit tracking and streak calculation logic
 * Manages habit creation, completion tracking, and streaks
 */

class HabitEngine {
    constructor(storageManager, gamificationManager) {
        this.storage = storageManager;
        this.gamification = gamificationManager;
        this.habits = [];
        this.habitLogs = [];
        this.streaks = new Map();
        this.currentDate = new Date().toISOString().split('T')[0];
        this.currentMonth = new Date();
        this.init();
    }

    /**
     * Initialize habit engine
     */
    async init() {
        try {
            await this.loadData();
            this.setupEventListeners();
            this.updateUI();
            
            // Check if onboarding is complete
            if (!this.storage.getFromLocalStorage('onboardingComplete')) {
                window.location.href = 'onboarding.html';
                return;
            }
        } catch (error) {
            console.error('Error initializing habit engine:', error);
        }
    }

    /**
     * Load habit data from storage
     */
    async loadData() {
        try {
            this.habits = await this.storage.getAllFromDB('habitsDB', 'dailyHabits');
            this.habitLogs = await this.storage.getAllFromDB('habitsDB', 'habitLogs');
            
            // Load streaks
            const streakData = await this.storage.getAllFromDB('habitsDB', 'streaks');
            this.streaks = new Map(streakData.map(s => [s.habitId, s]));
            
        } catch (error) {
            console.error('Error loading habit data:', error);
            this.habits = [];
            this.habitLogs = [];
            this.streaks = new Map();
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add habit button
        document.getElementById('add-habit-btn')?.addEventListener('click', () => {
            this.showAddHabitModal();
        });

        // Close modal buttons
        document.getElementById('close-add-modal')?.addEventListener('click', () => {
            this.hideAddHabitModal();
        });

        document.getElementById('cancel-add')?.addEventListener('click', () => {
            this.hideAddHabitModal();
        });

        // Form submission
        document.getElementById('add-habit-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddHabit();
        });

        // Icon selection
        document.querySelectorAll('.icon-option')?.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectIcon(btn.dataset.icon);
            });
        });

        // Calendar navigation
        document.getElementById('prev-month')?.addEventListener('click', () => {
            this.navigateMonth(-1);
        });

        document.getElementById('next-month')?.addEventListener('click', () => {
            this.navigateMonth(1);
        });

        // Filters
        document.getElementById('filter-category')?.addEventListener('change', () => {
            this.filterHabits();
        });

        document.getElementById('filter-difficulty')?.addEventListener('change', () => {
            this.filterHabits();
        });

        // AI recommendation
        document.getElementById('refresh-ai-recommendations')?.addEventListener('click', () => {
            this.loadAIRecommendations();
        });

        document.getElementById('use-ai-recommendation')?.addEventListener('click', () => {
            this.useAIRecommendation();
        });
    }

    /**
     * Show add habit modal
     */
    showAddHabitModal() {
        const modal = document.getElementById('add-habit-modal');
        modal.classList.remove('hidden');
        
        // Load AI recommendations
        this.loadAIRecommendations();
    }

    /**
     * Hide add habit modal
     */
    hideAddHabitModal() {
        const modal = document.getElementById('add-habit-modal');
        modal.classList.add('hidden');
        
        // Reset form
        document.getElementById('add-habit-form').reset();
        this.selectIcon('💪');
    }

    /**
     * Select icon
     */
    selectIcon(icon) {
        document.querySelectorAll('.icon-option').forEach(btn => {
            btn.classList.remove('border-blue-500', 'bg-blue-50');
            btn.classList.add('border-gray-200');
        });
        
        const selectedBtn = document.querySelector(`[data-icon="${icon}"]`);
        if (selectedBtn) {
            selectedBtn.classList.remove('border-gray-200');
            selectedBtn.classList.add('border-blue-500', 'bg-blue-50');
        }
        
        document.getElementById('habit-icon').value = icon;
    }

    /**
     * Handle add habit form submission
     */
    async handleAddHabit() {
        const formData = {
            name: document.getElementById('habit-name').value.trim(),
            description: document.getElementById('habit-description').value.trim(),
            category: document.getElementById('habit-category').value,
            difficulty: document.getElementById('habit-difficulty').value,
            targetTime: document.getElementById('habit-time').value,
            icon: document.getElementById('habit-icon').value,
            xpValue: this.getXPValue(document.getElementById('habit-difficulty').value),
            createdAt: new Date().toISOString()
        };

        try {
            // Save to database
            const habitId = await window.storageManager.saveToDB('habitsDB', 'dailyHabits', formData);
            
            // Add to local array
            const newHabit = { ...formData, id: habitId };
            this.habits.push(newHabit);
            
            // Initialize streak
            await this.initializeStreak(habitId);
            
            // Hide modal
            this.hideAddHabitModal();
            
            // Update UI
            await this.updateUI();
            
            // Show success message
            if (window.notificationManager) {
                window.notificationManager.showSuccessMessage('Habit berhasil ditambahkan!');
            }
            
            // Award XP for creating first habit
            if (this.habits.length === 1 && window.gamificationManager) {
                await window.gamificationManager.addXP(25, 'Membuat habit pertama');
            }
            
        } catch (error) {
            console.error('Error adding habit:', error);
            if (window.notificationManager) {
                window.notificationManager.showErrorMessage('Gagal menambahkan habit');
            }
        }
    }

    /**
     * Get XP value based on difficulty
     */
    getXPValue(difficulty) {
        const xpMap = {
            'easy': 10,
            'medium': 25,
            'hard': 50
        };
        return xpMap[difficulty] || 10;
    }

    /**
     * Initialize streak for new habit
     */
    async initializeStreak(habitId) {
        const streakData = {
            habitId: habitId,
            currentStreak: 0,
            bestStreak: 0,
            lastCompleted: null,
            totalCompletions: 0
        };
        
        await window.storageManager.saveToDB('habitsDB', 'streaks', streakData);
        this.streaks.set(habitId, streakData);
    }

    /**
     * Toggle habit completion
     */
    async toggleHabit(habitId, completed) {
        const today = new Date().toISOString().split('T')[0];
        const timestamp = new Date().toISOString();
        
        try {
            // Save habit log
            const logData = {
                habitId: habitId,
                date: today,
                status: completed ? 'completed' : 'pending',
                timestamp: timestamp
            };
            
            await this.storage.saveToDB('habitsDB', 'habitLogs', logData);
            
            // Update local array
            const existingLogIndex = this.habitLogs.findIndex(
                log => log.habitId === habitId && log.date === today
            );
            
            if (existingLogIndex >= 0) {
                this.habitLogs[existingLogIndex] = logData;
            } else {
                this.habitLogs.push(logData);
            }
            
            // Update streak
            await this.updateStreak(habitId, completed);
            
            // Award XP if completed
            if (completed) {
                const habit = this.habits.find(h => h.id === habitId);
                if (habit && this.gamification) {
                    await this.gamification.addXP(habit.xpValue || 10, `Menyelesaikan: ${habit.name}`);
                }
                
                // Check achievements
                await this.checkHabitAchievements();
            }
            
            // Update UI
            await this.updateUI();
            
        } catch (error) {
            console.error('Error toggling habit:', error);
        }
    }

    /**
     * Update streak for habit
     */
    async updateStreak(habitId, completed) {
        let streak = this.streaks.get(habitId);
        if (!streak) {
            streak = {
                habitId: habitId,
                currentStreak: 0,
                bestStreak: 0,
                lastCompleted: null,
                totalCompletions: 0
            };
        }
        
        if (completed) {
            streak.totalCompletions++;
            
            // Check if it's consecutive
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            const yesterdayLog = this.habitLogs.find(
                log => log.habitId === habitId && log.date === yesterdayStr && log.status === 'completed'
            );
            
            if (yesterdayLog || streak.currentStreak === 0) {
                streak.currentStreak++;
            } else {
                streak.currentStreak = 1; // Reset streak
            }
            
            // Update best streak
            if (streak.currentStreak > streak.bestStreak) {
                streak.bestStreak = streak.currentStreak;
            }
            
            streak.lastCompleted = new Date().toISOString();
        } else {
            // If un-completing, check if it was part of current streak
            if (streak.lastCompleted && new Date(streak.lastCompleted).toDateString() === new Date().toDateString()) {
                streak.currentStreak = Math.max(0, streak.currentStreak - 1);
            }
        }
        
        // Save streak
        await this.storage.saveToDB('habitsDB', 'streaks', streak);
        this.streaks.set(habitId, streak);
    }

    /**
     * Check habit achievements
     */
    async checkHabitAchievements() {
        if (!this.gamification) return;
        
        const today = new Date().toISOString().split('T')[0];
        const todayLogs = this.habitLogs.filter(log => log.date === today && log.status === 'completed');
        
        // First habit completion today
        if (todayLogs.length === 1) {
            await this.gamification.unlockAchievement('first_habit');
        }
        
        // Week warrior (7 habits in a week)
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const weekLogs = this.habitLogs.filter(log => {
            const logDate = new Date(log.date);
            return logDate >= lastWeek && log.status === 'completed';
        });
        
        if (weekLogs.length >= 7) {
            await this.gamification.unlockAchievement('week_warrior');
        }
        
        // Check individual streak achievements
        for (const [habitId, streak] of this.streaks) {
            if (streak.currentStreak >= 7) {
                await this.gamification.unlockAchievement('week_warrior');
            }
            if (streak.currentStreak >= 30) {
                await this.gamification.unlockAchievement('month_master');
            }
            if (streak.bestStreak >= 100) {
                await this.gamification.unlockAchievement('consistency_king');
            }
        }
    }

    /**
     * Filter habits
     */
    filterHabits() {
        const categoryFilter = document.getElementById('filter-category')?.value || '';
        const difficultyFilter = document.getElementById('filter-difficulty')?.value || '';
        
        let filteredHabits = this.habits;
        
        if (categoryFilter) {
            filteredHabits = filteredHabits.filter(h => h.category === categoryFilter);
        }
        
        if (difficultyFilter) {
            filteredHabits = filteredHabits.filter(h => h.difficulty === difficultyFilter);
        }
        
        this.renderHabitsList(filteredHabits);
    }

    /**
     * Update UI
     */
    async updateUI() {
        this.renderStats();
        this.renderCalendar();
        this.renderHabitsList(this.habits);
        this.updateAIQuota();
    }

    /**
     * Render stats
     */
    renderStats() {
        const totalHabits = this.habits.length;
        const today = new Date().toISOString().split('T')[0];
        const todayLogs = this.habitLogs.filter(log => log.date === today);
        const completedToday = todayLogs.filter(log => log.status === 'completed').length;
        
        // Calculate best streak
        let bestStreak = 0;
        for (const streak of this.streaks.values()) {
            if (streak.bestStreak > bestStreak) {
                bestStreak = streak.bestStreak;
            }
        }
        
        // Calculate completion rate
        const totalPossibleDays = this.habits.length * 30; // Approximate
        const totalCompletions = Array.from(this.streaks.values()).reduce((sum, s) => sum + s.totalCompletions, 0);
        const completionRate = totalPossibleDays > 0 ? Math.round((totalCompletions / totalPossibleDays) * 100) : 0;
        
        // Update UI
        document.getElementById('total-habits').textContent = totalHabits;
        document.getElementById('best-streak').textContent = `${bestStreak} hari`;
        document.getElementById('today-progress').textContent = `${completedToday}/${totalHabits}`;
        document.getElementById('completion-rate').textContent = `${completionRate}%`;
    }

    /**
     * Render calendar
     */
    renderCalendar() {
        const calendar = document.getElementById('habit-calendar');
        const monthDisplay = document.getElementById('current-month');
        
        if (!calendar || !monthDisplay) return;
        
        // Update month display
        const monthNames = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        monthDisplay.textContent = `${monthNames[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear()}`;
        
        // Clear calendar
        calendar.innerHTML = '';
        
        // Get first day of month and number of days
        const firstDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
        const lastDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        // Generate calendar days
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dateStr = date.toISOString().split('T')[0];
            const isCurrentMonth = date.getMonth() === this.currentMonth.getMonth();
            const isToday = dateStr === this.currentDate;
            
            // Calculate completion for this date
            const dayLogs = this.habitLogs.filter(log => log.date === dateStr);
            const completed = dayLogs.filter(log => log.status === 'completed').length;
            const total = this.habits.length;
            const completionRate = total > 0 ? completed / total : 0;
            
            let bgClass = 'bg-gray-100';
            if (completionRate === 1) bgClass = 'bg-emerald-100';
            else if (completionRate > 0) bgClass = 'bg-amber-100';
            else if (isToday) bgClass = 'bg-blue-100';
            
            let textClass = 'text-gray-600';
            if (!isCurrentMonth) textClass = 'text-gray-400';
            else if (isToday) textClass = 'text-blue-600 font-semibold';
            else if (completionRate === 1) textClass = 'text-emerald-600';
            else if (completionRate > 0) textClass = 'text-amber-600';
            
            const dayElement = document.createElement('div');
            dayElement.className = `${bgClass} ${textClass} aspect-square flex items-center justify-center text-sm cursor-pointer hover:bg-opacity-80 transition-colors`;
            dayElement.textContent = date.getDate();
            dayElement.title = `${dateStr}: ${completed}/${total} habits completed`;
            
            calendar.appendChild(dayElement);
        }
    }

    /**
     * Render habits list
     */
    renderHabitsList(habits) {
        const container = document.getElementById('habits-list');
        if (!container) return;
        
        if (habits.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    <p class="text-lg mb-2">Tidak ada habits yang sesuai filter</p>
                    <button onclick="document.getElementById('filter-category').value=''; document.getElementById('filter-difficulty').value=''; window.habitEngine.filterHabits();" class="text-secondary text-sm">
                        Hapus Filter
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        habits.forEach(habit => {
            const todayLog = this.habitLogs.find(
                log => log.habitId === habit.id && log.date === this.currentDate
            );
            const isCompleted = todayLog?.status === 'completed';
            const streak = this.streaks.get(habit.id) || { currentStreak: 0, bestStreak: 0 };
            
            const habitElement = document.createElement('div');
            habitElement.className = `habit-card ${isCompleted ? 'completed' : ''} p-4 rounded-lg border-2 transition-all`;
            habitElement.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center flex-1">
                        <div class="text-3xl mr-4">${habit.icon}</div>
                        <div class="flex-1">
                            <h4 class="font-semibold text-gray-900 mb-1">${habit.name}</h4>
                            <p class="text-sm text-gray-600 mb-2">${habit.description || 'Tidak ada deskripsi'}</p>
                            <div class="flex items-center space-x-3 text-xs text-gray-500">
                                <span class="px-2 py-1 bg-gray-100 rounded-full">${this.getCategoryLabel(habit.category)}</span>
                                <span class="px-2 py-1 bg-gray-100 rounded-full">${this.getDifficultyLabel(habit.difficulty)}</span>
                                <span class="px-2 py-1 bg-gray-100 rounded-full">${habit.xpValue} XP</span>
                                <span class="px-2 py-1 bg-gray-100 rounded-full">🔥 ${streak.currentStreak} hari</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-3">
                        <div class="text-right">
                            <div class="text-sm text-gray-500">Hari ini</div>
                            <button class="habit-toggle w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                                isCompleted 
                                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                                    : 'border-gray-300 hover:border-emerald-400'
                            }" data-habit-id="${habit.id}">
                                ${isCompleted ? '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>' : ''}
                            </button>
                        </div>
                        <button class="text-gray-400 hover:text-red-500 p-2" onclick="window.habitEngine.deleteHabit('${habit.id}')" title="Hapus habit">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            
            // Add toggle functionality
            const toggleBtn = habitElement.querySelector('.habit-toggle');
            toggleBtn.addEventListener('click', () => {
                this.toggleHabit(habit.id, !isCompleted);
            });
            
            container.appendChild(habitElement);
        });
    }

    /**
     * Get category label
     */
    getCategoryLabel(category) {
        const labels = {
            'physical': '💪 Fisik',
            'mental': '🧠 Mental',
            'financial': '💰 Finansial',
            'social': '👥 Sosial',
            'spiritual': '🕌 Spiritual'
        };
        return labels[category] || category;
    }

    /**
     * Get difficulty label
     */
    getDifficultyLabel(difficulty) {
        const labels = {
            'easy': '🟢 Mudah',
            'medium': '🟡 Sedang',
            'hard': '🔴 Sulit'
        };
        return labels[difficulty] || difficulty;
    }

    /**
     * Navigate calendar month
     */
    navigateMonth(direction) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + direction);
        this.renderCalendar();
    }

    /**
     * Delete habit
     */
    async deleteHabit(habitId) {
        if (!confirm('Apakah Anda yakin ingin menghapus habit ini?')) {
            return;
        }
        
        try {
            // Delete from database
            await window.storageManager.deleteFromDB('habitsDB', 'dailyHabits', habitId);
            await window.storageManager.deleteFromDB('habitsDB', 'streaks', habitId);
            
            // Delete related logs
            const logsToDelete = this.habitLogs.filter(log => log.habitId === habitId);
            for (const log of logsToDelete) {
                await window.storageManager.deleteFromDB('habitsDB', 'habitLogs', log.id);
            }
            
            // Update local arrays
            this.habits = this.habits.filter(h => h.id !== habitId);
            this.habitLogs = this.habitLogs.filter(log => log.habitId !== habitId);
            this.streaks.delete(habitId);
            
            // Update UI
            await this.updateUI();
            
            if (window.notificationManager) {
                window.notificationManager.showSuccessMessage('Habit berhasil dihapus');
            }
            
        } catch (error) {
            console.error('Error deleting habit:', error);
            if (window.notificationManager) {
                window.notificationManager.showErrorMessage('Gagal menghapus habit');
            }
        }
    }

    /**
     * Load AI recommendations
     */
    async loadAIRecommendations() {
        if (!window.aiIntegration) return;
        
        const modal = document.getElementById('ai-recommendation-modal');
        const container = document.getElementById('ai-recommendations');
        
        // Show loading
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p class="text-gray-600">Memuat rekomendasi AI...</p>
            </div>
        `;
        
        // Show modal
        modal.classList.remove('hidden');
        
        try {
            const recommendation = await window.aiIntegration.generateHabitSuggestion('umum');
            
            // Parse recommendation into structured format
            const habits = this.parseAIRecommendation(recommendation);
            
            container.innerHTML = '';
            habits.forEach((habit, index) => {
                const habitElement = document.createElement('div');
                habitElement.className = 'border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-300 transition-colors';
                habitElement.innerHTML = `
                    <div class="flex items-start">
                        <div class="text-2xl mr-3">${habit.icon}</div>
                        <div class="flex-1">
                            <h4 class="font-semibold text-gray-900 mb-1">${habit.name}</h4>
                            <p class="text-sm text-gray-600 mb-2">${habit.description}</p>
                            <div class="text-xs text-gray-500">${habit.roadmap}</div>
                        </div>
                        <input type="radio" name="ai-habit" value="${index}" class="mt-1">
                    </div>
                `;
                
                habitElement.addEventListener('click', () => {
                    const radio = habitElement.querySelector('input[type="radio"]');
                    radio.checked = true;
                });
                
                container.appendChild(habitElement);
            });
            
        } catch (error) {
            console.error('Error loading AI recommendations:', error);
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>Gagal memuat rekomendasi AI</p>
                    <button onclick="window.habitEngine.loadAIRecommendations()" class="text-secondary text-sm mt-2">Coba Lagi</button>
                </div>
            `;
        }
    }

    /**
     * Parse AI recommendation into structured format
     */
    parseAIRecommendation(recommendation) {
        // This is a simplified parser - in real implementation, you'd want more sophisticated parsing
        const lines = recommendation.split('\n').filter(line => line.trim());
        const habits = [];
        
        let currentHabit = null;
        for (const line of lines) {
            if (line.match(/^\d+\.\s*\*\*/)) {
                if (currentHabit) habits.push(currentHabit);
                currentHabit = {
                    name: line.replace(/^\d+\.\s*\*\*([^*]+)\*\*.*/, '$1').trim(),
                    description: '',
                    roadmap: '',
                    icon: '🎯'
                };
            } else if (currentHabit && line.includes('Alasan:')) {
                currentHabit.description = line.replace(/.*Alasan:\s*/, '').trim();
            } else if (currentHabit && line.includes('Roadmap:')) {
                currentHabit.roadmap = line.replace(/.*Roadmap:\s*/, '').trim();
            }
        }
        
        if (currentHabit) habits.push(currentHabit);
        
        // Fallback if parsing fails
        if (habits.length === 0) {
            return [];
        }
        
        return habits;
    }

    /**
     * Use AI recommendation
     */
    useAIRecommendation() {
        const selectedRadio = document.querySelector('input[name="ai-habit"]:checked');
        if (!selectedRadio) {
            if (window.notificationManager) {
                window.notificationManager.showErrorMessage('Pilih salah satu rekomendasi');
            }
            return;
        }
        
        // This would populate the add habit form with the selected recommendation
        // Implementation depends on the structure of the recommendation data
        
        // Close AI modal
        document.getElementById('ai-recommendation-modal').classList.add('hidden');
        
        // Focus on add habit form
        document.getElementById('habit-name').focus();
    }

    /**
     * Update AI quota display
     */
    updateAIQuota() {
        if (window.aiIntegration) {
            window.aiIntegration.updateUI();
        }
    }
}

// Export class for use in main.js
window.habitEngine = HabitEngine;