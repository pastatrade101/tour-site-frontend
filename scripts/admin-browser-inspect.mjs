import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const context = browser.contexts()[0];
const pages = context.pages();
if (process.argv[2]) {
  await pages[0].goto(process.argv[2], { waitUntil: 'networkidle' });
}
for (let index = 0; index < pages.length; index += 1) {
  const page = pages[index];
  console.log(`PAGE ${index}: ${page.url()} | ${await page.title()}`);
  console.log((await page.locator('body').innerText()).slice(0, 12000));
  console.log('LINKS');
  console.log(await page.locator('a').evaluateAll((links) => links.map((link) => ({ text: link.innerText.trim(), href: link.href })).filter((link) => link.text || link.href)));
  console.log('BUTTONS');
  console.log(await page.locator('button').evaluateAll((buttons) => buttons.map((button) => button.innerText.trim()).filter(Boolean)));
  console.log('FIELDS');
  console.log(await page.locator('input, textarea, select, [contenteditable="true"]').evaluateAll((fields) => fields.map((field) => ({
    tag: field.tagName,
    type: field.type,
    name: field.name,
    placeholder: field.placeholder,
    value: field.value ?? field.innerText,
    checked: field.checked,
    aria: field.getAttribute('aria-label'),
  }))));
}
await browser.close();
