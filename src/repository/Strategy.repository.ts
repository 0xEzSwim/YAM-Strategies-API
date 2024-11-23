import { SupabaseClient } from '@supabase/supabase-js';
import { server } from '../config';
import { StrategyModel } from '../models';
import { Error, ErrorCode } from '../errors';

export class StrategyRepository {
    // CONSTANT
    static #instance: StrategyRepository;
    private _db: SupabaseClient;

    private constructor() {
        this._db = server.DB_CLIENT;
    }

    public static get instance(): StrategyRepository {
        if (!StrategyRepository.#instance) {
            StrategyRepository.#instance = new StrategyRepository();
        }

        return StrategyRepository.#instance;
    }

    public async getAllStrategies(): Promise<{ strategies?: StrategyModel[]; error?: Error }> {
        const { data: strategies, error: dbError } = await this._db
            .from('Strategies')
            .select(
                `
            name,
            description,
            contractAbi,
            isPaused,
            underlyingAsset:underlyingAssetAddress(
                address,
                apiId,
                symbol,
                supply::text,
                decimals,
                isStableCoin
            ),
            shares:address(
                address,
                apiId,
                symbol,
                supply::text,
                decimals,
                isStableCoin
            )
            `
            )
            .returns<StrategyModel[]>();
        if (dbError) {
            const error = new Error(ErrorCode.DB_ERROR, 'Strategies Error', `Could not request Strategies to DB.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        if (!strategies?.length) {
            const error = new Error(ErrorCode.STRATEGIY_NOT_FOUND, 'Strategies Not Found', `Could not found strategies.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        // Convert supply to BigInt
        strategies.map((strategy) => {
            strategy.underlyingAsset.supply = BigInt(strategy.underlyingAsset.supply);
            strategy.shares.supply = BigInt(strategy.shares.supply);
            return strategy;
        });
        return { strategies };
    }

    public async getStrategy(address: `0x${string}`): Promise<{ strategy?: StrategyModel; error?: Error }> {
        const { data: strategy, error: dbError } = await this._db
            .from('Strategies')
            .select(
                `
            name,
            description,
            contractAbi,
            isPaused,
            underlyingAsset:underlyingAssetAddress(
                address,
                apiId,
                symbol,
                supply::text,
                decimals,
                isStableCoin
            ),
            shares:address(
                address,
                apiId,
                symbol,
                supply::text,
                decimals,
                isStableCoin
            )
            `
            )
            .eq('address', address)
            .returns<StrategyModel[]>()
            .maybeSingle();
        if (dbError) {
            const error = new Error(ErrorCode.DB_ERROR, 'Strategies Error', `Could not request Strategies to DB.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        if (!strategy) {
            const error = new Error(ErrorCode.STRATEGIY_NOT_FOUND, 'Strategy Not Found', `Could not found strategy.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        // Convert supply to BigInt
        strategy.underlyingAsset.supply = BigInt(strategy.underlyingAsset.supply);
        strategy.shares.supply = BigInt(strategy.shares.supply);
        return { strategy };
    }

    public async updateStrategy(_startegy: StrategyModel): Promise<{ strategy?: StrategyModel; error?: Error }> {
        let { data: strategy, error: dbError } = await this._db
            .from('Strategies')
            .update({
                name: _startegy.name,
                description: _startegy.description,
                updatedAt: new Date().toISOString()
            })
            .eq('address', _startegy.shares.address)
            .select(
                `
            name,
            description,
            contractAbi,
            isPaused,
            underlyingAsset:underlyingAssetAddress(
                address,
                apiId,
                symbol,
                supply::text,
                decimals,
                isStableCoin
            ),
            shares:address(
                address,
                apiId,
                symbol,
                supply::text,
                decimals,
                isStableCoin
            )
            `
            )
            .returns<StrategyModel[]>()
            .maybeSingle();
        if (!strategy || dbError) {
            const error = new Error(ErrorCode.DB_ERROR, 'Strategy Not Found', `Strategy ${_startegy.shares.address} is not a strategy.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        // Convert supply to BigInt
        strategy.underlyingAsset.supply = BigInt(strategy.underlyingAsset.supply);
        strategy.shares.supply = BigInt(strategy.shares.supply);
        return { strategy };
    }
}
