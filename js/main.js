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
    const ui = new UIManager(notifications, storage);
    const validator = new ExerciseValidator(notifications);
    
    // Создаем основной менеджер приложения
    const workoutManager = new WorkoutManager(notifications, storage, ui, validator);
}); 
