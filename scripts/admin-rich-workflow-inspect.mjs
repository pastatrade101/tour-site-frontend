import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const page = browser.contexts()[0].pages()[0];
page.setDefaultTimeout(15000);

async function dump(label) {
  console.log(`\n=== ${label} ===`);
  console.log((await page.locator('body').innerText()).slice(-12000));
  console.log('FIELDS', await page.locator('input, textarea, select, [contenteditable="true"]').evaluateAll((fields) => fields.map((f) => ({ tag:f.tagName,type:f.type,name:f.name,value:f.value??f.innerText,placeholder:f.placeholder,aria:f.getAttribute('aria-label'),checked:f.checked }))));
  console.log('BUTTONS', await page.locator('button').evaluateAll((buttons) => buttons.map((b) => b.innerText.trim()).filter(Boolean).slice(-80)));
}

await page.goto('https://goldfinch.makutano.co.tz/admin/travel-styles', { waitUntil:'networkidle' });
await page.getByRole('button', { name:'Edit', exact:true }).first().click();
await dump('TRAVEL STYLE EDIT');
await page.getByRole('button', { name:'Cancel', exact:true }).last().click();

await page.goto('https://goldfinch.makutano.co.tz/admin/activities', { waitUntil:'networkidle' });
await page.getByRole('button', { name:'Edit', exact:true }).first().click();
await dump('ACTIVITY EDIT');
await page.getByRole('button', { name:'Cancel', exact:true }).last().click();

await page.goto('https://goldfinch.makutano.co.tz/admin/lodges', { waitUntil:'networkidle' });
await page.getByRole('button', { name:'Edit', exact:true }).first().click();
await dump('LODGE EDIT');
await page.getByRole('button', { name:'Cancel', exact:true }).last().click();

await page.goto('https://goldfinch.makutano.co.tz/admin/pricing-options', { waitUntil:'networkidle' });
const tourSelect = page.locator('select[name="tour_id"]');
await tourSelect.selectOption({ index:1 });
await page.waitForTimeout(800);
await dump('PRICING SELECTED');
await page.getByRole('button', { name:'Add Pricing Option', exact:true }).first().click();
await dump('PRICING ADD');
await page.getByRole('button', { name:'Cancel', exact:true }).last().click();

await page.goto('https://goldfinch.makutano.co.tz/admin/tour-details', { waitUntil:'networkidle' });
await page.locator('select[name="tour_id"]').selectOption({ index:1 });
await page.waitForTimeout(800);
await dump('TOUR DETAILS SELECTED');

await page.goto('https://goldfinch.makutano.co.tz/admin/gallery', { waitUntil:'networkidle' });
await dump('GALLERY');
await browser.close();
