import { erc20Abi } from 'viem';
import { server } from '../config';
import { ErrorCode, ServerError } from '../errors';
import { FloatModel, Offer } from '../models';
import { StrategyBusiness } from './Strategy.business';

export class YAMStrategyCSMBusiness {
    // CONSTANT
    static #instance: YAMStrategyCSMBusiness;
    private _strategyBu: StrategyBusiness;

    private _YAM_STRATEGY_CSM_ADDRESS: `0x${string}` = (process.env.YAM_STRATEGY_CSM_ADDRESS ?? '0x') as `0x${string}`;

    private constructor() {
        this._strategyBu = StrategyBusiness.instance;
    }

    public static get instance(): YAMStrategyCSMBusiness {
        if (!YAMStrategyCSMBusiness.#instance) {
            YAMStrategyCSMBusiness.#instance = new YAMStrategyCSMBusiness();
        }

        return YAMStrategyCSMBusiness.#instance;
    }

    //#region Tests
    private async _checkYAMStrategyCSMAllowance(strategyAddress: `0x${string}`): Promise<{ allowance?: FloatModel; error?: Error }> {
        const strategyResult = await this._strategyBu.getStrategy(strategyAddress);
        if (strategyResult.error) {
            return strategyResult;
        }
        const strategy = strategyResult.strategy!;

        let result: { allowance: FloatModel } = { allowance: { value: 0n, decimals: strategy.underlyingAsset.decimals } };
        result.allowance.value = await server.PUBLIC_CLIENT.readContract({
            address: strategy.underlyingAsset.address,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [server.MODERATOR_ACCOUNT.address, strategy.share.address]
        });
        logging.info('allowance: ');
        console.log(result.allowance);
        return result;
    }

    private async _approveYAMStrategyCSM(strategyAddress: `0x${string}`, amount: FloatModel): Promise<{ success?: boolean; error?: Error }> {
        const strategyResult = await this._strategyBu.getStrategy(strategyAddress);
        if (strategyResult.error) {
            return strategyResult;
        }
        const strategy = strategyResult.strategy!;

        let result: { request?: any; error?: Error } = {};
        await server.PUBLIC_CLIENT.simulateContract({
            account: server.MODERATOR_ACCOUNT,
            address: strategy.underlyingAsset.address,
            abi: erc20Abi,
            functionName: 'approve',
            args: [strategy.share.address, amount.value]
        })
            .then(({ request }) => {
                result.request = request;
            })
            .catch((bcError: any) => {
                const error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed simulation', 'Simulation failed at calling approve().');
                logging.error(bcError);
                result.error = error;
            });
        if (result.error) {
            return result;
        }

        const hash: `0x${string}` = await server.WALLET_CLIENT.writeContract(result.request);
        const transaction = await server.PUBLIC_CLIENT.waitForTransactionReceipt({
            hash: hash
        });
        if (transaction.status !== 'success') {
            const error = new ServerError(ErrorCode.SERVER_ERROR, 'Transaction Failed ', 'Transaction failed at calling buyMaxCSMTokenFromOffer().');
            logging.error(error);
            console.error(transaction);
            return { error };
        }

        return { success: true };
    }

    private async _subscribeToYAMStrategyCSM(
        strategyAddress: `0x${string}`,
        amount: FloatModel,
        receiver: `0x${string}`
    ): Promise<{ success?: boolean; error?: Error }> {
        const strategyResult = await this._strategyBu.getStrategy(strategyAddress);
        if (strategyResult.error) {
            return strategyResult;
        }
        const strategy = strategyResult.strategy!;

        let result: { request?: any; error?: Error } = {};
        await server.PUBLIC_CLIENT.simulateContract({
            account: server.MODERATOR_ACCOUNT,
            address: strategy.share.address,
            abi: strategy.contractAbi,
            functionName: 'deposit',
            args: [amount.value, receiver]
        })
            .then(({ request }) => {
                result.request = request;
            })
            .catch((bcError: any) => {
                const error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed simulation', 'Simulation failed at calling deposit().');
                logging.error(bcError);
                result.error = error;
            });
        if (result.error) {
            return result;
        }

        const hash: `0x${string}` = await server.WALLET_CLIENT.writeContract(result.request);
        const transaction = await server.PUBLIC_CLIENT.waitForTransactionReceipt({
            hash: hash
        });
        if (transaction.status !== 'success') {
            const error = new ServerError(ErrorCode.SERVER_ERROR, 'Transaction Failed ', 'Transaction failed at calling buyMaxCSMTokenFromOffer().');
            logging.error(error);
            console.error(transaction);
            return { error };
        }

        return { success: true };
    }

    public getUndervaluedStrategyAllowance(startegyAddress: `0x${string}`): Promise<{ allowance?: FloatModel; error?: Error }> {
        return this._checkYAMStrategyCSMAllowance(startegyAddress);
    }

    public addUndervaluedStrategyAllowance(startegyAddress: `0x${string}`, amount: FloatModel): Promise<{ success?: boolean; error?: Error }> {
        return this._approveYAMStrategyCSM(startegyAddress, amount);
    }

    public subscribeToUndervaluedStrategy(
        startegyAddress: `0x${string}`,
        amount: FloatModel,
        receiver: `0x${string}`
    ): Promise<{ success?: boolean; error?: Error }> {
        return this._subscribeToYAMStrategyCSM(startegyAddress, amount, receiver);
    }
    //#endregion

    public async buyOfferWithStrategy(offer: Offer): Promise<{ success?: boolean; error?: Error }> {
        let strategyResult = await this._strategyBu.getStrategy(this._YAM_STRATEGY_CSM_ADDRESS);
        if (strategyResult.error) {
            return strategyResult;
        }
        const strategy = strategyResult.strategy!;

        let result: { request?: any; error?: Error } = {};
        await server.PUBLIC_CLIENT.simulateContract({
            account: server.MODERATOR_ACCOUNT,
            address: strategy.share.address,
            abi: strategy.contractAbi,
            functionName: 'buyMaxCSMTokenFromOffer',
            args: [offer.offerId, offer.offerToken, offer.buyerToken, offer.price.value, offer.amount.value]
        })
            .then(({ request }) => {
                result.request = request;
            })
            .catch((bcError: any) => {
                const error = new ServerError(ErrorCode.SERVER_ERROR, 'Simulation Failed', 'Simulation failed at calling buyMaxCSMTokenFromOffer().');
                logging.error(bcError);
                result.error = error;
            });
        if (result.error) {
            return result;
        }

        const hash: `0x${string}` = await server.WALLET_CLIENT.writeContract(result.request);
        const transaction = await server.PUBLIC_CLIENT.waitForTransactionReceipt({
            hash: hash
        });
        if (transaction.status !== 'success') {
            const error = new ServerError(ErrorCode.SERVER_ERROR, 'Transaction Failed ', 'Transaction failed at calling buyMaxCSMTokenFromOffer().');
            logging.error(error);
            console.error(transaction);
            return { error };
        }

        strategyResult = await this._strategyBu.updateStrategyFromBlockchain(strategy.share.address);
        if (strategyResult.error) {
            return strategyResult;
        }

        return { success: true };
    }

    //#region LISTENERS
    public async listenToYAMStrategyCSMStorage(): Promise<{ error?: Error }> {
        let strategyResult = await this._strategyBu.getStrategy(this._YAM_STRATEGY_CSM_ADDRESS);
        if (strategyResult.error) {
            return strategyResult;
        }
        const strategy = strategyResult.strategy!;

        const unwatch = server.PUBLIC_CLIENT.watchContractEvent({
            address: strategy.share.address,
            abi: strategy.contractAbi,
            eventName: ['Paused', 'Unpaused', 'Deposit', 'Withdraw'],
            onLogs: async (logs) => {
                await this._strategyBu.updateStrategyFromBlockchain(strategy.share.address);
            }
        });

        return {};
    }
    //#endregion
}
