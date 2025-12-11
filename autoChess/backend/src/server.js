import express from 'express';
import cors from 'cors';
import { simulateCampaign, getConfig } from './simulation.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

app.get('/api/config', (_req, res) => {
  res.json(getConfig());
});

app.post('/api/battle', (req, res) => {
  const { playerUnits } = req.body || {};
  if (!Array.isArray(playerUnits) || playerUnits.length === 0) {
    return res.status(400).json({ error: 'playerUnits 배열을 최소 1개 이상 보내주세요. 예: [{ id: "u1", star: 1 }]' });
  }
  const sanitized = playerUnits.slice(0, 10).map((u) => ({ id: String(u.id), star: Number(u.star) || 1 }));
  const result = simulateCampaign(sanitized);
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`AutoChess backend listening on port ${PORT}`);
});

