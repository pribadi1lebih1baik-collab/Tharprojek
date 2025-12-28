/**
 * Utility Functions - Helper functions for common operations
 * Provides various utility functions used throughout the application
 */

class Utils {
    /**
     * Format date to Indonesian locale
     */
    static formatDate(date, options = {}) {
        const defaultOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            ...options
        };

        try {
            return new Date(date).toLocaleDateString('id-ID', defaultOptions);
        } catch (error) {
            console.error('Error formatting date:', error);
            return date.toString();
        }
    }

    /**
     * Format time to 12-hour format
     */
    static formatTime(time24) {
        try {
            const [hours, minutes] = time24.split(':').map(Number);
            const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
            const ampm = hours >= 12 ? 'PM' : 'AM';
            return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        } catch (error) {
            console.error('Error formatting time:', error);
            return time24;
        }
    }

    /**
     * Generate random ID
     */
    static generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Debounce function
     */
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    /**
     * Throttle function
     */
    static throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Sanitize HTML to prevent XSS
     */
    static sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    /**
     * Validate email format
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate phone number format (Indonesian)
     */
    static isValidPhone(phone) {
        const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;
        return phoneRegex.test(phone);
    }

    /**
     * Calculate age from birth date
     */
    static calculateAge(birthDate) {
        try {
            const today = new Date();
            const birth = new Date(birthDate);
            let age = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                age--;
            }
            
            return age;
        } catch (error) {
            console.error('Error calculating age:', error);
            return null;
        }
    }

    /**
     * Get zodiac sign from birth date
     */
    static getZodiac(birthDate) {
        try {
            const date = new Date(birthDate);
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
        } catch (error) {
            console.error('Error getting zodiac:', error);
            return 'Unknown';
        }
    }

    /**
     * Get generation from birth year
     */
    static getGeneration(birthYear) {
        try {
            const year = typeof birthYear === 'string' ? 
                new Date(birthYear).getFullYear() : 
                (birthYear instanceof Date ? birthYear.getFullYear() : birthYear);
            
            if (year >= 1997) return 'Gen Z';
            if (year >= 1981) return 'Millennial';
            if (year >= 1965) return 'Gen X';
            if (year >= 1946) return 'Baby Boomer';
            
            return 'Pre-Boomer';
        } catch (error) {
            console.error('Error getting generation:', error);
            return 'Unknown';
        }
    }

    /**
     * Format number with Indonesian locale
     */
    static formatNumber(number) {
        try {
            return new Intl.NumberFormat('id-ID').format(number);
        } catch (error) {
            console.error('Error formatting number:', error);
            return number.toString();
        }
    }

    /**
     * Format currency in IDR
     */
    static formatCurrency(amount) {
        try {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0
            }).format(amount);
        } catch (error) {
            console.error('Error formatting currency:', error);
            return `Rp ${this.formatNumber(amount)}`;
        }
    }

    /**
     * Parse CSV string to array
     */
    static parseCSV(csvString) {
        const lines = csvString.split('\n');
        const headers = lines[0].split(',');
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            const values = lines[i].split(',');
            const row = {};
            
            headers.forEach((header, index) => {
                row[header.trim()] = values[index] ? values[index].trim() : '';
            });
            
            data.push(row);
        }

        return data;
    }

    /**
     * Convert array to CSV string
     */
    static toCSV(array, headers = null) {
        if (!array || array.length === 0) return '';

        const csvHeaders = headers || Object.keys(array[0]);
        const csvRows = [csvHeaders.join(',')];

        array.forEach(item => {
            const values = csvHeaders.map(header => {
                const value = item[header];
                // Escape commas and quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvRows.push(values.join(','));
        });

        return csvRows.join('\n');
    }

    /**
     * Download file
     */
    static downloadFile(content, filename, contentType = 'text/plain') {
        try {
            const blob = new Blob([content], { type: contentType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            return true;
        } catch (error) {
            console.error('Error downloading file:', error);
            return false;
        }
    }

    /**
     * Read file as text
     */
    static readFile(file) {
        return new Promise((resolve, reject) => {
            try {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(e);
                reader.readAsText(file);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Copy text to clipboard
     */
    static async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const result = document.execCommand('copy');
                document.body.removeChild(textArea);
                return result;
            }
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            return false;
        }
    }

    /**
     * Get device info
     */
    static getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screenWidth: screen.width,
            screenHeight: screen.height,
            screenColorDepth: screen.colorDepth,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio || 1
        };
    }

    /**
     * Get performance metrics
     */
    static getPerformanceMetrics() {
        if (!performance || !performance.timing) return null;

        const timing = performance.timing;
        return {
            navigationStart: timing.navigationStart,
            unloadEventStart: timing.unloadEventStart,
            unloadEventEnd: timing.unloadEventEnd,
            redirectStart: timing.redirectStart,
            redirectEnd: timing.redirectEnd,
            fetchStart: timing.fetchStart,
            domainLookupStart: timing.domainLookupStart,
            domainLookupEnd: timing.domainLookupEnd,
            connectStart: timing.connectStart,
            connectEnd: timing.connectEnd,
            requestStart: timing.requestStart,
            responseStart: timing.responseStart,
            responseEnd: timing.responseEnd,
            domLoading: timing.domLoading,
            domInteractive: timing.domInteractive,
            domContentLoadedEventStart: timing.domContentLoadedEventStart,
            domContentLoadedEventEnd: timing.domContentLoadedEventEnd,
            domComplete: timing.domComplete,
            loadEventStart: timing.loadEventStart,
            loadEventEnd: timing.loadEventEnd
        };
    }

    /**
     * Local storage helpers
     */
    static storage = {
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Error setting localStorage:', error);
                return false;
            }
        },

        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Error getting localStorage:', error);
                return defaultValue;
            }
        },

        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Error removing localStorage:', error);
                return false;
            }
        },

        clear: () => {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('Error clearing localStorage:', error);
                return false;
            }
        },

        size: () => {
            try {
                let total = 0;
                for (let key in localStorage) {
                    if (localStorage.hasOwnProperty(key)) {
                        total += localStorage[key].length + key.length;
                    }
                }
                return total;
            } catch (error) {
                console.error('Error calculating localStorage size:', error);
                return 0;
            }
        }
    };

    /**
     * Color manipulation utilities
     */
    static colors = {
        hexToRgb: (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },

        rgbToHex: (r, g, b) => {
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        },

        getContrastColor: (hexColor) => {
            const rgb = this.colors.hexToRgb(hexColor);
            if (!rgb) return '#000000';
            
            const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
            return brightness > 128 ? '#000000' : '#ffffff';
        }
    };

    /**
     * Math utilities
     */
    static math = {
        clamp: (value, min, max) => {
            return Math.min(Math.max(value, min), max);
        },

        lerp: (start, end, factor) => {
            return start + (end - start) * factor;
        },

        random: (min, max) => {
            return Math.random() * (max - min) + min;
        },

        randomInt: (min, max) => {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
    };

    /**
     * Animation utilities
     */
    static animations = {
        easeInOut: (t) => {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        },

        easeIn: (t) => {
            return t * t;
        },

        easeOut: (t) => {
            return t * (2 - t);
        },

        bounce: (t) => {
            if (t < 1/2.75) {
                return 7.5625 * t * t;
            } else if (t < 2/2.75) {
                return 7.5625 * (t -= 1.5/2.75) * t + 0.75;
            } else if (t < 2.5/2.75) {
                return 7.5625 * (t -= 2.25/2.75) * t + 0.9375;
            } else {
                return 7.5625 * (t -= 2.625/2.75) * t + 0.984375;
            }
        }
    };

    /**
     * String utilities
     */
    static strings = {
        capitalize: (str) => {
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        },

        truncate: (str, length, suffix = '...') => {
            if (str.length <= length) return str;
            return str.substring(0, length - suffix.length) + suffix;
        },

        slugify: (str) => {
            return str.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
        },

        random: (length = 8) => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        }
    };

    /**
     * Array utilities
     */
    static arrays = {
        shuffle: (array) => {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        },

        chunk: (array, size) => {
            const chunks = [];
            for (let i = 0; i < array.length; i += size) {
                chunks.push(array.slice(i, i + size));
            }
            return chunks;
        },

        unique: (array) => {
            return [...new Set(array)];
        },

        groupBy: (array, key) => {
            return array.reduce((groups, item) => {
                const group = item[key];
                groups[group] = groups[group] || [];
                groups[group].push(item);
                return groups;
            }, {});
        }
    };
}

// Make Utils available globally
window.Utils = Utils;