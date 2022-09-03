

function htmlAlertFormatted(){
  /*
  <b>bold</b>, <strong>bold</strong><i>italic</i>, 
  <em>italic</em><a href="https://rdlsc.com">inline URL</a>
  <code>inline fixed-width code</code><pre>pre-formatted fixed-width code block</pre>
  */
  let html =`
  <b>YGGUSDT_15m is <u>OVERBOUGHT</u></b>

  <b>RSI: </b><i>82.01</i>           <b>MFI: </b><i>92.70</i>
  <b>EMA_14: </b> <i>0.50686488</i> <b>EMA_100: </b> <i>0.50686488</i>
  <b>EMA_200: </b> <i>0.50686488</i>
  
  <b>Open: </b> <i>0.50686488</i>   <b>High:  </b> <i>0.50686488</i>
  <b>Low:   </b> <i>0.50686488</i>   <b>Close: </b> <i>0.50686488</i>`
  return html;
}

module.exports = { htmlAlertFormatted}