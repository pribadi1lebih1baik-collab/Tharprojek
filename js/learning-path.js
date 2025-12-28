/**
 * Pria 1% Journey - Learning Path Module
 * Manajemen learning paths, skill trees, dan progress tracking
 */

class LearningPath {
    constructor(storageManager, gamification, aiIntegration) {
        this.storage = storageManager;
        this.gamification = gamification;
        this.ai = aiIntegration;
        this.userProfile = null;
        this.learningData = null;
        
        // Learning categories dengan skill trees
        this.categories = {
            'financial': {
                name: 'Financial Literacy',
                icon: '💰',
                color: 'bg-green-500',
                skills: [
                    { id: 'budgeting', name: 'Budgeting', xp: 50, unlocked: true, completed: false },
                    { id: 'emergency-fund', name: 'Emergency Fund', xp: 75, unlocked: true, completed: false },
                    { id: 'investing-basics', name: 'Investing Basics', xp: 100, unlocked: false, completed: false },
                    { id: 'stock-market', name: 'Stock Market', xp: 150, unlocked: false, completed: false },
                    { id: 'crypto', name: 'Cryptocurrency', xp: 120, unlocked: false, completed: false },
                    { id: 'retirement-planning', name: 'Retirement Planning', xp: 200, unlocked: false, completed: false }
                ]
            },
            'fitness': {
                name: 'Physical Health',
                icon: '💪',
                color: 'bg-red-500',
                skills: [
                    { id: 'workout-routine', name: 'Workout Routine', xp: 50, unlocked: true, completed: false },
                    { id: 'nutrition-basics', name: 'Nutrition Basics', xp: 75, unlocked: true, completed: false },
                    { id: 'calisthenics', name: 'Calisthenics', xp: 100, unlocked: false, completed: false },
                    { id: 'weight-training', name: 'Weight Training', xp: 120, unlocked: false, completed: false },
                    { id: 'cardiovascular', name: 'Cardiovascular Health', xp: 100, unlocked: false, completed: false },
                    { id: 'meal-prep', name: 'Meal Preparation', xp: 80, unlocked: false, completed: false }
                ]
            },
            'mental': {
                name: 'Mental Strength',
                icon: '🧠',
                color: 'bg-purple-500',
                skills: [
                    { id: 'meditation', name: 'Daily Meditation', xp: 50, unlocked: true, completed: false },
                    { id: 'journaling', name: 'Journaling', xp: 40, unlocked: true, completed: false },
                    { id: 'emotional-control', name: 'Emotional Control', xp: 100, unlocked: false, completed: false },
                    { id: 'stress-management', name: 'Stress Management', xp: 90, unlocked: false, completed: false },
                    { id: 'mindfulness', name: 'Mindfulness', xp: 80, unlocked: false, completed: false },
                    { id: 'discipline', name: 'Self Discipline', xp: 150, unlocked: false, completed: false }
                ]
            },
            'social': {
                name: 'Social Skills',
                icon: '🤝',
                color: 'bg-blue-500',
                skills: [
                    { id: 'communication', name: 'Communication', xp: 50, unlocked: true, completed: false },
                    { id: 'active-listening', name: 'Active Listening', xp: 60, unlocked: true, completed: false },
                    { id: 'public-speaking', name: 'Public Speaking', xp: 120, unlocked: false, completed: false },
                    { id: 'networking', name: 'Networking', xp: 100, unlocked: false, completed: false },
                    { id: 'leadership', name: 'Leadership', xp: 150, unlocked: false, completed: false },
                    { id: 'conflict-resolution', name: 'Conflict Resolution', xp: 110, unlocked: false, completed: false }
                ]
            },
            'career': {
                name: 'Career Development',
                icon: '🚀',
                color: 'bg-indigo-500',
                skills: [
                    { id: 'time-management', name: 'Time Management', xp: 50, unlocked: true, completed: false },
                    { id: 'goal-setting', name: 'Goal Setting', xp: 60, unlocked: true, completed: false },
                    { id: 'productivity', name: 'Productivity', xp: 80, unlocked: false, completed: false },
                    { id: 'digital-marketing', name: 'Digital Marketing', xp: 100, unlocked: false, completed: false },
                    { id: 'coding-basics', name: 'Coding Basics', xp: 150, unlocked: false, completed: false },
                    { id: 'entrepreneurship', name: 'Entrepreneurship', xp: 200, unlocked: false, completed: false }
                ]
            }
        };
        
        this.init();
    }
    
    async init() {
        try {
            // Load user profile dan learning data
            this.userProfile = await this.storage.getItem('system', 'userProfile');
            this.learningData = await this.storage.getItem('learning', 'learningData') || {
                categories: this.categories,
                completedSkills: [],
                totalXP: 0,
                weeklyProgress: {},
                streaks: {},
                lastActivity: null
            };
            
            // Initialize learning UI jika di page yang tepat
            if (window.location.pathname.includes('learning.html')) {
                this.initializeUI();
                this.renderCategories();
                this.updateProgressStats();
            }
            
        } catch (error) {
            console.error('Error initializing learning path:', error);
        }
    }
    
    initializeUI() {
        // Setup event listeners untuk learning page
        const categoryCards = document.querySelectorAll('.category-card');
        categoryCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const categoryId = e.currentTarget.dataset.category;
                this.showCategoryDetails(categoryId);
            });
        });
        
        // Setup AI recommendation button
        const aiRecommendBtn = document.getElementById('ai-recommendations');
        if (aiRecommendBtn) {
            aiRecommendBtn.addEventListener('click', () => this.generateAIRecommendations());
        }
        
        // Setup progress filter buttons
        const filterBtns = document.querySelectorAll('.progress-filter');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.filterProgress(filter);
                
                // Update active state
                filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }
    
    renderCategories() {
        const container = document.getElementById('learning-categories');
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.entries(this.learningData.categories).forEach(([categoryId, category]) => {
            const completedCount = category.skills.filter(skill => skill.completed).length;
            const totalCount = category.skills.length;
            const progress = Math.round((completedCount / totalCount) * 100);
            
            const categoryCard = document.createElement('div');
            categoryCard.className = `category-card bg-white rounded-2xl p-6 shadow-lg border border-gray-100 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl`;
            categoryCard.dataset.category = categoryId;
            
            categoryCard.innerHTML = `
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center space-x-3">
                        <div class="w-12 h-12 ${category.color} rounded-xl flex items-center justify-center text-white text-xl">
                            ${category.icon}
                        </div>
                        <div>
                            <h3 class="font-bold text-gray-800 text-lg">${category.name}</h3>
                            <p class="text-sm text-gray-500">${completedCount}/${totalCount} skills</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-gray-800">${progress}%</div>
                        <div class="w-16 h-2 bg-gray-200 rounded-full mt-1">
                            <div class="h-full ${category.color} rounded-full transition-all duration-500" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-3 gap-2 mt-4">
                    ${category.skills.slice(0, 3).map(skill => `
                        <div class="skill-indicator ${skill.completed ? 'bg-green-100 text-green-600' : skill.unlocked ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400'} 
                                    rounded-lg p-2 text-xs font-medium text-center transition-colors">
                            ${skill.completed ? '✓' : skill.unlocked ? '○' : '🔒'}
                        </div>
                    `).join('')}
                    ${totalCount > 3 ? `<div class="text-xs text-gray-400 text-center p-2">+${totalCount - 3} more</div>` : ''}
                </div>
            `;
            
            container.appendChild(categoryCard);
        });
    }
    
    showCategoryDetails(categoryId) {
        const category = this.learningData.categories[categoryId];
        if (!category) return;
        
        // Create modal atau navigasi ke detail page
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b border-gray-200">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-12 h-12 ${category.color} rounded-xl flex items-center justify-center text-white text-xl">
                                ${category.icon}
                            </div>
                            <div>
                                <h2 class="text-2xl font-bold text-gray-800">${category.name}</h2>
                                <p class="text-gray-600">Pilih skill untuk mulai belajar</p>
                            </div>
                        </div>
                        <button class="close-modal text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                    </div>
                </div>
                
                <div class="p-6">
                    <div class="space-y-3">
                        ${category.skills.map(skill => this.renderSkillItem(skill, categoryId, category.color)).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup close modal
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        // Setup skill click handlers
        modal.querySelectorAll('.skill-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const skillId = e.currentTarget.dataset.skill;
                const categoryId = e.currentTarget.dataset.category;
                this.handleSkillAction(skillId, categoryId);
                document.body.removeChild(modal);
            });
        });
    }
    
    renderSkillItem(skill, categoryId, categoryColor) {
        const isCompleted = this.learningData.completedSkills.includes(skill.id);
        const canAccess = skill.unlocked && !isCompleted;
        
        return `
            <div class="skill-item ${canAccess ? 'cursor-pointer hover:bg-gray-50' : 'opacity-60'} 
                        border border-gray-200 rounded-xl p-4 transition-all duration-200" 
                 data-skill="${skill.id}" data-category="${categoryId}">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 ${isCompleted ? 'bg-green-500' : skill.unlocked ? categoryColor : 'bg-gray-300'} 
                                    rounded-lg flex items-center justify-center text-white font-bold">
                            ${isCompleted ? '✓' : skill.unlocked ? skill.name.charAt(0) : '🔒'}
                        </div>
                        <div>
                            <h4 class="font-semibold text-gray-800">${skill.name}</h4>
                            <p class="text-sm text-gray-500">+${skill.xp} XP</p>
                        </div>
                    </div>
                    <div class="text-right">
                        ${isCompleted ? 
                            '<span class="text-green-600 font-medium">Selesai</span>' : 
                            skill.unlocked ? 
                            '<button class="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">Mulai</button>' :
                            '<span class="text-gray-400 text-sm">TerKunci</span>'
                        }
                    </div>
                </div>
            </div>
        `;
    }
    
    async handleSkillAction(skillId, categoryId) {
        const category = this.learningData.categories[categoryId];
        const skill = category.skills.find(s => s.id === skillId);
        
        if (!skill || !skill.unlocked || this.learningData.completedSkills.includes(skillId)) {
            return;
        }
        
        try {
            // Mark skill sebagai completed
            skill.completed = true;
            this.learningData.completedSkills.push(skillId);
            this.learningData.totalXP += skill.xp;
            this.learningData.lastActivity = new Date().toISOString();
            
            // Update weekly progress
            const weekKey = this.getWeekKey(new Date());
            if (!this.learningData.weeklyProgress[weekKey]) {
                this.learningData.weeklyProgress[weekKey] = 0;
            }
            this.learningData.weeklyProgress[weekKey]++;
            
            // Unlock next skill dalam kategori yang sama
            this.unlockNextSkill(categoryId, skillId);
            
            // Save ke storage
            await this.storage.setItem('learning', 'learningData', this.learningData);
            
            // Add XP ke gamification
            await this.gamification.addXP(skill.xp, `Completed skill: ${skill.name}`);
            
            // Tampilkan notifikasi sukses
            this.showSkillCompletionPopup(skill, category);
            
            // Re-render categories untuk update progress
            this.renderCategories();
            this.updateProgressStats();
            
        } catch (error) {
            console.error('Error completing skill:', error);
            this.showNotification('Gagal menyelesaikan skill', 'error');
        }
    }
    
    unlockNextSkill(categoryId, completedSkillId) {
        const category = this.learningData.categories[categoryId];
        const skills = category.skills;
        
        // Cari index skill yang baru diselesaikan
        const completedIndex = skills.findIndex(s => s.id === completedSkillId);
        
        // Unlock skill berikutnya jika ada
        if (completedIndex < skills.length - 1) {
            const nextSkill = skills[completedIndex + 1];
            if (!nextSkill.unlocked) {
                nextSkill.unlocked = true;
                this.showNotification(`Skill baru terbuka: ${nextSkill.name}!`, 'success');
            }
        }
    }
    
    showSkillCompletionPopup(skill, category) {
        // Create popup notification
        const popup = document.createElement('div');
        popup.className = 'fixed top-20 right-4 bg-white rounded-2xl shadow-2xl border border-green-200 p-6 z-50 transform translate-x-full transition-transform duration-500';
        popup.innerHTML = `
            <div class="flex items-center space-x-4">
                <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl">
                    🎉
                </div>
                <div>
                    <h3 class="font-bold text-gray-800 text-lg">Selamat!</h3>
                    <p class="text-gray-600">Kamu berhasil menyelesaikan:</p>
                    <p class="font-semibold text-green-600">${skill.name}</p>
                    <p class="text-sm text-gray-500">+${skill.xp} XP</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Animate in
        setTimeout(() => {
            popup.classList.remove('translate-x-full');
        }, 100);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            popup.classList.add('translate-x-full');
            setTimeout(() => {
                if (document.body.contains(popup)) {
                    document.body.removeChild(popup);
                }
            }, 500);
        }, 3000);
    }
    
    updateProgressStats() {
        // Update progress stats di UI
        const totalSkills = Object.values(this.learningData.categories)
            .reduce((total, cat) => total + cat.skills.length, 0);
        const completedSkills = this.learningData.completedSkills.length;
        const overallProgress = Math.round((completedSkills / totalSkills) * 100);
        
        // Update stat cards
        const statCards = {
            'total-skills': totalSkills,
            'completed-skills': completedSkills,
            'total-xp': this.learningData.totalXP,
            'completion-rate': `${overallProgress}%`
        };
        
        Object.entries(statCards).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
        
        // Update weekly progress chart
        this.renderWeeklyProgress();
    }
    
    renderWeeklyProgress() {
        const chartContainer = document.getElementById('weekly-progress-chart');
        if (!chartContainer) return;
        
        // Get last 7 days data
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const weekKey = this.getWeekKey(date);
            const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' });
            const progress = this.learningData.weeklyProgress[weekKey] || 0;
            
            last7Days.push({ day: dayName, progress });
        }
        
        // Render simple bar chart
        chartContainer.innerHTML = `
            <div class="flex items-end justify-between h-32 space-x-2">
                ${last7Days.map(day => `
                    <div class="flex-1 flex flex-col items-center">
                        <div class="w-full bg-gray-200 rounded-t-lg" style="height: ${Math.max(8, day.progress * 8)}px; background: linear-gradient(to top, #3B82F6, #1E40AF);"></div>
                        <span class="text-xs text-gray-600 mt-2">${day.day}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    async generateAIRecommendations() {
        const aiRecommendBtn = document.getElementById('ai-recommendations');
        if (aiRecommendBtn) {
            aiRecommendBtn.disabled = true;
            aiRecommendBtn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Mendapatkan rekomendasi...
            `;
        }
        
        try {
            // Prepare context untuk AI
            const context = {
                completedSkills: this.learningData.completedSkills,
                totalXP: this.learningData.totalXP,
                categories: Object.keys(this.learningData.categories),
                userProfile: this.userProfile
            };
            
            // Get AI recommendation
            const recommendation = await this.ai.generateRecommendation('learning', context);
            
            // Display recommendation
            this.displayAIRecommendation(recommendation);
            
        } catch (error) {
            console.error('Error getting AI recommendation:', error);
            this.showNotification('Gagal mendapatkan rekomendasi AI', 'error');
        } finally {
            if (aiRecommendBtn) {
                aiRecommendBtn.disabled = false;
                aiRecommendBtn.innerHTML = `
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                    Dapatkan Rekomendasi AI
                `;
            }
        }
    }
    
    displayAIRecommendation(recommendation) {
        const container = document.getElementById('ai-recommendation-content');
        if (!container) return;
        
        container.innerHTML = `
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
        
        // Scroll ke recommendation
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    filterProgress(filter) {
        // Filter progress berdasarkan time range
        // Implementation untuk filter weekly/monthly/yearly
        console.log('Filtering progress by:', filter);
    }
    
    getWeekKey(date) {
        const year = date.getFullYear();
        const weekNumber = Math.ceil((((date - new Date(year, 0, 1)) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);
        return `${year}-W${weekNumber}`;
    }
    
    showNotification(message, type = 'info') {
        // Simple notification system
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
window.LearningPath = LearningPath;