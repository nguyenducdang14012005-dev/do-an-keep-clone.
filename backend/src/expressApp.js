import express from 'express';
import cors from 'cors';
import labelRoutes from './routes/labels.js';
import noteRoutes from './routes/notes.js';
import reminderRoutes from './routes/reminders.js';
import shareRoutes from './routes/shares.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
});

app.use('/api/labels', labelRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/shares', shareRoutes);

app.get('/', (req, res) => {
    res.send('API đang chạy...');
});

export default app;