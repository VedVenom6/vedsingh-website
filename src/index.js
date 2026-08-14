const JELLYFIN_PUBLIC="https://movies.vedsingh.com",KUMA_PUBLIC="https://status.vedsingh.com";
export default{async fetch(request,env){const u=new URL(request.url);if(u.pathname==="/api/status")return status(env);if(u.pathname==="/api/jellyfin/recent")return recent(env,Math.min(Math.max(Number(u.searchParams.get("limit")||8),1),20));if(u.pathname==="/api/jellyfin/now-playing")return nowPlaying(env);return env.ASSETS.fetch(request)}};
const jr=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
async function status(env){
  try{
    const base=env.KUMA_URL||KUMA_PUBLIC;
    const slug=env.KUMA_SLUG||"vsnas";

    const [pageResponse,heartbeatResponse]=await Promise.all([
      fetch(`${base}/api/status-page/${encodeURIComponent(slug)}`,{headers:{accept:"application/json"}}),
      fetch(`${base}/api/status-page/heartbeat/${encodeURIComponent(slug)}`,{headers:{accept:"application/json"}})
    ]);

    if(!pageResponse.ok||!heartbeatResponse.ok){
      return jr({error:"kuma"},502);
    }

    const page=await pageResponse.json();
    const raw=await heartbeatResponse.json();
    const hl=raw.heartbeatList||{};
    const ul=raw.uptimeList||{};

    const names=new Map();
    for(const group of page.publicGroupList||[]){
      for(const monitor of group.monitorList||[]){
        if(monitor?.id!=null){
          names.set(String(monitor.id),monitor.name||`Monitor ${monitor.id}`);
        }
      }
    }

    const ids=new Set([...Object.keys(hl),...names.keys()]);

    const monitors=[...ids].map(id=>{
      const beats=hl[id];
      const last=Array.isArray(beats)&&beats.length?beats[beats.length-1]:null;
      const status=last?.status;
      const state=status===1?"ok":status===0?"down":"warn";
      const name=names.get(String(id))||`Monitor ${id}`;

      const exactKey=`${id}_24`;
      const uptimeKey=Object.prototype.hasOwnProperty.call(ul,exactKey)
        ? exactKey
        : Object.keys(ul).find(k=>k.startsWith(`${id}_`));

      const rawUptime=uptimeKey!=null?Number(ul[uptimeKey])*100:null;
      const uptime=Number.isFinite(rawUptime)?Number(rawUptime.toFixed(2)):null;

      return{id,name,state,uptime};
    });

    const known=monitors.filter(m=>m.uptime!=null);
    const overallUptime=known.length
      ? Number((known.reduce((a,b)=>a+b.uptime,0)/known.length).toFixed(2))
      : null;

    return jr({monitors,overallUptime});
  }catch{
    return jr({error:"kuma-unreachable"},502);
  }
}
function headers(env){if(!env.JELLYFIN_API_KEY)throw new Error("missing-key");return{accept:"application/json","X-Emby-Token":env.JELLYFIN_API_KEY}}
async function recent(env,limit){try{const base=env.JELLYFIN_URL||JELLYFIN_PUBLIC,r=await fetch(`${base}/Items/Latest?Limit=${limit}&IncludeItemTypes=Movie,Series,Episode&Fields=ProductionYear,SeriesName`,{headers:headers(env)});if(!r.ok)return jr({error:"jellyfin"},502);const items=await r.json();return jr({items:(Array.isArray(items)?items:[]).map(i=>({id:i.Id,title:i.Name,subtitle:i.SeriesName||i.ProductionYear||"",type:i.Type||"Media",image:`${base}/Items/${encodeURIComponent(i.Id)}/Images/Primary?quality=85`,url:`${base}/web/#/details?id=${encodeURIComponent(i.Id)}`}))})}catch(e){return jr({error:e.message==="missing-key"?"missing-key":"jellyfin-unreachable"},503)}}
async function nowPlaying(env){try{const base=env.JELLYFIN_URL||JELLYFIN_PUBLIC,r=await fetch(`${base}/Sessions`,{headers:headers(env)});if(!r.ok)return jr({error:"jellyfin"},502);const sessions=await r.json(),items=(Array.isArray(sessions)?sessions:[]).filter(s=>s.NowPlayingItem&&s.PlayState).map(s=>{const i=s.NowPlayingItem,t=Number(s.PlayState.PositionTicks||0),rt=Number(i.RunTimeTicks||0);return{title:i.Name,subtitle:i.SeriesName||i.AlbumArtist||i.ProductionYear||"",user:s.UserName||"Jellyfin",progressPercent:rt?Number((t/rt*100).toFixed(1)):0,image:`${base}/Items/${encodeURIComponent(i.Id)}/Images/Primary?quality=80`}});return jr({items})}catch(e){return jr({error:e.message==="missing-key"?"missing-key":"jellyfin-unreachable"},503)}}
