export class FormStateService {
    constructor(storage) {
        this.storage = storage;
    }

    saveState(elements) {
        const formState = {
            exerciseName: elements.exerciseName.value,
            exerciseReps: elements.exerciseReps.value,
            exerciseWeight: elements.exerciseWeight.value,
            exerciseType: elements.exerciseType.checked,
            isFormVisible: !elements.workoutForm.classList.contains('hidden')
        };
        
        return this.storage.saveToStorage('workoutFormState', formState, sessionStorage);
    }

    restoreState(elements) {
        const formState = this.storage.getFromStorage('workoutFormState', sessionStorage);
        
        if (!formState) return false;

        elements.exerciseType.checked = formState.exerciseType;
        elements.exerciseName.value = formState.exerciseName || '';
        elements.exerciseReps.value = formState.exerciseReps || '';
        elements.exerciseWeight.value = formState.exerciseWeight || '';
        
        return formState;
    }

    clearState() {
        this.storage.removeFromStorage('workoutFormState', sessionStorage);
    }
} 