/**
 * Onboarding Logic - Multi-step form handler
 * Manages the onboarding flow and user profile creation
 */

class OnboardingManager {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 6;
        this.userProfile = {
            id: this.generateUserId(),
            basicInfo: {},
            stats: {
                iq: 100,
                discipline: 50,
                mentalHealth: 75,
                financialHealth: 60,
                xp: 0,
                level: 1,
                totalTasksCompleted: 0
            },
            preferences: {
                prayerEnabled: false,
                darkMode: false,
                notificationTime: '09:00'
            },
            interests: [],
            conditions: {},
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString()
        };
        this.locationData = null;
        this.init();
    }

    /**
     * Initialize onboarding
     */
    init() {
        this.setupEventListeners();
        this.setMaxBirthDate();
        this.updateProgressBar();
    }

    /**
     * Generate unique user ID
     */
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Interest selection
        document.querySelectorAll('.interest-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const checkbox = option.querySelector('input[type="checkbox"]');
                const checkIcon = option.querySelector('svg');
                const border = option;
                
                checkbox.checked = !checkbox.checked;
                
                if (checkbox.checked) {
                    border.classList.add('border-blue-500', 'bg-blue-50');
                    checkIcon.classList.remove('hidden');
                    border.querySelector('.w-6.h-6').classList.add('bg-blue-500', 'border-blue-500');
                } else {
                    border.classList.remove('border-blue-500', 'bg-blue-50');
                    checkIcon.classList.add('hidden');
                    border.querySelector('.w-6.h-6').classList.remove('bg-blue-500', 'border-blue-500');
                }
            });
        });

        // Condition selection (radio buttons)
        document.querySelectorAll('.condition-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const radio = option.querySelector('input[type="radio"]');
                const groupName = radio.name;
                
                // Clear all options in the same group
                document.querySelectorAll(`input[name="${groupName}"]`).forEach(r => {
                    const opt = r.closest('.condition-option');
                    const dot = opt.querySelector('.w-4.h-4');
                    opt.classList.remove('border-blue-500', 'bg-blue-50');
                    dot.classList.remove('bg-blue-500', 'border-blue-500');
                    dot.innerHTML = '';
                });
                
                // Select current option
                radio.checked = true;
                option.classList.add('border-blue-500', 'bg-blue-50');
                const dot = option.querySelector('.w-4.h-6');
                dot.classList.add('bg-blue-500', 'border-blue-500');
                dot.innerHTML = '<div class="w-2 h-2 bg-white rounded-full mx-auto"></div>';
            });
        });

        // Location button
        const getLocationBtn = document.getElementById('get-location-btn');
        if (getLocationBtn) {
            getLocationBtn.addEventListener('click', () => this.getLocation());
        }
    }

    /**
     * Set maximum birth date (18 years ago)
     */
    setMaxBirthDate() {
        const birthDateInput = document.getElementById('birth-date');
        if (birthDateInput) {
            const maxDate = new Date();
            maxDate.setFullYear(maxDate.getFullYear() - 18);
            birthDateInput.max = maxDate.toISOString().split('T')[0];
        }
    }

    /**
     * Update progress bar
     */
    updateProgressBar() {
        const progress = (this.currentStep / this.totalSteps) * 100;
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }

        // Update step indicators
        document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
            if (index < this.currentStep) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });
    }

    /**
     * Get user location
     */
    async getLocation() {
        const statusDiv = document.getElementById('location-status');
        const loadingDiv = document.getElementById('location-loading');
        const resultDiv = document.getElementById('location-result');
        const manualDiv = document.getElementById('manual-location');
        const nextBtn = document.getElementById('location-next-btn');

        // Show loading
        statusDiv.querySelector('button').style.display = 'none';
        loadingDiv.classList.remove('hidden');

        if (!navigator.geolocation) {
            this.showLocationError('Geolocation tidak didukung di browser ini');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    
                    // Reverse geocode using Nominatim API
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=id`
                    );
                    
                    if (!response.ok) throw new Error('Failed to reverse geocode');
                    
                    const data = await response.json();
                    const city = data.address?.city || data.address?.town || data.address?.village || 'Unknown';
                    
                    this.locationData = {
                        lat: latitude,
                        lon: longitude,
                        city: city
                    };

                    // Show success
                    loadingDiv.classList.add('hidden');
                    resultDiv.classList.remove('hidden');
                    document.getElementById('location-name').textContent = `${city} (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
                    
                    // Enable next button
                    nextBtn.classList.remove('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
                    nextBtn.classList.add('bg-secondary', 'hover:bg-blue-700', 'text-white');
                    nextBtn.disabled = false;
                    nextBtn.onclick = () => nextStep();

                } catch (error) {
                    console.error('Location error:', error);
                    this.showLocationError('Gagal mendapatkan detail lokasi');
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                this.showLocationError('Gagal mendapatkan lokasi. Silakan masukkan manual.');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    }

    /**
     * Show location error and manual input
     */
    showLocationError(message) {
        const statusDiv = document.getElementById('location-status');
        const loadingDiv = document.getElementById('location-loading');
        const manualDiv = document.getElementById('manual-location');

        statusDiv.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div class="flex items-center">
                    <svg class="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <p class="text-red-700">${message}</p>
                </div>
            </div>
        `;
        loadingDiv.classList.add('hidden');
        manualDiv.classList.remove('hidden');
    }

    /**
     * Search city manually
     */
    async searchCity() {
        const cityInput = document.getElementById('city-input');
        const city = cityInput.value.trim();
        
        if (!city) {
            alert('Masukkan nama kota');
            return;
        }

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&accept-language=id&limit=1`
            );
            
            if (!response.ok) throw new Error('Failed to search city');
            
            const data = await response.json();
            
            if (data.length > 0) {
                const location = data[0];
                this.locationData = {
                    lat: parseFloat(location.lat),
                    lon: parseFloat(location.lon),
                    city: location.display_name.split(',')[0]
                };

                // Show success and enable next
                document.getElementById('location-result').classList.remove('hidden');
                document.getElementById('location-name').textContent = `${this.locationData.city} (${this.locationData.lat.toFixed(2)}, ${this.locationData.lon.toFixed(2)})`;
                
                const nextBtn = document.getElementById('location-next-btn');
                nextBtn.classList.remove('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
                nextBtn.classList.add('bg-secondary', 'hover:bg-blue-700', 'text-white');
                nextBtn.disabled = false;
                nextBtn.onclick = () => nextStep();
            } else {
                alert('Kota tidak ditemukan. Coba nama lain.');
            }
        } catch (error) {
            console.error('City search error:', error);
            alert('Gagal mencari kota. Coba lagi.');
        }
    }

    /**
     * Validate current step
     */
    validateStep(step) {
        switch (step) {
            case 2:
                const name = document.getElementById('full-name').value.trim();
                const birthPlace = document.getElementById('birth-place').value.trim();
                const birthDate = document.getElementById('birth-date').value;
                
                if (!name || name.length < 3) {
                    document.getElementById('name-error').classList.remove('hidden');
                    return false;
                }
                
                if (!birthPlace || !birthDate) {
                    alert('Mohon lengkapi tempat dan tanggal lahir');
                    return false;
                }
                
                // Save basic info
                this.userProfile.basicInfo = {
                    name: name,
                    birthPlace: birthPlace,
                    birthDate: birthDate,
                    religion: document.getElementById('religion').value || null
                };
                
                // Calculate age and zodiac
                const birth = new Date(birthDate);
                const today = new Date();
                const age = today.getFullYear() - birth.getFullYear();
                this.userProfile.basicInfo.age = age;
                this.userProfile.basicInfo.zodiac = this.getZodiac(birth);
                this.userProfile.basicInfo.generation = this.getGeneration(birth);
                
                return true;
                
            case 3:
                if (!this.locationData) {
                    alert('Mohon tentukan lokasi Anda');
                    return false;
                }
                this.userProfile.basicInfo.location = this.locationData;
                
                // Set prayer enabled if Muslim
                if (this.userProfile.basicInfo.religion === 'islam') {
                    this.userProfile.preferences.prayerEnabled = true;
                }
                
                return true;
                
            case 4:
                const interests = Array.from(document.querySelectorAll('input[name="interests"]:checked'))
                    .map(cb => cb.value);
                this.userProfile.interests = interests;
                return true;
                
            case 5:
                const routine = document.querySelector('input[name="routine"]:checked')?.value;
                const finance = document.querySelector('input[name="finance"]:checked')?.value;
                const mental = document.querySelector('input[name="mental"]:checked')?.value;
                
                if (!routine || !finance || !mental) {
                    alert('Mohon lengkapi semua pertanyaan');
                    return false;
                }
                
                this.userProfile.conditions = { routine, finance, mental };
                
                // Adjust initial stats based on conditions
                if (finance === 'struggling') {
                    this.userProfile.stats.financialHealth = 30;
                } else if (finance === 'manageable') {
                    this.userProfile.stats.financialHealth = 60;
                } else {
                    this.userProfile.stats.financialHealth = 80;
                }
                
                if (mental === 'need-support') {
                    this.userProfile.stats.mentalHealth = 40;
                } else if (mental === 'neutral') {
                    this.userProfile.stats.mentalHealth = 60;
                } else {
                    this.userProfile.stats.mentalHealth = 85;
                }
                
                return true;
                
            case 6:
                const addictionSupport = document.getElementById('addiction-support').checked;
                const mentalHealthSupport = document.getElementById('mental-health-support').checked;
                
                this.userProfile.supportNeeds = {
                    addictionSupport,
                    mentalHealthSupport
                };
                
                return true;
                
            default:
                return true;
        }
    }

    /**
     * Get zodiac sign from date
     */
    getZodiac(date) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return 'Aquarius';
        if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return 'Pisces';
        if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return 'Aries';
        if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return 'Taurus';
        if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return 'Gemini';
        if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return 'Cancer';
        if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return 'Leo';
        if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return 'Virgo';
        if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return 'Libra';
        if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return 'Scorpio';
        if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) return 'Sagittarius';
        if ((month == 12 && day >= 22) || (month == 1 && day <= 19)) return 'Capricorn';
        
        return 'Unknown';
    }

    /**
     * Get generation from birth date
     */
    getGeneration(date) {
        const year = date.getFullYear();
        
        if (year >= 1997) return 'Gen Z';
        if (year >= 1981) return 'Millennial';
        if (year >= 1965) return 'Gen X';
        if (year >= 1946) return 'Boomer';
        
        return 'Pre-Boomer';
    }

    /**
     * Complete onboarding and save profile
     */
    async completeOnboarding() {
        if (!this.validateStep(6)) return;

        try {
            // Save user profile
            window.storageManager.saveToLocalStorage('userProfile', this.userProfile);
            
            // Initialize default data based on interests
            await this.initializeDefaultData();
            
            // Mark onboarding as complete
            window.storageManager.saveToLocalStorage('onboardingComplete', true);
            
            // Redirect to main app
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error('Failed to complete onboarding:', error);
            alert('Gagal menyimpan data. Coba lagi.');
        }
    }

    /**
     * Initialize default data based on user selections
     */
    async initializeDefaultData() {
        // Initialize habits based on interests
        const defaultHabits = [];
        
        if (this.userProfile.interests.includes('fitness')) {
            defaultHabits.push({
                name: 'Olahraga 30 menit',
                category: 'physical',
                difficulty: 'medium',
                icon: '💪',
                description: 'Olahraga ringan selama 30 menit',
                targetTime: '07:00',
                xpValue: 25,
                createdAt: new Date().toISOString()
            });
        }
        
        if (this.userProfile.interests.includes('mental')) {
            defaultHabits.push({
                name: 'Meditasi 10 menit',
                category: 'mental',
                difficulty: 'easy',
                icon: '🧘',
                description: 'Meditasi atau mindfulness',
                targetTime: '06:00',
                xpValue: 15,
                createdAt: new Date().toISOString()
            });
        }
        
        if (this.userProfile.interests.includes('finance')) {
            defaultHabits.push({
                name: 'Review keuangan',
                category: 'financial',
                difficulty: 'easy',
                icon: '💰',
                description: 'Cek dan catat pengeluaran',
                targetTime: '20:00',
                xpValue: 20,
                createdAt: new Date().toISOString()
            });
        }

        // Save default habits
        for (const habit of defaultHabits) {
            await window.storageManager.saveToDB('habitsDB', 'dailyHabits', habit);
        }

        // Initialize mental health baseline
        const moodLog = {
            date: new Date().toISOString().split('T')[0],
            mood: 7,
            note: 'Initial assessment',
            timestamp: new Date().toISOString()
        };
        await window.storageManager.saveToDB('mentalDB', 'moodLogs', moodLog);

        // Initialize clean streak if addiction support is enabled
        if (this.userProfile.supportNeeds?.addictionSupport) {
            await window.storageManager.saveToDB('systemDB', 'cleanStreak', {
                id: 'main',
                currentStreak: 0,
                bestStreak: 0,
                lastReport: null,
                startDate: new Date().toISOString()
            });
        }
    }
}

// Global functions for button clicks
function nextStep() {
    if (window.onboardingManager.validateStep(window.onboardingManager.currentStep)) {
        window.onboardingManager.currentStep++;
        
        // Hide current step
        document.getElementById(`step-${window.onboardingManager.currentStep - 1}`).classList.add('hidden');
        
        // Show next step
        document.getElementById(`step-${window.onboardingManager.currentStep}`).classList.remove('hidden');
        
        // Update progress
        window.onboardingManager.updateProgressBar();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function prevStep() {
    if (window.onboardingManager.currentStep > 1) {
        // Hide current step
        document.getElementById(`step-${window.onboardingManager.currentStep}`).classList.add('hidden');
        
        // Show previous step
        window.onboardingManager.currentStep--;
        document.getElementById(`step-${window.onboardingManager.currentStep}`).classList.remove('hidden');
        
        // Update progress
        window.onboardingManager.updateProgressBar();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function searchCity() {
    window.onboardingManager.searchCity();
}

function completeOnboarding() {
    window.onboardingManager.completeOnboarding();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if onboarding is already complete
    const onboardingComplete = window.storageManager?.getFromLocalStorage('onboardingComplete');
    if (onboardingComplete) {
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize onboarding manager
    window.onboardingManager = new OnboardingManager();
});