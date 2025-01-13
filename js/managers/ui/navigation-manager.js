import { BaseComponent } from '../../components/base-component.js';
import { DOM_SELECTORS } from '../../constants/selectors.js';

export class NavigationManager extends BaseComponent {
    constructor(notifications, storage) {
        super(notifications, storage);
        this.elements = this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        return {
            navTabs: this.querySelector(DOM_SELECTORS.NAVIGATION.TABS),
            pages: document.querySelectorAll('.page')
        };
    }

    setupEventListeners() {
        this.elements.navTabs.addEventListener('click', (e) => {
            const tab = e.target.closest('.nav-tab');
            if (!tab) return;

            this.activateTab(tab);
        });
    }

    activateTab(tab) {
        // Убираем активный класс у всех вкладок
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Переключаем страницы
        const targetPage = tab.dataset.page;
        this.elements.pages.forEach(page => page.classList.remove('active'));
        document.getElementById(`${targetPage}Page`).classList.add('active');
    }

    switchToTab(tabName) {
        const tab = this.querySelector(`[data-page="${tabName}"]`);
        if (tab) {
            tab.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            }));
        }
    }
} 