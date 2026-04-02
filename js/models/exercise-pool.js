/**
 * @fileoverview Пул типовых упражнений
 * @version 3.0.0
 */

export const DEFAULT_EXERCISES = {
    bodyweight: [
        { id: 'leg-raises',   name: 'Подъем ног',                  type: 'bodyweight', equipment: 'bodyweight' },
        { id: 'twists',       name: 'Скручивания',                  type: 'bodyweight', equipment: 'bodyweight' },
        { id: 'ring-pushups', name: 'Отжимания на кольцах',         type: 'bodyweight', equipment: 'bodyweight' },
        { id: 'dips',         name: 'Отжимания на брусьях',         type: 'bodyweight', equipment: 'bodyweight' },
        { id: 'pullups',      name: 'Подтягивания прямым хватом',   type: 'bodyweight', equipment: 'bodyweight' },
        { id: 'chin-ups',     name: 'Подтягивания обратным хватом', type: 'bodyweight', equipment: 'bodyweight' }
    ],
    weighted: [
        { id: 'deadlift',    name: 'Тяга',    type: 'weighted', equipment: 'free_weight', defaultWeight: 100 },
        { id: 'bench-press', name: 'Жим',     type: 'weighted', equipment: 'free_weight', defaultWeight: 80  },
        { id: 'squat',       name: 'Присяд',  type: 'weighted', equipment: 'free_weight', defaultWeight: 120 }
    ]
};

/** Все id упражнений из коробки (для UI и защиты от удаления) */
export function getBuiltinExerciseIdsSet() {
    return new Set([
        ...DEFAULT_EXERCISES.bodyweight.map(e => e.id),
        ...DEFAULT_EXERCISES.weighted.map(e => e.id)
    ]);
}

/** Имя по умолчанию из кода для id (если не встроенное — null) */
export function getOriginalBuiltinName(exerciseId) {
    if (!exerciseId) return null;
    const all = [...DEFAULT_EXERCISES.bodyweight, ...DEFAULT_EXERCISES.weighted];
    return all.find(e => e.id === exerciseId)?.name ?? null;
}

export class ExercisePool {
    /**
     * @param {string} type - 'weighted' | 'bodyweight'
     * @param {Array} customExercises — сохранённые упражнения (в т.ч. сидированные «встроенные»)
     * @param {Object} defaultWeights — веса и __name_${id}
     */
    static getExercisesByType(type, customExercises = [], defaultWeights = {}) {
        const defaults = DEFAULT_EXERCISES[type] || [];
        const builtinIds = new Set(defaults.map(d => d.id));
        const customById = new Map(
            customExercises.filter(e => e.type === type).map(e => [e.id, e])
        );

        const mergedFromDefaults = defaults.map(def => {
            const stored = customById.get(def.id);
            const base = stored ? { ...def, ...stored } : { ...def };
            const nameFromOverride = defaultWeights[`__name_${def.id}`];
            const displayName = nameFromOverride || base.name;
            const dw =
                defaultWeights[displayName] ??
                defaultWeights[base.name] ??
                base.defaultWeight ??
                '';
            return {
                ...base,
                name: displayName,
                defaultWeight: dw
            };
        });

        const extras = customExercises
            .filter(e => e.type === type && !builtinIds.has(e.id))
            .map(ex => {
                const nameFromOverride = defaultWeights[`__name_${ex.id}`];
                const displayName = nameFromOverride || ex.name;
                const dw =
                    defaultWeights[displayName] ??
                    defaultWeights[ex.name] ??
                    ex.defaultWeight ??
                    '';
                return {
                    ...ex,
                    name: displayName,
                    defaultWeight: dw
                };
            });

        return [...mergedFromDefaults, ...extras];
    }

    /**
     * @param {Array} customExercises 
     * @param {Object} defaultWeights 
     */
    static getAllExercises(customExercises = [], defaultWeights = {}) {
        return [
            ...this.getExercisesByType('weighted', customExercises, defaultWeights),
            ...this.getExercisesByType('bodyweight', customExercises, defaultWeights)
        ];
    }

    static getExerciseById(id, customExercises = []) {
        return customExercises.find(exercise => exercise.id === id);
    }

    /**
     * Возвращает вес по умолчанию 
     */
    static getDefaultWeight(exerciseName, savedWeights = {}, customExercises = []) {
        const exercise = customExercises.find(ex => ex.name === exerciseName);
        return savedWeights[exerciseName] ?? exercise?.defaultWeight ?? '';
    }

    /**
     * Плоский массив стандартных упражнений для сидинга
     */
    static getSeedExercises() {
        return [...DEFAULT_EXERCISES.bodyweight, ...DEFAULT_EXERCISES.weighted].map(ex => ({
            id: ex.id,
            name: ex.name,
            type: ex.type,
            equipment: ex.equipment,
            defaultWeight: ex.defaultWeight || 0
        }));
    }
}
