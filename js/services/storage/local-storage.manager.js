import { StorageInterface } from './storage.interface.js';
import { DateFormatter } from '../../utils/date-formatter.js';
import { ExerciseCalculatorService } from '../exercise-calculator.service.js';
import { Utils } from '../../utils/utils.js';
import { WorkoutFormatterService } from '../workout-formatter.service.js';
import { BackupManager } from '../backup-manager.js';

export class LocalStorageManager extends StorageInterface {
    constructor() {
        super();
        this.EXERCISES_KEY = 'exercises';
        this.CURRENT_WORKOUT_KEY = 'currentWorkout';
        this.ACTIVE_WORKOUT_KEY = 'activeWorkout';
        this.BACKUP_KEY = 'workouts_backup';
        this.storageAvailable = this.checkStorageAvailability();
        this.backupManager = new BackupManager(this);
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

    // Добавляем недостающие методы из интерфейса
    async deleteWorkoutFromHistory(workoutId) {
        return this.deleteWorkout(workoutId);
    }

    async deleteWorkout(workoutId) {
        try {
            const workouts = await this.getWorkoutHistory();
            const filteredWorkouts = workouts.filter(workout => workout.id !== workoutId);
            const success = this.saveToStorage(this.EXERCISES_KEY, filteredWorkouts);
            
            if (success) {
                this.createAutoBackup();
            }
            
            return success;
        } catch (error) {
            console.error('Error deleting workout:', error);
            return false;
        }
    }

    async updateWorkout(workout) {
        try {
            const workouts = await this.getWorkoutHistory();
            const index = workouts.findIndex(w => w.id === workout.id);
            if (index !== -1) {
                workouts[index] = workout;
                const success = this.saveToStorage(this.EXERCISES_KEY, workouts);
                
                if (success) {
                    this.createAutoBackup();
                }
                
                return success;
            }
            return false;
        } catch (error) {
            console.error('Error updating workout:', error);
            return false;
        }
    }

    // Добавляем все методы из старого WorkoutStorage
    // Используем WorkoutFormatterService вместо внутреннего метода
    async saveWorkoutToHistory(workout) {
        const workouts = await this.getWorkoutHistory();
        const formatted = WorkoutFormatterService.formatWorkoutData(workout);
        
        workouts.push(formatted);
        const success = this.saveToStorage(this.EXERCISES_KEY, workouts);
        
        if (success) {
            this.createAutoBackup();
        }
        
        return success;
    }

    async getCurrentWorkout() {
        // Приоритет: sessionStorage -> localStorage -> null
        const current = this.getFromStorage(this.CURRENT_WORKOUT_KEY, sessionStorage);
        if (current) return WorkoutFormatterService.formatWorkoutData(current);

        const active = this.getFromStorage(this.ACTIVE_WORKOUT_KEY);
        if (active) {
            const formatted = WorkoutFormatterService.formatWorkoutData(active);
            this.saveToStorage(this.CURRENT_WORKOUT_KEY, formatted, sessionStorage);
            return formatted;
        }

        return null;
    }

    async saveCurrentWorkout(workout) {
        const formatted = WorkoutFormatterService.formatWorkoutData(workout);
        
        // Сохраняем в оба хранилища
        this.saveToStorage(this.CURRENT_WORKOUT_KEY, formatted, sessionStorage);
        this.setActiveWorkout(formatted);
        
        return formatted;
    }

    async clearCurrentWorkout() {
        this.removeFromStorage(this.CURRENT_WORKOUT_KEY, sessionStorage);
        this.removeFromStorage(this.ACTIVE_WORKOUT_KEY);
    }

    setActiveWorkout(workout) {
        if (!workout) return;
        
        const activeWorkout = {
            date: workout.date,
            timestamp: Date.now()
        };
        
        this.saveToStorage(this.ACTIVE_WORKOUT_KEY, activeWorkout);
    }

    // Добавляем вспомогательные методы из старого WorkoutStorage
    removeFromStorage(key, storage = localStorage) {
        try {
            storage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`Ошибка удаления данных для ключа "${key}":`, e);
            return false;
        }
    }

    createAutoBackup() {
        const workouts = this.getFromStorage(this.EXERCISES_KEY) || [];
        // Просто копируем массив тренировок как есть
        return this.saveToStorage(this.BACKUP_KEY, workouts);
    }

    restoreFromAutoBackup() {
        const backupWorkouts = this.getFromStorage(this.BACKUP_KEY);
        if (!backupWorkouts || !Array.isArray(backupWorkouts)) return false;
        
        // Форматируем данные перед восстановлением
        const formattedWorkouts = backupWorkouts.map(workout => 
            WorkoutFormatterService.formatWorkoutData(workout)
        );
        
        return this.saveToStorage(this.EXERCISES_KEY, formattedWorkouts);
    }
} 