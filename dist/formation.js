// One visible figure represents up to five troops. Huge formations share a bounded budget.
export function formation(troops,budget=96){
 const types=Object.entries(troops||{}).filter(([,n])=>n>0),desired=types.reduce((n,[,count])=>n+Math.ceil(count/5),0),out=[];
 for(const [type,count] of types){const figures=desired<=budget?Math.ceil(count/5):Math.max(1,Math.floor(Math.ceil(count/5)*budget/desired));for(let i=0;i<figures;i++)out.push({type,represented:desired<=budget?Math.min(5,count-i*5):Math.ceil(count/figures)});}
 return out.slice(0,budget);
}
