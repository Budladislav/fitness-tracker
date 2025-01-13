/**
 * Сервис для расчёта показателей упражнений и тренировок
 */
export class ExerciseCalculatorService {
    /**
     * Рассчитывает общий вес для упражнения
     * @param {Object} exercise - Объект упражнения
     * @returns {number} Общий вес (тоннаж)
     */
    static calculateTotalWeight(exercise) {
        return exercise.sets.reduce((total, set) => 
            total + (set.weight || 0) * set.reps, 0);
    }

    /**
     * Рассчитывает общее количество повторений для упражнения
     * @param {Object} exercise - Объект упражнения
     * @returns {number} Общее количество повторений
     */
    static calculateTotalReps(exercise) {
        return exercise.sets.reduce((sum, set) => sum + set.reps, 0);
    }

    /**
     * Рассчитывает общий вес для всей тренировки
     * @param {Object} workout - Объект тренировки
     * @returns {number} Общий вес тренировки
     */
    static calculateWorkoutTotalWeight(workout) {
        return workout.exercises.reduce((sum, ex) => 
            sum + this.calculateTotalWeight(ex), 0);
    }

    /**
     * Рассчитывает общее количество повторений для тренировки
     * @param {Object} workout - Объект тренировки
     * @returns {number} Общее количество повторений
     */
    static calculateWorkoutTotalReps(workout) {
        return workout.exercises.reduce((sum, ex) => 
            sum + this.calculateTotalReps(ex), 0);
    }

    /**
     * Рассчитывает средний вес по истории упражнения
     * @param {Array} exerciseHistory - История упражнения
     * @returns {number|null} Средний вес или null
     */
    static calculateAverageWeight(exerciseHistory) {
        if (!exerciseHistory || exerciseHistory.length === 0) return null;
        const sum = exerciseHistory.reduce((total, entry) => 
            total + entry.totalWeight, 0);
        return Math.round(sum / exerciseHistory.length);
    }
} 