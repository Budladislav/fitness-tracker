import { StorageInterface } from './storage.interface.js';
import { DateFormatter } from '../../utils/date-formatter.js';
import { ExerciseCalculatorService } from '../exercise-calculator.service.js';
import { Utils } from '../../utils/utils.js';

export class LocalStorageManager extends StorageInterface {
    constructor() {
        super();
        this.EXERCISES_KEY = 'exercises';
        this.CURRENT_WORKOUT_KEY = 'currentWorkout';
        this.ACTIVE_WORKOUT_KEY = 'activeWorkout';
        this.BACKUP_KEY = 'workoutBackup';
        this.storageAvailable = this.checkStorageAvailability();
    }

    checkStorageAvailability() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch (e) {
            console.error('Local storage is not available:', e);
            return false;
        }
    }

    saveToStorage(key, data, storage = localStorage) {
        if (!this.storageAvailable) {
            console.error('Storage is not available');
            return false;
        }

        try {
            const sanitizedData = Array.isArray(data) 
                ? data.map(item => ({
                    ...item,
                    name: Utils.sanitizeInput(item.name)
                }))
                : {
                    ...data,
                    name: data.name ? Utils.sanitizeInput(data.name) : data.name
                };

            storage.setItem(key, JSON.stringify(sanitizedData));
            return true;
        } catch (e) {
            console.error(`Storage error for key "${key}":`, e);
            return false;
        }
    }

    getFromStorage(key, storage = localStorage) {
        if (!this.storageAvailable) {
            console.error('Storage is not available');
            return null;
        }

        try {
            const data = storage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error(`Error reading from storage for key "${key}":`, e);
            return null;
        }
    }

    // Существующие методы остаются теми же, но становятся асинхронными
    async getWorkoutHistory() {
        try {
            const data = localStorage.getItem(this.EXERCISES_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error getting workout history:', error);
            return [];
        }
    }

    // ... остальные методы аналогично
} 