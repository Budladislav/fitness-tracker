export const NOTES_CONFIG = {
    ratings: {
        energy: {
            title: 'Энергия/Настрой',
            shortDescription: 'Оцените уровень сил, восстановления и эмоциональной готовности к тренировке',
            description: {
                1: 'Полное отсутствие сил, нежелание тренироваться',
                2: 'Низкий тонус и настрой, тренировка «через силу»',
                3: 'Средний уровень: нет особого энтузиазма, но и сильной усталости нет',
                4: 'Хорошая энергия, настроение позитивное, тренировку выполняете охотно',
                5: 'Полный «запас» сил и мотивации, бодрость и желание выкладываться'
            }
        },
        intensity: {
            title: 'Интенсивность',
            shortDescription: 'Оцените субъективную тяжесть и насколько вы работали на пределе (RPE)',
            description: {
                1: 'Очень легко, практически не чувствуется усталости',
                2: 'Лёгкая нагрузка, немного вспотели, но не устали',
                3: 'Умеренно: пришлось напрячься, однако сил хватало',
                4: 'Трудно, ближе к отказу в заключительных подходах',
                5: 'Максимально тяжело, работали на пределе возможного'
            }
        }
    }
}; 