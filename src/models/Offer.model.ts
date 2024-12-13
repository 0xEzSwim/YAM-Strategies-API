import { FloatModel } from './Float.model';

export type Offer = {
    offerId: bigint;
    seller: `0x${string}`;
    buyer: `0x${string}`;
    offerToken: `0x${string}`;
    offerTokenSymbol: string;
    buyerToken: `0x${string}`;
    buyerTokenSymbol: string;
    price: FloatModel;
    amount: FloatModel;
    pnl?: FloatModel;
};
