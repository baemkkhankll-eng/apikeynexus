let keys = [];
let selectedKeyId = null;
let currentUser = null;

// Load user and keys on page load
document.addEventListener('DOMContentLoaded', checkAuth);

async function checkAuth() {
  try {
    const response = await fetch('/api/user');
    currentUser = await response.json();
    
    if (currentUser) {
      document.getElementById('login-page').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      document.getElementById('user-username').textContent = currentUser.username;
      document.getElementById('user-dev-id').textContent = `รหัสผู้พัฒนา: ${currentUser.developerId}`;
      loadKeys();
    } else {
      document.getElementById('login-page').classList.remove('hidden');
      document.getElementById('dashboard').classList.add('hidden');
    }
  } catch (error) {
    console.error('Error checking auth:', error);
  }
}

async function loadKeys() {
  try {
    const response = await fetch('/api/keys');
    const data = await response.json();
    keys = data.keys;
    updateStats(data.stats);
    renderKeysTable();
  } catch (error) {
    console.error('Error loading keys:', error);
  }
}

function updateStats(stats) {
  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-active').textContent = stats.active;
  document.getElementById('stat-banned').textContent = stats.banned;
  document.getElementById('stat-expired').textContent = stats.expired;
}

function renderKeysTable() {
  const tbody = document.getElementById('keys-table-body');
  
  if (keys.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-12 text-center text-slate-500">ยังไม่มีการสร้างคีย์</td></tr>';
    return;
  }

  tbody.innerHTML = keys.map(key => {
    const isExpired = new Date(key.expiresAt) < new Date();
    const isBanned = key.status === 'banned';
    
    let statusBadge = '';
    if (isBanned) {
      statusBadge = '<span class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">ถูกระงับ</span>';
    } else if (isExpired) {
      statusBadge = '<span class="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">หมดอายุ</span>';
    } else {
      statusBadge = '<span class="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">ใช้งานอยู่</span>';
    }

    const createdDate = new Date(key.createdAt).toLocaleString();
    const expiresDate = new Date(key.expiresAt).toLocaleString();
    const hwidDisplay = key.hwid ? `<span class="font-mono text-xs text-slate-600">${key.hwid.substring(0, 16)}...</span>` : '<span class="text-slate-400">ยังไม่ล็อก</span>';

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="px-6 py-4">
          <span class="font-mono font-medium text-slate-900">${key.key}</span>
        </td>
        <td class="px-6 py-4 text-sm text-slate-600">${createdDate}</td>
        <td class="px-6 py-4 text-sm text-slate-600">${expiresDate}</td>
        <td class="px-6 py-4">${hwidDisplay}</td>
        <td class="px-6 py-4">${statusBadge}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-2">
            ${isBanned ? `
              <button onclick="unbanKey('${key.id}')" class="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="ปลดระงับคีย์">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </button>
            ` : `
              <button onclick="openBanModal('${key.id}')" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ระงับคีย์">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                </svg>
              </button>
            `}
            ${key.hwid ? `
              <button onclick="resetHWID('${key.id}')" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="รีเซ็ต HWID">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              </button>
            ` : ''}
            <button onclick="deleteKey('${key.id}')" class="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="ลบคีย์">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function generateKey() {
  const duration = document.getElementById('duration').value;
  const durationUnit = document.getElementById('duration-unit').value;
  const customKey = document.getElementById('custom-key').value.trim();

  try {
    const response = await fetch('/api/keys/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: parseInt(duration), durationUnit, customKey })
    });

    if (response.ok) {
      document.getElementById('custom-key').value = '';
      await loadKeys();
    } else {
      const error = await response.json();
      alert(error.error || 'เกิดข้อผิดพลาดในการสร้างคีย์');
    }
  } catch (error) {
    console.error('Error generating key:', error);
  }
}

async function generateRandomKey() {
  const duration = document.getElementById('duration').value;
  const durationUnit = document.getElementById('duration-unit').value;

  try {
    const response = await fetch('/api/keys/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: parseInt(duration), durationUnit, customKey: '' })
    });

    if (response.ok) {
      await loadKeys();
    }
  } catch (error) {
    console.error('Error generating key:', error);
  }
}

function openBanModal(keyId) {
  selectedKeyId = keyId;
  document.getElementById('ban-modal').classList.remove('hidden');
  document.getElementById('ban-reason').value = '';
}

function closeBanModal() {
  selectedKeyId = null;
  document.getElementById('ban-modal').classList.add('hidden');
}

async function confirmBan() {
  const reason = document.getElementById('ban-reason').value;

  if (!reason.trim()) {
    alert('กรุณาระบุเหตุผลในการระงับคีย์');
    return;
  }

  try {
    const response = await fetch(`/api/keys/${selectedKeyId}/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });

    if (response.ok) {
      closeBanModal();
      await loadKeys();
    }
  } catch (error) {
    console.error('Error banning key:', error);
  }
}

async function unbanKey(keyId) {
  if (!confirm('คุณแน่ใจหรือไม่ที่จะปลดระงับคีย์นี้?')) return;

  try {
    const response = await fetch(`/api/keys/${keyId}/unban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      await loadKeys();
    }
  } catch (error) {
    console.error('Error unbanning key:', error);
  }
}

async function resetHWID(keyId) {
  if (!confirm('คุณแน่ใจหรือไม่ที่จะรีเซ็ต HWID สำหรับคีย์นี้? สิ่งนี้จะอนุญาตให้ใช้คีย์บนเครื่องอื่นได้')) return;

  try {
    const response = await fetch(`/api/keys/${keyId}/reset-hwid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      await loadKeys();
    }
  } catch (error) {
    console.error('Error resetting HWID:', error);
  }
}

async function deleteKey(keyId) {
  if (!confirm('คุณแน่ใจหรือไม่ที่จะลบคีย์นี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;

  try {
    const response = await fetch(`/api/keys/${keyId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      await loadKeys();
    }
  } catch (error) {
    console.error('Error deleting key:', error);
  }
}
