(function(root){
'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
const fmt=value=>String(Math.round(Number(value)*10)/10).replace('.',',');
function buildHtml(preview,steps){
 if(!preview||!Array.isArray(preview.ingredients)||!preview.ingredients.length)throw Error('Brak składników do druku.');
 const rows=preview.ingredients.map(item=>'<tr><td>'+esc(item.name)+'</td><td class="num">'+esc(fmt(item.grams))+' g</td></tr>').join('');
 const list=(steps||[]).map(step=>'<li>'+esc(step)+'</li>').join('');
 return '<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'+
 '<title>'+esc(preview.name)+'</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:12pt/1.5 sans-serif;color:#171717;margin:0}'+
 'header{border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:18px}.eyebrow{font-size:10pt;letter-spacing:.1em;color:#555}h1{font-size:23pt;line-height:1.2;margin:7px 0 0}'+
 'h2{font-size:15pt;margin:22px 0 8px}.macro{display:flex;gap:9px;flex-wrap:wrap}.macro span{border:1px solid #aaa;border-radius:6px;padding:8px 12px;white-space:nowrap}'+
 'table{border-collapse:collapse;width:100%}td{padding:8px 5px;border-bottom:1px solid #ddd}.num{text-align:right;white-space:nowrap}li{margin:7px 0}'+
 '.note{color:#555;font-size:10pt}footer{margin-top:28px;border-top:1px solid #ccc;padding-top:8px;font-size:9pt;color:#555}tr,li{break-inside:avoid}'+
 '</style></head><body><header><div class="eyebrow">TRENER 2 · PRZEPIS</div><h1>'+esc(preview.name)+'</h1></header>'+
 '<div class="macro"><span><strong>'+esc(fmt(preview.kcal))+'</strong> kcal</span><span>B: <strong>'+esc(fmt(preview.protein))+' g</strong></span>'+
 '<span>W: <strong>'+esc(fmt(preview.carbs))+' g</strong></span><span>T: <strong>'+esc(fmt(preview.fat))+' g</strong></span></div>'+
 '<h2>Składniki</h2><table><tbody>'+rows+'</tbody></table>'+
 '<p class="note">Ryż, makaron i kasza: masa przed gotowaniem. Drób: surowy, chyba że składnik opisano jako po obróbce.</p>'+
 '<h2>Przygotowanie</h2><ol>'+list+'</ol>'+
 '<footer>Wartości odżywcze są szacunkowe i odpowiadają gramaturom widocznym na tej karcie.</footer></body></html>';
}
function printable(meal,grams){
 const bridge=root.TrenerRecipeDiet093,recipes=root.TrenerRecipes090;
 if(!bridge||!recipes)throw Error('Moduł przepisów nie został wczytany.');
 const preview=bridge.prepare(meal,grams);
 const steps=recipes.preparation({...meal,items:preview.ingredients.map(x=>[x.key,x.grams])});
 return {preview,steps};
}
function printMeal(meal,grams){
 const {preview,steps}=printable(meal,grams);
 if(!root.Android||typeof root.Android.printRecipe!=='function')throw Error('Druk PDF jest dostępny w aktualnej aplikacji Android.');
 root.Android.printRecipe(buildHtml(preview,steps),preview.name);
 return preview;
}
const api=Object.freeze({buildHtml,printable,printMeal});
root.TrenerRecipePrint096=api;
if(typeof document==='undefined')return;
function status(message){
 const target=document.getElementById('r093Info')||document.getElementById('r090DietMessage');
 if(target)target.textContent=message;
}
function fromPlan(day,index){
 const plan=root.TrenerRecipePlan090?.();
 const meal=plan?.days?.[day-1]?.meals?.[index];
 if(!meal)throw Error('Wygeneruj jadłospis przed drukowaniem.');
 return meal;
}
function fromLibrary(id){
 const recipe=root.TrenerRecipes090?.RECIPES?.find(x=>x.id===id);
 if(!recipe)throw Error('Nie znaleziono przepisu.');
 return recipe;
}
function boot(){
 const host=document.getElementById('recipes');
 if(!host)return;
 host.addEventListener('click',event=>{
  const button=event.target.closest('[data-r096-recipe],[data-r096-plan],[data-r096-preview]');
  if(!button)return;
  try{
   if(button.dataset.r096Preview!==undefined){
    const current=root.TrenerRecipeDiet093?.previewForPrint?.();
    if(!current)throw Error('Najpierw otwórz przepis.');
    printMeal(current.recipe,current.grams);
   }else if(button.dataset.r096Plan!==undefined){
    printMeal(fromPlan(Number(button.dataset.r096Plan),Number(button.dataset.meal)));
   }else{
    printMeal(fromLibrary(button.dataset.r096Recipe));
   }
   status('');
  }catch(e){status(e.message||String(e));}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof window!=='undefined'?window:globalThis);
