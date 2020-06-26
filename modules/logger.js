const time = require('moment');

time.locale('ru');

let Reset = "\x1b[0m";
let FgRed = "\x1b[31m";
let FgGreen = "\x1b[32m";
let FgYellow = "\x1b[33m";

module.exports = {
    log: (text)=>{
        let date = time().format('hh:mm:ss, DD.MM.YYYY');
        let message = `$ [${date}] >>  ${text}`;
        console.log(`${FgGreen}${message}${Reset}`);
        return 1;
    },
    error: (text)=>{
        let date = time().format('hh:mm:ss, DD.MM.YYYY');
        let message = `$ [${date}] >>  ${text}`;
        console.error(`${FgRed}${message}${Reset}`);
        return 1;
    },
    warn: (text)=>{
        let date = time().format('hh:mm:ss, DD.MM.YYYY');
        let message = `$ [${date}] >>  ${text}`;
        console.log(`${FgYellow}${message}${Reset}`);
        return 1;
    }
}

