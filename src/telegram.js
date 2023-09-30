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
    this.bot = new Telegraf(BOT_TOKEN, { polling: false });
    this.MESSAGES = []
  }

  addMessage(message) {
    this.MESSAGES.push(message);
    //console.log('-----------------addMessage\n', message, '\n--------------------------------')
    //console.log('\nthis.MESSAGES', this.MESSAGES, '\n---------------------\n')
  }

  async sendMessagesTelegram(parse_mode = 'html', disable_web_page_preview = true) {
    const messages = [...this.MESSAGES]
    //console.log('\n\nthis.MESSAGES', this.MESSAGES, '\n\n')
    //messages.forEach(m => console.log('sendMessagesTelegram', m))
    //Group Messages to improve send limit (TelegramError: 429: Too Many Requests: retry after 5)
    const slicedMessages = getSlicedMessages([...this.MESSAGES])
    //console.log('\n\n********************\n', slicedMessages, '\n\n*************')
    slicedMessages
      .forEach(async message => {
        await new Promise(r => setTimeout(r, 4000));
        //console.log('-----m', message, CHAT_ID, '-------m')
        await this.bot.telegram
          .sendMessage(
            CHAT_ID,
            message,
            { parse_mode, disable_web_page_preview })
      });

    this.MESSAGES = getDifference(this.MESSAGES, messages)
  }

}

//The maximum limit of a message is 4096 characters.
function getSlicedMessages(messages) {
  const max_size = 4096
  const slicedMessage = [];
  let msg = ''
  messages.forEach(m => {
    //console.log('message', m)
    if (msg.length + m.length < max_size)
      msg += `${m}\n`
    else {
      slicedMessage.push(msg);
      msg = `${m}\n`;
    }
  })

  if (msg.length > 1)
    slicedMessage.push(msg);
  return slicedMessage;
}

