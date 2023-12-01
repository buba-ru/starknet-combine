import Wallets from './modules/Wallets.js';
import storage from './modules/Storage.js';
import { walletTypes } from './modules/constants.js';
import config from './userData/config.js'
import optimist from 'optimist';
import log4js from 'log4js';

const { argv } = optimist;
const logger = log4js.getLogger('wallet_generator');
logger.level = 'debug';

const generatingModes = ['one-one', 'one-multiple'];

const usage = `
    Usage:
    node wallet-generator.js --type=argentx --file=mnemonics.txt
    node wallet-generator.js --n=10 --type=argentx --mnemonic="pyramid boss lounge actress agree video urge fortune zoo hammer talent frog"
    node wallet-generator.js --n=20 --type=braavos --mode=one-one

    Parameters:
    --file\tPath to file with list of mnemonics
    --mnemonic\tMnemonic phrase for generating wallets
    --mode\t${generatingModes[0]}\t\tGenerating one mnemonic and multiple wallets for it
    \t\t${generatingModes[1]}\tGenerating one wallet based on one mnemonic
    
    --n\t\tNumber of wallets to be generated
    --type\tType of wallets. Allowed values: ${walletTypes.join(', ')} 
    --save\tPath to file for saving wallets
    `;

const launchError = (message) => {
    logger.error(message);
    console.log(usage);
    process.exit(-1);
}

if (!(!!argv.file || !!argv.mnemonic || !!argv.mode)) {
    launchError(`Required argument (--file or --mnemonic or --mode) is missing`);
}

let generatorMode = 0;
generatorMode += (!!argv.file) ? 1 : 0;
generatorMode += (!!argv.mnemonic) ? 1 : 0;
generatorMode += (!!argv.mode) ? 1 : 0;

if (generatorMode > 1) {
    launchError(`Incompatible arguments (--file, --mnemonic, --mode)`);
}

if (!!!argv.type) {
    launchError(`Parameter is missing: --type`);
}

if (!walletTypes.includes(argv.type)) {
    launchError(`Invalid value of parameter: --type=${argv.type}`);
}

let savePath = config.defaultSavePath;
if (!!argv.save) {
    savePath = argv.save;
}

const wallets = new Wallets();

if (!!argv.file) {
    const res = storage.fileToArr(argv.file);
    if (!res.result) {
        logger.error(res.reason);
        process.exit(-1);
    }

    const mnemonics = res.data;
    logger.info(`Load ${mnemonics.length} mnemonics from file '${argv.file}'`);
    logger.info(`Start generation of wallets`);
    const walletList = wallets.mnemonicMatchWallet(argv.type, mnemonics);
    storage.saveToCSV(savePath, walletList, logger);
}

if (!!argv.mnemonic) {
    if (!!!argv.n) {
        launchError(`Parameter is missing: --n`);
    }
    logger.info(`Start generation of ${argv.n} wallets from mnemonic '${argv.mnemonic}'`);
    const walletList = wallets.mnemonicMatchManyWallets(argv.type, argv.n, argv.mnemonic);
    storage.saveToCSV(savePath, walletList, logger);
}

if (!!argv.mode) {
    if (!generatingModes.includes(argv.mode)) {
        launchError(`Invalid value of parameter: --mode=${argv.mode}`);
    }

    if (!!!argv.n) {
        launchError(`Parameter is missing: --n`);
    }

    logger.info(`Start generation of wallets`);

    if (argv.mode == generatingModes[0]) { // one-one
        const walletList = wallets.mnemonicMatchWallet(argv.type, null, argv.n);
        storage.saveToCSV(savePath, walletList, logger);
    }

    if (argv.mode == generatingModes[1]) { // one-multiple
        const walletList = wallets.mnemonicMatchManyWallets(argv.type, argv.n);
        storage.saveToCSV(savePath, walletList, logger);
    }
}

