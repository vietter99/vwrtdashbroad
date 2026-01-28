const SmsModule = {
    API_URL: '/cgi-bin/sms/get',

    init: function() {
        this.fetchInbox(false);
    },

    openCompose: function() {
        const oldModal = document.getElementById('modal-sms-compose');
        if (oldModal) oldModal.remove();

        const modalHtml = `
            <div class="modal-overlay active" id="modal-sms-compose" style="z-index: 1001;">
                <div class="modal-box" style="background: #fff; width: 400px; max-width: 90%; padding: 0; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); display:flex; flex-direction:column;">
                    <div style="padding: 15px 20px; border-bottom: 1px solid #eee; display:flex; justify-content:space-between; align-items:center; background:#f8f9fa; border-top-left-radius:12px; border-top-right-radius:12px;">
                        <h3 style="margin:0; font-size:16px; color:#333; font-weight:700;">✍️ Soạn tin nhắn mới</h3>
                        <button onclick="document.getElementById('modal-sms-compose').remove()" style="border:none; background:none; font-size:20px; cursor:pointer; color:#999;">&times;</button>
                    </div>

                    <div style="padding: 20px;">
                        <div class="sms-input-group" style="margin-bottom: 15px;">
                            <label style="display:block; font-size:12px; font-weight:600; color:#555; margin-bottom:5px;">Người nhận:</label>
                            <input type="text" id="sms-to-modal" class="sms-input" placeholder="Nhập số điện thoại..." style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; font-size:14px; outline:none;">
                        </div>
                        <div class="sms-input-group">
                            <label style="display:block; font-size:12px; font-weight:600; color:#555; margin-bottom:5px;">Nội dung:</label>
                            <textarea id="sms-body-modal" class="sms-input" rows="5" placeholder="Nhập nội dung tin nhắn..." style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; font-size:14px; outline:none; resize:none; font-family:inherit;"></textarea>
                        </div>
                    </div>

                    <div style="padding: 15px 20px; border-top: 1px solid #eee; text-align:right; background:#fff; border-bottom-left-radius:12px; border-bottom-right-radius:12px;">
                        <button onclick="document.getElementById('modal-sms-compose').remove()" style="padding: 8px 15px; margin-right:10px; background:#f1f5f9; color:#475569; border:none; border-radius:6px; cursor:pointer; font-weight:600;">Hủy</button>
                        <button onclick="SmsModule.sendSMSFromModal()" style="padding: 8px 20px; background:#3182ce; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600; box-shadow: 0 2px 5px rgba(49, 130, 206, 0.3);">Gửi ngay ➤</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        setTimeout(() => {
            const inputTo = document.getElementById('sms-to-modal');
            if(inputTo) inputTo.focus();
        }, 100);

        const escHandler = function(e) {
            if (e.key === "Escape") {
                const m = document.getElementById('modal-sms-compose');
                if (m) m.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    },

    sendSMSFromModal: function() {
        const number = document.getElementById('sms-to-modal').value;
        const text = document.getElementById('sms-body-modal').value;

        if (!number || !text) { 
            if(typeof Toast !== 'undefined') Toast.show("Vui lòng nhập đầy đủ thông tin!", "warning");
            else alert("Thiếu thông tin!");
            return; 
        }

        const executeSend = () => {
            if(typeof Toast !== 'undefined') Toast.show("Đang gửi tin nhắn...", "info");
            
            const modal = document.getElementById('modal-sms-compose');
            if(modal) modal.remove();

            fetch('/cgi-bin/sms/send', {
                method: 'POST',
                headers: typeof VWRT_API !== 'undefined' ? VWRT_API.getHeaders() : { 'Content-Type': 'application/json' },
                body: JSON.stringify({ number: number, text: text })
            })
            .then(res => {
                if (!res.ok) throw new Error("HTTP Error");
                return res.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    if(typeof Toast !== 'undefined') Toast.show("Đã gửi thành công!", "success");
                    setTimeout(() => this.fetchInbox(false), 2000); 
                } else {
                    const msg = data.message || "Lỗi modem";
                    if(typeof Toast !== 'undefined') Toast.show("Gửi thất bại: " + msg, "error");
                }
            })
            .catch(err => {
                if(typeof Toast !== 'undefined') Toast.show("❌ Lỗi kết nối Server!", "error");
            });
        };

        if(typeof Modal !== 'undefined') {
            Modal.confirm("Xác nhận gửi", `Gửi tin đến <b>${number}</b>?`, () => {
                executeSend();
            });
        } else if(confirm(`Gửi tin đến ${number}?`)) {
            executeSend();
        }
    },

    fetchInbox: function(isFull) {
        const url = `${this.API_URL}?_t=${new Date().getTime()}${isFull ? '&full=true' : ''}`;

        fetch(url)
            .then(res => res.json())
            .then(res => {
                if (res.status === 'error') return;
                const messages = res.data || [];
                
                if (isFull) {
                    this.renderFullTable(messages);
                } 
                this.renderDashboardCard(messages);
            })
            .catch(err => {});
    },

    getDisplayTime: function(msg) {
        if (msg.time && msg.time !== "" && !msg.time.includes('--:--')) {
            return msg.time;
        }
        if (msg.type === 'sent') return '<span style="font-style:italic; color:#a0aec0;">Đã gửi</span>';
        return '<span style="color:#ccc;">--/--</span>';
    },

    renderDashboardCard: function(messages) {
        const cardEl = document.getElementById('dashboard-sms-list');
        if (!cardEl) return;

        if (messages.length === 0) {
            cardEl.innerHTML = '<div style="text-align:center; padding:30px; color:#999; font-size:13px;">Không có tin nhắn nào</div>';
            return;
        }

        let html = '';
        messages.slice(0, 5).forEach(msg => {
            const isSent = msg.type === 'sent';
            const icon = isSent ? '↗' : '↙';
            const iconColor = isSent ? '#718096' : '#3182ce';
            const bgIcon = isSent ? '#f7fafc' : '#ebf8ff';
            const timeShow = this.getDisplayTime(msg);

            // Chống XSS: escape nội dung tin nhắn và số điện thoại
            const safeNumber = window.Security ? Security.escapeHtml(msg.number) : msg.number;
            const safeText = window.Security ? Security.escapeHtml(msg.text) : msg.text;

            html += `
                <div class="sms-dash-item" onclick="SmsModule.fetchInbox(true)">
                    <div class="sms-dash-icon" style="background:${bgIcon}; color:${iconColor}">
                        ${icon}
                    </div>
                    <div class="sms-dash-content">
                        <div class="sms-dash-header">
                            <span class="sms-dash-sender">${safeNumber}</span>
                            <span class="sms-dash-time">${timeShow}</span>
                        </div>
                        <div class="sms-dash-text">${safeText}</div>
                    </div>
                </div>
            `;
        });
        cardEl.innerHTML = html;
    },

    toggleAll: function(source) {
        document.querySelectorAll('.sms-chk').forEach(cb => cb.checked = source.checked);
    },

    deleteSelected: function() {
        const checkedBoxes = document.querySelectorAll('.sms-chk:checked');
        if (checkedBoxes.length === 0) {
            if(typeof Toast !== 'undefined') Toast.show("Vui lòng chọn tin nhắn!", "warning");
            return;
        }
        Modal.confirm("Xác nhận xóa", `Xóa <b>${checkedBoxes.length}</b> tin nhắn đã chọn?`, () => {
            const ids = Array.from(checkedBoxes).map(cb => cb.value).join(",");
            if(typeof Toast !== 'undefined') Toast.show("Đang xóa...", "info");
            fetch(`${this.API_URL}?action=delete&id=${ids}`).then(() => {
                if(typeof Toast !== 'undefined') Toast.show("Đã xóa!", "success");
                setTimeout(() => {
                    this.fetchInbox(true);
                }, 1500);
            });
        });
    },

    deleteAll: function() {
        Modal.confirm("Cảnh báo", "Xóa SẠCH toàn bộ tin nhắn?", () => {
            if(typeof Toast !== 'undefined') Toast.show("Đang xóa...", "info");
            fetch(`${this.API_URL}?action=delete_all`).then(() => {
                if(typeof Toast !== 'undefined') Toast.show("Đã xóa sạch!", "success");
                setTimeout(() => {
                    this.fetchInbox(true);
                }, 2000);
            });
        });
    },

    renderFullTable: function(messages) {
        const oldModal = document.getElementById('modal-sms-full');
        if (oldModal) oldModal.remove();

        let rows = '';
        if (!messages || messages.length === 0) {
            rows = '<tr><td colspan="5" style="text-align:center; padding:40px; color:#888;">Hộp thư trống.</td></tr>';
        } else {
            messages.forEach(msg => {
                const isSent = msg.type === 'sent';
                let typeLabel = '';
                
                if (isSent) {
                    let statusIcon = '';
                    const s = (msg.status || '').toLowerCase(); 
                    if (s === 'completed-received') statusIcon = ' <span title="Đã nhận" style="color:#38a169;">✔✔</span>';
                    else if (s.includes('failed')) statusIcon = ` <span title="Lỗi: ${msg.status}" style="color:#e53e3e;">✖</span>`;
                    else statusIcon = ` <span title="Đã gửi" style="color:#a0aec0;">✔</span>`;
                    
                    typeLabel = `<span style="color:#4a5568; background:#edf2f7; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold; border:1px solid #cbd5e0; display:inline-block; width:75px; text-align:center;">↗ Gửi đi${statusIcon}</span>`;
                } else {
                    typeLabel = '<span style="color:#2b6cb0; background:#bee3f8; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold; border:1px solid #90cdf4; display:inline-block; width:75px; text-align:center;">↙ Tin đến</span>';
                }                
                
                const timeShow = this.getDisplayTime(msg);

                // Chống XSS: escape dữ liệu trước khi hiển thị
                const safeNumber = window.Security ? Security.escapeHtml(msg.number) : msg.number;
                const safeText = window.Security ? Security.escapeHtml(msg.text) : msg.text;
                const safeIndex = window.Security ? Security.escapeHtml(msg.index) : msg.index;

                rows += `
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="text-align:center; vertical-align: top; padding-top: 15px;">
                            <input type="checkbox" class="sms-chk" value="${safeIndex}" style="width:16px; height:16px; cursor:pointer;">
                        </td>
                        <td style="padding-left:15px; vertical-align: top; padding-top: 12px;">${typeLabel}</td>
                        <td style="font-weight:600; color:#2d3748; padding-left:5px; vertical-align: top; padding-top: 15px;">${safeNumber}</td>
                        
                        <td style="color:#4a5568; padding: 12px 5px;">
 <div onclick="this.style.whiteSpace=this.style.whiteSpace==='normal'?'nowrap':'normal'" 
                                 style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width: 100%; cursor:pointer; line-height: 1.5;" 
                                 title="Chạm để xem toàn bộ">
                                ${safeText}
                            </div>
                        </td>
                        
                        <td style="text-align:right; padding-right:15px; color:#718096; font-size:13px; vertical-align: top; padding-top: 15px;">${timeShow}</td>
                    </tr>
                `;
            });
        }

        const modalHtml = `
            <div class="modal-overlay active" id="modal-sms-full" style="z-index: 9999;">
                <div class="modal-box" style="background: #fff; max-width: 950px; width: 95%; height: 85vh; margin: 4vh auto; display:flex; flex-direction:column; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                    <div style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="margin:0; font-size:18px; color:#2d3748;">Quản lý Tin nhắn (${messages.length})</h3>
                        <button onclick="document.getElementById('modal-sms-full').remove()" style="font-size:24px; border:none; background:none; cursor:pointer; color:#999;">&times;</button>
                    </div>
                    <div style="padding: 10px 20px; background: #f8f9fa; border-bottom: 1px solid #e2e8f0; display:flex; gap:10px;">
                        <button onclick="SmsModule.deleteSelected()" style="background: #e53e3e; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight:600;">🗑 Xóa chọn</button>
                        <button onclick="SmsModule.deleteAll()" style="background: #4a5568; color: white; border: none; padding: 6px 12px; border-radius: 4px;">🔥 Xóa HẾT</button>
                        <div style="flex-grow:1;"></div>
                        <button onclick="SmsModule.fetchInbox(true)" style="background: #3182ce; color: white; border: none; padding: 6px 12px; border-radius: 4px;">↻ Tải lại</button>
                    </div>
                    <div style="flex:1; overflow-y: auto;">
                        <table style="width:100%; border-collapse: collapse; font-size:14px; table-layout: fixed;">
                            <colgroup>
                                <col style="width: 50px;">
                                <col style="width: 120px;">
                                <col style="width: 125px;">
                                <col style="width: auto;"> <col style="width: 160px;">
                            </colgroup>
                            <thead style="background:#fff; position:sticky; top:0; z-index:10; border-bottom: 2px solid #eee;">
                                <tr style="color:#718096; font-size:11px; font-weight:bold; height:45px;">
                                    <th style="text-align:center; background:#f8f9fa;"><input type="checkbox" onchange="SmsModule.toggleAll(this)" style="width:16px; height:16px; cursor:pointer;"></th>
                                    <th style="text-align:left; padding-left:15px; background:#f8f9fa;">LOẠI</th>
                                    <th style="text-align:left; padding-left:5px; background:#f8f9fa;">SỐ ĐIỆN THOẠI</th>
                                    <th style="text-align:left; padding-left:5px; background:#f8f9fa;">NỘI DUNG</th>
                                    <th style="text-align:right; padding-right:15px; background:#f8f9fa;">THỜI GIAN</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                    <div style="padding: 10px 20px; border-top: 1px solid #e2e8f0; text-align:right; background:#f8f9fa;">
                        <button onclick="document.getElementById('modal-sms-full').remove()" style="padding: 6px 20px; background:#fff; border:1px solid #ccc; border-radius:4px;">Đóng</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
};