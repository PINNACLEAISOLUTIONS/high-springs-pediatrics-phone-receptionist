const https = require('https');

function getUrl(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'highspringspediatricsandprimarycare.com',
      path,
      method: 'GET',
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(''));
    req.end();
  });
}

async function scrape() {
  const homeHtml = await getUrl('/home.html');
  const regex = /href=["']([^"']+\.html)["']/gi;
  let match;
  const links = new Set();
  while ((match = regex.exec(homeHtml)) !== null) {
    if (!match[1].startsWith('http')) {
      links.add('/' + match[1].replace(/^\//, ''));
    }
  }

  console.log('Found page links on website:', Array.from(links));

  for (const link of links) {
    const html = await getUrl(link);
    const cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    console.log(`\n==============================================================`);
    console.log(`PAGE: ${link}`);
    console.log(`==============================================================`);
    console.log(cleanText);
  }
}

scrape();
