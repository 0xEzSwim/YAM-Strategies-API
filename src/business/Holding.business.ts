import { HoldingFilter, HoldingModel } from '../models';
import { HoldingRepository } from '../repository';
import { Error } from '../errors';

export class HoldingBusiness {
    // CONSTANT
    static #instance: HoldingBusiness;
    private _holdingRepo: HoldingRepository;

    private constructor() {
        this._holdingRepo = HoldingRepository.instance;
    }

    public static get instance(): HoldingBusiness {
        if (!HoldingBusiness.#instance) {
            HoldingBusiness.#instance = new HoldingBusiness();
        }

        return HoldingBusiness.#instance;
    }

    public getHoldings(filter?: HoldingFilter): Promise<{ holdings?: HoldingModel[]; error?: Error }> {
        return this._holdingRepo.getHoldings(filter);
    }

    public getHoldingsFromStrategy(strategyAddress: `0x${string}`): Promise<{ holdings?: HoldingModel[]; error?: Error }> {
        const filter: HoldingFilter = { strategyAddresses: [strategyAddress] };
        return this._holdingRepo.getHoldings(filter);
    }

    public upsertHolding(strategyAddress: `0x${string}`, holding: HoldingModel): Promise<{ holding?: HoldingModel; error?: Error }> {
        return this._holdingRepo.upsertHolding(strategyAddress, holding);
    }

    public deleteHoldings(strategyAddress: `0x${string}`): Promise<{ error?: Error }> {
        return this._holdingRepo.deleteHoldings(strategyAddress);
    }
}
