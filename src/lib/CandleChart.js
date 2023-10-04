const Kline = require("./Kline");

module.exports = class CandleChart {
    constructor(arr, tickSize) {
        this.klines = arr.map(k => new Kline(k));
        //smallest fraction of the coin (api/v3/exchangeInfo symbols[x].filters[PRICE_FILTER].minPrice)
        this.TICK_SIZE = tickSize;
    }

    //Max high price in the period
    highestPrice() {
        const orderedKlines = this.klines.sort((a, b) => a.high - b.high);
        return orderedKlines[orderedKlines.length - 1].high;
    }

    //Min low price in the period
    lowestPrice() {
        const orderedKlines = this.klines.sort((a, b) => a.low - b.low);
        return orderedKlines[0].low;
    }

    //midpoint
    getMedium(support, resistance) {
        if (support === undefined)
            support = this.lowestPrice();

        if (resistance === undefined)
            resistance = this.highestPrice();

        return ((resistance - support) / 2) + support;
    }

    //get tick more recurrent
    getTrendTick(grouped, total, supportOrResistance) {
        let tickArr = Object.keys(grouped).map(k => {
            return { tick: k, count: grouped[k] }
        });
        tickArr = tickArr.sort((a, b) => a.count - b.count);

        const { count } = { ...tickArr[tickArr.length - 1] };
        let ticks = tickArr.filter(t => t.count === count);
        ticks = ticks.sort((a, b) => a.tick - b.tick);

        //console.log(ticks)
        let tick = {};
        if (supportOrResistance === 'support')
            tick = ticks[0]
        if (supportOrResistance === 'resistance')
            tick = ticks[ticks.length - 1]
        return { ...tick, total };
        //return { ...tickArr[tickArr.length - 1], total };
    }

    //get qty price oscillation inside kline/candle (all prices into a candle)
    getTicks(kline, medium, supportOrResistance) {
        //price oscillation
        let priceOsc;
        if (supportOrResistance === 'resistance')
            priceOsc = kline.high - medium
        if (supportOrResistance === 'support')
            priceOsc = medium - kline.low
        //price oscillation
        priceOsc = kline.high - kline.low;
        return priceOsc * (1 / this.TICK_SIZE);
    }

    getGroupedTicks(grouped, kline, medium, supportOrResistance) {
        const ticks = this.getTicks(kline, medium, supportOrResistance);
        for (let i = 0; i < ticks; i++) {
            const tick = kline.low + (this.TICK_SIZE * i);
            if (grouped[tick])
                grouped[tick]++;
            else
                grouped[tick] = 1;
        }
        return grouped;
    }

    findSupport(medium) {
        const candles = this.klines.filter(k => k.low < medium);
        let grouped = {}; //hashmap: key => value
        candles.map(kline => grouped = this.getGroupedTicks(grouped, kline, medium, 'support'));

        return this.getTrendTick(grouped, candles.length, 'support');
    }

    findResistance(medium) {
        const candles = this.klines.filter(k => k.high > medium);
        let grouped = {};
        candles.map(kline => grouped = this.getGroupedTicks(grouped, kline, medium, 'resistance'));

        return this.getTrendTick(grouped, candles.length, 'resistance');
    }
}