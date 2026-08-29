const https = require('https');

https.get('https://lexfive.netlify.app/sistema/index.html', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const match = data.match(/src="(\/assets\/sistema_index-[^"]+\.js)"/);
    if (match) {
      https.get('https://lexfive.netlify.app' + match[1], (resJs) => {
        let jsData = '';
        resJs.on('data', chunk => jsData += chunk);
        resJs.on('end', () => {
          console.log(jsData.includes('Adjuntar') ? 'JS UPDATED' : 'JS NOT UPDATED');
        });
      });
    } else {
      console.log('NO JS LINK');
    }
  });
});
