import { chromium } from 'playwright';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223'); const page=browser.contexts()[0].pages()[0]; page.setDefaultTimeout(15000);
await page.goto('https://goldfinch.makutano.co.tz/admin/gallery',{waitUntil:'networkidle'}); await page.getByRole('button',{name:'New Gallery Item',exact:true}).click(); await page.getByRole('button',{name:'Choose from library',exact:true}).click(); await page.waitForTimeout(5000);
console.log((await page.locator('body').innerText()).slice(-16000));
console.log(await page.locator('input,textarea,select').evaluateAll(fs=>fs.map(f=>({name:f.name,type:f.type,value:f.value,placeholder:f.placeholder,aria:f.getAttribute('aria-label')}))));
console.log(await page.locator('button').evaluateAll(bs=>bs.map(b=>b.innerText.trim()).filter(Boolean).slice(-120)));
console.log('IMAGES', await page.locator('div.fixed.inset-0').last().locator('img').evaluateAll(imgs=>imgs.slice(0,10).map(i=>({alt:i.alt,src:i.src,html:i.parentElement?.outerHTML.slice(0,800)}))));
await browser.close();
