import { StorageInterface } from './storage.interface.js';
import { firebaseService } from '../firebase.service.js';
import { collection, doc, getDocs, addDoc, deleteDoc, updateDoc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export class FirebaseStorageManager extends StorageInterface {
    constructor() {
        super();
        this.db = firebaseService.getDb();
        
        // Определяем коллекции в Firestore
        this.collections = {
            workouts: 'workouts',
            currentWorkout: 'current_workout',
            backup: 'backup'
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
                workouts.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Сортируем по дате (как в LocalStorageManager)
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
            const docRef = this.getDocument('currentWorkout', 'active');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return docSnap.data();
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
            const backupRef = this.getDocument('backup', 'latest');
            await setDoc(backupRef, {
                workouts,
                timestamp: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error('Error creating backup:', error);
            return false;
        }
    }
} 