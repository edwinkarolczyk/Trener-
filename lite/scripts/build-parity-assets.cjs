#!/usr/bin/env node
'use strict';

// Artefakty Lite pochodzą wprost z plików aktualnego Trenera 2.
// Nie twórz drugiej implementacji logiki treningowej i historii.
const fs=require('fs');
const path=require('path');
const babel=require('@babel/core');
const src=path.resolve(__dirname,'../../app/src/main/assets');
const dest=path.resolve(__dirname,'../build/generated/parityAssets');
const blocked=new Set([
  'v076-diet.js','v077-diet-quick.js','v077-widget-sync.js',
  'v078-hydration.js','v0802-openfoodfacts.js','v083-food-catalog.js',
  'v084-diet-cards.js','v0885-meal-composer.js','v0886-meal-sets.js',
  'v0886-food-entry.js','v0889-meal-time.js','v0890-diet-visual.js',
  'v090-recipes.js','v093-recipe-diet.js','v096-recipe-print.js',
  'v0957-ai-meal.js','v060-equipment.js'
]);
const ignored=new Set(['qr-addon.js','update-addon.js']);
fs.rmSync(dest,{recursive:true,force:true});
fs.mkdirSync(dest,{recursive:true});
const entries=fs.readdirSync(src,{withFileTypes:true});
let copied=0,compiled=0;
function transpile(code,file){
  const result=babel.transformSync(code,{
    babelrc:false,configFile:false,filename:file,
    sourceType:'script',comments:false,compact:false,
    presets:[[require.resolve('@babel/preset-env'),{
      targets:{chrome:'37'},useBuiltIns:false,modules:false,
      exclude:['@babel/plugin-transform-typeof-symbol']
    }]]
  });
  return result.code;
}
for(const ent of entries){
  if(ent.isDirectory()){
    fs.cpSync(path.join(src,ent.name),path.join(dest,ent.name),{recursive:true});
    continue;
  }
  if(!ent.isFile()||blocked.has(ent.name)||ignored.has(ent.name))continue;
  let value=fs.readFileSync(path.join(src,ent.name));
  if(ent.name==='feature-loader.js'){
    let js=value.toString('utf8');
    js=js.split('\n').filter(line=>line.indexOf("'v060-equipment.js'")<0).join('\n');
    for(const banned of blocked){
      js=js.split('\n').filter(line=>!line.includes("'"+banned+"'")).join('\n');
    }
    value=Buffer.from(js);
  }
  if(ent.name==='index.html'){
    let html=value.toString('utf8');
    html=html.replace('<link rel="stylesheet" href="v090-recipes.css">','');
    html=html.replace('</head>','<link rel="stylesheet" href="lite-tablet.css"></head>');
    html=html.replace('<script src="app.js"></script>',
      '<script src="core-js.min.js"></script><script src="lite-data-core.js"></script><script src="lite-inventory-core.js"></script><script src="lite-group-core.js"></script><script src="lite-init.js"></script><script src="app.js"></script>');
    html=html.replace('</body>', '<script src="lite-pr-core.js"></script><script src="lite-pr.js"></script><script src="lite-data-manager.js"></script><script src="lite-inventory-ui.js"></script></body>');
    value=Buffer.from(html);
  }
  if(ent.name==='v086-one-phone.js'){
    const patch=require('./patch-group-six.cjs').patch;
    value=Buffer.from(patch(value.toString('utf8')));
  }
  // Lite nie obcina najstarszych treningów po zapisie kolejnej serii.
  if(['app.js','v086-one-phone.js','v059-readiness.js'].includes(ent.name)){
    let js=value.toString('utf8');
    js=js.replace(/JSON\.stringify\(history\.slice\(0,100\)\)/g,'JSON.stringify(history)');
    js=js.replace(/JSON\.stringify\(h\.slice\(0,100\)\)/g,'JSON.stringify(h)');
    value=Buffer.from(js);
  }
  if(ent.name.endsWith('.js')){value=Buffer.from(transpile(value.toString('utf8'),ent.name));compiled++;}
  fs.writeFileSync(path.join(dest,ent.name),value);copied++;
}
// Na Androidzie 5 WebView jest starszy: polyfille API JS + transpilacja składni.
// Kopia plików źródłowych Trenera 2 nadal pozostaje jedyną wersją logiki.
const polyfill=require.resolve('core-js-bundle/minified.js');
fs.copyFileSync(polyfill,path.join(dest,'core-js.min.js'));
for(const name of ['lite-data-core.js','lite-inventory-core.js','lite-group-core.js','lite-init.js','lite-pr-core.js','lite-pr.js','lite-data-manager.js','lite-inventory-ui.js']){
  fs.writeFileSync(path.join(dest,name),transpile(fs.readFileSync(path.join(__dirname,name),'utf8'),name));
}
fs.copyFileSync(path.join(__dirname,'lite-tablet.css'),path.join(dest,'lite-tablet.css'));
const required=['app.js','progression-addon.js','feature-loader.js','v058-smart-set.js',
  'v059-readiness.js','v0642-adaptive-volume.js','v070-beta-planner.js',
  'v070-beta-data.js','v086-one-phone.js','v094-exercise-store.js','v094-exercise-ui.js',
  'style.css','index.html','lite-init.js','lite-pr-core.js','lite-pr.js','lite-data-core.js','lite-data-manager.js','lite-group-core.js','lite-inventory-core.js','lite-inventory-ui.js'];
for(const name of required) if(!fs.existsSync(path.join(dest,name)))throw Error('Brakuje pliku silnika: '+name);
const out=fs.readFileSync(path.join(dest,'feature-loader.js'),'utf8');
if(blocked.has('v076-diet.js')&&out.includes('v076-diet.js'))throw Error('Moduł dietetyczny wyciekł do Lite');
if(out.includes('v060-equipment.js'))throw Error('Stary kalkulator gryfów z fikcyjnymi talerzami nie może być w Lite');
console.log('Silnik i motyw pełnego Trenera 2: '+copied+' plików źródłowych, '+compiled+' transpilowanych JS.');
