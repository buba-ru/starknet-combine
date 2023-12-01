export default {
    defaultSavePath: './userData/wallets.csv',
    abiPath: './constants/abi/',
    delayBetweenAcc: [300, 600],
    delayBetweenTask: [30, 60],

    L1GasPriceCap: 50,

    exchanges: {
        okx: {
            auth: {
                apiKey: '',
                secret: '',
                password: '',
            },
            network: 'Starknet',
        }
    },

    defi: {
        l0kswap: {
            slippage: 1,
        }
    }
}