require('dotenv-safe').config();
const Exchange = require("./exchange");
const AlertSignal = require("./AlertSignal");
const { startMonitor, RSI_LIMITS, MFI_LIMITS, cleanAlerts, getAlerts, startMonitorTicker} = require("./monitor");

const SEND_ALERT_INTERVAL = process.env.SEND_ALERT_INTERVAL;
const QUOTE = `${process.env.QUOTE}`;
const INTERVALS = process.env.INTERVALS ? process.env.INTERVALS.split(',') : ["15m"];
const alertSignals = new AlertSignal();

async function getSpotSymbols(exchange){
  const spotSymbols = await exchange.exchangeInfo();
  const spotFilteredSymbols = [...spotSymbols.symbols]
    .filter(s => s.quoteAsset === QUOTE && 
      s.status === "TRADING" && 
      s.isSpotTradingAllowed === true )
    .map(s => s.symbol);
  return spotFilteredSymbols;
}

async function getFutureSymbols(exchange){
  const futuresSymbols = await exchange.futuresExchangeInfo();
  if (!futuresSymbols.symbols) console.log(JSON.stringify(futuresSymbols))
  const futuresFilteredSymbols = futuresSymbols.symbols
    ?.filter(s => s.quoteAsset === QUOTE && 
      s.status === "TRADING" )
    .map(s => s.symbol)
  return futuresFilteredSymbols || [''];
}

async function doRun(isFuture = false){
  console.log(`System started at ${new Date().toISOString()}\n`)

  const exchange = new Exchange();

  const spotSymbols = await getSpotSymbols(exchange);
  const futuresSymbols = await getFutureSymbols(exchange);

  alertSignals.updateSymbols(spotSymbols, futuresSymbols);
  const bothSymbols = futuresSymbols.filter(x => spotSymbols.includes(x));
  const onlyFutures = futuresSymbols.filter(x => !spotSymbols.includes(x));

  console.log(`Monitoring all available symbols [${INTERVALS}] with quote asset "${QUOTE}":`)
  if (!isFuture)
    console.log(` - ${spotSymbols.length} spot symbols.\n - ${bothSymbols.length} futures symbols.\n`)
  else
    console.log(` - ${onlyFutures.length} futures symbols (only in Futures).\n`)
  
  console.log(`Alerts every ${SEND_ALERT_INTERVAL}s for this Strategies:`)
  console.log(`  - Scalp H7: RSI (${RSI_LIMITS}) x MFI (${MFI_LIMITS}).\n`)
  
  startMonitorTicker(exchange);
  INTERVALS.forEach( interval => {
    if (!isFuture)
      spotSymbols.forEach( symbol=> startMonitor(exchange, alertSignals, symbol, interval))
    else
      onlyFutures.forEach( symbol=> startMonitor(exchange, alertSignals, symbol, interval, true))
  })
    
}

setInterval(()=>{
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