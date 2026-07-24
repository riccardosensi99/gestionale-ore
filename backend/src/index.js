import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { configurePassport } from './passport.js';
import { notFound, errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import entriesRoutes from './routes/entries.js';
import summaryRoutes from './routes/summary.js';
import exportRoutes from './routes/export.js';
import adminRoutes from './routes/admin.js';

const app = express();

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(configurePassport().initialize());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/entries', entriesRoutes);
app.use('/summary', summaryRoutes);
app.use('/export', exportRoutes);
app.use('/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[server] API in ascolto sulla porta ${config.port}`);
});
