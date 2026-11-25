const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true});try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:768,height:1024}]){
    const page=await browser.newPage({viewport,reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
    await page.locator('#modal-host button').first().click();
    await page.locator('#metric-coins').waitFor();assert.match(await page.locator('#region-title').textContent(),/غزة/);
    assert.equal(await page.locator('#crew-count').textContent(),'0 / 2');
    await page.locator('[data-view="world"]').click();
    await page.locator('#gaza-world-map [data-governorate]').first().waitFor({state:'visible'});
    assert.equal(await page.locator('#gaza-world-map [data-governorate]').count(),5);
    await page.locator('#gaza-world-map [data-governorate="4"]').click();
    assert.match(await page.locator('#region-title').textContent(),/رفح/);
    await page.locator('[data-view="research"]').click();assert.equal(await page.locator('[data-research]').count(),4);
    await page.locator('[data-view="missions"]').click();assert.ok(await page.locator('#mission-card').isVisible());
    await page.locator('[data-view="build"]').click();assert.ok(await page.locator('#build-list').isVisible());
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);assert.equal(overflow,false,'horizontal overflow at '+viewport.width);
    assert.deepEqual(errors,[]);await page.close();console.log('Browser smoke passed:',viewport.width+'x'+viewport.height);
  }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
