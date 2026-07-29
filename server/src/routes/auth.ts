import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma'

export const authRouter = Router()

function sign(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '30d' })
}

authRouter.post('/signup', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password || password.length < 8) {
    res.status(400).json({ error: 'Email required, password must be 8+ characters' })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Account already exists for this email' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, passwordHash } })
  res.json({ token: sign(user.id), email: user.email })
})

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  res.json({ token: sign(user.id), email: user.email })
})
