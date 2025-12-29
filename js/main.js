/**
 * Main Application Logic
 * Handles initialization, DOMContentLoaded, and core functionality orchestration.
 */

// Global variable to hold the application state
let userProfile = null;

// --- UTILITY FUNCTIONS ---

/**
 * Displays a visible error message to the user.
 * @param {string} message - The error message to display.
 */
function showFatalError(message) {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.innerHTML = `
            <div class="text-center text-white p-4">
                <h2 class="text-xl font-poppins font-semibold text-red-400 mb-2">Error Kritis</h2>
                <p>${message}</p>
                <p class="mt-4 text-sm">Silakan coba muat ulang halaman atau hubungi dukungan jika masalah berlanjut.</p>
            </div>
        `;
        loadingScreen.style.opacity = '1';
        loadingScreen.style.display = 'flex';
    } else {
        alert(`FATAL ERROR: ${message}`);
    }
}

/**
 * Hides the initial loading screen.
 */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

// --- CORE APPLICATION LOGIC ---

/**
 * The main entry point for the application.
 * This function is called once the DOM is fully loaded.
 */
async function main() {
    // 1. Instantiate all managers centrally
    const storageManager = new StorageManager();
    const gamificationManager = new GamificationManager(storageManager);
    const prayerTimesManager = new PrayerTimesManager(storageManager);
    const weatherManager = new WeatherManager(storageManager);
    const aiIntegration = new AiIntegration(storageManager);
    const notificationManager = new NotificationManager(storageManager);

    // Make managers globally available
    window.storageManager = storageManager;
    window.gamificationManager = gamificationManager;
    window.prayerTimesManager = prayerTimesManager;
    window.weatherManager = weatherManager;
    window.aiIntegration = aiIntegration;
    window.notificationManager = notificationManager;


    // 2. Perform critical initializations
    try {
        await storageManager.initIndexedDB();
        await gamificationManager.init();
    } catch (error) {
        console.error('CRITICAL: Failed to initialize core managers.', error);
        showFatalError('Gagal memuat komponen inti. Aplikasi tidak dapat berjalan.');
        return; // Halt execution
    }

    // 3. Check onboarding status
    if (!storageManager.getFromLocalStorage('onboardingComplete')) {
        if (!window.location.pathname.endsWith('onboarding.html')) {
            window.location.href = 'onboarding.html';
        }
        return;
    }

    // 4. Load user profile
    userProfile = storageManager.getFromLocalStorage('userProfile');
    if (!userProfile) {
        console.error('CRITICAL: Onboarding complete but no user profile found.');
        storageManager.removeFromLocalStorage('onboardingComplete');
        window.location.href = 'onboarding.html';
        return;
    }

    // 5. Initialize UI and load all dashboard data
    initializeUI();
    setupEventListeners();
    await loadDashboardData();
    await initializeSecondaryManagers();


    // 6. Hide loading screen
    hideLoadingScreen();
}

/**
 * Initializes secondary managers that are not critical for the initial page load.
 */
async function initializeSecondaryManagers() {
    try {
        await window.prayerTimesManager.init();
        await window.weatherManager.init();
        await window.aiIntegration.init();
        await window.notificationManager.init();
    } catch(e) {
        console.warn("One or more secondary managers failed to initialize.", e);
    }
}


/**
 * Initializes the main user interface components.
 */
function initializeUI() {
    updateGreeting();
    updateCurrentDate();
}

/**
 * Sets up all necessary event listeners for the dashboard.
 */
function setupEventListeners() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-menu-overlay');
    if (mobileMenuBtn && sidebar && overlay) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        });
    }

    const panicButton = document.getElementById('panic-button');
    const panicModal = document.getElementById('panic-modal');
    const closePanicModal = document.getElementById('close-panic-modal');
    if (panicButton && panicModal) {
        panicButton.addEventListener('click', () => panicModal.classList.remove('hidden'));
    }
    if (closePanicModal && panicModal) {
        closePanicModal.addEventListener('click', () => panicModal.classList.add('hidden'));
    }

    document.getElementById('report-trigger')?.addEventListener('click', () => handlePanicAction('report'));
    document.getElementById('get-motivation')?.addEventListener('click', () => handlePanicAction('motivation'));
    document.getElementById('redirect-positive')?.addEventListener('click', () => handlePanicAction('redirect'));
}

/**
 * Asynchronously loads all data required for the dashboard.
 */
async function loadDashboardData() {
    updateUserStats(); // Dependent on userProfile, so call it first.
    await loadTodayHabits();
    await loadStreakData();
    await loadFinanceHealth();
    await loadMentalHealth();
    await loadProgressChart();
}

/**
 * Updates the user's level, XP, and title on the dashboard.
 */
function updateUserStats() {
    if (!userProfile || !userProfile.stats) return;
    const { level = 1, xp = 0 } = userProfile.stats;
    const nextLevelXP = window.gamificationManager.calculateNextLevelXP(level);
    const xpForCurrentLevel = xp - window.gamificationManager.getXPForLevel(level);
    const xpProgress = (xpForCurrentLevel / nextLevelXP) * 100;

    document.getElementById('user-level').textContent = `Level ${level}`;
    document.getElementById('user-xp').textContent = xp.toLocaleString();
    document.getElementById('xp-progress-text').textContent = `${xpForCurrentLevel}/${nextLevelXP}`;
    document.getElementById('xp-progress-bar').style.width = `${xpProgress}%`;

    let title = 'Pemula';
    if (level >= 31) title = 'Pria Top 1%';
    else if (level >= 16) title = 'Elite';
    else if (level >= 6) title = 'Pejuang';
    document.getElementById('user-title').textContent = title;
}

/**
 * Loads and displays today's habits and their completion status.
 */
async function loadTodayHabits() {
    const habitsContainer = document.getElementById('today-habits');
    if (!habitsContainer) return;
    try {
        const today = new Date().toISOString().split('T')[0];
        const habits = await window.storageManager.getAllFromDB('habitsDB', 'dailyHabits');
        const logs = await window.storageManager.getAllFromDB('habitsDB', 'habitLogs');
        const todayLogs = logs.filter(log => log.date === today);

        document.getElementById('habits-today').textContent = `${todayLogs.filter(l => l.status === 'completed').length}/${habits.length}`;

        if (habits.length === 0) {
            habitsContainer.innerHTML = `<div class="text-center py-8 text-gray-500"><p>Belum ada habits. <a href="habits.html" class="text-secondary">Tambah sekarang</a>.</p></div>`;
            return;
        }

        habitsContainer.innerHTML = '';
        habits.slice(0, 5).forEach(habit => {
            const isCompleted = todayLogs.some(log => log.habitId === habit.id && log.status === 'completed');
            const habitEl = document.createElement('div');
            habitEl.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg';
            habitEl.innerHTML = `
                <div class="flex items-center">
                    <div class="text-2xl mr-3">${habit.icon}</div>
                    <div>
                        <div class="font-medium text-gray-900">${habit.name}</div>
                        <div class="text-sm text-gray-500">${habit.xpValue || 10} XP</div>
                    </div>
                </div>
                <button class="habit-toggle w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-emerald-400'}" data-habit-id="${habit.id}">
                    ${isCompleted ? '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>' : ''}
                </button>
            `;
            habitEl.querySelector('.habit-toggle').addEventListener('click', () => toggleHabit(habit, !isCompleted));
            habitsContainer.appendChild(habitEl);
        });
    } catch (e) {
        console.error("Error loading habits:", e);
        habitsContainer.innerHTML = `<p class="text-red-500">Gagal memuat habits.</p>`;
    }
}

async function toggleHabit(habit, completed) {
    const today = new Date().toISOString().split('T')[0];
    await window.storageManager.saveToDB('habitsDB', 'habitLogs', {
        habitId: habit.id,
        date: today,
        status: completed ? 'completed' : 'pending',
        timestamp: new Date().toISOString()
    });
    if (completed) {
        await window.gamificationManager.addXP(habit.xpValue || 10, `Habit: ${habit.name}`);
    } else {
        // Note: Logic for removing XP is complex (e.g., what if level down?).
        // For now, we don't remove XP on untoggle to avoid complexity.
    }
    await loadDashboardData(); // Reload all data to reflect changes
}

async function loadStreakData() {
    const bestStreakEl = document.getElementById('best-streak');
    try {
        const streaks = await window.storageManager.getAllFromDB('habitsDB', 'streaks');
        const bestStreak = streaks.reduce((max, s) => Math.max(max, s.bestStreak || 0), 0);
        bestStreakEl.textContent = `${bestStreak} hari`;
    } catch (e) {
        console.error("Error loading streak data:", e);
        bestStreakEl.textContent = 'Error';
    }
}

async function loadFinanceHealth() {
    const financeHealthEl = document.getElementById('finance-health');
    try {
        const transactions = await window.storageManager.getAllFromDB('financeDB', 'transactions');
        const month = new Date().toISOString().slice(0, 7);
        const monthTxs = transactions.filter(t => t.date?.startsWith(month));
        const income = monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = monthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
        let healthScore = savingsRate < 0 ? 20 : 50 + (savingsRate / 2); // Simple score
        financeHealthEl.textContent = `${Math.round(Math.max(0, Math.min(100, healthScore)))}%`;
    } catch (e) {
        console.error("Error loading finance health:", e);
        financeHealthEl.textContent = 'Error';
    }
}

async function loadMentalHealth() {
    const mentalHealthEl = document.getElementById('mental-health');
    try {
        const moodLogs = await window.storageManager.getAllFromDB('mentalDB', 'moodLogs');
        if (moodLogs.length > 0) {
            const latestLog = moodLogs.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            const healthScore = (latestLog.mood / 5) * 100; // Mood is 1-5
            mentalHealthEl.textContent = `${Math.round(healthScore)}%`;
        } else {
            mentalHealthEl.textContent = '--';
        }
    } catch (e) {
        console.error("Error loading mental health:", e);
        mentalHealthEl.textContent = 'Error';
    }
}

async function getXPHistory(days) {
    const labels = [];
    const data = [];
    const habitLogs = await window.storageManager.getAllFromDB('habitsDB', 'habitLogs');
    const habits = await window.storageManager.getAllFromDB('habitsDB', 'dailyHabits');
    const habitMap = new Map(habits.map(h => [h.id, h.xpValue || 10]));

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }));
        const dayXP = habitLogs
            .filter(log => log.date === dateStr && log.status === 'completed')
            .reduce((sum, log) => sum + (habitMap.get(log.habitId) || 10), 0);
        data.push(dayXP);
    }
    return { labels, data };
}

async function loadProgressChart() {
    const ctx = document.getElementById('progress-chart');
    if (!ctx || typeof Chart === 'undefined') return;
    try {
        const history = await getXPHistory(7);
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: history.labels,
                datasets: [{
                    label: 'XP Harian',
                    data: history.data,
                    borderColor: '#1E40AF',
                    backgroundColor: 'rgba(30, 64, 175, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    } catch (e) {
        console.error("Error loading progress chart:", e);
    }
}


/**
 * Handles actions triggered from the panic modal.
 */
async function handlePanicAction(action) {
    const modal = document.getElementById('panic-modal');
    if (modal) modal.classList.add('hidden');
    switch (action) {
        case 'report':
            await window.storageManager.saveToDB('systemDB', 'pornReports', {
                timestamp: new Date().toISOString(),
                context: 'panic_button'
            });
            alert('Trigger dilaporkan. Tarik napas dalam, alihkan perhatian Anda. Anda lebih kuat dari ini.');
            break;
        case 'motivation':
            // In a real scenario, this could fetch from a list or use the AI integration
            const motivations = [
                'Disiplin adalah jembatan antara tujuan dan pencapaian.',
                'Setiap hari adalah kesempatan baru untuk menjadi 1% lebih baik.',
                'Kekuatan sejati tidak datang dari apa yang bisa Anda lakukan, tetapi dari mengatasi hal yang Anda pikir tidak bisa.',
            ];
            alert(motivations[Math.floor(Math.random() * motivations.length)]);
            break;
        case 'redirect':
            const positiveUrls = ['https://www.ted.com/talks', 'https://www.khanacademy.org', 'https://www.youtube.com/c/IslamiPositif'];
            window.open(positiveUrls[Math.floor(Math.random() * positiveUrls.length)], '_blank');
            break;
    }
}

/**
 * Updates the greeting message based on the current time.
 */
function updateGreeting() {
    const hour = new Date().getHours();
    const name = userProfile?.basicInfo?.name || 'Pejuang';
    let greeting = 'Selamat Pagi';
    if (hour >= 18) greeting = 'Selamat Malam';
    else if (hour >= 15) greeting = 'Selamat Sore';
    else if (hour >= 12) greeting = 'Selamat Siang';
    document.getElementById('greeting-text').textContent = `${greeting}, ${name}!`;
}

/**
 * Updates the current date display.
 */
function updateCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = now.toLocaleDateString('id-ID', options);
}


// --- APPLICATION ENTRY POINT ---
document.addEventListener('DOMContentLoaded', main);
