import { Request, Response, NextFunction } from 'express';
import { Controller, Route } from '../decorators';
import { AssetBusiness } from '../business';
import { ServerError } from '../errors';
import { AssetFilter } from '../models';

@Controller('/asset')
export class AssetController {
    @Route('get', '/rwa')
    async getAllRealWorldAssets(req: Request, res: Response, next: NextFunction) {
        const filter: AssetFilter = { isERC20: true, isStableCoin: false };
        const result = await AssetBusiness.instance.getAssets(filter);

        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        let assets = result.assets!.map((asset) => ({
            address: asset.address,
            symbol: asset.symbol,
            shortName: asset.shortName ?? asset.symbol,
            supply: Number(asset.supply) / 10 ** asset.decimals,
            decimals: asset.decimals,
            isERC20: asset.isERC20,
            isStableCoin: asset.isStableCoin,
            isCSMToken: asset.isCSMToken,
            logoUrl: asset.logoUrl
        }));

        return res.status(200).json({ data: assets });
    }

    @Route('get', '/stablecoins')
    async getStableCoins(req: Request, res: Response, next: NextFunction) {
        logging.info('GET /assets/stablecoins route called');

        const result = await AssetBusiness.instance.getStableCoins();

        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        let assets = result.assets!.map((asset) => ({
            address: asset.address,
            symbol: asset.symbol,
            shortName: asset.shortName ?? asset.symbol,
            supply: Number(asset.supply) / 10 ** asset.decimals,
            decimals: asset.decimals,
            isERC20: asset.isERC20,
            isStableCoin: asset.isStableCoin,
            isCSMToken: asset.isCSMToken,
            logoUrl: asset.logoUrl
        }));

        return res.status(200).json({ data: assets });
    }
}
