const seed={developers:[
{id:"dev_01",username:"NguyenA",email:"dev@example.com",status:"Active",createdAt:"2026-08-10"},
{id:"dev_02",username:"DevB",email:"devb@example.com",status:"Active",createdAt:"2026-08-09"},
{id:"dev_03",username:"TweakDev",email:"tweak@example.com",status:"Disabled",createdAt:"2026-08-03"}],
licenses:[
{id:"lic_01",key:"TWK-8H3K-2L9P-X7Q4",developerId:"dev_01",status:"Active",expiresAt:"2026-12-31"},
{id:"lic_02",key:"TWK-4N8D-9S2A-K5P1",developerId:"dev_02",status:"Active",expiresAt:"2026-10-30"},
{id:"lic_03",key:"TWK-7X2M-1Q8B-6R4C",developerId:"dev_03",status:"Disabled",expiresAt:"2026-09-01"}],
tweaks:[
{id:"twk_01",name:"Example ESP",bundleId:"com.example.esp",version:"1.0.0",status:"Active"},
{id:"twk_02",name:"Example Menu",bundleId:"com.example.menu",version:"1.2.0",status:"Active"}],
logs:[
{id:"l1",action:"Created license",target:"TWK-8H3K-2L9P-X7Q4",time:"Today, 00:12"},
{id:"l2",action:"Updated developer",target:"NguyenA",time:"Yesterday, 22:41"},
{id:"l3",action:"Added tweak",target:"Example Menu",time:"Yesterday, 19:20"}]};

const get=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))||f}catch{return f}};
let state={page:"Dashboard",dark:localStorage.getItem("theme")!=="light",
developers:get("devs",seed.developers),licenses:get("licenses",seed.licenses),tweaks:get("tweaks",seed.tweaks),logs:get("logs",seed.logs)};

const navItems=[["Dashboard","▦"],["Developers","♙"],["Licenses","▣"],["Tweaks","⌘"],["Logs","◷"],["Settings","⚙"]];
const nav=document.getElementById("nav"),content=document.getElementById("content");

function save(){localStorage.setItem("devs",JSON.stringify(state.developers));localStorage.setItem("licenses",JSON.stringify(state.licenses));localStorage.setItem("tweaks",JSON.stringify(state.tweaks));localStorage.setItem("logs",JSON.stringify(state.logs));}
function log(action,target){state.logs.unshift({id:Date.now(),action,target,time:"Just now"});save()}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function badge(s){return `<span class="badge ${s.toLowerCase()}">${s}</span>`}
function renderNav(){nav.innerHTML=navItems.map(x=>`<button class="nav-item ${state.page===x[0]?"active":""}" onclick="go('${x[0]}')"><b>${x[1]}</b><span>${x[0]}</span></button>`).join("")}
function go(p){state.page=p;render()}
function render(){
 document.getElementById("app").className="app "+(state.dark?"dark":"");
 document.getElementById("title").textContent=state.page;document.getElementById("crumb").textContent=state.page.toUpperCase();
 renderNav(); let p=state.page;
 if(p==="Dashboard")dashboard(); else if(p==="Developers")developers(); else if(p==="Licenses")licenses(); else if(p==="Tweaks")tweaks(); else if(p==="Logs")logs(); else settings();
}
function panel(title,button,body){content.innerHTML=`<div class="panel"><div class="panel-head"><div><h2>${title}</h2><small>Manage your resources</small></div>${button||""}</div>${body}</div>`}
function dashboard(){
 const active=state.licenses.filter(x=>x.status==="Active").length, expired=state.licenses.filter(x=>new Date(x.expiresAt)<new Date()).length;
 content.innerHTML=`<div class="stats">
 <div class="stat"><div class="stat-icon">♙</div><div><label>Developers</label><strong>${state.developers.length}</strong></div><span class="arrow">›</span></div>
 <div class="stat"><div class="stat-icon">✓</div><div><label>Active Licenses</label><strong>${active}</strong></div><span class="arrow">›</span></div>
 <div class="stat"><div class="stat-icon">×</div><div><label>Expired</label><strong>${expired}</strong></div><span class="arrow">›</span></div>
 <div class="stat"><div class="stat-icon">⌘</div><div><label>Tweaks</label><strong>${state.tweaks.length}</strong></div><span class="arrow">›</span></div></div>
 <div class="grid"><div class="panel"><div class="panel-head"><div><h2>Recent Developers</h2><small>Latest developer accounts</small></div><button class="primary" onclick="go('Developers')">View all</button></div>${devTable(state.developers.slice(0,5))}</div>
 <div class="panel"><div class="panel-head"><div><h2>Recent Activity</h2><small>Latest actions</small></div><button class="primary" onclick="go('Logs')">View logs</button></div>${state.logs.slice(0,5).map(l=>`<div class="activity"><span class="dot"></span><div><b>${esc(l.action)}</b><span>${esc(l.target)}</span></div><time>${esc(l.time)}</time></div>`).join("")}</div></div>`;
}
function devTable(ds){return `<div class="table-wrap"><table><thead><tr><th>Developer</th><th>ID</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>${ds.map(d=>`<tr><td><b>${esc(d.username)}</b><small>${esc(d.email)}</small></td><td class="mono">${d.id}</td><td>${badge(d.status)}</td><td>${d.createdAt}</td><td><button class="mini" onclick="toggleDev('${d.id}')">${d.status==="Active"?"Disable":"Enable"}</button></td></tr>`).join("")}</tbody></table></div>`}
function developers(){
 panel("Developer Management",`<button class="primary" onclick="developerModal()">+ Add Developer</button>`, `<div class="toolbar"><div class="search">⌕<input id="devSearch" placeholder="Search developers..." oninput="filterDev()"></div></div><div id="devTable">${devTable(state.developers)}</div>`);
}
function filterDev(){const q=document.getElementById("devSearch").value.toLowerCase();document.getElementById("devTable").innerHTML=devTable(state.developers.filter(d=>(d.username+" "+d.email).toLowerCase().includes(q)))}
function toggleDev(id){const d=state.developers.find(x=>x.id===id);if(!d)return;d.status=d.status==="Active"?"Disabled":"Active";log("Updated developer",d.username);render()}
function licenses(){
 panel("License Management",`<button class="primary" onclick="licenseModal()">+ Create License</button>`,`<div class="table-wrap"><table><thead><tr><th>License</th><th>Developer</th><th>Status</th><th>Expires</th><th>Actions</th></tr></thead><tbody>${state.licenses.map(l=>{let d=state.developers.find(x=>x.id===l.developerId);return `<tr><td><span class="key">${l.key}</span> <button class="copy" onclick="navigator.clipboard&&navigator.clipboard.writeText('${l.key}')">⧉</button></td><td>${esc(d?d.username:"Unknown")}</td><td>${badge(l.status)}</td><td>${l.expiresAt}</td><td><button class="danger" onclick="deleteLicense('${l.id}')">Delete</button></td></tr>`}).join("")}</tbody></table></div>`);
}
function deleteLicense(id){const l=state.licenses.find(x=>x.id===id);state.licenses=state.licenses.filter(x=>x.id!==id);if(l)log("Deleted license",l.key);render()}
function tweaks(){
 panel("Tweak Management",`<button class="primary" onclick="tweakModal()">+ Add Tweak</button>`,`<div class="table-wrap"><table><thead><tr><th>Tweak</th><th>Bundle ID</th><th>Version</th><th>Status</th></tr></thead><tbody>${state.tweaks.map(t=>`<tr><td><b>${esc(t.name)}</b></td><td class="mono">${esc(t.bundleId)}</td><td>${esc(t.version)}</td><td>${badge(t.status)}</td></tr>`).join("")}</tbody></table></div>`);
}
function logs(){panel("Activity Logs","",`<div class="table-wrap"><table><thead><tr><th>Action</th><th>Target</th><th>Time</th></tr></thead><tbody>${state.logs.map(l=>`<tr><td><b>${esc(l.action)}</b></td><td class="mono">${esc(l.target)}</td><td>${esc(l.time)}</td></tr>`).join("")}</tbody></table></div>`)}
function settings(){panel("Settings","",`<div class="settings"><div class="setting"><b>Storage</b><span>Browser localStorage — frontend demo.</span></div><div class="setting"><b>Theme</b><span>${state.dark?"Dark":"Light"} mode.</span></div><div class="setting"><b>Backend</b><span>Not connected. API server will be added in V2.</span></div></div>`)}
function modal(title,body){document.getElementById("modal-root").innerHTML=`<div class="modal-bg"><div class="modal"><div class="modal-head"><h2>${title}</h2><button class="close" onclick="closeModal()">×</button></div>${body}</div></div>`}
function closeModal(){document.getElementById("modal-root").innerHTML=""}
function developerModal(){modal("Add Developer",`<label>Username<input id="mUser" placeholder="Developer username"></label><label>Email<input id="mEmail" placeholder="developer@email.com"></label><button class="primary full" onclick="addDev()">Create Developer</button>`)}
function addDev(){let u=document.getElementById("mUser").value.trim(),e=document.getElementById("mEmail").value.trim();if(!u||!e)return;state.developers.unshift({id:"dev_"+Math.random().toString(36).slice(2,8),username:u,email:e,status:"Active",createdAt:new Date().toISOString().slice(0,10)});log("Created developer",u);closeModal();render()}
function licenseModal(){modal("Create License",`<label>Developer<select id="mDev">${state.developers.map(d=>`<option value="${d.id}">${esc(d.username)}</option>`).join("")}</select></label><label>Expires<input id="mDate" type="date" value="2026-12-31"></label><button class="primary full" onclick="addLicense()">Generate License</button>`)}
function addLicense(){let d=document.getElementById("mDev").value,date=document.getElementById("mDate").value,key="TWK-"+crypto.randomUUID().replaceAll("-","").slice(0,16).toUpperCase();state.licenses.unshift({id:crypto.randomUUID(),key,developerId:d,status:"Active",expiresAt:date});log("Created license",key);closeModal();render()}
function tweakModal(){modal("Add Tweak",`<label>Name<input id="tName" placeholder="My Tweak"></label><label>Bundle ID<input id="tBundle" placeholder="com.example.tweak"></label><label>Version<input id="tVer" value="1.0.0"></label><button class="primary full" onclick="addTweak()">Add Tweak</button>`)}
function addTweak(){let n=document.getElementById("tName").value.trim(),b=document.getElementById("tBundle").value.trim(),v=document.getElementById("tVer").value.trim();if(!n||!b)return;state.tweaks.unshift({id:crypto.randomUUID(),name:n,bundleId:b,version:v||"1.0.0",status:"Active"});log("Added tweak",n);closeModal();render()}
document.getElementById("theme").onclick=()=>{state.dark=!state.dark;localStorage.setItem("theme",state.dark?"dark":"light");render()};
render();