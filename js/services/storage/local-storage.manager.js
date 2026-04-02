import { StorageInterface } from './storage.interface.js';
import { DateFormatter } from '../../utils/date-formatter.js';
import { ExerciseCalculatorService } from '../exercise-calculator.service.js';
import { Utils } from '../../utils/utils.js';
import { WorkoutFormatterService } from '../workout-formatter.service.js';
import { BackupManager } from '../backup-manager.js';
import { ExercisePool, getOriginalBuiltinName } from '../../models/exercise-pool.js';

export class LocalStorageManager extends StorageInterface {
    constructor() {
        super();
        this.EXERCISES_KEY = 'exercises';
        this.CURRENT_WORKOUT_KEY = 'currentWorkout';
        this.ACTIVE_WORKOUT_KEY = 'activeWorkout';
        this.BACKUP_KEY = 'workouts_backup';
        this.storageAvailable = this.checkStorageAvailability();
        this.backupManager = new BackupManager(this);
    }

    checkStorageAvailability() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch (e) {
            console.error('Local storage is not available:', e);
            return false;
        }
    }

    saveToStorage(key, data, storage = localStorage) {
        if (!this.storageAvailable) {
            console.error('Storage is not available');
            return false;
        }

        try {
            const sanitizedData = Array.isArray(data) 
                ? data.map(item => ({
                    ...item,
                    name: Utils.sanitizeInput(item.name)
                }))
                : {
                    ...data,
                    name: data.name ? Utils.sanitizeInput(data.name) : data.name
                };

            storage.setItem(key, JSON.stringify(sanitizedData));
            return true;
        } catch (e) {
            console.error(`Storage error for key "${key}":`, e);
            return false;
        }
    }

    getFromStorage(key, storage = localStorage) {
        if (!this.storageAvailable) {
            console.error('Storage is not available');
            return null;
        }

        try {
            const data = storage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error(`Error reading from storage for key "${key}":`, e);
            return null;
        }
    }

    // Существующие методы остаются теми же, но становятся асинхронными
    async getWorkoutHistory() {
        try {
            const data = localStorage.getItem(this.EXERCISES_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error getting workout history:', error);
            return [];
        }
    }

    // Добавляем недостающие методы из интерфейса
    async deleteWorkoutFromHistory(workoutId) {
        return this.deleteWorkout(workoutId);
    }

    async deleteWorkout(workoutId) {
        try {
            const workouts = await this.getWorkoutHistory();
            const filteredWorkouts = workouts.filter(workout => workout.id !== workoutId);
            const success = this.saveToStorage(this.EXERCISES_KEY, filteredWorkouts);
            
            if (success) {
                this.createAutoBackup();
            }
            
            return success;
        } catch (error) {
            console.error('Error deleting workout:', error);
            return false;
        }
    }

    async updateWorkout(workout) {
        try {
            const workouts = await this.getWorkoutHistory();
            const index = workouts.findIndex(w => w.id === workout.id);
            if (index !== -1) {
                workouts[index] = workout;
                const success = this.saveToStorage(this.EXERCISES_KEY, workouts);
                
                if (success) {
                    this.createAutoBackup();
                }
                
                return success;
            }
            return false;
        } catch (error) {
            console.error('Error updating workout:', error);
            return false;
        }
    }

    // Добавляем все методы из старого WorkoutStorage
    // Используем WorkoutFormatterService вместо внутреннего метода
    async saveWorkoutToHistory(workout) {
        const workouts = await this.getWorkoutHistory();
        const formatted = WorkoutFormatterService.formatWorkoutData(workout);
        
        workouts.push(formatted);
        const success = this.saveToStorage(this.EXERCISES_KEY, workouts);
        
        if (success) {
            this.createAutoBackup();
        }
        
        return success;
    }

    async getCurrentWorkout() {
        // Приоритет: sessionStorage -> localStorage -> null
        const current = this.getFromStorage(this.CURRENT_WORKOUT_KEY, sessionStorage);
        if (current) return WorkoutFormatterService.formatWorkoutData(current);

        const active = this.getFromStorage(this.ACTIVE_WORKOUT_KEY);
        if (active) {
            const formatted = WorkoutFormatterService.formatWorkoutData(active);
            this.saveToStorage(this.CURRENT_WORKOUT_KEY, formatted, sessionStorage);
            return formatted;
        }

        return null;
    }

    async saveCurrentWorkout(workout) {
        const formatted = WorkoutFormatterService.formatWorkoutData(workout);
        
        // Сохраняем в оба хранилища
        this.saveToStorage(this.CURRENT_WORKOUT_KEY, formatted, sessionStorage);
        this.setActiveWorkout(formatted);
        
        return formatted;
    }

    async clearCurrentWorkout() {
        this.removeFromStorage(this.CURRENT_WORKOUT_KEY, sessionStorage);
        this.removeFromStorage(this.ACTIVE_WORKOUT_KEY);
    }

    setActiveWorkout(workout) {
        if (!workout) return;
        
        const activeWorkout = {
            date: workout.date,
            timestamp: Date.now()
        };
        
        this.saveToStorage(this.ACTIVE_WORKOUT_KEY, activeWorkout);
    }

    // Добавляем вспомогательные методы из старого WorkoutStorage
    removeFromStorage(key, storage = localStorage) {
        try {
            storage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`Ошибка удаления данных для ключа "${key}":`, e);
            return false;
        }
    }

    createAutoBackup() {
        const workouts = this.getFromStorage(this.EXERCISES_KEY) || [];
        // Просто копируем массив тренировок как есть
        return this.saveToStorage(this.BACKUP_KEY, workouts);
    }

    restoreFromAutoBackup() {
        const backupWorkouts = this.getFromStorage(this.BACKUP_KEY);
        if (!backupWorkouts || !Array.isArray(backupWorkouts)) return false;
        
        // Форматируем данные перед восстановлением
        const formattedWorkouts = backupWorkouts.map(workout => 
            WorkoutFormatterService.formatWorkoutData(workout)
        );
        
        return this.saveToStorage(this.EXERCISES_KEY, formattedWorkouts);
    }

    async getExerciseHistory(exerciseName, limit = 3) {
        try {
            const workouts = await this.getWorkoutHistory();
            const exercises = [];
            
            workouts.forEach(workout => {
                workout.exercises?.forEach(exercise => {
                    if (exercise.name.toLowerCase() === exerciseName.toLowerCase()) {
                        exercises.push({
                            date: workout.date,
                            ...exercise
                        });
                    }
                });
            });
            
            // Сортируем по дате и берем последние limit записей
            return exercises
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, limit);
        } catch (error) {
            console.error('Error getting exercise history:', error);
            return [];
        }
    }

    // ─── Кастомные упражнения ───────────────────────────────────

    async getCustomExercises() {
        if (!localStorage.getItem('exercises_seeded')) {
            const seedExercises = ExercisePool.getSeedExercises();
            const existing = JSON.parse(localStorage.getItem('custom_exercises') || '[]');
            // Merge in case there are already some custom ones
            const toSave = [...existing, ...seedExercises];
            localStorage.setItem('custom_exercises', JSON.stringify(toSave));
            localStorage.setItem('exercises_seeded', 'true');
        }
        return JSON.parse(localStorage.getItem('custom_exercises') || '[]');
    }

    async saveCustomExercise(exercise) {
        const exercises = await this.getCustomExercises();
        const existing = exercises.findIndex(e => e.id === exercise.id);
        if (existing !== -1) {
            exercises[existing] = exercise;
        } else {
            exercises.push(exercise);
        }
        localStorage.setItem('custom_exercises', JSON.stringify(exercises));
        return true;
    }

    async deleteCustomExercise(exerciseId) {
        const exercises = await this.getCustomExercises();
        const filtered = exercises.filter(e => e.id !== exerciseId);
        localStorage.setItem('custom_exercises', JSON.stringify(filtered));
        return true;
    }

    // ─── Веса по умолчанию ──────────────────────────────────────

    async getDefaultWeights() {
        return JSON.parse(localStorage.getItem('default_weights') || '{}');
    }

    async updateDefaultWeight(exerciseName, weight) {
        const weights = await this.getDefaultWeights();
        weights[exerciseName] = weight;
        localStorage.setItem('default_weights', JSON.stringify(weights));
        return true;
    }

    async _saveDefaultWeightsObject(weights) {
        localStorage.setItem('default_weights', JSON.stringify(weights));
        return true;
    }

    /**
     * @param {{ exerciseId: string, oldDisplayName: string, newName: string, oldCatalogName?: string }} params
     */
    async propagateExerciseRename(params) {
        const { exerciseId, oldDisplayName, newName, oldCatalogName } = params;
        if (!exerciseId || !newName || oldDisplayName === newName) return true;

        const oldCat = oldCatalogName ?? oldDisplayName;
        const weights = await this.getDefaultWeights();
        const next = { ...weights };

        const mergeMove = (from, to) => {
            if (!from || from === to) return;
            if (next[from] !== undefined) {
                if (next[to] === undefined) next[to] = next[from];
                delete next[from];
            }
        };

        mergeMove(oldDisplayName, newName);
        if (oldCat !== oldDisplayName) mergeMove(oldCat, newName);
        mergeMove(`__double_${oldDisplayName}`, `__double_${newName}`);
        if (oldCat !== oldDisplayName) mergeMove(`__double_${oldCat}`, `__double_${newName}`);
        delete next[`__name_${exerciseId}`];

        await this._saveDefaultWeightsObject(next);

        const originalBuiltin = getOriginalBuiltinName(exerciseId);
        const mapEx = (ex) => {
            const idMatch = ex.exerciseId != null && String(ex.exerciseId) === String(exerciseId);
            const legacyName =
                !ex.exerciseId &&
                (ex.name === oldDisplayName ||
                    (oldCatalogName && ex.name === oldCatalogName) ||
                    (originalBuiltin && ex.name === originalBuiltin));
            if (idMatch || legacyName) {
                return { ...ex, name: newName, exerciseId: ex.exerciseId || exerciseId };
            }
            return ex;
        };

        const workouts = await this.getWorkoutHistory();
        let historyChanged = false;
        const migratedHistory = workouts.map((w) => {
            const newExercises = (w.exercises || []).map(mapEx);
            if (JSON.stringify(newExercises) !== JSON.stringify(w.exercises || [])) {
                historyChanged = true;
                return { ...w, exercises: newExercises };
            }
            return w;
        });
        if (historyChanged) {
            this.saveToStorage(this.EXERCISES_KEY, migratedHistory);
            this.createAutoBackup();
        }

        const current = await this.getCurrentWorkout();
        if (current?.exercises?.length) {
            const newExercises = current.exercises.map(mapEx);
            if (JSON.stringify(newExercises) !== JSON.stringify(current.exercises)) {
                await this.saveCurrentWorkout({ ...current, exercises: newExercises });
            }
        }

        const presets = await this.getPresets();
        let presetsChanged = false;
        const newPresets = presets.map((p) => ({
            ...p,
            exercises: (p.exercises || []).map((e) => {
                const idMatch = e.exerciseId != null && String(e.exerciseId) === String(exerciseId);
                const legacy =
                    !e.exerciseId &&
                    (e.name === oldDisplayName ||
                        (oldCatalogName && e.name === oldCatalogName) ||
                        (originalBuiltin && e.name === originalBuiltin));
                if (idMatch || legacy) {
                    presetsChanged = true;
                    return { ...e, name: newName, exerciseId: e.exerciseId || exerciseId };
                }
                return e;
            })
        }));
        if (presetsChanged) {
            localStorage.setItem('presets', JSON.stringify(newPresets));
        }

        return true;
    }

    // ─── Пресеты (Фаза 4) ──────────────────────────────────────

    async getPresets() {
        return JSON.parse(localStorage.getItem('presets') || '[]');
    }

    async savePreset(preset) {
        const presets = await this.getPresets();
        const existing = presets.findIndex(p => p.id === preset.id);
        if (existing !== -1) {
            presets[existing] = preset;
        } else {
            presets.push(preset);
        }
        localStorage.setItem('presets', JSON.stringify(presets));
        return true;
    }

    async deletePreset(presetId) {
        const presets = await this.getPresets();
        const filtered = presets.filter(p => p.id !== presetId);
        localStorage.setItem('presets', JSON.stringify(filtered));
        return true;
    }

    /**
     * @param {{ customExercises?: Array, defaultWeights?: Object, presets?: Array }} data
     */
    async restoreUserCatalog(data) {
        try {
            if (data.customExercises != null) {
                localStorage.setItem('custom_exercises', JSON.stringify(data.customExercises));
            }
            if (data.defaultWeights != null) {
                localStorage.setItem('default_weights', JSON.stringify(data.defaultWeights));
            }
            if (data.presets != null) {
                localStorage.setItem('presets', JSON.stringify(data.presets));
            }
            return true;
        } catch (e) {
            console.error('restoreUserCatalog', e);
            return false;
        }
    }
}
