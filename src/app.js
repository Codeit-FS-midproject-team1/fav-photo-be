// express

import express from 'express';
import cookieParser from 'cookie-parser';

export const app = express();

app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});
