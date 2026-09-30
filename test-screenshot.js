const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000); // wait for load
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
  console.log("Screenshot saved to screenshot.png");
})();
