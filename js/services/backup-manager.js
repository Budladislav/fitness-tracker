import { StorageFactory } from './storage/storage.factory.js';
import { NotificationManager } from '../managers/notification-manager.js';
import { WorkoutFormatterService } from './workout-formatter.service.js';

export class BackupManager {
    constructor(storage, notifications) {
        this.storage = storage || StorageFactory.createStorage();
        this.notifications = notifications || NotificationManager.getInstance();
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
            const workouts = await this.storage.getWorkoutHistory();
            const backupText = this.workoutsToText(workouts);
            
            // Форматируем текущую дату и время для имени файла
            const now = new Date();
            const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
            const timeStr = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;
            
            // Проверяем поддержку File System Access API
            if ('showSaveFilePicker' in window) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: `workout_backup_${dateStr}_${timeStr}.txt`,
                    types: [{
                        description: 'Text Files',
                        accept: {'text/plain': ['.txt']},
                    }],
                });

                const writable = await handle.createWritable();
                await writable.write(backupText);
                await writable.close();
            } else {
                const blob = new Blob([backupText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `workout_backup_${dateStr}_${timeStr}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            
            this.notifications.success('Резервная копия создана');
            return true;
        } catch (error) {
            console.error('Backup failed:', error);
            this.notifications.error('Ошибка создания резервной копии');
            return false;
        }
    }

    async restoreFromBackup() {
        try {
            const content = await this.readBackupFile();
            if (!content) return false;
            
            const workouts = this.parseWorkoutData(content);
            
            if (workouts.length > 0) {
                // Форматируем все тренировки
                const formattedWorkouts = workouts.map(workout => 
                    WorkoutFormatterService.formatWorkoutData(workout)
                );
                
                // Сохраняем весь массив тренировок разом
                const success = this.storage.saveToStorage(
                    this.storage.EXERCISES_KEY, 
                    formattedWorkouts
                );
                
                if (success) {
                    this.notifications.success(`Восстановлено ${workouts.length} тренировок`);
                    return true;
                }
            }
            
            this.notifications.error('Файл бэкапа не содержит тренировок');
            return false;
        } catch (error) {
            console.error('Restore failed:', error);
            this.notifications.error('Ошибка восстановления из резервной копии');
            return false;
        }
    }

    parseWorkoutData(content) {
        const workouts = [];
        const lines = content.split('\n');
        let currentWorkout = null;
        let collectingNote = false; // Флаг для сбора многострочной заметки
        let currentNote = ''; // Буфер для многострочной заметки

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) {
                if (collectingNote) {
                    // Пустая строка означает конец заметки
                    if (currentWorkout && currentWorkout.notes) {
                        currentWorkout.notes.text.content = currentNote.trim();
                    }
                    collectingNote = false;
                    currentNote = '';
                }
                continue;
            }

            // Проверяем начало новой тренировки
            const dateTimeMatch = line.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:\s+(\d{1,2}:\d{2}))?$/);
            if (dateTimeMatch) {
                if (collectingNote && currentWorkout && currentWorkout.notes) {
                    // Сохраняем предыдущую заметку перед новой тренировкой
                    currentWorkout.notes.text.content = currentNote.trim();
                    collectingNote = false;
                    currentNote = '';
                }

                if (currentWorkout) {
                    workouts.push(currentWorkout);
                }

                const [_, day, month, year] = dateTimeMatch;
                const fullYear = year.length === 2 ? `20${year}` : year;
                const date = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                
                currentWorkout = {
                    id: Date.now() + Math.random(),
                    date,
                    startTime: dateTimeMatch[4] || '',
                    exercises: []
                };
                continue;
            }

            if (!currentWorkout) continue;

            // Если мы собираем многострочную заметку
            if (collectingNote) {
                // Проверяем, не начинается ли следующая тренировка или новое упражнение
                const isNewWorkout = line.match(/^\d{1,2}\.\d{1,2}\.\d{2,4}/);
                const isExercise = line.includes(' – ');
                const isNewNote = line.startsWith('Заметка: ');
                const isRating = line.match(/^(Энергия|Интенсивность): \d\/5$/);

                if (isNewWorkout || isExercise || isNewNote || isRating) {
                    // Сохраняем собранную заметку
                    if (currentWorkout.notes) {
                        currentWorkout.notes.text.content = currentNote.trim();
                    }
                    collectingNote = false;
                    currentNote = '';
                    i--; // Возвращаемся на строку назад для обработки нового элемента
                    continue;
                }

                currentNote += line + '\n';
                continue;
            }

            // Парсинг упражнений
            const exerciseData = this.parseExerciseLine(line);
            if (exerciseData) {
                currentWorkout.exercises.push(exerciseData);
                continue;
            }

            // Парсинг оценок
            const noteMatch = line.match(/^(Энергия|Интенсивность): (\d)\/5$/);
            if (noteMatch) {
                if (!currentWorkout.notes) currentWorkout.notes = {};
                const [_, type, score] = noteMatch;
                if (type === 'Энергия') {
                    currentWorkout.notes.energy = { score: parseInt(score), timestamp: new Date() };
                } else {
                    currentWorkout.notes.intensity = { score: parseInt(score), timestamp: new Date() };
                }
                continue;
            }

            // Начало текстовой заметки
            const textNoteMatch = line.match(/^Заметка: (.+)$/);
            if (textNoteMatch) {
                if (!currentWorkout.notes) currentWorkout.notes = {};
                currentNote = textNoteMatch[1] + '\n';
                currentWorkout.notes.text = { content: '', timestamp: new Date() };
                collectingNote = true;
            }
        }

        // Обработка последней заметки и тренировки
        if (collectingNote && currentWorkout && currentWorkout.notes) {
            currentWorkout.notes.text.content = currentNote.trim();
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

    async readBackupFile() {
        try {
            // Проверяем поддержку File System Access API
            if ('showOpenFilePicker' in window) {
                const [handle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Text Files',
                        accept: {'text/plain': ['.txt']},
                    }],
                });
                const file = await handle.getFile();
                return await file.text();
            } else {
                // Fallback для браузеров без поддержки File System Access API
                return new Promise((resolve, reject) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.txt';
                    
                    input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            try {
                                const text = await file.text();
                                resolve(text);
                            } catch (error) {
                                reject(error);
                            }
                        }
                    };
                    
                    input.click();
                });
            }
        } catch (error) {
            console.error('Error reading backup file:', error);
            throw error;
        }
    }
} 