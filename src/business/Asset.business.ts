import { AssetFilter, AssetModel } from '../models';
import { AssetRepository } from '../repository';
import { Error, ErrorCode } from '../errors';
import { CryptoMarketBusiness } from './markets/CryptoMarket.business';

export class AssetBusiness {
    // CONSTANT
    static #instance: AssetBusiness;
    private _assetRepo: AssetRepository;
    // Ne pas initialiser CryptoMarketBusiness ici pour éviter la dépendance circulaire

    private constructor() {
        this._assetRepo = AssetRepository.instance;
        // Ne pas initialiser CryptoMarketBusiness ici
    }

    public static get instance(): AssetBusiness {
        if (!AssetBusiness.#instance) {
            AssetBusiness.#instance = new AssetBusiness();
        }

        return AssetBusiness.#instance;
    }

    public async getAssets(filter?: AssetFilter): Promise<{ assets?: AssetModel[]; error?: Error }> {
        return await this._assetRepo.getAssets(filter);
    }

    public async getAllERC20(): Promise<{ assets?: AssetModel[]; error?: Error }> {
        const filter: AssetFilter = { isERC20: true };
        return this.getAssets(filter);
    }

    public async getStableCoins(): Promise<{ assets?: AssetModel[]; error?: Error }> {
        const filter: AssetFilter = { isStableCoin: true };
        return this.getAssets(filter);
    }

    public async getCSMTokens(): Promise<{ assets?: AssetModel[]; error?: Error }> {
        const filter: AssetFilter = { isCSMToken: true };
        return this.getAssets(filter);
    }

    public async getAssetByAddress(address: `0x${string}`): Promise<{ asset?: AssetModel; error?: Error }> {
        const filter: AssetFilter = { addresses: [address] };
        const result = await this.getAssets(filter);

        if (result.error) {
            return { error: result.error };
        }

        if (!result.assets || result.assets.length === 0) {
            const error = new Error(ErrorCode.TOKEN_NOT_FOUND, 'Asset Not Found', `Asset with address ${address} not found.`);
            logging.error(error);
            return { error };
        }

        return { asset: result.assets[0] };
    }

    public updateAsset(asset: AssetModel): Promise<{ asset?: AssetModel; error?: Error }> {
        return this._assetRepo.updateAsset(asset);
    }
}
