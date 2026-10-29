import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('qishi', {
  desktop: true,
  get: () => ipcRenderer.invoke('state:get'),
  dispatch: (action: unknown) => ipcRenderer.invoke('state:dispatch', action),
  subscribe: (callback: (state: unknown) => void) => {
    const fn = (_: unknown, state: unknown) => callback(state);
    ipcRenderer.on('state:update', fn);
    return () => ipcRenderer.removeListener('state:update', fn);
  },
  onNotice: (callback: (text: string) => void) => {
    const fn = (_: unknown, text: string) => callback(text);
    ipcRenderer.on('notice', fn);
    return () => ipcRenderer.removeListener('notice', fn);
  },
  onMini: (callback: (mini: boolean) => void) => {
    const fn = (_: unknown, mini: boolean) => callback(mini);
    ipcRenderer.on('mini', fn);
    return () => ipcRenderer.removeListener('mini', fn);
  },
  window: (action: string) => ipcRenderer.invoke('window:action', action),
  exportData: (format: string) => ipcRenderer.invoke('data:export', format),
  importData: () => ipcRenderer.invoke('data:import'),
  openDataFolder: () => ipcRenderer.invoke('data:folder'),
  info: () => ipcRenderer.invoke('app:info'),
});
