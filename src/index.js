require('dotenv-safe').config();
const { RSI, MFI, EMA, fibonacciRetracement, SMA, MACD } = require("./indicators")
const Exchange = require("./exchange");
const { makeChartImage, htmlAlertFormatted, formatNumber } = require("./util");
const { sendMessageTelegram, sendImageTelegram } = require("./telegram");

const QUOTE = `${process.env.QUOTE}`;
const INTERVALS = process.env.INTERVALS ? process.env.INTERVALS.split(',') : ["15m"];
const RSI_LIMITS = process.env.RSI_LIMITS ? process.env.RSI_LIMITS.split(',') : [30,70];
const MFI_LIMITS = process.env.MFI_LIMITS ? process.env.MFI_LIMITS.split(',') : [20,80];
const USE_INVERSE_CONDITIONS = !process.env.USE_INVERSE_CONDITIONS || process.env.USE_INVERSE_CONDITIONS === 'true'

function doCalc(ohlc) {
  const rsi = RSI(ohlc.close)
  const mfi = MFI(ohlc)
  const ema14 = EMA(ohlc.close, 14)
  const ema100 = EMA(ohlc.close, 100)
  const ema200 = EMA(ohlc.close, 200)
  const sma = SMA(ohlc.close)
  const macd = MACD(ohlc.close)
  const fib = fibonacciRetracement(ohlc.close[ohlc.close.length -1])
  const lastOpen = formatNumber(ohlc.open[ohlc.close.length -1]);
  const lastHigh = formatNumber(ohlc.high[ohlc.close.length -1]);
  const lastLow = formatNumber(ohlc.low[ohlc.close.length -1]);
  const lastClose = formatNumber(ohlc.close[ohlc.close.length -1]);
  const txtOHLC = `${lastOpen}, ${lastHigh}, ${lastLow}, ${lastClose}`
  const isNumberIndicator = typeof rsi.current === "number" && typeof mfi.current === "number";
  const isUpperZero = (rsi.current > 0  && mfi.current > 0)
  const isNumberPIndicator = typeof rsi.previous === "number" && typeof mfi.previous === "number";
  const isUpperPZero = (rsi.previous > 0  && mfi.previous > 0)
  const isOkToProcess = isNumberIndicator && isUpperZero && isNumberPIndicator && isUpperPZero

  return [rsi, mfi, ema14, ema100, ema200, sma, macd, fib, txtOHLC, isOkToProcess];
}

async function doProcess(){

}

async function startMonitor(symbol, interval) {
  const exchange = new Exchange();
    
  exchange.chartStream(symbol, interval , async (ohlc) => {   
    const [rsi, mfi, ema14, ema100, ema200, sma, macd, fib, txtOHLC, isOkToProcess] = doCalc(ohlc);
    
    let msg = `${symbol}_${interval} RSI: ${rsi.current}, MFI: ${mfi.current}`
    
    if (isOkToProcess){
      let overSold = (rsi.current <= RSI_LIMITS[0] && mfi.current <= MFI_LIMITS[0]) //&&
                       //(rsi.previous > 20 && mfi.previous > 20)    
      let overBought = (rsi.current >= RSI_LIMITS[1] && mfi.current >= MFI_LIMITS[1]) //&&
                        // (rsi.previous < 37 && mfi.previous < 37)
      if (USE_INVERSE_CONDITIONS === true){
        overSold = overSold && (rsi.previous >  RSI_LIMITS[0] && mfi.previous > MFI_LIMITS[0]);  
        overBought = overBought && (rsi.previous <  RSI_LIMITS[1] && mfi.previous < MFI_LIMITS[1])
      }

      if (overSold == true){
        msg = `${symbol}_${interval} is OVERSOLD (RSI: ${rsi.current}, MFI: ${mfi.current})`;
      } else if (overBought == true){
        msg = `${symbol}_${interval} is OVERBOUGHT (RSI: ${rsi.current}, MFI: ${mfi.current})`;
      }
      msg += `, OHLC: [${txtOHLC}]`

      msg += `, EMA14: ${formatNumber(ema14.current)}`
      msg += `, EMA100: ${formatNumber(ema100.current)}`
      msg += `, EMA200: ${formatNumber(ema200.current)}`
      msg += `, SMA: ${formatNumber(sma.current)}`

      let macdC = { "MACD": formatNumber(macd.current.MACD), 
                    "signal": formatNumber(macd.current.signal),
                    "histogram": formatNumber(macd.current.histogram)}
      msg += `, MACD: ${JSON.stringify(macdC)}`

      let fibCT = '';
      let fibPT = '';
      fib.current.map( f => formatNumber(f)).forEach( f => fibCT === '' ? fibCT += f : fibCT += ', ' + f)
      fib.previous.map( f => formatNumber(f)).forEach( f => fibPT === '' ? fibPT += f : fibPT += ', ' + f)

      msg += `, FibUp: ${fibCT}`
      msg += `, FibDown: ${fibPT}`
      
      console.log(msg)
      
      if (overSold == true || overBought == true) {
        const signal = overSold ? 'overSold' : 'overBought';
        const formattedAlert = htmlAlertFormatted(symbol, interval, signal, rsi, mfi, ohlc, ema14, ema100, ema200, fib, sma, macd);
        console.log(formattedAlert)
        sendMessageTelegram(formattedAlert);
        //sendImageTelegram(symbol, interval)
      }

    }

  })
}

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

  INTERVALS.forEach( interval => spotFilteredSymbols.forEach( symbol=> startMonitor(symbol, interval)))
  
}

doRun();

async function testImage(){
  console.log(`System started at ${new Date().toISOString()}\n`)
  const img = await makeChartImage("ETHUSDT", "15m");
  console.log(img)
}

//testImage()