import { AssetModel, FloatModel, OrderFilter, OrderModel } from '../models';
import { OrderRepository } from '../repository';
import { Error, ErrorCode } from '../errors';
import { AssetBusiness } from './Asset.business';
import { RealTokenBusiness } from './markets/RealToken.business';
import { CryptoMarketBusiness } from './markets/CryptoMarket.business';
import { convertNumberToBigInt } from '../library';

export class OrderBusiness {
    // CONSTANT
    static #instance: OrderBusiness;
    private _orderRepo: OrderRepository;

    private constructor() {
        this._orderRepo = OrderRepository.instance;
    }

    public static get instance(): OrderBusiness {
        if (!OrderBusiness.#instance) {
            OrderBusiness.#instance = new OrderBusiness();
        }

        return OrderBusiness.#instance;
    }

    //#region CRUD
    public getOrders(filter?: OrderFilter): Promise<{ orders?: OrderModel[]; error?: Error }> {
        return this._orderRepo.getOrders(filter);
    }

    public async createOrder(_orderData: {
        userAddress: `0x${string}`;
        buyerAssetAddress: `0x${string}`;
        offerAssetAddress: `0x${string}`;
        amount: number;
    }): Promise<{ order?: OrderModel; error?: Error }> {
        // Récupérer les informations des assets
        const buyerAssetResult = await AssetBusiness.instance.getAssetByAddress(_orderData.buyerAssetAddress);
        if (buyerAssetResult.error) {
            return { error: buyerAssetResult.error };
        }
        const buyerAsset = buyerAssetResult.asset!;

        const offerAssetResult = await AssetBusiness.instance.getAssetByAddress(_orderData.offerAssetAddress);
        if (offerAssetResult.error) {
            return { error: buyerAssetResult.error };
        }
        const offerAsset = offerAssetResult.asset!;

        // Vérifier si l'utilisateur n'a pas déjà un ordre actif avec le même token vendeur
        const result = await OrderBusiness.instance.getOrders({
            userAddresses: [_orderData.userAddress],
            offerAssetAdresses: [_orderData.offerAssetAddress],
            isActive: true
        });

        if (result.error) {
            return { error: result.error };
        }

        if (result.orders?.length) {
            const error = new Error(ErrorCode.ORDER_ALREADY_EXISTS, 'Order Already Exists', `User already has an active order for this token.`);
            logging.error(error);
            return { error };
        }

        // Convertir les valeurs numériques en BigInt avec les décimales appropriées
        const amountValue: bigint = BigInt(Math.floor(_orderData.amount * 10 ** offerAsset.decimals));
        const orderPricesResult = await this.calculateOrderPrices(buyerAsset, offerAsset);
        if (orderPricesResult.error) {
            return { error: orderPricesResult.error };
        }
        const orderPrices = orderPricesResult.prices!;

        return this._orderRepo.createOrder({
            userAddress: _orderData.userAddress,
            buyerAssetAddress: buyerAsset.address,
            basePrice: orderPrices.basePrice.value,
            price: orderPrices.price.value,
            displayedPrice: orderPrices.displayedPrice.value,
            offerAssetAddress: offerAsset.address,
            amount: amountValue
        });
    }

    public async updateOrderData(_orderData: {
        userAddress: `0x${string}`;
        buyerAssetAddress: `0x${string}`;
        offerAssetAddress: `0x${string}`;
        amount: number;
    }): Promise<{ order?: OrderModel; error?: Error }> {
        // Récupérer l'ordre existant
        const orderResult = await OrderBusiness.instance.getOrders({
            userAddresses: [_orderData.userAddress],
            offerAssetAdresses: [_orderData.offerAssetAddress],
            isActive: true
        });
        if (orderResult.error) {
            return orderResult;
        }

        if (!orderResult.orders?.length) {
            return { error: new Error(ErrorCode.NOT_FOUND, 'Order Not Found', `Order not found.`) };
        }

        // Récupérer les informations des assets
        const buyerAssetResult = await AssetBusiness.instance.getAssetByAddress(_orderData.buyerAssetAddress);
        if (buyerAssetResult.error) {
            return { error: buyerAssetResult.error };
        }
        const buyerAsset = buyerAssetResult.asset!;

        const offerAssetResult = await AssetBusiness.instance.getAssetByAddress(_orderData.offerAssetAddress);
        if (offerAssetResult.error) {
            return { error: offerAssetResult.error };
        }
        const offerAsset = offerAssetResult.asset!;

        // Convertir les valeurs numériques en BigInt avec les décimales appropriées
        const amountValue: bigint = BigInt(Math.floor(_orderData.amount * 10 ** offerAsset.decimals));
        const orderPricesResult = await this.calculateOrderPrices(buyerAsset, offerAsset);
        if (orderPricesResult.error) {
            return { error: orderPricesResult.error };
        }
        const orderPrices = orderPricesResult.prices!;

        // Mettre à jour l'ordre existant
        const order = orderResult.orders[0];
        order.userAddress = _orderData.userAddress;
        order.buyerAsset = buyerAsset;
        order.basePrice.value = orderPrices.basePrice.value;
        order.price.value = orderPrices.price.value;
        order.displayedPrice.value = orderPrices.displayedPrice.value;
        order.offerAsset = offerAsset;
        order.amount.value = amountValue;

        // Sauvegarder les modifications
        return this._orderRepo.updateOrder(order);
    }

    public async cancelOrder(_orderData: {
        userAddress: `0x${string}`;
        buyerAssetAddress: `0x${string}`;
        offerAssetAddress: `0x${string}`;
        amount: number;
    }): Promise<{ order?: OrderModel; error?: Error }> {
        // Récupérer l'ordre existant
        const orderResult = await OrderBusiness.instance.getOrders({
            userAddresses: [_orderData.userAddress],
            offerAssetAdresses: [_orderData.offerAssetAddress],
            isActive: true
        });
        if (orderResult.error) {
            return orderResult;
        }

        if (!orderResult.orders?.length) {
            return { error: new Error(ErrorCode.NOT_FOUND, 'Order Not Found', `Order not found.`) };
        }

        // Mettre à jour la propriété isActive
        const order = orderResult.orders[0];
        order.isActive = false;

        // Sauvegarder les modifications
        return this._orderRepo.updateOrder(order);
    }
    //#endregion

    //#region WORKFLOW
    public async calculateOrderPrices(
        buyerAsset: AssetModel,
        offerAsset: AssetModel
    ): Promise<{ prices?: { basePrice: FloatModel; price: FloatModel; displayedPrice: FloatModel }; error?: Error }> {
        const offerPriceDetailsResult = await this.calculateOfferPriceDetails(offerAsset);
        if (offerPriceDetailsResult.error) {
            return { error: offerPriceDetailsResult.error };
        }
        const offerPriceDetails = offerPriceDetailsResult.offerPriceDetails!;

        const buyerAssetUSDPriceResult = await CryptoMarketBusiness.instance.getTokenLastPrice(buyerAsset.address);
        if (buyerAssetUSDPriceResult.error) {
            return { error: buyerAssetUSDPriceResult.error };
        }
        const buyerAssetUSDPrice = buyerAssetUSDPriceResult.price!;

        const platformFee = convertNumberToBigInt(0.01, offerPriceDetails.totalDiscount.decimals);
        console.log('platformFee', platformFee);
        const buyerAssetPriceValue: bigint =
            (buyerAssetUSDPrice.value * convertNumberToBigInt(1, buyerAsset.decimals)) / convertNumberToBigInt(1, buyerAssetUSDPrice.decimals);

        const basePriceValue: bigint =
            (offerPriceDetails.basePrice.value * buyerAssetPriceValue) / convertNumberToBigInt(1, offerPriceDetails.basePrice.decimals);
        // basePrie * (1 - discount (up to 0.06)) * Stablecoin price
        const priceValue: bigint =
            (offerPriceDetails.basePrice.value * (100n - offerPriceDetails.totalDiscount.value) * buyerAssetPriceValue) /
            convertNumberToBigInt(1, offerPriceDetails.basePrice.decimals + offerPriceDetails.totalDiscount.decimals);
        // basePrie * (1 - discount (up to 0.06) - platformFee) * Stablecoin price
        const displayedPriceValue: bigint =
            (offerPriceDetails.basePrice.value * (100n - offerPriceDetails.totalDiscount.value - platformFee) * buyerAssetPriceValue) /
            convertNumberToBigInt(1, offerPriceDetails.basePrice.decimals + offerPriceDetails.totalDiscount.decimals);

        return {
            prices: {
                basePrice: { value: basePriceValue, decimals: buyerAsset.decimals },
                price: { value: priceValue, decimals: buyerAsset.decimals },
                displayedPrice: { value: displayedPriceValue, decimals: buyerAsset.decimals }
            }
        };
    }

    public async calculateOfferPriceDetails(offerAsset: AssetModel): Promise<{
        offerPriceDetails?: {
            basePrice: FloatModel;
            totalDiscount: FloatModel;
        };
        error?: Error;
    }> {
        const offerAssetPricesResult = await RealTokenBusiness.instance.getRealTokenPrices(offerAsset.address);
        if (offerAssetPricesResult.error) {
            return { error: offerAssetPricesResult.error };
        }
        const offerAssetPrices = offerAssetPricesResult.prices!;

        const feesDecimals = 2;
        const liquidityProviderFee = convertNumberToBigInt(0.01, feesDecimals);
        const vacancyCost = offerAssetPrices.fundamentalPrice.value - offerAssetPrices.buyBackPrice.value;
        // up to 5% + 1% fees (1% for the liquidity provider)
        const totalDiscount = (vacancyCost * convertNumberToBigInt(1, feesDecimals)) / offerAssetPrices.fundamentalPrice.value + liquidityProviderFee;

        return {
            offerPriceDetails: {
                basePrice: { value: offerAssetPrices.fundamentalPrice.value, decimals: offerAssetPrices.fundamentalPrice.decimals },
                totalDiscount: { value: totalDiscount, decimals: feesDecimals }
            }
        };
    }
    //#endregion
}
