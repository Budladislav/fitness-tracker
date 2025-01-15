import { DateFormatter } from '../utils/date-formatter.js';

export class WorkoutFactory {
    static createNewWorkout(date, exercises = []) {
        return {
            id: Date.now(),
            date: DateFormatter.toStorageFormat(date),
            exercises: exercises,
            created: new Date(),
            startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            notes: {
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