import axios from 'axios';
import { AssetFilter, FloatModel } from '../../models';
import { Error, ErrorCode, ServerError } from '../../errors';
import { convertNumberToBigInt } from '../../library';
import { AssetBusiness } from '../Asset.business';

export class RealTokenBusiness {
    // CONSTANT
    static #instance: RealTokenBusiness;
    private _assetBu: AssetBusiness;

    private _REALT_API_HOSTNAME: string = process.env.REALT_API_HOSTNAME ?? '';
    private _REALT_API_KEY: string = process.env.REALT_API_KEY ?? '';

    private constructor() {
        this._assetBu = AssetBusiness.instance;
    }

    public static get instance(): RealTokenBusiness {
        if (!RealTokenBusiness.#instance) {
            RealTokenBusiness.#instance = new RealTokenBusiness();
        }

        return RealTokenBusiness.#instance;
    }

    //#region Third party Call
    private async _getRealTokenPriceInfo(
        _realtId: `0x${string}`
    ): Promise<{ priceInfo?: { price: FloatModel; info: { rentedUnits?: number; totalUnits?: number } }; error?: Error }> {
        let result: { priceInfo: { price: FloatModel; info: { rentedUnits?: number; totalUnits?: number } }; error?: Error } = {
            priceInfo: {
                price: {
                    value: 0n,
                    decimals: 2 // USD goes to the cent (0,01 is the smallest unit)
                },
                info: {
                    rentedUnits: 0,
                    totalUnits: 0
                }
            }
        };

        const options = {
            method: 'GET',
            url: `${this._REALT_API_HOSTNAME}/v1/token/${_realtId}`,
            headers: {
                'X-AUTH-REALT-TOKEN': this._REALT_API_KEY
            }
        };
        await axios
            .request(options)
            .then(({ data }: { data: any }) => {
                const price: number = data['tokenPrice']; // In USD
                result.priceInfo.price.value = convertNumberToBigInt(price, result.priceInfo.price.decimals);
                const totalUnits: number | null = data['totalUnits'];
                if (totalUnits) {
                    const rentedUnits: number = data['rentedUnits'];
                    result.priceInfo.info.rentedUnits = rentedUnits;
                    result.priceInfo.info.totalUnits = totalUnits;
                }
                logging.info(`Received data from ${options.url}:`);
                console.log(result.priceInfo);
            })
            .catch((error: any) => {
                logging.error(error);
                result.error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Failed third party request.', 500);
            });

        return result;
    }
    //#endregion

    public async getRealTokenPriceInfo(
        tokenAddress: `0x${string}`
    ): Promise<{ priceInfo?: { price: FloatModel; info: { rentedUnits?: number; totalUnits?: number } }; error?: Error }> {
        const filter: AssetFilter = { addresses: [tokenAddress] };
        const assetResult = await this._assetBu.getAssets(filter);
        if (assetResult.error) {
            return assetResult;
        }
        const asset = assetResult.assets![0];

        let realTokenPriceResult = await this._getRealTokenPriceInfo(asset.oracleIds.realtId!);
        if (realTokenPriceResult.error) {
            return realTokenPriceResult;
        }

        let realTokenPriceInfo: { price: FloatModel; info: { rentedUnits?: number; totalUnits?: number } } = realTokenPriceResult.priceInfo!;
        return { priceInfo: realTokenPriceInfo };
    }

    public async getRealTokenPrices(
        tokenAddress: `0x${string}`
    ): Promise<{ prices?: { fundamentalPrice: FloatModel; buyBackPrice: FloatModel }; error?: Error }> {
        const result = await this.getRealTokenPriceInfo(tokenAddress);
        if (result.error) {
            return result;
        }
        const priceInfo = result.priceInfo!;

        const fundamentalPrice = priceInfo.price.value;
        let buyBackPrice = fundamentalPrice;
        if (priceInfo.info.totalUnits) {
            // -5% for each vacant unit
            const q =
                convertNumberToBigInt(1, priceInfo.price.decimals) -
                (5n *
                    (convertNumberToBigInt(priceInfo.info.totalUnits!, priceInfo.price.decimals) -
                        convertNumberToBigInt(priceInfo.info.rentedUnits!, priceInfo.price.decimals))) /
                    convertNumberToBigInt(priceInfo.info.totalUnits!, priceInfo.price.decimals);
            buyBackPrice = (fundamentalPrice * q) / convertNumberToBigInt(1, priceInfo.price.decimals);
        }

        return {
            prices: {
                fundamentalPrice: { value: fundamentalPrice, decimals: priceInfo.price.decimals },
                buyBackPrice: { value: buyBackPrice, decimals: priceInfo.price.decimals }
            }
        };
    }
}
