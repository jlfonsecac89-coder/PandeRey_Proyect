export class ApiError extends Error {
    public statusCode: number;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends ApiError {
    constructor(message: string = 'Recurso no encontrado') {
        super(message, 404);
    }
}

export class ValidationError extends ApiError {
    constructor(message: string = 'Datos inválidos') {
        super(message, 400);
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message: string = 'No autorizado') {
        super(message, 401);
    }
}
