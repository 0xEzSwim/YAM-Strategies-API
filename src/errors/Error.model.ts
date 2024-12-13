import { ErrorCode } from './ErrorCode.enum';

export class Error {
    errorCode: ErrorCode;
    name: string;
    message: string;

    constructor(_errorCode: ErrorCode, _name: string, _message: string) {
        this.errorCode = _errorCode;
        this.name = _name;
        this.message = _message;
    }
}
