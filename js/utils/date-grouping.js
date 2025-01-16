export class DateGrouping {
    /**
     * Получает номер недели для даты (понедельник - начало недели)
     */
    static getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const week1 = new Date(d.getFullYear(), 0, 4);
        return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
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

        // Создаем копию и сортируем в обратном порядке
        const sortedWorkouts = [...workouts].reverse();

        const groups = sortedWorkouts.reduce((acc, workout) => {
            const date = new Date(workout.date);
            const weekNum = this.getWeekNumber(date);
            const key = `${date.getFullYear()}-${weekNum}`;
            
            if (!acc[key]) {
                acc[key] = {
                    weekNumber: weekNum,
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
     * Группирует тренировки по годам
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