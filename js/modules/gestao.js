/**
 * LogTransf - Management & Settings Module
 */

const GestaoModule = {
    currentTab: 'motoristas',
    activeArea: 'settings', // 'settings' or 'management'

    renderSettings() {
        this.activeArea = 'settings';
        if (!['motoristas', 'carretas', 'locais'].includes(this.currentTab)) {
            this.currentTab = 'motoristas';
        }
        this.renderView();
    },

    renderManagement() {
        this.activeArea = 'management';
        if (!['usuarios', 'grupos', 'manutencao'].includes(this.currentTab)) {
            this.currentTab = 'usuarios';
        }
        this.renderView();
    },

    renderView() {
        const content = `
            <div class="module-container">
                <div class="subnav-pills">
                    ${this.renderSubNav()}
                </div>
                <div id="gestao-content">
                    ${this.renderTabContent()}
                </div>
            </div>
        `;

        document.querySelector('.content-body').innerHTML = content;
        lucide.createIcons();
    },

    renderSubNav() {
        const userGroup = String(App.currentUser.grupo || '').toUpperCase();
        
        let tabs = [];
        if (this.activeArea === 'settings') {
            tabs = [
                { id: 'motoristas', label: 'Motoristas', icon: 'users' },
                { id: 'carretas', label: 'Carretas', icon: 'truck' },
                { id: 'locais', label: 'Locais', icon: 'map-pin' }
            ];
            // Custo por Palete: only ADM and Supervisor
            if (userGroup === 'ADM' || userGroup === 'GESTOR' || userGroup === 'SUPERVISOR') {
                tabs.push({ id: 'custos', label: 'Custos', icon: 'dollar-sign' });
            }
        } else {
            if (userGroup === 'ADM' || userGroup === 'GESTOR') {
                tabs.push({ id: 'administracao', label: 'Administração', icon: 'wrench' });
                tabs.push({ id: 'usuarios', label: 'Usuários', icon: 'user-cog' });
                tabs.push({ id: 'grupos', label: 'Grupos', icon: 'shield' });
                tabs.push({ id: 'manutencao', label: 'Manutenção', icon: 'database' });
                tabs.push({ id: 'assistente', label: 'Assistente IA', icon: 'sparkles' });
            } else if (userGroup === 'SUPERVISOR') {
                tabs.push({ id: 'usuarios', label: 'Usuários', icon: 'user-cog' });
            }
        }

        return tabs.map(tab => `
            <button class="pill-btn ${this.currentTab === tab.id ? 'active' : ''}" 
                    onclick="GestaoModule.switchSubTab('${tab.id}')">
                <i data-lucide="${tab.icon}"></i> ${tab.label}
            </button>
        `).join('');
    },

    switchSubTab(tabId) {
        this.currentTab = tabId;
        this.renderView();
    },

    renderTabContent() {
        switch (this.currentTab) {
            case 'motoristas': return this.renderMotoristas();
            case 'carretas': return this.renderCarretas();
            case 'locais': return this.renderLocais();
            case 'custos': return this.renderCustos();
            case 'usuarios': return this.renderUsuarios();
            case 'grupos': return this.renderGrupos();
            case 'administracao': return this.renderAdministracao();
            case 'manutencao': return this.renderManutencao();
            case 'assistente': return this.renderAssistente();
            default: return `<div class="card"><h3>Em construção...</h3></div>`;
        }
    },

    // --- Motoristas ---
    renderMotoristas() {
        const motoristas = Store.get('motoristas') || [];
        const isVisitor = String(App.currentUser.grupo || '').toUpperCase() === 'VISITANTE';
        return `
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3><i data-lucide="users"></i> Cadastro de Motoristas</h3>
                    ${!isVisitor ? `
                    <button class="btn btn-primary btn-sm" onclick="GestaoModule.openMotoristaModal()">
                        <i data-lucide="plus"></i> Novo Motorista
                    </button>
                    ` : ''}
                </div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width: 80px;">ID</th>
                                <th>Nome</th>
                                <th>Status</th>
                                <th style="text-align: right;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${motoristas.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: var(--text-muted);">Nenhum motorista cadastrado.</td></tr>' : ''}
                            ${motoristas.map(m => `
                                <tr>
                                    <td><code class="id-badge">${m.id}</code></td>
                                    <td><strong>${m.nome}</strong></td>
                                    <td><span class="status-badge ${m.ativo ? 'success' : 'danger'}">${m.ativo ? 'Ativo' : 'Inativo'}</span></td>
                                    <td style="text-align: right;">
                                        ${!isVisitor ? `
                                            <button class="icon-btn" onclick="GestaoModule.openMotoristaModal('${m.id}')"><i data-lucide="edit-3"></i></button>
                                            <button class="icon-btn delete" onclick="GestaoModule.removeDataItem('motoristas', '${m.id}')"><i data-lucide="trash-2"></i></button>
                                        ` : '<i data-lucide="lock" style="width:16px;color:#94a3b8"></i>'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    openMotoristaModal(id = null) {
        const item = id ? Store.getById('motoristas', id) : null;
        const formHtml = `
            <div class="form-group">
                <label>Nome do Motorista</label>
                <input type="text" id="m-nome" class="form-control" value="${item ? item.nome : ''}" placeholder="Ex: João Silva">
            </div>
            <div class="form-group" style="margin-top: 1rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="m-ativo" ${item ? (item.ativo ? 'checked' : '') : 'checked'}> Ativo
                </label>
            </div>
        `;

        UI.openModal({
            title: id ? 'Editar Motorista' : 'Novo Motorista',
            formHtml,
            onSave: () => {
                const nome = document.getElementById('m-nome').value.trim();
                const ativo = document.getElementById('m-ativo').checked;
                if (!nome) return Utils.notify('Informe o nome.', 'danger');

                const data = { nome, ativo };
                if (id) {
                    Store.update('motoristas', id, data);
                    Utils.notify('Motorista atualizado.');
                } else {
                    Store.insert('motoristas', data);
                    Utils.notify('Motorista cadastrado.');
                }
                this.renderView();
                return true;
            }
        });
    },

    // --- Locais ---
    renderLocais() {
        const locais = Store.get('locais') || [];
        const isVisitor = String(App.currentUser.grupo || '').toUpperCase() === 'VISITANTE';
        return `
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3><i data-lucide="map-pin"></i> Cadastro de Locais</h3>
                    ${!isVisitor ? `
                    <button class="btn btn-primary btn-sm" onclick="GestaoModule.openLocalModal()">
                        <i data-lucide="plus"></i> Novo Local
                    </button>
                    ` : ''}
                </div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width: 80px;">ID</th>
                                <th>Nome</th>
                                <th>Tipo</th>
                                <th style="text-align: right;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${locais.map(l => `
                                <tr>
                                    <td><code class="id-badge">${l.id}</code></td>
                                    <td><strong>${l.nome}</strong></td>
                                    <td><span class="status-badge">${l.tipo || 'Padrão'}</span></td>
                                    <td style="text-align: right;">
                                        ${!isVisitor ? `
                                            <button class="icon-btn" onclick="GestaoModule.openLocalModal('${l.id}')"><i data-lucide="edit-3"></i></button>
                                            <button class="icon-btn delete" onclick="GestaoModule.removeDataItem('locais', '${l.id}')"><i data-lucide="trash-2"></i></button>
                                        ` : '<i data-lucide="lock" style="width:16px;color:#94a3b8"></i>'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    openLocalModal(id = null) {
        const item = id ? Store.getById('locais', id) : null;
        UI.openModal({
            title: id ? 'Editar Local' : 'Novo Local',
            formHtml: `
                <div class="form-group">
                    <label>Nome do Local</label>
                    <input type="text" id="l-nome" class="form-control" value="${item ? item.nome : ''}" placeholder="Ex: Galpão B">
                </div>
            `,
            onSave: () => {
                const nome = document.getElementById('l-nome').value.trim();
                if (!nome) return Utils.notify('Informe o nome do local.', 'danger');

                if (id) {
                    Store.update('locais', id, { nome });
                    Utils.notify('Local atualizado com sucesso!');
                } else {
                    Store.insert('locais', { nome, tipo: 'Padrão' });
                    Utils.notify('Local cadastrado com sucesso!');
                }
                this.renderView();
                return true;
            }
        });
    },

    // --- Carretas ---
    renderCarretas() {
        const carretas = Store.get('carretas') || [];
        const isVisitor = String(App.currentUser.grupo || '').toUpperCase() === 'VISITANTE';
        return `
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3><i data-lucide="truck"></i> Tipos de Carreta</h3>
                </div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width: 80px;">ID</th>
                                <th>Descrição</th>
                                <th>Capacidade (Plts)</th>
                                <th style="text-align: right;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${carretas.map(c => `
                                <tr>
                                    <td><code class="id-badge">${c.id}</code></td>
                                    <td><strong>${c.descricao}</strong></td>
                                    <td>${c.capacidade} plts</td>
                                    <td style="text-align: right;">
                                        ${!isVisitor ? `
                                            <button class="icon-btn" onclick="GestaoModule.openCarretaModal('${c.id}')"><i data-lucide="edit-3"></i></button>
                                        ` : '<i data-lucide="lock" style="width:16px;color:#94a3b8"></i>'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // --- Custos por Palete (Histórico) ---
    renderCustos() {
        const config = Store.get('config');
        const historico = config.custos_historico || [];
        const hoje = new Date().toISOString().split('T')[0];
        const carretas = Store.get('carretas');
        const isAdmin = App.currentUser?.grupo === 'ADM';

        // Ordena histórico para exibir o mais recente primeiro
        const historicoOrdenado = [...historico].sort((a,b) => b.data_vigencia.localeCompare(a.data_vigencia));

        return `
            <div class="card">
                <div class="card-header">
                    <h3><i data-lucide="plus-circle"></i> Registrar Novo Custo por Palete</h3>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem;">Informe o novo custo (R$) por palete e a data a partir de qual este valor passa a valer (Data de Vigência).</p>
                </div>
                <div class="card-body" style="padding: 1.5rem;">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Data de Vigência</label>
                            <input type="date" id="custo-data" class="form-control" value="${hoje}" max="${hoje}">
                        </div>
                        ${carretas.map(c => `
                            <div class="form-group">
                                <label>${c.descricao} <small style="color: var(--text-muted);">(${c.capacidade} plts)</small></label>
                                <div style="position: relative;">
                                    <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-weight: 600;">R$</span>
                                    <input type="number" id="custo-${c.id}" class="form-control" 
                                           style="padding-left: 40px;" 
                                           value="" 
                                           step="0.01" min="0" 
                                           placeholder="0.00">
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
                        <button class="btn btn-primary" onclick="GestaoModule.saveCustos()">
                            <i data-lucide="save"></i> Registrar Novo Custo
                        </button>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: 1.5rem;">
                <div class="card-header">
                    <h3><i data-lucide="history"></i> Histórico e Vigência de Custos</h3>
                </div>
                <div class="card-body" style="padding: 0;">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Data de Vigência</th>
                                    <th>Convencional (c1)</th>
                                    <th>Double Deck (c2)</th>
                                    <th>Registrado por</th>
                                    <th>Data de Registro</th>
                                    ${isAdmin ? '<th style="text-align:right;">Ações</th>' : ''}
                                </tr>
                            </thead>
                            <tbody>
                                ${historicoOrdenado.length === 0 ? `<tr><td colspan="${isAdmin ? 6 : 5}" style="text-align: center; color: var(--text-muted);">Nenhum custo registrado.</td></tr>` : ''}
                                ${historicoOrdenado.map(h => `
                                    <tr>
                                        <td><strong>${Utils.formatDate(h.data_vigencia)}</strong></td>
                                        <td>R$ ${Number(h.c1 || 0).toFixed(2)}</td>
                                        <td>R$ ${Number(h.c2 || 0).toFixed(2)}</td>
                                        <td>${h.registrado_por}</td>
                                        <td style="color: var(--text-muted);">${Utils.formatDate(h.registrado_em.split('T')[0])}</td>
                                        ${isAdmin ? `
                                        <td style="text-align:right;">
                                            <button class="btn-icon" style="color: var(--danger);" title="Excluir" onclick="GestaoModule.deleteCustoHistorico('${h.id}')">
                                                <i data-lucide="trash-2"></i>
                                            </button>
                                        </td>
                                        ` : ''}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="info-card" style="margin-top: 1.5rem; background: var(--primary-light); padding: 1.5rem; border-radius: var(--border-radius); border-left: 4px solid var(--primary);">
                <h4 style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-main);">
                    <i data-lucide="info" style="width: 18px; height: 18px;"></i> Como funciona
                </h4>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">
                    <strong>Regra de Negócio:</strong> O sistema mantém um histórico dos valores. Cada viagem utiliza automaticamente o custo que estava em vigor na data em que foi realizada. O custo de uma viagem é igual a <em>capacidade do veículo × custo vigente cadastrado</em>.<br>
                    <strong>Atenção ADM:</strong> Registros equivocados podem ser excluídos apenas por administradores para manter a auditoria da base de dados intacta.
                </p>
            </div>
        `;
    },

    saveCustos() {
        const dataVigencia = document.getElementById('custo-data').value;
        if (!dataVigencia) {
            Utils.notify('Informe a data de vigência do custo.', 'error');
            return;
        }

        const carretas = Store.get('carretas');
        const config = Store.get('config');
        if (!config.custos_historico) config.custos_historico = [];

        const novoRegistro = {
            id: Utils.generateId(8),
            data_vigencia: dataVigencia,
            registrado_em: new Date().toISOString(),
            registrado_por: App.currentUser ? App.currentUser.nome : 'Sistema'
        };

        let isValid = false;
        
        carretas.forEach(c => {
            const val = parseFloat(document.getElementById(`custo-${c.id}`)?.value);
            novoRegistro[c.id] = isNaN(val) ? 0 : val;
            if (!isNaN(val) && val > 0) isValid = true;
        });

        if (!isValid) {
            if (!confirm('Todos os custos estão zerados ou vazios. Deseja registrar custos zerados?')) {
                return;
            }
        }

        // Verifica se já existe um registro na mesma data de vigência para sobrepor ou apenas avisa
        const indexExistente = config.custos_historico.findIndex(h => h.data_vigencia === dataVigencia);
        if (indexExistente !== -1) {
            if (!confirm(`Já existe um custo registrado com vigência em ${Utils.formatDate(dataVigencia)}. Deseja substituir?`)) {
                return;
            }
            config.custos_historico[indexExistente] = { ...config.custos_historico[indexExistente], ...novoRegistro, id: config.custos_historico[indexExistente].id };
        } else {
            config.custos_historico.push(novoRegistro);
        }

        // Atualiza o legacy 'custos_palete' para o último registro vigente (apenas para fallback, se necessário)
        const registroMaisRecente = [...config.custos_historico].sort((a,b) => b.data_vigencia.localeCompare(a.data_vigencia))[0];
        if (registroMaisRecente) {
            config.custos_palete = { 'c1': registroMaisRecente.c1 || 0, 'c2': registroMaisRecente.c2 || 0 };
        }

        Store.set('config', config);
        Utils.notify('Novo custo registrado com histórico!', 'success');
        this.renderView();
    },

    deleteCustoHistorico(id) {
        if (!confirm('Tem certeza que deseja excluir este registro de custo? Viagens retroativas podem ser impactadas pelo recálculo.')) {
            return;
        }
        
        const config = Store.get('config');
        if (config.custos_historico) {
            config.custos_historico = config.custos_historico.filter(h => h.id !== id);
            
            // Re-atualiza o legacy 'custos_palete'
            const registroMaisRecente = [...config.custos_historico].sort((a,b) => b.data_vigencia.localeCompare(a.data_vigencia))[0];
            config.custos_palete = registroMaisRecente ? { 'c1': registroMaisRecente.c1 || 0, 'c2': registroMaisRecente.c2 || 0 } : { 'c1': 0, 'c2': 0 };
            
            Store.set('config', config);
            Utils.notify('Registro de custo excluído com sucesso.', 'success');
            this.renderView();
        }
    },

    openCarretaModal(id) {
        const item = Store.getById('carretas', id);
        UI.openModal({
            title: 'Editar Carreta',
            formHtml: `
                <div class="form-group">
                    <label>Descrição do Veículo</label>
                    <input type="text" id="c-desc" class="form-control" value="${item.descricao}">
                </div>
                <div class="form-group" style="margin-top: 1rem;">
                    <label>Capacidade (Paletes)</label>
                    <input type="number" id="c-cap" class="form-control" value="${item.capacity || item.capacidade}">
                </div>
            `,
            onSave: () => {
                const descricao = document.getElementById('c-desc').value.trim();
                const capacidade = parseInt(document.getElementById('c-cap').value);
                
                if (!descricao) return Utils.notify('Informe a descrição.', 'danger');

                Store.update('carretas', id, { descricao, capacidade });
                Utils.notify('Tipo de carreta atualizado.');
                this.renderView();
                return true;
            }
        });
    },

    renderUsuarios() {
        const users = Store.get('users') || [];
        const isVisitor = String(App.currentUser.grupo || '').toUpperCase() === 'VISITANTE';
        return `
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3><i data-lucide="user-cog"></i> Controle de Usuários</h3>
                    ${!isVisitor ? `
                    <button class="btn btn-primary btn-sm" onclick="GestaoModule.openUserModal()">
                        <i data-lucide="plus"></i> Novo Usuário
                    </button>
                    ` : ''}
                </div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Login</th>
                                <th>Grupo</th>
                                <th style="text-align: right;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => {
                                const hierarchy = { 'ADM': 3, 'SUPERVISOR': 2, 'OPERADOR': 1 };
                                const currentUserGroup = String(App.currentUser.grupo || '').toUpperCase();
                                const targetUserGroup = String(u.grupo || '').toUpperCase();
                                const currentWeight = hierarchy[currentUserGroup] || 1;
                                const targetWeight = hierarchy[targetUserGroup] || 1;
                                
                                // Can only edit if current weight >= target weight AND not a visitor
                                const canEdit = currentWeight >= targetWeight && !isVisitor;

                                return `
                                    <tr>
                                        <td><strong>${u.nome}</strong></td>
                                        <td>${u.login}</td>
                                        <td><span class="status-badge">${u.grupo}</span></td>
                                        <td style="text-align: right;">
                                            ${canEdit ? `
                                                <button class="icon-btn" onclick="GestaoModule.resetPassword('${u.id}')" title="Redefinir Senha"><i data-lucide="key"></i></button>
                                                <button class="icon-btn" onclick="GestaoModule.openUserModal('${u.id}')" title="Editar"><i data-lucide="edit-3"></i></button>
                                                <button class="icon-btn delete" onclick="GestaoModule.removeDataItem('users', '${u.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
                                            ` : '<span style="color: var(--text-muted); font-size: 0.75rem;">Protegido</span>'}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    openUserModal(id = null) {
        const item = id ? Store.getById('users', id) : null;
        
        const hierarchy = { 'ADM': 3, 'SUPERVISOR': 2, 'OPERADOR': 1 };
        const myGroup = String(App.currentUser.grupo || '').toUpperCase();
        const myWeight = hierarchy[myGroup] || 1;

        // Filter groups I can assign
        const allGroups = ['ADM', 'Supervisor', 'Operador', 'Visitante'];
        const allowedGroups = allGroups.filter(g => {
            const gWeight = hierarchy[g.toUpperCase()] || 1;
            return myWeight >= gWeight;
        });

        UI.openModal({
            title: id ? 'Editar Usuário' : 'Novo Usuário',
            formHtml: `
                <div class="form-grid">
                    <div class="form-group">
                        <label>Nome Completo</label>
                        <input type="text" id="u-nome" class="form-control" value="${item ? item.nome : ''}">
                    </div>
                    <div class="form-group">
                        <label>Login de Acesso</label>
                        <input type="text" id="u-login" class="form-control" value="${item ? item.login : ''}" ${id ? 'readonly' : ''}>
                    </div>
                    <div class="form-group">
                        <label>Grupo de Acesso</label>
                        <select id="u-grupo" class="form-control">
                            ${allowedGroups.map(g => `<option value="${g}" ${item && item.grupo === g ? 'selected' : ''}>${g}</option>`).join('')}
                        </select>
                    </div>
                    ${!id ? `
                    <div class="form-group">
                        <label>Senha Inicial</label>
                        <input type="password" id="u-pass" class="form-control" value="Senha123">
                    </div>
                    ` : ''}
                </div>
            `,
            onSave: () => {
                const nome = document.getElementById('u-nome').value.trim();
                const login = document.getElementById('u-login').value.trim();
                const grupo = document.getElementById('u-grupo').value;
                
                if (!nome || !login) return Utils.notify('Preencha os campos obrigatórios.', 'danger');

                const data = { nome, login, grupo };
                if (!id) {
                    const pass = document.getElementById('u-pass').value;
                    if (pass.length < 3) return Utils.notify('Senha muito curta.', 'danger');
                    data.senha = pass;
                    Store.insert('users', data);
                    Utils.notify('Usuário criado!');
                } else {
                    Store.update('users', id, data);
                    Utils.notify('Usuário atualizado!');
                }
                this.renderView();
                return true;
            }
        });
    },

    resetPassword(id) {
        if (confirm('Deseja realmente redefinir a senha deste usuário para o padrão "Senha123"?')) {
            Store.update('users', id, { senha: 'Senha123' });
            Utils.notify('Senha redefinida para Senha123');
        }
    },

    changeMyPassword() {
        UI.openModal({
            title: 'Alterar Minha Senha',
            formHtml: `
                <div class="form-group">
                    <label>Nova Senha</label>
                    <input type="password" id="new-pass" class="form-control" placeholder="Mínimo 3 caracteres">
                </div>
                <div class="form-group" style="margin-top: 1rem;">
                    <label>Confirme a Nova Senha</label>
                    <input type="password" id="confirm-pass" class="form-control">
                </div>
            `,
            onSave: () => {
                const p1 = document.getElementById('new-pass').value;
                const p2 = document.getElementById('confirm-pass').value;

                if (!p1 || p1.length < 3) return Utils.notify('Senha muito curta.', 'danger');
                if (p1 !== p2) return Utils.notify('Senhas não coincidem.', 'danger');

                Store.update('users', App.currentUser.id, { senha: p1 });
                App.currentUser.senha = p1;
                Utils.notify('Senha alterada!');
                return true;
            }
        });
    },

    // --- Grupos ---
    renderGrupos() {
        const groups = Store.get('grupos') || [];
        return `
            <div class="card">
                <div class="card-header">
                    <h3><i data-lucide="shield"></i> Grupos de Acesso e Permissões</h3>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem;">Defina os níveis de privilégios e responsabilidades para cada perfil de usuário.</p>
                </div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width: 150px;">Grupo</th>
                                <th>Descrição das Permissões</th>
                                <th style="text-align: right; width: 100px;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${groups.map(g => `
                                <tr>
                                    <td><strong>${g.nome}</strong></td>
                                    <td><span style="font-size: 0.9rem; color: var(--text-muted);">${g.descricao}</span></td>
                                    <td style="text-align: right;">
                                        <button class="icon-btn" onclick="GestaoModule.openGrupoModal('${g.id}')" title="Editar Descrição"><i data-lucide="edit-3"></i></button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="info-card" style="margin-top: 1.5rem; background: var(--primary-light); padding: 1.5rem; border-radius: var(--border-radius); border-left: 4px solid var(--primary);">
                <h4 style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-main);">
                    <i data-lucide="info" style="width: 18px; height: 18px;"></i> Estrutura de Níveis
                </h4>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1rem;">
                    <div>
                        <strong style="display: block; margin-bottom: 0.5rem;">Operador</strong>
                        <ul style="font-size: 0.8rem; padding-left: 1.25rem; color: var(--text-muted);">
                            <li>Dashboard Operacional</li>
                            <li>Lançar Viagens</li>
                            <li>Lançar Saldo Diário</li>
                        </ul>
                    </div>
                    <div>
                        <strong style="display: block; margin-bottom: 0.5rem;">Supervisor</strong>
                        <ul style="font-size: 0.8rem; padding-left: 1.25rem; color: var(--text-muted);">
                            <li>Tudo do Operador</li>
                            <li>Gestão de Motoristas</li>
                            <li>Criar/Resetar Usuários</li>
                        </ul>
                    </div>
                    <div>
                        <strong style="display: block; margin-bottom: 0.5rem;">Administrador</strong>
                        <ul style="font-size: 0.8rem; padding-left: 1.25rem; color: var(--text-muted);">
                            <li>Tudo do Supervisor</li>
                            <li>Configurações Globais</li>
                            <li>Manutenção de Dados</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    },

    openGrupoModal(id) {
        const item = Store.getById('grupos', id);
        UI.openModal({
            title: `Editar Grupo: ${item.nome}`,
            formHtml: `
                <div class="form-group">
                    <label>Título do Grupo</label>
                    <input type="text" id="g-nome" class="form-control" value="${item.nome}">
                </div>
                <div class="form-group" style="margin-top: 1rem;">
                    <label>Descrição detalhada dos privilégios</label>
                    <textarea id="g-desc" class="form-control" rows="4">${item.descricao}</textarea>
                </div>
            `,
            onSave: () => {
                const nome = document.getElementById('g-nome').value.trim();
                const descricao = document.getElementById('g-desc').value.trim();
                
                if (!nome) return Utils.notify('Informe o nome do grupo.', 'danger');

                Store.update('grupos', id, { nome, descricao });
                Utils.notify('Definições do grupo atualizadas!');
                this.renderView();
                return true;
            }
        });
    },

    // --- Manutenção ---
    renderManutencao() {
        const config = Store.get('config');
        const lastBackupStr = config.last_backup ? `Último Backup: ${new Date(config.last_backup).toLocaleString()}` : 'Nenhum backup realizado.';

        return `
            <div class="card">
                <div class="card-header">
                    <h3><i data-lucide="database"></i> Manutenção de Dados</h3>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${lastBackupStr}</div>
                </div>
                <div class="maintenance-actions" style="padding: 1rem; display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
                    
                    <!-- Backup & Restaura -->
                    <div class="m-card" style="padding: 1.5rem; border: 1px solid var(--border-color); border-radius: 12px; background: rgba(56, 189, 248, 0.05);">
                        <h4 style="margin-bottom: 0.5rem;"><i data-lucide="download"></i> Backup e Importação</h4>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">Gerencie a entrada e saída de dados do sistema em formato JSON.</p>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-secondary w-full" onclick="GestaoModule.exportBackup()">Exportar Dados</button>
                            <label class="btn btn-secondary w-full" style="display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                Importar JSON
                                <input type="file" id="import-json" style="display:none" onchange="GestaoModule.handleImport(event)">
                            </label>
                        </div>
                    </div>

                    <!-- Limpeza de Dados -->
                    <div class="m-card" style="padding: 1.5rem; border: 1px solid var(--border-color); border-radius: 12px; background: rgba(248, 113, 113, 0.05);">
                        <h4 style="margin-bottom: 0.5rem; color: var(--danger);"><i data-lucide="trash-2"></i> Limpeza de Base</h4>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">Remova registros antigos para manter o sistema ágil e organizado.</p>
                        <button class="btn btn-danger w-full" onclick="GestaoModule.openCleanModal()">Configurar Limpeza</button>
                    </div>

                </div>
            </div>
        `;
    },

    exportBackup() {
        const db = Store.loadDB();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `BACKUP_LOGTRANSF_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        // Update backup timestamp
        Store.update('config', null, { last_backup: new Date().toISOString() });
        Utils.notify('Backup exportado com sucesso!');
        this.renderView();
    },

    handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const success = Store.importDB(e.target.result);
            if (success) {
                Utils.notify('Dados importados com sucesso! O sistema será reiniciado.', 'success');
                setTimeout(() => location.reload(), 2000);
            } else {
                Utils.notify('Erro ao importar arquivo. Verifique o formato.', 'danger');
            }
        };
        reader.readAsText(file);
    },

    openCleanModal() {
        UI.openModal({
            title: 'Configurar Limpeza de Dados',
            formHtml: `
                <p style="font-size: 0.9rem; margin-bottom: 1.5rem;">Escolha o período que deseja remover. Viagens e Saldos anteriores à data selecionada serão apagados.</p>
                <div class="form-group">
                    <label>Período para Remoção</label>
                    <select id="clean-period" class="form-control">
                        <option value="30">Mais de 30 dias</option>
                        <option value="60">Mais de 60 dias</option>
                        <option value="90">Mais de 90 dias</option>
                        <option value="all">Limpeza Total (Zerar tudo)</option>
                    </select>
                </div>
            `,
            onSave: () => {
                const period = document.getElementById('clean-period').value;
                let count = 0;

                if (period === 'all') {
                    if (confirm('ISSO APAGARÁ TODAS AS VIAGENS E SALDOS! Confirmar?')) {
                        Store.set('viagens', []);
                        Store.set('saldos', []);
                        Utils.notify('Base de dados zerada com sucesso!');
                    }
                } else {
                    const days = parseInt(period);
                    const cutoff = new Date();
                    cutoff.setDate(cutoff.getDate() - days);

                    const viagens = Store.get('viagens');
                    const saldos = Store.get('saldos');
                    
                    const newViagens = viagens.filter(v => new Date(v.criado_em || v.data) >= cutoff);
                    const newSaldos = saldos.filter(s => new Date(s.data) >= cutoff);

                    count = (viagens.length - newViagens.length) + (saldos.length - newSaldos.length);

                    Store.set('viagens', newViagens);
                    Store.set('saldos', newSaldos);
                    Utils.notify(`${count} registros antigos removidos com sucesso!`);
                }
                
                this.renderView();
                return true;
            }
        });
    },

    exportBackup() {
        const data = {
            viagens: Store.get('viagens'),
            saldos: Store.get('saldos'),
            motoristas: Store.get('motoristas'),
            locais: Store.get('locais'),
            users: Store.get('users'),
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logtransf_backup_${Utils.getToday()}.json`;
        a.click();
    },
    // --- Administração ---
    renderAdministracao() {
        const config = Store.get('config');
        const isReadOnly = String(App.currentUser.grupo || '').toUpperCase() === 'VISITANTE';
        return `
            <div class="card">
                <div class="card-header">
                    <h3><i data-lucide="wrench"></i> Administração do Sistema</h3>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem;">Personalize a identidade visual e o nome da ferramenta.</p>
                </div>
                <div class="card-body" style="padding: 1.5rem;">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Nome da Aplicação</label>
                            <input type="text" id="cfg-app-name" class="form-control" value="${config.nome_app || 'LogTransf'}">
                        </div>
                        <div class="form-group">
                            <label>Nome da Empresa (Branding)</label>
                            <input type="text" id="cfg-company" class="form-control" value="${config.nome_empresa || 'NobelPack'}">
                        </div>
                        <div class="form-group">
                            <label>Logo / Ícone Principal (Lucide ID)</label>
                            <select id="cfg-icon" class="form-control">
                                <option value="truck" ${config.icone_app === 'truck' ? 'selected' : ''}>Caminhão (truck)</option>
                                <option value="package" ${config.icone_app === 'package' ? 'selected' : ''}>Caixa (package)</option>
                                <option value="navigation" ${config.icone_app === 'navigation' ? 'selected' : ''}>Navegação (navigation)</option>
                                <option value="shield" ${config.icone_app === 'shield' ? 'selected' : ''}>Escudo (shield)</option>
                                <option value="activity" ${config.icone_app === 'activity' ? 'selected' : ''}>Atividade (activity)</option>
                            </select>
                        </div>
                    </div>
                    ${!isReadOnly ? `
                    <div style="margin-top: 2rem; display: flex; justify-content: flex-end;">
                        <button class="btn btn-primary" onclick="GestaoModule.saveConfig()">
                            Salvar Alterações
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    saveConfig() {
        const nome_app = document.getElementById('cfg-app-name').value.trim();
        const nome_empresa = document.getElementById('cfg-company').value.trim();
        const icone_app = document.getElementById('cfg-icon').value;

        if (!nome_app) return Utils.notify('O nome da aplicação é obrigatório.', 'danger');

        Store.update('config', null, { nome_app, nome_empresa, icone_app });
        Utils.notify('Configurações de marca atualizadas com sucesso!');
        
        // Refresh branding globally
        App.updateProfileUI();
        this.renderView();
    },

    // --- Configuração de IA (Padrão LogAgend) ---
    renderAssistente() {
        const config = Store.get('config');
        const ai = config.ai_config || { apiKey: '', model: 'gemini-1.5-flash', instructions: '' };
        const isReadOnly = String(App.currentUser.grupo || '').toUpperCase() === 'VISITANTE';

        return `
            <div class="card">
                <div class="card-header" style="background: var(--primary-light); display: flex; align-items: center; gap: 0.75rem;">
                    <i data-lucide="sparkles" style="color: var(--primary);"></i>
                    <h3 style="margin: 0; font-size: 1.1rem; color: var(--primary);">Inteligência Artificial (Gemini)</h3>
                </div>
                <div class="card-body" style="padding: 1.5rem;">
                    <div class="form-group" style="margin-bottom: 1.5rem;">
                        <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 0.5rem;">DIRETRIZES E REQUISITOS DO AGENTE</label>
                        <textarea id="ai-instructions" class="form-control" rows="5" placeholder="Ex: Você é o analista NobelPack...">${ai.instructions}</textarea>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 2fr 100px; gap: 10px; align-items: flex-end;">
                        <div class="form-group">
                            <label style="font-size: 0.75rem; color: var(--text-muted);">MODELO</label>
                            <input type="text" id="ai-model" class="form-control" list="gemini-models" value="${ai.model || 'gemini-1.5-flash'}">
                            <datalist id="gemini-models">
                                <option value="gemini-2.5-flash">
                                <option value="gemini-2.0-flash">
                                <option value="gemini-1.5-flash">
                                <option value="gemini-1.5-pro">
                            </datalist>
                        </div>
                        <div class="form-group">
                            <label style="font-size: 0.75rem; color: var(--text-muted);">API KEY (GOOGLE)</label>
                            <input type="password" id="ai-key" class="form-control" value="${ai.apiKey}" placeholder="Inserir chave sk-...">
                        </div>
                        ${!isReadOnly ? `
                        <button class="btn btn-primary" onclick="GestaoModule.saveAIConfig()" style="height: 42px;">
                            Salvar
                        </button>
                        ` : ''}
                    </div>
                    <p style="margin-top: 1rem; font-size: 0.8rem; color: var(--text-muted);">
                        <i data-lucide="info" style="width: 14px; height: 14px; vertical-align: middle;"></i> 
                        O assistente utiliza esta chave para analisar viagens e saldos diretamente do banco local.
                    </p>
                </div>
            </div>
        `;
    },

    saveAIConfig() {
        const apiKey = document.getElementById('ai-key').value.trim();
        const model = document.getElementById('ai-model').value.trim();
        const instructions = document.getElementById('ai-instructions').value.trim();

        const config = Store.get('config');
        config.ai_config = { apiKey, model, instructions };
        
        Store.set('config', config);
        Utils.notify('Configurações do Agente salvas com sucesso!', 'success');
        this.renderView();
    },

    clearOperationalData() {
        if (confirm('Deseja realmente apagar todas as viagens e saldos? Esta ação não pode ser desfeita.')) {
            Store.set('viagens', []);
            Store.set('saldos', []);
            Utils.notify('Dados operacionais excluídos.', 'danger');
            this.renderView();
        }
    },

    removeDataItem(collection, id) {
        if (confirm('Tem certeza que deseja excluir este registro?')) {
            const items = Store.get(collection);
            const filtered = items.filter(i => i.id !== id);
            Store.set(collection, filtered);
            Utils.notify('Registro excluído.');
            this.renderView();
        }
    }
};
