import { StorageFactory } from '../services/storage/storage.factory.js';

/**
 * Базовый класс для менеджеров UI, предоставляющий общую функциональность:
 * - Доступ к сервисам уведомлений и хранилища
 * - Вспомогательные методы для работы с DOM
 * - Упрощенное управление событиями
 * 
 * Используется как основа для классов-менеджеров, управляющих различными
 * частями приложения (формы, навигация, история и т.д.)
 * 
 * Не предназначен для UI компонентов, которые:
 * - Не требуют доступа к общим сервисам
 * - Работают с конкретным DOM элементом
 * - Являются самодостаточными (слайдеры, селекты и т.п.)
 */
export class BaseComponent {
    /**
     * @param {NotificationManager} notifications - Менеджер уведомлений
     * @param {StorageInterface} storage - Менеджер хранилища
     */
    constructor(notifications, storage) {
        this.notifications = notifications;
        this.storage = storage;
    }

    /**
     * Обертка для querySelector, используется для поиска элементов в DOM
     * @param {string} selector - CSS селектор
     * @returns {Element|null} Найденный элемент или null
     */
    querySelector(selector) {
        return document.querySelector(selector);
    }

    /**
     * Создает HTML элемент с опциональным классом
     * @param {string} tag - HTML тег
     * @param {string} [className] - CSS класс
     * @returns {HTMLElement} Созданный элемент
     */
    createElement(tag, className) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        return element;
    }

    /**
     * Добавляет обработчик события к элементу
     * @param {HTMLElement} element - HTML элемент
     * @param {string} event - Название события
     * @param {Function} handler - Обработчик события
     */
    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
    }
} 