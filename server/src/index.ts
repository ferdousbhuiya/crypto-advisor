import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { authRouter } from './routes/auth'
import { holdingsRouter } from './routes/holdings'
import { proxyRouter } from './routes/proxy'

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET env var is required')
}

const app = express()
const allowedOrigin = process.env.CLIENT_ORIGIN
app.use(cors(allowedOrigin ? { origin: allowedOrigin } : {}))
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/holdings', holdingsRouter)
app.use('/api/coingecko', proxyRouter)

const clientDist = path.join(__dirname, '../../dist')
app.use(express.static(clientDist))
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

const port = process.env.PORT ?? 4000
app.listen(port, () => {
  console.log(`server listening on :${port}`)
})
