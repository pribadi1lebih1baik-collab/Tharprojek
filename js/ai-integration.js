/**
 * AI Integration - OpenRouter API Handler
 * Manages AI-powered recommendations and responses
 */

class AiIntegration {
    constructor(storageManager) {
        if (!storageManager) {
            throw new Error("StorageManager is a required dependency for AiIntegration.");
        }
        this.storageManager = storageManager;
        this.endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = 'deepseek/deepseek-chat-v3.1:free';
        this.dailyQuota = 20;
        this.requestCount = 0;
    }

    /**
     * Initializes the AI integration manager.
     */
    async init() {
        this.loadDailyCount();
        this.updateQuotaUI();
    }

    /**
     * Loads the daily request count from local storage.
     */
    loadDailyCount() {
        const today = new Date().toISOString().split('T')[0];
        const usage = this.storageManager.getFromLocalStorage('ai-usage') || { date: today, count: 0 };
        if (usage.date !== today) {
            this.requestCount = 0;
            this.saveDailyCount();
        } else {
            this.requestCount = usage.count;
        }
    }

    /**
     * Saves the current request count to local storage.
     */
    saveDailyCount() {
        const today = new Date().toISOString().split('T')[0];
        this.storageManager.saveToLocalStorage('ai-usage', { date: today, count: this.requestCount });
    }

    /**
     * Generates a recommendation using the AI model.
     * @param {string} type - The type of recommendation (e.g., 'motivation').
     * @param {object} context - Additional context for the prompt.
     * @returns {Promise<string>} - The AI-generated response or a fallback.
     */
    async generateRecommendation(type, context) {
        if (this.requestCount >= this.dailyQuota) {
            console.warn("AI daily quota exceeded.");
            return this.getFallbackResponse(type);
        }

        const prompt = this.buildPrompt(type, context);
        try {
            const response = await this.callAI(prompt);
            this.requestCount++;
            this.saveDailyCount();
            this.updateQuotaUI();
            return response;
        } catch (error) {
            console.error('AI request failed:', error);
            return this.getFallbackResponse(type);
        }
    }

    /**
     * Builds a prompt string for the AI model.
     * @param {string} type - The type of prompt to build.
     * @param {object} context - The context for the prompt.
     * @returns {string} - The constructed prompt.
     */
    buildPrompt(type, context) {
        const userProfile = this.storageManager.getFromLocalStorage('userProfile');
        const userName = userProfile?.basicInfo?.name || 'user';
        
        switch(type) {
            case 'motivation':
                return `Berikan saya kutipan motivasi singkat dan kuat dalam Bahasa Indonesia untuk ${userName} yang sedang dalam perjalanan pengembangan diri.`;
            // Add other prompt types here...
            default:
                return `Tolong berikan respons yang membantu untuk: ${type}`;
        }
    }

    /**
     * Calls the OpenRouter AI API.
     * @param {string} prompt - The prompt to send to the AI.
     * @returns {Promise<string>} - The content of the AI's response.
     */
    async callAI(prompt) {
        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
            })
        });

        if (!response.ok) {
            throw new Error(`AI API error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    /**
     * Provides a fallback response when the AI is unavailable.
     * @param {string} type - The type of fallback response to get.
     * @returns {string} - A predefined fallback response.
     */
    getFallbackResponse(type) {
        const motivations = [
            'Perjalanan seribu mil dimulai dengan satu langkah.',
            'Disiplin adalah jembatan antara tujuan dan pencapaian.',
            'Jadilah lebih baik dari dirimu yang kemarin.'
        ];
        if (type === 'motivation') {
            return motivations[Math.floor(Math.random() * motivations.length)];
        }
        return 'Maaf, coba lagi nanti.';
    }

    /**
     * Updates the AI quota display in the UI.
     */
    updateQuotaUI() {
        const quotaText = document.getElementById('ai-quota-text');
        const quotaBar = document.getElementById('ai-quota-bar');
        if (quotaText && quotaBar) {
            quotaText.textContent = `${this.requestCount}/${this.dailyQuota}`;
            const percentage = (this.requestCount / this.dailyQuota) * 100;
            quotaBar.style.width = `${percentage}%`;
        }
    }
}
