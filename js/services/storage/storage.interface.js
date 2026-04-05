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
     * Полная подмена истории тренировок (восстановление из бекапа)
     * @param {Array} workouts
     * @returns {Promise<boolean>}
     */
    async restoreWorkouts(workouts) {
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

    /**
     * Получить данные из хранилища
     * @param {string} key - Ключ
     * @returns {Promise<any>}
     */
    async getFromStorage(key) {
        throw new Error('Method not implemented');
    }

    /**
     * Сохранить данные в хранилище
     * @param {string} key - Ключ
     * @param {any} value - Значение
     * @param {{ allowEmptyReplace?: boolean }} [options] — для ключа истории: явная очистка пустым массивом
     * @returns {Promise<boolean>}
     */
    async saveToStorage(key, value, options) {
        throw new Error('Method not implemented');
    }

    /**
     * Получить список кастомных упражнений пользователя
     * @returns {Promise<Array>}
     */
    async getCustomExercises() {
        throw new Error('Method not implemented');
    }

    /**
     * Сохранить кастомное упражнение
     * @param {Object} exercise - { id, name, type, defaultWeight? }
     * @returns {Promise<boolean>}
     */
    async saveCustomExercise(exercise) {
        throw new Error('Method not implemented');
    }

    /**
     * Удалить кастомное упражнение по ID
     * @param {string} exerciseId
     * @returns {Promise<boolean>}
     */
    async deleteCustomExercise(exerciseId) {
        throw new Error('Method not implemented');
    }

    /**
     * Обновить вес по умолчанию для упражнения (дефолтного или кастомного)
     * @param {string} exerciseName
     * @param {number} weight
     * @returns {Promise<boolean>}
     */
    async updateDefaultWeight(exerciseName, weight) {
        throw new Error('Method not implemented');
    }

    /**
     * После переименования кастомного упражнения: те же exerciseId в истории, пресетах и весах по умолчанию.
     * @param {{ exerciseId: string, oldDisplayName: string, newName: string, oldCatalogName?: string }} params
     * @returns {Promise<boolean>}
     */
    async propagateExerciseRename(params) {
        throw new Error('Method not implemented');
    }

    /**
     * Получить все сохранённые веса по умолчанию
     * @returns {Promise<Object>} { exerciseName: weight }
     */
    async getDefaultWeights() {
        throw new Error('Method not implemented');
    }

    /**
     * Получить список пресетов тренировок
     * @returns {Promise<Array>}
     */
    async getPresets() {
        throw new Error('Method not implemented');
    }

    /**
     * Полная подмена каталога упражнений, весов по умолчанию и пресетов (импорт из бекапа).
     * @param {{ customExercises?: Array, defaultWeights?: Object, presets?: Array }} data
     * @returns {Promise<boolean>}
     */
    async restoreUserCatalog(data) {
        throw new Error('Method not implemented');
    }

    /**
     * Сохранить новый или обновить существующий пресет
     * @param {Object} preset - Данные пресета { id, name, exercises }
     * @returns {Promise<boolean>}
     */
    async savePreset(preset) {
        throw new Error('Method not implemented');
    }

    /**
     * Удалить пресет
     * @param {string} presetId - ID пресета
     * @returns {Promise<boolean>}
     */
    async deletePreset(presetId) {
        throw new Error('Method not implemented');
    }
}