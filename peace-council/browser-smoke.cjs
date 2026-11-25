const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:768,height:1024}]){
    const page=await browser.newPage({viewport,reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4173/?renderer=canvas',{waitUntil:'domcontentloaded'});
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
    const page=await browser.newPage({viewport:{width:1000,height:800},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const fs=require('node:fs'),path=require('node:path');const pixi=path.join(path.join(__dirname,'..','node_modules','pixi.js'),'dist','pixi.min.js');
    await page.route('https://cdn.jsdelivr.net/npm/pixi.js@8.14.3/dist/pixi.min.js',route=>route.fulfill({body:fs.readFileSync(pixi),contentType:'application/javascript',headers:{'access-control-allow-origin':'*'}}));
    await page.goto('http://127.0.0.1:4173/?renderer=pixi',{waitUntil:'domcontentloaded'});
    await page.locator('#modal-host button').first().click();await page.waitForFunction(()=>window.PCPixi?.active===true,{},{timeout:20000});
    assert.equal(await page.locator('.pc-pixi-surface').count(),1);assert.equal(await page.locator('#renderer-toggle').textContent(),'PixiJS');
    await page.locator('[data-view="world"]').click();await page.locator('#gaza-world-map [data-governorate="4"]').click();assert.match(await page.locator('#region-title').textContent(),/رفح/);
    await page.locator('#renderer-toggle').click();assert.equal(await page.locator('#renderer-toggle').textContent(),'Canvas');assert.equal(await page.locator('.pc-pixi-surface').count(),0);
    assert.deepEqual(errors,[]);await page.close();console.log('GPU renderer + Canvas fallback smoke passed');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
