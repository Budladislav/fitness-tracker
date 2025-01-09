/**
 * Форматирует даты для отображения в приложении
 * @class DateFormatter
 */
class DateFormatter {
    /**
     * Возвращает текущую дату в формате DD.MM.YYYY
     * @returns {string} Отформатированная дата
     */
    static getCurrentFormattedDate() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        return `${day}.${month}.${year}`;
    }

    /**
     * Форматирует дату тренировки для отображения
     * @param {string} date - Дата в формате DD.MM.YYYY
     * @returns {string} Отформатированная строка с датой
     */
    static formatWorkoutDate(date) {
        return `Тренировка от ${date || 'неизвестной даты'}`;
    }
}

class ExerciseFormatter {
    static formatExercise(exercise) {
        const { type, name, reps, weight } = exercise;
        return type === 'bodyweight'
            ? `${name} - ${reps}`
            : `${name} - ${reps} × ${weight} кг`;
    }
}

class Utils {
    static debounce(func, wait = 250) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .trim()
            // Экранируем HTML-теги
            .replace(/[<>]/g, '')
            // Удаляем потенциально опасные символы
            .replace(/[&'"]/g, '')
            // Ограничиваем длину
            .slice(0, 100);
    }
}

/**
 * Управляет отображением уведомлений
 * @class NotificationManager
 */
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

    /**
     * Показывает уведомление
     * @param {string} message - Текст уведомления
     * @param {string} type - Тип уведомления (success/error/info)
     */
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

/**
 * Управляет пользовательским интерфейсом
 * @class UIManager
 */
class UIManager {
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
            historyContainer: document.getElementById('workoutHistory'),
            exercisesList: document.getElementById('exercisesList')
        };
    }

    setupEventListeners() {
        // Убираем валидацию с полей ввода, оставляем только переключение веса
        this.elements.exerciseType.addEventListener('change', () => {
            const isBodyweight = this.elements.exerciseType.value === 'bodyweight';
            this.toggleWeightInput(isBodyweight);
        });
    }

    validateInput() {
        const formData = this.getFormData();
        // Просто проверяем заполненность полей без показа уведомлений
        return formData.name && 
               formData.reps && 
               (formData.type === 'bodyweight' || formData.weight);
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
        
        // Показываем контейнер с кнопками
        const workoutButtons = document.querySelector('.workout-buttons');
        if (workoutButtons) {
            workoutButtons.classList.remove('hidden');
        }
    }

    resetWorkoutForm() {
        // Очищаем лог упражнений
        this.elements.exerciseLog.innerHTML = '';
        
        // Скрываем форму и показываем кнопку "Начать тренировку"
        this.elements.workoutForm.classList.add('hidden');
        this.elements.workoutDateContainer.classList.add('hidden');
        this.elements.startWorkoutSection.classList.remove('hidden');
        
        // Скрываем контейнер с кнопками
        const workoutButtons = document.querySelector('.workout-buttons');
        if (workoutButtons) {
            workoutButtons.classList.add('hidden');
        }
        
        // Сбрасываем значения полей
        this.elements.exerciseType.value = 'bodyweight';
        this.elements.exerciseName.value = '';
        this.elements.exerciseReps.value = '';
        this.elements.exerciseWeight.value = '';
        
        // Обновляем список упражнений для выбранного типа
        this.initializeExercisesList();
        
        // Скрываем поле веса для упражнений без веса
        this.toggleWeightInput(true);
    }

    /**
     * Получает данные из формы
     * @returns {{name: string, reps: string, weight: string, type: string}}
     */
    getFormData() {
        return {
            name: Utils.sanitizeInput(this.elements.exerciseName.value),
            reps: this.elements.exerciseReps.value,
            weight: this.elements.exerciseWeight.value,
            type: this.elements.exerciseType.value
        };
    }

    /**
     * Добавляет упражнение в лог тренировки
     * @param {Object} exercise - Данные упражнения
     * @param {string} exercise.name - Название упражнения
     * @param {number} exercise.reps - Количество повторений
     * @param {number|null} exercise.weight - Вес (null для упражнений без веса)
     * @param {string} exercise.type - Тип упражнения (bodyweight/weighted)
     */
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

    initializeExercisesList() {
        const exerciseNameSelect = this.elements.exerciseName;
        
        const updateExercisesList = () => {
            const type = this.elements.exerciseType.value;
            const exercises = ExercisePool.getExercisesByType(type);
            
            // Очищаем список
            exerciseNameSelect.innerHTML = '<option value="" disabled selected>Выберите упражнение</option>';
            
            // Добавляем упражнения
            exercises.forEach(exercise => {
                const option = document.createElement('option');
                option.value = exercise.name;
                option.textContent = exercise.name;
                exerciseNameSelect.appendChild(option);
            });
        };

        // Обновляем список при изменении типа упражнения
        this.elements.exerciseType.addEventListener('change', () => {
            updateExercisesList();
        });
        
        // Инициализируем список
        updateExercisesList();
    }
}

/**
 * Управляет хранением данных
 * @class WorkoutStorage
 */
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

    /**
     * Сохраняет данные в хранилище
     * @param {string} key - Ключ для сохранения
     * @param {*} data - Данные для сохранения
     * @param {Storage} [storage=localStorage] - Хранилище (localStorage/sessionStorage)
     * @returns {boolean} Успешность операции
     */
    saveToStorage(key, data, storage = localStorage) {
        if (!this.storageAvailable) {
            console.error('Storage is not available');
            return false;
        }

        try {
            const sanitizedData = Array.isArray(data) 
                ? data.map(item => ({
                    ...item,
                    name: Utils.sanitizeInput(item.name)
                }))
                : {
                    ...data,
                    name: data.name ? Utils.sanitizeInput(data.name) : data.name
                };

            storage.setItem(key, JSON.stringify(sanitizedData));
            return true;
        } catch (e) {
            console.error(`Storage error for key "${key}":`, e);
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

/**
 * Валидирует данные упражнений
 * @class ExerciseValidator
 */
class ExerciseValidator {
    /**
     * @param {NotificationManager} notifications - Менеджер уведомлений
     */
    constructor(notifications) {
        this.notifications = notifications;
        /**
         * Валидирует данные упражнения
         * @param {Object} formData - Данные формы
         * @param {string} formData.name - Название упражнения
         * @param {string} formData.reps - Количество повторений
         * @param {string} formData.weight - Вес
         * @param {string} formData.type - Тип упражнения
         * @returns {Object|null} Валидированные данные или null при ошибке
         */
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

/**
 * Основной класс управления приложением
 * @class WorkoutManager
 */
class WorkoutManager {
    /**
     * Инициализирует приложение и создает необходимые менеджеры
     */
    constructor() {
        this.notifications = new NotificationManager();
        this.ui = new UIManager(this.notifications);
        this.storage = new WorkoutStorage();
        this.validator = new ExerciseValidator(this.notifications);
        this.currentWorkout = this.storage.getCurrentWorkout() || {
            date: null,
            exercises: []
        };

        this.initializeEventListeners();
        this.restoreWorkoutState();
        this.displayWorkoutHistory();
    }

    restoreWorkoutState() {
        const currentWorkout = this.storage.getCurrentWorkout();
        
        if (currentWorkout && currentWorkout.date) {
            // Восстанавливаем форму
            this.ui.showWorkoutForm(currentWorkout.date);
            
            // Восстанавливаем упражнения
            if (currentWorkout.exercises && Array.isArray(currentWorkout.exercises)) {
                currentWorkout.exercises.forEach(exercise => {
                    this.ui.addExerciseToLog(exercise);
                });
            }
            
            this.notifications.info('Восстановлена текущая тренировка');
        }
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
                const currentWorkout = this.storage.getCurrentWorkout();
                currentWorkout.exercises = this.ui.getExercisesFromLog();
                this.storage.saveCurrentWorkout(currentWorkout);
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

            if (!confirm('Вы уверены, что хотите сохранить тренировку?')) {
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
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const workoutManager = new WorkoutManager();

    // Добавляем обработчик для навигации
    document.querySelector('.nav-tabs').addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-tab')) {
            // Убираем активный класс у всех кнопок
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Добавляем активный класс нажатой кнопке
            e.target.classList.add('active');
            
            // Переключаем страницы
            const targetPage = e.target.dataset.page;
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            document.getElementById(`${targetPage}Page`).classList.add('active');
        }
    });
}); 