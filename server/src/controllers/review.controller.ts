import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Review } from '../models/Review.model'
import { isDBConnected } from '../config/database'

export async function getReviews(_req: Request, res: Response) {
  if (!isDBConnected()) return res.json({ reviews: [] })
  try {
    const reviews = await Review.find({ approved: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('name rating text source createdAt')
    res.json({ reviews })
  } catch {
    res.status(500).json({ error: 'Failed to fetch reviews' })
  }
}

export async function submitReview(req: Request, res: Response) {
  const { name, rating, text } = req.body
  if (!name || !rating || !text) {
    return res.status(400).json({ error: 'name, rating, and text are required' })
  }
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be 1–5' })
  }
  if (text.trim().length < 10) {
    return res.status(400).json({ error: 'Review must be at least 10 characters' })
  }
  try {
    const review = await Review.create({
      name: name.trim().slice(0, 80),
      rating,
      text: text.trim().slice(0, 1000),
      source: 'web',
      approved: false,
      userId: (req as any).user?.id,
    })
    res.status(201).json({
      success: true,
      message: 'Thank you! Your review is pending approval.',
      id: review._id,
    })
  } catch {
    res.status(500).json({ error: 'Failed to submit review' })
  }
}

export async function approveReview(req: Request, res: Response) {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' })
  const review = await Review.findByIdAndUpdate(id, { approved: true }, { new: true })
  if (!review) return res.status(404).json({ error: 'Review not found' })
  res.json({ success: true, review })
}

export async function deleteReview(req: Request, res: Response) {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' })
  const review = await Review.findByIdAndDelete(id)
  if (!review) return res.status(404).json({ error: 'Review not found' })
  res.json({ success: true })
}

export async function getPendingReviews(_req: Request, res: Response) {
  if (!isDBConnected()) return res.json({ reviews: [] })
  const reviews = await Review.find({ approved: false }).sort({ createdAt: -1 })
  res.json({ reviews })
}
