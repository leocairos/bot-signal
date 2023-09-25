require('dotenv-safe').config();

const Exchange = require("./exchange");

const { startMonitor, startMonitorTicker } = require("./monitor");
const CMCInfo = require("./cmc");
const { doLogStartMsg, compactNumber } = require("./util");

const QUOTES = process.env.QUOTES ? process.env.QUOTES.split(',') : ["USDT"];
const INTERVALS = process.env.INTERVALS ? process.env.INTERVALS.split(',') : ["15m"];

const MINIMUM_QUOTE_VOLUME_ALERT = parseFloat(process.env.MINIMUM_QUOTE_VOLUME_ALERT) || 0;
const MINIMUM_PERCENT_CHANGE_ALERT = parseFloat(process.env.MINIMUM_PERCENT_CHANGE_ALERT) || 0;

const cmcInfo = new CMCInfo();

async function doRun() {
  doLogStartMsg(`System started at ${new Date().toISOString()}\n`);

  const exchange = new Exchange();

  await startMonitorTicker(exchange);

  const spotSymbols = await exchange.getSymbols();

  doLogStartMsg(`Monitoring all available symbols [${INTERVALS}] with quotes asset [${QUOTES}]:`);
  doLogStartMsg(` - ${spotSymbols.length} spot symbols`)

  await cmcInfo.updateCmcInfo();
  const cmcSymbolQUOTE = cmcInfo.filteredSymbolsWithQuote;

  const spotVsCMC = [...spotSymbols].filter(s => cmcSymbolQUOTE.includes(s)).sort();

  doLogStartMsg(`\nCoinPairs vs CMC : `)
  doLogStartMsg(`  * Spot Market [${spotVsCMC.length}]: ${spotVsCMC.toString().replace(new RegExp(',', 'g'), ', ').trim()}\n`);

  INTERVALS.forEach(interval => {
    [...spotSymbols]
      .filter(s => cmcSymbolQUOTE.includes(s))
      .forEach(symbol => startMonitor(exchange, symbol, interval))
  })

  if (MINIMUM_QUOTE_VOLUME_ALERT !== 0 || MINIMUM_PERCENT_CHANGE_ALERT !== 0) {
    doLogStartMsg(`Alerts only when (by last 24h): `)
    if (MINIMUM_QUOTE_VOLUME_ALERT !== 0)
      doLogStartMsg(` - Quote volume is >= ${compactNumber(MINIMUM_QUOTE_VOLUME_ALERT)}`)
    if (MINIMUM_PERCENT_CHANGE_ALERT !== 0)
      doLogStartMsg(` - Percent change price is >= ${Math.abs(MINIMUM_PERCENT_CHANGE_ALERT)}%\n`)
  }

}

doRun();
