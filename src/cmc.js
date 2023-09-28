const axios = require("axios");
const { compactNumber } = require("./util");

const TOP_X_TO_FAVORITE = process.env.TOP_X_TO_FAVORITE || 20;
const CMC_PRO_API_KEY = process.env.CMC_PRO_API_KEY;

const QUOTES = process.env.QUOTES ? process.env.QUOTES.split(',') : ["USDT"];

const EXCLUDED_SYMBOLS = process.env.EXCLUDED_SYMBOLS ? process.env.EXCLUDED_SYMBOLS.split(',') : [];
const INCLUDED_SYMBOLS = process.env.INCLUDED_SYMBOLS ? process.env.INCLUDED_SYMBOLS.split(',') : [];

const MINIMUM_VOLUME_USD = process.env.MINIMUM_VOLUME_USD || 30000000; //30Mi
const MINIMUM_MARKETCAP = process.env.MINIMUM_MARKETCAP || 500000000; //500Mi

module.exports = class CMCInfo {

  constructor(logStartMsg) {
    this.logStartMsg = logStartMsg;
    this.api = axios.create({
      baseURL: 'https://pro-api.coinmarketcap.com/v1'
    });

    this.api.interceptors.request.use(async (config) => {
      config.headers['X-CMC_PRO_API_KEY'] = CMC_PRO_API_KEY
      return config;
    });
    this.cmSymbols = [undefined];
    this.selectedSymbols = undefined;
    this.filteredSymbolsWithQuote = undefined;
    this.topSymbols = [];
  }

  async isTopSymbol(symbol) {
    return this.topSymbols.includes(symbol);
  }

  async updateCmcInfo() {
    const cmcLimit = 1000
    const urlCMC = `/cryptocurrency/listings/latest?sort=market_cap&limit=${cmcLimit}`;
    const result = await this.api.get(urlCMC);
    const cmcTotalCount = result.data.status.total_count;

    const cmSymbols = result.data.data.map(item => (
      {
        id: item.id,
        name: item.name,
        slug: item.slug,
        symbol: item.symbol,
        cmc_rank: item.cmc_rank,
        usdValue: item.quote.USD.price,
        usdVolume24h: item.quote.USD.volume_24h,
        usdPercentChange24h: item.quote.USD.percent_change_24h,
        market_cap: item.quote?.USD?.market_cap,
      }
    ))

    const topXFavoriteSymbols = [...cmSymbols].filter(s => s.cmc_rank <= TOP_X_TO_FAVORITE);

    //update this.topSymbols
    for (const s of topXFavoriteSymbols) {
      for (const q of [...QUOTES]) {
        this.topSymbols.push(`${s.symbol}${q}`)
      }
    }

    const selectedSymbols = [...topXFavoriteSymbols].filter(s => !EXCLUDED_SYMBOLS.includes(s.symbol));

    [...cmSymbols].forEach(s => {
      if (INCLUDED_SYMBOLS.includes(s.symbol)) {
        if ([...selectedSymbols].findIndex(s2 => s2.symbol === s.symbol) < 0)
          selectedSymbols.push(s)
      }
    })

    const filteredSymbolsWithQuote = [];
    for (const s of selectedSymbols) {
      for (const q of [...QUOTES]) {
        if ((s.usdVolume24h >= MINIMUM_VOLUME_USD && s.market_cap >= MINIMUM_MARKETCAP)
          //|| INCLUDED_SYMBOLS.includes(s.symbol)
          //|| s.cmc_rank <= TOP_X_TO_FAVORITE
        ) {
          filteredSymbolsWithQuote.push(`${s.symbol}${q}`)
        }
      }
    }

    //console.log(cmSymbols.length, selectedSymbols.length, filteredSymbolsWithQuote.length)

    this.logStartMsg.doLogStartMsg(`\nSelected the TOP ${cmcLimit} symbols (by Marketcap) from a total of ${cmcTotalCount} in the Coinmarketcap database.`);
    this.logStartMsg.doLogStartMsg(`\nCoinMarketCap (CMC) filters: `)
    this.logStartMsg.doLogStartMsg(`  * Minimum rank position: ${TOP_X_TO_FAVORITE}º`);
    this.logStartMsg.doLogStartMsg(`  * Minimum MarketCap: ${compactNumber(parseFloat(MINIMUM_MARKETCAP))}`);
    this.logStartMsg.doLogStartMsg(`  * Minimum USD Volume (last 24h): ${compactNumber(parseFloat(MINIMUM_VOLUME_USD))}`);
    this.logStartMsg.doLogStartMsg(`  * Included ${INCLUDED_SYMBOLS.length} Symbols: ${INCLUDED_SYMBOLS.sort().toString().replace(new RegExp(',', 'g'), ', ').trim()}`);
    this.logStartMsg.doLogStartMsg(`  * Excluded ${EXCLUDED_SYMBOLS.length} Symbols: ${EXCLUDED_SYMBOLS.sort().toString().replace(new RegExp(',', 'g'), ', ').trim()}`);

    this.cmSymbols = cmSymbols;
    this.selectedSymbols = selectedSymbols;
    this.filteredSymbolsWithQuote = filteredSymbolsWithQuote;
  }

}