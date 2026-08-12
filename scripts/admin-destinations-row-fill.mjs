import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const source = readFileSync(new URL('./admin-destinations-exact-fill.mjs', import.meta.url), 'utf8');
const data = Function(`return ${source.match(/const data=(\{[\s\S]*?\});\nconst rich=/)[1]}`)();
const rich = Function(`return ${source.match(/const rich=(\{[\s\S]*?\});\nasync function/)[1]}`)();
const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const page = browser.contexts()[0].pages()[0];
page.setDefaultTimeout(60000);

async function chooseRandom(index) {
  await page.getByRole('button', { name: 'Choose from library', exact: true }).first().click();
  const picker = page.locator('div.fixed.inset-0').last();
  await picker.locator('input[placeholder*="Search by title"]').waitFor();
  await page.waitForTimeout(3300);
  const images = picker.locator('img');
  if (await images.count() === 0) throw new Error('Media Library returned no images');
  await images.nth(index % await images.count()).locator('xpath=ancestor::button[1]').click();
  await page.waitForTimeout(350);
}

for (const [index, [name, destination]] of Object.entries(data).entries()) {
  await page.goto('https://goldfinch.makutano.co.tz/admin/destinations', { waitUntil: 'networkidle' });
  const rows = page.locator('tbody tr');
  const rowNames = await rows.evaluateAll((nodes) => nodes.map((node) => node.querySelector('td')?.innerText.split('\n')[0].trim()));
  const rowIndex = rowNames.indexOf(name);
  if (rowIndex < 0) throw new Error(`No destination row for ${name}`);
  await rows.nth(rowIndex).getByRole('button', { name: 'Edit', exact: true }).click();

  const [location, latitude, longitude, scores] = destination;
  await page.locator('[name=location]').fill(location);
  for (const [label, value] of Object.entries(rich)) await page.getByLabel(label, { exact: true }).fill(value);
  await page.locator('[name=emergency_contacts]').fill('Keep your guide, accommodation, insurer and nearest medical-facility contacts available offline. Contact your local host first so they can coordinate the fastest appropriate assistance.');
  for (const [scoreIndex, field] of ['score_wildlife', 'score_luxury', 'score_family', 'score_photography', 'score_adventure', 'score_budget_from'].entries()) {
    await page.locator(`[name=${field}]`).fill(String(scores[scoreIndex]));
  }
  await page.locator('[name=latitude]').fill(String(Math.round(latitude)));
  await page.locator('[name=longitude]').fill(String(Math.round(longitude)));
  while (await page.getByRole('button', { name: 'Choose from library', exact: true }).count()) {
    await chooseRandom(index * 7 + await page.getByRole('button', { name: 'Change', exact: true }).count());
  }
  const saved = page.waitForResponse((response) => response.request().method() === 'PUT' && response.url().includes('/api/destinations/'));
  await page.getByRole('button', { name: 'Save Changes', exact: true }).last().click();
  const response = await saved;
  if (!response.ok()) throw new Error(`Destination save failed for ${name}: HTTP ${response.status()}`);
  await page.waitForTimeout(300);
  console.log(`EXACT DESTINATION ${index + 1}/${Object.keys(data).length}: ${name}`);
}

await page.goto('https://goldfinch.makutano.co.tz/admin/destinations', { waitUntil: 'networkidle' });
await browser.close();
