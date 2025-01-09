/**
 * Управляет отображением уведомлений
 * @class NotificationManager
 */
export class NotificationManager {
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