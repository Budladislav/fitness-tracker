export class ExerciseFormatter {
    static formatExercise(exercise) {
        const { type, name, reps, weight } = exercise;
        return type === 'bodyweight'
            ? `${name} - ${reps}`
            : `${name} - ${reps} × ${weight} кг`;
    }
} 