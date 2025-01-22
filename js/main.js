import { NotificationManager } from './managers/notification-manager.js';
import { WorkoutStorage } from './managers/storage-manager.js';
import { ExerciseValidator } from './managers/exercise-validator.js';
import { UIManager } from './managers/ui-manager.js';
import { WorkoutManager } from './managers/workout-manager.js';
import { ImportModule } from './modules/import-module.js';
import { DeviceDetector } from './utils/device-detector.js';
import { StorageFactory } from './services/storage/storage.factory.js';

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Определяем тип устройства
    DeviceDetector.addDeviceClass();
    
    // Создаем все необходимые менеджеры
    const notifications = new NotificationManager();
    const storage = StorageFactory.createStorage();
    const ui = new UIManager(notifications, storage);
    const validator = new ExerciseValidator(notifications);
    
    // Создаем основной менеджер приложения
    const workoutManager = new WorkoutManager(notifications, storage, ui, validator);

    // Инициализируем модуль импорта
    const importModule = new ImportModule(workoutManager, notifications);
    importModule.init();

    // Добавляем методы активации/деактивации импорта в глобальную область
    window.activateImport = () => importModule.activate();
    window.deactivateImport = () => importModule.deactivate();
}); 
