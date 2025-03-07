import { AssetModel } from './Asset.model';
import { FloatModel } from './Float.model';
import { StrategyHoldingModel } from './StrategyHolding.model';

export class StrategyModel {
    name!: string;
    description!: string;
    contractAbi!: any;
    underlyingAsset!: AssetModel;
    share!: AssetModel;
    isPaused!: boolean;

    tvl!: FloatModel;
    holdings?: StrategyHoldingModel[];
    apy?: FloatModel;

    constructor(params: StrategyModel) {
        Object.assign(this, params);
    }
}

export type StrategyFilter = { addresses?: `0x${string}`[]; symbols?: string[]; underlyingAssetAddresses?: `0x${string}`[]; isPaused?: boolean };
