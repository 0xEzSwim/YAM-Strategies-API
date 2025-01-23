import { NextFunction, Request, Response } from 'express';
import { Controller, Route, Validate } from '../../decorators';
import { CleanSatMiningBusiness, YAMStrategyCSMBusiness } from '../../business';
import { ServerError } from '../../errors';
import { convertNumberToBigInt } from '../../library';
import Joi from 'joi';

const postAddUndervaluedStrategyAllowance = Joi.object({
    strategyAddress: Joi.string().regex(new RegExp('^0x')).required(),
    asset: Joi.object({
        address: Joi.string().regex(new RegExp('^0x')).required(),
        decimals: Joi.number().integer().required()
    }),
    amount: Joi.number().required()
});

const postSubscribeToUndervaluedStrategy = Joi.object({
    strategyAddress: Joi.string().regex(new RegExp('^0x')).required(),
    asset: Joi.object({
        address: Joi.string().regex(new RegExp('^0x')).required(),
        decimals: Joi.number().integer().required()
    }),
    amount: Joi.number().required(),
    receiver: Joi.string().regex(new RegExp('^0x')).required()
});

@Controller('/cleansat-mining')
export class CleanSatMiningController {
    @Route('get', '/csm-token-fundamental-value')
    async getCSMTokenFundamentalValue(req: Request, res: Response, next: NextFunction) {
        const tokenAddress: `0x${string}` = req.query.tokenAddress as `0x${string}`;
        const marginOfSafty: undefined | bigint = req.query.marginOfSafty
            ? BigInt(Math.floor(JSON.parse(req.query.marginOfSafty as string) as number))
            : undefined; // int from 0-100

        const result = await CleanSatMiningBusiness.instance.getCSMTokenFundamentalValue(tokenAddress, marginOfSafty);
        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        let fundamentalValue = result.fundamentalValue!;
        return res.status(200).json({ data: Number(fundamentalValue.value) / 10 ** fundamentalValue.decimals });
    }

    @Route('get', '/offer')
    async getOffer(req: Request, res: Response, next: NextFunction) {
        const offerId: number = JSON.parse(req.query.offerId as string) as number;

        const result = await CleanSatMiningBusiness.instance.getOfferFromBlockchain(BigInt(offerId));
        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        let offer = result.offer!;
        return res.status(200).json({
            data: {
                seller: offer.seller,
                buyer: offer.buyer,
                offerToken: offer.offerToken,
                offerTokenSymbol: offer.offerTokenSymbol,
                buyerToken: offer.buyerToken,
                buyerTokenSymbol: offer.buyerTokenSymbol,
                price: Number(offer.price.value) / 10 ** offer.price.decimals,
                amount: Number(offer.amount.value) / 10 ** offer.amount.decimals,
                pnl: offer.pnl ? Number(offer.pnl.value) / 10 ** offer.pnl.decimals : undefined
            }
        });
    }

    @Route('get', '/all-offers')
    async getAllOffers(req: Request, res: Response, next: NextFunction) {
        const result = await CleanSatMiningBusiness.instance.getAllOffers();
        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        let offers = result.offers!.map((offer) => ({
            offerId: Number(offer.offerId),
            seller: offer.seller,
            buyer: offer.buyer,
            offerToken: offer.offerToken,
            offerTokenSymbol: offer.offerTokenSymbol,
            buyerToken: offer.buyerToken,
            buyerTokenSymbol: offer.buyerTokenSymbol,
            price: Number(offer.price.value) / 10 ** offer.price.decimals,
            amount: Number(offer.amount.value) / 10 ** offer.amount.decimals,
            pnl: offer.pnl ? Number(offer.pnl.value) / 10 ** offer.pnl.decimals : undefined
        }));

        return res.status(200).json({ data: offers });
    }

    @Route('get', '/all-selling-offers')
    async getAllSellingOffers(req: Request, res: Response, next: NextFunction) {
        const result = await CleanSatMiningBusiness.instance.getAllSellingOffers();
        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        let offers = result.offers!.map((offer) => ({
            offerId: Number(offer.offerId),
            seller: offer.seller,
            buyer: offer.buyer,
            offerToken: offer.offerToken,
            offerTokenSymbol: offer.offerTokenSymbol,
            buyerToken: offer.buyerToken,
            buyerTokenSymbol: offer.buyerTokenSymbol,
            price: Number(offer.price.value) / 10 ** offer.price.decimals,
            amount: Number(offer.amount.value) / 10 ** offer.amount.decimals,
            pnl: offer.pnl ? Number(offer.pnl.value) / 10 ** offer.pnl.decimals : undefined
        }));

        return res.status(200).json({ data: offers });
    }

    @Route('get', '/selling-offer-pnl')
    async getSellingOfferPnL(req: Request, res: Response, next: NextFunction) {
        const offerId: number = req.query.offerId as unknown as number;
        const marginOfSafty: undefined | bigint = req.query.marginOfSafty
            ? BigInt(Math.floor(JSON.parse(req.query.marginOfSafty as string) as number))
            : undefined; // int from 0-100

        const result = await CleanSatMiningBusiness.instance.getSellingOfferPnL(BigInt(offerId), marginOfSafty);
        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        let pnl = result.pnl!;
        return res.status(200).json({ data: Number(pnl.value) / 10 ** pnl.decimals });
    }

    @Route('get', '/undervalued-strategy-allowance')
    async getUndervaluedStrategyAllowance(req: Request, res: Response, next: NextFunction) {
        const strategyAddress: `0x${string}` = req.query.address as `0x${string}`;

        const result = await YAMStrategyCSMBusiness.instance.getUndervaluedStrategyAllowance(strategyAddress);
        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        let allowance = result.allowance!;
        return res.status(200).json({ data: Number(allowance.value) / 10 ** allowance.decimals });
    }

    @Route('post', '/approve-undervalued-strategy')
    @Validate(postAddUndervaluedStrategyAllowance)
    async postAddUndervaluedStrategyAllowance(req: Request, res: Response, next: NextFunction) {
        const strategyAddress: `0x${string}` = req.body.strategyAddress as `0x${string}`;
        const asset: { address: `0x${string}`; decimals: number } = req.body.asset;
        const amount: number = req.body.amount;

        const result = await YAMStrategyCSMBusiness.instance.addUndervaluedStrategyAllowance(strategyAddress, {
            value: convertNumberToBigInt(amount, asset.decimals),
            decimals: asset.decimals
        });
        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        return res.status(200).json({ data: result });
    }

    @Route('post', '/subscribe-to-undervalued-strategy')
    @Validate(postSubscribeToUndervaluedStrategy)
    async postSubscribeToUndervaluedStrategy(req: Request, res: Response, next: NextFunction) {
        const strategyAddress: `0x${string}` = req.body.strategyAddress as `0x${string}`;
        const asset: { address: `0x${string}`; decimals: number } = req.body.asset;
        const amount: number = req.body.amount;
        const receiver: `0x${string}` = req.body.receiver;

        const result = await YAMStrategyCSMBusiness.instance.subscribeToUndervaluedStrategy(
            strategyAddress,
            { value: convertNumberToBigInt(amount, asset.decimals), decimals: asset.decimals },
            receiver
        );
        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        return res.status(200).json({ data: result });
    }
}
