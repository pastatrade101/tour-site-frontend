import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const context = browser.contexts()[0];
const page = context.pages()[0];

async function fields() {
  return page.locator('input, textarea, select, [contenteditable="true"]').evaluateAll((nodes) => nodes.map((node) => ({
    name: node.name || node.getAttribute('aria-label') || node.placeholder || '',
    type: node.type || node.tagName,
    value: node.value ?? node.innerText,
    checked: node.checked,
  })).filter((field) => field.name && field.type !== 'search' && field.type !== 'file'));
}

await page.goto('https://goldfinch.makutano.co.tz/admin/tours', { waitUntil: 'networkidle' });
const tourUrls = await page.locator('a', { hasText: 'Edit' }).evaluateAll((links) => links.map((link) => link.href));
const tourAudit = [];
for (const url of tourUrls) {
  await page.goto(url, { waitUntil: 'networkidle' });
  const formFields = await fields();
  tourAudit.push({ url, title: formFields.find((f) => f.name === 'title')?.value, blanks: formFields.filter((f) => !f.value && !['checkbox', 'hidden'].includes(f.type)).map((f) => f.name) });
}
console.log('TOURS', JSON.stringify(tourAudit, null, 2));

await page.goto('https://goldfinch.makutano.co.tz/admin/destinations', { waitUntil: 'networkidle' });
const destinationCount = await page.getByRole('button', { name: 'Edit', exact: true }).count();
const destinationAudit = [];
for (let index = 0; index < destinationCount; index += 1) {
  await page.goto('https://goldfinch.makutano.co.tz/admin/destinations', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Edit', exact: true }).nth(index).click();
  await page.waitForLoadState('networkidle');
  const formFields = await fields();
  destinationAudit.push({ url: page.url(), name: formFields.find((f) => f.name === 'name')?.value, blanks: formFields.filter((f) => !f.value && !['checkbox', 'hidden'].includes(f.type)).map((f) => f.name) });
}
console.log('DESTINATIONS', JSON.stringify(destinationAudit, null, 2));

await page.goto('https://goldfinch.makutano.co.tz/admin/itineraries', { waitUntil: 'networkidle' });
console.log('ITINERARIES_TEXT', (await page.locator('main').innerText()).slice(0, 16000));
console.log('ITINERARY_LINKS', await page.locator('a').evaluateAll((links) => links.map((link) => ({ text: link.innerText.trim(), href: link.href })).filter((link) => /edit/i.test(link.text))));
await browser.close();
