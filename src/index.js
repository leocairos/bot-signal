require('dotenv-safe').config();
const Exchange = require("./exchange");
const { startMonitor, RSI_LIMITS, MFI_LIMITS, cleanAlerts, getAlerts } = require("./monitor");
const { sendMessageTelegram } = require("./telegram");

const QUOTE = `${process.env.QUOTE}`;
const INTERVALS = process.env.INTERVALS ? process.env.INTERVALS.split(',') : ["15m"];

async function doRun(){
  console.log(`System started at ${new Date().toISOString()}\n`)

  const exchange = new Exchange();

  const spotSymbols = await exchange.exchangeInfo();
  const spotFilteredSymbols = spotSymbols.symbols
    .filter(s => s.quoteAsset === QUOTE && 
      s.status === "TRADING" && 
      s.isSpotTradingAllowed === true )
    .map(s => s.symbol)

  const futuresSymbols = await exchange.futuresExchangeInfo();
  const futuresFilteredSymbols = futuresSymbols.symbols
    .filter(s => s.quoteAsset === QUOTE && 
      s.status === "TRADING" )
    .map(s => s.symbol)

  console.log(`Monitoring all available symbols [${INTERVALS}] with quote asset "${QUOTE}":`)
  console.log(` - ${spotFilteredSymbols.length} spot symbols.`)
  console.log(` - ${futuresFilteredSymbols.length} futures symbols.\n`)
  
  console.log(`Alerts by RSI (${RSI_LIMITS}) x MFI (${MFI_LIMITS}).\n`)
  
  INTERVALS.forEach( interval => spotFilteredSymbols.forEach( symbol=> startMonitor(symbol, interval)))
  //spotFilteredSymbols.forEach( symbol=> startMonitor(symbol, "1m"))
  
  // const onlyFutures = futuresFilteredSymbols.filter(x => !spotFilteredSymbols.includes(x));
  // INTERVALS.forEach( interval => onlyFutures.forEach( symbol=> startFuturesMonitor(symbol, interval)))
}

doRun();


// setInterval(()=>{
//   const alerts = getAlerts();
//   console.log(alerts, '\n\n')
//   let msgTelegram = ''
//   const sOverBought = alerts.filter(a => a.signal === 'overBought')
//   const sOverSold = alerts.filter(a => a.signal === 'overSold')
//   sOverBought.forEach(a => msgTelegram += a.formattedAlert)
//   sOverSold.forEach(a => msgTelegram += a.formattedAlert)

//   if (msgTelegram !== ''){
//     sendMessageTelegram(msgTelegram);
//     cleanAlerts();
//   }
// }, 10000)