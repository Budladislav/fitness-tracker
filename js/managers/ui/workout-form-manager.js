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
            workoutContent: this.querySelector(DOM_SELECTORS.WORKOUT.CONTENT)
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
            this.clearInputs();
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
        });
    }

    toggleWeightInput(isWeighted) {
        try {
            this.elements.weightInput.setAttribute('data-visible', isWeighted);
        } catch (error) {
            console.error('Error in toggleWeightInput:', error);
        }
    }

    clearInputs() {
        this.elements.exerciseName.value = '';
        this.elements.exerciseReps.value = '';
        this.elements.exerciseWeight.value = '';
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
        
        // Показываем контент
        this.elements.workoutContent.classList.remove('hidden');

        // Сохраняем состояние активной тренировки
        this.storage.setActiveWorkout({
            date: date,
            exercises: []
        });

        // Очищаем форму
        this.clearInputs();
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
} 