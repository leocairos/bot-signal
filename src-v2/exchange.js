const Binance = require('node-binance-api');

const isProductionEnv = process.env.NODE_ENV === 'production';

const QUOTES = process.env.QUOTES ? process.env.QUOTES.split(',') : ["USDT"];

let chartCount = 0;

module.exports = class Exchange {

    constructor() {
        this.binance = new Binance().options({
            recvWindow: 60000, // 60000 Set a higher recvWindow to increase response timeout
            useServerTime: true,
            //family: 0,
            verbose: false, // Add extra output when subscribing to WebSockets, etc
            log: log => {
                if (!isProductionEnv) console.warn('BINANCE-API-LOG', log)
                //console.log('BINANCE-API-LOG', log); // You can create your own logger here, or disable console output
            },
            urls: {
                base: "https://api.binance.com/api/",
                stream: "wss://stream.binance.com:9443/ws/",
                fapi: "https://fapi.binance.com/fapi/",
                fstreamSingle: "wss://stream.binancefuture.com/"
            },
        });
    }

    async exchangeInfo() {
        return await this.binance.exchangeInfo();
    }

    async getSymbols() {
        const symbols = await this.exchangeInfo();
        const filteredSymbols = [...symbols.symbols]
            .filter(s => [...QUOTES].includes(s.quoteAsset) &&
                s.status === "TRADING"
                //&& s.isSpotTradingAllowed === true
            )
            .map(s => s.symbol);
        return filteredSymbols;
    }

    async futuresExchangeInfo() {
        return await this.binance.futuresExchangeInfo();
    }

    tickerStream(callback) {
        this.binance.websockets.prevDay(null, (data, converted) => {
            callback(converted);
        }, true);
    }

    async chartStream(symbol, interval, callback, isFuture = false) {
        let streamUrl = '';
        if (!isFuture) {
            streamUrl = 'S_' + this.binance.websockets.chart(symbol, interval, (symbol, interval, chart) => {
                const tick = this.binance.last(chart);
                const isIncomplete = tick && chart[tick] && chart[tick].isFinal === false;
                if (isIncomplete) return;
                const ohlc = this.binance.ohlc(chart);
                ohlc.lastTimeStamp = parseFloat(tick);
                callback(symbol, interval, ohlc);
            });
        } else {
            streamUrl = 'F_' + await this.binance.futuresChart(symbol, interval, (symbol, interval, chart) => {
                const tick = this.binance.last(chart);
                const isIncomplete = tick && chart[tick] && chart[tick].isFinal === false;
                if (isIncomplete) return;
                const ohlc = this.binance.ohlc(chart);
                ohlc.lastTimeStamp = parseFloat(tick);
                callback(symbol, interval, ohlc);
            });
        }
        chartCount++
        //console.log(`Chart Stream connected at ${chartCount} ${streamUrl}`);
        return streamUrl;
    }

}