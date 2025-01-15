export class TouchSelect {
    constructor(selectElement) {
        this.select = selectElement;
        this.touchStartTime = 0;
        this.touchStartY = 0;
        this.isScrolling = false;
        this.longPressDelay = 100; // 100ms для определения долгого нажатия
        this.optionHeight = 40; // Примерная высота option в пикселях
        
        this.createPreviewElement();
        this.setupEventListeners();
    }

    createPreviewElement() {
        this.preview = document.createElement('div');
        this.preview.className = 'select-preview';
        document.body.appendChild(this.preview);
    }

    updatePreview() {
        const options = Array.from(this.select.options)
            .filter(option => !option.disabled); // Фильтруем disabled опции (в том числе placeholder)
        
        this.preview.innerHTML = options
            .map((option, index) => `
                <div class="preview-option ${this.select.selectedIndex === index + 1 ? 'selected' : ''}">
                    ${option.text}
                </div>
            `)
            .join('');
    }

    showPreview() {
        this.updatePreview();
        this.preview.classList.add('active');
    }

    hidePreview() {
        this.preview.classList.remove('active');
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

        // Добавляем таймер для показа превью
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
            const optionsToMove = Math.round(-deltaY / this.optionHeight);
            
            let newIndex = this.currentIndex + optionsToMove;
            newIndex = Math.max(1, Math.min(newIndex, this.select.options.length - 1));
            
            if (this.select.selectedIndex !== newIndex) {
                this.select.selectedIndex = newIndex;
                this.updatePreview();
            }
        }
    }

    handleTouchEnd(e) {
        // Очищаем таймер
        clearTimeout(this.previewTimer);
        
        if (this.isScrolling) {
            e.preventDefault();
            const event = new Event('change', { bubbles: true });
            this.select.dispatchEvent(event);
            this.hidePreview();
        }
        
        this.isScrolling = false;
    }
} 