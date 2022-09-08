const Binance = require('node-binance-api');

module.exports = class Exchange {

    constructor() {
        this.binance = new Binance().options({
            recvWindow: 60000,
            family: 0,
            urls: {
                base: "https://api.binance.com/api/",
                stream: "wss://stream.binance.com:9443/ws/",
                fapi: "https://fapi.binance.com/fapi/",
                fstreamSingle: "wss://stream.binancefuture.com/"
            },
        });
    }

    exchangeInfo() {
        return this.binance.exchangeInfo();
    }

    futuresExchangeInfo() {
        return this.binance.futuresExchangeInfo();
    }

    async candles(symbol, interval) {
        const binance = new Binance().options({
            family: 0
        });
        
        const candles = await binance.candlesticks(symbol, interval, false)

        const ohlc = { open: [], close: [], high: [], low: [], volume: [], time: [] };

        candles.forEach(candle => {
            let [openTime, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = candle;
            ohlc.open.push(parseFloat(open));
            ohlc.close.push(parseFloat(close));
            ohlc.high.push(parseFloat(high));
            ohlc.low.push(parseFloat(low));
            ohlc.volume.push(parseFloat(volume));
            ohlc.time.push(closeTime);
        })
        return ohlc;
    }

    chartStream(symbol, interval, callback) {
        const streamUrl = this.binance.websockets.chart(symbol, interval, (symbol, interval, chart) => {
            const tick = this.binance.last(chart);
            const isIncomplete = tick && chart[tick] && chart[tick].isFinal === false;
            if (isIncomplete) return;
            const ohlc = this.binance.ohlc(chart);
            ohlc.lastTimeStamp = parseFloat(tick);
            callback(ohlc);
        });
        console.log(`Chart Stream connected at ${streamUrl}`);
    }

    async futuresChartStream(symbol, interval, callback) {
        const streamUrl = await this.binance.futuresChart(symbol, interval, (symbol, interval, chart) => {
            const tick = this.binance.last(chart);
            const isIncomplete = tick && chart[tick] && chart[tick].isFinal === false;
            if (isIncomplete) return;
            const ohlc = this.binance.ohlc(chart);
            callback(ohlc);
        });
        console.log(`Chart Stream connected at ${streamUrl}`);
    }

    terminateChartStream(symbol, interval) {
        this.binance.websockets.terminate(`${symbol.toLowerCase()}@kline_${interval}`);
        console.log(`Chart Stream ${symbol.toLowerCase()}@kline_${interval} terminated!`);
    }

}