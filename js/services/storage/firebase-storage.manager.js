import { StorageInterface } from './storage.interface.js';
import { firebaseService } from '../firebase.service.js';
import { collection, doc, getDocs, addDoc, deleteDoc, updateDoc, getDoc, setDoc, writeBatch, query, orderBy, where, limit } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { WorkoutFormatterService } from '../workout-formatter.service.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

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

        // Инициализируем userId из текущего пользователя
        const currentUser = this.auth.currentUser;
        this.userId = currentUser ? currentUser.uid : localStorage.getItem('guestId');
        
        if (!this.userId) {
            this.userId = `guest_${generateId()}`;
            localStorage.setItem('guestId', this.userId);
        }
        
        // Слушаем изменения авторизации
        this.auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user);
            const oldUserId = this.userId; // Сохраняем старый ID
            
            if (user) {
                this.userId = user.uid;
            } else {
                const testUser = localStorage.getItem('testUser');
                if (testUser) {
                    const parsed = JSON.parse(testUser);
                    this.userId = parsed.uid;
                } else {
                    this.userId = localStorage.getItem('guestId');
                }
            }
            
            // Если ID изменился, очищаем кэш
            if (oldUserId !== this.userId) {
                sessionStorage.removeItem(this.CURRENT_WORKOUT_KEY);
            }
        });
    }

    // Изменяем методы получения ссылок
    getCollection(name) {
        return collection(this.db, this.collections[name]);
    }

    getDocument(collectionName, docId) {
        return doc(this.db, this.collections[collectionName], docId);
    }

    // Реализация методов интерфейса
    async getWorkoutHistory() {
        try {
            const workoutsRef = this.getCollection('workouts');
            console.log('Collection path:', workoutsRef.path);
            
            const q = query(
                workoutsRef, 
                where('userId', '==', this.userId),
                orderBy('timestamp', 'desc')
            );
            
            // Попытка получить первый документ для проверки структуры
            const testSnapshot = await getDocs(query(workoutsRef, 
                where('userId', '==', this.userId),
                orderBy('timestamp', 'desc'),
                limit(1)
            ));
            if (!testSnapshot.empty) {
                console.log('Document structure:', testSnapshot.docs[0].data());
            }
            
            const snapshot = await getDocs(q);
            const workouts = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                workouts.push({
                    id: doc.id,
                    date: data.date || '',
                    startTime: data.time || '',
                    exercises: data.exercises || [],
                    notes: data.notes || {},
                    timestamp: data.timestamp || Date.now()
                });
            });
            
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
            
            this.createAutoBackup();
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
            
            const docRef = this.getDocument('workouts', workout.id);
            await updateDoc(docRef, {
                ...workout,
                userId: this.userId
            });
            
            this.createAutoBackup();
            return true;
        } catch (error) {
            console.error('Error updating workout:', error);
            return false;
        }
    }

    async getCurrentWorkout() {
        try {            
            // Сначала проверяем sessionStorage
            const sessionData = sessionStorage.getItem(this.CURRENT_WORKOUT_KEY);
            if (sessionData) {
                const parsed = JSON.parse(sessionData);
                return parsed;
            }
            
            // Затем проверяем Firestore
            const docRef = this.getDocument('currentWorkout', 'active');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.userId === this.userId && data.exercises && data.exercises.length > 0) {
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
            
            sessionStorage.setItem(this.CURRENT_WORKOUT_KEY, JSON.stringify(workoutToSave));
            await setDoc(docRef, workoutToSave);
            await this.setActiveWorkout(workoutToSave);
            
            return workoutToSave;
        } catch (error) {
            console.error('Error saving current workout:', error);
            return null;
        }
    }

    async clearCurrentWorkout() {
        try {
            const docRef = this.getDocument('currentWorkout', 'active');
            await deleteDoc(docRef);
            
            await setDoc(docRef, {
                userId: this.userId,
                date: null,
                exercises: [],
                startTime: null,
                timestamp: null
            });
            
            sessionStorage.removeItem(this.CURRENT_WORKOUT_KEY);
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
            
            const backupData = {
                workouts: workouts,
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

    async saveToStorage(key, value) {
        try {
            if (key === this.EXERCISES_KEY) {
                const workouts = Array.isArray(value) ? value : [];
                
                // Очищаем существующие документы
                const snapshot = await getDocs(this.getCollection('workouts'));
                const batch = writeBatch(this.db);
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                
                // Сохраняем все тренировки в одной транзакции
                const batch2 = writeBatch(this.db);
                for (const workout of workouts) {
                    const docRef = doc(this.getCollection('workouts'));
                    batch2.set(docRef, {
                        ...workout,
                        userId: this.userId,  // Добавляем userId
                        date: workout.date,
                        time: workout.startTime || '',
                        exercises: workout.exercises || [],
                        notes: workout.notes || {},
                        timestamp: workout.timestamp || Date.now()
                    });
                }
                await batch2.commit();
                
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
} 