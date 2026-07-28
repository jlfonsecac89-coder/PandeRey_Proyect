export interface ApiResponse<T = any> {
    status: 'success' | 'error';
    data?: T;
    error?: string;
}
