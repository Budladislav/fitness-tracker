export class DateFormatter {
    /**
     * Возвращает текущую дату в формате DD.MM.YY
     */
    static getCurrentFormattedDate() {
        return DateFormatter._formatDate(new Date());
    }

    /**
     * Форматирует дату в формат DD.MM.YY для отображения
     * @param {Date|string} date - Дата для форматирования
     */
    static formatWorkoutDate(date) {
        if (!date) return 'неизвестной даты';
        
        // Если дата уже в нужном формате (DD.MM.YY), возвращаем как есть
        if (/^\d{2}\.\d{2}\.\d{2}$/.test(date)) {
            return date;
        }

        const d = new Date(date);
        return isNaN(d.getTime()) ? 'неизвестной даты' : DateFormatter._formatDate(d);
    }

    /**
     * Преобразует дату в формат для хранения (YYYY-MM-DD)
     */
    static toStorageFormat(date) {
        if (!date) return null;
        if (date === 'current') return new Date().toISOString().split('T')[0];

        // Если дата в формате DD.MM.YY, преобразуем в YYYY-MM-DD
        if (/^\d{2}\.\d{2}\.\d{2}$/.test(date)) {
            const [day, month, year] = date.split('.');
            return `20${year}-${month}-${day}`;
        }

        return new Date(date).toISOString().split('T')[0];
    }

    /**
     * Базовый метод форматирования даты в DD.MM.YY
     * @private
     */
    static _formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${day}.${month}.${year}`;
    }
} 