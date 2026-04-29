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
        
        // Escutar estado de autenticação do Firebase
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                // PASSO CRÍTICO: Puxar dados da nuvem ANTES de verificar permissões
                if (typeof FirebaseDB !== 'undefined' && FirebaseDB.syncLoad) {
                    try {
                        await FirebaseDB.syncLoad();
                    } catch (e) {
                        console.warn('Falha ao sincronizar dados da nuvem antes do login:', e);
                    }
                }

                // Usuário está logado no Firebase. Vamos cruzar o e-mail dele com a nossa base.
                const users = Store.get('users');
                const localUser = users.find(u => u.login && u.login.toLowerCase() === user.email.toLowerCase());
                
                if (localUser) {
                    App.currentUser = localUser;
                    App.showApp();
                } else if (user.email.toLowerCase() === 'cleyton.silva@nobelpack.com.br' || user.email.toLowerCase() === 'admin@nobelpack.com.br') {
                    const newAdm = {
                        id: Utils.generateId(8),
                        nome: 'Cleyton Silva (ADM)',
                        login: user.email.toLowerCase(),
                        senha: 'Protegida (Firebase)',
                        grupo: 'ADM'
                    };
                    users.push(newAdm);
                    Store.set('users', users);
                    App.currentUser = newAdm;
                    App.showApp();
                    Utils.notify('Perfil de Administrador vinculado com sucesso!', 'success');
                } else {
                    // Está logado no Google, mas não existe no nosso DB.
                    firebase.auth().signOut();
                    Utils.notify('Usuário sem permissões no sistema interno.', 'danger');
                    App.renderLoginView();
                }
            } else {
                App.currentUser = null;
                App.renderLoginView();
            }
        });
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
                        <span class="brand-subtitle">NOBELPACK</span>
                    </div>
                    
                    <form class="login-form" onsubmit="event.preventDefault(); App.handleLogin();">
                        <div class="form-group">
                            <label>E-MAIL DE ACESSO</label>
                            <input type="email" id="login-user" class="form-control" placeholder="ex: seunome@empresa.com.br" autofocus required>
                        </div>
                        <div class="form-group">
                            <div style="display: flex; justify-content: space-between;">
                                <label>SENHA</label>
                                <a href="#" onclick="App.handleResetPassword(); return false;" style="font-size: 0.8rem; color: var(--primary); text-decoration: none;">Esqueci a senha</a>
                            </div>
                            <input type="password" id="login-pass" class="form-control" placeholder="Digite sua senha" required>
                        </div>
                        <button id="btn-login-submit" class="login-btn">
                            Conectar
                        </button>
                    </form>
                    
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
        
        const btn = document.getElementById('btn-login-submit');
        const oldText = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Conectando...';
        btn.disabled = true;

        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION)
            .then(() => {
                return firebase.auth().signInWithEmailAndPassword(userVal, passVal);
            })
            .then((userCredential) => {
                // Sucesso! O onAuthStateChanged vai capturar e liberar o showApp()
                Utils.notify('Login autorizado pelo Firebase!', 'success');
            })
            .catch((error) => {
                btn.innerHTML = oldText;
                btn.disabled = false;
                lucide.createIcons();
                console.error(error);
                let msg = 'Falha no login. Verifique e-mail e senha.';
                if (error.code === 'auth/invalid-credential') msg = 'E-mail ou senha incorretos.';
                else if (error.code === 'auth/too-many-requests') msg = 'Muitas tentativas. Conta bloqueada temporariamente.';
                Utils.notify(msg, 'danger');
            });
    },

    handleResetPassword() {
        const userVal = document.getElementById('login-user').value.trim();
        if (!userVal) {
            return Utils.notify('Digite seu e-mail no campo acima primeiro.', 'warning');
        }

        firebase.auth().sendPasswordResetEmail(userVal)
            .then(() => {
                Utils.notify('E-mail de redefinição enviado! Verifique sua caixa de entrada.', 'success');
            })
            .catch((error) => {
                console.error(error);
                Utils.notify('Erro ao enviar e-mail. Verifique se digitou corretamente.', 'danger');
            });
    },

    showApp() {
        const loginContainer = document.getElementById('login-screen');
        const mainApp = document.getElementById('main-app');
        
        if (loginContainer) loginContainer.innerHTML = '';
        if (mainApp) mainApp.style.display = 'flex';

        this.cacheDOM();
        
        if (typeof GestaoModule !== 'undefined') {
            GestaoModule.currentTab = 'motoristas';
            GestaoModule.activeArea = 'settings';
        }

        this.bindEvents();
        this.updateProfileUI();
        this.renderInitialView();
        this.checkLastBackup();

        // Init AI
        if (typeof AIModule !== 'undefined') AIModule.init();
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
                firebase.auth().signOut().then(() => {
                    this.currentUser = null;
                });
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
                if (typeof ViagensModule !== 'undefined') ViagensModule.renderView();
                else throw new Error('ViagensModule não encontrado');
            }
            else if (tab === 'tab-saldo') {
                if (typeof SaldoModule !== 'undefined') SaldoModule.renderView();
                else throw new Error('SaldoModule não encontrado');
            }
            else if (tab === 'tab-dashboard') {
                if (typeof DashboardModule !== 'undefined') DashboardModule.renderView();
                else throw new Error('DashboardModule não encontrado');
            }
            else if (tab === 'tab-configuracoes') {
                if (typeof GestaoModule !== 'undefined') GestaoModule.renderSettings();
                else throw new Error('GestaoModule não encontrado');
            }
            else if (tab === 'tab-gestao') {
                if (typeof GestaoModule !== 'undefined') GestaoModule.renderManagement();
                else throw new Error('GestaoModule não encontrado');
            }
            
            lucide.createIcons();
        } catch (err) {
            console.error('Render error for tab ' + tab + ':', err);
            Utils.notify('Erro ao carregar a tela: ' + err.message, 'danger');
        }
    }
};

window.addEventListener('DOMContentLoaded', () => App.init());
