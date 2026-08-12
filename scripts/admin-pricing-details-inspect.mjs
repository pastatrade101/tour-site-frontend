import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const page = browser.contexts()[0].pages()[0];
page.setDefaultTimeout(15000);
const dump = async (label) => {
 console.log(`===${label}===`);
 console.log((await page.locator('body').innerText()).slice(-10000));
 console.log(await page.locator('input,textarea,select,[contenteditable="true"]').evaluateAll(fs=>fs.map(f=>({name:f.name,aria:f.getAttribute('aria-label'),type:f.type,value:f.value??f.innerText,placeholder:f.placeholder,checked:f.checked}))));
 console.log(await page.locator('button').evaluateAll(bs=>bs.map(b=>b.innerText.trim()).filter(Boolean).slice(-80)));
};
await page.goto('https://goldfinch.makutano.co.tz/admin/pricing-options',{waitUntil:'networkidle'});
await page.locator('select[name="tour_id"]').selectOption({index:1}); await page.waitForTimeout(700);
await page.getByRole('button',{name:'Add Pricing Option',exact:true}).first().click(); await dump('PRICING FORM');
await page.getByRole('button',{name:'Cancel',exact:true}).last().click();
await page.goto('https://goldfinch.makutano.co.tz/admin/tour-details',{waitUntil:'networkidle'});
await page.locator('select[name="tour_id"]').selectOption({index:1}); await page.waitForTimeout(700); await dump('DETAILS');
await page.goto('https://goldfinch.makutano.co.tz/admin/gallery',{waitUntil:'networkidle'}); await dump('GALLERY');
await browser.close();
