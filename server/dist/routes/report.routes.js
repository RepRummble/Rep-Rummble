"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimit_middleware_1 = require("../middleware/rateLimit.middleware");
const report_controller_1 = require("../controllers/report.controller");
const router = (0, express_1.Router)();
// Reports contain personal health data, so they are only available to the signed-in owner.
// Per-IP first (so junk tokens are stopped before the sign-in check), then per person.
router.use((0, rateLimit_middleware_1.perIpLimiter)(120));
router.use(auth_middleware_1.protect);
router.get('/history', (0, rateLimit_middleware_1.perUserLimiter)(60, 15 * 60 * 1000), report_controller_1.getReportHistory);
// Building a PDF is the heaviest request here, so keep downloads to 20 per 15 minutes.
router.get('/export', (0, rateLimit_middleware_1.perUserLimiter)(20, 15 * 60 * 1000), report_controller_1.downloadReport);
exports.default = router;
//# sourceMappingURL=report.routes.js.map