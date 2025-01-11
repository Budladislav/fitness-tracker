/**
 * Форматирует данные упражнений для отображения
 * @class ExerciseFormatter
 */
export class ExerciseFormatter {
    /**
     * Форматирует упражнение для отображения
     * @param {Object} exercise - Данные упражнения
     * @returns {string} Отформатированная строка
     */
    static formatExercise(exercise) {
        const { type, name, sets } = exercise;
        
        if (type === 'bodyweight') {
            return `${name}: ${sets.map(set => set.reps).join(', ')}`;
        }

        // Группируем подходы по весу
        const setsByWeight = sets.reduce((groups, set) => {
            const weight = set.weight;
            if (!groups[weight]) {
                groups[weight] = [];
            }
            groups[weight].push(set.reps);
            return groups;
        }, {});

        // Форматируем каждую группу с разделителем между весом и повторениями
        const setsStr = Object.entries(setsByWeight)
            .map(([weight, reps]) => `${weight}кг - ${reps.join(', ')}`)
            .join(' | ');

        return `${name}: ${setsStr}`;
    }
} 