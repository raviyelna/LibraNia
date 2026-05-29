export const logger = {
    error(message, error) {
        if (error) {
            console.error('[ERROR]', message, error.stack || error);
        }
        else {
            console.error('[ERROR]', message);
        }
    },
    warn(message) {
        console.warn('[WARN]', message);
    },
    info(message) {
        console.log('[INFO]', message);
    },
    debug(message) {
        console.log('[DEBUG]', message);
    }
};
