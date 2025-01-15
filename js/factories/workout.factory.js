import { DateFormatter } from '../utils/date-formatter.js';

export class WorkoutFactory {
    /**
     * Создает новую тренировку
     * @param {string} date - Дата тренировки
     * @param {Array} exercises - Массив упражнений
     * @param {Object} options - Дополнительные параметры (notes, id и т.д.)
     */
    static createNewWorkout(date, exercises = [], options = {}) {
        const now = new Date();
        
        return {
            id: options.id || Date.now(),
            date: date,
            exercises: exercises,
            created: options.created || now.toISOString(),
            startTime: options.startTime || `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
            notes: options.notes || {
                energy: null,
                intensity: null,
                text: null,
                timestamp: null
            }
        };
    }

    static createExercise(name, type) {
        return {
            name,
            type,
            sets: []
        };
    }

    static createSet(reps, weight = null) {
        return {
            reps: parseInt(reps, 10),
            ...(weight && { weight: parseFloat(weight) })
        };
    }

    static createExerciseData(exercise, set) {
        return {
            name: exercise.name,
            type: exercise.type,
            reps: set.reps,
            weight: set.weight
        };
    }

    static createNote(energy = null, intensity = null, text = null) {
        return {
            energy: energy ? { score: energy } : null,
            intensity: intensity ? { score: intensity } : null,
            text: text ? { content: text } : null
        };
    }
}