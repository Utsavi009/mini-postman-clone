import { useEffect, useState } from "react";

type Pair = { key: string; value: string; enabled: boolean };
type Entry = { id: string; method: string; url: string; status: number; duration: number; time: string; body: string };
const blank = (): Pair => ({ key:"", value:"", enabled:true });
const METHODS = ["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS"];
const saved = (key:string, fallback:any) => { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } };

export default function App() {
  const [method,setMethod] = useState("GET");
  const [url,setUrl] = useState("https://jsonplaceholder.typicode.com/posts/1");
  const [tab,setTab] = useState("Params");
  const [headers,setHeaders] = useState<Pair[]>([blank()]);
  const [params,setParams] = useState<Pair[]>([blank()]);
  const [body,setBody] = useState('{\n  "title": "hello",\n  "body": "world",\n  "userId": 1\n}');
  const [authType,setAuthType] = useState("None");
  const [token,setToken] = useState("");
  const [username,setUsername] = useState("");
  const [password,setPassword] = useState("");
  const [apiKeyName,setApiKeyName] = useState("X-API-Key");
  const [apiKeyValue,setApiKeyValue] = useState("");
  const [response,setResponse] = useState<any>(null);
  const [busy,setBusy] = useState(false);
  const [history,setHistory] = useState<Entry[]>(() => saved("mini-postman-history",[]));
  const [error,setError] = useState("");

  useEffect(()=>localStorage.setItem("mini-postman-history",JSON.stringify(history)),[history]);
  const updatePair = (list:Pair[], setter:(v:Pair[])=>void, i:number, field:keyof Pair, value:any) => setter(list.map((p,n)=>n===i?{...p,[field]:value}:p));
  const addPair = (list:Pair[], setter:(v:Pair[])=>void) => setter([...list,blank()]);
  const buildUrl = () => {
    try {
      const u = new URL(url);
      params.filter(p=>p.enabled && p.key.trim()).forEach(p=>u.searchParams.set(p.key,p.value));
      return u.toString();
    } catch { return url; }
  };
  async function send() {
    setBusy(true); setError(""); setResponse(null);
    const requestHeaders:Record<string,string> = {};
    headers.filter(h=>h.enabled && h.key.trim()).forEach(h=>requestHeaders[h.key]=h.value);
    if(authType==="Bearer Token" && token) requestHeaders.Authorization=`Bearer ${token}`;
    if(authType==="Basic Auth") requestHeaders.Authorization=`Basic ${btoa(`${username}:${password}`)}`;
    if(authType==="API Key" && apiKeyName && apiKeyValue) requestHeaders[apiKeyName]=apiKeyValue;
    const started=performance.now();
    try {
      const result = await fetch("/api/request", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({url:buildUrl(),method,headers:requestHeaders,body:["GET","HEAD"].includes(method)?undefined:body})
      });
      const data=await result.json();
      const duration=Math.round(performance.now()-started);
      setResponse(data);
      if(!result.ok) setError(data.error || "Request failed");
      const entry:Entry={id:crypto.randomUUID(),method,url:buildUrl(),status:data.status ?? result.status,duration,time:new Date().toLocaleTimeString(),body};
      setHistory(h=>[entry,...h].slice(0,50));
    } catch(e:any) { setError(e.message || "Unable to reach the API proxy"); }
    finally { setBusy(false); }
  }
  function restore(item:Entry) { setMethod(item.method); setUrl(item.url); setBody(item.body); setResponse(null); }
  const pretty = response?.body !== undefined ? (typeof response.body==="string" ? response.body : JSON.stringify(response.body,null,2)) : "";

  return <main className="shell">
    <header><div className="brand"><span className="logo">↗</span><div><b>requestly</b><small>API WORKSPACE</small></div></div><div className="top-right"><span className="dot"/> Local workspace <span className="avatar">JD</span></div></header>
    <aside className="sidebar">
      <div className="side-title">WORKSPACE</div><button className="side-active">▣ &nbsp; HTTP Requests</button><div className="side-title history-title">HISTORY <button onClick={()=>setHistory([])}>Clear</button></div>
      {history.length===0?<p className="empty-history">Your recent requests will appear here.</p>:history.map(h=><button className="history-item" key={h.id} onClick={()=>restore(h)}><span className={`method m-${h.method}`}>{h.method}</span><span className="history-url">{h.url.replace(/^https?:\/\//,"")}</span><small>{h.status}</small></button>)}
      <div className="sidebar-foot">MINI POSTMAN CLONE<br/><span>Built with React + Node</span></div>
    </aside>
    <section className="workspace">
      <div className="crumb">My Workspace <span>/</span> New Request</div>
      <div className="page-title"><div><h1>New Request</h1><p>Compose, send, and inspect HTTP requests.</p></div><span className="unsaved">● Unsaved request</span></div>
      <div className="request-card">
        <div className="request-line"><select value={method} onChange={e=>setMethod(e.target.value)}>{METHODS.map(m=><option key={m}>{m}</option>)}</select><input className="url-input" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://api.example.com/endpoint" onKeyDown={e=>e.key==="Enter"&&send()}/><button className="send" onClick={send} disabled={busy}>{busy?"Sending…":"▶  Send"}</button></div>
        <nav className="tabs">{["Params","Headers", "Authorization","Body"].map(t=><button key={t} className={tab===t?"selected":""} onClick={()=>setTab(t)}>{t}{t==="Headers"&&<em>{headers.filter(h=>h.key).length}</em>}</button>)}</nav>
        <div className="tab-content">
          {tab==="Params" && <><h3>Query parameters</h3><PairEditor rows={params} setRows={setParams}/></>}
          {tab==="Headers" && <><h3>Request headers</h3><PairEditor rows={headers} setRows={setHeaders}/></>}
          {tab==="Authorization" && <><h3>Authentication</h3><div className="auth-row"><label>Auth type</label><select value={authType} onChange={e=>setAuthType(e.target.value)}>{["None","Bearer Token","Basic Auth","API Key"].map(x=><option>{x}</option>)}</select></div>
            {authType==="Bearer Token"&&<label className="field">Token<input type="password" value={token} onChange={e=>setToken(e.target.value)} placeholder="Paste access token"/></label>}
            {authType==="Basic Auth"&&<div className="two-fields"><label className="field">Username<input value={username} onChange={e=>setUsername(e.target.value)}/></label><label className="field">Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label></div>}
            {authType==="API Key"&&<div className="two-fields"><label className="field">Key name<input value={apiKeyName} onChange={e=>setApiKeyName(e.target.value)}/></label><label className="field">Key value<input type="password" value={apiKeyValue} onChange={e=>setApiKeyValue(e.target.value)}/></label></div>}
          </>}
          {tab==="Body"&&<><div className="body-heading"><h3>Request body</h3><span>raw · JSON</span></div><textarea className="body-editor" value={body} onChange={e=>setBody(e.target.value)} spellCheck={false}/></>}
        </div>
      </div>
      <div className="response-head"><h2>Response</h2>{response&&<div className="response-meta"><span className={response.status>=200&&response.status<400?"ok":"bad"}>{response.status} {response.statusText}</span><span>{response.duration} ms</span><span>{response.size} B</span></div>}</div>
      <div className="response-card">
        {busy?<div className="response-empty"><div className="spinner"/>Sending request…</div>:error?<div className="error-box">⚠ {error}</div>:response?<><div className="response-tabs"><b>Body</b><span>Headers ({Object.keys(response.headers||{}).length})</span></div><pre>{pretty || "(empty response)"}</pre>{response.headers&&<details><summary>View response headers</summary><pre>{JSON.stringify(response.headers,null,2)}</pre></details>}</>:<div className="response-empty"><div className="response-icon">⇄</div><b>No response yet</b><span>Hit Send to execute your request and see the response here.</span></div>}
      </div>
    </section>
  </main>;
}
function PairEditor({rows,setRows}:{rows:Pair[],setRows:(v:Pair[])=>void}) {
  return <div className="pairs"><div className="pair-head"><span>KEY</span><span>VALUE</span><span>ENABLED</span><span/></div>{rows.map((p,i)=><div className="pair-row" key={i}><input placeholder="Key" value={p.key} onChange={e=>setRows(rows.map((r,n)=>n===i?{...r,key:e.target.value}:r))}/><input placeholder="Value" value={p.value} onChange={e=>setRows(rows.map((r,n)=>n===i?{...r,value:e.target.value}:r))}/><input type="checkbox" checked={p.enabled} onChange={e=>setRows(rows.map((r,n)=>n===i?{...r,enabled:e.target.checked}:r))}/><button onClick={()=>setRows(rows.filter((_,n)=>n!==i))}>×</button></div>)}<button className="add-row" onClick={()=>setRows([...rows,{key:"",value:"",enabled:true}])}>＋ Add row</button></div>;
}
