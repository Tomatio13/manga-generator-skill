import fs from 'node:fs';
const base='works/auto-c4339911528c';const f=`${base}/workflow.json`;const w=JSON.parse(fs.readFileSync(f));
const specs={
'01-1':{a:{face:[350,170,270,250],anchor:[486,345]},protected:[[343,300,117,260],[385,620,245,97],[815,448,480,352]]},
'01-2':{b:{face:[385,170,420,380],anchor:[609,466]}},
'01-3':{a:{face:[385,300,245,240],anchor:[487,485]},b:{face:[1035,235,255,255],anchor:[1134,430]},protected:[[285,615,510,140],[1050,605,360,150]]},
'02-1':{b:{face:[500,165,365,355],anchor:[612,427]},protected:[[0,504,445,325]]},
'02-2':{a:{face:[452,200,350,300],anchor:[615,414]},protected:[[550,565,740,268]]},
'02-3':{b:{face:[170,277,260,233],anchor:[304,430]},a:{face:[1260,350,240,230],anchor:[1385,490]},protected:[[625,540,440,250],[540,790,610,90]]}
};
for(const p of w.pages.flatMap(x=>x.panels)){
const n=fs.readdirSync(`${base}/assets/generated`).find(x=>x.startsWith(p.id+'-')&&x.endsWith('.png'));const b=fs.readFileSync(`${base}/assets/generated/${n}`);const sx=p.rect[2]/b.readUInt32BE(16),sy=p.rect[3]/b.readUInt32BE(20);const pt=([x,y])=>[Math.round(p.rect[0]+x*sx),Math.round(p.rect[1]+y*sy)];const rect=([x,y,ww,hh])=>[...pt([x,y]),Math.ceil(ww*sx),Math.ceil(hh*sy)];for(const actor of Object.keys(p.speakers)){p.speakers[actor]={face:rect(specs[p.id][actor].face),anchor:pt(specs[p.id][actor].anchor)};}p.protected=(specs[p.id].protected||[]).map(rect);
if(p.id==='01-1'){p.scene='夕方の机で原稿を前に悩むユイ。右手で頬杖をつき、右肘と左手を机に置く。左寄りのバストアップ。右半分は台詞の白余白。窓の夕空。';p.production.hands.a={left:'空手、机の上に軽く握って置く',right:'空手、右の頬へ添える。肘は机上'};}
if(p.id==='01-2'){p.scene='夕方の同じ机。左寄りのレンが穏やかに漫画化を提案するバストアップ。両手は画面外。右上を文字領域とする。';Object.assign(p.dialogue[0],{textColumns:['Codexで','manga-generatorを','使おう。原作から一緒に','組み立てるよ。'],x:500,dy:18});}
if(p.id==='01-3'){p.scene='夕方の机で原稿を読んで脚本とコマ割りを考える二人。レンが右、ユイが左で原稿を見て気持ちを残すと応える。手は紙と机の向こうに隠れる。上部を文字領域とする。';Object.assign(p.dialogue[0],{textDirection:'horizontal',textColumns:['まず全文を読み、','台詞と見せ場を設計する。'],x:560,dy:10});Object.assign(p.dialogue[1],{textDirection:'horizontal',textColumns:['大事な気持ちを','残すんだね。'],x:30,dy:10});}
if(p.id==='02-1')p.scene='夜の同じ机。左寄りのレンが文字なしコマ枠を表示したモニターを見る。手は画面外。右半分は白余白。窓の夜空とライトが時間経過を示す。';
if(p.id==='02-2'){p.scene='夜の同じ机。左寄りのユイがノートPCの画面を見ながら点検について話す。手はPCに隠れる。右半分は文字領域。';p.dialogue[0].x=550;Object.assign(p.dialogue[1],{textColumns:['別担当の','独立レビューで、','気づいた不備を','修正。'],x:730,dy:240});}
if(p.id==='02-3'){p.scene='夜の同じ机。ユイは右、レンは左。完成した漫画を表示したPCが机の中央、手前に新しい開いたノート。ユイが喜び、レンが微笑む。二人の手は机の向こう。';Object.assign(p.dialogue[0],{textDirection:'horizontal',textColumns:['私の物語が、','漫画になった！'],x:650,dy:18});const next=p.dialogue[2],note=p.dialogue[3];Object.assign(note,{textColumns:['採用素材から組版を再現。','新規生成で同じ絵が出る','保証ではありません。'],x:320,dy:140});Object.assign(next,{textColumns:['次の物語も、','描き出そう。'],x:30,dy:420});p.dialogue=[p.dialogue[0],p.dialogue[1],note,next];}
p.action=p.scene;p.production.moment=p.scene;
}
fs.writeFileSync(f,JSON.stringify(w,null,2)+'\n');
