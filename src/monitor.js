const { RSI, MFI, EMA, bollingerBands, TRIX, Stochastic, ADX } = require("./lib/indicators")
const { formatNumber, compactNumber, getGraphicLink, intervalNext } = require("./lib/util");
const TelegramMessage = require("./telegram");
const AlertSignal = require("./AlertSignal");
const { calculateSR } = require("./lib/calculateSR");

const SEND_ALERT_INTERVAL = process.env.SEND_ALERT_INTERVAL || 60;
const MINIMUM_QUOTE_VOLUME_ALERT = parseFloat(process.env.MINIMUM_QUOTE_VOLUME_ALERT) || 0;
const MINIMUM_PERCENT_CHANGE_ALERT = parseFloat(process.env.MINIMUM_PERCENT_CHANGE_ALERT) || 0;

const RSI_LIMITS = process.env.RSI_LIMITS ? process.env.RSI_LIMITS.split(',') : [30, 70];
const MFI_LIMITS = process.env.MFI_LIMITS ? process.env.MFI_LIMITS.split(',') : [20, 80];

let ticker24h = {}

const telegramMessages = new TelegramMessage();
const alertSignal = new AlertSignal(telegramMessages);

function isCalculated(indicator) {
  const isNumber = typeof indicator.current === "number";
  const isNumberPrevious = typeof indicator.previous === "number";
  return isNumber && isNumberPrevious;
}

const doProcess = async (cmcInfo, symbol, interval, ohlc) => {
  const rsi = RSI(ohlc.close)
  const mfi = MFI(ohlc)
  const ema3 = EMA(ohlc.close, 3)
  const ema8 = EMA(ohlc.close, 8)
  const ema9 = EMA(ohlc.close, 9)
  const ema20 = EMA(ohlc.close, 20)
  const bb_8_2 = bollingerBands(ohlc.close, 8, 2)
  const trix_9 = TRIX(ohlc.close, 9)
  const stochastic_8_3 = Stochastic(ohlc, 8, 3)
  const adx_8 = ADX(ohlc, 8)
  //Ensures that there is already data for calculating indicators
  const isOkToProcess = isCalculated(rsi) && isCalculated(ema3);

  //console.log(cmcInfo.getSymbolLink(symbol))
  if (isOkToProcess) {
    const ticker = ticker24h[symbol];
    const quoteVolume = parseFloat(ticker?.quoteVolume) || 0;
    const percentChange = parseFloat(ticker?.percentChange) || 0;

    const currentClose = ohlc.close[ohlc.close.length - 1]

    //Quote when not stablecoin dollar paired
    const quote = cmcInfo.getQuoteByCoinPair(symbol);
    const quoteUsdValue = cmcInfo.getUsdValue(quote);
    const isQuoteAlert = quoteVolume * quoteUsdValue >= MINIMUM_QUOTE_VOLUME_ALERT;
    const isPercentAlert = Math.abs(percentChange) >= MINIMUM_PERCENT_CHANGE_ALERT;

    //Críterios comum para ativação de avaliação de estratégia
    if ((isQuoteAlert && isPercentAlert)) {
      console.log(`Ready to evaluate ${symbol}_${interval} $ ${formatNumber(currentClose)} `,
        `rsi: ${formatNumber(rsi.current)} ema9: ${formatNumber(ema9.current)}`);

      let msgTitle = `<b>${cmcInfo.getSymbolLink(symbol)} $ ${formatNumber(currentClose)}`
      msgTitle += ` (last 24h ${percentChange.toFixed(2)}% volume ${compactNumber(quoteVolume)})</b>`
      const messages = []

      //Strategy 00 - Support and Resistance
      const nextInterval = intervalNext(interval);
      const supportResistance = await calculateSR(symbol, nextInterval, 100);
      const srVariation = supportResistance.variation * 100;
      const supportTick = supportResistance.support.tick;
      const resistanceTick = supportResistance.resistance.tick;
      const VAR_ALERT_SR = 5;
      //const mediumSR = supportResistance.medium;
      // let msgSR = ''
      // if (currentClose >= mediumSR){
      //   if (currentClose <= resistanceTick){
      //     //acima do meio e abaixo ou igual a resitencia
      //     const diffRes = resistanceTick - currentClose;
      //     const varDiffRes = 
      //     msgSR = `${}`
      //   }else { 
      //     // rompimento de resistencia
      //     const diffRes = currentClose - resistanceTick;
      //   }
      // } else {
      //   if (currentClose >= supportTick){
      //     //abaixo do meio e acima ou igual ao suporte
      //   }else { 
      //     // rompimento de suporte
      //   }
      // }

      //console.log({ symbol, interval, nextInterval, srVariation, supportResistance });
      if (srVariation >= VAR_ALERT_SR) {
        let msgAux = `${getGraphicLink(symbol, interval)} SR variation ${srVariation.toFixed(2)}% `
        msgAux += `in ${nextInterval} ($${formatNumber(supportTick)} to $${formatNumber(resistanceTick)})`
        messages.push(msgAux)
      }

      const ema9Var = ((currentClose / ema9.current - 1) * 100).toFixed(2);
      //Estratégia 01 - Only for example
      if (currentClose < ema9.current && ema9Var < -0.5) {
        messages.push(`${getGraphicLink(symbol, interval)} last close LOWER than ema9 ($ ${formatNumber(ema9.current)} ${ema9Var}%)`)
      } else if (currentClose > ema9.current && ema9Var > 0.5) {
        messages.push(`${getGraphicLink(symbol, interval)} last close UPPER than ema9 ($ ${formatNumber(ema9.current)})`)
      }

      //Estratégia 02 (By Ricardo) compra quando sobe 1% e venda quando cai 1%
      const lastClose = ohlc.close[ohlc.close.length - 1]
      const previousClose = ohlc.close[ohlc.close.length - 2]
      const profit = ((lastClose / previousClose) - 1) * 100;
      if (profit >= 1 || profit <= -1) {
        messages.push(`${getGraphicLink(symbol, interval)} changing ${profit.toFixed(2)}% ${interval} chart time`)
      }

      //Estratégia 03 - Galileia By H7
      const currentClose03 = ohlc.close[ohlc.close.length - 1]
      const previousClose03 = ohlc.close[ohlc.close.length - 2]
      const isLongGalileia = (currentClose03 > ema9.current) && (previousClose03 < ema9.current);
      const isShortGalileia = (currentClose03 < ema9.current) && (previousClose03 > ema9.current);
      if (isLongGalileia == true) {
        messages.push(`${getGraphicLink(symbol, interval)} possible LONG by Galileia (ema9 $ ${formatNumber(ema9.current)})`)
      } else if (isShortGalileia == true) {
        messages.push(`${getGraphicLink(symbol, interval)} possible SHORT by Galileia (ema9 $ ${formatNumber(ema9.current)})`)
      }

      //Estratégia 04 - Scalp Agiota by H7
      const overSold = (rsi.current <= RSI_LIMITS[0] && mfi.current <= MFI_LIMITS[0])
      const overBought = (rsi.current >= RSI_LIMITS[1] && mfi.current >= MFI_LIMITS[1])
      if (overSold == true) {
        messages.push(`${getGraphicLink(symbol, interval)} is OVERSOLD (rsi ${rsi.current}, mfi ${mfi.current})`)
      } else if (overBought == true) {
        messages.push(`${getGraphicLink(symbol, interval)} is OVERBOUGHT (rsi ${rsi.current}, mfi ${mfi.current})`)
      }

      //Estratégia 05 - Didi Index
      const didiBuySignal = ema3.current > ema8.current
      const didiSellSignal = ema3.current < ema8.current
      const didiBuyConf = ema8.current > ema20.current
      const didiSellConf = ema8.current < ema20.current
      const didiHighNeedle = didiBuySignal && didiBuyConf
      const didiLowNeedle = didiSellSignal && didiSellConf
      const bb_8_2_u = bb_8_2.current.upper;
      const bb_8_2_m = bb_8_2.current.middle;
      const bb_8_2_l = bb_8_2.current.lower;
      //half the distance from the middle to the top of the band
      const bb_8_2_mu = (bb_8_2_u - bb_8_2_m) / 2 + bb_8_2_m;
      //half the distance from the middle to the bottom of the band
      const bb_8_2_ml = (bb_8_2_m - bb_8_2_l) / 2 + bb_8_2_l;
      const didiBBSignalBuy = currentClose >= bb_8_2_l && currentClose <= bb_8_2_ml;
      const didiBBSignalSell = currentClose <= bb_8_2_u && currentClose >= bb_8_2_mu;
      const didiTrixSignalBuy = trix_9.current > 0;
      const didiTrixSignalSell = trix_9.current < 0;
      const didiStochSignalBuy = stochastic_8_3.current.k < 30;
      const didiStochSignalSell = stochastic_8_3.current.k > 70;
      const didiAdxSignalBuy = adx_8.current.adx > 25;
      const didiAdxSignalSell = adx_8.current.adx < 25;
      const didiBuyHints = didiBBSignalBuy == true || didiTrixSignalBuy == true
        || didiStochSignalBuy == true || didiAdxSignalBuy == true;
      const didiSellHints = didiBBSignalSell == true || didiTrixSignalSell == true
        || didiStochSignalSell == true || didiAdxSignalSell == true;

      let msgDidiBuyHints = `(bb: ${didiBBSignalBuy}, trix: ${didiTrixSignalBuy},`
      msgDidiBuyHints += ` stochastic: ${didiStochSignalBuy}, adx: ${didiAdxSignalBuy})`
      let msgDidiSellHints = `(bb: ${didiBBSignalSell}, trix: ${didiTrixSignalSell},`
      msgDidiSellHints += ` stochastic: ${didiStochSignalSell}, adx: ${didiAdxSignalSell})`

      const aMsgDidiBuyHints = []
      didiBBSignalBuy ? aMsgDidiBuyHints.push('bb') : undefined
      didiTrixSignalBuy ? aMsgDidiBuyHints.push('trix') : undefined
      didiStochSignalBuy ? aMsgDidiBuyHints.push('stoch') : undefined
      didiAdxSignalBuy ? aMsgDidiBuyHints.push('adx') : undefined
      const aMsgDidiSellHints = []
      didiBBSignalSell ? aMsgDidiSellHints.push('bb') : undefined
      didiTrixSignalSell ? aMsgDidiSellHints.push('trix') : undefined
      didiStochSignalSell ? aMsgDidiSellHints.push('stoch') : undefined
      didiAdxSignalSell ? aMsgDidiSellHints.push('adx') : undefined

      if (didiHighNeedle == true && didiBuyHints == true) {
        messages.push(`${getGraphicLink(symbol, interval)} with HIGH NEEDLE (conf by ${aMsgDidiBuyHints})`)
      } else if (didiLowNeedle == true && didiSellHints == true) {
        messages.push(`${getGraphicLink(symbol, interval)} with LOW NEEDLE (conf by ${aMsgDidiSellHints})`)
      }

      if (messages.length > 0) {
        messages.forEach(message => alertSignal.addAlert({ msgTitle, symbol, interval, message }))
      }
    }

  }

}

//Verifica se tem alertas a cada X Segundos e envia pelo Telegram
setInterval(async () => {
  alertSignal.sendTelegramMessage();
  if (telegramMessages.MESSAGES.length > 0) {
    await telegramMessages.sendMessagesTelegram();
  }
}, SEND_ALERT_INTERVAL * 1000)

async function startMonitor(exchange, symbol, interval, isFuture = false) {
  return await exchange.chartStream(symbol, interval, doProcess, isFuture);
}

function updateTicker24h(mkt) {
  if (mkt.eventType === '24hrTicker') {
    const obj = {
      symbol: mkt.symbol,
      eventTime: mkt.eventTime,
      priceChange: formatNumber(mkt.priceChange),
      percentChange: formatNumber(mkt.percentChange),
      averagePrice: formatNumber(mkt.averagePrice),
      quoteVolume: formatNumber(mkt.quoteVolume),
      numTrades: mkt.numTrades
    }
    ticker24h[mkt.symbol] = obj;
    //console.log(obj);
  }
  //console.log(mkt);
}

async function startMonitorTicker(exchange) {
  exchange.tickerStream((markets) => {
    markets.map(mkt => updateTicker24h(mkt));
    //console.log('ticker24h', ticker24h);
  })
}

module.exports = { startMonitor, startMonitorTicker }