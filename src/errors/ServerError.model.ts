import { Error } from './Error.model';
import { ErrorCode } from './ErrorCode.enum';

export class ServerError extends Error {
    status: number;

    constructor(_errorCode: ErrorCode, _name: string, _message: string, _status?: number) {
        super(_errorCode, _name, _message);
        this.status = _status ?? 500;
    }
}
