/**
 * Pria 1% Journey - Mental Health Tracker
 * Tracking mood, meditation, dan mental health metrics
 */

class MentalTracker {
    constructor(storageManager, gamification, aiIntegration) {
        this.storage = storageManager;
        this.gamification = gamification;
        this.ai = aiIntegration;
        this.userProfile = null;
        this.mentalData = null;
        
        // Mood scale dan emotions
        this.moodScale = [
            { value: 1, label: 'Sangat Buruk', emoji: '😢', color: 'bg-red-500' },
            { value: 2, label: 'Buruk', emoji: '😔', color: 'bg-orange-500' },
            { value: 3, label: 'Netral', emoji: '😐', color: 'bg-yellow-500' },
            { value: 4, label: 'Baik', emoji: '😊', color: 'bg-green-500' },
            { value: 5, label: 'Sangat Baik', emoji: '😄', color: 'bg-blue-500' }
        ];
        
        // Emotions list
        this.emotions = [
            'Bahagia', 'Sedih', 'Marah', 'Cemas', 'Tenang', 'Enerjik', 'Lelah', 
            'Termotivasi', 'Frustrasi', 'Bersyukur', 'Stres', 'Percaya Diri',
            'Kecewa', 'Optimis', 'Takut', 'Bangga', ' Kesepian', 'Bersemangat'
        ];
        
        // Meditation presets
        this.meditationPresets = [
            { id: 'breathing-5', name: 'Breathing 5 Menit', duration: 5, type: 'breathing', xp: 25 },
            { id: 'breathing-10', name: 'Breathing 10 Menit', duration: 10, type: 'breathing', xp: 40 },
            { id: 'mindfulness-10', name: 'Mindfulness 10 Menit', duration: 10, type: 'mindfulness', xp: 45 },
            { id: 'mindfulness-20', name: 'Mindfulness 20 Menit', duration: 20, type: 'mindfulness', xp: 75 },
            { id: 'gratitude-5', name: 'Gratitude 5 Menit', duration: 5, type: 'gratitude', xp: 30 },
            { id: 'body-scan-15', name: 'Body Scan 15 Menit', duration: 15, type: 'body-scan', xp: 60 }
        ];
        
        this.init();
    }
    
    async init() {
        try {
            // Load user profile dan mental data
            this.userProfile = await this.storage.getItem('system', 'userProfile');
            this.mentalData = await this.storage.getItem('mental', 'mentalData') || {
                moodHistory: [],
                meditationLog: [],
                streaks: { meditation: 0, moodTracking: 0 },
                insights: [],
                lastMoodUpdate: null,
                lastMeditation: null,
                weeklyStats: {},
                monthlyStats: {}
            };
            
            // Initialize UI jika di mental health page
            if (window.location.pathname.includes('mental.html')) {
                this.initializeUI();
                this.renderMoodHistory();
                this.renderMeditationLog();
                this.updateStats();
                this.checkStreaks();
            }
            
        } catch (error) {
            console.error('Error initializing mental tracker:', error);
        }
    }
    
    initializeUI() {
        // Setup mood tracking
        this.setupMoodTracking();
        
        // Setup meditation timer
        this.setupMeditationTimer();
        
        // Setup event listeners
        const quickMoodBtn = document.getElementById('quick-mood-check');
        if (quickMoodBtn) {
            quickMoodBtn.addEventListener('click', () => this.showQuickMoodModal());
        }
        
        const startMeditationBtn = document.getElementById('start-meditation');
        if (startMeditationBtn) {
            startMeditationBtn.addEventListener('click', () => this.showMeditationModal());
        }
        
        const aiInsightsBtn = document.getElementById('ai-insights');
        if (aiInsightsBtn) {
            aiInsightsBtn.addEventListener('click', () => this.generateAIInsights());
        }
    }
    
    setupMoodTracking() {
        const moodContainer = document.getElementById('mood-selector');
        if (!moodContainer) return;
        
        moodContainer.innerHTML = '';
        
        this.moodScale.forEach(mood => {
            const moodButton = document.createElement('button');
            moodButton.className = `mood-option flex flex-col items-center p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-all duration-200 transform hover:scale-105`;
            moodButton.innerHTML = `
                <div class="text-4xl mb-2">${mood.emoji}</div>
                <span class="text-sm font-medium text-gray-700">${mood.value}</span>
                <span class="text-xs text-gray-500 mt-1">${mood.label}</span>
            `;
            
            moodButton.addEventListener('click', () => this.selectMood(mood.value));
            moodContainer.appendChild(moodButton);
        });
    }
    
    async selectMood(moodValue) {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();
        
        try {
            // Update mood history
            const existingEntry = this.mentalData.moodHistory.find(entry => 
                entry.date === today
            );
            
            if (existingEntry) {
                existingEntry.mood = moodValue;
                existingEntry.timestamp = now;
                existingEntry.emotions = this.getSelectedEmotions();
            } else {
                this.mentalData.moodHistory.push({
                    date: today,
                    mood: moodValue,
                    timestamp: now,
                    emotions: this.getSelectedEmotions(),
                    notes: ''
                });
            }
            
            this.mentalData.lastMoodUpdate = now;
            
            // Update streak
            this.updateMoodStreak();
            
            // Save data
            await this.storage.setItem('mental', 'mentalData', this.mentalData);
            
            // Add XP
            await this.gamification.addXP(10, 'Daily mood check-in');
            
            // Update UI
            this.updateMoodDisplay(moodValue);
            this.renderMoodHistory();
            this.updateStats();
            
            // Show success feedback
            this.showNotification('Mood berhasil dicatat! +10 XP', 'success');
            
        } catch (error) {
            console.error('Error recording mood:', error);
            this.showNotification('Gagal mencatat mood', 'error');
        }
    }
    
    getSelectedEmotions() {
        const selectedEmotions = [];
        document.querySelectorAll('.emotion-tag.selected').forEach(tag => {
            selectedEmotions.push(tag.dataset.emotion);
        });
        return selectedEmotions;
    }
    
    setupMeditationTimer() {
        // Setup meditation timer UI
        const timerContainer = document.getElementById('meditation-timer');
        if (!timerContainer) return;
        
        timerContainer.innerHTML = `
            <div class="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 text-center">
                <div class="mb-6">
                    <div id="timer-display" class="text-6xl font-bold text-gray-800 mb-2">05:00</div>
                    <div id="timer-status" class="text-gray-600">Siap untuk bermeditasi</div>
                </div>
                
                <div class="flex justify-center space-x-4 mb-6">
                    <button id="timer-start" class="bg-green-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-600 transition-colors">
                        ▶ Mulai
                    </button>
                    <button id="timer-pause" class="bg-yellow-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-yellow-600 transition-colors" disabled>
                        ⏸ Pause
                    </button>
                    <button id="timer-reset" class="bg-red-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-red-600 transition-colors">
                        ⏹ Reset
                    </button>
                </div>
                
                <div class="grid grid-cols-3 gap-3">
                    ${this.meditationPresets.map(preset => `
                        <button class="meditation-preset bg-white border-2 border-gray-200 rounded-xl p-3 hover:border-purple-300 transition-colors" data-preset="${preset.id}">
                            <div class="text-sm font-medium text-gray-800">${preset.name}</div>
                            <div class="text-xs text-gray-500">+${preset.xp} XP</div>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Setup timer controls
        this.setupTimerControls();
    }
    
    setupTimerControls() {
        let timerInterval = null;
        let currentTime = 300; // 5 menit default
        let isRunning = false;
        
        const display = document.getElementById('timer-display');
        const status = document.getElementById('timer-status');
        const startBtn = document.getElementById('timer-start');
        const pauseBtn = document.getElementById('timer-pause');
        const resetBtn = document.getElementById('timer-reset');
        
        const updateDisplay = () => {
            const minutes = Math.floor(currentTime / 60);
            const seconds = currentTime % 60;
            display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };
        
        startBtn.addEventListener('click', () => {
            if (!isRunning) {
                isRunning = true;
                startBtn.disabled = true;
                pauseBtn.disabled = false;
                status.textContent = 'Sedang bermeditasi...';
                
                timerInterval = setInterval(() => {
                    currentTime--;
                    updateDisplay();
                    
                    if (currentTime <= 0) {
                        this.completeMeditationSession();
                        clearInterval(timerInterval);
                        isRunning = false;
                        startBtn.disabled = false;
                        pauseBtn.disabled = true;
                        status.textContent = 'Meditasi selesai! 🎉';
                    }
                }, 1000);
            }
        });
        
        pauseBtn.addEventListener('click', () => {
            if (isRunning) {
                clearInterval(timerInterval);
                isRunning = false;
                startBtn.disabled = false;
                pauseBtn.disabled = true;
                status.textContent = 'Meditasi dijeda';
            }
        });
        
        resetBtn.addEventListener('click', () => {
            clearInterval(timerInterval);
            isRunning = false;
            currentTime = 300; // Reset ke 5 menit
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            status.textContent = 'Siap untuk bermeditasi';
            updateDisplay();
        });
        
        // Setup preset buttons
        document.querySelectorAll('.meditation-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const presetId = e.target.closest('.meditation-preset').dataset.preset;
                const preset = this.meditationPresets.find(p => p.id === presetId);
                if (preset) {
                    currentTime = preset.duration * 60;
                    updateDisplay();
                    status.textContent = `Preset: ${preset.name}`;
                    
                    // Highlight selected preset
                    document.querySelectorAll('.meditation-preset').forEach(b => b.classList.remove('border-purple-500'));
                    e.target.closest('.meditation-preset').classList.add('border-purple-500');
                }
            });
        });
        
        updateDisplay();
    }
    
    async completeMeditationSession() {
        try {
            // Get active preset
            const activePreset = document.querySelector('.meditation-preset.border-purple-500');
            let xpGained = 25; // Default XP
            let sessionType = 'general';
            let duration = 5;
            
            if (activePreset) {
                const presetId = activePreset.dataset.preset;
                const preset = this.meditationPresets.find(p => p.id === presetId);
                if (preset) {
                    xpGained = preset.xp;
                    sessionType = preset.type;
                    duration = preset.duration;
                }
            }
            
            // Log meditation session
            this.mentalData.meditationLog.push({
                date: new Date().toISOString().split('T')[0],
                timestamp: new Date().toISOString(),
                type: sessionType,
                duration: duration,
                xp: xpGained
            });
            
            this.mentalData.lastMeditation = new Date().toISOString();
            
            // Update meditation streak
            this.updateMeditationStreak();
            
            // Save data
            await this.storage.setItem('mental', 'mentalData', this.mentalData);
            
            // Add XP
            await this.gamification.addXP(xpGained, `Meditation session: ${sessionType}`);
            
            // Update UI
            this.renderMeditationLog();
            this.updateStats();
            
            // Show success feedback
            this.showNotification(`Meditasi selesai! +${xpGained} XP`, 'success');
            
        } catch (error) {
            console.error('Error completing meditation:', error);
            this.showNotification('Gagal mencatat meditasi', 'error');
        }
    }
    
    updateMoodStreak() {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const hasToday = this.mentalData.moodHistory.some(entry => entry.date === today);
        const hasYesterday = this.mentalData.moodHistory.some(entry => entry.date === yesterdayStr);
        
        if (hasToday) {
            if (hasYesterday) {
                this.mentalData.streaks.moodTracking++;
            } else {
                this.mentalData.streaks.moodTracking = 1;
            }
        }
    }
    
    updateMeditationStreak() {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const hasToday = this.mentalData.meditationLog.some(entry => entry.date === today);
        const hasYesterday = this.mentalData.meditationLog.some(entry => entry.date === yesterdayStr);
        
        if (hasToday) {
            if (hasYesterday) {
                this.mentalData.streaks.meditation++;
            } else {
                this.mentalData.streaks.meditation = 1;
            }
        }
    }
    
    checkStreaks() {
        // Check and display current streaks
        const moodStreakElement = document.getElementById('mood-streak');
        const meditationStreakElement = document.getElementById('meditation-streak');
        
        if (moodStreakElement) {
            moodStreakElement.textContent = `${this.mentalData.streaks.moodTracking} hari`;
        }
        
        if (meditationStreakElement) {
            meditationStreakElement.textContent = `${this.mentalData.streaks.meditation} hari`;
        }
    }
    
    renderMoodHistory() {
        const container = document.getElementById('mood-history-chart');
        if (!container) return;
        
        // Get last 7 days mood data
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' });
            
            const moodEntry = this.mentalData.moodHistory.find(entry => entry.date === dateStr);
            const mood = moodEntry ? moodEntry.mood : 0;
            
            last7Days.push({ day: dayName, mood, date: dateStr });
        }
        
        // Render mood chart
        container.innerHTML = `
            <div class="flex items-end justify-between h-40 space-x-3">
                ${last7Days.map(day => {
                    const moodData = this.moodScale.find(m => m.value === day.mood);
                    const height = day.mood > 0 ? (day.mood / 5) * 100 : 10;
                    
                    return `
                        <div class="flex-1 flex flex-col items-center">
                            <div class="w-full ${moodData ? moodData.color : 'bg-gray-200'} rounded-t-lg transition-all duration-300" 
                                 style="height: ${height}%; min-height: 8px;"></div>
                            <span class="text-xs text-gray-600 mt-2">${day.day}</span>
                            <span class="text-lg mt-1">${moodData ? moodData.emoji : '?'}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    renderMeditationLog() {
        const container = document.getElementById('meditation-log');
        if (!container) return;
        
        // Get recent meditation sessions
        const recentSessions = this.mentalData.meditationLog
            .slice(-5)
            .reverse();
        
        if (recentSessions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <div class="text-4xl mb-2">🧘‍♂️</div>
                    <p>Belum ada sesi meditasi</p>
                    <p class="text-sm">Mulai sesi meditasi pertama kamu!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="space-y-3">
                ${recentSessions.map(session => {
                    const date = new Date(session.timestamp);
                    const timeStr = date.toLocaleTimeString('id-ID', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
                    const dateStr = date.toLocaleDateString('id-ID', { 
                        day: 'numeric', 
                        month: 'short' 
                    });
                    
                    return `
                        <div class="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                            <div class="flex items-center space-x-3">
                                <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <span class="text-purple-600">🧘</span>
                                </div>
                                <div>
                                    <div class="font-medium text-gray-800">${this.getMeditationTypeLabel(session.type)}</div>
                                    <div class="text-sm text-gray-500">${session.duration} menit</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-sm font-medium text-gray-800">${timeStr}</div>
                                <div class="text-xs text-gray-500">${dateStr}</div>
                                <div class="text-xs text-purple-600">+${session.xp} XP</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    getMeditationTypeLabel(type) {
        const labels = {
            'breathing': 'Breathing Exercise',
            'mindfulness': 'Mindfulness',
            'gratitude': 'Gratitude Meditation',
            'body-scan': 'Body Scan'
        };
        return labels[type] || 'Meditasi';
    }
    
    updateMoodDisplay(moodValue) {
        const moodData = this.moodScale.find(m => m.value === moodValue);
        const moodDisplay = document.getElementById('current-mood-display');
        
        if (moodDisplay && moodData) {
            moodDisplay.innerHTML = `
                <div class="text-center">
                    <div class="text-6xl mb-2">${moodData.emoji}</div>
                    <div class="font-semibold text-gray-800">${moodData.label}</div>
                    <div class="text-sm text-gray-500">Hari ini</div>
                </div>
            `;
        }
    }
    
    updateStats() {
        // Update mood stats
        const avgMood = this.calculateAverageMood();
        const totalMeditation = this.calculateTotalMeditation();
        const moodConsistency = this.calculateMoodConsistency();
        
        const statElements = {
            'avg-mood': avgMood.toFixed(1),
            'total-meditation': `${totalMeditation} menit`,
            'mood-consistency': `${moodConsistency}%`,
            'current-streak': `${Math.max(this.mentalData.streaks.moodTracking, this.mentalData.streaks.meditation)} hari`
        };
        
        Object.entries(statElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    calculateAverageMood() {
        if (this.mentalData.moodHistory.length === 0) return 0;
        
        const total = this.mentalData.moodHistory.reduce((sum, entry) => sum + entry.mood, 0);
        return total / this.mentalData.moodHistory.length;
    }
    
    calculateTotalMeditation() {
        return this.mentalData.meditationLog.reduce((total, session) => total + session.duration, 0);
    }
    
    calculateMoodConsistency() {
        const last7Days = this.mentalData.moodHistory.slice(-7);
        if (last7Days.length < 3) return 0;
        
        const avg = last7Days.reduce((sum, entry) => sum + entry.mood, 0) / last7Days.length;
        const variance = last7Days.reduce((sum, entry) => sum + Math.pow(entry.mood - avg, 2), 0) / last7Days.length;
        const consistency = Math.max(0, 100 - (variance * 10));
        
        return Math.round(consistency);
    }
    
    showQuickMoodModal() {
        // Implementation untuk quick mood check modal
        console.log('Show quick mood modal');
    }
    
    showMeditationModal() {
        // Implementation untuk meditation setup modal
        console.log('Show meditation modal');
    }
    
    async generateAIInsights() {
        const aiInsightsBtn = document.getElementById('ai-insights');
        if (aiInsightsBtn) {
            aiInsightsBtn.disabled = true;
            aiInsightsBtn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menganalisis...
            `;
        }
        
        try {
            // Prepare context untuk AI
            const context = {
                moodHistory: this.mentalData.moodHistory.slice(-7),
                meditationLog: this.mentalData.meditationLog.slice(-5),
                streaks: this.mentalData.streaks,
                avgMood: this.calculateAverageMood(),
                userProfile: this.userProfile
            };
            
            // Get AI insights
            const insights = await this.ai.generateRecommendation('mental-health', context);
            
            // Display insights
            this.displayAIInsights(insights);
            
        } catch (error) {
            console.error('Error getting AI insights:', error);
            this.showNotification('Gagal mendapatkan insights AI', 'error');
        } finally {
            if (aiInsightsBtn) {
                aiInsightsBtn.disabled = false;
                aiInsightsBtn.innerHTML = `
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                    Analisis AI
                `;
            }
        }
    }
    
    displayAIInsights(insights) {
        const container = document.getElementById('ai-insights-content');
        if (!container) return;
        
        container.innerHTML = `
            <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                <div class="flex items-start space-x-4">
                    <div class="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white">
                        🧠
                    </div>
                    <div class="flex-1">
                        <h4 class="font-semibold text-gray-800 mb-2">Insights Kesehatan Mental</h4>
                        <p class="text-gray-700 leading-relaxed">${insights}</p>
                    </div>
                </div>
            </div>
        `;
        
        // Scroll ke insights
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 transform translate-x-full transition-transform duration-300 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Export untuk digunakan di main.js
window.MentalTracker = MentalTracker;