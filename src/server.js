import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import postsRoutes from './routes/posts.js';
import { testConnection } from './config/db.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await testConnection();
    res.json({ status: 'ok' });
  } catch {
    res.status(500).json({ status: 'db_error' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);

app.use((req, res, next) => {
  res.status(404).json({ message: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});

