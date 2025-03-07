import { SupabaseClient } from '@supabase/supabase-js';
import { server } from '../config';
import { Database, OrderFilter, OrderModel } from '../models';
import { Error, ErrorCode } from '../errors';
import { toJson } from '../library';

type FullOrderView = Database['public']['Views']['FullOrders']['Row'];
type Order = Database['public']['Tables']['Orders']['Row'];

export class OrderRepository {
    // CONSTANT
    static #instance: OrderRepository;
    private _db: SupabaseClient;

    private constructor() {
        this._db = server.DB_CLIENT;
    }

    public static get instance(): OrderRepository {
        if (!OrderRepository.#instance) {
            OrderRepository.#instance = new OrderRepository();
        }

        return OrderRepository.#instance;
    }

    private _toModel(orderView: FullOrderView): OrderModel {
        return {
            id: orderView.id as number,
            isActive: orderView.isActive as boolean,
            userAddress: orderView.userAddress as `0x${string}`,
            buyerAsset: {
                address: orderView.buyerAssetAdress as `0x${string}`,
                symbol: orderView.buyerAssetSymbol as string,
                logoUrl: orderView.buyerAssetLogoUrl as string,
                supply: BigInt(orderView.buyerAssetSupply as string),
                decimals: orderView.buyerAssetDecimals as number,
                isStableCoin: orderView.buyerAssetIsStableCoin as boolean,
                oracleIds: {}
            },
            basePrice: { value: BigInt(orderView.basePrice as string), decimals: orderView.buyerAssetDecimals as number },
            price: { value: BigInt(orderView.price as string), decimals: orderView.buyerAssetDecimals as number },
            displayedPrice: { value: BigInt(orderView.displayedPrice as string), decimals: orderView.buyerAssetDecimals as number },
            offerAsset: {
                address: orderView.offerAssetAdress as `0x${string}`,
                symbol: orderView.offerAssetSymbol as string,
                logoUrl: orderView.offerAssetLogoUrl as string,
                supply: BigInt(orderView.offerAssetSupply as string),
                decimals: orderView.offerAssetDecimals as number,
                isStableCoin: orderView.offerAssetIsStableCoin as boolean,
                oracleIds: {}
            },
            amount: { value: BigInt(orderView.amount as string), decimals: orderView.offerAssetDecimals as number },
            filledAmount: { value: BigInt(orderView.filledAmount as string), decimals: orderView.offerAssetDecimals as number }
        };
    }

    private _buildOrderQuery(filter?: OrderFilter) {
        let query = this._db.from('FullOrders').select();

        if (!!filter?.ids?.length) {
            query = query.in('id', filter.ids);
        }

        if (!!filter?.isActive) {
            query = query.eq('isActive', filter.isActive);
        }

        if (!!filter?.userAddresses?.length) {
            query = query.in('userAddress', filter.userAddresses);
        }

        if (!!filter?.buyerAssetAdresses?.length) {
            query = query.in('buyerAssetAdress', filter.buyerAssetAdresses);
        }

        if (!!filter?.offerAssetAdresses?.length) {
            query = query.in('offerAssetAdress', filter.offerAssetAdresses);
        }

        return query.returns<FullOrderView[]>();
    }

    public async getOrders(filter?: OrderFilter): Promise<{ orders?: OrderModel[]; error?: Error }> {
        const { data: ordersData, error: dbError } = await this._buildOrderQuery(filter);
        if (dbError) {
            const error = new Error(ErrorCode.DB_ERROR, 'Orders SELECT Error', `Could not request orders to DB.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        if (!ordersData?.length) {
            return { orders: [] };
        }

        const orders: OrderModel[] = ordersData.map((orderData) => {
            return this._toModel(orderData);
        });

        return { orders };
    }

    public async createOrder(_orderData: {
        userAddress: `0x${string}`;
        buyerAssetAddress: `0x${string}`;
        basePrice: bigint;
        price: bigint;
        displayedPrice: bigint;
        offerAssetAddress: `0x${string}`;
        amount: bigint;
    }): Promise<{ order?: OrderModel; error?: Error }> {
        const { data: orderData, error: dbError } = await this._db
            .from('Orders')
            .insert({
                userAddress: _orderData.userAddress,
                buyerToken: _orderData.buyerAssetAddress,
                basePrice: toJson(_orderData.basePrice),
                price: toJson(_orderData.price),
                displayedPrice: toJson(_orderData.displayedPrice),
                offerToken: _orderData.offerAssetAddress,
                amount: toJson(_orderData.amount)
            })
            .select('id')
            .returns<Order[]>()
            .maybeSingle();

        if (dbError) {
            const error = new Error(ErrorCode.DB_ERROR, 'Order UPSERT Error', `Could not upsert Order to DB.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        const orderResult = await this.getOrders({ ids: [orderData!.id] });
        if (orderResult.error) {
            return orderResult;
        }
        const order = orderResult.orders![0];

        return { order };
    }

    public async updateOrder(_order: OrderModel): Promise<{ order?: OrderModel; error?: Error }> {
        const { data: orderData, error: dbError } = await this._db
            .from('Orders')
            .update({
                isActive: _order.isActive,
                userAddress: _order.userAddress,
                buyerToken: _order.buyerAsset.address,
                basePrice: toJson(_order.basePrice.value),
                price: toJson(_order.price.value),
                displayedPrice: toJson(_order.displayedPrice.value),
                offerToken: _order.offerAsset.address,
                amount: toJson(_order.amount.value),
                filledAmount: toJson(_order.filledAmount.value),
                updatedAt: new Date().toISOString()
            })
            .eq('id', _order.id)
            .select('id')
            .returns<Order[]>()
            .maybeSingle();

        if (dbError) {
            const error = new Error(ErrorCode.DB_ERROR, 'Order UPSERT Error', `Could not upsert Order to DB.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        const orderResult = await this.getOrders({ ids: [orderData!.id] });
        if (orderResult.error) {
            return orderResult;
        }
        const order = orderResult.orders![0];

        return { order };
    }

    public async deleteOrder(orderId: number): Promise<{ error?: Error }> {
        const { error: dbError } = await this._db.from('Orders').delete().eq('id', orderId);

        if (dbError) {
            const error = new Error(ErrorCode.DB_ERROR, 'Order DELETE Error', `Could not delete Order ${orderId} from DB.`);
            logging.error(error);
            console.error(dbError);
            return { error };
        }

        return {};
    }
}
