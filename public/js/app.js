// ===== API呼び出し =====
async function api(path, options = {}) {
  try {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'エラーが発生しました');
    return data;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

// ===== トースト通知 =====
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ===== タブ切り替え =====
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');

    // タブ遷移時にデータ再読込
    if (tab.dataset.tab === 'stores') loadStores();
    if (tab.dataset.tab === 'new-post') loadAccounts();
    if (tab.dataset.tab === 'manage') loadManagePosts();
    if (tab.dataset.tab === 'history') loadHistory();
  });
});

// ===== モーダル =====
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ===== 店舗管理 =====
let editingStoreId = null;

function openAddStoreModal() {
  editingStoreId = null;
  document.getElementById('store-modal-title').textContent = '店舗を追加';
  document.getElementById('store-name').value = '';
  document.getElementById('store-desc').value = '';
  openModal('store-modal');
}

function openEditStoreModal(store) {
  editingStoreId = store.id;
  document.getElementById('store-modal-title').textContent = '店舗を編集';
  document.getElementById('store-name').value = store.name;
  document.getElementById('store-desc').value = store.description || '';
  openModal('store-modal');
}

async function saveStore() {
  const name = document.getElementById('store-name').value.trim();
  const description = document.getElementById('store-desc').value.trim();
  if (!name) return showToast('店舗名を入力してください', 'error');

  if (editingStoreId) {
    await api(`/api/stores/${editingStoreId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description }),
    });
    showToast('更新しました', 'success');
  } else {
    await api('/api/stores', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
    showToast('店舗を追加しました', 'success');
  }

  closeModal('store-modal');
  loadStores();
}

async function deleteStore(id, name) {
  if (!confirm(`「${name}」を削除しますか？紐づくアカウント・投稿データも削除されます。`)) return;
  await api(`/api/stores/${id}`, { method: 'DELETE' });
  showToast('削除しました', 'success');
  loadStores();
}

async function disconnectTikTok(accountId) {
  if (!confirm('TikTokアカウントの連携を解除しますか？')) return;
  await api(`/auth/tiktok/disconnect/${accountId}`, { method: 'DELETE' });
  showToast('連携を解除しました', 'success');
  loadStores();
}

async function disconnectGoogle(accountId) {
  if (!confirm('Googleアカウントの連携を解除しますか？')) return;
  await api(`/auth/google/disconnect/${accountId}`, { method: 'DELETE' });
  showToast('連携を解除しました', 'success');
  loadStores();
}

async function disconnectInstagram(accountId) {
  if (!confirm('Instagramアカウントの連携を解除しますか？')) return;
  await api(`/auth/meta/disconnect/${accountId}`, { method: 'DELETE' });
  showToast('連携を解除しました', 'success');
  loadStores();
}

async function loadStores() {
  const stores = await api('/api/stores');
  const list = document.getElementById('store-list');

  if (stores.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>店舗がまだありません</p><p>「+ 店舗を追加」から始めましょう</p></div>';
    return;
  }

  let html = '<div class="grid grid-2">';
  for (const store of stores) {
    const accounts = await api(`/api/stores/${store.id}/accounts`);
    const tiktok = accounts.find(a => a.platform === 'tiktok' && a.is_active);
    const google = accounts.find(a => a.platform === 'google_business' && a.is_active);
    const instagram = accounts.find(a => a.platform === 'instagram' && a.is_active);

    html += `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${esc(store.name)}</span>
          <div>
            <button class="btn btn-outline btn-sm" onclick='openEditStoreModal(${JSON.stringify(store)})'>編集</button>
            <button class="btn btn-danger btn-sm" onclick="deleteStore(${store.id}, '${esc(store.name)}')">削除</button>
          </div>
        </div>
        ${store.description ? `<p style="color:var(--text-light);font-size:13px;margin-bottom:8px">${esc(store.description)}</p>` : ''}
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px">
          ${tiktok ? `
            <div class="account-status">
              <span class="platform-badge platform-tiktok">TikTok</span>
              <span class="status-dot ${isTokenExpired(tiktok.token_expires_at) ? 'expired' : 'connected'}"></span>
              <span class="account-name">${esc(tiktok.platform_username || tiktok.platform_user_id)}</span>
              <span class="account-actions">
                <a href="/auth/tiktok/authorize/${store.id}" class="btn btn-outline btn-sm">再連携</a>
                <button class="btn btn-outline btn-sm" onclick="disconnectTikTok(${tiktok.id})">解除</button>
              </span>
            </div>
          ` : `
            <a href="/auth/tiktok/authorize/${store.id}" class="btn btn-outline btn-sm">
              <span class="platform-badge platform-tiktok">TikTok</span> 連携する
            </a>
          `}
          ${google ? `
            <div class="account-status">
              <span class="platform-badge platform-google">Google</span>
              <span class="status-dot ${isTokenExpired(google.token_expires_at) ? 'expired' : 'connected'}"></span>
              <span class="account-name">${esc(google.platform_username || 'ビジネスプロフィール')}</span>
              <span class="account-actions">
                <a href="/auth/google/authorize/${store.id}" class="btn btn-outline btn-sm">再連携</a>
                <button class="btn btn-outline btn-sm" onclick="disconnectGoogle(${google.id})">解除</button>
              </span>
            </div>
          ` : `
            <a href="/auth/google/authorize/${store.id}" class="btn btn-outline btn-sm">
              <span class="platform-badge platform-google">Google</span> 連携する
            </a>
          `}
          ${instagram ? `
            <div class="account-status">
              <span class="platform-badge platform-instagram">Instagram</span>
              <span class="status-dot ${isTokenExpired(instagram.token_expires_at) ? 'expired' : 'connected'}"></span>
              <span class="account-name">${esc(instagram.platform_username || 'ビジネスアカウント')}</span>
              <span class="account-actions">
                <a href="/auth/meta/authorize/${store.id}" class="btn btn-outline btn-sm">再連携</a>
                <button class="btn btn-outline btn-sm" onclick="disconnectInstagram(${instagram.id})">解除</button>
              </span>
            </div>
          ` : `
            <a href="/auth/meta/authorize/${store.id}" class="btn btn-outline btn-sm">
              <span class="platform-badge platform-instagram">Instagram</span> 連携する
            </a>
          `}
        </div>
      </div>
    `;
  }
  html += '</div>';
  list.innerHTML = html;
}

// ===== 新規投稿 =====
let uploadedFile = null;

async function loadAccounts() {
  const stores = await api('/api/stores');
  const select = document.getElementById('post-account');
  select.innerHTML = '<option value="">選択してください</option>';

  for (const store of stores) {
    const accounts = await api(`/api/stores/${store.id}/accounts`);
    for (const acc of accounts) {
      if (!acc.is_active) continue;
      let platformLabel = 'TikTok';
      if (acc.platform === 'google_business') platformLabel = 'Google';
      if (acc.platform === 'instagram') platformLabel = 'Instagram';
      select.innerHTML += `<option value="${acc.id}" data-platform="${acc.platform}" data-posttype="instagram">[${store.name}] ${platformLabel} - ${acc.platform_username || acc.platform_user_id}</option>`;
      // Instagram連携があればFacebookページ投稿も選べるようにする
      if (acc.platform === 'instagram') {
        select.innerHTML += `<option value="${acc.id}" data-platform="instagram" data-posttype="facebook">[${store.name}] Facebook - ${acc.platform_username || 'ページ投稿'}</option>`;
      }
    }
  }

  // プラットフォーム切り替え時にフォームを変更
  select.addEventListener('change', togglePostForm);
}

function togglePostForm() {
  const select = document.getElementById('post-account');
  const selected = select.options[select.selectedIndex];
  const platform = selected ? selected.dataset.platform : '';
  const postType = selected ? selected.dataset.posttype : '';

  const tiktokFields = document.getElementById('tiktok-fields');
  const googleFields = document.getElementById('google-fields');
  const instagramFields = document.getElementById('instagram-fields');
  const facebookFields = document.getElementById('facebook-fields');

  // 全部非表示にしてから対象だけ表示
  if (tiktokFields) tiktokFields.style.display = 'none';
  if (googleFields) googleFields.style.display = 'none';
  if (instagramFields) instagramFields.style.display = 'none';
  if (facebookFields) facebookFields.style.display = 'none';

  if (platform === 'google_business') {
    if (googleFields) googleFields.style.display = 'block';
  } else if (platform === 'instagram' && postType === 'facebook') {
    if (facebookFields) facebookFields.style.display = 'block';
  } else if (platform === 'instagram') {
    if (instagramFields) instagramFields.style.display = 'block';
  } else {
    if (tiktokFields) tiktokFields.style.display = 'block';
  }
}

function toggleInstagramSchedule() {
  const postType = document.getElementById('instagram-post-type').value;
  const captionGroup = document.getElementById('instagram-caption-group');
  const scheduleGroup = document.getElementById('instagram-schedule-group');

  if (postType === 'story') {
    // ストーリーはキャプション不可。予約はサーバー側スケジューラーで対応
    if (captionGroup) captionGroup.style.display = 'none';
    if (scheduleGroup) scheduleGroup.style.display = 'block';
  } else {
    if (captionGroup) captionGroup.style.display = 'block';
    if (scheduleGroup) scheduleGroup.style.display = 'block';
  }
}

// 文字数カウント
document.getElementById('post-title').addEventListener('input', function() {
  document.getElementById('title-count').textContent = this.value.length;
});

// ドラッグ&ドロップ
const dropZone = document.getElementById('drop-zone');
const videoInput = document.getElementById('video-input');

dropZone.addEventListener('click', () => videoInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) handleVideoFile(e.dataTransfer.files[0]);
});
videoInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleVideoFile(e.target.files[0]);
});

function handleVideoFile(file) {
  const maxSize = 128 * 1024 * 1024;
  if (file.size > maxSize) {
    showToast('ファイルサイズは128MB以下にしてください', 'error');
    return;
  }

  const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
  if (!allowed.includes(file.type)) {
    showToast('対応形式: MP4, MOV, WebM', 'error');
    return;
  }

  uploadedFile = file;
  dropZone.style.display = 'none';

  const preview = document.getElementById('video-preview-area');
  preview.style.display = 'block';
  const video = document.getElementById('video-preview');
  video.src = URL.createObjectURL(file);
}

function clearVideo() {
  uploadedFile = null;
  document.getElementById('video-preview-area').style.display = 'none';
  document.getElementById('drop-zone').style.display = 'block';
  videoInput.value = '';
}

async function saveDraft() {
  const accountId = document.getElementById('post-account').value;
  if (!accountId) return showToast('アカウントを選択してください', 'error');
  if (!uploadedFile) return showToast('動画をアップロードしてください', 'error');

  const btn = document.getElementById('btn-save-draft');
  btn.disabled = true;
  btn.textContent = 'アップロード中...';

  try {
    // 動画アップロード
    const formData = new FormData();
    formData.append('video', uploadedFile);

    const uploadRes = await fetch('/api/posts/upload', { method: 'POST', body: formData });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) throw new Error(uploadData.error);

    // 投稿作成
    const scheduledAt = document.getElementById('post-schedule').value || null;

    await api('/api/posts', {
      method: 'POST',
      body: JSON.stringify({
        sns_account_id: parseInt(accountId),
        title: document.getElementById('post-title').value,
        video_path: uploadData.path,
        video_size: uploadData.size,
        privacy_level: document.getElementById('post-privacy').value,
        scheduled_at: scheduledAt,
      }),
    });

    showToast('下書きを保存しました', 'success');

    // リセット
    clearVideo();
    document.getElementById('post-title').value = '';
    document.getElementById('title-count').textContent = '0';
    document.getElementById('post-schedule').value = '';

    // 投稿管理タブに遷移
    document.querySelector('[data-tab="manage"]').click();

  } catch (err) {
    showToast('保存失敗: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '下書き保存';
  }
}

// ===== 投稿管理 =====
async function loadManagePosts() {
  const filter = document.getElementById('manage-filter').value;
  const statuses = filter ? [filter] : ['draft', 'scheduled', 'approved', 'uploading', 'processing'];
  let allPosts = [];

  for (const s of statuses) {
    const posts = await api(`/api/posts?status=${s}`);
    allPosts = allPosts.concat(posts);
  }

  const tbody = document.getElementById('manage-table');
  const empty = document.getElementById('manage-empty');

  if (allPosts.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  tbody.innerHTML = allPosts.map(p => `
    <tr>
      <td>${esc(p.store_name)}</td>
      <td>${p.post_platform ? `<span class="platform-badge platform-${platformClass(p.post_platform)}">${platformLabel(p.post_platform)}</span>` : `<span class="platform-badge platform-${p.platform}">${platformLabel(p.platform)}</span>`}</td>
      <td>${esc((p.title || '').substring(0, 40))}${(p.title || '').length > 40 ? '...' : ''}</td>
      <td>${p.scheduled_at ? formatDate(p.scheduled_at) : '---'}</td>
      <td><span class="badge badge-${p.status}">${statusLabel(p.status)}</span></td>
      <td>
        ${['draft', 'scheduled'].includes(p.status) ? `
          <button class="btn btn-success btn-sm" onclick="approvePost(${p.id})">投稿する</button>
          <button class="btn btn-outline btn-sm" onclick="cancelPost(${p.id})">キャンセル</button>
        ` : ''}
        ${p.status === 'approved' ? `
          <span style="font-size:12px;color:var(--text-light)">予約時刻に投稿されます</span>
          <button class="btn btn-outline btn-sm" onclick="cancelPost(${p.id})">キャンセル</button>
        ` : ''}
        ${['uploading', 'processing'].includes(p.status) ? `
          <span style="font-size:12px;color:var(--warning)">処理中...</span>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

async function approvePost(id) {
  if (!confirm('この投稿を実行しますか？')) return;

  try {
    const result = await api(`/api/posts/${id}/approve`, { method: 'POST' });
    showToast(result.message, 'success');
    loadManagePosts();
  } catch (err) {
    // エラーは api() 内で表示済み
  }
}

async function cancelPost(id) {
  if (!confirm('この投稿をキャンセルしますか？')) return;
  await api(`/api/posts/${id}/cancel`, { method: 'POST' });
  showToast('キャンセルしました', 'success');
  loadManagePosts();
}

// ===== 投稿履歴 =====
async function loadHistory() {
  const filter = document.getElementById('history-filter').value;
  const params = filter ? `?status=${filter}` : '';
  const posts = await api(`/api/posts${params}`);

  // 完了・失敗・キャンセルのみ表示
  const historyPosts = posts.filter(p => ['published', 'failed', 'cancelled'].includes(p.status));

  const tbody = document.getElementById('history-table');
  const empty = document.getElementById('history-empty');

  if (historyPosts.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  tbody.innerHTML = historyPosts.map(p => `
    <tr>
      <td>${esc(p.store_name)}</td>
      <td>${p.post_platform ? `<span class="platform-badge platform-${platformClass(p.post_platform)}">${platformLabel(p.post_platform)}</span>` : `<span class="platform-badge platform-${p.platform}">${platformLabel(p.platform)}</span>`}</td>
      <td>${esc((p.title || '').substring(0, 30))}${(p.title || '').length > 30 ? '...' : ''}</td>
      <td><span class="badge badge-${p.status}">${statusLabel(p.status)}</span></td>
      <td>${p.published_at ? formatDate(p.published_at) : formatDate(p.updated_at)}</td>
      <td style="color:var(--danger);font-size:12px">${esc(p.error_message || '')}</td>
    </tr>
  `).join('');
}

// ===== ユーティリティ =====
function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function isTokenExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function platformLabel(platform) {
  const labels = {
    tiktok: 'TikTok',
    instagram: 'Instagram',
    instagram_story: 'IG Story',
    facebook: 'Facebook',
    google_business: 'Google',
  };
  return labels[platform] || platform || '---';
}

function platformClass(platform) {
  const classes = {
    tiktok: 'tiktok',
    instagram: 'instagram',
    instagram_story: 'instagram',
    facebook: 'facebook',
    google_business: 'google',
  };
  return classes[platform] || platform || '';
}

function statusLabel(status) {
  const labels = {
    draft: '下書き',
    scheduled: '予約済み',
    approved: '承認済み',
    uploading: 'アップロード中',
    processing: '処理中',
    published: '投稿完了',
    failed: '失敗',
    cancelled: 'キャンセル',
  };
  return labels[status] || status;
}

// ===== 共通: 画像アップロード処理 =====
// ファイル選択時にサーバーへアップして公開URLを返す
// ratio: 'story' を指定すると 1080×1920 9:16 にサーバー側で自動変換
async function uploadImageFile(file, statusEl, ratio) {
  const maxSize = 8 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('画像サイズは8MB以下にしてください');
  }
  const allowed = ['image/jpeg', 'image/png'];
  if (!allowed.includes(file.type)) {
    throw new Error('対応形式: JPG, PNG');
  }

  if (statusEl) statusEl.textContent = ratio === 'story' ? '9:16に変換してアップロード中...' : 'アップロード中...';

  const formData = new FormData();
  formData.append('image', file);

  const query = ratio ? `?ratio=${encodeURIComponent(ratio)}` : '';
  const res = await fetch('/api/posts/upload-image' + query, { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'アップロードに失敗しました');

  if (statusEl) statusEl.textContent = `アップロード完了（${(file.size / 1024).toFixed(0)} KB）`;
  return data.url;
}

// ===== Instagram用 画像選択処理 =====
let instagramUploadedImageUrl = null;

function setupImageDropZone(zoneId, inputId, previewAreaId, previewImgId, statusId, urlSetter, ratioFn) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleImageFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', (e) => {
    if (e.target.files.length) handleImageFile(e.target.files[0]);
  });

  async function handleImageFile(file) {
    const previewArea = document.getElementById(previewAreaId);
    const previewImg = document.getElementById(previewImgId);
    const statusEl = document.getElementById(statusId);

    // プレビュー表示
    previewImg.src = URL.createObjectURL(file);
    zone.style.display = 'none';
    previewArea.style.display = 'block';

    try {
      const ratio = typeof ratioFn === 'function' ? ratioFn() : null;
      const url = await uploadImageFile(file, statusEl, ratio);
      urlSetter(url);
    } catch (err) {
      showToast(err.message, 'error');
      statusEl.textContent = '失敗: ' + err.message;
      urlSetter(null);
    }
  }
}

// Instagram/Facebookの画像ドロップゾーンをセットアップ
// Instagramはストーリー選択時に9:16自動変換する
setupImageDropZone(
  'instagram-drop-zone',
  'instagram-image-input',
  'instagram-image-preview-area',
  'instagram-image-preview',
  'instagram-image-status',
  (url) => { instagramUploadedImageUrl = url; },
  () => {
    const type = document.getElementById('instagram-post-type');
    return type && type.value === 'story' ? 'story' : null;
  }
);

let facebookUploadedImageUrl = null;
setupImageDropZone(
  'facebook-drop-zone',
  'facebook-image-input',
  'facebook-image-preview-area',
  'facebook-image-preview',
  'facebook-image-status',
  (url) => { facebookUploadedImageUrl = url; }
);

let googleUploadedImageUrl = null;
setupImageDropZone(
  'google-drop-zone',
  'google-image-input',
  'google-image-preview-area',
  'google-image-preview',
  'google-image-status',
  (url) => { googleUploadedImageUrl = url; }
);

function clearInstagramImage() {
  instagramUploadedImageUrl = null;
  document.getElementById('instagram-image-preview-area').style.display = 'none';
  document.getElementById('instagram-drop-zone').style.display = 'block';
  document.getElementById('instagram-image-input').value = '';
  document.getElementById('instagram-image-status').textContent = '';
}

function clearFacebookImage() {
  facebookUploadedImageUrl = null;
  document.getElementById('facebook-image-preview-area').style.display = 'none';
  document.getElementById('facebook-drop-zone').style.display = 'block';
  document.getElementById('facebook-image-input').value = '';
  document.getElementById('facebook-image-status').textContent = '';
}

function clearGoogleImage() {
  googleUploadedImageUrl = null;
  document.getElementById('google-image-preview-area').style.display = 'none';
  document.getElementById('google-drop-zone').style.display = 'block';
  document.getElementById('google-image-input').value = '';
  document.getElementById('google-image-status').textContent = '';
}

// ===== Instagram投稿 =====
document.getElementById('instagram-caption')?.addEventListener('input', function() {
  document.getElementById('instagram-caption-count').textContent = this.value.length;
});

async function submitInstagramPost() {
  const accountId = document.getElementById('post-account').value;
  if (!accountId) return showToast('アカウントを選択してください', 'error');

  // 画像URL: アップロード済みファイル優先、なければURL入力欄
  const imageUrl = instagramUploadedImageUrl || document.getElementById('instagram-image-url').value.trim();
  if (!imageUrl) return showToast('画像を選択するかURLを入力してください', 'error');

  const postType = document.getElementById('instagram-post-type').value;

  const btn = document.getElementById('btn-instagram-post');
  btn.disabled = true;
  btn.textContent = '投稿中...';

  try {
    const body = {
      sns_account_id: parseInt(accountId),
      image_url: imageUrl,
      caption: document.getElementById('instagram-caption').value || '',
      post_type: postType,
    };

    // 予約日時（通常投稿のみ）
    const scheduleEl = document.getElementById('instagram-schedule');
    if (scheduleEl && scheduleEl.value && postType === 'feed') {
      body.scheduled_publish_time = scheduleEl.value;
    }

    const result = await api('/api/posts/instagram', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    showToast(result.message, 'success');
    document.getElementById('instagram-image-url').value = '';
    document.getElementById('instagram-caption').value = '';
    document.getElementById('instagram-caption-count').textContent = '0';
    if (scheduleEl) scheduleEl.value = '';
    clearInstagramImage();

  } catch (err) {
    showToast('投稿失敗: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '投稿する';
  }
}

// ===== Facebook投稿 =====
document.getElementById('facebook-message')?.addEventListener('input', function() {
  document.getElementById('facebook-message-count').textContent = this.value.length;
});

async function submitFacebookPost() {
  const accountId = document.getElementById('post-account').value;
  if (!accountId) return showToast('アカウントを選択してください', 'error');

  const message = document.getElementById('facebook-message').value.trim();
  if (!message) return showToast('投稿内容を入力してください', 'error');

  const btn = document.getElementById('btn-facebook-post');
  btn.disabled = true;
  btn.textContent = '投稿中...';

  try {
    // 画像URL: アップロード済みファイル優先、なければURL入力欄
    const fbImageUrl = facebookUploadedImageUrl || document.getElementById('facebook-image-url').value.trim() || null;

    const body = {
      sns_account_id: parseInt(accountId),
      message,
      image_url: fbImageUrl,
    };

    const scheduleEl = document.getElementById('facebook-schedule');
    if (scheduleEl && scheduleEl.value) {
      body.scheduled_publish_time = scheduleEl.value;
    }

    const result = await api('/api/posts/facebook', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    showToast(result.message, 'success');
    document.getElementById('facebook-message').value = '';
    document.getElementById('facebook-message-count').textContent = '0';
    document.getElementById('facebook-image-url').value = '';
    if (scheduleEl) scheduleEl.value = '';
    clearFacebookImage();

  } catch (err) {
    showToast('投稿失敗: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '投稿する';
  }
}

// ===== Google投稿 =====
document.getElementById('google-summary')?.addEventListener('input', function() {
  document.getElementById('google-summary-count').textContent = this.value.length;
});

document.getElementById('google-cta-type')?.addEventListener('change', function() {
  const urlGroup = document.getElementById('google-cta-url-group');
  urlGroup.style.display = this.value ? 'block' : 'none';
});

async function submitGooglePost() {
  const accountId = document.getElementById('post-account').value;
  if (!accountId) return showToast('アカウントを選択してください', 'error');

  const summary = document.getElementById('google-summary').value.trim();
  if (!summary) return showToast('投稿内容を入力してください', 'error');

  const btn = document.getElementById('btn-google-post');
  btn.disabled = true;
  btn.textContent = '投稿中...';

  try {
    const mediaUrl = googleUploadedImageUrl || document.getElementById('google-image-url').value.trim();

    const body = {
      sns_account_id: parseInt(accountId),
      summary,
      call_to_action_type: document.getElementById('google-cta-type').value || null,
      call_to_action_url: document.getElementById('google-cta-url').value || null,
      media_url: mediaUrl || null,
    };

    const googleScheduleEl = document.getElementById('google-schedule');
    if (googleScheduleEl && googleScheduleEl.value) {
      body.scheduled_publish_time = googleScheduleEl.value;
    }

    const result = await api('/api/posts/google', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    showToast(result.message || 'Googleビジネスプロフィールに投稿しました', 'success');
    document.getElementById('google-summary').value = '';
    document.getElementById('google-summary-count').textContent = '0';
    document.getElementById('google-cta-type').value = '';
    document.getElementById('google-cta-url').value = '';
    document.getElementById('google-cta-url-group').style.display = 'none';
    document.getElementById('google-image-url').value = '';
    if (typeof clearGoogleImage === 'function') clearGoogleImage();
    if (googleScheduleEl) googleScheduleEl.value = '';

  } catch (err) {
    showToast('投稿失敗: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '投稿する';
  }
}

// ===== 初期化 =====
(async function init() {
  // URLパラメータでメッセージ表示
  const params = new URLSearchParams(location.search);
  if (params.get('success')) showToast(params.get('success'), 'success');
  if (params.get('error')) showToast(params.get('error'), 'error');
  if (params.has('success') || params.has('error')) {
    history.replaceState(null, '', '/');
  }

  await loadStores();
})();
