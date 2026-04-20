/**
 * LogTransf - UI Components
 */

const UI = {
    // Open a modal with a form
    openModal: ({ title, formHtml, onSave, onCancel = null, saveText = 'Salvar' }) => {
        const container = document.getElementById('modal-container');
        if (!container) return;

        const modalId = `modal-${Date.now()}`;
        const modalHtml = `
            <div class="modal-overlay" id="${modalId}">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="icon-btn" id="close-${modalId}"><i data-lucide="x"></i></button>
                    </div>
                    <div class="modal-body">
                        ${formHtml}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="cancel-${modalId}">Cancelar</button>
                        <button class="btn btn-primary" id="save-${modalId}">${saveText}</button>
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', modalHtml);
        lucide.createIcons();

        const overlay = document.getElementById(modalId);
        const closeBtn = document.getElementById(`close-${modalId}`);
        const cancelBtn = document.getElementById(`cancel-${modalId}`);
        const saveBtn = document.getElementById(`save-${modalId}`);

        const close = () => overlay.remove();

        closeBtn.addEventListener('click', close);
        cancelBtn.addEventListener('click', close);
        saveBtn.addEventListener('click', () => {
            if (onSave(modalId)) close();
        });
    },

    // Get color based on occupancy
    getOccColor: (percent) => {
        if (percent >= 90) return 'var(--success)';
        if (percent >= 70) return 'var(--warning)';
        return 'var(--danger)';
    },

    // Modal for Filtered Export
    openExportModal: ({ title, onConfirm }) => {
        const today = Utils.getToday();
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        const startDate = fifteenDaysAgo.toISOString().split('T')[0];

        const formHtml = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Data Inicial</label>
                    <input type="date" id="exp-start" class="form-control" value="${startDate}">
                </div>
                <div class="form-group">
                    <label>Data Final</label>
                    <input type="date" id="exp-end" class="form-control" value="${today}">
                </div>
            </div>
            <p style="margin-top: 1.5rem; font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: flex-start; gap: 0.5rem;">
                <i data-lucide="info" style="width: 16px; height: 16px; flex-shrink: 0; color: var(--primary);"></i> 
                <span>O arquivo Excel conterá apenas os registros dentro do período selecionado.</span>
            </p>
        `;

        UI.openModal({
            title: `Exportar ${title}`,
            formHtml,
            saveText: 'Gerar Excel',
            onSave: () => {
                const start = document.getElementById('exp-start').value;
                const end = document.getElementById('exp-end').value;
                if (!start || !end) {
                    Utils.notify('Informe as datas.', 'danger');
                    return false;
                }
                onConfirm({ start, end });
                return true;
            }
        });
    }
};

// Add Modal Styles
const modalStyles = document.createElement('style');
modalStyles.textContent = `
    .modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease;
    }
    .modal-content {
        background: var(--bg-surface);
        width: 100%;
        max-width: 500px;
        border-radius: var(--border-radius-lg);
        box-shadow: var(--shadow-lg);
        overflow: hidden;
        animation: slideUp 0.3s ease;
    }
    .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--border-color);
        display: flex; justify-content: space-between; align-items: center;
    }
    .modal-body { padding: 1.5rem; }
    .modal-footer {
        padding: 1.25rem 1.5rem;
        border-top: 1px solid var(--border-color);
        display: flex; justify-content: flex-end; gap: 1rem;
        background: var(--bg-main);
    }
    @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }

    /* Form Grid Utility */
    .form-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.25rem;
        margin-top: 0.5rem;
    }
    .form-grid .form-group.full-width {
        grid-column: span 2;
    }

    /* Sub-navigation Pills */
    .subnav-pills {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 2rem;
        padding: 0.5rem;
        background: var(--bg-main);
        border-radius: 1rem;
        width: fit-content;
    }
    .pill-btn {
        padding: 0.6rem 1.25rem;
        border: none;
        background: transparent;
        color: var(--text-muted);
        font-weight: 600;
        font-size: 0.85rem;
        border-radius: 0.75rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.2s;
    }
    .pill-btn i { width: 16px; height: 16px; }
    .pill-btn:hover {
        background: rgba(56, 189, 248, 0.05);
        color: var(--primary);
    }
    .pill-btn.active {
        background: var(--primary);
        color: white;
        box-shadow: 0 4px 12px rgba(56, 189, 248, 0.2);
    }
`;
document.head.appendChild(modalStyles);
