import { NextFunction, Request, Response } from 'express';
import { Controller, Route } from '../../decorators';
import { RealTokenBusiness } from '../../business';
import { ServerError } from '../../errors';

@Controller('/realToken')
export class RealTokenController {
    @Route('get', '/prices')
    async getRealTokenPrices(req: Request, res: Response, next: NextFunction) {
        const tokenAddress: `0x${string}` = req.query.address as `0x${string}`;

        const result = await RealTokenBusiness.instance.getRealTokenPrices(tokenAddress);
        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        let prices = result.prices!;
        return res.status(200).json({
            data: {
                fundamentalPrice: Number(prices.fundamentalPrice.value) / 10 ** prices.fundamentalPrice.decimals,
                buyBackPrice: Number(prices.buyBackPrice.value) / 10 ** prices.buyBackPrice.decimals
            }
        });
    }
}
