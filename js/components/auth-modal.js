import { BaseComponent } from './base-component.js';
import { AuthService } from '../services/auth.service.js';

export class AuthModal extends BaseComponent {
    constructor(notifications) {
        super();
        this.notifications = notifications;
        this.authService = new AuthService();
        this.createModal();
        this.initializeEvents();
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal auth-modal hidden';
        this.modal.innerHTML = `
            <div class="modal-content">
                <button class="close-btn">×</button>
                <h2>Вход / Регистрация</h2>
                <p>Введите email для входа или регистрации</p>
                <form id="authForm">
                    <input type="email" id="emailInput" placeholder="Ваш email" required>
                    <button type="submit" class="btn">Отправить ссылку</button>
                </form>
            </div>
        `;
        document.body.appendChild(this.modal);
    }

    initializeEvents() {
        const form = this.modal.querySelector('#authForm');
        const closeBtn = this.modal.querySelector('.close-btn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = form.emailInput.value;
            
            try {
                await this.authService.sendLoginLink(email);
                this.notifications.success('Ссылка для входа отправлена на ваш email');
                this.hide();
            } catch (error) {
                this.notifications.error('Ошибка при отправке ссылки');
            }
        });

        closeBtn.addEventListener('click', () => this.hide());
    }

    show() {
        this.modal.classList.remove('hidden');
    }

    hide() {
        this.modal.classList.add('hidden');
    }
} 