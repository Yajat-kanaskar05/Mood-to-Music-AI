require('dotenv').config();
const app  = require('./app');
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`[Node.js Backend] Server running on http://localhost:${PORT}`);
  console.log(`[Node.js Backend] Connected to SQLite database and configured ML endpoint at ${process.env.ML_SERVICE_URL || 'http://localhost:8000'}`);
});
