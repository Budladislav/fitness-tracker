import { ExerciseCalculatorService } from '../../services/exercise-calculator.service.js';

/**
 * Менеджер страницы статистики
 */
export class StatsManager {
    constructor(storage) {
        this.storage = storage;
        this.workouts = [];
        this.initialized = false;
        this.selectedExercise = '';
        this.selectedRecordsExercise = '';
        this._initSelect();
    }

    _initSelect() {
        const sel = document.getElementById('statsExerciseSelect');
        const recordsSel = document.getElementById('statsRecordsExerciseSelect');
        if (sel) {
            sel.addEventListener('change', () => {
                this.selectedExercise = sel.value || '';
                // Связываем селекторы: выбор в "Прогрессе" синхронизирует "Рекорды"
                if (recordsSel) {
                    recordsSel.value = this.selectedExercise;
                    this.selectedRecordsExercise = this.selectedExercise;
                }
                this.updateProgressAndRecords();
            });
        }

        const metricSel = document.getElementById('statsMetricSelect');
        if (metricSel) {
            metricSel.addEventListener('change', () => this.updateProgressAndRecords());
        }

        const periodSel = document.getElementById('statsPeriodSelect');
        if (periodSel) {
            periodSel.addEventListener('change', () => this.updateProgressAndRecords());
        }

        if (recordsSel) {
            recordsSel.addEventListener('change', () => {
                this.selectedRecordsExercise = recordsSel.value || '';
                this.renderRecordsTable(this.selectedRecordsExercise);
            });
        }
    }

    // ─── Public entry point ────────────────────────────────────

    async loadAndRender() {
        this.workouts = (await this.storage.getWorkoutHistory()) || [];
        this.renderSummary();
        this.renderHeatmap();
        this.renderExerciseSelect();
        if (!this.initialized) {
            this.initialized = true;
        }
    }

    // ─── 1. Summary cards ─────────────────────────────────────

    renderSummary() {
        const workouts = this.workouts;
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const minWorkoutDate = workouts.length
            ? new Date(Math.min(...workouts.map(w => new Date(w.date).getTime())))
            : new Date(currentYear, currentMonth, 1);

        const monthStarts = [];
        const monthCursor = new Date(currentYear, currentMonth, 1);
        const firstMonth = new Date(minWorkoutDate.getFullYear(), minWorkoutDate.getMonth(), 1);
        while (monthCursor >= firstMonth) {
            monthStarts.push(new Date(monthCursor));
            monthCursor.setMonth(monthCursor.getMonth() - 1);
        }
        const monthKeys = monthStarts.map(d => this._monthKey(d));
        const tonnageByMonth = new Map(monthKeys.map(k => [k, 0]));

        const weekStarts = [];
        const weekCursor = new Date(today);
        const day = (weekCursor.getDay() + 6) % 7;
        weekCursor.setDate(weekCursor.getDate() - day);
        const firstWeek = new Date(minWorkoutDate);
        firstWeek.setDate(firstWeek.getDate() - ((firstWeek.getDay() + 6) % 7));
        while (weekCursor >= firstWeek) {
            weekStarts.push(new Date(weekCursor));
            weekCursor.setDate(weekCursor.getDate() - 7);
        }
        const weekKeys = weekStarts.map(d => this._weekKey(d));
        const tonnageByWeek = new Map(weekKeys.map(k => [k, 0]));

        for (const workout of workouts) {
            const workoutDate = new Date(workout.date);
            workoutDate.setHours(0, 0, 0, 0);
            const workoutTonnage = (workout.exercises || []).reduce((sum, ex) =>
                sum + ExerciseCalculatorService.calculateTotalWeight(ex), 0);

            const monthKey = this._monthKey(workoutDate);
            if (tonnageByMonth.has(monthKey)) {
                tonnageByMonth.set(monthKey, tonnageByMonth.get(monthKey) + workoutTonnage);
            }

            const weekKey = this._weekKey(workoutDate);
            if (tonnageByWeek.has(weekKey)) {
                tonnageByWeek.set(weekKey, tonnageByWeek.get(weekKey) + workoutTonnage);
            }
        }

        const currentMonthKey = this._monthKey(today);
        const tonnageThisMonthKg = tonnageByMonth.get(currentMonthKey) || 0;

        const currentWeekKey = this._weekKey(today);
        const weeklyTonnageKg = tonnageByWeek.get(currentWeekKey) || 0;

        this._setText('statTotalTonnage', (tonnageThisMonthKg / 1000).toFixed(1));
        this._setText('statWeeklyTonnage', (weeklyTonnageKg / 1000).toFixed(1));

        const monthLabels = monthStarts.map(d =>
            `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}`
        );
        const weekLabels = weekStarts.map(d => {
            const { week, year } = this._getISOWeekAndYear(d);
            return `${week}/${String(year).slice(2)}`;
        });
        const tonnageMonthValues = [...tonnageByMonth.values()].map(v => v / 1000);
        const tonnageWeekValues = [...tonnageByWeek.values()].map(v => v / 1000);

        this._renderMiniBarChart('statTonnageMonthChart',
            monthLabels.map((label, i) => ({ label, value: tonnageMonthValues[i] })),
            'т',
            1
        );
        this._renderMiniBarChart('statTonnageWeekChart',
            weekLabels.map((label, i) => ({ label, value: tonnageWeekValues[i] })),
            'т',
            1
        );
    }

    // ─── 2. Heatmap ───────────────────────────────────────────

    renderHeatmap() {
        const container = document.getElementById('statsHeatmap');
        if (!container) return;

        // Собираем дни, когда были тренировки
        const trainingDays = new Set();
        const monthlyWorkoutCounts = new Map();
        for (const w of this.workouts) {
            const d = w.date ? w.date.slice(0, 10) : null;
            if (d) trainingDays.add(d);
            if (d) {
                const monthKey = d.slice(0, 7);
                monthlyWorkoutCounts.set(monthKey, (monthlyWorkoutCounts.get(monthKey) || 0) + 1);
            }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Показываем все месяцы: от первого месяца в истории до текущего,
        // в порядке от свежих к старым.
        const monthStarts = [];
        const minWorkoutDate = this.workouts.length
            ? new Date(Math.min(...this.workouts.map(w => new Date(w.date).getTime())))
            : new Date(today.getFullYear(), today.getMonth() - 2, 1);
        const firstMonth = new Date(minWorkoutDate.getFullYear(), minWorkoutDate.getMonth(), 1);
        const cursor = new Date(today.getFullYear(), today.getMonth(), 1);

        while (cursor >= firstMonth) {
            monthStarts.push(new Date(cursor));
            cursor.setMonth(cursor.getMonth() - 1);
        }

        const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

        const monthsHtml = monthStarts.map(monthStart => {
            const year = monthStart.getFullYear();
            const month = monthStart.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            // Приводим к формату Пн=0 ... Вс=6
            const firstDayMondayIndex = (monthStart.getDay() + 6) % 7;
            const cells = [];

            for (let i = 0; i < firstDayMondayIndex; i++) {
                cells.push('<span class="month-day empty" aria-hidden="true"></span>');
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dateKey = this._toLocalDateKey(date);
                const hasTraining = trainingDays.has(dateKey);
                const isToday = this._toLocalDateKey(today) === dateKey;

                cells.push(`
                    <span class="month-day${hasTraining ? ' active' : ''}${isToday ? ' today' : ''}" title="${dateKey}${hasTraining ? ' — тренировка' : ''}">
                        ${day}
                    </span>
                `);
            }

            return `
                <div class="month-card">
                    <div class="month-title">${monthStart.toLocaleDateString('ru-RU', { month: 'long' })} ${year} · ${monthlyWorkoutCounts.get(this._monthKey(monthStart)) || 0} трен.</div>
                    <div class="month-weekdays">${weekDays.map(d => `<span>${d}</span>`).join('')}</div>
                    <div class="month-grid">${cells.join('')}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="months-grid">${monthsHtml}</div>`;
    }

    // ─── 3. Exercise Progress Chart ───────────────────────────

    renderExerciseSelect() {
        const sel = document.getElementById('statsExerciseSelect');
        const recordsSel = document.getElementById('statsRecordsExerciseSelect');
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
        if (recordsSel) {
            recordsSel.innerHTML = '<option value="">— Выберите упражнение —</option>';
        }
        const sortedNames = [...exerciseNames].sort((a, b) => a.localeCompare(b, 'ru'));
        sortedNames.forEach(name => {
            sel.add(new Option(name, name));
            if (recordsSel) recordsSel.add(new Option(name, name));
        });

        // По умолчанию выбираем первое упражнение и сразу рисуем график
        if (sortedNames.length > 0) {
            sel.value = sortedNames[0];
            this.selectedExercise = sortedNames[0];
            if (recordsSel) {
                recordsSel.value = sortedNames[0];
                this.selectedRecordsExercise = sortedNames[0];
            }
            this.updateProgressAndRecords();
        } else {
            this.selectedExercise = '';
            this.selectedRecordsExercise = '';
            this.updateProgressAndRecords();
        }
    }

    updateProgressAndRecords() {
        this.renderProgressChart(this.selectedExercise);
        this.renderRecordsTable(this.selectedRecordsExercise || this.selectedExercise);
    }

    renderProgressChart(exerciseName) {
        const container = document.getElementById('statsChart');
        const recordEl = document.getElementById('statsChartRecord');
        const recordVal = document.getElementById('statsChartRecordVal');
        const recordDate = document.getElementById('statsChartRecordDate');
        const metricSel = document.getElementById('statsMetricSelect');
        const periodSel = document.getElementById('statsPeriodSelect');
        if (!container) return;
        if (!exerciseName) {
            container.innerHTML = '<p class="stats-empty">Выберите упражнение с весом</p>';
            recordEl?.classList.add('hidden');
            return;
        }

        const metric = metricSel?.value || 'tonnage';
        const period = periodSel?.value || 'all';
        const metricLabel = metric === 'tonnage' ? 'тоннажа' : metric === 'avgWeight' ? 'среднего веса' : 'макс веса';

        // Собираем точки: { date, value } по каждой тренировке
        const points = [];
        for (const w of this.workouts) {
            const ex = (w.exercises || []).find(e => e.name === exerciseName);
            if (!ex) continue;
            const value = this._getExerciseMetricValue(ex, metric);
            if (value > 0) {
                points.push({ date: new Date(w.date), value });
            }
        }
        const filtered = this._filterPointsByPeriod(points, period).sort((a, b) => a.date - b.date);

        if (filtered.length === 0) {
            container.innerHTML = '<p class="stats-empty">Нет данных по этому упражнению</p>';
            recordEl?.classList.add('hidden');
            return;
        }

        const maxRec = filtered.reduce((best, p) => p.value > best.value ? p : best, filtered[0]);
        if (recordEl) recordEl.classList.remove('hidden');
        if (recordVal) recordVal.textContent = Math.round(maxRec.value);
        if (recordDate) recordDate.textContent = maxRec.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        const recordTextNode = recordEl?.childNodes?.[0];
        if (recordTextNode) {
            recordTextNode.textContent = `🏆 Пик ${metricLabel}: `;
        }

        if (filtered.length === 1) {
            container.innerHTML = `<p class="stats-empty">Только одна тренировка — нужно больше данных для графика</p>`;
            return;
        }

        container.innerHTML = this._buildLineChart(filtered);
        this._attachChartTooltip(container, metric);
    }

    _buildLineChart(points) {
        const W = 760, H = 220;
        const PAD = { top: 16, right: 16, bottom: 28, left: 36 };
        const cW = W - PAD.left - PAD.right;
        const cH = H - PAD.top - PAD.bottom;

        const minDate = points[0].date.getTime();
        const maxDate = points[points.length - 1].date.getTime();
        const dateRange = Math.max(maxDate - minDate, 1);

        const values = points.map(p => p.value);
        const minT = Math.min(...values) * 0.9;
        const maxT = Math.max(...values) * 1.05;
        const valueRange = Math.max(maxT - minT, 1);

        const px = d => PAD.left + ((d.getTime() - minDate) / dateRange) * cW;
        const py = t => PAD.top + cH - ((t - minT) / valueRange) * cH;

        // Polyline
        const polyPts = points.map(p => `${px(p.date).toFixed(1)},${py(p.value).toFixed(1)}`).join(' ');

        // Area under
        const first = points[0], last = points[points.length - 1];
        const areaPath = `M${px(first.date).toFixed(1)},${py(first.value).toFixed(1)} ` +
            points.map(p => `L${px(p.date).toFixed(1)},${py(p.value).toFixed(1)}`).join(' ') +
            ` L${px(last.date).toFixed(1)},${(PAD.top + cH).toFixed(1)} L${px(first.date).toFixed(1)},${(PAD.top + cH).toFixed(1)} Z`;

        // Y-axis ticks (3)
        const yTicks = [minT, (minT + maxT) / 2, maxT].map(v => {
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
            const cx = px(p.date), cy = py(p.value);
            const dateText = p.date.toLocaleDateString('ru-RU');
            return `<circle class="chart-dot" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.5" data-date="${dateText}" data-value="${Math.round(p.value)}"><title>${Math.round(p.value)} · ${dateText}</title></circle>`;
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

    renderRecordsTable(exerciseName = this.selectedExercise) {
        const container = document.getElementById('statsRecords');
        if (!container) return;
        if (!exerciseName) {
            container.innerHTML = '<p class="stats-empty">Выберите упражнение в блоке "Прогресс"</p>';
            return;
        }

        const tonnageRecords = [];
        const setWeightRecords = [];

        for (const workout of this.workouts) {
            const date = workout.date ? new Date(workout.date) : null;
            const dateStr = date
                ? date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '—';

            for (const ex of (workout.exercises || [])) {
                if (ex.name !== exerciseName) continue;
                const tonnage = ExerciseCalculatorService.calculateTotalWeight(ex);
                if (tonnage > 0) {
                    tonnageRecords.push({
                        value: tonnage,
                        date: dateStr
                    });
                }

                for (const set of (ex.sets || [])) {
                    if ((set.weight || 0) > 0) {
                        setWeightRecords.push({
                            value: set.weight,
                            reps: set.reps,
                            date: dateStr
                        });
                    }
                }
            }
        }

        const topTonnage = tonnageRecords
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        const topSetWeight = setWeightRecords
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        if (topTonnage.length === 0 && topSetWeight.length === 0) {
            container.innerHTML = '<p class="stats-empty">Недостаточно данных для рекордов</p>';
            return;
        }

        const tonnageRows = topTonnage.map((item, idx) => `
            <tr>
                <td class="rec-rank">${idx + 1}</td>
                <td class="rec-val">${item.value} кг</td>
                <td class="rec-date">${item.date}</td>
            </tr>
        `).join('');

        const setWeightRows = topSetWeight.map((item, idx) => `
            <tr>
                <td class="rec-rank">${idx + 1}</td>
                <td class="rec-val">${item.value} кг × ${item.reps}</td>
                <td class="rec-date">${item.date}</td>
            </tr>
        `).join('');

        container.innerHTML = `
            <div class="records-grid">
                <div class="records-subcard">
                    <div class="records-subtitle">ТОП‑5 по тоннажу · ${exerciseName}</div>
                    <table class="records-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Тоннаж</th>
                                <th>Дата</th>
                            </tr>
                        </thead>
                        <tbody>${tonnageRows || '<tr><td colspan="3">Нет данных</td></tr>'}</tbody>
                    </table>
                </div>
                <div class="records-subcard">
                    <div class="records-subtitle">ТОП‑5 по весу за подход · ${exerciseName}</div>
                    <table class="records-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Подход</th>
                                <th>Дата</th>
                            </tr>
                        </thead>
                        <tbody>${setWeightRows || '<tr><td colspan="3">Нет данных</td></tr>'}</tbody>
                    </table>
                </div>
            </div>`;
    }

    // ─── Helpers ──────────────────────────────────────────────

    _setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    _renderMiniBarChart(containerId, points, unit, decimals = 1) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!points || points.length === 0) {
            container.innerHTML = '<p class="stats-empty">Нет данных</p>';
            return;
        }

        const minColWidth = 44;
        const W = Math.max(320, points.length * minColWidth);
        const H = 132;
        const PAD = 4;
        const barGap = 4;
        const currentIndex = 0; // текущий период слева (свежие данные)
        const values = points.map(p => p.value);
        const barWidth = (W - (values.length - 1) * barGap) / values.length;
        const maxVal = Math.max(...values, 1);

        const bars = values.map((value, i) => {
            const h = Math.max(2, (value / maxVal) * (H - PAD * 2 - 26));
            const x = i * (barWidth + barGap);
            const y = H - PAD - h - 24;
            const cls = i === currentIndex ? 'mini-chart-bar current' : 'mini-chart-bar';
            const title = `${value.toFixed(decimals)} ${unit}`;
            return `<rect class="${cls}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${h.toFixed(2)}" rx="2" ry="2"><title>${title}</title></rect>`;
        }).join('');

        const labelStep = Math.max(1, Math.ceil(points.length / 12));
        const labels = points.map((point, i) => {
            const isCurrent = i === currentIndex;
            const isVisible = isCurrent || i % labelStep === 0;
            return `
            <div class="mini-chart-label${isCurrent ? ' current' : ''}">
                <span class="mini-chart-label-key">${isVisible ? point.label : ''}</span>
                <span class="mini-chart-label-val">${isVisible ? `${point.value.toFixed(decimals)} ${unit}` : ''}</span>
            </div>
        `;
        }).join('');

        container.innerHTML = `
            <div class="mini-chart-scroll">
                <div class="mini-chart-track" style="--mini-track-width:${W}px;">
                    <svg viewBox="0 0 ${W} ${H}" class="mini-chart-svg" preserveAspectRatio="none">
                        <line class="mini-chart-axis" x1="0" y1="${H - 1}" x2="${W}" y2="${H - 1}"></line>
                        ${bars}
                    </svg>
                    <div class="mini-chart-labels" style="--mini-cols:${points.length}">${labels}</div>
                </div>
            </div>
        `;
    }

    _getExerciseMetricValue(exercise, metric) {
        if (!exercise?.sets?.length) return 0;
        if (metric === 'tonnage') {
            return ExerciseCalculatorService.calculateTotalWeight(exercise);
        }
        const weights = exercise.sets.map(s => s.weight || 0).filter(w => w > 0);
        if (weights.length === 0) return 0;
        if (metric === 'maxWeight') {
            return Math.max(...weights);
        }
        return weights.reduce((sum, w) => sum + w, 0) / weights.length;
    }

    _filterPointsByPeriod(points, period) {
        if (period === 'all') return points;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const from = new Date(now);
        if (period === '30d') from.setDate(from.getDate() - 30);
        if (period === '3m') from.setMonth(from.getMonth() - 3);
        if (period === '6m') from.setMonth(from.getMonth() - 6);
        if (period === '12m') from.setMonth(from.getMonth() - 12);
        return points.filter(p => p.date >= from);
    }

    _attachChartTooltip(container, metric) {
        if (!window.matchMedia('(hover: hover)').matches) return;
        const dots = container.querySelectorAll('.chart-dot');
        if (!dots.length) return;

        let tip = container.querySelector('.chart-tooltip');
        if (!tip) {
            tip = document.createElement('div');
            tip.className = 'chart-tooltip hidden';
            container.appendChild(tip);
        }

        const metricText = metric === 'tonnage' ? 'Тоннаж' : metric === 'avgWeight' ? 'Ср. вес' : 'Макс вес';
        dots.forEach(dot => {
            dot.addEventListener('mouseenter', () => {
                const value = dot.getAttribute('data-value');
                const date = dot.getAttribute('data-date');
                tip.textContent = `${metricText}: ${value} кг · ${date}`;
                tip.classList.remove('hidden');
            });
            dot.addEventListener('mousemove', e => {
                const rect = container.getBoundingClientRect();
                tip.style.left = `${e.clientX - rect.left + 12}px`;
                tip.style.top = `${e.clientY - rect.top - 28}px`;
            });
            dot.addEventListener('mouseleave', () => tip.classList.add('hidden'));
        });
    }

    _toLocalDateKey(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    _monthKey(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    }

    _weekKey(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const day = (d.getDay() + 6) % 7;
        d.setDate(d.getDate() - day);
        return this._toLocalDateKey(d);
    }

    _getISOWeekAndYear(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const day = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - day);
        const year = d.getUTCFullYear();
        const yearStart = new Date(Date.UTC(year, 0, 1));
        const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return { week, year };
    }
}
