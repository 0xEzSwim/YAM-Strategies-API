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
    private async _getRealTokenPrice(_realtId: `0x${string}`): Promise<{ price?: FloatModel; error?: Error }> {
        let result: { price: FloatModel; error?: Error } = {
            price: {
                value: 0n,
                decimals: 2 // USD goes to the cent (0,01 is the smallest unit)
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
    //#endregion

    public async getRealTokenFundamentalValue(tokenAddress: `0x${string}`): Promise<{ fundamentalValue?: FloatModel; error?: Error }> {
        const filter: AssetFilter = { addresses: [tokenAddress] };
        const assetResult = await this._assetBu.getAssets(filter);
        if (assetResult.error) {
            return assetResult;
        }
        const asset = assetResult.assets![0];

        let realTokenPriceResult = await this._getRealTokenPrice(asset.oracleIds.realtId!);
        if (realTokenPriceResult.error) {
            return realTokenPriceResult;
        }
        let realTokenPrice: FloatModel = realTokenPriceResult.price!;

        let fundamentalValue: FloatModel = { value: realTokenPrice.value, decimals: realTokenPrice.decimals };
        logging.info('CSM token fundamental value:');
        console.log(fundamentalValue);
        return { fundamentalValue };
    }
}
