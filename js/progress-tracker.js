/**
 * Pria 1% Journey - Progress Tracker
 * Comprehensive progress tracking dan analytics
 */

class ProgressTracker {
    constructor(storageManager, gamification, aiIntegration) {
        this.storage = storageManager;
        this.gamification = gamification;
        this.ai = aiIntegration;
        this.userProfile = null;
        this.progressData = null;
        
        // Progress categories
        this.categories = [
            { id: 'habits', name: 'Habits', icon: '✅', color: 'bg-blue-500' },
            { id: 'learning', name: 'Learning', icon: '📚', color: 'bg-green-500' },
            { id: 'finance', name: 'Finance', icon: '💰', color: 'bg-yellow-500' },
            { id: 'mental', name: 'Mental Health', icon: '🧠', color: 'bg-purple-500' },
            { id: 'fitness', name: 'Fitness', icon: '💪', color: 'bg-red-500' }
        ];
        
        this.init();
    }
    
    async init() {
        try {
            // Load user profile dan data dari semua modules
            this.userProfile = await this.storage.getItem('system', 'userProfile');
            
            // Load data dari semua modules untuk comprehensive progress
            const [habitData, learningData, financeData, mentalData] = await Promise.all([
                this.storage.getItem('habits', 'habitData'),
                this.storage.getItem('learning', 'learningData'),
                this.storage.getItem('finance', 'financeData'),
                this.storage.getItem('mental', 'mentalData')
            ]);
            
            // Aggregate data untuk progress tracking
            this.progressData = {
                habits: habitData,
                learning: learningData,
                finance: financeData,
                mental: mentalData,
                aggregatedStats: null
            };
            
            // Calculate aggregated statistics
            this.calculateAggregatedStats();
            
            // Initialize UI jika di progress page
            if (window.location.pathname.includes('progress.html')) {
                this.initializeUI();
                this.renderOverviewStats();
                this.renderProgressCharts();
                this.renderAchievements();
                this.renderWeeklyReport();
            }
            
        } catch (error) {
            console.error('Error initializing progress tracker:', error);
        }
    }
    
    calculateAggregatedStats() {
        const stats = {
            totalXP: 0,
            level: 1,
            streaks: {},
            completionRates: {},
            weeklyProgress: {},
            monthlyProgress: {},
            categoryProgress: {}
        };
        
        // Calculate dari habit data
        if (this.progressData.habits) {
            const habits = this.progressData.habits.habits || [];
            const completedToday = habits.filter(habit => {
                const today = new Date().toISOString().split('T')[0];
                return habit.completions && habit.completions[today];
            }).length;
            
            stats.completionRates.habits = habits.length > 0 ? (completedToday / habits.length) * 100 : 0;
            stats.streaks.habits = Math.max(...habits.map(h => h.streak || 0), 0);
        }
        
        // Calculate dari learning data
        if (this.progressData.learning) {
            const totalSkills = Object.values(this.progressData.learning.categories || {})
                .reduce((total, cat) => total + (cat.skills ? cat.skills.length : 0), 0);
            const completedSkills = this.progressData.learning.completedSkills || [];
            
            stats.completionRates.learning = totalSkills > 0 ? (completedSkills.length / totalSkills) * 100 : 0;
            stats.totalXP += this.progressData.learning.totalXP || 0;
        }
        
        // Calculate dari finance data
        if (this.progressData.finance) {
            const transactions = this.progressData.finance.transactions || [];
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            
            const thisMonthTransactions = transactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
            });
            
            const totalIncome = thisMonthTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
            const totalExpense = thisMonthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);
            
            stats.completionRates.finance = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100) : 0;
        }
        
        // Calculate dari mental data
        if (this.progressData.mental) {
            const moodHistory = this.progressData.mental.moodHistory || [];
            const meditationLog = this.progressData.mental.meditationLog || [];
            
            const avgMood = moodHistory.length > 0 
                ? moodHistory.reduce((sum, entry) => sum + entry.mood, 0) / moodHistory.length 
                : 0;
            
            stats.completionRates.mental = (avgMood / 5) * 100;
            stats.streaks.mental = Math.max(
                this.progressData.mental.streaks?.moodTracking || 0,
                this.progressData.mental.streaks?.meditation || 0
            );
        }
        
        // Calculate overall progress
        const categories = Object.keys(stats.completionRates);
        stats.overallProgress = categories.length > 0 
            ? categories.reduce((sum, cat) => sum + stats.completionRates[cat], 0) / categories.length 
            : 0;
        
        this.progressData.aggregatedStats = stats;
    }
    
    initializeUI() {
        // Setup progress filter buttons
        const filterBtns = document.querySelectorAll('.progress-filter');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.filterProgressData(filter);
                
                // Update active state
                filterBtns.forEach(b => b.classList.remove('active', 'bg-blue-500', 'text-white'));
                e.target.classList.add('active', 'bg-blue-500', 'text-white');
            });
        });
        
        // Setup AI analysis button
        const aiAnalysisBtn = document.getElementById('ai-progress-analysis');
        if (aiAnalysisBtn) {
            aiAnalysisBtn.addEventListener('click', () => this.generateAIAnalysis());
        }
        
        // Setup export progress button
        const exportBtn = document.getElementById('export-progress');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportProgressData());
        }
    }
    
    renderOverviewStats() {
        const stats = this.progressData.aggregatedStats;
        if (!stats) return;
        
        // Update main stats
        const mainStats = {
            'total-xp': stats.totalXP,
            'current-level': this.gamification.calculateLevel(stats.totalXP),
            'overall-progress': `${Math.round(stats.overallProgress)}%`,
            'longest-streak': `${Math.max(...Object.values(stats.streaks), 0)} hari`
        };
        
        Object.entries(mainStats).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
        
        // Update category progress
        this.categories.forEach(category => {
            const progress = stats.completionRates[category.id] || 0;
            const progressElement = document.getElementById(`${category.id}-progress`);
            const progressBar = document.getElementById(`${category.id}-progress-bar`);
            
            if (progressElement) {
                progressElement.textContent = `${Math.round(progress)}%`;
            }
            
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
                progressBar.className = `h-full ${category.color} rounded-full transition-all duration-1000`;
            }
        });
    }
    
    renderProgressCharts() {
        this.renderWeeklyProgressChart();
        this.renderMonthlyProgressChart();
        this.renderCategoryComparisonChart();
    }
    
    renderWeeklyProgressChart() {
        const container = document.getElementById('weekly-progress-chart');
        if (!container) return;
        
        // Get last 7 days data
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' });
            
            // Calculate daily progress dari semua kategori
            const dailyProgress = this.calculateDailyProgress(dateStr);
            
            last7Days.push({ day: dayName, progress: dailyProgress, date: dateStr });
        }
        
        // Render bar chart
        container.innerHTML = `
            <div class="flex items-end justify-between h-48 space-x-3 p-4">
                ${last7Days.map(day => {
                    const height = Math.max(8, (day.progress / 100) * 140);
                    return `
                        <div class="flex-1 flex flex-col items-center">
                            <div class="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500" 
                                 style="height: ${height}px;"></div>
                            <span class="text-xs text-gray-600 mt-2">${day.day}</span>
                            <span class="text-xs font-medium text-gray-800">${Math.round(day.progress)}%</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    renderMonthlyProgressChart() {
        const container = document.getElementById('monthly-progress-chart');
        if (!container) return;
        
        // Get last 30 days data
        const last30Days = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dailyProgress = this.calculateDailyProgress(dateStr);
            last30Days.push({ date: dateStr, progress: dailyProgress });
        }
        
        // Render line chart (simplified dengan dots)
        container.innerHTML = `
            <div class="relative h-48 p-4">
                <div class="absolute inset-4 flex items-end justify-between">
                    ${last30Days.map((day, index) => {
                        const yPos = 180 - (day.progress / 100) * 160;
                        const xPos = (index / 29) * 100;
                        return `
                            <div class="absolute w-2 h-2 bg-blue-500 rounded-full" 
                                 style="left: ${xPos}%; bottom: ${yPos}px;"
                                 title="${day.date}: ${Math.round(day.progress)}%"></div>
                        `;
                    }).join('')}
                </div>
                <div class="absolute bottom-4 left-4 text-xs text-gray-500">30 hari lalu</div>
                <div class="absolute bottom-4 right-4 text-xs text-gray-500">Hari ini</div>
            </div>
        `;
    }
    
    renderCategoryComparisonChart() {
        const container = document.getElementById('category-comparison-chart');
        if (!container) return;
        
        const stats = this.progressData.aggregatedStats;
        if (!stats || !stats.completionRates) return;
        
        container.innerHTML = `
            <div class="space-y-4 p-4">
                ${this.categories.map(category => {
                    const progress = stats.completionRates[category.id] || 0;
                    return `
                        <div class="flex items-center space-x-4">
                            <div class="flex items-center space-x-2 w-32">
                                <div class="w-6 h-6 ${category.color} rounded flex items-center justify-center text-white text-xs">
                                    ${category.icon}
                                </div>
                                <span class="text-sm font-medium text-gray-700">${category.name}</span>
                            </div>
                            <div class="flex-1 bg-gray-200 rounded-full h-3">
                                <div class="h-full ${category.color} rounded-full transition-all duration-1000" 
                                     style="width: ${progress}%"></div>
                            </div>
                            <span class="text-sm font-semibold text-gray-800 w-12 text-right">${Math.round(progress)}%</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    renderAchievements() {
        const container = document.getElementById('achievements-list');
        if (!container) return;
        
        // Generate achievements berdasarkan progress
        const achievements = this.generateAchievements();
        
        container.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                ${achievements.map(achievement => `
                    <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'} 
                                bg-white rounded-xl p-4 border-2 ${achievement.unlocked ? 'border-yellow-400' : 'border-gray-200'} 
                                text-center transition-all duration-300 hover:scale-105">
                        <div class="text-4xl mb-2 ${achievement.unlocked ? '' : 'grayscale opacity-50'}">
                            ${achievement.icon}
                        </div>
                        <h4 class="font-semibold text-gray-800 text-sm mb-1">${achievement.name}</h4>
                        <p class="text-xs text-gray-500 mb-2">${achievement.description}</p>
                        ${achievement.unlocked ? 
                            '<div class="text-xs text-yellow-600 font-medium">✓ Terbuka</div>' : 
                            '<div class="text-xs text-gray-400">🔒 Terkunci</div>'
                        }
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    generateAchievements() {
        const stats = this.progressData.aggregatedStats;
        const achievements = [];
        
        // Level achievements
        const currentLevel = this.gamification.calculateLevel(stats.totalXP);
        achievements.push({
            name: 'Pemula',
            description: 'Mencapai Level 5',
            icon: '🌱',
            unlocked: currentLevel >= 5
        });
        
        achievements.push({
            name: 'Perkasa',
            description: 'Mencapai Level 15',
            icon: '💪',
            unlocked: currentLevel >= 15
        });
        
        achievements.push({
            name: 'Legenda',
            description: 'Mencapai Level 30',
            icon: '👑',
            unlocked: currentLevel >= 30
        });
        
        // Streak achievements
        const maxStreak = Math.max(...Object.values(stats.streaks), 0);
        achievements.push({
            name: 'Konsisten',
            description: 'Streak 7 hari',
            icon: '🔥',
            unlocked: maxStreak >= 7
        });
        
        achievements.push({
            name: 'Disiplin',
            description: 'Streak 30 hari',
            icon: '⚡',
            unlocked: maxStreak >= 30
        });
        
        // Category achievements
        if (stats.completionRates.habits >= 80) {
            achievements.push({
                name: 'Habit Master',
                description: 'Complete 80% habits',
                icon: '✅',
                unlocked: true
            });
        }
        
        if (stats.completionRates.learning >= 50) {
            achievements.push({
                name: 'Pembelajar',
                description: 'Complete 50% skills',
                icon: '📚',
                unlocked: true
            });
        }
        
        if (stats.completionRates.mental >= 70) {
            achievements.push({
                name: 'Sehat Mental',
                description: 'Mental health score 70%',
                icon: '🧘',
                unlocked: true
            });
        }
        
        // Special achievements
        if (stats.totalXP >= 1000) {
            achievements.push({
                name: 'Pencapaian Tinggi',
                description: 'Kumpulkan 1000 XP',
                icon: '🏆',
                unlocked: true
            });
        }
        
        return achievements;
    }
    
    renderWeeklyReport() {
        const container = document.getElementById('weekly-report');
        if (!container) return;
        
        const report = this.generateWeeklyReport();
        
        container.innerHTML = `
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Laporan Minggu Ini</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div class="bg-white rounded-xl p-4">
                        <div class="text-2xl font-bold text-green-600">${report.bestCategory.name}</div>
                        <div class="text-sm text-gray-600">Kategori Terbaik</div>
                        <div class="text-xs text-gray-500 mt-1">${report.bestCategory.progress}% complete</div>
                    </div>
                    
                    <div class="bg-white rounded-xl p-4">
                        <div class="text-2xl font-bold text-blue-600">${report.improvementArea.name}</div>
                        <div class="text-sm text-gray-600">Butuh Perhatian</div>
                        <div class="text-xs text-gray-500 mt-1">${report.improvementArea.progress}% complete</div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl p-4 mb-4">
                    <h4 class="font-semibold text-gray-800 mb-2">Highlights</h4>
                    <ul class="space-y-2">
                        ${report.highlights.map(highlight => `
                            <li class="flex items-center space-x-2">
                                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span class="text-sm text-gray-700">${highlight}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                
                <div class="bg-white rounded-xl p-4">
                    <h4 class="font-semibold text-gray-800 mb-2">Saran Perbaikan</h4>
                    <ul class="space-y-2">
                        ${report.suggestions.map(suggestion => `
                            <li class="flex items-center space-x-2">
                                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span class="text-sm text-gray-700">${suggestion}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
    }
    
    generateWeeklyReport() {
        const stats = this.progressData.aggregatedStats;
        
        // Find best and worst categories
        const categoryEntries = Object.entries(stats.completionRates || {});
        const bestCategory = categoryEntries.reduce((best, current) => 
            current[1] > best[1] ? current : best
        );
        const worstCategory = categoryEntries.reduce((worst, current) => 
            current[1] < worst[1] ? current : worst
        );
        
        const bestCategoryInfo = this.categories.find(c => c.id === bestCategory[0]) || { name: 'Unknown' };
        const worstCategoryInfo = this.categories.find(c => c.id === worstCategory[0]) || { name: 'Unknown' };
        
        // Generate highlights dan suggestions
        const highlights = [];
        const suggestions = [];
        
        if (bestCategory[1] > 80) {
            highlights.push(`Kamu sangat konsisten di kategori ${bestCategoryInfo.name} dengan ${Math.round(bestCategory[1])}% completion rate!`);
        }
        
        if (stats.streaks && Object.values(stats.streaks).some(streak => streak >= 7)) {
            highlights.push('Kamu mempertahankan streak yang bagus minggu ini! 🔥');
        }
        
        if (worstCategory[1] < 50) {
            suggestions.push(`Fokus lebih pada kategori ${worstCategoryInfo.name} untuk meningkatkan overall progress.`);
        }
        
        suggestions.push('Tetap konsisten dengan daily habits untuk mempertahankan streak.');
        
        return {
            bestCategory: { name: bestCategoryInfo.name, progress: Math.round(bestCategory[1]) },
            improvementArea: { name: worstCategoryInfo.name, progress: Math.round(worstCategory[1]) },
            highlights,
            suggestions
        };
    }
    
    calculateDailyProgress(dateStr) {
        let totalProgress = 0;
        let categoryCount = 0;
        
        // Check habit progress
        if (this.progressData.habits) {
            const habits = this.progressData.habits.habits || [];
            const completedToday = habits.filter(habit => 
                habit.completions && habit.completions[dateStr]
            ).length;
            
            if (habits.length > 0) {
                totalProgress += (completedToday / habits.length) * 100;
                categoryCount++;
            }
        }
        
        // Check learning progress (daily XP gain)
        if (this.progressData.learning) {
            const learningData = this.progressData.learning;
            // For learning, we track daily XP gain
            const today = new Date(dateStr);
            const weekKey = this.getWeekKey(today);
            const weeklyProgress = learningData.weeklyProgress?.[weekKey] || 0;
            
            totalProgress += Math.min(100, weeklyProgress * 10); // Convert to percentage
            categoryCount++;
        }
        
        // Check mental health (mood tracking)
        if (this.progressData.mental) {
            const moodEntry = this.progressData.mental.moodHistory?.find(entry => entry.date === dateStr);
            if (moodEntry) {
                totalProgress += (moodEntry.mood / 5) * 100;
                categoryCount++;
            }
        }
        
        return categoryCount > 0 ? totalProgress / categoryCount : 0;
    }
    
    filterProgressData(filter) {
        // Filter data berdasarkan time range
        console.log('Filtering progress data by:', filter);
        
        // Re-render charts dengan filtered data
        this.renderProgressCharts();
    }
    
    async generateAIAnalysis() {
        const aiAnalysisBtn = document.getElementById('ai-progress-analysis');
        if (aiAnalysisBtn) {
            aiAnalysisBtn.disabled = true;
            aiAnalysisBtn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menganalisis...
            `;
        }
        
        try {
            // Prepare comprehensive context
            const context = {
                progressData: this.progressData,
                userProfile: this.userProfile,
                weeklyReport: this.generateWeeklyReport()
            };
            
            // Get AI analysis
            const analysis = await this.ai.generateRecommendation('progress-analysis', context);
            
            // Display analysis
            this.displayAIAnalysis(analysis);
            
        } catch (error) {
            console.error('Error getting AI analysis:', error);
            this.showNotification('Gagal mendapatkan analisis AI', 'error');
        } finally {
            if (aiAnalysisBtn) {
                aiAnalysisBtn.disabled = false;
                aiAnalysisBtn.innerHTML = `
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                    Analisis AI
                `;
            }
        }
    }
    
    displayAIAnalysis(analysis) {
        const container = document.getElementById('ai-analysis-content');
        if (!container) return;
        
        container.innerHTML = `
            <div class="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-200">
                <div class="flex items-start space-x-4">
                    <div class="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white">
                        📊
                    </div>
                    <div class="flex-1">
                        <h4 class="font-semibold text-gray-800 mb-2">Analisis Progress Komprehensif</h4>
                        <p class="text-gray-700 leading-relaxed">${analysis}</p>
                    </div>
                </div>
            </div>
        `;
        
        // Scroll ke analysis
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    async exportProgressData() {
        try {
            const exportData = {
                exportDate: new Date().toISOString(),
                userProfile: this.userProfile,
                progressData: this.progressData,
                summary: this.generateWeeklyReport()
            };
            
            // Convert ke JSON dan download
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `pria-1-percent-progress-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            
            this.showNotification('Data progress berhasil diexport!', 'success');
            
        } catch (error) {
            console.error('Error exporting progress:', error);
            this.showNotification('Gagal export data progress', 'error');
        }
    }
    
    getWeekKey(date) {
        const year = date.getFullYear();
        const weekNumber = Math.ceil((((date - new Date(year, 0, 1)) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);
        return `${year}-W${weekNumber}`;
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
window.ProgressTracker = ProgressTracker;