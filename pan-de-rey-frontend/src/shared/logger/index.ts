export interface LogMeta {
    requestId?: string;
    user?: string;
    endpoint?: string;
    method?: string;
    durationMs?: number;
    statusCode?: number;
    error?: any;
    [key: string]: any;
}

const formatLog = (level: string, message: string, meta?: LogMeta) => {
    const timestamp = new Date().toISOString();
    let logStr = `[${timestamp}] [${level}] ${message}`;
    if (meta) {
        logStr += ` | RequestID: ${meta.requestId || '-'} | User: ${meta.user || '-'} | Endpoint: ${meta.method || ''} ${meta.endpoint || '-'} | Status: ${meta.statusCode || '-'} | Duration: ${meta.durationMs !== undefined ? meta.durationMs + 'ms' : '-'}`;
        
        const { requestId, user, endpoint, method, durationMs, statusCode, error, ...extras } = meta;
        if (Object.keys(extras).length > 0) {
            logStr += ` | Extras: ${JSON.stringify(extras)}`;
        }
        if (meta.error) {
            logStr += ` | Error: ${meta.error instanceof Error ? meta.error.stack || meta.error.message : JSON.stringify(meta.error)}`;
        }
    }
    return logStr;
};

export const logger = {
    info: (message: string, meta?: LogMeta) => {
        console.log(formatLog('INFO', message, meta));
    },
    error: (message: string, meta?: LogMeta) => {
        console.error(formatLog('ERROR', message, meta));
    },
    warn: (message: string, meta?: LogMeta) => {
        console.warn(formatLog('WARN', message, meta));
    }
};
