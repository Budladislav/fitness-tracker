import { BaseComponent } from '../../components/base-component.js';

export class ValidationManager extends BaseComponent {
    constructor(notifications, storage) {
        super(notifications, storage);
    }

    validate(formData) {
        try {
            if (!this.validateRequired(formData)) {
                return null;
            }

            return this.validateAndFormatData(formData);
        } catch (error) {
            console.error('Validation error:', error);
            this.notifications.error('Ошибка валидации данных');
            return null;
        }
    }

    validateRequired(formData) {
        const { name, reps, type } = formData;

        if (!name) {
            this.notifications.error('Выберите упражнение');
            return false;
        }

        if (!reps || reps <= 0) {
            this.notifications.error('Укажите количество повторений');
            return false;
        }

        if (type === 'weighted' && (!formData.weight || formData.weight <= 0)) {
            this.notifications.error('Укажите вес');
            return false;
        }

        return true;
    }

    validateAndFormatData(formData) {
        const { name, reps, weight, type } = formData;

        return {
            name: name.trim(),
            type: type,
            reps: parseInt(reps, 10),
            ...(type === 'weighted' && { weight: parseFloat(weight) })
        };
    }
} 