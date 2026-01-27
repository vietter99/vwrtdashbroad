/**
 * VWRT Security Utilities
 * Các hàm tiện ích bảo mật cho VWRT Dashboard
 */

const Security = {
    /**
     * Chuyển đổi HTML thành text an toàn (ngăn chặn XSS)
     * @param {string} text - Nội dung cần escape
     * @returns {string} - Chuỗi đã được escape
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Làm sạch input từ user (giới hạn độ dài, trim)
     * @param {string} input - Input cần sanitize
     * @param {number} maxLength - Độ dài tối đa
     * @returns {string} - Chuỗi đã được làm sạch
     */
    sanitizeInput(input, maxLength = 1000) {
        if (!input) return '';
        return String(input).slice(0, maxLength).trim();
    },

    /**
     * Kiểm tra số điện thoại hợp lệ
     * @param {string} phone - Số điện thoại
     * @returns {boolean}
     */
    isValidPhone(phone) {
        return /^[0-9+\-\s()]{5,20}$/.test(phone);
    },

    /**
     * Kiểm tra URL hợp lệ
     * @param {string} url - URL cần kiểm tra
     * @returns {boolean}
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
};

// Export global
window.Security = Security;
