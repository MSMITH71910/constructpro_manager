const ConstructProApp = require('../src/main');

// Mock Electron modules
jest.mock('electron', () => ({
  app: {
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    getPath: jest.fn(() => '/tmp/test-app-data'),
    quit: jest.fn()
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    webContents: {
      openDevTools: jest.fn()
    },
    on: jest.fn()
  })),
  ipcMain: {
    handle: jest.fn()
  }
}));

// Mock DatabaseManager
jest.mock('../src/database/DatabaseManager', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: jest.fn(() => Promise.resolve()),
    getClients: jest.fn(() => Promise.resolve([])),
    addClient: jest.fn(() => Promise.resolve(1)),
    getMaterials: jest.fn(() => Promise.resolve([])),
    addMaterial: jest.fn(() => Promise.resolve(1)),
    saveEstimate: jest.fn(() => Promise.resolve(1)),
    getEstimates: jest.fn(() => Promise.resolve([])),
    getIndustries: jest.fn(() => Promise.resolve([
      { id: 1, name: 'General Contractor' },
      { id: 2, name: 'Heavy Equipment' }
    ]))
  }));
});

describe('ConstructProApp', () => {
  let app;

  beforeEach(() => {
    app = new ConstructProApp();
  });

  describe('Constructor', () => {
    test('should initialize with null mainWindow', () => {
      expect(app.mainWindow).toBeNull();
    });

    test('should initialize with null dbManager', () => {
      expect(app.dbManager).toBeNull();
    });
  });

  describe('Methods', () => {
    test('should have createWindow method', () => {
      expect(typeof app.createWindow).toBe('function');
    });

    test('should have initialize method', () => {
      expect(typeof app.initialize).toBe('function');
    });

    test('should have setupIpcHandlers method', () => {
      expect(typeof app.setupIpcHandlers).toBe('function');
    });
  });

  describe('Window Creation', () => {
    test('createWindow should create BrowserWindow with correct options', () => {
      const { BrowserWindow } = require('electron');
      
      app.createWindow();

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1200,
          height: 800,
          webPreferences: expect.objectContaining({
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
          })
        })
      );
    });
  });

  describe('Initialization', () => {
    test('initialize should create database manager', async () => {
      const DatabaseManager = require('../src/database/DatabaseManager');
      
      await app.initialize();

      expect(DatabaseManager).toHaveBeenCalled();
      expect(app.dbManager).toBeDefined();
    });

    test('initialize should call setupIpcHandlers', async () => {
      const spy = jest.spyOn(app, 'setupIpcHandlers');
      
      await app.initialize();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('IPC Handlers', () => {
    test('setupIpcHandlers should register all required handlers', () => {
      const { ipcMain } = require('electron');
      
      app.setupIpcHandlers();

      // Check that handle was called for each IPC channel
      expect(ipcMain.handle).toHaveBeenCalledWith('db:getClients', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('db:addClient', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('db:getMaterials', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('db:addMaterial', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('db:saveEstimate', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('db:getEstimates', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('db:getIndustries', expect.any(Function));
    });
  });
});