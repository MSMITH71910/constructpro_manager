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
    blueprints: [],
    industries: [
        { id: 1, name: 'General Contractor', description: 'Residential and commercial construction' },
        { id: 2, name: 'Electrical', description: 'Electrical installations and repair' },
        { id: 3, name: 'Plumbing', description: 'Plumbing and HVAC services' },
        { id: 4, name: 'Roofing', description: 'Roofing and exterior work' },
        { id: 5, name: 'Landscaping', description: 'Site prep and landscaping' },
        { id: 6, name: 'Demolition', description: 'Structure removal and site clearing' },
        { id: 7, name: 'Chimney Sweep', description: 'Chimney cleaning, inspection and repair' }
    ],
    'contract-templates': [
        { 
            id: 1, 
            industry_id: 1, 
            name: 'Standard Construction Agreement', 
            type: 'Residential',
            description: 'Comprehensive agreement for residential projects',
            clauses: ['Scope of Work', 'Payment Schedule', 'Timeline', 'Warranty', 'Insurance']
        },
        { 
            id: 2, 
            industry_id: 1, 
            name: 'Small Project Contract', 
            type: 'Fixed Price',
            description: 'Simple 2-page contract for minor renovations',
            clauses: ['General Terms', 'Materials', 'Cleanup']
        }
    ],
    materials: [
        { id: 1, industry_id: 1, name: '2x4 Lumber', unit_cost: 8.50, unit_type: 'each', category: 'Lumber' },
        { id: 2, industry_id: 1, name: 'Plywood 3/4"', unit_cost: 45.00, unit_type: 'sheet', category: 'Lumber' },
        { id: 3, industry_id: 1, name: 'Concrete Mix', unit_cost: 6.50, unit_type: 'bag', category: 'Concrete' }
    ],
    labor: [
        { id: 1, industry_id: 1, task_name: 'Carpenter', hourly_rate: 45.00, category: 'Skilled' },
        { id: 2, industry_id: 1, task_name: 'General Labor', hourly_rate: 25.00, category: 'General' }
    ],
    schedules: [],
    'daily-logs': []
};

// API endpoints
app.get('/api/materials', (req, res) => {
    const industryId = req.query.industry;
    if (industryId) {
        res.json(apiData.materials.filter(m => m.industry_id == industryId));
    } else {
        res.json(apiData.materials);
    }
});

app.get('/api/labor', (req, res) => {
    const industryId = req.query.industry;
    if (industryId) {
        res.json(apiData.labor.filter(l => l.industry_id == industryId));
    } else {
        res.json(apiData.labor);
    }
});
app.get('/api/industries', (req, res) => {
    res.json(apiData.industries);
});

app.get('/api/contract-templates', (req, res) => {
    const industryId = req.query.industry;
    if (industryId) {
        res.json(apiData['contract-templates'].filter(t => t.industry_id == industryId));
    } else {
        res.json(apiData['contract-templates']);
    }
});
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

app.get('/api/schedules', (req, res) => {
    res.json(apiData.schedules);
});

app.post('/api/schedules', (req, res) => {
    const schedule = { id: Date.now().toString(), ...req.body };
    apiData.schedules.push(schedule);
    res.json(schedule);
});

app.get('/api/daily-logs', (req, res) => {
    res.json(apiData['daily-logs']);
});

app.post('/api/daily-logs', (req, res) => {
    const log = { id: Date.now().toString(), ...req.body };
    apiData['daily-logs'].push(log);
    res.json(log);
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