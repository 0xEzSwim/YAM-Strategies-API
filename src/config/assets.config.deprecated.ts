import { AssetModel } from '../models';

export const localStablecoins: AssetModel[] = [
    { apiId: 3408, address: '0x1197161d6e86A0F881B95E02B8DA07E56b6a751A', symbol: 'USDC.M', supply: 0n, decimals: 6, isStableCoin: true }
];

export const localCsmTokens: AssetModel[] = [
    {
        apiId: 1,
        address: '0x5A768Da857aD9b112631f88892CdE57E09AA8A6A',
        symbol: 'CSM-ALPHA',
        supply: 141723598152480n,
        decimals: 9
    },
    {
        apiId: 5,
        address: '0xC731074a0c0f078C6474049AF4d5560fa70D7F77',
        symbol: 'CSM-DELTA',
        supply: 219566245519713n,
        decimals: 9
    }
];

export const stablecoins: AssetModel[] = [
    { apiId: 3408, address: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83', symbol: 'USDC', supply: 0n, decimals: 6, isStableCoin: true },
    { apiId: 9021, address: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d', symbol: 'WXDAI', supply: 0n, decimals: 18, isStableCoin: true }
];

export const csmTokens: AssetModel[] = [
    {
        apiId: 1,
        address: '0xf8419b6527A24007c2BD81bD1aA3b5a735C1F4c9',
        symbol: 'CSM-ALPHA',
        supply: 141723598152480n,
        decimals: 9
    },
    {
        apiId: 2,
        address: '0x364D1aAF7a98e26A1F072e926032f154428481d1',
        symbol: 'CSM-BETA',
        supply: 100000000000000n,
        decimals: 9
    },
    {
        apiId: 3,
        address: '0x203A5080450FFC3e038284082FBF5EBCdc9B053f',
        symbol: 'CSM-OMEGA',
        supply: 100000000000000n,
        decimals: 9
    },
    {
        apiId: 4,
        address: '0x71C86CbB71846425De5f3a693e989F4BDd97E98d',
        symbol: 'CSM-GAMMA',
        supply: 100000000000000n,
        decimals: 9
    },
    {
        apiId: 5,
        address: '0x20D2F2d4b839710562D25274A3e98Ea1F0392D24',
        symbol: 'CSM-DELTA',
        supply: 219566245519713n,
        decimals: 9
    }
];
