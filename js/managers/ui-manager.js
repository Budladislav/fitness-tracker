import { DOM_SELECTORS } from '../constants/selectors.js';
import { DateFormatter } from '../utils/date-formatter.js';
import { ExerciseFormatter } from '../utils/exercise-formatter.js';
import { Utils } from '../utils/utils.js';
import { ExercisePool } from '../models/exercise-pool.js';

/**
 * Управляет пользовательским интерфейсом
 * @class UIManager
 */
export class UIManager {
    /**
     * @param {NotificationManager} notifications - Менеджер уведомлений
     */
    constructor(notifications) {
        this.notifications = notifications;
        this.elements = this.initializeElements();
        this.setupEventListeners();
        this.initializeExercisesList();
    }

    initializeElements() {
        return {
            exerciseType: document.getElementById('exerciseType'),
            exerciseName: document.getElementById('exerciseName'),
            exerciseReps: document.getElementById('exerciseReps'),
            exerciseWeight: document.getElementById('exerciseWeight'),
            exerciseLog: document.getElementById('exerciseLog'),
            workoutForm: document.getElementById('workoutForm'),
            startWorkoutSection: document.getElementById('startWorkoutSection'),
            workoutDate: document.getElementById('workoutDate'),
            workoutDateContainer: document.getElementById('workoutDateContainer'),
            workoutContent: document.getElementById('workoutContent'),
            repsInput: document.getElementById('repsInput'),
            weightInput: document.getElementById('weightInput'),
            addExercise: document.getElementById('addExercise'),
            saveWorkout: document.getElementById('saveWorkout')
        };
    }

    setupEventListeners() {
        this.elements.exerciseType.addEventListener('change', () => {
            const isBodyweight = this.elements.exerciseType.value === 'bodyweight';
            this.toggleWeightInput(isBodyweight);
        });
    }

    validateInput() {
        const formData = this.getFormData();
        return formData.name && 
               formData.reps && 
               (formData.type === 'bodyweight' || formData.weight);
    }

    toggleWeightInput(isBodyweight) {
        try {
            const weightInput = document.getElementById('weightInput');
            const repsInput = document.getElementById('repsInput');
            
            if (!weightInput || !repsInput) {
                console.error('Weight or reps input not found');
                return;
            }

            if (isBodyweight) {
                weightInput.classList.add('hidden');
            } else {
                weightInput.classList.remove('hidden');
            }
            repsInput.classList.remove('hidden');
        } catch (error) {
            console.error('Error in toggleWeightInput:', error);
        }
    }

    showWorkoutForm(date) {
        console.log('Showing workout form for date:', date);
        
        this.elements.workoutDate.textContent = DateFormatter.formatWorkoutDate(date);
        this.elements.startWorkoutSection.classList.add('hidden');
        this.elements.workoutContent.classList.remove('hidden');
        this.elements.workoutDateContainer.classList.remove('hidden');
        this.elements.workoutForm.classList.remove('hidden');
    }

    resetWorkoutForm() {
        try {
            if (this.elements.exerciseLog) {
                this.elements.exerciseLog.innerHTML = '';
            }
            
            if (this.elements.workoutContent) {
                this.elements.workoutContent.classList.add('hidden');
            }
            
            if (this.elements.startWorkoutSection) {
                this.elements.startWorkoutSection.classList.remove('hidden');
            }
            
            if (this.elements.exerciseType) this.elements.exerciseType.value = 'bodyweight';
            if (this.elements.exerciseName) this.elements.exerciseName.value = '';
            if (this.elements.exerciseReps) this.elements.exerciseReps.value = '';
            if (this.elements.exerciseWeight) this.elements.exerciseWeight.value = '';
            
            this.initializeExercisesList();
            this.toggleWeightInput(true);
        } catch (error) {
            console.error('Error in resetWorkoutForm:', error);
        }
    }

    getFormData() {
        return {
            name: Utils.sanitizeInput(this.elements.exerciseName.value),
            reps: this.elements.exerciseReps.value,
            weight: this.elements.exerciseWeight.value,
            type: this.elements.exerciseType.value
        };
    }

    addExerciseToLog(exercise) {
        const item = document.createElement('div');
        item.className = 'exercise-item';
        
        const content = document.createElement('div');
        content.className = 'exercise-content';
        
        const text = document.createElement('span');
        const sanitizedExercise = {
            ...exercise,
            name: Utils.sanitizeInput(exercise.name)
        };
        text.textContent = ExerciseFormatter.formatExercise(sanitizedExercise);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-exercise';
        deleteBtn.textContent = '×';
        deleteBtn.setAttribute('title', 'Удалить упражнение');
        deleteBtn.onclick = (e) => {
            e.preventDefault();
            item.classList.add('removing');
            setTimeout(() => item.remove(), 300);
        };

        content.appendChild(text);
        content.appendChild(deleteBtn);
        item.appendChild(content);
        item.dataset.exercise = JSON.stringify(sanitizedExercise);
        
        this.elements.exerciseLog.appendChild(item);
    }

    clearInputs() {
        this.elements.exerciseName.value = '';
        this.elements.exerciseReps.value = '';
        this.elements.exerciseWeight.value = '';
    }

    displayWorkoutHistory(workouts = []) {
        try {
            const historyContainer = document.getElementById('workoutHistory');
            if (!historyContainer) {
                console.error('History container not found');
                return;
            }

            historyContainer.innerHTML = '';
            
            if (workouts.length === 0) {
                historyContainer.innerHTML = '<p>История тренировок пуста</p>';
                return;
            }

            [...workouts].reverse().forEach(workout => {
                const workoutEntry = this.createWorkoutEntry(workout);
                if (workoutEntry) {
                    historyContainer.appendChild(workoutEntry);
                }
            });
        } catch (error) {
            console.error('Error in displayWorkoutHistory:', error);
        }
    }

    createWorkoutDateElement(date) {
        const dateElement = document.createElement('div');
        dateElement.className = 'workout-date';
        dateElement.textContent = DateFormatter.formatWorkoutDate(date);
        return dateElement;
    }

    createExerciseElement(exercise) {
        const exerciseDiv = document.createElement('div');
        if (exercise && exercise.name) {
            exerciseDiv.textContent = ExerciseFormatter.formatExercise(exercise);
        }
        return exerciseDiv;
    }

    createWorkoutEntry(workout) {
        const workoutEntry = document.createElement('div');
        workoutEntry.className = 'workout-entry';
        
        const dateElement = this.createWorkoutDateElement(workout.date);
        
        const exercises = document.createElement('div');
        exercises.className = 'workout-exercises';
        
        if (workout.exercises && Array.isArray(workout.exercises)) {
            workout.exercises.forEach(exercise => {
                exercises.appendChild(this.createExerciseElement(exercise));
            });
        }
        
        workoutEntry.appendChild(dateElement);
        workoutEntry.appendChild(exercises);
        return workoutEntry;
    }

    getExercisesFromLog() {
        return Array.from(this.elements.exerciseLog.children).map(item => {
            return JSON.parse(item.dataset.exercise);
        });
    }

    initializeExercisesList() {
        const exerciseNameSelect = this.elements.exerciseName;
        
        const updateExercisesList = () => {
            const type = this.elements.exerciseType.value;
            const exercises = ExercisePool.getExercisesByType(type);
            
            exerciseNameSelect.innerHTML = '<option value="" disabled selected>Выберите упражнение</option>';
            
            exercises.forEach(exercise => {
                const option = document.createElement('option');
                option.value = exercise.name;
                option.textContent = exercise.name;
                exerciseNameSelect.appendChild(option);
            });
        };

        this.elements.exerciseType.addEventListener('change', () => {
            updateExercisesList();
        });
        
        updateExercisesList();
    }
} 