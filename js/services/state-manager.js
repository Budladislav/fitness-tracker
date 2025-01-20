import { DateFormatter } from '../utils/date-formatter.js';

export class StateManager {
    constructor(storage) {
        this.storage = storage;
        this._currentWorkout = null;
        this._formShown = false;
    }

    // Методы для работы с текущей тренировкой
    async getCurrentWorkout() {
        if (!this._currentWorkout) {
            this._currentWorkout = await this.storage.getCurrentWorkout();
        }
        return this._currentWorkout;
    }

    async setCurrentWorkout(workout) {
        this._currentWorkout = await this.storage.saveCurrentWorkout(workout);
    }

    async clearCurrentWorkout() {
        this._currentWorkout = null;
        this._formShown = false;
        this.storage.clearCurrentWorkout();
    }

    // Методы для работы с историей
    async getWorkoutHistory() {
        return await this.storage.getWorkoutHistory();
    }

    async saveWorkoutToHistory(workout) {
        return await this.storage.saveWorkoutToHistory(workout);
    }

    // Методы для работы с состоянием формы
    isFormShown() {
        return this._formShown;
    }

    setFormShown(value) {
        this._formShown = value;
    }
} 