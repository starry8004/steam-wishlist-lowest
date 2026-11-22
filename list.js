const $ = s => document.querySelector(s);
const won = n => (n == null ? '-' : '₩' + Math.round(n).toLocaleString('ko-KR'));
const day = t => (t ? new Date(t).toLocaleDateString('ko-KR') : '-');
const rank = { low: 0, near: 1, no: 2, nodata: 3, none: 4 };
const DECK = { 3: '검증됨', 2: '플레이 가능', 1: '지원 안 됨', 0: '미확인' };
let deckOnly = false;
let rows = [], filter = 'all', sortKey = 'judge', asc = true;

function val(r, k) {
  return { deck: -(r.deck || 0), release: r.release || 9e15, review: -(r.review?.pct ?? -1), name: r.name, final: r.price?.final ?? 1e12, cut: -(r.price?.cut || 0), low: r.low?.amount ?? 1e12, ts: r.low?.ts || '', judge: rank[r.judge.code] * 1000 - (r.price?.cut || 0) }[k];
}
function render() {
  let list = rows.filter(r => !deckOnly || r.deck >= 2).filter(r => filter === 'all' || (filter === 'sale' && r.price?.cut > 0) || (filter === 'low' && r.price?.cut > 0 && r.judge.code === 'low'));
  list.sort((a, b) => { const x = val(a, sortKey), y = val(b, sortKey); return (x > y ? 1 : x < y ? -1 : 0) * (asc ? 1 : -1); });
  $('#count').textContent = ` ${list.length} / ${rows.length}개`;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  $('#tb').innerHTML = list.map(r => {
    const url = `https://store.steampowered.com/app/${r.appid}`;
    const rv = r.review ? `<span class="rv${r.review.score}">${esc(r.review.label)}</span><div class="sub">${r.review.pct}% · ${r.review.count.toLocaleString('ko-KR')}개</div>` : '<span class="sub">-</span>';
    return `<tr>
    <td class="th"><a href="${url}" target="_blank"><img loading="lazy" src="${esc(r.img)}" onerror="this.style.visibility='hidden'"></a></td>
    <td><a class="nm" href="${url}" target="_blank">${esc(r.name)}</a>
      <div class="sub">${esc(r.dev)}</div><div>${(r.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div></td>
    <td>${r.coming ? '출시 예정' : day(r.release)}</td>
    <td>${rv}</td>
    <td><span class="dk dk${r.deck || 0}">${DECK[r.deck || 0]}</span></td>
    <td>${r.price?.cut ? `<div class="orig">${won(r.price.initial)}</div>` : ''}<div class="now">${won(r.price?.final)}</div></td>
    <td>${r.price?.cut ? `<span class="cut">-${r.price.cut}%</span>` : ''}</td>
    <td>${won(r.low?.amount)}</td><td>${day(r.low?.ts)}</td>
    <td><span class="b ${r.judge.code}">${r.judge.label}</span></td></tr>`;
  }).join('');
}
function load() {
  $('#msg').textContent = '불러오는 중… (찜목록이 많으면 시간이 걸립니다)';
  chrome.runtime.sendMessage({ type: 'list' }, res => {
    if (!res || res.error) { $('#msg').textContent = res ? res.error : '응답 없음'; return; }
    rows = res.rows; $('#msg').textContent = ''; render();
  });
}
$('#save').onclick = async () => {
  await chrome.storage.local.set({ key: $('#key').value.trim(), steamid: $('#steamid').value.trim() });
  load();
};
$('#refresh').onclick = () => chrome.runtime.sendMessage({ type: 'clearCache' }, load);
document.querySelectorAll('button[data-f]').forEach(b => b.onclick = () => {
  filter = b.dataset.f; document.querySelectorAll('button[data-f]').forEach(x => x.classList.toggle('on', x === b)); render();
});
$('#deckOnly').onclick = e => { deckOnly = !deckOnly; e.target.classList.toggle('on', deckOnly); render(); };
document.querySelectorAll('th[data-s]').forEach(th => th.onclick = () => {
  asc = sortKey === th.dataset.s ? !asc : true; sortKey = th.dataset.s; render();
});
chrome.storage.local.get(['key', 'steamid']).then(({ key, steamid }) => {
  if (key) $('#key').value = key;
  if (steamid) $('#steamid').value = steamid;
  if (key && steamid) load(); else $('#help').open = true;
});
