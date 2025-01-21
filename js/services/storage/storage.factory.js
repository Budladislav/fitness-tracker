import { LocalStorageManager } from './local-storage.manager.js';

export class StorageFactory {
    static createStorage(type = 'local') {
        switch (type) {
            case 'local':
                return new LocalStorageManager();
            // Здесь позже добавим case 'firebase':
            default:
                throw new Error(`Unknown storage type: ${type}`);
        }
    }
} 