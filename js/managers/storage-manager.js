import { Utils } from '../utils/utils.js';

/**
 * Управляет хранением данных
 * @class WorkoutStorage
 */
export class WorkoutStorage {
    constructor() {
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

    /**
     * Сохраняет данные в хранилище
     * @param {string} key - Ключ для сохранения
     * @param {*} data - Данные для сохранения
     * @param {Storage} [storage=localStorage] - Хранилище (localStorage/sessionStorage)
     * @returns {boolean} Успешность операции
     */
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

    removeFromStorage(key, storage = localStorage) {
        try {
            storage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`Ошибка удаления данных для ключа "${key}":`, e);
            return false;
        }
    }

    getCurrentWorkout() {
        return this.getFromStorage('currentWorkout', sessionStorage) || {};
    }

    saveCurrentWorkout(workout) {
        return this.saveToStorage('currentWorkout', workout, sessionStorage);
    }

    getWorkoutHistory() {
        return this.getFromStorage('exercises') || [];
    }

    saveWorkoutToHistory(workout) {
        const savedWorkouts = this.getWorkoutHistory();
        savedWorkouts.push(workout);
        return this.saveToStorage('exercises', savedWorkouts);
    }
} 