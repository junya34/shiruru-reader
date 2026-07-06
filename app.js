// ── スポンサーデータ ──
const sponsors = [
  { id: 181,  name: 'Sky株式会社' },
  { id: 650,  name: 'キオクシア株式会社' },
  { id: 1023, name: '株式会社トクヤマ' },
  { id: 691,  name: 'プライムプラネットエナジー＆ソリューションズ株式会社' },
];

// ── カメラ ──
let stream = null, scanning = false, rafId = null;
const video  = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }
    });
    video.srcObject = stream;
    await video.play();
    scanning = true;
    setStatus('QRコードを枠内に合わせてください', '');
    const btn = document.getElementById('cam-btn');
    btn.textContent = 'スキャン中…'; btn.disabled = true;
    scanFrame();
  } catch (e) {
    setStatus('カメラの起動に失敗しました: ' + e.message, 'err');
  }
}

function stopCamera() {
  scanning = false;
  if (rafId) cancelAnimationFrame(rafId);
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  video.srcObject = null;
  const btn = document.getElementById('cam-btn');
  btn.textContent = 'カメラを起動'; btn.disabled = false;
}

function scanFrame() {
  if (!scanning) return;
  if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
    if (code && code.data) { onQR(code.data); return; }
  }
  rafId = requestAnimationFrame(scanFrame);
}

function onQR(url) {
  stopCamera();
  const id = extractId(url);
  if (id) {
    setStatus('✓ スキャン成功！', 'ok');
    showResult(id, 'QRコードより取得');
  } else {
    // 読み取れたが対象外URLの場合、内容を表示して再試行を促す
    console.log('QR読み取り結果:', url);
    setStatus('対象外のQRコードです（読取値: ' + url.slice(0, 40) + '…）', 'err');
    document.getElementById('cam-btn').disabled = false;
    document.getElementById('cam-btn').textContent = 'カメラを起動';
  }
}

function extractId(url) {
  try {
    const id = new URL(url).searchParams.get('id');
    if (id && /^\d+$/.test(id)) return id;
  } catch (_) {
    const m = url.match(/[?&]id=(\d+)/);
    if (m) return m[1];
  }
  return null;
}

function applyManual() {
  const val = document.getElementById('manual-id').value.trim();
  if (!val || !/^\d+$/.test(val)) { setStatus('有効な数字を入力してください', 'err'); return; }
  stopCamera();
  setStatus('✓ 手動入力で設定しました', 'ok');
  showResult(val, '手動入力');
}

function setStatus(msg, cls) {
  const el = document.getElementById('scan-status');
  el.textContent = msg; el.className = cls;
}

// ── 結果表示 ──
let currentMemberId = null;

function showResult(memberId, source) {
  currentMemberId = memberId;
  document.getElementById('mid-display').textContent = memberId;
  document.getElementById('mid-sub').textContent = source;
  renderLinks(memberId);
  document.getElementById('page-scan').style.display = 'none';
  document.getElementById('page-result').style.display = 'flex';
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderLinks(memberId) {
  const list = document.getElementById('link-list');
  list.innerHTML = '';


  for (const s of sponsors) {
    const url = `https://mypage.shirucafe.com/store/pamphlet?id=${memberId}&sponsor=${s.id}`;
    const li = document.createElement('li');
    li.className = 'link-item';
    li.innerHTML = `
      <a href="${url}" target="_blank" rel="noopener">
        <span class="sid-badge">${s.id}</span>
        <span class="sname">${s.name}</span>
        <span class="arrow">➜</span>
      </a>
    `;
    list.appendChild(li);
  }
}

function reset() {
  currentMemberId = null;
  stopCamera();
  document.getElementById('page-result').style.display = 'none';
  document.getElementById('page-scan').style.display = 'flex';
  document.getElementById('manual-id').value = '';
  setStatus('カメラを起動してスキャンしてください', '');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

document.getElementById('manual-id').addEventListener('keydown', e => {
  if (e.key === 'Enter') applyManual();
});

