import test from 'node:test';
import assert from 'node:assert/strict';
import {createTradeGate} from '../dist/online.js';

test('rapid market clicks submit one transaction and never leave deferred sales',async()=>{
  let resolve,calls=0;const changes=[];
  const trade=createTradeGate(args=>{calls++;return new Promise(r=>resolve=r);},(pending,args)=>changes.push([pending,args.resource]));
  const first=trade({resource:'wood',side:'sell'});
  const repeats=await Promise.all(Array.from({length:20},()=>trade({resource:'wood',side:'sell'})));
  assert.equal(calls,1);assert.ok(repeats.every(r=>r.ignored));
  resolve({ok:true,message:'Продано'});assert.equal((await first).ok,true);
  assert.equal(calls,1);assert.deepEqual(changes,[[true,'wood'],[false,'wood']]);
  const next=trade({resource:'stone',side:'sell'});assert.equal(calls,2);
  resolve({ok:true});await next;
});

test('market unlocks immediately after rejection or network failure',async()=>{
  let calls=0;const changes=[];
  const trade=createTradeGate(async()=>{if(++calls===1)throw Error('offline');return {ok:false,message:'Недостаточно ресурсов'};},pending=>changes.push(pending));
  await assert.rejects(trade({}),/offline/);
  assert.equal((await trade({})).ok,false);
  assert.deepEqual(changes,[true,false,true,false]);
});
