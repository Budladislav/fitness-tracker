/**
 * @fileoverview Пул типовых упражнений
 * @version 1.0.0
 */

const DEFAULT_EXERCISES = {
    bodyweight: [
        {
            id: 'leg-raises',
            name: 'Подъем ног',
            type: 'bodyweight'
        },
        {
            id: 'twists',
            name: 'Скручивания',
            type: 'bodyweight'
        },
        {
            id: 'ring-pushups',
            name: 'Отжимания на кольцах',
            type: 'bodyweight'
        },
        {
            id: 'dips',
            name: 'Отжимания на брусьях',
            type: 'bodyweight'
        },
        {
            id: 'pullups',
            name: 'Подтягивания прямым хватом',
            type: 'bodyweight'
        },
        {
            id: 'chin-ups',
            name: 'Подтягивания обратным хватом',
            type: 'bodyweight'
        }
    ],
    weighted: [
        {
            id: 'deadlift',
            name: 'Тяга',
            type: 'weighted'
        },
        {
            id: 'bench-press',
            name: 'Жим',
            type: 'weighted'
        },
        {
            id: 'squat',
            name: 'Присяд',
            type: 'weighted'
        }
    ]
};

class ExercisePool {
    static getExercisesByType(type) {
        return DEFAULT_EXERCISES[type] || [];
    }

    static getAllExercises() {
        return [...DEFAULT_EXERCISES.bodyweight, ...DEFAULT_EXERCISES.weighted];
    }

    static getExerciseById(id) {
        return this.getAllExercises().find(exercise => exercise.id === id);
    }
} 