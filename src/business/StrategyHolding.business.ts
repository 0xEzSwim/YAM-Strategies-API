import { StrategyHoldingFilter, StrategyHoldingModel } from '../models';
import { StrategyHoldingRepository } from '../repository';
import { Error } from '../errors';

export class StrategyHoldingBusiness {
    // CONSTANT
    static #instance: StrategyHoldingBusiness;
    private _strategyHoldingRepo: StrategyHoldingRepository;

    private constructor() {
        this._strategyHoldingRepo = StrategyHoldingRepository.instance;
    }

    public static get instance(): StrategyHoldingBusiness {
        if (!StrategyHoldingBusiness.#instance) {
            StrategyHoldingBusiness.#instance = new StrategyHoldingBusiness();
        }

        return StrategyHoldingBusiness.#instance;
    }

    public getHoldings(filter?: StrategyHoldingFilter): Promise<{ holdings?: StrategyHoldingModel[]; error?: Error }> {
        return this._strategyHoldingRepo.getHoldings(filter);
    }

    public getHoldingsFromStrategy(strategyAddress: `0x${string}`): Promise<{ holdings?: StrategyHoldingModel[]; error?: Error }> {
        const filter: StrategyHoldingFilter = { strategyAddresses: [strategyAddress] };
        return this._strategyHoldingRepo.getHoldings(filter);
    }

    public upsertHolding(strategyAddress: `0x${string}`, holding: StrategyHoldingModel): Promise<{ holding?: StrategyHoldingModel; error?: Error }> {
        return this._strategyHoldingRepo.upsertHolding(strategyAddress, holding);
    }

    public deleteHoldings(strategyAddress: `0x${string}`): Promise<{ error?: Error }> {
        return this._strategyHoldingRepo.deleteHoldings(strategyAddress);
    }
}
