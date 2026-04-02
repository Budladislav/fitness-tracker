export class ExerciseIdService {
    constructor(storage) {
        this.storage = storage;
        this.exerciseMap = new Map(); // id -> current name
        this.equipmentMap = new Map(); // id -> equipment type
    }

    async loadMapping() {
        const customExercises = await this.storage.getCustomExercises();
        this.exerciseMap.clear();
        this.equipmentMap.clear();
        
        customExercises.forEach(ex => {
            this.exerciseMap.set(ex.id, ex.name);
            if (ex.equipment) {
                this.equipmentMap.set(ex.id, ex.equipment);
            }
        });
    }

    getName(id, fallbackName) {
        return this.exerciseMap.get(id) || fallbackName || 'Удаленное упражнение';
    }

    getEquipment(id, fallbackEq) {
        return this.equipmentMap.get(id) || fallbackEq || null;
    }

    // Миграция старых данных: находим ID по названию (для обратной совместимости)
    findIdByName(name) {
        for (const [id, exName] of this.exerciseMap.entries()) {
            if (exName.toLowerCase() === name.toLowerCase()) {
                return id;
            }
        }
        return null; // Если не нашли, сгенерируем при миграции
    }

    async migrateWorkouts(workouts) {
        let changed = false;
        await this.loadMapping();

        const migrated = workouts.map(workout => {
            let workoutChanged = false;
            const migratedExercises = workout.exercises.map(ex => {
                if (!ex.exerciseId) {
                    workoutChanged = true;
                    // Пытаемся найти ID по имени
                    const foundId = this.findIdByName(ex.name);
                    ex.exerciseId = foundId || `old_${Math.random().toString(36).substr(2, 9)}`;
                }
                
                // Если equipment не установлен, выводим по типу
                if (!ex.equipment) {
                    workoutChanged = true;
                    if (ex.type === 'weighted') {
                        ex.equipment = 'free_weight'; 
                    } else if (ex.type === 'bodyweight') {
                        ex.equipment = 'bodyweight';
                    }
                }
                
                return ex;
            });

            if (workoutChanged) changed = true;
            return { ...workout, exercises: migratedExercises };
        });

        return { migrated, changed };
    }
}
