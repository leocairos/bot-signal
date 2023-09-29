const { RSI, MFI, EMA, bollingerBands, TRIX, Stochastic, ADX } = require("./indicators")
const { formatNumber, compactNumber, getGraphicLink } = require("./util");
const TelegramMessage = require("./telegram");

const MINIMUM_QUOTE_VOLUME_ALERT = parseFloat(process.env.MINIMUM_QUOTE_VOLUME_ALERT) || 0;
const MINIMUM_PERCENT_CHANGE_ALERT = parseFloat(process.env.MINIMUM_PERCENT_CHANGE_ALERT) || 0;

const RSI_LIMITS = process.env.RSI_LIMITS ? process.env.RSI_LIMITS.split(',') : [30, 70];
const MFI_LIMITS = process.env.MFI_LIMITS ? process.env.MFI_LIMITS.split(',') : [20, 80];

let ticker24h = {}

const telegramMessages = new TelegramMessage();

function isCalculated(indicator) {
  const isNumber = typeof indicator.current === "number";
  const isNumberPrevious = typeof indicator.previous === "number";
  return isNumber && isNumberPrevious;
}

const doProcess = (cmcInfo, symbol, interval, ohlc) => {
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
    const isQuoteAlert = quoteVolume >= MINIMUM_QUOTE_VOLUME_ALERT;
    const isPercentAlert = Math.abs(percentChange) >= MINIMUM_PERCENT_CHANGE_ALERT;

    //console.log(symbol, interval, rsi.current, isQuoteAlert, isPercentAlert)
    //Críterios comum para ativação de avaliação de estratégia
    if ((isQuoteAlert && isPercentAlert)) {
      console.log(`Ready to evaluate ${symbol}_${interval} U$ ${formatNumber(currentClose)} `,
        `rsi: ${formatNumber(rsi.current)} ema9: ${formatNumber(ema9.current)}`);

      let msgTitle = `<b>${(cmcInfo.getSymbolLink(symbol)).upper()} $${formatNumber(currentClose)}`
      msgTitle += ` Price Change 24h: ${percentChange.toFixed(2)}% Vol 24h: ${compactNumber(quoteVolume)}</b>`
      let msgBody = ''

      //Estratégia 01 - Only for example
      if (currentClose < ema9.current) {
        // const msg = `${symbol}_${interval} last close lower than ema9 (${formatNumber(currentClose)} lower than ${formatNumber(ema9.current)})`
        // telegramMessages.addMessage(htmlAlertFormatted(symbol, interval, currentClose, msg));
        msgBody += `\n ${getGraphicLink(symbol, interval)} last close lower than ema9 (${formatNumber(currentClose)} lower than ${formatNumber(ema9.current)})`
      } else if (currentClose > ema9.current) {
        msgBody += `\n ${getGraphicLink(symbol, interval)} last close upper than ema9 (${formatNumber(currentClose)} upper than ${formatNumber(ema9.current)})`
      }

      //Estratégia 02 (By Ricardo) compra quando sobe 1% e venda quando cai 1%
      const lastClose = ohlc.close[ohlc.close.length - 1]
      const previousClose = ohlc.close[ohlc.close.length - 2]
      const profit = ((lastClose / previousClose) - 1) * 100;
      if (profit >= 1 || profit <= -1) {
        // const msg = `${symbol} changing ${profit.toFixed(2)}% ${interval} chart time`
        // telegramMessages.addMessage(htmlAlertFormatted(symbol, interval, currentClose, msg));
        msgBody += `\n ${getGraphicLink(symbol, interval)} changing ${profit.toFixed(2)}% ${interval} chart time`
      }

      //Estratégia 03 - Galileia By H7
      const currentClose03 = ohlc.close[ohlc.close.length - 1]
      const previousClose03 = ohlc.close[ohlc.close.length - 2]
      const isLongGalileia = (currentClose03 > ema9.current) && (previousClose03 < ema9.current);
      const isShortGalileia = (currentClose03 < ema9.current) && (previousClose03 > ema9.current);
      if (isLongGalileia == true) {
        // const msg = `${symbol} ${interval} possible LONG by Galileia (EMA9: ${formatNumber(ema9.current)})`;
        // telegramMessages.addMessage(htmlAlertFormatted(symbol, interval, currentClose, msg));
        msgBody += `\n ${getGraphicLink(symbol, interval)} possible LONG by Galileia (EMA9: ${formatNumber(ema9.current)})`
      } else if (isShortGalileia == true) {
        // const msg = `${symbol} ${interval} possible SHORT by Galileia (EMA9: ${formatNumber(ema9.current)})`;
        // telegramMessages.addMessage(htmlAlertFormatted(symbol, interval, currentClose, msg));
        msgBody += `\n ${getGraphicLink(symbol, interval)} possible SHORT by Galileia (EMA9: ${formatNumber(ema9.current)})`
      }

      //Estratégia 04 - Scalp Agiota by H7
      const overSold = (rsi.current <= RSI_LIMITS[0] && mfi.current <= MFI_LIMITS[0])
      const overBought = (rsi.current >= RSI_LIMITS[1] && mfi.current >= MFI_LIMITS[1])
      if (overSold == true) {
        // const msg = `${symbol} ${interval} is OVERSOLD (RSI: ${rsi.current}, MFI: ${mfi.current})`;
        // telegramMessages.addMessage(htmlAlertFormatted(symbol, interval, currentClose, msg));
        msgBody += `\n ${getGraphicLink(symbol, interval)} is OVERSOLD (RSI: ${rsi.current}, MFI: ${mfi.current})`
      } else if (overBought == true) {
        //const msg = `${symbol} ${interval} is OVERBOUGHT (RSI: ${rsi.current}, MFI: ${mfi.current})`;
        //telegramMessages.addMessage(htmlAlertFormatted(symbol, interval, currentClose, msg));
        msgBody += `\n ${getGraphicLink(symbol, interval)} is OVERBOUGHT (RSI: ${rsi.current}, MFI: ${mfi.current})`
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
      let msgDidiBuyHints = `(BB: ${didiBBSignalBuy}, trix: ${didiTrixSignalBuy},`
      msgDidiBuyHints += ` stochastic: ${didiStochSignalBuy}, adx: ${didiAdxSignalBuy})`
      let msgDidiSellHints = `(BB: ${didiBBSignalSell}, trix: ${didiTrixSignalSell},`
      msgDidiSellHints += ` stochastic: ${didiStochSignalSell}, adx: ${didiAdxSignalSell})`
      if (didiHighNeedle == true && didiBuyHints == true) {
        //const msg = `${symbol} ${interval} with High Needle ${msgDidiBuyHints}`;
        //telegramMessages.addMessage(htmlAlertFormatted(symbol, interval, currentClose, msg));
        msgBody += `\n ${getGraphicLink(symbol, interval)} with High Needle ${msgDidiBuyHints}`
      } else if (didiLowNeedle == true && didiSellHints == true) {
        //const msg = `${symbol} ${interval} with Low Needle ${msgDidiSellHints}`;
        //telegramMessages.addMessage(htmlAlertFormatted(symbol, interval, currentClose, msg));
        msgBody += `\n ${getGraphicLink(symbol, interval)} with Low Needle ${msgDidiSellHints}`
      }

      //console.log(msgBody)
      if (msgBody.trim().length > 0)
        telegramMessages.addMessage(`${msgTitle}${msgBody}`);
    }

  }

}

//Verifica se tem alertas a cada X Segundos e envia pelo Telegram
setInterval(async () => {
  console.log(`Processing alerts queue for Telegram: ${telegramMessages.MESSAGES.length} alert(s)...`)
  if (telegramMessages.MESSAGES.length > 0) {
    //console.log(`   ${telegramMessages.MESSAGES}`)
    await telegramMessages.sendMessagesTelegram();
  }
}, 15 * 1000)

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