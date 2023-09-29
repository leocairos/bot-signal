const { RSI, MFI, EMA } = require("./indicators")
const { formatNumber, htmlAlertFormatted } = require("./util");
const TelegramMessage = require("./telegram");

const telegramMessages = new TelegramMessage();

module.exports = class Exchange {

  constructor(timesFrame, indexes, condition) {
    this.timesFrame = timesFrame; // ["15m","1h",]
    this.indexes = indexes;
    const ids = [
      { name: "currentClose", value: "ohlc.close[ohlc.close.length - 1]" },
      { name: "previousClose", value: "ohlc.close[ohlc.close.length - 2]" },
      { name: "ema9", value: "EMA(ohlc.close, 9)" },
      { name: "ema9", value: "EMA(ohlc.close, 9)" },
    ]
    this.condition = condition;
    const cond = {
      buy: "(currentClose03 > ema9.current) && (previousClose03 < ema9.current)",
      sell: "(currentClose03 < ema9.current) && (previousClose03 > ema9.current)"
    }
  }

  static isCalculated(indicator) {
    const isNumber = typeof indicator.current === "number";
    const isNumberPrevious = typeof indicator.previous === "number";
    return isNumber && isNumberPrevious;
  }

  onChartMessage(symbol, interval, ohlc) {
    const ema3 = EMA(ohlc.close, 3)
    const ema9 = EMA(ohlc.close, 9)
    //Ensures that there is already data for calculating indicators
    const isOkToProcess = isCalculated(ema3);

    if (isOkToProcess) {
      const currentClose = ohlc.close[ohlc.close.length - 1]
      console.log(`Ready to evaluate ${symbol}_${interval} U$ ${formatNumber(currentClose)}`);

      //Estratégia 03 - Galileia By H7
      const currentClose03 = ohlc.close[ohlc.close.length - 1]
      const previousClose03 = ohlc.close[ohlc.close.length - 2]
      const isLongGalileia = (currentClose03 > ema9.current) && (previousClose03 < ema9.current);
      const isShortGalileia = (currentClose03 < ema9.current) && (previousClose03 > ema9.current);
      if (isLongGalileia == true) {
        const msg = `${symbol} ${interval} possible LONG by Galileia (EMA9: ${formatNumber(ema9.current)})`;
        telegramMessages.addMessage(htmlAlertFormatted(symbol, interval, currentClose, msg));
      } else if (isShortGalileia == true) {
        const msg = `${symbol} ${interval} possible SHORT by Galileia (EMA9: ${formatNumber(ema9.current)})`;
        telegramMessages.addMessage(htmlAlertFormatted(symbol, interval, currentClose, msg));
      }

    }
  }

}