/**
 * LogTransf - Saldo Diário Module
 */

const SaldoModule = {
    renderView() {
        const saldos = Store.get('saldos').sort((a,b) => new Date(b.data) - new Date(a.data));
        
        const isVisitor = String(App.currentUser.grupo || '').toUpperCase() === 'VISITANTE';

        const content = `
            <div class="module-container">
                ${!isVisitor ? `
                <div class="card registration-card">
                    <div class="card-header">
                        <h3><i data-lucide="package-plus"></i> Registrar Saldo do Dia</h3>
                        <p style="color: var(--text-muted); font-size: 0.9rem;">Informe a quantidade de paletes disponíveis para transferência no início do dia.</p>
                    </div>
                    <form id="form-saldo" style="margin-top: 1.5rem;">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Data de Referência</label>
                                <input type="date" id="s-data" class="form-control" value="${Utils.getToday()}" required>
                            </div>
                            <div class="form-group">
                                <label>Saldo Inicial (Paletes)</label>
                                <input type="number" id="s-quantidade" class="form-control" placeholder="Qtd. Total" min="0" required>
                            </div>
                            <div class="form-group full-width">
                                <label>Observação / Ocorrência (Opcional)</label>
                                <textarea id="s-obs" class="form-control" rows="3" placeholder="Ex: Atraso na produção, falta de caixas, etc..."></textarea>
                            </div>
                        </div>
                        <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
                            <button type="submit" class="btn btn-primary" style="height: 44px; padding: 0 2.5rem; font-weight: 600;">
                                <i data-lucide="save"></i> Gravar Saldo Diário
                            </button>
                        </div>
                    </form>
                </div>
                ` : `
                <div class="info-card" style="background: var(--bg-surface); padding: 1.5rem; border-radius: var(--border-radius); border-left: 4px solid var(--primary); margin-bottom: 2rem;">
                    <h4 style="display: flex; align-items: center; gap: 0.5rem; color: var(--primary);">
                        <i data-lucide="eye"></i> Modo de Visualização (Saldos)
                    </h4>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.5rem;">
                        Apenas visualização do histórico de saldos comerciais. Lançamentos bloqueados.
                    </p>
                </div>
                `}

                <div class="card list-card" style="margin-top: 2rem;">
                    <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h3><i data-lucide="history"></i> Histórico de Saldos</h3>
                        <button class="btn btn-secondary btn-sm" onclick="SaldoModule.exportExcel()"><i data-lucide="download"></i> Excel</button>
                    </div>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Saldo Inicial</th>
                                    <th>Viagens Realizadas</th>
                                    <th>Paletes Enviados</th>
                                    <th>Observação</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${saldos.map(s => {
                                    const tripsToday = Store.get('viagens').filter(v => v.data === s.data);
                                    const sentToday = tripsToday.reduce((acc, v) => acc + v.quantidade_paletes, 0);
                                    
                                    return `
                                        <tr>
                                            <td><strong>${Utils.formatDate(s.data)}</strong></td>
                                            <td>${Utils.formatNumber(s.saldo_inicio)} plts</td>
                                            <td>${tripsToday.length} viagens</td>
                                            <td>${Utils.formatNumber(sentToday)} plts</td>
                                            <td><small>${s.observacao || '-'}</small></td>
                                            <td>
                                                ${!isVisitor ? `
                                                    <button class="icon-btn danger" onclick="SaldoModule.delete('${s.data}')"><i data-lucide="trash-2"></i></button>
                                                ` : '<i data-lucide="lock" style="width:16px;color:#94a3b8"></i>'}
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                                ${saldos.length === 0 ? '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Nenhum saldo registrado.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.querySelector('.content-body').innerHTML = content;
        lucide.createIcons();
        this.bindEvents();
    },

    bindEvents() {
        const form = document.getElementById('form-saldo');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.save();
            });
        }
    },

    save() {
        const data = document.getElementById('s-data').value;
        const saldo = parseInt(document.getElementById('s-quantidade').value);
        const obs = document.getElementById('s-obs').value;

        const saldos = Store.get('saldos');
        const existingIndex = saldos.findIndex(s => s.data === data);

        if (existingIndex !== -1) {
            if (confirm('Já existe um saldo para esta data. Deseja sobrescrever?')) {
                saldos[existingIndex] = { data, saldo_inicio: saldo, observacao: obs };
            } else {
                return;
            }
        } else {
            saldos.push({ data, saldo_inicio: saldo, observacao: obs });
        }

        Store.set('saldos', saldos);
        Utils.notify('Saldo diário gravado!', 'success');
        this.renderView();
    },

    delete(date) {
        if (confirm(`Deseja excluir o registro de saldo do dia ${Utils.formatDate(date)}?`)) {
            const saldos = Store.get('saldos').filter(s => s.data !== date);
            Store.set('saldos', saldos);
            Utils.notify('Registro removido.', 'success');
            this.renderView();
        }
    },

    exportExcel() {
        UI.openExportModal({
            title: 'Saldos Diários',
            onConfirm: (range) => {
                const saldos = Store.get('saldos').filter(s => s.data >= range.start && s.data <= range.end);
                if (saldos.length === 0) return Utils.notify('Sem dados no período.', 'danger');

                const data = saldos.map(s => {
                    const tripsToday = Store.get('viagens').filter(v => v.data === s.data);
                    const sentToday = tripsToday.reduce((acc, v) => acc + (v.quantidade_paletes || 0), 0);
                    return {
                        'Data': s.data,
                        'Saldo Inicial (Plts)': s.saldo_inicio,
                        'Viagens Realizadas': tripsToday.length,
                        'Total Paletes Enviados': sentToday,
                        'Observação': s.observacao || ''
                    };
                });

                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Saldos Diários");
                XLSX.writeFile(wb, `LogTransf_Saldos_${range.start}_${range.end}.xlsx`);
            }
        });
    }
};
