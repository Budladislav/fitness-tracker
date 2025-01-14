import { BaseComponent } from '../../components/base-component.js';
import { DOM_SELECTORS } from '../../constants/selectors.js';
import { ExercisePool } from '../../models/exercise-pool.js';
import { Utils } from '../../utils/utils.js';
import { DateFormatter } from '../../utils/date-formatter.js';

export class WorkoutFormManager extends BaseComponent {
    constructor(notifications, storage) {
        super(notifications, storage);
        this.elements = this.initializeElements();
        this.setupEventListeners();
        this.initializeExercisesList();
    }

    initializeElements() {
        return {
            exerciseType: this.querySelector(DOM_SELECTORS.INPUTS.TYPE),
            exerciseName: this.querySelector(DOM_SELECTORS.INPUTS.NAME),
            exerciseReps: this.querySelector(DOM_SELECTORS.INPUTS.REPS.INPUT),
            exerciseWeight: this.querySelector(DOM_SELECTORS.INPUTS.WEIGHT.INPUT),
            workoutForm: this.querySelector(DOM_SELECTORS.WORKOUT.FORM),
            startWorkoutSection: this.querySelector(DOM_SELECTORS.WORKOUT.START_SECTION),
            weightInput: this.querySelector(DOM_SELECTORS.INPUTS.WEIGHT.CONTAINER),
            workoutContent: this.querySelector(DOM_SELECTORS.WORKOUT.CONTENT),
            repsSlider: this.querySelector('.reps-slider')
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
        
        exerciseNameSelect.innerHTML = '<option value="" disabled selected>Упражнение</option>';
        
        exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise.name;
            option.textContent = exercise.name;
            exerciseNameSelect.appendChild(option);
        });
    }

    setupEventListeners() {
        this.elements.exerciseType.addEventListener('change', () => {
            const isWeighted = this.elements.exerciseType.checked;
            this.toggleWeightInput(isWeighted);
            this.updateExercisesList();
        });

        this.elements.exerciseName.addEventListener('change', () => {
            const isWeighted = this.elements.exerciseType.checked;
            if (isWeighted) {
                const selectedExercise = this.elements.exerciseName.value;
                const defaultWeight = ExercisePool.getDefaultWeight(selectedExercise);
                this.elements.exerciseWeight.value = defaultWeight;
                this.elements.exerciseReps.value = '';
            }
            this.saveFormState();
        });

        // Добавляем слушатели на input для всех полей
        ['exerciseName', 'exerciseReps', 'exerciseWeight'].forEach(fieldName => {
            const element = this.elements[fieldName];
            ['input', 'blur'].forEach(eventType => {
                element.addEventListener(eventType, () => this.saveFormState());
            });
        });

        // Добавляем обработчики для слайдера
        if (this.elements.repsSlider) {
            this.setupRepsSlider();
        }
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
        this.elements.startWorkoutSection.classList.add('hidden');
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
            
            // Показываем кнопку "Начать тренировку"
            this.elements.startWorkoutSection.classList.remove('hidden');
            
            // Скрываем контент тренировки
            if (this.elements.workoutContent) {
                this.elements.workoutContent.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error in resetWorkoutForm:', error);
        }
    }

    saveFormState() {
        const formState = {
            exerciseName: this.elements.exerciseName.value,
            exerciseReps: this.elements.exerciseReps.value,
            exerciseWeight: this.elements.exerciseWeight.value,
            exerciseType: this.elements.exerciseType.checked,
            isFormVisible: !this.elements.workoutForm.classList.contains('hidden')
        };
        
        return this.storage.saveToStorage('workoutFormState', formState, sessionStorage);
    }

    restoreFormState() {
        const formState = this.storage.getFromStorage('workoutFormState', sessionStorage);
        
        if (formState) {
            // Сначала устанавливаем тип упражнения без сохранения состояния
            this.elements.exerciseType.checked = formState.exerciseType;
            this.toggleWeightInput(formState.exerciseType, true);
            
            this.updateExercisesList();
            
            this.elements.exerciseName.value = formState.exerciseName || '';
            this.elements.exerciseReps.value = formState.exerciseReps || '';
            this.elements.exerciseWeight.value = formState.exerciseWeight || '';
            
            if (formState.isFormVisible) {
                this.elements.workoutForm.classList.remove('hidden');
                this.elements.startWorkoutSection.classList.add('hidden');
                this.elements.workoutContent.classList.remove('hidden');
            }
            
            // Сохраняем состояние только один раз в конце
            this.saveFormState();
        }
    }

    setupRepsSlider() {
        let startY = 0;
        let currentValue = 10;
        let isActive = false;

        const updateSliderValue = (value) => {
            currentValue = Math.max(1, Math.min(100, value)); // Ограничиваем значения
            this.elements.repsSlider.querySelector('.reps-value').textContent = currentValue;
            this.elements.exerciseReps.value = currentValue;
            this.saveFormState();
        };

        // Инициализация значения
        this.elements.repsSlider.querySelector('.reps-value').textContent = 
            this.elements.exerciseReps.value || '10';

        // Обработчик начала касания
        this.elements.repsSlider.addEventListener('touchstart', (e) => {
            isActive = true;
            startY = e.touches[0].clientY;
            currentValue = parseInt(this.elements.exerciseReps.value) || 10;
            this.elements.repsSlider.classList.add('active');
            e.preventDefault(); // Предотвращаем скролл
        });

        // Обработчик движения пальца
        this.elements.repsSlider.addEventListener('touchmove', (e) => {
            if (!isActive) return;

            const deltaY = startY - e.touches[0].clientY;
            const sensitivity = 0.5; // Настройка чувствительности
            const newValue = currentValue + Math.round(deltaY * sensitivity);
            
            updateSliderValue(newValue);
            e.preventDefault();
        });

        // Обработчик окончания касания
        const endTouch = () => {
            if (isActive) {
                isActive = false;
                this.elements.repsSlider.classList.remove('active');
                this.saveFormState();
            }
        };

        this.elements.repsSlider.addEventListener('touchend', endTouch);
        this.elements.repsSlider.addEventListener('touchcancel', endTouch);

        // Синхронизация значений при ручном вводе в input
        this.elements.exerciseReps.addEventListener('input', () => {
            const value = this.elements.exerciseReps.value;
            if (value) {
                this.elements.repsSlider.querySelector('.reps-value').textContent = value;
            }
        });
    }
} 