import { Utils } from '../utils/utils.js';
import { DateFormatter } from '../utils/date-formatter.js';
import { ExerciseCalculatorService } from '../services/exercise-calculator.service.js';

/**
 * Управляет хранением данных
 * @class WorkoutStorage
 */
export class WorkoutStorage {
    constructor() {
        this.storageAvailable = this.checkStorageAvailability();
        this.STORAGE_KEY = 'workouts';
        this.ACTIVE_WORKOUT_KEY = 'activeWorkout';
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
        // Пробуем получить из sessionStorage
        const currentWorkout = this.getFromStorage('currentWorkout', sessionStorage);
        if (currentWorkout) return currentWorkout;

        // Если нет в sessionStorage, проверяем activeWorkout
        const activeWorkout = this.getFromStorage('activeWorkout');
        if (activeWorkout) {
            // Сохраняем в sessionStorage и возвращаем
            this.saveToStorage('currentWorkout', activeWorkout, sessionStorage);
            return activeWorkout;
        }

        // Если нигде нет, возвращаем null вместо нового объекта
        return null;
    }

    saveCurrentWorkout(workout) {
        // Убедимся, что у тренировки есть дата
        if (!workout.date) {
            workout.date = new Date().toISOString().split('T')[0];
        }
        
        this.saveToStorage('currentWorkout', workout, sessionStorage);
        this.setActiveWorkout(workout);
    }

    getWorkoutHistory() {
        const workouts = this.getFromStorage('exercises') || [];
        
        // Преобразуем даты при чтении
        return workouts.map(workout => ({
            ...workout,
            displayDate: DateFormatter.formatWorkoutDate(workout.date),
            startTime: workout.startTime || '' // Добавляем время старта, если оно есть
        }));
    }

    saveWorkoutToHistory(workout) {
        const savedWorkouts = this.getWorkoutHistory();
        
        // Преобразуем дату в формат хранения, если она есть
        const processedWorkout = {
            ...workout,
            date: workout.date ? DateFormatter.toStorageFormat(workout.date) : workout.date
        };
        
        savedWorkouts.push(processedWorkout);
        return this.saveToStorage('exercises', savedWorkouts);
    }

    deleteWorkoutFromHistory(workoutId) {
        const workouts = this.getWorkoutHistory();
        const filteredWorkouts = workouts.filter(workout => workout.id !== workoutId);
        return this.saveToStorage('exercises', filteredWorkouts);
    }

    /**
     * Получает активную тренировку из хранилища
     * @returns {Object|null} Активная тренировка или null
     */
    getActiveWorkout() {
        try {
            const activeWorkoutJson = localStorage.getItem(this.ACTIVE_WORKOUT_KEY);
            return activeWorkoutJson ? JSON.parse(activeWorkoutJson) : null;
        } catch (error) {
            console.error('Error getting active workout:', error);
            return null;
        }
    }

    /**
     * Сохраняет активную тренировку
     * @param {Object} workout - Тренировка для сохранения
     */
    setActiveWorkout(workout) {
        // Убедимся, что у тренировки есть дата
        if (!workout.date) {
            workout.date = new Date().toISOString().split('T')[0];
        }
        
        this.saveToStorage('activeWorkout', workout);
    }

    /**
     * Удаляет активную тренировку
     */
    clearActiveWorkout() {
        localStorage.removeItem(this.ACTIVE_WORKOUT_KEY);
    }

    getExerciseHistory(exerciseName, limit = 3) {
        const workouts = this.getWorkoutHistory();
        const exerciseHistory = [];
        
        // Перебираем тренировки в обратном порядке
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
}