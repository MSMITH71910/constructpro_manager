// ConstructPro Manager - Main Application JavaScript
class ConstructProApp {
    constructor() {
        this.currentModule = 'dashboard';
        this.currentScheduleView = 'list'; // list, gantt, board
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
        this.clockInTime = null;
        this.clockTimerInterval = null;
        
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

        // Update Nav Info
        if (this.currentUser) {
            const navUserName = document.getElementById('navUserName');
            if (navUserName) navUserName.textContent = `${this.currentUser.firstName || this.currentUser.username}`;
            
            const navAdminLink = document.getElementById('navAdminLink');
            if (navAdminLink) {
                navAdminLink.style.display = (this.currentUser.role === 'admin' || this.currentUser.role === 'owner') ? 'block' : 'none';
            }
        }

        // Start message polling and UI listeners
        this.updateUnreadCount();
        window.addEventListener('newMessage', (e) => {
            this.updateUnreadCount();
            
            // Notification if not in chat
            const chatModal = document.getElementById('chatModal');
            if (!chatModal || !chatModal.classList.contains('show')) {
                const fromUser = window.authManager.users.find(u => u.id === e.detail.fromId);
                if (fromUser && e.detail.toId === this.currentUser.id) {
                    this.showAlert('info', `New message from ${fromUser.firstName}: "${e.detail.text.substring(0, 30)}${e.detail.text.length > 30 ? '...' : ''}"`);
                }
            } else {
                const otherId = e.detail.fromId === this.currentUser.id ? e.detail.toId : e.detail.fromId;
                this.loadChatMessages(otherId);
            }
        });

        // ALWAYS hide loading screen first, even if there are errors
        this.hideLoadingScreen();
        
        try {
            // Show main interface
            this.showMainInterface();
            
            // Initialize DataManager first and wait for it to load data
            window.dataManager = new DataManager();
            
            // Wait for DataManager to be fully initialized with a timeout
            let retryCount = 0;
            const maxRetries = 50; // 5 seconds
            while ((!window.dataManager || !window.dataManager.data || window.dataManager.data.industries.length === 0) && retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retryCount++;
            }
            
            if (retryCount >= maxRetries) {
                console.warn('DataManager took too long to initialize, proceeding with fallback data');
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

            // Restore clock state from localStorage
            const storedClockIn = localStorage.getItem('constructpro_clock_in');
            if (storedClockIn) {
                this.clockInTime = parseInt(storedClockIn);
                this.activeClockProjectId = localStorage.getItem('constructpro_clock_project_id');
                this.activeClockProjectName = localStorage.getItem('constructpro_clock_project_name');
                this.activeClockTask = localStorage.getItem('constructpro_clock_task');
                this.startClockTimer();
            }
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
        if (window.innerWidth >= 992) {
            document.querySelector('.sidebar').style.display = 'block';
        }
        
        // Update navbar with user info
        this.updateNavbarWithUser();
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('show');
            if (sidebar.classList.contains('show')) {
                sidebar.style.display = 'block';
                sidebar.style.position = 'fixed';
                sidebar.style.top = '60px';
                sidebar.style.left = '0';
                sidebar.style.width = '260px';
                sidebar.style.height = 'calc(100vh - 60px)';
                sidebar.style.zIndex = '1040';
            } else {
                if (window.innerWidth < 992) {
                    sidebar.style.display = 'none';
                }
            }
        }
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
        if (!this.currentUser || !window.authManager) return;
        
        const navbarNav = document.querySelector('.navbar-nav');
        if (!navbarNav) return;

        // Clear existing module buttons (keep them for now and just hide/show?)
        // Better to rebuild them to match getVisibleModules()
        const visibleModules = window.authManager.getVisibleModules();
        
        let navHtml = visibleModules.map(module => `
            <button class="btn btn-link nav-link px-3 nav-btn" data-module="${module.id}" onclick="app.loadModule('${module.id}')">
                <i class="bi bi-${module.icon}"></i> ${module.label}
            </button>
        `).join('');

        // Add Admin link if user has permission
        if (this.currentUser.role === 'admin' || this.currentUser.role === 'owner') {
            navHtml += `
                <button class="btn btn-link nav-link px-3 nav-btn text-warning" data-module="admin" onclick="app.loadModule('admin')">
                    <i class="bi bi-shield-lock"></i> Admin
                </button>
            `;
        }

        navbarNav.innerHTML = navHtml;
        
        // Add user dropdown to navbar
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
                    <li><a class="dropdown-item py-2" href="#" onclick="app.showSettings('profile')">
                        <i class="bi bi-person me-2"></i> Profile Settings
                    </a></li>
                    <li><a class="dropdown-item py-2" href="#" onclick="app.showSettings('company')">
                        <i class="bi bi-building me-2"></i> Company Settings
                    </a></li>
                    <li><a class="dropdown-item py-2" href="#" onclick="app.showSettings('app')">
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
            'admin': 'Administrator',
            'owner': 'Company Owner',
            'contractor': 'General Contractor',
            'subcontractor': 'Subcontractor',
            'demolition': 'Demolition Contractor',
            'chimney_sweep': 'Chimney Sweep',
            'architect': 'Architect',
            'engineer': 'Engineer',
            'project_manager': 'Project Manager',
            'estimator': 'Estimator',
            'superintendent': 'Superintendent',
            'field_manager': 'Field Manager',
            'foreman': 'Foreman',
            'laborer': 'General Laborer',
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
                                            <select class="form-select" id="teamMemberRole" required>
                                                <option value="project_manager">Project Manager</option>
                                                <option value="estimator">Estimator</option>
                                                <option value="superintendent">Superintendent</option>
                                                <option value="field_manager">Field Manager</option>
                                                <option value="foreman">Foreman</option>
                                                <option value="laborer">General Laborer</option>
                                                <option value="subcontractor">Subcontractor</option>
                                            </select>
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

    generateDailyLogPDF() {
        const printWindow = window.open('', '_blank');
        const date = new Date().toLocaleDateString();
        const projectName = this.currentProject ? this.currentProject.name : 'All Projects';
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Daily Log Report - ${date}</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    body { padding: 40px; }
                    .report-header { border-bottom: 2px solid #333; margin-bottom: 30px; padding-bottom: 20px; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="report-header d-flex justify-content-between align-items-center">
                    <div>
                        <h1 class="display-5 fw-bold text-primary">Daily Site Report</h1>
                        <h4 class="text-muted">${projectName}</h4>
                    </div>
                    <div class="text-end">
                        <p class="mb-0 fw-bold">Date: ${date}</p>
                        <p class="mb-0 text-muted">Generated by ConstructPro Manager</p>
                    </div>
                </div>
                
                <div class="row g-4 mb-4">
                    <div class="col-6">
                        <div class="card p-3 h-100">
                            <h5 class="border-bottom pb-2">Weather & Site Conditions</h5>
                            <p><strong>Temperature:</strong> 68°F / 74°F</p>
                            <p><strong>Conditions:</strong> Partly Cloudy</p>
                            <p><strong>Wind:</strong> 8mph NW</p>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="card p-3 h-100">
                            <h5 class="border-bottom pb-2">Headcount</h5>
                            <p><strong>Internal Crew:</strong> 8</p>
                            <p><strong>Subcontractors:</strong> 6</p>
                            <p class="fw-bold">Total on Site: 14</p>
                        </div>
                    </div>
                </div>

                <div class="card p-3 mb-4">
                    <h5 class="border-bottom pb-2">Work Observations</h5>
                    <div class="mb-3">
                        <h6>Accomplishments:</h6>
                        <p>Finished pouring the east section of the foundation. Formwork for the center column is 90% complete.</p>
                    </div>
                    <div>
                        <h6>Delays / Issues:</h6>
                        <p>Material delivery for rebar was delayed by 2 hours due to traffic. No critical impact to schedule.</p>
                    </div>
                </div>

                <div class="no-print text-center mt-4">
                    <button class="btn btn-primary px-4" onclick="window.print()">Print Report</button>
                    <button class="btn btn-outline-secondary px-4 ms-2" onclick="window.close()">Close Window</button>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    showEditLogModal() {
        if (!document.getElementById('editLogModal')) {
            const modalHtml = `
                <div class="modal fade" id="editLogModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content border-0 shadow-lg">
                            <div class="modal-header bg-success text-white">
                                <h5 class="modal-title fw-bold"><i class="bi bi-pencil-square me-2"></i> Edit Daily Log Entry</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body p-4">
                                <form id="editLogForm">
                                    <div class="row g-3">
                                        <div class="col-md-12">
                                            <label class="form-label fw-bold small">Accomplishments</label>
                                            <textarea class="form-control" id="logAccomplishments" rows="4">Finished pouring the east section of the foundation. Formwork for the center column is 90% complete.</textarea>
                                        </div>
                                        <div class="col-md-12">
                                            <label class="form-label fw-bold small">Delays / Issues</label>
                                            <textarea class="form-control" id="logIssues" rows="3">Material delivery for rebar was delayed by 2 hours due to traffic. No critical impact to schedule.</textarea>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label fw-bold small">Internal Crew</label>
                                            <input type="number" class="form-control" id="logHeadcount" value="8">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label fw-bold small">Subcontractors</label>
                                            <input type="number" class="form-control" id="logSubs" value="6">
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer bg-light">
                                <button type="button" class="btn btn-white border" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-success px-4" onclick="app.saveDailyLog()">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
        new bootstrap.Modal(document.getElementById('editLogModal')).show();
    }

    saveDailyLog() {
        this.showAlert('success', 'Daily log entry has been updated successfully!');
        bootstrap.Modal.getInstance(document.getElementById('editLogModal')).hide();
        // In a real app, we would update the data in DataManager and refresh the view
    }

    showUserProfile(userId) {
        let user = null;
        if (userId === 'current') {
            user = this.currentUser;
        } else if (window.authManager) {
            user = window.authManager.users.find(u => u.id === userId);
        }

        if (!user) {
            this.showAlert('danger', 'User not found');
            return;
        }

        const initials = (user.firstName?.[0] || '') + (user.lastName?.[0] || '');

        const modalHtml = `
            <div class="modal fade" id="userProfileModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title fw-bold"><i class="bi bi-person-circle me-2"></i> User Profile</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-4 text-center">
                            <div class="mb-4">
                                <div class="bg-primary-subtle text-primary rounded-circle d-inline-flex p-3" style="width: 100px; height: 100px; align-items: center; justify-content: center;">
                                    <h2 class="mb-0 fw-bold">${initials}</h2>
                                </div>
                            </div>
                            <h4 class="fw-bold mb-1">${user.firstName} ${user.lastName}</h4>
                            <p class="text-muted">${this.getRoleDisplayName(user.role)}</p>
                            <hr>
                            <div class="text-start">
                                <p class="mb-2"><strong>Email:</strong> <span>${user.email}</span></p>
                                <p class="mb-2"><strong>Company:</strong> <span>${user.company || 'N/A'}</span></p>
                                <p class="mb-2"><strong>Role:</strong> <span>${this.getRoleDisplayName(user.role)}</span></p>
                                <p class="mb-2"><strong>Status:</strong> <span class="badge ${user.isActive ? 'bg-success' : 'bg-danger'}">${user.isActive ? 'Active' : 'Inactive'}</span></p>
                                
                                ${user.permissions && user.permissions.length > 0 ? `
                                    <div class="mt-3">
                                        <strong>Special Permissions:</strong>
                                        <div class="d-flex flex-wrap gap-1 mt-1">
                                            ${user.permissions.map(p => `<span class="badge bg-info-subtle text-info">${p}</span>`).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="modal-footer bg-light">
                            <button type="button" class="btn btn-outline-primary w-100" onclick="app.showEditUserModal('${user.id}')"><i class="bi bi-pencil me-2"></i> Edit Member Settings</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existing = document.getElementById('userProfileModal');
        if (existing) existing.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal(document.getElementById('userProfileModal')).show();
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
                                                <option value="owner">Company Owner (Admin)</option>
                                                <option value="project_manager">Project Manager</option>
                                                <option value="estimator">Estimator</option>
                                                <option value="superintendent">Superintendent</option>
                                                <option value="field_manager">Field Manager</option>
                                                <option value="contractor">General Contractor</option>
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
        const modalId = 'addTaskModal';
        let modal = document.getElementById(modalId);
        if (modal) modal.remove();

        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title fw-bold"><i class="bi bi-list-task me-2"></i> Add Schedule Task</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-4">
                            <form id="addTaskForm">
                                <div class="mb-3">
                                    <label class="form-label small fw-bold">Task Name</label>
                                    <input type="text" class="form-control" name="name" required placeholder="e.g., Foundation Pour">
                                </div>
                                <div class="row g-3 mb-3">
                                    <div class="col-6">
                                        <label class="form-label small fw-bold">Start Date</label>
                                        <input type="date" class="form-control" name="start" value="${new Date().toISOString().split('T')[0]}" required>
                                    </div>
                                    <div class="col-6">
                                        <label class="form-label small fw-bold">End Date</label>
                                        <input type="date" class="form-control" name="end" value="${new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]}" required>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small fw-bold">Assigned To</label>
                                    <select class="form-select" name="assignee">
                                        <option value="unassigned">Unassigned</option>
                                        ${window.authManager.users.map(u => `<option value="${u.id}">${u.firstName} ${u.lastName}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small fw-bold">Status</label>
                                    <select class="form-select" name="status">
                                        <option value="pending">Pending</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer bg-light">
                            <button type="button" class="btn btn-white border" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary px-4" onclick="app.saveNewTask()">Create Task</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal(document.getElementById(modalId)).show();
    }

    saveNewTask() {
        const form = document.getElementById('addTaskForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        if (!this.currentProject) {
            this.showAlert('danger', 'Please select a project first');
            return;
        }

        const task = {
            id: Date.now(),
            projectId: this.currentProject.id,
            ...data,
            progress: 0
        };

        if (window.dataManager) {
            if (!window.dataManager.data.tasks) window.dataManager.data.tasks = [];
            window.dataManager.data.tasks.push(task);
            window.dataManager.saveData('tasks');
            this.showAlert('success', `Task "${data.name}" added to schedule`);
            bootstrap.Modal.getInstance(document.getElementById('addTaskModal')).hide();
            this.loadSchedule();
        }
    }

    showScheduleView(viewType) {
        this.currentScheduleView = viewType;
        this.loadSchedule();
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

        let viewContent = '';
        switch(this.currentScheduleView) {
            case 'gantt': viewContent = this.renderScheduleGantt(); break;
            case 'board': viewContent = this.renderScheduleBoard(); break;
            default: viewContent = this.renderScheduleList(); break;
        }

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
                            <button class="btn btn-white border shadow-sm ${this.currentScheduleView === 'list' ? 'active' : ''}" onclick="app.showScheduleView('list')">List</button>
                            <button class="btn btn-white border shadow-sm ${this.currentScheduleView === 'gantt' ? 'active' : ''}" onclick="app.showScheduleView('gantt')">Gantt</button>
                            <button class="btn btn-white border shadow-sm ${this.currentScheduleView === 'board' ? 'active' : ''}" onclick="app.showScheduleView('board')">Board</button>
                        </div>
                    </div>
                </div>
            </div>
            ${viewContent}
        `;
    }

    renderScheduleList() {
        return `
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
                                    <td class="text-end pe-4">45%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    renderScheduleGantt() {
        return `
            <div class="card border-0 shadow-sm">
                <div class="card-body p-4">
                    <div class="gantt-container overflow-auto" style="min-height: 400px;">
                        <div class="d-flex mb-4 border-bottom pb-2 text-muted small fw-bold">
                            <div style="width: 200px;">TASK</div>
                            <div class="flex-grow-1 d-flex justify-content-between">
                                <span>OCT 01</span><span>OCT 15</span><span>NOV 01</span><span>NOV 15</span>
                            </div>
                        </div>
                        <div class="d-flex align-items-center mb-3">
                            <div style="width: 200px;" class="small">Site Mobilization</div>
                            <div class="flex-grow-1 position-relative" style="height: 20px; background: #f8f9fa; border-radius: 10px;">
                                <div class="bg-success" style="position: absolute; left: 10%; width: 15%; height: 100%; border-radius: 10px;"></div>
                            </div>
                        </div>
                        <div class="d-flex align-items-center mb-3">
                            <div style="width: 200px;" class="small">Foundation & Slab</div>
                            <div class="flex-grow-1 position-relative" style="height: 20px; background: #f8f9fa; border-radius: 10px;">
                                <div class="bg-primary" style="position: absolute; left: 25%; width: 25%; height: 100%; border-radius: 10px;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderScheduleBoard() {
        return `
            <div class="row g-4">
                <div class="col-md-4"><div class="p-3 bg-light rounded shadow-sm"><h6>Upcoming</h6><div class="card p-2 mb-2 border-0 shadow-sm">Vertical Framing</div></div></div>
                <div class="col-md-4"><div class="p-3 bg-light rounded shadow-sm"><h6>In Progress</h6><div class="card p-2 mb-2 border-0 shadow-sm">Foundation & Slab</div></div></div>
                <div class="col-md-4"><div class="p-3 bg-light rounded shadow-sm"><h6>Completed</h6><div class="card p-2 mb-2 border-0 shadow-sm">Site Mobilization</div></div></div>
            </div>
        `;
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
            let industries = [];
            if (window.dataManager) {
                industries = window.dataManager.getIndustries();
            } else {
                console.log('Loading industries from API fallback...');
                const response = await fetch('/api/industries');
                if (response.ok) {
                    industries = await response.json();
                }
            }
            
            if (!industries || industries.length === 0) {
                industries = [
                    { id: 1, name: 'General Contractor' },
                    { id: 2, name: 'Electrical' },
                    { id: 3, name: 'Plumbing' },
                    { id: 4, name: 'Roofing' },
                    { id: 5, name: 'Landscaping' },
                    { id: 6, name: 'Demolition' },
                    { id: 7, name: 'Chimney Sweep' }
                ];
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

        // Close sidebar on mobile
        if (window.innerWidth < 992) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.classList.remove('show');
                sidebar.style.display = 'none';
            }
        }

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
            case 'finance':
                this.loadFinance();
                break;
            case 'timeclock':
                this.loadTimeClock();
                break;
            case 'settings':
                this.loadSettings();
                break;
            case 'admin':
                this.loadAdmin();
                break;
            default:
                this.loadDashboard();
        }
    }

    loadFinance() {
        const transactions = window.dataManager ? window.dataManager.data.finance : [];
        const arTransactions = transactions.filter(t => t.type === 'ar');
        const apTransactions = transactions.filter(t => t.type === 'ap');
        
        const arTotal = arTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const apTotal = apTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const paidAR = arTransactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const pendingAR = arTotal - paidAR;

        const content = `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 class="mb-1 fw-bold"><i class="bi bi-wallet2 text-success"></i> Accounting & ERP</h2>
                            <p class="text-muted">Enterprise financial management for General Contractors</p>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-secondary" onclick="app.exportFinanceData()">
                                <i class="bi bi-download me-1"></i> Export Reports
                            </button>
                            <button class="btn btn-primary shadow-sm" onclick="app.showNewTransactionModal()">
                                <i class="bi bi-plus-lg me-1"></i> New Transaction
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Financial Health Dashboard -->
            <div class="row g-4 mb-4">
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm card-stats h-100">
                        <div class="card-body p-4">
                            <div class="d-flex justify-content-between mb-3">
                                <div class="finance-icon bg-primary-subtle text-primary">
                                    <i class="bi bi-arrow-down-left fs-4"></i>
                                </div>
                                <div class="text-end">
                                    <span class="badge bg-success-subtle text-success">+12%</span>
                                </div>
                            </div>
                            <h6 class="text-muted small text-uppercase fw-bold mb-1">Total Revenue</h6>
                            <h3 class="fw-bold mb-0">$${arTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
                            <p class="text-muted small mt-2 mb-0">Total of all invoices sent</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm card-stats h-100">
                        <div class="card-body p-4">
                            <div class="d-flex justify-content-between mb-3">
                                <div class="finance-icon bg-danger-subtle text-danger">
                                    <i class="bi bi-arrow-up-right fs-4"></i>
                                </div>
                                <div class="text-end">
                                    <span class="badge bg-danger-subtle text-danger">-5%</span>
                                </div>
                            </div>
                            <h6 class="text-muted small text-uppercase fw-bold mb-1">Accounts Payable</h6>
                            <h3 class="fw-bold mb-0 text-danger">$${apTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
                            <p class="text-muted small mt-2 mb-0">Outstanding bills to pay</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm card-stats h-100">
                        <div class="card-body p-4">
                            <div class="d-flex justify-content-between mb-3">
                                <div class="finance-icon bg-warning-subtle text-warning">
                                    <i class="bi bi-hourglass-split fs-4"></i>
                                </div>
                            </div>
                            <h6 class="text-muted small text-uppercase fw-bold mb-1">Pending Invoices</h6>
                            <h3 class="fw-bold mb-0">$${pendingAR.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
                            <div class="progress mt-3" style="height: 6px;">
                                <div class="progress-bar bg-warning" style="width: ${(pendingAR/arTotal*100) || 0}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm card-stats h-100 bg-primary text-white">
                        <div class="card-body p-4">
                            <div class="d-flex justify-content-between mb-3">
                                <div class="finance-icon bg-white bg-opacity-25">
                                    <i class="bi bi-safe fs-4"></i>
                                </div>
                            </div>
                            <h6 class="text-white-50 small text-uppercase fw-bold mb-1">Net Profit Margin</h6>
                            <h3 class="fw-bold mb-0">$${(arTotal - apTotal).toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
                            <p class="text-white-50 small mt-2 mb-0">Projected cash on hand</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm overflow-hidden">
                <div class="card-header bg-white py-0 border-bottom">
                    <ul class="nav nav-tabs border-0" id="financeTabs" role="tablist">
                        <li class="nav-item">
                            <a class="nav-link active py-3 px-4 fw-bold" href="#" onclick="app.loadFinanceView('ar')">
                                <i class="bi bi-file-earmark-arrow-down me-2"></i> Receivables
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link py-3 px-4 fw-bold" href="#" onclick="app.loadFinanceView('ap')">
                                <i class="bi bi-file-earmark-arrow-up me-2"></i> Payables
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link py-3 px-4 fw-bold" href="#" onclick="app.showAlert('info', 'Budget tracking coming in next update')">
                                <i class="bi bi-calculator me-2"></i> Job Costing
                            </a>
                        </li>
                    </ul>
                </div>
                <div class="card-body p-0 bg-light" id="financeViewContainer">
                    <!-- Data table loads here -->
                </div>
            </div>
        `;
        document.getElementById('mainContent').innerHTML = content;
        this.loadFinanceView('ar');
    }

    loadFinanceView(viewType) {
        const container = document.getElementById('financeViewContainer');
        if (!container) return;

        // Update active tab UI
        document.querySelectorAll('#financeTabs .nav-link').forEach(link => {
            link.classList.remove('active');
            if ((viewType === 'ar' && link.textContent.includes('Receivables')) || 
                (viewType === 'ap' && link.textContent.includes('Payables'))) {
                link.classList.add('active');
            }
        });

        const transactions = window.dataManager ? window.dataManager.data.finance.filter(t => t.type === viewType) : [];

        let tableHtml = `
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0 bg-white">
                    <thead class="bg-light text-muted small text-uppercase">
                        <tr>
                            <th class="ps-4 py-3">${viewType === 'ar' ? 'Invoice' : 'Bill'} #</th>
                            <th class="py-3">${viewType === 'ar' ? 'Client' : 'Vendor'}</th>
                            <th class="py-3">Project / Job</th>
                            <th class="py-3">Date</th>
                            <th class="py-3">Amount</th>
                            <th class="py-3">Status</th>
                            <th class="text-end pe-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.length === 0 ? `
                            <tr>
                                <td colspan="7" class="text-center py-5">
                                    <i class="bi bi-inbox display-4 text-muted opacity-25"></i>
                                    <p class="mt-2 text-muted">No ${viewType === 'ar' ? 'receivables' : 'payables'} found in current records</p>
                                </td>
                            </tr>
                        ` : ''}
                        ${transactions.map(t => `
                            <tr>
                                <td class="ps-4 fw-bold text-primary">${t.reference}</td>
                                <td>
                                    <div class="fw-bold text-dark">${t.entity}</div>
                                    <small class="text-muted">ID: TR-${t.id.toString().slice(-4)}</small>
                                </td>
                                <td>
                                    <span class="badge bg-light text-dark border">${t.project_name || 'General Overhead'}</span>
                                </td>
                                <td>${new Date(t.date).toLocaleDateString()}</td>
                                <td class="fw-bold ${viewType === 'ap' ? 'text-danger' : 'text-success'}">
                                    $${parseFloat(t.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
                                <td>
                                    <span class="badge ${this.getFinanceStatusBadge(t.status)} border">
                                        ${t.status.toUpperCase()}
                                    </span>
                                </td>
                                <td class="text-end pe-4">
                                    <div class="btn-group">
                                        <button class="btn btn-sm btn-white border" onclick="app.viewTransaction(${t.id})" title="View Details">
                                            <i class="bi bi-eye"></i>
                                        </button>
                                        ${t.status !== 'paid' ? `
                                            <button class="btn btn-sm btn-success border" onclick="app.payTransaction(${t.id})" title="Mark as Paid">
                                                <i class="bi bi-check2-circle"></i>
                                            </button>
                                        ` : ''}
                                        <button class="btn btn-sm btn-white border text-danger" onclick="app.deleteTransaction(${t.id})" title="Delete Record">
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

    getFinanceStatusBadge(status) {
        switch(status.toLowerCase()) {
            case 'paid': return 'bg-success-subtle text-success';
            case 'sent': return 'bg-info-subtle text-info';
            case 'pending': return 'bg-warning-subtle text-warning';
            case 'overdue': return 'bg-danger-subtle text-danger';
            default: return 'bg-light text-dark';
        }
    }

    exportFinanceData() {
        if (!window.dataManager) return;
        const data = window.dataManager.data.finance;
        const csv = "Date,Type,Reference,Entity,Project,Amount,Status\n" + 
            data.map(t => `"${t.date}","${t.type.toUpperCase()}","${t.reference}","${t.entity}","${t.project_name}","${t.amount}","${t.status}"`).join("\n");
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `Finance_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.showAlert('success', 'Financial report exported successfully!');
    }

    showNewTransactionModal() {
        const projects = window.dataManager ? window.dataManager.getProjects() : [];
        const clients = window.dataManager ? window.dataManager.getClients() : [];
        
        const modalHtml = `
            <div class="modal fade" id="newTransactionModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header bg-dark text-white">
                            <h5 class="modal-title fw-bold"><i class="bi bi-plus-circle me-2"></i> Create ERP Transaction</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-4">
                            <form id="transactionForm">
                                <div class="row g-4">
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold text-uppercase small text-muted">Type</label>
                                        <div class="btn-group w-100" role="group">
                                            <input type="radio" class="btn-check" name="transType" id="transTypeAR" value="ar" checked onchange="app.toggleTransactionFields()">
                                            <label class="btn btn-outline-primary" for="transTypeAR"><i class="bi bi-download me-1"></i> Receivable</label>
                                            
                                            <input type="radio" class="btn-check" name="transType" id="transTypeAP" value="ap" onchange="app.toggleTransactionFields()">
                                            <label class="btn btn-outline-danger" for="transTypeAP"><i class="bi bi-upload me-1"></i> Payable</label>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold text-uppercase small text-muted">Status</label>
                                        <select class="form-select" name="status" id="transStatus">
                                            <option value="pending">Pending</option>
                                            <option value="sent">Sent / Issued</option>
                                            <option value="paid">Paid / Settled</option>
                                            <option value="overdue">Overdue</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold text-uppercase small text-muted" id="transEntityLabel">Client / Payee</label>
                                        <div class="input-group">
                                            <span class="input-group-text bg-light"><i class="bi bi-person"></i></span>
                                            <input type="text" class="form-control" name="entity" id="transEntity" placeholder="Company or Individual Name" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold text-uppercase small text-muted">Reference / Invoice #</label>
                                        <div class="input-group">
                                            <span class="input-group-text bg-light"><i class="bi bi-hash"></i></span>
                                            <input type="text" class="form-control" name="reference" id="transRef" placeholder="e.g. INV-2024-001" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold text-uppercase small text-muted">Amount ($)</label>
                                        <div class="input-group">
                                            <span class="input-group-text bg-light fw-bold">$</span>
                                            <input type="number" class="form-control fw-bold" name="amount" id="transAmount" step="0.01" placeholder="0.00" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold text-uppercase small text-muted">Transaction Date</label>
                                        <input type="date" class="form-control" name="date" id="transDate" value="${new Date().toISOString().split('T')[0]}">
                                    </div>
                                    <div class="col-12">
                                        <label class="form-label fw-bold text-uppercase small text-muted">Link to Project</label>
                                        <select class="form-select" name="projectId" id="transProject">
                                            <option value="0">General Overhead / Non-Project</option>
                                            ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="col-12">
                                        <label class="form-label fw-bold text-uppercase small text-muted">Notes / Description</label>
                                        <textarea class="form-control" name="notes" rows="2" placeholder="Internal notes for this transaction..."></textarea>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer bg-light">
                            <button type="button" class="btn btn-link text-muted text-decoration-none" data-bs-dismiss="modal">Discard</button>
                            <button type="button" class="btn btn-dark px-4" onclick="app.saveFinanceTransaction()">
                                <i class="bi bi-save me-1"></i> Commit Transaction
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existing = document.getElementById('newTransactionModal');
        if (existing) existing.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal(document.getElementById('newTransactionModal')).show();
    }

    toggleTransactionFields() {
        const type = document.querySelector('input[name="transType"]:checked').value;
        const label = document.getElementById('transEntityLabel');
        if (type === 'ar') {
            label.textContent = 'Client / Payer';
        } else {
            label.textContent = 'Vendor / Payee';
        }
    }

    async saveFinanceTransaction() {
        const form = document.getElementById('transactionForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        const type = data.transType;
        const projectId = data.projectId;
        const project = window.dataManager.getProjects().find(p => p.id == projectId);

        if (!data.entity || !data.reference || !data.amount) {
            this.showAlert('danger', 'Please provide Entity, Reference, and Amount');
            return;
        }

        const transaction = {
            id: Date.now(),
            type: type,
            entity: data.entity,
            reference: data.reference,
            amount: parseFloat(data.amount),
            project_id: projectId,
            project_name: project ? project.name : 'General Overhead',
            date: data.date,
            status: data.status,
            notes: data.notes,
            created_at: new Date().toISOString()
        };

        if (window.dataManager) {
            window.dataManager.data.finance.push(transaction);
            window.dataManager.saveData('finance');
            
            this.showAlert('success', 'Transaction successfully committed to ledger');
            bootstrap.Modal.getInstance(document.getElementById('newTransactionModal')).hide();
            this.loadFinance();
        }
    }

    viewTransaction(id) {
        const trans = window.dataManager.data.finance.find(t => t.id == id);
        if (!trans) return;

        const modalHtml = `
            <div class="modal fade" id="viewTransactionModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header ${trans.type === 'ar' ? 'bg-primary' : 'bg-danger'} text-white">
                            <h5 class="modal-title fw-bold"><i class="bi bi-receipt me-2"></i> Transaction Details</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-4">
                            <div class="text-center mb-4">
                                <h6 class="text-muted small text-uppercase fw-bold">${trans.type === 'ar' ? 'Receivable' : 'Payable'}</h6>
                                <h2 class="fw-bold ${trans.type === 'ar' ? 'text-primary' : 'text-danger'}">$${parseFloat(trans.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
                                <span class="badge ${trans.status === 'paid' ? 'bg-success' : 'bg-warning'} text-uppercase">${trans.status}</span>
                            </div>
                            <hr>
                            <div class="row g-3">
                                <div class="col-6">
                                    <label class="text-muted small">Reference #</label>
                                    <div class="fw-bold">${trans.reference}</div>
                                </div>
                                <div class="col-6">
                                    <label class="text-muted small">Date</label>
                                    <div class="fw-bold">${new Date(trans.date).toLocaleDateString()}</div>
                                </div>
                                <div class="col-12">
                                    <label class="text-muted small">${trans.type === 'ar' ? 'Client' : 'Vendor'}</label>
                                    <div class="fw-bold">${trans.entity}</div>
                                </div>
                                <div class="col-12">
                                    <label class="text-muted small">Project</label>
                                    <div class="fw-bold">${trans.project_name || 'General / Overhead'}</div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            ${trans.status !== 'paid' ? `<button type="button" class="btn btn-success" onclick="app.payTransaction(${trans.id})">Mark as Paid</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existing = document.getElementById('viewTransactionModal');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal(document.getElementById('viewTransactionModal')).show();
    }

    deleteTransaction(id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            const index = window.dataManager.data.finance.findIndex(t => t.id == id);
            if (index > -1) {
                window.dataManager.data.finance.splice(index, 1);
                window.dataManager.saveData('finance');
                this.loadFinance();
                this.showAlert('success', 'Transaction deleted');
            }
        }
    }

    payTransaction(id) {
        const trans = window.dataManager.data.finance.find(t => t.id == id);
        if (trans) {
            if (trans.status === 'paid') {
                this.showAlert('info', 'Generating payment receipt PDF...');
            } else {
                trans.status = 'paid';
                window.dataManager.saveData('finance');
                this.loadFinance();
                this.showAlert('success', `Payment of $${trans.amount.toLocaleString()} processed!`);
                
                // Close modal if open
                const modalEl = document.getElementById('viewTransactionModal');
                if (modalEl) {
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
            }
        }
    }

    loadTimeClock() {
        const timeEntries = window.dataManager ? window.dataManager.data.time_entries : [];
        const userEntries = timeEntries.filter(e => e.user_id === this.currentUser.id);
        const projects = window.dataManager ? window.dataManager.getProjects() : [];
        
        const totalMinutes = userEntries.reduce((sum, entry) => sum + (parseFloat(entry.duration_minutes) || 0), 0);
        const totalHours = (totalMinutes / 60).toFixed(1);
        
        const content = `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 class="mb-1 fw-bold"><i class="bi bi-clock-history text-primary"></i> Field Time Clock</h2>
                            <p class="text-muted">Connecteam-style attendance and job tracking</p>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-primary" onclick="app.showTimesheetModal()">
                                <i class="bi bi-calendar-check me-1"></i> Full Timesheet
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-4">
                <div class="col-lg-5">
                    <!-- Clock Interface (Connecteam Style) -->
                    <div class="card border-0 shadow-lg mb-4 bg-white overflow-hidden" style="border-radius: 20px;">
                        <div class="card-header bg-primary text-white text-center py-4 border-0">
                            <h5 class="mb-0 fw-bold text-uppercase tracking-wider">Attendance</h5>
                            <p class="small opacity-75 mb-0">${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <div class="card-body p-5 text-center">
                            <div class="timer-circle ${this.clockInTime ? 'active' : ''} mb-5">
                                <span class="text-muted small text-uppercase">Shift Time</span>
                                <div class="clock-display" id="clockTimer">00:00:00</div>
                                <span class="text-primary fw-bold small mt-1" id="startTimeLabel">
                                    ${this.clockInTime ? 'Started: ' + new Date(this.clockInTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Ready to start'}
                                </span>
                            </div>

                            <div id="clockControls">
                                ${!this.clockInTime ? `
                                    <div class="mb-4 text-start">
                                        <label class="form-label small fw-bold text-muted text-uppercase">Select Job / Project</label>
                                        <select class="form-select form-select-lg shadow-sm" id="clockProject" style="border-radius: 12px; border: 2px solid #eee;">
                                            <option value="0">General Maintenance / Shop</option>
                                            ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="mb-4 text-start">
                                        <label class="form-label small fw-bold text-muted text-uppercase">Task Category</label>
                                        <select class="form-select form-select-lg shadow-sm" id="clockTask" style="border-radius: 12px; border: 2px solid #eee;">
                                            <option value="general">General Labor</option>
                                            <option value="site_prep">Site Preparation</option>
                                            <option value="framing">Framing / Structure</option>
                                            <option value="electrical">Electrical / Rough-in</option>
                                            <option value="plumbing">Plumbing</option>
                                            <option value="cleanup">Site Cleanup</option>
                                        </select>
                                    </div>
                                    <button class="btn btn-primary btn-lg w-100 py-3 shadow" style="border-radius: 15px; font-weight: 700; font-size: 1.2rem;" onclick="app.handleClockAction('in')">
                                        <i class="bi bi-play-circle-fill me-2"></i> START SHIFT
                                    </button>
                                ` : `
                                    <div class="p-3 bg-light rounded-4 mb-4 text-start border">
                                        <div class="small text-muted text-uppercase fw-bold">Active Job:</div>
                                        <div class="fw-bold fs-5 text-primary">${this.activeClockProjectName || 'General Work'}</div>
                                    </div>
                                    <button class="btn btn-danger btn-lg w-100 py-3 shadow" style="border-radius: 15px; font-weight: 700; font-size: 1.2rem;" onclick="app.handleClockAction('out')">
                                        <i class="bi bi-stop-circle-fill me-2"></i> END SHIFT
                                    </button>
                                `}
                            </div>
                        </div>
                        <div class="card-footer bg-light border-0 py-3 text-center">
                            <i class="bi bi-geo-alt-fill text-success"></i> <small class="text-muted">GPS Location Tracking Enabled</small>
                        </div>
                    </div>
                </div>

                <div class="col-lg-7">
                    <!-- Daily Summary -->
                    <div class="row g-4 mb-4">
                        <div class="col-6">
                            <div class="card border-0 shadow-sm">
                                <div class="card-body p-4 text-center">
                                    <h6 class="text-muted small text-uppercase mb-2">Today's Hours</h6>
                                    <h2 class="fw-bold mb-0">${this.getTodayHours()}</h2>
                                </div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="card border-0 shadow-sm">
                                <div class="card-body p-4 text-center">
                                    <h6 class="text-muted small text-uppercase mb-2">This Week</h6>
                                    <h2 class="fw-bold mb-0">${totalHours}</h2>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Recent Entries Table -->
                    <div class="card border-0 shadow-sm h-100" style="border-radius: 15px;">
                        <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                            <h5 class="mb-0 fw-bold">Session History</h5>
                            <span class="badge bg-primary-subtle text-primary">${userEntries.length} Entries</span>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover align-middle mb-0">
                                    <thead class="bg-light text-muted small text-uppercase">
                                        <tr>
                                            <th class="ps-4">Date</th>
                                            <th>Project</th>
                                            <th>Duration</th>
                                            <th class="text-end pe-4">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${userEntries.length === 0 ? '<tr><td colspan="4" class="text-center py-5 text-muted">No shift history found</td></tr>' : ''}
                                        ${userEntries.sort((a,b) => new Date(b.clock_in) - new Date(a.clock_in)).slice(0, 8).map(entry => `
                                            <tr>
                                                <td class="ps-4">
                                                    <div class="fw-bold">${new Date(entry.clock_in).toLocaleDateString()}</div>
                                                    <small class="text-muted">${new Date(entry.clock_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</small>
                                                </td>
                                                <td>
                                                    <div class="fw-bold">${entry.project_name}</div>
                                                    <small class="text-muted text-capitalize">${entry.task || 'General'}</small>
                                                </td>
                                                <td>
                                                    <span class="badge bg-light text-dark border fw-medium">
                                                        ${(entry.duration_minutes / 60).toFixed(1)} hrs
                                                    </span>
                                                </td>
                                                <td class="text-end pe-4">
                                                    <button class="btn btn-sm btn-link text-primary" onclick="app.viewTimeEntry(${entry.id})"><i class="bi bi-info-circle"></i></button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('mainContent').innerHTML = content;
        
        // Re-initialize timer if active
        if (this.clockInTime) {
            this.activeClockProjectName = localStorage.getItem('constructpro_clock_project_name') || 'Active Job';
            this.startClockTimer();
        }
    }

    getTodayHours() {
        const today = new Date().toDateString();
        const timeEntries = window.dataManager ? window.dataManager.data.time_entries : [];
        const todayMinutes = timeEntries
            .filter(e => e.user_id === this.currentUser.id && new Date(e.clock_in).toDateString() === today)
            .reduce((sum, e) => sum + (parseFloat(e.duration_minutes) || 0), 0);
        return (todayMinutes / 60).toFixed(1) + 'h';
    }

    handleClockAction(action) {
        if (action === 'in') {
            const projectSelect = document.getElementById('clockProject');
            const taskSelect = document.getElementById('clockTask');
            
            this.clockInTime = Date.now();
            this.activeClockProjectId = projectSelect ? projectSelect.value : 0;
            this.activeClockProjectName = projectSelect ? projectSelect.options[projectSelect.selectedIndex].text : 'General Work';
            this.activeClockTask = taskSelect ? taskSelect.value : 'general';

            localStorage.setItem('constructpro_clock_in', this.clockInTime);
            localStorage.setItem('constructpro_clock_project_id', this.activeClockProjectId);
            localStorage.setItem('constructpro_clock_project_name', this.activeClockProjectName);
            localStorage.setItem('constructpro_clock_task', this.activeClockTask);

            this.loadTimeClock();
            this.startClockTimer();
            this.showAlert('success', `Clocked in for ${this.activeClockProjectName}`);
        } else {
            const clockOutTime = Date.now();
            const durationMs = clockOutTime - this.clockInTime;
            const durationMinutes = (durationMs / 60000).toFixed(2);
            
            this.stopClockTimer();
            
            const entry = {
                id: Date.now(),
                user_id: this.currentUser.id,
                project_id: this.activeClockProjectId || 0,
                project_name: this.activeClockProjectName || 'General Work',
                task: this.activeClockTask || 'general',
                clock_in: new Date(this.clockInTime).toISOString(),
                clock_out: new Date(clockOutTime).toISOString(),
                duration_minutes: durationMinutes,
                status: 'approved'
            };

            if (window.dataManager) {
                window.dataManager.data.time_entries.push(entry);
                window.dataManager.saveData('time_entries');
            }
            
            this.clockInTime = null;
            this.activeClockProjectId = null;
            this.activeClockProjectName = null;
            this.activeClockTask = null;

            localStorage.removeItem('constructpro_clock_in');
            localStorage.removeItem('constructpro_clock_project_id');
            localStorage.removeItem('constructpro_clock_project_name');
            localStorage.removeItem('constructpro_clock_task');

            this.showAlert('info', `Clocked out. Session saved.`);
            this.loadTimeClock();
        }
    }

    startClockTimer() {
        if (this.clockTimerInterval) clearInterval(this.clockTimerInterval);
        this.clockTimerInterval = setInterval(() => {
            if (this.clockInTime) {
                const elapsedMs = Date.now() - this.clockInTime;
                const hours = Math.floor(elapsedMs / 3600000);
                const minutes = Math.floor((elapsedMs % 3600000) / 60000);
                const seconds = Math.floor((elapsedMs % 60000) / 1000);
                
                const timerElem = document.getElementById('clockTimer');
                if (timerElem) {
                    timerElem.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
            }
        }, 1000);
    }

    stopClockTimer() {
        if (this.clockTimerInterval) {
            clearInterval(this.clockTimerInterval);
            this.clockTimerInterval = null;
        }
    }

    saveTimeEntry(clockIn, clockOut, durationMinutes) {
        const entry = {
            id: Date.now(),
            user_id: this.currentUser.id,
            project_id: this.currentProject ? this.currentProject.id : 0,
            project_name: this.currentProject ? this.currentProject.name : 'General Work',
            clock_in: new Date(clockIn).toISOString(),
            clock_out: new Date(clockOut).toISOString(),
            duration_minutes: durationMinutes,
            status: 'approved'
        };

        if (window.dataManager) {
            window.dataManager.data.time_entries.push(entry);
            window.dataManager.saveData('time_entries');
        }
    }

    loadSettings() {
        const view = this.currentSettingsView || 'profile';
        const content = `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 class="mb-1 fw-bold"><i class="bi bi-gear text-secondary"></i> System Settings</h2>
                            <p class="text-muted">Manage your personal and company preferences</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-4">
                <div class="col-lg-3">
                    <div class="list-group list-group-flush border rounded shadow-sm">
                        <a href="#" class="list-group-item list-group-item-action py-3 ${view === 'profile' ? 'active' : ''}" onclick="app.showSettings('profile')">
                            <i class="bi bi-person me-2"></i> My Profile
                        </a>
                        <a href="#" class="list-group-item list-group-item-action py-3 ${view === 'company' ? 'active' : ''}" onclick="app.showSettings('company')">
                            <i class="bi bi-building me-2"></i> Company Info
                        </a>
                        <a href="#" class="list-group-item list-group-item-action py-3 ${view === 'app' ? 'active' : ''}" onclick="app.showSettings('app')">
                            <i class="bi bi-cpu me-2"></i> Application
                        </a>
                        <a href="#" class="list-group-item list-group-item-action py-3 ${view === 'notifications' ? 'active' : ''}" onclick="app.showSettings('notifications')">
                            <i class="bi bi-bell me-2"></i> Notifications
                        </a>
                        <a href="#" class="list-group-item list-group-item-action py-3 text-danger" onclick="app.logout()">
                            <i class="bi bi-box-arrow-right me-2"></i> Sign Out
                        </a>
                    </div>
                </div>
                <div class="col-lg-9">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body p-4" id="settingsViewContainer">
                            <!-- Settings content loads here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('mainContent').innerHTML = content;
        this.renderSettingsView(view);
    }

    showSettings(view) {
        this.currentSettingsView = view;
        this.loadModule('settings');
    }

    renderSettingsView(view) {
        const container = document.getElementById('settingsViewContainer');
        if (!container) return;

        let settingsHtml = '';
        switch(view) {
            case 'profile':
                settingsHtml = `
                    <h5 class="fw-bold mb-4">My Profile Settings</h5>
                    <form id="profileSettingsForm">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">First Name</label>
                                <input type="text" class="form-control" name="firstName" value="${this.currentUser?.firstName || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Last Name</label>
                                <input type="text" class="form-control" name="lastName" value="${this.currentUser?.lastName || ''}">
                            </div>
                            <div class="col-12">
                                <label class="form-label small fw-bold">Email Address</label>
                                <input type="email" class="form-control" name="email" value="${this.currentUser?.email || ''}">
                            </div>
                            <div class="col-12 mt-4">
                                <button type="button" class="btn btn-primary px-4" onclick="app.updateProfile()">Save Profile</button>
                            </div>
                        </div>
                    </form>
                `;
                break;
            case 'company':
                settingsHtml = `
                    <h5 class="fw-bold mb-4">Company Information</h5>
                    <form id="companySettingsForm">
                        <div class="row g-3">
                            <div class="col-12">
                                <label class="form-label small fw-bold">Company Name</label>
                                <input type="text" class="form-control" name="company" value="${this.currentUser?.company || 'ConstructPro Professional'}">
                            </div>
                            <div class="col-12">
                                <label class="form-label small fw-bold">Business License #</label>
                                <input type="text" class="form-control" name="license" value="GC-12345678-TX">
                            </div>
                            <div class="col-12">
                                <label class="form-label small fw-bold">Tax ID (EIN)</label>
                                <input type="text" class="form-control" name="ein" value="**-***5678">
                            </div>
                            <div class="col-12 mt-4">
                                <button type="button" class="btn btn-primary px-4" onclick="app.updateCompanySettings()">Update Company</button>
                            </div>
                        </div>
                    </form>
                `;
                break;
            case 'app':
                settingsHtml = `
                    <h5 class="fw-bold mb-4">Application Preferences</h5>
                    <div class="list-group list-group-flush">
                        <div class="list-group-item d-flex justify-content-between align-items-center px-0">
                            <div>
                                <h6 class="mb-1">Dark Mode</h6>
                                <p class="text-muted small mb-0">Switch to a dark UI for low-light environments</p>
                            </div>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" role="switch" id="darkModeSwitch" onchange="app.toggleDarkMode(this.checked)">
                            </div>
                        </div>
                        <div class="list-group-item d-flex justify-content-between align-items-center px-0">
                            <div>
                                <h6 class="mb-1">Automatic Backups</h6>
                                <p class="text-muted small mb-0">Daily cloud backups of project data</p>
                            </div>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" role="switch" checked>
                            </div>
                        </div>
                        <div class="list-group-item d-flex justify-content-between align-items-center px-0">
                            <div>
                                <h6 class="mb-1">Local Storage Mode</h6>
                                <p class="text-muted small mb-0">Always store data locally even when offline</p>
                            </div>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" role="switch" checked>
                            </div>
                        </div>
                    </div>
                `;
                break;
            default:
                settingsHtml = `<p class="text-muted">Coming soon...</p>`;
        }
        container.innerHTML = settingsHtml;
    }

    deleteAdminUser(id) {
        if (id === this.currentUser.id) {
            this.showAlert('danger', 'You cannot delete your own account');
            return;
        }

        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            if (window.authManager) {
                const index = window.authManager.users.findIndex(u => u.id === id);
                if (index !== -1) {
                    window.authManager.users.splice(index, 1);
                    window.authManager.saveUsers();
                    this.showAlert('success', 'User deleted successfully');
                    this.loadAdmin();
                }
            }
        }
    }

    showEditUserModal(id) {
        const user = window.authManager.users.find(u => u.id === id);
        if (!user) return;

        const modalId = 'editUserModal';
        let modal = document.getElementById(modalId);
        if (modal) modal.remove();

        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title fw-bold"><i class="bi bi-pencil-square me-2"></i> Edit User: ${user.firstName} ${user.lastName}</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-4">
                            <form id="editUserForm">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label small fw-bold">First Name</label>
                                        <input type="text" class="form-control" name="firstName" value="${user.firstName}" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label small fw-bold">Last Name</label>
                                        <input type="text" class="form-control" name="lastName" value="${user.lastName}" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label small fw-bold">Username</label>
                                        <input type="text" class="form-control" name="username" value="${user.username}" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label small fw-bold">Email</label>
                                        <input type="email" class="form-control" name="email" value="${user.email}" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label small fw-bold">Role</label>
                                        <select class="form-select" name="role">
                                            <option value="owner" ${user.role === 'owner' ? 'selected' : ''}>Company Owner</option>
                                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrator</option>
                                            <option value="project_manager" ${user.role === 'project_manager' ? 'selected' : ''}>Project Manager</option>
                                            <option value="estimator" ${user.role === 'estimator' ? 'selected' : ''}>Estimator</option>
                                            <option value="superintendent" ${user.role === 'superintendent' ? 'selected' : ''}>Superintendent</option>
                                            <option value="field_manager" ${user.role === 'field_manager' ? 'selected' : ''}>Field Manager</option>
                                            <option value="foreman" ${user.role === 'foreman' ? 'selected' : ''}>Foreman</option>
                                            <option value="laborer" ${user.role === 'laborer' ? 'selected' : ''}>Laborer</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label small fw-bold">Employment Type</label>
                                        <select class="form-select" name="type">
                                            <option value="Full-Time" ${user.type === 'Full-Time' ? 'selected' : ''}>Full-Time</option>
                                            <option value="Contractor" ${user.type === 'Contractor' ? 'selected' : ''}>Contractor</option>
                                            <option value="Part-Time" ${user.type === 'Part-Time' ? 'selected' : ''}>Part-Time</option>
                                        </select>
                                    </div>
                                    <div class="col-12 mt-4">
                                        <h6 class="fw-bold mb-3 border-bottom pb-2">Granular Permissions Overrides</h6>
                                        <div class="row g-2">
                                            ${['finance', 'daily-logs', 'team', 'blueprints', 'takeoff', 'schedule'].map(perm => `
                                                <div class="col-md-4">
                                                    <div class="form-check form-check-inline">
                                                        <input class="form-check-input" type="checkbox" name="permissions" value="${perm}" id="perm_${perm}" ${user.permissions?.includes(perm) ? 'checked' : ''}>
                                                        <label class="form-check-label text-capitalize" for="perm_${perm}">${perm.replace('-', ' ')}</label>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer bg-light">
                            <button type="button" class="btn btn-white border" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary px-4" onclick="app.saveUserChanges('${id}')">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal(document.getElementById(modalId)).show();
    }

    saveUserChanges(id) {
        const form = document.getElementById('editUserForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Handle multi-select permissions
        const permissions = [];
        form.querySelectorAll('input[name="permissions"]:checked').forEach(cb => {
            permissions.push(cb.value);
        });
        data.permissions = permissions;

        if (window.authManager) {
            window.authManager.updateUser(id, data);
            bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
            this.showAlert('success', 'User updated successfully');
            if (this.currentModule === 'admin') this.loadAdmin();
            if (this.currentModule === 'team') this.loadTeam();
        }
    }

    showTimesheetModal() {
        const timeEntries = window.dataManager ? window.dataManager.data.time_entries : [];
        const userEntries = timeEntries.filter(e => e.user_id === this.currentUser.id);
        
        const modalId = 'timesheetModal';
        let modal = document.getElementById(modalId);
        if (modal) modal.remove();

        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title fw-bold"><i class="bi bi-calendar-check me-2"></i> Employee Timesheet</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover align-middle mb-0">
                                    <thead class="bg-light sticky-top">
                                        <tr>
                                            <th class="ps-4">Date</th>
                                            <th>Project</th>
                                            <th>Task</th>
                                            <th>Clock In</th>
                                            <th>Clock Out</th>
                                            <th>Duration</th>
                                            <th class="text-end pe-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${userEntries.length === 0 ? '<tr><td colspan="7" class="text-center py-5">No entries found</td></tr>' : ''}
                                        ${userEntries.sort((a,b) => new Date(b.clock_in) - new Date(a.clock_in)).map(entry => `
                                            <tr>
                                                <td class="ps-4 fw-bold">${new Date(entry.clock_in).toLocaleDateString()}</td>
                                                <td>${entry.project_name}</td>
                                                <td class="text-capitalize">${entry.task || 'General'}</td>
                                                <td>${new Date(entry.clock_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                                <td>${entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '<span class="text-danger">Active</span>'}</td>
                                                <td>
                                                    <span class="badge bg-light text-dark border">
                                                        ${entry.duration_minutes ? (entry.duration_minutes / 60).toFixed(1) + ' hrs' : '-'}
                                                    </span>
                                                </td>
                                                <td class="text-end pe-4">
                                                    <span class="badge bg-success-subtle text-success">APPROVED</span>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer bg-light">
                            <button class="btn btn-outline-secondary" onclick="app.exportTimesheetCSV()">Export CSV</button>
                            <button type="button" class="btn btn-primary px-4" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal(document.getElementById(modalId)).show();
    }

    exportTimesheetCSV() {
        const timeEntries = window.dataManager ? window.dataManager.data.time_entries : [];
        const userEntries = timeEntries.filter(e => e.user_id === this.currentUser.id);
        
        let csv = 'Date,Project,Task,Clock In,Clock Out,Duration (Hrs)\n';
        userEntries.forEach(e => {
            csv += `${new Date(e.clock_in).toLocaleDateString()},${e.project_name},${e.task || 'General'},${new Date(e.clock_in).toLocaleTimeString()},${e.clock_out ? new Date(e.clock_out).toLocaleTimeString() : 'Active'},${(e.duration_minutes / 60).toFixed(2)}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `Timesheet_${this.currentUser.lastName}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    toggleDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('constructpro_dark_mode', 'true');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('constructpro_dark_mode', 'false');
        }
        this.showAlert('info', `Dark mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    viewTimeEntry(id) {
        const entry = window.dataManager.data.time_entries.find(e => e.id === id);
        if (entry) {
            this.showAlert('info', `Shift Details: ${entry.project_name} - ${entry.task || 'General Work'}`);
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
                                            <button class="btn btn-sm btn-outline-secondary me-1" onclick="app.showEditUserModal('${user.id}')"><i class="bi bi-pencil"></i></button>
                                            <button class="btn btn-sm btn-outline-danger" onclick="app.deleteAdminUser('${user.id}')"><i class="bi bi-trash"></i></button>
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

    showAddAdminUserModal() {
        const modalHtml = `
            <div class="modal fade" id="addAdminUserModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
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
                                        <input type="text" class="form-control" name="firstName" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold small">Last Name</label>
                                        <input type="text" class="form-control" name="lastName" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold small">Email Address</label>
                                        <input type="email" class="form-control" name="email" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold small">Username</label>
                                        <input type="text" class="form-control" name="username" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold small">Role</label>
                                        <select class="form-select" name="role" required>
                                            <option value="owner">Company Owner (Admin)</option>
                                            <option value="project_manager">Project Manager</option>
                                            <option value="estimator">Estimator</option>
                                            <option value="superintendent">Superintendent</option>
                                            <option value="field_manager">Field Manager</option>
                                            <option value="contractor">General Contractor</option>
                                            <option value="subcontractor">Subcontractor</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold small">Password</label>
                                        <input type="password" class="form-control" name="password" required>
                                    </div>
                                    
                                    <div class="col-12">
                                        <hr>
                                        <h6 class="fw-bold mb-3">Custom Permissions Overrides</h6>
                                        <div class="row row-cols-2 row-cols-md-3 g-2">
                                            ${['projects', 'schedule', 'blueprints', 'takeoff', 'daily-logs', 'team', 'finance', 'contracts', 'clients', 'timeclock', 'admin'].map(p => `
                                                <div class="col">
                                                    <div class="form-check">
                                                        <input class="form-check-input" type="checkbox" name="permissions" value="${p}" id="perm_${p}">
                                                        <label class="form-check-label small" for="perm_${p}">
                                                            ${p.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                                        </label>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer bg-light">
                            <button type="button" class="btn btn-white border" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger px-4" onclick="app.saveAdminUser()">Create User</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existing = document.getElementById('addAdminUserModal');
        if (existing) existing.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal(document.getElementById('addAdminUserModal')).show();
    }

    saveAdminUser() {
        const form = document.getElementById('addAdminUserForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Get permissions from checkboxes
        const permissions = Array.from(form.querySelectorAll('input[name="permissions"]:checked')).map(cb => cb.value);
        
        if (window.authManager) {
            const newUser = {
                id: Date.now().toString(),
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                username: data.username,
                role: data.role,
                company: this.currentUser?.company || 'My Company',
                password: window.authManager.hashPassword(data.password),
                permissions: permissions,
                isActive: true,
                createdAt: new Date().toISOString()
            };
            
            window.authManager.users.push(newUser);
            window.authManager.saveUsers();
            this.showAlert('success', `User ${data.firstName} created successfully!`);
            bootstrap.Modal.getInstance(document.getElementById('addAdminUserModal')).hide();
            this.loadModule('team');
        }
    }

    showEditUserModal(userId) {
        const user = window.authManager.users.find(u => u.id === userId);
        if (!user) return;

        const modalHtml = `
            <div class="modal fade" id="editUserModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title fw-bold"><i class="bi bi-pencil-square me-2"></i> Edit Member Settings</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-4">
                            <form id="editUserForm">
                                <input type="hidden" name="userId" value="${user.id}">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold small">First Name</label>
                                        <input type="text" class="form-control" name="firstName" value="${user.firstName}" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold small">Last Name</label>
                                        <input type="text" class="form-control" name="lastName" value="${user.lastName}" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold small">Role</label>
                                        <select class="form-select" name="role">
                                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrator</option>
                                            <option value="project_manager" ${user.role === 'project_manager' ? 'selected' : ''}>Project Manager</option>
                                            <option value="superintendent" ${user.role === 'superintendent' ? 'selected' : ''}>Superintendent</option>
                                            <option value="estimator" ${user.role === 'estimator' ? 'selected' : ''}>Estimator</option>
                                            <option value="field_manager" ${user.role === 'field_manager' ? 'selected' : ''}>Field Manager</option>
                                            <option value="contractor" ${user.role === 'contractor' ? 'selected' : ''}>General Contractor</option>
                                            <option value="subcontractor" ${user.role === 'subcontractor' ? 'selected' : ''}>Subcontractor</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold small">Status</label>
                                        <select class="form-select" name="isActive">
                                            <option value="true" ${user.isActive ? 'selected' : ''}>Active</option>
                                            <option value="false" ${!user.isActive ? 'selected' : ''}>Inactive</option>
                                        </select>
                                    </div>
                                    
                                    <div class="col-12">
                                        <hr>
                                        <h6 class="fw-bold mb-3">Custom Permissions Overrides</h6>
                                        <div class="row row-cols-2 row-cols-md-3 g-2">
                                            ${['projects', 'schedule', 'blueprints', 'takeoff', 'daily-logs', 'team', 'finance', 'contracts', 'clients', 'timeclock', 'admin'].map(p => `
                                                <div class="col">
                                                    <div class="form-check">
                                                        <input class="form-check-input" type="checkbox" name="permissions" value="${p}" id="edit_perm_${p}" ${(user.permissions && user.permissions.includes(p)) ? 'checked' : ''}>
                                                        <label class="form-check-label small" for="edit_perm_${p}">
                                                            ${p.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                                        </label>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer bg-light">
                            <button type="button" class="btn btn-outline-danger me-auto" onclick="app.deleteAdminUser('${user.id}')">Delete Member</button>
                            <button type="button" class="btn btn-white border" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary px-4" onclick="app.updateAdminUser()">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existing = document.getElementById('editUserModal');
        if (existing) existing.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal(document.getElementById('editUserModal')).show();
    }

    updateAdminUser() {
        const form = document.getElementById('editUserForm');
        const formData = new FormData(form);
        const userId = formData.get('userId');
        const permissions = Array.from(form.querySelectorAll('input[name="permissions"]:checked')).map(cb => cb.value);
        
        const data = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            role: formData.get('role'),
            isActive: formData.get('isActive') === 'true',
            permissions: permissions
        };

        if (window.authManager) {
            window.authManager.updateUser(userId, data);
            bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
            this.loadModule('team');
        }
    }

    openDirectMessage(userId) {
        const user = window.authManager.users.find(u => u.id === userId);
        if (!user) return;

        const modalHtml = `
            <div class="modal fade" id="chatModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg" style="height: 500px;">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title fw-bold"><i class="bi bi-chat-dots me-2"></i> Chat with ${user.firstName}</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-0 d-flex flex-column bg-light">
                            <div id="chatMessages" class="flex-grow-1 p-3 overflow-y-auto">
                                <!-- Messages load here -->
                            </div>
                            <div class="p-3 bg-white border-top">
                                <form id="chatForm" class="d-flex gap-2">
                                    <input type="text" class="form-control" id="chatInput" placeholder="Type a message..." autocomplete="off">
                                    <button type="submit" class="btn btn-primary"><i class="bi bi-send"></i></button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existing = document.getElementById('chatModal');
        if (existing) existing.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('chatModal'));
        modal.show();

        this.loadChatMessages(userId);

        document.getElementById('chatForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const text = document.getElementById('chatInput').value;
            if (text.trim() && window.messageManager) {
                window.messageManager.sendMessage(this.currentUser.id, userId, text);
                document.getElementById('chatInput').value = '';
                this.loadChatMessages(userId);
            }
        });
    }

    updateUnreadCount() {
        if (!window.messageManager || !this.currentUser) return;
        const count = window.messageManager.getUnreadCount(this.currentUser.id);
        const badge = document.getElementById('unreadMessagesCount');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        }
    }

    showRecentChats() {
        if (!window.authManager || !window.messageManager) return;
        
        const users = window.authManager.users.filter(u => u.id !== this.currentUser.id);
        
        const modalHtml = `
            <div class="modal fade" id="recentChatsModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title fw-bold"><i class="bi bi-chat-text me-2"></i> Team Messages</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-0">
                            <div class="list-group list-group-flush">
                                ${users.map(user => {
                                    const messages = window.messageManager.getMessagesBetween(this.currentUser.id, user.id);
                                    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
                                    return `
                                        <button class="list-group-item list-group-item-action d-flex align-items-center py-3" onclick="app.openDirectMessage('${user.id}'); bootstrap.Modal.getInstance(document.getElementById('recentChatsModal')).hide();">
                                            <div class="bg-primary-subtle text-primary rounded-circle p-2 me-3" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                                                <span class="small fw-bold">${user.firstName[0]}${user.lastName[0]}</span>
                                            </div>
                                            <div class="flex-grow-1 overflow-hidden">
                                                <div class="d-flex justify-content-between align-items-center mb-1">
                                                    <h6 class="mb-0 fw-bold">${user.firstName} ${user.lastName}</h6>
                                                    ${lastMsg ? `<small class="text-muted">${new Date(lastMsg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>` : ''}
                                                </div>
                                                <div class="small text-truncate text-muted">
                                                    ${lastMsg ? lastMsg.text : 'Start a conversation...'}
                                                </div>
                                            </div>
                                        </button>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existing = document.getElementById('recentChatsModal');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal(document.getElementById('recentChatsModal')).show();
    }

    loadChatMessages(otherId) {
        const container = document.getElementById('chatMessages');
        if (!container || !window.messageManager) return;

        const messages = window.messageManager.getMessagesBetween(this.currentUser.id, otherId);
        container.innerHTML = messages.map(m => `
            <div class="d-flex ${m.fromId === this.currentUser.id ? 'justify-content-end' : 'justify-content-start'} mb-2">
                <div class="rounded p-2 px-3 shadow-sm ${m.fromId === this.currentUser.id ? 'bg-primary text-white' : 'bg-white'}" style="max-width: 80%;">
                    <div class="small mb-1">${m.text}</div>
                    <div class="text-end" style="font-size: 0.7rem; opacity: 0.8;">
                        ${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                </div>
            </div>
        `).join('');
        
        container.scrollTop = container.scrollHeight;
        
        // Mark as read
        window.messageManager.markAsRead(otherId, this.currentUser.id);
        this.updateUnreadCount();
    }

    deleteAdminUser(userId) {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            if (window.authManager && window.authManager.deleteUser(userId)) {
                if (this.currentModule === 'admin') {
                    this.loadModule('admin');
                } else {
                    this.loadModule('team');
                }
            }
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
                            <button class="btn btn-sm btn-outline-primary" onclick="app.showEditLogModal()">Edit Entry</button>
                            <button class="btn btn-sm btn-primary" onclick="app.generateDailyLogPDF()">Generate PDF Report</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    loadTeam() {
        const users = window.authManager ? window.authManager.users : [];
        const subcontractors = window.dataManager ? window.dataManager.data.subcontractors : [];
        const currentUser = this.currentUser;

        document.getElementById('mainContent').innerHTML = `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 class="mb-1 fw-bold"><i class="bi bi-person-badge text-primary"></i> Team Management</h2>
                            <p class="text-muted">Manage crew members, subcontractors, and role assignments</p>
                        </div>
                        ${this.hasPermission('admin') ? `
                        <button class="btn btn-primary shadow-sm" onclick="app.showAddAdminUserModal()">
                            <i class="bi bi-person-plus me-1"></i> Add Member
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>

            <div class="row g-4">
                ${users.map(user => `
                    <div class="col-md-6 col-lg-4">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-body p-4 text-center">
                                <div class="mb-3">
                                    <div class="bg-primary-subtle text-primary rounded-circle d-inline-flex p-3" style="width: 80px; height: 80px; align-items: center; justify-content: center;">
                                        <h3 class="mb-0 fw-bold">${(user.firstName?.[0] || '')}${(user.lastName?.[0] || '')}</h3>
                                    </div>
                                </div>
                                <h5 class="fw-bold mb-1">${user.firstName} ${user.lastName}</h5>
                                <p class="text-muted small mb-2">${this.getRoleDisplayName(user.role)}</p>
                                <div class="d-flex justify-content-center gap-2 mb-3">
                                    <span class="badge bg-light text-dark border">${user.type || 'Full-Time'}</span>
                                    <span class="badge ${user.isActive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} border">
                                        ${user.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <hr>
                                <div class="row g-2">
                                    <div class="col-6">
                                        <button class="btn btn-sm btn-outline-secondary w-100" onclick="app.showUserProfile('${user.id}')">
                                            <i class="bi bi-person me-1"></i> Profile
                                        </button>
                                    </div>
                                    <div class="col-6">
                                        ${user.id !== currentUser?.id ? `
                                            <button class="btn btn-sm btn-outline-primary w-100" onclick="app.openDirectMessage('${user.id}')">
                                                <i class="bi bi-chat-dots me-1"></i> Message
                                            </button>
                                        ` : `
                                            <button class="btn btn-sm btn-outline-info w-100" disabled>
                                                <i class="bi bi-person-check me-1"></i> You
                                            </button>
                                        `}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="row mt-5">
                <div class="col-12">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                            <h5 class="mb-0 fw-bold">Subcontractor Directory</h5>
                            <button class="btn btn-sm btn-outline-primary" onclick="app.showAddSubcontractorModal()">
                                <i class="bi bi-plus-lg me-1"></i> Add Sub
                            </button>
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
                                    <tbody id="subcontractorList">
                                        ${subcontractors.length === 0 ? `
                                            <tr>
                                                <td colspan="5" class="text-center py-4 text-muted">No subcontractors added yet</td>
                                            </tr>
                                        ` : subcontractors.map(sub => `
                                            <tr>
                                                <td class="ps-4 fw-bold">${sub.company}</td>
                                                <td><span class="badge bg-light text-dark border">${sub.trade}</span></td>
                                                <td>${sub.contact}</td>
                                                <td><span class="badge bg-success-subtle text-success border">Verified</span></td>
                                                <td class="text-end pe-4">
                                                    <button class="btn btn-sm btn-link text-primary" onclick="app.showAlert('info', 'Messaging subs coming soon')"><i class="bi bi-chat-text"></i></button>
                                                    <button class="btn btn-sm btn-link text-danger" onclick="app.deleteSubcontractor(${sub.id})"><i class="bi bi-trash"></i></button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showAddSubcontractorModal() {
        const modalId = 'addSubModal';
        let modal = document.getElementById(modalId);
        if (modal) modal.remove();

        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title fw-bold"><i class="bi bi-building-add me-2"></i> Register Subcontractor</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-4">
                            <form id="addSubForm">
                                <div class="mb-3">
                                    <label class="form-label small fw-bold">Company Name</label>
                                    <input type="text" class="form-control" name="company" required placeholder="e.g., Apex Plumbing">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small fw-bold">Trade / Industry</label>
                                    <select class="form-select" name="trade">
                                        <option value="Plumbing">Plumbing</option>
                                        <option value="Electrical">Electrical</option>
                                        <option value="Masonry">Masonry</option>
                                        <option value="HVAC">HVAC</option>
                                        <option value="Roofing">Roofing</option>
                                        <option value="Demolition">Demolition</option>
                                        <option value="Chimney Sweep">Chimney Sweep</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small fw-bold">Contact Person</label>
                                    <input type="text" class="form-control" name="contact" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small fw-bold">Email</label>
                                    <input type="email" class="form-control" name="email" required>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer bg-light">
                            <button type="button" class="btn btn-white border" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary px-4" onclick="app.saveSubcontractor()">Add Subcontractor</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal(document.getElementById(modalId)).show();
    }

    saveSubcontractor() {
        const form = document.getElementById('addSubForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        const sub = {
            id: Date.now(),
            ...data
        };

        if (window.dataManager) {
            window.dataManager.data.subcontractors.push(sub);
            window.dataManager.saveData('subcontractors');
            this.showAlert('success', `${data.company} added to directory`);
            bootstrap.Modal.getInstance(document.getElementById('addSubModal')).hide();
            this.loadTeam();
        }
    }

    deleteSubcontractor(id) {
        if (confirm('Remove this subcontractor from the directory?')) {
            const index = window.dataManager.data.subcontractors.findIndex(s => s.id === id);
            if (index !== -1) {
                window.dataManager.data.subcontractors.splice(index, 1);
                window.dataManager.saveData('subcontractors');
                this.loadTeam();
            }
        }
    }
}

// Initialize the application
window.app = new ConstructProApp();
