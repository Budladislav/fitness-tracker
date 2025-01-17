export class DateGrouping {
    /**
     * Получает номер недели для даты (понедельник - начало недели)
     */
    static getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        
        // Получаем год для недели (может отличаться от года даты)
        const weekYear = new Date(d.getTime());
        weekYear.setDate(d.getDate() + 3);
        const actualYear = weekYear.getFullYear();
        
        const week1 = new Date(actualYear, 0, 4);
        const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        
        return {
            weekNumber: weekNum,
            year: actualYear
        };
    }

    /**
     * Получает название месяца
     */
    static getMonthName(date) {
        return new Date(date).toLocaleString('ru-RU', { month: 'long' });
    }

    /**
     * Группирует тренировки по месяцам
     */
    static getMonthBoundaries(workouts) {
        if (!workouts.length) return [];

        // Создаем копию и сортируем в обратном порядке
        const sortedWorkouts = [...workouts].reverse();

        const groups = sortedWorkouts.reduce((acc, workout) => {
            const date = new Date(workout.date);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            
            if (!acc[key]) {
                acc[key] = {
                    month: this.getMonthName(date),
                    workouts: [],
                    firstDate: workout.date,
                    lastDate: workout.date
                };
            }
            
            acc[key].workouts.push(workout);
            acc[key].lastDate = workout.date;
            
            return acc;
        }, {});

        return Object.values(groups).map(group => ({
            ...group,
            count: group.workouts.length
        }));
    }

    /**
     * Группирует тренировки по неделям
     */
    static getWeekBoundaries(workouts) {
        if (!workouts.length) return [];

        const groups = workouts.reduce((acc, workout) => {
            const date = new Date(workout.date);
            const { weekNumber, year } = this.getWeekNumber(date);
            const key = `${year}-${weekNumber}`;
            
            if (!acc[key]) {
                acc[key] = {
                    year,
                    weekNumber,
                    workouts: [],
                    firstDate: workout.date,
                    lastDate: workout.date
                };
            }
            
            acc[key].workouts.push(workout);
            
            // Обновляем границы дат
            const workoutDate = new Date(workout.date);
            const firstDate = new Date(acc[key].firstDate);
            const lastDate = new Date(acc[key].lastDate);
            
            if (workoutDate < firstDate) acc[key].firstDate = workout.date;
            if (workoutDate > lastDate) acc[key].lastDate = workout.date;
            
            return acc;
        }, {});

        return Object.values(groups).map(group => ({
            ...group,
            count: group.workouts.length
        }));
    }

    /**
     * Группирует тренировки по годам. Решено отказаться от отображения но оставить код
     */
    static getYearBoundaries(workouts) {
        if (!workouts.length) return [];

        // Создаем копию и сортируем в обратном порядке
        const sortedWorkouts = [...workouts].reverse();

        const groups = sortedWorkouts.reduce((acc, workout) => {
            const date = new Date(workout.date);
            const year = date.getFullYear();
            
            if (!acc[year]) {
                acc[year] = {
                    year,
                    workouts: [],
                    firstDate: workout.date,
                    lastDate: workout.date
                };
            }
            
            acc[year].workouts.push(workout);
            acc[year].lastDate = workout.date;
            
            return acc;
        }, {});

        return Object.values(groups).map(group => ({
            ...group,
            count: group.workouts.length
        }));
    }
} 