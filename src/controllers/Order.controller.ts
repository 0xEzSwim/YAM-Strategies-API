import { Request, Response, NextFunction } from 'express';
import { Controller, Route, Validate } from '../decorators';
import { OrderBusiness } from '../business';
import Joi from 'joi';
import { ServerError } from '../errors';

const createOrderValidation = Joi.object({
    userAddress: Joi.string()
        .pattern(/^0x[a-fA-F0-9]{40}$/)
        .required(),
    buyerAssetAddress: Joi.string()
        .pattern(/^0x[a-fA-F0-9]{40}$/)
        .required(),
    offerAssetAddress: Joi.string()
        .pattern(/^0x[a-fA-F0-9]{40}$/)
        .required(),
    amount: Joi.number().required()
});

const updateOrderValidation = Joi.object({
    userAddress: Joi.string()
        .pattern(/^0x[a-fA-F0-9]{40}$/)
        .required(),
    buyerAssetAddress: Joi.string()
        .pattern(/^0x[a-fA-F0-9]{40}$/)
        .required(),
    offerAssetAddress: Joi.string()
        .pattern(/^0x[a-fA-F0-9]{40}$/)
        .required(),
    amount: Joi.number().required()
});

const cancelOrderValidation = Joi.object({
    userAddress: Joi.string()
        .pattern(/^0x[a-fA-F0-9]{40}$/)
        .required(),
    buyerAssetAddress: Joi.string()
        .pattern(/^0x[a-fA-F0-9]{40}$/)
        .required(),
    offerAssetAddress: Joi.string()
        .pattern(/^0x[a-fA-F0-9]{40}$/)
        .required(),
    amount: Joi.number().required()
});

@Controller('/order')
export class OrderController {
    @Route('get', '/active-sell')
    async getActiveOrdersByUserAndToken(req: Request, res: Response, next: NextFunction) {
        const userAddress = req.query.userAddress as `0x${string}`;
        const offerAsset = req.query.offerAsset as `0x${string}`;

        // Vérifier que les adresses sont au format valide
        const addressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!addressRegex.test(userAddress) || !addressRegex.test(offerAsset)) {
            return res.status(400).json({
                error: {
                    message: 'Invalid address format. Both userAddress and offerToken must be valid Ethereum addresses.'
                }
            });
        }

        // Créer un filtre personnalisé pour récupérer les ordres par utilisateur et token
        const result = await OrderBusiness.instance.getOrders({
            userAddresses: [userAddress],
            offerAssetAdresses: [offerAsset],
            isActive: true
        });

        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        let orders = result.orders!.map((order) => ({
            id: order.id,
            userAddress: order.userAddress,
            buyerAsset: {
                address: order.buyerAsset.address,
                symbol: order.buyerAsset.symbol,
                logoUrl: order.buyerAsset.logoUrl,
                supply: Number(order.buyerAsset.supply) / 10 ** order.buyerAsset.decimals,
                decimals: order.buyerAsset.decimals,
                isStableCoin: order.buyerAsset.isStableCoin
            },
            basePrice: Number(order.basePrice.value) / 10 ** order.basePrice.decimals,
            price: Number(order.price.value) / 10 ** order.price.decimals,
            displayedPrice: Number(order.displayedPrice.value) / 10 ** order.displayedPrice.decimals,
            offerAsset: {
                address: order.offerAsset.address,
                symbol: order.offerAsset.symbol,
                logoUrl: order.offerAsset.logoUrl,
                supply: Number(order.offerAsset.supply) / 10 ** order.offerAsset.decimals,
                decimals: order.offerAsset.decimals,
                isStableCoin: order.offerAsset.isStableCoin
            },
            amount: Number(order.amount.value) / 10 ** order.amount.decimals,
            filledAmount: Number(order.filledAmount.value) / 10 ** order.filledAmount.decimals
        }));

        return res.status(200).json({ data: orders });
    }

    @Route('post', '/create-order')
    @Validate(createOrderValidation)
    async createOrder(req: Request, res: Response, next: NextFunction) {
        const orderData: {
            userAddress: `0x${string}`;
            buyerAssetAddress: `0x${string}`;
            offerAssetAddress: `0x${string}`;
            amount: number;
        } = req.body;

        const result = await OrderBusiness.instance.createOrder(orderData);

        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 500;
            return res.status(errorCode).json({ error: result.error });
        }

        // Formater la réponse pour le client
        const order = result.order!;
        const responseOrder = {
            id: order.id,
            userAddress: order.userAddress,
            buyerAsset: {
                address: order.buyerAsset.address,
                symbol: order.buyerAsset.symbol,
                logoUrl: order.buyerAsset.logoUrl,
                supply: Number(order.buyerAsset.supply) / 10 ** order.buyerAsset.decimals,
                decimals: order.buyerAsset.decimals,
                isStableCoin: order.buyerAsset.isStableCoin
            },
            basePrice: Number(order.basePrice.value) / 10 ** order.basePrice.decimals,
            price: Number(order.price.value) / 10 ** order.price.decimals,
            displayedPrice: Number(order.displayedPrice.value) / 10 ** order.displayedPrice.decimals,
            offerAsset: {
                address: order.offerAsset.address,
                symbol: order.offerAsset.symbol,
                logoUrl: order.offerAsset.logoUrl,
                supply: Number(order.offerAsset.supply) / 10 ** order.offerAsset.decimals,
                decimals: order.offerAsset.decimals,
                isStableCoin: order.offerAsset.isStableCoin
            },
            amount: Number(order.amount.value) / 10 ** order.amount.decimals,
            filledAmount: Number(order.filledAmount.value) / 10 ** order.filledAmount.decimals
        };

        return res.status(201).json({ data: responseOrder });
    }

    @Route('put', '/update-order')
    @Validate(updateOrderValidation)
    async updateOrder(req: Request, res: Response, next: NextFunction) {
        const orderData: {
            userAddress: `0x${string}`;
            buyerAssetAddress: `0x${string}`;
            offerAssetAddress: `0x${string}`;
            amount: number;
        } = req.body;

        const result = await OrderBusiness.instance.updateOrderData(orderData);

        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 500;
            return res.status(errorCode).json({ error: result.error });
        }

        // Formater la réponse pour le client
        const order = result.order!;
        const responseOrder = {
            id: order.id,
            userAddress: order.userAddress,
            buyerAsset: {
                address: order.buyerAsset.address,
                symbol: order.buyerAsset.symbol,
                logoUrl: order.buyerAsset.logoUrl,
                supply: Number(order.buyerAsset.supply) / 10 ** order.buyerAsset.decimals,
                decimals: order.buyerAsset.decimals,
                isStableCoin: order.buyerAsset.isStableCoin
            },
            basePrice: Number(order.basePrice.value) / 10 ** order.basePrice.decimals,
            price: Number(order.price.value) / 10 ** order.price.decimals,
            displayedPrice: Number(order.displayedPrice.value) / 10 ** order.displayedPrice.decimals,
            offerAsset: {
                address: order.offerAsset.address,
                symbol: order.offerAsset.symbol,
                logoUrl: order.offerAsset.logoUrl,
                supply: Number(order.offerAsset.supply) / 10 ** order.offerAsset.decimals,
                decimals: order.offerAsset.decimals,
                isStableCoin: order.offerAsset.isStableCoin
            },
            amount: Number(order.amount.value) / 10 ** order.amount.decimals,
            filledAmount: Number(order.filledAmount.value) / 10 ** order.filledAmount.decimals
        };

        return res.status(200).json({ data: responseOrder });
    }

    @Route('patch', '/cancel-order')
    @Validate(cancelOrderValidation)
    async cancelOrder(req: Request, res: Response, next: NextFunction) {
        const orderData: {
            userAddress: `0x${string}`;
            buyerAssetAddress: `0x${string}`;
            offerAssetAddress: `0x${string}`;
            amount: number;
        } = req.body;

        const result = await OrderBusiness.instance.cancelOrder(orderData);

        if (result.error) {
            const errorCode: number = result.error instanceof ServerError ? result.error.status : 200;
            return res.status(errorCode).json({ error: result.error });
        }

        return res.status(200).json({ data: true });
    }
}
