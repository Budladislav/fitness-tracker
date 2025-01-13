import { DateFormatter } from '../utils/date-formatter.js';
import { ExerciseCalculatorService } from './exercise-calculator.service.js';

/**
 * Сервис форматирования данных упражнений и тренировок
 */
export class ExerciseFormatterService {
    /**
     * Форматирует упражнение для отображения
     * @param {Object} exercise - Объект упражнения
     * @param {string} exercise.name - Название упражнения
     * @param {string} exercise.type - Тип упражнения (bodyweight/weighted)
     * @param {Array} exercise.sets - Массив подходов
     * @returns {string} Отформатированная строка упражнения
     */
    static formatExercise(exercise) {
        const { type, name, sets } = exercise;
        
        if (type === 'bodyweight') {
            return `${name}: ${sets.map(set => set.reps).join(', ')}`;
        }

        // Группируем подходы по весу
        const setsByWeight = sets.reduce((groups, set) => {
            const weight = set.weight || '—';
            if (!groups[weight]) {
                groups[weight] = [];
            }
            groups[weight].push(set.reps);
            return groups;
        }, {});

        // Форматируем каждую группу
        const setsStr = Object.entries(setsByWeight)
            .map(([weight, reps]) => `${weight}кг - ${reps.join(', ')}`)
            .join(' | ');

        return `${name}: ${setsStr}`;
    }

    /**
     * Форматирует сводку по тренировке
     * @param {Object} workout - Объект тренировки
     * @returns {Object} Объект с отформатированными данными
     * @property {string} date - Отформатированная дата
     * @property {number} totalReps - Общее количество повторений
     * @property {number} totalWeight - Общий вес
     * @property {number} exerciseCount - Количество упражнений
     */
    static formatWorkoutSummary(workout) {
        const totalReps = ExerciseCalculatorService.calculateWorkoutTotalReps(workout);
        const totalWeight = ExerciseCalculatorService.calculateWorkoutTotalWeight(workout);

        return {
            date: DateFormatter.formatWorkoutDate(workout.date),
            totalReps,
            totalWeight,
            exerciseCount: workout.exercises.length
        };
    }

    /**
     * Форматирует историю упражнения
     * @param {Array} history - Массив записей истории
     * @returns {Array|null} Массив отформатированных записей или null
     */
    static formatExerciseHistory(history) {
        if (!history || history.length === 0) return null;
        
        return history.map(entry => ({
            date: DateFormatter.formatWorkoutDate(entry.date),
            totalWeight: entry.totalWeight
        }));
    }
} 