import { SupabaseClient } from '@supabase/supabase-js';
import { server } from '../config';
import { Database, StrategyHoldingFilter, StrategyHoldingModel } from '../models';
import { Error, ErrorCode } from '../errors';
import { toJson } from '../library';

type StrategyHoldingView = Database['public']['Views']['StrategyHoldings']['Row'];

export class StrategyHoldingRepository {
    // CONSTANT
    static #instance: StrategyHoldingRepository;
    private _db: SupabaseClient;

    private constructor() {
        this._db = server.DB_CLIENT;
    }

    public static get instance(): StrategyHoldingRepository {
        if (!StrategyHoldingRepository.#instance) {
            StrategyHoldingRepository.#instance = new StrategyHoldingRepository();
        }

        return StrategyHoldingRepository.#instance;
    }

    private _toModel(holdingView: StrategyHoldingView): StrategyHoldingModel {
        return {
            address: holdingView.assetAddress as `0x${string}`,
            symbol: holdingView.assetSymbol as string,
            value: { value: BigInt(holdingView.assetValue as string), decimals: holdingView.assetValueDecimals as number },
            amount: { value: BigInt(holdingView.assetAmount as string), decimals: holdingView.assetAmountDecimals as number },
            allocation: { value: BigInt(holdingView.strategyAllocation as string), decimals: holdingView.assetValueDecimals as number }
        };
    }

    private _buildAssetQuery(filter?: StrategyHoldingFilter) {
        let query = this._db.from('StrategyHoldings').select();

        if (!!filter?.strategyAddresses?.length) {
            query = query.in('strategyAddress', filter.strategyAddresses);
        }

        if (!!filter?.assetAddresses?.length) {
            query = query.in('assetAddress', filter.assetAddresses);
        }

        if (!!filter?.symbols?.length) {
            query = query.in('shareSymbol', filter.symbols);
        }

        return query.returns<StrategyHoldingView[]>();
    }

    public async getHoldings(filter?: StrategyHoldingFilter): Promise<{ holdings?: StrategyHoldingModel[]; error?: Error }> {
        const { data: holdingsData, error: dbError } = await this._buildAssetQuery(filter);
        if (dbError) {
            const error = new Error(ErrorCode.DB_ERROR, 'Holdings SELECT Error', `Could not request Holdings to DB.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        if (!holdingsData?.length) {
            const error = new Error(ErrorCode.HOLDINGS_NOT_FOUND, 'Holdings Not Found', `Could not find holdings.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        const holdings: StrategyHoldingModel[] = holdingsData.map((holdingData) => {
            return this._toModel(holdingData);
        });

        return { holdings };
    }

    public async upsertHolding(
        _startegyAddress: `0x${string}`,
        _holding: StrategyHoldingModel
    ): Promise<{ holding?: StrategyHoldingModel; error?: Error }> {
        let { error: dbError } = await this._db.from('Strategies_Assets').upsert({
            strategyAddress: _startegyAddress,
            assetAddress: _holding.address,
            amount: toJson(_holding.amount.value),
            value: toJson(_holding.value.value),
            updatedAt: new Date().toISOString()
        });

        if (dbError) {
            const error = new Error(ErrorCode.DB_ERROR, 'Strategy Holding UPDATE Error', `Could not update Strategy Holding to DB.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        const holdingResult = await this.getHoldings({ strategyAddresses: [_startegyAddress], assetAddresses: [_holding.address] });
        if (holdingResult.error) {
            return holdingResult;
        }
        const holding = holdingResult.holdings![0];

        return { holding };
    }

    public async deleteHoldings(_startegyAddress: `0x${string}`): Promise<{ error?: Error }> {
        let { error: dbError } = await this._db.from('Strategies_Assets').delete().eq('strategyAddress', _startegyAddress);

        if (dbError) {
            const error = new Error(ErrorCode.DB_ERROR, 'Holding UPDATE Error', `Could not delete Holding to DB.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        return {};
    }
}
