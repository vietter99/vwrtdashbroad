const Modal = {
    init: function() {
        if (!document.getElementById('custom-modal-overlay')) {
            const html = `
                <div id="custom-modal-overlay" class="modal-overlay hidden">
                    <div class="modal-box" style="position:relative;">
                        <button onclick="Modal.close()" style="position:absolute; top:10px; right:12px; background:none; border:none; font-size:24px; color:#aaa; cursor:pointer; padding:5px 10px;">&times;</button>
                        <div class="modal-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        </div>
                        <h3 id="modal-title" style="margin-top:5px;">Xác nhận</h3>
                        <p id="modal-message">Nội dung thông báo...</p>
                        <div class="modal-actions">
                            <button id="btn-modal-cancel" class="btn-modal btn-secondary" style="padding:10px 20px;">Hủy bỏ</button>
                            <button id="btn-modal-confirm" class="btn-modal btn-primary" style="padding:10px 20px;">Đồng ý</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
            document.getElementById('btn-modal-cancel').addEventListener('click', () => {
                Modal.close();
            });
        }
    },
    show: function(options) {
        this.init();
        const overlay = document.getElementById('custom-modal-overlay');
        const titleEl = document.getElementById('modal-title');
        const msgEl = document.getElementById('modal-message');
        const btnConfirm = document.getElementById('btn-modal-confirm');
        const btnCancel = document.getElementById('btn-modal-cancel');
        
        titleEl.innerText = options.title || "Thông báo";
        msgEl.innerHTML = options.content || "";
        
        btnConfirm.innerText = options.confirmText || "Đồng ý";
        btnCancel.innerText = options.cancelText || "Hủy bỏ";
        
        if (options.showCancel === false) btnCancel.style.display = 'none';
        else btnCancel.style.display = 'inline-block';

        const iconEl = overlay.querySelector('.modal-icon');
        if (iconEl) {
            if (options.showIcon === false) iconEl.style.display = 'none';
            else iconEl.style.display = 'block';
        }

        // Clear and add listener
        const newBtn = btnConfirm.cloneNode(true);
        btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);
        
        newBtn.addEventListener('click', () => {
            if (options.onConfirm) options.onConfirm();
            this.close();
        });

        overlay.classList.remove('hidden');
        overlay.classList.add('active');
    },

    confirm: function(title, message, onConfirm) {
        this.show({
            title: title,
            content: message,
            onConfirm: onConfirm
        });
    },

    close: function() {
        const overlay = document.getElementById('custom-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 300);
        }
    }
};