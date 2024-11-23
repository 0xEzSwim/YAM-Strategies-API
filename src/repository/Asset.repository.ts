import { SupabaseClient } from '@supabase/supabase-js';
import { server } from '../config';
import { AssetFilter, AssetModel } from '../models';
import { Error, ErrorCode } from '../errors';
import { toJson } from '../library';

export class AssetRepository {
    // CONSTANT
    static #instance: AssetRepository;
    private _db: SupabaseClient;

    private constructor() {
        this._db = server.DB_CLIENT;
    }

    public static get instance(): AssetRepository {
        if (!AssetRepository.#instance) {
            AssetRepository.#instance = new AssetRepository();
        }

        return AssetRepository.#instance;
    }

    private _buildAssetQuery(filter: AssetFilter) {
        let query = this._db.from('Assets').select(
            `
            address,
            apiId,
            symbol,
            supply::text,
            decimals,
            isERC20,
            isStableCoin,
            isCSMToken
            `
        );

        if (!!filter.addresses?.length) {
            query = query.in('address', filter.addresses);
        }

        if (!!filter.symbols?.length) {
            query = query.in('symbol', filter.symbols);
        }

        if (filter.isERC20 != undefined) {
            query = query.eq('isERC20', filter.isERC20);
        }

        if (filter.isStableCoin != undefined) {
            query = query.eq('isStableCoin', filter.isStableCoin);
        }

        if (filter.isCSMToken != undefined) {
            query = query.eq('isCSMToken', filter.isCSMToken);
        }

        return query.returns<AssetModel[]>();
    }

    public async getAssets(filter: AssetFilter): Promise<{ assets?: AssetModel[]; error?: Error }> {
        const { data: assets, error: dbError } = await this._buildAssetQuery(filter);
        if (dbError) {
            const error = new Error(ErrorCode.DB_ERROR, 'Assets Error', `Could not request assets to DB.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        if (!assets?.length) {
            const error = new Error(ErrorCode.TOKEN_NOT_FOUND, 'Tokens Not Found', `Could not found tokens.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        // Convert to BigInt
        assets.map((asset) => (asset.supply = BigInt(asset.supply)));
        return { assets };
    }

    public async getAsset(filter: AssetFilter): Promise<{ asset?: AssetModel; error?: Error }> {
        const { data: asset, error: dbError } = await this._buildAssetQuery(filter).maybeSingle();
        if (dbError) {
            const error = new Error(ErrorCode.DB_ERROR, 'Asset Error', `Could not request asset to DB.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        if (!asset) {
            const error = new Error(ErrorCode.TOKEN_NOT_FOUND, 'Token Not Found', `Could not found token.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        // Convert to BigInt
        asset.supply = BigInt(asset.supply);
        return { asset: asset };
    }

    public async updateAsset(_asset: AssetModel): Promise<{ asset?: AssetModel; error?: Error }> {
        console.log('updateAsset:', _asset);
        let { data: asset, error: dbError } = await this._db
            .from('Assets')
            .update({ supply: toJson(_asset.supply), updatedAt: new Date().toISOString() })
            .eq('address', _asset.address)
            .select(
                `
            address,
            apiId,
            symbol,
            supply::text,
            decimals,
            isERC20,
            isStableCoin,
            isCSMToken
            `
            )
            .returns<AssetModel[]>()
            .maybeSingle();
        if (!asset || dbError) {
            const error = new Error(ErrorCode.DB_ERROR, 'Token Not Found', `Token ${_asset.address} is not a token.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        return { asset: asset };
    }
}
