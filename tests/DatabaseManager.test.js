const DatabaseManager = require('../src/database/DatabaseManager');
const { app } = require('electron');
const path = require('path');

// Mock Electron's app.getPath
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-app-data')
  }
}));

describe('DatabaseManager', () => {
  let dbManager;

  beforeEach(() => {
    dbManager = new DatabaseManager();
  });

  afterEach(async () => {
    if (dbManager && dbManager.db) {
      dbManager.close();
    }
  });

  describe('Constructor', () => {
    test('should initialize with correct database path', () => {
      expect(dbManager.dbPath).toBe('/tmp/test-app-data/constructpro.db');
    });

    test('should initialize with null database connection', () => {
      expect(dbManager.db).toBeNull();
    });
  });

  describe('Database Path', () => {
    test('should set database path using Electron app userData', () => {
      const expectedPath = path.join('/tmp/test-app-data', 'constructpro.db');
      expect(dbManager.dbPath).toBe(expectedPath);
    });
  });

  describe('Helper Methods', () => {
    test('runQuery should be a function', () => {
      expect(typeof dbManager.runQuery).toBe('function');
    });

    test('getQuery should be a function', () => {
      expect(typeof dbManager.getQuery).toBe('function');
    });

    test('allQuery should be a function', () => {
      expect(typeof dbManager.allQuery).toBe('function');
    });
  });

  describe('Business Logic Methods', () => {
    test('should have getIndustries method', () => {
      expect(typeof dbManager.getIndustries).toBe('function');
    });

    test('should have getClients method', () => {
      expect(typeof dbManager.getClients).toBe('function');
    });

    test('should have addClient method', () => {
      expect(typeof dbManager.addClient).toBe('function');
    });

    test('should have getMaterials method', () => {
      expect(typeof dbManager.getMaterials).toBe('function');
    });

    test('should have getLabor method', () => {
      expect(typeof dbManager.getLabor).toBe('function');
    });

    test('should have addMaterial method', () => {
      expect(typeof dbManager.addMaterial).toBe('function');
    });

    test('should have saveEstimate method', () => {
      expect(typeof dbManager.saveEstimate).toBe('function');
    });

    test('should have getEstimates method', () => {
      expect(typeof dbManager.getEstimates).toBe('function');
    });
  });
});