export class TouchSelect {
    constructor(selectElement) {
        this.select = selectElement;
        this.touchStartTime = 0;
        this.touchStartY = 0;
        this.isScrolling = false;
        this.longPressDelay = 200; // 200ms для определения долгого нажатия
        this.optionHeight = 40; // Примерная высота option в пикселях
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.select.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.select.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.select.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Предотвращаем стандартное открытие на долгое нажатие
        this.select.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    handleTouchStart(e) {
        this.touchStartTime = Date.now();
        this.touchStartY = e.touches[0].clientY;
        this.currentIndex = this.select.selectedIndex;
    }

    handleTouchMove(e) {
        if (Date.now() - this.touchStartTime > this.longPressDelay) {
            this.isScrolling = true;
            e.preventDefault();

            const touch = e.touches[0];
            const deltaY = this.touchStartY - touch.clientY;
            const optionsToMove = Math.round(-deltaY / this.optionHeight);
            
            let newIndex = this.currentIndex + optionsToMove;
            newIndex = Math.max(1, Math.min(newIndex, this.select.options.length - 1));
            
            // Визуальная обратная связь
            this.select.selectedIndex = newIndex;
        }
    }

    handleTouchEnd(e) {
        if (this.isScrolling) {
            e.preventDefault();
            // Применяем выбранное значение и генерируем событие change
            const event = new Event('change', { bubbles: true });
            this.select.dispatchEvent(event);
        }
        
        this.isScrolling = false;
    }
} 