import { ThemeService } from '../services/theme.service.js';
import { ExercisePool, getBuiltinExerciseIdsSet, getOriginalBuiltinName } from '../models/exercise-pool.js';

const VERSION = 'v3.0.7';

export class SettingsModal {
    constructor(notifications, storage, backupManager, authService, authModal) {
        this.notifications = notifications;
        this.storage = storage;
        this.backupManager = backupManager;
        this.authService = authService;
        this.authModal = authModal;
        this.modal = null;
        this.activeTab = 'appearance';
        this.createModal();
        this.initializeEvents();
        this.initializeAuthStateListener();
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
                    <button class="settings-tab" data-tab="presets">📋 Пресеты</button>
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

                    <!-- TAB: EXERCISES — accordion -->
                    <div class="settings-pane hidden" data-pane="exercises">

                        <!-- Группа С весом -->
                        <div class="ex-accordion">
                            <button class="ex-accordion-header" data-group="weighted">
                                <span>🏋️ С весом</span>
                                <span class="ex-accordion-arrow">▼</span>
                            </button>
                            <div class="ex-accordion-body open" id="weighted-group">
                                <ul class="exercise-list" id="weighted-list"></ul>
                                <button class="add-exercise-btn" data-type="weighted">+ Добавить</button>
                            </div>
                        </div>

                        <!-- Группа Без веса -->
                        <div class="ex-accordion">
                            <button class="ex-accordion-header" data-group="bodyweight">
                                <span>🤸 Без веса</span>
                                <span class="ex-accordion-arrow">▼</span>
                            </button>
                            <div class="ex-accordion-body open" id="bodyweight-group">
                                <ul class="exercise-list" id="bodyweight-list"></ul>
                                <button class="add-exercise-btn" data-type="bodyweight">+ Добавить</button>
                            </div>
                        </div>

                        <div class="add-exercise-form hidden" id="add-exercise-form">
                            <h4 class="settings-section-title" style="margin-top:4px">Новое упражнение</h4>
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

                    <!-- TAB: PRESETS -->
                    <div class="settings-pane hidden" data-pane="presets">
                        <div class="presets-section" id="presets-main-view">
                            <ul class="exercise-list" id="settings-presets-list"></ul>
                            <div class="presets-create-wrap">
                                <button type="button" class="add-exercise-btn settings-create-preset-btn" id="create-preset-btn">+ Создать пресет</button>
                            </div>
                        </div>
                        <div class="add-exercise-form preset-editor-form hidden" id="preset-editor">
                            <input type="hidden" id="preset-edit-id" value="">
                            <h4 class="settings-section-title settings-section-title--center" id="preset-editor-title">Новый пресет</h4>
                            <input type="text" id="preset-name-input" placeholder="Название пресета" class="settings-input preset-name-input" maxlength="50">
                            <label class="preset-exercises-label">Выберите упражнения:</label>
                            <div id="preset-exercises-selection" class="preset-exercises-box"></div>
                            <div class="add-exercise-form-actions preset-editor-actions">
                                <button type="button" class="btn secondary-btn" id="cancel-preset-btn">Отмена</button>
                                <button type="button" class="btn primary-btn" id="save-preset-btn">Сохранить</button>
                            </div>
                        </div>
                    </div>

                    <!-- TAB: DATA -->
                    <div class="settings-pane hidden" data-pane="data">
                        <h3 class="settings-section-title">Резервная копия</h3>
                        <p class="settings-hint settings-auto-backup-hint">Автобекап в браузере (ключ <code>workouts_backup</code>): история тренировок и каталог (пресеты, кастомные упражнения, веса по умолчанию). Обновляется при изменениях истории и каталога.</p>
                        <div class="data-actions">
                            <button class="btn secondary-btn settings-full-btn" id="settings-backup-btn">📥 Резервировать историю</button>
                            <button class="btn secondary-btn settings-full-btn" id="settings-restore-btn">📤 Восстановить историю</button>
                            <button class="btn secondary-btn settings-full-btn" id="settings-restore-auto-btn">♻️ Восстановить из автобекапа</button>
                        </div>

                        <h3 class="settings-section-title" style="margin-top:20px">Опасная зона</h3>
                        <button class="btn danger-btn settings-full-btn" id="clearData">🗑️ Очистить всю историю</button>
                    </div>
                </div>

                <div class="settings-footer">
                    <div id="settingsAuthSection" class="settings-auth-section" style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 10px;">
                        <!-- Auth rendered here -->
                    </div>
                    <span class="version-label">${VERSION}</span>
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);
    }

    initializeEvents() {
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

        // Accordion toggle
        this.modal.querySelectorAll('.ex-accordion-header').forEach(hdr => {
            hdr.addEventListener('click', () => {
                const body = this.modal.querySelector(`#${hdr.dataset.group}-group`);
                const arrow = hdr.querySelector('.ex-accordion-arrow');
                const isOpen = body.classList.contains('open');
                body.classList.toggle('open', !isOpen);
                arrow.textContent = isOpen ? '▶' : '▼';
            });
        });

        // Presets tab events
        const createPresetBtn = this.modal.querySelector('#create-preset-btn');
        if (createPresetBtn) {
            createPresetBtn.addEventListener('click', () => this.showPresetEditor());
        }
        
        const cancelPresetBtn = this.modal.querySelector('#cancel-preset-btn');
        if (cancelPresetBtn) {
            cancelPresetBtn.addEventListener('click', () => {
                const editId = this.modal.querySelector('#preset-edit-id');
                if (editId) editId.value = '';
                this.modal.querySelector('#preset-editor').classList.add('hidden');
                this.modal.querySelector('#presets-main-view').classList.remove('hidden');
            });
        }
        
        const savePresetBtn = this.modal.querySelector('#save-preset-btn');
        if (savePresetBtn) {
            savePresetBtn.addEventListener('click', () => this.savePreset());
        }

        // Кнопки добавления упражнений
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
                if (restored) {
                    window.dispatchEvent(new CustomEvent('workoutHistoryUpdate'));
                    window.dispatchEvent(new CustomEvent('exerciseListUpdated'));
                    window.dispatchEvent(new CustomEvent('presetsUpdated'));
                }
            }
        };
        const restoreAutoBtn = this.modal.querySelector('#settings-restore-auto-btn');
        if (restoreAutoBtn) {
            restoreAutoBtn.onclick = async () => {
                if (!this.backupManager) return;
                const ok = await this.backupManager.restoreFromAutoBackup();
                if (ok) {
                    this.notifications.success('История восстановлена из автобекапа');
                } else {
                    this.notifications.error('Не удалось восстановить: нет автобекапа или данные повреждены');
                }
            };
        }

        const clearBtn = this.modal.querySelector('#clearData');
        clearBtn.onclick = () => this.clearData();
    }

    switchTab(tabId) {
        this.activeTab = tabId;
        this.modal.querySelectorAll('.settings-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
        this.modal.querySelectorAll('.settings-pane').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== tabId));
        if (tabId === 'exercises') this.loadExercises();
        if (tabId === 'presets') this.loadPresets();
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

        this.customExercises = customExercises;
        this.defaultWeights = defaultWeights;

        const customWeighted = ExercisePool.getExercisesByType('weighted', customExercises, defaultWeights);
        const customBodyweight = ExercisePool.getExercisesByType('bodyweight', customExercises, defaultWeights);

        this.renderList(
            'weighted-list',
            customWeighted,
            defaultWeights,
            true
        );
        this.renderList(
            'bodyweight-list',
            customBodyweight,
            defaultWeights,
            false
        );
    }

    renderList(listId, exercises, defaultWeights, isWeighted) {
        const ul = this.modal.querySelector(`#${listId}`);
        ul.innerHTML = '';

        const builtinIds = getBuiltinExerciseIdsSet();

        const renderItem = (ex) => {
            const li = document.createElement('li');
            li.className = 'exercise-list-item';

            const catalogName =
                this.customExercises.find(c => c.id === ex.id)?.name
                ?? getOriginalBuiltinName(ex.id)
                ?? ex.name;
            const displayName = ex.name || '';

            const savedWeight = defaultWeights[displayName] ?? defaultWeights[catalogName];
            const currentWeight = savedWeight ?? ex.defaultWeight ?? '';

            const isDouble = !!defaultWeights[`__double_${displayName}`];
            const currentEq = ex.equipment || (isWeighted ? 'free_weight' : 'bodyweight');

            li.innerHTML = `
                <span class="ex-name" title="Нажмите для редактирования">${displayName || '?'}</span>
                <input type="text" class="ex-name-edit hidden" value="${displayName}" maxlength="50">
                ${isWeighted ? `
                    <select class="ex-equipment-select" title="Оборудование" style="flex: 0 0 auto; width: 45px; padding: 0 4px; text-align: center;">
                        <option value="free_weight" ${currentEq === 'free_weight' ? 'selected' : ''} title="Гантели / свободные веса">🔩</option>
                        <option value="machine" ${currentEq === 'machine' ? 'selected' : ''}>⚙️</option>
                    </select>
                    <label class="ex-double-label" title="Удвоить тоннаж (гантели — вес на каждую руку)">
                        <input type="checkbox" class="ex-double-check"${isDouble ? ' checked' : ''}>
                        <span class="ex-double-icon">×2</span>
                    </label>
                    <input type="number" class="ex-weight-input" value="${currentWeight}" min="0" max="999" title="Вес по умолчанию">
                    <span class="ex-weight-unit">кг</span>
                ` : ''}
                <button type="button" class="ex-delete-btn" title="${builtinIds.has(ex.id) ? 'Встроенное упражнение нельзя удалить' : 'Удалить'}" ${builtinIds.has(ex.id) ? 'disabled aria-disabled="true"' : ''}>×</button>
            `;

            // ─── Inline name editing ───
            const nameSpan = li.querySelector('.ex-name');
            const nameInput = li.querySelector('.ex-name-edit');

            nameSpan.addEventListener('click', () => {
                nameSpan.classList.add('hidden');
                nameInput.classList.remove('hidden');
                nameInput.focus();
                nameInput.select();
            });

            const saveName = async () => {
                const newName = nameInput.value.trim();
                nameInput.classList.add('hidden');
                nameSpan.classList.remove('hidden');

                if (!newName || newName === displayName) return;

                const updated = { ...ex, name: newName };
                await this.storage.saveCustomExercise(updated);

                const propagated = await this.storage.propagateExerciseRename({
                    exerciseId: ex.id,
                    oldDisplayName: displayName,
                    newName,
                    oldCatalogName: catalogName
                });
                nameSpan.textContent = newName;
                if (!propagated) {
                    this.notifications.error('Имя сохранено, но не удалось обновить историю и пресеты. Попробуйте ещё раз.');
                } else {
                    this.notifications.success(`Переименовано в "${newName}"`);
                }
                window.dispatchEvent(new CustomEvent('exerciseListUpdated'));
                window.dispatchEvent(new CustomEvent('workoutHistoryUpdate'));
            };

            nameInput.addEventListener('blur', saveName);
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); nameInput.blur(); }
                if (e.key === 'Escape') { nameInput.value = displayName; nameInput.blur(); }
            });

            // ─── Weight editing ───
            if (isWeighted) {
                const weightInput = li.querySelector('.ex-weight-input');
                weightInput.addEventListener('change', async () => {
                    const w = parseFloat(weightInput.value);
                    if (!isNaN(w) && w >= 0) {
                        await this.storage.updateDefaultWeight(displayName, w);
                        this.notifications.success(`Вес для "${displayName}" обновлён`);
                    }
                });

                // ─── doubleTonnage toggle ───
                const doubleCheck = li.querySelector('.ex-double-check');
                if (doubleCheck) {
                    doubleCheck.addEventListener('change', async () => {
                        await this.storage.updateDefaultWeight(`__double_${displayName}`, doubleCheck.checked ? 1 : 0);
                        window.dispatchEvent(new CustomEvent('exerciseListUpdated'));
                    });
                }
            }

            // ─── Equipment change ───
            if (isWeighted) {
                const eqSelect = li.querySelector('.ex-equipment-select');
                if (eqSelect) {
                    eqSelect.addEventListener('change', async () => {
                        const updated = { ...ex, equipment: eqSelect.value };
                        await this.storage.saveCustomExercise(updated);
                        window.dispatchEvent(new CustomEvent('exerciseListUpdated'));
                    });
                }
            }

            // ─── Delete ───
            li.querySelector('.ex-delete-btn').addEventListener('click', async () => {
                if (builtinIds.has(ex.id)) return;

                // Проверяем, используется ли упражнение в активной тренировке
                const currentWorkout = await this.storage.getCurrentWorkout();
                const isInActiveWorkout = currentWorkout?.exercises?.some(
                    e => e.name === displayName
                );
                
                const message = isInActiveWorkout
                    ? `⚠️ Упражнение "${displayName}" используется в текущей тренировке! Всё равно удалить?`
                    : `Удалить "${displayName}"?`;
                
                const ok = confirm(message);
                if (ok) {
                    await this.storage.deleteCustomExercise(ex.firestoreId || ex.id);
                    this.notifications.success('Упражнение удалено');
                    this.loadExercises();
                    window.dispatchEvent(new CustomEvent('exerciseListUpdated'));
                }
            });

            ul.appendChild(li);
        };

        exercises.forEach(ex => renderItem(ex));
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
            this.notifications.success(`"${name}" добавлено`);
            this.hideAddForm();
            this.loadExercises();
            window.dispatchEvent(new CustomEvent('exerciseListUpdated'));
        } else {
            this.notifications.error('Не удалось сохранить');
        }
    }

    // ─── Data tab ──────────────────────────────────────────────

    async clearData() {
        const confirmed = confirm('Удалить ВСЮ историю тренировок? Это необратимо.');
        if (!confirmed) return;
        const workouts = await this.storage.getWorkoutHistory();
        for (const w of workouts) {
            await this.storage.deleteWorkoutFromHistory(w.id);
        }
        window.dispatchEvent(new CustomEvent('workoutHistoryUpdate'));
        this.notifications.success('История очищена');
    }

    // ─── Presets tab ────────────────────────────────────────────
    
    async loadPresets() {
        if (!this.storage.getPresets) return;
        const presets = await this.storage.getPresets();
        const list = this.modal.querySelector('#settings-presets-list');
        list.innerHTML = '';
        
        presets.forEach(preset => {
            const li = document.createElement('li');
            li.className = 'exercise-list-item settings-preset-row';
            li.innerHTML = `
                <span class="ex-name">${preset.name} <small class="preset-count">(${preset.exercises.length} упр.)</small></span>
                <div class="preset-row-actions">
                    <button type="button" class="preset-edit-btn" title="Редактировать">✎</button>
                    <button type="button" class="ex-delete-btn" title="Удалить">×</button>
                </div>
            `;
            li.querySelector('.preset-edit-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.showPresetEditor(preset);
            });
            li.querySelector('.ex-delete-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Удалить этот пресет?')) {
                    await this.storage.deletePreset(preset.id);
                    await this.loadPresets();
                    window.dispatchEvent(new CustomEvent('presetsUpdated'));
                }
            });
            list.appendChild(li);
        });
    }

    _isExerciseInPreset(ex, preset) {
        if (!preset?.exercises?.length) return false;
        const key = ex.id || ex.name;
        return preset.exercises.some(
            pe => (pe.exerciseId || pe.name) === key || pe.name === ex.name
        );
    }

    /** Иконка для строки пресета: без веса / тренажёр / свободные веса */
    _presetExerciseIcon(ex) {
        if (ex.type === 'bodyweight') return '🤸';
        if (ex.equipment === 'machine') return '⚙️';
        return '🔩';
    }

    /**
     * @param {object|null} preset — null: новый пресет; объект: редактирование
     */
    async showPresetEditor(preset = null) {
        this.modal.querySelector('#presets-main-view').classList.add('hidden');
        this.modal.querySelector('#preset-editor').classList.remove('hidden');

        const titleEl = this.modal.querySelector('#preset-editor-title');
        const editIdInput = this.modal.querySelector('#preset-edit-id');
        const nameInput = this.modal.querySelector('#preset-name-input');

        if (preset) {
            titleEl.textContent = 'Редактировать пресет';
            editIdInput.value = preset.id;
            nameInput.value = preset.name || '';
        } else {
            titleEl.textContent = 'Новый пресет';
            editIdInput.value = '';
            nameInput.value = '';
        }

        const container = this.modal.querySelector('#preset-exercises-selection');
        container.innerHTML = '';

        const [customExercises, defaultWeights] = await Promise.all([
            this.storage.getCustomExercises() || [],
            this.storage.getDefaultWeights()
        ]);
        const weighted = ExercisePool.getExercisesByType('weighted', customExercises, defaultWeights);
        const bodyweight = ExercisePool.getExercisesByType('bodyweight', customExercises, defaultWeights);

        const appendRows = (title, list) => {
            if (list.length === 0) return;
            const sub = document.createElement('div');
            sub.className = 'preset-ex-subtitle';
            sub.textContent = title;
            container.appendChild(sub);

            list.forEach(ex => {
                const label = document.createElement('label');
                label.className = 'preset-ex-row';
                const icon = document.createElement('span');
                icon.className = 'preset-ex-icon';
                icon.textContent = this._presetExerciseIcon(ex);
                icon.title = ex.type === 'bodyweight'
                    ? 'Без веса'
                    : ex.equipment === 'machine'
                        ? 'Тренажёр'
                        : 'Свободные веса';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'preset-ex-check';
                cb.value = ex.id || ex.name;
                cb.dataset.name = ex.name;
                if (this._isExerciseInPreset(ex, preset)) cb.checked = true;
                const span = document.createElement('span');
                span.className = 'preset-ex-name';
                span.textContent = ex.name;
                label.appendChild(icon);
                label.appendChild(cb);
                label.appendChild(span);
                container.appendChild(label);
            });
        };

        appendRows('С весом', weighted);
        appendRows('Без веса', bodyweight);
    }

    async savePreset() {
        const nameInput = this.modal.querySelector('#preset-name-input');
        const name = nameInput.value.trim();
        if (!name) {
            this.notifications.error('Введите название пресета');
            return;
        }

        const checkboxes = this.modal.querySelectorAll('.preset-ex-check:checked');
        if (checkboxes.length === 0) {
            this.notifications.error('Выберите хотя бы одно упражнение');
            return;
        }

        const exercises = Array.from(checkboxes).map(cb => ({
            exerciseId: cb.value,
            name: cb.dataset.name
        }));

        const existingId = this.modal.querySelector('#preset-edit-id')?.value?.trim();
        const preset = {
            id: existingId || `preset_${Date.now()}`,
            name,
            exercises
        };

        await this.storage.savePreset(preset);
        this.notifications.success(existingId ? 'Пресет обновлён' : 'Пресет сохранён');
        this.modal.querySelector('#preset-edit-id').value = '';
        this.modal.querySelector('#preset-editor').classList.add('hidden');
        this.modal.querySelector('#presets-main-view').classList.remove('hidden');

        await this.loadPresets();
        window.dispatchEvent(new CustomEvent('presetsUpdated'));
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

    initializeAuthStateListener() {
        if (!this.authService) return;
        
        this.authService.onAuthStateChanged(user => {
            const authSection = this.modal.querySelector('#settingsAuthSection');
            if (user) {
                authSection.innerHTML = `
                    <div class="user-email" style="color: var(--text-secondary); font-size: 14px;">${user.email}</div>
                    <button id="settingsLogoutBtn" class="btn delete-btn" style="padding: 6px 12px; font-size: 14px;">🚪 Выйти</button>
                `;
                this.modal.querySelector('#settingsLogoutBtn').onclick = async () => {
                    await this.authService.signOut();
                };
            } else {
                authSection.innerHTML = `
                    <div class="user-email" style="color: var(--text-secondary); font-size: 14px;">Гость</div>
                    <button id="settingsLoginBtn" class="btn" style="padding: 6px 12px; font-size: 14px;">🔑 Войти</button>
                `;
                this.modal.querySelector('#settingsLoginBtn').onclick = () => {
                    this.hide();
                    this.authModal.show();
                };
            }
        });
    }
}
