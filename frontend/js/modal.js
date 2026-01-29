// Enhanced Modal Component with Icon Types
// Types: warning, error, success, info, question (default)
const Modal = {
    icons: {
        warning:  '⚠️',
        error:    '❌',
        success:  '✅',
        info:     'ℹ️',
        question: '❓',
        delete:   '🗑️',
        reboot:   '🔄',
        save:     '💾'
    },
    
    colors: {
        warning:  '#ed8936',
        error:    '#e53e3e',
        success:  '#48bb78',
        info:     '#3182ce',
        question: '#805ad5',
        delete:   '#e53e3e',
        reboot:   '#ed8936',
        save:     '#48bb78'
    },

    // Quick confirm with icon type
    confirm: function(options) {
        // Normalize: có thể gọi Modal.confirm("title", "msg", callback) hoặc Modal.confirm({...})
        if (typeof options === 'string') {
            options = {
                title: arguments[0],
                message: arguments[1],
                onConfirm: arguments[2],
                type: arguments[3] || 'question'
            };
        }
        
        const type = options.type || 'question';
        const icon = this.icons[type] || this.icons.question;
        const color = this.colors[type] || this.colors.question;
        const id = 'modal-' + Date.now();
        
        const html = `
            <div class="modal-overlay active" id="${id}" style="z-index:100000;">
                <div class="modal-box" style="max-width:340px; text-align:center; animation: modalPop 0.2s ease;">
                    <div style="font-size:48px; margin-bottom:10px;">${icon}</div>
                    <h3 style="margin:0 0 10px; color:var(--text-primary, #2d3748);">${options.title || 'Xác nhận'}</h3>
                    <p style="color:var(--text-secondary, #666); margin:0 0 20px; font-size:14px;">${options.message || ''}</p>
                    <div class="modal-actions" style="display:flex; gap:10px; justify-content:center;">
                        <button class="btn-modal btn-secondary" onclick="document.getElementById('${id}').remove()" style="padding:10px 24px; border-radius:8px;">
                            ${options.cancelText || 'Hủy bỏ'}
                        </button>
                        <button class="btn-modal" id="${id}-confirm" style="padding:10px 24px; border-radius:8px; background:${color}; color:white; border:none; cursor:pointer;">
                            ${options.confirmText || 'Đồng ý'}
                        </button>
                    </div>
                </div>
            </div>
            <style>
                @keyframes modalPop {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            </style>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        
        // Bind confirm action
        document.getElementById(`${id}-confirm`).onclick = () => {
            document.getElementById(id).remove();
            if (options.onConfirm) options.onConfirm();
        };
    },

    // Alert (chỉ có nút OK)
    alert: function(options) {
        if (typeof options === 'string') {
            options = {
                title: arguments[0],
                message: arguments[1],
                type: arguments[2] || 'info'
            };
        }
        
        const type = options.type || 'info';
        const icon = this.icons[type] || this.icons.info;
        const color = this.colors[type] || this.colors.info;
        const id = 'modal-alert-' + Date.now();
        
        const html = `
            <div class="modal-overlay active" id="${id}" style="z-index:100000;">
                <div class="modal-box" style="max-width:340px; text-align:center; animation: modalPop 0.2s ease;">
                    <div style="font-size:48px; margin-bottom:10px;">${icon}</div>
                    <h3 style="margin:0 0 10px; color:var(--text-primary, #2d3748);">${options.title || 'Thông báo'}</h3>
                    <p style="color:var(--text-secondary, #666); margin:0 0 20px; font-size:14px;">${options.message || ''}</p>
                    <div class="modal-actions" style="display:flex; justify-content:center;">
                        <button class="btn-modal" onclick="document.getElementById('${id}').remove()" style="padding:10px 30px; border-radius:8px; background:${color}; color:white; border:none; cursor:pointer;">
                            OK
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    // Custom content modal (giữ lại cho các trường hợp đặc biệt như form)
    show: function(options) {
        // SINGLETON: Close any existing modals first to avoid stacking
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

        const id = 'modal-custom-' + Date.now();
        const showIcon = options.showIcon !== false;
        const icon = showIcon ? (this.icons[options.type] || '') : '';
        
        const html = `
            <div class="modal-overlay active" id="${id}" style="z-index:99999;">
                <div class="modal-box" style="position:relative; max-width:${options.maxWidth || '400px'}; animation: modalPop 0.2s ease;">
                    <button onclick="document.getElementById('${id}').remove()" style="position:absolute; top:10px; right:12px; background:none; border:none; font-size:24px; color:#aaa; cursor:pointer;">&times;</button>
                    ${icon ? `<div style="font-size:40px; text-align:center; margin-bottom:5px;">${icon}</div>` : ''}
                    <h3 style="margin-top:5px; text-align:center;">${options.title || 'Thông báo'}</h3>
                    <div id="${id}-content">${options.content || ''}</div>
                    ${options.showCancel !== false || options.onConfirm ? `
                    <div class="modal-actions" style="margin-top:20px; display:flex; gap:10px; justify-content:center;">
                        ${options.showCancel !== false ? `<button class="btn-modal btn-secondary" onclick="document.getElementById('${id}').remove()">${options.cancelText || 'Hủy bỏ'}</button>` : ''}
                        ${options.onConfirm ? `<button class="btn-modal btn-primary" id="${id}-confirm">${options.confirmText || 'Đồng ý'}</button>` : ''}
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        
        if (options.onConfirm) {
            document.getElementById(`${id}-confirm`).onclick = () => {
                options.onConfirm();
                document.getElementById(id).remove();
            };
        }
        
        return id; // Trả về ID để có thể đóng từ bên ngoài
    },

    // Close a specific modal by ID
    close: function(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
};

// Expose globally
window.Modal = Modal;