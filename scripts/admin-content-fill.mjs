import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const page = browser.contexts()[0].pages()[0];
page.setDefaultTimeout(15000);

async function saveAndWait(buttonName = 'Save Changes') {
  await page.getByRole('button', { name: buttonName, exact: true }).last().click();
  await page.waitForTimeout(900);
}

await page.goto('https://goldfinch.makutano.co.tz/admin/tours', { waitUntil: 'networkidle' });
const tourUrls = await page.locator('a', { hasText: 'Edit' }).evaluateAll((links) => links.map((link) => link.href));
for (const [index, url] of tourUrls.entries()) {
  await page.goto(url, { waitUntil: 'networkidle' });
  const title = await page.locator('[name="title"]').inputValue();
  const specialist = page.locator('[name="specialist_id"]');
  if (await specialist.inputValue() === '') await specialist.selectOption({ index: 1 });
  const minimumAge = page.locator('[name="minimum_age"]');
  if (await minimumAge.inputValue() === '') await minimumAge.fill(title.includes('Kilimanjaro') ? '10' : '6');
  const customizationIntro = page.locator('[name="customization_intro"]');
  if (await customizationIntro.inputValue() === '') {
    await customizationIntro.fill('This private itinerary can be tailored to your travel dates, preferred pace, accommodation style, dietary needs and special interests. Ask our Tanzania specialist to adjust transfers, activities and room arrangements before booking.');
  }
  const customizationOption = page.locator('[name="customization_option_0"]');
  if (await customizationOption.inputValue() === '') {
    await customizationOption.fill(title.toLowerCase().includes('zanzibar') || title.toLowerCase().includes('beach')
      ? 'Adjust the balance of safari, beach time and optional Zanzibar activities'
      : 'Upgrade accommodation and add private activities or extra safari nights');
  }
  await saveAndWait();
  console.log(`TOUR ${index + 1}/${tourUrls.length}: ${title}`);
}

const destinations = {
  'Zanzibar': ['Zanzibar Archipelago, Indian Ocean', -6.1357, 39.3621, [3, 9, 9, 8, 7, 900]],
  'Western Serengeti': ['Western Corridor, Serengeti ecosystem', -2.25, 34.2, [10, 8, 7, 10, 8, 1100]],
  'Tarangire National Park': ['Manyara Region, Northern Tanzania', -3.8333, 36.0, [9, 8, 9, 9, 7, 750]],
  'Stone Town': ['Zanzibar City, Unguja', -6.1622, 39.1921, [2, 8, 8, 9, 6, 500]],
  'Serengeti National Park': ['Serengeti ecosystem, Northern Tanzania', -2.3333, 34.8333, [10, 9, 8, 10, 9, 1200]],
  'Ruaha National Park': ['Iringa Region, Southern Tanzania', -7.5, 35.0, [10, 8, 6, 10, 9, 1000]],
  'Paje & Jambiani': ['Southeast coast of Unguja, Zanzibar', -6.3008, 39.537, [2, 8, 8, 9, 9, 600]],
  'Nyerere National Park': ['Rufiji River basin, Southern Tanzania', -8.0, 37.0, [10, 8, 7, 10, 9, 950]],
  'Nungwi & Kendwa': ['Northern coast of Unguja, Zanzibar', -5.726, 39.296, [3, 9, 9, 9, 7, 700]],
  'Northern Serengeti': ['Mara River region, Northern Serengeti', -1.75, 34.75, [10, 9, 7, 10, 9, 1400]],
  'Ngorongoro Crater': ['Ngorongoro Conservation Area, Northern Tanzania', -3.1618, 35.5877, [10, 9, 9, 10, 7, 1000]],
  'Ndutu / Southern Serengeti': ['Ndutu plains, Southern Serengeti ecosystem', -3.0, 34.95, [10, 8, 7, 10, 9, 1100]],
  'Mount Kilimanjaro': ['Kilimanjaro Region, Northern Tanzania', -3.0674, 37.3556, [4, 7, 5, 10, 10, 2200]],
  'Mikumi National Park': ['Morogoro Region, Southern Tanzania', -7.2167, 37.1333, [8, 6, 8, 8, 7, 550]],
  'Mafia Island': ['Mafia Archipelago, Indian Ocean', -7.85, 39.7833, [8, 7, 7, 10, 9, 850]],
  'Lake Manyara National Park': ['Great Rift Valley, Northern Tanzania', -3.5, 35.8333, [8, 7, 9, 9, 7, 650]],
  'Central Serengeti': ['Seronera Valley, Central Serengeti', -2.4431, 34.8212, [10, 9, 8, 10, 8, 1200]],
  'Arusha National Park': ['Mount Meru and Momella Lakes, Northern Tanzania', -3.25, 36.75, [7, 6, 9, 9, 9, 500]],
  'Arusha City': ['Arusha Region, Northern Tanzania', -3.3869, 36.683, [2, 8, 9, 6, 6, 300]],
};

const safety = {
  'Safety overview': 'Travel with a reputable local operator, follow park or marine guidance, protect valuables and allow realistic transfer times. Conditions can change seasonally, so confirm the latest local advice before each activity.',
  'Health & vaccinations': 'Ask a qualified travel-health professional about recommended vaccinations and malaria prevention for your route. Use safe drinking water, sun protection and insect repellent, and carry essential prescribed medication.',
  'Security advice': 'Use arranged transfers after dark, keep valuables discreet, follow your guide’s instructions and avoid isolated areas when travelling alone. Store passport copies and emergency details separately from the originals.',
  'Travel insurance note': 'Comprehensive travel insurance should cover medical care, evacuation, trip interruption and all planned activities. Check altitude, trekking, diving or safari exclusions before departure.',
};

await page.goto('https://goldfinch.makutano.co.tz/admin/destinations', { waitUntil: 'networkidle' });
const destinationCount = await page.getByRole('button', { name: 'Edit', exact: true }).count();
for (let index = 0; index < destinationCount; index += 1) {
  await page.goto('https://goldfinch.makutano.co.tz/admin/destinations', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Edit', exact: true }).nth(index).click();
  const name = await page.locator('[name="name"]').inputValue();
  const data = destinations[name];
  if (!data) throw new Error(`No destination data for ${name}`);
  const [location, latitude, longitude, scores] = data;
  await page.locator('[name="location"]').fill(location);
  for (const [label, value] of Object.entries(safety)) {
    const editor = page.getByLabel(label, { exact: true });
    if ((await editor.innerText()).trim() === '') await editor.fill(value);
  }
  await page.locator('[name="emergency_contacts"]').fill('Keep your guide, accommodation, insurer and nearest medical facility contacts available offline. In an emergency, contact your local host first so they can coordinate the fastest appropriate assistance.');
  const scoreNames = ['score_wildlife', 'score_luxury', 'score_family', 'score_photography', 'score_adventure', 'score_budget_from'];
  for (let scoreIndex = 0; scoreIndex < scoreNames.length; scoreIndex += 1) {
    await page.locator(`[name="${scoreNames[scoreIndex]}"]`).fill(String(scores[scoreIndex]));
  }
  await page.locator('[name="latitude"]').fill(String(latitude));
  await page.locator('[name="longitude"]').fill(String(longitude));
  await saveAndWait();
  console.log(`DESTINATION ${index + 1}/${destinationCount}: ${name}`);
}

await page.goto('https://goldfinch.makutano.co.tz/admin', { waitUntil: 'networkidle' });
console.log('COMPLETE', page.url());
await browser.close();
