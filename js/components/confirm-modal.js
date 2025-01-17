export class ConfirmModal {
    constructor() {
        this.modal = null;
        this.createModal();
    }

    createModal() {
        const template = `
            <div class="modal-overlay">
                <div class="modal confirm-modal">
                    <div class="modal-content">
                        <p class="modal-message"></p>
                        <div class="modal-buttons">
                            <button class="btn confirm-btn">Да</button>
                            <button class="btn cancel-btn">Отмена</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalElement = document.createElement('div');
        modalElement.innerHTML = template;
        this.modal = modalElement.firstElementChild;
        document.body.appendChild(this.modal);
    }

    show(message) {
        return new Promise((resolve) => {
            this.modal.querySelector('.modal-message').textContent = message;
            this.modal.classList.add('visible');

            const confirmHandler = () => {
                this.hide();
                resolve(true);
            };

            const cancelHandler = () => {
                this.hide();
                resolve(false);
            };

            const confirmBtn = this.modal.querySelector('.confirm-btn');
            const cancelBtn = this.modal.querySelector('.cancel-btn');

            confirmBtn.addEventListener('click', confirmHandler, { once: true });
            cancelBtn.addEventListener('click', cancelHandler, { once: true });
        });
    }

    hide() {
        this.modal.classList.remove('visible');
    }
} 