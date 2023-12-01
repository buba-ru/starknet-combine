import fs from 'fs-extra';
import { Contract } from 'starknet';
import { ethers } from 'ethers';
import erc20 from '../constants/erc20.js';
import { ethereumRPC } from './constants.js';
import config from '../userData/config.js'
import log4js from 'log4js';

const logger = log4js.getLogger('main');
logger.level = 'debug';

export default class Utils {
    static getRandomInt = (min, max) => {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    static getRandomDecimal = (min, max, precision) => {
        let amount = Math.random() * (max - min) + min;
        return +amount.toFixed(precision);
    }

    static timeout = (sec, logger = null) => {
        if (logger) {
            logger.info(`Delay ${sec} sec ...`);
        }
        return new Promise(res => setTimeout(res, sec * 1000));
    }

    static getTokenABI = async (token, provider) => {
        const abiPath = `${config.abiPath}${erc20[token].contract}.json`;
        if (!fs.existsSync(abiPath)) {
            let abi;
            try {
                abi = (await provider.getClassAt(erc20[token].class)).abi;
            } catch {
                abi = (await provider.getClassByHash(erc20[token].class)).abi;
            }
            
            fs.outputJsonSync(abiPath, abi);

            return abi;
        }

        return fs.readJsonSync(abiPath);
    }

    static getContractABI = async (contractAddress, provider) => {
        const abiPath = `${config.abiPath}${contractAddress}.json`;
        if (!fs.existsSync(abiPath)) {
            const abi = (await provider.getClassAt(contractAddress)).abi;
            fs.outputJsonSync(abiPath, abi);

            return abi;
        }

        return fs.readJsonSync(abiPath);
    }

    static decimalToBN (value, token) {
        return BigInt(ethers.utils.parseUnits(value.toString(), erc20[token].decimals));
    }

    static printBN (BN, token) {
        return ethers.utils.formatUnits(BN, erc20[token].decimals);
    }

    static getTaskParams (task) {
        const params = JSON.parse(JSON.stringify(task));
        if (params.action == 'swap') {
            params.from = `${params.from.amount || ''} ${params.from.token}`;
            params.to = `${params.to.amount || ''} ${params.to.token}`;
        }
        delete params.module;
        delete params.action;
        
        let paramsStr = '';
        for (let param in params) {
            paramsStr += `${param}: ${params[param]}, `
        }

        return paramsStr;
    }

    static formatAddress(address) {
        return ethers.utils.hexZeroPad(address, 32)
    }

    static checkL1GasPrice = async () => {
        const gasPriceCap = ethers.utils.parseUnits(config.L1GasPriceCap.toString(), 'gwei');
        const L1Provider = new ethers.providers.JsonRpcProvider(ethereumRPC.url, ethereumRPC.chain_id);
        let L1GasPrice = await L1Provider.getGasPrice();
        while (L1GasPrice.gt(gasPriceCap)) {
            logger.warn(`L1 gas price: ${ethers.utils.formatUnits(L1GasPrice, 'gwei')} > ${ethers.utils.formatUnits(gasPriceCap, 'gwei')}. Check again in 60 sec ...`);
            await Utils.timeout(60);
            L1GasPrice = await L1Provider.getGasPrice();
        }

        logger.info(`L1 gas price: ${ethers.utils.formatUnits(L1GasPrice, 'gwei')}`);
	}

    static getBalance = async (address, token, provider) => {
        const abi = await Utils.getTokenABI(token, provider);
        const tokenContract = new Contract(abi, erc20[token].contract, provider);
        const balance = await tokenContract.balanceOf(address);
        return Object.values(balance)[0].low;
    }

    static waitTxConfirm = async (txhash, provider) => {
        while (true) {
            const receipt = await provider.getTransactionReceipt(txhash);
            const expectedStatuses = [
                'ACCEPTED_ON_L2',
                'REVERTED',
                'REJECTED',
            ];

            if (expectedStatuses.includes(receipt.status)) {
                return receipt;
            }

            await Utils.timeout(5);
        }
    }
}