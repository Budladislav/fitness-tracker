document.addEventListener('DOMContentLoaded', () => {
    const exerciseType = document.getElementById('exerciseType');
    const repsInput = document.getElementById('repsInput');
    const weightInput = document.getElementById('weightInput');
    const exerciseLog = document.getElementById('exerciseLog');
    const workoutForm = document.getElementById('workoutForm');
    const startWorkoutSection = document.getElementById('startWorkoutSection');
    let currentWorkoutDate = null;

    // Обработчик изменения типа упражнения
    exerciseType.addEventListener('change', () => {
        if (exerciseType.value === 'bodyweight') {
            repsInput.classList.remove('hidden');
            weightInput.classList.add('hidden');
        } else {
            repsInput.classList.remove('hidden');
            weightInput.classList.remove('hidden');
        }
    });

    // Обработчик добавления упражнения в лог
    document.getElementById('addExercise').addEventListener('click', () => {
        const name = document.getElementById('exerciseName').value;
        const reps = document.getElementById('exerciseReps').value;
        const weight = document.getElementById('exerciseWeight').value;
        
        if (!name) {
            alert('Введите название упражнения');
            return;
        }
        
        if (!reps) {
            alert('Введите количество повторений');
            return;
        }
        
        const exercise = {
            type: exerciseType.value,
            name: name,
            reps: reps,
            weight: weight
        };
        
        addExerciseToLog(exercise);
        clearInputs();
    });

    // Функция добавления упражнения в лог
    function addExerciseToLog(exercise) {
        const item = document.createElement('div');
        item.className = 'exercise-item';
        item.dataset.exercise = JSON.stringify(exercise);
        
        let details = `${exercise.name} - `;
        if (exercise.type === 'bodyweight') {
            details += `${exercise.reps} повторений`;
        } else {
            details += `${exercise.reps} повторений × ${exercise.weight} кг`;
        }
        
        item.textContent = details;
        exerciseLog.appendChild(item);
    }

    // Обработчик начала тренировки
    document.getElementById('startWorkout').addEventListener('click', () => {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const currentDate = `${day}.${month}.${year}`;
        
        // Сохраняем дату в элемент
        document.getElementById('workoutDate').textContent = currentDate;
        document.getElementById('workoutDateContainer').classList.remove('hidden');
        document.getElementById('startWorkoutSection').classList.add('hidden');
        document.getElementById('workoutForm').classList.remove('hidden');

        // Сохраняем в sessionStorage
        sessionStorage.setItem('currentWorkout', JSON.stringify({
            date: currentDate,
            exercises: []
        }));
    });

    // Обработчик сохранения тренировки
    document.getElementById('saveWorkout').addEventListener('click', () => {
        const exercises = Array.from(exerciseLog.children).map(item => {
            return JSON.parse(item.dataset.exercise);
        });
        
        if (exercises.length === 0) {
            alert('Добавьте хотя бы одно упражнение!');
            return;
        }

        // Получаем текущую тренировку из sessionStorage
        const currentWorkout = JSON.parse(sessionStorage.getItem('currentWorkout') || '{}');
        
        if (!currentWorkout.date) {
            alert('Ошибка: дата тренировки не найдена!');
            return;
        }

        const savedWorkouts = JSON.parse(localStorage.getItem('exercises') || '[]');
        savedWorkouts.push({
            date: currentWorkout.date,
            exercises: exercises
        });
        
        localStorage.setItem('exercises', JSON.stringify(savedWorkouts));
        sessionStorage.removeItem('currentWorkout');
        
        exerciseLog.innerHTML = '';
        document.getElementById('workoutForm').classList.add('hidden');
        document.getElementById('workoutDateContainer').classList.add('hidden');
        document.getElementById('startWorkoutSection').classList.remove('hidden');
        
        displayWorkoutHistory();
        alert('Тренировка сохранена!');
    });

    // Функция очистки полей ввода
    function clearInputs() {
        document.getElementById('exerciseName').value = '';
        document.getElementById('exerciseReps').value = '';
        document.getElementById('exerciseWeight').value = '';
    }

    // Функция отображения истории
    function displayWorkoutHistory() {
        const historyContainer = document.getElementById('workoutHistory');
        const savedWorkouts = JSON.parse(localStorage.getItem('exercises') || '[]');
        
        historyContainer.innerHTML = '';
        
        if (savedWorkouts.length === 0) {
            historyContainer.innerHTML = '<p>История тренировок пуста</p>';
            return;
        }

        // Добавим отладочный вывод
        console.log('Сохраненные тренировки:', savedWorkouts);

        [...savedWorkouts].reverse().forEach(workout => {
            console.log('Обработка тренировки:', workout); // Отладочный вывод

            const workoutEntry = document.createElement('div');
            workoutEntry.className = 'workout-entry';
            
            const date = document.createElement('div');
            date.className = 'workout-date';
            date.textContent = `Тренировка от ${workout.date || 'неизвестной даты'}`;
            
            const exercises = document.createElement('div');
            exercises.className = 'workout-exercises';
            
            if (workout.exercises && Array.isArray(workout.exercises)) {
                workout.exercises.forEach(exercise => {
                    if (exercise && exercise.name) {
                        const exerciseDiv = document.createElement('div');
                        if (exercise.type === 'bodyweight') {
                            exerciseDiv.textContent = `${exercise.name} - ${exercise.reps} повторений`;
                        } else {
                            exerciseDiv.textContent = `${exercise.name} - ${exercise.reps} повторений × ${exercise.weight} кг`;
                        }
                        exercises.appendChild(exerciseDiv);
                    }
                });
            }
            
            workoutEntry.appendChild(date);
            workoutEntry.appendChild(exercises);
            historyContainer.appendChild(workoutEntry);
        });
    }

    // Инициализация при загрузке страницы
    displayWorkoutHistory();
}); 