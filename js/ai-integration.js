/**
 * AI Integration - OpenRouter API Handler
 * Manages AI-powered recommendations and responses
 */

class AIIntegration {
    constructor(storageManager) {
        this.storageManager = storageManager;
        this.endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = 'deepseek/deepseek-chat-v3.1:free';
        this.dailyQuota = 20;
        this.requestCount = 0;
        this.cache = new Map();
        this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
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
        const today = new Date().toISOString().split('T')[0];
        const usage = this.storageManager.getFromLocalStorage('ai-usage') || { date: today, count: 0 };
        if (usage.date !== today) {
            usage.date = today;
            usage.count = 0;
        }
        this.requestCount = usage.count;
    }

    /**
     * Save daily request count
     */
    async saveDailyCount() {
        const today = new Date().toISOString().split('T')[0];
        const usage = { date: today, count: this.requestCount };
        this.storageManager.saveToLocalStorage('ai-usage', usage);
        this.updateUI();
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
        const cached = this.storageManager.getFromLocalStorage('ai-cache');
        if (cached) {
            for (const [key, value] of Object.entries(cached)) {
                if (this.isCacheValid(value.timestamp)) {
                    this.cache.set(key, value);
                }
            }
        }
    }

    /**
     * Save cache to storage
     */
    async saveCache() {
        const cacheObj = Object.fromEntries(this.cache);
        this.storageManager.saveToLocalStorage('ai-cache', cacheObj);
    }

    isCacheValid(timestamp) {
        return (new Date().getTime() - new Date(timestamp).getTime()) < this.cacheExpiry;
    }

    generateCacheKey(type, context) {
        return `${type}-${JSON.stringify(context)}`;
    }

    isAIAvailable() {
        return this.requestCount < this.dailyQuota;
    }

    async generateRecommendation(type, context) {
        if (!this.isAIAvailable()) return this.getFallbackResponse(type);

        const cacheKey = this.generateCacheKey(type, context);
        const cached = this.cache.get(cacheKey);
        if (cached && this.isCacheValid(cached.timestamp)) return cached.response;

        const prompt = this.buildPrompt(type, context);
        
        try {
            const response = await this.callAI(prompt);
            if (response) {
                this.cache.set(cacheKey, { response, timestamp: new Date().toISOString(), type });
                await this.saveCache();
                await this.incrementDailyCount();
                return response;
            }
        } catch (error) {
            console.error('AI request failed:', error);
        }

        return this.getFallbackResponse(type);
    }

    buildPrompt(type, context) {
        const userProfile = this.storageManager.getFromLocalStorage('userProfile');
        const { name, age, location, interests } = userProfile?.basicInfo || {};
        
        switch (type) {
            case 'skill-recommendation':
                return `Saya ${name || 'user'} (${age || 25}) dari ${location?.city || 'Indonesia'} dengan minat pada ${interests?.join(', ') || 'pengembangan diri'}. Berikan 3 skill relevan, roadmap belajar, dan sumber gratis (YouTube/freeCodeCamp) dalam bahasa Indonesia. Format: Skill, Alasan, Roadmap, Link.`;
            case 'problem-solving':
                return `User menghadapi: ${context.problem}. Berikan framework problem solving dengan contoh konkret dalam bahasa Indonesia.`;
            case 'mental-health':
                return `User merasa ${context.mood || 'tidak baik'} karena ${context.reason || 'tidak disebutkan'}. Berikan coping strategy berbasis CBT sederhana dalam bahasa Indonesia.`;
            case 'motivation':
                return `Berikan quote motivasi yang actionable untuk self-improvement dalam bahasa Indonesia.`;
            default:
                return `Berikan respons yang membantu untuk: ${type} dalam bahasa Indonesia.`;
        }
    }

    async callAI(prompt) {
        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 500,
                    temperature: 0.7
                })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            return data.choices?.[0]?.message?.content.trim();
        } catch (error) {
            console.error('AI API error:', error);
            return null;
        }
    }

    getFallbackResponse(type) {
        const fallbacks = {
            'motivation': [
                'Kemajuan kecil hari ini adalah fondasi kesuksesan besar esok.',
                'Disiplin adalah pilihan antara apa yang Anda inginkan sekarang vs apa yang Anda inginkan paling.',
                'Setiap hari adalah kesempatan baru untuk menjadi 1% lebih baik.'
            ]
        };
        const response = fallbacks[type];
        if (Array.isArray(response)) return response[Math.floor(Math.random() * response.length)];
        return 'Maaf, coba lagi nanti.';
    }

    updateUI() {
        const quotaText = document.getElementById('ai-quota-text');
        const quotaBar = document.getElementById('ai-quota-bar');
        
        if (quotaText) quotaText.textContent = `${this.requestCount}/${this.dailyQuota}`;
        if (quotaBar) {
            const percentage = (this.requestCount / this.dailyQuota) * 100;
            quotaBar.style.width = `${percentage}%`;
            
            quotaBar.classList.toggle('from-red-500', percentage > 80);
            quotaBar.classList.toggle('to-red-600', percentage > 80);
            quotaBar.classList.toggle('from-yellow-500', percentage > 60 && percentage <= 80);
            quotaBar.classList.toggle('to-orange-500', percentage > 60 && percentage <= 80);
        }
    }
}
