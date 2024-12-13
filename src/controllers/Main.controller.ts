import { NextFunction, Request, Response } from 'express';
import { Controller, Route, Validate } from '../decorators';
import Joi from 'joi';
import { StrategyBusiness } from '../business';
import { ServerError } from '../errors';

const postHealthCheckValidation = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email()
});

const postUpdateStrategy = Joi.object({
    address: Joi.string().regex(new RegExp('^0x')).required()
});

@Controller('/main')
export class MainController {
    @Route('get', '/healthcheck')
    getHealthCheck(req: Request, res: Response, next: NextFunction) {
        logging.info('Get /healthcheck route called successfully!');
        return res.status(200).json({ data: ' hello world!' });
    }

    @Route('post', '/healthcheck')
    @Validate(postHealthCheckValidation)
    postHealthCheck(req: Request, res: Response, next: NextFunction) {
        logging.info('Post /healthcheck route called successfully!');
        return res.status(200).json({ data: { ...req.body } });
    }

    @Route('get', '/strategies')
    async getStrategies(req: Request, res: Response, next: NextFunction) {
        const hasLogo: boolean | undefined = req.query.logo ? (JSON.parse(req.query.logo as string) as boolean) : undefined;

        const result = await StrategyBusiness.instance.getAllStrategies(hasLogo);
        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        let strategies = result.strategies!.map((strategy) => ({
            name: strategy.name,
            description: strategy.description,
            contractAbi: strategy.contractAbi,
            underlyingAsset: {
                symbol: strategy.underlyingAsset.symbol,
                address: strategy.underlyingAsset.address,
                decimals: strategy.underlyingAsset.decimals,
                logoUrl: strategy.underlyingAsset.logoUrl
            },
            share: {
                symbol: strategy.share.symbol,
                address: strategy.share.address,
                supply: Number(strategy.share.supply) / 10 ** strategy.share.decimals,
                decimals: strategy.share.decimals
            },
            isPaused: strategy.isPaused,
            tvl: Number(strategy.tvl.value) / 10 ** strategy.tvl.decimals
        }));

        return res.status(200).json({ data: strategies });
    }

    @Route('get', '/strategy')
    async getStrategy(req: Request, res: Response, next: NextFunction) {
        const strategyAddress: `0x${string}` = req.query.address as `0x${string}`;
        const hasLogo: boolean | undefined = req.query.logo ? (JSON.parse(req.query.logo as string) as boolean) : undefined;

        const result = await StrategyBusiness.instance.getStrategy(strategyAddress, hasLogo);
        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        let strategy = result.strategy!;
        return res.status(200).json({
            data: {
                name: strategy.name,
                description: strategy.description,
                contractAbi: strategy.contractAbi,
                underlyingAsset: {
                    symbol: strategy.underlyingAsset.symbol,
                    address: strategy.underlyingAsset.address,
                    decimals: strategy.underlyingAsset.decimals,
                    logoUrl: strategy.underlyingAsset.logoUrl
                },
                share: {
                    symbol: strategy.share.symbol,
                    address: strategy.share.address,
                    supply: Number(strategy.share.supply) / 10 ** strategy.share.decimals,
                    decimals: strategy.share.decimals
                },
                isPaused: strategy.isPaused,
                holdings: strategy.holdings?.map((holding) => {
                    return {
                        address: holding.address,
                        symbol: holding.symbol,
                        value: Number(holding.value.value) / 10 ** holding.value.decimals,
                        amount: Number(holding.amount.value) / 10 ** holding.amount.decimals,
                        allocation: Number(holding.allocation.value) / 10 ** holding.allocation.decimals
                    };
                }),
                tvl: Number(strategy.tvl.value) / 10 ** strategy.tvl.decimals
            }
        });
    }

    @Route('post', '/update-strategy')
    @Validate(postUpdateStrategy)
    async postUpdateStrategy(req: Request, res: Response, next: NextFunction) {
        const strategyAddress: `0x${string}` = req.body.address as `0x${string}`;

        const result = await StrategyBusiness.instance.updateStrategyFromBlockchain(strategyAddress);
        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        let strategy = result.strategy!;
        return res.status(200).json({
            data: {
                name: strategy.name,
                description: strategy.description,
                contractAbi: strategy.contractAbi,
                underlyingAsset: {
                    symbol: strategy.underlyingAsset.symbol,
                    address: strategy.underlyingAsset.address,
                    decimals: strategy.underlyingAsset.decimals
                },
                shares: {
                    symbol: strategy.share.symbol,
                    address: strategy.share.address,
                    supply: Number(strategy.share.supply) / 10 ** strategy.share.decimals,
                    decimals: strategy.share.decimals
                },
                isPaused: strategy.isPaused
            }
        });
    }
}
