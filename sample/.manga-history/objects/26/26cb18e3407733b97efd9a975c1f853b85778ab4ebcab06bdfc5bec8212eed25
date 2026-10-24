import fs from 'node:fs';
import crypto from 'node:crypto';
const base = 'works/auto-c4339911528c';
const file = `${base}/workflow.json`;
const w = JSON.parse(fs.readFileSync(file));
w.author = 'Codex / manga-generator';
w.sections = { desk: {summary:'夕方、原作を漫画へ組み立てる', location:'作者の作業机。窓、ノートPC、原稿紙。夕方の空。', costumes:{a:'淡色クルーネックスウェット', b:'黒いハイネックと白い開襟シャツ'}, objects:{notebook:'机上の開いたノート', laptop:'机上のノートPC'}}, night:{summary:'作画・検品を経て完成', location:'同じ机と窓。夜空とデスクライトが時間の経過を示す。', costumes:{a:'同じ淡色スウェット',b:'同じ黒ハイネックと白シャツ'}, objects:{notebook:'開いたノート',laptop:'完成ページを表示するノートPC'}}};
w.cast.a.name='ユイ';w.cast.a.description='成人女性の作者。短い黒ボブ、本人の左こめかみに三角ヘアピン。淡色スウェット。';w.cast.a.faceDesign.traits=['丸い大きな目と弧を描く上まぶた','短く細い眉','丸い頬と小さく柔らかい顎'];
w.cast.b.name='レン';w.cast.b.description='成人男性の制作案内役。後ろへ流した短い明るい髪、丸眼鏡。黒ハイネックに白シャツ。';w.cast.b.faceDesign.traits=['細い目と丸い細縁眼鏡','太くまっすぐな眉','角張った顎'];
for(const c of [w.cast.a,w.cast.b])c.faceDesign.settingBasis='紹介用書き下ろし原作に外見指定なし。漫画用創作。assets/characters.png で基準化。';
const specs=[
['01-1',24,400,['a'],'机で原稿を前に悩むユイのバストアップ。ユイは左寄り、顔の中心はページ座標(300,250)。両手は机に自然に置く。右半分を白く空ける。窓に夕空。','物語は書けた。でも、漫画にするには？','a'],
['01-2',448,430,['b'],'案内を申し出るレンのバストアップ。レンは左寄り、顔中心は(300,660)。両手は画面下の外。右半分を白く空ける。背景は白。','Codexでmanga-generatorを使おう。原作から一緒に組み立てるよ。','b'],
['01-3',902,570,['b','a'],'机で原稿を読んで脚本とコマ割りを考える二人。レンは画面右寄り、顔中心(700,1200)、ユイは画面左寄り、顔中心(280,1300)。上部240pxは台詞用の白余白。下部に文字なしの原稿とコマ割り。二人の手は下端の机の向こうで隠れる。','まず全文を読み、台詞と見せ場を設計する。','b','大事な気持ちを残すんだね。','a'],
['02-1',24,430,['b'],'レンのバストアップ。顔中心(300,260)。背景に簡略なキャラ顔の線画や人の顔を描かない。左下に文字なしのコマ枠だけを描いたモニター。レンの手は画面外。右半分は白余白。','基準画像から作画。文字は後で組む。','b'],
['02-2',478,430,['a'],'画面を真剣に見て点検するユイ。顔中心(300,700)、左寄り。手は画面外。右側は白余白。机と窓の一部、窓は夜空。','顔や手、読順も実物を見て直す！','a'],
['02-3',932,540,['a','b'],'完成した漫画を見て嬉しそうな二人。ユイは右寄り顔中心(700,1270)、レンは左寄り顔中心(280,1270)。上部250pxは台詞用白余白。夜の同じ机。下端に新しい開いたノートと完成した漫画のコマ枠を表示するPC。手は机より下で画面外。','私の物語が、漫画になった！','a','読書画面・PNG・PDFと、再現パッケージまで。','b']
];
w.pages=[{id:'01',section:'desk',purpose:'原作から漫画へ踏み出し、設計の大切さを知る',expectation:'設計した漫画をどう描き仕上げるか',panels:[]},{id:'02',section:'night',purpose:'作画と独立検品を経た完成と、次の創作への意欲',expectation:'ユイが次の物語へ進む余韻',panels:[]}];
for(const s of specs){const [id,y,h,actors,scene,t,sp,t2,sp2]=s;const multi=actors.length===2;const speakers={};for(const actor of actors){const cx=multi?(actor==='b'&&id==='01-3'||actor==='a'&&id==='02-3'?700:280):300;const cy=multi?(id==='01-3'?(actor==='b'?1200:1300):1270):y+220;speakers[actor]={anchor:[cx,cy+40],face:[cx-70,cy-90,140,175]};}
const dialogue=[{speaker:sp,text:t,side:'right',x:multi?750:760,dy:20,capacity:12}];if(t2)dialogue.push({speaker:sp2,text:t2,side:'left',x:200,dy:50,capacity:12});
if(id==='02-2')dialogue.push({speaker:'narration',text:'別担当の独立レビューで、気づいた不備を修正。',side:'left',x:610,dy:225,capacity:12});
if(id==='02-3'){dialogue.push({speaker:'narration',text:'採用素材から組版を再現。新規生成で同じ絵が出る保証ではありません。',side:'right',x:790,dy:330,capacity:15});dialogue.push({speaker:'narration',text:'次の物語も、描き出そう。',side:'left',x:230,dy:350,capacity:12});}
const p={id,order:Number(id.slice(-1)),rect:[24,y,976,h],section:id.startsWith('01')?'desk':'night',role:id==='02-3'?'達成と余韻':'説明と反応',beat:t,scene,action:scene,emotion:id==='01-1'?'不安':id==='02-3'?'達成感':'好奇心と集中',camera:multi?'机越しの二人のミディアムショット':'バストアップ',state:{time:id.startsWith('01')?'夕方':'夜'},production:{moment:scene,before:id==='01-1'?'物語を書き終えた':'直前の説明や作業を受ける',after:id==='02-3'?'次の物語をノートに書き始める':'次の工程へ進む',hands:Object.fromEntries(actors.map(a=>[a,{left:id==='01-1'?'空手、机の上':'空手、画面外または机で隠れる',right:id==='01-1'?'空手、机の上':'空手、画面外または机で隠れる'}])),props:[]},speakers,dialogue};w.pages[id.startsWith('01')?0:1].panels.push(p);}
fs.writeFileSync(file,JSON.stringify(w,null,2)+'\n');
const source=fs.readFileSync(`${base}/source/original.txt`,'utf8');fs.writeFileSync(`${base}/workflow/source-coverage.json`,JSON.stringify({sourceHash:crypto.createHash('sha256').update(source).digest('hex'),spans:[{start:0,end:source.length,panels:specs.map(s=>s[0]),adaptation:'起を01-1と01-2、承を01-3、転の作画を02-1、実物の検品と独立レビューを02-2、結の達成・配布・組版再現の限定・次への意欲を02-3に配置。外見は漫画用補足。'}]},null,2)+'\n');
