import { ThemeService } from '../services/theme.service.js';

export class SettingsModal {
    constructor(notifications, storage, backupManager) {
        this.notifications = notifications;
        this.storage = storage;
        this.backupManager = backupManager;
        this.modal = null;
        this.activeTab = 'appearance';
        this.createModal();
        this.initializeEvents();
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'settings-overlay hidden';
        this.modal.innerHTML = `
            <div class="settings-panel">
                <div class="settings-header">
                    <h2>Настройки</h2>
                    <button class="settings-close-btn" aria-label="Закрыть">×</button>
                </div>

                <nav class="settings-tabs">
                    <button class="settings-tab active" data-tab="appearance">🎨 Вид</button>
                    <button class="settings-tab" data-tab="exercises">🏋️ Упражнения</button>
                    <button class="settings-tab" data-tab="data">💾 Данные</button>
                </nav>

                <div class="settings-body">
                    <!-- TAB: APPEARANCE -->
                    <div class="settings-pane active" data-pane="appearance">
                        <h3 class="settings-section-title">Цветовая схема</h3>
                        <div class="theme-grid">
                            <button class="theme-btn" data-theme="blue" title="Синяя">
                                <span class="theme-swatch" style="background:#2196f3"></span>
                                <span>Синяя</span>
                            </button>
                            <button class="theme-btn" data-theme="green" title="Зелёная">
                                <span class="theme-swatch" style="background:#4caf50"></span>
                                <span>Зелёная</span>
                            </button>
                            <button class="theme-btn" data-theme="orange" title="Оранжевая">
                                <span class="theme-swatch" style="background:#ff9800"></span>
                                <span>Оранжевая</span>
                            </button>
                            <button class="theme-btn" data-theme="dark" title="Тёмная">
                                <span class="theme-swatch" style="background:#1e1e2e"></span>
                                <span>Тёмная</span>
                            </button>
                        </div>
                    </div>

                    <!-- TAB: EXERCISES -->
                    <div class="settings-pane hidden" data-pane="exercises">
                        <div class="exercises-columns">
                            <div class="exercises-col">
                                <h3 class="settings-section-title">С весом</h3>
                                <ul class="exercise-list" id="weighted-list"></ul>
                                <button class="add-exercise-btn" data-type="weighted">+ Добавить</button>
                            </div>
                            <div class="exercises-col">
                                <h3 class="settings-section-title">Без веса</h3>
                                <ul class="exercise-list" id="bodyweight-list"></ul>
                                <button class="add-exercise-btn" data-type="bodyweight">+ Добавить</button>
                            </div>
                        </div>

                        <div class="add-exercise-form hidden" id="add-exercise-form">
                            <h4 class="settings-section-title">Новое упражнение</h4>
                            <input type="text" id="new-exercise-name" placeholder="Название" class="settings-input" maxlength="50">
                            <input type="hidden" id="new-exercise-type" value="weighted">
                            <div class="add-exercise-weight" id="add-weight-field">
                                <label>Вес по умолчанию (кг)</label>
                                <input type="number" id="new-exercise-weight" class="settings-input" min="0" max="999" value="60">
                            </div>
                            <div class="add-exercise-form-actions">
                                <button class="btn secondary-btn" id="cancel-add-exercise">Отмена</button>
                                <button class="btn primary-btn" id="confirm-add-exercise">Добавить</button>
                            </div>
                        </div>
                    </div>

                    <!-- TAB: DATA -->
                    <div class="settings-pane hidden" data-pane="data">
                        <h3 class="settings-section-title">Резервная копия</h3>
                        <div class="data-actions">
                            <button class="btn secondary-btn settings-full-btn" id="settings-backup-btn">📥 Резервировать историю</button>
                            <button class="btn secondary-btn settings-full-btn" id="settings-restore-btn">📤 Восстановить историю</button>
                        </div>

                        <h3 class="settings-section-title" style="margin-top:20px">Экспорт / Импорт</h3>
                        <div class="data-actions">
                            <button class="btn secondary-btn settings-full-btn" id="exportData">⬇️ Экспорт в JSON</button>
                            <button class="btn secondary-btn settings-full-btn" id="importData">⬆️ Импорт из JSON</button>
                            <input type="file" id="importFile" hidden accept=".json">
                        </div>

                        <h3 class="settings-section-title" style="margin-top:20px">Опасная зона</h3>
                        <button class="btn danger-btn settings-full-btn" id="clearData">🗑️ Очистить всю историю</button>
                    </div>
                </div>

                <div class="settings-footer">
                    <span class="version-label">v2.1.1</span>
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);
    }

    initializeEvents() {
        // Закрытие
        this.modal.querySelector('.settings-close-btn').onclick = () => this.hide();
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });

        // Вкладки
        this.modal.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Темы
        this.modal.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                ThemeService.apply(btn.dataset.theme);
                this.highlightActiveTheme();
            });
        });

        // Упражнения — кнопки добавления
        this.modal.querySelectorAll('.add-exercise-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showAddForm(btn.dataset.type));
        });

        this.modal.querySelector('#cancel-add-exercise').onclick = () => this.hideAddForm();
        this.modal.querySelector('#confirm-add-exercise').onclick = () => this.addExercise();

        // Данные
        this.modal.querySelector('#settings-backup-btn').onclick = async () => {
            if (this.backupManager) await this.backupManager.createBackup();
        };
        this.modal.querySelector('#settings-restore-btn').onclick = async () => {
            if (this.backupManager) {
                const restored = await this.backupManager.restoreFromBackup();
                if (restored) window.dispatchEvent(new CustomEvent('workoutHistoryUpdate'));
            }
        };

        const exportBtn = this.modal.querySelector('#exportData');
        const importBtn = this.modal.querySelector('#importData');
        const importFile = this.modal.querySelector('#importFile');
        const clearBtn = this.modal.querySelector('#clearData');

        exportBtn.onclick = async () => this.exportData();
        importBtn.onclick = () => importFile.click();
        importFile.onchange = (e) => this.importData(e);
        clearBtn.onclick = () => this.clearData();
    }

    switchTab(tabId) {
        this.activeTab = tabId;
        this.modal.querySelectorAll('.settings-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
        this.modal.querySelectorAll('.settings-pane').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== tabId));

        if (tabId === 'exercises') this.loadExercises();
    }

    highlightActiveTheme() {
        const current = ThemeService.getCurrent();
        this.modal.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === current);
        });
    }

    // ─── Exercises tab ─────────────────────────────────────────

    async loadExercises() {
        const [customExercises, defaultWeights] = await Promise.all([
            this.storage.getCustomExercises(),
            this.storage.getDefaultWeights()
        ]);

        const { ExercisePool } = await import('../models/exercise-pool.js');
        const defaultWeighted = ExercisePool.getExercisesByType('weighted');
        const defaultBodyweight = ExercisePool.getExercisesByType('bodyweight');

        this.renderList('weighted-list', defaultWeighted, customExercises.filter(e => e.type === 'weighted'), defaultWeights, true);
        this.renderList('bodyweight-list', defaultBodyweight, customExercises.filter(e => e.type === 'bodyweight'), defaultWeights, false);
    }

    renderList(listId, defaults, customs, defaultWeights, isWeighted) {
        const ul = this.modal.querySelector(`#${listId}`);
        ul.innerHTML = '';

        const renderItem = (ex, isCustom) => {
            const li = document.createElement('li');
            li.className = 'exercise-list-item';
            const savedWeight = defaultWeights[ex.name];
            const currentWeight = savedWeight ?? ex.defaultWeight ?? '';

            li.innerHTML = `
                <span class="ex-name">${ex.name}</span>
                ${isWeighted ? `
                    <input type="number" class="ex-weight-input" value="${currentWeight}" min="0" max="999" data-name="${ex.name}" title="Вес по умолчанию">
                    <span class="ex-weight-unit">кг</span>
                ` : ''}
                ${isCustom ? `<button class="ex-delete-btn" data-id="${ex.id}" title="Удалить">×</button>` : '<span class="ex-spacer"></span>'}
            `;

            if (isWeighted) {
                li.querySelector('.ex-weight-input').addEventListener('change', async (e) => {
                    const w = parseFloat(e.target.value);
                    if (!isNaN(w) && w >= 0) {
                        await this.storage.updateDefaultWeight(ex.name, w);
                        this.notifications.success(`Вес для "${ex.name}" обновлён`);
                    }
                });
            }

            if (isCustom) {
                li.querySelector('.ex-delete-btn').addEventListener('click', async () => {
                    const ok = confirm(`Удалить упражнение "${ex.name}"?`);
                    if (ok) {
                        await this.storage.deleteCustomExercise(ex.id);
                        this.notifications.success('Упражнение удалено');
                        this.loadExercises();
                    }
                });
            }

            ul.appendChild(li);
        };

        defaults.forEach(ex => renderItem(ex, false));
        customs.forEach(ex => renderItem(ex, true));
    }

    showAddForm(type) {
        const form = this.modal.querySelector('#add-exercise-form');
        this.modal.querySelector('#new-exercise-type').value = type;
        this.modal.querySelector('#new-exercise-name').value = '';
        this.modal.querySelector('#add-weight-field').classList.toggle('hidden', type !== 'weighted');
        form.classList.remove('hidden');
        this.modal.querySelector('#new-exercise-name').focus();
    }

    hideAddForm() {
        this.modal.querySelector('#add-exercise-form').classList.add('hidden');
    }

    async addExercise() {
        const name = this.modal.querySelector('#new-exercise-name').value.trim();
        const type = this.modal.querySelector('#new-exercise-type').value;
        const weight = parseFloat(this.modal.querySelector('#new-exercise-weight').value) || 0;

        if (!name) {
            this.notifications.error('Введите название упражнения');
            return;
        }

        const exercise = {
            id: `custom_${Date.now()}`,
            name,
            type,
            ...(type === 'weighted' ? { defaultWeight: weight } : {})
        };

        const ok = await this.storage.saveCustomExercise(exercise);
        if (ok) {
            this.notifications.success(`Упражнение "${name}" добавлено`);
            this.hideAddForm();
            this.loadExercises();
            // Обновляем селектор упражнений в форме тренировки
            window.dispatchEvent(new CustomEvent('exerciseListUpdated'));
        } else {
            this.notifications.error('Не удалось сохранить упражнение');
        }
    }

    // ─── Data tab ──────────────────────────────────────────────

    async exportData() {
        const history = await this.storage.getWorkoutHistory();
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
        const a = document.createElement('a');
        a.setAttribute('href', dataStr);
        a.setAttribute('download', `workout_history_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(a);
        a.click();
        a.remove();
        this.notifications.success('Данные экспортированы');
    }

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (!Array.isArray(data)) throw new Error('Неверный формат файла');
                // Сохраняем каждую тренировку
                for (const workout of data) {
                    await this.storage.saveWorkoutToHistory(workout);
                }
                this.notifications.success(`Импортировано ${data.length} тренировок`);
                window.dispatchEvent(new CustomEvent('workoutHistoryUpdate'));
            } catch (err) {
                this.notifications.error('Ошибка импорта: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    async clearData() {
        const confirmed = confirm('Вы уверены, что хотите УДАЛИТЬ ВСЮ историю тренировок? Это действие необратимо.');
        if (!confirmed) return;
        const workouts = await this.storage.getWorkoutHistory();
        for (const w of workouts) {
            await this.storage.deleteWorkoutFromHistory(w.id);
        }
        window.dispatchEvent(new CustomEvent('workoutHistoryUpdate'));
        this.notifications.success('История очищена');
    }

    // ─── Show / Hide ────────────────────────────────────────────

    show() {
        this.modal.classList.remove('hidden');
        this.highlightActiveTheme();
        if (this.activeTab === 'exercises') this.loadExercises();
    }

    hide() {
        this.modal.classList.add('hidden');
    }
}
