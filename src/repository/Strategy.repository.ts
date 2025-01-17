import { SupabaseClient } from '@supabase/supabase-js';
import { server } from '../config';
import { Database, StrategyFilter, StrategyModel } from '../models';
import { Error, ErrorCode } from '../errors';
import { toJson } from '../library';

type FullStartegyView = Database['public']['Views']['FullStrategies']['Row'];

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

    private _toModel(startegyView: FullStartegyView): StrategyModel {
        return new StrategyModel({
            name: startegyView.name as string,
            description: startegyView.description as string,
            contractAbi: startegyView.contractAbi,
            isPaused: startegyView.isPaused as boolean,
            underlyingAsset: {
                oracleIds: {
                    cmcId: startegyView.underlyingAssetCmcId as number,
                    csmId: startegyView.underlyingAssetCsmId as number,
                    realtId: startegyView.underlyingAssetRealtId as `0x${string}`
                },
                address: startegyView.underlyingAssetAddress! as `0x${string}`,
                symbol: startegyView.underlyingAssetSymbol as string,
                supply: BigInt(startegyView.underlyingAssetSupply as string),
                decimals: startegyView.underlyingAssetDecimals as number,
                isStableCoin: startegyView.underlyingAssetIsStableCoin as boolean
            },
            share: {
                oracleIds: {
                    cmcId: startegyView.shareCmcId as number,
                    csmId: startegyView.shareCsmId as number,
                    realtId: startegyView.shareRealtId as `0x${string}`
                },
                address: startegyView.shareAddress! as `0x${string}`,
                symbol: startegyView.shareSymbol as string,
                supply: BigInt(startegyView.shareSupply as string),
                decimals: startegyView.shareDecimals as number,
                isStableCoin: startegyView.shareIsStableCoin as boolean
            },
            tvl: { value: BigInt(startegyView.tvl as string), decimals: startegyView.underlyingAssetDecimals as number }
        });
    }

    private _buildStrategyQuery(filter?: StrategyFilter) {
        let query = this._db.from('FullStrategies').select();

        if (!!filter?.addresses?.length) {
            query = query.in('shareAddress', filter.addresses);
        }

        if (!!filter?.symbols?.length) {
            query = query.in('shareSymbol', filter.symbols);
        }

        if (!!filter?.underlyingAssetAddresses?.length) {
            query = query.in('underlyingAssetAddress', filter.underlyingAssetAddresses);
        }

        if (filter?.isPaused != undefined) {
            query = query.eq('isPaused', filter.isPaused);
        }

        return query.returns<FullStartegyView[]>();
    }

    public async getStrategies(filter?: StrategyFilter): Promise<{ strategies?: StrategyModel[]; error?: Error }> {
        const { data: strategiesData, error: dbError } = await this._buildStrategyQuery(filter);
        if (dbError) {
            const error = new Error(ErrorCode.DB_ERROR, 'Strategies SELECT Error', `Could not request Strategies to DB.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        if (!strategiesData?.length) {
            const error = new Error(ErrorCode.STRATEGIY_NOT_FOUND, 'Strategies Not Found', `Could not find strategies.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        const strategies: StrategyModel[] = strategiesData.map((strategyData) => {
            return this._toModel(strategyData);
        });

        return { strategies };
    }

    public async updateStrategy(_startegy: StrategyModel): Promise<{ strategy?: StrategyModel; error?: Error }> {
        let { error: dbError } = await this._db
            .from('Strategies')
            .update({
                name: _startegy.name,
                description: _startegy.description,
                isPaused: _startegy.isPaused,
                tvl: toJson(_startegy.tvl.value),
                updatedAt: new Date().toISOString()
            })
            .eq('address', _startegy.share.address);

        if (dbError) {
            const error = new Error(ErrorCode.DB_ERROR, 'Strategy UPDATE Error', `Could not update Strategy ${_startegy.share.address} to DB.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        const strategyResult = await this.getStrategies({ addresses: [_startegy.share.address] });
        if (strategyResult.error) {
            return strategyResult;
        }
        const strategy = strategyResult.strategies![0];

        return { strategy };
    }
}
