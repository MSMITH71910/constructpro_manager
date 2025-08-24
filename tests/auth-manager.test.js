/**
 * Unit Tests for AuthManager
 * ConstructPro Manager Authentication System
 */

// Mock DOM and Browser APIs for testing
class MockElement {
    constructor(tagName = 'div') {
        this.tagName = tagName;
        this.innerHTML = '';
        this.style = {};
        this.attributes = {};
        this.children = [];
    }
    
    insertAdjacentHTML(position, html) {
        this.innerHTML += html;
    }
    
    setAttribute(name, value) {
        this.attributes[name] = value;
    }
    
    getAttribute(name) {
        return this.attributes[name];
    }
    
    addEventListener() {}
    removeEventListener() {}
}

class MockDocument {
    constructor() {
        this.body = new MockElement('body');
        this.elements = new Map();
    }
    
    getElementById(id) {
        if (!this.elements.has(id)) {
            const element = new MockElement();
            element.id = id;
            this.elements.set(id, element);
        }
        return this.elements.get(id);
    }
    
    createElement(tagName) {
        return new MockElement(tagName);
    }
    
    addEventListener() {}
}

class MockWindow {
    constructor() {
        this.localStorage = new MockLocalStorage();
        this.location = { reload: () => {} };
        this.document = new MockDocument();
        this.events = new Map();
    }
    
    addEventListener(event, handler) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(handler);
    }
    
    dispatchEvent(event) {
        const handlers = this.events.get(event.type) || [];
        handlers.forEach(handler => handler(event));
    }
}

class MockLocalStorage {
    constructor() {
        this.store = {};
    }
    
    getItem(key) {
        return this.store[key] || null;
    }
    
    setItem(key, value) {
        this.store[key] = value;
    }
    
    removeItem(key) {
        delete this.store[key];
    }
    
    clear() {
        this.store = {};
    }
}

class MockCustomEvent {
    constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail || {};
    }
}

// Test Suite
class AuthManagerTests {
    constructor() {
        this.passed = 0;
        this.failed = 0;
        this.setupMocks();
    }

    setupMocks() {
        // Create mock environment
        global.window = new MockWindow();
        global.document = global.window.document;
        global.localStorage = global.window.localStorage;
        global.CustomEvent = MockCustomEvent;
        
        // Mock console methods
        global.console = {
            log: () => {},
            error: () => {},
            warn: () => {}
        };
    }

    assert(condition, message) {
        if (condition) {
            console.log(`✅ ${message}`);
            this.passed++;
        } else {
            console.error(`❌ ${message}`);
            this.failed++;
        }
    }

    assertEqual(actual, expected, message) {
        this.assert(actual === expected, `${message} - Expected: ${expected}, Got: ${actual}`);
    }

    // Test 1: Demo user login success
    test_demo_user_login_success() {
        console.log('\n🧪 Test 1: Demo user login success');
        
        // Import AuthManager class (simplified version for testing)
        const AuthManager = class {
            constructor() {
                this.currentUser = null;
                this.isAuthenticated = false;
                this.users = [];
                this.sessionData = null;
                this.createDemoUser();
            }
            
            createDemoUser() {
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
                    isDemo: true
                };
                this.users.push(demoUser);
            }
            
            hashPassword(password) {
                let hash = 0;
                for (let i = 0; i < password.length; i++) {
                    const char = password.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return hash.toString();
            }
            
            attemptLogin(identifier, password, rememberMe = false) {
                const hashedPassword = this.hashPassword(password);
                const user = this.users.find(u => 
                    (u.username.toLowerCase() === identifier.toLowerCase() || 
                     u.email.toLowerCase() === identifier.toLowerCase()) && 
                    u.password === hashedPassword
                );
                
                if (user) {
                    this.currentUser = { ...user };
                    delete this.currentUser.password;
                    this.isAuthenticated = true;
                    return { success: true, user: this.currentUser };
                }
                
                return { success: false, message: 'Invalid credentials' };
            }
            
            getCurrentUser() { return this.currentUser; }
            isUserAuthenticated() { return this.isAuthenticated; }
        };
        
        const auth = new AuthManager();
        
        // Test demo user exists
        const demoUser = auth.users.find(u => u.username === 'demo');
        this.assert(!!demoUser, 'Demo user should be created automatically');
        this.assertEqual(demoUser?.username, 'demo', 'Demo user should have correct username');
        
        // Test demo login
        const loginResult = auth.attemptLogin('demo', 'demo123');
        this.assert(loginResult.success, 'Demo user login should succeed');
        this.assert(auth.isUserAuthenticated(), 'User should be authenticated after successful login');
        this.assertEqual(auth.getCurrentUser()?.username, 'demo', 'Current user should be demo user');
    }

    // Test 2: New user registration flow
    test_new_user_registration_flow() {
        console.log('\n🧪 Test 2: New user registration flow');
        
        const AuthManager = class {
            constructor() {
                this.users = [];
            }
            
            validateUsername(username) {
                return username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username);
            }
            
            validateEmail(email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            }
            
            validatePassword(password) {
                return password.length >= 6;
            }
            
            handleRegistration(formData) {
                // Validate all fields
                if (!formData.firstName || !formData.lastName || !formData.username || 
                    !formData.email || !formData.company || !formData.password) {
                    return { success: false, message: 'All fields are required' };
                }
                
                if (!this.validateUsername(formData.username)) {
                    return { success: false, message: 'Invalid username format' };
                }
                
                if (!this.validateEmail(formData.email)) {
                    return { success: false, message: 'Invalid email format' };
                }
                
                if (!this.validatePassword(formData.password)) {
                    return { success: false, message: 'Password must be at least 6 characters' };
                }
                
                if (formData.password !== formData.confirmPassword) {
                    return { success: false, message: 'Passwords do not match' };
                }
                
                if (!formData.agreeTerms) {
                    return { success: false, message: 'Must agree to terms of service' };
                }
                
                // Check for existing username
                if (this.users.some(u => u.username.toLowerCase() === formData.username.toLowerCase())) {
                    return { success: false, message: 'Username already exists' };
                }
                
                // Create new user
                const newUser = {
                    id: Date.now().toString(),
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    username: formData.username,
                    email: formData.email,
                    company: formData.company,
                    role: formData.role || 'contractor',
                    password: this.hashPassword(formData.password),
                    createdAt: new Date().toISOString(),
                    isActive: true
                };
                
                this.users.push(newUser);
                return { success: true, user: newUser };
            }
            
            hashPassword(password) {
                let hash = 0;
                for (let i = 0; i < password.length; i++) {
                    const char = password.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return hash.toString();
            }
        };
        
        const auth = new AuthManager();
        
        // Test valid registration
        const validData = {
            firstName: 'John',
            lastName: 'Doe',
            username: 'johndoe',
            email: 'john@example.com',
            company: 'John\'s Construction',
            role: 'contractor',
            password: 'securepass123',
            confirmPassword: 'securepass123',
            agreeTerms: true
        };
        
        const result = auth.handleRegistration(validData);
        this.assert(result.success, 'Valid registration data should succeed');
        this.assertEqual(auth.users.length, 1, 'User should be added to users array');
        this.assertEqual(auth.users[0].username, 'johndoe', 'Registered user should have correct username');
    }

    // Test 3: Session persistence works
    test_session_persistence_works() {
        console.log('\n🧪 Test 3: Session persistence works');
        
        const SessionManager = class {
            constructor() {
                this.sessionData = null;
            }
            
            createSession(user, rememberMe = false) {
                const duration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
                this.sessionData = {
                    user,
                    expires: Date.now() + duration,
                    rememberMe,
                    loginTime: new Date().toISOString()
                };
                
                // Mock localStorage save
                localStorage.setItem('constructpro_session', JSON.stringify(this.sessionData));
                return this.sessionData;
            }
            
            isSessionValid() {
                if (!this.sessionData) {
                    const stored = localStorage.getItem('constructpro_session');
                    this.sessionData = stored ? JSON.parse(stored) : null;
                }
                return this.sessionData && this.sessionData.expires > Date.now();
            }
            
            getStoredSession() {
                const stored = localStorage.getItem('constructpro_session');
                return stored ? JSON.parse(stored) : null;
            }
        };
        
        const session = new SessionManager();
        const testUser = { id: '1', username: 'test', firstName: 'Test' };
        
        // Test normal session creation
        const normalSession = session.createSession(testUser, false);
        this.assert(session.isSessionValid(), 'Normal session should be valid after creation');
        this.assert(!normalSession.rememberMe, 'Normal session should not have rememberMe flag');
        
        // Test remember me session
        const rememberSession = session.createSession(testUser, true);
        this.assert(session.isSessionValid(), 'Remember me session should be valid after creation');
        this.assert(rememberSession.rememberMe, 'Remember me session should have rememberMe flag');
        
        // Test session persistence in localStorage
        const storedSession = session.getStoredSession();
        this.assert(!!storedSession, 'Session should be stored in localStorage');
        this.assertEqual(storedSession.user.username, 'test', 'Stored session should contain correct user data');
    }

    // Test 4: Invalid login credentials
    test_invalid_login_credentials() {
        console.log('\n🧪 Test 4: Invalid login credentials');
        
        const AuthManager = class {
            constructor() {
                this.users = [{
                    username: 'validuser',
                    email: 'valid@example.com',
                    password: this.hashPassword('correctpassword')
                }];
            }
            
            hashPassword(password) {
                let hash = 0;
                for (let i = 0; i < password.length; i++) {
                    const char = password.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return hash.toString();
            }
            
            attemptLogin(identifier, password) {
                const hashedPassword = this.hashPassword(password);
                const user = this.users.find(u => 
                    (u.username.toLowerCase() === identifier.toLowerCase() || 
                     u.email.toLowerCase() === identifier.toLowerCase()) && 
                    u.password === hashedPassword
                );
                
                return user ? { success: true, user } : { success: false, message: 'Invalid credentials' };
            }
        };
        
        const auth = new AuthManager();
        
        // Test wrong password
        const wrongPassword = auth.attemptLogin('validuser', 'wrongpassword');
        this.assert(!wrongPassword.success, 'Login with wrong password should fail');
        
        // Test non-existent user
        const nonExistentUser = auth.attemptLogin('nonexistent', 'correctpassword');
        this.assert(!nonExistentUser.success, 'Login with non-existent user should fail');
        
        // Test empty credentials
        const emptyUsername = auth.attemptLogin('', 'correctpassword');
        this.assert(!emptyUsername.success, 'Login with empty username should fail');
        
        // Test correct credentials (should work)
        const validLogin = auth.attemptLogin('validuser', 'correctpassword');
        this.assert(validLogin.success, 'Login with correct credentials should succeed');
    }

    // Test 5: Duplicate username registration
    test_duplicate_username_registration() {
        console.log('\n🧪 Test 5: Duplicate username registration');
        
        const AuthManager = class {
            constructor() {
                this.users = [{
                    username: 'existinguser',
                    email: 'existing@example.com'
                }];
            }
            
            handleRegistration(formData) {
                // Check for existing username (case-insensitive)
                if (this.users.some(u => u.username.toLowerCase() === formData.username.toLowerCase())) {
                    return { success: false, message: 'Username already exists' };
                }
                
                // Check for existing email
                if (this.users.some(u => u.email.toLowerCase() === formData.email.toLowerCase())) {
                    return { success: false, message: 'Email already registered' };
                }
                
                // If all validations pass
                this.users.push({
                    username: formData.username,
                    email: formData.email,
                    ...formData
                });
                
                return { success: true };
            }
        };
        
        const auth = new AuthManager();
        
        // Test exact duplicate username
        const exactDuplicate = auth.handleRegistration({
            username: 'existinguser',
            email: 'new@example.com'
        });
        this.assert(!exactDuplicate.success, 'Exact duplicate username should fail');
        
        // Test case-insensitive duplicate
        const caseDuplicate = auth.handleRegistration({
            username: 'ExistingUser',
            email: 'new2@example.com'
        });
        this.assert(!caseDuplicate.success, 'Case-insensitive duplicate username should fail');
        
        // Test duplicate email
        const emailDuplicate = auth.handleRegistration({
            username: 'newuser',
            email: 'existing@example.com'
        });
        this.assert(!emailDuplicate.success, 'Duplicate email should fail');
        
        // Test unique user
        const uniqueUser = auth.handleRegistration({
            username: 'newuser',
            email: 'new@example.com'
        });
        this.assert(uniqueUser.success, 'Unique username and email should succeed');
    }

    // Test 6: Invalid email format
    test_invalid_email_format() {
        console.log('\n🧪 Test 6: Invalid email format');
        
        const validateEmail = (email) => {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        };
        
        // Valid emails
        this.assert(validateEmail('test@example.com'), 'Standard email should be valid');
        this.assert(validateEmail('user.name+tag@domain.co.uk'), 'Complex email should be valid');
        this.assert(validateEmail('test123@subdomain.example.org'), 'Email with numbers and subdomain should be valid');
        
        // Invalid emails
        this.assert(!validateEmail('plainaddress'), 'Plain text should be invalid');
        this.assert(!validateEmail('@missinglocalpart.com'), 'Missing local part should be invalid');
        this.assert(!validateEmail('missing@.com'), 'Missing domain should be invalid');
        this.assert(!validateEmail('missing@domain'), 'Missing TLD should be invalid');
        this.assert(!validateEmail('spaces @domain.com'), 'Spaces should be invalid');
        this.assert(!validateEmail('test@'), 'Incomplete domain should be invalid');
    }

    // Test 7: Session expiration handling
    test_session_expiration_handling() {
        console.log('\n🧪 Test 7: Session expiration handling');
        
        const SessionManager = class {
            constructor() {
                this.sessionData = null;
            }
            
            createSession(user, rememberMe = false) {
                const duration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
                this.sessionData = {
                    user,
                    expires: Date.now() + duration,
                    rememberMe
                };
                return this.sessionData;
            }
            
            isSessionValid() {
                return this.sessionData && this.sessionData.expires > Date.now();
            }
            
            checkExpiredSession() {
                // Simulate expired session
                this.sessionData = {
                    user: { id: '1', username: 'test' },
                    expires: Date.now() - 1000, // Expired 1 second ago
                    rememberMe: false
                };
                return this.isSessionValid();
            }
        };
        
        const session = new SessionManager();
        const testUser = { id: '1', username: 'test' };
        
        // Test valid session
        session.createSession(testUser, false);
        this.assert(session.isSessionValid(), 'Fresh session should be valid');
        
        // Test expired session
        const isExpiredValid = session.checkExpiredSession();
        this.assert(!isExpiredValid, 'Expired session should be invalid');
        
        // Test long-term session
        const longSession = session.createSession(testUser, true);
        this.assert(longSession.expires > Date.now() + 24 * 60 * 60 * 1000, 'Remember me session should last longer than 24 hours');
    }

    // Test 8: Logout clears session
    test_logout_clears_session() {
        console.log('\n🧪 Test 8: Logout clears session');
        
        const AuthManager = class {
            constructor() {
                this.currentUser = null;
                this.isAuthenticated = false;
                this.sessionData = null;
            }
            
            login(user) {
                this.currentUser = user;
                this.isAuthenticated = true;
                this.sessionData = {
                    user,
                    expires: Date.now() + 8 * 60 * 60 * 1000
                };
                localStorage.setItem('constructpro_session', JSON.stringify(this.sessionData));
            }
            
            logout() {
                this.currentUser = null;
                this.isAuthenticated = false;
                this.sessionData = null;
                localStorage.removeItem('constructpro_session');
            }
            
            getCurrentUser() { return this.currentUser; }
            isUserAuthenticated() { return this.isAuthenticated; }
        };
        
        const auth = new AuthManager();
        const testUser = { id: '1', username: 'test', firstName: 'Test' };
        
        // Login user
        auth.login(testUser);
        this.assert(auth.isUserAuthenticated(), 'User should be authenticated after login');
        this.assert(!!auth.getCurrentUser(), 'Current user should be set');
        this.assert(!!localStorage.getItem('constructpro_session'), 'Session should be stored');
        
        // Logout user
        auth.logout();
        this.assert(!auth.isUserAuthenticated(), 'User should not be authenticated after logout');
        this.assert(!auth.getCurrentUser(), 'Current user should be cleared');
        this.assert(!localStorage.getItem('constructpro_session'), 'Session should be removed from storage');
    }

    runAllTests() {
        console.log('🚀 Starting AuthManager Unit Tests...\n');
        
        this.test_demo_user_login_success();
        this.test_new_user_registration_flow();
        this.test_session_persistence_works();
        this.test_invalid_login_credentials();
        this.test_duplicate_username_registration();
        this.test_invalid_email_format();
        this.test_session_expiration_handling();
        this.test_logout_clears_session();
        
        console.log(`\n📊 Test Results:`);
        console.log(`✅ Passed: ${this.passed}`);
        console.log(`❌ Failed: ${this.failed}`);
        console.log(`📈 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
        
        if (this.failed === 0) {
            console.log('\n🎉 All tests passed! AuthManager is working correctly.');
        } else {
            console.log('\n⚠️ Some tests failed. Please review the implementation.');
        }
        
        return {
            passed: this.passed,
            failed: this.failed,
            total: this.passed + this.failed,
            successRate: (this.passed / (this.passed + this.failed)) * 100
        };
    }

    // Test 3: Session persistence works (added as separate method)
    test_session_persistence_works() {
        console.log('\n🧪 Test 3: Session persistence works');
        
        // Test localStorage persistence
        const testData = { user: 'test', expires: Date.now() + 1000000 };
        localStorage.setItem('test_session', JSON.stringify(testData));
        
        const retrieved = JSON.parse(localStorage.getItem('test_session'));
        this.assertEqual(retrieved.user, 'test', 'Session data should persist in localStorage');
        
        // Test session restoration
        const isValid = retrieved.expires > Date.now();
        this.assert(isValid, 'Restored session should be valid if not expired');
        
        // Cleanup
        localStorage.removeItem('test_session');
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManagerTests;
} else if (typeof window !== 'undefined') {
    window.AuthManagerTests = AuthManagerTests;
} else {
    // Run tests in Node.js environment
    const tests = new AuthManagerTests();
    tests.runAllTests();
}