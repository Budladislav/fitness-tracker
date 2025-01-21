import { Utils } from '../utils/utils.js';
import { DateFormatter } from '../utils/date-formatter.js';
import { ExerciseCalculatorService } from '../services/exercise-calculator.service.js';

/**
 * Управляет хранением данных
 * @class WorkoutStorage
 */
export class WorkoutStorage {
    constructor() {
        this.ACTIVE_WORKOUT_KEY = 'activeWorkout';
        this.CURRENT_WORKOUT_KEY = 'currentWorkout';
        this.EXERCISES_KEY = 'exercises';
        this.BACKUP_KEY = 'exercisesBackup';
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

    // Базовые методы работы с хранилищем
    async getWorkout(id) {
        const workouts = await this.getWorkoutHistory();
        return workouts.find(w => w.id === id);
    }

    async getCurrentWorkout() {
        // Приоритет: sessionStorage -> localStorage -> null
        const current = this.getFromStorage(this.CURRENT_WORKOUT_KEY, sessionStorage);
        if (current) return this.formatWorkoutData(current);

        const active = this.getFromStorage(this.ACTIVE_WORKOUT_KEY);
        if (active) {
            const formatted = this.formatWorkoutData(active);
            this.saveToStorage(this.CURRENT_WORKOUT_KEY, formatted, sessionStorage);
            return formatted;
        }

        return null;
    }

    async saveCurrentWorkout(workout) {
        const formatted = this.formatWorkoutData(workout);
        
        // Сохраняем в оба хранилища
        this.saveToStorage(this.CURRENT_WORKOUT_KEY, formatted, sessionStorage);
        this.setActiveWorkout(formatted);
        
        return formatted;
    }

    async getWorkoutHistory() {
        const workouts = this.getFromStorage(this.EXERCISES_KEY) || [];
        return workouts.map(workout => this.formatWorkoutData(workout));
    }

    async saveWorkoutToHistory(workout) {
        const workouts = await this.getWorkoutHistory();
        const formatted = this.formatWorkoutData(workout);
        
        workouts.push(formatted);
        const success = this.saveToStorage(this.EXERCISES_KEY, workouts);
        
        if (success) {
            this.createAutoBackup();
        }
        
        return success;
    }

    // Вспомогательные методы
    formatWorkoutData(workout) {
        if (!workout) return null;
        
        const date = workout.date instanceof Date ? workout.date : new Date(workout.date);
        
        return {
            ...workout,
            date: DateFormatter.toStorageFormat(date),
            displayDate: DateFormatter.formatWorkoutDate(date),
            startTime: workout.startTime || date.toTimeString().slice(0, 5),
            notes: workout.notes || {},
            id: workout.id || crypto.randomUUID()
        };
    }

    clearCurrentWorkout() {
        this.removeFromStorage(this.CURRENT_WORKOUT_KEY, sessionStorage);
        this.removeFromStorage(this.ACTIVE_WORKOUT_KEY);
    }

    async getExerciseHistory(exerciseName, limit = 3) {
        const workouts = await this.getWorkoutHistory();
        const exerciseHistory = [];
        
        for (let i = workouts.length - 1; i >= 0 && exerciseHistory.length < limit; i--) {
            const workout = workouts[i];
            const exercise = workout.exercises.find(e => e.name === exerciseName);
            
            if (exercise) {
                exerciseHistory.push({
                    date: workout.date,
                    totalWeight: ExerciseCalculatorService.calculateTotalWeight(exercise)
                });
            }
        }
        
        return exerciseHistory;
    }

    // Добавим метод для автоматического бэкапа
    createAutoBackup() {
        const workouts = this.getWorkoutHistory();
        this.saveToStorage(this.BACKUP_KEY, workouts);
    }

    /**
     * Обновляет существующую тренировку в истории
     * @param {Object} workout - Обновленная тренировка
     * @returns {boolean} Успешность операции
     */
    updateWorkout(workout) {
        try {
            const history = this.getWorkoutHistory();
            const index = history.findIndex(w => w.id === workout.id);
            
            if (index !== -1) {
                history[index] = {
                    ...workout,
                    date: workout.date ? DateFormatter.toStorageFormat(workout.date) : workout.date
                };
                const success = this.saveToStorage(this.EXERCISES_KEY, history);
                
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

    /**
     * Получает тренировку по ID
     * @param {string|number} id - ID тренировки
     * @returns {Object|null} Тренировка или null, если не найдена
     */
    getWorkoutById(id) {
        const history = this.getWorkoutHistory();
        const workout = history.find(workout => workout.id === id);
        
        if (workout) {
            return {
                ...workout,
                displayDate: DateFormatter.formatWorkoutDate(workout.date)
            };
        }
        
        return null;
    }

    // Добавляем метод setActiveWorkout обратно
    setActiveWorkout(workout) {
        if (!workout) return;
        
        const activeWorkout = {
            date: workout.date,
            timestamp: Date.now()
        };
        
        this.saveToStorage(this.ACTIVE_WORKOUT_KEY, activeWorkout);
    }

    async deleteWorkoutFromHistory(workoutId) {
        try {
            const workouts = await this.getWorkoutHistory();
            const filteredWorkouts = workouts.filter(workout => workout.id !== workoutId);
            const success = this.saveToStorage(this.EXERCISES_KEY, filteredWorkouts);
            
            if (success) {
                await this.createAutoBackup();
            }
            
            return success;
        } catch (error) {
            console.error('Error deleting workout:', error);
            return false;
        }
    }
}