import express from 'express';

const app = express();
const port = 5000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});
