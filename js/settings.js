/**
 * Settings Manager - Application settings and data management
 * Handles user preferences, data backup/restore, and app configuration
 */

class SettingsManager {
    constructor() {
        this.userProfile = null;
        this.preferences = {};
        this.init();
    }

    /**
     * Initialize settings manager
     */
    async init() {
        try {
            await this.loadUserData();
            this.setupEventListeners();
            this.updateUI();
            this.checkServiceWorker();
        } catch (error) {
            console.error('Error initializing settings:', error);
        }
    }

    /**
     * Load user data
     */
    async loadUserData() {
        try {
            this.userProfile = window.storageManager.getFromLocalStorage('userProfile');
            this.preferences = window.storageManager.getFromLocalStorage('preferences') || {
                darkMode: false,
                prayerEnabled: false,
                habitReminders: true,
                notificationTime: '09:00'
            };
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Mobile menu
        document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        document.getElementById('mobile-menu-overlay')?.addEventListener('click', () => {
            this.closeMobileMenu();
        });

        // Profile actions
        document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
            this.editProfile();
        });

        document.getElementById('reset-onboarding-btn')?.addEventListener('click', () => {
            this.resetOnboarding();
        });

        // Preference toggles
        document.getElementById('dark-mode-toggle')?.addEventListener('change', (e) => {
            this.toggleDarkMode(e.target.checked);
        });

        document.getElementById('prayer-notifications-toggle')?.addEventListener('change', (e) => {
            this.togglePrayerNotifications(e.target.checked);
        });

        document.getElementById('habit-reminders-toggle')?.addEventListener('change', (e) => {
            this.toggleHabitReminders(e.target.checked);
        });

        document.getElementById('notification-time')?.addEventListener('change', (e) => {
            this.setNotificationTime(e.target.value);
        });

        // Data management
        document.getElementById('backup-data-btn')?.addEventListener('click', () => {
            this.backupData();
        });

        document.getElementById('restore-data-btn')?.addEventListener('click', () => {
            this.triggerRestore();
        });

        document.getElementById('restore-file-input')?.addEventListener('change', (e) => {
            this.restoreData(e.target.files[0]);
        });

        document.getElementById('export-csv-btn')?.addEventListener('click', () => {
            this.exportCSV();
        });

        // Danger zone
        document.getElementById('clear-all-data-btn')?.addEventListener('click', () => {
            this.confirmClearAllData();
        });

        // Confirmation modal
        document.getElementById('confirmation-cancel')?.addEventListener('click', () => {
            this.hideConfirmationModal();
        });
    }

    /**
     * Toggle mobile menu
     */
    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-menu-overlay');
        
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    }

    /**
     * Close mobile menu
     */
    closeMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-menu-overlay');
        
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }

    /**
     * Update UI with current data
     */
    updateUI() {
        this.renderProfileInfo();
        this.renderPreferences();
        this.renderAppInfo();
    }

    /**
     * Render profile information
     */
    renderProfileInfo() {
        const container = document.getElementById('user-profile-info');
        if (!container || !this.userProfile) return;

        const { basicInfo, stats, createdAt } = this.userProfile;
        
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-500">Nama</label>
                    <p class="text-lg font-medium text-gray-900">${basicInfo?.name || 'Tidak diatur'}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-500">Usia</label>
                    <p class="text-lg font-medium text-gray-900">${basicInfo?.age || '-'} tahun</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-500">Lokasi</label>
                    <p class="text-lg font-medium text-gray-900">${basicInfo?.location?.city || 'Tidak diatur'}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-500">Bergabung</label>
                    <p class="text-lg font-medium text-gray-900">${createdAt ? new Date(createdAt).toLocaleDateString('id-ID') : '-'}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-500">Level</label>
                    <p class="text-lg font-medium text-gray-900">Level ${stats?.level || 1}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-500">Total XP</label>
                    <p class="text-lg font-medium text-gray-900">${stats?.xp?.toLocaleString() || 0} XP</p>
                </div>
            </div>
            <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="text-center p-3 bg-blue-50 rounded-lg">
                    <div class="text-2xl font-bold text-blue-600">${stats?.discipline || 50}</div>
                    <div class="text-sm text-blue-700">Disiplin</div>
                </div>
                <div class="text-center p-3 bg-emerald-50 rounded-lg">
                    <div class="text-2xl font-bold text-emerald-600">${stats?.mentalHealth || 75}</div>
                    <div class="text-sm text-emerald-700">Kesehatan Mental</div>
                </div>
                <div class="text-center p-3 bg-amber-50 rounded-lg">
                    <div class="text-2xl font-bold text-amber-600">${stats?.financialHealth || 60}</div>
                    <div class="text-sm text-amber-700">Kesehatan Finansial</div>
                </div>
            </div>
        `;
    }

    /**
     * Render preferences
     */
    renderPreferences() {
        // Dark mode toggle
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.checked = this.preferences.darkMode;
        }

        // Prayer notifications toggle
        const prayerToggle = document.getElementById('prayer-notifications-toggle');
        if (prayerToggle) {
            prayerToggle.checked = this.preferences.prayerEnabled;
        }

        // Habit reminders toggle
        const habitToggle = document.getElementById('habit-reminders-toggle');
        if (habitToggle) {
            habitToggle.checked = this.preferences.habitReminders;
        }

        // Notification time
        const notificationTime = document.getElementById('notification-time');
        if (notificationTime) {
            notificationTime.value = this.preferences.notificationTime;
        }
    }

    /**
     * Render app info
     */
    renderAppInfo() {
        document.getElementById('app-version').textContent = 'v1.0.0';
        document.getElementById('build-date').textContent = new Date().toLocaleDateString('id-ID');
        document.getElementById('platform').textContent = navigator.platform || 'Web PWA';
    }

    /**
     * Check service worker status
     */
    async checkServiceWorker() {
        const statusElement = document.getElementById('sw-status');
        if (!statusElement) return;

        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    statusElement.textContent = 'Aktif';
                    statusElement.className = 'text-emerald-600';
                } else {
                    statusElement.textContent = 'Tidak Aktif';
                    statusElement.className = 'text-red-600';
                }
            } catch (error) {
                statusElement.textContent = 'Error';
                statusElement.className = 'text-red-600';
            }
        } else {
            statusElement.textContent = 'Tidak Didukung';
            statusElement.className = 'text-gray-500';
        }
    }

    /**
     * Edit profile
     */
    editProfile() {
        // This would open an edit profile modal or redirect to onboarding
        if (window.notificationManager) {
            window.notificationManager.showInfoMessage('Fitur edit profil akan segera hadir');
        }
    }

    /**
     * Reset onboarding
     */
    async resetOnboarding() {
        const confirmed = await this.showConfirmationModal(
            'Reset Onboarding',
            'Ini akan mengarahkan Anda ke halaman onboarding untuk mengupdate profil. Data Anda tetap akan disimpan.'
        );

        if (confirmed) {
            window.location.href = 'onboarding.html';
        }
    }

    /**
     * Toggle dark mode
     */
    toggleDarkMode(enabled) {
        this.preferences.darkMode = enabled;
        window.storageManager.saveToLocalStorage('preferences', this.preferences);

        // Apply dark mode (simplified implementation)
        if (enabled) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        if (window.notificationManager) {
            window.notificationManager.showSuccessMessage(
                enabled ? 'Mode gelap diaktifkan' : 'Mode terang diaktifkan'
            );
        }
    }

    /**
     * Toggle prayer notifications
     */
    togglePrayerNotifications(enabled) {
        this.preferences.prayerEnabled = enabled;
        window.storageManager.saveToLocalStorage('preferences', this.preferences);

        // Update user profile if exists
        if (this.userProfile) {
            this.userProfile.preferences.prayerEnabled = enabled;
            window.storageManager.saveToLocalStorage('userProfile', this.userProfile);
        }

        if (window.notificationManager) {
            window.notificationManager.showSuccessMessage(
                enabled ? 'Notifikasi shalat diaktifkan' : 'Notifikasi shalat dinonaktifkan'
            );
        }
    }

    /**
     * Toggle habit reminders
     */
    toggleHabitReminders(enabled) {
        this.preferences.habitReminders = enabled;
        window.storageManager.saveToLocalStorage('preferences', this.preferences);

        if (window.notificationManager) {
            window.notificationManager.showSuccessMessage(
                enabled ? 'Reminder habit diaktifkan' : 'Reminder habit dinonaktifkan'
            );
        }
    }

    /**
     * Set notification time
     */
    setNotificationTime(time) {
        this.preferences.notificationTime = time;
        window.storageManager.saveToLocalStorage('preferences', this.preferences);

        if (window.notificationManager) {
            window.notificationManager.showSuccessMessage('Waktu notifikasi diupdate');
        }
    }

    /**
     * Backup data
     */
    async backupData() {
        try {
            document.getElementById('loading-screen').classList.remove('hidden');
            
            await window.storageManager.backup();
            
            if (window.notificationManager) {
                window.notificationManager.showSuccessMessage('Backup berhasil diunduh');
            }
            
        } catch (error) {
            console.error('Error backing up data:', error);
            if (window.notificationManager) {
                window.notificationManager.showErrorMessage('Gagal melakukan backup');
            }
        } finally {
            document.getElementById('loading-screen').classList.add('hidden');
        }
    }

    /**
     * Trigger restore file input
     */
    triggerRestore() {
        document.getElementById('restore-file-input').click();
    }

    /**
     * Restore data
     */
    async restoreData(file) {
        if (!file) return;

        try {
            document.getElementById('loading-screen').classList.remove('hidden');
            
            const confirmed = await this.showConfirmationModal(
                'Restore Data',
                'Ini akan mengganti semua data Anda dengan data dari file backup. Yakin ingin melanjutkan?'
            );

            if (!confirmed) {
                document.getElementById('loading-screen').classList.add('hidden');
                return;
            }

            await window.storageManager.restoreData(file);
            
            if (window.notificationManager) {
                window.notificationManager.showSuccessMessage('Data berhasil direstore');
            }
            
            // Reload page to reflect changes
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
        } catch (error) {
            console.error('Error restoring data:', error);
            if (window.notificationManager) {
                window.notificationManager.showErrorMessage('Gagal merestore data');
            }
        } finally {
            document.getElementById('loading-screen').classList.add('hidden');
        }
    }

    /**
     * Export to CSV
     */
    async exportCSV() {
        try {
            document.getElementById('loading-screen').classList.remove('hidden');
            
            // Get habit data
            const habits = await window.storageManager.getAllFromDB('habitsDB', 'dailyHabits');
            const logs = await window.storageManager.getAllFromDB('habitsDB', 'habitLogs');
            
            // Create CSV content
            let csvContent = 'data:text/csv;charset=utf-8,';
            
            // Habits header
            csvContent += 'Habits\n';
            csvContent += 'ID,Name,Description,Category,Difficulty,XP Value,Icon,Target Time,Created At\n';
            
            habits.forEach(habit => {
                csvContent += `${habit.id},"${habit.name}","${habit.description || ''}",${habit.category},${habit.difficulty},${habit.xpValue},${habit.icon},${habit.targetTime || ''},${habit.createdAt}\n`;
            });
            
            // Logs header
            csvContent += '\n\nLogs\n';
            csvContent += 'ID,Habit ID,Date,Status,Timestamp\n';
            
            logs.forEach(log => {
                csvContent += `${log.id},${log.habitId},${log.date},${log.status},${log.timestamp}\n`;
            });
            
            // Create and download file
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `pria1percent-data-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            if (window.notificationManager) {
                window.notificationManager.showSuccessMessage('CSV berhasil diunduh');
            }
            
        } catch (error) {
            console.error('Error exporting CSV:', error);
            if (window.notificationManager) {
                window.notificationManager.showErrorMessage('Gagal export CSV');
            }
        } finally {
            document.getElementById('loading-screen').classList.add('hidden');
        }
    }

    /**
     * Confirm clear all data
     */
    async confirmClearAllData() {
        const confirmed = await this.showConfirmationModal(
            'Hapus Semua Data',
            'Tindakan ini akan menghapus SEMUA data Anda secara permanen dan tidak bisa dibatalkan. Yakin ingin melanjutkan?'
        );

        if (confirmed) {
            // Double confirmation
            const doubleConfirmed = await this.showConfirmationModal(
                'Konfirmasi Terakhir',
                'Ini adalah konfirmasi terakhir. Semua data Anda akan hilang selamanya. Ketik "HAPUS" untuk melanjutkan.'
            );

            if (doubleConfirmed) {
                await this.clearAllData();
            }
        }
    }

    /**
     * Clear all data
     */
    async clearAllData() {
        try {
            document.getElementById('loading-screen').classList.remove('hidden');
            
            await window.storageManager.clearAllData();
            
            if (window.notificationManager) {
                window.notificationManager.showSuccessMessage('Semua data berhasil dihapus');
            }
            
            // Redirect to onboarding
            setTimeout(() => {
                window.location.href = 'onboarding.html';
            }, 2000);
            
        } catch (error) {
            console.error('Error clearing data:', error);
            if (window.notificationManager) {
                window.notificationManager.showErrorMessage('Gagal menghapus data');
            }
        } finally {
            document.getElementById('loading-screen').classList.add('hidden');
        }
    }

    /**
     * Show confirmation modal
     */
    showConfirmationModal(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmation-modal');
            const titleElement = document.getElementById('confirmation-title');
            const messageElement = document.getElementById('confirmation-message');
            const confirmButton = document.getElementById('confirmation-confirm');

            titleElement.textContent = title;
            messageElement.textContent = message;

            modal.classList.remove('hidden');

            const handleConfirm = () => {
                modal.classList.add('hidden');
                confirmButton.removeEventListener('click', handleConfirm);
                resolve(true);
            };

            const handleCancel = () => {
                modal.classList.add('hidden');
                document.getElementById('confirmation-cancel').removeEventListener('click', handleCancel);
                resolve(false);
            };

            confirmButton.addEventListener('click', handleConfirm);
            document.getElementById('confirmation-cancel').addEventListener('click', handleCancel);
        });
    }

    /**
     * Hide confirmation modal
     */
    hideConfirmationModal() {
        document.getElementById('confirmation-modal').classList.add('hidden');
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
});