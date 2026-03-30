import { BaseComponent } from './base-component.js';

export class SettingsModal extends BaseComponent {
    constructor(notifications, storage) {
        super();
        this.notifications = notifications;
        this.storage = storage;
        this.createModal();
        this.initializeEvents();
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal settings-modal hidden';
        this.modal.innerHTML = `
            <div class="modal-content">
                <button class="close-btn">×</button>
                <h2>Настройки</h2>
                
                <div class="settings-group">
                    <h3>Общие</h3>
                    <div class="setting-item">
                        <span>Единицы веса</span>
                        <select id="weightUnit">
                            <option value="kg">кг</option>
                            <option value="lb">lbs</option>
                        </select>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Данные</h3>
                    <button id="exportData" class="btn secondary-btn">Экспорт в JSON</button>
                    <button id="importData" class="btn secondary-btn">Импорт из JSON</button>
                    <input type="file" id="importFile" hidden accept=".json">
                    <button id="clearData" class="btn danger-btn">Очистить историю</button>
                </div>

                <div class="settings-footer">
                    <p class="version">Версия 2.0.1</p>
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);
    }

    initializeEvents() {
        const closeBtn = this.modal.querySelector('.close-btn');
        const exportBtn = this.modal.querySelector('#exportData');
        const importBtn = this.modal.querySelector('#importData');
        const importFile = this.modal.querySelector('#importFile');
        const clearBtn = this.modal.querySelector('#clearData');

        closeBtn.onclick = () => this.hide();

        exportBtn.onclick = async () => {
            const history = await this.storage.get('workout_history') || [];
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `workout_history_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            this.notifications.success('Данные экспортированы');
        };

        importBtn.onclick = () => importFile.click();

        importFile.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (Array.isArray(data)) {
                        await this.storage.set('workout_history', data);
                        window.location.reload(); // Перезагрузка для обновления UI
                    } else {
                        throw new Error('Неверный формат файла');
                    }
                } catch (err) {
                    this.notifications.error('Ошибка импорта: ' + err.message);
                }
            };
            reader.readAsText(file);
        };

        clearBtn.onclick = async () => {
            const confirmed = confirm('Вы уверены, что хотите УДАЛИТЬ ВСЮ историю тренировок? Это действие необратимо.');
            if (confirmed) {
                await this.storage.clear();
                window.location.reload();
            }
        };
    }

    show() {
        this.modal.classList.remove('hidden');
    }

    hide() {
        this.modal.classList.add('hidden');
    }
}
