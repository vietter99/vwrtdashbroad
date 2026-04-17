const SyslogModule = {
    logInterval: null,
    
    showModal: function() {
        const id = Modal.show({
            title: "📜 Nhật ký hệ thống",
            content: `
                <div class="syslog-panel" style="padding: 2px; background: transparent; border: none;">
                    <div id="syslog-terminal" class="syslog-terminal" style="
                        height: 450px; 
                        overflow-y: auto; 
                        border-radius: 16px;
                        -webkit-overflow-scrolling: touch;
                    ">
                        <div style="text-align:center; color:#888; margin-top:180px;">
                            <div class="syslog-pulse-dot"></div> Đang kết nối và nạp dữ liệu...
                        </div>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top:20px; padding: 0 5px;">
                    <div style="display: flex; align-items: center; font-size: 12px; color: #adb5bd; font-weight: 500;">
                        <span class="syslog-pulse-dot"></span>
                        <span id="log-status">Cập nhật ứng dụng thực tế (5 giây/lần)</span>
                    </div>
                    <button class="syslog-btn-glass" onclick="SyslogModule.fetchLogs()" style="border-color: rgba(255,255,255,0.4);">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        Làm mới ngay
                    </button>
                </div>
            `,
            showCancel: false,
            confirmText: "Thoát xem",
            onConfirm: () => {
                this.stopAutoRefresh();
            }
        });

        // Forced Dark Theme for Terminal Modal (Overriding all light-mode CSS)
        const modalEl = document.getElementById(id);
        if(modalEl) {
            const mBox = modalEl.querySelector('.modal-box');
            if(mBox) {
                mBox.style.setProperty('background', '#0f172a', 'important');
                mBox.style.setProperty('color', '#f8fafc', 'important');
                mBox.style.maxWidth = "900px";
                mBox.style.width = "95%";
                mBox.style.backdropFilter = "blur(30px)";
                mBox.style.border = "1px solid rgba(255,255,255,0.1)";
                mBox.style.boxShadow = "0 25px 50px -12px rgba(0, 0, 0, 0.5)";
                
                // Fix the white actions block (footer)
                const mActions = mBox.querySelector('.modal-actions');
                if(mActions) {
                    mActions.style.setProperty('background', 'transparent', 'important');
                    mActions.style.setProperty('margin-top', '15px', 'important');
                }

                // Fix buttons and title
                const footerBtn = mBox.querySelector('.btn-modal-confirm') || mBox.querySelector('.btn-primary');
                if(footerBtn) {
                    footerBtn.style.setProperty('background', '#3182ce', 'important');
                    footerBtn.style.setProperty('color', '#ffffff', 'important');
                    footerBtn.style.setProperty('border', 'none', 'important');
                    footerBtn.style.webkitTapHighlightColor = "transparent";
                }
                
                const title = mBox.querySelector('h2') || mBox.querySelector('h3');
                if(title) title.style.setProperty('color', '#f8fafc', 'important');
                
                const closeX = mBox.querySelector('button[style*="position:absolute"]');
                if(closeX) closeX.style.setProperty('color', '#64748b', 'important');
            }
        }

        // Initial actions
        setTimeout(() => {
            this.fetchLogs();
            this.startAutoRefresh();
        }, 100);
    },

    fetchLogs: function() {
        const statusEl = document.getElementById('log-status');
        if(statusEl) statusEl.innerText = "Đang đồng bộ dữ liệu...";

        fetch('/cgi-bin/system/ssr_plus?action=get_log')
            .then(res => res.json())
            .then(data => {
                if(data.status === "success") {
                    this.renderLogs(data.log);
                    if(statusEl) statusEl.innerText = "Cập nhật ứng dụng thực tế (5 giây/lần)";
                }
            })
            .catch(err => {
                if(statusEl) statusEl.innerText = "Lỗi kết nối hệ thống!";
            });
    },

    renderLogs: function(logText) {
        const term = document.getElementById('syslog-terminal');
        if(!term) return;

        // Check if user is already at the bottom before updating
        const isAtBottom = term.scrollHeight - term.scrollTop <= term.clientHeight + 40;

        // Sanitize and Better Splitting using Regex
        let sanitized = logText.replace(/OpenWrt/gi, "VWRT");
        
        // Fix jammed logs: Ensure every timestamp starts on a new line
        // Pattern: Day Month Date HH:mm:ss Year (e.g., Fri Apr 17 07:26:27 2026)
        sanitized = sanitized.replace(/(\w{3} \w{3} \d{2} \d{2}:\d{2}:\d{2} \d{4})/g, "\n$1");
        
        const lines = sanitized.split('\n');
        
        let html = '<div style="display: flex; flex-direction: column; gap: 6px; padding-bottom: 20px;">';
        lines.forEach(line => {
            const trimmed = line.trim();
            if(!trimmed) return;
            
            // Regex to extract timestamp
            const tsMatch = trimmed.match(/^(\w{3} \w{3} \d{2} \d{2}:\d{2}:\d{2} \d{4})/);
            let timestamp = "";
            let content = trimmed;
            
            if(tsMatch) {
                timestamp = tsMatch[1];
                content = trimmed.substring(timestamp.length).trim();
                // Remove leading colons or artifacts
                if(content.startsWith(':')) content = content.substring(1).trim();
            }
            
            // Basic line coloring logic
            let lineClass = "syslog-log-msg";
            const lowerC = content.toLowerCase();
            if(lowerC.includes("error") || lowerC.includes("failed") || lowerC.includes("not running")) lineClass = "text-red";
            if(lowerC.includes("warn")) lineClass = "text-orange";
            if(lowerC.includes("success") || lowerC.includes("connected") || lowerC.includes("running")) lineClass = "text-green";

            html += '<div style="display: flex; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 4px;">' +
                        '<span class="syslog-log-timestamp" style="white-space: nowrap; font-size: 12px; min-width: 160px; display: inline-block;">' + timestamp + '</span>' +
                        '<span class="' + lineClass + '" style="word-break: break-all;">' + content + '</span>' +
                     '</div>';
        });
        html += '</div>';

        term.innerHTML = html;
        
        // Smart Scroll: Only scroll if user was at the bottom
        if(isAtBottom) {
            term.scrollTo({
                top: term.scrollHeight,
                behavior: 'smooth'
            });
        }
    },

    startAutoRefresh: function() {
        this.stopAutoRefresh();
        this.logInterval = setInterval(() => {
            this.fetchLogs();
        }, 5000);
    },

    stopAutoRefresh: function() {
        if(this.logInterval) {
            clearInterval(this.logInterval);
            this.logInterval = null;
        }
    }
};

window.SyslogModule = SyslogModule;
