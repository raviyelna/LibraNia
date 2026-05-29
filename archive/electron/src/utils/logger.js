function formatConsoleMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
}
function createLogEntry(level, message, stack) {
    return {
        level,
        message,
        timestamp: new Date().toISOString(),
        process: 'renderer',
        stack
    };
}
export const logger = {
    error(message, error) {
        const formattedMessage = formatConsoleMessage('error', message);
        console.error(formattedMessage);
        const stack = error?.stack;
        const logEntry = createLogEntry('error', message, stack);
        if (window.electronAPI?.log) {
            window.electronAPI.log(logEntry);
        }
    },
    warn(message) {
        const formattedMessage = formatConsoleMessage('warn', message);
        console.warn(formattedMessage);
        const logEntry = createLogEntry('warn', message);
        if (window.electronAPI?.log) {
            window.electronAPI.log(logEntry);
        }
    },
    info(message) {
        const formattedMessage = formatConsoleMessage('info', message);
        console.info(formattedMessage);
        const logEntry = createLogEntry('info', message);
        if (window.electronAPI?.log) {
            window.electronAPI.log(logEntry);
        }
    },
    debug(message) {
        const formattedMessage = formatConsoleMessage('debug', message);
        console.debug(formattedMessage);
        const logEntry = createLogEntry('debug', message);
        if (window.electronAPI?.log) {
            window.electronAPI.log(logEntry);
        }
    }
};
