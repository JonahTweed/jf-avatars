const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const babel=require('@babel/core');
const filename=path.resolve(__dirname,'../src/js/search.js');
const compiled=babel.transformSync(fs.readFileSync(filename,'utf8'),{presets:[['@babel/preset-env',{targets:{node:'current'}}]],filename}).code;
const m=new Module(filename,module); m.filename=filename; m.paths=Module._nodeModulePaths(path.dirname(filename)); m._compile(compiled,filename);
const {normalize,buildSearchIndex,searchIndex,debounce}=m.exports;
const catalogue=JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(require('node:path').join(__dirname,'fixtures/catalogue.json.gz'))));
const index=buildSearchIndex(catalogue);
const search=(q,c)=>searchIndex(index,q,c);
test('camel case, accents, encoded punctuation and apostrophes',()=>{
 assert.equal(normalize('BillyButcher'),'billy butcher');
 assert.equal(normalize('QueenRegentMíriel'),'queen regent miriel');
 assert.equal(normalize('Mother%27s_Milk'),'mothers milk');
});
test('character names with spaces, partials, punctuation and no spaces',()=>{
 for(const q of ['Billy Butcher','BillyButcher','billybutcher','Butch','billy-butcher','butcher billy']) assert.match(search(q)[0].name,/BillyButcher/);
 assert.match(search('mothers milk')[0].name,/MothersMilk/);
});
test('franchise aliases resolve real source codes throughout catalogue',()=>{
 for(const [q,prefix,count] of [['The Boys','THBY_',10],['LOTR','UAP_',20],['Lord of the Rings','UAP_',20],['ROP','UAP_',20],['Fallout','HNDO_',18],['The Expanse','EXPA_',5],['Good Omens','GDOM_',2],['Vox Machina','VXMA_',5]]) {
  const hits=search(q);assert.ok(hits.length>=count,q);assert.ok(hits.every(x=>x.name.startsWith(prefix)),q);
 }
});
test('franchise plus character terms',()=>{assert.match(search('the boys butcher')[0].name,/BillyButcher/);assert.match(search('fallout lucy')[0].name,/Lucy/);});
test('category filter and empty-query browsing',()=>{
 assert.equal(search('').length,catalogue.length);
 assert.ok(search('','Prime Video').every(x=>x.folder==='Prime Video'));
 assert.equal(search('billy butcher','Netflix').length,0);
});
test('bounded fuzzy fallback and no one-letter fuzzy expansion',()=>{
 assert.match(search('billy buthcer')[0].name,/BillyButcher/);
 assert.match(search('homelnder')[0].name,/Homelander/);
 assert.equal(search('zzzzzzzzzz').length,0);
});
test('all descriptive metadata including nested custom franchise info',()=>{
 const items=[{name:'opaque',folder:'Custom',category:'Heroes',series:'Game of Thrones',metadata:{character:'Jon Snow',tags:['Winterfell']}},{name:'wizard',franchise:'Harry Potter'},{name:'hero',series:'Marvel'}];
 const idx=buildSearchIndex(items);
 for(const q of ['jon snow','Winterfell','GOT','game of thrones','heroes','custom']) assert.equal(searchIndex(idx,q)[0],items[0],q);
 assert.equal(searchIndex(idx,'HP')[0],items[1]);assert.equal(searchIndex(idx,'MCU')[0],items[2]);
});
test('automatically derive acronyms from explicit series metadata',()=>{
 const x={name:'Character',series:'A Brand New Adventure'};
 assert.equal(searchIndex(buildSearchIndex([x]),'ABNA')[0],x);
});
test('name matches outrank broad franchise/category metadata',()=>{
 const items=[{name:'Other',series:'Butcher'},{name:'BillyButcher',folder:'Prime Video'},{name:'Else',folder:'Butcher'}];
 assert.equal(searchIndex(buildSearchIndex(items),'butch')[0],items[1]);
});
test('URL path matching, malformed escape and absent fields do not crash',()=>{
 const items=[{src:'https://example.com/custom/SomeCharacter.png?raw=true'},{filename:'bad%escape'},{}];
 assert.equal(searchIndex(buildSearchIndex(items),'some character')[0],items[0]);
 assert.doesNotThrow(()=>buildSearchIndex(items));
});
test('opaque images do not gain fabricated character labels',()=>{
 const idx=buildSearchIndex([{name:'scale(49)',folder:'Disney +'}]);
 assert.equal(searchIndex(idx,'Harry Potter').length,0);
});
test('debounce coalesces rapid typing and can cancel pending work',async()=>{
 const calls=[]; const f=debounce(x=>calls.push(x),20);f('b');f('bi');f('bil');
 await new Promise(r=>setTimeout(r,35));assert.deepEqual(calls,['bil']);f('cancel');f.cancel();
 await new Promise(r=>setTimeout(r,35));assert.deepEqual(calls,['bil']);
});
test('catalogue search performance smoke test',()=>{
 const start=performance.now();for(let i=0;i<100;i++)search(['butcher','fallout','LOTR','zzzzzzzzzz'][i%4]);
 const duration=performance.now()-start;console.log(`100 searches across ${index.length} entries: ${duration.toFixed(1)} ms`);assert.ok(duration<5000);
});
