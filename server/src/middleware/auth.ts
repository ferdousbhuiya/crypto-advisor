import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthedRequest extends Request {
  userId?: string
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    res.status(401).json({ error: 'Missing auth token' })
    return
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
