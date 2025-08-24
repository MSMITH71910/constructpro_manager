// Authentication Manager - Handle user registration and login
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.users = JSON.parse(localStorage.getItem('constructpro_users') || '[]');
        this.sessionData = JSON.parse(localStorage.getItem('constructpro_session') || 'null');
        this.init();
    }

    init() {
        this.checkExistingSession();
        this.setupEventListeners();
    }

    checkExistingSession() {
        if (this.sessionData && this.sessionData.expires > Date.now()) {
            this.currentUser = this.sessionData.user;
            this.isAuthenticated = true;
            this.dispatchAuthEvent('login', this.currentUser);
        } else {
            this.clearSession();
            this.hideLoadingScreen();
            this.showAuthScreen();
        }
    }

    setupEventListeners() {
        // Listen for logout events
        window.addEventListener('beforeunload', () => {
            this.updateSessionTimestamp();
        });
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    showAuthScreen() {
        // Add auth mode class to body
        document.body.classList.add('auth-mode');
        
        document.getElementById('mainContent').innerHTML = `
            <div class="auth-container">
                <div class="container-fluid">
                    <div class="row justify-content-center">
                        <div class="col-12 col-sm-10 col-md-8 col-lg-6 col-xl-4">
                            <div class="card shadow-lg">
                            <div class="card-body p-5">
                                <div class="text-center mb-4">
                                    <i class="bi bi-building display-1 text-primary mb-3"></i>
                                    <h2 class="h4 text-gray-900 mb-2">ConstructPro Manager</h2>
                                    <p class="text-muted">Your Complete Construction Management Solution</p>
                                </div>

                                <!-- Login/Register Tabs -->
                                <ul class="nav nav-tabs mb-4" id="authTabs" role="tablist">
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link active" id="login-tab" data-bs-toggle="tab" data-bs-target="#login-panel" type="button" role="tab">
                                            <i class="bi bi-box-arrow-in-right"></i> Sign In
                                        </button>
                                    </li>
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link" id="register-tab" data-bs-toggle="tab" data-bs-target="#register-panel" type="button" role="tab">
                                            <i class="bi bi-person-plus"></i> Register
                                        </button>
                                    </li>
                                </ul>

                                <!-- Tab Content -->
                                <div class="tab-content" id="authTabContent">
                                    <!-- Login Panel -->
                                    <div class="tab-pane fade show active" id="login-panel" role="tabpanel">
                                        <form id="loginForm">
                                            <div class="mb-3">
                                                <label for="loginUsername" class="form-label">Username or Email</label>
                                                <div class="input-group">
                                                    <span class="input-group-text"><i class="bi bi-person"></i></span>
                                                    <input type="text" class="form-control" id="loginUsername" placeholder="Enter username or email" required>
                                                </div>
                                            </div>
                                            <div class="mb-4">
                                                <label for="loginPassword" class="form-label">Password</label>
                                                <div class="input-group">
                                                    <span class="input-group-text"><i class="bi bi-lock"></i></span>
                                                    <input type="password" class="form-control" id="loginPassword" placeholder="Enter password" required>
                                                    <button class="btn btn-outline-secondary" type="button" id="toggleLoginPassword">
                                                        <i class="bi bi-eye"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <div class="mb-3 form-check">
                                                <input type="checkbox" class="form-check-input" id="rememberMe">
                                                <label class="form-check-label" for="rememberMe">
                                                    Remember me for 30 days
                                                </label>
                                            </div>
                                            <div class="d-grid">
                                                <button type="submit" class="btn btn-primary btn-lg">
                                                    <i class="bi bi-box-arrow-in-right"></i> Sign In
                                                </button>
                                            </div>
                                            <div class="text-center mt-3">
                                                <small class="text-muted">
                                                    Demo: Use username "demo" and password "demo123"
                                                </small>
                                            </div>
                                        </form>
                                    </div>

                                    <!-- Register Panel -->
                                    <div class="tab-pane fade" id="register-panel" role="tabpanel">
                                        <form id="registerForm">
                                            <div class="row">
                                                <div class="col-md-6">
                                                    <div class="mb-3">
                                                        <label for="registerFirstName" class="form-label">First Name</label>
                                                        <input type="text" class="form-control" id="registerFirstName" placeholder="Enter first name" required>
                                                    </div>
                                                </div>
                                                <div class="col-md-6">
                                                    <div class="mb-3">
                                                        <label for="registerLastName" class="form-label">Last Name</label>
                                                        <input type="text" class="form-control" id="registerLastName" placeholder="Enter last name" required>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="mb-3">
                                                <label for="registerUsername" class="form-label">Username</label>
                                                <div class="input-group">
                                                    <span class="input-group-text"><i class="bi bi-person"></i></span>
                                                    <input type="text" class="form-control" id="registerUsername" placeholder="Choose username" required>
                                                </div>
                                                <div class="form-text">Username must be 3-20 characters long</div>
                                            </div>
                                            <div class="mb-3">
                                                <label for="registerEmail" class="form-label">Email Address</label>
                                                <div class="input-group">
                                                    <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                                                    <input type="email" class="form-control" id="registerEmail" placeholder="Enter email address" required>
                                                </div>
                                            </div>
                                            <div class="mb-3">
                                                <label for="registerCompany" class="form-label">Company Name</label>
                                                <div class="input-group">
                                                    <span class="input-group-text"><i class="bi bi-building"></i></span>
                                                    <input type="text" class="form-control" id="registerCompany" placeholder="Enter company name" required>
                                                </div>
                                            </div>
                                            <div class="mb-3">
                                                <label for="registerRole" class="form-label">Your Role</label>
                                                <select class="form-select" id="registerRole" required>
                                                    <option value="">Select your role...</option>
                                                    <option value="contractor">General Contractor</option>
                                                    <option value="subcontractor">Subcontractor</option>
                                                    <option value="architect">Architect</option>
                                                    <option value="engineer">Engineer</option>
                                                    <option value="project_manager">Project Manager</option>
                                                    <option value="estimator">Estimator</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                            <div class="mb-3">
                                                <label for="registerPassword" class="form-label">Password</label>
                                                <div class="input-group">
                                                    <span class="input-group-text"><i class="bi bi-lock"></i></span>
                                                    <input type="password" class="form-control" id="registerPassword" placeholder="Create password" required>
                                                    <button class="btn btn-outline-secondary" type="button" id="toggleRegisterPassword">
                                                        <i class="bi bi-eye"></i>
                                                    </button>
                                                </div>
                                                <div class="form-text">Password must be at least 6 characters long</div>
                                            </div>
                                            <div class="mb-4">
                                                <label for="registerConfirmPassword" class="form-label">Confirm Password</label>
                                                <div class="input-group">
                                                    <span class="input-group-text"><i class="bi bi-lock-fill"></i></span>
                                                    <input type="password" class="form-control" id="registerConfirmPassword" placeholder="Confirm password" required>
                                                </div>
                                            </div>
                                            <div class="mb-3 form-check">
                                                <input type="checkbox" class="form-check-input" id="agreeTerms" required>
                                                <label class="form-check-label" for="agreeTerms">
                                                    I agree to the <a href="#" class="link-primary">Terms of Service</a> and <a href="#" class="link-primary">Privacy Policy</a>
                                                </label>
                                            </div>
                                            <div class="d-grid">
                                                <button type="submit" class="btn btn-success btn-lg">
                                                    <i class="bi bi-person-plus"></i> Create Account
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupAuthEventListeners();
        this.createDemoUser();
    }

    setupAuthEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        console.log('Login form found:', loginForm);
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                console.log('Login form submitted');
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register form
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Password visibility toggles
        this.setupPasswordToggles();

        // Real-time validation
        this.setupFormValidation();
    }

    setupPasswordToggles() {
        const toggleButtons = ['toggleLoginPassword', 'toggleRegisterPassword'];
        
        toggleButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', (e) => {
                    const input = e.target.closest('.input-group').querySelector('input');
                    const icon = e.target.closest('button').querySelector('i');
                    
                    if (input.type === 'password') {
                        input.type = 'text';
                        icon.className = 'bi bi-eye-slash';
                    } else {
                        input.type = 'password';
                        icon.className = 'bi bi-eye';
                    }
                });
            }
        });
    }

    setupFormValidation() {
        // Username validation
        const registerUsername = document.getElementById('registerUsername');
        if (registerUsername) {
            registerUsername.addEventListener('input', (e) => {
                this.validateUsername(e.target);
            });
        }

        // Email validation
        const registerEmail = document.getElementById('registerEmail');
        if (registerEmail) {
            registerEmail.addEventListener('input', (e) => {
                this.validateEmail(e.target);
            });
        }

        // Password confirmation
        const confirmPassword = document.getElementById('registerConfirmPassword');
        if (confirmPassword) {
            confirmPassword.addEventListener('input', (e) => {
                this.validatePasswordConfirmation();
            });
        }

        // Password strength
        const registerPassword = document.getElementById('registerPassword');
        if (registerPassword) {
            registerPassword.addEventListener('input', (e) => {
                this.validatePasswordStrength(e.target);
            });
        }
    }

    validateUsername(input) {
        const username = input.value.trim();
        const isValid = username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username);
        const isUnique = !this.users.some(user => user.username.toLowerCase() === username.toLowerCase());

        if (!isValid) {
            input.setCustomValidity('Username must be 3-20 characters and contain only letters, numbers, and underscores');
        } else if (!isUnique) {
            input.setCustomValidity('Username is already taken');
        } else {
            input.setCustomValidity('');
        }
    }

    validateEmail(input) {
        const email = input.value.trim();
        const isUnique = !this.users.some(user => user.email.toLowerCase() === email.toLowerCase());

        if (!isUnique) {
            input.setCustomValidity('Email is already registered');
        } else {
            input.setCustomValidity('');
        }
    }

    validatePasswordStrength(input) {
        const password = input.value;
        const minLength = password.length >= 6;
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /\d/.test(password);

        if (!minLength) {
            input.setCustomValidity('Password must be at least 6 characters long');
        } else if (!hasLetter) {
            input.setCustomValidity('Password must contain at least one letter');
        } else if (!hasNumber) {
            input.setCustomValidity('Password should contain at least one number');
        } else {
            input.setCustomValidity('');
        }
    }

    validatePasswordConfirmation() {
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword');
        
        if (password !== confirmPassword.value) {
            confirmPassword.setCustomValidity('Passwords do not match');
        } else {
            confirmPassword.setCustomValidity('');
        }
    }

    handleLogin() {
        console.log('handleLogin called');
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        console.log('Login attempt:', { username, password, usersCount: this.users.length });

        if (!username || !password) {
            this.showAlert('danger', 'Please enter both username and password');
            return;
        }

        // Find user
        const user = this.users.find(u => 
            (u.username.toLowerCase() === username.toLowerCase() || 
             u.email.toLowerCase() === username.toLowerCase()) && 
            u.password === this.hashPassword(password)
        );

        console.log('User found:', user);

        if (user) {
            console.log('Logging in user:', user.username);
            this.loginUser(user, rememberMe);
        } else {
            console.log('Login failed - invalid credentials');
            this.showAlert('danger', 'Invalid username/email or password');
        }
    }

    handleRegister() {
        const formData = {
            firstName: document.getElementById('registerFirstName').value.trim(),
            lastName: document.getElementById('registerLastName').value.trim(),
            username: document.getElementById('registerUsername').value.trim(),
            email: document.getElementById('registerEmail').value.trim(),
            company: document.getElementById('registerCompany').value.trim(),
            role: document.getElementById('registerRole').value,
            password: document.getElementById('registerPassword').value,
            confirmPassword: document.getElementById('registerConfirmPassword').value
        };

        // Validate required fields
        if (!formData.firstName || !formData.lastName || !formData.username || 
            !formData.email || !formData.company || !formData.role || 
            !formData.password || !formData.confirmPassword) {
            this.showAlert('danger', 'Please fill in all required fields');
            return;
        }

        // Validate password match
        if (formData.password !== formData.confirmPassword) {
            this.showAlert('danger', 'Passwords do not match');
            return;
        }

        // Check for existing user
        if (this.users.some(u => u.username.toLowerCase() === formData.username.toLowerCase())) {
            this.showAlert('danger', 'Username is already taken');
            return;
        }

        if (this.users.some(u => u.email.toLowerCase() === formData.email.toLowerCase())) {
            this.showAlert('danger', 'Email is already registered');
            return;
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            firstName: formData.firstName,
            lastName: formData.lastName,
            username: formData.username,
            email: formData.email,
            company: formData.company,
            role: formData.role,
            password: this.hashPassword(formData.password),
            createdAt: new Date().toISOString(),
            lastLogin: null,
            isActive: true
        };

        this.users.push(newUser);
        this.saveUsers();
        
        this.showAlert('success', 'Account created successfully! You can now sign in.');
        
        // Switch to login tab
        document.getElementById('login-tab').click();
        
        // Pre-fill login form
        document.getElementById('loginUsername').value = formData.username;
    }

    loginUser(user, rememberMe = false) {
        this.currentUser = { ...user };
        delete this.currentUser.password; // Don't keep password in memory
        this.isAuthenticated = true;

        // Update last login
        const userIndex = this.users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
            this.users[userIndex].lastLogin = new Date().toISOString();
            this.saveUsers();
        }

        // Create session
        const sessionDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000; // 30 days or 8 hours
        this.sessionData = {
            user: this.currentUser,
            expires: Date.now() + sessionDuration,
            rememberMe
        };

        this.saveSession();
        this.dispatchAuthEvent('login', this.currentUser);
        
        // Remove auth mode class from body
        document.body.classList.remove('auth-mode');
        
        this.showAlert('success', `Welcome back, ${this.currentUser.firstName}!`);
        
        // Load the main application
        setTimeout(() => {
            if (window.app) {
                window.app.loadModule('dashboard');
            }
        }, 1000);
    }

    logout() {
        const userName = this.currentUser?.firstName || 'User';
        
        this.currentUser = null;
        this.isAuthenticated = false;
        this.clearSession();
        
        this.dispatchAuthEvent('logout', null);
        this.showAlert('info', `Goodbye, ${userName}!`);
        
        setTimeout(() => {
            this.showAuthScreen();
        }, 1000);
    }

    createDemoUser() {
        // Create demo user if it doesn't exist
        const demoExists = this.users.some(u => u.username === 'demo');
        
        if (!demoExists) {
            const demoUser = {
                id: 'demo-user-001',
                firstName: 'Demo',
                lastName: 'User',
                username: 'demo',
                email: 'demo@constructpro.com',
                company: 'Demo Construction Co.',
                role: 'contractor',
                password: this.hashPassword('demo123'),
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true,
                isDemo: true
            };

            console.log('Creating demo user with hashed password:', demoUser.password);
            this.users.push(demoUser);
            this.saveUsers();
            console.log('Demo user created successfully');
        }
    }

    hashPassword(password) {
        // Simple hash function (in production, use proper bcrypt or similar)
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    saveUsers() {
        localStorage.setItem('constructpro_users', JSON.stringify(this.users));
    }

    saveSession() {
        localStorage.setItem('constructpro_session', JSON.stringify(this.sessionData));
    }

    clearSession() {
        localStorage.removeItem('constructpro_session');
        this.sessionData = null;
    }

    updateSessionTimestamp() {
        if (this.sessionData) {
            this.sessionData.lastActivity = Date.now();
            this.saveSession();
        }
    }

    dispatchAuthEvent(type, user) {
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { type, user, isAuthenticated: this.isAuthenticated }
        }));
    }

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
            const alert = document.querySelector('.alert:last-of-type');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }

    // Utility methods
    getCurrentUser() {
        return this.currentUser;
    }

    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    hasRole(role) {
        return this.currentUser?.role === role;
    }

    hasPermission(permission) {
        // Implement role-based permissions if needed
        if (!this.isAuthenticated) return false;
        
        const permissions = {
            'admin': ['view_all', 'edit_all', 'delete_all', 'manage_users'],
            'contractor': ['view_own', 'edit_own', 'create_projects'],
            'subcontractor': ['view_assigned', 'edit_assigned'],
            'project_manager': ['view_projects', 'edit_projects', 'manage_team'],
            'estimator': ['view_projects', 'create_estimates', 'edit_estimates'],
            'architect': ['view_projects', 'upload_blueprints', 'edit_designs'],
            'engineer': ['view_projects', 'upload_blueprints', 'create_calculations']
        };

        const userPermissions = permissions[this.currentUser.role] || [];
        return userPermissions.includes(permission);
    }
}

// Initialize AuthManager when script loads
window.authManager = new AuthManager();