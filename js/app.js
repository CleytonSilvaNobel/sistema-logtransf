/**
 * LogTransf - Main Application Logic
 */

const App = {
    currentUser: null,

    async init() {
        console.log('LogTransf Initialized');
        
        // --- Sincronização Inicial da Nuvem ---
        try {
            if (window.FirebaseDB) {
                FirebaseDB.listen((cloudData) => {
                    if (cloudData) {
                        Store.loadDB();
                        // Triggers re-render if user is already logged in
                        if (App.currentUser) {
                            const activeTab = document.querySelector('.nav-item.active');
                            if (activeTab) App.switchTab(activeTab);
                        }
                    }
                });
            }
        } catch (e) {
            console.warn('Erro ao inicializar Firebase Sync.', e);
        }

        Store.loadDB();
        this.applySavedTheme();
        
        // Removemos sessionStorage para forçar login a cada reinício F5/Fechar aba
        if (this.currentUser) {
            this.showApp();
        } else {
            this.renderLoginView();
        }
    },

    renderLoginView() {
        const loginContainer = document.getElementById('login-screen');
        const mainApp = document.getElementById('main-app');
        
        if (mainApp) mainApp.style.display = 'none';
        if (!loginContainer) return;

        loginContainer.innerHTML = `
            <div class="login-wrapper">
                <div class="login-card">
                    <div class="logo-area">
                        <i data-lucide="truck"></i>
                        <h2>LogTransf</h2>
                        <p class="brand-subtitle" style="color: var(--primary); margin-top: 0.25rem;">NobelPack</p>
                    </div>
                    
                    <div class="login-form">
                        <div class="form-group">
                            <label>USUÁRIO</label>
                            <input type="text" id="login-user" class="form-control" placeholder="Seu login" autofocus>
                        </div>
                        <div class="form-group">
                            <label>SENHA</label>
                            <input type="password" id="login-pass" class="form-control" placeholder="Sua senha">
                        </div>
                        <button id="btn-login-submit" class="btn btn-primary login-btn">
                            Acessar Sistema
                        </button>
                    </div>
                    
                    <div class="login-footer">
                        &copy; ${new Date().getFullYear()} NobelPack &middot; <strong>Versão Beta</strong>
                    </div>
                </div>
            </div>
        `;

        lucide.createIcons();

        document.getElementById('btn-login-submit').addEventListener('click', () => this.handleLogin());
        document.getElementById('login-pass').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
    },

    handleLogin() {
        const userVal = document.getElementById('login-user').value.trim();
        const passVal = document.getElementById('login-pass').value;

        if (!userVal || !passVal) return Utils.notify('Preencha todos os campos.', 'warning');

        const users = Store.get('users');
        const user = users.find(u => u.login.toLowerCase() === userVal.toLowerCase() && u.senha === passVal);

        if (user) {
            this.currentUser = user;
            // Sessão gravada apenas em memória viva para expirar no F5
            Utils.notify(`Bem-vindo, ${user.nome}!`, 'success');
            this.showApp();
        } else {
            Utils.notify('Login ou senha incorretos.', 'danger');
        }
    },

    showApp() {
        const loginContainer = document.getElementById('login-screen');
        const mainApp = document.getElementById('main-app');
        
        if (loginContainer) loginContainer.innerHTML = '';
        if (mainApp) mainApp.style.display = 'flex';

        this.cacheDOM();
        
        if (window.GestaoModule) {
            GestaoModule.currentTab = 'motoristas';
            GestaoModule.activeArea = 'settings';
        }

        this.bindEvents();
        this.updateProfileUI();
        this.renderInitialView();
        this.checkLastBackup();

        // Init AI
        if (window.AIModule) window.AIModule.init();
    },

    applySavedTheme() {
        const savedTheme = localStorage.getItem('logtransf_theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    },

    checkLastBackup() {
        const config = Store.get('config');
        if (config.last_backup) {
            const last = new Date(config.last_backup);
            const diff = (new Date() - last) / (1000 * 60 * 60 * 24);
            if (diff > 7) {
                Utils.notify('Atenção: O último backup foi realizado há mais de 7 dias.', 'warning');
            }
        }
    },

    updateProfileUI() {
        const config = Store.get('config');
        const appBrand = document.getElementById('app-brand-name');
        const companyBrand = document.getElementById('app-company-name');
        const logoutBrand = document.querySelector('.logo-area h2');
        const logoutSubtitle = document.querySelector('.logo-area .brand-subtitle');

        if (appBrand) appBrand.textContent = config.nome_app;
        if (companyBrand) companyBrand.textContent = config.nome_empresa;
        if (logoutBrand) logoutBrand.textContent = config.nome_app;
        if (logoutSubtitle) logoutSubtitle.textContent = config.nome_empresa;

        const logoIcons = document.querySelectorAll('.logo-icon, .logo-area i');
        logoIcons.forEach(icon => {
            icon.setAttribute('data-lucide', config.icone_app || 'truck');
        });
        lucide.createIcons();

        const nameEl = document.getElementById('current-user-name');
        const roleEl = document.getElementById('current-user-role');
        if (nameEl) nameEl.textContent = this.currentUser.nome;
        if (roleEl) roleEl.textContent = this.currentUser.grupo;

        const gestaoBtn = document.querySelector('.nav-item[data-target="tab-gestao"]');
        if (gestaoBtn) {
            const role = String(this.currentUser.grupo || '').toUpperCase();
            const hasAccess = ['ADM', 'SUPERVISOR', 'GESTOR'].includes(role);
            gestaoBtn.style.display = hasAccess ? 'flex' : 'none';
        }
    },

    cacheDOM() {
        this.navItems = document.querySelectorAll('.nav-item[data-target]');
        this.pageTitle = document.getElementById('page-title');
        this.contentBody = document.querySelector('.content-body');
        this.themeToggle = document.getElementById('btn-theme-toggle');
        this.dateDisplay = document.getElementById('current-date-display');
    },

    bindEvents() {
        this.navItems.forEach(item => {
            item.onclick = (e) => this.switchTab(e.currentTarget);
        });

        if (this.themeToggle) {
            this.themeToggle.onclick = () => {
                const isNowDark = document.body.classList.toggle('dark-theme');
                localStorage.setItem('logtransf_theme', isNowDark ? 'dark' : 'light');
                this.themeToggle.querySelector('span').textContent = isNowDark ? 'Tema Claro' : 'Tema Escuro';
                const icon = this.themeToggle.querySelector('i');
                icon.setAttribute('data-lucide', isNowDark ? 'sun' : 'moon');
                lucide.createIcons();
            };
        }

        const btnSair = document.getElementById('btn-logout');
        if (btnSair) {
            btnSair.onclick = (e) => {
                e.preventDefault();
                this.currentUser = null;
                App.init(); // Recarrega tela de login
            };
        }
        if (this.dateDisplay) {
            this.dateDisplay.textContent = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
        }
    },

    switchTab(target) {
        this.navItems.forEach(nav => nav.classList.remove('active'));
        target.classList.add('active');

        const tab = target.getAttribute('data-target');
        const labels = {
            'tab-viagens': 'Lançamento de Viagens',
            'tab-saldo': 'Saldo Diário de Paletes',
            'tab-dashboard': 'Painel de Indicadores',
            'tab-configuracoes': 'Configurações do Sistema',
            'tab-gestao': 'Gestão Administrativa'
        };
        this.pageTitle.textContent = labels[tab] || 'LogTransf';
        this.renderView(tab);
    },

    renderInitialView() {
        const active = document.querySelector('.nav-item.active');
        if (active) this.switchTab(active);
    },

    renderView(tab) {
        try {
            console.log('Rendering tab:', tab);
            if (tab === 'tab-viagens') {
                if (window.ViagensModule) ViagensModule.renderView();
                else console.error('ViagensModule not found');
            }
            else if (tab === 'tab-saldo') {
                if (window.SaldoModule) SaldoModule.renderView();
                else console.error('SaldoModule not found');
            }
            else if (tab === 'tab-dashboard') {
                if (window.DashboardModule) DashboardModule.renderView();
                else console.error('DashboardModule not found');
            }
            else if (tab === 'tab-configuracoes') {
                if (window.GestaoModule) GestaoModule.renderSettings();
                else console.error('GestaoModule not found');
            }
            else if (tab === 'tab-gestao') {
                if (window.GestaoModule) GestaoModule.renderManagement();
                else console.error('GestaoModule not found');
            }
            
            lucide.createIcons();
        } catch (err) {
            console.error('Render error for tab ' + tab + ':', err);
            Utils.notify('Erro ao carregar a tela: ' + err.message, 'danger');
        }
    }
};

window.addEventListener('DOMContentLoaded', () => App.init());
