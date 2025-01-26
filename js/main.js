import { NotificationManager } from './managers/notification-manager.js';
import { StorageFactory } from './services/storage/storage.factory.js';
import { ExerciseValidator } from './managers/exercise-validator.js';
import { UIManager } from './managers/ui-manager.js';
import { WorkoutManager } from './managers/workout-manager.js';
import { ImportModule } from './modules/import-module.js';
import { DeviceDetector } from './utils/device-detector.js';
import { firebaseService } from './services/firebase.service.js';
import { useFirebase } from './config/firebase.config.js';
import { AuthModal } from './components/auth-modal.js';
import { AuthButton } from './components/auth-button.js';
import { importWorkoutData } from './utils/data-importer.js';

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async () => {
    // Определяем тип устройства
    DeviceDetector.addDeviceClass();
    
    // Создаем notifications до инициализации Firebase
    const notifications = new NotificationManager();
    
    try {
        // Инициализируем Firebase если он включен
        if (useFirebase) {
            const isInitialized = await firebaseService.initialize();
            if (!isInitialized) {
                notifications.error('Ошибка инициализации Firebase');
                return;
            }
        }
        
        // Создаем остальные менеджеры после инициализации Firebase
        const storage = StorageFactory.createStorage();
        const ui = new UIManager(notifications, storage);
        const validator = new ExerciseValidator(notifications);
        
        // Инициализируем компоненты авторизации
        if (useFirebase) {
            const authModal = new AuthModal(notifications);
            const authButton = new AuthButton(authModal);
        }
        
        // Создаем основной менеджер приложения
        const workoutManager = new WorkoutManager(notifications, storage, ui, validator);

        // Инициализируем модуль импорта
        const importModule = new ImportModule(workoutManager, notifications);
        importModule.init();

        // В том месте, где вы вызываете импорт:
        const importedCount = importWorkoutData(storage);
    } catch (error) {
        notifications.error('Ошибка инициализации приложения');
        console.error('Initialization error:', error);
    }

    // Добавляем методы активации/деактивации импорта в глобальную область
    window.activateImport = () => importModule.activate();
    window.deactivateImport = () => importModule.deactivate();
}); 
