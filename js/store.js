/**
 * LogTransf - Centralized Store (localStorage)
 */

const Store = {
    _dbKey: 'logtransf_db_v1',

    _initialState: {
        carretas: [
            { id: 'c1', descricao: 'Convencional', capacidade: 28, ativa: true },
            { id: 'c2', descricao: 'Double Deck', capacidade: 52, ativa: true }
        ],
        locais: [
            { id: 'l1', nome: 'Matriz', tipo: 'Pack' },
            { id: 'l2', nome: 'Filial A', tipo: 'LOG' }
        ],
        viagens: [], // { id, data, sequencial, tipo, id_tipo_carreta, id_origem, id_destino, quantidade_paletes, criado_em, criado_por, capacidade_carreta, ocupacao }
        saldos: [],  // { data, saldo_inicio, observacao }
        motoristas: [
            { id: 'm1', nome: 'João Silva', ativo: true },
            { id: 'm2', nome: 'Maria Souza', ativo: true }
        ],
        users: [
            { id: 'u1', nome: 'Admin System', login: 'admin', senha: 'Senha123', grupo: 'ADM' },
            { id: 'u2', nome: 'Mateus Supervisor', login: 'super', senha: 'Senha123', grupo: 'Supervisor' },
            { id: 'u3', nome: 'Ana Operadora', login: 'oper', senha: 'Senha123', grupo: 'Operador' }
        ],
        grupos: [
            { id: 'ADM', nome: 'Administrador', descricao: 'Acesso total ao sistema, inclusive manutenção e gestão de grupos.' },
            { id: 'Supervisor', nome: 'Supervisor', descricao: 'Acesso operacional e gestão de usuários. Sem acesso a configurações globais.' },
            { id: 'Operador', nome: 'Operador', descricao: 'Acesso restrito a lançamentos e visualização de dashboards.' }
        ],
        config: {
            nome_app: 'LogTransf',
            nome_empresa: 'NobelPack',
            icone_app: 'truck',
            last_backup: null,
            custos_palete: { 'c1': 0, 'c2': 0 },
            custos_historico: [], // { id, data_vigencia, c1, c2, registrado_em, registrado_por }
            ai_config: {
                apiKey: '',
                model: 'gpt-4o',
                instructions: 'Você é o assistente inteligente da NobelPack. Analise os dados de viagens e saldos para fornecer insights operacionais.'
            }
        }
    },

    importDB: (jsonString) => {
        try {
            const data = JSON.parse(jsonString);
            // Basic validation
            if (!data.viagens || !data.users) throw new Error('Formato inválido');
            
            // Backup current data before overwriting
            const current = localStorage.getItem(Store._dbKey);
            if (current) {
                const blob = new Blob([current], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `PRE_IMPORT_BACKUP_${new Date().toISOString().slice(0,10)}.json`;
                a.click();
            }

            Store.saveDB(data);
            return true;
        } catch (e) {
            console.error('Erro ao importar JSON:', e);
            return false;
        }
    },

    loadDB: () => {
        const data = localStorage.getItem(Store._dbKey);
        if (!data) {
            // IMPORTANTE: Salva APENAS localmente, NÃO empurra para a nuvem!
            // Se empurrar, um dispositivo novo sobrescreve a nuvem com dados vazios.
            localStorage.setItem(Store._dbKey, JSON.stringify(Store._initialState));
            return Store._initialState;
        }
        const db = JSON.parse(data);
        
        // Migration: Update legacy data for current logic and security
        if (db.users) {
            let changed = false;
            db.users = db.users.map(u => {
                const loginLower = String(u.login || '').toLowerCase();
                // Update legacy group
                if (u.grupo === 'Gestor') {
                    u.grupo = 'ADM';
                    changed = true;
                }
                // Ensure default passwords match new requirement for dev users
                if (['admin', 'super', 'oper'].includes(loginLower) && (u.senha === '123' || u.senha === '123456')) {
                    u.senha = 'Senha123';
                    changed = true;
                }
                return u;
            });
            if (changed) Store.saveDB(db);
        }

        return db;
    },

    saveDB: (dbData) => {
        localStorage.setItem(Store._dbKey, JSON.stringify(dbData));
        if (window.FirebaseDB) { window.FirebaseDB.syncSave(dbData); }
    },

    get: (collection) => {
        const db = Store.loadDB();
        return db[collection] || [];
    },

    set: (collection, data) => {
        const db = Store.loadDB();
        db[collection] = data;
        Store.saveDB(db);
    },

    getById: (collection, id) => {
        const items = Store.get(collection);
        return items.find(item => item.id === id);
    },

    insert: (collection, item) => {
        const db = Store.loadDB();
        if (!db[collection]) db[collection] = [];

        const newItem = {
            ...item,
            id: item.id || Utils.generateId(),
            criado_em: new Date().toISOString()
        };

        db[collection].push(newItem);
        Store.saveDB(db);
        return newItem;
    },

    update: (collection, id, updates) => {
        const db = Store.loadDB();
        const index = db[collection].findIndex(i => i.id === id);
        if (index !== -1) {
            db[collection][index] = { ...db[collection][index], ...updates };
            Store.saveDB(db);
            return true;
        }
        return false;
    },

    delete: (collection, id) => {
        const db = Store.loadDB();
        const index = db[collection].findIndex(i => i.id === id);
        if (index !== -1) {
            db[collection].splice(index, 1);
            Store.saveDB(db);
            return true;
        }
        return false;
    },

    getCustosForDate: (dateString) => {
        const config = Store.get('config') || {};
        const historico = config.custos_historico || [];
        
        // Se não houver histórico, retorna o valor de 'custos_palete' como fallback (legado) ou 0
        if (historico.length === 0) {
            return config.custos_palete || { 'c1': 0, 'c2': 0 };
        }

        // Ordena o histórico por data decrescente (mais recente primeiro)
        const historicoOrdenado = [...historico].sort((a, b) => b.data_vigencia.localeCompare(a.data_vigencia));

        // Procura o primeiro registro cuja data de vigência seja menor ou igual à data pesquisada
        const registroVigente = historicoOrdenado.find(r => r.data_vigencia <= dateString);

        if (registroVigente) {
            return { 'c1': registroVigente.c1 || 0, 'c2': registroVigente.c2 || 0 };
        }

        // Se nenhum registro for encontrado (a data é muito antiga, antes do primeiro registro), retorna 0
        return { 'c1': 0, 'c2': 0 };
    }
};
