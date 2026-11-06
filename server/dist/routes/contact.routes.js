"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contact_controller_1 = require("../controllers/contact.controller");
const rateLimit_middleware_1 = require("../middleware/rateLimit.middleware");
const router = (0, express_1.Router)();
router.post('/', rateLimit_middleware_1.submitLimiter, contact_controller_1.createContact);
exports.default = router;
//# sourceMappingURL=contact.routes.js.map