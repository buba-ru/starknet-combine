import Account from './Account.js'
import DeFi from './defi/index.js';
import utils from './utils.js';

export default class Executor {
    #wallet;

    constructor (wallet) {
        this.#wallet = wallet;
    }

    perform = async (task, logger) => {
        await utils.checkL1GasPrice();
        logger.info(`Run: ${task.module}.${task.action}; ${utils.getTaskParams(task)}`);
        const result = await this[task.module](task);

        if (result.status) {
            logger.info(result.message);
        } else {
            logger.warn(result.reason);
        }
    }

    account = async (task) => {
        const account = new Account(this.#wallet);
        return await account[task.action]({ ...task });
    }

    defi = async (task) => {
        const dex = new DeFi[task.dex](this.#wallet);
        return await dex[task.action]({ ...task });
    }
}