/**
 * LogTransf - Viagens Module
 */

const ViagensModule = {
    renderView() {
        const carretas = Store.get('carretas').filter(c => c.ativa);
        const locais = Store.get('locais');
        const viagens = Store.get('viagens').sort((a,b) => new Date(b.data) - new Date(a.data));

        const content = `
            <div class="module-container">
                <div class="card registration-card">
                    <div class="card-header">
                        <h3><i data-lucide="plus-circle"></i> Registrar Nova Viagem</h3>
                    </div>
                    <form id="form-viagem">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Data da Transferência</label>
                                <input type="date" id="v-data" class="form-control" value="${Utils.getToday()}" required>
                            </div>
                            <div class="form-group">
                                <label>Motorista</label>
                                <select id="v-motorista" class="form-control" required>
                                    <option value="">Selecione o Motorista...</option>
                                    ${Store.get('motoristas').filter(m => m.ativo).map(m => `<option value="${m.id}">${m.nome}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Tipo de Carreta</label>
                                <select id="v-carreta" class="form-control" required>
                                    <option value="">Selecione...</option>
                                    ${carretas.map(c => `<option value="${c.id}">${c.descricao} (${c.capacidade} plts)</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Quantidade de Paletes</label>
                                <input type="number" id="v-paletes" class="form-control" placeholder="Qtd. Carregada" min="1" required>
                            </div>
                            <div class="form-group">
                                <label>Origem (Unidade)</label>
                                <select id="v-origem" class="form-control" required>
                                    ${locais.map(l => `<option value="${l.id}">${l.nome}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Destino (Unidade)</label>
                                <select id="v-destino" class="form-control" required>
                                    ${locais.map(l => `<option value="${l.id}" ${l.id==='l2'?'selected':''}>${l.nome}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
                            <button type="submit" class="btn btn-primary" style="height: 44px; padding: 0 2.5rem; font-weight: 600;">
                                <i data-lucide="navigation"></i> Gravar Viagem
                            </button>
                        </div>
                    </form>
                </div>

                <div class="card list-card" style="margin-top: 2rem;">
                    <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h3><i data-lucide="list"></i> Histórico de Transferências</h3>
                        <div class="table-actions" style="display: flex; gap: 0.5rem; align-items: center;">
                            <input type="file" id="import-excel" accept=".xlsx, .xls" style="display: none;" onchange="ViagensModule.importExcel(event)">
                            <button class="btn btn-secondary btn-sm" onclick="ViagensModule.downloadModel()"><i data-lucide="download-cloud"></i> Baixar Modelo</button>
                            <button class="btn btn-primary btn-sm" onclick="document.getElementById('import-excel').click()"><i data-lucide="upload"></i> Importar Excel</button>
                            <button class="btn btn-secondary btn-sm" onclick="ViagensModule.exportExcel()"><i data-lucide="download"></i> Exportar</button>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Seq</th>
                                    <th>Carreta</th>
                                    <th>Motorista</th>
                                    <th>Origem</th>
                                    <th>Destino</th>
                                    <th>Paletes</th>
                                    <th>Ocupação</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${viagens.slice(0, 50).map(v => {
                                    const origins = Store.get('locais');
                                    const drivers = Store.get('motoristas');
                                    const carreta = Store.getById('carretas', v.id_tipo_carreta);
                                    const origem = Store.getById('locais', v.id_origem);
                                    const destino = Store.getById('locais', v.id_destino);
                                    const motorista = Store.getById('motoristas', v.id_motorista);
                                    const statusClass = v.ocupacao >= 90 ? 'status-green' : (v.ocupacao >= 70 ? 'status-yellow' : 'status-red');
                                    
                                    const diffDias = Math.floor((new Date() - new Date(v.data)) / (1000 * 60 * 60 * 24));
                                    const role = App.currentUser ? String(App.currentUser.grupo || '').toUpperCase() : '';
                                    const canEdit = diffDias <= 7 || ['ADM', 'SUPERVISOR'].includes(role);
                                    
                                    const actionsHtml = canEdit ? `
                                        <button class="icon-btn" onclick="ViagensModule.edit('${v.id}')" title="Editar"><i data-lucide="edit-3"></i></button>
                                        <button class="icon-btn danger" onclick="ViagensModule.delete('${v.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
                                    ` : `<span title="Bloqueado: Registro > 7 dias" style="padding: 0.5rem; display:inline-block;"><i data-lucide="lock" style="width:16px;height:16px;color:#94a3b8"></i></span>`;
                                    
                                    return `
                                        <tr>
                                            <td>${Utils.formatDate(v.data)}</td>
                                            <td>#${v.sequencial}</td>
                                            <td>${carreta ? carreta.descricao : '-'}</td>
                                            <td>${motorista ? motorista.nome : 'N/A'}</td>
                                            <td>${origem ? origem.nome : '-'}</td>
                                            <td>${destino ? destino.nome : '-'}</td>
                                            <td><strong>${v.quantidade_paletes}</strong></td>
                                            <td>
                                                <div class="occupancy-cell">
                                                    <div class="occupancy-bar-bg">
                                                        <div class="occupancy-bar ${statusClass}" style="width: ${v.ocupacao}%"></div>
                                                    </div>
                                                    <span>${Utils.formatNumber(v.ocupacao, 1)}%</span>
                                                </div>
                                            </td>
                                            <td>${actionsHtml}</td>
                                        </tr>
                                    `;
                                }).join('')}
                                ${viagens.length === 0 ? '<tr><td colspan="8" style="text-align: center; padding: 3rem;">Nenhuma viagem registrada.</td></tr>' : ''}
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
        const form = document.getElementById('form-viagem');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.save();
            });
        }
    },

    save() {
        const data = document.getElementById('v-data').value;
        const carretaId = document.getElementById('v-carreta').value;
        const paletes = parseInt(document.getElementById('v-paletes').value);
        const origemId = document.getElementById('v-origem').value;
        const destinoId = document.getElementById('v-destino').value;
        const motoristaId = document.getElementById('v-motorista').value;

        const carreta = Store.getById('carretas', carretaId);
        if (!carreta) return Utils.notify('Erro ao buscar carreta.', 'danger');

        const ocupacao = Utils.calculatePercent(paletes, carreta.capacidade);
        
        const tripsToday = Store.get('viagens').filter(v => v.data === data);
        const nextSeq = tripsToday.length > 0 ? Math.max(...tripsToday.map(t => t.sequencial)) + 1 : 1;

        const newViagem = {
            data,
            sequencial: nextSeq,
            tipo: 'Saída',
            id_tipo_carreta: carretaId,
            id_motorista: motoristaId,
            id_origem: origemId,
            id_destino: destinoId,
            quantidade_paletes: paletes,
            capacidade_carreta: carreta.capacidade,
            ocupacao: ocupacao,
            mes_referencia: Utils.getMonthRef(data)
        };

        Store.insert('viagens', newViagem);
        Utils.notify('Transferência registrada com sucesso!', 'success');
        this.renderView();
    },

    edit(id) {
        const v = Store.getById('viagens', id);
        if (!v) return;

        const carretas = Store.get('carretas').filter(c => c.ativa);
        const locais = Store.get('locais');

        const formHtml = `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div class="form-group">
                    <label>Data</label>
                    <input type="date" id="edit-v-data" class="form-control" value="${v.data}">
                </div>
                <div class="form-group">
                    <label>Carreta</label>
                    <select id="edit-v-carreta" class="form-control">
                        ${carretas.map(c => `<option value="${c.id}" ${c.id === v.id_tipo_carreta ? 'selected' : ''}>${c.descricao}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Quantidade de Paletes</label>
                    <input type="number" id="edit-v-paletes" class="form-control" value="${v.quantidade_paletes}">
                </div>
                <div class="form-group">
                    <label>Motorista</label>
                    <select id="edit-v-motorista" class="form-control">
                        ${Store.get('motoristas').map(m => `<option value="${m.id}" ${m.id === v.id_motorista ? 'selected' : ''}>${m.nome}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;

        UI.openModal({
            title: 'Editar Viagem',
            formHtml: formHtml,
            onSave: () => {
                const newData = document.getElementById('edit-v-data').value;
                const newCarretaId = document.getElementById('edit-v-carreta').value;
                const newPaletes = parseInt(document.getElementById('edit-v-paletes').value);
                const newMotoristaId = document.getElementById('edit-v-motorista').value;

                const carreta = Store.getById('carretas', newCarretaId);
                const ocupacao = Utils.calculatePercent(newPaletes, carreta.capacidade);

                Store.update('viagens', id, {
                    data: newData,
                    id_tipo_carreta: newCarretaId,
                    id_motorista: newMotoristaId,
                    quantidade_paletes: newPaletes,
                    capacidade_carreta: carreta.capacidade,
                    ocupacao: ocupacao,
                    mes_referencia: Utils.getMonthRef(newData)
                });

                Utils.notify('Viagem atualizada!', 'success');
                this.renderView();
                return true;
            }
        });
    },

    delete(id) {
        if (confirm('Deseja realmente excluir esta viagem?')) {
            Store.delete('viagens', id);
            Utils.notify('Viagem excluída.', 'success');
            this.renderView();
        }
    },

    exportExcel() {
        UI.openExportModal({
            title: 'Viagens',
            onConfirm: (range) => {
                const viagens = Store.get('viagens').filter(v => v.data >= range.start && v.data <= range.end);
                if (viagens.length === 0) return Utils.notify('Sem dados no período.', 'danger');

                const data = viagens.map(v => {
                    const carreta = Store.getById('carretas', v.id_tipo_carreta);
                    const origem = Store.getById('locais', v.id_origem);
                    const destino = Store.getById('locais', v.id_destino);
                    const motorista = Store.getById('motoristas', v.id_motorista);
                    return {
                        'Data': v.data,
                        'Sequencial': v.sequencial,
                        'Motorista': motorista ? motorista.nome : 'N/A',
                        'Carreta': carreta ? carreta.descricao : '',
                        'Capacidade': v.capacidade_carreta,
                        'Origem': origem ? origem.nome : '',
                        'Destino': destino ? destino.nome : '',
                        'Paletes': v.quantidade_paletes,
                        'Ocupação %': v.ocupacao
                    };
                });

                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Viagens");
                XLSX.writeFile(wb, `LogTransf_Viagens_${range.start}_${range.end}.xlsx`);
            }
        });
    },

    downloadModel() {
        const wb = XLSX.utils.book_new();
        const modelData = [
            {
                'Data (AAAA-MM-DD)': '2023-12-01',
                'ID Carreta (Ex: c1, c2)': 'c1',
                'ID Motorista (Ex: m1)': 'm1',
                'Qtd Paletes': 28,
                'ID Origem (Ex: l1, l2)': 'l1',
                'ID Destino': 'l2'
            }
        ];
        const ws = XLSX.utils.json_to_sheet(modelData);
        XLSX.utils.book_append_sheet(wb, ws, "Modelo_Importacao");
        XLSX.writeFile(wb, "Modelo_Importacao_Viagens.xlsx");
        Utils.notify('Modelo exportado para preenchimento. Mantenha os cabeçalhos intocados.', 'info');
    },

    importExcel(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheet];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if(json.length === 0) return Utils.notify('A planilha está vazia.', 'warning');

                let importedCount = 0;
                let viagens = Store.get('viagens');

                json.forEach(row => {
                    const rawData = row['Data (AAAA-MM-DD)'];
                    const carretaId = String(row['ID Carreta (Ex: c1, c2)']||'').trim();
                    const motoristaId = String(row['ID Motorista (Ex: m1)']||'').trim();
                    const paletes = parseInt(row['Qtd Paletes']);
                    const origemId = String(row['ID Origem (Ex: l1, l2)']||'').trim();
                    const destinoId = String(row['ID Destino']||'').trim();

                    if (!rawData || !carretaId || !paletes || isNaN(paletes)) return;

                    const carreta = Store.getById('carretas', carretaId);
                    if (!carreta) return; // ignora linha com carreta inválida
                    
                    const dataFormatada = typeof rawData === 'number' 
                        ? new Date(Math.round((rawData - 25569) * 86400 * 1000)).toISOString().split('T')[0] 
                        : String(rawData).trim();

                    const tripsToday = viagens.filter(v => v.data === dataFormatada);
                    const nextSeq = tripsToday.length > 0 ? Math.max(...tripsToday.map(t => t.sequencial)) + 1 : 1;
                    const ocupacao = Utils.calculatePercent(paletes, carreta.capacidade);

                    const newViagem = {
                        id: 'v_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
                        data: dataFormatada,
                        sequencial: nextSeq,
                        tipo: 'Saída',
                        id_tipo_carreta: carretaId,
                        id_motorista: motoristaId,
                        id_origem: origemId,
                        id_destino: destinoId,
                        quantidade_paletes: paletes,
                        capacidade_carreta: carreta.capacidade,
                        ocupacao: ocupacao,
                        mes_referencia: Utils.getMonthRef(dataFormatada)
                    };
                    
                    viagens.push(newViagem);
                    importedCount++;
                });

                localStorage.setItem('logtransf_viagens', JSON.stringify(viagens));
                Store.loadDB();
                
                if (window.FirebaseDB) FirebaseDB.syncSave(Store.getAll());
                
                Utils.notify(`${importedCount} viagens importadas com sucesso!`, 'success');
                this.renderView();

            } catch (err) {
                console.error(err);
                Utils.notify('Erro ao ler XLSX. Tem certeza que usou o formato do modelo?', 'danger');
            }
            // Reset input
            event.target.value = '';
        };
        reader.readAsArrayBuffer(file);
    }
};

// Add styles for the module
const viajeStyles = document.createElement('style');
viajeStyles.textContent = `
    .horizontal-form .form-row { display: flex; gap: 1rem; margin-bottom: 1rem; }
    .horizontal-form .form-group { flex: 1; }
    .action-group { flex: 0 0 150px !important; }
    .btn-block { width: 100%; }
    
    .data-table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.9rem; }
    .data-table th { text-align: left; padding: 1rem; border-bottom: 2px solid var(--border-color); color: var(--text-muted); font-weight: 600; }
    .data-table td { padding: 1rem; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
    
    .occupancy-cell { display: flex; align-items: center; gap: 0.75rem; }
    .occupancy-bar-bg { flex: 1; height: 8px; background: var(--bg-main); border-radius: 4px; overflow: hidden; max-width: 100px; }
    .occupancy-bar { height: 100%; border-radius: 4px; transition: var(--transition); }
    
    .status-green { background-color: var(--success); }
    .status-yellow { background-color: var(--warning); }
    .status-red { background-color: var(--danger); }
    
    .icon-btn.danger { color: var(--danger); border-radius: 50%; width: 32px; height: 32px; }
    .icon-btn.danger:hover { background: rgba(239, 68, 68, 0.1); }
`;
document.head.appendChild(viajeStyles);
