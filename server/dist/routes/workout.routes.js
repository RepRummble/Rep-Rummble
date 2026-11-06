"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const workout_controller_1 = require("../controllers/workout.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.protect); // All routes require authentication
router.route('/')
    .get(workout_controller_1.getWorkouts)
    .post(workout_controller_1.createWorkout);
// Allow unauthenticated visitors to fetch aggregated stats (optional auth)
router.get('/stats', auth_middleware_1.optionalAuth, workout_controller_1.getWorkoutStats);
router.route('/:id')
    .get(workout_controller_1.getWorkout)
    .delete(workout_controller_1.deleteWorkout);
exports.default = router;
//# sourceMappingURL=workout.routes.js.map