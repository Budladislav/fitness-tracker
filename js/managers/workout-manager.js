import { WorkoutFactory } from '../factories/workout.factory.js';
import { StateManager } from '../services/state-manager.js';
import { StorageFactory } from '../services/storage/storage.factory.js';
import { AuthService } from '../services/auth/auth.service.js';
import { ExerciseLogManager } from '../managers/ui/exercise-log-manager.js';

/**
 * Основной класс управления приложением
 * @class WorkoutManager
 */
export class WorkoutManager {
    /**
     * Инициализирует приложение и создает необходимые менеджеры
     */
    constructor(notifications, storage, ui, validator, authService) {
        try {
            this.notifications = notifications;
            this.storage = storage;
            this.ui = ui;
            this.validator = validator;
            this.authService = authService;

            this.stateManager = new StateManager(storage);
            
            // Обновляем создание exerciseLog
            this.ui.exerciseLog = new ExerciseLogManager(notifications, storage, this.stateManager);
            
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
                await this.restoreWorkoutState();
            } else {
                document.body.classList.remove('workout-active');
                await this.displayWorkoutHistory();
                this.ui.navigation.switchToTab('history');
            }
        } catch (error) {
            console.error('Error initializing app state:', error);
            document.body.classList.remove('workout-active');
            await this.displayWorkoutHistory();
            this.ui.navigation.switchToTab('history');
        }
        
        await this.renderPresets();
    }

    async restoreWorkoutState() {
        this.ui.showLoader();
        try {
            // Загружаем историю независимо от наличия активной тренировки
            await this.displayWorkoutHistory();
            
            const currentWorkout = await this.stateManager.getCurrentWorkout();
            
            if (currentWorkout && currentWorkout.date) {
                if (!this.stateManager.isFormShown()) {
                    this.stateManager.setFormShown(true);
                    this.ui.navigation.switchToTab('workout');
                    await this.applyWorkoutPresetUi(currentWorkout);
                    this.ui.showWorkoutForm(currentWorkout.date);
                    
                    if (currentWorkout.exercises && Array.isArray(currentWorkout.exercises)) {
                        currentWorkout.exercises.forEach(exercise => {
                            exercise.sets.forEach(set => {
                                const exerciseData = {
                                    name: exercise.name,
                                    type: exercise.type,
                                    reps: set.reps,
                                    weight: set.weight,
                                    doubleTonnage: !!exercise.doubleTonnage,
                                    exerciseId: exercise.exerciseId,
                                    equipment: exercise.equipment
                                };
                                this.ui.addExerciseToLog(exerciseData);
                            });
                        });
                    }
                    
                    this.notifications.info('Восстановлена текущая тренировка');
                }
            }
        } catch (error) {
            console.error('Error restoring state:', error);
        } finally {
            this.ui.hideLoader();
        }
    }

    initializeEventListeners() {
        this.initializeFormEvents();
        this.initializeWorkoutEvents();
        
        // Listen for new presets saved from History
        window.addEventListener('presetsUpdated', () => this.renderPresets());
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
                        notes: existing.notes,
                        workoutType: existing.workoutType || 'universal',
                        presetId: existing.presetId,
                        presetName: existing.presetName
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

            this.ui.notesModal.show(currentWorkout.notes);
            
            const saveHandler = async () => {
                const notes = this.ui.notesModal.getValues();
                currentWorkout.notes = notes;
                await this.stateManager.setCurrentWorkout(currentWorkout);
                this.notifications.success('Заметки сохранены');
            };

            this.ui.notesModal.modal.querySelector('.save-notes').onclick = () => {
                saveHandler();
                this.ui.notesModal.hide();
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
            const newWorkout = WorkoutFactory.createNewWorkout(now, [], {
                workoutType: 'universal',
                presetId: null,
                presetName: null
            });
            await this.stateManager.setCurrentWorkout(newWorkout);
            
            document.body.classList.add('workout-active');
            this.ui.setWorkoutPresetContext(null);
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
                    notes: currentWorkout.notes,
                    workoutType: currentWorkout.workoutType || 'universal',
                    presetId: currentWorkout.presetId,
                    presetName: currentWorkout.presetName
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

        // Добавляем обработчик для кнопки сохранения как пресета
        const saveAsPresetBtn = document.getElementById('saveAsPreset');
        if (saveAsPresetBtn) {
            saveAsPresetBtn.addEventListener('click', async () => {
                const exercises = this.ui.getExercisesFromLog();
                if (exercises.length === 0) {
                    this.notifications.error('Добавьте хотя бы одно упражнение для пресета!');
                    return;
                }
                const presetName = prompt('Введите название для нового пресета:', 'Новый пресет');
                if (!presetName) return;
                
                const preset = {
                    id: 'preset_' + Date.now(),
                    name: presetName,
                    exercises: exercises
                };
                
                if (await this.storage.savePreset(preset)) {
                    this.notifications.success('Пресет сохранен');
                    await this.renderPresets();
                } else {
                    this.notifications.error('Ошибка сохранения пресета');
                }
            });
        }
    }

    async displayWorkoutHistory() {
        this.ui.showLoader();
        try {
            const workouts = await this.stateManager.getWorkoutHistory();
            this.ui.displayWorkoutHistory(workouts);
            return workouts;
        } finally {
            this.ui.hideLoader();
        }
    }

    // ─── Фаза 4: Пресеты ────────────────────────────────

    async applyWorkoutPresetUi(workout) {
        if (!workout || workout.workoutType !== 'preset' || !workout.presetId) {
            this.ui.setWorkoutPresetContext(null);
            return;
        }
        const presets = await this.storage.getPresets();
        const p = presets.find(x => x.id === workout.presetId);
        if (!p) {
            this.ui.setWorkoutPresetContext(null);
            return;
        }
        const exerciseIds = new Set(p.exercises.map(e => e.exerciseId || e.name));
        this.ui.setWorkoutPresetContext({ id: p.id, name: p.name, exerciseIds });
    }

    async renderPresets() {
        if (!this.storage.getPresets) return;
        const presets = await this.storage.getPresets();
        const container = document.getElementById('presetsContainer');
        const list = document.getElementById('presetsList');
        
        if (!container || !list) return;

        if (presets.length === 0) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        list.innerHTML = '';

        presets.forEach(preset => {
            const el = document.createElement('div');
            el.className = 'preset-item';
            el.innerHTML = `
                <div class="preset-name">${preset.name}</div>
                <div class="preset-exercises">${preset.exercises.length} упр. <br><small>${preset.exercises.map(e => e.name).join(', ')}</small></div>
            `;
            el.addEventListener('click', () => this.startWorkoutFromPreset(preset));
            list.appendChild(el);
        });
    }

    async startWorkoutFromPreset(preset) {
        await this.stateManager.clearCurrentWorkout();

        const now = new Date();
        if (now.getHours() < 4) {
            now.setDate(now.getDate() - 1);
        }

        const exerciseIds = new Set(
            (preset.exercises || []).map(e => e.exerciseId || e.name)
        );
        this.ui.setWorkoutPresetContext({
            id: preset.id,
            name: preset.name,
            exerciseIds
        });

        document.body.classList.add('workout-active');
        this.ui.showWorkoutForm(now);

        const newWorkout = WorkoutFactory.createNewWorkout(now, [], {
            workoutType: 'preset',
            presetId: preset.id,
            presetName: preset.name
        });
        await this.stateManager.setCurrentWorkout(newWorkout);

        this.notifications.info(`Запущен пресет: ${preset.name}`);
    }
} 