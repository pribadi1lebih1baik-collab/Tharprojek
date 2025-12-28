/**
 * Finance Core - Financial management logic
 * Handles transactions, budgets, and financial calculations
 */

class FinanceManager {
    constructor(storageManager, gamificationManager) {
        this.storage = storageManager;
        this.gamification = gamificationManager;
        this.transactions = [];
        this.budgets = new Map();
        this.goals = [];
        this.wealth = [];
        this.currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        this.init();
    }

    /**
     * Initialize finance manager
     */
    async init() {
        try {
            await this.loadData();
            this.setupEventListeners();
            this.updateUI();
        } catch (error) {
            console.error('Error initializing finance manager:', error);
        }
    }

    /**
     * Load financial data from storage
     */
    async loadData() {
        try {
            this.transactions = await window.storageManager.getAllFromDB('financeDB', 'transactions');
            const budgetData = await window.storageManager.getAllFromDB('financeDB', 'budgets');
            this.budgets = new Map(budgetData.map(b => [b.category, b]));
            this.goals = await window.storageManager.getAllFromDB('financeDB', 'goals');
            this.wealth = await window.storageManager.getAllFromDB('financeDB', 'wealth');
        } catch (error) {
            console.error('Error loading finance data:', error);
            this.transactions = [];
            this.budgets = new Map();
            this.goals = [];
            this.wealth = [];
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add transaction button
        document.getElementById('add-transaction-btn')?.addEventListener('click', () => {
            this.showAddTransactionModal();
        });

        // Quick action buttons
        document.querySelectorAll('button').forEach(btn => {
            if (btn.textContent.includes('Catat Pemasukan')) {
                btn.addEventListener('click', () => this.showAddTransactionModal('income'));
            } else if (btn.textContent.includes('Catat Pengeluaran')) {
                btn.addEventListener('click', () => this.showAddTransactionModal('expense'));
            } else if (btn.textContent.includes('Lihat Laporan')) {
                btn.addEventListener('click', () => this.showReportModal());
            }
        });
    }

    /**
     * Show add transaction modal
     */
    showAddTransactionModal(type = 'expense') {
        // Create modal (simplified for now)
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl max-w-md w-full p-6">
                <h3 class="text-xl font-poppins font-semibold text-gray-900 mb-6">Tambah Transaksi</h3>
                <form id="transaction-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
                        <select id="transaction-type" class="form-input" value="${type}">
                            <option value="income">Pemasukan</option>
                            <option value="expense">Pengeluaran</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Jumlah</label>
                        <input type="number" id="transaction-amount" class="form-input" placeholder="100000" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                        <select id="transaction-category" class="form-input" required>
                            <option value="">Pilih Kategori</option>
                            <option value="salary">Gaji</option>
                            <option value="food">Makanan</option>
                            <option value="transport">Transportasi</option>
                            <option value="entertainment">Hiburan</option>
                            <option value="health">Kesehatan</option>
                            <option value="education">Pendidikan</option>
                            <option value="other">Lainnya</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                        <input type="text" id="transaction-description" class="form-input" placeholder="Deskripsi transaksi">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
                        <input type="date" id="transaction-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div class="flex space-x-3 pt-4">
                        <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors">
                            Batal
                        </button>
                        <button type="submit" class="flex-1 bg-secondary hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors">
                            Simpan
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        document.getElementById('transaction-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddTransaction(modal);
        });
    }

    /**
     * Handle add transaction
     */
    async handleAddTransaction(modal) {
        const formData = {
            type: document.getElementById('transaction-type').value,
            amount: parseFloat(document.getElementById('transaction-amount').value),
            category: document.getElementById('transaction-category').value,
            description: document.getElementById('transaction-description').value,
            date: document.getElementById('transaction-date').value,
            timestamp: new Date().toISOString()
        };

        try {
            // Save transaction
            await window.storageManager.saveToDB('financeDB', 'transactions', formData);
            
            // Add to local array
            this.transactions.push(formData);
            
            // Update UI
            await this.updateUI();
            
            // Close modal
            document.body.removeChild(modal);
            
            // Show success message
            if (window.notificationManager) {
                window.notificationManager.showSuccessMessage('Transaksi berhasil disimpan');
            }
            
            // Award XP
            if (window.gamificationManager) {
                const xpAmount = formData.type === 'income' ? 15 : 10;
                await window.gamificationManager.addXP(xpAmount, `Catat ${formData.type}`);
            }
            
        } catch (error) {
            console.error('Error adding transaction:', error);
            if (window.notificationManager) {
                window.notificationManager.showErrorMessage('Gagal menyimpan transaksi');
            }
        }
    }

    /**
     * Update UI
     */
    async updateUI() {
        this.renderStats();
        this.renderRecentTransactions();
    }

    /**
     * Render financial stats
     */
    renderStats() {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const thisMonthTransactions = this.transactions.filter(t => 
            t.date.startsWith(currentMonth)
        );
        
        const totalIncome = thisMonthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const totalExpense = thisMonthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const savingsRate = totalIncome > 0 ? 
            Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
        
        const netWorth = this.calculateNetWorth();
        
        // Update UI elements
        const incomeElement = document.getElementById('monthly-income');
        const expenseElement = document.getElementById('monthly-expense');
        const savingsElement = document.getElementById('savings-rate');
        const netWorthElement = document.getElementById('net-worth');
        
        if (incomeElement) incomeElement.textContent = this.formatCurrency(totalIncome);
        if (expenseElement) expenseElement.textContent = this.formatCurrency(totalExpense);
        if (savingsElement) savingsElement.textContent = `${savingsRate}%`;
        if (netWorthElement) netWorthElement.textContent = this.formatCurrency(netWorth);
    }

    /**
     * Render recent transactions
     */
    renderRecentTransactions() {
        const container = document.getElementById('recent-transactions');
        if (!container) return;
        
        if (this.transactions.length === 0) {
            // Keep the empty state
            return;
        }
        
        // Get recent transactions (last 10)
        const recentTransactions = this.transactions
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
        
        container.innerHTML = '';
        
        recentTransactions.forEach(transaction => {
            const transactionElement = document.createElement('div');
            transactionElement.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg';
            
            const isIncome = transaction.type === 'income';
            const amountClass = isIncome ? 'text-emerald-600' : 'text-red-600';
            const iconBg = isIncome ? 'bg-emerald-100' : 'bg-red-100';
            const icon = isIncome ? 
                '<svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>' :
                '<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>';
            
            transactionElement.innerHTML = `
                <div class="flex items-center">
                    <div class="${iconBg} rounded-lg p-2 mr-3">
                        ${icon}
                    </div>
                    <div>
                        <h4 class="font-medium text-gray-900">${this.getCategoryLabel(transaction.category)}</h4>
                        <p class="text-sm text-gray-500">${transaction.description || 'Tidak ada deskripsi'}</p>
                        <p class="text-xs text-gray-400">${Utils.formatDate(transaction.date)}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-semibold ${amountClass}">${isIncome ? '+' : '-'} ${this.formatCurrency(transaction.amount)}</p>
                </div>
            `;
            
            container.appendChild(transactionElement);
        });
    }

    /**
     * Calculate net worth
     */
    calculateNetWorth() {
        const totalAssets = this.wealth
            .filter(item => item.type === 'asset')
            .reduce((sum, item) => sum + item.value, 0);
        
        const totalLiabilities = this.wealth
            .filter(item => item.type === 'liability')
            .reduce((sum, item) => sum + item.value, 0);
        
        return totalAssets - totalLiabilities;
    }

    /**
     * Get category label
     */
    getCategoryLabel(category) {
        const labels = {
            'salary': 'Gaji',
            'food': 'Makanan',
            'transport': 'Transportasi',
            'entertainment': 'Hiburan',
            'health': 'Kesehatan',
            'education': 'Pendidikan',
            'other': 'Lainnya'
        };
        return labels[category] || category;
    }

    /**
     * Format currency
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Show report modal
     */
    showReportModal() {
        // Simplified report modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl max-w-lg w-full p-6">
                <h3 class="text-xl font-poppins font-semibold text-gray-900 mb-6">Laporan Keuangan</h3>
                <div class="space-y-4">
                    <div class="text-center py-8">
                        <div class="text-6xl mb-4">📊</div>
                        <p class="text-gray-600">Fitur laporan detail akan segera hadir!</p>
                        <p class="text-sm text-gray-500 mt-2">Sementara ini, Anda bisa melihat ringkasan di dashboard.</p>
                    </div>
                </div>
                <button onclick="this.closest('.fixed').remove()" class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors mt-6">
                    Tutup
                </button>
            </div>
        `;

        document.body.appendChild(modal);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.financeManager = new FinanceManager();
});