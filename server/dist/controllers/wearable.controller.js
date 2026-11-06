"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestHealthMetrics = exports.getWearableData = exports.syncWearableData = void 0;
const WearableData_model_1 = require("../models/WearableData.model");
const database_1 = require("../config/database");
/** A finite number within [min, max], or null. Anything else (text, objects, NaN) is ignored. */
const num = (value, min, max) => {
    const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
// @route POST /api/wearables/sync
// One row per person per day: syncing again the same day updates that day's row.
const syncWearableData = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        if (!(0, database_1.isDBConnected)())
            return res.status(503).json({ error: "Service temporarily unavailable" });
        const body = req.body ?? {};
        const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD, UTC
        // Only change what this sync actually sent; anything missing keeps today's earlier value
        // (or starts at 0 for the three counters when the day has no row yet).
        const set = { syncedAt: new Date() };
        const onInsert = {};
        const counters = [
            ["steps", num(body.steps, 0, 500_000)],
            ["calories", num(body.calories, 0, 50_000)],
            ["sleepHours", num(body.sleepHours, 0, 24)],
        ];
        for (const [key, value] of counters) {
            if (value !== null)
                set[key] = value;
            else
                onInsert[key] = 0;
        }
        const optional = [
            ["heartRate", num(body.heartRate, 20, 260)],
            ["restingHR", num(body.restingHR, 20, 200)],
            ["hrv", num(body.hrv, 0, 500)],
            ["weight", num(body.weight, 1, 700)],
            ["bodyFat", num(body.bodyFat, 0, 100)],
        ];
        for (const [key, value] of optional)
            if (value !== null)
                set[key] = value;
        const wearableData = await WearableData_model_1.WearableData.findOneAndUpdate({ userId, date }, { $set: set, ...(Object.keys(onInsert).length ? { $setOnInsert: onInsert } : {}) }, { upsert: true, new: true, runValidators: true });
        res.json({ success: true, message: "Wearable data synced successfully", data: wearableData });
    }
    catch (error) {
        console.error("Error syncing wearable data:", error);
        res.status(500).json({ error: "Failed to sync wearable data" });
    }
};
exports.syncWearableData = syncWearableData;
// @route GET /api/wearables/data?days=7
const getWearableData = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        if (!(0, database_1.isDBConnected)())
            return res.status(503).json({ error: "Service temporarily unavailable" });
        const days = Math.min(365, Math.max(1, Math.floor(Number(req.query.days ?? 7)) || 7));
        const startDate = new Date(Date.now() - (days - 1) * 86_400_000);
        const wearableData = await WearableData_model_1.WearableData.find({
            userId,
            date: { $gte: startDate.toISOString().split("T")[0] },
        }).sort({ date: -1 });
        res.json({ success: true, data: wearableData });
    }
    catch (error) {
        console.error("Error fetching wearable data:", error);
        res.status(500).json({ error: "Failed to fetch wearable data" });
    }
};
exports.getWearableData = getWearableData;
// @route GET /api/wearables/metrics
// The most recent value of each reading, even when it came from different days.
const getLatestHealthMetrics = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        if (!(0, database_1.isDBConnected)())
            return res.status(503).json({ error: "Service temporarily unavailable" });
        const recent = await WearableData_model_1.WearableData.find({ userId }).sort({ date: -1 }).limit(30);
        const latest = (key) => recent.find((d) => d[key] != null)?.[key] ?? null;
        res.json({
            success: true,
            data: {
                steps: recent[0]?.steps ?? 0,
                calories: recent[0]?.calories ?? 0,
                sleepHours: recent[0]?.sleepHours ?? 0,
                heartRate: latest("heartRate"),
                restingHR: latest("restingHR"),
                hrv: latest("hrv"),
                weight: latest("weight"),
                bodyFat: latest("bodyFat"),
                lastSync: recent[0]?.syncedAt ?? null,
            },
        });
    }
    catch (error) {
        console.error("Error fetching health metrics:", error);
        res.status(500).json({ error: "Failed to fetch health metrics" });
    }
};
exports.getLatestHealthMetrics = getLatestHealthMetrics;
//# sourceMappingURL=wearable.controller.js.map