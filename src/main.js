const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const DatabaseManager = require('./database/DatabaseManager');

class ConstructProApp {
  constructor() {
    this.mainWindow = null;
    this.dbManager = null;
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      show: false
    });

    this.mainWindow.loadFile('src/renderer/index.html');

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
      this.mainWindow.webContents.openDevTools();
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  async initialize() {
    try {
      // Initialize database
      this.dbManager = new DatabaseManager();
      await this.dbManager.initialize();
      
      // Set up IPC handlers
      this.setupIpcHandlers();
      
      console.log('ConstructPro Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ConstructPro Manager:', error);
    }
  }

  setupIpcHandlers() {
    // Database operations
    ipcMain.handle('db:getClients', async () => {
      return await this.dbManager.getClients();
    });

    ipcMain.handle('db:addClient', async (event, clientData) => {
      return await this.dbManager.addClient(clientData);
    });

    ipcMain.handle('db:getMaterials', async (event, industryId) => {
      return await this.dbManager.getMaterials(industryId);
    });

    ipcMain.handle('db:addMaterial', async (event, materialData) => {
      return await this.dbManager.addMaterial(materialData);
    });

    ipcMain.handle('db:saveEstimate', async (event, estimateData) => {
      return await this.dbManager.saveEstimate(estimateData);
    });

    ipcMain.handle('db:getEstimates', async () => {
      return await this.dbManager.getEstimates();
    });

    ipcMain.handle('db:getIndustries', async () => {
      return await this.dbManager.getIndustries();
    });

    ipcMain.handle('db:getLabor', async (event, industryId) => {
      return await this.dbManager.getLabor(industryId);
    });
  }
}

const constructProApp = new ConstructProApp();

app.whenReady().then(async () => {
  await constructProApp.initialize();
  constructProApp.createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      constructProApp.createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

module.exports = ConstructProApp;