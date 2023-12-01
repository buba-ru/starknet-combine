import Executor from './modules/Executor.js';
import storage from './modules/Storage.js';
import utils from './modules/utils.js';
import taskList from './userData/task_list.js';
import config from './userData/config.js';
import optimist from 'optimist';
import log4js from 'log4js';
import colors from 'colors';

process.removeAllListeners('warning');

const { argv } = optimist;
const logger = log4js.getLogger('main');
logger.level = 'debug';

const usage = `
    Usage:
    node starknet.js --wallets=./userData/wallets.csv --task=start_acc

    Parameters:
    --wallets\tPath to file with list of wallets
    --task\tName of task from task_list.js
    `;

const launchError = (message, showUsage = false) => {
    logger.error(message);
    if (showUsage) {
        console.log(usage);
    }

    process.exit(-1);
}

const prepareTasks = (task, preparedTasks) => {
    if (task.hasOwnProperty('action')) {
        preparedTasks.push(task);
        return;
    }

    if (Array.isArray(task)) {
        let mode = 'consistently';

        if (typeof task[0] === 'string') {
            mode = task.shift();
        }
        

        if (mode == 'random') {
            prepareTask(task[Math.floor(Math.random() * task.length)], preparedTasks);
        }
    
        if (mode == 'consistently') {
            for (let t of task) {
                prepareTask(t, preparedTasks);
            }
        }

        if (mode == 'shuffle') {
            shuffle(task);
            task.unshift('consistently')
            prepareTask(task, preparedTasks);
        }
    }
    
}

const compileTasks = (preparedTasks) => {
    const compileTask = [];
    for (let task of preparedTasks) {
        if ('token' in task) {
            if (Array.isArray(task.token)) {
                task.token = task.token[Math.floor(Math.random() * task.token.length)];
            }

            if (task.token == '^') {
                if (!('token' in compileTask[compileTask.length - 1])) {
                    launchError(`Error when parsing task list. Check 'token' property`);
                }

                task.token = compileTask[compileTask.length - 1].token;
            }
        }

        if ('amount' in task) {
            if (Array.isArray(task.amount)) {
                task.amount = utils.getRandomDecimal(...task.amount, 6);
            }

            if (task.amount == '^') {
                if (!('amount' in compileTask[compileTask.length - 1])) {
                    launchError(`Error when parsing task list. Check 'amount' property`);
                }

                task.amount = compileTask[compileTask.length - 1].amount;
            }
        }

        if ('token' in task.from) {
            if (Array.isArray(task.from.token)) {
                task.from.token = task.from.token[Math.floor(Math.random() * task.from.token.length)];
            }

            if (task.from.token == '^to') {
                if (!('token' in compileTask[compileTask.length - 1].to)) {
                    launchError(`Error when parsing task list. Check 'token.to' property`);
                }

                task.from.token = compileTask[compileTask.length - 1].to.token;
            }
        }

        if ('token' in task.to) {
            if (Array.isArray(task.to.token)) {
                const uniqTokens = task.to.token.filter((token) => token != task.from.token);
                task.to.token = uniqTokens[Math.floor(Math.random() * uniqTokens.length)];
            }

            if (task.to.token == '^from') {
                if (!('token' in compileTask[compileTask.length - 1].from)) {
                    launchError(`Error when parsing task list. Check 'token.from' property`);
                }

                task.to.token = compileTask[compileTask.length - 1].from.token;
            }
        }

        if ('amount' in task.from) {
            if (Array.isArray(task.from.amount)) {
                task.from.amount = utils.getRandomDecimal(...task.from.amount, 6);
            }
        }

        if ('amount' in task.to) {
            if (Array.isArray(task.to.amount)) {
                task.to.amount = utils.getRandomDecimal(...task.to.amount, 6);
            }
        }
        
        compileTask.push(task);
    }

    return compileTask;
}

if (!(!!argv.wallets && !!argv.task)) {
    launchError(`Required argument (--wallets or --task) is missing`, true);
}

if (!(argv.task in taskList)) {
    launchError(`Task with name ${argv.task} is not found in task list`);
}

if (!!argv.task_check) {
    const preparedTasks = [];
    for (let task of taskList[argv.task]) {
        prepareTasks(JSON.parse(JSON.stringify(task)), preparedTasks);
    }
    
    const compiledTasks = compileTasks(preparedTasks);

    console.log(compiledTasks);
    process.exit(-1);
}

const parsedWallets = storage.parseCSV(argv.wallets);
if (!parsedWallets.result) {
    launchError(parsedWallets.reason);
}

const wallets = parsedWallets.data;
logger.info(`Loaded ${wallets.length} wallets`);

let currentWallet = 1;
for (let wallet of wallets) {
    logger.info(`[${currentWallet}/${wallets.length}] ${wallet.address} > Start`.bgMagenta);

    const preparedTasks = [];
    for (let task of taskList[argv.task]) {
        prepareTasks(JSON.parse(JSON.stringify(task)), preparedTasks);
    }
    
    const compiledTasks = compileTasks(preparedTasks);

    const executor = new Executor(wallet);
    
    for (let task of compiledTasks) {
        await executor.perform(task, logger);
        await utils.timeout(utils.getRandomInt(...config.delayBetweenTask), logger);
    }

    logger.info(`[${currentWallet}/${wallets.length}] ${wallet.address} > Finish`.bgMagenta);
    console.log();
    await utils.timeout(utils.getRandomInt(...config.delayBetweenAcc), logger);
    currentWallet++;
}
