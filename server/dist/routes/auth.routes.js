"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimit_middleware_1 = require("../middleware/rateLimit.middleware");
const router = (0, express_1.Router)();
// Public routes (rate-limited against brute-force / credential stuffing)
router.post('/register', rateLimit_middleware_1.authLimiter, auth_controller_1.register);
router.post('/login', rateLimit_middleware_1.loginLimiter, auth_controller_1.login);
router.post('/refresh', rateLimit_middleware_1.refreshLimiter, auth_controller_1.refresh);
router.post('/resend-verification', rateLimit_middleware_1.resendLimiter, auth_controller_1.resendVerification);
// OAuth routes (Supabase handles the callback)
router.get('/oauth/:provider', auth_controller_1.getOAuthUrl);
// Protected routes
router.get('/me', auth_middleware_1.protect, auth_controller_1.getMe);
router.post('/logout', auth_middleware_1.protect, auth_controller_1.logout);
router.put('/profile', auth_middleware_1.protect, auth_controller_1.updateProfile);
// Note: For local testing you can use the bypass token by setting
// the Authorization header to: "Bearer <TEMP_BYPASS_TOKEN>"
router.delete('/account', auth_middleware_1.protect, auth_controller_1.deleteAccount);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map