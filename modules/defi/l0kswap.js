import { Account, num, constants, Provider, Contract, stark, CallData } from 'starknet';
import { defi } from '../constants.js';
import utils from '../utils.js';
import erc20 from '../../constants/erc20.js';
import config from '../../userData/config.js';

export default class l0kswap {
    #wallet;
    constructor (wallet) {
        this.#wallet = wallet;
        this.provider = new Provider({ sequencer: { network: constants.NetworkName.SN_MAIN } });
        this.account = new Account(this.provider, wallet.address, wallet.privateKey, '1');
    }

    swap = async ({ from, to }) => {
        const factoryABI = await utils.getContractABI(defi.l0kswap.factory, this.provider);
        const factory = new Contract(factoryABI, defi.l0kswap.factory, this.provider);
        const poolContract = stark.makeAddress((await factory.getPair(erc20[from.token].contract, erc20[to.token].contract)).pair.toString(16));
        const poolABI = await utils.getContractABI(poolContract, this.provider);
        const pool = new Contract(poolABI, poolContract, this.provider);
        const { reserve0, reserve1 } = await pool.getReserves();
        const token0 = utils.formatAddress((await pool.token0()).token0);

        let reserves = [reserve0, reserve1];
        if (token0 !== stark.makeAddress(erc20[from.token].contract)) {
            reserves = reserves.reverse();
        }

        const routerABI = await utils.getContractABI(defi.l0kswap.router, this.provider);
        const router = new Contract(routerABI, defi.l0kswap.router, this.provider);


        if (from.amount) {
            if (from.amount == 'all') {
               from.amount = utils.printBN((await utils.getBalance(this.#wallet.address, from.token, this.provider)), from.token);
            }

            return await this.#swapExactTokensForTokens(from.token, to.token, from.amount, router, reserves);
        }

        if (to.amount) {
            return await this.#swapTokensForExactTokens(from.token, to.token, to.amount, router, reserves);
        }


        return { status: true, message: 'Dev on' }
    }

    #swapExactTokensForTokens = async (from, to, amount, router, reserves) => {
        const amountIn = utils.decimalToBN(amount, from);
        let amountOutMin = (await router.getAmountOut({low: amountIn, high: 0}, ...reserves)).amountOut.low;
        amountOutMin = amountOutMin - (amountOutMin / BigInt(100));
        const path = [
            erc20[from].contract,
            erc20[to].contract,
        ];

        const { transaction_hash } = await this.account.execute([
            this.#approve(erc20[from].contract, amountIn, defi.l0kswap.router),
            {
                contractAddress: defi.l0kswap.router,
                entrypoint: 'swapExactTokensForTokens',
                calldata: CallData.compile({
                    amountIn: {low: amountIn, high: 0},
                    amountOutMin: {low: amountOutMin, high: 0},
                    path: path,
                    to: this.#wallet.address,
                    deadline: Date.now() + (60 * 60),
                }),
            }
        ]);

        const receipt = await utils.waitTxConfirm(transaction_hash, this.provider);
        if (receipt.status == 'ACCEPTED_ON_L2') {
            return {
                status: true,
                message: `Succsesfull ${from}->${to} swap. Fee: ${utils.printBN(receipt.actual_fee, 'ETH')} ETH`,
            }
        } else {
            return {
                status: true,
                message: `${from}->${to} swap failed. Status: ${receipt.status}`,
            }
        }

        
    }

    #swapTokensForExactTokens = async (from, to, amount, router, reserves) => {
        const amountOut = utils.decimalToBN(amount, to);
        let amountInMax = (await router.getAmountIn({low: amountOut, high: 0}, ...reserves)).amountIn.low;
        amountInMax = amountInMax + (amountInMax / BigInt(100));
        const path = [
            erc20[from].contract,
            erc20[to].contract,
        ];

        const { transaction_hash } = await this.account.execute([
            this.#approve(erc20[from].contract, amountInMax, defi.l0kswap.router),
            {
                contractAddress: defi.l0kswap.router,
                entrypoint: 'swapTokensForExactTokens',
                calldata: CallData.compile({
                    amountOut: {low: amountOut, high: 0},
                    amountInMax: {low: amountInMax, high: 0},
                    path: path,
                    to: this.#wallet.address,
                    deadline: Date.now() + (60 * 60),
                }),
            }
        ]);

        const receipt = await utils.waitTxConfirm(transaction_hash, this.provider);
        if (receipt.status == 'ACCEPTED_ON_L2') {
            return {
                status: true,
                message: `Succsesfull ${from}->${to} swap. Fee: ${utils.printBN(receipt.actual_fee, 'ETH')} ETH`,
            }
        } else {
            return {
                status: true,
                message: `${from}->${to} swap failed. Status: ${receipt.status}`,
            }
        }
    }
    
    #approve = (contract, amount, spender) => {
        return {
            contractAddress: contract,
            entrypoint: "approve",
            calldata: CallData.compile({
                spender: spender,
                amount: {low: amount, high: 0},
            })
        }
    }
} 