import fs from 'fs';
import { separatorCSV, requiredFieldsCSV } from './constants.js'

export default class Storage {
    static saveToCSV = (path, data, logger) => {
        let saveData = Object.keys(data[0]).join(';') + '\n';
        for (let row of data) {
            const line = [];
            for (let cell in row) {
                line.push(row[cell]);
            }

            saveData += line.join(';') + '\n';
        }

        fs.writeFileSync(path, saveData);
        logger.info(`Wallets are saved to a file '${path}'`);
    }

    static parseCSV = (path) => {
        const data = this.fileToArr(path);
        if (!data.result) {
            return data;
        }

        const rows = data.data;
        const header = rows.shift().split(separatorCSV);
        const checkRequiredFields = requiredFieldsCSV.every(field => header.includes(field));

        if (!checkRequiredFields) {
            return { result: false, reason: 'No mandatory fields in CSV header' };
        }

        const wallets = [];
        for (let row of rows) {
            const  wallet = {};
            const cells = row.split(separatorCSV);
            for (let cell in header) {
                wallet[header[cell]] = cells[cell];
            }
            wallets.push(wallet);
        }

        return { result: true, data: wallets }
    }

    static fileToArr = (path) => {
        if (!fs.existsSync(path)) {
            return { result: false, reason: `File not found at specified path '${path}'` }
        }

        const lines = fs.readFileSync(path)
            .toString('UTF8')
            .split('\n')
            .map(pk => pk.trim())
            .filter(pk => pk != '');
        
        return { result: true, data: lines };
    }

    static arrToFile = (path, data) => {

    }
}