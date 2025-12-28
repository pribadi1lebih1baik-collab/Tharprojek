/**
 * Storage Manager - Wrapper for IndexedDB and localStorage operations
 * Handles all data persistence with error handling and migration support
 */

class StorageManager {
    constructor() {
        this.dbName = 'Pria1PercentDB';
        this.dbVersion = 1;
        this.databases = {
            habits: 'habitsDB',
            finance: 'financeDB',
            learning: 'learningDB',
            mental: 'mentalDB',
            system: 'systemDB'
        };
        this.maxLocalStorageSize = 5 * 1024 * 1024; // 5MB
    }

    /**
     * Initialize all IndexedDB databases
     */
    async initIndexedDB() {
        try {
            // Check if this is first time setup
            const isFirstTime = this.getFromLocalStorage('firstTimeSetup') !== false;
            
            if (isFirstTime) {
                // Clear all existing data
                await this.resetAllDatabases();
                this.setToLocalStorage('firstTimeSetup', false);
                console.log('First time setup - all databases cleared');
            }
            
            const promises = Object.entries(this.databases).map(([key, name]) => {
                return this.initDB(name);
            });
            await Promise.all(promises);
            console.log('All IndexedDB databases initialized');
        } catch (error) {
            console.error('Failed to initialize IndexedDB:', error);
            throw error;
        }
    }

    /**
     * Initialize individual database with stores
     */
    async initDB(dbName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create stores based on database name
                switch (dbName) {
                    case 'habitsDB':
                        this.createHabitsStores(db);
                        break;
                    case 'financeDB':
                        this.createFinanceStores(db);
                        break;
                    case 'learningDB':
                        this.createLearningStores(db);
                        break;
                    case 'mentalDB':
                        this.createMentalStores(db);
                        break;
                    case 'systemDB':
                        this.createSystemStores(db);
                        break;
                }
            };
        });
    }

    /**
     * Create habit-related stores
     */
    createHabitsStores(db) {
        // Daily habits store
        if (!db.objectStoreNames.contains('dailyHabits')) {
            const habitsStore = db.createObjectStore('dailyHabits', { keyPath: 'id', autoIncrement: true });
            habitsStore.createIndex('category', 'category', { unique: false });
            habitsStore.createIndex('difficulty', 'difficulty', { unique: false });
            habitsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Habit logs store
        if (!db.objectStoreNames.contains('habitLogs')) {
            const logsStore = db.createObjectStore('habitLogs', { keyPath: 'id', autoIncrement: true });
            logsStore.createIndex('habitId', 'habitId', { unique: false });
            logsStore.createIndex('date', 'date', { unique: false });
            logsStore.createIndex('status', 'status', { unique: false });
        }

        // Streaks store
        if (!db.objectStoreNames.contains('streaks')) {
            const streaksStore = db.createObjectStore('streaks', { keyPath: 'habitId' });
            streaksStore.createIndex('currentStreak', 'currentStreak', { unique: false });
            streaksStore.createIndex('bestStreak', 'bestStreak', { unique: false });
        }
    }

    /**
     * Create finance-related stores
     */
    createFinanceStores(db) {
        // Transactions store
        if (!db.objectStoreNames.contains('transactions')) {
            const transStore = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
            transStore.createIndex('type', 'type', { unique: false });
            transStore.createIndex('category', 'category', { unique: false });
            transStore.createIndex('date', 'date', { unique: false });
            transStore.createIndex('amount', 'amount', { unique: false });
        }

        // Budgets store
        if (!db.objectStoreNames.contains('budgets')) {
            const budgetsStore = db.createObjectStore('budgets', { keyPath: 'category' });
            budgetsStore.createIndex('month', 'month', { unique: false });
        }

        // Financial goals store
        if (!db.objectStoreNames.contains('goals')) {
            const goalsStore = db.createObjectStore('goals', { keyPath: 'id', autoIncrement: true });
            goalsStore.createIndex('type', 'type', { unique: false });
            goalsStore.createIndex('targetDate', 'targetDate', { unique: false });
            goalsStore.createIndex('status', 'status', { unique: false });
        }

        // Assets and liabilities store
        if (!db.objectStoreNames.contains('wealth')) {
            const wealthStore = db.createObjectStore('wealth', { keyPath: 'id', autoIncrement: true });
            wealthStore.createIndex('type', 'type', { unique: false });
            wealthStore.createIndex('category', 'category', { unique: false });
            wealthStore.createIndex('date', 'date', { unique: false });
        }
    }

    /**
     * Create learning-related stores
     */
    createLearningStores(db) {
        // Skills store
        if (!db.objectStoreNames.contains('skills')) {
            const skillsStore = db.createObjectStore('skills', { keyPath: 'id' });
            skillsStore.createIndex('category', 'category', { unique: false });
            skillsStore.createIndex('status', 'status', { unique: false });
            skillsStore.createIndex('xp', 'xp', { unique: false });
        }

        // Learning progress store
        if (!db.objectStoreNames.contains('progress')) {
            const progressStore = db.createObjectStore('progress', { keyPath: 'id', autoIncrement: true });
            progressStore.createIndex('skillId', 'skillId', { unique: false });
            progressStore.createIndex('date', 'date', { unique: false });
        }

        // Resources store
        if (!db.objectStoreNames.contains('resources')) {
            const resourcesStore = db.createObjectStore('resources', { keyPath: 'id', autoIncrement: true });
            resourcesStore.createIndex('skillId', 'skillId', { unique: false });
            resourcesStore.createIndex('platform', 'platform', { unique: false });
        }
    }

    /**
     * Create mental health stores
     */
    createMentalStores(db) {
        // Mood logs store
        if (!db.objectStoreNames.contains('moodLogs')) {
            const moodStore = db.createObjectStore('moodLogs', { keyPath: 'id', autoIncrement: true });
            moodStore.createIndex('date', 'date', { unique: true });
            moodStore.createIndex('mood', 'mood', { unique: false });
        }

        // Weekly assessments store
        if (!db.objectStoreNames.contains('assessments')) {
            const assessStore = db.createObjectStore('assessments', { keyPath: 'weekStart' });
            assessStore.createIndex('overallScore', 'overallScore', { unique: false });
        }

        // Mental health resources store
        if (!db.objectStoreNames.contains('mentalResources')) {
            const resourceStore = db.createObjectStore('mentalResources', { keyPath: 'id', autoIncrement: true });
            resourceStore.createIndex('type', 'type', { unique: false });
        }
    }

    /**
     * Create system stores
     */
    createSystemStores(db) {
        // Porn reports store
        if (!db.objectStoreNames.contains('pornReports')) {
            const reportsStore = db.createObjectStore('pornReports', { keyPath: 'id', autoIncrement: true });
            reportsStore.createIndex('timestamp', 'timestamp', { unique: false });
            reportsStore.createIndex('successfullyResisted', 'successfullyResisted', { unique: false });
        }

        // Clean streak store
        if (!db.objectStoreNames.contains('cleanStreak')) {
            const streakStore = db.createObjectStore('cleanStreak', { keyPath: 'id' });
            streakStore.createIndex('currentStreak', 'currentStreak', { unique: false });
            streakStore.createIndex('bestStreak', 'bestStreak', { unique: false });
        }

        // AI cache store
        if (!db.objectStoreNames.contains('aiCache')) {
            const cacheStore = db.createObjectStore('aiCache', { keyPath: 'cacheKey' });
            cacheStore.createIndex('type', 'type', { unique: false });
            cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Notifications store
        if (!db.objectStoreNames.contains('notifications')) {
            const notifStore = db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
            notifStore.createIndex('type', 'type', { unique: false });
            notifStore.createIndex('scheduledTime', 'scheduledTime', { unique: false });
        }
    }

    /**
     * Generic save to IndexedDB
     */
    async saveToDB(dbName, storeName, data) {
        try {
            const db = await this.initDB(dbName);
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.put(data);

                request.onsuccess = () => {
                    db.close();
                    resolve(request.result);
                };
                request.onerror = () => {
                    db.close();
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error(`Error saving to ${dbName}.${storeName}:`, error);
            throw error;
        }
    }

    /**
     * Generic get from IndexedDB
     */
    async getFromDB(dbName, storeName, key) {
        try {
            const db = await this.initDB(dbName);
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(storeName, 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(key);

                request.onsuccess = () => {
                    db.close();
                    resolve(request.result);
                };
                request.onerror = () => {
                    db.close();
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error(`Error getting from ${dbName}.${storeName}:`, error);
            throw error;
        }
    }

    /**
     * Generic get all from IndexedDB
     */
    async getAllFromDB(dbName, storeName) {
        try {
            const db = await this.initDB(dbName);
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(storeName, 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();

                request.onsuccess = () => {
                    db.close();
                    resolve(request.result);
                };
                request.onerror = () => {
                    db.close();
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error(`Error getting all from ${dbName}.${storeName}:`, error);
            throw error;
        }
    }

    /**
     * Generic delete from IndexedDB
     */
    async deleteFromDB(dbName, storeName, key) {
        try {
            const db = await this.initDB(dbName);
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(key);

                request.onsuccess = () => {
                    db.close();
                    resolve(true);
                };
                request.onerror = () => {
                    db.close();
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error(`Error deleting from ${dbName}.${storeName}:`, error);
            throw error;
        }
    }

    /**
     * Query IndexedDB with index
     */
    async queryDB(dbName, storeName, indexName, value) {
        try {
            const db = await this.initDB(dbName);
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(storeName, 'readonly');
                const store = transaction.objectStore(storeName);
                const index = store.index(indexName);
                const request = index.getAll(value);

                request.onsuccess = () => {
                    db.close();
                    resolve(request.result);
                };
                request.onerror = () => {
                    db.close();
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error(`Error querying ${dbName}.${storeName}:${indexName}:`, error);
            throw error;
        }
    }

    /**
     * Save to localStorage with size check
     */
    saveToLocalStorage(key, data) {
        try {
            const serialized = JSON.stringify(data);
            
            // Check size if available
            if (this.getLocalStorageSize() + serialized.length > this.maxLocalStorageSize) {
                console.warn('localStorage size limit exceeded, migrating to IndexedDB');
                this.migrateToIndexedDB(key, data);
                return false;
            }

            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            if (error.name === 'QuotaExceededError') {
                this.migrateToIndexedDB(key, data);
            }
            return false;
        }
    }

    /**
     * Get from localStorage
     */
    getFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error getting from localStorage:', error);
            return null;
        }
    }

    /**
     * Remove from localStorage
     */
    removeFromLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    /**
     * Get current localStorage size
     */
    getLocalStorageSize() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return total;
    }

    /**
     * Migrate data to IndexedDB when localStorage is full
     */
    async migrateToIndexedDB(key, data) {
        try {
            await this.saveToDB('systemDB', 'migratedData', {
                originalKey: key,
                data: data,
                migratedAt: new Date().toISOString()
            });
            console.log(`Migrated ${key} to IndexedDB`);
        } catch (error) {
            console.error('Failed to migrate to IndexedDB:', error);
        }
    }

    /**
     * Backup all data to JSON file
     */
    async backupData() {
        try {
            const backup = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                localStorage: {},
                indexedDB: {}
            };

            // Backup localStorage
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    backup.localStorage[key] = localStorage.getItem(key);
                }
            }

            // Backup IndexedDB data
            for (const [key, dbName] of Object.entries(this.databases)) {
                try {
                    const dbData = {};
                    const db = await this.initDB(dbName);
                    
                    for (const storeName of db.objectStoreNames) {
                        const storeData = await this.getAllFromDB(dbName, storeName);
                        dbData[storeName] = storeData;
                    }
                    
                    backup.indexedDB[dbName] = dbData;
                    db.close();
                } catch (error) {
                    console.warn(`Failed to backup ${dbName}:`, error);
                }
            }

            // Create and download file
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pria1percent-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Backup failed:', error);
            throw error;
        }
    }

    /**
     * Restore data from backup file
     */
    async restoreData(file) {
        try {
            const text = await file.text();
            const backup = JSON.parse(text);

            // Restore localStorage
            if (backup.localStorage) {
                for (const [key, value] of Object.entries(backup.localStorage)) {
                    localStorage.setItem(key, value);
                }
            }

            // Restore IndexedDB data
            if (backup.indexedDB) {
                for (const [dbName, dbData] of Object.entries(backup.indexedDB)) {
                    for (const [storeName, storeData] of Object.entries(dbData)) {
                        if (Array.isArray(storeData)) {
                            for (const item of storeData) {
                                await this.saveToDB(dbName, storeName, item);
                            }
                        }
                    }
                }
            }

            return true;
        } catch (error) {
            console.error('Restore failed:', error);
            throw error;
        }
    }

    /**
     * Reset all databases (clear all data)
     */
    async resetAllDatabases() {
        try {
            const promises = Object.values(this.databases).map(dbName => {
                return this.clearDatabase(dbName);
            });
            await Promise.all(promises);
            
            // Clear localStorage too
            localStorage.clear();
            console.log('All databases and localStorage cleared');
        } catch (error) {
            console.error('Error resetting databases:', error);
            throw error;
        }
    }

    /**
     * Clear individual database
     */
    async clearDatabase(dbName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(dbName);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            request.onblocked = () => {
                console.warn(`Database ${dbName} blocked for deletion`);
                resolve();
            };
        });
    }

    /**
     * Clear all data (for reset)
     */
    async clearAllData() {
        try {
            // Clear localStorage
            localStorage.clear();

            // Clear IndexedDB
            for (const dbName of Object.values(this.databases)) {
                try {
                    indexedDB.deleteDatabase(dbName);
                } catch (error) {
                    console.warn(`Failed to delete ${dbName}:`, error);
                }
            }

            return true;
        } catch (error) {
            console.error('Clear all data failed:', error);
            throw error;
        }
    }
}

}

// Create global instance
window.storageManager = new StorageManager();