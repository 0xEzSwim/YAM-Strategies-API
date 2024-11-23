import { AssetModel, StrategyModel } from '../models';
import { Error, ErrorCode, ServerError } from '../errors';
import { server } from '../config';
import { AssetBusiness } from './Asset.business';
import { StrategyRepository } from '../repository';
import { CryptoMarketBusiness } from './CryptoMarket.business';

export class StrategyBusiness {
    // CONSTANT
    static #instance: StrategyBusiness;
    private _strategyRepo: StrategyRepository;
    private _assetBu: AssetBusiness;
    private _cryptoBu: CryptoMarketBusiness;

    private constructor() {
        this._strategyRepo = StrategyRepository.instance;
        this._assetBu = AssetBusiness.instance;
        this._cryptoBu = CryptoMarketBusiness.instance;
    }

    public static get instance(): StrategyBusiness {
        if (!StrategyBusiness.#instance) {
            StrategyBusiness.#instance = new StrategyBusiness();
        }

        return StrategyBusiness.#instance;
    }

    private async _getStrategyName(address: `0x${string}`, abi: any): Promise<{ name?: string; error?: Error }> {
        let result: { name?: string; error?: Error } = {};
        result.name = (await server.PUBLIC_CLIENT.readContract({
            address: address,
            abi: abi,
            functionName: 'name',
            args: []
        }).catch((bcError: any) => {
            const error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling name().');
            logging.error(bcError);
            result.error = error;
        })) as string;

        return result;
    }

    private async _getStrategyUnderlyingAsset(address: `0x${string}`, abi: any): Promise<{ asset?: AssetModel; error?: Error }> {
        const assetAddress: `0x${string}` = (await server.PUBLIC_CLIENT.readContract({
            address: address,
            abi: abi,
            functionName: 'asset',
            args: []
        }).catch((bcError: any) => {
            const error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling asset().');
            logging.error(bcError);
            return { error: error };
        })) as `0x${string}`;

        let cmcTokenResult = await this._assetBu.getAssetFromAddress(assetAddress);
        if (cmcTokenResult.error) {
            return cmcTokenResult;
        }

        return { asset: cmcTokenResult.asset };
    }

    private async _getStrategyShares(address: `0x${string}`, abi: any): Promise<{ asset?: AssetModel; error?: Error }> {
        const symbol: string = (await server.PUBLIC_CLIENT.readContract({
            address: address,
            abi: abi,
            functionName: 'symbol',
            args: []
        }).catch((bcError: any) => {
            const error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling symbol().');
            logging.error(bcError);
            return { error: error };
        })) as string;

        const supply: bigint = (await server.PUBLIC_CLIENT.readContract({
            address: address,
            abi: abi,
            functionName: 'totalSupply',
            args: []
        }).catch((bcError: any) => {
            const error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling totalSupply().');
            logging.error(bcError);
            return { error: error };
        })) as bigint;

        const decimals: bigint = (await server.PUBLIC_CLIENT.readContract({
            address: address,
            abi: abi,
            functionName: 'decimals',
            args: []
        }).catch((bcError: any) => {
            const error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling decimals().');
            logging.error(bcError);
            return { error: error };
        })) as bigint;

        return {
            asset: {
                apiId: 0,
                address: address,
                symbol: symbol,
                supply: supply,
                decimals: Number(decimals),
                isStableCoin: false
            }
        };
    }

    private async _getStrategyPausedStatus(address: `0x${string}`, abi: any): Promise<{ isPaused?: boolean; error?: Error }> {
        const isPaused: boolean = (await server.PUBLIC_CLIENT.readContract({
            address: address,
            abi: abi,
            functionName: 'paused',
            args: []
        }).catch((bcError: any) => {
            const error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling paused().');
            logging.error(bcError);
            return { error: error };
        })) as boolean;

        return { isPaused: isPaused };
    }

    private async _updateStrategy(startegy: StrategyModel): Promise<{ strategy?: StrategyModel; error?: Error }> {
        // Update Assets in DB
        await this._assetBu.updateAsset(startegy.underlyingAsset);
        await this._assetBu.updateAsset(startegy.shares);

        // Update Strategy in DB
        return this._strategyRepo.updateStrategy(startegy);
    }

    public async updateStrategyFromBlockchain(address: `0x${string}`): Promise<{ strategy?: StrategyModel; error?: Error }> {
        const strategyResult = await this.getStrategy(address);
        if (strategyResult.error) {
            return strategyResult;
        }
        let strategy: StrategyModel = strategyResult.strategy!;

        const nameResult = await this._getStrategyName(address, strategy.contractAbi);
        if (nameResult.error) {
            return nameResult;
        }
        strategy.name = nameResult.name!;

        const underlyingAssetResult = await this._getStrategyUnderlyingAsset(address, strategy.contractAbi);
        if (underlyingAssetResult.error) {
            return underlyingAssetResult;
        }
        strategy.underlyingAsset = underlyingAssetResult.asset!;

        const sharesResult = await this._getStrategyShares(address, strategy.contractAbi);
        if (sharesResult.error) {
            return sharesResult;
        }
        strategy.shares = sharesResult.asset!;

        const isPausedResult = await this._getStrategyPausedStatus(address, strategy.contractAbi);
        if (isPausedResult.error) {
            return isPausedResult;
        }
        strategy.isPaused = isPausedResult.isPaused!;

        return this._updateStrategy(strategy);
    }

    public async getStrategy(address: `0x${string}`, hasLogo: boolean = false): Promise<{ strategy?: StrategyModel; error?: Error }> {
        const strategyResult = await this._strategyRepo.getStrategy(address);
        if (strategyResult.error) {
            return strategyResult;
        }
        const strategy = strategyResult.strategy!;

        if (!hasLogo) {
            return { strategy };
        }

        let logoResult = await this._cryptoBu.getTokenLogoUrl(strategy.underlyingAsset.address);
        strategy.underlyingAsset.logoUrl = logoResult.logoUrl;

        return { strategy };
    }

    public async getAllStrategies(hasLogo: boolean = false): Promise<{ strategies?: StrategyModel[]; error?: Error }> {
        const strategiesResult = await this._strategyRepo.getAllStrategies();
        if (strategiesResult.error) {
            return strategiesResult;
        }
        const strategies = strategiesResult.strategies!;

        if (!hasLogo) {
            return { strategies };
        }

        const StrategiesWithLogo: StrategyModel[] = [];
        for (let index = 0; index < strategies.length; index++) {
            const strategy = strategies[index];
            let logoResult = await this._cryptoBu.getTokenLogoUrl(strategy.underlyingAsset.address);
            strategy.underlyingAsset.logoUrl = logoResult.logoUrl;
            StrategiesWithLogo.push(strategy);
        }

        return { strategies: StrategiesWithLogo };
    }
}
