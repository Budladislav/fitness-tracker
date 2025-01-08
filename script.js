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

// 2. NotificationManager (добавляем перед UIManager)
class NotificationManager {
    static SUCCESS = 'success';
    static ERROR = 'error';
    static INFO = 'info';

    constructor() {
        this.container = this.createContainer();
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    show(message, type = NotificationManager.INFO) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        this.container.appendChild(notification);

        // Анимация появления
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Автоматическое скрытие
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                this.container.removeChild(notification);
            }, 300);
        }, 3000);
    }

    success(message) {
        this.show(message, NotificationManager.SUCCESS);
    }

    error(message) {
        this.show(message, NotificationManager.ERROR);
    }

    info(message) {
        this.show(message, NotificationManager.INFO);
    }
}

// 3. UIManager
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

    addExerciseToLog(exercise) {
        const item = document.createElement('div');
        item.className = 'exercise-item';
        item.dataset.exercise = JSON.stringify(exercise);
        item.textContent = ExerciseFormatter.formatExercise(exercise);
        this.elements.exerciseLog.appendChild(item);
    }

    clearInputs() {
        this.elements.exerciseName.value = '';
        this.elements.exerciseReps.value = '';
        this.elements.exerciseWeight.value = '';
    }

    displayWorkoutHistory(workouts) {
        this.elements.historyContainer.innerHTML = '';
        
        if (workouts.length === 0) {
            this.elements.historyContainer.innerHTML = '<p>История тренировок пуста</p>';
            return;
        }

        [...workouts].reverse().forEach(workout => {
            const workoutEntry = this.createWorkoutEntry(workout);
            this.elements.historyContainer.appendChild(workoutEntry);
        });
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
}

// 4. WorkoutStorage
class WorkoutStorage {
    constructor() {
        this.storageAvailable = this.checkStorageAvailability();
    }

    checkStorageAvailability() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch (e) {
            console.error('Local storage is not available:', e);
            return false;
        }
    }

    saveToStorage(key, data, storage = localStorage) {
        if (!this.storageAvailable) {
            console.error('Storage is not available');
            return false;
        }

        try {
            storage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error(`Storage error for key "${key}":`, e);
            if (e.name === 'QuotaExceededError') {
                console.error('Storage quota exceeded');
            }
            return false;
        }
    }

    getFromStorage(key, storage = localStorage) {
        if (!this.storageAvailable) {
            console.error('Storage is not available');
            return null;
        }

        try {
            const data = storage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error(`Error reading from storage for key "${key}":`, e);
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

// 5. ExerciseValidator
class ExerciseValidator {
    constructor(notifications) {
        this.notifications = notifications;
        // Определяем validate как свойство в конструкторе
        this.validate = (formData) => {
            const { type, name, reps, weight } = formData;
            
            // Проверка имени
            if (!name || !name.trim()) {
                this.notifications.error('Введите название упражнения');
                return null;
            }

            // Проверка повторений
            const repsNum = parseInt(reps, 10);
            if (isNaN(repsNum) || repsNum <= 0) {
                this.notifications.error('Введите корректное количество повторений');
                return null;
            }

            // Проверка веса для упражнений с весом
            if (type !== 'bodyweight') {
                const weightNum = parseFloat(weight);
                if (isNaN(weightNum) || weightNum <= 0) {
                    this.notifications.error('Введите корректный вес');
                    return null;
                }
            }

            // Возвращаем валидные данные
            return {
                type,
                name: name.trim(),
                reps: repsNum,
                weight: type === 'bodyweight' ? null : parseFloat(weight)
            };
        };
    }
}

// 6. WorkoutManager
class WorkoutManager {
    constructor() {
        this.notifications = new NotificationManager();
        this.ui = new UIManager();
        this.storage = new WorkoutStorage();
        this.validator = new ExerciseValidator(this.notifications);
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
            const validatedData = this.validator.validate(formData);
            
            if (validatedData) {
                this.ui.addExerciseToLog(validatedData);
                this.notifications.success('Упражнение добавлено');
                this.ui.clearInputs();
            }
        });
    }

    initializeWorkoutEvents() {
        // Обработчик начала тренировки
        this.ui.elements.startWorkout.addEventListener('click', () => {
            const currentDate = DateFormatter.getCurrentFormattedDate();
            this.ui.showWorkoutForm(currentDate);
            
            if (!this.storage.saveCurrentWorkout({
                date: currentDate,
                exercises: []
            })) {
                this.notifications.error('Не удалось начать тренировку');
                return;
            }
            this.notifications.info('Начата новая тренировка');
        });

        // Обработчик сохранения тренировки
        this.ui.elements.saveWorkout.addEventListener('click', () => {
            const exercises = this.ui.getExercisesFromLog();
            
            if (exercises.length === 0) {
                this.notifications.error('Добавьте хотя бы одно упражнение!');
                return;
            }

            const currentWorkout = this.storage.getCurrentWorkout();
            
            if (!currentWorkout.date) {
                this.notifications.error('Ошибка: дата тренировки не найдена!');
                return;
            }

            if (!this.storage.saveWorkoutToHistory({
                date: currentWorkout.date,
                exercises: exercises
            })) {
                this.notifications.error('Не удалось сохранить тренировку');
                return;
            }
            
            this.storage.removeFromStorage('currentWorkout', sessionStorage);
            this.ui.resetWorkoutForm();
            this.displayWorkoutHistory();
            this.notifications.success('Тренировка сохранена!');
        });
    }

    displayWorkoutHistory() {
        const savedWorkouts = this.storage.getWorkoutHistory();
        this.ui.displayWorkoutHistory(savedWorkouts);
    }

    // Оставляем методы для работы с данными
    getCurrentFormattedDate() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        return `${day}.${month}.${year}`;
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const workoutManager = new WorkoutManager();
}); 