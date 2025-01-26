/**
 * Модуль для импорта тренировок из текстового формата.
 * 
 * Как использовать импорт:
 * 1. Открыть консоль браузера (F12)
 * 2. Определить переменную rawWorkoutData с данными для импорта:
 *    rawWorkoutData = `
 *    4.09.24
 *    Жим (75) – 9, 6, 6
 *    Тяга (75) – 10, 10, 10
 *    Присяд (75) – 10, 10, 10
 *    
 *    7.09.24
 *    Жим (75) – 7, 7, 7
 *    Тяга (80) – 10, 10, 10
 *    Присяд (80) – 10, 10, 10
 *    `;
 * 3. Вызвать window.activateImport()
 * 4. Нажать появившуюся зеленую кнопку импорта
 * 
 * Формат данных:
 * - Каждая тренировка начинается с даты в формате DD.MM.YY
 * - Каждое упражнение на новой строке
 * - Формат строки упражнения: 
 *   "Название (вес) – повторения" или
 *   "Название – повторения" для упражнений без веса
 * 
 * Примеры форматов:
 * 1. Простой формат:
 *    Жим (80) – 10, 10, 10
 * 
 * 2. Изменение веса в подходах:
 *    Тяга (80) – 13; (85) – 13; (90) – 13
 * 
 * 3. Упражнения без веса:
 *    Подъем ног – 15, 17, 15
 * 
 * Поддерживаемые упражнения с весом:
 * - Жим
 * - Тяга
 * - Присяд
 * 
 * Все остальные упражнения считаются упражнениями без веса (bodyweight).
 * Подъем ног, Отжимания на кольцах, Отжимания на брусьях, Подтягивания прямым хватом, Подтягивания обратным хватом 
 */

import { StorageFactory } from '../services/storage/storage.factory.js';

export function parseWorkoutData(rawData) {
    const workouts = [];
    const lines = rawData.split('\n');
    let currentWorkout = null;

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Проверяем, является ли строка датой
        const dateMatch = line.match(/(\d{1,2})\.(\d{1,2})\.(\d{2})/);
        if (dateMatch) {
            if (currentWorkout) {
                workouts.push(currentWorkout);
            }
            const [_, day, month, year] = dateMatch;
            const date = `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            currentWorkout = {
                id: Date.now() + Math.random(),
                date,
                exercises: []
            };
            continue;
        }

        if (!currentWorkout) continue;

        // Парсинг упражнений
        const exerciseData = parseExerciseLine(line);
        if (exerciseData) {
            currentWorkout.exercises.push(exerciseData);
        }
    }

    if (currentWorkout) {
        workouts.push(currentWorkout);
    }

    return workouts;
}

function parseExerciseLine(line) {
    if (line.includes('НЕ СОВПАДАЕТ') || line.includes('?')) return null;

    const exerciseMatch = line.match(/^(.+?) – (.+)$/);
    if (!exerciseMatch) return null;

    let [_, exerciseName, setsData] = exerciseMatch;
    
    // Извлекаем вес из названия упражнения
    let initialWeight = null;
    const nameWeightMatch = exerciseName.match(/\((\d+)\)/);
    if (nameWeightMatch) {
        initialWeight = parseInt(nameWeightMatch[1]);
        exerciseName = exerciseName.replace(/\s*\(\d+\)\s*/, '').trim();
    }
    
    // Определяем тип упражнения
    const type = ['Тяга', 'Жим', 'Присяд'].includes(exerciseName) ? 'weighted' : 'bodyweight';
    
    // Парсим подходы и веса
    const sets = [];
    let currentWeight = initialWeight;
    
    // Разбиваем на группы по точке с запятой
    const groups = setsData.split(';').map(g => g.trim());
    
    for (const group of groups) {
        // Проверяем наличие нового веса в группе
        const weightMatch = group.match(/\((\d+)\)/);
        if (weightMatch && type === 'weighted') {
            currentWeight = parseInt(weightMatch[1]);
        }
        
        // Получаем повторения после тире или после веса
        let repsString = group.includes('–') ? 
            group.split('–')[1].trim() : 
            group.replace(/\(\d+\)\s*–?\s*/, '').trim();
        
        // Разбиваем повторения на отдельные подходы
        const reps = repsString.split(',').map(r => parseInt(r.trim()));
        
        // Добавляем каждый подход
        reps.forEach(rep => {
            if (!isNaN(rep)) {
                sets.push({
                    reps: rep,
                    weight: type === 'weighted' ? currentWeight : null
                });
            }
        });
    }

    return {
        name: exerciseName,
        type: type,
        sets: sets
    };
}

export function importWorkoutData(storage) {
    if (!storage) {
        throw new Error('Storage must be provided to importWorkoutData');
    }
    
    const parsedWorkouts = parseWorkoutData(rawWorkoutData);
    localStorage.removeItem('exercises');
    
    parsedWorkouts.forEach(workout => {
        storage.saveWorkoutToHistory(workout);
    });
    
    return parsedWorkouts.length;
} 