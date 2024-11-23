import { AssetModel } from './Asset.model';
import { FloatModel } from './Float.model';

export class StrategyModel {
    name!: string;
    description!: string;
    contractAbi!: any;
    underlyingAsset!: AssetModel;
    shares!: AssetModel;
    isPaused!: boolean;

    tvl?: FloatModel;
    apy?: FloatModel;
    holdings?: AssetModel[];

    constructor(params: StrategyModel) {
        Object.assign(this, params);
    }
}
