import axios from 'axios';
import { AssetFilter, FloatModel } from '../../models';
import { Error, ErrorCode, ServerError } from '../../errors';
import { convertNumberToBigInt } from '../../library';
import { AssetBusiness } from '../Asset.business';

export class CryptoMarketBusiness {
    // CONSTANT
    static #instance: CryptoMarketBusiness;
    private _assetBu: AssetBusiness;

    private _CMC_API_HOSTNAME: string = process.env.CMC_API_HOSTNAME ?? '';
    private _CMC_API_KEY: string = process.env.CMC_API_KEY ?? '';

    private constructor() {
        this._assetBu = AssetBusiness.instance;
    }

    public static get instance(): CryptoMarketBusiness {
        if (!CryptoMarketBusiness.#instance) {
            CryptoMarketBusiness.#instance = new CryptoMarketBusiness();
        }

        return CryptoMarketBusiness.#instance;
    }

    //#region Third party Call
    private async _getLatestPrice(_cmcAssetId: number): Promise<{ price?: FloatModel; error?: Error }> {
        let result: { price: FloatModel; error?: Error } = {
            price: {
                value: 0n,
                decimals: 2 // USD goes to the cent (0,01 is the smallest unit)
            }
        };

        const options = {
            method: 'GET',
            url: `${this._CMC_API_HOSTNAME}/v2/cryptocurrency/quotes/latest`,
            params: { id: _cmcAssetId },
            headers: {
                'X-CMC_PRO_API_KEY': this._CMC_API_KEY
            }
        };
        await axios
            .request(options)
            .then(({ data }: { data: { status: any; data: any } }) => {
                const price: number = data.data[`${_cmcAssetId}`].quote['USD'].price; // In USD
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

    private async _getTokenLogoUrl(_cmcAssetId: number): Promise<{ logoUrl?: string; error?: Error }> {
        let result: { logoUrl: string; error?: Error } = {
            logoUrl: ''
        };

        const options = {
            method: 'GET',
            url: `${this._CMC_API_HOSTNAME}/v2/cryptocurrency/info`,
            params: { id: _cmcAssetId },
            headers: {
                'X-CMC_PRO_API_KEY': this._CMC_API_KEY
            }
        };
        await axios
            .request(options)
            .then(({ data }: { data: { status: any; data: any } }) => {
                result.logoUrl = data.data[`${_cmcAssetId}`].logo;
                logging.info(`Received data from ${options.url}:`);
                console.log(result.logoUrl);
            })
            .catch((error: any) => {
                logging.error(error);
                result.error = new ServerError(ErrorCode.SERVER_ERROR, 'Failed request', 'Failed third party request.', 500);
            });

        return result;
    }
    //#endregion

    public async getTokenLogoUrl(address: `0x${string}`): Promise<{ logoUrl?: string; error?: Error }> {
        const filter: AssetFilter = { addresses: [address] };
        const assetResult = await this._assetBu.getAssets(filter);
        if (assetResult.error) {
            return assetResult;
        }
        const asset = assetResult.assets![0];

        return await this._getTokenLogoUrl(asset.oracleIds.cmcId!);
    }

    public async getTokenLastPrice(address: `0x${string}`): Promise<{ price?: FloatModel; error?: Error }> {
        const filter: AssetFilter = { addresses: [address] };
        const assetResult = await this._assetBu.getAssets(filter);
        if (assetResult.error) {
            return assetResult;
        }
        const asset = assetResult.assets![0];

        return await this._getLatestPrice(asset.oracleIds.cmcId!);
    }

    public async getBTCLastPrice(): Promise<{ price?: FloatModel; error?: Error }> {
        const filter: AssetFilter = { symbols: ['BTC'] };
        const assetResult = await this._assetBu.getAssets(filter);
        if (assetResult.error) {
            return assetResult;
        }

        const asset = assetResult.assets![0];
        return await this._getLatestPrice(asset.oracleIds.cmcId!);
    }

    public async getUSDCLastPrice(): Promise<{ price?: FloatModel; error?: Error }> {
        const filter: AssetFilter = { symbols: ['USDC.M'] };
        const assetResult = await this._assetBu.getAssets(filter);
        if (assetResult.error) {
            return assetResult;
        }

        const asset = assetResult.assets![0];
        return await this._getLatestPrice(asset.oracleIds.cmcId!);
    }

    public async getWXDAILastPrice(): Promise<{ price?: FloatModel; error?: Error }> {
        const filter: AssetFilter = { symbols: ['WXDAI'] };
        const assetResult = await this._assetBu.getAssets(filter);
        if (assetResult.error) {
            return assetResult;
        }

        const asset = assetResult.assets![0];
        return await this._getLatestPrice(asset.oracleIds.cmcId!);
    }

    public async getStablecoinLastPrice(address: `0x${string}`): Promise<{ price?: FloatModel; error?: Error }> {
        const filter: AssetFilter = { addresses: [address], isStableCoin: true };
        const assetResult = await this._assetBu.getAssets(filter);
        if (assetResult.error) {
            return assetResult;
        }

        const asset = assetResult.assets![0];
        return await this._getLatestPrice(asset.oracleIds.cmcId!);
    }
}
