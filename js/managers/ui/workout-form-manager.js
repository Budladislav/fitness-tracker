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
        
        // Проверяем наличие активной тренировки при инициализации
        if (this.storage.getFromStorage('activeWorkout')) {
            document.body.classList.add('workout-active');
        }
        
        this.elements = this.initializeElements();
        this.lastSelectedExercises = {
            weighted: '',
            bodyweight: ''
        };
        this.setupEventListeners();
        this.initializeExercisesList();
        this.setupSliders();
        // Инициализируем TouchSelect и TouchInput только на мобильных устройствах
        if (document.body.classList.contains('mobile-device')) {
            new TouchSelect(this.elements.exerciseName);
            new TouchInput(this.elements.exerciseReps, {
                step: 1,
                maxChange: 10,
                minValue: 1,
                initialValue: 10,
                suffix: 'раз'
            });
            new TouchInput(this.elements.exerciseWeight, {
                step: 2.5,
                maxChange: 20,
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
            workoutControls: this.querySelector(DOM_SELECTORS.WORKOUT.CONTROLS)
        };
    }

    getFormData() {
        return {
            name: Utils.sanitizeInput(this.elements.exerciseName.value),
            reps: this.elements.exerciseReps.value,
            weight: this.elements.exerciseWeight.value,
            type: this.elements.exerciseType.checked ? 'weighted' : 'bodyweight'
        };
    }

    initializeExercisesList() {
        this.updateExercisesList();
    }

    updateExercisesList() {
        const exerciseNameSelect = this.elements.exerciseName;
        const type = this.elements.exerciseType.checked ? 'weighted' : 'bodyweight';
        const exercises = ExercisePool.getExercisesByType(type);
        
        exerciseNameSelect.innerHTML = '<option value="" disabled>Упражнение</option>';
        
        exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise.name;
            option.textContent = exercise.name;
            exerciseNameSelect.appendChild(option);
        });

        const lastSelected = this.lastSelectedExercises[type];
        if (lastSelected) {
            exerciseNameSelect.value = lastSelected;
        } else {
            exerciseNameSelect.selectedIndex = 0;
        }
    }

    setupEventListeners() {
        this.setupExerciseTypeEvents();
        this.setupExerciseNameEvents();
        this.setupInputEvents();
        this.setupExitButtonEvents();
    }

    setupExerciseTypeEvents() {
        this.elements.exerciseType.addEventListener('change', () => {
            const isWeighted = this.elements.exerciseType.checked;
            this.toggleWeightInput(isWeighted);
            this.updateExercisesList();
        });
    }

    setupExerciseNameEvents() {
        this.elements.exerciseName.addEventListener('change', () => {
            const type = this.elements.exerciseType.checked ? 'weighted' : 'bodyweight';
            this.lastSelectedExercises[type] = this.elements.exerciseName.value;
            
            if (this.elements.exerciseType.checked) {
                this.updateWeightForExercise(this.elements.exerciseName.value);
            }
            this.saveFormState();
        });
    }

    updateWeightForExercise(exerciseName) {
        const defaultWeight = ExercisePool.getDefaultWeight(exerciseName);
        this.elements.exerciseWeight.value = defaultWeight;
        this.elements.weightSlider.querySelector('.slider-value').textContent = defaultWeight;
        this.weightSlider.setInitialValue(defaultWeight);
        
        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
        this.elements.exerciseWeight.dispatchEvent(inputEvent);
    }

    setupInputEvents() {
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

    setupExitButtonEvents() {
        const exitButton = document.getElementById('exitWorkout');
        if (exitButton) {
            exitButton.addEventListener('click', async () => {
                const confirmed = await this.notifications.confirmModal.show(
                    'Вы уверены, что хотите выйти без сохранения?'
                );
                
                if (confirmed) {
                    this.clearWorkoutState();
                }
            });
        }
    }

    clearWorkoutState() {
        this.storage.removeFromStorage('currentWorkout', sessionStorage);
        this.storage.removeFromStorage('activeWorkout');
        this.formState.clearState();
        document.body.classList.remove('workout-active');
        this.resetWorkoutForm();
    }

    toggleWeightInput(isWeighted, skipSave = false) {
        try {
            this.elements.weightInput.setAttribute('data-visible', isWeighted);
            if (!skipSave) {
                this.saveFormState();
            }
        } catch (error) {
            console.error('Error in toggleWeightInput:', error);
        }
    }

    clearInputs() {
        this.lastSelectedExercises = {
            weighted: '',
            bodyweight: ''
        };
        this.elements.exerciseName.value = '';
        this.elements.exerciseReps.value = '';
        this.elements.exerciseWeight.value = '';
        this.saveFormState();
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
    }

    resetWorkoutForm() {
        try {
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

    restoreFormState() {
        const state = this.formState.restoreState(this.elements);
        if (state) {
            this.toggleWeightInput(state.exerciseType, true);
            this.updateExercisesList();
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
        new CustomSlider({
            element: this.elements.repsSlider,
            input: this.elements.exerciseReps,
            step: 1,    
            maxChange: 10,
            minValue: 1,
            initialValue: 10
        });

        // Слайдер для веса
        new CustomSlider({
            element: this.elements.weightSlider,
            input: this.elements.exerciseWeight,
            step: 2.5,
            maxChange: 20,
            minValue: 0,
            sensitivity: 0.1,
            initialValue: 100
        });
    }
} 