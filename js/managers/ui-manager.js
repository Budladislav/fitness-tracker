import { DateFormatter } from '../utils/date-formatter.js';
import { ExerciseFormatter } from '../utils/exercise-formatter.js';
import { Utils } from '../utils/utils.js';
import { ExercisePool } from '../models/exercise-pool.js';
import { DOM_SELECTORS } from '../constants/selectors.js';
import { WorkoutStorage } from './storage-manager.js';

/**
 * Управляет пользовательским интерфейсом
 * @class UIManager
 */
export class UIManager {
    /**
     * @param {NotificationManager} notifications - Менеджер уведомлений
     * @param {WorkoutStorage} storage - Менеджер хранилища
     */
    constructor(notifications, storage) {
        this.notifications = notifications;
        this.storage = storage;
        this.elements = this.initializeElements();
        this.setupEventListeners();
        this.initializeExercisesList();
        this.initializeNavigation();
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
            workoutContent: document.querySelector(DOM_SELECTORS.WORKOUT.CONTENT),
            repsInput: document.querySelector(DOM_SELECTORS.INPUTS.REPS.CONTAINER),
            weightInput: document.querySelector(DOM_SELECTORS.INPUTS.WEIGHT.CONTAINER),
            addExercise: document.querySelector(DOM_SELECTORS.WORKOUT.ADD_BUTTON),
            saveWorkout: document.querySelector(DOM_SELECTORS.WORKOUT.SAVE_BUTTON),
            navTabs: document.querySelector(DOM_SELECTORS.NAVIGATION.TABS)
        };
    }

    setupEventListeners() {
        this.elements.exerciseType.addEventListener('change', () => {
            const isWeighted = this.elements.exerciseType.checked;
            this.toggleWeightInput(isWeighted);
            this.elements.exerciseName.value = '';
            this.elements.exerciseReps.value = '';
            this.elements.exerciseWeight.value = '';
            
            this.updateExercisesList();
        });

        this.elements.exerciseName.addEventListener('change', () => {
            const isWeighted = this.elements.exerciseType.checked;
            if (isWeighted) {
                this.elements.exerciseReps.value = '';
                this.elements.exerciseWeight.value = '';
            }
        });

        this.elements.navTabs.addEventListener('click', (e) => {
            const tab = e.target.closest('.nav-tab');
            if (!tab) return;

            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            
            tab.classList.add('active');
            
            const targetPage = tab.dataset.page;
            document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
            document.getElementById(`${targetPage}Page`).classList.add('active');
        });
    }

    validateInput() {
        const formData = this.getFormData();
        return formData.name && 
               formData.reps && 
               (formData.type === 'bodyweight' || formData.weight);
    }

    toggleWeightInput(isWeighted) {
        try {
            const weightInput = document.querySelector('#weightInput');
            if (!weightInput) return;
            
            weightInput.setAttribute('data-visible', isWeighted);
        } catch (error) {
            console.error('Error in toggleWeightInput:', error);
        }
    }

    showWorkoutForm(date) {
        // Переключаем видимость внутри workoutControls
        const startSection = this.elements.startWorkoutSection;
        const workoutForm = this.elements.workoutForm;
        
        startSection.classList.add('hidden');
        workoutForm.classList.remove('hidden');
        
        // Показываем контент
        this.elements.workoutContent.classList.remove('hidden');

        // Сохраняем состояние активной тренировки
        this.storage.setActiveWorkout({
            date: date,
            exercises: this.getExercisesFromLog()
        });

        this.clearInputs(true);
    }

    resetWorkoutForm() {
        try {
            // Очищаем лог
            if (this.elements.exerciseLog) {
                this.elements.exerciseLog.innerHTML = '';
            }
            
            // Скрываем контент
            if (this.elements.workoutContent) {
                this.elements.workoutContent.classList.add('hidden');
            }
            
            // Переключаем видимость внутри workoutControls
            const startSection = this.elements.startWorkoutSection;
            const workoutForm = this.elements.workoutForm;
            
            workoutForm.classList.add('hidden');
            startSection.classList.remove('hidden');
            
            this.storage.clearActiveWorkout();
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
            type: this.elements.exerciseType.checked ? 'weighted' : 'bodyweight'
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
            // Только очищаем значения полей
            this.elements.exerciseName.value = '';
            this.elements.exerciseReps.value = '';
            this.elements.exerciseWeight.value = '';
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
        const type = this.elements.exerciseType.checked ? 'weighted' : 'bodyweight';
        const exercises = ExercisePool.getExercisesByType(type);
        
        exerciseNameSelect.innerHTML = '<option value="" disabled selected>Выберите упражнение</option>';
        
        exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise.name;
            option.textContent = exercise.name;
            exerciseNameSelect.appendChild(option);
        });
    }

    initializeNavigation() {
        const activeWorkout = this.storage.getActiveWorkout();
        
        if (activeWorkout) {
            this.showWorkoutForm(activeWorkout.date);
            
            if (activeWorkout.exercises) {
                activeWorkout.exercises.forEach(exercise => {
                    this.addExerciseToLog(exercise);
                });
            }
            
            const workoutTab = document.querySelector('[data-page="workout"]');
            if (workoutTab) {
                workoutTab.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }));
            }
        } else {
            const historyTab = document.querySelector('[data-page="history"]');
            if (historyTab) {
                historyTab.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }));
            }
        }
    }
} 