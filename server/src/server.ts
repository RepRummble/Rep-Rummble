// Load environment variables FIRST before any other imports
import dotenv from 'dotenv'
dotenv.config()

import express, { Express, Request, Response, NextFunction } from 'express'
import { createServer } from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import path from 'path'
import fs from 'fs'
import { connectDB, isDBConnected } from './config/database'
import { initializeSocket } from './config/socket'
import { errorHandler } from './middleware/errorHandler'

// Import routes
import authRoutes from './routes/auth.routes'
import userRoutes from './routes/user.routes'
import mealRoutes from './routes/meal.routes'
import workoutRoutes from './routes/workout.routes'
import leaderboardRoutes from './routes/leaderboard.routes'
import aiRoutes from './routes/ai.routes'
import exerciseRoutes from './routes/exercise.routes'
import workoutPlanRoutes from './routes/workoutPlan.routes'
import leadRoutes from './routes/lead.routes'
import reportRoutes from './routes/report.routes'
import referralRoutes from './routes/referral.routes'
import businessRoutes from './routes/business.routes'
import contactRoutes from './routes/contact.routes'
import chatRoutes from './routes/chat.routes'
import agentRoutes from './routes/agent.routes'
import wearableRoutes from "./routes/wearable.routes";
import challengeRoutes from "./routes/challenge.routes";
import socialRoutes from "./routes/social.routes";
import friendRoutes from "./routes/friend.routes";
import statsRoutes from './routes/stats.routes'
import reviewRoutes from './routes/review.routes'

// Create Express app and HTTP server
const app: Express = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 5001

// Initialize Socket.io for real-time chat
initializeSocket(httpServer)

// Connect to MongoDB
connectDB()

// Middleware
app.use(helmet()) // Security headers

// CORS configuration for multiple origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://reprummble.com',
  'https://www.reprummble.com',
  process.env.CLIENT_URL,
].filter(Boolean) as string[]

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true)

    // Allow Vercel preview deployments
    if (origin.endsWith('.vercel.app')) return callback(null, true)

    // Exact match: a prefix check would also allow e.g. https://reprummble.com.attacker.site
    if (allowedOrigins.some(allowed => origin === allowed.replace(/\/$/, ''))) {
      return callback(null, true)
    }

    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}

app.use(cors(corsOptions))
app.use(compression()) // Compress responses
app.use(morgan('dev')) // Logging
app.use(express.json({ limit: '50mb' })) // Parse JSON bodies (increased for image uploads)
app.use(express.urlencoded({ extended: true, limit: '50mb' })) // Parse URL-encoded bodies

// Health check endpoint with service status
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "OK",
    message: "Reprummble API is running",
    timestamp: new Date().toISOString(),
    services: {
      mongodb: isDBConnected() ? "connected" : "not configured",
      supabase: process.env.SUPABASE_URL ? "configured" : "not configured",
      gemini: process.env.GEMINI_API_KEY ? "configured" : "not configured",
    }
  });
});

// Serve frontend static files if present
const clientBuildPath = path.join(__dirname, '..', '..', 'web', 'dist')
const hasClientBuild = fs.existsSync(clientBuildPath)
if (hasClientBuild) {
  app.use(express.static(clientBuildPath))
}

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/meals', mealRoutes)
app.use('/api/workouts', workoutRoutes)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/exercises', exerciseRoutes)
app.use('/api/workout-plans', workoutPlanRoutes)
app.use('/api/leads', leadRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/referrals', referralRoutes)
app.use('/api/business', businessRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/agent', agentRoutes)
app.use("/api/wearables", wearableRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/friends", friendRoutes);
app.use('/api/public/stats', statsRoutes)
app.use('/api/reviews', reviewRoutes)

if (hasClientBuild) {
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next()
    }
    return res.sendFile(path.join(clientBuildPath, 'index.html'))
  })
} else {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next()
    }
    return res.redirect(clientUrl)
  })
}

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler (must be last)
app.use(errorHandler)

// Start server with Socket.io
httpServer.listen(PORT, () => {
  console.log('')
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║           REPRUMMBLE API SERVER                        ║')
  console.log('╠════════════════════════════════════════════════════════╣')
  console.log(`║  🚀 Server:    http://localhost:${PORT}`)
  console.log(`║  📝 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log('╠════════════════════════════════════════════════════════╣')
  console.log('║  SERVICES STATUS:                                      ║')
  console.log(`║  🔐 Supabase Auth: ${process.env.SUPABASE_URL ? '✅ Configured' : '⚠️  Not configured'}`)
  console.log(`║  🍃 MongoDB:       ${isDBConnected() ? '✅ Connected' : '⚠️  Connecting...'}`)
  console.log(`║  🤖 Gemini AI:     ${process.env.GEMINI_API_KEY ? '✅ Configured' : '⚠️  Not configured'}`)
  console.log(`║  💬 Socket.io:     ✅ Enabled (Real-time chat)`)
  console.log('╚════════════════════════════════════════════════════════╝')
  console.log('')
})

export default app

