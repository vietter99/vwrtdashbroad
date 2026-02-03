const LanModule = {
    csrfToken: '',

    init: function() {
        this.fetchCsrf();
    },

    fetchCsrf: function() {
        fetch('/cgi-bin/csrf/get')
            .then(res => res.json())
            .then(data => {
                if (data && data.csrf_token) {
                    this.csrfToken = data.csrf_token;
                }
            })
            .catch(err => console.error('Error fetching CSRF:', err));
    },

    showModal: function() {
        // Inject Styles if not present
        if (!document.getElementById('lan-modal-style')) {
            const style = document.createElement('style');
            style.id = 'lan-modal-style';
            style.innerHTML = `
                /* Modal Base */
                .v-modal {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.6); z-index: 10000;
                    display: flex; align-items: center; justify-content: center;
                    backdrop-filter: blur(4px);
                    animation: fadeIn 0.25s ease-out;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                .v-modal-content {
                    background: #fff; width: 95%; max-width: 520px;
                    border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.15);
                    overflow: hidden; display: flex; flex-direction: column;
                    max-height: 90vh;
                    animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                }
                
                /* Header */
                .v-modal-header {
                    padding: 16px 24px; border-bottom: 1px solid #edf2f7;
                    display: flex; justify-content: space-between; align-items: center;
                    background: #fff;
                }
                .v-modal-header h3 { margin: 0; font-size: 18px; font-weight: 600; color: #1a202c; }
                .v-modal-close {
                    font-size: 28px; cursor: pointer; color: #a0aec0; line-height: 1;
                    transition: color 0.2s;
                }
                .v-modal-close:hover { color: #4a5568; }

                /* Body */
                .v-modal-body { padding: 24px; overflow-y: auto; background: #f7fafc; }

                /* Footer */
                .v-modal-footer {
                    padding: 16px 24px; border-top: 1px solid #edf2f7;
                    display: flex; justify-content: flex-end; gap: 12px;
                    background: #fff;
                }

                /* Form Elements */
                .v-form-group { margin-bottom: 20px; }
                .v-form-group label {
                    display: block; margin-bottom: 8px; font-size: 14px;
                    font-weight: 500; color: #4a5568;
                }
                .v-form-group input[type="text"],
                .v-form-group input[type="number"],
                .v-form-group textarea {
                    width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0;
                    border-radius: 8px; font-size: 14px; color: #2d3748;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    box-sizing: border-box; outline: none; background: #fff;
                }
                .v-form-group input:focus, .v-form-group textarea:focus {
                    border-color: #3182ce; box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
                }
                .v-form-group small {
                    display: block; margin-top: 6px; font-size: 12px; color: #718096;
                }

                /* Tabs */
                .v-tabs { display: flex; flex-direction: column; gap: 20px; }
                .v-tab-header {
                    display: flex; gap: 5px; background: #edf2f7;
                    padding: 4px; border-radius: 10px;
                }
                .v-tab-btn {
                    flex: 1; border: none; background: transparent; padding: 8px;
                    font-size: 14px; font-weight: 500; color: #718096;
                    cursor: pointer; border-radius: 8px; transition: all 0.2s;
                }
                .v-tab-btn.active {
                    background: #fff; color: #2b6cb0; shadow: 0 2px 4px rgba(0,0,0,0.05);
                    font-weight: 600;
                }
                .v-tab-content { display: none; animation: fadeIn 0.2s; }
                .v-tab-content.active { display: block; }

                /* Switch */
                .v-switch {
                    position: relative; display: inline-block; width: 44px; height: 24px;
                }
                .v-switch input { opacity: 0; width: 0; height: 0; }
                .v-slider {
                    position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
                    background-color: #cbd5e0; transition: .3s; border-radius: 24px;
                }
                .v-slider:before {
                    position: absolute; content: ""; height: 18px; width: 18px;
                    left: 3px; bottom: 3px; background-color: white;
                    transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                input:checked + .v-slider { background-color: #48bb78; }
                input:checked + .v-slider:before { transform: translateX(20px); }

                /* Buttons */
                .v-btn {
                    border: none; padding: 10px 20px; border-radius: 8px;
                    font-size: 14px; font-weight: 500; cursor: pointer;
                    transition: opacity 0.2s, transform 0.1s;
                }
                .v-btn:active { transform: translateY(1px); }
                .v-btn-secondary { background: #edf2f7; color: #4a5568; }
                .v-btn-secondary:hover { background: #e2e8f0; }
                .v-btn-primary { background: #3182ce; color: white; }
                .v-btn-primary:hover { background: #2b6cb0; }
                .v-btn:disabled { opacity: 0.7; cursor: not-allowed; }

                /* Dark Mode Support */
                [data-theme="dark"] .v-modal-content {
                    background: #1a202c; box-shadow: 0 20px 50px rgba(0,0,0,0.5); border: 1px solid #2d3748;
                }
                [data-theme="dark"] .v-modal-header {
                    border-bottom-color: #2d3748; background: #1a202c;
                }
                [data-theme="dark"] .v-modal-header h3 { color: #f7fafc; }
                [data-theme="dark"] .v-modal-close { color: #a0aec0; }
                [data-theme="dark"] .v-modal-close:hover { color: #fff; }
                [data-theme="dark"] .v-modal-body { background: #171923; color: #e2e8f0; }
                [data-theme="dark"] .v-modal-footer {
                    border-top-color: #2d3748; background: #1a202c;
                }
                [data-theme="dark"] .v-form-group label { color: #cbd5e0; }
                [data-theme="dark"] .v-form-group input,
                [data-theme="dark"] .v-form-group textarea {
                    background: #2d3748; border-color: #4a5568; color: #fff;
                }
                [data-theme="dark"] .v-form-group input:focus, 
                [data-theme="dark"] .v-form-group textarea:focus {
                    border-color: #63b3ed; box-shadow: 0 0 0 3px rgba(99, 179, 237, 0.2);
                }
                [data-theme="dark"] .v-form-group small { color: #a0aec0; }
                [data-theme="dark"] .v-tab-header { background: #2d3748; }
                [data-theme="dark"] .v-tab-btn { color: #a0aec0; }
                [data-theme="dark"] .v-tab-btn.active { background: #4a5568; color: #fff; }
                [data-theme="dark"] .v-btn-secondary { background: #2d3748; color: #e2e8f0; }
                [data-theme="dark"] .v-btn-secondary:hover { background: #4a5568; }

                /* Animations */
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(15px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `;
            document.head.appendChild(style);
        }

        // Show Loading
        const modal = document.createElement('div');
        modal.id = 'modal-lan';
        modal.className = 'v-modal';
        modal.innerHTML = `
            <div class="v-modal-content">
                <div class="v-modal-header">
                    <h3 style="margin:0; font-size:18px;">⚙️ Cấu hình Mạng LAN</h3>
                    <span class="v-modal-close" onclick="LanModule.closeModal()">&times;</span>
                </div>
                <div class="v-modal-body" id="lan-content">
                    <div style="text-align:center; padding:40px;">
                        <div class="spinner"></div>
                        <p style="margin-top:10px; color:#666;">Đang tải cấu hình...</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Fetch Current Config
        fetch('/cgi-bin/system/lan')
            .then(res => res.json())
            .then(data => {
                this.renderContent(data);
            });
    },

    renderContent: function(data) {
        const body = document.getElementById('lan-content');
        if (!body) return;

        body.innerHTML = `
            <div class="v-tabs">
                <div class="v-tab-header">
                    <button class="v-tab-btn active" onclick="LanModule.switchTab(event, 'tab-ip')">IP & DNS</button>
                    <button class="v-tab-btn" onclick="LanModule.switchTab(event, 'tab-dhcp')">DHCP Server</button>
                </div>

                <!-- Tab IP & DNS -->
                <div id="tab-ip" class="v-tab-content active">
                    <div class="v-form-group">
                        <label>Địa chỉ IP LAN</label>
                        <input type="text" id="lan-ip" value="${data.ipaddr}" placeholder="192.168.15.1">
                        <small>IP để truy cập Router.</small>
                    </div>
                    <div class="v-form-group">
                        <label>Subnet Mask</label>
                        <input type="text" id="lan-mask" value="${data.netmask}" placeholder="255.255.255.0">
                    </div>
                    <div class="v-form-group">
                        <label>DNS Server (Mỗi dòng một IP)</label>
                        <textarea id="lan-dns" rows="3" placeholder="8.8.8.8&#10;1.1.1.1">${Array.isArray(data.dns) ? data.dns.join('\n') : ''}</textarea>
                        <small>DNS để tăng tốc độ phân giải tên miền.</small>
                    </div>
                </div>

                <!-- Tab DHCP -->
                <div id="tab-dhcp" class="v-tab-content">
                    <div id="dhcp-settings" style="display:block;">
                        <div class="v-form-group">
                            <label>ID bắt đầu (Start)</label>
                            <input type="number" id="dhcp-start" value="${data.dhcp_start}" min="2" max="254">
                            <small>IP cấp phát sẽ bắt đầu từ đây.</small>
                        </div>
                        <div class="v-form-group">
                            <label>Số lượng IP cấp (Limit)</label>
                            <input type="number" id="dhcp-limit" value="${data.dhcp_limit}" min="1" max="250">
                            <small>Số thiết bị tối đa được cấp IP.</small>
                        </div>
                        <div class="v-form-group">
                            <label>Thời gian thuê (Leasetime)</label>
                            <input type="text" id="dhcp-time" value="${data.dhcp_leasetime}" placeholder="12h">
                        </div>
                    </div>
                </div>
            </div>

            <div class="v-modal-footer">
                <button class="v-btn v-btn-secondary" onclick="LanModule.closeModal()">Hủy</button>
                <button class="v-btn v-btn-primary" onclick="LanModule.save()">Lưu & Áp dụng</button>
            </div>
        `;
    },

    switchTab: function(e, tabId) {
        document.querySelectorAll('.v-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.v-tab-content').forEach(tab => tab.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    },

    save: function() {
        const ip = document.getElementById('lan-ip').value;
        const mask = document.getElementById('lan-mask').value;
        const dnsStr = document.getElementById('lan-dns').value;
        const dns = dnsStr.split('\n').map(s => s.trim()).filter(s => s !== '');
        
        // Remove DHCP toggle logic, assume always enabled (ignore = false)
        const dhcpEnabled = true; // Hardcode to true
        const dhcpStart = document.getElementById('dhcp-start').value;
        const dhcpLimit = document.getElementById('dhcp-limit').value;
        const dhcpTime = document.getElementById('dhcp-time').value;

        // Validation
        if (!this.isValidIP(ip)) {
            Modal.alert({
                title: 'Lỗi định dạng',
                message: 'Địa chỉ IP không hợp lệ! Vui lòng kiểm tra lại.',
                type: 'error'
            });
            return;
        }

        const confirmMsg = `Bạn đang thực hiện đổi IP LAN sang <b>${ip}</b><br><br>` +
                          `Router sẽ khởi động lại mạng và bạn sẽ bị ngắt kết nối.<br>` +
                          `Hãy đảm bảo bạn đã nhớ IP mới để đăng nhập lại sau 2-3 phút.`;

        Modal.confirm({
            title: 'Xác nhận thay đổi',
            message: confirmMsg,
            type: 'warning',
            confirmText: 'Đồng ý & Áp dụng',
            cancelText: 'Hủy bỏ',
            onConfirm: () => {
                this.performSave({
                    ipaddr: ip,
                    netmask: mask,
                    dns: dns,
                    dhcp_ignore: !dhcpEnabled,
                    dhcp_start: dhcpStart,
                    dhcp_limit: dhcpLimit,
                    dhcp_leasetime: dhcpTime,
                    csrf_token: this.csrfToken
                }, ip);
            }
        });
    },

    performSave: function(payload, newIp) {
        const btn = document.querySelector('.v-btn-primary');
        if(btn) {
            btn.disabled = true;
            btn.innerHTML = 'Đang xử lý...';
        }

        fetch('/cgi-bin/system/lan', {
            method: 'POST',
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                Modal.alert({
                    title: 'Thành công',
                    message: data.message + "<br><br>Bạn sẽ được chuyển hướng sau 30 giây...",
                    type: 'success',
                    onConfirm: () => {
                        this.redirect(newIp);
                    }
                });
                // Auto redirect fallback
                setTimeout(() => this.redirect(newIp), 30000);
            } else {
                Modal.alert({
                    title: 'Lỗi',
                    message: data.message,
                    type: 'error'
                });
                if(btn) {
                    btn.disabled = false;
                    btn.innerHTML = 'Lưu & Áp dụng';
                }
            }
        })
        .catch(err => {
            // Error is expected because connection is lost
            Modal.alert({
                title: 'Đang áp dụng',
                message: 'Đã gửi cấu hình! Đang khởi động lại mạng...<br>Vui lòng truy cập lại Router tại: ' + newIp,
                type: 'info'
            });
            setTimeout(() => this.redirect(newIp), 10000);
        });
    },

    redirect: function(ip) {
        const protocol = window.location.protocol;
        const port = window.location.port ? ':' + window.location.port : '';
        window.location.href = protocol + '//' + ip + port;
    },

    isValidIP: function(ip) {
        return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip);
    },

    closeModal: function() {
        const modal = document.getElementById('modal-lan');
        if (modal) modal.remove();
    }
};

window.LanModule = LanModule;
LanModule.init();
