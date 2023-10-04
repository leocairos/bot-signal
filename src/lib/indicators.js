const technicalIndicators = require('technicalindicators');

function fibonacciRetracement(close, uptrend = 0.10, downtrend = 0.10) {
    // ToDo: Improve this logic
    const fibResultUp = technicalIndicators.fibonacciretracement(
        close, close * (1 + uptrend)
    )
    const fibResultDown = technicalIndicators.fibonacciretracement(
        close, close * (1 - downtrend)
    )
    return {
        current: fibResultUp,
        previous: fibResultDown
    }
}

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

function bollingerBands(closes, period = 20, stdDev = 2) {
    period = parseInt(period);
    stdDev = parseInt(stdDev);

    if (closes.length <= period) return { current: false, previous: false };

    const bbResult = technicalIndicators.bollingerbands({
        period,
        stdDev,
        values: closes
    })
    return {
        current: bbResult[bbResult.length - 1],
        previous: bbResult[bbResult.length - 2]
    }
}

function TRIX(closes, period = 18) {
    period = parseInt(period);
    if (closes.length <= period) return { current: false, previous: false };

    const trixResult = technicalIndicators.trix({
        period,
        values: closes
    })
    return {
        current: trixResult[trixResult.length - 1],
        previous: trixResult[trixResult.length - 2]
    }
}

function Stochastic(ohlc, period = 14, signalPeriod = 3) {
    period = parseInt(period);
    signalPeriod = parseInt(signalPeriod);
    if (ohlc.high.length <= period || ohlc.high.length <= signalPeriod)
        return { current: false, previous: false };

    const stochResult = technicalIndicators.stochastic({
        high: ohlc.high,
        low: ohlc.low,
        close: ohlc.close,
        period,
        signalPeriod
    })
    return {
        current: stochResult[stochResult.length - 1],
        previous: stochResult[stochResult.length - 2]
    }
}

function ADX(ohlc, period = 14) {
    period = parseInt(period);
    if (ohlc.high.length <= period) return { current: false, previous: false };

    const adxResult = technicalIndicators.adx({
        high: ohlc.high,
        low: ohlc.low,
        close: ohlc.close,
        period
    })
    return {
        current: adxResult[adxResult.length - 1],
        previous: adxResult[adxResult.length - 2]
    }
}

module.exports = {
    fibonacciRetracement,
    MFI,
    RSI,
    MACD,
    SMA,
    EMA,
    bollingerBands,
    TRIX,
    Stochastic,
    ADX
}
