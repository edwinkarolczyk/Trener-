const assert=require('node:assert/strict');
const fs=require('node:fs');

const manifest=fs.readFileSync('app/src/main/AndroidManifest.xml','utf8');
const shortcuts=fs.readFileSync('app/src/main/res/xml/shortcuts.xml','utf8');
const activity=fs.readFileSync('app/src/main/java/pl/edwin/trener2/MainActivityV077.java','utf8');
const water=fs.readFileSync('app/src/main/java/pl/edwin/trener2/QuickWaterActivity.java','utf8');
const entry=fs.readFileSync('app/src/main/assets/v0886-food-entry.js','utf8');

assert(manifest.includes('android:name="android.app.shortcuts"'));
for(const id of ['quick_meal','quick_water_250','quick_scan_food','quick_search_food']) assert(shortcuts.includes('android:shortcutId="'+id+'"'));
for(const action of ['ADD_MEAL','SCAN_FOOD','SEARCH_FOOD']) assert(activity.includes('pl.edwin.trener2.shortcut.'+action));
assert(water.includes('HydrationStore.addWater(getApplicationContext(), 250)'));
assert(entry.includes("choice==='MEAL'"));
console.log('Launcher shortcuts: meal, water, scan and search routes are wired');
