import { DateFormatter } from '../utils/date-formatter.js';

export class StateManager {
    constructor(storage) {
        this.storage = storage;
        this._currentWorkout = null;
        this._formShown = false;
    }

    // Методы для работы с текущей тренировкой
    getCurrentWorkout() {
        if (!this._currentWorkout) {
            this._currentWorkout = this.storage.getFromStorage('currentWorkout', sessionStorage);
        }
        return this._currentWorkout;
    }

    setCurrentWorkout(workout) {
        // Убедимся, что у тренировки есть дата
        if (!workout.date) {
            workout.date = new Date().toISOString().split('T')[0];
        }
        
        this._currentWorkout = workout;
        this.storage.saveToStorage('currentWorkout', workout, sessionStorage);
        this.setActiveWorkout(workout);
    }

    // Методы для работы с активным состоянием
    setActiveWorkout(workout) {
        this.storage.saveToStorage('activeWorkout', {
            date: workout.date,
            timestamp: Date.now()
        });
    }

    clearCurrentWorkout() {
        this._currentWorkout = null;
        this._formShown = false;
        this.storage.removeFromStorage('currentWorkout', sessionStorage);
        this.storage.removeFromStorage('activeWorkout');
    }

    // Методы для работы с историей
    getWorkoutHistory() {
        const workouts = this.storage.getFromStorage('exercises') || [];
        return workouts.map(workout => ({
            ...workout,
            displayDate: DateFormatter.formatWorkoutDate(workout.date),
            startTime: workout.startTime || '',
            notes: workout.notes || {}
        }));
    }

    saveWorkoutToHistory(workout) {
        const savedWorkouts = this.getWorkoutHistory();
        const processedWorkout = {
            ...workout,
            date: workout.date ? DateFormatter.toStorageFormat(workout.date) : workout.date
        };
        
        savedWorkouts.push(processedWorkout);
        const success = this.storage.saveToStorage('exercises', savedWorkouts);
        
        if (success) {
            this.storage.createAutoBackup();
        }
        
        return success;
    }

    // Методы для работы с состоянием формы
    isFormShown() {
        return this._formShown;
    }

    setFormShown(value) {
        this._formShown = value;
    }
} 