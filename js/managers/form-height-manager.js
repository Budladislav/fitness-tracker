// Менеджер высоты формы тренировки
export class FormHeightManager {
    constructor() {
        this.workoutPage = document.querySelector('#workoutPage');
        this.form = document.querySelector('#workoutControls');
        this.exerciseType = document.querySelector('#exerciseType');
        this.weightInput = document.querySelector('#weightInput');
        
        this.init();
    }

    updateFormHeight = () => {
        if (this.form && this.workoutPage) {
            const formHeight = this.form.offsetHeight;
            this.workoutPage.style.setProperty('--form-height', `${formHeight}px`);
        }
    }

    init() {
        // Обновляем высоту при изменении типа упражнения
        this.exerciseType?.addEventListener('change', () => {
            setTimeout(this.updateFormHeight, 0);
        });

        // Обновляем при загрузке и ресайзе
        window.addEventListener('load', this.updateFormHeight);
        window.addEventListener('resize', this.updateFormHeight);

        // Следим за изменениями видимости поля веса
        const observer = new MutationObserver(this.updateFormHeight);
        this.weightInput && observer.observe(this.weightInput, { attributes: true });
    }
}