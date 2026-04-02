import { BaseComponent } from '../../components/base-component.js';
import { DOM_SELECTORS } from '../../constants/selectors.js';
import { ExercisePool } from '../../models/exercise-pool.js';
import { Utils } from '../../utils/utils.js';
import { CustomSlider } from '../../components/custom-slider.js';
import { TouchSelect } from '../../components/touch-select.js';
import { TouchInput } from '../../components/touch-input.js';
import { FormStateService } from '../../services/form-state-service.js';

export class WorkoutFormManager extends BaseComponent {
    constructor(notifications, storage) {
        super(notifications, storage);
        this.formState = new FormStateService(storage);
        this.weightSlider = null;
        this.repsSlider = null;
        
        // Инициализация при создании
        this.elements = this.initializeElements();
        this.lastSelectedExercises = {
            weighted: '',
            bodyweight: ''
        };
        /** @type {{ id: string, name: string, exerciseIds: Set<string> } | null} */
        this.activePresetFilter = null;
        /** При активном пресете: false — только упражнения пресета, true — полный список */
        this.presetShowAllExercises = false;
        
        if (this.storage.getFromStorage('activeWorkout')) {
            document.body.classList.add('workout-active');
        }
        
        this.setupEventListeners();
        this.initializeExercisesList();
        this.setupSliders();
        // Инициализируем TouchSelect и TouchInput только на мобильных устройствах
        if (document.body.classList.contains('mobile-device')) {
            new TouchSelect(this.elements.exerciseName);
            new TouchInput(this.elements.exerciseReps, {
                step: 1,
                maxChange: 5,
                minValue: 1,
                initialValue: 10,
                suffix: 'раз'
            });
            new TouchInput(this.elements.exerciseWeight, {
                step: 2.5,
                maxChange: 10,
                minValue: 0,
                sensitivity: 0.4,
                initialValue: 100,
                suffix: 'кг'
            });
        }
    }

    initializeElements() {
        return {
            exerciseType: this.querySelector(DOM_SELECTORS.INPUTS.TYPE),
            exerciseName: this.querySelector(DOM_SELECTORS.INPUTS.NAME),
            exerciseReps: this.querySelector(DOM_SELECTORS.INPUTS.REPS.INPUT),
            exerciseWeight: this.querySelector(DOM_SELECTORS.INPUTS.WEIGHT.INPUT),
            workoutForm: this.querySelector(DOM_SELECTORS.WORKOUT.FORM),
            weightInput: this.querySelector(DOM_SELECTORS.INPUTS.WEIGHT.CONTAINER),
            workoutContent: this.querySelector(DOM_SELECTORS.WORKOUT.CONTENT),
            repsSlider: this.querySelector(DOM_SELECTORS.WORKOUT.REPS_SLIDER),
            weightSlider: this.querySelector(DOM_SELECTORS.WORKOUT.WEIGHT_SLIDER),
            workoutControls: this.querySelector(DOM_SELECTORS.WORKOUT.CONTROLS),
            presetShowAllBtn: document.getElementById('presetShowAllExercisesBtn')
        };
    }

    getFormData() {
        const sel = this.elements.exerciseName;
        const selectedOpt = sel.options[sel.selectedIndex];
        return {
            name: Utils.sanitizeInput(sel.value),
            exerciseId: selectedOpt ? selectedOpt.dataset.id : null,
            equipment: selectedOpt ? selectedOpt.dataset.equipment : null,
            reps: this.elements.exerciseReps.value,
            weight: this.elements.exerciseWeight.value,
            type: this.elements.exerciseType.checked ? 'weighted' : 'bodyweight',
            doubleTonnage: selectedOpt ? selectedOpt.dataset.double === '1' : false
        };
    }

    initializeExercisesList() {
        this.updateExercisesList();
        // Обновляем список при добавлении/удалении упражнения в настройках
        window.addEventListener('exerciseListUpdated', () => this.updateExercisesList());
    }

    /**
     * @param {{ id: string, name: string, exerciseIds: Set<string> } | null} preset
     */
    setActivePresetFilter(preset) {
        this.activePresetFilter = preset && preset.exerciseIds?.size
            ? { id: preset.id, name: preset.name, exerciseIds: preset.exerciseIds }
            : null;
        this.presetShowAllExercises = false;
    }

    _exerciseInPreset(ex) {
        if (!this.activePresetFilter?.exerciseIds?.size) return true;
        const ids = this.activePresetFilter.exerciseIds;
        return ids.has(ex.id || '') || ids.has(ex.name);
    }

    async updateExercisesList() {
        const select = this.elements.exerciseName;
        const type = this.elements.exerciseType.checked ? 'weighted' : 'bodyweight';
        
        // Подгружаем кастомные упражнения и веса если сторедж поддерживает это
        let customExercises = [];
        let defaultWeights = {};
        if (this.storage?.getCustomExercises) {
            [customExercises, defaultWeights] = await Promise.all([
                this.storage.getCustomExercises(),
                this.storage.getDefaultWeights()
            ]);
        }
        
        const exercises = ExercisePool.getExercisesByType(type, customExercises, defaultWeights);
        const presetOn = !!(this.activePresetFilter && this.activePresetFilter.exerciseIds.size > 0);
        const inPreset = exercises.filter(ex => this._exerciseInPreset(ex));
        const others = exercises.filter(ex => !this._exerciseInPreset(ex));

        select.innerHTML = '<option value="" disabled>Упражнение</option>';

        const appendOptions = (list) => {
            list.forEach(exercise => {
                const opt = new Option(exercise.name, exercise.name);
                const isDouble = !!defaultWeights[`__double_${exercise.name}`];
                if (isDouble) opt.dataset.double = '1';
                if (exercise.id) opt.dataset.id = exercise.id;
                if (exercise.equipment) opt.dataset.equipment = exercise.equipment;
                select.add(opt);
            });
        };

        if (presetOn && !this.presetShowAllExercises) {
            if (inPreset.length > 0) {
                appendOptions(inPreset);
            } else {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = 'Нет упражнений пресета в этой категории';
                opt.disabled = true;
                select.add(opt);
            }
        } else {
            appendOptions(exercises);
        }

        const btn = this.elements.presetShowAllBtn;
        if (btn) {
            if (!presetOn) {
                btn.classList.add('hidden');
            } else if (this.presetShowAllExercises) {
                btn.classList.remove('hidden');
                btn.textContent = 'Только упражнения пресета';
                btn.setAttribute('aria-expanded', 'true');
            } else {
                const canExpand = others.length > 0;
                btn.classList.toggle('hidden', !canExpand);
                if (canExpand) {
                    btn.textContent = 'Показать все упражнения';
                    btn.setAttribute('aria-expanded', 'false');
                }
            }
        }

        select.value = this.lastSelectedExercises[type] || '';
        if (select.value && !Array.from(select.options).some(o => o.value === select.value && !o.disabled)) {
            select.value = '';
        }
        select.selectedIndex = select.value ? select.selectedIndex : 0;
    }

    setupEventListeners() {
        this.setupExerciseTypeEvents();
        this.setupExerciseNameEvents();
        this.setupFormEvents();
        if (this.elements.presetShowAllBtn) {
            this.elements.presetShowAllBtn.addEventListener('click', () => {
                this.presetShowAllExercises = !this.presetShowAllExercises;
                void this.updateExercisesList();
            });
        }
    }

    setupExerciseTypeEvents() {
        this.elements.exerciseType.addEventListener('change', () => {
            const isWeighted = this.elements.exerciseType.checked;
            this.toggleWeightInput(isWeighted);
            this.updateExercisesList();
            this.saveFormState();
        });
    }

    setupExerciseNameEvents() {
        this.elements.exerciseName.addEventListener('change', async () => {
            const type = this.elements.exerciseType.checked ? 'weighted' : 'bodyweight';
            this.lastSelectedExercises[type] = this.elements.exerciseName.value;
            
            // Устанавливаем вес по умолчанию при выборе упражнения
            if (type === 'weighted' && this.elements.exerciseName.value) {
                // Читаем сохранённые веса если есть storage
                const savedWeights = this.storage?.getDefaultWeights 
                    ? await this.storage.getDefaultWeights() 
                    : {};
                const customExercises = this.storage?.getCustomExercises 
                    ? await this.storage.getCustomExercises() 
                    : [];
                const defaultWeight = ExercisePool.getDefaultWeight(
                    this.elements.exerciseName.value, 
                    savedWeights,
                    customExercises
                );
                if (defaultWeight) {
                    this.elements.exerciseWeight.value = defaultWeight;
                    // Обновляем значение слайдера, если он есть
                    const slider = this.querySelector('.custom-slider[aria-label="Изменить вес"]');
                    if (slider) {
                        const valueDisplay = slider.querySelector('.slider-value');
                        const handle = slider.querySelector('.slider-handle');
                        if (valueDisplay) valueDisplay.textContent = defaultWeight;
                        if (handle) {
                            const percent = (defaultWeight - 0) / (200 - 0) * 100;
                            handle.style.left = `${percent}%`;
                        }
                    }
                }
            }
            
            this.saveFormState();
        });
    }

    setupFormEvents() {
        ['exerciseName', 'exerciseReps', 'exerciseWeight'].forEach(fieldName => {
            const element = this.elements[fieldName];
            ['input', 'blur'].forEach(eventType => {
                element.addEventListener(eventType, () => this.saveFormState());
            });
        });

        if (this.elements.repsSlider) {
            this.setupSliders();
        }
    }

    toggleWeightInput(isWeighted, skipAnimation = false) {
        const weightInput = this.elements.weightInput;
        
        if (skipAnimation) {
            weightInput.style.display = isWeighted ? 'block' : 'none';
        } else {
            weightInput.style.display = isWeighted ? 'block' : 'none';
            weightInput.dataset.visible = isWeighted;
        }
    }

    clearWorkoutState() {
        this.storage.removeFromStorage('currentWorkout', sessionStorage);
        this.storage.removeFromStorage('activeWorkout');
        this.formState.clearState();
        document.body.classList.remove('workout-active');
        this.resetWorkoutForm();
    }

    showWorkoutForm(date) {
        // Очищаем предыдущий лог упражнений
        const exerciseLog = this.querySelector(DOM_SELECTORS.WORKOUT.LOG);
        if (exerciseLog) {
            exerciseLog.innerHTML = '';
        }

        // Переключаем видимость
        this.elements.workoutForm.classList.remove('hidden');
        this.elements.workoutContent.classList.remove('hidden');

        // Сохраняем состояние активной тренировки
        this.storage.setActiveWorkout({
            date: date,
            exercises: []
        });

        // Проверяем, новая ли это тренировка
        const isNewWorkout = !this.storage.getFromStorage('workoutFormState', sessionStorage);
        
        if (isNewWorkout) {
            this.clearInputs();
        } else {
            const formState = this.storage.getFromStorage('workoutFormState', sessionStorage);
            if (formState) {
                this.restoreFormState(formState);
            }
        }

        void this.updateExercisesList();
    }

    resetWorkoutForm() {
        try {
            this.setActivePresetFilter(null);
            // Очищаем форму
            this.clearInputs();
            
            // Скрываем форму упражнений
            this.elements.workoutForm.classList.add('hidden');

            // Скрываем контент тренировки
            if (this.elements.workoutContent) {
                this.elements.workoutContent.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error in resetWorkoutForm:', error);
        }
    }

    saveFormState() {
        return this.formState.saveState(this.elements);
    }

    restoreFormState(state) {
        if (state) {
            // Восстанавливаем базовые значения
            this.lastSelectedExercises = state.lastSelectedExercises || {
                weighted: '',
                bodyweight: ''
            };
            
            this.elements.exerciseType.checked = state.exerciseType;
            this.toggleWeightInput(state.exerciseType, true);
            this.updateExercisesList();
            
            // Восстанавливаем значения полей
            if (state.exerciseReps) this.elements.exerciseReps.value = state.exerciseReps;
            if (state.exerciseWeight) this.elements.exerciseWeight.value = state.exerciseWeight;
            
            this.updateSliderValues(state);
        }
    }

    updateSliderValues(state) {
        if (this.elements.repsSlider) {
            this.elements.repsSlider.querySelector('.slider-value').textContent = 
                state.exerciseReps || '10';
        }
        
        if (this.elements.weightSlider) {
            this.elements.weightSlider.querySelector('.slider-value').textContent = 
                state.exerciseWeight || '0';
        }
    }

    setupSliders() {
        // Слайдер для повторений
        this.repsSlider = new CustomSlider({
            element: this.elements.repsSlider,
            input: this.elements.exerciseReps,
            step: 1,    
            maxChange: 5,
            minValue: 1,
            initialValue: 10
        });

        // Слайдер для веса
        this.weightSlider = new CustomSlider({
            element: this.elements.weightSlider,
            input: this.elements.exerciseWeight,
            step: 2.5,
            maxChange: 10,
            minValue: 0,
            initialValue: 100
        });
    }

    clearInputs() {
        // Не очищаем lastSelectedExercises при очистке формы
        this.elements.exerciseName.value = '';
        this.elements.exerciseReps.value = '10';  // Устанавливаем начальное значение
        this.elements.exerciseWeight.value = '100';  // Устанавливаем начальное значение
        
        // Обновляем отображение значений в слайдерах
        if (this.elements.repsSlider) {
            this.elements.repsSlider.querySelector('.slider-value').textContent = '10';
        }
        if (this.elements.weightSlider) {
            this.elements.weightSlider.querySelector('.slider-value').textContent = '100';
        }
        
        this.saveFormState();
    }
} 