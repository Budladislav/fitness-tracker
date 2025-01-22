import { StorageFactory } from '../services/storage/storage.factory.js';
import { parseWorkoutData } from '../utils/data-importer.js';

export class ImportModule {
    constructor(workoutManager, notifications) {
        this.workoutManager = workoutManager;
        this.notifications = notifications;
        this.importButton = null;
    }

    init() {
        this.createImportButton();
        this.addEventListeners();
    }

    createImportButton() {
        this.importButton = document.createElement('button');
        this.importButton.id = 'importButton';
        this.importButton.textContent = 'Импортировать данные';
        this.importButton.style.display = 'none';
        this.importButton.style.position = 'fixed';
        this.importButton.style.top = '50px';
        this.importButton.style.right = '10px';
        this.importButton.style.zIndex = '9999';
        this.importButton.style.padding = '10px';
        this.importButton.style.backgroundColor = '#4CAF50';
        this.importButton.style.color = 'white';
        document.body.appendChild(this.importButton);
    }

    addEventListeners() {
        this.importButton.addEventListener('click', () => this.handleImport());
    }

    handleImport() {
        try {
            if (typeof rawWorkoutData === 'undefined') {
                this.notifications.show('Данные для импорта не найдены. Сначала определите переменную rawWorkoutData', 'error');
                return;
            }

            const storage = StorageFactory.createStorage();
            const parsedWorkouts = parseWorkoutData(rawWorkoutData);
            
            localStorage.removeItem('exercises');
            
            parsedWorkouts.forEach(workout => {
                storage.saveWorkoutToHistory(workout);
            });
            
            this.notifications.show(`Импортировано ${parsedWorkouts.length} тренировок`, 'success');
            
            this.workoutManager.displayWorkoutHistory();
            this.deactivate();
        } catch (error) {
            this.notifications.show('Ошибка при импорте данных', 'error');
            console.error('Import error:', error);
        }
    }

    activate() {
        if (typeof rawWorkoutData === 'undefined') {
            this.notifications.show('Сначала определите переменную rawWorkoutData', 'error');
            return;
        }
        this.importButton.style.display = 'block';
    }

    deactivate() {
        this.importButton.style.display = 'none';
    }
} 