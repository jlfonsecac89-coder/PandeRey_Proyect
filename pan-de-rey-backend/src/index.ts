import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDbPool } from './db';
import catalogRoutes from './routes/catalog';
import stockRoutes from './routes/stock';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/catalog', catalogRoutes);
app.use('/api/stock', stockRoutes);

// Health check and DB init test
app.get('/api/health', async (req, res) => {
    try {
        await getDbPool();
        res.json({ status: 'ok', message: 'API and Database are up and running', time: new Date() });
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Database connection failed' });
    }
});

app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});
