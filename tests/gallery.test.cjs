const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const images=JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(require('node:path').join(__dirname,'fixtures/catalogue.json.gz'))));
const en=require('../src/lang/en.json');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function setup(){
 const dom=new JSDOM('<!doctype html><body><button id="btnDeleteImage"></button><div id="image"></div><div class="headerUserButton"></div></body>',{url:'https://jellyfin.test/web/index.html#/userprofile?userId=other-user',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;const requests=[];const observers=[];
 w.fetch=async(url,options={})=>{requests.push({url,options});return {ok:true,json:async()=>String(url).includes('images_metadata')?images:String(url).includes('folders_names')?[...new Set(images.map(x=>x.folder))]:en};};
 w.IntersectionObserver=class{constructor(cb){this.cb=cb;this.targets=new Set();observers.push(this);}observe(x){this.targets.add(x);}unobserve(x){this.targets.delete(x);}disconnect(){this.targets.clear();}};
 let loads=0;
 w.Image=class{set src(x){loads++; setTimeout(()=>this.onload?.(),1);}};
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.localStorage.setItem('jellyfin_credentials',JSON.stringify({Servers:[{AccessToken:'test-token',UserId:'current-user'}]}));
 w.eval(fs.readFileSync(require.resolve('../dist/main.js'),'utf8'));
 return {dom,w,requests,observers,getLoads:()=>loads};
}
async function open(env){await wait(30);env.w.document.getElementById('jf-avatars-btn-show-modal').click();await wait(30);return env.w.document.getElementById('jf-avatars-grid-container');}
function type(w,text){const input=w.document.getElementById('jf-avatars-search-input');input.value=text;input.dispatchEvent(new w.Event('input'));}
test('production bundle: bounded gallery, debounced search, no repeated metadata fetch or eager preload',async()=>{
 const e=setup();try{
  const grid=await open(e);assert.ok(grid);assert.equal(grid.querySelectorAll('img').length,120);assert.equal(e.getLoads(),0);
  const calls=e.requests.length;
  type(e.w,'b');type(e.w,'billy');type(e.w,'billy butcher');
  assert.equal(grid.querySelectorAll('img').length,120);
  await wait(230);assert.equal(grid.querySelectorAll('img').length,1);assert.match(grid.querySelector('img').dataset.src,/BillyButcher/);
  assert.equal(e.requests.length,calls);assert.equal(e.getLoads(),0);
  const node=grid.firstChild;type(e.w,'Billy-Butcher');await wait(220);assert.equal(grid.firstChild,node,'same result must retain existing image node');
  const observer=e.observers.at(-1);observer.cb([...observer.targets].map(target=>({target,isIntersecting:true})),observer);
  await wait(20);assert.equal(e.getLoads(),1);assert.ok(!grid.firstChild.classList.contains('blink'));
 }finally{e.dom.window.close();}
});
test('production bundle: pagination, category filtering, random, generated fallback, cancel/reopen, duplicate initializer',async()=>{
 const e=setup();try{
  let grid=await open(e);grid.querySelector('button').click();assert.equal(grid.querySelectorAll('img').length,240);
  e.w.document.getElementById('jf-avatars-btn-random').click();assert.equal(e.w.document.getElementById('jf-avatars-btn-validate').style.display,'block');
  const dropdown=e.w.document.getElementById('jf-avatars-dropdown-select-filter');dropdown.value='Prime Video';dropdown.dispatchEvent(new e.w.Event('change'));assert.ok([...grid.querySelectorAll('img')].slice(1).every(img=>img.dataset.src.includes('Prime Video')));
  dropdown.value='All';type(e.w,'zzzzzzzzzz');await wait(220);assert.equal(grid.dataset.generatedFallback,'true');assert.match(e.w.document.getElementById('jf-avatars-search-status').textContent,/Generated/);
  type(e.w,'Fallout');e.w.document.getElementById('jf-avatars-btn-cancel').click();await wait(220);assert.equal(e.w.document.getElementById('jf-avatars-modal'),null);
  const requests=e.requests.length;grid=await open(e);assert.equal(e.requests.length,requests);assert.equal(grid.querySelectorAll('img').length,120);
  e.w.eval(fs.readFileSync(require.resolve('../dist/main.js'),'utf8'));await wait(30);assert.equal(e.w.document.querySelectorAll('#jf-avatars-btn-show-modal').length,1);
 }finally{e.dom.window.close();}
});
test('production bundle: selection and upload still target the selected user',async()=>{
 const e=setup();try{
  const grid=await open(e);type(e.w,'Billy Butcher');await wait(220);
  const observer=e.observers.at(-1);observer.cb([...observer.targets].map(target=>({target,isIntersecting:true})),observer);await wait(20);
  grid.querySelector('img').click();assert.equal(e.w.document.getElementById('jf-avatars-btn-validate').style.display,'block');
  e.w.fetch=async(url,options={})=>{e.requests.push({url,options});return {ok:true,blob:async()=>new e.w.Blob(['image'],{type:'image/png'})};};
  e.w.document.getElementById('jf-avatars-btn-validate').click();await wait(30);
  const upload=e.requests.find(x=>x.options.method==='POST');assert.ok(upload);assert.equal(upload.url,'../Users/other-user/Images/Primary');assert.ok(upload.options.body);assert.equal(e.w.document.getElementById('jf-avatars-modal'),null);
 }finally{e.dom.window.close();}
});
