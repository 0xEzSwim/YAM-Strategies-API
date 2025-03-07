import { AssetFilter, AssetModel, FloatModel, StrategyFilter, StrategyModel, StrategyHoldingFilter, StrategyHoldingModel } from '../models';
import { Error, ErrorCode, ServerError } from '../errors';
import { server } from '../config';
import { AssetBusiness } from './Asset.business';
import { StrategyRepository } from '../repository';
import { CryptoMarketBusiness } from './markets/CryptoMarket.business';
import { StrategyHoldingBusiness } from './StrategyHolding.business';
import { erc20Abi } from 'viem';

export class StrategyBusiness {
    // CONSTANT
    static #instance: StrategyBusiness;
    private _strategyRepo: StrategyRepository;
    private _assetBu: AssetBusiness;
    private _strategyHoldingBu: StrategyHoldingBusiness;
    private _cryptoBu: CryptoMarketBusiness;

    private constructor() {
        this._strategyRepo = StrategyRepository.instance;
        this._assetBu = AssetBusiness.instance;
        this._strategyHoldingBu = StrategyHoldingBusiness.instance;
        this._cryptoBu = CryptoMarketBusiness.instance;
    }

    public static get instance(): StrategyBusiness {
        if (!StrategyBusiness.#instance) {
            StrategyBusiness.#instance = new StrategyBusiness();
        }

        return StrategyBusiness.#instance;
    }

    //#region GET
    public async getAllStrategies(hasLogo: boolean = false): Promise<{ strategies?: StrategyModel[]; error?: Error }> {
        const strategiesResult = await this._strategyRepo.getStrategies();
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

    public async getStrategy(address: `0x${string}`, hasLogo: boolean = false): Promise<{ strategy?: StrategyModel; error?: Error }> {
        const strategyFilter: StrategyFilter = { addresses: [address] };
        const strategyResult = await this._strategyRepo.getStrategies(strategyFilter);
        if (strategyResult.error) {
            return strategyResult;
        }
        const strategy = strategyResult.strategies![0];

        const holdingFilter: StrategyHoldingFilter = { strategyAddresses: [address] };
        const holdingResult = await this._strategyHoldingBu.getHoldings(holdingFilter);
        if (holdingResult.error) {
            holdingResult.holdings = [];
        }
        strategy.holdings = holdingResult.holdings!;

        if (!hasLogo) {
            return { strategy };
        }

        let logoResult = await this._cryptoBu.getTokenLogoUrl(strategy.underlyingAsset.address);
        strategy.underlyingAsset.logoUrl = logoResult.logoUrl;

        return { strategy };
    }
    //#endregion

    //#region UPDATE
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
        })) as string | undefined;

        return result;
    }

    private async _getStrategyUnderlyingAsset(address: `0x${string}`, abi: any): Promise<{ asset?: AssetModel; error?: Error }> {
        let error: Error | undefined;

        const assetAddress: `0x${string}` | undefined = (await server.PUBLIC_CLIENT.readContract({
            address: address,
            abi: abi,
            functionName: 'asset',
            args: []
        }).catch((bcError: any) => {
            const error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling asset().');
            logging.error(bcError);
            return undefined;
        })) as `0x${string}` | undefined;
        if (error) {
            return { error };
        }

        const filter: AssetFilter = { addresses: [assetAddress!] };
        let underlyingAssetResult = await this._assetBu.getAssets(filter);
        if (underlyingAssetResult.error) {
            return underlyingAssetResult;
        }
        const underlyingAsset = underlyingAssetResult.assets![0];

        const symbol: string | undefined = (await server.PUBLIC_CLIENT.readContract({
            address: underlyingAsset.address,
            abi: erc20Abi,
            functionName: 'symbol',
            args: []
        }).catch((bcError: any) => {
            const error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling symbol().');
            logging.error(bcError);
            return undefined;
        })) as string | undefined;
        if (error) {
            return { error };
        }
        underlyingAsset.symbol = symbol!;

        const supply: bigint | undefined = (await server.PUBLIC_CLIENT.readContract({
            address: underlyingAsset.address,
            abi: erc20Abi,
            functionName: 'totalSupply',
            args: []
        }).catch((bcError: any) => {
            const error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling totalSupply().');
            logging.error(bcError);
            return undefined;
        })) as bigint | undefined;
        if (error) {
            return { error };
        }
        underlyingAsset.supply = supply!;

        const decimals: number | undefined = await server.PUBLIC_CLIENT.readContract({
            address: underlyingAsset.address,
            abi: erc20Abi,
            functionName: 'decimals',
            args: []
        }).catch((bcError: any) => {
            error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling decimals().');
            logging.error(bcError);
            return undefined;
        });
        if (error) {
            return { error };
        }
        underlyingAsset.decimals = decimals!;

        return { asset: underlyingAsset };
    }

    private async _getStrategyShares(address: `0x${string}`, abi: any): Promise<{ asset?: AssetModel; error?: Error }> {
        let error: Error | undefined;

        const symbol: string | undefined = (await server.PUBLIC_CLIENT.readContract({
            address: address,
            abi: abi,
            functionName: 'symbol',
            args: []
        }).catch((bcError: any) => {
            const error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling symbol().');
            logging.error(bcError);
            return undefined;
        })) as string | undefined;
        if (error) {
            return { error };
        }

        const supply: bigint | undefined = (await server.PUBLIC_CLIENT.readContract({
            address: address,
            abi: abi,
            functionName: 'totalSupply',
            args: []
        }).catch((bcError: any) => {
            const error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling totalSupply().');
            logging.error(bcError);
            return undefined;
        })) as bigint | undefined;
        if (error) {
            return { error };
        }

        const decimals: number | undefined = (await server.PUBLIC_CLIENT.readContract({
            address: address,
            abi: abi,
            functionName: 'decimals',
            args: []
        }).catch((bcError: any) => {
            const error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling decimals().');
            logging.error(bcError);
            return undefined;
        })) as number | undefined;
        if (error) {
            return { error };
        }

        return {
            asset: {
                address: address,
                oracleIds: {},
                symbol: symbol!,
                supply: supply!,
                decimals: decimals!,
                isStableCoin: false
            }
        };
    }

    private async _getStrategyPausedStatus(address: `0x${string}`, abi: any): Promise<{ isPaused?: boolean; error?: Error }> {
        let result: { isPaused?: boolean; error?: Error } = {};
        result.isPaused = (await server.PUBLIC_CLIENT.readContract({
            address: address,
            abi: abi,
            functionName: 'paused',
            args: []
        }).catch((bcError: any) => {
            const error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling paused().');
            logging.error(bcError);
            result.error = error;
        })) as boolean | undefined;

        return result;
    }

    private async _getStrategyTvl(address: `0x${string}`, abi: any): Promise<{ tvl?: bigint; error?: Error }> {
        let result: { tvl?: bigint; error?: Error } = {};
        result.tvl = (await server.PUBLIC_CLIENT.readContract({
            address: address,
            abi: abi,
            functionName: 'tvl',
            args: []
        }).catch((bcError: any) => {
            const error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling tvl().');
            logging.error(bcError);
            result.error = error;
        })) as bigint | undefined;

        return result;
    }

    private async _getStrategyHolding(
        startegyAddress: `0x${string}`,
        assetAddress: `0x${string}`,
        abi: any
    ): Promise<{ holding?: { averageBuyingPrice: bigint; amount: FloatModel }; error?: Error }> {
        let error: Error | undefined;

        const amount: bigint | undefined = await server.PUBLIC_CLIENT.readContract({
            address: assetAddress,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [startegyAddress]
        }).catch((bcError: any) => {
            const error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling balanceOf().');
            logging.error(bcError);
            return undefined;
        });
        if (error) {
            return { error };
        }

        const decimals: number | undefined = await server.PUBLIC_CLIENT.readContract({
            address: assetAddress,
            abi: erc20Abi,
            functionName: 'decimals',
            args: []
        }).catch((bcError: any) => {
            error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling decimals().');
            logging.error(bcError);
            return undefined;
        });
        if (error) {
            return { error };
        }

        const avgBuyingPrice = (await server.PUBLIC_CLIENT.readContract({
            address: startegyAddress,
            abi: abi,
            functionName: 'tokenAverageBuyingPrice',
            args: [assetAddress]
        }).catch((bcError: any) => {
            error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling tokenAverageBuyingPrice().');
            logging.error(bcError);
            return undefined;
        })) as bigint | undefined;
        if (error) {
            return { error };
        }

        return {
            holding: {
                averageBuyingPrice: avgBuyingPrice!,
                amount: {
                    value: amount!,
                    decimals: decimals!
                }
            }
        };
    }

    private async _updateStrategy(startegy: StrategyModel): Promise<{ strategy?: StrategyModel; error?: Error }> {
        // Update Assets in DB
        await this._assetBu.updateAsset(startegy.underlyingAsset);
        await this._assetBu.updateAsset(startegy.share);

        // Upsert Holdings in DB
        if (!startegy.holdings?.length) {
            await this._strategyHoldingBu.deleteHoldings(startegy.share.address);
        } else {
            for (let index = 0; index < startegy.holdings.length; index++) {
                const holding = startegy.holdings[index];
                await this._strategyHoldingBu.upsertHolding(startegy.share.address, holding);
            }
        }

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
        strategy.share = sharesResult.asset!;

        const isPausedResult = await this._getStrategyPausedStatus(address, strategy.contractAbi);
        if (isPausedResult.error) {
            return isPausedResult;
        }
        strategy.isPaused = isPausedResult.isPaused!;

        const isTvlResult = await this._getStrategyTvl(address, strategy.contractAbi);
        if (isTvlResult.error) {
            return isTvlResult;
        }
        strategy.tvl = { value: isTvlResult.tvl!, decimals: strategy.underlyingAsset.decimals };

        let newHoldings: StrategyHoldingModel[] = [];
        let error: Error | undefined;
        const underlyingAssetAmount: bigint | undefined = (await server.PUBLIC_CLIENT.readContract({
            address: strategy.share.address,
            abi: strategy.contractAbi,
            functionName: 'totalAssets',
            args: []
        }).catch((bcError: any) => {
            error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling totalAssets().');
            logging.error(bcError);
            return undefined;
        })) as bigint | undefined;
        if (error) {
            return { error };
        }

        newHoldings.push({
            address: strategy.underlyingAsset.address,
            symbol: strategy.underlyingAsset.symbol,
            value: {
                value: BigInt(10 ** strategy.underlyingAsset.decimals),
                decimals: strategy.underlyingAsset.decimals
            },
            amount: { value: underlyingAssetAmount!, decimals: strategy.underlyingAsset.decimals },
            allocation: { value: underlyingAssetAmount! / strategy.tvl.value, decimals: strategy.underlyingAsset.decimals }
        });

        const holdingsCount = (await server.PUBLIC_CLIENT.readContract({
            address: address,
            abi: strategy.contractAbi,
            functionName: 'holdingsCount',
            args: []
        }).catch((bcError: any) => {
            error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling holdingsCount().');
            logging.error(bcError);
            return undefined;
        })) as bigint | undefined;
        if (error) {
            return { error };
        }

        const holdingsLUT = (await server.PUBLIC_CLIENT.readContract({
            address: address,
            abi: strategy.contractAbi,
            functionName: 'holdingsAddress',
            args: []
        }).catch((bcError: any) => {
            error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Request failed at calling holdingsAddress().');
            logging.error(bcError);
            return undefined;
        })) as `0x${string}`[] | undefined;
        if (error) {
            return { error };
        }

        for (let index = 0; index < holdingsCount!; index++) {
            const assetAddress = holdingsLUT![index];
            const holdingResult = await this._getStrategyHolding(address, assetAddress, strategy.contractAbi);
            if (holdingResult.error) {
                console.error(holdingResult.error);
                continue;
            }

            if (holdingResult.holding!.averageBuyingPrice <= 0n) {
                continue;
            }

            newHoldings.push({
                address: assetAddress,
                symbol: '',
                value: {
                    value: holdingResult.holding!.averageBuyingPrice,
                    decimals: strategy.underlyingAsset.decimals
                },
                amount: { value: holdingResult.holding!.amount.value, decimals: holdingResult.holding!.amount.decimals },
                allocation: {
                    value: (holdingResult.holding!.amount.value * holdingResult.holding!.averageBuyingPrice) / strategy.tvl.value,
                    decimals: strategy.underlyingAsset.decimals
                }
            });
        }
        strategy.holdings = newHoldings;

        return this._updateStrategy(strategy);
    }
    //#endregion
}
