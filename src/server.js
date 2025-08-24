const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

// Serve static files from renderer directory
app.use(express.static(path.join(__dirname, 'renderer')));

// API Routes for data management
const apiData = {
    projects: [],
    clients: [],
    contracts: [],
    estimates: [],
    blueprints: []
};

// API endpoints
app.get('/api/projects', (req, res) => {
    res.json(apiData.projects);
});

app.post('/api/projects', (req, res) => {
    const project = { id: Date.now().toString(), ...req.body };
    apiData.projects.push(project);
    res.json(project);
});

app.get('/api/clients', (req, res) => {
    res.json(apiData.clients);
});

app.post('/api/clients', (req, res) => {
    const client = { id: Date.now().toString(), ...req.body };
    apiData.clients.push(client);
    res.json(client);
});

app.get('/api/contracts', (req, res) => {
    res.json(apiData.contracts);
});

app.post('/api/contracts', (req, res) => {
    const contract = { id: Date.now().toString(), ...req.body };
    apiData.contracts.push(contract);
    res.json(contract);
});

app.get('/api/estimates', (req, res) => {
    res.json(apiData.estimates);
});

app.post('/api/estimates', (req, res) => {
    const estimate = { id: Date.now().toString(), ...req.body };
    apiData.estimates.push(estimate);
    res.json(estimate);
});

app.get('/api/blueprints', (req, res) => {
    res.json(apiData.blueprints);
});

app.post('/api/blueprints', (req, res) => {
    const blueprint = { id: Date.now().toString(), ...req.body };
    apiData.blueprints.push(blueprint);
    res.json(blueprint);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve main application for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'renderer', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

app.listen(PORT, () => {
    console.log(`ConstructPro Manager server running on port ${PORT}`);
    console.log(`Access the application at: http://localhost:${PORT}`);
});

module.exports = app;