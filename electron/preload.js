const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getDashboardData: () => ipcRenderer.invoke("get-dashboard-data"),
});