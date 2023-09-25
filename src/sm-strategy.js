const Binance = require("node-binance-api");

const isProductionEnv = process.env.NODE_ENV === 'production';

// |||||||||| CONFIGURAÇÃO DE INTERVALO DE VELA E PAR DE MOEDA |||||||||||||||||||||||
var intervalo = "15m";
var par = "BTCUSDT";

const binance = new Binance().options({
  APIKEY: 'YOUR_API_KEY',
  APISECRET: 'YOUR_API_SECRET',
  recvWindow: 60000, // 60000 Set a higher recvWindow to increase response timeout
  useServerTime: true,
  //family: 0,
  verbose: false, // Add extra output when subscribing to WebSockets, etc
  log: log => {
    if (!isProductionEnv) console.log('BINANCE-API-LOG', log)
    //console.log('BINANCE-API-LOG', log); // You can create your own logger here, or disable console output
  },
  urls: {
    base: "https://api.binance.com/api/",
    stream: "wss://stream.binance.com:9443/ws/",
    fapi: "https://fapi.binance.com/fapi/",
    fstreamSingle: "wss://stream.binancefuture.com/"
  },
});

binance.futuresChart(par, intervalo, (symbol, interval, chart) => {
  const ohlc = binance.ohlc(chart);
  const volumes = ohlc.volume;

  // CONVERTENDO OS DADOS DAS VELAS OHLC PARA HEIKIN-ASHI
  const closes = ohlc.close;
  const opens = ohlc.open;
  const highs = ohlc.high;
  const lows = ohlc.low;
  const heikinAshiCloses = [];
  const heikinAshiOpens = [];
  const heikinAshiHighs = [];
  const heikinAshiLows = [];

  for (let i = 0; i < closes.length; i++) {
    const haClose = (opens[i] + highs[i] + lows[i] + closes[i]) / 4;
    heikinAshiCloses.push(haClose);
  }

  for (let i = 0; i < opens.length; i++) {
    if (i === 0) {
      heikinAshiOpens.push(opens[i]);
    } else {
      const haOpen = (heikinAshiOpens[i - 1] + heikinAshiCloses[i - 1]) / 2;
      heikinAshiOpens.push(haOpen);
    }
  }

  for (let i = 0; i < highs.length; i++) {
    const haHigh = Math.max(highs[i], heikinAshiOpens[i], heikinAshiCloses[i]);
    heikinAshiHighs.push(haHigh);
  }

  for (let i = 0; i < lows.length; i++) {
    const haLow = Math.min(lows[i], heikinAshiOpens[i], heikinAshiCloses[i]);
    heikinAshiLows.push(haLow);
  }

  //A PARTIR DAQUI, PEGAMOS ALGUMAS VELAS PARA CRIAR A ESTRATEGIA

  // Pegando dados da vela Atual (0)
  const haClose = heikinAshiCloses[heikinAshiCloses.length];

  // Pegando Dados da Vela anterior (-2)
  const haOpen2 = heikinAshiOpens[heikinAshiOpens.length - 2];
  const haClose2 = heikinAshiCloses[heikinAshiCloses.length - 2];

  // Pegando Dados da Vela anterior (-3)
  const haOpen3 = heikinAshiOpens[heikinAshiOpens.length - 3];
  const haClose3 = heikinAshiCloses[heikinAshiCloses.length - 3];

  // Pegando Dados da Vela anterior (-4)
  const haOpen4 = heikinAshiOpens[heikinAshiOpens.length - 4];
  const haClose4 = heikinAshiCloses[heikinAshiCloses.length - 4];

  // Pegando Dados da Vela anterior (-5)
  const haOpen5 = heikinAshiOpens[heikinAshiOpens.length - 5];
  const haClose5 = heikinAshiCloses[heikinAshiCloses.length - 5];

  // A PARTIR DAQUI, PEGAMOS DADOS DE VOLUMES FINANCEIRO PARA CONFIRMAÇÃO DE ENTRADA  
  const volume2 = volumes[volumes.length - 2];
  const volume3 = volumes[volumes.length - 3];

  verificar(haClose, haClose5, haOpen5, haClose4, haOpen4, haClose3, haOpen3, haClose2, haOpen2, volume2, volume3);

});

//AQUI FICA A FUNÇÃO DE COMPRA
function comprar(haClose) {
  console.log('Comprar a', haClose)
}

//FUNÇÃO PARA VERIFICAR ESTRATEGIA
function verificar(haClose, haClose5, haOpen5, haClose4, haOpen4, haClose3, haOpen3, haClose2, haOpen2, volume2, volume3) {
  strategy = haClose5 < haOpen5 && haClose4 <= haOpen4 && haClose3 <= haOpen3 && haClose2 > haOpen2 && volume2 > volume3;
  if (strategy === true) {
    comprar(haClose);
  } else {
    console.log(strategy, "Sem sinal de entrada")
  }
}
