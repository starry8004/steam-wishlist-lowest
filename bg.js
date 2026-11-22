const ITAD = 'https://api.isthereanydeal.com';
const STEAM_SHOP = 61;
const LOW_TTL = 6 * 3600 * 1000;

const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
async function j(url, opt) {
  const r = await fetch(url, opt);
  if (!r.ok) throw new Error(`${r.status} ${url.split('?')[0]}`);
  return r.json();
}
const post = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
async function tryVer(make) { // v2 → v1 순서로 시도
  let err;
  for (const v of ['v2', 'v1']) { try { return await make(v); } catch (e) { err = e; } }
  throw err;
}
async function getKey() {
  const { key } = await chrome.storage.local.get('key');
  if (!key) throw new Error('ITAD API 키가 없습니다. 확장 아이콘을 눌러 키를 저장하세요.');
  return key;
}

// 스팀 appid → ITAD 게임 ID (영구 캐시)
async function itadIds(appids, key) {
  const { idmap = {} } = await chrome.storage.local.get('idmap');
  const need = appids.filter(a => !(a in idmap));
  for (const c of chunk(need, 200)) {
    const res = await j(`${ITAD}/lookup/id/shop/${STEAM_SHOP}/v1?key=${key}`, post(c.map(a => 'app/' + a)));
    for (const a of c) idmap[a] = res['app/' + a] || null;
  }
  if (need.length) await chrome.storage.local.set({ idmap });
  return idmap;
}

// 스팀 스토어 기준 원화 역대 최저가 (6시간 캐시)
async function storeLows(ids, key) {
  const { lowcache = {} } = await chrome.storage.local.get('lowcache');
  const now = Date.now();
  const need = ids.filter(id => !lowcache[id] || now - lowcache[id].at > LOW_TTL);
  for (const c of chunk(need, 200)) {
    const res = await tryVer(v => j(`${ITAD}/games/storelow/${v}?country=KR&shops=${STEAM_SHOP}&key=${key}`, post(c)));
    for (const id of c) lowcache[id] = { at: now, low: null };
    for (const g of res || []) {
      const l = (g.lows || []).find(x => x.shop?.id === STEAM_SHOP) || (g.lows || [])[0];
      if (l) lowcache[g.id] = { at: now, low: { amount: l.price.amount, currency: l.price.currency, cut: l.cut, ts: l.timestamp } };
    }
  }
  if (need.length) await chrome.storage.local.set({ lowcache });
  return Object.fromEntries(ids.map(id => [id, lowcache[id]?.low || null]));
}

// 스팀 현재가 (원화, appdetails는 ×100 단위)
async function steamPrices(appids) {
  const out = {};
  for (const c of chunk(appids, 50)) {
    const res = await j(`https://store.steampowered.com/api/appdetails?appids=${c.join(',')}&cc=kr&filters=price_overview`);
    for (const a of c) {
      const p = res?.[a]?.data?.price_overview;
      out[a] = p ? { final: p.final / 100, initial: p.initial / 100, cut: p.discount_percent, currency: p.currency } : null;
    }
  }
  return out;
}

// 게임 정보 (이름·썸네일·출시일·리뷰·개발사·태그)
const IMG = 'https://shared.akamai.steamstatic.com/store_item_assets/';
async function tagNames() {
  const { tagmap } = await chrome.storage.local.get('tagmap');
  if (tagmap && Date.now() - tagmap.at < 7 * 86400000) return tagmap.map;
  try {
    const list = await j('https://store.steampowered.com/tagdata/populartags/koreana');
    const map = Object.fromEntries(list.map(t => [t.tagid, t.name]));
    await chrome.storage.local.set({ tagmap: { at: Date.now(), map } });
    return map;
  } catch (e) { return {}; }
}
async function steamInfo(appids) {
  const out = {};
  const tags = await tagNames();
  for (const c of chunk(appids, 50)) {
    const input = { ids: c.map(a => ({ appid: +a })), context: { language: 'koreana', country_code: 'KR' },
      data_request: { include_basic_info: true, include_assets: true, include_release: true, include_reviews: true, include_tag_count: 5, include_platforms: true } };
    try {
      const res = await j(`https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`);
      for (const it of res?.response?.store_items || []) {
        const a = it.assets || {};
        const file = a.small_capsule || a.header;
        const rv = it.reviews?.summary_filtered;
        out[it.appid] = {
          name: it.name,
          img: file && a.asset_url_format ? IMG + a.asset_url_format.replace('${FILENAME}', file) : null,
          release: it.release?.steam_release_date ? it.release.steam_release_date * 1000 : null,
          coming: !!it.release?.is_coming_soon,
          review: rv ? { label: rv.review_score_label, pct: rv.percent_positive, count: rv.review_count, score: rv.review_score } : null,
          deck: it.platforms?.steam_deck_compat_category ?? 0,
          dev: (it.basic_info?.developers || []).map(d => d.name).join(', '),
          tags: (it.tagids || []).slice(0, 4).map(t => tags[t]).filter(Boolean),
        };
      }
    } catch (e) { /* 정보 실패 시 기본 표시 */ }
  }
  return out;
}

async function wishlist(steamid) {
  const r = await j(`https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid=${steamid}`);
  const items = r?.response?.items || [];
  if (!items.length) throw new Error('찜목록이 비었거나 비공개입니다. 스팀 프로필 공개 설정에서 찜목록을 공개로 바꿔 주세요.');
  return items.map(i => String(i.appid));
}

function judge(price, low) {
  if (!price) return { code: 'none', label: '가격 없음' };
  if (!low) return { code: 'nodata', label: '기록 없음' };
  if (price.final <= low.amount) return { code: 'low', label: '역대 최저가' };
  if (price.final <= low.amount * 1.1) return { code: 'near', label: '근접(10% 이내)' };
  return { code: 'no', label: '아님' };
}

async function buildRows(appids, key) {
  const [idmap, prices, info] = await Promise.all([itadIds(appids, key), steamPrices(appids), steamInfo(appids)]);
  const ids = [...new Set(appids.map(a => idmap[a]).filter(Boolean))];
  const lows = await storeLows(ids, key);
  return appids.map(a => {
    const low = idmap[a] ? lows[idmap[a]] : null;
    const i = info[a] || {};
    return { appid: a, itad: idmap[a], ...i, name: i.name || `app ${a}`, img: i.img || `${IMG}steam/apps/${a}/capsule_231x87.jpg`, price: prices[a], low, judge: judge(prices[a], low) };
  });
}

async function history(itadId, key) {
  const res = await tryVer(v => j(`${ITAD}/games/history/${v}?id=${itadId}&since=2000-01-01T00:00:00Z&country=KR&shops=${STEAM_SHOP}&key=${key}`));
  return (res || []).map(h => ({ ts: h.timestamp, price: h.deal?.price?.amount, regular: h.deal?.regular?.amount, cut: h.deal?.cut }));
}

chrome.runtime.onMessage.addListener((m, _s, send) => {
  (async () => {
    const key = await getKey();
    if (m.type === 'list') {
      const { steamid } = await chrome.storage.local.get('steamid');
      if (!steamid) throw new Error('스팀 ID(17자리 숫자)를 저장하세요.');
      return { rows: await buildRows(await wishlist(steamid), key) };
    }
    if (m.type === 'app') {
      const [row] = await buildRows([String(m.appid)], key);
      row.history = row.itad ? await history(row.itad, key) : [];
      return { row };
    }
    if (m.type === 'clearCache') { await chrome.storage.local.remove(['lowcache']); return { ok: true }; }
  })().then(send, e => send({ error: e.message }));
  return true;
});

chrome.action.onClicked.addListener(() => chrome.tabs.create({ url: chrome.runtime.getURL('list.html') }));
