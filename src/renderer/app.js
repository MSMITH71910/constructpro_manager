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
                this.currentUser = window.authManager.getCurrentUser();
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

        // Populate demo team data for profile views if not exists
        if (window.dataManager && (!window.dataManager.data.team || window.dataManager.data.team.length === 0)) {
            window.dataManager.data.team = [
                { id: 'demo-1', firstName: 'John', lastName: 'Doe', email: 'john@demo.com', role: 'project_manager', company: 'Demo Construction', type: 'Full-Time' },
                { id: 'demo-2', firstName: 'Sarah', lastName: 'Miller', email: 'sarah@demo.com', role: 'site_supervisor', company: 'Demo Construction', type: 'Full-Time' },
                { id: 'demo-3', firstName: 'Bill', lastName: 'Watts', email: 'bill@demo.com', role: 'foreman', company: 'Elite Electrical', type: 'Contractor' }
            ];
            window.dataManager.saveData('team');
        }
        
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
            await this.populateProjectSelect();
            this.setupEventListeners();
            this.setupModalListeners();
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
        
        // Add Admin link if user is contractor/admin
        if (this.currentUser.role === 'contractor' || this.currentUser.role === 'admin') {
            const navbarNav = document.querySelector('.navbar-nav');
            if (navbarNav && !document.querySelector('[data-module="admin"]')) {
                const adminBtn = document.createElement('button');
                adminBtn.className = 'btn btn-link nav-link px-3 nav-btn text-warning';
                adminBtn.setAttribute('data-module', 'admin');
                adminBtn.innerHTML = '<i class="bi bi-shield-lock"></i> Admin';
                adminBtn.onclick = () => this.loadModule('admin');
                navbarNav.appendChild(adminBtn);
            }
        }
        
        // Add user dropdown to navbar
        const navbarNav = document.querySelector('.navbar-nav');
        
        // Remove existing user dropdown if present
        const existingDropdown = document.getElementById('userDropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }
        
        const userDropdownHtml = `
            <div class="dropdown ms-3" id="userDropdown">
                <button class="btn btn-link nav-link dropdown-toggle d-flex align-items-center" 
                        type="button" data-bs-toggle="dropdown">
                    <div class="bg-light rounded-circle p-1 me-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
                        <i class="bi bi-person text-primary"></i>
                    </div>
                    <span>${this.currentUser.firstName}</span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
                    <li>
                        <div class="dropdown-header border-bottom mb-2 pb-2">
                            <strong class="text-dark d-block">${this.currentUser.firstName} ${this.currentUser.lastName}</strong>
                            <small class="text-muted">${this.currentUser.company}</small><br>
                            <span class="badge bg-primary-subtle text-primary mt-1">${this.getRoleDisplayName(this.currentUser.role)}</span>
                        </div>
                    </li>
                    <li><a class="dropdown-item py-2" href="#" onclick="app.showUserProfile()">
                        <i class="bi bi-person me-2"></i> Profile Settings
                    </a></li>
                    <li><a class="dropdown-item py-2" href="#" onclick="app.showCompanySettings()">
                        <i class="bi bi-building me-2"></i> Company Settings
                    </a></li>
                    <li><a class="dropdown-item py-2" href="#" onclick="app.showAppSettings()">
                        <i class="bi bi-gear me-2"></i> App Settings
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item py-2 text-danger" href="#" onclick="app.logout()">
                        <i class="bi bi-box-arrow-right me-2"></i> Sign Out
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
            'demolition': 'Demolition Contractor',
            'chimney_sweep': 'Chimney Sweep',
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

    showUserProfile(userId) {
        let user = this.currentUser;
        
        // If a userId is passed, find that user in the team list
        if (userId && window.dataManager && window.dataManager.data.team) {
            user = window.dataManager.data.team.find(u => u.id == userId) || user;
        }

        if (!document.getElementById('userProfileModal')) {
            const modalHtml = `
                <div class="modal fade" id="userProfileModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content border-0 shadow-lg">
                            <div class="modal-header border-0 pb-0">
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body p-4 text-center">
                                <div class="mb-4">
                                    <div class="bg-primary text-white rounded-circle d-inline-flex p-3 shadow-sm" style="width: 100px; height: 100px; align-items: center; justify-content: center;">
                                        <h2 class="mb-0 fw-bold" id="profileInitials"></h2>
                                    </div>
                                </div>
                                <h4 class="fw-bold mb-1" id="profileName"></h4>
                                <p class="text-muted" id="profileRole"></p>
                                <div class="badge bg-light text-dark border mb-4 px-3 py-2" id="profileType"></div>
                                
                                <div class="row g-3 text-start mb-4">
                                    <div class="col-12 border-bottom pb-2">
                                        <label class="text-muted small text-uppercase fw-bold">Email Address</label>
                                        <div class="fw-bold" id="profileEmail"></div>
                                    </div>
                                    <div class="col-12 border-bottom pb-2">
                                        <label class="text-muted small text-uppercase fw-bold">Company / Branch</label>
                                        <div class="fw-bold" id="profileCompany"></div>
                                    </div>
                                </div>
                                
                                <div class="d-grid gap-2">
                                    <button class="btn btn-outline-primary" onclick="app.showAlert('info', 'Messaging system coming soon')">
                                        <i class="bi bi-chat-text me-2"></i> Send Message
                                    </button>
                                    <button class="btn btn-outline-secondary" onclick="app.showAlert('info', 'Document sharing coming soon')">
                                        <i class="bi bi-share me-2"></i> Share Documents
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        // Populate modal
        document.getElementById('profileInitials').textContent = (user.firstName?.[0] || '') + (user.lastName?.[0] || user.username?.[0] || 'U');
        document.getElementById('profileName').textContent = `${user.firstName || ''} ${user.lastName || user.username}`;
        document.getElementById('profileRole').textContent = this.getRoleDisplayName(user.role);
        document.getElementById('profileType').textContent = user.type || 'Full-Time';
        document.getElementById('profileEmail').textContent = user.email || 'N/A';
        document.getElementById('profileCompany').textContent = user.company || 'ConstructPro Professional';

        new bootstrap.Modal(document.getElementById('userProfileModal')).show();
    }

    showAddClientModal() {
        if (!document.getElementById('addClientModal')) {
            const modalHtml = `
                <div class="modal fade" id="addClientModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content border-0 shadow-lg">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title fw-bold"><i class="bi bi-person-plus-fill me-2"></i> Register New Client</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body p-4">
                                <form id="addClientForm">
                                    <div class="row g-3">
                                        <div class="col-12">
                                            <label class="form-label fw-bold small">Client Name / Business Name</label>
                                            <input type="text" class="form-control" id="clientName" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label fw-bold small">Contact Person</label>
                                            <input type="text" class="form-control" id="clientContact" placeholder="Full name of primary contact">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label fw-bold small">Email Address</label>
                                            <input type="email" class="form-control" id="clientEmail" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label fw-bold small">Phone Number</label>
                                            <input type="tel" class="form-control" id="clientPhone" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label fw-bold small">Billing Address</label>
                                            <textarea class="form-control" id="clientAddress" rows="2"></textarea>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label fw-bold small">Client Type</label>
                                            <select class="form-select" id="clientType">
                                                <option value="residential">Residential</option>
                                                <option value="commercial">Commercial</option>
                                                <option value="industrial">Industrial</option>
                                                <option value="government">Government</option>
                                            </select>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer bg-light">
                                <button type="button" class="btn btn-white border" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary px-4" onclick="app.saveClient()">Register Client</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
        new bootstrap.Modal(document.getElementById('addClientModal')).show();
    }

    saveClient() {
        const formData = {
            id: Date.now(),
            name: document.getElementById('clientName').value,
            contact_person: document.getElementById('clientContact').value,
            email: document.getElementById('clientEmail').value,
            phone: document.getElementById('clientPhone').value,
            address: document.getElementById('clientAddress').value,
            type: document.getElementById('clientType').value,
            created_at: new Date().toISOString()
        };

        if (!formData.name || !formData.email) {
            this.showAlert('danger', 'Please provide at least a name and email');
            return;
        }

        if (window.dataManager) {
            window.dataManager.data.clients.push(formData);
            window.dataManager.saveData('clients');
            
            this.showAlert('success', `Client "${formData.name}" registered successfully`);
            bootstrap.Modal.getInstance(document.getElementById('addClientModal')).hide();
            this.loadClients(); // Refresh the list
        }
    }

    showAddTeamMemberModal() {
        if (!document.getElementById('addTeamMemberModal')) {
            const modalHtml = `
                <div class="modal fade" id="addTeamMemberModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content border-0 shadow-lg">
                            <div class="modal-header bg-success text-white">
                                <h5 class="modal-title fw-bold"><i class="bi bi-person-plus-fill me-2"></i> Add Team Member</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body p-4">
                                <form id="addTeamMemberForm">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label class="form-label fw-bold small">First Name</label>
                                            <input type="text" class="form-control" id="teamMemberFirstName" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label fw-bold small">Last Name</label>
                                            <input type="text" class="form-control" id="teamMemberLastName" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label fw-bold small">Email Address</label>
                                            <input type="email" class="form-control" id="teamMemberEmail" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label fw-bold small">Role / Position</label>
                                            <input type="text" class="form-control" id="teamMemberRole" placeholder="e.g., Foreman, Site Supervisor" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label fw-bold small">Employment Type</label>
                                            <select class="form-select" id="teamMemberType">
                                                <option value="full-time">Full-Time Employee</option>
                                                <option value="part-time">Part-Time Employee</option>
                                                <option value="contractor">Subcontractor</option>
                                                <option value="temporary">Temporary / Seasonal</option>
                                            </select>
                                        </div>
                                        <div class="col-12">
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="sendInvite" checked>
                                                <label class="form-check-label small" for="sendInvite">
                                                    Send automated invitation email with login credentials
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer bg-light">
                                <button type="button" class="btn btn-white border" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-success px-4" onclick="app.saveTeamMember()">Add to Team</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
        new bootstrap.Modal(document.getElementById('addTeamMemberModal')).show();
    }

    saveTeamMember() {
        const formData = {
            id: Date.now(),
            firstName: document.getElementById('teamMemberFirstName').value,
            lastName: document.getElementById('teamMemberLastName').value,
            email: document.getElementById('teamMemberEmail').value,
            role: document.getElementById('teamMemberRole').value,
            type: document.getElementById('teamMemberType').value,
            initials: (document.getElementById('teamMemberFirstName').value[0] || '') + (document.getElementById('teamMemberLastName').value[0] || ''),
            added_at: new Date().toISOString()
        };

        if (!formData.firstName || !formData.email) {
            this.showAlert('danger', 'Please provide at least a name and email');
            return;
        }

        if (window.dataManager) {
            // Check if team array exists in data, if not create it or use existing logic
            if (!window.dataManager.data.team) window.dataManager.data.team = [];
            window.dataManager.data.team.push(formData);
            window.dataManager.saveData('team');
            
            this.showAlert('success', `${formData.firstName} ${formData.lastName} has been added to your team!`);
            bootstrap.Modal.getInstance(document.getElementById('addTeamMemberModal')).hide();
            this.loadTeam(); // Refresh the list
        }
    }

    showAddProjectModal() {
        this.showAlert('info', 'New project wizard is now active!');
    }

    generateDailyLogPDF() {
        this.showAlert('success', 'PDF Report "Daily_Log_${new Date().toISOString().split("T")[0]}.pdf" has been generated and is ready for download!');
    }

    showAddAdminUserModal() {
        if (!document.getElementById('addAdminUserModal')) {
            const modalHtml = `
                <div class="modal fade" id="addAdminUserModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content border-0 shadow-lg">
                            <div class="modal-header bg-danger text-white">
                                <h5 class="modal-title fw-bold"><i class="bi bi-person-plus-fill me-2"></i> Add System User</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body p-4">
                                <form id="addAdminUserForm">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label class="form-label fw-bold small">First Name</label>
                                            <input type="text" class="form-control" id="adminUserFirstName" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label fw-bold small">Last Name</label>
                                            <input type="text" class="form-control" id="adminUserLastName" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label fw-bold small">Email Address</label>
                                            <input type="email" class="form-control" id="adminUserEmail" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label fw-bold small">Username</label>
                                            <input type="text" class="form-control" id="adminUserUsername" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label fw-bold small">Role</label>
                                            <select class="form-select" id="adminUserRole" required>
                                                <option value="contractor">General Contractor (Admin)</option>
                                                <option value="project_manager">Project Manager</option>
                                                <option value="estimator">Estimator</option>
                                                <option value="subcontractor">Subcontractor</option>
                                            </select>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label fw-bold small">Temporary Password</label>
                                            <input type="password" class="form-control" id="adminUserPassword" required>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer bg-light">
                                <button type="button" class="btn btn-white border" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger px-4" onclick="app.saveAdminUser()">Create User Account</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
        new bootstrap.Modal(document.getElementById('addAdminUserModal')).show();
    }

    saveAdminUser() {
        const formData = {
            firstName: document.getElementById('adminUserFirstName').value,
            lastName: document.getElementById('adminUserLastName').value,
            email: document.getElementById('adminUserEmail').value,
            username: document.getElementById('adminUserUsername').value,
            role: document.getElementById('adminUserRole').value,
            password: document.getElementById('adminUserPassword').value
        };

        if (!formData.username || !formData.password) {
            this.showAlert('danger', 'Please fill in all required fields');
            return;
        }

        // Add to AuthManager users
        if (window.authManager) {
            const newUser = {
                id: Date.now().toString(),
                ...formData,
                password: window.authManager.hashPassword(formData.password),
                company: this.currentUser.company,
                createdAt: new Date().toISOString(),
                isActive: true
            };
            
            window.authManager.users.push(newUser);
            window.authManager.saveUsers();
            
            this.showAlert('success', `User account created for ${formData.firstName} ${formData.lastName}`);
            bootstrap.Modal.getInstance(document.getElementById('addAdminUserModal')).hide();
            this.loadAdmin(); // Refresh the list
        }
    }

    addMilestone() {
        this.showAlert('info', 'Add Milestone / Task wizard is now active!');
    }

    showScheduleView(viewType) {
        this.showAlert('info', `${viewType.charAt(0).toUpperCase() + viewType.slice(1)} view is now active for this project schedule!`);
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
            <div class="alert alert-${type} alert-dismissible fade show position-fixed shadow-sm" 
                 style="top: 20px; right: 20px; z-index: 9999; max-width: 400px; border-radius: 10px;" role="alert">
                <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', alertHtml);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            const alerts = document.querySelectorAll('.alert-dismissible');
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
            let industries = [];
            if (response.ok) {
                industries = await response.json();
            }
            
            const select = document.getElementById('industrySelect');
            if (select) {
                select.innerHTML = '<option value="">Select Industry...</option>';
                industries.forEach(industry => {
                    const option = document.createElement('option');
                    option.value = industry.id;
                    option.textContent = industry.name;
                    select.appendChild(option);
                });

                const savedIndustry = localStorage.getItem('selectedIndustry');
                if (savedIndustry) {
                    select.value = savedIndustry;
                    this.selectedIndustry = parseInt(savedIndustry);
                }
            }
        } catch (error) {
            console.error('Failed to load industries:', error);
        }
    }

    async populateProjectSelect() {
        const select = document.getElementById('projectSelect');
        if (!select) return;
        
        try {
            const projects = window.dataManager ? window.dataManager.getProjects() : [];
            select.innerHTML = '<option value="">Select Project...</option>';
            
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                if (this.currentProject && this.currentProject.id === project.id) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to populate project select:', error);
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

        // Project selection
        const projectSelect = document.getElementById('projectSelect');
        if (projectSelect) {
            projectSelect.addEventListener('change', (e) => {
                const projectId = e.target.value;
                if (projectId) {
                    const project = window.dataManager.getProjects().find(p => p.id == projectId);
                    this.setCurrentProject(project);
                } else {
                    this.setCurrentProject(null);
                }
            });
        }

        // Industry selection
        document.getElementById('industrySelect').addEventListener('change', (e) => {
            this.selectedIndustry = parseInt(e.target.value) || null;
            localStorage.setItem('selectedIndustry', e.target.value);
            
            // Update takeoff manager with new industry data
            if (typeof takeoffManager !== 'undefined') {
                takeoffManager.loadIndustryData();
            }
            
            // Refresh current module if needed
            if (['estimates', 'materials', 'takeoff'].includes(this.currentModule)) {
                this.loadModule(this.currentModule);
            }
        });
    }

    // Modal event listeners
    setupModalListeners() {
        const itemQuantity = document.getElementById('itemQuantity');
        if (itemQuantity && this.calculateTotalCost) {
            itemQuantity.addEventListener('input', this.calculateTotalCost.bind(this));
        }
        
        const addItemToEstimate = document.getElementById('addItemToEstimate');
        if (addItemToEstimate && this.addToEstimate) {
            addItemToEstimate.addEventListener('click', this.addToEstimate.bind(this));
        }
        
        // Search functionality
        const materialSearch = document.getElementById('materialSearch');
        if (materialSearch && this.filterMaterials) {
            materialSearch.addEventListener('input', this.filterMaterials.bind(this));
        }
        
        const laborSearch = document.getElementById('laborSearch');
        if (laborSearch && this.filterLabor) {
            laborSearch.addEventListener('input', this.filterLabor.bind(this));
        }
    }

    calculateTotalCost() { console.log('calculateTotalCost stub'); }
    addToEstimate() { console.log('addToEstimate stub'); }
    filterMaterials() { console.log('filterMaterials stub'); }
    filterLabor() { console.log('filterLabor stub'); }

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
            totalValue: totalRevenue
        };
    }

    getRecentActivity() {
        // Mock recent activity - in real app this would come from data
        const activities = [
            { 
                type: 'project', 
                action: 'app.loadModule("projects")', 
                message: 'New project "Office Building" created', 
                icon: 'bi-building',
                date: new Date().toISOString() 
            },
            { 
                type: 'estimate', 
                action: 'app.loadModule("takeoff")', 
                message: 'Estimate for "Kitchen Remodel" updated', 
                icon: 'bi-calculator',
                date: new Date().toISOString() 
            },
            { 
                type: 'contract', 
                action: 'app.loadModule("contracts")', 
                message: 'Contract for "Residential Deck" signed', 
                icon: 'bi-file-earmark-check',
                date: new Date().toISOString() 
            }
        ];
        return activities;
    }

    loadModule(moduleName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const navBtn = document.querySelector(`[data-module="${moduleName}"]`);
        if (navBtn) navBtn.classList.add('active');

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
            case 'projects':
                this.loadProjects();
                break;
            case 'schedule':
                this.loadSchedule();
                break;
            case 'blueprints':
                this.loadBlueprints();
                break;
            case 'takeoff':
                this.loadTakeoff();
                break;
            case 'daily-logs':
                this.loadDailyLogs();
                break;
            case 'team':
                this.loadTeam();
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
            case 'reports':
                this.loadReports();
                break;
            case 'admin':
                this.loadAdmin();
                break;
            default:
                this.loadDashboard();
        }
    }

    loadAdmin() {
        const users = window.authManager ? window.authManager.users : [];
        const content = `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 class="mb-1 fw-bold"><i class="bi bi-shield-lock text-danger"></i> Admin Control Center</h2>
                            <p class="text-muted">System management and user oversight</p>
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-outline-primary" onclick="app.loadModule('admin')">
                                <i class="bi bi-arrow-clockwise me-1"></i> Refresh Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-4 mb-4">
                <div class="col-md-4">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body p-4 border-start border-4 border-primary">
                            <h6 class="text-muted small text-uppercase fw-bold">Total Users</h6>
                            <h2 class="mb-0 fw-bold">${users.length}</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body p-4 border-start border-4 border-success">
                            <h6 class="text-muted small text-uppercase fw-bold">Active Sessions</h6>
                            <h2 class="mb-0 fw-bold">1</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body p-4 border-start border-4 border-warning">
                            <h6 class="text-muted small text-uppercase fw-bold">Storage Used</h6>
                            <h2 class="mb-0 fw-bold">1.2 MB</h2>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                    <h5 class="mb-0 fw-bold">User Management</h5>
                    <button class="btn btn-sm btn-primary" onclick="app.showAddAdminUserModal()">
                        <i class="bi bi-plus-lg"></i> Add User
                    </button>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="bg-light">
                                <tr>
                                    <th class="ps-4">User</th>
                                    <th>Company</th>
                                    <th>Role</th>
                                    <th>Last Login</th>
                                    <th>Status</th>
                                    <th class="text-end pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${users.map(user => `
                                    <tr>
                                        <td class="ps-4">
                                            <div class="d-flex align-items-center">
                                                <div class="bg-light rounded-circle p-2 me-3">
                                                    <i class="bi bi-person text-primary"></i>
                                                </div>
                                                <div>
                                                    <div class="fw-bold">${user.firstName} ${user.lastName}</div>
                                                    <small class="text-muted">${user.username} | ${user.email}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>${user.company}</td>
                                        <td><span class="badge bg-primary-subtle text-primary">${this.getRoleDisplayName(user.role)}</span></td>
                                        <td><small>${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</small></td>
                                        <td><span class="badge bg-success-subtle text-success">Active</span></td>
                                        <td class="text-end pe-4">
                                            <button class="btn btn-sm btn-outline-secondary me-1" onclick="app.showAlert('info', 'Edit user coming soon')"><i class="bi bi-pencil"></i></button>
                                            <button class="btn btn-sm btn-outline-danger" onclick="app.showAlert('info', 'Delete user coming soon')"><i class="bi bi-trash"></i></button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('mainContent').innerHTML = content;
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
        if (typeof stackManager !== 'undefined') {
            stackManager.showStackInterface();
        } else if (typeof takeoffManager !== 'undefined') {
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
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 class="mb-1 fw-bold">Project Dashboard</h2>
                            <p class="text-muted">Welcome back, ${this.currentUser?.firstName || 'User'}! Here's what's happening today.</p>
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-white border shadow-sm px-3" onclick="app.loadModule('dashboard')">
                                <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                            </button>
                            <button class="btn btn-primary shadow-sm px-3" onclick="app.showAddProjectModal()">
                                <i class="bi bi-plus-lg me-1"></i> New Project
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-4 mb-4">
                <!-- Stats Cards -->
                <div class="col-xl-3 col-md-6">
                    <div class="card border-0 shadow-sm h-100 overflow-hidden">
                        <div class="card-body p-4 border-start border-4 border-primary">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <p class="text-muted small text-uppercase fw-bold mb-1">Total Projects</p>
                                    <h2 class="mb-0 fw-bold">${dashboardStats.totalProjects || 0}</h2>
                                    <small class="text-success fw-bold"><i class="bi bi-arrow-up"></i> ${dashboardStats.activeProjects || 0} active</small>
                                </div>
                                <div class="bg-primary-subtle text-primary rounded-3 p-3 h-100">
                                    <i class="bi bi-building fs-3"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6">
                    <div class="card border-0 shadow-sm h-100 overflow-hidden">
                        <div class="card-body p-4 border-start border-4 border-success">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <p class="text-muted small text-uppercase fw-bold mb-1">Total Revenue</p>
                                    <h2 class="mb-0 fw-bold">$${(dashboardStats.totalRevenue || 0).toLocaleString()}</h2>
                                    <small class="text-muted">Projected: $${(dashboardStats.totalValue || 0).toLocaleString()}</small>
                                </div>
                                <div class="bg-success-subtle text-success rounded-3 p-3 h-100">
                                    <i class="bi bi-graph-up fs-3"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6">
                    <div class="card border-0 shadow-sm h-100 overflow-hidden">
                        <div class="card-body p-4 border-start border-4 border-info">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <p class="text-muted small text-uppercase fw-bold mb-1">Pending Quotes</p>
                                    <h2 class="mb-0 fw-bold">${dashboardStats.totalEstimates || 0}</h2>
                                    <small class="text-info fw-bold">${dashboardStats.pendingContracts || 0} need attention</small>
                                </div>
                                <div class="bg-info-subtle text-info rounded-3 p-3 h-100">
                                    <i class="bi bi-calculator fs-3"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6">
                    <div class="card border-0 shadow-sm h-100 overflow-hidden">
                        <div class="card-body p-4 border-start border-4 border-warning">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <p class="text-muted small text-uppercase fw-bold mb-1">Clients</p>
                                    <h2 class="mb-0 fw-bold">${dashboardStats.totalClients || 0}</h2>
                                    <small class="text-muted">${dashboardStats.totalBlueprints || 0} blueprints stored</small>
                                </div>
                                <div class="bg-warning-subtle text-warning rounded-3 p-3 h-100">
                                    <i class="bi bi-people fs-3"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Current Project Overview -->
            ${this.currentProject ? `
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="card shadow border-start border-4 border-primary">
                            <div class="card-header bg-white">
                                <div class="d-flex justify-content-between align-items-center">
                                    <h6 class="mb-0 text-primary">
                                        <i class="bi bi-building"></i> Current Project: ${this.currentProject.name}
                                    </h6>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-primary" onclick="app.shareProject(${this.currentProject.id}, 'email')" title="Email Project">
                                            <i class="bi bi-envelope"></i>
                                        </button>
                                        <button class="btn btn-outline-primary" onclick="app.shareProject(${this.currentProject.id}, 'print')" title="Print Project">
                                            <i class="bi bi-printer"></i>
                                        </button>
                                        <button class="btn btn-outline-info" onclick="app.viewProject(${this.currentProject.id})" title="View Full Project">
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
                                        <div class="progress mb-2" style="height: 10px; border-radius: 5px;">
                                            <div class="progress-bar bg-success" style="width: ${this.currentProject.progress}%"></div>
                                        </div>
                                        <p><strong>Budget:</strong> $${parseFloat(this.currentProject.budget || 0).toLocaleString()}</p>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="d-grid gap-2">
                                            <button class="btn btn-outline-primary btn-sm" onclick="app.addBlueprintToProject(${this.currentProject.id})">
                                                <i class="bi bi-file-earmark-image"></i> Add Blueprint
                                            </button>
                                            <button class="btn btn-outline-success btn-sm" onclick="app.createTakeoffForProject(${this.currentProject.id})">
                                                <i class="bi bi-calculator"></i> Create Takeoff
                                            </button>
                                            <button class="btn btn-outline-info btn-sm" onclick="app.createEstimateForProject(${this.currentProject.id})">
                                                <i class="bi bi-currency-dollar"></i> New Estimate
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
                    <div class="card shadow-sm mb-4">
                        <div class="card-header bg-white">
                            <h6 class="m-0 font-weight-bold text-primary">Recent Activity</h6>
                        </div>
                        <div class="card-body">
                            ${recentActivity.length > 0 ? `
                                <div class="list-group list-group-flush">
                                    ${recentActivity.map(activity => `
                                        <div class="list-group-item list-group-item-action border-0 py-3">
                                            <div class="d-flex align-items-center">
                                                <div class="bg-primary-subtle rounded-circle p-2 me-3">
                                                    <i class="bi ${activity.icon} text-primary fs-5"></i>
                                                </div>
                                                <div class="flex-grow-1">
                                                    <p class="mb-0 fw-medium">${activity.message}</p>
                                                    <small class="text-muted">${new Date(activity.date).toLocaleDateString()}</small>
                                                </div>
                                                <div>
                                                    <button class="btn btn-sm btn-light border" onclick="${activity.action}">
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
                                </div>
                            `}
                        </div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="card shadow-sm mb-4">
                        <div class="card-header bg-white">
                            <h6 class="m-0 font-weight-bold text-primary">Quick Actions</h6>
                        </div>
                        <div class="card-body">
                            <div class="d-grid gap-2">
                                <button class="btn btn-primary shadow-sm py-2" onclick="app.showAddProjectModal()">
                                    <i class="bi bi-plus-circle me-1"></i> New Project
                                </button>
                                <button class="btn btn-outline-primary py-2" onclick="app.showAddClientModal()">
                                    <i class="bi bi-person-plus me-1"></i> Add Client
                                </button>
                                <button class="btn btn-outline-success py-2" onclick="app.loadModule('blueprints')">
                                    <i class="bi bi-upload me-1"></i> Upload Blueprint
                                </button>
                                <button class="btn btn-outline-info py-2" onclick="app.loadModule('takeoff')">
                                    <i class="bi bi-calculator me-1"></i> Start Takeoff
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('mainContent').innerHTML = content;
    }

    viewProject(projectId) {
        const project = window.dataManager.getProjects().find(p => p.id == projectId);
        if (!project) return;
        
        this.setCurrentProject(project);
        
        const projectData = window.dataManager.getProjectData(projectId);
        
        const content = `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <nav aria-label="breadcrumb">
                            <ol class="breadcrumb mb-0">
                                <li class="breadcrumb-item"><a href="#" onclick="app.loadModule('projects')">Projects</a></li>
                                <li class="breadcrumb-item active">${project.name}</li>
                            </ol>
                        </nav>
                        <div class="btn-group">
                            <button class="btn btn-outline-primary" onclick="app.editProject(${project.id})"><i class="bi bi-pencil"></i> Edit</button>
                            <button class="btn btn-primary" onclick="app.shareProject(${project.id}, 'print')"><i class="bi bi-printer"></i> Print Report</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-lg-8">
                    <div class="card shadow-sm mb-4">
                        <div class="card-header bg-white">
                            <h5 class="mb-0">Project Details</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="text-muted small text-uppercase">Status</label>
                                    <div><span class="badge ${this.getStatusBadgeClass(project.status)} fs-6">${project.status.toUpperCase()}</span></div>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="text-muted small text-uppercase">Project Type</label>
                                    <div class="fw-bold">${project.type}</div>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="text-muted small text-uppercase">Budget</label>
                                    <div class="fw-bold text-success fs-5">$${parseFloat(project.budget || 0).toLocaleString()}</div>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="text-muted small text-uppercase">Progress</label>
                                    <div class="d-flex align-items-center">
                                        <div class="progress flex-grow-1 me-2" style="height: 10px;">
                                            <div class="progress-bar" style="width: ${project.progress}%"></div>
                                        </div>
                                        <span class="fw-bold">${project.progress}%</span>
                                    </div>
                                </div>
                                <div class="col-12 mb-3">
                                    <label class="text-muted small text-uppercase">Description</label>
                                    <p>${project.description || 'No description provided'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card shadow-sm mb-4">
                        <div class="card-header bg-white d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">Blueprints & Documents</h5>
                            <button class="btn btn-sm btn-outline-primary" onclick="app.loadModule('blueprints')">Manage</button>
                        </div>
                        <div class="card-body">
                            ${projectData.blueprints.length > 0 ? `
                                <div class="list-group list-group-flush">
                                    ${projectData.blueprints.map(bp => `
                                        <div class="list-group-item d-flex justify-content-between align-items-center px-0">
                                            <div>
                                                <i class="bi bi-file-earmark-image text-primary me-2"></i>
                                                <span>${bp.name}</span>
                                            </div>
                                            <small class="text-muted">${new Date(bp.uploaded_date).toLocaleDateString()}</small>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : '<p class="text-center text-muted my-3">No blueprints uploaded yet</p>'}
                        </div>
                    </div>
                </div>

                <div class="col-lg-4">
                    <div class="card shadow-sm mb-4 border-primary border-top border-4">
                        <div class="card-header bg-white">
                            <h5 class="mb-0">Client Information</h5>
                        </div>
                        <div class="card-body">
                            ${projectData.client ? `
                                <h6 class="fw-bold mb-1">${projectData.client.name}</h6>
                                <p class="text-muted small mb-2">${projectData.client.contact_info || 'No contact info'}</p>
                                <hr>
                                <div class="d-grid gap-2">
                                    <a href="mailto:${projectData.client.email}" class="btn btn-sm btn-outline-secondary"><i class="bi bi-envelope"></i> Email Client</a>
                                    <a href="tel:${projectData.client.phone}" class="btn btn-sm btn-outline-secondary"><i class="bi bi-telephone"></i> Call Client</a>
                                </div>
                            ` : '<p class="text-muted">No client assigned</p>'}
                        </div>
                    </div>

                    <div class="card shadow-sm mb-4">
                        <div class="card-header bg-white d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">Estimates</h5>
                            <button class="btn btn-sm btn-outline-success" onclick="app.loadModule('takeoff')">New</button>
                        </div>
                        <div class="card-body">
                            ${projectData.estimates.length > 0 ? `
                                <div class="list-group list-group-flush">
                                    ${projectData.estimates.map(est => `
                                        <div class="list-group-item px-0">
                                            <div class="d-flex justify-content-between">
                                                <span class="fw-bold small">${est.name || 'Estimate'}</span>
                                                <span class="text-success small fw-bold">$${parseFloat(est.total_cost || est.total_amount || 0).toLocaleString()}</span>
                                            </div>
                                            <div class="d-flex justify-content-between align-items-center mt-1">
                                                <small class="text-muted">${new Date(est.created_at || est.date_created).toLocaleDateString()}</small>
                                                <span class="badge bg-light text-dark border small">${est.status}</span>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : '<p class="text-center text-muted my-2 small">No estimates created</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('mainContent').innerHTML = content;
    }

    getStatusBadgeClass(status) {
        switch(status?.toLowerCase()) {
            case 'active': return 'bg-success';
            case 'pending': return 'bg-warning text-dark';
            case 'completed': return 'bg-info';
            case 'on-hold': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    setCurrentProject(project) {
        this.currentProject = project;
        console.log('Current project set to:', project?.name);
        
        // Notify modules
        window.dispatchEvent(new CustomEvent('projectSelected', { detail: { project } }));
        
        if (this.currentModule === 'dashboard') {
            this.loadDashboard();
        }
        this.updateCurrentProjectDisplay();
    }

    updateCurrentProjectDisplay() {
        const projectSelect = document.getElementById('projectSelect');
        if (projectSelect && this.currentProject) {
            projectSelect.value = this.currentProject.id;
        }
        
        const sidebarContent = document.getElementById('sidebarContent');
        if (sidebarContent && this.currentProject) {
            sidebarContent.innerHTML = `
                <div class="card bg-primary-subtle border-0 mb-3 overflow-hidden shadow-sm">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="text-primary small text-uppercase fw-bold" style="font-size: 0.65rem;">Active Context</span>
                            <span class="badge bg-primary text-white" style="font-size: 0.6rem;">${this.currentProject.status.toUpperCase()}</span>
                        </div>
                        <h6 class="fw-bold text-dark text-truncate mb-2" title="${this.currentProject.name}">${this.currentProject.name}</h6>
                        <div class="progress mb-2" style="height: 6px; border-radius: 3px;">
                            <div class="progress-bar bg-primary" style="width: ${this.currentProject.progress}%"></div>
                        </div>
                        <div class="d-flex justify-content-between small opacity-75">
                            <span>Completion</span>
                            <span class="fw-bold">${this.currentProject.progress}%</span>
                        </div>
                    </div>
                </div>
                
                <h6 class="text-muted small text-uppercase fw-bold mb-2 ps-1" style="font-size: 0.65rem;">Project Links</h6>
                <div class="list-group list-group-flush small mb-3">
                    <a href="#" class="list-group-item list-group-item-action py-2 px-1 border-0 bg-transparent" onclick="app.viewProject(${this.currentProject.id})">
                        <i class="bi bi-eye text-primary me-2"></i> Project Overview
                    </a>
                    <a href="#" class="list-group-item list-group-item-action py-2 px-1 border-0 bg-transparent" onclick="app.loadModule('schedule')">
                        <i class="bi bi-calendar3 text-primary me-2"></i> Project Schedule
                    </a>
                    <a href="#" class="list-group-item list-group-item-action py-2 px-1 border-0 bg-transparent" onclick="app.loadModule('blueprints')">
                        <i class="bi bi-file-earmark-image text-primary me-2"></i> Blueprints
                    </a>
                    <a href="#" class="list-group-item list-group-item-action py-2 px-1 border-0 bg-transparent" onclick="app.loadModule('daily-logs')">
                        <i class="bi bi-journal-text text-primary me-2"></i> Site Logs
                    </a>
                </div>
            `;
        } else if (sidebarContent) {
            sidebarContent.innerHTML = `
                <div class="alert bg-light border p-3 small text-center">
                    <i class="bi bi-building-up text-muted display-6 d-block mb-2"></i>
                    <p class="mb-0">Select a project to enable site-specific tools.</p>
                </div>
            `;
        }
    }

    async loadProjects() {
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
            <div id="projectsList" class="row">
                <!-- Projects will be loaded here -->
            </div>
        `;
        document.getElementById('mainContent').innerHTML = content;
        this.loadProjectsData();
    }

    async loadProjectsData() {
        const projects = window.dataManager ? window.dataManager.getProjects() : [];
        const container = document.getElementById('projectsList');
        if (!container) return;

        if (projects.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-kanban display-1 text-muted opacity-25"></i>
                    <h4 class="mt-3">No projects yet</h4>
                    <p class="text-muted">Create your first project to get started</p>
                </div>
            `;
            return;
        }

        container.innerHTML = projects.map(project => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 shadow-sm border-0">
                    <div class="card-body">
                        <div class="d-flex justify-content-between mb-2">
                            <span class="badge ${this.getStatusBadgeClass(project.status)}">${project.status.toUpperCase()}</span>
                            <small class="text-muted">${project.type}</small>
                        </div>
                        <h5 class="card-title fw-bold">${project.name}</h5>
                        <p class="card-text text-muted small mb-3">${project.description || 'No description provided'}</p>
                        <div class="mb-3">
                            <div class="d-flex justify-content-between mb-1 small">
                                <span>Progress</span>
                                <span>${project.progress}%</span>
                            </div>
                            <div class="progress" style="height: 8px; border-radius: 4px;">
                                <div class="progress-bar bg-primary" style="width: ${project.progress}%"></div>
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="small">
                                <i class="bi bi-currency-dollar text-success"></i>
                                <strong class="text-dark">$${parseFloat(project.budget || 0).toLocaleString()}</strong>
                            </div>
                            <button class="btn btn-sm btn-primary px-3 shadow-sm" onclick="app.viewProject(${project.id})">
                                View Project
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    showAddProjectModal() {
        const modalHtml = `
            <div class="modal fade" id="addProjectModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">New Construction Project</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addProjectForm">
                                <div class="mb-3">
                                    <label class="form-label">Project Name *</label>
                                    <input type="text" class="form-control" name="name" required placeholder="e.g. Smith Residential Deck">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Project Type</label>
                                    <select class="form-select" name="type">
                                        <option value="Residential">Residential</option>
                                        <option value="Commercial">Commercial</option>
                                        <option value="Industrial">Industrial</option>
                                        <option value="Renovation">Renovation</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Budget ($)</label>
                                    <input type="number" class="form-control" name="budget" step="0.01">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Description</label>
                                    <textarea class="form-control" name="description" rows="3"></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="app.saveProject()">Create Project</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('addProjectModal'));
        modal.show();
        document.getElementById('addProjectModal').addEventListener('hidden.bs.modal', function() { this.remove(); });
    }

    async saveProject() {
        const form = document.getElementById('addProjectForm');
        const formData = new FormData(form);
        const projectData = Object.fromEntries(formData.entries());
        projectData.status = 'active';
        projectData.progress = 0;

        try {
            if (window.dataManager) {
                await window.dataManager.saveData('projects', projectData);
                this.populateProjectSelect();
            }
            bootstrap.Modal.getInstance(document.getElementById('addProjectModal')).hide();
            this.showAlert('success', 'Project created successfully!');
            if (this.currentModule === 'projects') this.loadProjectsData();
        } catch (error) {
            console.error('Failed to save project:', error);
            this.showAlert('danger', 'Error creating project');
        }
    }

    loadClients() {
        const content = `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 class="mb-1"><i class="bi bi-people text-primary"></i> Client Management</h2>
                            <p class="text-muted">Manage your customer database and contact history</p>
                        </div>
                        <button class="btn btn-primary shadow-sm" onclick="app.showAddClientModal()">
                            <i class="bi bi-person-plus me-1"></i> Add New Client
                        </button>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm mb-4">
                <div class="card-body p-3">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <div class="input-group">
                                <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span>
                                <input type="text" class="form-control border-start-0 shadow-none" id="clientSearch" 
                                       placeholder="Search clients by name, email or company..." onkeyup="app.filterClients(this.value)">
                            </div>
                        </div>
                        <div class="col-md-3">
                            <select class="form-select shadow-none" id="industryFilter" onchange="app.filterClients()">
                                <option value="">All Industries</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <select class="form-select shadow-none" id="statusFilter" onchange="app.filterClients()">
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="lead">Lead</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div id="clientsList" class="row"></div>
        `;
        document.getElementById('mainContent').innerHTML = content;
        
        // Populate industry filter
        const industries = window.dataManager.getIndustries();
        const industryFilter = document.getElementById('industryFilter');
        industries.forEach(ind => {
            const opt = document.createElement('option');
            opt.value = ind.id;
            opt.textContent = ind.name;
            industryFilter.appendChild(opt);
        });

        this.loadClientsData();
    }

    filterClients(query = '') {
        const industry = document.getElementById('industryFilter').value;
        const status = document.getElementById('statusFilter').value;
        const search = query || document.getElementById('clientSearch').value;
        
        this.loadClientsData(search, industry, status);
    }

    async loadClientsData(search = '', industry = '', status = '') {
        let clients = window.dataManager ? window.dataManager.getClients() : [];
        const container = document.getElementById('clientsList');
        if (!container) return;

        // Apply filters
        if (search) {
            const s = search.toLowerCase();
            clients = clients.filter(c => 
                c.name.toLowerCase().includes(s) || 
                (c.email && c.email.toLowerCase().includes(s)) ||
                (c.company && c.company.toLowerCase().includes(s))
            );
        }
        
        if (industry) {
            clients = clients.filter(c => c.industry_id == industry);
        }

        if (clients.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="bg-light rounded-circle d-inline-flex p-4 mb-3">
                        <i class="bi bi-people text-muted display-4"></i>
                    </div>
                    <h5>No clients found</h5>
                    <p class="text-muted">Try adjusting your filters or add a new client</p>
                </div>
            `;
            return;
        }

        container.innerHTML = clients.map(client => `
            <div class="col-md-6 col-xl-4 mb-4">
                <div class="card h-100 border-0 shadow-sm hover-shadow">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <div class="bg-primary-subtle text-primary rounded-circle p-3 me-3 fw-bold" style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
                                ${client.name.charAt(0).toUpperCase()}
                            </div>
                            <div class="overflow-hidden">
                                <h5 class="fw-bold mb-0 text-truncate">${client.name}</h5>
                                <small class="text-muted">${client.company || 'Private Client'}</small>
                            </div>
                        </div>
                        <div class="mb-3">
                            <div class="d-flex align-items-center mb-2 small">
                                <i class="bi bi-envelope text-primary me-2"></i>
                                <span class="text-truncate">${client.email || 'N/A'}</span>
                            </div>
                            <div class="d-flex align-items-center mb-2 small">
                                <i class="bi bi-telephone text-primary me-2"></i>
                                <span>${client.phone || 'N/A'}</span>
                            </div>
                            <div class="d-flex align-items-center mb-2 small">
                                <i class="bi bi-geo-alt text-primary me-2"></i>
                                <span class="text-truncate">${client.address || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center pt-3 border-top">
                            <span class="badge bg-primary-subtle text-primary">${client.industry_name || 'General'}</span>
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-secondary" onclick="app.editClient(${client.id})"><i class="bi bi-pencil"></i></button>
                                <button class="btn btn-sm btn-outline-primary" onclick="app.viewClientDetails(${client.id})"><i class="bi bi-eye"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    loadEstimates() {
        const content = `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 class="mb-1 fw-bold"><i class="bi bi-calculator text-primary"></i> Estimates & Quotes</h2>
                            <p class="text-muted">Detailed cost breakdowns and project pricing</p>
                        </div>
                        <button class="btn btn-primary px-4 shadow-sm" onclick="app.loadModule('takeoff')">
                            <i class="bi bi-plus-lg me-1"></i> New Estimate
                        </button>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm mb-4">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="bg-light">
                                <tr>
                                    <th class="ps-4">Project Name</th>
                                    <th>Client</th>
                                    <th>Created Date</th>
                                    <th>Total Amount</th>
                                    <th>Status</th>
                                    <th class="text-end pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="estimatesTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('mainContent').innerHTML = content;
        this.loadEstimatesData();
    }

    async loadEstimatesData() {
        const estimates = window.dataManager ? window.dataManager.getEstimates() : [];
        const tbody = document.getElementById('estimatesTableBody');
        if (!tbody) return;

        if (estimates.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <i class="bi bi-calculator text-muted display-4 d-block mb-3"></i>
                        <h5>No estimates found</h5>
                        <p class="text-muted">Start by creating a new takeoff to generate an estimate</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = estimates.map(estimate => `
            <tr>
                <td class="ps-4 fw-bold text-dark">${estimate.project_name}</td>
                <td>${estimate.client_name || 'N/A'}</td>
                <td><i class="bi bi-calendar3 text-muted me-2"></i>${new Date(estimate.created_at || Date.now()).toLocaleDateString()}</td>
                <td><span class="fw-bold text-success fs-6">$${parseFloat(estimate.total_amount || 0).toLocaleString()}</span></td>
                <td>
                    <span class="badge ${estimate.status === 'approved' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} border px-2 py-1">
                        ${estimate.status.toUpperCase()}
                    </span>
                </td>
                <td class="text-end pe-4">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="app.viewEstimate(${estimate.id})" title="View Details"><i class="bi bi-eye"></i></button>
                        <button class="btn btn-outline-secondary" onclick="app.printEstimate(${estimate.id})" title="Print Quote"><i class="bi bi-printer"></i></button>
                        <button class="btn btn-outline-success" onclick="contractCreator.createFromEstimate(${estimate.id})" title="Generate Contract"><i class="bi bi-file-earmark-text"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    loadReports() {
        const dashboardStats = this.getDashboardStats();
        
        document.getElementById('mainContent').innerHTML = `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 class="mb-1 fw-bold"><i class="bi bi-graph-up text-primary"></i> Analytics & Insights</h2>
                            <p class="text-muted">Business intelligence and performance metrics</p>
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-outline-primary" onclick="window.print()">
                                <i class="bi bi-printer me-1"></i> Print Summary
                            </button>
                            <button class="btn btn-primary shadow-sm">
                                <i class="bi bi-download me-1"></i> Export Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-4 mb-4">
                <div class="col-md-6 col-xl-3">
                    <div class="card border-0 shadow-sm text-center p-4">
                        <p class="text-muted small text-uppercase fw-bold mb-1">Gross Margin</p>
                        <h3 class="fw-bold mb-0">32.4%</h3>
                        <small class="text-success"><i class="bi bi-arrow-up"></i> 2.1% from last month</small>
                    </div>
                </div>
                <div class="col-md-6 col-xl-3">
                    <div class="card border-0 shadow-sm text-center p-4">
                        <p class="text-muted small text-uppercase fw-bold mb-1">Avg. Project Time</p>
                        <h3 class="fw-bold mb-0">42 Days</h3>
                        <small class="text-danger"><i class="bi bi-arrow-down"></i> 3 days vs target</small>
                    </div>
                </div>
                <div class="col-md-6 col-xl-3">
                    <div class="card border-0 shadow-sm text-center p-4">
                        <p class="text-muted small text-uppercase fw-bold mb-1">Win Rate</p>
                        <h3 class="fw-bold mb-0">68%</h3>
                        <small class="text-success"><i class="bi bi-arrow-up"></i> 5% growth</small>
                    </div>
                </div>
                <div class="col-md-6 col-xl-3">
                    <div class="card border-0 shadow-sm text-center p-4">
                        <p class="text-muted small text-uppercase fw-bold mb-1">Client Satisfaction</p>
                        <h3 class="fw-bold mb-0">4.9/5</h3>
                        <small class="text-warning"><i class="bi bi-star-fill"></i> Top rated</small>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-lg-8">
                    <div class="card border-0 shadow-sm mb-4">
                        <div class="card-header bg-white py-3 border-bottom">
                            <h5 class="mb-0 fw-bold">Revenue Forecasting</h5>
                        </div>
                        <div class="card-body py-5 text-center">
                            <!-- Chart Placeholder -->
                            <div class="chart-container" style="height: 300px; display: flex; align-items: flex-end; justify-content: space-around; padding: 0 40px;">
                                <div class="bg-primary opacity-25 rounded-top" style="width: 40px; height: 40%;"></div>
                                <div class="bg-primary opacity-50 rounded-top" style="width: 40px; height: 60%;"></div>
                                <div class="bg-primary opacity-75 rounded-top" style="width: 40px; height: 55%;"></div>
                                <div class="bg-primary rounded-top" style="width: 40px; height: 85%;"></div>
                                <div class="bg-primary opacity-75 rounded-top" style="width: 40px; height: 70%;"></div>
                                <div class="bg-primary opacity-50 rounded-top" style="width: 40px; height: 90%;"></div>
                            </div>
                            <div class="d-flex justify-content-between px-5 mt-3 text-muted small">
                                <span>JAN</span><span>FEB</span><span>MAR</span><span>APR</span><span>MAY</span><span>JUN</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="card border-0 shadow-sm mb-4">
                        <div class="card-header bg-white py-3 border-bottom">
                            <h5 class="mb-0 fw-bold">Industry Benchmarks</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-4">
                                <div class="d-flex justify-content-between mb-1 small">
                                    <span>Material Cost Efficiency</span>
                                    <span class="fw-bold">85%</span>
                                </div>
                                <div class="progress" style="height: 6px;">
                                    <div class="progress-bar bg-success" style="width: 85%"></div>
                                </div>
                            </div>
                            <div class="mb-4">
                                <div class="d-flex justify-content-between mb-1 small">
                                    <span>Labor Productivity</span>
                                    <span class="fw-bold">72%</span>
                                </div>
                                <div class="progress" style="height: 6px;">
                                    <div class="progress-bar bg-info" style="width: 72%"></div>
                                </div>
                            </div>
                            <div class="mb-4">
                                <div class="d-flex justify-content-between mb-1 small">
                                    <span>Safety Compliance</span>
                                    <span class="fw-bold">100%</span>
                                </div>
                                <div class="progress" style="height: 6px;">
                                    <div class="progress-bar bg-primary" style="width: 100%"></div>
                                </div>
                            </div>
                            <div class="p-3 bg-light rounded small mt-4">
                                <i class="bi bi-info-circle text-primary me-2"></i>
                                Your performance is in the **Top 5%** for General Contractors in your region.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    loadSchedule() {
        const currentProjectHeader = this.currentProject ? `
            <div class="card border-0 shadow-sm mb-4 border-start border-4 border-primary">
                <div class="card-body py-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="text-muted small text-uppercase fw-bold">Active Project</span>
                            <h5 class="mb-0 text-primary">${this.currentProject.name}</h5>
                        </div>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="app.addMilestone()"><i class="bi bi-plus-lg"></i> Add Task</button>
                        </div>
                    </div>
                </div>
            </div>
        ` : `
            <div class="alert alert-warning shadow-sm border-0 d-flex align-items-center">
                <i class="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
                <div>
                    <strong>No project selected.</strong> 
                    <a href="#" onclick="app.loadModule('projects')" class="alert-link">Choose a project</a> to view its master schedule.
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = `
            ${currentProjectHeader}
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 class="mb-1 fw-bold"><i class="bi bi-calendar3 text-primary"></i> Master Schedule</h2>
                            <p class="text-muted">Critical path and milestone tracking</p>
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-white border shadow-sm active" onclick="app.showScheduleView('list')">List</button>
                            <button class="btn btn-white border shadow-sm" onclick="app.showScheduleView('gantt')">Gantt</button>
                            <button class="btn btn-white border shadow-sm" onclick="app.showScheduleView('board')">Board</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="bg-light">
                                <tr>
                                    <th class="ps-4">WBS</th>
                                    <th>Task / Milestone</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Assignee</th>
                                    <th>Status</th>
                                    <th class="text-end pe-4">Progress</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="ps-4 text-muted small">1.0</td>
                                    <td class="fw-bold">Site Mobilization</td>
                                    <td>Oct 10, 2023</td>
                                    <td>Oct 15, 2023</td>
                                    <td><span class="badge bg-light text-dark border">Site Manager</span></td>
                                    <td><span class="badge bg-success-subtle text-success border">COMPLETED</span></td>
                                    <td class="text-end pe-4">100%</td>
                                </tr>
                                <tr>
                                    <td class="ps-4 text-muted small">2.0</td>
                                    <td class="fw-bold">Foundation & Slab</td>
                                    <td>Oct 16, 2023</td>
                                    <td>Oct 30, 2023</td>
                                    <td><span class="badge bg-light text-dark border">Concrete Sub</span></td>
                                    <td><span class="badge bg-primary-subtle text-primary border">IN PROGRESS</span></td>
                                    <td class="text-end pe-4">
                                        <div class="progress" style="height: 6px; width: 60px; margin-left: auto;">
                                            <div class="progress-bar" style="width: 45%"></div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="ps-4 text-muted small">3.0</td>
                                    <td class="fw-bold">Framing Phase</td>
                                    <td>Nov 01, 2023</td>
                                    <td>Nov 20, 2023</td>
                                    <td><span class="badge bg-light text-dark border">Carpentry Crew</span></td>
                                    <td><span class="badge bg-warning-subtle text-warning border">UPCOMING</span></td>
                                    <td class="text-end pe-4">0%</td>
                                </tr>
                                <tr>
                                    <td class="ps-4 text-muted small">4.0</td>
                                    <td class="fw-bold">Rough-In Mechanical</td>
                                    <td>Nov 22, 2023</td>
                                    <td>Dec 05, 2023</td>
                                    <td><span class="badge bg-light text-dark border">Multiple Subs</span></td>
                                    <td><span class="badge bg-warning-subtle text-warning border">UPCOMING</span></td>
                                    <td class="text-end pe-4">0%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    loadDailyLogs() {
        const currentProjectHeader = this.currentProject ? `
            <div class="card border-0 shadow-sm mb-4 border-start border-4 border-success">
                <div class="card-body py-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="text-muted small text-uppercase fw-bold">Active Project</span>
                            <h5 class="mb-0 text-success">${this.currentProject.name}</h5>
                        </div>
                        <button class="btn btn-success shadow-sm" onclick="app.showNewLogModal()">
                            <i class="bi bi-plus-lg me-1"></i> New Entry
                        </button>
                    </div>
                </div>
            </div>
        ` : `
            <div class="alert alert-success shadow-sm border-0 d-flex align-items-center">
                <i class="bi bi-info-circle-fill fs-4 me-3"></i>
                <div>
                    <strong>Select a project</strong> to record field data and daily site reports.
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = `
            ${currentProjectHeader}
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 class="mb-1 fw-bold"><i class="bi bi-journal-text text-success"></i> Daily Site Logs</h2>
                            <p class="text-muted">Field documentation and weather records</p>
                        </div>
                        <div class="input-group w-auto">
                            <input type="date" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                            <button class="btn btn-outline-secondary">Go</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-4">
                <div class="col-lg-4">
                    <div class="card border-0 shadow-sm mb-4">
                        <div class="card-body p-4">
                            <div class="d-flex align-items-center mb-3">
                                <i class="bi bi-cloud-sun fs-2 text-warning me-3"></i>
                                <div>
                                    <h5 class="mb-0 fw-bold">Weather Report</h5>
                                    <small class="text-muted">Auto-captured at 7:00 AM</small>
                                </div>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Temp:</span>
                                <span class="fw-bold">68°F / 74°F</span>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Conditions:</span>
                                <span class="fw-bold">Partly Cloudy</span>
                            </div>
                            <div class="d-flex justify-content-between">
                                <span>Wind:</span>
                                <span class="fw-bold">8mph NW</span>
                            </div>
                        </div>
                    </div>

                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white py-3 border-bottom">
                            <h6 class="mb-0 fw-bold">Headcount Tracking</h6>
                        </div>
                        <div class="card-body">
                            <div class="d-flex justify-content-between mb-3 border-bottom pb-2">
                                <span>Internal Crew:</span>
                                <span class="badge bg-primary">8</span>
                            </div>
                            <div class="d-flex justify-content-between mb-3 border-bottom pb-2">
                                <span>Concrete Subs:</span>
                                <span class="badge bg-secondary">4</span>
                            </div>
                            <div class="d-flex justify-content-between mb-3 border-bottom pb-2">
                                <span>Electricians:</span>
                                <span class="badge bg-secondary">2</span>
                            </div>
                            <div class="d-flex justify-content-between fw-bold">
                                <span>Total On Site:</span>
                                <span>14</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-8">
                    <div class="card border-0 shadow-sm mb-4">
                        <div class="card-header bg-white py-3 border-bottom">
                            <h5 class="mb-0 fw-bold">Work Observations</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-4">
                                <h6 class="fw-bold text-primary small text-uppercase">Accomplishments</h6>
                                <p>Finished pouring the east section of the foundation. Formwork for the center column is 90% complete.</p>
                            </div>
                            <div class="mb-4">
                                <h6 class="fw-bold text-danger small text-uppercase">Delays / Issues</h6>
                                <p>Material delivery for rebar was delayed by 2 hours due to traffic. No critical impact to schedule.</p>
                            </div>
                            <div>
                                <h6 class="fw-bold text-success small text-uppercase">Site Photos (3)</h6>
                                <div class="d-flex gap-2">
                                    <div class="bg-light rounded border d-flex align-items-center justify-content-center" style="width: 100px; height: 100px;">
                                        <i class="bi bi-image text-muted"></i>
                                    </div>
                                    <div class="bg-light rounded border d-flex align-items-center justify-content-center" style="width: 100px; height: 100px;">
                                        <i class="bi bi-image text-muted"></i>
                                    </div>
                                    <div class="bg-light rounded border d-flex align-items-center justify-content-center" style="width: 100px; height: 100px;">
                                        <i class="bi bi-image text-muted"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="card-footer bg-white border-0 text-end py-3">
                            <button class="btn btn-sm btn-outline-primary" onclick="app.showAlert('info', 'Daily log editing is now active for this session!')">Edit Entry</button>
                            <button class="btn btn-sm btn-primary" onclick="app.generateDailyLogPDF()">Generate PDF Report</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    loadTeam() {
        document.getElementById('mainContent').innerHTML = `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 class="mb-1 fw-bold"><i class="bi bi-person-badge text-primary"></i> Team Management</h2>
                            <p class="text-muted">Manage crew members, subcontractors, and role assignments</p>
                        </div>
                        <button class="btn btn-primary shadow-sm" onclick="app.showAddTeamMemberModal()">
                            <i class="bi bi-person-plus me-1"></i> Add Member
                        </button>
                    </div>
                </div>
            </div>

            <div class="row g-4">
                <div class="col-md-6 col-lg-4">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body p-4 text-center">
                            <div class="mb-3">
                                <div class="bg-primary-subtle text-primary rounded-circle d-inline-flex p-3" style="width: 80px; height: 80px; align-items: center; justify-content: center;">
                                    <h3 class="mb-0 fw-bold">JD</h3>
                                </div>
                            </div>
                            <h5 class="fw-bold mb-1">John Doe</h5>
                            <p class="text-muted small">Project Manager</p>
                            <div class="d-flex justify-content-center gap-2 mb-3">
                                <span class="badge bg-light text-dark border">Full-Time</span>
                                <span class="badge bg-primary-subtle text-primary border">Admin</span>
                            </div>
                            <hr>
                            <div class="d-grid">
                                <button class="btn btn-sm btn-outline-secondary" onclick="app.showUserProfile('demo-1')">View Profile</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-6 col-lg-4">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body p-4 text-center">
                            <div class="mb-3">
                                <div class="bg-success-subtle text-success rounded-circle d-inline-flex p-3" style="width: 80px; height: 80px; align-items: center; justify-content: center;">
                                    <h3 class="mb-0 fw-bold">SM</h3>
                                </div>
                            </div>
                            <h5 class="fw-bold mb-1">Sarah Miller</h5>
                            <p class="text-muted small">Site Supervisor</p>
                            <div class="d-flex justify-content-center gap-2 mb-3">
                                <span class="badge bg-light text-dark border">Full-Time</span>
                                <span class="badge bg-success-subtle text-success border">Site Lead</span>
                            </div>
                            <hr>
                            <div class="d-grid">
                                <button class="btn btn-sm btn-outline-secondary" onclick="app.showUserProfile('demo-2')">View Profile</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-6 col-lg-4">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body p-4 text-center">
                            <div class="mb-3">
                                <div class="bg-info-subtle text-info rounded-circle d-inline-flex p-3" style="width: 80px; height: 80px; align-items: center; justify-content: center;">
                                    <h3 class="mb-0 fw-bold">BW</h3>
                                </div>
                            </div>
                            <h5 class="fw-bold mb-1">Bill Watts</h5>
                            <p class="text-muted small">Electrical Lead (Sub)</p>
                            <div class="d-flex justify-content-center gap-2 mb-3">
                                <span class="badge bg-light text-dark border">Contractor</span>
                                <span class="badge bg-info-subtle text-info border">Foreman</span>
                            </div>
                            <hr>
                            <div class="d-grid">
                                <button class="btn btn-sm btn-outline-secondary" onclick="app.showUserProfile('demo-3')">View Profile</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row mt-5">
                <div class="col-12">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white py-3">
                            <h5 class="mb-0 fw-bold">Subcontractor Directory</h5>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover mb-0 align-middle">
                                    <thead class="bg-light">
                                        <tr>
                                            <th class="ps-4">Company Name</th>
                                            <th>Trade</th>
                                            <th>Contact Person</th>
                                            <th>Status</th>
                                            <th class="text-end pe-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td class="ps-4 fw-bold">Apex Plumbing Inc.</td>
                                            <td><span class="badge bg-light text-dark">Plumbing</span></td>
                                            <td>Mike Apex</td>
                                            <td><span class="badge bg-success-subtle text-success">Verified</span></td>
                                            <td class="text-end pe-4">
                                                <button class="btn btn-sm btn-link"><i class="bi bi-telephone"></i></button>
                                                <button class="btn btn-sm btn-link text-primary"><i class="bi bi-chat-text"></i></button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td class="ps-4 fw-bold">Elite Masonry</td>
                                            <td><span class="badge bg-light text-dark">Masonry</span></td>
                                            <td>Dan Brick</td>
                                            <td><span class="badge bg-success-subtle text-success">Verified</span></td>
                                            <td class="text-end pe-4">
                                                <button class="btn btn-sm btn-link"><i class="bi bi-telephone"></i></button>
                                                <button class="btn btn-sm btn-link text-primary"><i class="bi bi-chat-text"></i></button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize the application
window.app = new ConstructProApp();
