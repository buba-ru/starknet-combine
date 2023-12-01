import { classHash, walletTypes, baseDerivationPath } from './constants.js';
import { ec, CallData, hash, constants, stark, Account, Provider } from 'starknet';
import { ethers } from 'ethers';
import { generateMnemonic }  from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import log4js from 'log4js';
import progress from 'cli-progress';

const logger = log4js.getLogger('wallets');
logger.level = 'debug';

export default class Wallets {
    mnemonicMatchWallet = (type, mnemonicList = null, quantity = null) => {
        if (!mnemonicList) {
            mnemonicList = [];
            for (let i = 0; i < quantity; i++) {
                mnemonicList.push(generateMnemonic(wordlist));
            }
        }

        const pb = new progress.SingleBar({stopOnComplete: true}, progress.Presets.shades_classic);
        pb.start(mnemonicList.length, 0);

        const walletList = [];
        for (let mnemonic of mnemonicList) {
            walletList.push(this[type](mnemonic, `${baseDerivationPath}/0`));
            pb.increment();
        }

        return walletList;
    }

    mnemonicMatchManyWallets = (type, quantity, mnemonic = null) => {
        if (!mnemonic) {
            mnemonic = generateMnemonic(wordlist)
        }
        
        const pb = new progress.SingleBar({stopOnComplete: true}, progress.Presets.shades_classic);
        pb.start(quantity, 0);

        const walletList = [];
        for (let i = 0; i < quantity; i++) {
            walletList.push(this[type](mnemonic, `${baseDerivationPath}/${i}`));
            pb.increment();
        }

        return walletList;
    }

    argentx = (mnemonic, derivePath) => {
        const wallet = ethers.Wallet.fromMnemonic(mnemonic);
        const starknetHdNode = ethers.utils.HDNode.fromSeed(wallet.privateKey).derivePath(derivePath);
        const privateKey = `0x` + ec.starkCurve.grindKey(starknetHdNode.privateKey);
        const publicKey = ec.starkCurve.getStarkKey(privateKey);

        const constructorCallData = CallData.compile({ signer: publicKey, guardian: '0' });

        const address = hash.calculateContractAddressFromHash(publicKey, classHash.ARGENTX_PROXY, constructorCallData, 0);

        return { type: 'argentx', mnemonic, address, publicKey, privateKey };
    }

    // Браавос кошельки не реализованны в полной мере
    // Необходимо сделать деплой
    braavos = (mnemonic, derivePath) => {
        const seed = ethers.utils.mnemonicToSeed(mnemonic);
        const HDNode = ethers.utils.HDNode.fromSeed(seed).derivePath(derivePath);
        const privateKey = this.#EIP2645Hashing(HDNode.privateKey);
        const publicKey = ec.starkCurve.getStarkKey(privateKey);

        const constructorCallData = CallData.compile({
                implementation: classHash.BRAAVOS_INITIAL,
                selector: hash.getSelectorFromName('initializer'),
                calldata: CallData.compile({ public_key: publicKey }),
            });

        const address = hash.calculateContractAddressFromHash(publicKey, classHash.BRAAVOS_PROXY, constructorCallData, 0);

        return { type: 'braavos', mnemonic, address, publicKey, privateKey };
    }

    #EIP2645Hashing = (key0) => {
        const N = BigInt(2) ** BigInt(256);
        const starkCurveOrder = BigInt(`0x${constants.EC_ORDER}`);
    
        const N_minus_n = N - (N % starkCurveOrder);
        for (let i = 0; ; i++) {
            const x = ethers.utils.concat([key0, ethers.utils.arrayify(i)]);
    
            const key = BigInt(ethers.utils.hexlify(ethers.utils.sha256(x)));
    
            if (key < N_minus_n) {
                return `0x${(key % starkCurveOrder).toString(16)}`;
            }
        }
    };
}