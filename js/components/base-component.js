/**
 * Базовый класс для всех компонентов UI
 */
export class BaseComponent {
    /**
     * @param {NotificationManager} notifications - Менеджер уведомлений
     * @param {WorkoutStorage} storage - Менеджер хранилища
     */
    constructor(notifications, storage) {
        this.notifications = notifications;
        this.storage = storage;
    }

    /**
     * Обертка для querySelector
     * @param {string} selector - CSS селектор
     * @returns {Element|null}
     */
    querySelector(selector) {
        return document.querySelector(selector);
    }

    /**
     * Создает HTML элемент
     * @param {string} tag - HTML тег
     * @param {string} [className] - CSS класс
     * @returns {HTMLElement}
     */
    createElement(tag, className) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        return element;
    }

    /**
     * Добавляет обработчик события
     * @param {HTMLElement} element - HTML элемент
     * @param {string} event - Название события
     * @param {Function} handler - Обработчик события
     */
    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
    }
} 