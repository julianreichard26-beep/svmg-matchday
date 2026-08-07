import { useState, useRef, useEffect, useLayoutEffect } from "react";
import html2canvas from "html2canvas";

function loadLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function findLogoInLib(name, lib) {
  if (!name) return null;
  const n = name.toLowerCase();
  const match = (lib||[]).find(e => n.includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(n));
  return match ? match.logo : null;
}

const POST_TYPES = [
  { id: "matchday", label: "⚽ Spieltag-Ankündigung" },
  { id: "result",   label: "🏁 Spielbericht" },
  { id: "schedule", label: "🗓️ Spielplan" },
];
const MOODS = ["motivierend", "emotional", "lässig", "professionell", "humorvoll"];
const FONTS = [
  { id: "'Comic Sans MS','Chalkboard SE',cursive", label: "Comic Sans" },
  { id: "'Bebas Neue',cursive",                    label: "Bebas Neue" },
  { id: "'Anton',sans-serif",                      label: "Anton" },
  { id: "'Oswald',sans-serif",                     label: "Oswald" },
  { id: "'Bangers',cursive",                       label: "Bangers" },
  { id: "'Russo One',sans-serif",                  label: "Russo One" },
  { id: "'Righteous',cursive",                     label: "Righteous" },
  { id: "'Permanent Marker',cursive",              label: "Marker" },
  { id: "'Impact','Arial Narrow',sans-serif",      label: "Impact" },
  { id: "'Arial Black','Arial',sans-serif",        label: "Arial Black" },
  { id: "'Georgia',serif",                         label: "Georgia" },
];
const FORMATS = [
  { id: "square",   label: "⬛ Quadrat", sub: "1:1",  ratio: "1/1" },
  { id: "portrait", label: "📱 Hoch",    sub: "4:5",  ratio: "4/5" },
  { id: "story",    label: "📲 Story",   sub: "9:16", ratio: "9/16" },
];
const BLANK = {
  postType:"matchday", homeTeam:"", awayTeam:"",
  rawDate:"", league:"", matchday:"",
  extraLines:["Team II – 14:00 Uhr","Team I  – 16:00 Uhr","anschließend Saisonabschlussfeier"],
  team1Name:"Team I",  team1GoalsHome:"", team1GoalsAway:"", team1ScorersHome:"", team1ScorersAway:"", team1SvmgSide:"home",
  team2Name:"Team II", team2GoalsHome:"", team2GoalsAway:"", team2ScorersHome:"", team2ScorersAway:"", team2SvmgSide:"home",
  mood:"motivierend", font:"'Comic Sans MS','Chalkboard SE',cursive",
  format:"square", hashtags:"#SVMG #Amateurfußball", homeLogo:null, awayLogo:null, bgImage:null,
  scheduleTitle:"TEAM I", ownLogo:null,
  schedScale:100, schedX:0, schedY:0,
  sections:[{ name:"Testspiele", matches:[{ opponent:"", isHome:true, date:"", time:"" }] }],
};

// Aus Screenshot erkannte Spiele
function ImgUpload({ label, value, onChange, h=90 }) {
  const ref = useRef();
  const pick = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => onChange(ev.target.result);
    r.readAsDataURL(f);
  };
  return (
    <div>
      {label && <div style={{fontSize:11,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",color:"rgba(255,255,255,0.45)",marginBottom:6}}>{label}</div>}
      <div onClick={()=>ref.current.click()} style={{width:"100%",height:h,borderRadius:10,border:`2px dashed ${value?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.3)"}`,backgroundImage:value?`url("${value}")`:"none",backgroundSize:"contain",backgroundRepeat:"no-repeat",backgroundPosition:"center",backgroundColor:value?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.07)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",userSelect:"none",color:"rgba(255,255,255,0.4)",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>
        {!value && <><span style={{fontSize:20,marginBottom:4}}>📁</span>Hochladen</>}
        <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={pick}/>
      </div>
      {value && <button onClick={()=>onChange(null)} style={{marginTop:5,background:"rgba(255,60,60,0.15)",border:"1px solid rgba(255,60,60,0.35)",borderRadius:6,padding:"3px 10px",color:"#ff8080",fontSize:11,cursor:"pointer"}}>✕ Entfernen</button>}
    </div>
  );
}

function SplashTop({ dim }) {
  return (
    <svg viewBox="0 0 980 220" style={{position:"absolute",top:0,left:0,width:"100%",pointerEvents:"none",zIndex:1,opacity:dim?0.35:1}} preserveAspectRatio="none">
      <path d="M0,0 L980,0 L980,155 Q820,210 650,175 Q480,140 310,180 Q160,210 0,175 Z" fill="#2233d4"/>
      <ellipse cx="900" cy="28" rx="65" ry="20" fill="#2233d4" transform="rotate(-18,900,28)"/>
      <ellipse cx="55" cy="22" rx="58" ry="18" fill="#2233d4" transform="rotate(14,55,22)"/>
    </svg>
  );
}
function SplashBottom({ dim }) {
  return (
    <svg viewBox="0 0 980 220" style={{position:"absolute",bottom:0,left:0,width:"100%",pointerEvents:"none",zIndex:1,opacity:dim?0.35:1}} preserveAspectRatio="none">
      <path d="M0,220 L980,220 L980,65 Q820,15 650,50 Q480,85 310,42 Q160,10 0,48 Z" fill="#1a22b8"/>
      <ellipse cx="910" cy="200" rx="58" ry="18" fill="#1a22b8" transform="rotate(12,910,200)"/>
      <ellipse cx="65" cy="198" rx="52" ry="16" fill="#1a22b8" transform="rotate(-14,65,198)"/>
    </svg>
  );
}

function DragText({ id, positions, onMove, children, style }) {
  const dragging = useRef(false);
  const start = useRef({mx:0,my:0,ox:0,oy:0});
  const pos = positions[id] || {x:0,y:0};
  const move2 = e => {
    if (!dragging.current) return;
    e.preventDefault();
    const cl = e.touches ? e.touches[0] : e;
    onMove(id, {x: start.current.ox+(cl.clientX-start.current.mx), y: start.current.oy+(cl.clientY-start.current.my)});
  };
  const up = () => {
    dragging.current = false;
    window.removeEventListener("mousemove", move2);
    window.removeEventListener("mouseup", up);
    window.removeEventListener("touchmove", move2);
    window.removeEventListener("touchend", up);
  };
  const down = e => {
    e.preventDefault();
    dragging.current = true;
    const cl = e.touches ? e.touches[0] : e;
    start.current = {mx:cl.clientX, my:cl.clientY, ox:pos.x, oy:pos.y};
    window.addEventListener("mousemove", move2);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move2, {passive:false});
    window.addEventListener("touchend", up);
  };
  return (
    <div onMouseDown={down} onTouchStart={down} style={{position:"absolute",left:"50%",top:"50%",transform:`translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,cursor:"grab",userSelect:"none",zIndex:10,...style}}>
      {children}
    </div>
  );
}

function LogoBox({ src, alt, size=70 }) {
  return (
    <div style={{width:size,height:size,borderRadius:size*0.14,background:"#fff",border:"2px solid rgba(20,40,150,0.12)",display:"flex",alignItems:"center",justifyContent:"center",padding:size*0.06,flexShrink:0,boxShadow:"0 2px 8px rgba(20,30,90,0.15)"}}>
      {src ? <img src={src} alt={alt} style={{width:"100%",height:"100%",objectFit:"contain"}}/> : <span style={{fontSize:size*0.4}}>🛡️</span>}
    </div>
  );
}

const INK = "#15319e";
const PAINT = "#1a3fd6";
const TITLE_FONT = "'Arial Black','Helvetica Neue',Arial,sans-serif";

function PaintCorner({ corner }) {
  const isBR = corner === "br";
  return (
    <svg viewBox="0 0 220 220" style={{
      position:"absolute",
      top: isBR ? "auto" : 0, left: isBR ? "auto" : 0,
      bottom: isBR ? 0 : "auto", right: isBR ? 0 : "auto",
      width:"46%", height:"32%",
      transform: isBR ? "rotate(180deg)" : "none",
      zIndex:1, pointerEvents:"none",
    }} preserveAspectRatio="none">
      <path d="M0,0 L170,0 L120,22 L150,40 L85,58 L115,78 L55,96 L75,118 L20,132 L35,158 L0,150 Z" fill={PAINT} opacity="0.92"/>
      <path d="M0,0 L95,0 L60,14 L80,26 L35,40 L0,32 Z" fill="#ffffff" opacity="0.14"/>
      <circle cx="185" cy="60" r="6" fill={PAINT} opacity="0.7"/>
      <circle cx="200" cy="90" r="3.5" fill={PAINT} opacity="0.5"/>
      <circle cx="40" cy="168" r="4.5" fill={PAINT} opacity="0.55"/>
    </svg>
  );
}

function ChevronAccent({ side }) {
  const isLeft = side === "left";
  return (
    <svg viewBox="0 0 40 70" style={{
      position:"absolute", top:"44%",
      left: isLeft ? 0 : "auto", right: isLeft ? "auto" : 0,
      width:"7%", height:"11%",
      transform: isLeft ? "scaleX(-1)" : "none",
      zIndex:1, pointerEvents:"none",
    }}>
      <path d="M2 2 L26 35 L2 68" stroke={PAINT} strokeWidth="6" fill="none" opacity="0.85" strokeLinecap="round"/>
      <path d="M16 2 L36 35 L16 68" stroke={PAINT} strokeWidth="6" fill="none" opacity="0.6" strokeLinecap="round"/>
    </svg>
  );
}

function BrushUnderline({ width="58%" }) {
  return (
    <svg viewBox="0 0 300 22" style={{width, display:"block", margin:"6px auto 0"}}>
      <path d="M5,12 Q45,3 90,10 T180,9 T295,13" stroke={PAINT} strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.9"/>
    </svg>
  );
}

function PosterFrame({ aspect, children }) {
  return (
    <div style={{width:"100%",aspectRatio:aspect,position:"relative",borderRadius:14,overflow:"hidden",background:"#ffffff",boxShadow:"0 8px 40px rgba(20,30,90,0.25)",border:"2px solid rgba(20,30,90,0.08)"}}>
      <PaintCorner corner="tl"/>
      <PaintCorner corner="br"/>
      <ChevronAccent side="right"/>
      <ChevronAccent side="left"/>
      <div style={{position:"absolute",inset:"4.5%",border:`1.5px solid ${PAINT}`,opacity:0.5,zIndex:0,pointerEvents:"none"}}/>
      <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
        {children}
      </div>
    </div>
  );
}

function ResultPoster({ d, positions, onMove, editMode }) {
  const fmt = FORMATS.find(f=>f.id===d.format)||FORMATS[0];
  const dateStr = d.rawDate ? new Date(d.rawDate+"T12:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}) : "";
  const db = editMode ? "1px dashed rgba(20,30,90,0.5)" : "none";
  const dp = editMode ? "4px 8px" : "0";
  return (
    <PosterFrame aspect={fmt.ratio}>
      {d.bgImage && (
        <div style={{position:"absolute",inset:0,zIndex:0,overflow:"hidden"}}>
          <img src={d.bgImage} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:(d.bgOpacity??20)/100,transform:`scale(${(d.bgScale??100)/100}) translate(${d.bgX??0}%, ${d.bgY??0}%)`,transformOrigin:"center"}}/>
        </div>
      )}
      {/* TOP */}
      <div style={{flex:"0 0 24%",position:"relative",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",paddingTop:"2%"}}>
        <DragText id="resulttitle" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,textAlign:"center",whiteSpace:"nowrap"}}>
          <div style={{position:"relative",zIndex:2,textAlign:"center"}}>
            <div style={{fontFamily:TITLE_FONT,fontWeight:900,fontSize:"clamp(22px,7.5vw,40px)",color:PAINT,letterSpacing:1,lineHeight:1,textTransform:"uppercase"}}>Spielbericht</div>
            <BrushUnderline width="46%"/>
          </div>
        </DragText>
        <DragText id="date" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,textAlign:"center",top:"78%",whiteSpace:"nowrap"}}>
          <div style={{fontFamily:d.font,fontStyle:"italic",fontWeight:700,fontSize:"clamp(12px,4vw,18px)",color:INK,position:"relative",zIndex:2}}>{dateStr||"Datum"}</div>
          {d.league && <div style={{fontSize:"clamp(9px,2.2vw,11px)",color:"rgba(20,40,150,0.55)",letterSpacing:1,textTransform:"uppercase",position:"relative",zIndex:2}}>{d.league}</div>}
        </DragText>
      </div>
      {/* MIDDLE */}
      <div style={{flex:"0 0 20%",position:"relative",display:"flex",alignItems:"center",justifyContent:"center",gap:16,padding:"0 6%"}}>
        <div style={{position:"relative",zIndex:2}}><LogoBox src={d.homeLogo} alt="Heim"/></div>
        <div style={{fontFamily:TITLE_FONT,fontWeight:900,fontSize:"clamp(16px,5.5vw,30px)",color:PAINT,position:"relative",zIndex:2}}>VS</div>
        <div style={{position:"relative",zIndex:2}}><LogoBox src={d.awayLogo} alt="Gast"/></div>
      </div>
      {/* BOTTOM */}
      <div style={{flex:1,position:"relative"}}>
        <DragText id="t1name" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,textAlign:"center",whiteSpace:"nowrap",top:"16%"}}>
          <div style={{fontFamily:d.font,fontStyle:"italic",fontWeight:700,fontSize:"clamp(13px,4vw,20px)",color:INK,position:"relative",zIndex:2}}>{d.team1Name||"Team I"}</div>
        </DragText>
        <DragText id="t1score" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,width:"88%",top:"30%"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,position:"relative",zIndex:2}}>
            <div style={{fontSize:"clamp(8px,2.2vw,11px)",color:"rgba(20,40,150,0.7)",lineHeight:1.6,flex:1}}>
              {d.team1ScorersHome && d.team1ScorersHome.split("\n").map((s,i)=><div key={i}>{s}</div>)}
            </div>
            <div style={{fontFamily:TITLE_FONT,fontWeight:900,fontSize:"clamp(26px,8.5vw,46px)",color:PAINT,lineHeight:1,flexShrink:0}}>
              {d.team1GoalsHome||"–"}:{d.team1GoalsAway||"–"}
            </div>
            <div style={{fontSize:"clamp(8px,2.2vw,11px)",color:"rgba(20,40,150,0.7)",lineHeight:1.6,flex:1,textAlign:"right"}}>
              {d.team1ScorersAway && d.team1ScorersAway.split("\n").map((s,i)=><div key={i}>{s}</div>)}
            </div>
          </div>
        </DragText>
        <DragText id="divider" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,width:"88%",top:"52%"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,position:"relative",zIndex:2}}>
            <div style={{flex:1,height:1,background:"rgba(20,40,150,0.25)"}}/>
            <div style={{width:7,height:7,background:PAINT,transform:"rotate(45deg)",flexShrink:0,opacity:0.6}}/>
            <div style={{flex:1,height:1,background:"rgba(20,40,150,0.25)"}}/>
          </div>
        </DragText>
        <DragText id="t2name" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,textAlign:"center",whiteSpace:"nowrap",top:"62%"}}>
          <div style={{fontFamily:d.font,fontStyle:"italic",fontWeight:700,fontSize:"clamp(13px,4vw,20px)",color:INK,position:"relative",zIndex:2}}>{d.team2Name||"Team II"}</div>
        </DragText>
        <DragText id="t2score" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,width:"88%",top:"76%"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,position:"relative",zIndex:2}}>
            <div style={{fontSize:"clamp(8px,2.2vw,11px)",color:"rgba(20,40,150,0.7)",lineHeight:1.6,flex:1}}>
              {d.team2ScorersHome && d.team2ScorersHome.split("\n").map((s,i)=><div key={i}>{s}</div>)}
            </div>
            <div style={{fontFamily:TITLE_FONT,fontWeight:900,fontSize:"clamp(26px,8.5vw,46px)",color:PAINT,lineHeight:1,flexShrink:0}}>
              {d.team2GoalsHome||"–"}:{d.team2GoalsAway||"–"}
            </div>
            <div style={{fontSize:"clamp(8px,2.2vw,11px)",color:"rgba(20,40,150,0.7)",lineHeight:1.6,flex:1,textAlign:"right"}}>
              {d.team2ScorersAway && d.team2ScorersAway.split("\n").map((s,i)=><div key={i}>{s}</div>)}
            </div>
          </div>
        </DragText>
        {d.hashtags && (
          <DragText id="hashtags" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,top:"93%",whiteSpace:"nowrap"}}>
            <div style={{fontSize:"clamp(7px,1.8vw,10px)",color:"rgba(20,40,150,0.45)",letterSpacing:.5,position:"relative",zIndex:2}}>{d.hashtags.split(" ").map(t=>t.startsWith("#")?t:`#${t}`).join(" ")}</div>
          </DragText>
        )}
      </div>
    </PosterFrame>
  );
}

function MatchdayPoster({ d, caption, positions, onMove, editMode }) {
  const fmt = FORMATS.find(f=>f.id===d.format)||FORMATS[0];
  const dateStr = d.rawDate ? new Date(d.rawDate+"T12:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}) : "";
  const allLines = (d.extraLines||[]).filter(Boolean);
  const db = editMode ? "1px dashed rgba(20,30,90,0.5)" : "none";
  const dp = editMode ? "4px 8px" : "0";
  return (
    <PosterFrame aspect={fmt.ratio}>
      {d.bgImage && (
        <div style={{position:"absolute",inset:0,zIndex:0,overflow:"hidden"}}>
          <img src={d.bgImage} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:(d.bgOpacity??20)/100,transform:`scale(${(d.bgScale??100)/100}) translate(${d.bgX??0}%, ${d.bgY??0}%)`,transformOrigin:"center"}}/>
        </div>
      )}
      {/* TOP */}
      <div style={{flex:"0 0 38%",position:"relative",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",paddingTop:"2%"}}>
        <DragText id="title" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,textAlign:"center",whiteSpace:"nowrap"}}>
          <div style={{position:"relative",zIndex:2,textAlign:"center"}}>
            <div style={{fontFamily:TITLE_FONT,fontWeight:900,fontSize:"clamp(28px,9.5vw,54px)",color:PAINT,letterSpacing:1,lineHeight:1,textTransform:"uppercase"}}>
              {d.matchday?d.matchday+". ":""}Spieltag
            </div>
            <BrushUnderline width="52%"/>
          </div>
        </DragText>
        <DragText id="date" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,textAlign:"center",top:"74%",whiteSpace:"nowrap"}}>
          {dateStr && <div style={{fontFamily:d.font,fontStyle:"italic",fontWeight:700,fontSize:"clamp(13px,4.5vw,22px)",color:INK,position:"relative",zIndex:2}}>{dateStr}</div>}
          {d.league && <div style={{fontSize:"clamp(9px,2.5vw,12px)",color:"rgba(20,40,150,0.55)",marginTop:2,letterSpacing:1,textTransform:"uppercase",position:"relative",zIndex:2}}>{d.league}</div>}
        </DragText>
      </div>
      {/* MIDDLE */}
      <div style={{flex:"0 0 26%",position:"relative",display:"flex",alignItems:"center",justifyContent:"center",gap:16,padding:"0 5%"}}>
        <div style={{position:"relative",zIndex:2}}><LogoBox src={d.homeLogo} alt="Heim"/></div>
        <div style={{fontFamily:TITLE_FONT,fontWeight:900,fontSize:"clamp(16px,5.5vw,30px)",color:PAINT,position:"relative",zIndex:2}}>VS</div>
        <div style={{position:"relative",zIndex:2}}><LogoBox src={d.awayLogo} alt="Gast"/></div>
      </div>
      {/* BOTTOM */}
      <div style={{flex:1,position:"relative"}}>
        <DragText id="lines" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,textAlign:"center",width:"85%"}}>
          <div style={{position:"relative",zIndex:2}}>
            {allLines.map((line,i)=>{
              const sm = line.length>22 && i===allLines.length-1;
              return <div key={i} style={{fontFamily:d.font,fontStyle:"italic",fontWeight:sm?600:700,fontSize:sm?"clamp(11px,3.5vw,16px)":"clamp(13px,5vw,26px)",color:sm?"rgba(20,40,150,0.65)":INK,lineHeight:1.3}}>{line}</div>;
            })}
          </div>
        </DragText>
        {caption && (
          <DragText id="caption" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,width:"85%",top:"80%"}}>
            <div style={{fontSize:"clamp(8px,2.2vw,11px)",color:"rgba(20,40,150,0.75)",lineHeight:1.5,background:"rgba(20,40,150,0.06)",borderRadius:7,padding:"5px 9px",textAlign:"left",position:"relative",zIndex:2}}>{caption}</div>
          </DragText>
        )}
        {d.hashtags && (
          <DragText id="hashtags" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,top:"92%",whiteSpace:"nowrap"}}>
            <div style={{fontSize:"clamp(7px,1.8vw,10px)",color:"rgba(20,40,150,0.45)",letterSpacing:.5,position:"relative",zIndex:2}}>{d.hashtags.split(" ").map(t=>t.startsWith("#")?t:`#${t}`).join(" ")}</div>
          </DragText>
        )}
      </div>
    </PosterFrame>
  );
}

function SchedulePoster({ d, logoLib, positions, onMove, editMode }) {
  const fmt = FORMATS.find(f=>f.id===d.format)||FORMATS[0];
  const db = editMode ? "1px dashed rgba(255,255,255,0.5)" : "none";
  const dp = editMode ? "4px 8px" : "0";
  const dateStr = raw => {
    if (!raw) return "TT.MM.JJJJ";
    const [y,m,day] = raw.split("-");
    return day && m && y ? `${day}.${m}.${y}` : raw;
  };

  const sections = d.sections||[];
  const totalMatches = sections.reduce((n,s)=>n+((s.matches||[]).length),0);
  const totalRows = totalMatches + sections.length;

  // Automatische Größenanpassung: misst tatsächlich, ob der Inhalt in den
  // verfügbaren Platz passt, und verkleinert so lange, bis es passt.
  const boxRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);
  const contentKey = `${totalRows}|${d.font}|${d.scheduleTitle}|${d.format}`;

  useEffect(() => { setScale(1); }, [contentKey]);

  useLayoutEffect(() => {
    const box = boxRef.current, inner = contentRef.current;
    if (!box || !inner) return;
    const avail = box.clientHeight;
    const needed = inner.scrollHeight;
    if (needed > avail + 1) {
      const next = Math.max(0.3, scale * (avail/needed) * 0.96);
      if (next < scale - 0.005) setScale(next);
    }
  }, [scale, contentKey]);

  const px = (min,vw,max) => `clamp(${(min*scale).toFixed(1)}px, ${(vw*scale).toFixed(2)}vw, ${(max*scale).toFixed(1)}px)`;
  const logoSize = Math.round(70*scale);

  return (
    <PosterFrame aspect={fmt.ratio}>
      {d.bgImage && (
        <div style={{position:"absolute",inset:0,zIndex:0,overflow:"hidden"}}>
          <img src={d.bgImage} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:(d.bgOpacity??20)/100,transform:`scale(${(d.bgScale??100)/100}) translate(${d.bgX??0}%, ${d.bgY??0}%)`,transformOrigin:"center"}}/>
        </div>
      )}
      {/* TITLE */}
      <div style={{flex:"0 0 20%",position:"relative",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",paddingTop:"2%"}}>
        <DragText id="title" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,textAlign:"center",whiteSpace:"nowrap"}}>
          <div style={{position:"relative",zIndex:2,textAlign:"center"}}>
            <div style={{fontFamily:TITLE_FONT,fontWeight:900,fontSize:"clamp(24px,8.5vw,46px)",color:PAINT,letterSpacing:1,lineHeight:1,textTransform:"uppercase"}}>
              {d.scheduleTitle || "TEAM I"}
            </div>
            <BrushUnderline width="48%"/>
          </div>
        </DragText>
      </div>
      {/* CONTENT */}
      <div ref={boxRef} style={{flex:1,position:"relative"}}>
        <div ref={contentRef} style={{position:"relative",zIndex:2,padding:"4% 7%",display:"flex",flexDirection:"column",justifyContent:"center",minHeight:"100%",transform:`scale(${(d.schedScale??100)/100}) translate(${d.schedX??0}%, ${d.schedY??0}%)`,transformOrigin:"center"}}>
          {sections.map((sec,si)=>(
            <div key={si} style={{marginBottom:`${(6*scale).toFixed(1)}%`}}>
              <div style={{fontFamily:d.font,fontStyle:"italic",fontWeight:900,fontSize:px(13,4,18),color:INK,textAlign:"center",letterSpacing:1,marginBottom:`${(4*scale).toFixed(1)}%`}}>{sec.name}</div>
              {(sec.matches||[]).map((m,mi)=>{
                const oppLogo = findLogoInLib(m.opponent, logoLib);
                const left  = m.isHome ? d.ownLogo : oppLogo;
                const right = m.isHome ? oppLogo   : d.ownLogo;
                return (
                  <div key={mi} style={{display:"flex",alignItems:"center",gap:"3%",marginBottom:`${(5*scale).toFixed(1)}%`}}>
                    <LogoBox src={left}  alt="Heim" size={logoSize}/>
                    <div style={{fontFamily:d.font,fontStyle:"italic",fontWeight:900,fontSize:px(14,4,20),color:PAINT,flexShrink:0}}>–</div>
                    <LogoBox src={right} alt="Gast" size={logoSize}/>
                    <div style={{width:2,alignSelf:"stretch",background:"rgba(20,40,150,0.25)",flexShrink:0}}/>
                    <div style={{fontFamily:d.font,fontStyle:"italic",fontWeight:900,color:INK,letterSpacing:1,lineHeight:1.4,flex:1,minWidth:0}}>
                      <div style={{fontSize:px(16,5,22),whiteSpace:"nowrap"}}>{dateStr(m.date)}</div>
                      <div style={{fontSize:px(10,3,14),color:"rgba(20,40,150,0.65)",whiteSpace:"nowrap"}}>{m.time?`${m.time} UHR`:"HH:MM UHR"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </PosterFrame>
  );
}

export default function App() {
  const [form, setForm]           = useState(() => ({...BLANK, ...loadLS("svmg_form", {})}));
  const [caption, setCaption]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [copied, setCopied]       = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showTpl, setShowTpl]     = useState(false);
  const [showLogos, setShowLogos] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [roster, setRoster]       = useState(() => loadLS("svmg_roster", []));
  const [newPlayer, setNewPlayer] = useState("");
  const [editMode, setEditMode]   = useState(false);
  const [allPositions, setAllPositions] = useState(() => loadLS("svmg_positions", { matchday: {}, result: {}, schedule: {} }));
  const positions = allPositions[form.postType] || {};
  const [slots, setSlots]         = useState(() => loadLS("svmg_slots", { matchday: null, result: null, schedule: null }));
  const [savedMsg, setSavedMsg]   = useState("");
  const [logoLib, setLogoLib]     = useState(() => loadLS("svmg_logos", []));
  const [newLogoName, setNewLogoName] = useState("");
  const [pendingLogo, setPendingLogo] = useState(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("svmg_apikey") || "");
  const [showApiKey, setShowApiKey] = useState(false);
  useEffect(() => { localStorage.setItem("svmg_apikey", apiKey); }, [apiKey]);
  const logoUploadRef = useRef(null);
  const posterRef = useRef(null);

  // Automatisch in localStorage speichern
  useEffect(() => { saveLS("svmg_form", form); }, [form]);
  useEffect(() => { saveLS("svmg_slots", slots); }, [slots]);
  useEffect(() => { saveLS("svmg_logos", logoLib); }, [logoLib]);
  useEffect(() => { saveLS("svmg_roster", roster); }, [roster]);
  useEffect(() => { saveLS("svmg_positions", allPositions); }, [allPositions]);

  // Logo-Bibliothek
  const handleLogoPick = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      // Bild verkleinern damit es in localStorage passt
      const img = new Image();
      img.onload = () => {
        const max = 200; // max 200px
        let { width, height } = img;
        if (width > height) { if (width > max) { height = height * max / width; width = max; } }
        else { if (height > max) { width = width * max / height; height = max; } }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        setPendingLogo(canvas.toDataURL("image/png"));
      };
      img.src = ev.target.result;
    };
    r.readAsDataURL(f);
    e.target.value = "";
  };
  const addToLib = () => {
    if (!pendingLogo || !newLogoName.trim()) return;
    const updated = [...logoLib, { name: newLogoName.trim(), logo: pendingLogo }];
    setLogoLib(updated);
    try {
      saveLS("svmg_logos", updated);
    } catch {
      alert("Speicher voll — bitte ein paar alte Logos löschen.");
    }
    setNewLogoName(""); setPendingLogo(null);
  };
  const removeFromLib = async (name) => {
    const updated = logoLib.filter(e => e.name !== name);
    setLogoLib(updated);
    saveLS("svmg_logos", updated);
  };

  // Kader
  const addPlayer = () => {
    const name = newPlayer.trim();
    if (!name || roster.includes(name)) return;
    setRoster([...roster, name].sort((a,b)=>a.localeCompare(b,"de")));
    setNewPlayer("");
  };
  const removePlayer = name => setRoster(roster.filter(p => p !== name));
  const appendScorer = (field, name) => {
    setForm(f => {
      const current = f[field] || "";
      const line = `' ${name}`;
      return { ...f, [field]: current ? `${current}\n${line}` : line };
    });
  };

  // Auto-Zuweisung
  const findLogo = name => findLogoInLib(name, logoLib);
  const setWithAutoLogo = (updates) => {
    setForm(f => {
      const next = {...f, ...updates};
      if (updates.homeTeam !== undefined) { const l = findLogo(updates.homeTeam); if (l) next.homeLogo = l; }
      if (updates.awayTeam !== undefined) { const l = findLogo(updates.awayTeam); if (l) next.awayLogo = l; }
      return next;
    });
  };

  const saveSlot = async (type) => {
    const data = {...form, _savedAt: new Date().toLocaleTimeString("de-DE", {hour:"2-digit", minute:"2-digit"})};
    const updated = {...slots, [type]: data};
    setSlots(updated);
    saveLS("svmg_slots", updated);
    setSavedMsg(type);
    setTimeout(() => setSavedMsg(""), 2000);
  };

  const loadSlot = (type) => {
    if (!slots[type]) return;
    setForm({...BLANK, ...slots[type]});
    setShowTpl(false);
  };

  const deleteSlot = async (type) => {
    const updated = {...slots, [type]: null};
    setSlots(updated);
    saveLS("svmg_slots", updated);
  };

  const set = (k,v) => {
    if (k === "homeTeam" || k === "awayTeam") {
      setWithAutoLogo({[k]: v});
    } else {
      setForm(f=>({...f,[k]:v}));
    }
  };
  const setLine = (i,v) => setForm(f=>{const l=[...f.extraLines];l[i]=v;return{...f,extraLines:l};});
  const addLine = () => setForm(f=>({...f,extraLines:[...f.extraLines,""]}));
  const removeLine = i => setForm(f=>({...f,extraLines:f.extraLines.filter((_,j)=>j!==i)}));

  // Spielplan (Rubriken & Spiele)
  const addSection = () => setForm(f=>({...f,sections:[...(f.sections||[]),{name:"Neue Rubrik",matches:[{opponent:"",isHome:true,date:"",time:""}]}]}));
  const removeSection = si => setForm(f=>({...f,sections:(f.sections||[]).filter((_,i)=>i!==si)}));
  const setSectionName = (si,name) => setForm(f=>{const s=[...(f.sections||[])];s[si]={...s[si],name};return{...f,sections:s};});
  const addMatch = si => setForm(f=>{const s=[...(f.sections||[])];s[si]={...s[si],matches:[...(s[si].matches||[]),{opponent:"",isHome:true,date:"",time:""}]};return{...f,sections:s};});
  const removeMatch = (si,mi) => setForm(f=>{const s=[...(f.sections||[])];s[si]={...s[si],matches:(s[si].matches||[]).filter((_,j)=>j!==mi)};return{...f,sections:s};});
  const setMatchField = (si,mi,key,val) => setForm(f=>{const s=[...(f.sections||[])];const matches=[...(s[si].matches||[])];matches[mi]={...matches[mi],[key]:val};s[si]={...s[si],matches};return{...f,sections:s};});
  const onMove = (id,pos) => setAllPositions(p => ({...p, [form.postType]: {...(p[form.postType]||{}), [id]: pos}}));

  const generate = async () => {
    if (!apiKey) { alert("Bitte zuerst oben rechts den API-Key eingeben (⚙️)."); return; }
    setLoading(true); setCaption("");
    const dateStr = form.rawDate ? new Date(form.rawDate+"T12:00:00").toLocaleDateString("de-DE") : "";
    const isResult = form.postType==="result";
    const prompt = isResult
      ? `Amateurfußball Spielbericht Post. Nur Text, kein Intro. 3-4 Sätze + Emojis.\n${form.homeTeam} vs ${form.awayTeam} | ${form.team1Name}: ${form.team1GoalsHome}:${form.team1GoalsAway} | ${form.team2Name}: ${form.team2GoalsHome}:${form.team2GoalsAway} | Liga: ${form.league||"Amateurfußball"} | Ton: ${form.mood}`
      : `Spieltag-Ankündigung Instagram. Nur Text, kein Intro. 2-3 Sätze + Emojis.\n${form.homeTeam} vs ${form.awayTeam} | ${form.matchday?form.matchday+". Spieltag":""} | ${dateStr} | Liga: ${form.league||"Amateurfußball"} | Ton: ${form.mood}`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:600,messages:[{role:"user",content:prompt}]})});
      const data = await res.json();
      setCaption((data.content||[]).map(b=>b.text||"").join("").trim());
    } catch { setCaption("Verbindungsfehler."); }
    setLoading(false);
  };

  const downloadPoster = async () => {
    setDownloading(true);
    try {
      const canvas = await html2canvas(posterRef.current,{scale:3,useCORS:true,allowTaint:true,backgroundColor:null});
      const filename = `matchday-${form.homeTeam||form.scheduleTitle||"post"}.png`.replace(/\s+/g,"-");
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      const file = new File([blob], filename, { type: "image/png" });

      // iOS/Safari: natives Teilen-Menü mit "In Fotos sichern" (funktioniert dort zuverlässiger als der Download-Link)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filename });
        } catch (shareErr) {
          if (!shareErr || shareErr.name !== "AbortError") {
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
            setTimeout(() => URL.revokeObjectURL(url), 10000);
          }
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.download = filename;
        a.href = url;
        a.click();
        // Fallback: Bild zusätzlich in neuem Tab öffnen, falls der Download-Link vom Browser ignoriert wird
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch (e) {
      if (e && e.name !== "AbortError") alert("Download fehlgeschlagen.");
    }
    setDownloading(false);
  };

  const isResult = form.postType==="result";
  const isSchedule = form.postType==="schedule";
  const fullText = [caption, form.hashtags?"\n\n"+form.hashtags.split(" ").map(t=>t.startsWith("#")?t:`#${t}`).join(" "):""].join("");
  const card = {background:"rgba(255,255,255,0.04)",borderRadius:12,padding:16,border:"1px solid rgba(255,255,255,0.07)"};

  return (
    <div style={{minHeight:"100vh",background:"#090e3a",fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#fff"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Anton&family=Oswald:wght@700&family=Bangers&family=Russo+One&family=Righteous&family=Permanent+Marker&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input,select,textarea{background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.15);border-radius:8px;padding:9px 12px;color:#fff;font-family:inherit;font-size:14px;outline:none;width:100%;transition:border-color .2s}
        input:focus,select:focus,textarea:focus{border-color:#6eb4ff}
        input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.22)}
        textarea{resize:vertical;min-height:60px}
        label{font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:rgba(255,255,255,0.45);display:block;margin-bottom:5px}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Header */}
      <div style={{background:"linear-gradient(90deg,#2233d4,#1018b0)",borderBottom:"3px solid rgba(255,255,255,0.18)",padding:"14px 22px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:26}}>⚽</span>
          <div>
            <div style={{fontFamily:"'Comic Sans MS',cursive",fontStyle:"italic",fontWeight:700,fontSize:20}}>Matchday Post Generator</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",letterSpacing:1,textTransform:"uppercase"}}>SV Maierhöfen-Grünenbach</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowApiKey(v=>!v)} style={{background:apiKey?"rgba(46,204,113,0.2)":"rgba(255,100,100,0.2)",border:`1.5px solid ${apiKey?"#2ecc71":"#ff6b6b"}`,borderRadius:8,padding:"8px 14px",color:apiKey?"#2ecc71":"#ff6b6b",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            ⚙️ API-Key {apiKey?"✓":"!"}
          </button>
          <button onClick={()=>setShowLogos(v=>!v)} style={{background:"rgba(255,255,255,0.1)",border:"1.5px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"8px 14px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            🛡️ Logos {logoLib.length>0&&<span style={{background:"#2233d4",borderRadius:10,padding:"1px 7px",fontSize:11,marginLeft:4}}>{logoLib.length}</span>}
          </button>
          <button onClick={()=>setShowRoster(v=>!v)} style={{background:"rgba(255,255,255,0.1)",border:"1.5px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"8px 14px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            👥 Kader {roster.length>0&&<span style={{background:"#2233d4",borderRadius:10,padding:"1px 7px",fontSize:11,marginLeft:4}}>{roster.length}</span>}
          </button>
          <button onClick={()=>setShowTpl(v=>!v)} style={{background:"rgba(255,255,255,0.1)",border:"1.5px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"8px 14px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            💾 Vorlagen
          </button>
        </div>
      </div>

      {/* API Key Panel */}
      {showApiKey && (
        <div style={{background:"#111a4a",borderBottom:"1px solid rgba(255,255,255,0.1)",padding:"14px 22px"}}>
          <div style={{maxWidth:1080,margin:"0 auto"}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"rgba(255,255,255,0.7)"}}>⚙️ Anthropic API-Key (für KI-Texte)</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:10}}>
              Kostenlosen Key holen auf <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{color:"#6eb4ff"}}>console.anthropic.com</a> → wird nur lokal in deinem Browser gespeichert.
            </div>
            <div style={{display:"flex",gap:8}}>
              <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-ant-..." style={{flex:1}}/>
              <button onClick={()=>setShowApiKey(false)} style={{background:"#2233d4",border:"none",borderRadius:8,padding:"9px 16px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>✓ OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Logo-Bibliothek Panel */}
      {showLogos && (
        <div style={{background:"#111a4a",borderBottom:"1px solid rgba(255,255,255,0.1)",padding:"16px 22px"}}>
          <div style={{maxWidth:1080,margin:"0 auto"}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"rgba(255,255,255,0.7)"}}>🛡️ Logo-Bibliothek — einmal hochladen, automatisch zuweisen</div>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
              <div onClick={()=>logoUploadRef.current.click()} style={{width:56,height:56,borderRadius:8,background:pendingLogo?`url("${pendingLogo}") center/contain no-repeat #fff`:"rgba(255,255,255,0.08)",border:"2px dashed rgba(255,255,255,0.25)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                {!pendingLogo && "📁"}
                <input ref={logoUploadRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleLogoPick}/>
              </div>
              <input value={newLogoName} onChange={e=>setNewLogoName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addToLib()} placeholder="Vereinsname (z. B. TSV Meckenbeuren)" style={{flex:1,minWidth:180,background:"rgba(255,255,255,0.08)",border:"1.5px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"9px 12px",color:"#fff",fontSize:14,outline:"none"}}/>
              <button onClick={addToLib} disabled={!pendingLogo||!newLogoName.trim()} style={{background:pendingLogo&&newLogoName.trim()?"#2233d4":"rgba(255,255,255,0.1)",border:"none",borderRadius:8,padding:"9px 18px",color:"#fff",fontWeight:700,fontSize:13,cursor:pendingLogo&&newLogoName.trim()?"pointer":"not-allowed",whiteSpace:"nowrap"}}>+ Hinzufügen</button>
            </div>
            {logoLib.length===0
              ? <div style={{fontSize:13,color:"rgba(255,255,255,0.3)"}}>Noch keine Logos. Wappen hochladen + Vereinsname eingeben.</div>
              : <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                  {logoLib.map(e=>(
                    <div key={e.name} style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"8px 12px",display:"flex",alignItems:"center",gap:10}}>
                      <img src={e.logo} alt={e.name} style={{width:36,height:36,objectFit:"contain",borderRadius:4,background:"#fff",padding:2}}/>
                      <span style={{fontSize:13,fontWeight:600}}>{e.name}</span>
                      <button onClick={()=>removeFromLib(e.name)} style={{background:"rgba(255,60,60,0.15)",border:"1px solid rgba(255,60,60,0.3)",borderRadius:6,padding:"3px 8px",color:"#ff8080",fontSize:12,cursor:"pointer"}}>✕</button>
                    </div>
                  ))}
                </div>
            }
            <div style={{marginTop:10,fontSize:11,color:"rgba(255,255,255,0.25)"}}>💡 Beim Tippen eines Vereinsnamens oder Laden eines Spiels wird das Logo automatisch zugewiesen.</div>
          </div>
        </div>
      )}

      {/* Kader Panel */}
      {showRoster && (
        <div style={{background:"#111a4a",borderBottom:"1px solid rgba(255,255,255,0.1)",padding:"16px 22px"}}>
          <div style={{maxWidth:1080,margin:"0 auto"}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"rgba(255,255,255,0.7)"}}>👥 Kader — einmal anlegen, bei Torschützen per Klick hinzufügen</div>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
              <input value={newPlayer} onChange={e=>setNewPlayer(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addPlayer()} placeholder="Spielername (z. B. S. Brauner)" style={{flex:1,minWidth:180,background:"rgba(255,255,255,0.08)",border:"1.5px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"9px 12px",color:"#fff",fontSize:14,outline:"none"}}/>
              <button onClick={addPlayer} disabled={!newPlayer.trim()} style={{background:newPlayer.trim()?"#2233d4":"rgba(255,255,255,0.1)",border:"none",borderRadius:8,padding:"9px 18px",color:"#fff",fontWeight:700,fontSize:13,cursor:newPlayer.trim()?"pointer":"not-allowed",whiteSpace:"nowrap"}}>+ Hinzufügen</button>
            </div>
            {roster.length===0
              ? <div style={{fontSize:13,color:"rgba(255,255,255,0.3)"}}>Noch keine Spieler. Namen eingeben und hinzufügen.</div>
              : <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                  {roster.map(name=>(
                    <div key={name} style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"6px 10px",display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:13,fontWeight:600}}>{name}</span>
                      <button onClick={()=>removePlayer(name)} style={{background:"rgba(255,60,60,0.15)",border:"1px solid rgba(255,60,60,0.3)",borderRadius:6,padding:"3px 8px",color:"#ff8080",fontSize:12,cursor:"pointer"}}>✕</button>
                    </div>
                  ))}
                </div>
            }
            <div style={{marginTop:10,fontSize:11,color:"rgba(255,255,255,0.25)"}}>💡 Bei "Torschützen" im Spielbericht kannst du auf einen Spieler klicken, statt den Namen zu tippen.</div>
          </div>
        </div>
      )}

      {showTpl && (
        <div style={{background:"#111a4a",borderBottom:"1px solid rgba(255,255,255,0.1)",padding:"16px 22px"}}>
          <div style={{maxWidth:1080,margin:"0 auto"}}>

            {/* Slots */}
            <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:16}}>
              {[{type:"matchday",label:"⚽ Spieltag-Ankündigung"},{type:"result",label:"🏁 Spielbericht"},{type:"schedule",label:"🗓️ Spielplan"}].map(({type,label})=>(
                <div key={type} style={{flex:1,minWidth:220,background:"rgba(255,255,255,0.05)",borderRadius:10,padding:14,border:"1px solid rgba(255,255,255,0.1)"}}>
                  <div style={{fontWeight:700,fontSize:12,marginBottom:10,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:.8}}>{label}</div>
                  {slots[type] ? (
                    <div>
                      <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",marginBottom:4}}>Gespeichert um {slots[type]._savedAt}</div>
                      <div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:10}}>{type==="schedule" ? (slots[type].scheduleTitle||"Spielplan") : `${slots[type].homeTeam||"–"} vs ${slots[type].awayTeam||"–"}`}</div>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>loadSlot(type)} style={{flex:1,background:"rgba(34,51,212,0.6)",border:"1px solid #6eb4ff",borderRadius:7,padding:"8px",color:"#6eb4ff",fontSize:13,fontWeight:700,cursor:"pointer"}}>📂 Laden</button>
                        <button onClick={()=>saveSlot(type)} style={{flex:1,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.18)",borderRadius:7,padding:"8px",color:"#fff",fontSize:12,cursor:"pointer"}}>🔄 Update</button>
                        <button onClick={()=>deleteSlot(type)} style={{background:"rgba(255,60,60,0.15)",border:"1px solid rgba(255,60,60,0.3)",borderRadius:7,padding:"8px 10px",color:"#ff8080",fontSize:13,cursor:"pointer"}}>✕</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{fontSize:12,color:"rgba(255,255,255,0.3)",marginBottom:10}}>Noch nichts gespeichert.</div>
                      <button onClick={()=>saveSlot(type)} style={{width:"100%",background:"#2233d4",border:"none",borderRadius:7,padding:"10px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>💾 Jetzt speichern</button>
                    </div>
                  )}
                  {savedMsg===type && <div style={{marginTop:8,fontSize:12,color:"#5dff8a",fontWeight:600}}>✅ Gespeichert!</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{maxWidth:1080,margin:"0 auto",padding:22,display:"flex",gap:22,alignItems:"flex-start"}}>

        {/* FORM */}
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:14}}>

          <div style={card}>
            <label style={{fontSize:13,marginBottom:10}}>Post-Typ</label>
            <div style={{display:"flex",gap:8}}>
              {POST_TYPES.map(t=>(
                <button key={t.id} onClick={()=>set("postType",t.id)} style={{flex:1,background:form.postType===t.id?"rgba(34,51,212,0.5)":"rgba(255,255,255,0.05)",border:`1.5px solid ${form.postType===t.id?"#6eb4ff":"rgba(255,255,255,0.1)"}`,borderRadius:8,padding:"10px",color:form.postType===t.id?"#6eb4ff":"rgba(255,255,255,0.55)",fontSize:14,fontWeight:600,cursor:"pointer"}}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div style={card}>
            <label style={{fontSize:13,marginBottom:10}}>Format</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {FORMATS.map(f=>(
                <button key={f.id} onClick={()=>set("format",f.id)} style={{background:form.format===f.id?"rgba(34,51,212,0.5)":"rgba(255,255,255,0.05)",border:`1.5px solid ${form.format===f.id?"#6eb4ff":"rgba(255,255,255,0.1)"}`,borderRadius:8,padding:"10px 8px",cursor:"pointer",textAlign:"center",display:"flex",flexDirection:"column",gap:3,alignItems:"center"}}>
                  <span style={{fontSize:20}}>{f.label.split(" ")[0]}</span>
                  <span style={{fontSize:12,fontWeight:700,color:form.format===f.id?"#6eb4ff":"#fff"}}>{f.label.split(" ").slice(1).join(" ")}</span>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>{f.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Wappen */}
          {!isSchedule && (
            <div style={card}>
              <label style={{fontSize:13,marginBottom:12}}>Vereinswappen</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <ImgUpload label="Heim-Wappen" value={form.homeLogo} onChange={v=>set("homeLogo",v)} h={100}/>
                <ImgUpload label="Gast-Wappen" value={form.awayLogo} onChange={v=>set("awayLogo",v)} h={100}/>
              </div>
            </div>
          )}

          {/* Hintergrundfoto */}
          <div style={card}>
            <label style={{fontSize:13,marginBottom:12}}>🖼️ Hintergrundfoto (optional)</label>
            <ImgUpload label="" value={form.bgImage} onChange={v=>set("bgImage",v)} h={110}/>
            {form.bgImage && (
              <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:10}}>
                {[
                  {key:"bgOpacity", label:"Helligkeit", min:5,  max:100, def:35, unit:"%"},
                  {key:"bgScale",   label:"Größe",      min:50, max:400, def:100, unit:"%"},
                  {key:"bgX",       label:"Position X", min:-50,max:50,  def:0,  unit:""},
                  {key:"bgY",       label:"Position Y", min:-50,max:50,  def:0,  unit:""},
                ].map(({key,label,min,max,def,unit})=>(
                  <div key={key} style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:12,color:"rgba(255,255,255,0.5)",width:72,flexShrink:0}}>{label}</span>
                    <input type="range" min={min} max={max} value={form[key]??def}
                      onChange={e=>set(key,parseInt(e.target.value))}
                      style={{flex:1,background:"transparent",border:"none",padding:0,accentColor:"#6eb4ff"}}/>
                    <span style={{fontSize:12,color:"rgba(255,255,255,0.5)",width:38,textAlign:"right"}}>{form[key]??def}{unit}</span>
                  </div>
                ))}
                <button onClick={()=>{set("bgOpacity",35);set("bgScale",100);set("bgX",0);set("bgY",0);}}
                  style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,padding:"6px",color:"rgba(255,255,255,0.4)",fontSize:12,cursor:"pointer"}}>
                  ↺ Zurücksetzen
                </button>
              </div>
            )}
          </div>

          {/* Spielplan-Editor (nur Spielplan) */}
          {isSchedule && (
            <>
              <div style={card}>
                <label style={{fontSize:13,marginBottom:12}}>Titel & eigenes Wappen</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <div><label>Titel</label><input value={form.scheduleTitle} onChange={e=>set("scheduleTitle",e.target.value)} placeholder="TEAM I"/></div>
                  <ImgUpload label="Eigenes Wappen (SVMG)" value={form.ownLogo} onChange={v=>set("ownLogo",v)} h={90}/>
                </div>
              </div>

              <div style={card}>
                <label style={{fontSize:13,marginBottom:4}}>↕️ Größe & Position (Spielliste)</label>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.32)",marginBottom:12}}>Die Liste passt sich automatisch an — hiermit kannst du zusätzlich manuell nachjustieren.</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {[
                    {key:"schedScale", label:"Größe",      min:50,  max:150, def:100, unit:"%"},
                    {key:"schedX",     label:"Position X", min:-50, max:50,  def:0,   unit:""},
                    {key:"schedY",     label:"Position Y", min:-50, max:50,  def:0,   unit:""},
                  ].map(({key,label,min,max,def,unit})=>(
                    <div key={key} style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:12,color:"rgba(255,255,255,0.5)",width:72,flexShrink:0}}>{label}</span>
                      <input type="range" min={min} max={max} value={form[key]??def}
                        onChange={e=>set(key,parseInt(e.target.value))}
                        style={{flex:1,background:"transparent",border:"none",padding:0,accentColor:"#6eb4ff"}}/>
                      <span style={{fontSize:12,color:"rgba(255,255,255,0.5)",width:38,textAlign:"right"}}>{form[key]??def}{unit}</span>
                    </div>
                  ))}
                  <button onClick={()=>{set("schedScale",100);set("schedX",0);set("schedY",0);}}
                    style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,padding:"6px",color:"rgba(255,255,255,0.4)",fontSize:12,cursor:"pointer"}}>
                    ↺ Zurücksetzen
                  </button>
                </div>
              </div>

              {(form.sections||[]).map((sec,si)=>(
                <div key={si} style={card}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
                    <input value={sec.name} onChange={e=>setSectionName(si,e.target.value)} placeholder="Rubrik (z. B. Testspiele)" style={{flex:1,fontWeight:700}}/>
                    <button onClick={()=>removeSection(si)} style={{background:"rgba(255,60,60,0.15)",border:"1px solid rgba(255,60,60,0.3)",borderRadius:6,padding:"8px 10px",color:"#ff8080",fontSize:13,cursor:"pointer",flexShrink:0}}>✕ Rubrik</button>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {(sec.matches||[]).map((m,mi)=>(
                      <div key={mi} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:10,display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          <div style={{gridColumn:"1/-1"}}><label>Gegner</label><input value={m.opponent} onChange={e=>setMatchField(si,mi,"opponent",e.target.value)} placeholder="TSV Meckenbeuren"/></div>
                          <div><label>Datum</label><input type="date" value={m.date} onChange={e=>setMatchField(si,mi,"date",e.target.value)}/></div>
                          <div><label>Uhrzeit</label><input type="time" value={m.time} onChange={e=>setMatchField(si,mi,"time",e.target.value)}/></div>
                          <div style={{gridColumn:"1/-1",display:"flex",gap:8}}>
                            <button onClick={()=>setMatchField(si,mi,"isHome",true)}  style={{flex:1,background:m.isHome?"rgba(34,51,212,0.5)":"rgba(255,255,255,0.05)",border:`1.5px solid ${m.isHome?"#6eb4ff":"rgba(255,255,255,0.1)"}`,borderRadius:7,padding:"7px",color:m.isHome?"#6eb4ff":"rgba(255,255,255,0.5)",fontSize:12,fontWeight:600,cursor:"pointer"}}>🏠 Heim</button>
                            <button onClick={()=>setMatchField(si,mi,"isHome",false)} style={{flex:1,background:!m.isHome?"rgba(34,51,212,0.5)":"rgba(255,255,255,0.05)",border:`1.5px solid ${!m.isHome?"#6eb4ff":"rgba(255,255,255,0.1)"}`,borderRadius:7,padding:"7px",color:!m.isHome?"#6eb4ff":"rgba(255,255,255,0.5)",fontSize:12,fontWeight:600,cursor:"pointer"}}>🚌 Auswärts</button>
                          </div>
                        </div>
                        <button onClick={()=>removeMatch(si,mi)} style={{background:"rgba(255,60,60,0.15)",border:"1px solid rgba(255,60,60,0.3)",borderRadius:6,padding:"8px 10px",color:"#ff8080",fontSize:13,cursor:"pointer",alignSelf:"start"}}>✕</button>
                      </div>
                    ))}
                    <button onClick={()=>addMatch(si)} style={{background:"rgba(255,255,255,0.05)",border:"1px dashed rgba(255,255,255,0.18)",borderRadius:8,padding:"8px",color:"rgba(255,255,255,0.38)",fontSize:12,cursor:"pointer"}}>+ Spiel hinzufügen</button>
                  </div>
                </div>
              ))}
              <button onClick={addSection} style={{background:"rgba(255,255,255,0.05)",border:"1px dashed rgba(255,255,255,0.18)",borderRadius:8,padding:"10px",color:"rgba(255,255,255,0.5)",fontSize:13,fontWeight:600,cursor:"pointer"}}>+ Rubrik hinzufügen</button>
            </>
          )}

          {/* Spieldaten */}
          {!isSchedule && (
            <div style={card}>
              <label style={{fontSize:13,marginBottom:12}}>Spieldaten</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label>Heimteam</label><input value={form.homeTeam} onChange={e=>set("homeTeam",e.target.value)} placeholder="SV Maierhöfen-Grünenbach"/></div>
                <div><label>Gastteam</label><input value={form.awayTeam} onChange={e=>set("awayTeam",e.target.value)} placeholder="TSV Meckenbeuren"/></div>
                <div><label>Liga</label><input value={form.league} onChange={e=>set("league",e.target.value)} placeholder="Kreisklasse A"/></div>
                <div><label>Spieltag</label><input value={form.matchday} onChange={e=>set("matchday",e.target.value)} placeholder="34"/></div>
                <div style={{gridColumn:"1/-1"}}><label>Datum</label><input type="date" value={form.rawDate} onChange={e=>set("rawDate",e.target.value)}/></div>
              </div>
            </div>
          )}

          {/* Spielbericht — 2 Teams */}
          {isResult && (
            <>
              <div style={card}>
                <label style={{fontSize:13,marginBottom:12}}>🥇 Erstes Team</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div style={{gridColumn:"1/-1"}}><label>Teamname</label><input value={form.team1Name} onChange={e=>set("team1Name",e.target.value)} placeholder="Team I"/></div>
                  <div style={{gridColumn:"1/-1",display:"flex",gap:8}}>
                    <button onClick={()=>set("team1SvmgSide","home")} style={{flex:1,background:form.team1SvmgSide==="home"?"rgba(34,51,212,0.5)":"rgba(255,255,255,0.05)",border:`1.5px solid ${form.team1SvmgSide==="home"?"#6eb4ff":"rgba(255,255,255,0.1)"}`,borderRadius:7,padding:"7px",color:form.team1SvmgSide==="home"?"#6eb4ff":"rgba(255,255,255,0.5)",fontSize:12,fontWeight:600,cursor:"pointer"}}>🏠 SVMG spielt Heim</button>
                    <button onClick={()=>set("team1SvmgSide","away")} style={{flex:1,background:form.team1SvmgSide==="away"?"rgba(34,51,212,0.5)":"rgba(255,255,255,0.05)",border:`1.5px solid ${form.team1SvmgSide==="away"?"#6eb4ff":"rgba(255,255,255,0.1)"}`,borderRadius:7,padding:"7px",color:form.team1SvmgSide==="away"?"#6eb4ff":"rgba(255,255,255,0.5)",fontSize:12,fontWeight:600,cursor:"pointer"}}>🚌 SVMG spielt Auswärts</button>
                  </div>
                  <div style={{display:"flex",alignItems:"flex-end",gap:8}}>
                    <div style={{flex:1}}><label>Heim-Tore</label><input value={form.team1GoalsHome} onChange={e=>set("team1GoalsHome",e.target.value)} placeholder="2" style={{textAlign:"center",fontSize:22,fontWeight:700}}/></div>
                    <span style={{fontSize:22,color:"rgba(255,255,255,0.3)",paddingBottom:8}}>:</span>
                    <div style={{flex:1}}><label>Gast-Tore</label><input value={form.team1GoalsAway} onChange={e=>set("team1GoalsAway",e.target.value)} placeholder="1" style={{textAlign:"center",fontSize:22,fontWeight:700}}/></div>
                  </div>
                  <div style={{gridColumn:"1/-1",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <div>
                      <label>Torschützen Heim</label>
                      {roster.length>0 && form.team1SvmgSide==="home" && <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>{roster.map(name=><button key={name} onClick={()=>appendScorer("team1ScorersHome",name)} style={{background:"rgba(110,180,255,0.12)",border:"1px solid rgba(110,180,255,0.3)",borderRadius:6,padding:"3px 8px",color:"#9cc9ff",fontSize:11,cursor:"pointer"}}>+ {name}</button>)}</div>}
                      <textarea value={form.team1ScorersHome} onChange={e=>set("team1ScorersHome",e.target.value)} placeholder={"23' S. Brauner\n87' L. Schwarzenbach"}/>
                    </div>
                    <div>
                      <label>Torschützen Gast</label>
                      {roster.length>0 && form.team1SvmgSide==="away" && <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>{roster.map(name=><button key={name} onClick={()=>appendScorer("team1ScorersAway",name)} style={{background:"rgba(110,180,255,0.12)",border:"1px solid rgba(110,180,255,0.3)",borderRadius:6,padding:"3px 8px",color:"#9cc9ff",fontSize:11,cursor:"pointer"}}>+ {name}</button>)}</div>}
                      <textarea value={form.team1ScorersAway} onChange={e=>set("team1ScorersAway",e.target.value)} placeholder={"5' F. Stöckeler\n33' E. Gresser"}/>
                    </div>
                  </div>
                </div>
              </div>
              <div style={card}>
                <label style={{fontSize:13,marginBottom:12}}>🥈 Zweites Team</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div style={{gridColumn:"1/-1"}}><label>Teamname</label><input value={form.team2Name} onChange={e=>set("team2Name",e.target.value)} placeholder="Team II"/></div>
                  <div style={{gridColumn:"1/-1",display:"flex",gap:8}}>
                    <button onClick={()=>set("team2SvmgSide","home")} style={{flex:1,background:form.team2SvmgSide==="home"?"rgba(34,51,212,0.5)":"rgba(255,255,255,0.05)",border:`1.5px solid ${form.team2SvmgSide==="home"?"#6eb4ff":"rgba(255,255,255,0.1)"}`,borderRadius:7,padding:"7px",color:form.team2SvmgSide==="home"?"#6eb4ff":"rgba(255,255,255,0.5)",fontSize:12,fontWeight:600,cursor:"pointer"}}>🏠 SVMG spielt Heim</button>
                    <button onClick={()=>set("team2SvmgSide","away")} style={{flex:1,background:form.team2SvmgSide==="away"?"rgba(34,51,212,0.5)":"rgba(255,255,255,0.05)",border:`1.5px solid ${form.team2SvmgSide==="away"?"#6eb4ff":"rgba(255,255,255,0.1)"}`,borderRadius:7,padding:"7px",color:form.team2SvmgSide==="away"?"#6eb4ff":"rgba(255,255,255,0.5)",fontSize:12,fontWeight:600,cursor:"pointer"}}>🚌 SVMG spielt Auswärts</button>
                  </div>
                  <div style={{display:"flex",alignItems:"flex-end",gap:8}}>
                    <div style={{flex:1}}><label>Heim-Tore</label><input value={form.team2GoalsHome} onChange={e=>set("team2GoalsHome",e.target.value)} placeholder="4" style={{textAlign:"center",fontSize:22,fontWeight:700}}/></div>
                    <span style={{fontSize:22,color:"rgba(255,255,255,0.3)",paddingBottom:8}}>:</span>
                    <div style={{flex:1}}><label>Gast-Tore</label><input value={form.team2GoalsAway} onChange={e=>set("team2GoalsAway",e.target.value)} placeholder="1" style={{textAlign:"center",fontSize:22,fontWeight:700}}/></div>
                  </div>
                  <div style={{gridColumn:"1/-1",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <div>
                      <label>Torschützen Heim</label>
                      {roster.length>0 && form.team2SvmgSide==="home" && <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>{roster.map(name=><button key={name} onClick={()=>appendScorer("team2ScorersHome",name)} style={{background:"rgba(110,180,255,0.12)",border:"1px solid rgba(110,180,255,0.3)",borderRadius:6,padding:"3px 8px",color:"#9cc9ff",fontSize:11,cursor:"pointer"}}>+ {name}</button>)}</div>}
                      <textarea value={form.team2ScorersHome} onChange={e=>set("team2ScorersHome",e.target.value)} placeholder={"19' J. Jauß\n33' R. Hold"}/>
                    </div>
                    <div>
                      <label>Torschützen Gast</label>
                      {roster.length>0 && form.team2SvmgSide==="away" && <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>{roster.map(name=><button key={name} onClick={()=>appendScorer("team2ScorersAway",name)} style={{background:"rgba(110,180,255,0.12)",border:"1px solid rgba(110,180,255,0.3)",borderRadius:6,padding:"3px 8px",color:"#9cc9ff",fontSize:11,cursor:"pointer"}}>+ {name}</button>)}</div>}
                      <textarea value={form.team2ScorersAway} onChange={e=>set("team2ScorersAway",e.target.value)} placeholder={"51' M. Herrling"}/>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Extrazeilen (nur Spieltag) */}
          {!isResult && !isSchedule && (
            <div style={card}>
              <label style={{fontSize:13,marginBottom:4}}>Textzeilen auf dem Poster</label>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.32)",marginBottom:12}}>z. B. „Team II – 14:00 Uhr"</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {form.extraLines.map((line,i)=>(
                  <div key={i} style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input value={line} onChange={e=>setLine(i,e.target.value)} placeholder={`Zeile ${i+1}`}/>
                    <button onClick={()=>removeLine(i)} style={{background:"rgba(255,60,60,0.15)",border:"1px solid rgba(255,60,60,0.3)",borderRadius:6,padding:"8px 10px",color:"#ff8080",fontSize:13,cursor:"pointer",flexShrink:0}}>✕</button>
                  </div>
                ))}
                <button onClick={addLine} style={{background:"rgba(255,255,255,0.05)",border:"1px dashed rgba(255,255,255,0.18)",borderRadius:8,padding:"8px",color:"rgba(255,255,255,0.38)",fontSize:12,cursor:"pointer"}}>+ Zeile hinzufügen</button>
              </div>
            </div>
          )}

          {/* Schriftart */}
          <div style={card}>
            <label style={{fontSize:13,marginBottom:12}}>Schriftart</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {FONTS.map(f=>(
                <button key={f.id} onClick={()=>set("font",f.id)} style={{background:form.font===f.id?"rgba(34,51,212,0.5)":"rgba(255,255,255,0.05)",border:`1.5px solid ${form.font===f.id?"#6eb4ff":"rgba(255,255,255,0.1)"}`,borderRadius:8,padding:"10px 12px",cursor:"pointer",textAlign:"left",display:"flex",flexDirection:"column",gap:2}}>
                  <span style={{fontFamily:f.id,fontSize:18,color:"#fff",fontStyle:"italic",lineHeight:1}}>Spieltag</span>
                  <span style={{fontSize:10,color:form.font===f.id?"#6eb4ff":"rgba(255,255,255,0.4)",letterSpacing:.5,textTransform:"uppercase"}}>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {!isSchedule && (
            <>
              {/* Ton + Hashtags */}
              <div style={card}>
                <label style={{fontSize:13,marginBottom:10}}>Ton & Hashtags</label>
                <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:12}}>
                  {MOODS.map(m=>(
                    <button key={m} onClick={()=>set("mood",m)} style={{background:form.mood===m?"rgba(34,51,212,0.5)":"rgba(255,255,255,0.05)",border:`1.5px solid ${form.mood===m?"#6eb4ff":"rgba(255,255,255,0.1)"}`,borderRadius:20,padding:"6px 14px",color:form.mood===m?"#6eb4ff":"rgba(255,255,255,0.5)",fontSize:12,fontWeight:600,cursor:"pointer"}}>{m}</button>
                  ))}
                </div>
                <label>Hashtags</label>
                <input value={form.hashtags} onChange={e=>set("hashtags",e.target.value)} placeholder="#SVMG #Amateurfußball #Spieltag"/>
              </div>

              <button onClick={generate} disabled={loading} style={{width:"100%",background:loading?"rgba(34,51,212,0.35)":"linear-gradient(135deg,#2233d4,#1018b0)",border:"none",borderRadius:10,padding:"14px",color:"#fff",fontFamily:"'Comic Sans MS',cursive",fontStyle:"italic",fontWeight:700,fontSize:20,letterSpacing:1,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:loading?"none":"0 4px 20px rgba(34,51,212,0.4)"}}>
                {loading ? <><div style={{width:20,height:20,border:"2px solid rgba(255,255,255,0.25)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> KI schreibt...</> : "⚡ Post-Text generieren"}
              </button>
            </>
          )}
        </div>


        {/* PREVIEW */}
        <div style={{width:310,flexShrink:0,position:"sticky",top:22}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",color:"rgba(255,255,255,0.35)",marginBottom:10}}>Vorschau</div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <button onClick={()=>setEditMode(v=>!v)} style={{flex:1,background:editMode?"rgba(255,200,0,0.2)":"rgba(255,255,255,0.07)",border:`1.5px solid ${editMode?"#ffd700":"rgba(255,255,255,0.18)"}`,borderRadius:8,padding:"8px",color:editMode?"#ffd700":"rgba(255,255,255,0.6)",fontSize:13,fontWeight:600,cursor:"pointer"}}>
              {editMode?"✅ Fertig":"✏️ Texte verschieben"}
            </button>
            {Object.keys(positions).length>0 && <button onClick={()=>setAllPositions(p=>({...p, [form.postType]: {}}))} style={{background:"rgba(255,60,60,0.15)",border:"1px solid rgba(255,60,60,0.3)",borderRadius:8,padding:"8px 12px",color:"#ff8080",fontSize:12,cursor:"pointer"}}>↺</button>}
          </div>
          {editMode && <div style={{background:"rgba(255,200,0,0.08)",border:"1px solid rgba(255,200,0,0.25)",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:12,color:"rgba(255,220,100,0.8)"}}>👆 Texte auf dem Poster ziehen</div>}

          <div ref={posterRef}>
            {isSchedule
              ? <SchedulePoster d={form} logoLib={logoLib} positions={positions} onMove={onMove} editMode={editMode}/>
              : isResult
                ? <ResultPoster d={form} positions={positions} onMove={onMove} editMode={editMode}/>
                : <MatchdayPoster d={form} caption={caption} positions={positions} onMove={onMove} editMode={editMode}/>
            }
          </div>

          <button onClick={downloadPoster} disabled={downloading} style={{width:"100%",marginTop:10,background:downloading?"rgba(34,51,212,0.35)":"linear-gradient(135deg,#2233d4,#1018b0)",border:"none",borderRadius:8,padding:"11px",color:"#fff",fontSize:14,fontWeight:700,cursor:downloading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:downloading?"none":"0 3px 14px rgba(34,51,212,0.4)"}}>
            {downloading ? <><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.25)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> Wird erstellt...</> : "📥 Als PNG speichern"}
          </button>

          {caption && (
            <div>
              <div style={{marginTop:12,background:"rgba(255,255,255,0.05)",borderRadius:10,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.08)"}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",color:"rgba(255,255,255,0.35)",marginBottom:7}}>Caption-Text</div>
                <p style={{fontSize:13,lineHeight:1.6,color:"rgba(255,255,255,0.82)",whiteSpace:"pre-wrap"}}>{caption}</p>
                {form.hashtags && <p style={{marginTop:7,fontSize:12,color:"rgba(110,180,255,0.65)"}}>{form.hashtags.split(" ").map(t=>t.startsWith("#")?t:`#${t}`).join(" ")}</p>}
              </div>
              <button onClick={()=>{navigator.clipboard.writeText(fullText);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{width:"100%",marginTop:8,background:copied?"rgba(30,180,80,0.15)":"rgba(255,255,255,0.07)",border:`1.5px solid ${copied?"#5dff8a":"rgba(255,255,255,0.18)"}`,borderRadius:8,padding:"10px",color:copied?"#5dff8a":"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                {copied?"✅ Kopiert!":"📋 Text kopieren"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
