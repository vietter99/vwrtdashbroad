const Modal = {
    init: function() {
        if (!document.getElementById('custom-modal-overlay')) {
            const html = `
                <div id="custom-modal-overlay" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-icon">?</div>
                        <h3 id="modal-title">Xác nhận</h3>
                        <p id="modal-message">Nội dung thông báo...</p>
                        <div class="modal-actions">
                            <button id="btn-modal-cancel" class="btn-modal btn-secondary">Hủy bỏ</button>
                            <button id="btn-modal-confirm" class="btn-modal btn-primary">Đồng ý</button>
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