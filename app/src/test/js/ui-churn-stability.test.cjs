const assert=require('node:assert/strict');
const fs=require('node:fs');

const live=fs.readFileSync('app/src/main/assets/live-status.js','utf8');
const sync=fs.readFileSync('app/src/main/assets/v070-beta-sync-hardening.js','utf8');
const control=fs.readFileSync('app/src/main/assets/v083-shared-controller.js','utf8');
const gradle=fs.readFileSync('app/build.gradle','utf8');

assert(live.includes('if(node.innerHTML!==html)node.innerHTML=html;'));
assert(live.includes('if(link.textContent!==text)link.textContent=text;'));
assert(sync.includes('if(el.dataset.v070Health===key)return;'));
assert(control.includes('if(mode.value!==state.mode)mode.value=state.mode;'));
assert(control.includes('if(live.value!==state.controllerDeviceId)live.value=state.controllerDeviceId;'));
assert(control.includes('if(controlNote.textContent!==text)controlNote.textContent=text;'));
assert(control.includes('setInterval(maintain,250)'),'network/control timing must stay unchanged');
assert(sync.includes('setInterval(maintain,200)'),'resync timing must stay unchanged');
assert(gradle.includes("versionName '0.9.5.5'")&&gradle.includes('versionCode 100'));
console.log('UI churn stability guards are present without changing sync timing');
