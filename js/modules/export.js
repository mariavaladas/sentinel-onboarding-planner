import { buildGanttPlanData, getCurrentGanttPlanData, PHASE_BAR_COLOR } from '../gantt-planner.js?v=29';

const LEFT_HEADERS = ['Task name', 'Phase', 'Start date', 'End date', 'Duration (days)', 'Dependencies'];
const LEFT_COLUMN_WIDTHS = [34, 24, 14, 14, 14, 28];
const LEFT_COLUMN_COUNT = LEFT_HEADERS.length;
const TIMELINE_START_COLUMN = LEFT_COLUMN_COUNT + 1;
const DAY_MS = 24 * 60 * 60 * 1000;
const SIX_MONTHS_IN_DAYS = 183;
const FILE_NAME = 'sentinel-onboarding-gantt.xlsx';

function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function startOfDay(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

function endOfDay(value) {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
}

function startOfWeek(value) {
    const date = startOfDay(value);
    const weekday = date.getDay();
    const offset = weekday === 0 ? -6 : 1 - weekday;
    date.setDate(date.getDate() + offset);
    return date;
}

function toExcelArgb(hexColor = '') {
    const normalized = hexColor.replace('#', '').trim();
    if (normalized.length === 3) {
        return `FF${normalized.split('').map((value) => `${value}${value}`).join('')}`.toUpperCase();
    }
    if (normalized.length === 6) {
        return `FF${normalized}`.toUpperCase();
    }
    return 'FF93C5FD';
}

function getDurationDays(startDate, endDate) {
    return Math.max(1, Math.round((startOfDay(endDate) - startOfDay(startDate)) / DAY_MS) + 1);
}

function buildTimeline(startDate, endDate) {
    const totalDays = getDurationDays(startDate, endDate);
    const useWeeklyTimeline = totalDays > SIX_MONTHS_IN_DAYS;
    const timeline = [];
    const firstUnit = useWeeklyTimeline ? startOfWeek(startDate) : startOfDay(startDate);
    const lastUnit = useWeeklyTimeline ? startOfWeek(endDate) : startOfDay(endDate);
    const stepDays = useWeeklyTimeline ? 7 : 1;

    for (let cursor = new Date(firstUnit); cursor <= lastUnit; cursor = addDays(cursor, stepDays)) {
        timeline.push(new Date(cursor));
    }

    return { timeline, useWeeklyTimeline };
}

function applyHeaderCellStyle(cell, isTimelineCell = false) {
    cell.font = {
        bold: true,
        color: { argb: 'FFF8FAFC' },
        size: isTimelineCell ? 9 : 10
    };
    cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isTimelineCell ? 'FF0F172A' : 'FF111827' }
    };
    cell.alignment = isTimelineCell
        ? { vertical: 'middle', horizontal: 'center', textRotation: 90 }
        : { vertical: 'middle', horizontal: 'center' };
    cell.border = {
        top: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'thin', color: { argb: 'FF334155' } },
        left: { style: 'thin', color: { argb: 'FF334155' } }
    };
}

function applyMetadataCellStyle(cell) {
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
}

function applyTimelineCellStyle(cell, fillArgb, isBarEdgeStart, isBarEdgeEnd) {
    cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillArgb }
    };
    cell.border = {
        top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        right: { style: isBarEdgeEnd ? 'medium' : 'thin', color: { argb: 'FFFFFFFF' } },
        bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        left: { style: isBarEdgeStart ? 'medium' : 'thin', color: { argb: 'FFFFFFFF' } }
    };
}

function resolvePlanData(planInput = {}) {
    if (planInput?.planData?.rows?.length) {
        return planInput.planData;
    }

    const currentPlan = getCurrentGanttPlanData();
    if (currentPlan?.rows?.length) {
        return currentPlan;
    }

    const solutions = Array.isArray(planInput?.solutions) ? planInput.solutions : [];
    return solutions.length > 0 ? buildGanttPlanData(solutions) : null;
}

function downloadWorkbook(buffer) {
    const blob = new Blob([
        buffer
    ], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = FILE_NAME;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
}

export async function exportToExcel(planInput = {}) {
    const ExcelJS = window.ExcelJS;
    if (!ExcelJS) {
        throw new Error('ExcelJS is not available in the browser.');
    }

    const planData = resolvePlanData(planInput);
    if (!planData?.rows?.length || !planData?.tasks?.length) {
        return false;
    }

    const taskById = new Map(planData.tasks.map((task) => [task.id, task]));
    const labelById = new Map(planData.rows.map((row) => [row.id, `${row.number} ${row.step}`]));
    const taskDates = planData.tasks.map((task) => ({
        start: startOfDay(task.start),
        end: endOfDay(task.end)
    }));
    const planStart = taskDates.reduce((earliest, task) => task.start < earliest ? task.start : earliest, taskDates[0].start);
    const planEnd = taskDates.reduce((latest, task) => task.end > latest ? task.end : latest, taskDates[0].end);
    const { timeline, useWeeklyTimeline } = buildTimeline(planStart, planEnd);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'K';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Gantt Planner', {
        views: [{ state: 'frozen', xSplit: LEFT_COLUMN_COUNT, ySplit: 1, activeCell: 'G2' }]
    });

    worksheet.properties.defaultRowHeight = 20;
    worksheet.getRow(1).height = 42;

    LEFT_HEADERS.forEach((header, index) => {
        const columnIndex = index + 1;
        worksheet.getColumn(columnIndex).width = LEFT_COLUMN_WIDTHS[index];
        const cell = worksheet.getCell(1, columnIndex);
        cell.value = header;
        applyHeaderCellStyle(cell);
    });

    timeline.forEach((unitDate, index) => {
        const columnIndex = TIMELINE_START_COLUMN + index;
        worksheet.getColumn(columnIndex).width = 3.5;
        const cell = worksheet.getCell(1, columnIndex);
        cell.value = unitDate;
        cell.numFmt = 'dd-mmm';
        applyHeaderCellStyle(cell, true);
    });

    planData.rows.forEach((row) => {
        const task = taskById.get(row.id);
        if (!task) {
            return;
        }

        const taskStart = startOfDay(task.start);
        const taskEnd = endOfDay(task.end);
        const durationDays = getDurationDays(task.start, task.end);
        const dependencies = row.dependencies.length > 0
            ? row.dependencies.map((dependencyId) => labelById.get(dependencyId) || dependencyId).join(', ')
            : '—';
        const barColor = toExcelArgb(task.color || PHASE_BAR_COLOR[task.custom_class]);

        const excelRow = worksheet.addRow([
            task.name,
            row.phase,
            taskStart,
            taskEnd,
            durationDays,
            dependencies
        ]);
        excelRow.height = 20;

        excelRow.eachCell((cell, columnNumber) => {
            applyMetadataCellStyle(cell);
            if (columnNumber === 2) {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: barColor }
                };
                cell.font = { bold: true, color: { argb: 'FF111827' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
        });

        excelRow.getCell(3).numFmt = 'dd-mmm-yyyy';
        excelRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
        excelRow.getCell(4).numFmt = 'dd-mmm-yyyy';
        excelRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
        excelRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };

        const filledColumns = [];
        timeline.forEach((unitDate, index) => {
            const unitStart = startOfDay(unitDate);
            const unitEnd = useWeeklyTimeline ? endOfDay(addDays(unitStart, 6)) : endOfDay(unitStart);
            if (taskStart <= unitEnd && taskEnd >= unitStart) {
                filledColumns.push(TIMELINE_START_COLUMN + index);
            }
        });

        filledColumns.forEach((columnIndex, fillIndex) => {
            const cell = worksheet.getCell(excelRow.number, columnIndex);
            applyTimelineCellStyle(
                cell,
                barColor,
                fillIndex === 0,
                fillIndex === filledColumns.length - 1
            );
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    downloadWorkbook(buffer);
    return true;
}
