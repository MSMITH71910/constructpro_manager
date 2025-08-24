/**
 * Unified Data Manager for ConstructPro
 * Handles all data relationships between Projects, Clients, Blueprints, Takeoffs, Estimates, and Contracts
 */
class DataManager {
    constructor() {
        this.currentUser = null;
        this.data = {
            projects: [],
            clients: [],
            blueprints: [],
            takeoffs: [],
            estimates: [],
            contracts: [],
            materials: [],
            labor: []
        };
        this.currentProject = null;
        this.init();
    }

    async init() {
        this.currentUser = window.authManager?.getCurrentUser();
        await this.loadAllData();
        this.setupEventListeners();
        this.setupAuthListeners();
        console.log('DataManager initialized with integrated data');
    }

    setupAuthListeners() {
        window.addEventListener('authStateChanged', (event) => {
            const { type, user } = event.detail;
            
            if (type === 'login') {
                this.currentUser = user;
                this.loadAllData(); // Reload data for new user
            } else if (type === 'logout') {
                this.currentUser = null;
                this.clearData();
            }
        });
    }

    getUserDataKey(dataType) {
        if (!this.currentUser) return `constructpro_${dataType}`;
        return `constructpro_${this.currentUser.id}_${dataType}`;
    }

    clearData() {
        this.data = {
            projects: [],
            clients: [],
            blueprints: [],
            takeoffs: [],
            estimates: [],
            contracts: [],
            materials: [],
            labor: []
        };
    }

    async loadAllData() {
        try {
            // Load all data types
            for (const dataType of Object.keys(this.data)) {
                await this.loadData(dataType);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }

    async loadData(dataType) {
        try {
            // Try API first, fallback to localStorage
            let data = [];
            try {
                const response = await fetch(`/api/${dataType}`);
                if (response.ok) {
                    data = await response.json();
                }
            } catch (apiError) {
                const stored = localStorage.getItem(this.getUserDataKey(dataType));
                data = stored ? JSON.parse(stored) : [];
            }
            
            this.data[dataType] = data;
            this.notifyDataChange(dataType);
        } catch (error) {
            console.error(`Failed to load ${dataType}:`, error);
            this.data[dataType] = [];
        }
    }

    async saveData(dataType, item) {
        try {
            // Ensure the item has proper relationships
            item = this.addRelationships(dataType, item);
            
            // Try API first
            try {
                const response = await fetch(`/api/${dataType}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                });
                
                if (response.ok) {
                    const savedItem = await response.json();
                    this.updateLocalData(dataType, savedItem);
                    return savedItem;
                }
            } catch (apiError) {
                // Fallback to localStorage
                item.id = item.id || Date.now();
                item.created_at = item.created_at || new Date().toISOString();
                item.updated_at = new Date().toISOString();
                
                this.data[dataType].push(item);
                localStorage.setItem(this.getUserDataKey(dataType), JSON.stringify(this.data[dataType]));
                this.notifyDataChange(dataType);
                return item;
            }
        } catch (error) {
            console.error(`Failed to save ${dataType}:`, error);
            throw error;
        }
    }

    addRelationships(dataType, item) {
        // Add automatic relationships based on current context
        if (this.currentProject) {
            switch (dataType) {
                case 'blueprints':
                case 'takeoffs':
                case 'estimates':
                case 'contracts':
                    item.project_id = this.currentProject.id;
                    item.project_name = this.currentProject.name;
                    break;
            }
        }
        return item;
    }

    updateLocalData(dataType, item) {
        const index = this.data[dataType].findIndex(existing => existing.id === item.id);
        if (index >= 0) {
            this.data[dataType][index] = item;
        } else {
            this.data[dataType].push(item);
        }
        localStorage.setItem(`constructpro_${dataType}`, JSON.stringify(this.data[dataType]));
        this.notifyDataChange(dataType);
    }

    notifyDataChange(dataType) {
        // Notify all modules of data changes
        window.dispatchEvent(new CustomEvent('dataChanged', {
            detail: { dataType, data: this.data[dataType] }
        }));
    }

    setupEventListeners() {
        // Listen for project selection changes
        window.addEventListener('projectSelected', (event) => {
            this.setCurrentProject(event.detail.project);
        });
    }

    setCurrentProject(project) {
        this.currentProject = project;
        console.log('Current project set to:', project?.name);
        
        // Notify all modules of project change
        window.dispatchEvent(new CustomEvent('currentProjectChanged', {
            detail: { project }
        }));
    }

    // Data access methods
    getProjects() {
        return this.data.projects;
    }

    getClients() {
        return this.data.clients;
    }

    getBlueprints() {
        return this.data.blueprints;
    }

    getTakeoffs() {
        return this.data.takeoffs;
    }

    getEstimates() {
        return this.data.estimates;
    }

    getContracts() {
        return this.data.contracts;
    }

    getMaterials() {
        return this.data.materials;
    }

    getLabor() {
        return this.data.labor;
    }

    // Relationship methods
    getProjectData(projectId) {
        const project = this.data.projects.find(p => p.id == projectId);
        if (!project) return null;

        return {
            project,
            client: this.data.clients.find(c => c.id == project.client_id),
            blueprints: this.data.blueprints.filter(b => b.project_id == projectId),
            takeoffs: this.data.takeoffs.filter(t => t.project_id == projectId),
            estimates: this.data.estimates.filter(e => e.project_id == projectId),
            contracts: this.data.contracts.filter(c => c.project_id == projectId)
        };
    }

    getProjectsByClient(clientId) {
        return this.data.projects.filter(p => p.client_id == clientId);
    }

    getTakeoffsByBlueprint(blueprintId) {
        return this.data.takeoffs.filter(t => t.blueprint_id == blueprintId);
    }

    getEstimatesByTakeoff(takeoffId) {
        return this.data.estimates.filter(e => e.takeoff_id == takeoffId);
    }

    // Sharing and Export Methods
    async shareProject(projectId, method = 'email') {
        const projectData = this.getProjectData(projectId);
        if (!projectData) {
            throw new Error('Project not found');
        }

        const shareableData = this.generateShareableReport(projectData);
        
        switch (method) {
            case 'email':
                return this.emailProject(shareableData);
            case 'print':
                return this.printProject(shareableData);
            case 'pdf':
                return this.generatePDF(shareableData);
            case 'link':
                return this.generateShareableLink(shareableData);
            default:
                throw new Error('Invalid sharing method');
        }
    }

    generateShareableReport(projectData) {
        const { project, client, blueprints, takeoffs, estimates, contracts } = projectData;
        
        return {
            project: {
                name: project.name,
                type: project.type,
                status: project.status,
                start_date: project.start_date,
                end_date: project.end_date,
                budget: project.budget,
                progress: project.progress,
                description: project.description,
                location: project.location
            },
            client: client ? {
                name: client.name,
                contact_info: client.contact_info,
                email: client.email,
                phone: client.phone,
                address: client.address
            } : null,
            summary: {
                total_blueprints: blueprints.length,
                total_takeoffs: takeoffs.length,
                total_estimates: estimates.length,
                active_contracts: contracts.filter(c => c.status === 'active').length,
                estimated_total_cost: estimates.reduce((sum, est) => sum + (parseFloat(est.total_cost) || 0), 0)
            },
            blueprints: blueprints.map(bp => ({
                name: bp.name,
                uploaded_date: bp.uploaded_date,
                file_type: bp.file_type
            })),
            takeoffs: takeoffs.map(to => ({
                name: to.name,
                total_quantity: to.total_quantity,
                unit: to.unit,
                blueprint_reference: to.blueprint_name
            })),
            estimates: estimates.map(est => ({
                name: est.name,
                total_cost: est.total_cost,
                created_date: est.created_date,
                status: est.status
            })),
            contracts: contracts.map(cont => ({
                name: cont.name,
                value: cont.value,
                status: cont.status,
                signed_date: cont.signed_date
            }))
        };
    }

    emailProject(shareableData) {
        const emailContent = this.generateEmailContent(shareableData);
        const subject = `Project Report: ${shareableData.project.name}`;
        const mailtoLink = `mailto:${shareableData.client?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailContent)}`;
        window.open(mailtoLink);
        return { success: true, method: 'email' };
    }

    printProject(shareableData) {
        const printContent = this.generatePrintContent(shareableData);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
        return { success: true, method: 'print' };
    }

    generateEmailContent(data) {
        return `
Project Report: ${data.project.name}

CLIENT INFORMATION:
${data.client ? `
Company: ${data.client.name}
Contact: ${data.client.contact_info}
Email: ${data.client.email}
Phone: ${data.client.phone}
Address: ${data.client.address}
` : 'No client assigned'}

PROJECT DETAILS:
Type: ${data.project.type}
Status: ${data.project.status}
Start Date: ${data.project.start_date}
End Date: ${data.project.end_date}
Budget: $${parseFloat(data.project.budget || 0).toLocaleString()}
Progress: ${data.project.progress}%
Location: ${data.project.location}
Description: ${data.project.description}

PROJECT SUMMARY:
- Blueprints: ${data.summary.total_blueprints}
- Takeoffs: ${data.summary.total_takeoffs}  
- Estimates: ${data.summary.total_estimates}
- Active Contracts: ${data.summary.active_contracts}
- Estimated Total Cost: $${data.summary.estimated_total_cost.toLocaleString()}

Generated by ConstructPro Manager
Date: ${new Date().toLocaleDateString()}
        `.trim();
    }

    generatePrintContent(data) {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Project Report: ${data.project.name}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        @media print {
            .no-print { display: none !important; }
            body { font-size: 12px; }
            .page-break { page-break-before: always; }
        }
        body { font-family: Arial, sans-serif; }
        .header { border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 25px; }
        .label { font-weight: bold; color: #333; }
    </style>
</head>
<body class="container mt-4">
    <div class="header">
        <h1 class="text-primary">ConstructPro Manager</h1>
        <h2>Project Report: ${data.project.name}</h2>
        <p class="text-muted">Generated on ${new Date().toLocaleDateString()}</p>
    </div>

    ${data.client ? `
    <div class="section">
        <h3 class="text-primary">Client Information</h3>
        <div class="row">
            <div class="col-md-6">
                <p><span class="label">Company:</span> ${data.client.name}</p>
                <p><span class="label">Contact:</span> ${data.client.contact_info}</p>
                <p><span class="label">Email:</span> ${data.client.email}</p>
            </div>
            <div class="col-md-6">
                <p><span class="label">Phone:</span> ${data.client.phone}</p>
                <p><span class="label">Address:</span><br>${data.client.address}</p>
            </div>
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h3 class="text-primary">Project Details</h3>
        <div class="row">
            <div class="col-md-6">
                <p><span class="label">Type:</span> ${data.project.type}</p>
                <p><span class="label">Status:</span> ${data.project.status}</p>
                <p><span class="label">Start Date:</span> ${data.project.start_date}</p>
                <p><span class="label">End Date:</span> ${data.project.end_date}</p>
            </div>
            <div class="col-md-6">
                <p><span class="label">Budget:</span> $${parseFloat(data.project.budget || 0).toLocaleString()}</p>
                <p><span class="label">Progress:</span> ${data.project.progress}%</p>
                <p><span class="label">Location:</span><br>${data.project.location}</p>
            </div>
        </div>
        <p><span class="label">Description:</span><br>${data.project.description}</p>
    </div>

    <div class="section">
        <h3 class="text-primary">Project Summary</h3>
        <div class="row">
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h4 class="text-primary">${data.summary.total_blueprints}</h4>
                        <small>Blueprints</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h4 class="text-success">${data.summary.total_takeoffs}</h4>
                        <small>Takeoffs</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h4 class="text-warning">${data.summary.total_estimates}</h4>
                        <small>Estimates</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h4 class="text-info">${data.summary.active_contracts}</h4>
                        <small>Active Contracts</small>
                    </div>
                </div>
            </div>
        </div>
        <div class="mt-3">
            <h4 class="text-center">Total Estimated Cost: <span class="text-success">$${data.summary.estimated_total_cost.toLocaleString()}</span></h4>
        </div>
    </div>

    ${data.blueprints.length > 0 ? `
    <div class="section page-break">
        <h3 class="text-primary">Blueprints</h3>
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Upload Date</th>
                    <th>File Type</th>
                </tr>
            </thead>
            <tbody>
                ${data.blueprints.map(bp => `
                    <tr>
                        <td>${bp.name}</td>
                        <td>${new Date(bp.uploaded_date).toLocaleDateString()}</td>
                        <td>${bp.file_type}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    ${data.estimates.length > 0 ? `
    <div class="section page-break">
        <h3 class="text-primary">Estimates</h3>
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Total Cost</th>
                    <th>Status</th>
                    <th>Created</th>
                </tr>
            </thead>
            <tbody>
                ${data.estimates.map(est => `
                    <tr>
                        <td>${est.name}</td>
                        <td>$${parseFloat(est.total_cost || 0).toLocaleString()}</td>
                        <td>${est.status}</td>
                        <td>${new Date(est.created_date).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    <div class="mt-5 text-center text-muted">
        <small>Generated by ConstructPro Manager • ${new Date().toLocaleString()}</small>
    </div>
</body>
</html>
        `.trim();
    }

    generateShareableLink(data) {
        // Create a shareable link with encoded project data
        const encodedData = btoa(JSON.stringify(data));
        const shareUrl = `${window.location.origin}/share?data=${encodedData}`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(shareUrl).then(() => {
            window.app?.showAlert('success', 'Shareable link copied to clipboard!');
        });
        
        return { success: true, method: 'link', url: shareUrl };
    }

    // Data relationship helpers
    linkEstimateToProject(estimateId, projectId) {
        const estimate = this.data.estimates.find(e => e.id == estimateId);
        const project = this.data.projects.find(p => p.id == projectId);
        
        if (estimate && project) {
            estimate.project_id = projectId;
            estimate.project_name = project.name;
            this.updateLocalData('estimates', estimate);
        }
    }

    linkContractToEstimate(contractId, estimateId) {
        const contract = this.data.contracts.find(c => c.id == contractId);
        const estimate = this.data.estimates.find(e => e.id == estimateId);
        
        if (contract && estimate) {
            contract.estimate_id = estimateId;
            contract.project_id = estimate.project_id;
            this.updateLocalData('contracts', contract);
        }
    }

    linkTakeoffToBlueprint(takeoffId, blueprintId) {
        const takeoff = this.data.takeoffs.find(t => t.id == takeoffId);
        const blueprint = this.data.blueprints.find(b => b.id == blueprintId);
        
        if (takeoff && blueprint) {
            takeoff.blueprint_id = blueprintId;
            takeoff.blueprint_name = blueprint.name;
            takeoff.project_id = blueprint.project_id;
            this.updateLocalData('takeoffs', takeoff);
        }
    }

    // Get related data
    getRelatedData(dataType, id) {
        const item = this.data[dataType].find(i => i.id == id);
        if (!item) return null;

        const related = {};
        
        // Add project relationship
        if (item.project_id) {
            related.project = this.data.projects.find(p => p.id == item.project_id);
        }
        
        // Add client relationship
        if (item.client_id || related.project?.client_id) {
            const clientId = item.client_id || related.project?.client_id;
            related.client = this.data.clients.find(c => c.id == clientId);
        }

        // Add specific relationships based on data type
        switch (dataType) {
            case 'takeoffs':
                if (item.blueprint_id) {
                    related.blueprint = this.data.blueprints.find(b => b.id == item.blueprint_id);
                }
                break;
            case 'estimates':
                if (item.takeoff_id) {
                    related.takeoff = this.data.takeoffs.find(t => t.id == item.takeoff_id);
                }
                break;
            case 'contracts':
                if (item.estimate_id) {
                    related.estimate = this.data.estimates.find(e => e.id == item.estimate_id);
                }
                break;
        }

        return { item, related };
    }

    // Search across all data
    globalSearch(query) {
        const results = {};
        const lowerQuery = query.toLowerCase();

        for (const [dataType, items] of Object.entries(this.data)) {
            results[dataType] = items.filter(item => {
                return Object.values(item).some(value => 
                    String(value).toLowerCase().includes(lowerQuery)
                );
            });
        }

        return results;
    }

    // Export all project data
    exportProjectData(projectId, format = 'json') {
        const projectData = this.getProjectData(projectId);
        if (!projectData) return null;

        switch (format) {
            case 'json':
                return JSON.stringify(projectData, null, 2);
            case 'csv':
                return this.generateCSV(projectData);
            case 'xml':
                return this.generateXML(projectData);
            default:
                return projectData;
        }
    }

    generateCSV(data) {
        // Simple CSV export for estimates
        let csv = 'Type,Name,Cost,Date,Status\n';
        
        data.estimates.forEach(est => {
            csv += `Estimate,"${est.name}",${est.total_cost},${est.created_date},${est.status}\n`;
        });
        
        data.contracts.forEach(cont => {
            csv += `Contract,"${cont.name}",${cont.value},${cont.signed_date},${cont.status}\n`;
        });

        return csv;
    }
}