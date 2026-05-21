/**
 * Firebase Sync Controller for LogTransf
 * This script initializes Firebase and provides an async bridge to sync with LocalStorage
 */

const firebaseConfig = {
    apiKey: "AIzaSyCNvK23xN1hjRxD1dDaoW-uK2dyeqJzEgk",
    authDomain: "nobelpack-systems-2.firebaseapp.com",
    databaseURL: "https://nobelpack-systems-2-default-rtdb.firebaseio.com",
    projectId: "nobelpack-systems-2",
    storageBucket: "nobelpack-systems-2.firebasestorage.app",
    messagingSenderId: "736419755079",
    appId: "1:736419755079:web:5d3f1292252331fbc7ad62",
    measurementId: "G-7NB3625L3H"
};

let dbRef = null;
let isFirebaseInitialized = false;

const FirebaseDB = {
    init: () => {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            // Use Realtime Database connection
            dbRef = firebase.database().ref('logtransf_db_v1'); 
            isFirebaseInitialized = true;
            console.log('Firebase Cloud Database Conectado (logtransf_db_v1).');
        } catch (error) {
            console.error('Falha ao inicializar o Firebase. Verifique suas chaves.', error);
        }
    },

    // Puxa toda a Ã¡rvore de dados da nuvem para preencher o LocalStorage (Chamado 1x no login)
    syncLoad: async () => {
        if (!isFirebaseInitialized) return null;
        const DB_KEY = 'logtransf_db_v1';
        try {
            const snapshot = await dbRef.once('value');
            if (snapshot.exists()) {
                const cloudData = snapshot.val();
                localStorage.setItem(DB_KEY, JSON.stringify(cloudData));
                console.log('Firebase: Dados carregados da nuvem com sucesso (LogTransf syncLoad).');
                return cloudData;
            }
            console.log('Firebase: Nuvem vazia, usando dados locais.');
            return null;
        } catch (error) {
            console.error('Erro ao baixar os dados do Firebase:', error);
            return null;
        }
    },

    // Escuta constante da nuvem, injetando dados na tela em tempo real
    listen: (onUpdateCallback) => {
        if (!isFirebaseInitialized) return;
        
        // Chave DEVE ser idÃªntica Ã  usada em Store._dbKey
        const DB_KEY = 'logtransf_db_v1';
        
        dbRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const cloudData = snapshot.val();
                
                // Evita loop infinito comparando assinatura simples
                const localStr = localStorage.getItem(DB_KEY);
                const cloudStr = JSON.stringify(cloudData);
                
                if (localStr !== cloudStr) {
                    console.log('Firebase: Nova atualizaÃ§Ã£o recebida da nuvem.');
                    localStorage.setItem(DB_KEY, cloudStr);
                    if (onUpdateCallback) onUpdateCallback(cloudData);
                }
            }
        });
    },

    // Empurra a versÃ£o do LocalStorage para a Nuvem com TransaÃ§Ã£o Anti-ConcorrÃªncia
    syncSave: (latestLocalData, isManualWipe = false) => {
        if (!isFirebaseInitialized) return;
        
        console.log('Firebase: Iniciando sincronizaÃ§Ã£o com a nuvem...');
        
        // TransaÃ§Ã£o para evitar concorrÃªncia (Race Condition) no exato milissegundo
        dbRef.transaction((currentCloudData) => {
            // ANTI-WIPE SAFETY: Impede que um dispositivo novo/vazio zere a nuvem
            if (currentCloudData && !isManualWipe) {
                const cloudViagens = currentCloudData.viagens ? currentCloudData.viagens.length : 0;
                const localViagens = latestLocalData.viagens ? latestLocalData.viagens.length : 0;
                
                // Se a nuvem tem viagens e o local nÃ£o, recusa a gravaÃ§Ã£o para nÃ£o zerar
                if (cloudViagens > 0 && localViagens === 0) {
                    console.warn('SAFETY LOCK (LogTransf): Tentativa de sobrescrever nuvem com dados vazios bloqueada.');
                    latestLocalData.viagens = currentCloudData.viagens;
                }
            }

            // A mesclagem por transaÃ§Ã£o nativa do Firebase garante a Ãºltima e mais Ã­ntegra versÃ£o
            return latestLocalData;
        }, (error, committed, snapshot) => {
            if (error) {
                console.error('Firebase: Erro na gravaÃ§Ã£o transacional:', error);
            } else if (!committed) {
                console.log('Firebase: GravaÃ§Ã£o abortada (Trava de SeguranÃ§a Anti-Wipe acionada).');
            } else {
                console.log('Firebase: Dados sincronizados com sucesso (logtransf_db_v1).');
            }
        });
    }
};

// Initialize as soon as script is parsed
FirebaseDB.init();

// Expor para o escopo global para que o Store.js consiga enxergar
window.FirebaseDB = FirebaseDB;
