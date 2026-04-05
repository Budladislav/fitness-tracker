import { StorageFactory } from './storage/storage.factory.js';
import { NotificationManager } from '../managers/notification-manager.js';
import { WorkoutFormatterService } from './workout-formatter.service.js';

const CATALOG_BEGIN = '#BEGIN_CATALOG\n';
const CATALOG_END = '\n#END_CATALOG';

export class BackupManager {
    constructor(storage, ui) {
        this.storage = storage || StorageFactory.createStorage();
        this.ui = ui;
    }

    /**
     * Отделяет JSON-каталог (упражнения, веса, пресеты) от текста тренировок.
     * Старые файлы без блока — catalog: null, rest: исходный текст.
     */
    extractCatalogFromBackup(content) {
        const trimmed = String(content).replace(/^\uFEFF/, '');
        const start = trimmed.indexOf(CATALOG_BEGIN);
        if (start === -1) {
            return { catalog: null, rest: content };
        }
        const jsonStart = start + CATALOG_BEGIN.length;
        const endRel = trimmed.indexOf(CATALOG_END, jsonStart);
        if (endRel === -1) {
            return { catalog: null, rest: content };
        }
        const jsonStr = trimmed.slice(jsonStart, endRel).trim();
        try {
            const catalog = JSON.parse(jsonStr);
            const rest = trimmed.slice(endRel + CATALOG_END.length).replace(/^\s*\n?/, '');
            return { catalog, rest };
        } catch (e) {
            console.warn('BackupManager: не удалось разобрать каталог', e);
            return { catalog: null, rest: content };
        }
    }

    /**
     * Конвертирует тренировки в текстовый формат
     */
    workoutsToText(workouts) {
        // Сортируем по дате убывания (новые первыми) перед записью
        const sorted = [...workouts].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateB - dateA;
            return (b.startTime || '00:00').localeCompare(a.startTime || '00:00');
        });

        const builtinMachineIds = new Set(['bench-press', 'squat', 'deadlift']);

        return sorted.map(workout => {
            const date = new Date(workout.date);
            const dateStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear().toString().slice(2)}`;

            // Добавляем время, если оно есть
            const timeStr = workout.startTime ? ` ${workout.startTime}` : '';

            const typeLine =
                workout.workoutType === 'preset' && workout.presetName
                    ? `Тип: ${workout.presetName}${workout.presetId ? ` [preset:${workout.presetId}]` : ''}`
                    : workout.workoutType === 'universal'
                        ? 'Тип: Универсальная'
                        : '';

            const exercisesStr = workout.exercises.map(exercise => {
                const metaParts = [];
                if (exercise.exerciseId) metaParts.push(`[id:${exercise.exerciseId}]`);
                let eq = exercise.equipment;
                if (exercise.exerciseId && builtinMachineIds.has(exercise.exerciseId)) {
                    eq = 'machine';
                }
                if (eq) metaParts.push(`[eq:${eq}]`);
                if (exercise.doubleTonnage) metaParts.push('[x2:1]');
                const nameWithMeta = [exercise.name, ...metaParts].join(' ').trim();

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

                    return `${nameWithMeta} ${setsStr}`;
                } else {
                    // Для упражнений без веса
                    const reps = exercise.sets.map(set => set.reps).join(', ');
                    return `${nameWithMeta} – ${reps}`;
                }
            }).join('\n');

            const headerBlock = [ `${dateStr}${timeStr}`, typeLine ].filter(Boolean).join('\n');
            let result = `${headerBlock}\n${exercisesStr}\n`;

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
            const [workouts, customExercises, defaultWeights, presets] = await Promise.all([
                this.storage.getWorkoutHistory(),
                this.storage.getCustomExercises(),
                this.storage.getDefaultWeights(),
                this.storage.getPresets()
            ]);

            const catalog = {
                version: 3,
                customExercises: Array.isArray(customExercises) ? customExercises : [],
                defaultWeights: defaultWeights && typeof defaultWeights === 'object' ? defaultWeights : {},
                presets: Array.isArray(presets) ? presets : []
            };
            const catalogBlock = `# TrainingLog v3\n${CATALOG_BEGIN}${JSON.stringify(catalog)}${CATALOG_END}\n\n`;
            const backupText = catalogBlock + this.workoutsToText(workouts);

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
                        accept: { 'text/plain': ['.txt'] },
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

            return true;
        } catch (error) {
            console.error('Backup failed:', error);
            return false;
        }
    }

    async restoreFromBackup() {
        try {
            const content = await this.readBackupFile();
            if (!content) return false;

            const { catalog, rest } = this.extractCatalogFromBackup(content);
            const workouts = this.parseWorkoutData(rest);

            let catalogOk = true;
            if (catalog && typeof this.storage.restoreUserCatalog === 'function') {
                catalogOk = await this.storage.restoreUserCatalog({
                    customExercises: catalog.customExercises,
                    defaultWeights: catalog.defaultWeights,
                    presets: catalog.presets
                });
            }

            let workoutsOk = true;
            if (workouts.length > 0) {
                const formattedWorkouts = workouts.map(workout =>
                    WorkoutFormatterService.formatWorkoutData(workout)
                );

                workoutsOk = await this.storage.saveToStorage(
                    this.storage.EXERCISES_KEY,
                    formattedWorkouts
                );
            }

            if (!catalogOk || !workoutsOk) {
                return false;
            }

            if (!catalog && workouts.length === 0) {
                return false;
            }

            await this.storage.createAutoBackup();
            const updatedWorkouts = await this.storage.getWorkoutHistory();
            this.ui.displayWorkoutHistory(updatedWorkouts);
            return true;
        } catch (error) {
            console.error('Restore failed:', error);
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

                // Вычисляем timestamp из даты и времени для сохранения порядка при восстановлении
                const startTime = dateTimeMatch[4] || '';
                const [hours, minutes] = startTime ? startTime.split(':').map(Number) : [12, 0];
                const parsedDate = new Date(`${date}T${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00`);

                currentWorkout = {
                    id: Date.now() + Math.random(),
                    date,
                    startTime,
                    timestamp: parsedDate.getTime(),
                    exercises: []
                };
                continue;
            }

            if (!currentWorkout) continue;

            const typeLineMatch = line.match(/^Тип:\s*(.+)$/);
            if (typeLineMatch) {
                const typeStr = typeLineMatch[1].trim();
                if (typeStr === 'Универсальная') {
                    currentWorkout.workoutType = 'universal';
                    currentWorkout.presetId = null;
                    currentWorkout.presetName = null;
                } else {
                    const presetBracket = typeStr.match(/^(.+?)\s*\[preset:([^\]]+)\]\s*$/);
                    if (presetBracket) {
                        currentWorkout.workoutType = 'preset';
                        currentWorkout.presetName = presetBracket[1].trim();
                        currentWorkout.presetId = presetBracket[2].trim();
                    } else {
                        currentWorkout.workoutType = 'preset';
                        currentWorkout.presetName = typeStr;
                        currentWorkout.presetId = null;
                    }
                }
                continue;
            }

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

        // Сортируем по дате убывания (новые первыми) для корректного восстановления
        return workouts.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateB - dateA;
            return (b.startTime || '00:00').localeCompare(a.startTime || '00:00');
        });
    }

    parseExerciseLine(line) {
        if (line.includes('НЕ СОВПАДАЕТ') || line.includes('?')) return null;

        const exerciseMatch = line.match(/^(.+?) – (.+)$/);
        if (!exerciseMatch) return null;

        let rawName = exerciseMatch[1];
        const setsData = exerciseMatch[2];

        const idMatch = rawName.match(/\[id:(.*?)\]/);
        const eqMatch = rawName.match(/\[eq:(.*?)\]/);
        const x2Match = rawName.match(/\[x2:([01])\]/);
        let exerciseId = idMatch ? idMatch[1].trim() : null;
        let equipment = eqMatch ? eqMatch[1].trim() : null;
        const doubleTonnage = x2Match ? x2Match[1] === '1' : false;

        rawName = rawName
            .replace(/\[id:.*?\]/g, '')
            .replace(/\[eq:.*?\]/g, '')
            .replace(/\[x2:[01]\]/g, '')
            .trim();

        // Текстовые метки v2.5+ (не числовые скобки) → тип оборудования
        if (!equipment) {
            if (/\(тренажер\)/i.test(rawName)) equipment = 'machine';
            else if (/\(кресло\)/i.test(rawName)) equipment = 'machine';
            else if (/\(свободн/i.test(rawName)) equipment = 'free_weight';
        }

        // Убираем человекочитаемые пометки, оставляя числовые веса в скобках
        let workName = rawName
            .replace(/\s*\(тренажер\)\s*/gi, ' ')
            .replace(/\s*\(кресло\)\s*/gi, ' ')
            .replace(/\s*\(Молотки\)\s*/g, ' ')
            .replace(/\s*\(свободн[^)]*\)\s*/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const hasWeightInSets = /\([\d.]+\)/.test(setsData);
        const hasWeightInName = /\([\d.]+\)/.test(workName);
        const nameSansWeights = workName.replace(/\s*\([\d.]+\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
        const legacyWeighted = /^(Тяга|Жим|Присяд)$/.test(nameSansWeights);

        const isWeighted = hasWeightInSets || hasWeightInName || legacyWeighted;

        let initialWeight = null;
        const nameWeightMatches = [...workName.matchAll(/\(([\d.]+)\)/g)];
        if (nameWeightMatches.length > 0) {
            initialWeight = parseFloat(nameWeightMatches[nameWeightMatches.length - 1][1]);
        }

        const exerciseName = workName.replace(/\s*\([\d.]+\)\s*/g, ' ').replace(/\s+/g, ' ').trim();

        const type = isWeighted ? 'weighted' : 'bodyweight';
        if (type === 'weighted' && !equipment) {
            equipment = 'free_weight';
        }
        if (type === 'bodyweight') {
            equipment = 'bodyweight';
        }

        const sets = [];
        let currentWeight = type === 'weighted' ? initialWeight : null;

        const groups = setsData.split(';').map(g => g.trim());

        for (const group of groups) {
            const weightMatch = group.match(/\(([\d.]+)\)/);
            if (weightMatch && type === 'weighted') {
                currentWeight = parseFloat(weightMatch[1]);
            }

            let repsString = group.includes('–')
                ? group.split('–')[1].trim()
                : group.replace(/\([\d.]+\)\s*–?\s*/, '').trim();

            const reps = repsString.split(',').map(r => parseInt(r.trim(), 10));

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
            type,
            exerciseId,
            equipment,
            sets,
            ...(doubleTonnage ? { doubleTonnage: true } : {})
        };
    }

    async readBackupFile() {
        try {
            // Проверяем поддержку File System Access API
            if ('showOpenFilePicker' in window) {
                const [handle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Text Files',
                        accept: { 'text/plain': ['.txt'] },
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

    async restoreFromAutoBackup() {
        try {
            const backup = localStorage.getItem('workouts_backup');
            if (!backup) return false;

            let parsed;
            try {
                parsed = JSON.parse(backup);
            } catch {
                return false;
            }

            let workouts;
            if (Array.isArray(parsed)) {
                workouts = parsed;
            } else if (parsed && Array.isArray(parsed.workouts)) {
                workouts = parsed.workouts;
            } else if (parsed && typeof parsed.text === 'string') {
                workouts = this.parseWorkoutData(parsed.text);
            } else {
                return false;
            }

            const ok = await this.storage.restoreWorkouts(workouts);
            if (ok && this.ui && typeof this.ui.displayWorkoutHistory === 'function') {
                const list = await this.storage.getWorkoutHistory();
                this.ui.displayWorkoutHistory(list);
            }
            return ok;
        } catch (error) {
            console.error('Error restoring from auto backup:', error);
            return false;
        }
    }
} 