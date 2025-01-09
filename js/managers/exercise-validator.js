/**
 * Валидирует данные упражнений
 * @class ExerciseValidator
 */
export class ExerciseValidator {
    /**
     * @param {NotificationManager} notifications - Менеджер уведомлений
     */
    constructor(notifications) {
        this.notifications = notifications;
    }

    /**
     * Валидирует данные упражнения
     * @param {Object} formData - Данные формы
     * @param {string} formData.name - Название упражнения
     * @param {string} formData.reps - Количество повторений
     * @param {string} formData.weight - Вес
     * @param {string} formData.type - Тип упражнения
     * @returns {Object|null} Валидированные данные или null при ошибке
     */
    validate(formData) {
        const { type, name, reps, weight } = formData;
        
        // Проверка имени
        if (!name || !name.trim()) {
            this.notifications.error('Введите название упражнения');
            return null;
        }

        // Проверка повторений
        const repsNum = parseInt(reps, 10);
        if (isNaN(repsNum) || repsNum <= 0) {
            this.notifications.error('Введите корректное количество повторений');
            return null;
        }

        // Проверка веса для упражнений с весом
        if (type !== 'bodyweight') {
            const weightNum = parseFloat(weight);
            if (isNaN(weightNum) || weightNum <= 0) {
                this.notifications.error('Введите корректный вес');
                return null;
            }
        }

        // Возвращаем валидные данные
        return {
            type,
            name: name.trim(),
            reps: repsNum,
            weight: type === 'bodyweight' ? null : parseFloat(weight)
        };
    }
} 