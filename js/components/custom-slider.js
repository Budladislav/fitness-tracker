export class CustomSlider {
    constructor(options) {
        this.element = options.element;
        this.input = options.input;
        this.step = options.step || 1;
        this.maxChange = options.maxChange || 10;
        this.minValue = options.minValue || 0;
        this.sensitivity = options.sensitivity || 0.2;
        this.initialValue = options.initialValue || 0;
        
        this.startY = 0;
        this.currentValue = this.initialValue;
        this.isActive = false;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.element.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.element.addEventListener('touchend', this.handleTouchEnd.bind(this));
        this.element.addEventListener('touchcancel', this.handleTouchEnd.bind(this));
        
        this.input.addEventListener('input', () => {
            const value = this.input.value;
            if (value) {
                this.element.querySelector('.slider-value').textContent = value;
            }
        });
    }

    handleTouchStart(e) {
        this.isActive = true;
        this.startY = e.touches[0].clientY;
        this.initialValue = parseFloat(this.input.value) || 0;
        this.currentValue = this.initialValue;
        this.element.classList.add('active');
        e.preventDefault();
    }

    handleTouchMove(e) {
        if (!this.isActive) return;

        const deltaY = this.startY - e.touches[0].clientY;
        const proposedChange = Math.round(deltaY * this.sensitivity / this.step) * this.step;
        const newValue = this.initialValue + proposedChange;
        
        this.updateValue(newValue);
        e.preventDefault();
    }

    handleTouchEnd() {
        if (this.isActive) {
            this.isActive = false;
            this.element.classList.remove('active');
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
    }
} 