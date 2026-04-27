/**
 * Firebase Sync Controller for LogTransf
 * This script initializes Firebase and provides an async bridge to sync with LocalStorage
 */

const firebaseConfig = {
    apiKey: "AIzaSyB8esLUJzqnumckLfjf5isY3qAcbw0pZ6s",
    authDomain: "nobelpack-systems-4d510.firebaseapp.com",
    databaseURL: "https://nobelpack-systems-4d510-default-rtdb.firebaseio.com",
    projectId: "nobelpack-systems-4d510",
    storageBucket: "nobelpack-systems-4d510.firebasestorage.app",
    messagingSenderId: "661674699484",
    appId: "1:661674699484:web:fa68c08bc3d9398d90e219",
    measurementId: "G-EWFDHF9CDE"
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

    // Puxa toda a árvore de dados da nuvem para preencher o LocalStorage (Chamado 1x no login)
    syncLoad: async () => {
        if (!isFirebaseInitialized) return null;
        try {
            const snapshot = await dbRef.once('value');
            if (snapshot.exists()) {
                const cloudData = snapshot.val();
                return cloudData;
            }
            return null; // DB was empty
        } catch (error) {
            console.error('Erro ao baixar os dados do Firebase:', error);
            throw error;
        }
    },

    // Escuta constante da nuvem, injetando dados na tela em tempo real
    listen: (onUpdateCallback) => {
        if (!isFirebaseInitialized) return;
        
        // Chave DEVE ser idêntica à usada em Store._dbKey
        const DB_KEY = 'logtransf_db_v1';
        
        dbRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const cloudData = snapshot.val();
                
                // Evita loop infinito comparando assinatura simples
                const localStr = localStorage.getItem(DB_KEY);
                const cloudStr = JSON.stringify(cloudData);
                
                if (localStr !== cloudStr) {
                    console.log('Firebase: Nova atualização recebida da nuvem.');
                    localStorage.setItem(DB_KEY, cloudStr);
                    if (onUpdateCallback) onUpdateCallback(cloudData);
                }
            }
        });
    },

    // Empurra a versão do LocalStorage para a Nuvem com Transação Anti-Concorrência
    syncSave: (latestLocalData, isManualWipe = false) => {
        if (!isFirebaseInitialized) return;
        
        console.log('Firebase: Iniciando sincronização com a nuvem...');
        
        // Transação para evitar concorrência (Race Condition) no exato milissegundo
        dbRef.transaction((currentCloudData) => {
            // ANTI-WIPE SAFETY: Impede que um dispositivo novo/vazio zere a nuvem
            if (currentCloudData && !isManualWipe) {
                const cloudViagens = currentCloudData.viagens ? currentCloudData.viagens.length : 0;
                const localViagens = latestLocalData.viagens ? latestLocalData.viagens.length : 0;
                
                // Se a nuvem tem viagens cadastradas e o local não, é provável que seja um carregamento acidental de esqueleto vazio.
                if (cloudViagens > 0 && localViagens === 0) {
                    console.warn('SAFETY LOCK: Tentativa de sobrescrever nuvem com dados vazios bloqueada.');
                    return; // Aborta a transação para não zerar a base
                }
            }

            // A mesclagem por transação nativa do Firebase garante a última e mais íntegra versão
            return latestLocalData;
        }, (error, committed, snapshot) => {
            if (error) {
                console.error('Firebase: Erro na gravação transacional:', error);
            } else if (!committed) {
                console.log('Firebase: Gravação abortada (Trava de Segurança Anti-Wipe acionada).');
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
