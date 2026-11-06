"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables FIRST before any other imports
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ quiet: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("./config/database");
const socket_1 = require("./config/socket");
const errorHandler_1 = require("./middleware/errorHandler");
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const meal_routes_1 = __importDefault(require("./routes/meal.routes"));
const workout_routes_1 = __importDefault(require("./routes/workout.routes"));
const leaderboard_routes_1 = __importDefault(require("./routes/leaderboard.routes"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const exercise_routes_1 = __importDefault(require("./routes/exercise.routes"));
const workoutPlan_routes_1 = __importDefault(require("./routes/workoutPlan.routes"));
const lead_routes_1 = __importDefault(require("./routes/lead.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const referral_routes_1 = __importDefault(require("./routes/referral.routes"));
const billing_routes_1 = __importDefault(require("./routes/billing.routes"));
const supabase_service_1 = require("./services/supabase.service");
const billing_controller_1 = require("./controllers/billing.controller");
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const business_routes_1 = __importDefault(require("./routes/business.routes"));
const contact_routes_1 = __importDefault(require("./routes/contact.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const agent_routes_1 = __importDefault(require("./routes/agent.routes"));
const wearable_routes_1 = __importDefault(require("./routes/wearable.routes"));
const challenge_routes_1 = __importDefault(require("./routes/challenge.routes"));
const social_routes_1 = __importDefault(require("./routes/social.routes"));
const friend_routes_1 = __importDefault(require("./routes/friend.routes"));
const stats_routes_1 = __importDefault(require("./routes/stats.routes"));
const review_routes_1 = __importDefault(require("./routes/review.routes"));
// Create Express app and HTTP server
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 5001;
// Initialize Socket.io for real-time chat
(0, socket_1.initializeSocket)(httpServer);
// Connect to MongoDB
(0, database_1.connectDB)();
// Middleware
app.use((0, helmet_1.default)()); // Security headers
// CORS configuration for multiple origins
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://reprummble.com',
    'https://www.reprummble.com',
    process.env.CLIENT_URL,
].filter(Boolean);
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, server-to-server)
        if (!origin)
            return callback(null, true);
        // Allow Vercel preview deployments
        if (origin.endsWith('.vercel.app'))
            return callback(null, true);
        // Exact match: a prefix check would also allow e.g. https://reprummble.com.attacker.site
        if (allowedOrigins.some(allowed => origin === allowed.replace(/\/$/, ''))) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
app.use((0, compression_1.default)()); // Compress responses
app.use((0, morgan_1.default)('dev')); // Logging
// Stripe signs the exact bytes it sends, so its webhook must see the raw body, before JSON parsing.
app.post('/api/billing/webhook', express_1.default.raw({ type: 'application/json', limit: '1mb' }), billing_controller_1.stripeWebhook);
app.use(express_1.default.json({ limit: '50mb' })); // Parse JSON bodies (increased for image uploads)
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded bodies
// Express 5 leaves req.body undefined when a request has no body; handlers read fields from it, so keep it an object.
app.use((req, _res, next) => { if (req.body === undefined)
    req.body = {}; next(); });
// Health check endpoint with service status
app.get("/api/health", async (_req, res) => {
    const keys = await (0, supabase_service_1.checkSupabaseKeys)();
    res.json({
        status: "OK",
        message: "Reprummble API is running",
        timestamp: new Date().toISOString(),
        services: {
            mongodb: (0, database_1.isDBConnected)() ? "connected" : "not configured",
            supabase: process.env.SUPABASE_URL ? "configured" : "not configured",
            // Whether Supabase accepts our keys. "rejected" explains "Invalid API key" on every sign-in.
            supabaseKeys: keys,
            gemini: process.env.GEMINI_API_KEY ? "configured" : "not configured",
        }
    });
});
// Serve frontend static files if present
const clientBuildPath = path_1.default.join(__dirname, '..', '..', 'web', 'dist');
const hasClientBuild = fs_1.default.existsSync(clientBuildPath);
if (hasClientBuild) {
    app.use(express_1.default.static(clientBuildPath));
}
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/meals', meal_routes_1.default);
app.use('/api/workouts', workout_routes_1.default);
app.use('/api/leaderboard', leaderboard_routes_1.default);
app.use('/api/ai', ai_routes_1.default);
app.use('/api/exercises', exercise_routes_1.default);
app.use('/api/workout-plans', workoutPlan_routes_1.default);
app.use('/api/leads', lead_routes_1.default);
app.use('/api/reports', report_routes_1.default);
app.use('/api/referrals', referral_routes_1.default);
app.use('/api/billing', billing_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/business', business_routes_1.default);
app.use('/api/contact', contact_routes_1.default);
app.use('/api/chat', chat_routes_1.default);
app.use('/api/agent', agent_routes_1.default);
app.use("/api/wearables", wearable_routes_1.default);
app.use("/api/challenges", challenge_routes_1.default);
app.use("/api/social", social_routes_1.default);
app.use("/api/friends", friend_routes_1.default);
app.use('/api/public/stats', stats_routes_1.default);
app.use('/api/reviews', review_routes_1.default);
if (hasClientBuild) {
    app.get('/{*splat}', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }
        return res.sendFile(path_1.default.join(clientBuildPath, 'index.html'));
    });
}
else {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    app.get('/{*splat}', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }
        return res.redirect(clientUrl);
    });
}
// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});
// Error handler (must be last)
app.use(errorHandler_1.errorHandler);
// Start server with Socket.io
httpServer.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║           REPRUMMBLE API SERVER                        ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║  🚀 Server:    http://localhost:${PORT}`);
    console.log(`║  📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║  SERVICES STATUS:                                      ║');
    console.log(`║  🔐 Supabase Auth: ${process.env.SUPABASE_URL ? '✅ Configured' : '⚠️  Not configured'}`);
    console.log(`║  🍃 MongoDB:       ${(0, database_1.isDBConnected)() ? '✅ Connected' : '⚠️  Connecting...'}`);
    console.log(`║  🤖 Gemini AI:     ${process.env.GEMINI_API_KEY ? '✅ Configured' : '⚠️  Not configured'}`);
    console.log(`║  💬 Socket.io:     ✅ Enabled (Real-time chat)`);
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
});
exports.default = app;
//# sourceMappingURL=server.js.map