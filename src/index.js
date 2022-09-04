require('dotenv-safe').config();
const { RSI, MFI, EMA, fibonacciRetracement } = require("./indicators")
const Exchange = require("./exchange");
const { htmlAlertFormatted } = require("./util");
const { sendMessageTelegram, sendImageTelegram } = require("./telegram");

const QUOTE = `${process.env.QUOTE}`;

async function startMonitor(symbol, interval) {
  const exchange = new Exchange();
    
  exchange.chartStream(symbol, interval , async (ohlc) => {   
    const rsi = RSI(ohlc.close)
    const mfi = MFI(ohlc)
    const ema14 = EMA(ohlc.close, 14)
    const ema100 = EMA(ohlc.close, 100)
    const ema200 = EMA(ohlc.close, 200)
    const fib = fibonacciRetracement(ohlc.close[ohlc.close.length -1])
    const lastOpen = ohlc.open[ohlc.close.length -1];
    const lastHigh = ohlc.high[ohlc.close.length -1];
    const lastLow = ohlc.low[ohlc.close.length -1];
    const lastClose = ohlc.close[ohlc.close.length -1];
    const txtOHLC = `${lastOpen}, ${lastHigh}, ${lastLow}, ${lastClose}`
    const isNumberIndicator = typeof rsi.current === "number" && typeof mfi.current === "number";
    const isUpperZero = (rsi.current > 0  && mfi.current > 0)
    const isNumberPIndicator = typeof rsi.previous === "number" && typeof mfi.previous === "number";
    const isUpperPZero = (rsi.previous > 0  && mfi.previous > 0)
    
    let msg = `${symbol}_${interval} RSI: ${rsi.current}, MFI: ${mfi.current}`
    
    if (isNumberIndicator && isUpperZero && isNumberPIndicator && isUpperPZero){
      const overSold = (rsi.current <= 20 && mfi.current <= 20) &&
                       (rsi.previous > 20 && mfi.previous > 20)    
      const overBought = (rsi.current >= 80 && mfi.current >= 80) &&
                         (rsi.previous < 80 && mfi.previous < 80)

      if (overSold == true){
        msg = `${symbol}_${interval} is OVERSOLD (RSI: ${rsi.current}, MFI: ${mfi.current})`;
      } else if (overBought == true){
        msg = `${symbol}_${interval} is OVERBOUGHT (RSI: ${rsi.current}, MFI: ${mfi.current})`;
      }
      msg += `, EMA14: ${ema14.current}`
      msg += `, EMA100: ${ema100.current}`
      msg += `, EMA200: ${ema200.current}`

      msg += `, FibUp: ${fib.current}`
      msg += `, FibDown: ${fib.previous}`
      
      msg += `, OHLC: [${txtOHLC}]`
      
      console.log(msg)
      if (overSold == true || overBought == true) sendMessageTelegram(msg);
    }

  })
}

(async () => {
  console.log(`System started at ${new Date().toISOString()}\n`)

  //sendImageTelegram("https://www.tradingview.com/x/2F5BIckO/");
  // let htmlMsg = htmlAlertFormatted();
  // sendMessageTelegram(htmlMsg)

  const exchange = new Exchange();
  const spotSymbols = await exchange.exchangeInfo();

  const spotFilteredSymbols = spotSymbols.symbols
    .filter(s => s.quoteAsset === QUOTE && 
      s.status === "TRADING" && 
      s.isSpotTradingAllowed === true )
  .map(s => s.symbol)

  //console.log(`Monitoring all ${spotFilteredSymbols.length} available with quote asset "${QUOTE}".\n`)

  const futuresSymbols = await exchange.futuresExchangeInfo();

  const futuresFilteredSymbols = futuresSymbols.symbols
    .filter(s => s.quoteAsset === QUOTE && 
      s.status === "TRADING" )
  .map(s => s.symbol)

  console.log(`Monitoring all available symbols with quote asset "${QUOTE}":`)
  console.log(` - ${spotFilteredSymbols.length} spot symbols.`)
  console.log(` - ${futuresFilteredSymbols.length} futures symbols.\n`)


  spotFilteredSymbols.forEach( symbol=> startMonitor(symbol, "15m") )
  spotFilteredSymbols.forEach( symbol=> startMonitor(symbol, "1h") )
  //spotFilteredSymbols.forEach( symbol=> startMonitor(symbol, "1m") )
})()