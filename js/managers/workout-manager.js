import { DateFormatter } from '../utils/date-formatter.js';
import { WorkoutFactory } from '../factories/workout.factory.js';
import { NotesModal } from '../components/notes-modal.js';

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
            
            // Передаем зависимости в NotesModal
            this.notesModal = new NotesModal(notifications, storage);
            
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
                this.ui.navigation.switchToTab('workout');
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
                const existing = this.storage.getCurrentWorkout();
                
                // Создаем новую тренировку, сохраняя существующие данные
                const currentWorkout = WorkoutFactory.createNewWorkout(
                    existing.date,
                    this.ui.getExercisesFromLog(),
                    {
                        id: existing.id,
                        created: existing.created,
                        startTime: existing.startTime,
                        notes: existing.notes
                    }
                );
                this.storage.saveCurrentWorkout(currentWorkout);
            }
        });

        // Добавляем обработчик для кнопки заметок
        document.getElementById('workoutNotes').addEventListener('click', () => {
            const currentWorkout = this.storage.getCurrentWorkout();
            
            if (!currentWorkout) {
                this.notifications.error('Сначала начните тренировку');
                return;
            }

            this.notesModal.show(currentWorkout.notes);
            
            // Обработчик сохранения заметок
            const saveHandler = () => {
                const notes = this.notesModal.getValues();
                currentWorkout.notes = notes;
                this.storage.saveCurrentWorkout(currentWorkout);
                this.notifications.success('Заметки сохранены');
            };

            // Добавляем обработчик на кнопку "Сохранить" в модальном окне
            this.notesModal.modal.querySelector('.save-notes').onclick = () => {
                saveHandler();
                this.notesModal.hide();
            };
        });
    }

    initializeWorkoutEvents() {
        const startWorkoutBtn = document.getElementById('startWorkout');
        const startWorkoutRoundBtn = document.getElementById('startWorkoutRound');
        
        const startWorkoutHandler = () => {
            this.storage.removeFromStorage('activeWorkout');
            this.storage.removeFromStorage('currentWorkout', sessionStorage);
            
            const storageDate = DateFormatter.toStorageFormat('current');
            const newWorkout = WorkoutFactory.createNewWorkout(storageDate);
            this.storage.saveCurrentWorkout(newWorkout);
            
            document.body.classList.add('workout-active');
            this.ui.showWorkoutForm(storageDate);
            this.notifications.info('Начата новая тренировка');
        };

        if (startWorkoutBtn) {
            startWorkoutBtn.addEventListener('click', startWorkoutHandler);
        }
        
        if (startWorkoutRoundBtn) {
            startWorkoutRoundBtn.addEventListener('click', startWorkoutHandler);
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

            // Передаем все существующие данные в фабрику
            const workoutToSave = WorkoutFactory.createNewWorkout(
                currentWorkout.date,
                exercises,
                {
                    id: currentWorkout.id,
                    created: currentWorkout.created,
                    startTime: currentWorkout.startTime,
                    notes: currentWorkout.notes // Явно передаем заметки
                }
            );

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