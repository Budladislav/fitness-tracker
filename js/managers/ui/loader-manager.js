export class LoaderManager {
    constructor() {
        this.loader = document.getElementById('appLoader');
    }

    show() {
        this.loader.classList.remove('hidden');
    }

    hide() {
        this.loader.classList.add('hidden');
    }
}