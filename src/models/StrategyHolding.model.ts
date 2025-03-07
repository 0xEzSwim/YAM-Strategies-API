import { FloatModel } from './Float.model';

export type StrategyHoldingModel = { address: `0x${string}`; symbol: string; value: FloatModel; amount: FloatModel; allocation: FloatModel };

export type StrategyHoldingFilter = { strategyAddresses?: `0x${string}`[]; assetAddresses?: `0x${string}`[]; symbols?: string[] };
