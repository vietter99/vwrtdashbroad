const NavbarModule = {
    init: function() {
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            const btn = item.querySelector('.icon-btn');
            const popup = item.querySelector('.popup-box');

            if (!popup) return;

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); 
                // 1. Đóng các popup khác
                navItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        const otherPopup = otherItem.querySelector('.popup-box');
                        if (otherPopup) {
                            otherItem.classList.remove('active');
                            otherPopup.classList.add('hidden');
                        }
                    }
                });

                // 2. Toggle popup hiện tại
                const isHidden = popup.classList.contains('hidden');
                if (isHidden) {
                    popup.classList.remove('hidden');
                    item.classList.add('active');
                } else {
                    popup.classList.add('hidden');
                    item.classList.remove('active');
                }
            });
        });

        // Click ra ngoài thì đóng tất cả
        document.addEventListener('click', (e) => {
            navItems.forEach(item => {
                const popup = item.querySelector('.popup-box');
                if (popup && !popup.classList.contains('hidden')) {
                    if (!item.contains(e.target)) {
                        popup.classList.add('hidden');
                        item.classList.remove('active');
                    }
                }
            });
        });
    }
};

document.addEventListener('DOMContentLoaded', NavbarModule.init);