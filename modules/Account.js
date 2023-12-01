import ccxt from 'ccxt';
import { ethers } from 'ethers';
import { Account as starkAccount, ec, num, constants, Provider, Contract } from 'starknet';
import utils from './utils.js';
import { classHash } from './constants.js';
import erc20 from '../constants/erc20.js';
import config  from '../userData/config.js';

const fUnits = ethers.utils.formatUnits;
const pUnits = ethers.utils.parseUnits;

export default class Account {
    #wallet;
    constructor (wallet) {
        this.#wallet = wallet;
        this.provider = new Provider({ sequencer: { network: constants.NetworkName.SN_MAIN } });
        this.account = new starkAccount(this.provider, wallet.address, wallet.privateKey, '1');
    }

    topup = async ({ fromExchange, token, amount }) => {
        const exchange = new ccxt[fromExchange]({ ...config.exchanges[fromExchange].auth });
        const network = config.exchanges[fromExchange].network;
        if(!exchange.checkRequiredCredentials()) {
            return {
                status: false,
                reason: 'Authorization error on the exchange. Check the authentication data',
            };
        }

        const exchangeBalance = (await exchange.fetchBalance({type: 'funding'})).free[token];
        const withdrawFee = (await exchange.fetchDepositWithdrawFee(token)).networks[network].withdraw.fee;
        
        if (exchangeBalance < (amount + withdrawFee)) {
            return {
                status: false,
                reason: `Insufficient funds on exchange balance. Balance ${exchangeBalance} ${token}`,
            };
        }

        let result;
        try {
            result = await exchange.withdraw(token, amount, this.#wallet.address, {
                network: network,
                pwd: '-',
            });
        } catch (error) {
            return {
                status: false,
                reason: `${error}`,
            };
        }

        return {
            status: true,
            message: `Funds have been successfully sent`,
        };
    }

    wait_fund = async ({ token, amount }) => {
        const abi = await utils.getTokenABI(token, this.provider);
        const tokenContract = new Contract(abi, erc20[token].contract, this.provider);
        const balance = (await tokenContract.balanceOf(this.#wallet.address)).balance.low;

        if (utils.decimalToBN(amount, token) > balance) {
            await utils.timeout(30);
            return await this.wait_fund({ token, amount });
        }

        return {
            status: true,
            message: `Balance ${token} has been updated. Current balance is ${utils.printBN(balance, token)} ${token}`,
        };
    }

    deploy_account = async ({ type }) => {
        if (type == 'argentx') {
            const contractCode = await this.provider.getCode(this.#wallet.address);
            if (contractCode.bytecode.length > 0) {
                return {
                    status: true,
                    message: `Account allready deployed`,
                };
            }
    
            const publicKey = ec.starkCurve.getStarkKey(this.#wallet.privateKey);
            
            const deployAccountPayload = {
                classHash: classHash.ARGENTX_PROXY,
                constructorCalldata: { signer: publicKey, guardian: '0' },
                contractAddress: this.#wallet.address,
                addressSalt: publicKey,
            }
            
            try {
                const {
                    transaction_hash: transactionHash,
                } = await this.account.deployAccount(deployAccountPayload);
        
                const receipt = await this.provider.waitForTransaction(transactionHash, {
                    successStates: [ 'ACCEPTED_ON_L2' ],
                });

                const actualFee = num.toBigInt(receipt.actual_fee);

                return {
                    status: true,
                    message: `Account deployed! tx: ${transactionHash}; Fee: ${utils.printBN(actualFee, 'ETH')}`,
                };
            } catch (error) {
                return {
                    status: false,
                    reason: error.message,
                };
            }
        }
    }
}