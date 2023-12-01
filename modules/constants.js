export const walletTypes = [
    'argentx',
    //'braavos',
];

export const classHash = {
    ARGENTX_PROXY: '0x01a736d6ed154502257f02b1ccdf4d9d1089f80811cd6acad48e6b6a9d1f2003',
    BRAAVOS_INITIAL: '0x5aa23d5bb71ddaa783da7ea79d405315bafa7cf0387a74f4593578c3e9e6570',
    BRAAVOS_PROXY: '0x03131fa018d520a037686ce3efddeab8f28895662f019ca3ca18a626650f7d1e',
}

export const baseDerivationPath = `m/44'/9004'/0'/0`;

export const ethereumRPC = {
    url: 'https://rpc.ankr.com/eth/84151185a1cc184630b43a05629755aa33aba93e5f299d0c7d14c23db33eb40b',
    chain_id: 1,
}

export const separatorCSV = ';';
export const requiredFieldsCSV = ['address', 'privateKey'];

export const defi = {
    l0kswap: {
        router: '0x07a6f98c03379b9513ca84cca1373ff452a7462a3b61598f0af5bb27ad7f76d1',
        factory: '0x01c0a36e26a8f822e0d81f20a5a562b16a8f8a3dfd99801367dd2aea8f1a87a2'
    }
}