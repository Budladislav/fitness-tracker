import { WorkoutFormManager } from './ui/workout-form-manager.js';
import { HistoryManager } from './ui/history-manager.js';
import { NavigationManager } from './ui/navigation-manager.js';
import { ExerciseLogManager } from './ui/exercise-log-manager.js';
import { ValidationManager } from './ui/validation-manager.js';
import { BaseComponent } from '../components/base-component.js';
import { DOM_SELECTORS } from '../constants/selectors.js';
import { NotesModal } from '../components/notes-modal.js';
import { LoaderManager } from './ui/loader-manager.js';

export class UIManager extends BaseComponent {
    constructor(notifications, storage) {
        super(notifications, storage);
        
        // Создаем модальное окно заметок
        this.notesModal = new NotesModal(notifications, storage);
        
        // Добавляем менеджеры
        this.workoutForm = new WorkoutFormManager(notifications, storage);
        this.history = new HistoryManager(notifications, storage, this.notesModal);
        this.navigation = new NavigationManager(notifications, storage);
        this.exerciseLog = new ExerciseLogManager(notifications, storage);
        this.validation = new ValidationManager(notifications, storage);
        this.loader = new LoaderManager();
        
        // Оставляем только базовую инициализацию
        this.elements = this.initializeElements();
    }

    initializeElements() {
        return {
            addExercise: this.querySelector(DOM_SELECTORS.WORKOUT.ADD_BUTTON),
            saveWorkout: this.querySelector(DOM_SELECTORS.WORKOUT.SAVE_BUTTON)
        };
    }

    // Методы-делегаты для сохранения обратной совместимости
    addExerciseToLog(exercise) {
        this.exerciseLog.addExerciseToLog(exercise);
    }

    getExercisesFromLog() {
        return this.exerciseLog.getExercisesFromLog();
    }

    resetWorkoutForm() {
        this.workoutForm.resetWorkoutForm();
    }

    showWorkoutForm(date) {
        this.workoutForm.showWorkoutForm(date);
    }

    displayWorkoutHistory(workouts) {
        this.history.displayWorkoutHistory(workouts);
    }

    getFormData() {
        return this.workoutForm.getFormData();
    }

    showLoader() {
        this.loader.show();
    }

    hideLoader() {
        this.loader.hide();
    }
} 