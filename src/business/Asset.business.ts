import { AssetFilter, AssetModel } from '../models';
import { AssetRepository } from '../repository';
import { Error } from '../errors';

export class AssetBusiness {
    // CONSTANT
    static #instance: AssetBusiness;
    private _assetRepo: AssetRepository;

    private constructor() {
        this._assetRepo = AssetRepository.instance;
    }

    public static get instance(): AssetBusiness {
        if (!AssetBusiness.#instance) {
            AssetBusiness.#instance = new AssetBusiness();
        }

        return AssetBusiness.#instance;
    }

    public getAssets(filter?: AssetFilter): Promise<{ assets?: AssetModel[]; error?: Error }> {
        return this._assetRepo.getAssets(filter);
    }

    public getAllERC20(): Promise<{ assets?: AssetModel[]; error?: Error }> {
        const filter: AssetFilter = { isERC20: true };
        return this.getAssets(filter);
    }

    public getStableCoins(): Promise<{ assets?: AssetModel[]; error?: Error }> {
        const filter: AssetFilter = { isStableCoin: true };
        return this.getAssets(filter);
    }

    public getCSMTokens(): Promise<{ assets?: AssetModel[]; error?: Error }> {
        const filter: AssetFilter = { isCSMToken: true };
        return this.getAssets(filter);
    }

    public updateAsset(asset: AssetModel): Promise<{ asset?: AssetModel; error?: Error }> {
        return this._assetRepo.updateAsset(asset);
    }
}
