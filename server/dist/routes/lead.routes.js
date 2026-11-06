"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lead_controller_1 = require("../controllers/lead.controller");
const rateLimit_middleware_1 = require("../middleware/rateLimit.middleware");
const router = (0, express_1.Router)();
router.post('/', rateLimit_middleware_1.submitLimiter, lead_controller_1.createLead);
exports.default = router;
//# sourceMappingURL=lead.routes.js.map