/**
 * Integration Tests for ConstructPro Manager Application
 * Tests the main application flow and user interactions
 */

// Mock DOM environment
const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs');

// Set up DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// Mock bootstrap
global.bootstrap = {
    Modal: jest.fn().mockImplementation(() => ({
        show: jest.fn(),
        hide: jest.fn()
    }))
};

// Mock localStorage
Object.defineProperty(dom.window, 'localStorage', {
    value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        clear: jest.fn()
    },
    writable: true
});

// Mock electronAPI
global.window.electronAPI = {
    invoke: jest.fn()
};

describe('ConstructPro Manager Integration Tests', () => {
    let appModule;
    let ConstructProApp;

    beforeAll(() => {
        // Mock HTML elements that the app expects
        document.body.innerHTML = `
            <div id="industrySelect"></div>
            <div id="mainContent"></div>
            <div id="sidebarContent"></div>
            <div class="nav-btn" data-module="dashboard"></div>
            <div class="nav-btn" data-module="clients"></div>
            <div class="nav-btn" data-module="estimates"></div>
        `;

        // Load the app module (we'll need to modify this to work in test env)
        const appCode = fs.readFileSync(
            path.join(__dirname, '../src/renderer/app.js'), 
            'utf8'
        );
        
        // Execute the app code in our mocked environment
        eval(appCode);
        ConstructProApp = global.ConstructProApp;
    });

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Mock default API responses
        window.electronAPI.invoke.mockImplementation((channel, data) => {
            switch(channel) {
                case 'db:getIndustries':
                    return Promise.resolve([
                        { id: 1, name: 'General Contractor' },
                        { id: 2, name: 'Heavy Equipment' }
                    ]);
                case 'db:getClients':
                    return Promise.resolve([
                        { id: 1, name: 'Test Client', phone: '123-456-7890', email: 'test@example.com' }
                    ]);
                case 'db:getEstimates':
                    return Promise.resolve([
                        { id: 1, project_name: 'Test Project', total_amount: 1000, status: 'draft' }
                    ]);
                default:
                    return Promise.resolve([]);
            }
        });
    });

    describe('Happy Path Tests', () => {
        test('App initialization successful', async () => {
            // Mock DOM elements
            const industrySelect = document.createElement('select');
            industrySelect.id = 'industrySelect';
            document.body.appendChild(industrySelect);

            const app = new ConstructProApp();
            
            // Wait for initialization
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(window.electronAPI.invoke).toHaveBeenCalledWith('db:getIndustries');
            expect(app.currentModule).toBe('dashboard');
        });

        test('Navigation between modules works', () => {
            const app = new ConstructProApp();
            
            // Test navigation to clients module
            app.loadModule('clients');
            expect(app.currentModule).toBe('clients');
            
            // Test navigation to estimates module  
            app.loadModule('estimates');
            expect(app.currentModule).toBe('estimates');
            
            // Test navigation back to dashboard
            app.loadModule('dashboard');
            expect(app.currentModule).toBe('dashboard');
        });

        test('Dashboard displays statistics', async () => {
            const app = new ConstructProApp();
            
            // Create mock DOM elements for dashboard
            document.getElementById('mainContent').innerHTML = `
                <span id="totalClients">Loading...</span>
                <span id="totalEstimates">Loading...</span>
            `;

            await app.loadDashboardData();

            expect(window.electronAPI.invoke).toHaveBeenCalledWith('db:getClients');
            expect(window.electronAPI.invoke).toHaveBeenCalledWith('db:getEstimates');
        });

        test('Client creation flow', async () => {
            const app = new ConstructProApp();
            
            const mockClientData = {
                name: 'Test Client',
                contact_info: 'John Doe',
                phone: '123-456-7890',
                email: 'test@example.com',
                industry_id: 1
            };

            window.electronAPI.invoke.mockResolvedValueOnce(1); // Mock successful save

            // Create mock form
            const form = document.createElement('form');
            form.id = 'addClientForm';
            Object.keys(mockClientData).forEach(key => {
                const input = document.createElement('input');
                input.name = key;
                input.value = mockClientData[key];
                form.appendChild(input);
            });
            document.body.appendChild(form);

            await app.saveClient();

            expect(window.electronAPI.invoke).toHaveBeenCalledWith('db:addClient', expect.objectContaining({
                name: 'Test Client',
                phone: '123-456-7890'
            }));
        });
    });

    describe('Input Verification Tests', () => {
        test('Invalid industry selection', () => {
            const app = new ConstructProApp();
            
            // Test with invalid industry ID
            const industrySelect = document.createElement('select');
            industrySelect.value = 'invalid';
            
            const event = { target: industrySelect };
            
            // This should handle gracefully without throwing
            expect(() => {
                app.setupEventListeners();
                // Simulate industry change event
                industrySelect.dispatchEvent(new dom.window.Event('change'));
            }).not.toThrow();
        });

        test('Empty client form submission', async () => {
            const app = new ConstructProApp();
            
            // Create empty form
            const form = document.createElement('form');
            form.id = 'addClientForm';
            const nameInput = document.createElement('input');
            nameInput.name = 'name';
            nameInput.value = ''; // Empty name
            form.appendChild(nameInput);
            document.body.appendChild(form);

            // Mock the showAlert method
            app.showAlert = jest.fn();

            await app.saveClient();

            // Should handle empty form gracefully
            expect(app.showAlert).toHaveBeenCalledWith('danger', expect.any(String));
        });
    });

    describe('Exception Handling Tests', () => {
        test('Database connection failure', async () => {
            const app = new ConstructProApp();
            
            // Mock database failure
            window.electronAPI.invoke.mockRejectedValueOnce(new Error('Database connection failed'));
            
            app.showAlert = jest.fn();
            
            try {
                await app.loadDashboardData();
            } catch (error) {
                // Should handle the error gracefully
            }

            // Should not crash the application
            expect(app.currentModule).toBeDefined();
        });

        test('Module loading error handling', () => {
            const app = new ConstructProApp();
            
            // Test loading invalid module
            expect(() => {
                app.loadModule('invalidModule');
            }).not.toThrow();
            
            // Should default to dashboard
            expect(app.currentModule).toBe('dashboard');
        });
    });

    describe('UI Interaction Tests', () => {
        test('Industry selection updates application state', () => {
            const app = new ConstructProApp();
            
            const select = document.createElement('select');
            select.id = 'industrySelect';
            select.value = '2';
            document.body.appendChild(select);
            
            // Simulate change event
            const changeEvent = new dom.window.Event('change');
            Object.defineProperty(changeEvent, 'target', {
                value: select,
                enumerable: true
            });
            
            select.dispatchEvent(changeEvent);
            
            expect(window.localStorage.setItem).toHaveBeenCalledWith('selectedIndustry', '2');
        });

        test('Modal cleanup works correctly', () => {
            const app = new ConstructProApp();
            
            // Mock modal creation and cleanup
            const modal = document.createElement('div');
            modal.id = 'addClientModal';
            modal.remove = jest.fn();
            document.body.appendChild(modal);
            
            // Test modal cleanup
            const hiddenEvent = new dom.window.Event('hidden.bs.modal');
            modal.dispatchEvent(hiddenEvent);
            
            // Modal should be removed after hiding
            expect(modal.remove).toHaveBeenCalled();
        });
    });

    describe('Data Flow Tests', () => {
        test('Estimate calculation updates correctly', () => {
            // This would test the EstimateBuilder integration
            const app = new ConstructProApp();
            
            // Mock estimate builder
            global.estimateBuilder = {
                calculateItemCost: jest.fn(),
                addItemToEstimate: jest.fn()
            };
            
            app.calculateTotalCost();
            app.addToEstimate();
            
            expect(estimateBuilder.calculateItemCost).toHaveBeenCalled();
            expect(estimateBuilder.addItemToEstimate).toHaveBeenCalled();
        });

        test('Alert system works properly', (done) => {
            const app = new ConstructProApp();
            
            app.showAlert('success', 'Test message');
            
            // Check that alert was added to DOM
            setTimeout(() => {
                const alert = document.querySelector('.alert');
                expect(alert).toBeTruthy();
                expect(alert.textContent).toContain('Test message');
                done();
            }, 100);
        });
    });
});