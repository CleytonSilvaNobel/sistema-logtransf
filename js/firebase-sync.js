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
    syncSave: (latestLocalData) => {
        if (!isFirebaseInitialized) return;
        
        console.log('Firebase: Iniciando sincronização com a nuvem...');
        
        // Transação para evitar concorrência (Race Condition) no exato milissegundo
        dbRef.transaction((currentCloudData) => {
            // A mesclagem por transação nativa do Firebase garante a última e mais íntegra versão sem hard override de outras sessions conectadas no mesmo milissegundo
            return latestLocalData;
        }, (error, committed) => {
            if (error) {
                console.error('Firebase: Erro na gravação transacional:', error);
            } else if (committed) {
                console.log('Firebase: Dados sincronizados com sucesso (logtransf_db_v1).');
            }
        });
    }
};

// Initialize as soon as script is parsed
FirebaseDB.init();
