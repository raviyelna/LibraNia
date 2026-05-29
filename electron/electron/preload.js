import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    log: (entry) => ipcRenderer.send('log:write', entry),
    logError: (error) => ipcRenderer.invoke('log:error', error),
    openLogsDirectory: () => ipcRenderer.invoke('logs:open'),
    reloadApp: () => ipcRenderer.send('app:reload'),
    on: (channel, callback) => {
        ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    },
    off: (channel, callback) => {
        ipcRenderer.removeListener(channel, callback);
    },
});
contextBridge.exposeInMainWorld('api', {
    config: {
        get: () => ipcRenderer.invoke('config:get'),
        set: (key, value) => ipcRenderer.invoke('config:set', key, value),
        update: (updates) => ipcRenderer.invoke('config:update', updates),
        setEnvVar: (key, value) => ipcRenderer.invoke('config:setEnvVar', { key, value }),
    },
    getConfig: () => ipcRenderer.invoke('config:get'),
    setConfig: (key, value) => ipcRenderer.invoke('config:set', key, value),
    updateConfig: (updates) => ipcRenderer.invoke('config:update', updates),
    switchMode: (mode) => ipcRenderer.invoke('mode:switch', mode),
    minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
    maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
    closeWindow: () => ipcRenderer.invoke('window:close'),
    restartApp: () => ipcRenderer.invoke('app:restart'),
    logError: (error) => ipcRenderer.invoke('log:error', error),
    tags: {
        getAll: () => ipcRenderer.invoke('tags:getAll'),
        create: (name) => ipcRenderer.invoke('tags:create', { name }),
        delete: (id) => ipcRenderer.invoke('tags:delete', { id }),
        rename: (id, name) => ipcRenderer.invoke('tags:rename', { id, name }),
        addToNote: (noteId, tagNames) => ipcRenderer.invoke('tags:addToNote', { noteId, tagNames }),
        removeFromNote: (noteId, tagId) => ipcRenderer.invoke('tags:removeFromNote', { noteId, tagId }),
        getForNote: (noteId) => ipcRenderer.invoke('tags:getForNote', { noteId }),
        getNotesByTag: (tagId) => ipcRenderer.invoke('tags:getNotesByTag', { tagId }),
        setForNote: (noteId, tagNames) => ipcRenderer.invoke('tags:setForNote', { noteId, tagNames }),
    },
    notes: {
        create: (data) => ipcRenderer.invoke('notes:create', data),
        update: (data) => ipcRenderer.invoke('notes:update', data),
        delete: (id, hard) => ipcRenderer.invoke('notes:delete', { id, hard }),
        restore: (id) => ipcRenderer.invoke('notes:restore', { id }),
        getById: (id, includeDeleted) => ipcRenderer.invoke('notes:getById', { id, includeDeleted }),
        getAll: () => ipcRenderer.invoke('notes:getAll'),
        getDeleted: () => ipcRenderer.invoke('notes:getDeleted'),
        syncFilesystemToDb: () => ipcRenderer.invoke('notes:syncFilesystemToDb'),
        onCreated: (callback) => {
            const listener = (_event, note) => callback(note);
            ipcRenderer.on('notes:created', listener);
            return () => ipcRenderer.removeListener('notes:created', listener);
        },
        onUpdated: (callback) => {
            const listener = (_event, note) => callback(note);
            ipcRenderer.on('notes:updated', listener);
            return () => ipcRenderer.removeListener('notes:updated', listener);
        },
    },
    links: {
        getBacklinks: (noteId) => ipcRenderer.invoke('links:getBacklinks', { noteId }),
        getSemanticLinks: (noteId) => ipcRenderer.invoke('links:getSemanticLinks', { noteId }),
    },
    search: {
        quickNav: (query) => ipcRenderer.invoke('search:quickNav', { query }),
        fullText: (query) => ipcRenderer.invoke('search:fullText', { query }),
        fuzzy: (query) => ipcRenderer.invoke('search:fuzzy', { query }),
        semantic: (query) => ipcRenderer.invoke('search:semantic', { query }),
    },
    export: {
        selectDirectory: () => ipcRenderer.invoke('export:selectDirectory'),
        selectFile: (defaultName) => ipcRenderer.invoke('export:selectFile', { defaultName }),
        markdown: (noteIds, directory) => ipcRenderer.invoke('export:markdown', { noteIds, directory }),
        json: (noteIds, filePath) => ipcRenderer.invoke('export:json', { noteIds, filePath }),
    },
    chat: {
        send: (data) => ipcRenderer.invoke('chat:send', data),
        summarizeNote: (noteId) => ipcRenderer.invoke('chat:summarizeNote', { noteId }),
        onToken: (callback) => {
            const listener = (_event, data) => callback(data);
            ipcRenderer.on('chat:token', listener);
            return () => ipcRenderer.removeListener('chat:token', listener);
        },
        offToken: (callback) => {
            ipcRenderer.removeListener('chat:token', callback);
        },
    },
    conversation: {
        create: (data) => ipcRenderer.invoke('conversation:create', data),
        getAll: () => ipcRenderer.invoke('conversation:getAll'),
        get: (conversationId) => ipcRenderer.invoke('conversation:get', { conversationId }),
        delete: (conversationId) => ipcRenderer.invoke('conversation:delete', { conversationId }),
        rename: (conversationId, title) => ipcRenderer.invoke('conversation:rename', { conversationId, title }),
    },
    providers: {
        setConfig: (config) => ipcRenderer.invoke('provider:setConfig', config),
        getConfig: (providerId) => ipcRenderer.invoke('provider:getConfig', { providerId }),
        getAllConfigs: () => ipcRenderer.invoke('provider:getAllConfigs'),
        deleteConfig: (providerId) => ipcRenderer.invoke('provider:deleteConfig', { providerId }),
        validate: (providerId, apiKey, baseURL) => ipcRenderer.invoke('provider:validate', { providerId, apiKey, baseURL }),
    },
    content: {
        upload: () => ipcRenderer.invoke('content:upload'),
        saveImage: (data) => ipcRenderer.invoke('content:saveImage', data),
        create: (data) => ipcRenderer.invoke('content:create', data),
        getById: (id) => ipcRenderer.invoke('content:getById', { id }),
        getAll: () => ipcRenderer.invoke('content:getAll'),
        update: (data) => ipcRenderer.invoke('content:update', data),
        delete: (id) => ipcRenderer.invoke('content:delete', { id }),
    },
    graph: {
        getData: () => ipcRenderer.invoke('graph:getData'),
    },
    ai: {
        chat: (data) => ipcRenderer.invoke('ai:chat', data),
        getMessages: (conversationId) => ipcRenderer.invoke('ai:getMessages', { conversationId }),
    },
});
