const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  
  // Database operations
  getClients: () => ipcRenderer.invoke('db:getClients'),
  addClient: (clientData) => ipcRenderer.invoke('db:addClient', clientData),
  getMaterials: (industryId) => ipcRenderer.invoke('db:getMaterials', industryId),
  getLabor: (industryId) => ipcRenderer.invoke('db:getLabor', industryId),
  addMaterial: (materialData) => ipcRenderer.invoke('db:addMaterial', materialData),
  saveEstimate: (estimateData) => ipcRenderer.invoke('db:saveEstimate', estimateData),
  getEstimates: () => ipcRenderer.invoke('db:getEstimates'),
  getIndustries: () => ipcRenderer.invoke('db:getIndustries')
});