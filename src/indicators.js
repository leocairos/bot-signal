const technicalIndicators = require('technicalindicators');

function MFI(ohlc, period = 14) {
    period = parseInt(period);
    if (ohlc.high.length <= period) return { current: false, previous: false };

    const mfiResult = technicalIndicators.mfi({
        high: ohlc.high,
        low: ohlc.low,
        close: ohlc.close,
        volume: ohlc.volume,
        period
    })
    return {
        current: mfiResult[mfiResult.length - 1],
        previous: mfiResult[mfiResult.length - 2]
    }
}

function RSI(closes, period = 14) {
    period = parseInt(period);
    if (closes.length <= period) return { current: false, previous: false };

    const rsiResult = technicalIndicators.rsi({
        period,
        values: closes
    })
    return {
        current: parseFloat(rsiResult[rsiResult.length - 1]),
        previous: parseFloat(rsiResult[rsiResult.length - 2]),
    }
}

function MACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    fastPeriod = parseInt(fastPeriod);
    slowPeriod = parseInt(slowPeriod);
    signalPeriod = parseInt(signalPeriod);

    if ([fastPeriod, slowPeriod, signalPeriod].some(p => p >= closes.length))
        return { current: false, previous: false };

    const macdResult = technicalIndicators.macd({
        values: closes,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
        fastPeriod,
        slowPeriod,
        signalPeriod
    });
    return {
        current: macdResult[macdResult.length - 1],
        previous: macdResult[macdResult.length - 2]
    }
}

function SMA(closes, period = 10) {
    period = parseInt(period);
    if (closes.length <= period) return { current: false, previous: false };

    const smaResult = technicalIndicators.sma({
        values: closes,
        period
    });
    return {
        current: smaResult[smaResult.length - 1],
        previous: smaResult[smaResult.length - 2],
    }
}

function EMA(closes, period = 10) {
    period = parseInt(period);
    if (closes.length <= period) return { current: false, previous: false };

    const emaResult = technicalIndicators.ema({
        values: closes,
        period
    });
    return {
        current: emaResult[emaResult.length - 1],
        previous: emaResult[emaResult.length - 2],
    }
}

module.exports = {
    MFI,
    RSI,
    MACD,
    SMA,
    EMA
}
