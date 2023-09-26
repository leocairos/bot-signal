const { Telegraf } = require('telegraf')

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

function getDifference(array1, array2) {
  return array1.filter(object1 => {
    return !array2.some(object2 => object1 === object2);
  });
}

module.exports = class TelegramMessage {

  constructor() {
    this.bot = new Telegraf(BOT_TOKEN, { polling: true });
    this.MESSAGES = []
  }

  addMessage(message) {
    this.MESSAGES.push(message);
  }

  sendMessagesTelegram(parse_mode = 'html', disable_web_page_preview = true) {
    const messages = [...this.MESSAGES]
    //ToDo Group Messages to improve send limit (TelegramError: 429: Too Many Requests: retry after 5)
    messages
      .forEach(async message => {
        await new Promise(r => setTimeout(r, 2000));
        this.bot.telegram
          .sendMessage(
            CHAT_ID,
            message,
            { parse_mode, disable_web_page_preview })
      });

    this.MESSAGES = getDifference(this.MESSAGES, messages)
  }

}
