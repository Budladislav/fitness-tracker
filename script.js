// 1. Утилитарные классы
class DateFormatter {
    static getCurrentFormattedDate() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        return `${day}.${month}.${year}`;
    }

    static formatWorkoutDate(date) {
        return `Тренировка от ${date || 'неизвестной даты'}`;
    }
}

class ExerciseFormatter {
    static formatExercise(exercise) {
        const { type, name, reps, weight } = exercise;
        return type === 'bodyweight'
            ? `${name} - ${reps} повторений`
            : `${name} - ${reps} повторений × ${weight} кг`;
    }
}

// 2. UIManager
class UIManager {
    constructor() {
        this.elements = this.initializeElements();
    }

    initializeElements() {
        return {
            exerciseType: document.getElementById('exerciseType'),
            repsInput: document.getElementById('repsInput'),
            weightInput: document.getElementById('weightInput'),
            exerciseLog: document.getElementById('exerciseLog'),
            workoutForm: document.getElementById('workoutForm'),
            startWorkoutSection: document.getElementById('startWorkoutSection'),
            workoutDate: document.getElementById('workoutDate'),
            workoutDateContainer: document.getElementById('workoutDateContainer'),
            exerciseName: document.getElementById('exerciseName'),
            exerciseReps: document.getElementById('exerciseReps'),
            exerciseWeight: document.getElementById('exerciseWeight'),
            addExercise: document.getElementById('addExercise'),
            startWorkout: document.getElementById('startWorkout'),
            saveWorkout: document.getElementById('saveWorkout'),
            historyContainer: document.getElementById('workoutHistory')
        };
    }

    toggleWeightInput(isBodyweight) {
        if (isBodyweight) {
            this.elements.repsInput.classList.remove('hidden');
            this.elements.weightInput.classList.add('hidden');
        } else {
            this.elements.repsInput.classList.remove('hidden');
            this.elements.weightInput.classList.remove('hidden');
        }
    }

    showWorkoutForm(date) {
        this.elements.workoutDate.textContent = date;
        this.elements.workoutDateContainer.classList.remove('hidden');
        this.elements.startWorkoutSection.classList.add('hidden');
        this.elements.workoutForm.classList.remove('hidden');
    }

    resetWorkoutForm() {
        this.elements.exerciseLog.innerHTML = '';
        this.elements.workoutForm.classList.add('hidden');
        this.elements.workoutDateContainer.classList.add('hidden');
        this.elements.startWorkoutSection.classList.remove('hidden');
    }

    getFormData() {
        return {
            name: this.elements.exerciseName.value,
            reps: this.elements.exerciseReps.value,
            weight: this.elements.exerciseWeight.value,
            type: this.elements.exerciseType.value
        };
    }

    addExerciseToLog(exercise, formatExerciseText) {
        const item = document.createElement('div');
        item.className = 'exercise-item';
        item.dataset.exercise = JSON.stringify(exercise);
        item.textContent = formatExerciseText(exercise);
        this.elements.exerciseLog.appendChild(item);
    }

    clearInputs() {
        this.elements.exerciseName.value = '';
        this.elements.exerciseReps.value = '';
        this.elements.exerciseWeight.value = '';
    }

    displayWorkoutHistory(workouts, createWorkoutEntry) {
        this.elements.historyContainer.innerHTML = '';
        
        if (workouts.length === 0) {
            this.elements.historyContainer.innerHTML = '<p>История тренировок пуста</p>';
            return;
        }

        [...workouts].reverse().forEach(workout => {
            const workoutEntry = createWorkoutEntry(workout);
            this.elements.historyContainer.appendChild(workoutEntry);
        });
    }

    createWorkoutDateElement(date) {
        const dateElement = document.createElement('div');
        dateElement.className = 'workout-date';
        dateElement.textContent = `Тренировка от ${date || 'неизвестной даты'}`;
        return dateElement;
    }

    createExerciseElement(exercise, formatExerciseText) {
        const exerciseDiv = document.createElement('div');
        if (exercise && exercise.name) {
            exerciseDiv.textContent = formatExerciseText(exercise);
        }
        return exerciseDiv;
    }

    createWorkoutEntry(workout, formatExerciseText) {
        const workoutEntry = document.createElement('div');
        workoutEntry.className = 'workout-entry';
        
        const dateElement = this.createWorkoutDateElement(workout.date);
        
        const exercises = document.createElement('div');
        exercises.className = 'workout-exercises';
        
        if (workout.exercises && Array.isArray(workout.exercises)) {
            workout.exercises.forEach(exercise => {
                exercises.appendChild(this.createExerciseElement(exercise, formatExerciseText));
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
}

// 3. WorkoutStorage
class WorkoutStorage {
    saveToStorage(key, data, storage = localStorage) {
        try {
            storage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error(`Ошибка сохранения данных для ключа "${key}":`, e);
            return false;
        }
    }

    getFromStorage(key, storage = localStorage) {
        try {
            return JSON.parse(storage.getItem(key) || 'null');
        } catch (e) {
            console.error(`Ошибка чтения данных для ключа "${key}":`, e);
            return null;
        }
    }

    removeFromStorage(key, storage = localStorage) {
        try {
            storage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`Ошибка удаления данных для ключа "${key}":`, e);
            return false;
        }
    }

    getCurrentWorkout() {
        return this.getFromStorage('currentWorkout', sessionStorage) || {};
    }

    saveCurrentWorkout(workout) {
        return this.saveToStorage('currentWorkout', workout, sessionStorage);
    }

    getWorkoutHistory() {
        return this.getFromStorage('exercises') || [];
    }

    saveWorkoutToHistory(workout) {
        const savedWorkouts = this.getWorkoutHistory();
        savedWorkouts.push(workout);
        return this.saveToStorage('exercises', savedWorkouts);
    }
}

// 4. ExerciseValidator
class ExerciseValidator {
    validateName(name) {
        const trimmedName = name.trim();
        if (!trimmedName) {
            throw new Error('Название упражнения не может быть пустым');
        }
        return trimmedName;
    }

    validateReps(reps) {
        const repsNumber = parseInt(reps, 10);
        if (isNaN(repsNumber) || repsNumber <= 0) {
            throw new Error('Количество повторений должно быть положительным числом');
        }
        return repsNumber;
    }

    validateWeight(type, weight) {
        if (type === 'bodyweight') {
            return null;
        }
        const weightNumber = parseFloat(weight);
        if (isNaN(weightNumber) || weightNumber <= 0) {
            throw new Error('Вес должен быть положительным числом');
        }
        return weightNumber;
    }

    validateExerciseInput(name, reps) {
        try {
            this.validateName(name);
            this.validateReps(reps);
            return true;
        } catch (error) {
            alert(error.message);
            return false;
        }
    }
}

// 5. WorkoutManager
class WorkoutManager {
    constructor() {
        this.ui = new UIManager();
        this.storage = new WorkoutStorage();
        this.validator = new ExerciseValidator();
        this.currentWorkout = {
            date: null,
            exercises: []
        };

        this.initializeEventListeners();
        this.displayWorkoutHistory();
    }

    initializeEventListeners() {
        this.initializeFormEvents();
        this.initializeWorkoutEvents();
    }

    initializeFormEvents() {
        // Обработчик изменения типа упражнения
        this.ui.elements.exerciseType.addEventListener('change', () => {
            const isBodyweight = this.ui.elements.exerciseType.value === 'bodyweight';
            this.ui.toggleWeightInput(isBodyweight);
        });

        // Обработчик добавления упражнения в лог
        this.ui.elements.addExercise.addEventListener('click', () => {
            const formData = this.ui.getFormData();
            
            if (!this.validateExerciseInput(formData.name, formData.reps)) {
                return;
            }
            
            try {
                const exercise = this.createExerciseData(
                    formData.type, 
                    formData.name, 
                    formData.reps, 
                    formData.weight
                );
                this.ui.addExerciseToLog(exercise, this.formatExerciseText.bind(this));
            } catch (error) {
                alert(error.message);
            }
        });
    }

    initializeWorkoutEvents() {
        // Обработчик начала тренировки
        this.ui.elements.startWorkout.addEventListener('click', () => {
            const currentDate = this.getCurrentFormattedDate();
            this.ui.showWorkoutForm(currentDate);
            
            this.storage.saveCurrentWorkout({
                date: currentDate,
                exercises: []
            });
        });

        // Обработчик сохранения тренировки
        this.ui.elements.saveWorkout.addEventListener('click', () => {
            const exercises = this.ui.getExercisesFromLog();
            
            if (exercises.length === 0) {
                alert('Добавьте хотя бы одно упражнение!');
                return;
            }

            const currentWorkout = this.storage.getCurrentWorkout();
            
            if (!currentWorkout.date) {
                alert('Ошибка: дата тренировки не найдена!');
                return;
            }

            if (!this.storage.saveWorkoutToHistory({
                date: currentWorkout.date,
                exercises: exercises
            })) {
                alert('Не удалось сохранить тренировку');
                return;
            }
            
            this.storage.removeFromStorage('currentWorkout', sessionStorage);
            this.ui.resetWorkoutForm();
            this.displayWorkoutHistory();
            alert('Тренировка сохранена!');
        });
    }

    displayWorkoutHistory() {
        const savedWorkouts = this.storage.getWorkoutHistory();
        this.ui.displayWorkoutHistory(
            savedWorkouts, 
            (workout) => this.ui.createWorkoutEntry(workout, this.formatExerciseText.bind(this))
        );
    }

    // Оставляем методы для работы с данными
    getCurrentFormattedDate() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        return `${day}.${month}.${year}`;
    }

    createExerciseData(type, name, reps, weight) {
        const exercise = {
            type,
            name: this.validator.validateName(name),
            reps: this.validator.validateReps(reps),
            weight: this.validator.validateWeight(type, weight)
        };
        return exercise;
    }

    validateExerciseInput(name, reps) {
        return this.validator.validateExerciseInput(name, reps);
    }

    formatExerciseText(exercise) {
        const { type, name, reps, weight } = exercise;
        return type === 'bodyweight'
            ? `${name} - ${reps} повторений`
            : `${name} - ${reps} повторений × ${weight} кг`;
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const workoutManager = new WorkoutManager();
}); 