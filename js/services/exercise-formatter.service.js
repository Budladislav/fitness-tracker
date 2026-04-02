import { DateFormatter } from '../utils/date-formatter.js';
import { ExerciseCalculatorService } from './exercise-calculator.service.js';

/**
 * Сервис форматирования данных упражнений и тренировок
 */
/** Жим / присяд / тяга — в истории и бекапе как тренажёр (штанга в станке) */
const BUILTIN_BAR_IDS = new Set(['bench-press', 'squat', 'deadlift']);

function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export class ExerciseFormatterService {
    /** SVG гантели (свободный вес), выровнено по высоте с эмодзи */
    static DUMBBELL_ICON_HTML =
        '<span class="ex-eq-dumbbell" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1.15em" height="1.15em" fill="currentColor"><path d="M4 8a2 2 0 0 1 2-2h1.5v12H6a2 2 0 0 1-2-2V8zm14.5-2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-1.5V6zM7.5 6H10v12H7.5V6zm7 0h2.5v12h-2.5V6zM10 10.75h4v2.5h-4v-2.5z"/></svg></span> ';

    /**
     * Иконка типа упражнения (с пробелом): без веса / тренажёр / гантели
     * @param {string} [exerciseId] — для Жим/Тяга/Присяд всегда иконка тренажёра
     */
    static getEquipmentIconPrefix(equipment, type, exerciseId = null) {
        if (type === 'bodyweight' || equipment === 'bodyweight') return '🤸 ';
        if (equipment === 'machine' || (exerciseId && BUILTIN_BAR_IDS.has(exerciseId))) return '⚙️ ';
        return this.DUMBBELL_ICON_HTML;
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
        const { type, name, sets, equipment, doubleTonnage, exerciseId } = exercise;

        const eqIcon = this.getEquipmentIconPrefix(equipment, type, exerciseId);
        const x2 = doubleTonnage ? ' ×2' : '';
        const safeName = escapeHtml(name);

        if (type === 'bodyweight' || equipment === 'bodyweight') {
            return `${eqIcon}${safeName}${x2}: ${sets.map(set => set.reps).join(', ')}`;
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

        return `${eqIcon}${safeName}${x2}: ${setsStr}`;
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