import { DateFormatter } from '../utils/date-formatter.js';
import { WorkoutFactory } from '../factories/workout.factory.js';

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
            
            // Проверяем наличие активной тренировки
            const currentWorkout = this.storage.getCurrentWorkout();
            if (currentWorkout) {
                // Восстанавливаем только если есть активная тренировка
                this.restoreWorkoutState();
            } else {
                // Если нет активной тренировки, показываем историю
                this.ui.navigation.switchToTab('history');
            }
            
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
            if (!this._formShown) {
                this._formShown = true;
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
                const currentWorkout = WorkoutFactory.createNewWorkout(
                    this.storage.getCurrentWorkout().date,
                    this.ui.getExercisesFromLog()
                );
                this.storage.saveCurrentWorkout(currentWorkout);
            }
        });
    }

    initializeWorkoutEvents() {
        const startWorkoutBtn = document.getElementById('startWorkout');
        if (startWorkoutBtn) {
            startWorkoutBtn.addEventListener('click', () => {
                this.storage.removeFromStorage('activeWorkout');
                this.storage.removeFromStorage('currentWorkout', sessionStorage);
                
                const storageDate = DateFormatter.toStorageFormat('current');
                // Создаем новую тренировку через фабрику
                const newWorkout = WorkoutFactory.createNewWorkout(storageDate);
                this.storage.saveCurrentWorkout(newWorkout);
                
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

            // Используем фабрику для создания объекта тренировки
            const workoutToSave = WorkoutFactory.createNewWorkout(currentWorkout.date, exercises);

            if (!this.storage.saveWorkoutToHistory(workoutToSave)) {
                this.notifications.error('Не удалось сохранить тренировку');
                return;
            }
            
            this.storage.removeFromStorage('currentWorkout', sessionStorage);
            this.storage.removeFromStorage('activeWorkout');
            
            this.ui.resetWorkoutForm();
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