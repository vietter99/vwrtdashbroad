const VWRT_API = {
    csrfToken: null,
    
    // Fetch CSRF token from server
    fetchCSRFToken: async function() {
        if (this.csrfToken) {
            return this.csrfToken;
        }
        
        try {
            const response = await fetch('/cgi-bin/csrf/get?t=' + new Date().getTime());
            const data = await response.json();
            if (data.status === 'success' && data.csrf_token) {
                this.csrfToken = data.csrf_token;
                return this.csrfToken;
            }
        } catch (error) {
            console.error("CSRF Fetch Error:", error);
            if(typeof Toast !== 'undefined') Toast.show("Lỗi API Token: " + error.message, "error");
        }
        return null;
    },
    
    // Initialize: fetch CSRF token on page load
    init: async function() {
        await this.fetchCSRFToken();
    },
    
    call: function(object, method, params) {
        const sessionId = localStorage.getItem('vwrt_session');
        if (!sessionId) {
            console.error("Chưa đăng nhập: Thiếu Session ID");
            return Promise.reject("No Session");
        }

        const rpcData = {
            "jsonrpc": "2.0",
            "id": Date.now(),
            "method": "call",
            "params": [
                sessionId,
                object,
                method,
                params || {}
            ]
        };

        return fetch('/ubus', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(rpcData)
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error("API Error:", data.error);
                throw new Error("API Error");
            }
            return data.result[1]; 
        });
    },
    
    // Helper: Tạo headers với CSRF token
    getHeaders: function() {
        const headers = {'Content-Type': 'application/json'};
        if (this.csrfToken) {
            headers['X-CSRF-Token'] = this.csrfToken;
        }
        return headers;
    },

    formatBytes: function(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }
};

// Auto-init CSRF token on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => VWRT_API.init());
} else {
    VWRT_API.init();
}