import { DateFormatter } from '../utils/date-formatter.js';
import { ExerciseFormatter } from '../utils/exercise-formatter.js';
import { Utils } from '../utils/utils.js';
import { ExercisePool } from '../models/exercise-pool.js';
import { DOM_SELECTORS } from '../constants/selectors.js';

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
            exerciseType: document.querySelector(DOM_SELECTORS.INPUTS.TYPE),
            exerciseName: document.querySelector(DOM_SELECTORS.INPUTS.NAME),
            exerciseReps: document.querySelector(DOM_SELECTORS.INPUTS.REPS.INPUT),
            exerciseWeight: document.querySelector(DOM_SELECTORS.INPUTS.WEIGHT.INPUT),
            exerciseLog: document.querySelector(DOM_SELECTORS.WORKOUT.LOG),
            workoutForm: document.querySelector(DOM_SELECTORS.WORKOUT.FORM),
            startWorkoutSection: document.querySelector(DOM_SELECTORS.WORKOUT.START_SECTION),
            workoutDate: document.querySelector(DOM_SELECTORS.WORKOUT.DATE),
            workoutDateContainer: document.querySelector(DOM_SELECTORS.WORKOUT.DATE_CONTAINER),
            workoutContent: document.querySelector(DOM_SELECTORS.WORKOUT.CONTENT),
            repsInput: document.querySelector(DOM_SELECTORS.INPUTS.REPS.CONTAINER),
            weightInput: document.querySelector(DOM_SELECTORS.INPUTS.WEIGHT.CONTAINER),
            addExercise: document.querySelector(DOM_SELECTORS.WORKOUT.ADD_BUTTON),
            saveWorkout: document.querySelector(DOM_SELECTORS.WORKOUT.SAVE_BUTTON)
        };
    }

    setupEventListeners() {
        this.elements.exerciseType.addEventListener('change', () => {
            const isBodyweight = this.elements.exerciseType.value === 'bodyweight';
            this.toggleWeightInput(isBodyweight);
            this.clearInputs(true, true);
            
            this.updateExercisesList();
        });

        this.elements.exerciseName.addEventListener('change', () => {
            const isWeighted = this.elements.exerciseType.value === 'weighted';
            if (isWeighted) {
                this.elements.exerciseReps.value = '';
                this.elements.exerciseWeight.value = '';
            }
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

        this.clearInputs(true);
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
            
            this.clearInputs(true);
            
            this.initializeExercisesList();
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

    addExerciseToLog(exerciseData) {
        const { type, name } = exerciseData;
        const newSet = {
            reps: parseInt(exerciseData.reps, 10),
            ...(type === 'weighted' && { weight: parseFloat(exerciseData.weight) })
        };

        // Ищем существующее упражнение в логе
        const existingItem = Array.from(this.elements.exerciseLog.children)
            .find(item => {
                const data = JSON.parse(item.dataset.exercise);
                return data.name === name;
            });

        if (existingItem) {
            // Добавляем новый подход к существующему упражнению
            const exerciseData = JSON.parse(existingItem.dataset.exercise);
            exerciseData.sets.push(newSet);
            
            // Обновляем отображение
            existingItem.dataset.exercise = JSON.stringify(exerciseData);
            existingItem.querySelector('.exercise-content span').textContent = 
                ExerciseFormatter.formatExercise(exerciseData);
        } else {
            // Создаем новое упражнение
            const item = document.createElement('div');
            item.className = 'exercise-item';
            
            const content = document.createElement('div');
            content.className = 'exercise-content';
            
            const text = document.createElement('span');
            const newExercise = {
                name,
                type,
                sets: [newSet]
            };
            
            text.textContent = ExerciseFormatter.formatExercise(newExercise);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-exercise';
            deleteBtn.textContent = '×';
            deleteBtn.setAttribute('title', 'Удалить последний подход');
            deleteBtn.onclick = (e) => {
                e.preventDefault();
                const data = JSON.parse(item.dataset.exercise);
                
                if (data.sets.length > 1) {
                    // Удаляем последний подход
                    data.sets.pop();
                    item.dataset.exercise = JSON.stringify(data);
                    text.textContent = ExerciseFormatter.formatExercise(data);
                } else {
                    // Удаляем всё упражнение, если остался последний подход
                    item.classList.add('removing');
                    setTimeout(() => item.remove(), 300);
                }
            };

            content.appendChild(text);
            content.appendChild(deleteBtn);
            item.appendChild(content);
            item.dataset.exercise = JSON.stringify(newExercise);
            
            this.elements.exerciseLog.appendChild(item);
        }
    }

    clearInputs(fullReset = false) {
        if (fullReset) {
            // Сбрасываем все поля кроме типа упражнения
            this.elements.exerciseName.value = '';
            this.elements.exerciseReps.value = '';
            this.elements.exerciseWeight.value = '';
            
            // Обновляем видимость поля веса в соответствии с текущим типом
            const isBodyweight = this.elements.exerciseType.value === 'bodyweight';
            this.toggleWeightInput(isBodyweight);
        }
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
        this.updateExercisesList();
    }

    updateExercisesList() {
        const exerciseNameSelect = this.elements.exerciseName;
        const type = this.elements.exerciseType.value;
        const exercises = ExercisePool.getExercisesByType(type);
        
        exerciseNameSelect.innerHTML = '<option value="" disabled selected>Выберите упражнение</option>';
        
        exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise.name;
            option.textContent = exercise.name;
            exerciseNameSelect.appendChild(option);
        });
    }
} 