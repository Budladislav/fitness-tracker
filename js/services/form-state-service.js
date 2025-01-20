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
            isFormVisible: !elements.workoutForm.classList.contains('hidden'),
            lastSelectedExercises: {
                weighted: elements.lastSelectedExercises?.weighted || '',
                bodyweight: elements.lastSelectedExercises?.bodyweight || ''
            }
        };
        
        return this.storage.saveToStorage('workoutFormState', formState, sessionStorage);
    }

    restoreState(elements) {
        const formState = this.storage.getFromStorage('workoutFormState', sessionStorage);
        
        if (!formState) return false;

        elements.exerciseType.checked = formState.exerciseType;
        
        if (formState.lastSelectedExercises) {
            elements.lastSelectedExercises = formState.lastSelectedExercises;
        }

        if (typeof elements.updateExercisesList === 'function') {
            elements.updateExercisesList();
        }

        elements.exerciseName.value = formState.exerciseName || '';
        elements.exerciseReps.value = formState.exerciseReps || '';
        elements.exerciseWeight.value = formState.exerciseWeight || '';
        
        return formState;
    }

    clearState() {
        this.storage.removeFromStorage('workoutFormState', sessionStorage);
    }
} 