import { DOM_SELECTORS } from './constants/selectors.js';
import { NotificationManager } from './managers/notification-manager.js';
import { WorkoutStorage } from './managers/storage-manager.js';
import { ExerciseValidator } from './managers/exercise-validator.js';
import { UIManager } from './managers/ui-manager.js';
import { WorkoutManager } from './managers/workout-manager.js';

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Создаем все необходимые менеджеры
    const notifications = new NotificationManager();
    const storage = new WorkoutStorage();
    const ui = new UIManager(notifications);
    const validator = new ExerciseValidator(notifications);
    
    // Создаем основной менеджер приложения
    const workoutManager = new WorkoutManager(notifications, storage, ui, validator);

    // Обработчик навигации
    const tabs = document.querySelector(DOM_SELECTORS.NAVIGATION.TABS);
    if (tabs) {
        tabs.addEventListener('click', (e) => {
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
    }
}); 
