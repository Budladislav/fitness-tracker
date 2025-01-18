export class CustomSlider {
    constructor(options) {
        this.element = options.element;
        this.input = options.input;
        this.inputField = this.input.closest('.input-field');
        this.step = options.step || 1;
        this.maxChange = options.maxChange || 10;
        this.minValue = options.minValue || 0;
        this.sensitivity = options.sensitivity || 0.5;
        this.initialValue = options.initialValue || 0;
        this.currentValue = this.initialValue;
        
        this.isActive = false;
        this.startY = 0;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.element.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', () => this.handleTouchEnd());
        
        this.element.addEventListener('mousedown', (e) => this.handleTouchStart(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', () => this.handleTouchEnd());
    }

    handleTouchStart(e) {
        this.isActive = true;
        this.startY = e.touches ? e.touches[0].clientY : e.clientY;
        this.initialValue = parseFloat(this.input.value) || this.initialValue;
        this.currentValue = this.initialValue;
        this.element.classList.add('active');
        this.inputField.classList.add('slider-active');
        e.preventDefault();
    }

    handleTouchMove(e) {
        if (!this.isActive) return;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const deltaY = this.startY - clientY;
        const proposedChange = Math.round(deltaY * this.sensitivity / this.step) * this.step;
        const newValue = this.initialValue + proposedChange;
        
        this.updateValue(newValue);
        e.preventDefault();
    }

    handleMouseMove(e) {
        if (!this.isActive) return;
        this.handleTouchMove(e);
    }

    handleTouchEnd() {
        if (this.isActive) {
            this.isActive = false;
            this.element.classList.remove('active');
            this.inputField.classList.remove('slider-active');
        }
    }

    updateValue(newValue) {
        const direction = newValue > this.initialValue ? 1 : -1;
        this.currentValue = this.initialValue + 
            (direction * Math.min(this.maxChange, Math.abs(newValue - this.initialValue)));
        
        this.currentValue = Math.max(this.minValue, this.currentValue);
        
        if (this.step < 1) {
            this.currentValue = Math.round(this.currentValue / this.step) * this.step;
        }
        
        this.element.querySelector('.slider-value').textContent = this.currentValue;
        this.input.value = this.currentValue;

        // Генерируем событие input для сохранения состояния
        const inputEvent = new Event('input', {
            bubbles: true,
            cancelable: true
        });
        this.input.dispatchEvent(inputEvent);
    }
} 