import { DateFormatter } from '../utils/date-formatter.js';
import { ExerciseCalculatorService } from './exercise-calculator.service.js';

/**
 * Сервис форматирования данных упражнений и тренировок
 */
export class ExerciseFormatterService {
    /**
     * Иконка типа упражнения (с пробелом): с весом / тренажёр / без веса
     */
    static getEquipmentIconPrefix(equipment, type) {
        if (type === 'bodyweight' || equipment === 'bodyweight') return '🤸 ';
        if (equipment === 'machine') return '⚙️ ';
        return '🏋️ ';
    }

    /**
     * Форматирует упражнение для отображения
     * @param {Object} exercise - Объект упражнения
     * @param {string} exercise.name - Название упражнения
     * @param {string} exercise.type - Тип упражнения (bodyweight/weighted)
     * @param {Array} exercise.sets - Массив подходов
     * @returns {string} Отформатированная строка упражнения
     */
    static formatExercise(exercise) {
        const { type, name, sets, equipment, doubleTonnage } = exercise;

        const eqIcon = this.getEquipmentIconPrefix(equipment, type);
        const x2 = doubleTonnage ? ' ×2' : '';

        if (type === 'bodyweight' || equipment === 'bodyweight') {
            return `${eqIcon}${name}${x2}: ${sets.map(set => set.reps).join(', ')}`;
        }

        // Группируем подходы последовательно по весу
        const groups = [];
        let currentGroup = null;

        sets.forEach(set => {
            const weight = set.weight || '—';
            if (!currentGroup || currentGroup.weight !== weight) {
                currentGroup = { weight: weight, reps: [] };
                groups.push(currentGroup);
            }
            currentGroup.reps.push(set.reps);
        });

        // Форматируем каждую группу
        const setsStr = groups
            .map(group => `${group.weight}кг - ${group.reps.join(', ')}`)
            .join(' | ');

        return `${eqIcon}${name}${x2}: ${setsStr}`;
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