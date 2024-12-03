import axios from 'axios';
import { server } from '../config';
import { Error, ErrorCode, ServerError } from '../errors';
import { AssetFilter, AssetModel, FloatModel, Offer } from '../models';
import { CryptoMarketBusiness } from './CryptoMarket.business';
import { cleanSatMiningContract } from '../smart-contracts';
import { convertNumberToBigInt } from '../library';
import { AssetBusiness } from './Asset.business';
import { YAMStrategyCSMBusiness } from './YAMStrategyCSM.business';

export class CleanSatMiningBusiness {
    // CONSTANT
    static #instance: CleanSatMiningBusiness;
    private _assetBu: AssetBusiness;
    private _yamStrategyCSMBu: YAMStrategyCSMBusiness;
    private _cmcBu: CryptoMarketBusiness;

    private _CSM_API_HOSTNAME: string = process.env.CSM_API_HOSTNAME ?? '';
    private _CLEANSAT_MINING_ADDRESS: `0x${string}` = (process.env.CLEANSAT_MINING_ADDRESS ?? '0x') as `0x${string}`;

    public offers: Offer[] = [];

    private constructor() {
        this._assetBu = AssetBusiness.instance;
        this._yamStrategyCSMBu = YAMStrategyCSMBusiness.instance;
        this._cmcBu = CryptoMarketBusiness.instance;
    }

    public static get instance(): CleanSatMiningBusiness {
        if (!CleanSatMiningBusiness.#instance) {
            CleanSatMiningBusiness.#instance = new CleanSatMiningBusiness();
        }

        return CleanSatMiningBusiness.#instance;
    }

    //#region Third party Call
    private async _getCSMTokenPrice(_csmTokenApiId: number): Promise<{ price?: FloatModel; error?: Error }> {
        let result: { price: FloatModel; error?: Error } = {
            price: {
                value: 0n,
                decimals: 2 // USD goes to the cent (0,01 is the smallest unit)
            }
        };

        const options = {
            method: 'GET',
            url: `${this._CSM_API_HOSTNAME}/sites/${_csmTokenApiId}`
        };
        await axios
            .request(options)
            .then(({ data }: { data: { status: any; data: any } }) => {
                let price: number = data.data.token.price; // In USD
                result.price.value = convertNumberToBigInt(price, result.price.decimals);
                logging.info(`Received data from ${options.url}:`);
                console.log(result.price);
            })
            .catch((error: any) => {
                logging.error(error);
                result.error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Failed third party request.', 500);
            });

        return result;
    }

    private async _getCSMTokenTreasury(_csmTokenApiId: number): Promise<{ amount?: FloatModel; error?: Error }> {
        let result: { amount: FloatModel; error?: Error } = {
            amount: {
                value: 0n,
                decimals: 8 // BTC always has decimals (1 satoshi = 1e8 BTC)
            }
        };

        const options = {
            method: 'GET',
            url: `${this._CSM_API_HOSTNAME}/sites/${_csmTokenApiId}/treasury`
        };
        await axios
            .request(options)
            .then(
                ({
                    data
                }: {
                    data: {
                        balance: number;
                        unconfirmed_balance: number;
                        final_balance: number;
                    };
                }) => {
                    result.amount.value = BigInt(data.final_balance); // already converted to INT
                    logging.info(`Received data from ${options.url}:`);
                    console.log(result.amount);
                }
            )
            .catch((error: any) => {
                logging.error(error);
                result.error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Failed third party request.', 500);
            });

        return result;
    }
    //#endregion

    //#region Fundamental Value
    public async getCSMTokenFundamentalValue(
        tokenAddress: `0x${string}`,
        withMarginOfSafty?: bigint
    ): Promise<{ fundamentalValue?: FloatModel; error?: Error }> {
        const filter: AssetFilter = { addresses: [tokenAddress], isCSMToken: true };
        let csmTokenResult = await this._assetBu.getAssets(filter);
        if (csmTokenResult.error) {
            return csmTokenResult;
        }
        let csmToken: AssetModel = csmTokenResult.assets![0];
        let csmTokenSupply: FloatModel = { value: csmToken.supply, decimals: csmToken.decimals }; // moves the least (replace with onchain data later)

        let csmTokenPriceResult = await this._getCSMTokenPrice(csmToken.apiId); // moves rarely
        if (csmTokenPriceResult.error) {
            return csmTokenPriceResult;
        }
        let csmTokenPrice: FloatModel = csmTokenPriceResult.price!;

        let csmTokenTreasuryResult = await this._getCSMTokenTreasury(csmToken.apiId); // moves less
        if (csmTokenTreasuryResult.error) {
            return csmTokenTreasuryResult;
        }
        let csmTokenTreasury: FloatModel = csmTokenTreasuryResult.amount!;

        let btcPriceResult = await this._cmcBu.getBTCLastPrice(); // moves the most
        if (btcPriceResult.error) {
            return btcPriceResult;
        }
        let btcPrice: FloatModel = btcPriceResult.price!;

        if (withMarginOfSafty) {
            btcPrice.value = (btcPrice.value * (100n - withMarginOfSafty)) / 100n;
        }

        //         10**2                  10**8                  10**2              10**1                       10**9
        let tokenFundamentalValue: bigint =
            csmTokenPrice.value + (csmTokenTreasury.value * btcPrice.value * convertNumberToBigInt(1, 1)) / csmTokenSupply.value;
        let fundamentalValue: FloatModel = { value: tokenFundamentalValue, decimals: csmTokenPrice.decimals };
        logging.info('CSM token fundamental value:');
        console.log(fundamentalValue);
        return { fundamentalValue };
    }

    private async _calculateSellingOfferPnL(offer: Offer, withMarginOfSafty?: bigint): Promise<{ pnl?: FloatModel; error?: Error }> {
        const filter: AssetFilter = { addresses: [offer.buyerToken], isStableCoin: true };
        let csmTokenResult = await this._assetBu.getAssets(filter);
        if (csmTokenResult.error) {
            const error = new Error(ErrorCode.OFFER_WRONG_TYPE, 'Not a sell', `Offer #${Number(offer.offerId)} is not a selling offer.`);
            logging.error(error);
            return { error };
        }

        // Get Price of CSM Token in USD from Offer
        let buyerTokenUSDResult = await this._cmcBu.getStablecoinLastPrice(offer.buyerToken);
        if (buyerTokenUSDResult.error) {
            logging.error(buyerTokenUSDResult.error);
            return buyerTokenUSDResult;
        }
        let offerTokenUSDPrice: FloatModel = {
            value: (offer.price.value * buyerTokenUSDResult.price!.value) / convertNumberToBigInt(1, offer.price.decimals),
            decimals: buyerTokenUSDResult.price!.decimals
        };

        // Get Fundamental value of CSM Token in USD
        let fundamentValueResult = await this.getCSMTokenFundamentalValue(offer.offerToken, withMarginOfSafty);
        if (fundamentValueResult.error) {
            logging.error(fundamentValueResult.error);
            return fundamentValueResult;
        }

        // Calulate PnL: Fundamental value - Price
        let fv = fundamentValueResult.fundamentalValue!;
        let pnl: FloatModel = { value: fv.value - offerTokenUSDPrice.value, decimals: fv.decimals };
        logging.info(`PnL / token:`);
        console.log(pnl);
        return { pnl: pnl };
    }

    public async getSellingOfferPnL(offerId: bigint, withMarginOfSafty?: bigint): Promise<{ pnl?: FloatModel; error?: Error }> {
        let offerResult: { offer?: Offer; error?: Error } = await this.getOfferFromBlockchain(offerId);
        if (offerResult.error) {
            logging.error(offerResult.error);
            return offerResult;
        }

        let offer: Offer = offerResult.offer!;
        return this._calculateSellingOfferPnL(offer, withMarginOfSafty);
    }
    //#endregion

    //#region Offer
    /**
     *
     * @param offerId
     * @returns [0]: offerTokens, [1]: buyerTokens, [2]: seller address, [3]: buyer address, [4]: price, [5]: amount
     */
    private async _getInitialRawOffer(offerId: bigint): Promise<[`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, bigint, bigint]> {
        return (await server.PUBLIC_CLIENT.readContract({
            address: this._CLEANSAT_MINING_ADDRESS,
            abi: cleanSatMiningContract.abi,
            functionName: 'getInitialOffer',
            args: [offerId]
        })) as [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, bigint, bigint];
    }

    /**
     *
     * @param offerId
     * @returns [0]: offerTokens, [1]: buyerTokens, [2]: seller address, [3]: buyer address, [4]: price, [5]: amount
     */
    private async _getCurrentRawOffer(offerId: bigint): Promise<[`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, bigint, bigint]> {
        return (await server.PUBLIC_CLIENT.readContract({
            address: this._CLEANSAT_MINING_ADDRESS,
            abi: cleanSatMiningContract.abi,
            functionName: 'showOffer',
            args: [offerId]
        })) as [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, bigint, bigint];
    }

    public async getOfferFromBlockchain(offerId: bigint): Promise<{ offer?: Offer; error?: Error }> {
        let offer: undefined | Offer;
        let initialOffer = await this._getInitialRawOffer(offerId);

        const csmTokensResult = await this._assetBu.getCSMTokens();
        if (csmTokensResult.error) {
            return csmTokensResult;
        }
        const csmTokens = csmTokensResult.assets!;

        let stableCoinsResult = await this._assetBu.getStableCoins();
        if (stableCoinsResult.error) {
            return stableCoinsResult;
        }
        const stableCoins = stableCoinsResult.assets!;

        const tokenPool: AssetModel[] = [...csmTokens, ...stableCoins];
        const tokenAddressPool: `0x${string}`[] = tokenPool.map((token) => token.address);

        if (
            tokenAddressPool.includes(initialOffer[0]) &&
            tokenAddressPool.includes(initialOffer[1]) &&
            initialOffer[2] !== '0x0000000000000000000000000000000000000000' &&
            initialOffer[3] === '0x0000000000000000000000000000000000000000'
        ) {
            let rawOffer = await this._getCurrentRawOffer(offerId);
            offer = {
                offerId: offerId,
                seller: rawOffer[2],
                buyer: rawOffer[3],
                offerToken: rawOffer[0],
                offerTokenSymbol: tokenPool.find((token) => token.address === rawOffer[0])!.symbol,
                buyerToken: rawOffer[1],
                buyerTokenSymbol: tokenPool.find((token) => token.address === rawOffer[1])!.symbol,
                price: {
                    value: rawOffer[4],
                    decimals: tokenPool.find((token) => token.address === rawOffer[1])!.decimals
                },
                amount: {
                    value: rawOffer[5],
                    decimals: tokenPool.find((token) => token.address === rawOffer[0])!.decimals
                }
            };

            const pnlResult = await this._calculateSellingOfferPnL(offer, 30n);
            if (!pnlResult.error) {
                offer.pnl = pnlResult.pnl!;
            }
        }

        return {
            offer,
            error: !offer ? new Error(ErrorCode.OFFER_NOT_FOUND, "Offer doesn't exist", `Offer #${offerId} is not accessible.`) : undefined
        };
    }

    public async getAllOffers(): Promise<{ offers?: Offer[]; error?: Error }> {
        if (!!this.offers?.length) {
            return {
                offers: this.offers
            };
        }

        let countOffer: bigint = (await server.PUBLIC_CLIENT.readContract({
            address: this._CLEANSAT_MINING_ADDRESS,
            abi: cleanSatMiningContract.abi,
            functionName: 'getOfferCount',
            args: []
        })) as bigint;

        const resultPromises: Promise<{ offer?: Offer; error?: Error }>[] = [];
        for (let offerId: bigint = 0n; offerId < countOffer; offerId++) {
            resultPromises.push(this.getOfferFromBlockchain(offerId));
        }

        let offers: Offer[] = await Promise.all(resultPromises).then((results: { offer?: Offer; error?: Error }[]) =>
            results.reduce((filtered: Offer[], result: { offer?: Offer; error?: Error }) => {
                if (result.offer !== undefined) {
                    filtered.push(result.offer);
                }

                return filtered;
            }, [])
        );

        // Save all offers
        this.offers.push(...offers);
        return {
            offers,
            error: !offers?.length ? new Error(ErrorCode.NO_OFFERS, 'No offer', `There is no offer on CleanSat Mining.`) : undefined
        };
    }

    public async upsertOffer(offerId: bigint): Promise<{ offer?: Offer; error?: Error }> {
        let offerResult = await this.getOfferFromBlockchain(offerId);
        if (offerResult.error) {
            return offerResult;
        }
        let bcOffer = offerResult.offer!;

        let localOfferIndex = this.offers.findIndex((offer) => offer.offerId === offerId);
        if (localOfferIndex === -1) {
            this.offers.push(bcOffer);
            return { offer: bcOffer };
        }
        this.offers[localOfferIndex] = bcOffer;

        return { offer: bcOffer };
    }

    public async getAllSellingOffers(): Promise<{ offers?: Offer[]; error?: Error }> {
        let offersResult = await this.getAllOffers();
        if (offersResult.error) {
            logging.error(offersResult.error);
            return offersResult;
        }

        const csmTokensResult = await this._assetBu.getCSMTokens();
        if (csmTokensResult.error) {
            return csmTokensResult;
        }
        const csmTokens = csmTokensResult.assets!.map((csmToken) => csmToken.address);

        let sellingOffers: Offer[] = offersResult.offers!.filter((offer) => csmTokens.includes(offer.offerToken));
        return {
            offers: sellingOffers,
            error: !sellingOffers?.length
                ? new Error(ErrorCode.NO_OFFERS, 'No selling offer', `There is no selling offer on CleanSat Mining.`)
                : undefined
        };
    }

    public async listenToNewSellingOffers(): Promise<{ error?: Error }> {
        const csmTokensResult = await this._assetBu.getCSMTokens();
        if (csmTokensResult.error) {
            return csmTokensResult;
        }
        const csmTokens = csmTokensResult.assets!;

        let stableCoinsResult = await this._assetBu.getStableCoins();
        if (stableCoinsResult.error) {
            return stableCoinsResult;
        }
        const stableCoins = stableCoinsResult.assets!;

        const tokenPool: AssetModel[] = [...csmTokens, ...stableCoins];
        const csmTokenAddresses: `0x${string}`[] = csmTokens.map((csmToken) => csmToken.address);
        const stableCoinAddresses: `0x${string}`[] = stableCoins.map((stableCoin) => stableCoin.address);

        const unwatch = server.PUBLIC_CLIENT.watchContractEvent({
            address: this._CLEANSAT_MINING_ADDRESS,
            abi: cleanSatMiningContract.abi,
            eventName: 'OfferCreated',
            args: {
                offerToken: csmTokenAddresses,
                buyerToken: stableCoinAddresses,
                buyer: ['0x0000000000000000000000000000000000000000']
            },
            onLogs: async (logs) => {
                let offers: Offer[] = (logs as unknown as any[]).map(
                    (log: {
                        eventName: string;
                        args: {
                            offerToken: `0x${string}`;
                            buyerToken: `0x${string}`;
                            seller: `0x${string}`;
                            buyer: `0x${string}`;
                            offerId: bigint;
                            price: bigint;
                            amount: bigint;
                        };
                    }): Offer => {
                        return {
                            offerId: log.args.offerId,
                            seller: log.args.seller,
                            buyer: log.args.buyer,
                            offerToken: log.args.offerToken,
                            offerTokenSymbol: tokenPool.find((token) => token.address === log.args.offerToken)!.symbol,
                            buyerToken: log.args.buyerToken,
                            buyerTokenSymbol: tokenPool.find((token) => token.address === log.args.buyerToken)!.symbol,
                            price: {
                                value: log.args.price,
                                decimals: tokenPool.find((token) => token.address === log.args.buyerToken)!.decimals
                            },
                            amount: {
                                value: log.args.amount,
                                decimals: tokenPool.find((token) => token.address === log.args.offerToken)!.decimals
                            }
                        };
                    }
                );

                for (let index = 0; index < offers.length; index++) {
                    const offer = offers[index];
                    // Calculate PnL to buy
                    const pnlResult = await this._calculateSellingOfferPnL(offer, 30n);
                    if (!pnlResult.error) {
                        if (pnlResult.pnl!.value > 0) {
                            const buyResult = await this._yamStrategyCSMBu.buyOfferWithStrategy(offer);
                            if (buyResult.success) {
                                logging.info(`Offer #${offer.offerId} bought!`);
                                await this.upsertOffer(offer.offerId);
                            }
                        }
                    }
                }
            }
        });

        return {};
    }

    public async listenToEditedSellingOffers(): Promise<{ error?: Error }> {
        const unwatch = server.PUBLIC_CLIENT.watchContractEvent({
            address: this._CLEANSAT_MINING_ADDRESS,
            abi: cleanSatMiningContract.abi,
            eventName: 'OfferUpdated',
            args: {},
            onLogs: async (logs) => {
                let offers: Offer[] = (logs as unknown as any[]).map(
                    (log: {
                        eventName: string;
                        args: {
                            offerId: bigint;
                            newPrice: bigint;
                            newAmount: bigint;
                        };
                    }): Offer => {
                        const oldOffer = this.offers.find((offer) => offer.offerId === log.args.offerId);

                        return {
                            offerId: oldOffer!.offerId,
                            seller: oldOffer!.seller,
                            buyer: oldOffer!.buyer,
                            offerToken: oldOffer!.offerToken,
                            offerTokenSymbol: oldOffer!.offerTokenSymbol,
                            buyerToken: oldOffer!.buyerToken,
                            buyerTokenSymbol: oldOffer!.buyerTokenSymbol,
                            price: {
                                value: log.args.newPrice,
                                decimals: oldOffer!.price.decimals
                            },
                            amount: {
                                value: log.args.newAmount,
                                decimals: oldOffer!.amount.decimals
                            }
                        };
                    }
                );

                for (let index = 0; index < offers.length; index++) {
                    const offer = offers[index];
                    // Calculate PnL to buy
                    const pnlResult = await this._calculateSellingOfferPnL(offer, 30n);
                    if (!pnlResult.error) {
                        if (pnlResult.pnl!.value > 0) {
                            const buyResult = await this._yamStrategyCSMBu.buyOfferWithStrategy(offer);
                            if (buyResult.success) {
                                logging.info(`Offer #${offer.offerId} bought!`);
                                await this.upsertOffer(offer.offerId);
                            }
                        }
                    }
                }
            }
        });

        return {};
    }
    //#endregion
}
