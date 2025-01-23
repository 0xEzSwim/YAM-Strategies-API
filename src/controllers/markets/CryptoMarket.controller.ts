import { NextFunction, Request, Response } from 'express';
import { Controller, Route } from '../../decorators';
import { CryptoMarketBusiness } from '../../business';
import { ServerError } from '../../errors';

@Controller('/crypto-market')
export class CryptoMarketController {
    @Route('get', '/logo')
    async getTokenLogoUrl(req: Request, res: Response, next: NextFunction) {
        const tokenAddress: `0x${string}` = req.query.address as `0x${string}`;

        const result = await CryptoMarketBusiness.instance.getTokenLogoUrl(tokenAddress);
        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        return res.status(200).json({ data: result.logoUrl! });
    }

    @Route('get', '/latest-price')
    async getTokenPrice(req: Request, res: Response, next: NextFunction) {
        const tokenAddress: `0x${string}` = req.query.address as `0x${string}`;

        const result = await CryptoMarketBusiness.instance.getTokenLastPrice(tokenAddress);
        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        let price = result.price!;
        return res.status(200).json({ data: Number(price.value) / 10 ** price.decimals });
    }

    @Route('get', '/btc-latest-price')
    async getBTCLastPrice(req: Request, res: Response, next: NextFunction) {
        const result = await CryptoMarketBusiness.instance.getBTCLastPrice();
        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        let price = result.price!;
        return res.status(200).json({ data: Number(price.value) / 10 ** price.decimals });
    }

    @Route('get', '/usdc-latest-price')
    async getUSDCLastPrice(req: Request, res: Response, next: NextFunction) {
        const result = await CryptoMarketBusiness.instance.getUSDCLastPrice();
        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        let price = result.price!;
        return res.status(200).json({ data: Number(price.value) / 10 ** price.decimals });
    }

    @Route('get', '/wxdai-latest-price')
    async getWXDAILastPrice(req: Request, res: Response, next: NextFunction) {
        const result = await CryptoMarketBusiness.instance.getWXDAILastPrice();
        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        let price = result.price!;
        return res.status(200).json({ data: Number(price.value) / 10 ** price.decimals });
    }
}
