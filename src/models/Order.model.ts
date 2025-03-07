import { AssetModel } from './Asset.model';
import { FloatModel } from './Float.model';

export type OrderModel = {
    id: number;
    isActive: boolean;
    userAddress: `0x${string}`;
    buyerAsset: AssetModel;
    basePrice: FloatModel;
    price: FloatModel;
    displayedPrice: FloatModel;
    offerAsset: AssetModel;
    amount: FloatModel;
    filledAmount: FloatModel;
};

export type OrderFilter = {
    ids?: number[];
    userAddresses?: `0x${string}`[];
    buyerAssetAdresses?: `0x${string}`[];
    offerAssetAdresses?: `0x${string}`[];
    isActive?: boolean;
};
