/**
 * Интерфейс хранилища данных
 * @interface
 */
export class StorageInterface {
    /**
     * Получить историю тренировок
     * @returns {Promise<Array>}
     */
    async getWorkoutHistory() {
        throw new Error('Method not implemented');
    }

    /**
     * Сохранить тренировку в историю
     * @param {Object} workout - Данные тренировки
     * @returns {Promise<boolean>}
     */
    async saveWorkoutToHistory(workout) {
        throw new Error('Method not implemented');
    }

    /**
     * Удалить тренировку из истории
     * @param {string} workoutId - ID тренировки
     * @returns {Promise<boolean>}
     */
    async deleteWorkout(workoutId) {
        throw new Error('Method not implemented');
    }

    /**
     * Обновить существующую тренировку
     * @param {Object} workout - Обновленные данные тренировки
     * @returns {Promise<boolean>}
     */
    async updateWorkout(workout) {
        throw new Error('Method not implemented');
    }

    /**
     * Получить текущую тренировку
     * @returns {Promise<Object|null>}
     */
    async getCurrentWorkout() {
        throw new Error('Method not implemented');
    }

    /**
     * Сохранить текущую тренировку
     * @param {Object} workout - Данные тренировки
     * @returns {Promise<boolean>}
     */
    async saveCurrentWorkout(workout) {
        throw new Error('Method not implemented');
    }

    /**
     * Очистить текущую тренировку
     * @returns {Promise<void>}
     */
    async clearCurrentWorkout() {
        throw new Error('Method not implemented');
    }

    /**
     * Получить историю упражнения
     * @param {string} exerciseName - Название упражнения
     * @param {number} limit - Лимит записей
     * @returns {Promise<Array>}
     */
    async getExerciseHistory(exerciseName, limit = 3) {
        throw new Error('Method not implemented');
    }

    /**
     * Создать автоматический бэкап
     */
    createAutoBackup() {
        throw new Error('Method not implemented');
    }
} 