import { Router } from 'express'
import { prisma } from '../prisma'
import { requireAuth, type AuthedRequest } from '../middleware/auth'

export const holdingsRouter = Router()
holdingsRouter.use(requireAuth)

const MAX_HOLDINGS = 20

holdingsRouter.get('/', async (req: AuthedRequest, res) => {
  const holdings = await prisma.holding.findMany({
    where: { userId: req.userId },
    orderBy: { purchaseDate: 'desc' },
  })
  res.json(holdings)
})

holdingsRouter.post('/', async (req: AuthedRequest, res) => {
  const { coinId, symbol, name, amount, purchasePrice, purchaseDate, platform } = req.body as {
    coinId?: string
    symbol?: string
    name?: string
    amount?: number
    purchasePrice?: number
    purchaseDate?: string
    platform?: string
  }

  if (!coinId || !symbol || !name || !amount || amount <= 0) {
    res.status(400).json({ error: 'coinId, symbol, name, amount (>0) required' })
    return
  }
  if (purchasePrice === undefined || purchasePrice === null || purchasePrice <= 0) {
    res.status(400).json({ error: 'purchasePrice (>0) required' })
    return
  }
  if (!purchaseDate || Number.isNaN(new Date(purchaseDate).getTime())) {
    res.status(400).json({ error: 'purchaseDate required' })
    return
  }
  if (!platform || !platform.trim()) {
    res.status(400).json({ error: 'platform required' })
    return
  }

  const count = await prisma.holding.count({ where: { userId: req.userId } })
  if (count >= MAX_HOLDINGS) {
    res.status(400).json({ error: `You can track up to ${MAX_HOLDINGS} holdings. Remove one before adding another.` })
    return
  }

  const holding = await prisma.holding.create({
    data: {
      userId: req.userId!,
      coinId,
      symbol,
      name,
      amount,
      purchasePrice,
      purchaseDate: new Date(purchaseDate),
      platform: platform.trim(),
    },
  })
  res.json(holding)
})

holdingsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const id = String(req.params.id)
  await prisma.holding.deleteMany({ where: { id, userId: req.userId } })
  res.json({ ok: true })
})
