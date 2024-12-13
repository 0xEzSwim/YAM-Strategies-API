import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const Validate = (schema: Joi.ObjectSchema) => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = async (req: Request, res: Response, next: NextFunction) => {
            try {
                await schema.validateAsync(req.body);
            } catch (error) {
                logging.error(error);

                return res.status(422).json(error);
            }

            return originalMethod.call(this, req, res, next);
        };

        return descriptor;
    };
};
