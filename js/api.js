const VWRT_API = {
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

    formatBytes: function(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }
};