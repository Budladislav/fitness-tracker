import { BaseComponent } from '../../components/base-component.js';
import { DOM_SELECTORS } from '../../constants/selectors.js';
import { ExerciseFormatterService } from '../../services/exercise-formatter.service.js';
import { ExerciseCalculatorService } from '../../services/exercise-calculator.service.js';
import { WorkoutFactory } from '../../factories/workout.factory.js';

export class ExerciseLogManager extends BaseComponent {
    constructor(notifications, storage) {
        super(notifications, storage);
        this.elements = this.initializeElements();
    }

    initializeElements() {
        return {
            exerciseLog: this.querySelector(DOM_SELECTORS.WORKOUT.LOG)
        };
    }

    addExerciseToLog(exerciseData) {
        const { type, name } = exerciseData;
        const newSet = WorkoutFactory.createSet(exerciseData.reps, exerciseData.weight);

        const existingItem = this.findExistingExercise(name);

        if (existingItem) {
            this.updateExistingExercise(existingItem, exerciseData, newSet);
        } else {
            this.createNewExercise(exerciseData, newSet);
        }
    }

    findExistingExercise(name) {
        return Array.from(this.elements.exerciseLog.children)
            .find(item => {
                const data = JSON.parse(item.dataset.exercise);
                return data.name === name;
            });
    }

    updateExistingExercise(existingItem, exerciseData, newSet) {
        const exerciseInfo = JSON.parse(existingItem.dataset.exercise);
        exerciseInfo.sets.push(newSet);
        
        existingItem.dataset.exercise = JSON.stringify(exerciseInfo);
        existingItem.querySelector('.exercise-content span').textContent = 
            ExerciseFormatterService.formatExercise(exerciseInfo);

        if (exerciseData.type === 'weighted') {
            this.updateWeightInfo(existingItem, exerciseInfo, exerciseData.name);
        }
    }

    createNewExercise(exerciseData, newSet) {
        const item = this.createElement('div', 'exercise-item');
        const content = this.createElement('div', 'exercise-content');
        
        const text = this.createElement('span');
        const newExercise = WorkoutFactory.createExercise(exerciseData.name, exerciseData.type);
        newExercise.sets = [newSet];
        
        text.textContent = ExerciseFormatterService.formatExercise(newExercise);
        
        const totalWeightElement = this.createElement('div', 'total-weight');

        if (exerciseData.type === 'weighted') {
            this.updateWeightInfo(item, newExercise, exerciseData.name, totalWeightElement);
        }

        const deleteBtn = this.createDeleteButton(item);

        content.appendChild(text);
        if (exerciseData.type === 'weighted') {
            content.appendChild(totalWeightElement);
        }
        content.appendChild(deleteBtn);
        item.appendChild(content);
        item.dataset.exercise = JSON.stringify(newExercise);
        
        this.elements.exerciseLog.appendChild(item);
    }

    createDeleteButton(item) {
        const deleteBtn = this.createElement('button', 'delete-btn');
        deleteBtn.textContent = '×';
        deleteBtn.setAttribute('title', 'Удалить последний подход');
        
        deleteBtn.onclick = (e) => {
            e.preventDefault();
            const data = JSON.parse(item.dataset.exercise);
            
            if (data.sets.length > 1) {
                data.sets.pop();
                item.dataset.exercise = JSON.stringify(data);
                item.querySelector('.exercise-content span').textContent = 
                    ExerciseFormatterService.formatExercise(data);
                
                if (data.type === 'weighted') {
                    this.updateWeightInfo(item, data, data.name);
                }
            } else {
                item.classList.add('removing');
                setTimeout(() => item.remove(), 300);
            }
        };

        return deleteBtn;
    }

    updateWeightInfo(item, exercise, exerciseName, element = null) {
        const totalWeight = ExerciseCalculatorService.calculateTotalWeight(exercise);
        const history = this.storage.getExerciseHistory(exerciseName);
        const avgWeight = ExerciseCalculatorService.calculateAverageWeight(history);
        
        const weightElement = element || item.querySelector('.total-weight');
        weightElement.innerHTML = `
            <div>Тоннаж: ${totalWeight} кг</div>
            ${avgWeight ? `<div class="avg-weight">Ср: ${avgWeight} кг</div>` : ''}
        `;
    }

    getExercisesFromLog() {
        return Array.from(this.elements.exerciseLog.children).map(item => {
            return JSON.parse(item.dataset.exercise);
        });
    }

    clearLog() {
        if (this.elements.exerciseLog) {
            this.elements.exerciseLog.innerHTML = '';
        }
    }
} 