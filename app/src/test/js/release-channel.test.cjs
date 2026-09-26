const assert=require('node:assert/strict');
const fs=require('node:fs');

const gradle=fs.readFileSync('app/build.gradle','utf8');
const updater=fs.readFileSync('app/src/main/java/pl/edwin/trener2/UpdateInstaller.java','utf8');
const main=fs.readFileSync('app/src/main/java/pl/edwin/trener2/MainActivity.java','utf8');
const workflow=fs.readFileSync('.github/workflows/build-apk.yml','utf8');

const channel=(gradle.match(/UPDATE_CHANNEL",\s+'["]([^"]+)["]'/)||[])[1]||'';
assert.equal(channel,'beta','main APK is expected to use the beta updater channel during beta development');
assert(updater.includes('!release.optBoolean("prerelease")'),'beta updater must filter GitHub releases to prereleases');
assert(main.includes('UpdateInstaller.fetchLatestBetaUpdateJson()'),'beta channel must use the GitHub prerelease feed');
assert(workflow.includes('gh release edit "$TAG" --draft=false --prerelease'),'existing main releases must stay prerelease');
assert(workflow.includes('--notes "Beta Trener 2 ${VERSION}') && workflow.includes('--prerelease'),'new main releases must be published as beta prerelease');
console.log('Release channel: beta APK, updater and GitHub publication are aligned');
