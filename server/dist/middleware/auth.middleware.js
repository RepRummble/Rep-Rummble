"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentOnly = exports.adminOnly = exports.optionalAuth = exports.protect = void 0;
exports.isThirdPartyToken = isThirdPartyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_service_1 = require("../services/supabase.service");
const security_1 = require("../config/security");
/**
 * Tokens issued by Supabase's OAuth server to a third-party app are ordinary sign-in tokens for the
 * user plus a `client_id` claim, and their scopes do not limit what an API accepts. This API is for
 * Reprummble's own apps, so those tokens are refused (the signature is already checked by Supabase).
 */
function isThirdPartyToken(token) {
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'));
        return typeof payload?.client_id === 'string' && payload.client_id.length > 0;
    }
    catch {
        return false;
    }
}
const protect = async (req, res, next) => {
    try {
        let token;
        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Local development only. In production this token is never accepted, otherwise anyone
        // could send "Bearer dev-bypass-token" and be treated as a signed-in user.
        const BYPASS_TOKEN = process.env.NODE_ENV === 'production' ? '' : (process.env.TEMP_BYPASS_TOKEN || 'dev-bypass-token');
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
            return;
        }
        if (BYPASS_TOKEN && token === BYPASS_TOKEN) {
            // Attach a fake bypass user for local testing
            req.user = {
                id: '00000000-0000-0000-0000-000000000000',
                email: 'dev@local',
                displayName: 'Dev Bypass User',
                emailVerified: true,
                isBypass: true,
            };
            console.log('[auth.middleware] bypass token used, user set to', req.user);
            next();
            return;
        }
        // Try Supabase token verification first
        const supabaseResult = await (0, supabase_service_1.verifyToken)(token);
        if (supabaseResult.success && supabaseResult.user) {
            if (isThirdPartyToken(token)) {
                res.status(403).json({
                    success: false,
                    message: 'Access tokens issued to third-party apps cannot be used with this API'
                });
                return;
            }
            req.user = {
                id: supabaseResult.user.id,
                email: supabaseResult.user.email,
                displayName: supabaseResult.user.user_metadata?.displayName,
                emailVerified: !!supabaseResult.user.email_confirmed_at,
            };
            next();
            return;
        }
        // Fallback to JWT verification
        try {
            const decoded = jsonwebtoken_1.default.verify(token, security_1.JWT_SECRET);
            req.user = {
                id: decoded.id
            };
            next();
            return;
        }
        catch (jwtError) {
            res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
            return;
        }
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during authentication'
        });
        return;
    }
};
exports.protect = protect;
// Optional auth - doesn't require token but will attach user if present
const optionalAuth = async (req, res, next) => {
    try {
        void res;
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            next();
            return;
        }
        // Try Supabase token verification
        const supabaseResult = await (0, supabase_service_1.verifyToken)(token);
        if (supabaseResult.success && supabaseResult.user) {
            if (!isThirdPartyToken(token)) {
                req.user = {
                    id: supabaseResult.user.id,
                    email: supabaseResult.user.email,
                    displayName: supabaseResult.user.user_metadata?.displayName,
                    emailVerified: !!supabaseResult.user.email_confirmed_at,
                };
            }
        }
        else {
            // Fallback to JWT
            try {
                const decoded = jsonwebtoken_1.default.verify(token, security_1.JWT_SECRET);
                req.user = { id: decoded.id };
            }
            catch {
                // Token invalid but optional, continue without user
            }
        }
        next();
    }
    catch (error) {
        // Don't fail, just continue without user
        next();
    }
};
exports.optionalAuth = optionalAuth;
// Admin check middleware - requires the authenticated user's role to be 'admin' in the DB
const adminOnly = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Not authorized'
        });
        return;
    }
    try {
        // Dynamic import to avoid circular dependency, matching agentOnly below
        const { User } = await import('../models/User.model.js');
        const dbUser = await User.findById(req.user.id).select('role');
        if (!dbUser || dbUser.role !== 'admin') {
            res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during admin verification'
        });
    }
};
exports.adminOnly = adminOnly;
// Agent check middleware - ensures user is a support agent
const agentOnly = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Not authorized'
        });
        return;
    }
    try {
        // Dynamic import to avoid circular dependency
        const { SupportAgent } = await import('../models/SupportAgent.model.js');
        const agent = await SupportAgent.findOne({ userId: req.user.id });
        if (!agent) {
            res.status(403).json({
                success: false,
                message: 'Agent access required'
            });
            return;
        }
        // Attach agent to request for use in controllers
        ;
        req.agent = agent;
        next();
    }
    catch (error) {
        console.error('Agent middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during agent verification'
        });
    }
};
exports.agentOnly = agentOnly;
//# sourceMappingURL=auth.middleware.js.map