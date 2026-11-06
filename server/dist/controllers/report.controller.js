"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadReport = exports.getReportHistory = void 0;
const database_1 = require("../config/database");
const activity_service_1 = require("../services/activity.service");
const report_pdf_service_1 = require("../services/report-pdf.service");
const parsePeriod = (value) => activity_service_1.PERIODS.find((p) => p === value) ?? null;
const unavailable = (res) => res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
// @desc    A person's own history for a period, as JSON (powers the Reports page)
// @route   GET /api/reports/history?period=monthly|yearly|historical
// @access  Private
const getReportHistory = async (req, res) => {
    const period = parsePeriod(req.query.period ?? 'monthly');
    if (!period)
        return res.status(400).json({ success: false, message: 'Invalid period' });
    if (!(0, database_1.isDBConnected)())
        return unavailable(res);
    try {
        return res.json({ success: true, data: await (0, activity_service_1.getHistory)(req.user.id, period) });
    }
    catch (error) {
        console.error('getReportHistory error:', error);
        return res.status(500).json({ success: false, message: 'Could not load your history' });
    }
};
exports.getReportHistory = getReportHistory;
const csvCell = (v) => String(v);
// @desc    Download the signed-in user's own report as CSV or PDF
// @route   GET /api/reports/export?period=monthly|yearly|historical&format=csv|pdf
// @access  Private
const downloadReport = async (req, res) => {
    const period = parsePeriod(req.query.period ?? 'monthly');
    const format = req.query.format === 'pdf' ? 'pdf' : req.query.format === undefined || req.query.format === 'csv' ? 'csv' : null;
    if (!period)
        return res.status(400).json({ success: false, message: 'Invalid period' });
    if (!format)
        return res.status(400).json({ success: false, message: 'Invalid format' });
    if (!(0, database_1.isDBConnected)())
        return unavailable(res);
    try {
        const history = await (0, activity_service_1.getHistory)(req.user.id, period);
        if (format === 'pdf') {
            const wearables = await (0, activity_service_1.wearableDays)(req.user.id, period === 'monthly' ? 30 : 90);
            const pdf = await (0, report_pdf_service_1.buildReportPdf)(history, { name: req.user.displayName, email: req.user.email }, wearables);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="reprummble-${period}-report.pdf"`);
            return res.status(200).send(pdf);
        }
        const header = ['Period (UTC)', 'Workouts', 'Workout minutes', 'Calories burned', 'Calories eaten', 'Protein (g)', 'Carbs (g)', 'Fat (g)'];
        const rows = history.rows.map((r) => [r.period, r.workouts, r.minutes, r.burned, r.calories, r.protein, r.carbs, r.fat]);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="reprummble-${period}-report.csv"`);
        return res.status(200).send([header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n'));
    }
    catch (error) {
        console.error('downloadReport error:', error);
        return res.status(500).json({ success: false, message: 'Could not build your report' });
    }
};
exports.downloadReport = downloadReport;
//# sourceMappingURL=report.controller.js.map