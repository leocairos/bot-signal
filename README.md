# Bot Crypto Signal

A Bot Crypto to send Signal for your Telegram chat.

This Bot connect in Binance Api and monitoring Candles by Stream.

**Requires:**
  * NodeJS v14.16.0+

<br/>

## 🚀 How to execute

* Clone this repository
* Access the folder
* Create a .env file (use .env.example to help)
* Install dependencies
  ```bash
  npm install
  ```
* Run project 
  ```bash
  npm run dev
  ```

<br/>

## 📆 Roadmap

- [X] Connect to Binance Spot API
  - [X] Rest
  - [X] Websocket
- [ ] Monitoring All available Symbols by Quote
  - [X] Spot
  - [ ] Futures
- [ ] Available Indicators
  - [X] RSI
  - [X] MFI
  - [ ] MACD
  - [ ] SMA
  - [X] EMA
- [ ] Send formatted Telegram message
- [X] Check invert conditions to reduce redundant alerts
- [ ] Connect to Binance Futures API
  - [ ] Rest
  - [ ] Websocket

<br/>

## 📄 License

Code released under the [MIT License](./LICENSE).

Make by [Leonardo Cairo](https://www.linkedin.com/in/leocairos/)!
