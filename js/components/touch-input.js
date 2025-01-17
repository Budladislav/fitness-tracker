export class TouchInput {
    constructor(input, options = {}) {
        this.input = input;
        this.options = {
            step: options.step || 1,
            maxChange: options.maxChange || 10,
            minValue: options.minValue || 0,
            initialValue: options.initialValue || 10,
            ...options
        };

        this.isScrolling = false;
        this.touchStartY = 0;
        this.currentValue = parseFloat(this.input.value) || this.options.initialValue;
        this.longPressDelay = 200;
        this.optionHeight = 40;

        this.createPreview();
        this.setupEventListeners();
    }

    createPreview() {
        this.preview = document.createElement('div');
        this.preview.className = 'touch-preview';
        this.preview.innerHTML = `
            <div class="preview-content">
                <div class="preview-values"></div>
                <div class="preview-current"></div>
            </div>
        `;
        document.body.appendChild(this.preview);
    }

    updatePreview() {
        const previewCurrent = this.preview.querySelector('.preview-current');
        const previewValues = this.preview.querySelector('.preview-values');
        
        // Генерируем список значений вокруг текущего
        const currentValue = parseFloat(this.input.value);
        const values = [];
        for (let i = -5; i <= 5; i++) {
            values.push(currentValue + (i * this.options.step));
        }

        previewValues.innerHTML = values
            .map(value => `<div class="preview-option ${value === currentValue ? 'selected' : ''}">${value}</div>`)
            .join('');
        previewCurrent.textContent = currentValue;
    }

    showPreview() {
        this.updatePreview();
        this.preview.classList.add('active');
        
        // Позиционируем превью над инпутом
        const inputRect = this.input.getBoundingClientRect();
        this.preview.style.left = `${inputRect.left}px`;
        this.preview.style.width = `${inputRect.width}px`;
        this.preview.style.bottom = `${window.innerHeight - inputRect.top + 10}px`;
    }

    hidePreview() {
        this.preview.classList.remove('active');
    }

    setupEventListeners() {
        this.input.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.input.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.input.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Предотвращаем стандартное открытие клавиатуры на мобильных
        this.input.addEventListener('focus', (e) => {
            if (document.body.classList.contains('mobile-device')) {
                this.input.blur();
            }
        });
    }

    handleTouchStart(e) {
        this.touchStartTime = Date.now();
        this.touchStartY = e.touches[0].clientY;
        this.startValue = parseFloat(this.input.value) || this.options.initialValue;

        this.previewTimer = setTimeout(() => {
            this.isScrolling = true;
            this.showPreview();
        }, this.longPressDelay);
    }

    handleTouchMove(e) {
        if (this.isScrolling) {
            e.preventDefault();

            const touch = e.touches[0];
            const deltaY = this.touchStartY - touch.clientY;
            const steps = Math.round(deltaY / this.optionHeight);
            
            let newValue = this.startValue + (steps * this.options.step);
            
            // Применяем ограничения
            newValue = Math.max(this.options.minValue, newValue);
            if (this.options.maxChange) {
                const maxChange = this.options.maxChange;
                newValue = Math.min(this.startValue + maxChange, Math.max(this.startValue - maxChange, newValue));
            }
            
            if (this.input.value !== String(newValue)) {
                this.input.value = newValue;
                this.updatePreview();
                
                // Генерируем событие input для сохранения состояния
                const inputEvent = new Event('input', {
                    bubbles: true,
                    cancelable: true
                });
                this.input.dispatchEvent(inputEvent);
            }
        }
    }

    handleTouchEnd() {
        clearTimeout(this.previewTimer);
        if (this.isScrolling) {
            this.isScrolling = false;
            this.hidePreview();
        }
    }
} 