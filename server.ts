import express from "express";
import cors from "cors";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = parseInt(Deno.env.get("PORT") || "8000");

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security headers
app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    if (Deno.env.get('NODE_ENV') === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

// Get current directory for Deno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Serve static files from renderer directory
app.use(express.static(join(__dirname, 'src', 'renderer')));

// API Routes for data management
const apiData = {
    projects: [] as any[],
    clients: [] as any[],
    contracts: [] as any[],
    estimates: [] as any[],
    blueprints: [] as any[]
};

// API endpoints
app.get('/api/projects', (_req: any, res: any) => {
    res.json(apiData.projects);
});

app.post('/api/projects', (req: any, res: any) => {
    const project = { id: Date.now().toString(), ...req.body };
    apiData.projects.push(project);
    res.json(project);
});

app.get('/api/clients', (_req: any, res: any) => {
    res.json(apiData.clients);
});

app.post('/api/clients', (req: any, res: any) => {
    const client = { id: Date.now().toString(), ...req.body };
    apiData.clients.push(client);
    res.json(client);
});

app.get('/api/contracts', (_req: any, res: any) => {
    res.json(apiData.contracts);
});

app.post('/api/contracts', (req: any, res: any) => {
    const contract = { id: Date.now().toString(), ...req.body };
    apiData.contracts.push(contract);
    res.json(contract);
});

app.get('/api/estimates', (_req: any, res: any) => {
    res.json(apiData.estimates);
});

app.post('/api/estimates', (req: any, res: any) => {
    const estimate = { id: Date.now().toString(), ...req.body };
    apiData.estimates.push(estimate);
    res.json(estimate);
});

app.get('/api/blueprints', (_req: any, res: any) => {
    res.json(apiData.blueprints);
});

app.post('/api/blueprints', (req: any, res: any) => {
    const blueprint = { id: Date.now().toString(), ...req.body };
    apiData.blueprints.push(blueprint);
    res.json(blueprint);
});

// Health check endpoint
app.get('/health', (_req: any, res: any) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: performance.now() / 1000,
        runtime: 'Deno',
        environment: Deno.env.get('NODE_ENV') || 'development'
    });
});

// Serve main application for all other routes
app.get('*', (_req: any, res: any) => {
    res.sendFile(join(__dirname, 'src', 'renderer', 'index.html'));
});

// Error handling middleware
app.use((err: any, _req: any, res: any, _next: any) => {
    console.error('Error:', err.message);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: Deno.env.get('NODE_ENV') === 'development' ? err.message : 'Something went wrong'
    });
});

app.listen(PORT, () => {
    console.log(`ConstructPro Manager (Deno) running on port ${PORT}`);
    console.log(`Access the application at: http://localhost:${PORT}`);
});

export default app;