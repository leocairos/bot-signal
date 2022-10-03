require('dotenv-safe').config();
const Exchange = require("./exchange");
const AlertSignal = require("./AlertSignal");
const { startMonitor, RSI_LIMITS, MFI_LIMITS, cleanAlerts, getAlerts, startMonitorTicker} = require("./monitor");
const { compactNumber } = require("./util");

const SEND_ALERT_INTERVAL = process.env.SEND_ALERT_INTERVAL;
const QUOTE = `${process.env.QUOTE}`;
const INTERVALS = process.env.INTERVALS ? process.env.INTERVALS.split(',') : ["15m"];
const MINIMUM_QUOTE_VOLUME_ALERT= parseFloat(process.env.MINIMUM_QUOTE_VOLUME_ALERT) || 0;
const MINIMUM_PERCENT_CHANGE_ALERT= parseFloat(process.env.MINIMUM_PERCENT_CHANGE_ALERT) || 0;
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

  //delay between 2s and 5s to prevent code -1003 Way too many requests... banned until... when run in parallel
  await new Promise(r => setTimeout(r, (Math.floor(Math.random() * 3) * 1000) + 2) );
  
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
  
  MINIMUM_QUOTE_VOLUME_ALERT
  MINIMUM_PERCENT_CHANGE_ALERT
  if (MINIMUM_QUOTE_VOLUME_ALERT !== 0 || MINIMUM_PERCENT_CHANGE_ALERT !== 0){
    console.log(`Alerts only when (by last 24h): `)
    if (MINIMUM_QUOTE_VOLUME_ALERT !== 0)
      console.log(` - Quote volume is >= ${compactNumber(MINIMUM_QUOTE_VOLUME_ALERT)}.`)
    if (MINIMUM_PERCENT_CHANGE_ALERT !== 0)
      console.log(` - Percent change price is >= ${Math.abs(MINIMUM_PERCENT_CHANGE_ALERT)}%.\n`)
  }


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