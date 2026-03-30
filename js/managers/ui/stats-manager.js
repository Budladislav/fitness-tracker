import { ExerciseCalculatorService } from '../../services/exercise-calculator.service.js';

/**
 * Менеджер страницы статистики
 */
export class StatsManager {
    constructor(storage) {
        this.storage = storage;
        this.workouts = [];
        this.initialized = false;
        this._initSelect();
    }

    _initSelect() {
        const sel = document.getElementById('statsExerciseSelect');
        if (sel) {
            sel.addEventListener('change', () => {
                if (sel.value) this.renderProgressChart(sel.value);
            });
        }
    }

    // ─── Public entry point ────────────────────────────────────

    async loadAndRender() {
        this.workouts = (await this.storage.getWorkoutHistory()) || [];
        this.renderSummary();
        this.renderHeatmap();
        this.renderExerciseSelect();
        this.renderRecordsTable();
        if (!this.initialized) {
            this.initialized = true;
        }
    }

    // ─── 1. Summary cards ─────────────────────────────────────

    renderSummary() {
        const workouts = this.workouts;
        const total = workouts.length;

        const tonnage = workouts.reduce((sum, w) => {
            const wt = (w.exercises || []).reduce((s, ex) =>
                s + ExerciseCalculatorService.calculateTotalWeight(ex), 0);
            return sum + wt;
        }, 0);

        // Средние в неделю — за всё время (нет данных → —)
        let weeklyAvg = '—';
        if (total > 0) {
            const dates = workouts.map(w => new Date(w.date));
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));
            const weekSpan = Math.max(1, Math.ceil((maxDate - minDate) / (7 * 86400000)));
            weeklyAvg = (total / weekSpan).toFixed(1);
        }

        let lastDays = '—';
        if (total > 0) {
            const lastDate = new Date(Math.max(...workouts.map(w => new Date(w.date))));
            lastDays = Math.floor((Date.now() - lastDate) / 86400000);
        }

        this._setText('statTotalWorkouts', total || '—');
        this._setText('statTotalTonnage', total ? (tonnage / 1000).toFixed(1) : '—');
        this._setText('statWeeklyAvg', weeklyAvg);
        this._setText('statLastWorkout', lastDays);
    }

    // ─── 2. Heatmap ───────────────────────────────────────────

    renderHeatmap() {
        const container = document.getElementById('statsHeatmap');
        if (!container) return;

        // Строим map: 'YYYY-MM-DD' → count
        const dayMap = {};
        for (const w of this.workouts) {
            const d = w.date ? w.date.slice(0, 10) : null;
            if (d) dayMap[d] = (dayMap[d] || 0) + 1;
        }

        // 12 недель назад от сегодня, начиная с понедельника
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayOfWeek = (today.getDay() + 6) % 7; // 0=Mon
        const startMonday = new Date(today);
        startMonday.setDate(today.getDate() - dayOfWeek - 11 * 7);

        const WEEKS = 12;
        const DAYS = 7;
        const CELL = 16;
        const GAP = 3;
        const svgW = WEEKS * (CELL + GAP) - GAP;
        const svgH = DAYS * (CELL + GAP) - GAP + 20; // +20 for day labels

        const dayNames = ['Пн', '', 'Ср', '', 'Пт', '', ''];

        let cellsHTML = '';
        for (let w = 0; w < WEEKS; w++) {
            for (let d = 0; d < DAYS; d++) {
                const date = new Date(startMonday);
                date.setDate(startMonday.getDate() + w * 7 + d);
                const key = date.toISOString().slice(0, 10);
                const count = dayMap[key] || 0;
                const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3;
                const isToday = key === today.toISOString().slice(0, 10);
                const x = w * (CELL + GAP);
                const y = d * (CELL + GAP) + 20;
                const title = `${key}: ${count} трен.`;
                cellsHTML += `<rect class="hm-cell lc-${level}${isToday ? ' hm-today' : ''}" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3" ry="3"><title>${title}</title></rect>`;
            }
        }

        // Day labels on left at first column
        let labelsHTML = '';
        for (let d = 0; d < DAYS; d++) {
            if (dayNames[d]) {
                labelsHTML += `<text class="hm-label" x="0" y="${d * (CELL + GAP) + 20 + 11}">${dayNames[d]}</text>`;
            }
        }

        container.innerHTML = `
            <svg viewBox="-28 0 ${svgW + 28} ${svgH}" class="heatmap-svg" preserveAspectRatio="xMidYMid meet">
                ${labelsHTML}
                ${cellsHTML}
            </svg>`;
    }

    // ─── 3. Exercise Progress Chart ───────────────────────────

    renderExerciseSelect() {
        const sel = document.getElementById('statsExerciseSelect');
        if (!sel) return;

        // Собираем все упражнения с весом из истории
        const exerciseNames = new Set();
        for (const w of this.workouts) {
            for (const ex of (w.exercises || [])) {
                if (ex.type === 'weighted' || ex.sets?.some(s => s.weight > 0)) {
                    exerciseNames.add(ex.name);
                }
            }
        }

        sel.innerHTML = '<option value="">— Выберите упражнение —</option>';
        [...exerciseNames].sort().forEach(name => {
            sel.add(new Option(name, name));
        });
    }

    renderProgressChart(exerciseName) {
        const container = document.getElementById('statsChart');
        const recordEl = document.getElementById('statsChartRecord');
        const recordVal = document.getElementById('statsChartRecordVal');
        const recordDate = document.getElementById('statsChartRecordDate');
        if (!container) return;

        // Собираем точки: { date, maxWeight }
        const points = [];
        for (const w of this.workouts) {
            const ex = (w.exercises || []).find(e => e.name === exerciseName);
            if (!ex) continue;
            const maxW = Math.max(...ex.sets.map(s => s.weight || 0));
            if (maxW > 0) {
                points.push({ date: new Date(w.date), weight: maxW });
            }
        }

        if (points.length === 0) {
            container.innerHTML = '<p class="stats-empty">Нет данных по этому упражнению</p>';
            recordEl?.classList.add('hidden');
            return;
        }

        points.sort((a, b) => a.date - b.date);

        const maxRec = points.reduce((best, p) => p.weight > best.weight ? p : best, points[0]);
        if (recordEl) recordEl.classList.remove('hidden');
        if (recordVal) recordVal.textContent = maxRec.weight;
        if (recordDate) recordDate.textContent = maxRec.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

        if (points.length === 1) {
            container.innerHTML = `<p class="stats-empty">Только одна тренировка — нужно больше данных для графика</p>`;
            return;
        }

        container.innerHTML = this._buildLineChart(points);
    }

    _buildLineChart(points) {
        const W = 320, H = 140;
        const PAD = { top: 16, right: 16, bottom: 28, left: 36 };
        const cW = W - PAD.left - PAD.right;
        const cH = H - PAD.top - PAD.bottom;

        const minDate = points[0].date.getTime();
        const maxDate = points[points.length - 1].date.getTime();
        const dateRange = Math.max(maxDate - minDate, 1);

        const weights = points.map(p => p.weight);
        const minW = Math.min(...weights) * 0.9;
        const maxW = Math.max(...weights) * 1.05;
        const weightRange = Math.max(maxW - minW, 1);

        const px = d => PAD.left + ((d.getTime() - minDate) / dateRange) * cW;
        const py = w => PAD.top + cH - ((w - minW) / weightRange) * cH;

        // Polyline
        const polyPts = points.map(p => `${px(p.date).toFixed(1)},${py(p.weight).toFixed(1)}`).join(' ');

        // Area under
        const first = points[0], last = points[points.length - 1];
        const areaPath = `M${px(first.date).toFixed(1)},${py(first.weight).toFixed(1)} ` +
            points.map(p => `L${px(p.date).toFixed(1)},${py(p.weight).toFixed(1)}`).join(' ') +
            ` L${px(last.date).toFixed(1)},${(PAD.top + cH).toFixed(1)} L${px(first.date).toFixed(1)},${(PAD.top + cH).toFixed(1)} Z`;

        // Y-axis ticks (3)
        const yTicks = [minW, (minW + maxW) / 2, maxW].map(v => {
            const y = py(v);
            return `<line class="chart-grid" x1="${PAD.left}" y1="${y.toFixed(1)}" x2="${W - PAD.right}" y2="${y.toFixed(1)}"/>
                    <text class="chart-axis-label" x="${PAD.left - 4}" y="${(y + 4).toFixed(1)}" text-anchor="end">${Math.round(v)}</text>`;
        }).join('');

        // X-axis labels (2-3)
        const xLabels = [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]]
            .filter((p, i, arr) => arr.indexOf(p) === i)
            .map(p => {
                const x = px(p.date);
                const label = p.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                return `<text class="chart-axis-label" x="${x.toFixed(1)}" y="${H - 4}" text-anchor="middle">${label}</text>`;
            }).join('');

        // Dots
        const dots = points.map(p => {
            const cx = px(p.date), cy = py(p.weight);
            return `<circle class="chart-dot" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.5"><title>${p.weight} кг · ${p.date.toLocaleDateString('ru-RU')}</title></circle>`;
        }).join('');

        return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" preserveAspectRatio="xMidYMid meet">
            <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--primary-color)" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="var(--primary-color)" stop-opacity="0"/>
                </linearGradient>
            </defs>
            ${yTicks}
            <path class="chart-area" d="${areaPath}" fill="url(#chartGrad)"/>
            <polyline class="chart-line" points="${polyPts}" fill="none"/>
            ${dots}
            ${xLabels}
        </svg>`;
    }

    // ─── 4. Records table ─────────────────────────────────────

    renderRecordsTable() {
        const container = document.getElementById('statsRecords');
        if (!container) return;

        // Собираем все упражнения с весом: { name → { allTime, last30 } }
        const now = Date.now();
        const ms30 = 30 * 86400000;
        const records = {};

        for (const w of this.workouts) {
            const wDate = new Date(w.date).getTime();
            for (const ex of (w.exercises || [])) {
                if (!ex.sets?.some(s => s.weight > 0)) continue;
                const maxW = Math.max(...ex.sets.map(s => s.weight || 0));
                if (!records[ex.name]) records[ex.name] = { allTime: 0, last30: 0 };
                if (maxW > records[ex.name].allTime) records[ex.name].allTime = maxW;
                if (now - wDate <= ms30 && maxW > records[ex.name].last30) records[ex.name].last30 = maxW;
            }
        }

        const entries = Object.entries(records).sort(([a], [b]) => a.localeCompare(b, 'ru'));

        if (entries.length === 0) {
            container.innerHTML = '<p class="stats-empty">Нет упражнений с весом в истории</p>';
            return;
        }

        const rows = entries.map(([name, { allTime, last30 }]) => {
            let trend = '';
            if (last30 > 0 && last30 >= allTime) trend = '<span class="trend-up">↑</span>';
            else if (last30 > 0 && last30 < allTime) trend = '<span class="trend-down">↓</span>';
            else trend = '<span class="trend-none">—</span>';

            return `<tr>
                <td class="rec-name">${name}</td>
                <td class="rec-val">${allTime} кг</td>
                <td class="rec-val">${last30 > 0 ? last30 + ' кг' : '—'}</td>
                <td class="rec-trend">${trend}</td>
            </tr>`;
        }).join('');

        container.innerHTML = `
            <table class="records-table">
                <thead>
                    <tr>
                        <th>Упражнение</th>
                        <th>Всё время</th>
                        <th>30 дней</th>
                        <th>Тренд</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;
    }

    // ─── Helpers ──────────────────────────────────────────────

    _setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}
