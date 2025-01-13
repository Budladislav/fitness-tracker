import { DateFormatter } from '../utils/date-formatter.js';

/**
 * Основной класс управления приложением
 * @class WorkoutManager
 */
export class WorkoutManager {
    /**
     * Инициализирует приложение и создает необходимые менеджеры
     */
    constructor(notifications, storage, ui, validator) {
        try {
            this.notifications = notifications;
            this.storage = storage;
            this.ui = ui;
            this.validator = validator;
            
            this.initializeEventListeners();
            this.restoreWorkoutState();
            
            setTimeout(() => {
                this.displayWorkoutHistory();
            }, 0);
        } catch (error) {
            console.error('Error in WorkoutManager constructor:', error);
        }
    }

    restoreWorkoutState() {
        const currentWorkout = this.storage.getCurrentWorkout();
        
        if (currentWorkout && currentWorkout.date) {
            this.ui.showWorkoutForm(currentWorkout.date);
            
            if (currentWorkout.exercises && Array.isArray(currentWorkout.exercises)) {
                currentWorkout.exercises.forEach(exercise => {
                    exercise.sets.forEach(set => {
                        const exerciseData = {
                            name: exercise.name,
                            type: exercise.type,
                            reps: set.reps,
                            weight: set.weight
                        };
                        this.ui.addExerciseToLog(exerciseData);
                    });
                });
            }
            
            this.notifications.info('Восстановлена текущая тренировка');
        }
    }

    initializeEventListeners() {
        this.initializeFormEvents();
        this.initializeWorkoutEvents();
    }

    initializeFormEvents() {
        this.ui.elements.addExercise.addEventListener('click', () => {
            const formData = this.ui.getFormData();
            const validatedData = this.validator.validate(formData);
            
            if (validatedData) {
                this.ui.addExerciseToLog(validatedData);
                const currentWorkout = {
                    date: this.storage.getCurrentWorkout().date,
                    exercises: this.ui.getExercisesFromLog()
                };
                this.storage.saveCurrentWorkout(currentWorkout);
            }
        });
    }

    initializeWorkoutEvents() {
        const startWorkoutBtn = document.getElementById('startWorkout');
        if (startWorkoutBtn) {
            startWorkoutBtn.addEventListener('click', () => {
                // Очищаем предыдущую активную тренировку
                this.storage.removeFromStorage('activeWorkout');
                this.storage.removeFromStorage('currentWorkout', sessionStorage);
                
                const displayDate = DateFormatter.getCurrentFormattedDate();
                const storageDate = DateFormatter.toStorageFormat('current');
                
                this.ui.showWorkoutForm(storageDate);
                
                this.notifications.info('Начата новая тренировка');
            });
        }

        this.ui.elements.saveWorkout.addEventListener('click', () => {
            const exercises = this.ui.getExercisesFromLog();
            
            if (exercises.length === 0) {
                this.notifications.error('Добавьте хотя бы одно упражнение!');
                return;
            }

            if (!confirm('Вы уверены, что хотите сохранить тренировку?')) {
                return;
            }

            const currentWorkout = this.storage.getCurrentWorkout();
            
            if (!currentWorkout.date) {
                this.notifications.error('Ошибка: дата тренировки не найдена!');
                return;
            }

            if (!this.storage.saveWorkoutToHistory({
                date: currentWorkout.date,
                exercises: exercises,
                id: Date.now()
            })) {
                this.notifications.error('Не удалось сохранить тренировку');
                return;
            }
            
            // Очищаем текущую тренировку
            this.storage.removeFromStorage('currentWorkout', sessionStorage);
            this.storage.removeFromStorage('activeWorkout');
            
            // Сбрасываем форму
            this.ui.resetWorkoutForm();
            
            // Переключаемся на вкладку истории
            this.ui.navigation.switchToTab('history');
            
            this.displayWorkoutHistory();
            this.notifications.success('Тренировка сохранена!');
        });
    }

    displayWorkoutHistory() {
        const savedWorkouts = this.storage.getWorkoutHistory();
        this.ui.displayWorkoutHistory(savedWorkouts);
    }
} 