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
                    <h3>Заметки к тренировке</h3>
                    <button class="close-btn">×</button>
                </div>
                <div class="notes-ratings">
                    <div class="rating-group">
                        <div class="rating-header">
                            <label>${NOTES_CONFIG.ratings.energy.title}</label>
                            <button class="info-btn" data-rating="energy">?</button>
                        </div>
                        <input type="range" class="rating-slider" id="energyRating" 
                               min="1" max="5" value="3">
                        <div class="rating-value">3</div>
                    </div>
                    <div class="rating-group">
                        <div class="rating-header">
                            <label>${NOTES_CONFIG.ratings.intensity.title}</label>
                            <button class="info-btn" data-rating="intensity">?</button>
                        </div>
                        <input type="range" class="rating-slider" id="intensityRating" 
                               min="1" max="5" value="3">
                        <div class="rating-value">3</div>
                    </div>
                </div>
                <div class="notes-text">
                    <textarea placeholder="Добавьте заметку к тренировке..."></textarea>
                </div>
                <div class="notes-actions">
                    <button class="btn save-notes">Сохранить</button>
                    <button class="btn cancel-notes">Отмена</button>
                </div>
            </div>
        `;

        this.setupModalListeners(modal);
        return modal;
    }

    setupModalListeners(modal) {
        // Закрытие по клику на крестик
        modal.querySelector('.close-btn').addEventListener('click', () => this.hide());
        
        // Закрытие по клику вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hide();
        });

        // Обработка слайдеров
        modal.querySelectorAll('.rating-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                e.target.nextElementSibling.textContent = e.target.value;
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
            const energySlider = this.modal.querySelector('#energyRating');
            energySlider.value = notes.energy.score;
            energySlider.nextElementSibling.textContent = notes.energy.score;
        }
        if (notes.intensity) {
            const intensitySlider = this.modal.querySelector('#intensityRating');
            intensitySlider.value = notes.intensity.score;
            intensitySlider.nextElementSibling.textContent = notes.intensity.score;
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
            
        // Здесь можно использовать существующий NotificationManager 
        // или создать отдельное модальное окно для информации
        alert(content); // Временное решение
    }
} 