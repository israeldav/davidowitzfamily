const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("personBuilder", {
  pickMediaFiles: () => ipcRenderer.invoke("pick-media-files"),
  createPersonPage: (payload) => ipcRenderer.invoke("create-person-page", payload),
});
