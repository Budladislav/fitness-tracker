import { StorageInterface } from './storage.interface.js';
import { firebaseService } from '../firebase.service.js';
import { collection, doc, getDocs, addDoc, deleteDoc, updateDoc, getDoc, setDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Функция для генерации ID
const generateId = () => Math.random().toString(36).substr(2, 9);

export class FirebaseStorageManager extends StorageInterface {
    constructor() {
        super();
        this.db = firebaseService.getDb();
        
        // Добавляем константы для ключей
        this.EXERCISES_KEY = 'exercises';
        this.CURRENT_WORKOUT_KEY = 'current_workout';
        this.ACTIVE_WORKOUT_KEY = 'active_workout';
        this.BACKUP_KEY = 'backup';
        
        // Определяем коллекции в Firestore
        this.collections = {
            workouts: 'workouts',
            currentWorkout: 'current_workout',
            backup: 'backup',
            settings: 'settings'  // Добавляем коллекцию для настроек
        };
    }

    // Вспомогательный метод для получения ссылки на коллекцию
    getCollection(name) {
        return collection(this.db, this.collections[name]);
    }

    // Вспомогательный метод для получения ссылки на документ
    getDocument(collectionName, docId) {
        return doc(this.db, this.collections[collectionName], docId);
    }

    // Реализация методов интерфейса
    async getWorkoutHistory() {
        try {
            const workoutsRef = this.getCollection('workouts');
            const snapshot = await getDocs(workoutsRef);
            
            const workouts = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                workouts.push({
                    id: doc.id,
                    date: data.date,
                    exercises: data.exercises || [],
                    notes: data.notes || {},
                    timestamp: data.timestamp || new Date(data.date).getTime()
                });
            });
            
            console.log('Firebase workouts:', workouts);
            return workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (error) {
            console.error('Error getting workout history:', error);
            return [];
        }
    }

    async saveWorkoutToHistory(workout) {
        try {
            const workoutsRef = this.getCollection('workouts');
            
            // Если у тренировки уже есть id, используем его
            if (workout.id) {
                const docRef = this.getDocument('workouts', workout.id);
                await setDoc(docRef, workout);
            } else {
                // Иначе создаем новый документ
                const docRef = await addDoc(workoutsRef, workout);
                workout.id = docRef.id;
            }
            
            // Создаем бэкап после успешного сохранения
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
            await updateDoc(docRef, workout);
            
            // Создаем бэкап после успешного обновления
            this.createAutoBackup();
            
            return true;
        } catch (error) {
            console.error('Error updating workout:', error);
            return false;
        }
    }

    async getCurrentWorkout() {
        try {
            console.log('Getting current workout...');
            const docRef = this.getDocument('currentWorkout', 'active');
            const docSnap = await getDoc(docRef);
            
            console.log('Document exists:', docSnap.exists());
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('Current workout data:', data);
                return data;
            }
            console.log('No current workout found');
            return null;
        } catch (error) {
            console.error('Error getting current workout:', error);
            return null;
        }
    }

    async saveCurrentWorkout(workout) {
        try {
            const docRef = this.getDocument('currentWorkout', 'active');
            await setDoc(docRef, workout);
            return workout;
        } catch (error) {
            console.error('Error saving current workout:', error);
            return null;
        }
    }

    async clearCurrentWorkout() {
        try {
            const docRef = this.getDocument('currentWorkout', 'active');
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error clearing current workout:', error);
        }
    }

    async getExerciseHistory(exerciseName, limit = 3) {
        try {
            const workoutsRef = this.getCollection('workouts');
            const snapshot = await getDocs(workoutsRef);
            
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
            
            // Сортируем по дате и берем последние limit записей
            return exercises
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, limit);
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
                
                // Сохраняем новые
                for (const workout of workouts) {
                    const formatted = {
                        ...workout,
                        id: workout.id || String(Date.now()),
                        exercises: workout.exercises || [],
                        notes: workout.notes || {}
                    };
                    const docRef = this.getDocument('workouts', formatted.id);
                    await setDoc(docRef, formatted);
                }
                return true;
            }
    
            const docRef = this.getDocument('settings', key);
            await setDoc(docRef, { value });
            return true;
        } catch (error) {
            console.error(`Error saving to storage for key "${key}":`, error);
            return false;
        }
    }

    async deleteWorkoutFromHistory(workoutId) {
        return this.deleteWorkout(workoutId);
    }
} 