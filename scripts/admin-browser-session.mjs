import { chromium } from 'playwright';

const profileDir = '/tmp/goldfinch-admin-playwright-profile';
const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  viewport: null,
  args: ['--start-maximized', '--remote-debugging-port=9223'],
});

const pages = context.pages();
const page = pages[0] ?? await context.newPage();
await page.goto('https://goldfinch.makutano.co.tz/admin', {
  waitUntil: 'domcontentloaded',
});

console.log('READY', page.url());
await new Promise((resolve) => context.once('close', resolve));
