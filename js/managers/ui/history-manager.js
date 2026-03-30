import { BaseComponent } from '../../components/base-component.js';
import { DOM_SELECTORS } from '../../constants/selectors.js';
import { DateFormatter } from '../../utils/date-formatter.js';
import { ExerciseCalculatorService } from '../../services/exercise-calculator.service.js';
import { BackupManager } from '../../services/backup-manager.js';
import { NotesModal } from '../../components/notes-modal.js';
import { DateGrouping } from '../../utils/date-grouping.js';
import { StorageFactory } from '../../services/storage/storage.factory.js';

export class HistoryManager extends BaseComponent {
    /**
     * @param {NotificationManager} notifications - Менеджер уведомлений
     * @param {StorageInterface} storage - Менеджер хранилища
     * @param {NotesModal} notesModal - Модальное окно заметок
     */
    constructor(notifications, storage, notesModal) {
        super(notifications, storage);
        this.notesModal = notesModal;
        this.backupManager = new BackupManager(storage, this);
        this.backupManager.notifications = notifications;
        this.elements = this.initializeElements();
        this.workoutStates = this.loadWorkoutStates();
        this.setupEventListeners();
    }

    initializeElements() {
        return {
            historyContainer: this.querySelector(DOM_SELECTORS.HISTORY.CONTAINER),
            toggleAllButton: this.querySelector(DOM_SELECTORS.HISTORY.TOGGLE_ALL)
        };
    }

    setupEventListeners() {
        this.elements.toggleAllButton.addEventListener('click', () => {
            this.toggleAllWorkouts();
        });
    }

    displayWorkoutHistory(workouts = []) {
        try {
            this.elements.historyContainer.innerHTML = '';

            if (!workouts || workouts.length === 0) {
                this.elements.historyContainer.innerHTML = '<p>История тренировок пуста</p>';
                return;
            }

            const currentYear = new Date().getFullYear();

            // Разбиваем недели на этот / прошлые года
            const currentYearWorkouts = workouts.filter(w => new Date(w.date).getFullYear() === currentYear);
            const pastYearWorkouts   = workouts.filter(w => new Date(w.date).getFullYear() <  currentYear);

            // Рендерим текущий год
            if (currentYearWorkouts.length > 0) {
                this._renderWeekGroups(currentYearWorkouts, this.elements.historyContainer);
            }

            // Рендерим сворачивающийся блок прошлых лет
            if (pastYearWorkouts.length > 0) {
                const archive = document.createElement('div');
                archive.className = 'history-archive';

                const archiveToggle = document.createElement('button');
                archiveToggle.className = 'history-archive-toggle';
                archiveToggle.id = 'historyArchiveToggle';
                archiveToggle.textContent = `▶ Архив (${pastYearWorkouts.length} трен. за ${new Set(pastYearWorkouts.map(w => new Date(w.date).getFullYear())).size} л.)`;

                const archiveBody = document.createElement('div');
                archiveBody.className = 'history-archive-body';
                archiveBody.id = 'historyArchiveBody';

                archiveToggle.addEventListener('click', () => {
                    const isOpen = archiveBody.classList.toggle('open');
                    archiveToggle.textContent = isOpen
                        ? `▼ Архив (${pastYearWorkouts.length} трен. за ${new Set(pastYearWorkouts.map(w => new Date(w.date).getFullYear())).size} л.)`
                        : `▶ Архив (${pastYearWorkouts.length} трен. за ${new Set(pastYearWorkouts.map(w => new Date(w.date).getFullYear())).size} л.)`;
                });

                this._renderWeekGroups(pastYearWorkouts, archiveBody);

                archive.appendChild(archiveToggle);
                archive.appendChild(archiveBody);
                this.elements.historyContainer.appendChild(archive);
            }

        } catch (error) {
            console.error('Error in displayWorkoutHistory:', error);
        }
    }

    _renderWeekGroups(workouts, container) {
        const weekGroups = DateGrouping.getWeekBoundaries(workouts);
        const sortedGroups = weekGroups.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.weekNumber - a.weekNumber;
        });

        sortedGroups.forEach(group => {
            const weekGroupElement = this.createElement('div', 'week-group');

            const label = this.createElement('div', 'group-label');
            label.textContent = `Неделя ${group.weekNumber}, ${group.count} трен.`;
            weekGroupElement.appendChild(label);

            const weekWorkouts = group.workouts.sort((a, b) => {
                const dateA = new Date(a.date), dateB = new Date(b.date);
                if (dateA.getTime() === dateB.getTime()) {
                    return (b.startTime || '00:00').localeCompare(a.startTime || '00:00');
                }
                return dateB - dateA;
            });

            weekWorkouts.forEach(workout => {
                const workoutEntry = this.createWorkoutEntry(workout);
                if (workoutEntry) weekGroupElement.appendChild(workoutEntry);
            });

            container.appendChild(weekGroupElement);
        });
    }

    createWorkoutEntry(workout) {
        const workoutEntry = this.createElement('div', 'workout-entry');
        workoutEntry.dataset.id = workout.id;
        workoutEntry.dataset.date = workout.date; // Добавляем дату как атрибут

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
            <td>Тоннаж: ${Math.round(totalWeight)} кг</td>
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
            this.handleWorkoutDeletion(workout.id);
        });
    }

    async handleWorkoutDeletion(workoutId) {
        const confirmed = await this.notifications.confirmModal.show(
            'Вы уверены, что хотите удалить тренировку?'
        );
        
        if (!confirmed) return;
        
        const success = await this.storage.deleteWorkoutFromHistory(workoutId);
        
        if (success) {
            // Находим элемент тренировки
            const workoutEntry = this.elements.historyContainer.querySelector(`[data-id="${workoutId}"]`);
            if (workoutEntry) {
                // Находим родительскую группу
                const weekGroup = workoutEntry.closest('.week-group');
                
                // Удаляем элемент тренировки
                workoutEntry.remove();
                
                // Проверяем, остались ли тренировки в группе
                if (weekGroup) {
                    const remainingWorkouts = weekGroup.querySelectorAll('.workout-entry');
                    if (remainingWorkouts.length === 0) {
                        weekGroup.remove(); // Удаляем пустую группу
                    } else {
                        // Обновляем счетчик тренировок в группе
                        const label = weekGroup.querySelector('.group-label');
                        if (label) {
                            const text = label.textContent;
                            const newCount = remainingWorkouts.length;
                            label.textContent = text.replace(/\d+ трен./, `${newCount} трен.`);
                        }
                    }
                }
                
                // Проверяем, остались ли вообще тренировки
                const remainingGroups = this.elements.historyContainer.querySelectorAll('.week-group');
                if (remainingGroups.length === 0) {
                    this.elements.historyContainer.innerHTML = '<p>История тренировок пуста</p>';
                    // Добавляем контролы бэкапа обратно
                    this.setupBackupControls();
                    this.elements.historyContainer.appendChild(this.elements.backupControls);
                }
                
                this.notifications.success('Тренировка удалена');
            }
        } else {
            this.notifications.error('Не удалось удалить тренировку');
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
        // Включаем все .workout-entry вне и внутри архива (open)
        const archiveBody = document.getElementById('historyArchiveBody');
        const archiveOpen  = archiveBody && archiveBody.classList.contains('open');
        const entries = document.querySelectorAll(
            archiveOpen ? '.workout-entry' : '#workoutHistory > .week-group .workout-entry'
        );
        const allExpanded = Array.from(entries).every(e => e.classList.contains('expanded'));
        const newState = allExpanded ? 'collapsed' : 'expanded';

        this.elements.toggleAllButton.textContent = allExpanded ? 'Развернуть всё' : 'Свернуть всё';

        entries.forEach(entry => {
            const workoutId = entry.dataset.id;
            this.workoutStates[workoutId] = newState;
            this.updateWorkoutEntryDisplay(entry, newState);
        });

        this.saveWorkoutStates();
    }

    createDetailsSection(workout) {
        const details = this.createElement('div', 'workout-details');
        
        // Сначала добавляем упражнения
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
        
        // Добавляем секцию заметок (существующие или пустые)
        const notesSection = workout.notes 
            ? this.createNotesSection(workout.notes, workout.id)
            : this.createEmptyNotesSection(workout.id);
        
        details.appendChild(notesSection);
        
        return details;
    }

    createEmptyNotesSection(workoutId) {
        const section = this.createElement('div', 'workout-notes editable');
        section.dataset.workoutId = workoutId;
        section.addEventListener('click', () => this.handleNotesEdit(workoutId, {}));
        return section;
    }

    createNotesSection(notes, workoutId) {
        const section = this.createElement('div', 'workout-notes editable');
        section.dataset.workoutId = workoutId;
        
        // Проверяем, есть ли какой-то контент
        const hasContent = notes.energy?.score || notes.intensity?.score || notes.text?.content;
        
        if (!hasContent) {
            // Если контента нет, добавляем текст-подсказку
            const hintText = this.createElement('span', 'notes-hint');
            hintText.textContent = 'Добавить заметку';
            section.appendChild(hintText);
            section.addEventListener('click', () => this.handleNotesEdit(workoutId, {}));
            return section;
        }
        
        // Если есть контент, добавляем его
        if (notes.energy?.score || notes.intensity?.score) {
            const ratings = this.createElement('div', 'notes-ratings');
            
            if (notes.energy?.score) {
                ratings.innerHTML += `
                    <div class="rating-item">
                        <span>Энергия:</span>
                        <span class="rating-value">${notes.energy.score}/5</span>
                    </div>
                `;
            }
            
            if (notes.intensity?.score) {
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

        section.addEventListener('click', () => this.handleNotesEdit(workoutId, notes));
        section.classList.add('editable');
        
        return section;
    }

    async handleNotesEdit(workoutId, notes) {
        try {
            // Получаем историю асинхронно
            const workouts = await this.storage.getWorkoutHistory();
            const workout = workouts.find(w => w.id === workoutId);
            
            if (!workout) {
                this.notifications.error('Тренировка не найдена');
                return;
            }

            this.notesModal.show(notes);

            const saveButton = this.notesModal.modal.querySelector('.save-notes');
            const oldHandler = saveButton.onclick;
            
            saveButton.onclick = async () => {
                const updatedNotes = this.notesModal.getValues();
                workout.notes = updatedNotes;
                
                // Обновляем тренировку через метод updateWorkout
                const success = await this.storage.updateWorkout(workout);
                
                if (success) {
                    // Получаем обновленную историю
                    const updatedWorkouts = await this.storage.getWorkoutHistory();
                    this.displayWorkoutHistory(updatedWorkouts);
                    this.notifications.success('Заметки обновлены');
                } else {
                    this.notifications.error('Ошибка при обновлении заметок');
                }
                
                this.notesModal.hide();
                saveButton.onclick = oldHandler;
            };
        } catch (error) {
            console.error('Error in handleNotesEdit:', error);
            this.notifications.error('Ошибка при редактировании заметок');
        }
    }

    createExerciseElement(exercise) {
        const rows = [];

        const weightGroups = [];
        let currentGroup = null;

        exercise.sets.forEach(set => {
            const weight = set.weight || '—';
            if (!currentGroup || currentGroup.weight !== weight) {
                currentGroup = { weight: weight, reps: [] };
                weightGroups.push(currentGroup);
            }
            currentGroup.reps.push(set.reps);
        });

        const totalWeight = ExerciseCalculatorService.calculateTotalWeight(exercise);
        const totalReps = ExerciseCalculatorService.calculateTotalReps(exercise);

        weightGroups.forEach((group, index) => {
            const row = this.createElement('tr');
            row.innerHTML = `
                ${index === 0 ? `<td rowspan="${weightGroups.length}">${exercise.name}</td>` : ''}
                <td>${group.reps.join(', ')}</td>
                <td>${group.weight}</td>
                ${index === 0 ? `<td rowspan="${weightGroups.length}">${group.weight === '—' ? '—' : totalWeight}</td>` : ''}
                ${index === 0 ? `<td rowspan="${weightGroups.length}">${totalReps}</td>` : ''}
            `;
            rows.push(row);
        });

        return rows;
    }
} 