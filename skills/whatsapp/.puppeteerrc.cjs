// The skill drives the system Chrome (WA_CHROME_PATH), so puppeteer must never
// download a browser of its own.
module.exports = { skipDownload: true };
