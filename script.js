// Сначала определяем UIManager
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

// Затем определяем WorkoutManager
class WorkoutManager {
    constructor() {
        this.initializeElements();
        this.currentWorkout = {
            date: null,
            exercises: []
        };

        this.initializeEventListeners();
        this.displayWorkoutHistory();
    }

    initializeElements() {
        try {
            this.elements = {
                exerciseType: this.getElement('exerciseType'),
                repsInput: this.getElement('repsInput'),
                weightInput: this.getElement('weightInput'),
                exerciseLog: this.getElement('exerciseLog'),
                workoutForm: this.getElement('workoutForm'),
                startWorkoutSection: this.getElement('startWorkoutSection'),
                workoutDate: this.getElement('workoutDate'),
                workoutDateContainer: this.getElement('workoutDateContainer')
            };
        } catch (error) {
            console.error('Ошибка инициализации элементов:', error);
            throw new Error('Не удалось инициализировать необходимые элементы интерфейса');
        }
    }

    getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Элемент с ID "${id}" не найден`);
        }
        return element;
    }

    initializeEventListeners() {
        this.initializeFormEvents();
        this.initializeWorkoutEvents();
    }

    initializeFormEvents() {
        // Обработчик изменения типа упражнения
        this.elements.exerciseType.addEventListener('change', () => {
            if (this.elements.exerciseType.value === 'bodyweight') {
                this.elements.repsInput.classList.remove('hidden');
                this.elements.weightInput.classList.add('hidden');
            } else {
                this.elements.repsInput.classList.remove('hidden');
                this.elements.weightInput.classList.remove('hidden');
            }
        });

        // Обработчик добавления упражнения в лог
        document.getElementById('addExercise').addEventListener('click', () => {
            const name = document.getElementById('exerciseName').value;
            const reps = document.getElementById('exerciseReps').value;
            const weight = document.getElementById('exerciseWeight').value;
            const type = this.elements.exerciseType.value;
            
            if (!this.validateExerciseInput(name, reps)) {
                return;
            }
            
            try {
                const exercise = this.createExerciseData(type, name, reps, weight);
                this.addExerciseToLog(exercise);
            } catch (error) {
                alert(error.message);
            }
        });
    }

    initializeWorkoutEvents() {
        // Обработчик начала тренировки
        document.getElementById('startWorkout').addEventListener('click', () => {
            const currentDate = this.getCurrentFormattedDate();
            this.showWorkoutForm(currentDate);
            
            this.saveCurrentWorkout({
                date: currentDate,
                exercises: []
            });
        });

        // Обработчик сохранения тренировки
        document.getElementById('saveWorkout').addEventListener('click', () => {
            const exercises = Array.from(this.elements.exerciseLog.children).map(item => {
                return JSON.parse(item.dataset.exercise);
            });
            
            if (exercises.length === 0) {
                alert('Добавьте хотя бы одно упражнение!');
                return;
            }

            const currentWorkout = this.getCurrentWorkout();
            
            if (!currentWorkout.date) {
                alert('Ошибка: дата тренировки не найдена!');
                return;
            }

            this.saveWorkoutToHistory({
                date: currentWorkout.date,
                exercises: exercises
            });
            
            sessionStorage.removeItem('currentWorkout');
            this.resetWorkoutForm();
            this.displayWorkoutHistory();
            alert('Тренировка сохранена!');
        });
    }

    // Метод добавления упражнения в лог
    addExerciseToLog(exercise) {
        const item = document.createElement('div');
        item.className = 'exercise-item';
        item.dataset.exercise = JSON.stringify(exercise);
        item.textContent = this.formatExerciseText(exercise);
        this.elements.exerciseLog.appendChild(item);
    }

    // Метод очистки полей ввода
    clearInputs() {
        document.getElementById('exerciseName').value = '';
        document.getElementById('exerciseReps').value = '';
        document.getElementById('exerciseWeight').value = '';
    }

    // Метод отображения истории
    displayWorkoutHistory() {
        const historyContainer = document.getElementById('workoutHistory');
        const savedWorkouts = this.getFromStorage('exercises') || [];
        
        historyContainer.innerHTML = '';
        
        if (savedWorkouts.length === 0) {
            historyContainer.innerHTML = '<p>История тренировок пуста</p>';
            return;
        }

        [...savedWorkouts].reverse().forEach(workout => {
            const workoutEntry = this.createWorkoutEntry(workout);
            historyContainer.appendChild(workoutEntry);
        });
    }

    getCurrentFormattedDate() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        return `${day}.${month}.${year}`;
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

    saveCurrentWorkout(workout) {
        if (!this.saveToStorage('currentWorkout', workout, sessionStorage)) {
            alert('Не удалось сохранить текущую тренировку');
        }
    }

    getCurrentWorkout() {
        return this.getFromStorage('currentWorkout', sessionStorage) || {};
    }

    saveWorkoutToHistory(workout) {
        const savedWorkouts = this.getFromStorage('exercises') || [];
        savedWorkouts.push(workout);
        
        if (!this.saveToStorage('exercises', savedWorkouts)) {
            alert('Не удалось сохранить тренировку');
            return false;
        }
        return true;
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

    createWorkoutDateElement(date) {
        const dateElement = document.createElement('div');
        dateElement.className = 'workout-date';
        dateElement.textContent = `Тренировка от ${date || 'неизвестной даты'}`;
        return dateElement;
    }

    createExerciseElement(exercise) {
        const exerciseDiv = document.createElement('div');
        if (exercise && exercise.name) {
            exerciseDiv.textContent = exercise.type === 'bodyweight'
                ? `${exercise.name} - ${exercise.reps} повторений`
                : `${exercise.name} - ${exercise.reps} повторений × ${exercise.weight} кг`;
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

    createExerciseData(type, name, reps, weight) {
        const exercise = {
            type,
            name: this.validateName(name),
            reps: this.validateReps(reps),
            weight: this.validateWeight(type, weight)
        };

        return exercise;
    }

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

    formatExerciseText(exercise) {
        const { type, name, reps, weight } = exercise;
        return type === 'bodyweight'
            ? `${name} - ${reps} повторений`
            : `${name} - ${reps} повторений × ${weight} кг`;
    }

    // Методы для работы с хранилищем
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
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const workoutManager = new WorkoutManager();
}); 