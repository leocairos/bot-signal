require('dotenv-safe').config();
const { RSI, MFI, EMA } = require("./indicators")
const Exchange = require("./exchange");
const { sendMessageTelegram } = require("./telegram");

const QUOTE = `${process.env.QUOTE}`;

async function startMonitor(symbol, interval) {
  const exchange = new Exchange();
    
  exchange.chartStream(symbol, interval , async (ohlc) => {   
    const rsi = RSI(ohlc.close)
    const mfi = MFI(ohlc)
    const ema14 = EMA(ohlc.close, 14)
    const ema100 = EMA(ohlc.close, 100)
    const ema200 = EMA(ohlc.close, 200)
    const lastOpen = ohlc.open[ohlc.close.length -1];
    const lastHigh = ohlc.high[ohlc.close.length -1];
    const lastLow = ohlc.low[ohlc.close.length -1];
    const lastClose = ohlc.close[ohlc.close.length -1];
    const txtOHLC = `${lastOpen}, ${lastHigh}, ${lastLow}, ${lastClose}`
    let isAlert = false
    
    let msg = `${symbol}-${interval} RSI: ${rsi.current}, MFI: ${mfi.current}`
    
    if (typeof rsi.current === "number" && typeof mfi.current === "number" ){
      if (rsi.current <= 20 && mfi.current <= 20){
        msg = `${symbol}-${interval} is OVERSOLD (RSI: ${rsi.current}, MFI: ${mfi.current})`;
        isAlert = true
      } else if (rsi.current >= 80 && mfi.current >= 80){
        msg = `${symbol}-${interval} is OVERBOUGHT (RSI: ${rsi.current}, MFI: ${mfi.current})`;
        isAlert = true
      }
      msg += `, EMA14: ${ema14.current}`
      msg += `, EMA100: ${ema100.current}`
      msg += `, EMA200: ${ema200.current}`
      msg += `, OHLC: [${txtOHLC}]`
      
      console.log(msg)
      if (isAlert == true) sendMessageTelegram(msg);
    }

  })
}

(async () => {
  console.log(`System started at ${new Date().toISOString()}\n`)

  const exchange = new Exchange();
  const spotSymbols = await exchange.exchangeInfo();

  const spotFilteredSymbols = spotSymbols.symbols
    .filter(s => s.quoteAsset === QUOTE && 
      s.status === "TRADING" && 
      s.isSpotTradingAllowed === true )
  .map(s => s.symbol)

  console.log(`Monitoring all ${spotFilteredSymbols.length} available with quote asset "${QUOTE}".\n`)

  // spotFilteredSymbols.forEach( symbol=> startMonitor(symbol, "15m") )
  // spotFilteredSymbols.forEach( symbol=> startMonitor(symbol, "1h") )
  spotFilteredSymbols.forEach( symbol=> startMonitor(symbol, "1m") )
})()