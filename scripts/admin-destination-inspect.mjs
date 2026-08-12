import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const page = browser.contexts()[0].pages()[0];
await page.goto('https://goldfinch.makutano.co.tz/admin/destinations', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
console.log((await page.locator('body').innerText()).slice(-16000));
console.log(await page.locator('input, textarea, select, [contenteditable="true"]').evaluateAll((fields) => fields.map((field) => ({ tag: field.tagName, type: field.type, name: field.name, value: field.value ?? field.innerText, placeholder: field.placeholder, checked: field.checked, aria: field.getAttribute('aria-label') }))));
console.log(await page.locator('button').evaluateAll((buttons) => buttons.map((button) => button.innerText.trim()).filter(Boolean)));
await browser.close();
