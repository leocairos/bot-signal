const Binance = require('node-binance-api');

module.exports = class Exchange {

    constructor() {
        this.binance = new Binance().options({
            recvWindow: 60000,
            family: 0,
            urls: {
                base: "https://api.binance.com/api/",
                stream: "wss://stream.binance.com:9443/ws/",
            },
        });
    }

    exchangeInfo() {
        return this.binance.exchangeInfo();
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

            if ((!process.env.INCOMPLETE_CANDLES || process.env.INCOMPLETE_CANDLES === 'false')
                && isIncomplete) {
                return;
            }

            const ohlc = this.binance.ohlc(chart);
            ohlc.isComplete = !isIncomplete;
            callback(ohlc);
        });
        console.log(`Chart Stream connected at ${streamUrl}`);
    }

    terminateChartStream(symbol, interval) {
        this.binance.websockets.terminate(`${symbol.toLowerCase()}@kline_${interval}`);
        console.log(`Chart Stream ${symbol.toLowerCase()}@kline_${interval} terminated!`);
    }

}