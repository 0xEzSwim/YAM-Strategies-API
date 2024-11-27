import { AssetModel } from './Asset.model';
import { FloatModel } from './Float.model';

export class StrategyModel {
    name!: string;
    description!: string;
    contractAbi!: any;
    underlyingAsset!: AssetModel;
    share!: AssetModel;
    isPaused!: boolean;

    holdings?: { symbol: string; address: `0x${string}`; value: FloatModel; amount: FloatModel }[];
    tvl?: FloatModel;
    apy?: FloatModel;

    constructor(params: StrategyModel) {
        Object.assign(this, params);
    }
}

export type StrategyFilter = { addresses?: `0x${string}`[]; symbols?: string[]; underlyingAssetAddresses?: `0x${string}`[]; isPaused?: boolean };
