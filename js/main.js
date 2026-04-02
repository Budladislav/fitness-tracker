import { NotificationManager } from './managers/notification-manager.js';
import { StorageFactory } from './services/storage/storage.factory.js';
import { ExerciseValidator } from './managers/exercise-validator.js';
import { UIManager } from './managers/ui-manager.js';
import { WorkoutManager } from './managers/workout-manager.js';
import { DeviceDetector } from './utils/device-detector.js';
import { firebaseService } from './services/firebase.service.js';
import { useFirebase } from './config/firebase.config.js';
import { AuthModal } from './components/auth-modal.js';
import { AuthButton } from './components/auth-button.js';
import { SettingsModal } from './components/settings-modal.js';
import { AuthService } from './services/auth/auth.service.js';
import { ThemeService } from './services/theme.service.js';

// Регистрация Service Worker для PWA (Vanilla JS)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                // Принудительно проверяем обновление SW при загрузке.
                registration.update();

                // Когда новый SW активируется, перезагружаем страницу,
                // чтобы пользователь сразу видел новую версию ресурсов.
                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (refreshing) return;
                    refreshing = true;
                    window.location.reload();
                });
            })
            .catch(err => {
                console.log('SW registration failed: ', err);
            });
    });
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async () => {
    // Применяем сохранённую тему до отрисовки контента
    ThemeService.loadSaved();

    // Определяем тип устройства
    DeviceDetector.addDeviceClass();
    
    // Создаем notifications до инициализации Firebase
    const notifications = new NotificationManager();
    let authService = null;
    
    try {
        // Инициализируем Firebase если он включен
        if (useFirebase) {
            const isInitialized = await firebaseService.initialize();
            if (!isInitialized) {
                notifications.error('Ошибка инициализации Firebase');
                return;
            }
            
            // Создаем authService здесь, но выносим его объявление наружу
            authService = new AuthService(notifications);
            
            // Проверяем наличие ссылки для входа
            if (await authService.completeSignIn()) {
                return; // Прерываем выполнение, так как будет редирект
            }

            // Дождаться первого состояния Auth, иначе userId в хранилище может быть гостевым до restore сессии
            const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
            await getAuth(firebaseService.app).authStateReady();
        }
        
        // Создаем storage ПОСЛЕ инициализации Firebase (и после authStateReady при Firebase)
        const storage = StorageFactory.createStorage();
        if (storage.updateUserId) {
            storage.updateUserId();
        }
        
        // Создаем остальные менеджеры после инициализации Firebase
        const ui = new UIManager(notifications, storage);
        const validator = new ExerciseValidator(notifications);
        
        // Инициализируем компоненты авторизации
        if (useFirebase && authService) {
            const authModal = new AuthModal(notifications, authService);
            const settingsModal = new SettingsModal(notifications, storage, ui.history.backupManager, authService, authModal);
            const authButton = new AuthButton(authModal, authService, settingsModal);
        }
        
        const { ExerciseIdService } = await import('./services/exercise-id.service.js');
        const idService = new ExerciseIdService(storage);
        const workouts = await storage.getWorkoutHistory();
        const { migrated, changed } = await idService.migrateWorkouts(workouts);
        if (changed) {
            await storage.saveToStorage('exercises', migrated);
        }

        // Создаем основной менеджер приложения
        const workoutManager = new WorkoutManager(notifications, storage, ui, validator, authService);

        // После создания workoutManager
        window.addEventListener('workoutHistoryUpdate', async () => {
            await workoutManager.displayWorkoutHistory();
        });

        // Загружаем статистику при переходе на вкладку
        ui.navigation.onTabChange = (page) => {
            if (page === 'statistics') void ui.loadStatsAndRender();
        };
    } catch (error) {
        console.error('Error initializing app:', error);
        notifications.error('Ошибка инициализации приложения');
    }

    // Добавляем методы активации/деактивации импорта в глобальную область
    window.activateImport = () => importModule.activate();
    window.deactivateImport = () => importModule.deactivate();
}); 
