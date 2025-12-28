/**
 * AI Integration - OpenRouter API Handler
 * Manages AI-powered recommendations and responses
 */

class AIIntegration {
    constructor() {
        this.endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = 'deepseek/deepseek-chat-v3.1:free';
        this.dailyQuota = 20;
        this.requestCount = 0;
        this.cache = new Map();
        this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days for most responses
        this.init();
    }

    /**
     * Initialize AI integration
     */
    async init() {
        try {
            await this.loadDailyCount();
            await this.loadCache();
            this.updateUI();
        } catch (error) {
            console.error('Error initializing AI integration:', error);
        }
    }

    /**
     * Load daily request count
     */
    async loadDailyCount() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const usage = window.storageManager.getFromLocalStorage('ai-usage') || {
                date: today,
                count: 0
            };

            // Reset if it's a new day
            if (usage.date !== today) {
                usage.date = today;
                usage.count = 0;
            }

            this.requestCount = usage.count;
        } catch (error) {
            console.error('Error loading daily count:', error);
            this.requestCount = 0;
        }
    }

    /**
     * Save daily request count
     */
    async saveDailyCount() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const usage = {
                date: today,
                count: this.requestCount
            };
            window.storageManager.saveToLocalStorage('ai-usage', usage);
            this.updateUI();
        } catch (error) {
            console.error('Error saving daily count:', error);
        }
    }

    /**
     * Increment daily count
     */
    async incrementDailyCount() {
        this.requestCount++;
        await this.saveDailyCount();
    }

    /**
     * Load cache from storage
     */
    async loadCache() {
        try {
            const cached = window.storageManager.getFromLocalStorage('ai-cache');
            if (cached) {
                for (const [key, value] of Object.entries(cached)) {
                    if (this.isCacheValid(value.timestamp)) {
                        this.cache.set(key, value);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading cache:', error);
        }
    }

    /**
     * Save cache to storage
     */
    async saveCache() {
        try {
            const cacheObj = {};
            for (const [key, value] of this.cache.entries()) {
                cacheObj[key] = value;
            }
            window.storageManager.saveToLocalStorage('ai-cache', cacheObj);
        } catch (error) {
            console.error('Error saving cache:', error);
        }
    }

    /**
     * Check if cache is valid
     */
    isCacheValid(timestamp) {
        const now = new Date().getTime();
        const cacheTime = new Date(timestamp).getTime();
        return (now - cacheTime) < this.cacheExpiry;
    }

    /**
     * Generate cache key
     */
    generateCacheKey(type, context) {
        const contextStr = JSON.stringify(context);
        return `${type}-${this.hashCode(contextStr)}`;
    }

    /**
     * Simple hash function for cache keys
     */
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Check if AI request is available
     */
    isAIAvailable() {
        return this.requestCount < this.dailyQuota;
    }

    /**
     * Generate AI recommendation
     */
    async generateRecommendation(type, context) {
        // Check quota first
        if (!this.isAIAvailable()) {
            return this.getFallbackResponse(type);
        }

        // Check cache
        const cacheKey = this.generateCacheKey(type, context);
        const cached = this.cache.get(cacheKey);
        if (cached && this.isCacheValid(cached.timestamp)) {
            console.log('Returning cached AI response');
            return cached.response;
        }

        // Build prompt
        const prompt = this.buildPrompt(type, context);
        
        try {
            const response = await this.callAI(prompt);
            
            if (response) {
                // Cache the response
                this.cache.set(cacheKey, {
                    response,
                    timestamp: new Date().toISOString(),
                    type
                });
                await this.saveCache();
                
                // Update count
                await this.incrementDailyCount();
                
                return response;
            }
        } catch (error) {
            console.error('AI request failed:', error);
        }

        // Return fallback if AI fails
        return this.getFallbackResponse(type);
    }

    /**
     * Build prompt based on type and context
     */
    buildPrompt(type, context) {
        const userProfile = window.storageManager.getFromLocalStorage('userProfile');
        const { name, age, location, interests } = userProfile?.basicInfo || {};
        
        switch (type) {
            case 'skill-recommendation':
                return `Saya adalah ${name || 'user'} berusia ${age || '25'} tahun dari ${location?.city || 'Indonesia'} dengan minat di ${interests?.join(', ') || 'pengembangan diri'}. 
                Berikan saya 3 skill yang relevan untuk dikembangkan dengan roadmap belajar dan sumber YouTube/freeCodeCamp dalam bahasa Indonesia. 
                Format: Skill, Alasan, Roadmap 1-2 minggu, Link sumber belajar.`;

            case 'problem-solving':
                return `User menghadapi masalah: ${context.problem}. 
                Berikan framework problem solving tingkat lanjut dengan contoh konkret yang bisa diterapkan hari ini dalam bahasa Indonesia.`;

            case 'mental-health':
                return `User melaporkan perasaan ${context.mood || 'tidak baik'} karena ${context.reason || 'alasan tidak disebutkan'}. 
                Berikan coping strategy berbasis CBT (Cognitive Behavioral Therapy) yang sederhana dan actionable dalam bahasa Indonesia.`;

            case 'motivation':
                return `Berikan motivational quote atau advice dalam bahasa Indonesia yang inspiring dan actionable untuk seseorang yang sedang mengejar self-improvement.`;

            case 'habit-suggestion':
                return `Saya ingin mengembangkan habit baru di bidang ${context.area || 'umum'}. 
                Berikan 3 saran habit dengan deskripsi, benefit, dan cara memulai dalam bahasa Indonesia.`;

            case 'finance-advice':
                return `Berdasarkan kondisi keuangan saya (${context.condition || 'umum'}), berikan 3 saran pengelolaan keuangan pribadi yang praktis dalam bahasa Indonesia.`;

            default:
                return `Berikan response helpful dan encouraging dalam bahasa Indonesia untuk permintaan: ${type}`;
        }
    }

    /**
     * Call AI API
     */
    async callAI(prompt) {
        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // No Authorization header for anonymous requests
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.choices && data.choices[0] && data.choices[0].message) {
                return data.choices[0].message.content.trim();
            } else {
                throw new Error('Invalid AI response format');
            }

        } catch (error) {
            console.error('AI API error:', error);
            return null;
        }
    }

    /**
     * Get fallback response when AI is unavailable
     */
    getFallbackResponse(type) {
        const fallbacks = {
            'skill-recommendation': `Berikut 3 skill yang direkomendasikan:

1. **Public Speaking**
   - Alasan: Meningkatkan confidence dan komunikasi
   - Roadmap: Praktik 15 menit/hari, ikuti komunitas seperti Toastmasters
   - Sumber: YouTube - "Public Speaking Tips" channel

2. **Digital Marketing**
   - Alasan: Skill yang sangat dibutuhkan di era digital
   - Roadmap: Pelajari SEO, Social Media, Content Marketing
   - Sumber: Google Digital Garage (gratis)

3. **Time Management**
   - Alasan: Fundamental untuk produktivitas
   - Roadmap: Implementasi Pomodoro, time blocking
   - Sumber: YouTube - "Thomas Frank" channel`,

            'problem-solving': `Framework Problem Solving:

1. **Define the Problem Clearly**
   - Tulis masalah secara spesifik
   - Identifikasi impact dan urgency

2. **Root Cause Analysis (5 Why)**
   - Tanya "mengapa" 5x sampai ke akar masalah

3. **Brainstorm Solutions**
   - List semua possible solutions
   - Evaluasi pro dan kontra masing-masing

4. **Action Plan**
   - Pilih solusi terbaik
   - Buat timeline dan milestones
   - Execute dan monitor progress`,

            'mental-health': `Strategi Coping CBT:

1. **Thought Record**
   - Identifikasi negative thought
   - Tanya: "Bukti apa yang mendukung/menentang pikiran ini?"

2. **Cognitive Reframing**
   - Ganti negative thought dengan balanced thought
   - Contoh: "Saya gagal" → "Saya belajar dari kesalahan ini"

3. **Behavioral Activation**
   - Lakukan aktivitas yang memberikan sense of accomplishment
   - Mulai dari kecil: jalan 10 menit, mandi air dingin

4. **Mindfulness**
   - Focus on the present moment
   - Latihan napas dalam 4-7-8 technique`,

            'motivation': [
                'Kemajuan kecil hari ini adalah fondasi kesuksesan besar esok. - Pria 1%',
                'Disiplin adalah pilihan antara apa yang Anda inginkan sekarang vs apa yang Anda inginkan paling.',
                'Setiap hari adalah kesempatan baru untuk menjadi 1% lebih baik.',
                'Kekuatan sejati datang dari dalam, bukan dari luar.',
                'Perjalanan seribu mil dimulai dari satu langkah kecil.'
            ],

            'habit-suggestion': `3 Habit yang Direkomendasikan:

1. **Morning Routine (30 menit)**
   - Meditasi 10 menit
   - Olahraga ringan 10 menit  
   - Planning hari 10 menit
   - Benefit: Meningkatkan energi dan fokus

2. **Reading (20 menit/hari)**
   - Pilih buku self-improvement
   - Baca dengan teknik active reading
   - Catat insight penting
   - Benefit: Expands knowledge and perspective

3. **Gratitude Journal (5 menit)**
   - Tulis 3 hal yang bersyukur setiap malam
   - Reflect moment positif dalam hari
   - Benefit: Meningkatkan wellbeing dan optimism`,

            'finance-advice': `3 Saran Pengelolaan Keuangan:

1. **Track Every Expense**
   - Catat semua pengeluaran (cash/card)
   - Review weekly untuk identify unnecessary spending
   - Tools: Spreadsheet sederhana atau app gratis

2. **50/30/20 Rule**
   - 50% untuk kebutuhan pokok
   - 30% untuk wants (hiburan, hobi)
   - 20% untuk savings dan investment
   - Sesuaikan proporsi sesuai kondisi

3. **Emergency Fund**
   - Target: 3-6 bulan expenses
   - Mulai dari 10% income per bulan
   - Simpan di akun terpisah (tidak mudah diakses)`
        };

        const response = fallbacks[type];
        if (Array.isArray(response)) {
            return response[Math.floor(Math.random() * response.length)];
        }
        return response || 'Maaf, saya tidak dapat memproses permintaan ini saat ini. Silakan coba lagi nanti.';
    }

    /**
     * Generate skill recommendation
     */
    async generateSkillRecommendation(interests = []) {
        const context = { interests };
        return await this.generateRecommendation('skill-recommendation', context);
    }

    /**
     * Generate problem solving framework
     */
    async generateProblemSolvingFramework(problem) {
        const context = { problem };
        return await this.generateRecommendation('problem-solving', context);
    }

    /**
     * Generate mental health coping strategy
     */
    async generateMentalHealthStrategy(mood, reason) {
        const context = { mood, reason };
        return await this.generateRecommendation('mental-health', context);
    }

    /**
     * Generate motivation
     */
    async generateMotivation() {
        return await this.generateRecommendation('motivation', {});
    }

    /**
     * Generate habit suggestion
     */
    async generateHabitSuggestion(area) {
        const context = { area };
        return await this.generateRecommendation('habit-suggestion', context);
    }

    /**
     * Generate finance advice
     */
    async generateFinanceAdvice(condition) {
        const context = { condition };
        return await this.generateRecommendation('finance-advice', context);
    }

    /**
     * Update UI with current quota status
     */
    updateUI() {
        const quotaText = document.getElementById('ai-quota-text');
        const quotaBar = document.getElementById('ai-quota-bar');
        
        if (quotaText) {
            quotaText.textContent = `${this.requestCount}/${this.dailyQuota}`;
        }
        
        if (quotaBar) {
            const percentage = (this.requestCount / this.dailyQuota) * 100;
            quotaBar.style.width = `${percentage}%`;
            
            // Change color based on usage
            if (percentage > 80) {
                quotaBar.classList.remove('from-blue-500', 'to-emerald-500');
                quotaBar.classList.add('from-red-500', 'to-red-600');
            } else if (percentage > 60) {
                quotaBar.classList.remove('from-blue-500', 'to-emerald-500');
                quotaBar.classList.add('from-yellow-500', 'to-orange-500');
            } else {
                quotaBar.classList.remove('from-red-500', 'to-red-600', 'from-yellow-500', 'to-orange-500');
                quotaBar.classList.add('from-blue-500', 'to-emerald-500');
            }
        }
    }

    /**
     * Get AI usage statistics
     */
    getUsageStats() {
        return {
            used: this.requestCount,
            remaining: this.dailyQuota - this.requestCount,
            total: this.dailyQuota,
            percentage: (this.requestCount / this.dailyQuota) * 100
        };
    }

    /**
     * Clear cache (for debugging)
     */
    clearCache() {
        this.cache.clear();
        window.storageManager.removeFromLocalStorage('ai-cache');
    }
}

// Create global instance
window.aiIntegration = new AIIntegration();