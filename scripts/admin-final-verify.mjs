import { chromium } from 'playwright';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');const page=browser.contexts()[0].pages()[0];page.setDefaultTimeout(60000);
for(const [label,url] of [['DASHBOARD','https://goldfinch.makutano.co.tz/admin'],['BLOG','https://goldfinch.makutano.co.tz/admin/blog'],['GALLERY','https://goldfinch.makutano.co.tz/admin/gallery'],['PRICING','https://goldfinch.makutano.co.tz/admin/pricing-options'],['STYLES','https://goldfinch.makutano.co.tz/admin/travel-styles']]){await page.goto(url,{waitUntil:'networkidle'});console.log(`===${label}===`);console.log((await page.locator('main').innerText()).slice(0,7000));}
await page.goto('https://goldfinch.makutano.co.tz/admin',{waitUntil:'networkidle'});await browser.close();
