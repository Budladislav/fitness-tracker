import { BaseComponent } from './base-component.js';
import { NOTES_CONFIG } from '../constants/notes-config.js';

console.log('BaseComponent:', BaseComponent);
console.log('NOTES_CONFIG:', NOTES_CONFIG);

export class NotesModal extends BaseComponent {
    constructor(notifications, storage) {
        super(notifications, storage);
        this.modal = this.createModal();
        document.body.appendChild(this.modal);
    }

    createModal() {
        const modal = this.createElement('div', 'notes-modal hidden');
        modal.innerHTML = `
            <div class="notes-modal-content">
                <div class="notes-modal-header">
                    <h3 class="modal-title">Заметки</h3>
                    <button class="delete-btn" title="Закрыть">×</button>
                </div>
                <div class="notes-ratings">
                    <div class="rating-group">
                        <div class="rating-header">
                            <div class="rating-title">
                                <div class="rating-label-wrapper">
                                    <label>${NOTES_CONFIG.ratings.energy.title}</label>
                                    <span class="rating-value">3</span>
                                </div>
                                <button class="info-btn" data-rating="energy">?</button>
                            </div>
                        </div>
                        <input type="range" class="rating-slider" id="energyRating" 
                               min="1" max="5" value="3">
                    </div>
                    <div class="rating-group">
                        <div class="rating-header">
                            <div class="rating-title">
                                <div class="rating-label-wrapper">
                                    <label>${NOTES_CONFIG.ratings.intensity.title}</label>
                                    <span class="rating-value">3</span>
                                </div>
                                <button class="info-btn" data-rating="intensity">?</button>
                            </div>
                        </div>
                        <input type="range" class="rating-slider" id="intensityRating" 
                               min="1" max="5" value="3">
                    </div>
                </div>
                <div class="notes-text">
                    <textarea placeholder="Добавьте заметку к тренировке..."></textarea>
                </div>
                <div class="notes-actions">
                    <button class="btn save-notes">Сохранить</button>
                </div>
            </div>
        `;

        this.setupModalListeners(modal);
        return modal;
    }

    setupModalListeners(modal) {
        // Закрытие по клику на крестик
        modal.querySelector('.delete-btn').addEventListener('click', () => this.hide());
        
        // Закрытие по клику вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hide();
        });

        // Обновляем обработчик слайдеров
        modal.querySelectorAll('.rating-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                // Находим значение в той же группе, что и слайдер
                const group = e.target.closest('.rating-group');
                const valueEl = group.querySelector('.rating-value');
                valueEl.textContent = e.target.value;
            });
        });

        // Обработка информационных кнопок
        modal.querySelectorAll('.info-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ratingType = e.target.dataset.rating;
                this.showRatingInfo(ratingType);
            });
        });
    }

    show(notes = null) {
        if (notes) {
            this.setValues(notes);
        }
        this.modal.classList.remove('hidden');
    }

    hide() {
        this.modal.classList.add('hidden');
    }

    getValues() {
        return {
            energy: { score: parseInt(this.modal.querySelector('#energyRating').value) },
            intensity: { score: parseInt(this.modal.querySelector('#intensityRating').value) },
            text: { content: this.modal.querySelector('textarea').value.trim() }
        };
    }

    setValues(notes) {
        if (notes.energy) {
            const energyGroup = this.modal.querySelector('#energyRating').closest('.rating-group');
            const energySlider = energyGroup.querySelector('.rating-slider');
            const energyValue = energyGroup.querySelector('.rating-value');
            
            energySlider.value = notes.energy.score;
            energyValue.textContent = notes.energy.score;
        }
        
        if (notes.intensity) {
            const intensityGroup = this.modal.querySelector('#intensityRating').closest('.rating-group');
            const intensitySlider = intensityGroup.querySelector('.rating-slider');
            const intensityValue = intensityGroup.querySelector('.rating-value');
            
            intensitySlider.value = notes.intensity.score;
            intensityValue.textContent = notes.intensity.score;
        }
        
        if (notes.text) {
            this.modal.querySelector('textarea').value = notes.text.content;
        }
    }

    showRatingInfo(ratingType) {
        const descriptions = NOTES_CONFIG.ratings[ratingType].description;
        const content = Object.entries(descriptions)
            .map(([score, desc]) => `<p><strong>${score}:</strong> ${desc}</p>`)
            .join('');
            
        // Создаем и добавляем информационное окно
        const infoModal = document.createElement('div');
        infoModal.className = 'rating-info-modal';
        infoModal.innerHTML = `
            <div class="rating-info-content">
                <div class="rating-info-header">
                    <h4>${NOTES_CONFIG.ratings[ratingType].title}</h4>
                    <button class="delete-btn" title="Закрыть">×</button>
                </div>
                <div class="rating-info-body">
                    ${content}
                </div>
            </div>
        `;

        // Добавляем обработчики
        const closeBtn = infoModal.querySelector('.delete-btn');
        closeBtn.addEventListener('click', () => infoModal.remove());

        // Закрытие по клику вне окна
        infoModal.addEventListener('click', (e) => {
            if (e.target === infoModal) infoModal.remove();
        });

        document.body.appendChild(infoModal);
    }
} 