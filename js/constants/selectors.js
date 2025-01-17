export const DOM_SELECTORS = {
    NAVIGATION: {
        TABS: '.nav-tabs',
        TAB: '.nav-tab'
    },
    PAGES: {
        WORKOUT: '#workoutPage',
        HISTORY: '#historyPage'
    },
    WORKOUT: {
        CONTROLS: '#workoutControls',
        FORM: '#workoutForm',
        CONTENT: '#workoutContent',
        START_SECTION: '#startWorkoutSection',
        START_BUTTON: '#startWorkout',
        SAVE_BUTTON: '#saveWorkout',
        ADD_BUTTON: '#addExercise',
        LOG: '#exerciseLog',
        REPS_SLIDER: '.custom-slider[aria-label="Изменить количество повторений"]',
        WEIGHT_SLIDER: '.custom-slider[aria-label="Изменить вес"]',
        REPS_VALUE: '.slider-value',
        WEIGHT_VALUE: '.slider-value'
    },
    INPUTS: {
        TYPE: '#exerciseType',
        NAME: '#exerciseName',
        REPS: {
            INPUT: '#exerciseReps',
            SLIDER: '.reps-slider'
        },
        WEIGHT: {
            INPUT: '#exerciseWeight',
            CONTAINER: '#weightInput'
        }
    },
    HISTORY: {
        CONTAINER: '#workoutHistory',
        TOGGLE_ALL: '#toggleAllWorkouts'
    }
}; 