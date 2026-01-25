const Toast = {
    init: function() {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
    },
    show: function(message, type = 'info') {
        this.init();
        
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.classList.add('toast', `toast-${type}`);
        let iconChar = 'ℹ';
        if (type === 'success') iconChar = '✔';
        if (type === 'error') iconChar = '✘';

        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${iconChar}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3500);
    }
};