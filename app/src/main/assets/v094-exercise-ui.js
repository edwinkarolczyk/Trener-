(function(){
  'use strict';
  const store=window.TrenerCustomExercises094;
  if(!store)return;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let editing='',images={imageStart:'',imageEnd:''},pendingImages=0,editRevision=0,dirty=false,editingForm=false;
  function leaveEditor(next){
    if(pendingImages>0){msg('Zakończ wybieranie zdjęć przed wyjściem.');return;}
    if(dirty&&!confirm('Masz niezapisane zmiany. Odrzucić je?'))return;
    dirty=false;editingForm=false;editRevision++;next();
  }
  function msg(s){if(typeof window.toast==='function')window.toast(s);else alert(s);}
  function style(){
    if($('v094Css'))return;
    const el=document.createElement('style');el.id='v094Css';
    el.textContent=[
      '.v094Open{width:100%;margin:9px 0 13px;padding:13px;border:1px solid #46815e;border-radius:16px;background:#173826;color:#d5ffe2;font-weight:700}',
      '.v094Shade{position:fixed;inset:0;z-index:99999;background:#000d;display:flex;align-items:stretch;justify-content:center;padding:8px}',
      '.v094Panel{background:#171717;border:1px solid #474747;border-radius:18px;max-width:680px;width:100%;overflow-y:auto;overscroll-behavior:contain;padding:16px;color:#eee}',
      '.v094Panel h2{font-size:20px;margin:0 0 12px}.v094Panel h3{font-size:17px;margin:10px 0}',
      '.v094Panel input,.v094Panel select,.v094Panel textarea{box-sizing:border-box;width:100%;max-width:100%;padding:12px;margin:5px 0 10px;min-height:43px;border:1px solid #555;border-radius:12px;background:#242424;color:#f6f6f6;font-size:16px}',
      '.v094Panel input[type=checkbox]{width:auto;min-height:0}.v094Panel label{display:block;margin-top:8px;font-weight:600;font-size:13px}',
      '.v094Panel button{min-height:44px;border-radius:12px;margin:4px;padding:9px 12px}',
      '.v094Actions{display:flex;flex-wrap:wrap;gap:6px}.v094Row{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid #363636;border-radius:14px;padding:10px;margin:8px 0}',
      '.v094Row small{display:block;color:#bcbcbc;margin-top:4px}.v094Media{max-width:100%;max-height:210px;object-fit:contain;border-radius:10px}',
      '.v094Grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.v094Field{min-width:0}',
      '.v094Error{color:#ff9b9b}.v094Note{color:#c5c5c5;font-size:12px;line-height:1.45}'
    ].join('');
    document.head.appendChild(el);
  }
  function shell(title,html){
    $('v094Shade')?.remove();
    const shade=document.createElement('div');shade.className='v094Shade';shade.id='v094Shade';
    const panel=document.createElement('div');panel.className='v094Panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
    panel.innerHTML='<div class="v094Actions" style="justify-content:space-between"><h2>'+esc(title)+'</h2><button id="v094Close" type="button">ZAMKNIJ ✕</button></div>'+html;
    shade.appendChild(panel);document.body.appendChild(shade);
    $('v094Close').onclick=()=>{
      if(editingForm){leaveEditor(()=>shade.remove());return;}
      shade.remove();
    };
    return panel;
  }
  function list(){
    const pane=shell('Moje ćwiczenia',
      '<p class="v094Note">Ćwiczenia dodane tutaj działają także w kreatorze planu. Zdjęcia są lokalne i trafiają do pełnej kopii JSON; duże filmy i import ZIP są odrębnym etapem.</p>'+
      '<button id="v094New" type="button">＋ NOWE ĆWICZENIE</button>'+
      '<p id="v094Count"></p><div id="v094Rows"></div>');
    $('v094New').onclick=()=>edit('');
    let items;
    try{items=store.list();}
    catch(e){
      $('v094Count').textContent='Biblioteka wymaga odzyskania danych.';
      $('v094Rows').textContent=String(e.message||e)+' Nie zapisuj nowych ćwiczeń ani nie czyść danych aplikacji. Wykonaj pełną kopię danych i przywróć poprawną bibliotekę.';
      return pane;
    }
    $('v094Count').textContent='Zapisano własnych ćwiczeń: '+items.length;
    const host=$('v094Rows');
    if(!items.length)host.textContent='Brak własnych ćwiczeń. Dodaj pierwsze.';
    for(const ex of items){
      const row=document.createElement('div');row.className='v094Row';
      const name=document.createElement('div');name.style.minWidth='0';
      const strong=document.createElement('strong');strong.textContent=ex.n;name.appendChild(strong);
      const sub=document.createElement('small');sub.textContent=ex.group+' • '+ex.equipment;name.appendChild(sub);
      const actions=document.createElement('div');actions.className='v094Actions';
      const view=document.createElement('button');view.textContent='PODGLĄD';view.onclick=()=>info(ex);
      const editBtn=document.createElement('button');editBtn.textContent='EDYTUJ';editBtn.onclick=()=>edit(ex.id);
      actions.append(view,editBtn);row.append(name,actions);host.appendChild(row);
    }
    return pane;
  }
  function mediaBlock(id,label){
    return '<div class="v094Field"><label for="v094'+id+'">'+label+'</label>'+
      '<input id="v094'+id+'" type="file" accept="image/jpeg,image/png,image/webp">'+
      '<img id="v094Preview'+id+'" class="v094Media" alt="'+label+'" hidden>'+
      '<button type="button" id="v094Remove'+id+'">USUŃ ZDJĘCIE</button></div>';
  }
  function edit(id){
    editing=id;let old=null;
    try{old=id?store.get(id):null;}catch(e){msg(String(e.message||e));return list();}
    editRevision++;const thisEdit=editRevision;
    editingForm=true;dirty=false;pendingImages=0;
    if(id&&!old){msg('Nie znaleziono ćwiczenia.');return list();}
    images={imageStart:old?.imageStart||'',imageEnd:old?.imageEnd||''};
    shell(id?'Edytuj ćwiczenie':'Dodaj ćwiczenie',
      '<label for="v094Name">Nazwa *</label><input id="v094Name" maxlength="110" placeholder="np. Uginanie młotkowe">'+
      '<div class="v094Grid"><div class="v094Field"><label for="v094Group">Partia *</label><select id="v094Group"></select></div>'+
      '<div class="v094Field"><label for="v094Equipment">Sprzęt</label><input id="v094Equipment" maxlength="100" placeholder="np. Hantle"></div></div>'+
      '<div class="v094Grid"><div class="v094Field"><label>Serie</label><input id="v094Sets" type="number" min="1" max="15"></div>'+
      '<div class="v094Field"><label>Przerwa (sek.)</label><input id="v094Rest" type="number" min="0" max="1200"></div>'+
      '<div class="v094Field"><label>Od powtórzeń / sek.</label><input id="v094Min" type="number" min="1" max="999"></div>'+
      '<div class="v094Field"><label>Do powtórzeń / sek.</label><input id="v094Max" type="number" min="1" max="999"></div></div>'+
      '<label><input id="v094Time" type="checkbox"> Ćwiczenie na czas (sekundy zamiast powtórzeń)</label>'+
      '<label>Pozycja początkowa</label><textarea id="v094Setup" rows="2" maxlength="1500"></textarea>'+
      '<label>Jak wykonać ruch</label><textarea id="v094Movement" rows="3" maxlength="1500"></textarea>'+
      '<label>Typowe błędy / bezpieczeństwo</label><textarea id="v094Mistake" rows="2" maxlength="1500"></textarea>'+
      '<label>Wskazówka</label><textarea id="v094Tip" rows="2" maxlength="700"></textarea>'+
      '<div class="v094Grid">'+mediaBlock('Start','Zdjęcie START')+mediaBlock('End','Zdjęcie KONIEC')+'</div>'+
      '<p class="v094Note">Zdjęcia są zmniejszane przed zapisaniem. Jeśli zabraknie miejsca, poprzednie dane zostają bez zmian. Filmy i pełne pakiety multimedialne wymagają magazynu plików Androida w kolejnym etapie.</p>'+
      '<p id="v094Error" class="v094Error" role="alert"></p>'+
      '<div class="v094Actions"><button id="v094Save" type="button">ZAPISZ ĆWICZENIE</button><button id="v094Cancel" type="button">ANULUJ</button>'+
      (id?'<button id="v094Delete" type="button">USUŃ ĆWICZENIE</button>':'')+'</div>');
    for(const g of store.groups){const option=document.createElement('option');option.value=g;option.textContent=g;$('v094Group').appendChild(option);}
    const values={Name:old?.n||'',Group:old?.group||'Inne',Equipment:old?.equipment||'',Sets:old?.sets??3,Rest:old?.rest??90,Min:old?.min??8,Max:old?.max??12,Setup:old?.setup||'',Movement:old?.movement||'',Mistake:old?.mistake||'',Tip:old?.tip||''};
    for(const [key,value] of Object.entries(values))$('v094'+key).value=value;
    $('v094Time').checked=!!old?.time;
    for(const [suffix,key] of [['Start','imageStart'],['End','imageEnd']]){
      const img=$('v094Preview'+suffix);
      if(images[key]){img.src=images[key];img.hidden=false;}
      $('v094'+suffix).onchange=async e=>{
        const file=e.target.files?.[0];if(!file)return;
        pendingImages++;$('v094Save').disabled=true;
        try{
          const compressed=await compress(file);
          if(thisEdit!==editRevision||!img.isConnected)return;
          images[key]=compressed;img.src=compressed;img.hidden=false;dirty=true;$('v094Error').textContent='';
        }catch(err){if(thisEdit===editRevision&&$('v094Error'))$('v094Error').textContent=err.message;}
        finally{
          if(thisEdit===editRevision){
            pendingImages--;if($('v094Save'))$('v094Save').disabled=pendingImages>0;
          }
          e.target.value='';
        }
      };
      $('v094Remove'+suffix).onclick=()=>{images[key]='';img.removeAttribute('src');img.hidden=true;dirty=true;};
    }
    const editPanel=$('v094Shade');
    editPanel.addEventListener('input',()=>{dirty=true;});
    editPanel.addEventListener('change',()=>{dirty=true;});
    $('v094Cancel').onclick=()=>leaveEditor(list);
    $('v094Save').onclick=()=>{
      if(pendingImages>0){$('v094Error').textContent='Poczekaj na przetworzenie zdjęć.';return;}
      try{
        const item=store.save({
          id:editing||undefined,n:$('v094Name').value,group:$('v094Group').value,equipment:$('v094Equipment').value,
          sets:Number($('v094Sets').value),rest:Number($('v094Rest').value),
          min:Number($('v094Min').value),max:Number($('v094Max').value),time:$('v094Time').checked,
          setup:$('v094Setup').value,movement:$('v094Movement').value,mistake:$('v094Mistake').value,
          tip:$('v094Tip').value,imageStart:images.imageStart,imageEnd:images.imageEnd
        });
        dirty=false;editingForm=false;editRevision++;
        store.refresh();msg('Zapisano: '+item.n);list();
      }catch(err){$('v094Error').textContent=err.message||'Nie udało się zapisać.';}
    };
    if(id)$('v094Delete').onclick=()=>{
      if(!confirm('Usunąć z biblioteki? Historia wcześniejszych treningów zostanie zachowana.'))return;
      try{store.remove(id);dirty=false;editingForm=false;editRevision++;store.refresh();list();}catch(err){$('v094Error').textContent=err.message;}
    };
  }
  function compress(file){
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>12*1024*1024)throw Error('Wybierz zdjęcie JPG/PNG/WebP maks. 12 MB.');
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(Error('Nie udało się odczytać zdjęcia.'));
      reader.onload=()=>{
        const img=new Image();
        img.onerror=()=>reject(Error('Nieprawidłowy obraz.'));
        img.onload=()=>{
          const scale=Math.min(1,960/Math.max(img.width,img.height));
          const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
          canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
          const data=canvas.toDataURL('image/jpeg',0.68);
          if(data.length>420000)reject(Error('Zdjęcie jest zbyt duże po kompresji.'));
          else resolve(data);
        };
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function info(ex){
    const item=ex||{};const html=[
      '<p><b>Partia:</b> '+esc(item.group||'Inne')+' • <b>Sprzęt:</b> '+esc(item.equipment||'')+'</p>',
      '<p>'+esc(item.sets)+' × '+esc(item.min)+'–'+esc(item.max)+(item.time?' sek.':' powt.')+' • przerwa '+esc(item.rest)+' s</p>',
      item.imageStart?'<img class="v094Media" src="'+item.imageStart+'" alt="Pozycja początkowa">':'',
      '<h3>Pozycja początkowa</h3><p>'+esc(item.setup||'Brak opisu.')+'</p>',
      item.imageEnd?'<img class="v094Media" src="'+item.imageEnd+'" alt="Pozycja końcowa">':'',
      '<h3>Wykonanie</h3><p>'+esc(item.movement||'Brak opisu.')+'</p>',
      '<h3>Błędy</h3><p>'+esc(item.mistake||'Brak opisu.')+'</p>',
      '<h3>Wskazówka</h3><p>'+esc(item.tip||'Brak opisu.')+'</p>',
      '<button id="v094Back" type="button">WRÓĆ</button>'
    ].join('');
    shell(item.n||'Ćwiczenie',html);
    $('v094Back').onclick=list;
  }
  function install(){
    style();store.hydrate();
    const plan=$('plan');if(!plan||$('v094Open'))return;
    const btn=document.createElement('button');btn.className='v094Open';btn.id='v094Open';btn.type='button';
    btn.textContent='＋ MOJE ĆWICZENIA • DODAJ / EDYTUJ';
    btn.onclick=list;plan.insertBefore(btn,plan.firstChild);
  }
  // Intercept the old diagram button for a user-defined exercise only.
  document.addEventListener('click',event=>{
    if(!event.target?.closest?.('#v052HowBtn'))return;
    let ex=null;try{ex=currentPlan?.ex?.[exIdx]||null;}catch(e){}
    if(!ex||!String(ex.id||'').startsWith('user:'))return;
    event.preventDefault();event.stopImmediatePropagation();info(store.get(ex.id)||ex);
  },true);
  function boot(){install();store.refresh();setTimeout(install,150);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,60),{once:true});
  else setTimeout(boot,60);
  window.TrenerCustomExerciseUi094={open:list,edit,info};
})();