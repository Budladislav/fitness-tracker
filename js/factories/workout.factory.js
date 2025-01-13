import { DateFormatter } from '../utils/date-formatter.js';

export class WorkoutFactory {
    static createNewWorkout(date, exercises = []) {
        return {
            id: Date.now(),
            date: DateFormatter.toStorageFormat(date),
            exercises: exercises,
            created: new Date()
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
} 