import { DateFormatter } from '../utils/date-formatter.js';
import { WorkoutFactory } from '../factories/workout.factory.js';
import { NotesModal } from '../components/notes-modal.js';
import { StateManager } from '../services/state-manager.js';

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
            
            this.stateManager = new StateManager(storage);
            
            this.initializeEventListeners();
            
            // Проверяем наличие активной тренировки
            const currentWorkout = this.stateManager.getCurrentWorkout();
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
        const currentWorkout = this.stateManager.getCurrentWorkout();
        
        if (currentWorkout && currentWorkout.date) {
            if (!this.stateManager.isFormShown()) {
                this.stateManager.setFormShown(true);
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
                const existing = this.stateManager.getCurrentWorkout();
                
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
                this.stateManager.setCurrentWorkout(currentWorkout);
            }
        });

        // Добавляем обработчик для кнопки заметок
        document.getElementById('workoutNotes').addEventListener('click', () => {
            const currentWorkout = this.stateManager.getCurrentWorkout();
            
            if (!currentWorkout) {
                this.notifications.error('Сначала начните тренировку');
                return;
            }

            this.notesModal.show(currentWorkout.notes);
            
            // Обработчик сохранения заметок
            const saveHandler = () => {
                const notes = this.notesModal.getValues();
                currentWorkout.notes = notes;
                this.stateManager.setCurrentWorkout(currentWorkout);
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
        const startWorkoutRoundBtn = document.getElementById('startWorkoutRound');
        
        const startWorkoutHandler = () => {
            this.stateManager.clearCurrentWorkout();
            
            const storageDate = DateFormatter.toStorageFormat('current');
            const newWorkout = WorkoutFactory.createNewWorkout(storageDate);
            this.stateManager.setCurrentWorkout(newWorkout);
            
            document.body.classList.add('workout-active');
            this.ui.showWorkoutForm(storageDate);
            this.notifications.info('Начата новая тренировка');
        };

        if (startWorkoutRoundBtn) {
            startWorkoutRoundBtn.addEventListener('click', startWorkoutHandler);
        }
        
        this.ui.elements.saveWorkout.addEventListener('click', async () => {
            const exercises = this.ui.getExercisesFromLog();
            
            if (exercises.length === 0) {
                this.notifications.error('Добавьте хотя бы одно упражнение!');
                return;
            }

            const confirmed = await this.notifications.confirmModal.show(
                'Вы уверены, что хотите сохранить тренировку?'
            );
            
            if (!confirmed) {
                return;
            }

            const currentWorkout = this.stateManager.getCurrentWorkout();

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

            if (!this.stateManager.saveWorkoutToHistory(workoutToSave)) {
                this.notifications.error('Не удалось сохранить тренировку');
                return;
            }
            
            this.stateManager.clearCurrentWorkout();
            
            document.body.classList.remove('workout-active');

            this.ui.resetWorkoutForm();
            this.ui.navigation.switchToTab('history');
            
            this.displayWorkoutHistory();
            this.notifications.success('Тренировка сохранена!');
        });
    }

    displayWorkoutHistory() {
        const savedWorkouts = this.stateManager.getWorkoutHistory();
        this.ui.displayWorkoutHistory(savedWorkouts);
    }
} 