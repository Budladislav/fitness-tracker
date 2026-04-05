import { StorageInterface } from './storage.interface.js';
import { firebaseService } from '../firebase.service.js';
import { collection, doc, getDocs, addDoc, deleteDoc, updateDoc, getDoc, setDoc, writeBatch, query, orderBy, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { WorkoutFormatterService } from '../workout-formatter.service.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { ExercisePool, getOriginalBuiltinName } from '../../models/exercise-pool.js';

// Функция для генерации ID
const generateId = () => Math.random().toString(36).substr(2, 9);

export class FirebaseStorageManager extends StorageInterface {
    constructor() {
        super();
        if (!firebaseService.app) {
            throw new Error('Firebase must be initialized before creating FirebaseStorageManager');
        }
        this.db = firebaseService.getDb();
        this.auth = getAuth(firebaseService.app);
        
        // Добавляем константы для ключей
        this.EXERCISES_KEY = 'exercises';
        this.CURRENT_WORKOUT_KEY = 'current_workout';
        this.ACTIVE_WORKOUT_KEY = 'active_workout';
        this.BACKUP_KEY = 'backup';
        
        this.collections = {
            workouts: 'workouts',
            currentWorkout: 'current_workouts',
            backup: 'backups',
            settings: 'settings'
        };

        /** @type {Array|null} */
        this._workoutHistoryCache = null;
        /** @type {string|null} */
        this._workoutHistoryCacheUserId = null;
        /** Пустой кэш после онлайн-запроса с 0 тренировок — можно не дергать Firestore повторно */
        this._emptyHistoryCacheConfirmed = false;

        // Инициализируем userId из текущего пользователя
        const currentUser = this.auth.currentUser;
        this.userId = currentUser ? currentUser.uid : localStorage.getItem('guestId');
        
        if (!this.userId) {
            this.userId = `guest_${generateId()}`;
            localStorage.setItem('guestId', this.userId);
        }
        
        // Добавляем слушатель изменения авторизации
        this.auth.onAuthStateChanged(async (user) => {
            
            let newUserId;
            const testUser = sessionStorage.getItem('testUser');
            
            if (testUser) {
                const parsed = JSON.parse(testUser);
                newUserId = parsed.uid;
            } else if (user) {
                newUserId = user.uid;
            } else {
                newUserId = localStorage.getItem('guestId');
                if (!newUserId) {
                    newUserId = `guest_${generateId()}`;
                    localStorage.setItem('guestId', newUserId);
                }
            }
            
            if (this.userId !== newUserId) {
                this.userId = newUserId;
                sessionStorage.removeItem(this.CURRENT_WORKOUT_KEY);
                this._invalidateWorkoutHistoryCache();
            }
        });
    }

    _invalidateWorkoutHistoryCache() {
        this._workoutHistoryCache = null;
        this._workoutHistoryCacheUserId = null;
        this._emptyHistoryCacheConfirmed = false;
    }

    /** Сбросить кэш истории (после смены аккаунта, сети, чтобы не показывать устаревший пустой список) */
    invalidateWorkoutHistoryCache() {
        this._invalidateWorkoutHistoryCache();
    }

    async _fetchCatalogSnapshot() {
        const [customExercises, defaultWeights, presets] = await Promise.all([
            this.getCustomExercises(),
            this.getDefaultWeights(),
            this.getPresets()
        ]);
        return {
            customExercises: Array.isArray(customExercises) ? customExercises : [],
            defaultWeights: defaultWeights && typeof defaultWeights === 'object' ? defaultWeights : {},
            presets: Array.isArray(presets) ? presets : []
        };
    }

    /** Копия истории + каталога в localStorage (ключ workouts_backup) */
    async _writeLocalMirror(workouts, catalog) {
        try {
            const w = Array.isArray(workouts) ? workouts : [];
            const cat = catalog || await this._fetchCatalogSnapshot();
            const payload = JSON.stringify({
                v: 3,
                savedAt: new Date().toISOString(),
                source: 'firebase',
                workouts: w,
                catalog: cat
            });
            localStorage.setItem('workouts_backup', payload);
        } catch (e) {
            console.warn('[Firebase] local auto-backup mirror failed', e);
        }
    }

    _computeSortTimestamp(formatted) {
        const [Y, M, D] = (formatted.date || '').split('-').map(Number);
        if (!Y || !M || !D) return Date.now();
        const st = formatted.startTime || '12:00';
        const tm = /^(\d{1,2}):(\d{2})/.exec(st);
        const h = tm ? parseInt(tm[1], 10) : 12;
        const m = tm ? parseInt(tm[2], 10) : 0;
        const d = new Date(Y, M - 1, D, h, m, 0, 0);
        return isNaN(d.getTime()) ? Date.now() : d.getTime();
    }

    // Добавляем метод для принудительного обновления userId
    updateUserId() {
        const testUser = sessionStorage.getItem('testUser');
        if (testUser) {
            const parsed = JSON.parse(testUser);
            this.userId = parsed.uid;
        } else if (this.auth.currentUser) {
            this.userId = this.auth.currentUser.uid;
        } else {
            this.userId = localStorage.getItem('guestId');
            if (!this.userId) {
                this.userId = `guest_${generateId()}`;
                localStorage.setItem('guestId', this.userId);
            }
        }
        return this.userId;
    }

    // Изменяем методы получения ссылок
    getCollection(name) {
        return collection(this.db, this.collections[name]);
    }

    getDocument(collectionName, docId) {
        return doc(this.db, this.collections[collectionName], docId);
    }

    // Реализация методов интерфейса
    /**
     * @param {{ skipCache?: boolean }} [options] — skipCache: принудительно с сервера (после миграции и т.п.)
     */
    async getWorkoutHistory(options = {}) {
        this.updateUserId();
        const skipCache = options.skipCache === true;
        if (
            !skipCache &&
            this._workoutHistoryCache &&
            this._workoutHistoryCacheUserId === this.userId
        ) {
            if (this._workoutHistoryCache.length > 0) {
                return this._workoutHistoryCache;
            }
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                return this._workoutHistoryCache;
            }
            if (this._emptyHistoryCacheConfirmed) {
                return this._workoutHistoryCache;
            }
        }
        try {
            const workoutsRef = this.getCollection('workouts');

            const q = query(
                workoutsRef,
                where('userId', '==', this.userId),
                orderBy('timestamp', 'desc')
            );

            const snapshot = await getDocs(q);
            const workouts = [];

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                workouts.push({
                    id: docSnap.id,
                    date: data.date || '',
                    startTime: data.time || '',
                    exercises: data.exercises || [],
                    notes: data.notes || {},
                    timestamp: data.timestamp || Date.now(),
                    workoutType: data.workoutType || 'universal',
                    presetId: data.presetId ?? null,
                    presetName: data.presetName ?? null
                });
            });

            this._workoutHistoryCache = workouts;
            this._workoutHistoryCacheUserId = this.userId;
            this._emptyHistoryCacheConfirmed = workouts.length === 0;
            await this._writeLocalMirror(workouts);
            return workouts;
        } catch (error) {
            console.error('Error getting workout history:', error);
            return [];
        }
    }

    async saveWorkoutToHistory(workout) {
        try {
            const workoutsRef = this.getCollection('workouts');
            const formatted = WorkoutFormatterService.formatWorkoutData(workout);
            
            const workoutToSave = {
                ...formatted,
                userId: this.userId,  // Добавляем userId
                date: formatted.date,
                time: formatted.startTime,
                timestamp: Date.now(),
                exercises: formatted.exercises || [],
                notes: formatted.notes || {}
            };
            
            const docRef = await addDoc(workoutsRef, workoutToSave);
            formatted.id = docRef.id;

            this._invalidateWorkoutHistoryCache();
            await this.createAutoBackup();
            return true;
        } catch (error) {
            console.error('Error saving workout:', error);
            return false;
        }
    }

    async deleteWorkout(workoutId) {
        try {
            const docRef = this.getDocument('workouts', workoutId);
            await deleteDoc(docRef);
            this._invalidateWorkoutHistoryCache();
            await this.createAutoBackup();
            return true;
        } catch (error) {
            console.error('Error deleting workout:', error);
            return false;
        }
    }

    async updateWorkout(workout) {
        try {
            if (!workout.id) {
                console.error('Cannot update workout without id');
                return false;
            }

            const formatted = WorkoutFormatterService.formatWorkoutData(workout);
            const docRef = this.getDocument('workouts', workout.id);
            const ts = this._computeSortTimestamp(formatted);

            await updateDoc(docRef, {
                date: formatted.date,
                time: formatted.startTime || '',
                exercises: formatted.exercises || [],
                notes: formatted.notes || {},
                timestamp: ts,
                workoutType: formatted.workoutType || workout.workoutType || 'universal',
                presetId: workout.presetId ?? null,
                presetName: workout.presetName ?? null,
                userId: this.userId
            });

            this._invalidateWorkoutHistoryCache();
            await this.createAutoBackup();
            return true;
        } catch (error) {
            console.error('Error updating workout:', error);
            return false;
        }
    }

    async restoreWorkouts(workouts) {
        if (!Array.isArray(workouts)) return false;
        const formatted = workouts.map(w => WorkoutFormatterService.formatWorkoutData(w));
        const ok = await this.saveToStorage(this.EXERCISES_KEY, formatted, { allowEmptyReplace: true });
        if (ok) {
            await this.createAutoBackup();
        }
        return ok;
    }

    async getCurrentWorkout() {
        try {            
            // Сначала проверяем sessionStorage (быстрый кэш для текущей вкладки)
            const sessionData = sessionStorage.getItem(this.CURRENT_WORKOUT_KEY);
            if (sessionData) {
                const parsed = JSON.parse(sessionData);
                return parsed;
            }
            
            // Обновляем userId перед запросом (может измениться после auth)
            this.updateUserId();
            
            // Затем проверяем Firestore
            const docRef = this.getDocument('currentWorkout', 'active');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Принимаем тренировку если userId совпадает ИЛИ если userId ещё не разрешился
                // (auth может быть ещё не инициализирован при перезагрузке вкладки)
                const userMatches = data.userId === this.userId;
                const hasExercises = data.exercises && data.exercises.length > 0;
                
                if (userMatches && hasExercises) {
                    sessionStorage.setItem(this.CURRENT_WORKOUT_KEY, JSON.stringify(data));
                    return data;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error getting current workout:', error);
            return null;
        }
    }

    async saveCurrentWorkout(workout) {
        try {
            const docRef = this.getDocument('currentWorkout', 'active');
            const formatted = WorkoutFormatterService.formatWorkoutData(workout);
            
            const currentState = await this.getCurrentWorkout() || {};
            
            const workoutToSave = {
                ...formatted,
                userId: this.userId,
                exerciseType: workout.exerciseType || currentState.exerciseType || 'bodyweight',
                lastSelectedExercises: workout.lastSelectedExercises || currentState.lastSelectedExercises || {
                    weighted: '',
                    bodyweight: ''
                },
                date: formatted.date instanceof Date ? formatted.date.toISOString().split('T')[0] : formatted.date,
                exercises: formatted.exercises || [],
                startTime: formatted.startTime || null,
                timestamp: Date.now()
            };
            
            // Сохраняем в sessionStorage для быстрого доступа в текущей вкладке
            sessionStorage.setItem(this.CURRENT_WORKOUT_KEY, JSON.stringify(workoutToSave));
            // Сохраняем в Firestore как персистентное хранилище (для восстановления после закрытия вкладки)
            await setDoc(docRef, workoutToSave);
            // УБРАН вызов setActiveWorkout() — он делал второй setDoc без упражнений, перезаписывая данные
            
            return workoutToSave;
        } catch (error) {
            console.error('Error saving current workout:', error);
            return null;
        }
    }

    async clearCurrentWorkout() {
        try {
            // Очищаем sessionStorage сразу
            sessionStorage.removeItem(this.CURRENT_WORKOUT_KEY);
            
            // Обновляем Firestore одним setDoc (не delete+create, чтобы избежать потери данных)
            const docRef = this.getDocument('currentWorkout', 'active');
            await setDoc(docRef, {
                userId: this.userId,
                date: null,
                exercises: [],
                startTime: null,
                timestamp: Date.now()
            });
            
            return true;
        } catch (error) {
            console.error('Error clearing current workout:', error);
            return false;
        }
    }

    async getExerciseHistory(exerciseName, limit = 3) {
        try {
            const workoutsRef = this.getCollection('workouts');
            const q = query(
                workoutsRef,
                where('userId', '==', this.userId),
                orderBy('timestamp', 'desc')
            );
            
            const snapshot = await getDocs(q);
            const exercises = [];
            
            snapshot.forEach(doc => {
                const workout = doc.data();
                workout.exercises?.forEach(exercise => {
                    if (exercise.name.toLowerCase() === exerciseName.toLowerCase()) {
                        exercises.push({
                            date: workout.date,
                            ...exercise
                        });
                    }
                });
            });
            
            return exercises.slice(0, limit);
        } catch (error) {
            console.error('Error getting exercise history:', error);
            return [];
        }
    }

    async createAutoBackup() {
        try {
            const workouts = await this.getWorkoutHistory();
            if (!workouts || !Array.isArray(workouts)) {
                console.error('Invalid workouts data for backup');
                return false;
            }

            const catalog = await this._fetchCatalogSnapshot();
            await this._writeLocalMirror(workouts, catalog);

            const backupData = {
                workouts,
                catalog,
                userId: this.userId,
                timestamp: new Date().toISOString()
            };

            const backupRef = this.getDocument('backup', 'latest');
            await setDoc(backupRef, backupData);
            return true;
        } catch (error) {
            console.error('Error creating backup:', error);
            return false;
        }
    }

    async getFromStorage(key) {
        try {
            const docRef = this.getDocument('settings', key);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return docSnap.data().value;
            }
            return null;
        } catch (error) {
            console.error(`Error reading from storage for key "${key}":`, error);
            return null;
        }
    }

    /**
     * @param {{ allowEmptyReplace?: boolean }} [options] — allowEmptyReplace: true = явно очистить историю (редко)
     */
    async saveToStorage(key, value, options = {}) {
        try {
            if (key === this.EXERCISES_KEY) {
                this.updateUserId();
                const workouts = Array.isArray(value) ? value : [];
                const workoutsRef = this.getCollection('workouts');
                const userQuery = query(workoutsRef, where('userId', '==', this.userId));
                const oldSnap = await getDocs(userQuery);
                const oldRefs = oldSnap.docs.map(d => d.ref);

                // Не затираем всю историю пустым массивом (гонка auth, сбой чтения, ошибка миграции)
                if (workouts.length === 0) {
                    if (oldRefs.length > 0 && !options.allowEmptyReplace) {
                        console.error(
                            '[FirebaseStorage] saveToStorage(exercises): отмена — попытка записать пустой массив при наличии тренировок'
                        );
                        return false;
                    }
                    if (oldRefs.length > 0) {
                        for (let i = 0; i < oldRefs.length; i += 500) {
                            const delBatch = writeBatch(this.db);
                            oldRefs.slice(i, i + 500).forEach((ref) => delBatch.delete(ref));
                            await delBatch.commit();
                        }
                    }
                    this._invalidateWorkoutHistoryCache();
                    return true;
                }

                const incomingIds = new Set();

                const buildPayload = (workout) => {
                    const formatted = WorkoutFormatterService.formatWorkoutData(workout);
                    const payload = {
                        ...formatted,
                        userId: this.userId,
                        date: formatted.date,
                        time: formatted.startTime || '',
                        exercises: formatted.exercises || [],
                        notes: formatted.notes || {},
                        timestamp: workout.timestamp || formatted.timestamp || Date.now(),
                        workoutType: workout.workoutType || formatted.workoutType || 'universal',
                        presetId: workout.presetId ?? formatted.presetId ?? null,
                        presetName: workout.presetName ?? formatted.presetName ?? null
                    };
                    delete payload.id;
                    return payload;
                };

                // Сначала записываем все документы (миграция обновляет по существующим id строки бекапа — создаёт новые)
                for (let i = 0; i < workouts.length; i += 500) {
                    const writeBatchOps = writeBatch(this.db);
                    const chunk = workouts.slice(i, i + 500);
                    for (const workout of chunk) {
                        const payload = buildPayload(workout);
                        const wid = workout.id;
                        let docRef;
                        if (typeof wid === 'string' && wid.length > 0) {
                            docRef = doc(workoutsRef, wid);
                            incomingIds.add(wid);
                        } else {
                            docRef = doc(workoutsRef);
                            incomingIds.add(docRef.id);
                        }
                        writeBatchOps.set(docRef, payload);
                    }
                    await writeBatchOps.commit();
                }

                // Удаляем только документы, которых нет в переданном списке (после успешной записи)
                const toRemove = oldSnap.docs.filter((d) => !incomingIds.has(d.id));
                for (let i = 0; i < toRemove.length; i += 500) {
                    const delBatch = writeBatch(this.db);
                    toRemove.slice(i, i + 500).forEach((d) => delBatch.delete(d.ref));
                    await delBatch.commit();
                }

                this._invalidateWorkoutHistoryCache();
                return true;
            }

            // Для других ключей используем коллекцию settings
            const docRef = this.getDocument('settings', key);
            await setDoc(docRef, { 
                value,
                userId: this.userId  // Добавляем userId
            });
            return true;
        } catch (error) {
            console.error(`Error saving to storage for key "${key}":`, error);
            return false;
        }
    }

    async deleteWorkoutFromHistory(workoutId) {
        return this.deleteWorkout(workoutId);
    }

    async setActiveWorkout(workout) {
        try {
            if (!workout) return;
            
            // Получаем текущее состояние
            const currentState = await this.getCurrentWorkout() || {};
            
            const activeWorkout = {
                ...currentState,  // Сохраняем все текущие данные
                userId: this.userId,
                date: workout.date,
                exerciseType: workout.exerciseType || currentState.exerciseType || 'bodyweight',
                lastSelectedExercises: workout.lastSelectedExercises || currentState.lastSelectedExercises || {
                    weighted: '',
                    bodyweight: ''
                },
                timestamp: Date.now()
            };
            
            const docRef = this.getDocument('currentWorkout', 'active');
            await setDoc(docRef, activeWorkout);
        } catch (error) {
            console.error('Error setting active workout:', error);
        }
    }

    // ─── Кастомные упражнения ───────────────────────────────────

    async checkAndSeedExercises() {
        try {
            const seedRef = this.getDocument('settings', 'exercises_seeded');
            const docSnap = await getDoc(seedRef);
            
            if (!docSnap.exists() || !docSnap.data().value) {
                // Надо засидить
                const seedExercises = ExercisePool.getSeedExercises();
                const exercisesRef = collection(this.db, 'custom_exercises');
                
                const batch = writeBatch(this.db);
                for (const ex of seedExercises) {
                    const docRef = doc(exercisesRef); // Генерируем новый ID
                    batch.set(docRef, { ...ex, userId: this.userId });
                }
                
                // Ставим отметку
                batch.set(seedRef, { value: true, userId: this.userId });
                await batch.commit();
            }
        } catch (error) {
            console.error('Error seeding exercises:', error);
        }
    }

    async getCustomExercises() {
        try {
            this.updateUserId();
            await this.checkAndSeedExercises(); // Проверяем при чтении
            
            const exercisesRef = collection(this.db, 'custom_exercises');
            const q = query(exercisesRef, where('userId', '==', this.userId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => {
                const data = d.data();
                return {
                    ...data,
                    id: data.id || d.id,           // сохраняем пользовательский id
                    firestoreId: d.id               // Firestore document ID отдельно
                };
            });
        } catch (error) {
            console.error('Error getting custom exercises:', error);
            return [];
        }
    }

    async saveCustomExercise(exercise) {
        try {
            this.updateUserId();
            // Отделяем firestoreId от данных для сохранения
            const { firestoreId, ...exerciseData } = exercise;
            const dataToSave = { ...exerciseData, userId: this.userId };

            if (firestoreId) {
                // Обновляем существующее
                const docRef = doc(this.db, 'custom_exercises', firestoreId);
                await setDoc(docRef, dataToSave);
            } else {
                // Добавляем новое
                const exercisesRef = collection(this.db, 'custom_exercises');
                await addDoc(exercisesRef, dataToSave);
            }
            await this.createAutoBackup();
            return true;
        } catch (error) {
            console.error('Error saving custom exercise:', error);
            return false;
        }
    }

    async deleteCustomExercise(exerciseId) {
        try {
            const docRef = doc(this.db, 'custom_exercises', exerciseId);
            await deleteDoc(docRef);
            await this.createAutoBackup();
            return true;
        } catch (error) {
            console.error('Error deleting custom exercise:', error);
            return false;
        }
    }

    // ─── Веса по умолчанию ──────────────────────────────────────

    async getDefaultWeights() {
        try {
            this.updateUserId();
            const docRef = doc(this.db, 'user_settings', this.userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data().defaultWeights || {};
            }
            return {};
        } catch (error) {
            console.error('Error getting default weights:', error);
            return {};
        }
    }

    async updateDefaultWeight(exerciseName, weight) {
        try {
            this.updateUserId();
            const docRef = doc(this.db, 'user_settings', this.userId);
            const docSnap = await getDoc(docRef);
            const existing = docSnap.exists() ? docSnap.data() : {};
            await setDoc(docRef, {
                ...existing,
                userId: this.userId,
                defaultWeights: {
                    ...(existing.defaultWeights || {}),
                    [exerciseName]: weight
                }
            });
            await this.createAutoBackup();
            return true;
        } catch (error) {
            console.error('Error updating default weight:', error);
            return false;
        }
    }

    async _saveDefaultWeightsObject(weights) {
        try {
            this.updateUserId();
            const docRef = doc(this.db, 'user_settings', this.userId);
            const docSnap = await getDoc(docRef);
            const existing = docSnap.exists() ? docSnap.data() : {};
            await setDoc(docRef, {
                ...existing,
                userId: this.userId,
                defaultWeights: weights
            });
            return true;
        } catch (error) {
            console.error('Error saving default weights:', error);
            return false;
        }
    }

    /**
     * @param {{ exerciseId: string, oldDisplayName: string, newName: string, oldCatalogName?: string }} params
     */
    async propagateExerciseRename(params) {
        const { exerciseId, oldDisplayName, newName, oldCatalogName } = params;
        if (!exerciseId || !newName || oldDisplayName === newName) return true;

        try {
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

            this._invalidateWorkoutHistoryCache();

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
            const updates = [];
            for (const w of workouts) {
                const newExercises = (w.exercises || []).map(mapEx);
                if (JSON.stringify(newExercises) !== JSON.stringify(w.exercises || [])) {
                    updates.push({ id: w.id, exercises: newExercises });
                }
            }

            const chunkSize = 500;
            for (let i = 0; i < updates.length; i += chunkSize) {
                const chunk = updates.slice(i, i + chunkSize);
                const batch = writeBatch(this.db);
                chunk.forEach((u) => {
                    const docRef = doc(this.db, this.collections.workouts, u.id);
                    batch.update(docRef, { exercises: u.exercises });
                });
                await batch.commit();
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
                const docRef = doc(this.db, 'user_settings', this.userId);
                const docSnap = await getDoc(docRef);
                const existing = docSnap.exists() ? docSnap.data() : {};
                await setDoc(docRef, {
                    ...existing,
                    userId: this.userId,
                    presets: newPresets
                });
            }

            this._invalidateWorkoutHistoryCache();
            await this.createAutoBackup();
            return true;
        } catch (error) {
            console.error('Error propagating exercise rename:', error);
            return false;
        }
    }

    // ─── Пресеты (План Фаза 4) ──────────────────────────────────

    async getPresets() {
        try {
            this.updateUserId();
            const docRef = doc(this.db, 'user_settings', this.userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().presets) {
                return docSnap.data().presets;
            }
            return [];
        } catch (error) {
            console.error('Error getting presets:', error);
            return [];
        }
    }

    async savePreset(preset) {
        try {
            this.updateUserId();
            const presets = await this.getPresets();
            const existingIndex = presets.findIndex(p => p.id === preset.id);
            if (existingIndex !== -1) {
                presets[existingIndex] = preset;
            } else {
                presets.push(preset);
            }
            
            const docRef = doc(this.db, 'user_settings', this.userId);
            const docSnap = await getDoc(docRef);
            const existing = docSnap.exists() ? docSnap.data() : {};
            await setDoc(docRef, {
                ...existing,
                userId: this.userId,
                presets: presets
            });
            await this.createAutoBackup();
            return true;
        } catch (error) {
            console.error('Error saving preset:', error);
            return false;
        }
    }

    async deletePreset(presetId) {
        try {
            this.updateUserId();
            const presets = await this.getPresets();
            const filtered = presets.filter(p => p.id !== presetId);
            
            const docRef = doc(this.db, 'user_settings', this.userId);
            const docSnap = await getDoc(docRef);
            const existing = docSnap.exists() ? docSnap.data() : {};
            await setDoc(docRef, {
                ...existing,
                userId: this.userId,
                presets: filtered
            });
            await this.createAutoBackup();
            return true;
        } catch (error) {
            console.error('Error deleting preset:', error);
            return false;
        }
    }

    /**
     * @param {{ customExercises?: Array, defaultWeights?: Object, presets?: Array }} data
     */
    async restoreUserCatalog(data) {
        try {
            this.updateUserId();

            const settingsRef = doc(this.db, 'user_settings', this.userId);
            const settingsSnap = await getDoc(settingsRef);
            const existingSettings = settingsSnap.exists() ? settingsSnap.data() : {};

            await setDoc(settingsRef, {
                ...existingSettings,
                userId: this.userId,
                ...(data.defaultWeights != null ? { defaultWeights: data.defaultWeights } : {}),
                ...(data.presets != null ? { presets: data.presets } : {})
            });

            if (data.customExercises != null) {
                const exercisesRef = collection(this.db, 'custom_exercises');
                const q = query(exercisesRef, where('userId', '==', this.userId));
                const snapshot = await getDocs(q);
                const docs = snapshot.docs;
                const chunk = 500;
                for (let i = 0; i < docs.length; i += chunk) {
                    const batch = writeBatch(this.db);
                    docs.slice(i, i + chunk).forEach((d) => batch.delete(d.ref));
                    await batch.commit();
                }

                for (const ex of data.customExercises) {
                    const { firestoreId, ...exerciseData } = ex;
                    await addDoc(exercisesRef, { ...exerciseData, userId: this.userId });
                }
            }

            return true;
        } catch (error) {
            console.error('Error restoreUserCatalog:', error);
            return false;
        }
    }
}
