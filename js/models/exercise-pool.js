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
     * @param {Object} [defaultWeights={}] - сохраненные веса и переопределения имён
     */
    static getExercisesByType(type, customExercises = [], defaultWeights = {}) {
        const defaults = (DEFAULT_EXERCISES[type] || []).map(ex => {
            const overrideName = defaultWeights[`__name_${ex.id}`];
            const name = overrideName || ex.name;
            return {
                ...ex,
                originalName: ex.name,
                name: name,
                defaultWeight: defaultWeights[name] ?? defaultWeights[ex.name] ?? ex.defaultWeight
            };
        });
        const custom = customExercises.filter(e => e.type === type).map(ex => ({
            ...ex,
            defaultWeight: defaultWeights[ex.name] ?? ex.defaultWeight
        }));
        return [...defaults, ...custom];
    }

    /**
     * @param {Array} [customExercises=[]] - кастомные упражнения пользователя
     * @param {Object} [defaultWeights={}] - сохраненные веса и переопределения имён
     */
    static getAllExercises(customExercises = [], defaultWeights = {}) {
        return [
            ...this.getExercisesByType('bodyweight', customExercises, defaultWeights),
            ...this.getExercisesByType('weighted', customExercises, defaultWeights)
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
        // Затем ищем в пуле с учетом переопределений
        const all = this.getAllExercises(customExercises, savedWeights);
        const exercise = all.find(ex => ex.name === exerciseName || ex.originalName === exerciseName);
        return exercise?.defaultWeight ?? '';
    }
}