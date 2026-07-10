import express from 'express';
import { corsMiddleware } from './middleware/cors';
import apiRouter from './routes/index';

const app = express();

app.use(corsMiddleware);
app.use(express.json());
app.use('/api', apiRouter);

app.get('/', (_req, res) => {
  res.send('AGRIXMBD 2.0 Backend Service Running.');
});

export default app;
