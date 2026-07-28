export const logger = {
    info: (message: string, meta?: any) => {
        console.log(`[INFO] ${message}`, meta ? meta : '');
    },
    error: (message: string, error?: any) => {
        console.error(`[ERROR] ${message}`, error ? error : '');
    },
    warn: (message: string, meta?: any) => {
        console.warn(`[WARN] ${message}`, meta ? meta : '');
    }
};
