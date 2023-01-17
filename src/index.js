require('dotenv-safe').config();

const fs = require('fs');

const Exchange = require("./exchange");
const AlertSignal = require("./AlertSignal");
const TelegramMessage = require("./telegram");

const { startMonitor, RSI_LIMITS, MFI_LIMITS, startMonitorTicker } = require("./monitor");
const { compactNumber, getTopCoinmarketcap } = require("./util");

const SEND_ALERT_INTERVAL = process.env.SEND_ALERT_INTERVAL;
const ALERT_ONLY_FUTURES = process.env.ALERT_ONLY_FUTURES;
const QUOTE = `${process.env.QUOTE}`;
const INTERVALS = process.env.INTERVALS ? process.env.INTERVALS.split(',') : ["15m"];
const MINIMUM_QUOTE_VOLUME_ALERT = parseFloat(process.env.MINIMUM_QUOTE_VOLUME_ALERT) || 0;
const MINIMUM_PERCENT_CHANGE_ALERT = parseFloat(process.env.MINIMUM_PERCENT_CHANGE_ALERT) || 0;

const alertSignals = new AlertSignal();
const telegramStartMessages = new TelegramMessage();

const msgLogStart = [];

async function getSpotSymbols(exchange) {
  const spotSymbols = await exchange.exchangeInfo();
  const spotFilteredSymbols = [...spotSymbols.symbols]
    .filter(s => s.quoteAsset === QUOTE &&
      s.status === "TRADING" &&
      s.isSpotTradingAllowed === true)
    .map(s => s.symbol);
  return spotFilteredSymbols;
}

async function getFutureSymbols(exchange) {
  const futuresSymbols = await exchange.futuresExchangeInfo();
  if (!futuresSymbols.symbols) console.log(JSON.stringify(futuresSymbols))
  const futuresFilteredSymbols = futuresSymbols.symbols
    ?.filter(s => s.quoteAsset === QUOTE &&
      s.status === "TRADING")
    .map(s => s.symbol)
  return futuresFilteredSymbols || [''];
}

function doLogStartMsg(msg) {
  msgLogStart[msgLogStart.length] = msgLogStart.length == 0 ? `<b>${msg}</b>` : msg;
  console.log(msg);
}

function doSendStartLog() {
  let telegramMessage = ''
  msgLogStart.forEach(async message => telegramMessage += message + '\n');
  telegramStartMessages.addMessage(telegramMessage);
  telegramStartMessages.sendMessagesTelegram();
}

async function doRun(isFuture = false) {
  doLogStartMsg(`System started at ${new Date().toISOString()}\n`);

  const exchange = new Exchange();

  const spotSymbols = await getSpotSymbols(exchange);

  //delay between 2s and 5s to prevent code -1003 Way too many requests... banned until... when run in parallel
  await new Promise(r => setTimeout(r, (Math.floor(Math.random() * 3) * 1000) + 2));

  const futuresSymbols = await getFutureSymbols(exchange);

  const [topSymbols, cmSymbols] = await getTopCoinmarketcap();

  alertSignals.updateSymbols(spotSymbols, futuresSymbols, topSymbols, cmSymbols);
  const bothSymbols = futuresSymbols.filter(x => spotSymbols.includes(x));
  const onlyFutures = futuresSymbols.filter(x => !spotSymbols.includes(x));

  doLogStartMsg(`Monitoring all available symbols [${INTERVALS}] with quote asset "${QUOTE}":`);
  if (!isFuture)
    doLogStartMsg(` - ${spotSymbols.length} spot symbols.\n - ${bothSymbols.length} futures symbols.\n`)
  else
    doLogStartMsg(` - ${onlyFutures.length} futures symbols (only in Futures).\n`)

  doLogStartMsg(`Alerts only futures: ${ALERT_ONLY_FUTURES && isFuture}.\n`)

  doLogStartMsg(`Alerts every ${SEND_ALERT_INTERVAL}s for this Strategies:`)
  doLogStartMsg(` - Scalp H7: RSI (${RSI_LIMITS}) x MFI (${MFI_LIMITS}).\n`)

  if (MINIMUM_QUOTE_VOLUME_ALERT !== 0 || MINIMUM_PERCENT_CHANGE_ALERT !== 0) {
    doLogStartMsg(`Alerts only when (by last 24h): `)
    if (MINIMUM_QUOTE_VOLUME_ALERT !== 0)
      doLogStartMsg(` - Quote volume is >= ${compactNumber(MINIMUM_QUOTE_VOLUME_ALERT)}.`)
    if (MINIMUM_PERCENT_CHANGE_ALERT !== 0)
      doLogStartMsg(` - Percent change price is >= ${Math.abs(MINIMUM_PERCENT_CHANGE_ALERT)}%.\n`)
  }
  const topSymbolsBase = [...topSymbols].map(s => s.symbol + ' ')

  doLogStartMsg(`Always alert for the TOP ${topSymbols.length} Symbols: ${topSymbolsBase.toString().replace(new RegExp(' ,', 'g'), ', ').trim()}.\n`);
  doSendStartLog();

  startMonitorTicker(exchange);
  INTERVALS.forEach(interval => {
    if (!isFuture)
      spotSymbols.forEach(symbol => startMonitor(exchange, alertSignals, symbol, interval))
    else
      onlyFutures.forEach(symbol => startMonitor(exchange, alertSignals, symbol, interval, true))
  })

}

// async function doSummary() {
//   let tsNow = Math.round(new Date().getTime() / 1000);
//   let tsYesterday = tsNow - (24 * 3600);

//   const filenames = fs.readdirSync('alerts');

//   console.log('tsYesterday:', tsYesterday);
//   console.log('Total Files:', filenames.length);

//   const filenamesLast24h = [...filenames]
//     .filter(filename => Math.round(filename.split('_')[0] / 1000) >= tsYesterday);

//   console.log('Total Files Last 24h:', filenamesLast24h.length);
//   filenamesLast24h.forEach(filename => {
//     console.log(new Date(Number(filename)).toISOString())
//   })
// }

setInterval(() => {
  //console.log(alertSignals.getAlerts())
  alertSignals.addMessagesAlert();
  alertSignals.sendTelegramMessage();
}, SEND_ALERT_INTERVAL * 1000)
//doRun();

switch (process.argv[2]?.toUpperCase()) {
  case 'ONLY-FUTURES':
    doRun(true);
    break;
  default:
    doRun();
}

//doSummary()
//getTopCoinmarketcap();