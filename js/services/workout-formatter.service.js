import { DateFormatter } from '../utils/date-formatter.js';

export class WorkoutFormatterService {
    static formatWorkoutData(workout) {
        if (!workout) return null;
        
        const date = workout.date instanceof Date ? workout.date : new Date(workout.date);
        
        return {
            ...workout,
            date: DateFormatter.toStorageFormat(date),
            displayDate: DateFormatter.formatWorkoutDate(date),
            startTime: workout.startTime || '',
            notes: workout.notes || {},
            id: workout.id || crypto.randomUUID()
        };
    }
} 