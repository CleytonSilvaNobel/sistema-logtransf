/**
 * LogTransf - Gestão Module
 * Handles Users, Master Data (Motoristas, Locais, Carretas), Branding and AI config.
 */

const GestaoModule = {
    renderView() {
        const subnav = `
            <div class="tabs-subnav">
                <button class="subnav-item active" data-subtarget="sub-ges-users">Usuários</button>
                <button class="subnav-item" data-subtarget="sub-ges-motoristas">Motoristas</button>
                <button class="subnav-item" data-subtarget="sub-ges-locais">Locais</button>
                <button class="subnav-item" data-subtarget="sub-ges-carretas">Carretas</button>
                <button class="subnav-item" data-subtarget="sub-ges-limpeza">Limpeza</button>
                <button class="subnav-item" data-subtarget="sub-ges-admin">Personalização</button>
                <button class="subnav-item" data-subtarget="sub-ges-ai">Assistente IA</button>
            </div>
            <div id="sub-content-area" style="margin-top: 1.5rem;">
                ${this.renderUsuarios()}
            </div>
        `;

        document.querySelector('.content-body').innerHTML = `
            <div class="module-container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h2><i data-lucide="settings"></i> Configurações e Gestão</h2>
                    <button class="btn btn-secondary btn-sm" onclick="GestaoModule.exportBackup()"><i data-lucide="download"></i> Backup Local</button>
                </div>
                ${subnav}
            </div>
        `;
        
        lucide.createIcons();
        this.bindSubnav();
    },

    bindSubnav() {
        const items = document.querySelectorAll('.subnav-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                const target = item.getAttribute('data-subtarget');
                const area = document.getElementById('sub-content-area');
                
                switch(target) {
                    case 'sub-ges-users': area.innerHTML = this.renderUsuarios(); break;
                    case 'sub-ges-motoristas': area.innerHTML = this.renderMotoristas(); break;
                    case 'sub-ges-locais': area.innerHTML = this.renderLocais(); break;
                    case 'sub-ges-carretas': area.innerHTML = this.renderCarretas(); break;
                    case 'sub-ges-limpeza': area.innerHTML = this.renderLimpeza(); break;
                    case 'sub-ges-admin': area.innerHTML = this.renderAdministracao(); break;
                    case 'sub-ges-ai': area.innerHTML = this.renderAssistente(); break;
                }
                lucide.createIcons();
            });
        });
    },

    // --- Usuarios ---
    renderUsuarios() {
        const users = Store.get('users');
        const isReadOnly = String(App.currentUser.grupo || '').toUpperCase() === 'VISITANTE';

        const rows = users.map(u => `
            <tr>
                <td><strong>${u.nome}</strong></td>
                <td>${u.login}</td>
                <td><span class="badge">${u.grupo}</span></td>
                <td>
                    ${!isReadOnly ? `
                    <button class="icon-btn" onclick="GestaoModule.editUser('${u.id}')"><i data-lucide="edit-2"></i></button>
                    ${u.login !== 'admin' ? `<button class="icon-btn danger" onclick="GestaoModule.removeDataItem('users', '${u.id}')"><i data-lucide="trash-2"></i></button>` : ''}
                    ` : '<i data-lucide="lock" style="width:16px;color:#94a3b8"></i>'}
                </td>
            </tr>
        `).join('');

        return `
            <div class="card fade-in">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>Lista de Usuários</h3>
                    ${!isReadOnly ? `<button class="btn btn-primary btn-sm" onclick="GestaoModule.openUserModal()">+ Novo Usuário</button>` : ''}
                </div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr><th>Nome</th><th>Login</th><th>Grupo</th><th>Ações</th></tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    },

    openUserModal(userId = null) {
        const user = userId ? Store.getById('users', userId) : null;
        
        UI.openModal({
            title: user ? 'Editar Usuário' : 'Novo Usuário',
            formHtml: `
                <div class="form-group">
                    <label>Nome Completo</label>
                    <input type="text" id="u-nome" class="form-control" value="${user?.nome || ''}" required>
                </div>
                <div class="form-group">
                    <label>Login (Acesso)</label>
                    <input type="text" id="u-login" class="form-control" value="${user?.login || ''}" ${user ? 'disabled' : ''} required>
                </div>
                <div class="form-group">
                    <label>Senha</label>
                    <input type="password" id="u-senha" class="form-control" value="${user?.senha || ''}" required>
                </div>
                <div class="form-group">
                    <label>Grupo de Acesso</label>
                    <select id="u-grupo" class="form-control">
                        <option value="ADM" ${user?.grupo === 'ADM' ? 'selected' : ''}>ADM</option>
                        <option value="Supervisor" ${user?.grupo === 'Supervisor' ? 'selected' : ''}>Supervisor</option>
                        <option value="Operador" ${user?.grupo === 'Operador' ? 'selected' : ''}>Operador</option>
                        <option value="Visitante" ${user?.grupo === 'Visitante' ? 'selected' : ''}>Visitante</option>
                    </select>
                </div>
            `,
            onSave: () => {
                const nome = document.getElementById('u-nome').value;
                const login = document.getElementById('u-login').value;
                const senha = document.getElementById('u-senha').value;
                const grupo = document.getElementById('u-grupo').value;

                if (user) {
                    Store.update('users', user.id, { nome, senha, grupo });
                } else {
                    Store.insert('users', { nome, login, senha, grupo });
                }
                Utils.notify('Usuário salvo com sucesso!');
                this.renderView();
                return true;
            }
        });
    },

    editUser(id) { this.openUserModal(id); },

    // --- Motoristas ---
    renderMotoristas() {
        const motoristas = (Store.get('motoristas') || []).sort((a,b) => a.nome.localeCompare(b.nome));
        const isReadOnly = String(App.currentUser.grupo || '').toUpperCase() === 'VISITANTE';

        const rows = motoristas.map(m => `
            <tr>
                <td>${m.id || '-'}</td>
                <td><strong>${m.nome}</strong></td>
                <td>${m.cpf || '-'}</td>
                <td>${m.fone || '-'}</td>
                <td>
                    ${!isReadOnly ? `
                    <button class="icon-btn" onclick="GestaoModule.editMotorista('${m.id}')"><i data-lucide="edit-2"></i></button>
                    <button class="icon-btn danger" onclick="GestaoModule.removeDataItem('motoristas', '${m.id}')"><i data-lucide="trash-2"></i></button>
                    ` : '<i data-lucide="lock" style="width:16px;color:#94a3b8"></i>'}
                </td>
            </tr>
        `).join('');

        return `
            <div class="card fade-in">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>Motoristas Cadastrados</h3>
                    ${!isReadOnly ? `<button class="btn btn-primary btn-sm" onclick="GestaoModule.openMotoristaModal()">+ Novo Motorista</button>` : ''}
                </div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr><th>ID</th><th>Nome</th><th>CPF</th><th>Telefone</th><th>Ações</th></tr>
                        </thead>
                        <tbody>${rows || '<tr><td colspan="5" style="text-align:center">Nenhum motorista.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        `;
    },

    openMotoristaModal(id = null) {
        const item = id ? Store.getById('motoristas', id) : null;
        UI.openModal({
            title: item ? 'Editar Motorista' : 'Novo Motorista',
            formHtml: `
                <div class="form-group">
                    <label>Nome do Motorista</label>
                    <input type="text" id="m-nome" class="form-control" value="${item?.nome || ''}" required>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>CPF</label>
                        <input type="text" id="m-cpf" class="form-control" value="${item?.cpf || ''}">
                    </div>
                    <div class="form-group">
                        <label>Telefone / WhatsApp</label>
                        <input type="text" id="m-fone" class="form-control" value="${item?.fone || ''}">
                    </div>
                </div>
            `,
            onSave: () => {
                const nome = document.getElementById('m-nome').value;
                const cpf = document.getElementById('m-cpf').value;
                const fone = document.getElementById('m-fone').value;
                if (item) Store.update('motoristas', item.id, { nome, cpf, fone });
                else Store.insert('motoristas', { nome, cpf, fone });
                this.renderView();
                return true;
            }
        });
    },
    editMotorista(id) { this.openMotoristaModal(id); },

    // --- Locais ---
    renderLocais() {
        const locais = (Store.get('locais') || []).sort((a,b) => a.nome.localeCompare(b.nome));
        const isReadOnly = String(App.currentUser.grupo || '').toUpperCase() === 'VISITANTE';

        const rows = locais.map(l => `
            <tr>
                <td><strong>${l.nome}</strong></td>
                <td>${l.tipo || 'Unidade'}</td>
                <td>${l.distancia || '0'} km</td>
                <td>
                    ${!isReadOnly ? `
                    <button class="icon-btn" onclick="GestaoModule.editLocal('${l.id}')"><i data-lucide="edit-2"></i></button>
                    <button class="icon-btn danger" onclick="GestaoModule.removeDataItem('locais', '${l.id}')"><i data-lucide="trash-2"></i></button>
                    ` : '<i data-lucide="lock" style="width:16px;color:#94a3b8"></i>'}
                </td>
            </tr>
        `).join('');

        return `
            <div class="card fade-in">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>Locais de Entrega / Unidades</h3>
                    ${!isReadOnly ? `<button class="btn btn-primary btn-sm" onclick="GestaoModule.openLocalModal()">+ Novo Local</button>` : ''}
                </div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr><th>Nome do Local</th><th>Tipo</th><th>Distância</th><th>Ações</th></tr>
                        </thead>
                        <tbody>${rows || '<tr><td colspan="4" style="text-align:center">Nenhum local.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        `;
    },

    openLocalModal(id = null) {
        const item = id ? Store.getById('locais', id) : null;
        UI.openModal({
            title: item ? 'Editar Local' : 'Novo Local',
            formHtml: `
                <div class="form-group">
                    <label>Nome do Local</label>
                    <input type="text" id="l-nome" class="form-control" value="${item?.nome || ''}" required>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Tipo</label>
                        <select id="l-tipo" class="form-control">
                            <option value="Unidade" ${item?.tipo === 'Unidade' ? 'selected' : ''}>Unidade Interna</option>
                            <option value="Terceiro" ${item?.tipo === 'Terceiro' ? 'selected' : ''}>Cliente / Terceiro</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Distância (km)</label>
                        <input type="number" id="l-dist" class="form-control" value="${item?.distancia || ''}">
                    </div>
                </div>
            `,
            onSave: () => {
                const nome = document.getElementById('l-nome').value;
                const tipo = document.getElementById('l-tipo').value;
                const distancia = document.getElementById('l-dist').value;
                if (item) Store.update('locais', item.id, { nome, tipo, distancia });
                else Store.insert('locais', { nome, tipo, distancia });
                this.renderView();
                return true;
            }
        });
    },
    editLocal(id) { this.openLocalModal(id); },

    // --- Carretas ---
    renderCarretas() {
        const carretas = (Store.get('carretas') || []).sort((a,b) => a.placa.localeCompare(b.placa));
        const isReadOnly = String(App.currentUser.grupo || '').toUpperCase() === 'VISITANTE';

        const rows = carretas.map(c => `
            <tr>
                <td>${c.id || '-'}</td>
                <td><span class="placa">${c.placa}</span></td>
                <td>${c.tipo || '-'}</td>
                <td>${c.capacidade || '-'} plts</td>
                <td>
                    ${!isReadOnly ? `
                    <button class="icon-btn" onclick="GestaoModule.editCarreta('${c.id}')"><i data-lucide="edit-2"></i></button>
                    <button class="icon-btn danger" onclick="GestaoModule.removeDataItem('carretas', '${c.id}')"><i data-lucide="trash-2"></i></button>
                    ` : '<i data-lucide="lock" style="width:16px;color:#94a3b8"></i>'}
                </td>
            </tr>
        `).join('');

        return `
            <div class="card fade-in">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>Frota de Carretas</h3>
                    ${!isReadOnly ? `<button class="btn btn-primary btn-sm" onclick="GestaoModule.openCarretaModal()">+ Nova Carreta</button>` : ''}
                </div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr><th>ID</th><th>Placa</th><th>Tipo</th><th>Capacidade</th><th>Ações</th></tr>
                        </thead>
                        <tbody>${rows || '<tr><td colspan="5" style="text-align:center">Nenhuma carreta.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        `;
    },

    openCarretaModal(id = null) {
        const item = id ? Store.getById('carretas', id) : null;
        UI.openModal({
            title: item ? 'Editar Carreta' : 'Nova Carreta',
            formHtml: `
                <div class="form-group">
                    <label>Placa</label>
                    <input type="text" id="c-placa" class="form-control" value="${item?.placa || ''}" placeholder="AAA-0000" required>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Tipo / Descrição</label>
                        <input type="text" id="c-tipo" class="form-control" value="${item?.tipo || ''}" placeholder="Ex: Baú, Sider...">
                    </div>
                    <div class="form-group">
                        <label>Capacidade (Paletes)</label>
                        <input type="number" id="c-cap" class="form-control" value="${item?.capacidade || ''}">
                    </div>
                </div>
            `,
            onSave: () => {
                const placa = document.getElementById('c-placa').value.toUpperCase();
                const tipo = document.getElementById('c-tipo').value;
                const capacidade = document.getElementById('c-cap').value;
                if (item) Store.update('carretas', item.id, { placa, tipo, capacidade });
                else Store.insert('carretas', { placa, tipo, capacidade });
                this.renderView();
                return true;
            }
        });
    },
    editCarreta(id) { this.openCarretaModal(id); },

    // --- Limpeza ---
    renderLimpeza() {
        const isReadOnly = String(App.currentUser.grupo || '').toUpperCase() === 'VISITANTE';
        return `
            <div class="card fade-in">
                <div class="card-header">
                    <h3>Limpeza e Manutenção do Banco</h3>
                </div>
                <div class="card-body" style="padding: 1.5rem;">
                    <p style="color: var(--text-muted); margin-bottom: 2rem;">Remova dados antigos para manter a aplicação leve. Esta ação é irreversível.</p>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                        <div style="border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--border-radius);">
                            <h4 style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;"><i data-lucide="trash" style="color: var(--danger);"></i> Eraser Operacional</h4>
                            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Remove viagens e saldos de períodos passados.</p>
                            ${!isReadOnly ? `
                            <button class="btn btn-secondary" onclick="GestaoModule.openCleanModal()">Configurar Limpeza</button>
                            ` : '<span class="badge">Acesso Restrito</span>'}
                        </div>
                        
                        <div style="border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--border-radius);">
                            <h4 style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;"><i data-lucide="database" style="color: var(--warning);"></i> Reset Master</h4>
                            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Zera completamente a base de dados (CUIDADO).</p>
                            ${!isReadOnly ? `
                            <button class="btn btn-danger" onclick="GestaoModule.clearOperationalData()">Zerar Operacional</button>
                            ` : '<span class="badge">Acesso Restrito</span>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
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
