import { NextFunction, Request, Response } from 'express';
import { Controller, Route } from '../../decorators';
import { RealTokenBusiness } from '../../business';
import { ServerError } from '../../errors';

@Controller('/realToken')
export class RealTokenController {
    @Route('get', '/realt-token-fundamental-value')
    async getRealTokenFundamentalValue(req: Request, res: Response, next: NextFunction) {
        const tokenAddress: `0x${string}` = req.query.tokenAddress as `0x${string}`;

        const result = await RealTokenBusiness.instance.getRealTokenFundamentalValue(tokenAddress);
        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        let fundamentalValue = result.fundamentalValue!;
        return res.status(200).json({ data: Number(fundamentalValue.value) / 10 ** fundamentalValue.decimals });
    }
}
