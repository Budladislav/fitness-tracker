export class TouchInput {
    constructor(input, options = {}) {
        this.input = input;
        this.options = {
            step: options.step || 1,
            maxChange: options.maxChange || 10,
            minValue: options.minValue || 0,
            initialValue: options.initialValue || 10,
            sensitivity: options.sensitivity || 0.2,
            suffix: options.suffix || '',
            ...options
        };

        this.isScrolling = false;
        this.touchStartY = 0;
        this.currentValue = parseFloat(this.input.value) || this.options.initialValue;
        this.longPressDelay = 200;
        this.maxScrollDistance = 60;

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
        
        const currentValue = parseFloat(this.input.value);
        const values = [];
        for (let i = -5; i <= 5; i++) {
            values.push(currentValue + (i * this.options.step));
        }

        previewValues.innerHTML = values
            .map(value => `<div class="preview-option ${value === currentValue ? 'selected' : ''}">${value}</div>`)
            .join('');
        
        previewCurrent.textContent = `${currentValue} ${this.options.suffix}`;
    }

    showPreview() {
        this.updatePreview();
        this.preview.classList.add('active');
        
        const screenWidth = window.innerWidth;
        const previewWidth = Math.min(300, screenWidth - 40);
        
        this.preview.style.left = '50%';
        this.preview.style.width = `${previewWidth}px`;
        this.preview.style.transform = 'translateX(-50%)';
        this.preview.style.top = '35%';
        this.preview.style.marginTop = '-100px';
    }

    hidePreview() {
        this.preview.classList.remove('active');
    }

    setupEventListeners() {
        this.input.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.input.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.input.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Удаляем блокировку стандартного поведения при фокусе
        this.input.addEventListener('focus', (e) => {
            if (this.isScrolling) {
                e.preventDefault();
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
            this.input.blur(); // Убираем фокус при активации скролла
            this.input.classList.add('touch-active');
            this.showPreview();
        }, this.longPressDelay);
    }

    handleTouchMove(e) {
        if (this.isScrolling) {
            e.preventDefault();

            const touch = e.touches[0];
            const deltaY = this.touchStartY - touch.clientY;
            
            // Ограничиваем deltaY
            const limitedDeltaY = Math.max(
                -this.maxScrollDistance,
                Math.min(this.maxScrollDistance, deltaY)
            );
            
            // Используем sensitivity как в CustomSlider
            const proposedChange = Math.round(limitedDeltaY * this.options.sensitivity / this.options.step) * this.options.step;
            let newValue = this.startValue + proposedChange;
            
            // Применяем ограничения
            newValue = Math.max(this.options.minValue, newValue);
            if (this.options.maxChange) {
                newValue = Math.min(
                    this.startValue + this.options.maxChange,
                    Math.max(this.startValue - this.options.maxChange, newValue)
                );
            }
            
            if (this.input.value !== String(newValue)) {
                this.input.value = newValue;
                this.updatePreview();
                
                const inputEvent = new Event('input', {
                    bubbles: true,
                    cancelable: true
                });
                this.input.dispatchEvent(inputEvent);
            }
        }
    }

    handleTouchEnd(e) {
        clearTimeout(this.previewTimer);
        
        if (this.isScrolling) {
            e.preventDefault();
            const inputEvent = new Event('input', {
                bubbles: true,
                cancelable: true
            });
            this.input.dispatchEvent(inputEvent);
            this.hidePreview();
            this.isScrolling = false;
        }
        
        this.input.classList.remove('touch-active');
    }
} 