import { BaseComponent } from '../../components/base-component.js';
import { DOM_SELECTORS } from '../../constants/selectors.js';
import { DateFormatter } from '../../utils/date-formatter.js';
import { ExerciseCalculatorService } from '../../services/exercise-calculator.service.js';
import { BackupManager } from '../../services/backup-manager.js';

export class HistoryManager extends BaseComponent {
    constructor(notifications, storage) {
        super(notifications, storage);
        this.backupManager = new BackupManager(storage, notifications);
        this.elements = this.initializeElements();
        this.workoutStates = this.loadWorkoutStates();
        this.setupEventListeners();
    }

    initializeElements() {
        return {
            historyContainer: this.querySelector(DOM_SELECTORS.HISTORY.CONTAINER),
            toggleAllButton: this.querySelector(DOM_SELECTORS.HISTORY.TOGGLE_ALL),
            backupControls: this.createElement('div', 'backup-controls'),
            createBackupBtn: this.createElement('button', 'btn backup-btn'),
            restoreBackupBtn: this.createElement('button', 'btn backup-btn')
        };
    }

    setupEventListeners() {
        this.elements.toggleAllButton.addEventListener('click', () => {
            this.toggleAllWorkouts();
        });

        // Добавляем обработчики для кнопок бэкапа
        this.elements.createBackupBtn.addEventListener('click', async () => {
            await this.backupManager.createBackup();
        });

        this.elements.restoreBackupBtn.addEventListener('click', async () => {
            if (await this.backupManager.restoreFromBackup()) {
                this.displayWorkoutHistory(this.storage.getWorkoutHistory());
            }
        });
    }

    displayWorkoutHistory(workouts = []) {
        try {
            if (!this.elements.historyContainer) {
                console.error('History container not found');
                return;
            }

            this.elements.historyContainer.innerHTML = '';
            
            if (workouts.length === 0) {
                this.elements.historyContainer.innerHTML = '<p>История тренировок пуста</p>';
                return;
            }

            [...workouts].reverse().forEach(workout => {
                const workoutEntry = this.createWorkoutEntry(workout);
                if (workoutEntry) {
                    this.elements.historyContainer.appendChild(workoutEntry);
                }
            });

            // Добавляем контролы бэкапа после истории
            this.setupBackupControls();
            this.elements.historyContainer.appendChild(this.elements.backupControls);
        } catch (error) {
            console.error('Error in displayWorkoutHistory:', error);
        }
    }

    createWorkoutEntry(workout) {
        const workoutEntry = this.createElement('div', 'workout-entry');
        workoutEntry.dataset.id = workout.id;

        const totalReps = ExerciseCalculatorService.calculateWorkoutTotalReps(workout);
        const totalWeight = ExerciseCalculatorService.calculateWorkoutTotalWeight(workout);

        workoutEntry.appendChild(this.createSummaryTable(workout, totalReps, totalWeight));
        workoutEntry.appendChild(this.createDetailsSection(workout));

        const state = this.workoutStates[workout.id] || 'expanded';
        this.updateWorkoutEntryDisplay(workoutEntry, state);

        return workoutEntry;
    }

    createSummaryTable(workout, totalReps, totalWeight) {
        const summaryTable = this.createElement('table', 'summary-table');
        const summaryRow = this.createElement('tr');
        
        const formattedDate = DateFormatter.formatWorkoutDate(workout.date);
        const startTime = workout.startTime ? `${workout.startTime}` : '';

        summaryRow.innerHTML = `
            <td>${formattedDate} <small>${startTime}</small></td>
            <td>Σ повторов: ${totalReps} раз</td>
            <td>Тоннаж: ${totalWeight} кг</td>
            <td><button class="delete-btn" title="Удалить тренировку">×</button></td>
        `;

        this.setupSummaryTableListeners(summaryRow, workout);
        summaryTable.appendChild(summaryRow);
        
        return summaryTable;
    }

    setupSummaryTableListeners(summaryRow, workout) {
        // Обработчик для сворачивания/разворачивания
        summaryRow.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-btn')) {
                const workoutEntry = summaryRow.closest('.workout-entry');
                const newState = this.workoutStates[workout.id] === 'collapsed' ? 'expanded' : 'collapsed';
                this.workoutStates[workout.id] = newState;
                this.updateWorkoutEntryDisplay(workoutEntry, newState);
                this.saveWorkoutStates();
            }
        });

        // Обработчик для удаления
        const deleteButton = summaryRow.querySelector('.delete-btn');
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleWorkoutDeletion(workout);
        });
    }

    handleWorkoutDeletion(workout) {
        if (confirm('Вы уверены, что хотите удалить эту тренировку?')) {
            if (this.storage.deleteWorkoutFromHistory(workout.id)) {
                const workoutEntry = this.querySelector(`[data-id="${workout.id}"]`);
                workoutEntry.classList.add('removing');
                setTimeout(() => {
                    workoutEntry.remove();
                    if (!this.querySelector('.workout-entry')) {
                        this.elements.historyContainer.innerHTML = '<p>История тренировок пуста</p>';
                    }
                }, 300);
                this.notifications.success('Тренировка удалена');
            } else {
                this.notifications.error('Не удалось удалить тренировку');
            }
        }
    }

    // ... вспомогательные методы для работы с состоянием ...
    loadWorkoutStates() {
        return JSON.parse(localStorage.getItem('workoutStates') || '{}');
    }

    saveWorkoutStates() {
        localStorage.setItem('workoutStates', JSON.stringify(this.workoutStates));
    }

    updateWorkoutEntryDisplay(entry, state) {
        if (state === 'collapsed') {
            entry.classList.remove('expanded');
        } else {
            entry.classList.add('expanded');
        }
    }

    toggleAllWorkouts() {
        // Проверяем фактическое состояние элементов в DOM
        const entries = document.querySelectorAll('.workout-entry');
        const allExpanded = Array.from(entries).every(entry => 
            entry.classList.contains('expanded')
        );
        
        // Выбираем новое состояние на основе текущего
        const newState = allExpanded ? 'collapsed' : 'expanded';
    
        // Обновляем текст кнопки
        this.elements.toggleAllButton.textContent = allExpanded ? 'Развернуть всё' : 'Свернуть всё';
    
        // Применяем новое состояние
        entries.forEach(entry => {
            const workoutId = entry.dataset.id;
            this.workoutStates[workoutId] = newState;
            this.updateWorkoutEntryDisplay(entry, newState);
        });
    
        this.saveWorkoutStates();
    }

    createDetailsSection(workout) {
        const details = this.createElement('div', 'workout-details');
        
        // Добавляем секцию заметок, если они есть
        if (workout.notes) {
            const notesSection = this.createNotesSection(workout.notes);
            details.appendChild(notesSection);
        }
        
        const exercises = this.createElement('div', 'workout-exercises');

        if (workout.exercises && Array.isArray(workout.exercises)) {
            const exerciseTable = this.createElement('table', 'exercise-table');
            exerciseTable.className = 'exercise-table';

            const headerRow = this.createElement('tr');
            headerRow.innerHTML = `
                <th>Упражнение</th>
                <th>Повторы</th>
                <th>кг</th>
                <th>Σ кг</th>
                <th>Σ</th>
            `;
            exerciseTable.appendChild(headerRow);

            workout.exercises.forEach(exercise => {
                const exerciseRows = this.createExerciseElement(exercise);
                exerciseRows.forEach(row => exerciseTable.appendChild(row));
            });

            exercises.appendChild(exerciseTable);
        }

        details.appendChild(exercises);
        return details;
    }

    createNotesSection(notes) {
        const section = this.createElement('div', 'workout-notes');
        
        if (notes.energy || notes.intensity) {
            const ratings = this.createElement('div', 'notes-ratings');
            
            if (notes.energy) {
                ratings.innerHTML += `
                    <div class="rating-item">
                        <span>Энергия:</span>
                        <span class="rating-value">${notes.energy.score}/5</span>
                    </div>
                `;
            }
            
            if (notes.intensity) {
                ratings.innerHTML += `
                    <div class="rating-item">
                        <span>Интенсивность:</span>
                        <span class="rating-value">${notes.intensity.score}/5</span>
                    </div>
                `;
            }
            
            section.appendChild(ratings);
        }
        
        if (notes.text?.content) {
            const textNote = this.createElement('div', 'notes-text');
            textNote.textContent = notes.text.content;
            section.appendChild(textNote);
        }
        
        return section;
    }

    createExerciseElement(exercise) {
        const rows = [];

        const setsByWeight = exercise.sets.reduce((groups, set) => {
            const weight = set.weight || '—';
            if (!groups[weight]) {
                groups[weight] = [];
            }
            groups[weight].push(set.reps);
            return groups;
        }, {});

        const totalWeight = ExerciseCalculatorService.calculateTotalWeight(exercise);
        const totalReps = ExerciseCalculatorService.calculateTotalReps(exercise);

        const weightEntries = Object.entries(setsByWeight);

        weightEntries.forEach(([weight, reps], index) => {
            const row = this.createElement('tr');
            row.innerHTML = `
                ${index === 0 ? `<td rowspan="${weightEntries.length}">${exercise.name}</td>` : ''}
                <td>${reps.join(', ')}</td>
                <td>${weight}</td>
                ${index === 0 ? `<td rowspan="${weightEntries.length}">${weight === '—' ? '—' : totalWeight}</td>` : ''}
                ${index === 0 ? `<td rowspan="${weightEntries.length}">${totalReps}</td>` : ''}
            `;
            rows.push(row);
        });

        return rows;
    }

    setupBackupControls() {
        this.elements.createBackupBtn.textContent = 'Резервировать историю';
        this.elements.restoreBackupBtn.textContent = 'Восстановить историю';

        this.elements.backupControls.innerHTML = ''; // Очищаем на случай повторного вызова
        this.elements.backupControls.appendChild(this.elements.createBackupBtn);
        this.elements.backupControls.appendChild(this.elements.restoreBackupBtn);
    }
} 