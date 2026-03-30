/**
 * @fileoverview Пул типовых упражнений
 * @version 2.0.0
 */

const DEFAULT_EXERCISES = {
    bodyweight: [
        { id: 'leg-raises',   name: 'Подъем ног',                  type: 'bodyweight' },
        { id: 'twists',       name: 'Скручивания',                  type: 'bodyweight' },
        { id: 'ring-pushups', name: 'Отжимания на кольцах',         type: 'bodyweight' },
        { id: 'dips',         name: 'Отжимания на брусьях',         type: 'bodyweight' },
        { id: 'pullups',      name: 'Подтягивания прямым хватом',   type: 'bodyweight' },
        { id: 'chin-ups',     name: 'Подтягивания обратным хватом', type: 'bodyweight' }
    ],
    weighted: [
        { id: 'deadlift',    name: 'Тяга',    type: 'weighted', defaultWeight: 100 },
        { id: 'bench-press', name: 'Жим',     type: 'weighted', defaultWeight: 80  },
        { id: 'squat',       name: 'Присяд',  type: 'weighted', defaultWeight: 120 }
    ]
};

export class ExercisePool {
    /**
     * @param {string} type - 'weighted' | 'bodyweight'
     * @param {Array} [customExercises=[]] - кастомные упражнения пользователя из Firebase
     */
    static getExercisesByType(type, customExercises = []) {
        const defaults = DEFAULT_EXERCISES[type] || [];
        const custom = customExercises.filter(e => e.type === type);
        return [...defaults, ...custom];
    }

    /**
     * @param {Array} [customExercises=[]] - кастомные упражнения пользователя
     */
    static getAllExercises(customExercises = []) {
        return [
            ...DEFAULT_EXERCISES.bodyweight,
            ...DEFAULT_EXERCISES.weighted,
            ...customExercises
        ];
    }

    static getExerciseById(id, customExercises = []) {
        return this.getAllExercises(customExercises).find(exercise => exercise.id === id);
    }

    /**
     * Возвращает вес по умолчанию с учётом пользовательских настроек
     * @param {string} exerciseName
     * @param {Object} [savedWeights={}] - веса из Firebase { name: weight }
     * @param {Array}  [customExercises=[]]
     */
    static getDefaultWeight(exerciseName, savedWeights = {}, customExercises = []) {
        // Пользовательский вес имеет приоритет
        if (savedWeights[exerciseName] !== undefined) {
            return savedWeights[exerciseName];
        }
        // Затем ищем в пуле
        const all = this.getAllExercises(customExercises);
        const exercise = all.find(ex => ex.name === exerciseName);
        return exercise?.defaultWeight ?? '';
    }
}