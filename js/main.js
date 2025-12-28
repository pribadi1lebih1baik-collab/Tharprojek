/**
 * Main Application Logic - Dashboard controller
 * Handles initialization, navigation, and core functionality
 */

class MainApp {
    constructor() {
        this.userProfile = null;
        this.isLoading = true;
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Wait for DOM to be fully loaded
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.init());
                return;
            }

            // Check if user has completed onboarding
            if (!this.checkOnboardingStatus()) {
                return;
            }

            // Initialize storage
            await window.storageManager.initIndexedDB();

            // Load user profile
            this.userProfile = await this.loadUserProfile();
            
            // Initialize components
            await this.initializeComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load dashboard data
            await this.loadDashboardData();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            // Show panic button if needed
            this.showPanicButtonIfNeeded();
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Gagal memuat aplikasi. Refresh halaman.');
        }
    }

    /**
     * Check if user has completed onboarding
     */
    checkOnboardingStatus() {
        const onboardingComplete = window.storageManager.getFromLocalStorage('onboardingComplete');
        if (!onboardingComplete) {
            window.location.href = 'onboarding.html';
            return false;
        }
        return true;
    }

    /**
     * Load user profile with proper initialization
     */
    async loadUserProfile() {
        try {
            let profile = window.storageManager.getFromLocalStorage('userProfile');
            
            if (!profile) {
                // Initialize new profile with all values at 0
                profile = {
                    basicInfo: {
                        name: 'Pria 1%',
                        age: null,
                        location: { city: 'Jakarta', country: 'Indonesia' },
                        interests: []
                    },
                    stats: {
                        level: 1,
                        xp: 0,
                        totalXP: 0,
                        joinDate: new Date().toISOString()
                    },
                    preferences: {
                        theme: 'light',
                        notifications: true,
                        prayerEnabled: true,
                        language: 'id'
                    },
                    achievements: [],
                    streaks: {}
                };
                
                // Save initial profile
                window.storageManager.setToLocalStorage('userProfile', profile);
            }
            
            return profile;
        } catch (error) {
            console.error('Error loading user profile:', error);
            return null;
        }
    }

    /**
     * Initialize all components
     */
    async initializeComponents() {
        // Initialize gamification first (required by other modules)
        if (window.gamificationManager) {
            await window.gamificationManager.init();
        }

        // Initialize prayer times if enabled
        if (this.userProfile?.preferences?.prayerEnabled && window.prayerTimesManager) {
            try {
                await window.prayerTimesManager.init();
            } catch (error) {
                console.warn('Prayer times initialization failed:', error);
            }
        }

        // Initialize weather
        if (window.weatherManager && this.userProfile?.basicInfo?.location) {
            try {
                await window.weatherManager.init();
            } catch (error) {
                console.warn('Weather initialization failed:', error);
            }
        }

        // Initialize notifications
        if (window.notificationManager) {
            try {
                await window.notificationManager.init();
            } catch (error) {
                console.warn('Notification initialization failed:', error);
            }
        }

        // Initialize AI integration
        if (window.aiIntegration) {
            try {
                await window.aiIntegration.init();
            } catch (error) {
                console.warn('AI integration initialization failed:', error);
            }
        }

        // Initialize Habit Engine (jika di habits page)
        if (window.location.pathname.includes('habits.html') && window.habitEngine) {
            try {
                window.habitTracker = new window.habitEngine(window.storageManager, window.gamificationManager);
            } catch (error) {
                console.warn('Habit engine initialization failed:', error);
            }
        }

        // Initialize Finance Core (jika di finance page)
        if (window.location.pathname.includes('finance.html') && window.financeCore) {
            try {
                window.financeManager = new window.financeCore(window.storageManager, window.gamificationManager);
            } catch (error) {
                console.warn('Finance core initialization failed:', error);
            }
        }

        // Initialize Learning Path (jika di learning page)
        if (window.location.pathname.includes('learning.html') && window.LearningPath) {
            try {
                window.learningPath = new window.LearningPath(window.storageManager, window.gamificationManager, window.aiIntegration);
            } catch (error) {
                console.warn('Learning path initialization failed:', error);
            }
        }

        // Initialize Mental Tracker (jika di mental page)
        if (window.location.pathname.includes('mental.html') && window.MentalTracker) {
            try {
                window.mentalTracker = new window.MentalTracker(window.storageManager, window.gamificationManager, window.aiIntegration);
            } catch (error) {
                console.warn('Mental tracker initialization failed:', error);
            }
        }

        // Initialize Progress Tracker (jika di progress page)
        if (window.location.pathname.includes('progress.html') && window.ProgressTracker) {
            try {
                window.progressTracker = new window.ProgressTracker(window.storageManager, window.gamificationManager, window.aiIntegration);
            } catch (error) {
                console.warn('Progress tracker initialization failed:', error);
            }
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-menu-overlay');

        if (mobileMenuBtn && sidebar) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('-translate-x-full');
                overlay.classList.toggle('hidden');
            });

            overlay.addEventListener('click', () => {
                sidebar.classList.add('-translate-x-full');
                overlay.classList.add('hidden');
            });
        }

        // Panic button
        const panicButton = document.getElementById('panic-button');
        const panicModal = document.getElementById('panic-modal');
        const closePanicModal = document.getElementById('close-panic-modal');

        if (panicButton) {
            panicButton.addEventListener('click', () => {
                panicModal.classList.remove('hidden');
            });
        }

        if (closePanicModal) {
            closePanicModal.addEventListener('click', () => {
                panicModal.classList.add('hidden');
            });
        }

        // Panic modal actions
        document.getElementById('report-trigger')?.addEventListener('click', () => {
            this.handlePanicAction('report');
        });

        document.getElementById('get-motivation')?.addEventListener('click', () => {
            this.handlePanicAction('motivation');
        });

        document.getElementById('redirect-positive')?.addEventListener('click', () => {
            this.handlePanicAction('redirect');
        });

        // Update greeting based on time
        this.updateGreeting();
        
        // Update current date
        this.updateCurrentDate();
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        try {
            // Load user stats
            this.updateUserStats();
            
            // Load today's habits
            await this.loadTodayHabits();
            
            // Load streak data
            await this.loadStreakData();
            
            // Load finance health
            await this.loadFinanceHealth();
            
            // Load mental health
            await this.loadMentalHealth();
            
            // Load progress chart
            await this.loadProgressChart();
            
            // Load AI recommendations
            await this.loadAIRecommendations();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    /**
     * Update user stats display
     */
    updateUserStats() {
        if (!this.userProfile) return;

        const level = this.userProfile.stats.level || 1;
        const xp = this.userProfile.stats.xp || 0;
        const nextLevelXP = level * 100;
        const xpProgress = (xp % 100);

        // Update level and title
        document.getElementById('user-level').textContent = `Level ${level}`;
        document.getElementById('user-xp').textContent = xp.toLocaleString();
        document.getElementById('xp-progress-text').textContent = `${xpProgress}/100`;
        document.getElementById('xp-progress-bar').style.width = `${xpProgress}%`;

        // Update title based on level
        let title = 'Pemula';
        if (level >= 31) title = 'Pria Top 1%';
        else if (level >= 16) title = 'Elite';
        else if (level >= 6) title = 'Pejuang';
        
        document.getElementById('user-title').textContent = title;
    }

    /**
     * Load today's habits
     */
    async loadTodayHabits() {
        try {
            const today = new Date().toISOString().split('T')[0];
            let habits = [];
            let logs = [];
            
            try {
                habits = await window.storageManager.getAllFromDB('habitsDB', 'dailyHabits');
                logs = await window.storageManager.getAllFromDB('habitsDB', 'habitLogs');
            } catch (error) {
                console.warn('Habits database not initialized yet:', error);
            }
            
            const todayLogs = logs.filter(log => log.date === today);
            const completedCount = todayLogs.filter(log => log.status === 'completed').length;
            const totalCount = habits.length;

            // Update stats
            const habitsTodayElement = document.getElementById('habits-today');
            if (habitsTodayElement) {
                habitsTodayElement.textContent = `${completedCount}/${totalCount}`;
            }

            // Update habits list
            const habitsContainer = document.getElementById('today-habits');
            if (!habitsContainer) return;
            
            if (habits.length === 0) {
                // Show empty state
                habitsContainer.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <div class="text-4xl mb-3">📝</div>
                        <h3 class="font-semibold text-gray-700 mb-2">Belum Ada Habit</h3>
                        <p class="text-sm mb-4">Mulai perjalanan 1% dengan menambahkan habit pertama kamu!</p>
                        <a href="habits.html" class="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                            Tambah Habit
                        </a>
                    </div>
                `;
                return;
            }

            habitsContainer.innerHTML = '';
            
            // Show up to 5 habits
            const displayHabits = habits.slice(0, 5);
            displayHabits.forEach(habit => {
                const todayLog = todayLogs.find(log => log.habitId === habit.id);
                const isCompleted = todayLog?.status === 'completed';
                
                const habitElement = document.createElement('div');
                habitElement.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg';
                habitElement.innerHTML = `
                    <div class="flex items-center">
                        <div class="text-2xl mr-3">${habit.icon}</div>
                        <div>
                            <div class="font-medium text-gray-900">${habit.name}</div>
                            <div class="text-sm text-gray-500">${habit.xpValue || 10} XP</div>
                        </div>
                    </div>
                    <button class="habit-toggle w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isCompleted 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'border-gray-300 hover:border-emerald-400'
                    }" data-habit-id="${habit.id}">
                        ${isCompleted ? '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>' : ''}
                    </button>
                `;
                
                // Add toggle functionality
                const toggleBtn = habitElement.querySelector('.habit-toggle');
                toggleBtn.addEventListener('click', () => this.toggleHabit(habit.id, !isCompleted));
                
                habitsContainer.appendChild(habitElement);
            });

        } catch (error) {
            console.error('Error loading today habits:', error);
        }
    }

    /**
     * Toggle habit completion
     */
    async toggleHabit(habitId, completed) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const timestamp = new Date().toISOString();
            
            // Save habit log
            await window.storageManager.saveToDB('habitsDB', 'habitLogs', {
                habitId: habitId,
                date: today,
                status: completed ? 'completed' : 'pending',
                timestamp: timestamp
            });

            // Update XP if completed
            if (completed) {
                const habits = await window.storageManager.getAllFromDB('habitsDB', 'dailyHabits');
                const habit = habits.find(h => h.id === habitId);
                
                if (habit && window.gamificationManager) {
                    await window.gamificationManager.addXP(habit.xpValue || 10, 'Habit completed: ' + habit.name);
                }
            }

            // Reload dashboard
            await this.loadDashboardData();

        } catch (error) {
            console.error('Error toggling habit:', error);
        }
    }

    /**
     * Load streak data
     */
    async loadStreakData() {
        try {
            let streaks = [];
            try {
                streaks = await window.storageManager.getAllFromDB('habitsDB', 'streaks');
            } catch (error) {
                // Database might not be initialized yet
                console.warn('Streaks database not available:', error);
            }
            
            const bestStreak = streaks.length > 0 ? 
                streaks.reduce((max, streak) => Math.max(max, streak.bestStreak || 0), 0) : 0;
            
            const bestStreakElement = document.getElementById('best-streak');
            if (bestStreakElement) {
                bestStreakElement.textContent = `${bestStreak} hari`;
            }
        } catch (error) {
            console.error('Error loading streak data:', error);
        }
    }

    /**
     * Load finance health
     */
    async loadFinanceHealth() {
        try {
            let transactions = [];
            try {
                transactions = await window.storageManager.getAllFromDB('financeDB', 'transactions');
            } catch (error) {
                console.warn('Finance database not available:', error);
            }
            
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
            
            const thisMonthTransactions = transactions.filter(t => 
                t.date && t.date.startsWith(currentMonth)
            );
            
            const totalIncome = thisMonthTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + (t.amount || 0), 0);
            
            const totalExpense = thisMonthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + (t.amount || 0), 0);
            
            const savingsRate = totalIncome > 0 ? 
                ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
            
            let healthScore = 50;
            if (savingsRate >= 30) healthScore = 90;
            else if (savingsRate >= 20) healthScore = 75;
            else if (savingsRate >= 10) healthScore = 60;
            else if (savingsRate >= 0) healthScore = 45;
            else healthScore = 25;
            
            const financeHealthElement = document.getElementById('finance-health');
            if (financeHealthElement) {
                financeHealthElement.textContent = `${Math.round(healthScore)}%`;
            }
            
            // Update user profile
            if (this.userProfile) {
                this.userProfile.stats = this.userProfile.stats || {};
                this.userProfile.stats.financialHealth = Math.round(healthScore);
                window.storageManager.setToLocalStorage('userProfile', this.userProfile);
            }
            
        } catch (error) {
            console.error('Error loading finance health:', error);
            const financeHealthElement = document.getElementById('finance-health');
            if (financeHealthElement) {
                financeHealthElement.textContent = '0%';
            }
        }
    }

    /**
     * Load mental health
     */
    async loadMentalHealth() {
        try {
            let moodLogs = [];
            try {
                moodLogs = await window.storageManager.getAllFromDB('mentalDB', 'moodLogs');
            } catch (error) {
                console.warn('Mental health database not available:', error);
            }
            
            let healthScore = 0;
            
            if (moodLogs.length > 0) {
                // Get latest mood
                const latestLog = moodLogs.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                healthScore = (latestLog.mood / 5) * 100; // Convert 1-5 to 0-100
            }
            
            const mentalHealthElement = document.getElementById('mental-health');
            if (mentalHealthElement) {
                mentalHealthElement.textContent = `${Math.round(healthScore)}%`;
            }
            
            // Update user profile
            if (this.userProfile) {
                this.userProfile.stats = this.userProfile.stats || {};
                this.userProfile.stats.mentalHealth = Math.round(healthScore);
                window.storageManager.setToLocalStorage('userProfile', this.userProfile);
            }
            
        } catch (error) {
            console.error('Error loading mental health:', error);
            const mentalHealthElement = document.getElementById('mental-health');
            if (mentalHealthElement) {
                mentalHealthElement.textContent = '0%';
            }
        }
    }

    /**
     * Load progress chart
     */
    async loadProgressChart() {
        try {
            const ctx = document.getElementById('progress-chart');
            if (!ctx) return;

            // Get XP history for last 7 days
            const xpHistory = await this.getXPHistory(7);
            
            // Check if Chart.js is available
            if (typeof Chart === 'undefined') {
                console.warn('Chart.js not available, skipping chart rendering');
                return;
            }
            
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: xpHistory.labels,
                    datasets: [{
                        label: 'XP Harian',
                        data: xpHistory.data,
                        borderColor: '#1E40AF',
                        backgroundColor: 'rgba(30, 64, 175, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#1E40AF',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: '#f3f4f6'
                            },
                            ticks: {
                                font: {
                                    family: 'Inter',
                                    size: 12
                                }
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    family: 'Inter',
                                    size: 12
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error loading progress chart:', error);
        }
    }

    /**
     * Get XP history for chart
     */
    async getXPHistory(days) {
        const labels = [];
        const data = [];
        
        try {
            // Get habit logs untuk menghitung XP history
            const habitLogs = await window.storageManager.getAllFromDB('habitsDB', 'habitLogs');
            const habits = await window.storageManager.getAllFromDB('habitsDB', 'dailyHabits');
            
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                
                const dateLabel = date.toLocaleDateString('id-ID', { 
                    weekday: 'short',
                    day: 'numeric'
                });
                
                labels.push(dateLabel);
                
                // Calculate XP untuk hari ini dari completed habits
                const dayLogs = habitLogs.filter(log => log.date === dateStr && log.status === 'completed');
                let dayXP = 0;
                
                dayLogs.forEach(log => {
                    const habit = habits.find(h => h.id === log.habitId);
                    if (habit && habit.xpValue) {
                        dayXP += habit.xpValue;
                    } else {
                        dayXP += 10; // Default XP
                    }
                });
                
                data.push(dayXP);
            }
        } catch (error) {
            console.warn('Error getting XP history:', error);
            // Return empty data jika error
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toLocaleDateString('id-ID', { 
                    weekday: 'short',
                    day: 'numeric'
                });
                labels.push(dateStr);
                data.push(0);
            }
        }
        
        return { labels, data };
    }

    /**
     * Update greeting based on time
     */
    updateGreeting() {
        const hour = new Date().getHours();
        const name = this.userProfile?.basicInfo?.name || 'Pejuang';
        let greeting = 'Selamat Pagi';
        
        if (hour >= 12 && hour < 15) greeting = 'Selamat Siang';
        else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';
        else if (hour >= 18) greeting = 'Selamat Malam';
        
        document.getElementById('greeting-text').textContent = `${greeting}, ${name}!`;
    }

    /**
     * Update current date
     */
    updateCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const dateStr = now.toLocaleDateString('id-ID', options);
        document.getElementById('current-date').textContent = dateStr;
    }

    /**
     * Handle panic button actions
     */
    async handlePanicAction(action) {
        const modal = document.getElementById('panic-modal');
        
        switch (action) {
            case 'report':
                // Save trigger report
                await window.storageManager.saveToDB('systemDB', 'pornReports', {
                    timestamp: new Date().toISOString(),
                    trigger: 'user_reported',
                    successfullyResisted: false,
                    context: 'panic_button'
                });
                
                // Show coping strategies
                alert('Trigger dilaporkan. Berikut strategi coping:\n\n1. Tarik napas dalam 10x\n2. Minum air putih\n3. Pergi ke tempat umum\n4. Lakukan push-up 20x\n5. Baca Al-Quran atau buku positif');
                break;
                
            case 'motivation':
                // Get motivation from AI or fallback
                if (window.aiIntegration) {
                    const motivation = await window.aiIntegration.generateMotivation();
                    alert(motivation);
                } else {
                    const motivations = [
                        'Kemajuan kecil hari ini adalah fondasi kesuksesan besar esok.',
                        'Disiplin adalah pilihan antara apa yang Anda inginkan sekarang vs apa yang Anda inginkan paling.',
                        'Setiap hari adalah kesempatan baru untuk menjadi 1% lebih baik.',
                        'Kekuatan sejati datang dari dalam, bukan dari luar.',
                        'Perjalanan seribu mil dimulai dari satu langkah kecil.'
                    ];
                    const random = motivations[Math.floor(Math.random() * motivations.length)];
                    alert(random);
                }
                break;
                
            case 'redirect':
                // Redirect to positive content
                const positiveUrls = [
                    'https://www.youtube.com/c/IslamiPositif',
                    'https://www.ted.com/talks',
                    'https://www.khanacademy.org',
                    'https://www.freecodecamp.org'
                ];
                const url = positiveUrls[Math.floor(Math.random() * positiveUrls.length)];
                window.open(url, '_blank');
                break;
        }
        
        modal.classList.add('hidden');
    }

    /**
     * Show panic button if user has addiction support enabled
     */
    showPanicButtonIfNeeded() {
        const panicButton = document.getElementById('panic-button');
        const userProfile = window.storageManager.getFromLocalStorage('userProfile');
        
        if (userProfile?.supportNeeds?.addictionSupport) {
            panicButton.classList.remove('hidden');
        }
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                this.isLoading = false;
            }, 500);
        }
    }

    /**
     * Load AI recommendations for dashboard
     */
    async loadAIRecommendations() {
        try {
            const recommendationContainer = document.getElementById('ai-recommendation');
            if (!recommendationContainer || !window.aiIntegration) {
                return;
            }

            // Get context for AI recommendation
            const context = {
                level: this.userProfile?.stats?.level || 1,
                xp: this.userProfile?.stats?.xp || 0,
                joinDate: this.userProfile?.stats?.joinDate,
                recentActivity: await this.getRecentActivity()
            };

            const recommendation = await window.aiIntegration.generateRecommendation('dashboard', context);
            
            if (recommendation) {
                recommendationContainer.innerHTML = `
                    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                        <div class="flex items-start space-x-4">
                            <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                                🤖
                            </div>
                            <div class="flex-1">
                                <h4 class="font-semibold text-gray-800 mb-2">Rekomendasi AI</h4>
                                <p class="text-gray-700 leading-relaxed">${recommendation}</p>
                            </div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.warn('AI recommendation failed:', error);
            // Don't show error to user for non-critical AI features
        }
    }

    /**
     * Get recent activity summary for AI context
     */
    async getRecentActivity() {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Get recent habit completions
            const habitLogs = await window.storageManager.getAllFromDB('habitsDB', 'habitLogs');
            const todayHabits = habitLogs.filter(log => log.date === today && log.status === 'completed');
            
            return {
                habitsCompletedToday: todayHabits.length,
                lastActive: todayHabits.length > 0 ? today : null
            };
        } catch (error) {
            console.warn('Failed to get recent activity:', error);
            return { habitsCompletedToday: 0, lastActive: null };
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        // Create error modal
        const errorModal = document.createElement('div');
        errorModal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        errorModal.innerHTML = `
            <div class="bg-white rounded-2xl max-w-md w-full p-6 text-center">
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-cen