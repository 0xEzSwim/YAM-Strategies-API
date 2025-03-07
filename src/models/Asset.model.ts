export type AssetModel = {
    address: `0x${string}`;
    symbol: string;
    shortName?: string;
    supply: bigint;
    decimals: number;
    isERC20?: boolean;
    isStableCoin?: boolean;
    isCSMToken?: boolean;
    oracleIds: {
        cmcId?: number;
        csmId?: number;
        realtId?: `0x${string}`;
    };

    logoUrl?: string;
};

export type AssetFilter = { addresses?: `0x${string}`[]; symbols?: string[]; isERC20?: boolean; isStableCoin?: boolean; isCSMToken?: boolean };
