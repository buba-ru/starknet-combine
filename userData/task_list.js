export default {
    start_acc: [
        // {
        //     module: 'account',
        //     action: 'topup',
        //     token: 'ETH',
        //     amount: [0.005, 0.0057],
        //     fromExchange: 'okx',
        // },
        // {
        //     module: 'account',
        //     action: 'wait_fund',
        //     token: '^',
        //     amount: '^',
        // },
        // {
        //     module: 'account',
        //     action: 'deploy_account',
        //     type: 'argentx',
        // },
        {
            module: 'defi',
            action: 'swap',
            dex: 'l0kswap',
            from: {
                token: 'ETH',
                amount: [0.001, 0.002],
            },
            to: {
                token: ['USDT', 'USDC', 'DAI', 'WBTC'],
                //amount: [1, 2],
            }
        },
        {
            module: 'defi',
            action: 'swap',
            dex: 'l0kswap',
            from: {
                token: '^to',
                amount: 'all',
            },
            to: {
                token: ['USDT', 'USDC', 'DAI', 'WBTC'],
                // amount: [10, 20],
            }
        },
        {
            module: 'defi',
            action: 'swap',
            dex: 'l0kswap',
            from: {
                token: '^to',
                amount: 'all',
            },
            to: {
                token: 'ETH',
                // amount: [10, 20],
            }
        },
    ],
}