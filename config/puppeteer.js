// https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions
const puppeteerConfig = {
  ignoreHTTPSErrors: true,
  headless: true,
  handleSIGINT: true,
  timeout: 30000,
  dumpio: !!process.env.NEST_DUMP_BROWSER_IO_TO_STD_OUT,

  // HACK(@d-oliveros): remove when sandbox is no longer necessary - https://bugs.chromium.org/p/chromium/issues/detail?id=598454
  // http://peter.sh/experiments/chromium-command-line-switches/
  args: [
    // https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#chrome-headless-fails-due-to-sandbox-issues
    '--no-sandbox',
    '--disable-setuid-sandbox',
  ],
};

module.exports = puppeteerConfig;
