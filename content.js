(() => {
  const m = location.pathname.match(/^\/app\/(\d+)/);
  if (!m) return;
  const won = n => (n == null ? '-' : '₩' + Math.round(n).toLocaleString('ko-KR'));
  const day = t => (t ? new Date(t).toLocaleDateString('ko-KR') : '-');
  const box = document.createElement('div');
  box.id = 'slw-panel';
  box.innerHTML = '<h3>스팀 역대 최저가</h3>불러오는 중…';
  const anchor = document.querySelector('#game_area_purchase') || document.querySelector('.page_content_ctn');
  if (!anchor) return;
  anchor.parentNode.insertBefore(box, anchor);

  chrome.runtime.sendMessage({ type: 'app', appid: m[1] }, res => {
    if (!res || res.error) { box.innerHTML = `<h3>스팀 역대 최저가</h3>${res ? res.error : '응답 없음'}`; return; }
    const r = res.row;
    const lowAmt = r.low?.amount;
    const hist = (r.history || []).map(h =>
      `<tr class="${lowAmt != null && h.price <= lowAmt ? 'slw-atlow' : ''}"><td>${day(h.ts)}</td><td>${won(h.price)}</td><td>${h.cut ? '-' + h.cut + '%' : '정가'}</td></tr>`).join('');
    box.innerHTML = `
      <h3>스팀 역대 최저가 <span class="slw-badge slw-${r.judge.code}">${r.judge.label}</span></h3>
      현재가 <b>${won(r.price?.final)}</b>${r.price?.cut ? ` (-${r.price.cut}%)` : ''} ·
      역대 최저 <b>${won(lowAmt)}</b>${r.low?.cut ? ` (-${r.low.cut}%)` : ''} · ${day(r.low?.ts)}
      <div class="slw-hist"><table><tr><th>날짜</th><th>가격</th><th>할인</th></tr>${hist || '<tr><td colspan="3">이력 없음</td></tr>'}</table></div>`;
  });
})();
