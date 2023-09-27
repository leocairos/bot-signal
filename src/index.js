require('dotenv-safe').config();

const Exchange = require("./exchange");

const { startMonitor, startMonitorTicker } = require("./monitor");
const CMCInfo = require("./cmc");
const { LogStartMsg, compactNumber } = require("./util");

const QUOTES = process.env.QUOTES ? process.env.QUOTES.split(',') : ["USDT"];
const INTERVALS = process.env.INTERVALS ? process.env.INTERVALS.split(',') : ["15m"];

const MINIMUM_QUOTE_VOLUME_ALERT = parseFloat(process.env.MINIMUM_QUOTE_VOLUME_ALERT) || 0;
const MINIMUM_PERCENT_CHANGE_ALERT = parseFloat(process.env.MINIMUM_PERCENT_CHANGE_ALERT) || 0;

const logStartMsg = new LogStartMsg();
const cmcInfo = new CMCInfo(logStartMsg);

async function doRun() {

  logStartMsg.doLogStartMsg(`System started at ${new Date().toISOString()}\n`);

  const exchange = new Exchange();

  await startMonitorTicker(exchange);

  const spotSymbols = await exchange.getSymbols();

  logStartMsg.doLogStartMsg(`Monitoring all available symbols [${INTERVALS}] with quotes asset [${QUOTES}]:`);
  logStartMsg.doLogStartMsg(` - ${spotSymbols.length} spot symbols`)

  await cmcInfo.updateCmcInfo();
  const cmcSymbolQUOTE = cmcInfo.filteredSymbolsWithQuote;

  const spotVsCMC = [...spotSymbols].filter(s => cmcSymbolQUOTE.includes(s)).sort();

  logStartMsg.doLogStartMsg(`\nCoinPairs vs CMC : `)
  logStartMsg.doLogStartMsg(`  * Spot Market [${spotVsCMC.length}]: ${spotVsCMC.toString().replace(new RegExp(',', 'g'), ', ').trim()}\n`);

  INTERVALS.forEach(interval => {
    [...spotSymbols]
      .filter(s => cmcSymbolQUOTE.includes(s))
      .forEach(symbol => startMonitor(exchange, symbol, interval))
  })

  logStartMsg.doLogStartMsg(`Monitoring ${INTERVALS.length * spotVsCMC.length} candle channels (${spotVsCMC.length} symbols in ${INTERVALS.length} times frame)\n`)

  if (MINIMUM_QUOTE_VOLUME_ALERT !== 0 || MINIMUM_PERCENT_CHANGE_ALERT !== 0) {
    logStartMsg.doLogStartMsg(`Alerts only when (by last 24h): `)
    if (MINIMUM_QUOTE_VOLUME_ALERT !== 0)
      logStartMsg.doLogStartMsg(` - Quote volume is >= ${compactNumber(MINIMUM_QUOTE_VOLUME_ALERT)}`)
    if (MINIMUM_PERCENT_CHANGE_ALERT !== 0)
      logStartMsg.doLogStartMsg(` - Percent change price is >= ${Math.abs(MINIMUM_PERCENT_CHANGE_ALERT)}%\n`)
  }

  logStartMsg.doSendStartLog();
}

doRun();
