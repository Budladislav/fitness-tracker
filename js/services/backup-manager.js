export class BackupManager {
    constructor(storage, notifications) {
        this.storage = storage;
        this.notifications = notifications;
    }

    /**
     * Конвертирует тренировки в текстовый формат
     */
    workoutsToText(workouts) {
        return workouts.map(workout => {
            const date = new Date(workout.date);
            const dateStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear().toString().slice(2)}`;
            
            // Добавляем время, если оно есть
            const timeStr = workout.startTime ? ` ${workout.startTime}` : '';
            
            const exercisesStr = workout.exercises.map(exercise => {
                if (exercise.type === 'weighted') {
                    // Группируем подходы по весу
                    const setsByWeight = exercise.sets.reduce((acc, set) => {
                        acc[set.weight] = acc[set.weight] || [];
                        acc[set.weight].push(set.reps);
                        return acc;
                    }, {});
                    
                    // Форматируем каждую группу
                    const setsStr = Object.entries(setsByWeight)
                        .map(([weight, reps]) => `(${weight}) – ${reps.join(', ')}`)
                        .join('; ');
                    
                    return `${exercise.name} ${setsStr}`;
                } else {
                    // Для упражнений без веса
                    const reps = exercise.sets.map(set => set.reps).join(', ');
                    return `${exercise.name} – ${reps}`;
                }
            }).join('\n');

            let result = `${dateStr}${timeStr}\n${exercisesStr}\n`;
            
            // Добавляем заметки, если они есть
            if (workout.notes) {
                if (workout.notes.energy) {
                    result += `Энергия: ${workout.notes.energy.score}/5\n`;
                }
                if (workout.notes.intensity) {
                    result += `Интенсивность: ${workout.notes.intensity.score}/5\n`;
                }
                if (workout.notes.text?.content) {
                    result += `Заметка: ${workout.notes.text.content}\n`;
                }
            }
            
            return result;
        }).join('\n');
    }

    async createBackup() {
        try {
            const workouts = this.storage.getWorkoutHistory();
            if (workouts.length === 0) {
                this.notifications.warning('История тренировок пуста');
                return;
            }

            let result = '';
            workouts.forEach(workout => {
                result += `=== Тренировка ${workout.date} ===\n`;
                if (workout.startTime) {
                    result += `Время начала: ${workout.startTime}\n`;
                }
                
                result += '\nУпражнения:\n';
                workout.exercises.forEach(exercise => {
                    result += `${exercise.name}:\n`;
                    exercise.sets.forEach(set => {
                        result += `- ${set.reps} повторений${set.weight ? ` × ${set.weight}кг` : ''}\n`;
                    });
                    result += '\n';
                });

                // Добавляем заметки, если они есть
                if (workout.notes) {
                    if (workout.notes.energy) {
                        result += `Энергия: ${workout.notes.energy.score}/5\n`;
                    }
                    if (workout.notes.intensity) {
                        result += `Интенсивность: ${workout.notes.intensity.score}/5\n`;
                    }
                    if (workout.notes.text?.content) {
                        result += `Заметка: ${workout.notes.text.content}\n`;
                    }
                }
                
                result += '\n';
            });

            const dateStr = new Date().toISOString().split('T')[0];
            const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
            const fileName = `workout_backup_${dateStr}_${timeStr}.txt`;

            // Проверяем поддержку File System Access API
            if ('showSaveFilePicker' in window) {
                // Десктопный вариант
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'Text Files',
                        accept: {'text/plain': ['.txt']},
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(result);
                await writable.close();
            } else {
                // Мобильный fallback
                const blob = new Blob([result], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            this.notifications.success('Резервная копия создана');
        } catch (error) {
            console.error('Error creating backup:', error);
            this.notifications.error('Ошибка при создании резервной копии');
        }
    }

    async restoreFromBackup() {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Text Files',
                    accept: {'text/plain': ['.txt']},
                }],
            });

            const file = await fileHandle.getFile();
            const content = await file.text();
            
            // Обновляем парсер для поддержки времени
            const workouts = this.parseWorkoutData(content);
            
            if (workouts.length > 0) {
                localStorage.removeItem('exercises');
                workouts.forEach(workout => {
                    this.storage.saveWorkoutToHistory(workout);
                });
                
                this.notifications.show(`Восстановлено ${workouts.length} тренировок`, 'success');
                return true;
            }
            
            this.notifications.show('Файл бэкапа не содержит тренировок', 'error');
            return false;
        } catch (error) {
            console.error('Restore failed:', error);
            this.notifications.show('Ошибка восстановления из резервной копии', 'error');
            return false;
        }
    }

    parseWorkoutData(content) {
        const workouts = [];
        const lines = content.split('\n');
        let currentWorkout = null;

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            // Обновленный regex для даты и времени
            const dateTimeMatch = line.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})(?:\s+(\d{1,2}:\d{2}))?$/);
            if (dateTimeMatch) {
                if (currentWorkout) {
                    workouts.push(currentWorkout);
                }
                const [_, day, month, year, time] = dateTimeMatch;
                const date = `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                currentWorkout = {
                    id: Date.now() + Math.random(),
                    date,
                    startTime: time || '', // Добавляем время, если оно есть
                    exercises: []
                };
                continue;
            }

            if (!currentWorkout) continue;

            // Парсинг упражнений остается прежним
            const exerciseData = this.parseExerciseLine(line);
            if (exerciseData) {
                currentWorkout.exercises.push(exerciseData);
            }

            // Добавим парсинг заметок
            const noteMatch = line.match(/^(Энергия|Интенсивность): (\d)\/5$/);
            const textNoteMatch = line.match(/^Заметка: (.+)$/);
            
            if (noteMatch) {
                if (!currentWorkout.notes) currentWorkout.notes = {};
                const [_, type, score] = noteMatch;
                if (type === 'Энергия') {
                    currentWorkout.notes.energy = { score: parseInt(score), timestamp: new Date() };
                } else {
                    currentWorkout.notes.intensity = { score: parseInt(score), timestamp: new Date() };
                }
            }
            
            if (textNoteMatch) {
                if (!currentWorkout.notes) currentWorkout.notes = {};
                currentWorkout.notes.text = { content: textNoteMatch[1], timestamp: new Date() };
            }
        }

        if (currentWorkout) {
            workouts.push(currentWorkout);
        }

        return workouts;
    }

    parseExerciseLine(line) {
        if (line.includes('НЕ СОВПАДАЕТ') || line.includes('?')) return null;

        const exerciseMatch = line.match(/^(.+?) – (.+)$/);
        if (!exerciseMatch) return null;

        let [_, exerciseName, setsData] = exerciseMatch;
        
        // Извлекаем вес из названия упражнения
        let initialWeight = null;
        const nameWeightMatch = exerciseName.match(/\((\d+)\)/);
        if (nameWeightMatch) {
            initialWeight = parseInt(nameWeightMatch[1]);
            exerciseName = exerciseName.replace(/\s*\(\d+\)\s*/, '').trim();
        }
        
        // Определяем тип упражнения
        const type = ['Тяга', 'Жим', 'Присяд'].includes(exerciseName) ? 'weighted' : 'bodyweight';
        
        // Парсим подходы и веса
        const sets = [];
        let currentWeight = initialWeight;
        
        // Разбиваем на группы по точке с запятой
        const groups = setsData.split(';').map(g => g.trim());
        
        for (const group of groups) {
            // Проверяем наличие нового веса в группе
            const weightMatch = group.match(/\((\d+)\)/);
            if (weightMatch && type === 'weighted') {
                currentWeight = parseInt(weightMatch[1]);
            }
            
            // Получаем повторения после тире или после веса
            let repsString = group.includes('–') ? 
                group.split('–')[1].trim() : 
                group.replace(/\(\d+\)\s*–?\s*/, '').trim();
            
            // Разбиваем повторения на отдельные подходы
            const reps = repsString.split(',').map(r => parseInt(r.trim()));
            
            // Добавляем каждый подход
            reps.forEach(rep => {
                if (!isNaN(rep)) {
                    sets.push({
                        reps: rep,
                        weight: type === 'weighted' ? currentWeight : null
                    });
                }
            });
        }

        return {
            name: exerciseName,
            type: type,
            sets: sets
        };
    }
} 