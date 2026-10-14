'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../src/main');
const updater=fs.readFileSync(path.join(root,'java/pl/edwin/trener2lite/LiteUpdater.java'),'utf8');
const provider=fs.readFileSync(path.join(root,'java/pl/edwin/trener2lite/LiteApkProvider.java'),'utf8');
const manifest=fs.readFileSync(path.join(root,'AndroidManifest.xml'),'utf8');
const install=updater.slice(updater.indexOf('private void install(File apk) {'),updater.indexOf('private String hex('));
test('Android 5.1: instalator nie otrzymuje niedostępnego file:// z prywatnego cache',()=>{
 assert.ok(install.length>100);
 assert.doesNotMatch(install,/Uri\.fromFile\s*\(/);
 assert.doesNotMatch(install,/Build\.VERSION\.SDK_INT\s*>=\s*24/);
 assert.match(install,/Uri\.parse\("content:\/\/pl\.edwin\.trener2lite\.updates\/latest\.apk"\)/);
});
test('Aktualizacja na Fire OS 5 przekazuje prawo odczytu URI przez Intent i ClipData',()=>{
 assert.match(install,/Intent\.ACTION_VIEW/);
 assert.match(install,/application\/vnd\.android\.package-archive/);
 assert.match(install,/ClipData\.newRawUri/);
 assert.match(install,/Intent\.FLAG_GRANT_READ_URI_PERMISSION/);
 assert.match(install,/activity\.startActivity\(intent\)/);
});
test('Provider udostępnia tylko pobrane APK, wyłącznie do odczytu',()=>{
 assert.match(provider,/new File\(getContext\(\)\.getCacheDir\(\), "updates\/latest\.apk"\)/);
 assert.match(provider,/MODE_READ_ONLY/);
 assert.match(provider,/ALLOWED_URI\.equals\(uri\.toString\(\)\)/);
 assert.match(provider,/\!"r"\.equals\(mode\)/);
 assert.match(manifest,/android:authorities="pl\.edwin\.trener2lite\.updates"/);
 assert.match(manifest,/android:grantUriPermissions="true"/);
});
test('Sprawdzanie SHA256 i podpisu pozostaje wymagane przed instalacją',()=>{
 assert.match(updater,/hex\(digest\.digest\(\)\)\.equals\(expectedHash\)/);
 assert.match(updater,/verifySignatureAndPackage\(temp\)/);
 assert.match(updater,/candidate\.signatures/);
 assert.match(updater,/MessageDigest\.isEqual/);
});
