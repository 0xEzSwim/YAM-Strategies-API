export type AssetModel = {
    apiId: number;
    address: `0x${string}`;
    symbol: string;
    supply: bigint;
    decimals: number;
    isERC20?: boolean;
    isStableCoin?: boolean;
    isCSMToken?: boolean;

    logoUrl?: string;
};

export type AssetFilter = { addresses?: `0x${string}`[]; symbols?: string[]; isERC20?: boolean; isStableCoin?: boolean; isCSMToken?: boolean };
