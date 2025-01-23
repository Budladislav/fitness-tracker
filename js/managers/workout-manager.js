import { WorkoutFactory } from '../factories/workout.factory.js';
import { NotesModal } from '../components/notes-modal.js';
import { StateManager } from '../services/state-manager.js';
import { StorageFactory } from '../services/storage/storage.factory.js';

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
            this.storage = StorageFactory.createStorage();
            this.ui = ui;
            this.validator = validator;
            
            // Передаем зависимости в NotesModal
            this.notesModal = new NotesModal(notifications, storage);
            
            this.stateManager = new StateManager(storage);
            
            this.initializeEventListeners();
            
            // Инициализируем состояние приложения
            this.initializeAppState();
        } catch (error) {
            console.error('Error in WorkoutManager constructor:', error);
        }
    }

    async initializeAppState() {
        try {
            const currentWorkout = await this.stateManager.getCurrentWorkout();
            
            if (currentWorkout && currentWorkout.date) {
                // Если есть активная тренировка - восстанавливаем её
                await this.restoreWorkoutState();
            } else {
                // Если нет - показываем историю и убираем класс активной тренировки
                document.body.classList.remove('workout-active');
                await this.displayWorkoutHistory();
                this.ui.navigation.switchToTab('history');
            }
        } catch (error) {
            console.error('Error initializing app state:', error);
            // В случае ошибки показываем историю
            document.body.classList.remove('workout-active');
            await this.displayWorkoutHistory();
            this.ui.navigation.switchToTab('history');
        }
    }

    async restoreWorkoutState() {
        console.log('1. Start restoring state');
        this.ui.showLoader();
        try {
            const currentWorkout = await this.stateManager.getCurrentWorkout();
            console.log('2. Current workout:', currentWorkout);
            
            if (currentWorkout && currentWorkout.date) {
                console.log('3a. Has active workout');
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
            } else {
                console.log('3b. No active workout, switching to history');
                await this.displayWorkoutHistory();
            }
        } finally {
            console.log('4. Restore state finished');
            this.ui.hideLoader();
        }
    }

    initializeEventListeners() {
        this.initializeFormEvents();
        this.initializeWorkoutEvents();
    }

    initializeFormEvents() {
        this.ui.elements.addExercise.addEventListener('click', async () => {
            const formData = this.ui.getFormData();
            const validatedData = this.validator.validate(formData);
            
            if (validatedData) {
                this.ui.addExerciseToLog(validatedData);
                const existing = await this.stateManager.getCurrentWorkout();
                
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
                await this.stateManager.setCurrentWorkout(currentWorkout);
            }
        });

        document.getElementById('workoutNotes').addEventListener('click', async () => {
            const currentWorkout = await this.stateManager.getCurrentWorkout();
            
            if (!currentWorkout) {
                this.notifications.error('Сначала начните тренировку');
                return;
            }

            this.notesModal.show(currentWorkout.notes);
            
            const saveHandler = async () => {
                const notes = this.notesModal.getValues();
                currentWorkout.notes = notes;
                await this.stateManager.setCurrentWorkout(currentWorkout);
                this.notifications.success('Заметки сохранены');
            };

            this.notesModal.modal.querySelector('.save-notes').onclick = () => {
                saveHandler();
                this.notesModal.hide();
            };
        });
    }

    initializeWorkoutEvents() {
        const startWorkoutRoundBtn = document.getElementById('startWorkoutRound');
        
        const startWorkoutHandler = async () => {
            await this.stateManager.clearCurrentWorkout();
            
            const now = new Date();
            // Если время между 00:00 и 04:00, используем предыдущий день
            if (now.getHours() < 4) {
                now.setDate(now.getDate() - 1);
            }
            
            // Передаем объект Date напрямую
            const newWorkout = WorkoutFactory.createNewWorkout(now);
            await this.stateManager.setCurrentWorkout(newWorkout);
            
            document.body.classList.add('workout-active');
            this.ui.showWorkoutForm(now);
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
            
            if (!confirmed) return;

            const currentWorkout = await this.stateManager.getCurrentWorkout();
            
            if (!currentWorkout.date) {
                this.notifications.error('Ошибка: дата тренировки не найдена!');
                return;
            }

            const workoutToSave = WorkoutFactory.createNewWorkout(
                currentWorkout.date,
                exercises,
                {
                    id: currentWorkout.id,
                    created: currentWorkout.created,
                    startTime: currentWorkout.startTime,
                    notes: currentWorkout.notes
                }
            );

            if (!await this.stateManager.saveWorkoutToHistory(workoutToSave)) {
                this.notifications.error('Не удалось сохранить тренировку');
                return;
            }

            await this.stateManager.clearCurrentWorkout();
            
            document.body.classList.remove('workout-active');
            this.ui.resetWorkoutForm();
            this.ui.navigation.switchToTab('history');
            
            await this.displayWorkoutHistory();
            this.notifications.success('Тренировка сохранена!');
        });

        // Добавляем обработчик для кнопки выхода
        const exitWorkoutBtn = document.getElementById('exitWorkout');
        if (exitWorkoutBtn) {
            exitWorkoutBtn.addEventListener('click', async () => {
                const confirmed = await this.notifications.confirmModal.show(
                    'Вы уверены, что хотите выйти без сохранения?'
                );
                
                if (confirmed) {
                    await this.stateManager.clearCurrentWorkout();
                    document.body.classList.remove('workout-active');
                    this.ui.resetWorkoutForm();
                    this.ui.navigation.switchToTab('history');
                    await this.displayWorkoutHistory();
                }
            });
        }
    }

    async displayWorkoutHistory() {
        this.ui.showLoader();
        try {
            const workouts = await this.stateManager.getWorkoutHistory();
            this.ui.displayWorkoutHistory(workouts);
        } finally {
            this.ui.hideLoader();
        }
    }
} 