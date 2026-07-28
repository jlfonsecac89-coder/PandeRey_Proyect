import { ValidationError } from '../errors';

export function validateRequired(value: any, fieldName: string) {
    if (value === undefined || value === null || value === '') {
        throw new ValidationError(`El campo ${fieldName} es obligatorio`);
    }
}

export function validateNumber(value: any, fieldName: string) {
    if (typeof value !== 'number' || isNaN(value)) {
        throw new ValidationError(`El campo ${fieldName} debe ser numérico`);
    }
}
