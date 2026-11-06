"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = require("../controllers/chat.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const support_ai_service_1 = require("../services/support-ai.service");
const rateLimit_middleware_1 = require("../middleware/rateLimit.middleware");
const router = (0, express_1.Router)();
function parseChatBody(body) {
    const { message, history } = (body ?? {});
    if (typeof message !== 'string' || !message.trim())
        return null;
    const cleanHistory = Array.isArray(history)
        ? history
            .filter((m) => !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
            .slice(-12)
        : [];
    return { message: message.trim().slice(0, support_ai_service_1.MAX_MESSAGE_CHARS), history: cleanHistory };
}
router.post('/ai', rateLimit_middleware_1.chatLimiter, async (req, res) => {
    const parsed = parseChatBody(req.body);
    if (!parsed)
        return res.status(400).json({ success: false, message: 'message is required' });
    try {
        const result = await (0, support_ai_service_1.generateAIChatResponse)(parsed.message, parsed.history);
        return res.json({ success: true, data: result });
    }
    catch (err) {
        console.error('Chat AI error:', err);
        return res.status(500).json({ success: false, message: 'AI service error' });
    }
});
// Server-Sent Events: the reply arrives word by word as the model generates it.
router.post('/ai/stream', rateLimit_middleware_1.chatLimiter, async (req, res) => {
    const parsed = parseChatBody(req.body);
    if (!parsed)
        return res.status(400).json({ success: false, message: 'message is required' });
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    let closed = false;
    res.on('close', () => { closed = true; });
    // compression() buffers output; flush so each chunk reaches the browser immediately.
    const send = (payload) => {
        if (closed)
            return;
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
        res.flush?.();
    };
    try {
        const result = await (0, support_ai_service_1.streamAIChatResponse)(parsed.message, parsed.history, (text) => send({ type: 'delta', text }), () => closed);
        send({ type: 'done', quickReplies: result.quickReplies, fallback: !!result.fallback });
    }
    catch (err) {
        console.error('Chat stream error:', err);
        send({ type: 'error' });
    }
    finally {
        if (!closed)
            res.end();
    }
});
// Legacy routes kept for compatibility
router.post('/start', auth_middleware_1.optionalAuth, chat_controller_1.startConversation);
router.get('/conversation/:id', auth_middleware_1.optionalAuth, chat_controller_1.getConversation);
router.post('/message', auth_middleware_1.optionalAuth, chat_controller_1.sendMessage);
router.post('/rate/:conversationId', auth_middleware_1.optionalAuth, chat_controller_1.rateConversation);
router.post('/close/:conversationId', auth_middleware_1.optionalAuth, chat_controller_1.closeConversation);
router.get('/history', auth_middleware_1.protect, chat_controller_1.getChatHistory);
exports.default = router;
//# sourceMappingURL=chat.routes.js.map