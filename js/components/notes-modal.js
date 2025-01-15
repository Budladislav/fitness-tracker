import { BaseComponent } from './base-component.js';
import { NOTES_CONFIG } from '../constants/notes-config.js';

export class NotesModal extends BaseComponent {
    constructor(notifications, storage) {
        super(notifications, storage);
        this.modal = this.createModal();
        document.body.appendChild(this.modal);
    }

    createModal() {
        const modal = document.createElement('div');
        modal.className = 'modal notes-modal hidden';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Заметки к тренировке</h3>
                    <button class="delete-btn" title="Закрыть">×</button>
                </div>
                <div class="modal-body">
                    <div class="ratings-section">
                        <div class="rating-group">
                            <div class="rating-header">
                                <div class="rating-title">
                                    <label>${NOTES_CONFIG.ratings.energy.title}</label>
                                    <span class="rating-value">-</span>
                                    <button class="reset-rating-btn" data-target="energyRating" title="Сбросить оценку">×</button>
                                </div>
                                <button class="info-btn" data-rating="energy">?</button>
                            </div>
                            <input type="range" class="rating-slider" id="energyRating" 
                                   min="1" max="5" value="3" data-touched="false">
                        </div>
                        <div class="rating-group">
                            <div class="rating-header">
                                <div class="rating-title">
                                    <label>${NOTES_CONFIG.ratings.intensity.title}</label>
                                    <span class="rating-value">-</span>
                                    <button class="reset-rating-btn" data-target="intensityRating" title="Сбросить оценку">×</button>
                                </div>
                                <button class="info-btn" data-rating="intensity">?</button>
                            </div>
                            <input type="range" class="rating-slider" id="intensityRating" 
                                   min="1" max="5" value="">
                        </div>
                    </div>
                    <div class="notes-text">
                        <textarea placeholder="Добавьте заметку к тренировке..."></textarea>
                    </div>
                    <div class="notes-actions">
                        <button class="btn save-notes">Сохранить</button>
                    </div>
                </div>
            </div>
        `;
        
        this.setupModalListeners(modal);
        return modal;
    }

    setupModalListeners(modal) {
        // Обработчик закрытия
        modal.querySelector('.delete-btn').onclick = () => this.hide();

        // Обработчики для слайдеров
        const sliders = modal.querySelectorAll('.rating-slider');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const group = e.target.closest('.rating-group');
                this.updateRatingDisplay(group, e.target.value);
            });
        });

        // Обработчики для кнопок информации
        const infoButtons = modal.querySelectorAll('.info-btn');
        infoButtons.forEach(button => {
            button.onclick = () => {
                const ratingType = button.dataset.rating;
                this.showRatingInfo(ratingType);
            };
        });

        // Обработчики для кнопок сброса
        const resetButtons = modal.querySelectorAll('.reset-rating-btn');
        resetButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetId = button.dataset.target;
                const slider = modal.querySelector(`#${targetId}`);
                const group = slider.closest('.rating-group');
                
                slider.value = '';
                slider.dataset.touched = 'false';
                this.updateRatingDisplay(group, null);
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
        this.resetValues();
    }

    getValues() {
        const energySlider = this.modal.querySelector('#energyRating');
        const intensitySlider = this.modal.querySelector('#intensityRating');
        const textArea = this.modal.querySelector('textarea');

        return {
            energy: energySlider.dataset.touched === 'true' ? { score: parseInt(energySlider.value) } : null,
            intensity: intensitySlider.dataset.touched === 'true' ? { score: parseInt(intensitySlider.value) } : null,
            text: textArea.value.trim() ? { content: textArea.value.trim() } : null
        };
    }

    setValues(notes) {
        this.currentNotes = notes;

        if (notes.energy?.score) {
            const energyGroup = this.modal.querySelector('#energyRating').closest('.rating-group');
            const energySlider = energyGroup.querySelector('.rating-slider');
            energySlider.value = notes.energy.score;
            this.updateRatingDisplay(energyGroup, notes.energy.score);
        }
        
        if (notes.intensity?.score) {
            const intensityGroup = this.modal.querySelector('#intensityRating').closest('.rating-group');
            const intensitySlider = intensityGroup.querySelector('.rating-slider');
            intensitySlider.value = notes.intensity.score;
            this.updateRatingDisplay(intensityGroup, notes.intensity.score);
        }
        
        if (notes.text?.content) {
            this.modal.querySelector('textarea').value = notes.text.content;
        }
    }

    showRatingInfo(ratingType) {
        const ratingConfig = NOTES_CONFIG.ratings[ratingType];
        const descriptions = ratingConfig.description;
        const content = Object.entries(descriptions)
            .map(([score, desc]) => `<p><strong>${score}:</strong> ${desc}</p>`)
            .join('');
            
        const infoModal = document.createElement('div');
        infoModal.className = 'rating-info-modal';
        infoModal.innerHTML = `
            <div class="rating-info-content">
                <div class="rating-info-header">
                    <h4>${ratingConfig.title}</h4>
                    <button class="delete-btn" title="Закрыть">×</button>
                </div>
                <div class="rating-info-description">
                    ${ratingConfig.shortDescription}
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

    resetValues() {
        this.currentNotes = null;
        const groups = this.modal.querySelectorAll('.rating-group');
        groups.forEach(group => {
            const slider = group.querySelector('.rating-slider');
            slider.value = 3;
            this.updateRatingDisplay(group, null);
        });

        this.modal.querySelector('textarea').value = '';
    }

    updateRatingDisplay(group, value) {
        const valueDisplay = group.querySelector('.rating-value');
        const resetBtn = group.querySelector('.reset-rating-btn');
        const slider = group.querySelector('.rating-slider');
        
        if (value) {
            valueDisplay.textContent = `${value}/5`;
            slider.dataset.touched = 'true';
            resetBtn.classList.add('active');
        } else {
            valueDisplay.textContent = '-';
            slider.dataset.touched = 'false';
            resetBtn.classList.remove('active');
        }
    }
} 