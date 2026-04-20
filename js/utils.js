/**
 * LogTransf - Utility Helpers
 */

const Utils = {
    // Generate unique ID
    generateId: () => {
        return 'id-' + Math.random().toString(36).substr(2, 16);
    },

    // Format Date to PT-BR
    formatDate: (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr + 'T12:00:00');
        return date.toLocaleDateString('pt-BR');
    },

    // Format Number to Decimal
    formatNumber: (num, decimals = 0) => {
        return Number(num).toLocaleString('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    },

    // Get current date YYYY-MM-DD
    getToday: () => {
        return new Date().toISOString().split('T')[0];
    },

    // Get month reference YYYY-MM
    getMonthRef: (dateStr) => {
        return dateStr.substring(0, 7);
    },

    // Calculate Percent (Robust)
    calculatePercent: (part, total) => {
        const p = parseFloat(part);
        const t = parseFloat(total);
        if (isNaN(p) || isNaN(t) || t === 0) return 0;
        return (p / t) * 100;
    },

    // Get count of unique days that actually have records
    getDaysWithData: (viagens) => {
        if (!viagens || viagens.length === 0) return 0;
        const days = new Set(viagens.map(v => v.data));
        return days.size;
    },

    // Generate an array of dates between start and end (inclusive)
    getDateRange: (start, end) => {
        const dates = [];
        let curr = new Date(start + 'T12:00:00');
        const last = new Date(end + 'T12:00:00');
        while (curr <= last) {
            dates.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }
        return dates;
    },

    // Show Notification (Simple implementation)
    notify: (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Add toast styles
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    .toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: var(--bg-surface);
        border-radius: 0.75rem;
        box-shadow: var(--shadow-lg);
        border-left: 4px solid var(--primary);
        z-index: 9999;
        transform: translateY(100px);
        transition: var(--transition);
        font-weight: 500;
        opacity: 0;
    }
    .toast.show { transform: translateY(0); opacity: 1; }
    .toast-success { border-left-color: var(--success); }
    .toast-danger { border-left-color: var(--danger); }
`;
document.head.appendChild(toastStyle);
