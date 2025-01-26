import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, enableIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { firebaseConfig } from '../config/firebase.config.js';

class FirebaseService {
    constructor() {
        this.app = null;
        this.db = null;
    }

    async initialize() {
        try {
            this.app = initializeApp(firebaseConfig);
            this.db = getFirestore(this.app);
            
            // Включаем оффлайн персистентность
            try {
                await enableIndexedDbPersistence(this.db);
            } catch (err) {
                console.warn('Failed to enable offline persistence:', err);
            }
            
            console.log('Firebase initialized successfully');
            return true;
        } catch (error) {
            console.error('Firebase initialization error:', error);
            return false;
        }
    }

    getDb() {
        return this.db;
    }
}

// Синглтон для доступа к Firebase
export const firebaseService = new FirebaseService(); 