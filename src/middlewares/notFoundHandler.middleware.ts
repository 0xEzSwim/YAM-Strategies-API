import { Request, Response, NextFunction } from 'express';
import { ErrorCode, ServerError } from '../errors';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
    const statusCode: number = 404;
    const error = new ServerError(ErrorCode.SERVER_ERROR, 'Not Found', 'route was not found', statusCode);
    logging.warning(error);

    return res.status(statusCode).json({ error: error });
};
