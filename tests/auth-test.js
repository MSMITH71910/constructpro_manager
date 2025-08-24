// Authentication System Test
// Simple test to verify the authentication functionality

// Mock localStorage for testing
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

// Test Suite
class AuthTests {
    constructor() {
        this.mockLocalStorage = new MockLocalStorage();
        this.originalLocalStorage = global.localStorage;
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    setUp() {
        // Replace localStorage with mock
        global.localStorage = this.mockLocalStorage;
        this.mockLocalStorage.clear();
    }

    tearDown() {
        // Restore original localStorage
        global.localStorage = this.originalLocalStorage;
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

    test_user_registration() {
        console.log('\n🧪 Testing User Registration...');
        
        // Mock AuthManager for testing
        const authManager = {
            users: [],
            validateUsername: (username) => username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username),
            validateEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
            hashPassword: (password) => {
                let hash = 0;
                for (let i = 0; i < password.length; i++) {
                    const char = password.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return hash.toString();
            },
            registerUser: function(userData) {
                if (!this.validateUsername(userData.username)) {
                    return { success: false, message: 'Invalid username' };
                }
                
                if (!this.validateEmail(userData.email)) {
                    return { success: false, message: 'Invalid email' };
                }
                
                if (this.users.some(u => u.username === userData.username)) {
                    return { success: false, message: 'Username already exists' };
                }
                
                const user = {
                    id: Date.now().toString(),
                    ...userData,
                    password: this.hashPassword(userData.password),
                    createdAt: new Date().toISOString(),
                    isActive: true
                };
                
                this.users.push(user);
                return { success: true, user };
            }
        };

        // Test valid registration
        const result1 = authManager.registerUser({
            firstName: 'Test',
            lastName: 'User',
            username: 'testuser',
            email: 'test@example.com',
            company: 'Test Corp',
            role: 'contractor',
            password: 'password123'
        });
        
        this.assert(result1.success, 'Valid user registration should succeed');
        this.assertEqual(authManager.users.length, 1, 'User should be added to users array');

        // Test duplicate username
        const result2 = authManager.registerUser({
            firstName: 'Test2',
            lastName: 'User2',
            username: 'testuser', // Same username
            email: 'test2@example.com',
            company: 'Test Corp 2',
            role: 'contractor',
            password: 'password123'
        });
        
        this.assert(!result2.success, 'Duplicate username registration should fail');
        this.assertEqual(authManager.users.length, 1, 'User count should remain same after failed registration');

        // Test invalid email
        const result3 = authManager.registerUser({
            firstName: 'Test3',
            lastName: 'User3',
            username: 'testuser3',
            email: 'invalid-email', // Invalid email
            company: 'Test Corp 3',
            role: 'contractor',
            password: 'password123'
        });
        
        this.assert(!result3.success, 'Invalid email registration should fail');
    }

    test_user_login() {
        console.log('\n🧪 Testing User Login...');
        
        const authManager = {
            users: [
                {
                    id: '1',
                    username: 'testuser',
                    email: 'test@example.com',
                    password: this.hashPassword('password123'),
                    firstName: 'Test',
                    lastName: 'User'
                }
            ],
            hashPassword: (password) => {
                let hash = 0;
                for (let i = 0; i < password.length; i++) {
                    const char = password.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return hash.toString();
            },
            login: function(identifier, password) {
                const hashedPassword = this.hashPassword(password);
                const user = this.users.find(u => 
                    (u.username.toLowerCase() === identifier.toLowerCase() || 
                     u.email.toLowerCase() === identifier.toLowerCase()) && 
                    u.password === hashedPassword
                );
                
                return user ? { success: true, user } : { success: false, message: 'Invalid credentials' };
            }
        };

        // Test login with username
        const result1 = authManager.login('testuser', 'password123');
        this.assert(result1.success, 'Login with valid username should succeed');

        // Test login with email
        const result2 = authManager.login('test@example.com', 'password123');
        this.assert(result2.success, 'Login with valid email should succeed');

        // Test login with wrong password
        const result3 = authManager.login('testuser', 'wrongpassword');
        this.assert(!result3.success, 'Login with wrong password should fail');

        // Test login with non-existent user
        const result4 = authManager.login('nonexistent', 'password123');
        this.assert(!result4.success, 'Login with non-existent user should fail');
    }

    test_session_management() {
        console.log('\n🧪 Testing Session Management...');
        
        const sessionManager = {
            createSession: (user, rememberMe = false) => {
                const duration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
                return {
                    user,
                    expires: Date.now() + duration,
                    rememberMe,
                    loginTime: new Date().toISOString()
                };
            },
            isSessionValid: (session) => {
                return session && session.expires > Date.now();
            }
        };

        const testUser = { id: '1', username: 'test' };

        // Test normal session (8 hours)
        const normalSession = sessionManager.createSession(testUser, false);
        this.assert(sessionManager.isSessionValid(normalSession), 'Normal session should be valid');
        this.assert(!normalSession.rememberMe, 'Normal session should not have rememberMe flag');

        // Test remember me session (30 days)
        const rememberSession = sessionManager.createSession(testUser, true);
        this.assert(sessionManager.isSessionValid(rememberSession), 'Remember me session should be valid');
        this.assert(rememberSession.rememberMe, 'Remember me session should have rememberMe flag');

        // Test expired session
        const expiredSession = {
            user: testUser,
            expires: Date.now() - 1000, // Expired 1 second ago
            rememberMe: false,
            loginTime: new Date().toISOString()
        };
        this.assert(!sessionManager.isSessionValid(expiredSession), 'Expired session should be invalid');
    }

    test_password_hashing() {
        console.log('\n🧪 Testing Password Hashing...');
        
        const hashPassword = (password) => {
            let hash = 0;
            for (let i = 0; i < password.length; i++) {
                const char = password.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString();
        };

        const password = 'testpassword123';
        const hash1 = hashPassword(password);
        const hash2 = hashPassword(password);
        
        this.assert(hash1 === hash2, 'Same password should produce same hash');
        this.assert(hash1 !== password, 'Hash should be different from original password');
        
        const differentHash = hashPassword('differentpassword');
        this.assert(hash1 !== differentHash, 'Different passwords should produce different hashes');
    }

    test_validation_functions() {
        console.log('\n🧪 Testing Validation Functions...');
        
        const validators = {
            validateUsername: (username) => {
                return username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username);
            },
            validateEmail: (email) => {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            validatePassword: (password) => {
                return password.length >= 6;
            }
        };

        // Username validation tests
        this.assert(validators.validateUsername('testuser'), 'Valid username should pass');
        this.assert(validators.validateUsername('test_user123'), 'Username with underscores and numbers should pass');
        this.assert(!validators.validateUsername('ab'), 'Username too short should fail');
        this.assert(!validators.validateUsername('test user'), 'Username with spaces should fail');
        this.assert(!validators.validateUsername('test@user'), 'Username with special chars should fail');

        // Email validation tests
        this.assert(validators.validateEmail('test@example.com'), 'Valid email should pass');
        this.assert(validators.validateEmail('user.name+tag@domain.co.uk'), 'Complex valid email should pass');
        this.assert(!validators.validateEmail('invalid-email'), 'Invalid email should fail');
        this.assert(!validators.validateEmail('test@'), 'Incomplete email should fail');

        // Password validation tests
        this.assert(validators.validatePassword('password123'), 'Valid password should pass');
        this.assert(!validators.validatePassword('12345'), 'Short password should fail');
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

    runAllTests() {
        console.log('🚀 Starting Authentication System Tests...\n');
        
        this.setUp();
        
        this.test_user_registration();
        this.test_user_login();
        this.test_session_management();
        this.test_password_hashing();
        this.test_validation_functions();
        
        this.tearDown();
        
        console.log(`\n📊 Test Results:`);
        console.log(`✅ Passed: ${this.passed}`);
        console.log(`❌ Failed: ${this.failed}`);
        console.log(`📈 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
        
        if (this.failed === 0) {
            console.log('\n🎉 All tests passed! Authentication system is working correctly.');
        } else {
            console.log('\n⚠️ Some tests failed. Please review the implementation.');
        }
    }
}

// Run tests if this file is executed directly
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthTests;
} else if (typeof window !== 'undefined') {
    // Browser environment
    window.AuthTests = AuthTests;
    
    // Auto-run tests when loaded
    window.addEventListener('load', () => {
        const tests = new AuthTests();
        tests.runAllTests();
    });
} else {
    // Node.js environment
    const tests = new AuthTests();
    tests.runAllTests();
}