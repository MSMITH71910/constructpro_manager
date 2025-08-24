// ConstructPro Manager - Main Application JavaScript
class ConstructProApp {
    constructor() {
        this.currentModule = 'dashboard';
        this.selectedIndustry = null;
        this.currentProject = null;
        this.currentEstimate = {
            items: [],
            subtotal: 0,
            markup: 0,
            total: 0
        };
        this.selectedItem = null;
        this.isAppInitialized = false;
        this.currentUser = null;
        
        this.init();
    }

    async init() {
        this.setupAuthListeners();
        
        // Check if user is authenticated before initializing app
        setTimeout(() => {
            if (window.authManager && window.authManager.isUserAuthenticated()) {
                this.initializeApp();
            }
        }, 100);
    }

    setupAuthListeners() {
        // Listen for authentication state changes
        window.addEventListener('authStateChanged', (event) => {
            const { type, user, isAuthenticated } = event.detail;
            
            if (type === 'login' && isAuthenticated) {
                this.currentUser = user;
                this.initializeApp();
            } else if (type === 'logout') {
                this.isAppInitialized = false;
                this.currentUser = null;
                this.clearAppData();
                this.hideMainInterface();
            }
        });
    }

    async initializeApp() {
        if (this.isAppInitialized) return;
        
        this.isAppInitialized = true;
        console.log('Initializing app for user:', this.currentUser?.username);
        
        // ALWAYS hide loading screen first, even if there are errors
        this.hideLoadingScreen();
        
        try {
            // Show main interface
            this.showMainInterface();
            
            // Initialize DataManager first and wait for it to load data
            window.dataManager = new DataManager();
            
            // Wait for DataManager to be fully initialized
            while (!window.dataManager || !window.dataManager.data) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Initialize modules
            window.estimateBuilder = new EstimateBuilder();
            window.takeoffManager = new TakeoffManager();
            window.blueprintManager = new BlueprintManager();
            window.stackTakeoffManager = new StackTakeoffManager();
            window.contractCreator = new ContractCreator();
            
            await this.loadIndustries();
            this.setupEventListeners();
            await this.loadProjects(); // Load projects for global project selector
        } catch (error) {
            console.error('Error during app initialization:', error);
        }
        this.showWelcomeScreen();
        
        // Load dashboard after a brief welcome
        setTimeout(() => {
            this.loadModule('dashboard');
        }, 2000);
    }

    showMainInterface() {
        // Show navigation and sidebar
        document.querySelector('.navbar').style.display = 'block';
        document.querySelector('.sidebar').style.display = 'block';
        
        // Update navbar with user info
        this.updateNavbarWithUser();
    }

    hideMainInterface() {
        // Hide navigation and sidebar when logged out
        document.querySelector('.navbar').style.display = 'none';
        document.querySelector('.sidebar').style.display = 'none';
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    showWelcomeScreen() {
        const welcomeScreen = document.getElementById('welcomeScreen');
        if (welcomeScreen) {
            welcomeScreen.style.display = 'block';
        }
    }

    updateNavbarWithUser() {
        if (!this.currentUser) return;
        
        // Add user dropdown to navbar
        const navbarNav = document.querySelector('.navbar-nav');
        
        // Remove existing user dropdown if present
        const existingDropdown = document.getElementById('userDropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }
        
        const userDropdownHtml = `
            <div class="dropdown ms-3" id="userDropdown">
                <button class="btn btn-outline-light dropdown-toggle d-flex align-items-center" 
                        type="button" data-bs-toggle="dropdown">
                    <i class="bi bi-person-circle me-2"></i>
                    <span>${this.currentUser.firstName}</span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li>
                        <div class="dropdown-header">
                            <strong>${this.currentUser.firstName} ${this.currentUser.lastName}</strong><br>
                            <small class="text-muted">${this.currentUser.company}</small><br>
                            <small class="text-muted">${this.getRoleDisplayName(this.currentUser.role)}</small>
                        </div>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" onclick="app.showUserProfile()">
                        <i class="bi bi-person"></i> Profile Settings
                    </a></li>
                    <li><a class="dropdown-item" href="#" onclick="app.showCompanySettings()">
                        <i class="bi bi-building"></i> Company Settings
                    </a></li>
                    <li><a class="dropdown-item" href="#" onclick="app.showAppSettings()">
                        <i class="bi bi-gear"></i> App Settings
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="app.logout()">
                        <i class="bi bi-box-arrow-right"></i> Sign Out
                    </a></li>
                </ul>
            </div>
        `;
        
        navbarNav.insertAdjacentHTML('beforeend', userDropdownHtml);
    }

    getRoleDisplayName(role) {
        const roleNames = {
            'contractor': 'General Contractor',
            'subcontractor': 'Subcontractor',
            'architect': 'Architect',
            'engineer': 'Engineer',
            'project_manager': 'Project Manager',
            'estimator': 'Estimator',
            'other': 'Construction Professional'
        };
        return roleNames[role] || role;
    }

    clearAppData() {
        // Clear any cached project data, etc.
        this.currentProject = null;
        this.selectedIndustry = null;
        console.log('App data cleared');
    }

    logout() {
        if (window.authManager) {
            window.authManager.logout();
        }
    }

    showUserProfile() {
        // Implement user profile modal
        this.showAlert('info', 'Profile settings coming soon!');
    }

    showCompanySettings() {
        // Implement company settings modal
        this.showAlert('info', 'Company settings coming soon!');
    }

    showAppSettings() {
        // Implement app settings modal
        this.showAlert('info', 'App settings coming soon!');
    }

    // Alert system for user feedback
    showAlert(type, message) {
        // Create alert element
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; max-width: 400px;" role="alert">
                <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'}"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', alertHtml);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            const alerts = document.querySelectorAll('.alert');
            const lastAlert = alerts[alerts.length - 1];
            if (lastAlert) {
                const bsAlert = new bootstrap.Alert(lastAlert);
                bsAlert.close();
            }
        }, 5000);
    }

    async loadIndustries() {
        try {
            console.log('Loading industries from API...');
            const response = await fetch('/api/industries');
            const industries = await response.json();
            console.log('Industries loaded:', industries);
            
            const select = document.getElementById('industrySelect');
            console.log('Industry select element:', select);
            
            industries.forEach(industry => {
                const option = document.createElement('option');
                option.value = industry.id;
                option.textContent = industry.name;
                select.appendChild(option);
                console.log(`Added industry option: ${industry.name} (id: ${industry.id})`);
            });

            // Load saved industry selection
            const savedIndustry = localStorage.getItem('selectedIndustry');
            if (savedIndustry) {
                select.value = savedIndustry;
                this.selectedIndustry = parseInt(savedIndustry);
                console.log('Restored saved industry:', savedIndustry);
            }
            
            console.log('Industry loading completed successfully');
        } catch (error) {
            console.error('Failed to load industries:', error);
        }
    }

    setupEventListeners() {
        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const module = e.target.getAttribute('data-module') || e.target.closest('button').getAttribute('data-module');
                this.loadModule(module);
            });
        });

        // Industry selection
        document.getElementById('industrySelect').addEventListener('change', (e) => {
            this.selectedIndustry = parseInt(e.target.value) || null;
            localStorage.setItem('selectedIndustry', e.target.value);
            
            // Update takeoff manager with new industry data
            if (typeof takeoffManager !== 'undefined') {
                takeoffManager.loadIndustryData();
            }
            
            // Refresh current module if needed
            if (this.currentModule === 'estimates' || this.currentModule === 'materials' || this.currentModule === 'takeoff') {
                this.loadModule(this.currentModule);
            }
        });

        // Modal event listeners
        document.getElementById('itemQuantity').addEventListener('input', this.calculateTotalCost.bind(this));
        document.getElementById('addItemToEstimate').addEventListener('click', this.addToEstimate.bind(this));
        
        // Search functionality
        document.getElementById('materialSearch').addEventListener('input', this.filterMaterials.bind(this));
        document.getElementById('laborSearch').addEventListener('input', this.filterLabor.bind(this));
    }

    filterMaterials(e) {
        const searchTerm = e.target.value.toLowerCase();
        const tbody = document.getElementById('materialsTableBody');
        const rows = tbody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    filterLabor(e) {
        const searchTerm = e.target.value.toLowerCase();
        const tbody = document.getElementById('laborTableBody');
        const rows = tbody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    getDashboardStats() {
        // Get stats from DataManager
        const projects = window.dataManager ? window.dataManager.getProjects() : [];
        const clients = window.dataManager ? window.dataManager.getClients() : [];
        const blueprints = window.dataManager ? window.dataManager.getBlueprints() : [];
        const estimates = window.dataManager ? window.dataManager.getEstimates() : [];
        const contracts = window.dataManager ? window.dataManager.getContracts() : [];
        
        // Calculate total revenue from contracts and estimates
        const contractRevenue = contracts.reduce((sum, c) => sum + (parseFloat(c.value || c.total_amount || 0)), 0);
        const estimateRevenue = estimates.reduce((sum, e) => sum + (parseFloat(e.total_amount || e.total || 0)), 0);
        const totalRevenue = contractRevenue > 0 ? contractRevenue : estimateRevenue;
        
        return {
            totalProjects: projects.length,
            activeProjects: projects.filter(p => p.status === 'active').length,
            totalClients: clients.length,
            totalBlueprints: blueprints.length,
            totalEstimates: estimates.length,
            pendingEstimates: estimates.filter(e => e.status === 'pending').length,
            totalContracts: contracts.length,
            activeContracts: contracts.filter(c => c.status === 'active').length,
            pendingContracts: contracts.filter(c => c.status === 'pending').length,
            totalRevenue: totalRevenue,
            totalValue: totalRevenue // Keep backward compatibility
        };
    }

    getRecentActivity() {
        // Mock recent activity - in real app this would come from data
        return [
            { type: 'project', action: 'created', title: 'New Office Building', date: new Date().toLocaleDateString() },
            { type: 'estimate', action: 'updated', title: 'Kitchen Renovation Estimate', date: new Date().toLocaleDateString() },
            { type: 'contract', action: 'signed', title: 'Bathroom Remodel Contract', date: new Date().toLocaleDateString() }
        ];
    }

    loadModule(moduleName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-module="${moduleName}"]`).classList.add('active');

        this.currentModule = moduleName;
        const mainContent = document.getElementById('mainContent');

        // Update sidebar with project context for non-project modules
        const sidebarContent = document.getElementById('sidebarContent');
        if (sidebarContent && moduleName !== 'projects') {
            this.updateCurrentProjectDisplay();
        } else if (sidebarContent && moduleName === 'projects') {
            sidebarContent.innerHTML = '';
        }

        switch(moduleName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'blueprints':
                this.loadBlueprints();
                break;
            case 'takeoff':
                this.loadTakeoff();
                break;
            case 'contracts':
                this.loadContracts();
                break;
            case 'clients':
                this.loadClients();
                break;
            case 'estimates':
                this.loadEstimates();
                break;
            case 'projects':
                this.loadProjects();
                break;
            case 'reports':
                this.loadReports();
                break;
            default:
                this.loadDashboard();
        }
    }

    loadBlueprints() {
        if (typeof blueprintManager !== 'undefined') {
            blueprintManager.showBlueprintInterface();
        } else {
            document.getElementById('mainContent').innerHTML = 
                '<div class="alert alert-danger">Blueprint Manager failed to load. Please refresh the page.</div>';
        }
    }



    loadTakeoff() {
        if (typeof takeoffManager !== 'undefined') {
            takeoffManager.showTakeoffInterface();
        } else {
            document.getElementById('mainContent').innerHTML = 
                '<div class="alert alert-danger">Takeoff Manager failed to load. Please refresh the page.</div>';
        }
    }

    loadContracts() {
        if (typeof contractCreator !== 'undefined') {
            contractCreator.showContractInterface();
        } else {
            document.getElementById('mainContent').innerHTML = 
                '<div class="alert alert-danger">Contract Creator failed to load. Please refresh the page.</div>';
        }
    }

    loadDashboard() {
        const dashboardStats = this.getDashboardStats();
        const recentActivity = this.getRecentActivity();
        
        const content = `
            <div class="row">
                <div class="col-12">
                    <h2 class="mb-4"><i class="bi bi-speedometer2"></i> Dashboard</h2>
                </div>
            </div>
            <div class="row">
                <!-- Stats Cards -->
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card bg-primary text-white shadow h-100">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col">
                                    <div class="text-xs font-weight-bold text-uppercase mb-1">Total Projects</div>
                                    <div class="h5 mb-0">${dashboardStats.totalProjects || 0}</div>
                                    <div class="small">Active: ${dashboardStats.activeProjects || 0}</div>
                                </div>
                                <div class="col-auto">
                                    <i class="bi bi-building fs-2"></i>
                                </div>
                            </div>
                        </div>
                        <div class="card-footer d-flex align-items-center justify-content-between">
                            <a class="small text-white stretched-link" href="#" onclick="app.loadModule('projects')">View Projects</a>
                            <div class="small text-white"><i class="bi bi-angle-right"></i></div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card bg-success text-white shadow h-100">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col">
                                    <div class="text-xs font-weight-bold text-uppercase mb-1">Total Clients</div>
                                    <div class="h5 mb-0">${dashboardStats.totalClients || 0}</div>
                                    <div class="small">Blueprints: ${dashboardStats.totalBlueprints || 0}</div>
                                </div>
                                <div class="col-auto">
                                    <i class="bi bi-people fs-2"></i>
                                </div>
                            </div>
                        </div>
                        <div class="card-footer d-flex align-items-center justify-content-between">
                            <a class="small text-white stretched-link" href="#" onclick="app.loadModule('clients')">View Clients</a>
                            <div class="small text-white"><i class="bi bi-angle-right"></i></div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card bg-info text-white shadow h-100">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col">
                                    <div class="text-xs font-weight-bold text-uppercase mb-1">Total Estimates</div>
                                    <div class="h5 mb-0">${dashboardStats.totalEstimates || 0}</div>
                                    <div class="small">Contracts: ${dashboardStats.pendingContracts || 0} pending</div>
                                </div>
                                <div class="col-auto">
                                    <i class="bi bi-calculator fs-2"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card bg-warning text-white shadow h-100">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col">
                                    <div class="text-xs font-weight-bold text-uppercase mb-1">Total Revenue</div>
                                    <div class="h5 mb-0">$${(dashboardStats.totalRevenue || 0).toLocaleString()}</div>
                                    <div class="small">Pending: ${dashboardStats.pendingContracts || 0}</div>
                                </div>
                                <div class="col-auto">
                                    <i class="bi bi-graph-up fs-2"></i>
                                </div>
                            </div>
                        </div>
                        <div class="card-footer d-flex align-items-center justify-content-between">
                            <a class="small text-white stretched-link" href="#" onclick="app.loadModule('contracts')">View Contracts</a>
                            <div class="small text-white"><i class="bi bi-angle-right"></i></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Current Project Overview -->
            ${this.currentProject ? `
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="card shadow border-primary">
                            <div class="card-header bg-primary text-white">
                                <div class="d-flex justify-content-between align-items-center">
                                    <h6 class="mb-0">
                                        <i class="bi bi-building"></i> Current Project: ${this.currentProject.name}
                                    </h6>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-light" onclick="app.shareProject(${this.currentProject.id}, 'email')" title="Email Project">
                                            <i class="bi bi-envelope"></i>
                                        </button>
                                        <button class="btn btn-outline-light" onclick="app.shareProject(${this.currentProject.id}, 'print')" title="Print Project">
                                            <i class="bi bi-printer"></i>
                                        </button>
                                        <button class="btn btn-outline-light" onclick="app.viewProject(${this.currentProject.id})" title="View Full Project">
                                            <i class="bi bi-eye"></i> View Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-8">
                                        <p><strong>Type:</strong> ${this.currentProject.type}</p>
                                        <p><strong>Status:</strong> <span class="badge ${this.getStatusBadgeClass(this.currentProject.status)}">${this.currentProject.status}</span></p>
                                        <p><strong>Progress:</strong> ${this.currentProject.progress}%</p>
                                        <div class="progress mb-2">
                                            <div class="progress-bar bg-success" style="width: ${this.currentProject.progress}%"></div>
                                        </div>
                                        <p><strong>Budget:</strong> $${parseFloat(this.currentProject.budget || 0).toLocaleString()}</p>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="btn-group-vertical w-100">
                                            <button class="btn btn-outline-primary mb-2" onclick="app.addBlueprintToProject(${this.currentProject.id})">
                                                <i class="bi bi-file-earmark-image"></i> Add Blueprint
                                            </button>
                                            <button class="btn btn-outline-success mb-2" onclick="app.createTakeoffForProject(${this.currentProject.id})">
                                                <i class="bi bi-calculator"></i> Create Takeoff
                                            </button>
                                            <button class="btn btn-outline-info mb-2" onclick="app.createEstimateForProject(${this.currentProject.id})">
                                                <i class="bi bi-currency-dollar"></i> New Estimate
                                            </button>
                                            <button class="btn btn-outline-warning" onclick="app.createContractForProject(${this.currentProject.id})">
                                                <i class="bi bi-file-earmark-text"></i> New Contract
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- Recent Activity and Quick Actions -->
            <div class="row">
                <div class="col-lg-8">
                    <div class="card shadow">
                        <div class="card-header">
                            <h6 class="m-0 font-weight-bold text-primary">Recent Activity</h6>
                        </div>
                        <div class="card-body">
                            ${recentActivity.length > 0 ? `
                                <div class="list-group list-group-flush">
                                    ${recentActivity.map(activity => `
                                        <div class="list-group-item list-group-item-action border-0">
                                            <div class="d-flex align-items-center">
                                                <div class="me-3">
                                                    <i class="bi ${activity.icon} text-primary fs-5"></i>
                                                </div>
                                                <div class="flex-grow-1">
                                                    <p class="mb-1">${activity.message}</p>
                                                    <small class="text-muted">${new Date(activity.date).toLocaleDateString()}</small>
                                                </div>
                                                <div>
                                                    <button class="btn btn-sm btn-outline-primary" onclick="(${activity.action})()">
                                                        <i class="bi bi-arrow-right"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <div class="text-center text-muted py-4">
                                    <i class="bi bi-inbox fs-1 mb-3"></i>
                                    <p>No recent activity to display</p>
                                    <p class="small">Start by creating a project or adding a client</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="card shadow">
                        <div class="card-header">
                            <h6 class="m-0 font-weight-bold text-primary">Quick Actions</h6>
                        </div>
                        <div class="card-body">
                            <div class="d-grid gap-2">
                                <button class="btn btn-primary" onclick="app.showNewProjectModal()">
                                    <i class="bi bi-plus-circle"></i> New Project
                                </button>
                                <button class="btn btn-outline-primary" onclick="app.showNewClientModal()">
                                    <i class="bi bi-person-plus"></i> Add Client
                                </button>
                                <button class="btn btn-outline-success" onclick="app.loadModule('blueprints')">
                                    <i class="bi bi-upload"></i> Upload Blueprint
                                </button>
                                <button class="btn btn-outline-info" onclick="app.loadModule('takeoff')">
                                    <i class="bi bi-calculator"></i> Start Takeoff
                                </button>
                                <hr>
                                <button class="btn btn-outline-secondary" onclick="app.loadModule('reports')">
                                    <i class="bi bi-graph-up"></i> View Reports
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('mainContent').innerHTML = content;
    }

    loadClients() {
        const content = `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2><i class="bi bi-people"></i> Clients</h2>
                        <button class="btn btn-primary" onclick="app.showAddClientModal()">
                            <i class="bi bi-plus-circle"></i> Add Client
                        </button>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Name</th>
                                            <th>Contact Info</th>
                                            <th>Phone</th>
                                            <th>Email</th>
                                            <th>Industry</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="clientsTableBody">
                                        <tr>
                                            <td colspan="6" class="text-center">Loading clients...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('mainContent').innerHTML = content;
        this.loadClientsData();
    }

    async loadClientsData() {
        try {
            const tbody = document.getElementById('clientsTableBody');
            if (!window.dataManager) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Data manager not available</td></tr>';
                return;
            }

            const clients = window.dataManager.data.clients;
            if (clients.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No clients found. Click "Add Client" to get started!</td></tr>';
                return;
            }

            tbody.innerHTML = clients.map(client => `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <i class="bi bi-person-circle me-2 text-primary fs-5"></i>
                            <strong>${client.name}</strong>
                        </div>
                    </td>
                    <td>${client.address || 'N/A'}</td>
                    <td>${client.phone || 'N/A'}</td>
                    <td>${client.email || 'N/A'}</td>
                    <td>${client.industry || 'General'}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="app.viewClient(${client.id})" title="View Details">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-outline-info" onclick="app.createProjectForClient(${client.id})" title="New Project">
                                <i class="bi bi-plus-circle"></i>
                            </button>
                            <button class="btn btn-outline-success" onclick="app.shareClient(${client.id}, 'email')" title="Email Client Info">
                                <i class="bi bi-envelope"></i>
                            </button>
                            <button class="btn btn-outline-secondary" onclick="app.shareClient(${client.id}, 'print')" title="Print Client Info">
                                <i class="bi bi-printer"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="app.deleteClient(${client.id})" title="Delete">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Failed to load clients:', error);
            document.getElementById('clientsTableBody').innerHTML = 
                '<tr><td colspan="6" class="text-center text-danger">Failed to load clients</td></tr>';
        }
    }

    loadEstimates() {
        const content = `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2><i class="bi bi-calculator"></i> Estimates</h2>
                        <button class="btn btn-primary" onclick="app.showCreateEstimateModal()">
                            <i class="bi bi-plus-circle"></i> Create Estimate
                        </button>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Project Name</th>
                                            <th>Client</th>
                                            <th>Date Created</th>
                                            <th>Total Amount</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="estimatesTableBody">
                                        <tr>
                                            <td colspan="6" class="text-center">Loading estimates...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('mainContent').innerHTML = content;
        this.loadEstimatesData();
    }

    async loadEstimatesData() {
        try {
            const estimates = await window.electronAPI.invoke('db:getEstimates');
            const tbody = document.getElementById('estimatesTableBody');
            
            if (estimates.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No estimates found</td></tr>';
                return;
            }

            tbody.innerHTML = estimates.map(estimate => `
                <tr>
                    <td><strong>${estimate.project_name}</strong></td>
                    <td>${estimate.client_name || 'N/A'}</td>
                    <td>${new Date(estimate.date_created).toLocaleDateString()}</td>
                    <td><strong>$${estimate.total_amount.toFixed(2)}</strong></td>
                    <td><span class="badge status-${estimate.status}">${estimate.status.toUpperCase()}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="app.viewEstimate(${estimate.id})">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="app.convertToProject(${estimate.id})">
                            <i class="bi bi-arrow-right-circle"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Failed to load estimates:', error);
        }
    }

    loadProjects() {
        const content = `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2><i class="bi bi-kanban text-primary"></i> Project Management</h2>
                        <button class="btn btn-primary" onclick="app.showAddProjectModal()">
                            <i class="bi bi-plus-circle"></i> New Project
                        </button>
                    </div>
                </div>
            </div>

            <!-- Project Stats Cards -->
            <div class="row mb-4">
                <div class="col-lg-3 col-md-6 mb-4">
                    <div class="card bg-primary text-white shadow">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col">
                                    <div class="text-xs font-weight-bold text-uppercase mb-1">Total Projects</div>
                                    <div class="h5 mb-0" id="totalProjectsCount">0</div>
                                </div>
                                <div class="col-auto">
                                    <i class="bi bi-kanban fs-2"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-3 col-md-6 mb-4">
                    <div class="card bg-success text-white shadow">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col">
                                    <div class="text-xs font-weight-bold text-uppercase mb-1">Active Projects</div>
                                    <div class="h5 mb-0" id="activeProjectsCount">0</div>
                                </div>
                                <div class="col-auto">
                                    <i class="bi bi-play-circle fs-2"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-3 col-md-6 mb-4">
                    <div class="card bg-warning text-white shadow">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col">
                                    <div class="text-xs font-weight-bold text-uppercase mb-1">Pending Projects</div>
                                    <div class="h5 mb-0" id="pendingProjectsCount">0</div>
                                </div>
                                <div class="col-auto">
                                    <i class="bi bi-clock fs-2"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-3 col-md-6 mb-4">
                    <div class="card bg-info text-white shadow">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col">
                                    <div class="text-xs font-weight-bold text-uppercase mb-1">Completed Projects</div>
                                    <div class="h5 mb-0" id="completedProjectsCount">0</div>
                                </div>
                                <div class="col-auto">
                                    <i class="bi bi-check-circle fs-2"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Projects List -->
            <div class="row">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-header py-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <h6 class="m-0 font-weight-bold text-primary">All Projects</h6>
                                <div class="d-flex gap-2">
                                    <div class="dropdown">
                                        <button class="btn btn-sm btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown">
                                            <i class="bi bi-funnel"></i> Filter
                                        </button>
                                        <ul class="dropdown-menu">
                                            <li><a class="dropdown-item" href="#" onclick="app.filterProjects('all')">All Projects</a></li>
                                            <li><a class="dropdown-item" href="#" onclick="app.filterProjects('active')">Active Only</a></li>
                                            <li><a class="dropdown-item" href="#" onclick="app.filterProjects('pending')">Pending Only</a></li>
                                            <li><a class="dropdown-item" href="#" onclick="app.filterProjects('completed')">Completed Only</a></li>
                                        </ul>
                                    </div>
                                    <div class="input-group input-group-sm" style="width: 250px;">
                                        <input type="text" class="form-control" placeholder="Search projects..." id="projectSearch" onkeyup="app.searchProjects(this.value)">
                                        <span class="input-group-text"><i class="bi bi-search"></i></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div id="projectsTableContainer">
                                <div class="text-center text-muted py-5">
                                    <i class="bi bi-kanban display-1 mb-3 opacity-50"></i>
                                    <h4>No Projects Yet</h4>
                                    <p class="mb-3">Get started by creating your first construction project</p>
                                    <button class="btn btn-primary" onclick="app.showAddProjectModal()">
                                        <i class="bi bi-plus-circle"></i> Create Your First Project
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('mainContent').innerHTML = content;
        this.loadProjectsData();
    }

    loadReports() {
        const content = `
            <div class="row">
                <div class="col-12">
                    <h2 class="mb-4"><i class="bi bi-graph-up"></i> Reports</h2>
                </div>
            </div>
            <div class="row">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-body">
                            <div class="text-center text-muted py-5">
                                <i class="bi bi-graph-up display-1 mb-3"></i>
                                <h4>Reports Module</h4>
                                <p>Reporting and analytics features coming soon...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('mainContent').innerHTML = content;
    }

    showAddClientModal() {
        // Create and show add client modal
        const modalHtml = `
            <div class="modal fade" id="addClientModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Add New Client</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addClientForm">
                                <div class="mb-3">
                                    <label class="form-label">Client Name *</label>
                                    <input type="text" class="form-control" name="name" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Contact Person</label>
                                    <input type="text" class="form-control" name="contact_info">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Phone</label>
                                    <input type="tel" class="form-control" name="phone">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="form-control" name="email">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Address</label>
                                    <textarea class="form-control" name="address" rows="3"></textarea>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Industry</label>
                                    <select class="form-select" name="industry_id">
                                        <option value="">Select Industry...</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="app.saveClient()">Save Client</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('addClientModal'));
        
        // Populate industry dropdown
        this.populateIndustrySelect(document.querySelector('#addClientModal select[name="industry_id"]'));
        
        modal.show();
        
        // Clean up modal after it's hidden
        document.getElementById('addClientModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }

    async populateIndustrySelect(selectElement) {
        try {
            const industries = await window.electronAPI.invoke('db:getIndustries');
            industries.forEach(industry => {
                const option = document.createElement('option');
                option.value = industry.id;
                option.textContent = industry.name;
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load industries for select:', error);
        }
    }

    async saveClient() {
        const form = document.getElementById('addClientForm');
        const formData = new FormData(form);
        const clientData = Object.fromEntries(formData.entries());
        
        // Convert industry_id to number if provided
        if (clientData.industry_id) {
            clientData.industry_id = parseInt(clientData.industry_id);
        } else {
            clientData.industry_id = null;
        }

        try {
            await window.electronAPI.invoke('db:addClient', clientData);
            bootstrap.Modal.getInstance(document.getElementById('addClientModal')).hide();
            
            // Show success message
            this.showAlert('success', 'Client added successfully!');
            
            // Refresh clients list if we're on the clients page
            if (this.currentModule === 'clients') {
                this.loadClientsData();
            }
        } catch (error) {
            console.error('Failed to save client:', error);
            this.showAlert('danger', 'Failed to save client. Please try again.');
        }
    }

    showAlert(type, message) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show position-fixed" 
                 style="top: 100px; right: 20px; z-index: 1060; min-width: 300px;">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', alertHtml);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            const alert = document.querySelector('.alert');
            if (alert) alert.remove();
        }, 5000);
    }

    showCreateEstimateModal() {
        if (typeof estimateBuilder !== 'undefined') {
            estimateBuilder.showCreateEstimateModal();
        } else {
            this.showAlert('error', 'Estimate builder not loaded. Please refresh the page.');
        }
    }

    calculateTotalCost() {
        if (typeof estimateBuilder !== 'undefined') {
            estimateBuilder.calculateItemCost();
        }
    }

    addToEstimate() {
        if (typeof estimateBuilder !== 'undefined') {
            estimateBuilder.addItemToEstimate();
        }
    }

    // Project Management Methods
    async loadProjectsData() {
        try {
            // Try to fetch from API, fallback to localStorage
            let projects = [];
            try {
                const response = await fetch('/api/projects');
                if (response.ok) {
                    projects = await response.json();
                }
            } catch (error) {
                // Fallback to localStorage
                const storedProjects = localStorage.getItem('constructpro_projects');
                projects = storedProjects ? JSON.parse(storedProjects) : [];
            }

            this.projects = projects;
            this.renderProjectsTable();
            this.updateProjectStats();
        } catch (error) {
            console.error('Failed to load projects:', error);
            this.projects = [];
            this.renderProjectsTable();
        }
    }

    updateProjectStats() {
        const total = this.projects.length;
        const active = this.projects.filter(p => p.status === 'active').length;
        const pending = this.projects.filter(p => p.status === 'pending').length;
        const completed = this.projects.filter(p => p.status === 'completed').length;

        document.getElementById('totalProjectsCount').textContent = total;
        document.getElementById('activeProjectsCount').textContent = active;
        document.getElementById('pendingProjectsCount').textContent = pending;
        document.getElementById('completedProjectsCount').textContent = completed;
    }

    renderProjectsTable() {
        const container = document.getElementById('projectsTableContainer');
        
        if (!this.projects || this.projects.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="bi bi-kanban display-1 mb-3 opacity-50"></i>
                    <h4>No Projects Yet</h4>
                    <p class="mb-3">Get started by creating your first construction project</p>
                    <button class="btn btn-primary" onclick="app.showAddProjectModal()">
                        <i class="bi bi-plus-circle"></i> Create Your First Project
                    </button>
                </div>
            `;
            return;
        }

        const tableHtml = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Project Name</th>
                            <th>Client</th>
                            <th>Status</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Budget</th>
                            <th>Progress</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.projects.map(project => `
                            <tr data-project-id="${project.id}">
                                <td>
                                    <div class="d-flex align-items-center">
                                        <div class="project-icon me-2">
                                            <i class="bi bi-building text-primary"></i>
                                        </div>
                                        <div>
                                            <div class="fw-semibold">
                                                <a href="#" onclick="app.selectProject(${project.id})" class="text-decoration-none">
                                                    ${project.name}
                                                </a>
                                                ${this.currentProject?.id == project.id ? '<i class="bi bi-check-circle text-success ms-2" title="Current Project"></i>' : ''}
                                            </div>
                                            <small class="text-muted">${project.type || 'General Construction'}</small>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div class="fw-medium">${project.client_name || 'N/A'}</div>
                                    <small class="text-muted">${project.client_email || ''}</small>
                                </td>
                                <td>
                                    <span class="badge ${this.getStatusBadgeClass(project.status)}">
                                        ${project.status ? project.status.charAt(0).toUpperCase() + project.status.slice(1) : 'Pending'}
                                    </span>
                                </td>
                                <td>${project.start_date ? new Date(project.start_date).toLocaleDateString() : 'TBD'}</td>
                                <td>${project.end_date ? new Date(project.end_date).toLocaleDateString() : 'TBD'}</td>
                                <td>$${project.budget ? parseFloat(project.budget).toLocaleString() : '0'}</td>
                                <td>
                                    <div class="progress" style="height: 6px;">
                                        <div class="progress-bar ${this.getProgressBarClass(project.status)}" 
                                             style="width: ${project.progress || 0}%"></div>
                                    </div>
                                    <small class="text-muted">${project.progress || 0}%</small>
                                </td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-primary" onclick="app.viewProject(${project.id})" title="View Details">
                                            <i class="bi bi-eye"></i>
                                        </button>
                                        <button class="btn btn-outline-success" onclick="app.editProject(${project.id})" title="Edit Project">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <div class="btn-group">
                                            <button class="btn btn-outline-info dropdown-toggle" data-bs-toggle="dropdown" title="Share Project">
                                                <i class="bi bi-share"></i>
                                            </button>
                                            <ul class="dropdown-menu">
                                                <li><a class="dropdown-item" href="#" onclick="app.shareProject(${project.id}, 'email')">
                                                    <i class="bi bi-envelope"></i> Email Report
                                                </a></li>
                                                <li><a class="dropdown-item" href="#" onclick="app.shareProject(${project.id}, 'print')">
                                                    <i class="bi bi-printer"></i> Print Report
                                                </a></li>
                                                <li><a class="dropdown-item" href="#" onclick="app.shareProject(${project.id}, 'link')">
                                                    <i class="bi bi-link"></i> Share Link
                                                </a></li>
                                                <li><hr class="dropdown-divider"></li>
                                                <li><a class="dropdown-item" href="#" onclick="app.exportProject(${project.id}, 'pdf')">
                                                    <i class="bi bi-file-earmark-pdf"></i> Export PDF
                                                </a></li>
                                            </ul>
                                        </div>
                                        <button class="btn btn-outline-danger" onclick="app.deleteProject(${project.id})" title="Delete Project">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHtml;
    }

    getStatusBadgeClass(status) {
        const classes = {
            'active': 'bg-success',
            'pending': 'bg-warning',
            'completed': 'bg-primary',
            'cancelled': 'bg-danger',
            'on-hold': 'bg-secondary'
        };
        return classes[status] || 'bg-secondary';
    }

    getProgressBarClass(status) {
        const classes = {
            'active': 'bg-success',
            'pending': 'bg-warning',
            'completed': 'bg-primary',
            'cancelled': 'bg-danger',
            'on-hold': 'bg-secondary'
        };
        return classes[status] || 'bg-secondary';
    }

    showAddProjectModal() {
        const modalHtml = `
            <div class="modal fade" id="addProjectModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-plus-circle text-primary me-2"></i>Create New Project
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addProjectForm">
                                <div class="row">
                                    <div class="col-md-8 mb-3">
                                        <label class="form-label">Project Name *</label>
                                        <input type="text" class="form-control" name="name" required 
                                               placeholder="e.g., Downtown Office Complex">
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label class="form-label">Project Type</label>
                                        <select class="form-select" name="type">
                                            <option value="">Select Type...</option>
                                            <option value="Residential">Residential</option>
                                            <option value="Commercial">Commercial</option>
                                            <option value="Industrial">Industrial</option>
                                            <option value="Infrastructure">Infrastructure</option>
                                            <option value="Renovation">Renovation</option>
                                            <option value="New Construction">New Construction</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Client</label>
                                        <select class="form-select" name="client_id" id="projectClientSelect">
                                            <option value="">Select Client...</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" name="status">
                                            <option value="pending">Pending</option>
                                            <option value="active">Active</option>
                                            <option value="on-hold">On Hold</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Start Date</label>
                                        <input type="date" class="form-control" name="start_date">
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Expected End Date</label>
                                        <input type="date" class="form-control" name="end_date">
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Budget ($)</label>
                                        <input type="number" class="form-control" name="budget" step="0.01" min="0"
                                               placeholder="0.00">
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Progress (%)</label>
                                        <input type="number" class="form-control" name="progress" min="0" max="100" value="0">
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">Project Description</label>
                                    <textarea class="form-control" name="description" rows="3" 
                                              placeholder="Brief description of the project scope and objectives..."></textarea>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">Location/Address</label>
                                    <textarea class="form-control" name="location" rows="2" 
                                              placeholder="Project site address..."></textarea>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">Notes</label>
                                    <textarea class="form-control" name="notes" rows="2" 
                                              placeholder="Additional notes or special requirements..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="app.saveProject()">
                                <i class="bi bi-save"></i> Create Project
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if present
        const existingModal = document.getElementById('addProjectModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('addProjectModal'));

        // Populate client dropdown
        this.populateProjectClientSelect();
        
        modal.show();
    }

    async populateProjectClientSelect() {
        try {
            let clients = [];
            try {
                const response = await fetch('/api/clients');
                if (response.ok) {
                    clients = await response.json();
                }
            } catch (error) {
                const storedClients = localStorage.getItem('constructpro_clients');
                clients = storedClients ? JSON.parse(storedClients) : [];
            }

            const select = document.getElementById('projectClientSelect');
            if (select) {
                select.innerHTML = '<option value="">Select Client...</option>';
                clients.forEach(client => {
                    const option = document.createElement('option');
                    option.value = client.id;
                    option.textContent = client.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load clients:', error);
        }
    }

    async saveProject() {
        const form = document.getElementById('addProjectForm');
        const formData = new FormData(form);
        
        // Validate required fields
        if (!formData.get('name')) {
            this.showAlert('danger', 'Project name is required.');
            return;
        }

        const projectData = {
            id: Date.now(),
            name: formData.get('name'),
            type: formData.get('type'),
            client_id: formData.get('client_id'),
            client_name: await this.getClientName(formData.get('client_id')),
            client_email: await this.getClientEmail(formData.get('client_id')),
            status: formData.get('status') || 'pending',
            start_date: formData.get('start_date'),
            end_date: formData.get('end_date'),
            budget: formData.get('budget'),
            progress: parseInt(formData.get('progress')) || 0,
            description: formData.get('description'),
            location: formData.get('location'),
            notes: formData.get('notes'),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        try {
            // Try to save to API first
            try {
                const response = await fetch('/api/projects', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(projectData)
                });

                if (!response.ok) {
                    throw new Error('Failed to save to API');
                }
            } catch (apiError) {
                // Fallback to localStorage
                if (!this.projects) this.projects = [];
                this.projects.push(projectData);
                localStorage.setItem('constructpro_projects', JSON.stringify(this.projects));
            }

            // Close modal and refresh
            const modal = bootstrap.Modal.getInstance(document.getElementById('addProjectModal'));
            modal.hide();
            
            this.showAlert('success', 'Project created successfully!');
            this.loadProjectsData();

        } catch (error) {
            console.error('Failed to save project:', error);
            this.showAlert('danger', 'Failed to create project. Please try again.');
        }
    }

    async getClientName(clientId) {
        if (!clientId) return '';
        try {
            let clients = [];
            try {
                const response = await fetch('/api/clients');
                if (response.ok) {
                    clients = await response.json();
                }
            } catch (error) {
                const storedClients = localStorage.getItem('constructpro_clients');
                clients = storedClients ? JSON.parse(storedClients) : [];
            }
            const client = clients.find(c => c.id == clientId);
            return client ? client.name : '';
        } catch (error) {
            return '';
        }
    }

    async getClientEmail(clientId) {
        if (!clientId) return '';
        try {
            let clients = [];
            try {
                const response = await fetch('/api/clients');
                if (response.ok) {
                    clients = await response.json();
                }
            } catch (error) {
                const storedClients = localStorage.getItem('constructpro_clients');
                clients = storedClients ? JSON.parse(storedClients) : [];
            }
            const client = clients.find(c => c.id == clientId);
            return client ? client.email : '';
        } catch (error) {
            return '';
        }
    }

    searchProjects(searchTerm) {
        const rows = document.querySelectorAll('#projectsTableContainer tbody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
        });
    }

    filterProjects(filter) {
        const rows = document.querySelectorAll('#projectsTableContainer tbody tr[data-project-id]');
        rows.forEach(row => {
            const statusBadge = row.querySelector('.badge');
            const status = statusBadge ? statusBadge.textContent.toLowerCase() : '';
            
            if (filter === 'all') {
                row.style.display = '';
            } else {
                row.style.display = status.includes(filter) ? '' : 'none';
            }
        });
    }

    viewProject(projectId) {
        const project = this.projects.find(p => p.id == projectId);
        if (!project) return;

        this.showAlert('info', `Viewing project: ${project.name} (Feature coming soon)`);
        // TODO: Implement detailed project view
    }

    editProject(projectId) {
        const project = this.projects.find(p => p.id == projectId);
        if (!project) return;

        // For now, show the add modal with pre-filled data
        this.showAlert('info', `Editing project: ${project.name} (Feature coming soon)`);
        // TODO: Implement project editing
    }

    async deleteProject(projectId) {
        if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            return;
        }

        try {
            // Try to delete from API first
            try {
                const response = await fetch(`/api/projects/${projectId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('Failed to delete from API');
                }
            } catch (apiError) {
                // Fallback to localStorage
                this.projects = this.projects.filter(p => p.id != projectId);
                localStorage.setItem('constructpro_projects', JSON.stringify(this.projects));
            }

            this.showAlert('success', 'Project deleted successfully!');
            this.loadProjectsData();

        } catch (error) {
            console.error('Failed to delete project:', error);
            this.showAlert('danger', 'Failed to delete project. Please try again.');
        }
    }

    // Project Integration and Sharing Methods
    async shareProject(projectId, method) {
        try {
            if (window.dataManager) {
                const result = await window.dataManager.shareProject(projectId, method);
                this.showAlert('success', `Project shared via ${method} successfully!`);
                return result;
            } else {
                // Fallback sharing without DataManager
                const project = this.projects.find(p => p.id == projectId);
                if (!project) {
                    this.showAlert('danger', 'Project not found');
                    return;
                }

                switch (method) {
                    case 'email':
                        this.emailProjectFallback(project);
                        break;
                    case 'print':
                        this.printProjectFallback(project);
                        break;
                    case 'link':
                        this.shareProjectLinkFallback(project);
                        break;
                    default:
                        this.showAlert('warning', 'Sharing method not supported');
                }
            }
        } catch (error) {
            console.error('Failed to share project:', error);
            this.showAlert('danger', 'Failed to share project. Please try again.');
        }
    }

    emailProjectFallback(project) {
        const subject = `Project Report: ${project.name}`;
        const body = `
Project: ${project.name}
Type: ${project.type}
Status: ${project.status}
Budget: $${parseFloat(project.budget || 0).toLocaleString()}
Progress: ${project.progress}%

Generated by ConstructPro Manager
        `.trim();
        
        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoLink);
        this.showAlert('success', 'Email client opened with project report');
    }

    printProjectFallback(project) {
        const printContent = `
            <html>
            <head>
                <title>Project Report: ${project.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
                    .label { font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>ConstructPro Manager</h1>
                    <h2>Project Report: ${project.name}</h2>
                </div>
                <p><span class="label">Type:</span> ${project.type}</p>
                <p><span class="label">Status:</span> ${project.status}</p>
                <p><span class="label">Budget:</span> $${parseFloat(project.budget || 0).toLocaleString()}</p>
                <p><span class="label">Progress:</span> ${project.progress}%</p>
                <p><span class="label">Description:</span><br>${project.description}</p>
                <p><span class="label">Location:</span><br>${project.location}</p>
                <div style="margin-top: 40px; text-align: center; color: #666;">
                    <small>Generated by ConstructPro Manager on ${new Date().toLocaleDateString()}</small>
                </div>
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
        this.showAlert('success', 'Project report sent to printer');
    }

    shareProjectLinkFallback(project) {
        const shareData = {
            title: `Project: ${project.name}`,
            text: `Check out this project: ${project.name} (${project.type})`,
            url: window.location.href
        };

        if (navigator.share) {
            navigator.share(shareData);
        } else {
            // Copy link to clipboard
            navigator.clipboard.writeText(window.location.href).then(() => {
                this.showAlert('success', 'Project link copied to clipboard');
            });
        }
    }

    exportProject(projectId, format) {
        try {
            if (window.dataManager) {
                const exportData = window.dataManager.exportProjectData(projectId, format);
                if (exportData) {
                    this.downloadFile(exportData, `project_${projectId}.${format}`, format);
                    this.showAlert('success', `Project exported as ${format.toUpperCase()}`);
                }
            } else {
                this.showAlert('warning', 'Export feature requires DataManager. Please refresh the page.');
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.showAlert('danger', 'Failed to export project');
        }
    }

    downloadFile(content, filename, type) {
        const mimeTypes = {
            'json': 'application/json',
            'csv': 'text/csv',
            'xml': 'application/xml',
            'pdf': 'application/pdf'
        };

        const blob = new Blob([content], { type: mimeTypes[type] || 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Project Selection and Context Management
    selectProject(projectId) {
        const project = this.projects.find(p => p.id == projectId);
        if (project) {
            this.currentProject = project;
            
            // Notify DataManager
            if (window.dataManager) {
                window.dataManager.setCurrentProject(project);
            }

            // Update UI to show current project
            this.updateCurrentProjectDisplay();
            
            // Dispatch event for other modules
            window.dispatchEvent(new CustomEvent('projectSelected', {
                detail: { project }
            }));

            this.showAlert('info', `Project "${project.name}" selected`);
        }
    }

    updateCurrentProjectDisplay() {
        // Update sidebar to show current project info
        const sidebarContent = document.getElementById('sidebarContent');
        if (!sidebarContent) return;

        // Remove existing project selector
        const existingSelector = sidebarContent.querySelector('.project-selector');
        if (existingSelector) {
            existingSelector.remove();
        }

        // Add project selector at the top
        const projectSelector = `
            <div class="project-selector mb-3">
                <h6 class="text-muted mb-2">Active Project</h6>
                <select class="form-select form-select-sm" id="globalProjectSelect" onchange="app.selectProject(this.value)">
                    <option value="">Select Project...</option>
                    ${this.projects.map(p => `
                        <option value="${p.id}" ${this.currentProject?.id == p.id ? 'selected' : ''}>
                            ${p.name}
                        </option>
                    `).join('')}
                </select>
                ${this.currentProject ? `
                    <div class="mt-2 p-2 bg-light rounded">
                        <small class="text-muted">
                            <i class="bi bi-building"></i> ${this.currentProject.name}<br>
                            <i class="bi bi-tag"></i> ${this.currentProject.type}<br>
                            <i class="bi bi-graph-up"></i> ${this.currentProject.progress}% Complete
                        </small>
                    </div>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline-primary w-100" onclick="app.viewProject(${this.currentProject.id})">
                            <i class="bi bi-eye"></i> View Project Details
                        </button>
                    </div>
                ` : ''}
            </div>
            <hr>
        `;
        
        sidebarContent.insertAdjacentHTML('afterbegin', projectSelector);
    }

    // Enhanced view project with full integration
    viewProject(projectId) {
        const project = this.projects.find(p => p.id == projectId);
        if (!project) return;

        // Set as current project
        this.selectProject(projectId);

        // Get integrated data
        const projectData = window.dataManager ? 
            window.dataManager.getProjectData(projectId) : 
            { project, client: null, blueprints: [], takeoffs: [], estimates: [], contracts: [] };

        this.showProjectDetailsModal(projectData);
    }

    showProjectDetailsModal(projectData) {
        const { project, client, blueprints, takeoffs, estimates, contracts } = projectData;

        const modalHtml = `
            <div class="modal fade" id="projectDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-building text-primary me-2"></i>${project.name}
                            </h5>
                            <div class="ms-auto d-flex gap-2">
                                <div class="btn-group">
                                    <button class="btn btn-sm btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown">
                                        <i class="bi bi-share"></i> Share
                                    </button>
                                    <ul class="dropdown-menu">
                                        <li><a class="dropdown-item" href="#" onclick="app.shareProject(${project.id}, 'email')">
                                            <i class="bi bi-envelope"></i> Email Report
                                        </a></li>
                                        <li><a class="dropdown-item" href="#" onclick="app.shareProject(${project.id}, 'print')">
                                            <i class="bi bi-printer"></i> Print Report
                                        </a></li>
                                        <li><a class="dropdown-item" href="#" onclick="app.shareProject(${project.id}, 'link')">
                                            <i class="bi bi-link"></i> Share Link
                                        </a></li>
                                    </ul>
                                </div>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                        </div>
                        <div class="modal-body">
                            <!-- Project Overview -->
                            <div class="row mb-4">
                                <div class="col-md-8">
                                    <h6 class="text-primary">Project Information</h6>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <p><strong>Type:</strong> ${project.type}</p>
                                            <p><strong>Status:</strong> <span class="badge ${this.getStatusBadgeClass(project.status)}">${project.status}</span></p>
                                            <p><strong>Start Date:</strong> ${project.start_date ? new Date(project.start_date).toLocaleDateString() : 'TBD'}</p>
                                        </div>
                                        <div class="col-md-6">
                                            <p><strong>Budget:</strong> $${parseFloat(project.budget || 0).toLocaleString()}</p>
                                            <p><strong>Progress:</strong> ${project.progress}%</p>
                                            <p><strong>End Date:</strong> ${project.end_date ? new Date(project.end_date).toLocaleDateString() : 'TBD'}</p>
                                        </div>
                                    </div>
                                    <p><strong>Location:</strong> ${project.location}</p>
                                    <p><strong>Description:</strong> ${project.description}</p>
                                </div>
                                <div class="col-md-4">
                                    ${client ? `
                                        <h6 class="text-primary">Client Information</h6>
                                        <p><strong>${client.name}</strong></p>
                                        <p><i class="bi bi-person"></i> ${client.contact_info}</p>
                                        <p><i class="bi bi-envelope"></i> ${client.email}</p>
                                        <p><i class="bi bi-phone"></i> ${client.phone}</p>
                                        <p><i class="bi bi-geo-alt"></i> ${client.address}</p>
                                    ` : '<p class="text-muted">No client assigned</p>'}
                                </div>
                            </div>

                            <!-- Integration Tabs -->
                            <ul class="nav nav-tabs mb-3" id="projectDetailTabs">
                                <li class="nav-item">
                                    <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#blueprints-tab">
                                        <i class="bi bi-file-earmark-image"></i> Blueprints (${blueprints.length})
                                    </button>
                                </li>
                                <li class="nav-item">
                                    <button class="nav-link" data-bs-toggle="tab" data-bs-target="#takeoffs-tab">
                                        <i class="bi bi-calculator"></i> Takeoffs (${takeoffs.length})
                                    </button>
                                </li>
                                <li class="nav-item">
                                    <button class="nav-link" data-bs-toggle="tab" data-bs-target="#estimates-tab">
                                        <i class="bi bi-currency-dollar"></i> Estimates (${estimates.length})
                                    </button>
                                </li>
                                <li class="nav-item">
                                    <button class="nav-link" data-bs-toggle="tab" data-bs-target="#contracts-tab">
                                        <i class="bi bi-file-earmark-text"></i> Contracts (${contracts.length})
                                    </button>
                                </li>
                            </ul>

                            <div class="tab-content">
                                <!-- Blueprints Tab -->
                                <div class="tab-pane fade show active" id="blueprints-tab">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h6>Project Blueprints</h6>
                                        <button class="btn btn-sm btn-primary" onclick="app.addBlueprintToProject(${project.id})">
                                            <i class="bi bi-plus"></i> Add Blueprint
                                        </button>
                                    </div>
                                    ${blueprints.length > 0 ? `
                                        <div class="table-responsive">
                                            <table class="table table-sm">
                                                <thead>
                                                    <tr>
                                                        <th>Name</th>
                                                        <th>Upload Date</th>
                                                        <th>Type</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${blueprints.map(bp => `
                                                        <tr>
                                                            <td>${bp.name}</td>
                                                            <td>${new Date(bp.uploaded_date).toLocaleDateString()}</td>
                                                            <td>${bp.file_type}</td>
                                                            <td>
                                                                <button class="btn btn-sm btn-outline-primary" onclick="app.openBlueprint(${bp.id})">
                                                                    <i class="bi bi-eye"></i> View
                                                                </button>
                                                                <button class="btn btn-sm btn-outline-success" onclick="app.createTakeoffFromBlueprint(${bp.id})">
                                                                    <i class="bi bi-calculator"></i> Takeoff
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    ` : '<p class="text-muted text-center py-3">No blueprints uploaded yet</p>'}
                                </div>

                                <!-- Takeoffs Tab -->
                                <div class="tab-pane fade" id="takeoffs-tab">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h6>Project Takeoffs</h6>
                                        <button class="btn btn-sm btn-primary" onclick="app.createTakeoffForProject(${project.id})">
                                            <i class="bi bi-plus"></i> New Takeoff
                                        </button>
                                    </div>
                                    ${takeoffs.length > 0 ? `
                                        <div class="table-responsive">
                                            <table class="table table-sm">
                                                <thead>
                                                    <tr>
                                                        <th>Name</th>
                                                        <th>Blueprint</th>
                                                        <th>Quantity</th>
                                                        <th>Unit</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${takeoffs.map(to => `
                                                        <tr>
                                                            <td>${to.name}</td>
                                                            <td>${to.blueprint_name || 'N/A'}</td>
                                                            <td>${to.total_quantity}</td>
                                                            <td>${to.unit}</td>
                                                            <td>
                                                                <button class="btn btn-sm btn-outline-primary" onclick="app.editTakeoff(${to.id})">
                                                                    <i class="bi bi-pencil"></i> Edit
                                                                </button>
                                                                <button class="btn btn-sm btn-outline-success" onclick="app.createEstimateFromTakeoff(${to.id})">
                                                                    <i class="bi bi-currency-dollar"></i> Estimate
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    ` : '<p class="text-muted text-center py-3">No takeoffs created yet</p>'}
                                </div>

                                <!-- Estimates Tab -->
                                <div class="tab-pane fade" id="estimates-tab">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h6>Project Estimates</h6>
                                        <button class="btn btn-sm btn-primary" onclick="app.createEstimateForProject(${project.id})">
                                            <i class="bi bi-plus"></i> New Estimate
                                        </button>
                                    </div>
                                    ${estimates.length > 0 ? `
                                        <div class="table-responsive">
                                            <table class="table table-sm">
                                                <thead>
                                                    <tr>
                                                        <th>Name</th>
                                                        <th>Total Cost</th>
                                                        <th>Status</th>
                                                        <th>Created</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${estimates.map(est => `
                                                        <tr>
                                                            <td>${est.name}</td>
                                                            <td>$${parseFloat(est.total_cost || 0).toLocaleString()}</td>
                                                            <td><span class="badge bg-primary">${est.status}</span></td>
                                                            <td>${new Date(est.created_date).toLocaleDateString()}</td>
                                                            <td>
                                                                <button class="btn btn-sm btn-outline-primary" onclick="app.viewEstimate(${est.id})">
                                                                    <i class="bi bi-eye"></i> View
                                                                </button>
                                                                <button class="btn btn-sm btn-outline-success" onclick="app.createContractFromEstimate(${est.id})">
                                                                    <i class="bi bi-file-earmark-text"></i> Contract
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    ` : '<p class="text-muted text-center py-3">No estimates created yet</p>'}
                                </div>

                                <!-- Contracts Tab -->
                                <div class="tab-pane fade" id="contracts-tab">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h6>Project Contracts</h6>
                                        <button class="btn btn-sm btn-primary" onclick="app.createContractForProject(${project.id})">
                                            <i class="bi bi-plus"></i> New Contract
                                        </button>
                                    </div>
                                    ${contracts.length > 0 ? `
                                        <div class="table-responsive">
                                            <table class="table table-sm">
                                                <thead>
                                                    <tr>
                                                        <th>Name</th>
                                                        <th>Value</th>
                                                        <th>Status</th>
                                                        <th>Signed Date</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${contracts.map(cont => `
                                                        <tr>
                                                            <td>${cont.name}</td>
                                                            <td>$${parseFloat(cont.value || 0).toLocaleString()}</td>
                                                            <td><span class="badge bg-success">${cont.status}</span></td>
                                                            <td>${cont.signed_date ? new Date(cont.signed_date).toLocaleDateString() : 'Not signed'}</td>
                                                            <td>
                                                                <button class="btn btn-sm btn-outline-primary" onclick="app.viewContract(${cont.id})">
                                                                    <i class="bi bi-eye"></i> View
                                                                </button>
                                                                <button class="btn btn-sm btn-outline-info" onclick="app.shareProject(${project.id}, 'email')">
                                                                    <i class="bi bi-envelope"></i> Email
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    ` : '<p class="text-muted text-center py-3">No contracts created yet</p>'}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove any existing modal
        const existingModal = document.getElementById('sharingModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add the modal to the document
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('sharingModal'));
        modal.show();
        
        // Clean up when modal is hidden
        document.getElementById('sharingModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize AuthManager first
    window.authManager = new AuthManager();
    
    // Initialize the main app
    window.app = new ConstructProApp();
});
