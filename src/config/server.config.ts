import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../models';
import { createPublicClient, createWalletClient, http } from 'viem';
import { gnosis, anvil } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { localCsmTokens, csmTokens, localStablecoins, stablecoins } from './assets.config';

// Loads .env file contents into process.env
dotenv.config();

// API
export const DEVELOPMENT: boolean = process.env.NODE_ENV === 'development';
export const TEST: boolean = process.env.NODE_ENV === 'test'; // jest set it to `test` on `nmp run test`
export const SERVER_HOSTNAME: string = DEVELOPMENT || TEST || !process.env.SERVER_HOSTNAME ? 'localhost' : process.env.SERVER_HOSTNAME;
export const HTTP_SERVER_PORT: number = DEVELOPMENT || TEST || !process.env.HTTP_SERVER_PORT ? 8080 : Number(process.env.HTTP_SERVER_PORT);
export const HTTPS_SERVER_PORT: number = DEVELOPMENT || TEST || !process.env.HTTPS_SERVER_PORT ? 1337 : Number(process.env.HTTPS_SERVER_PORT);

// DB
export const DB_CLIENT = createClient<Database>(`https://${process.env.SUPABASE_PROJECT_ID!}.supabase.co`, process.env.SUPABASE_KEY!);

// Blockcahin
export const PUBLIC_CLIENT = createPublicClient({
    chain: DEVELOPMENT || TEST ? anvil : gnosis,
    transport: http()
});
export const WALLET_CLIENT = createWalletClient({
    chain: DEVELOPMENT || TEST ? anvil : gnosis,
    transport: http()
});
export const MODERATOR_ACCOUNT = privateKeyToAccount(process.env.MODERATOR_PRIVATE_KEY as `0x${string}`); // Local Account

export const server = {
    SERVER_HOSTNAME,
    HTTP_SERVER_PORT,
    HTTPS_SERVER_PORT,
    DB_CLIENT,
    PUBLIC_CLIENT,
    WALLET_CLIENT,
    MODERATOR_ACCOUNT
};
