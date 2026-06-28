import { Router } from 'express'
import { prisma } from '../prisma'
import { requireAuth, type AuthedRequest } from '../middleware/auth'

export const holdingsRouter = Router()
holdingsRouter.use(requireAuth)

holdingsRouter.get('/', async (req: AuthedRequest, res) => {
  const holdings = await prisma.holding.findMany({ where: { userId: req.userId } })
  res.json(holdings)
})

holdingsRouter.post('/', async (req: AuthedRequest, res) => {
  const { coinId, symbol, name, amount } = req.body as {
    coinId?: string
    symbol?: string
    name?: string
    amount?: number
  }
  if (!coinId || !symbol || !name || !amount || amount <= 0) {
    res.status(400).json({ error: 'coinId, symbol, name, amount (>0) required' })
    return
  }

  const holding = await prisma.holding.upsert({
    where: { userId_coinId: { userId: req.userId!, coinId } },
    update: { amount: { increment: amount } },
    create: { userId: req.userId!, coinId, symbol, name, amount },
  })
  res.json(holding)
})

holdingsRouter.delete('/:coinId', async (req: AuthedRequest, res) => {
  const coinId = String(req.params.coinId)
  await prisma.holding.deleteMany({ where: { userId: req.userId, coinId } })
  res.json({ ok: true })
})
