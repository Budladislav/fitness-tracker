import { LocalStorageManager } from './local-storage.manager.js';
import { FirebaseStorageManager } from './firebase-storage.manager.js';
import { useFirebase } from '../../config/firebase.config.js';

export class StorageFactory {
    static createStorage() {
        // Используем конфигурационный флаг для выбора типа хранилища
        return useFirebase ? new FirebaseStorageManager() : new LocalStorageManager();
    }
} 