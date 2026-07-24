// セラピスト向け顧客管理アプリ：UI・DOM操作制御モジュール

import {
    getCustomers, addCustomer, addRecord, updateCustomer, updateRecord, deleteRecord, deleteCustomer,
    archiveCustomer, unarchiveCustomer,
    getSoulColors, getMainSoulColor, MAX_SOUL_COLORS, SOUL_COLOR_DEFS,
    getPlans, addPlan, updatePlan, deletePlan,
    getColorMasters, saveColorMasters, addColorMaster, updateColorMaster, deleteColorMaster
} from './data.js';

// モジュールスコープでコールバック変数を宣言
let onRecordEditRequested = null;

/**
 * 画面上部にトーストメッセージを表示する
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    if (!toast) return;

    if (toastMsg) toastMsg.textContent = message;
    if (toastIcon) {
        toastIcon.textContent = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
    }

    toast.style.borderColor = type === 'error' ? '#ff5252' : type === 'success' ? '#00e676' : 'var(--accent-cyan)';
    toast.style.opacity = '1';
    toast.style.pointerEvents = 'auto';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.pointerEvents = 'none';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
    }, 2500);
}

/** [ISSUE-NEW] 下書きを保存する */
function saveRecordDraft(customerId) {
    if (!customerId) return;
    const draft = {
        date: document.getElementById('input-date')?.value,
        time: document.getElementById('input-time')?.value,
        type: document.getElementById('input-type')?.value,
        clientComplaint: document.getElementById('input-client-complaint')?.value,
        prescription: document.getElementById('input-prescription')?.value,
        therapistNote: document.getElementById('input-therapist-note')?.value,
        amount: document.getElementById('input-amount')?.value,
        timestamp: Date.now()
    };
    localStorage.setItem(`record_draft_${customerId}`, JSON.stringify(draft));
    const indicator = document.getElementById('draft-indicator');
    if (indicator) indicator.style.display = 'block';
}

/** [ISSUE-NEW] 下書きを読み込む */
function loadRecordDraft(customerId) {
    if (!customerId) return;
    const raw = localStorage.getItem(`record_draft_${customerId}`);
    if (!raw) {
        const indicator = document.getElementById('draft-indicator');
        if (indicator) indicator.style.display = 'none';
        return;
    }
    const draft = JSON.parse(raw);
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) el.value = val;
    };
    setVal('input-date', draft.date);
    setVal('input-time', draft.time);
    setVal('input-type', draft.type);
    setVal('input-client-complaint', draft.clientComplaint);
    setVal('input-prescription', draft.prescription);
    setVal('input-therapist-note', draft.therapistNote);
    setVal('input-amount', draft.amount);
    
    const indicator = document.getElementById('draft-indicator');
    if (indicator) indicator.style.display = 'block';
}

/** [ISSUE-NEW] 下書きを消去 */
function clearRecordDraft(customerId) {
    if (!customerId) return;
    localStorage.removeItem(`record_draft_${customerId}`);
    const indicator = document.getElementById('draft-indicator');
    if (indicator) indicator.style.display = 'none';
}

/**
 * カスタム削除・確認モーダルを表示する（iFrame内でのconfirmブロック回避）
 */
function showConfirmModal({ title = '確認', message = '処理を実行しますか？', actionText = '削除する', onConfirm, icon = '🗑️', theme = 'danger' }) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const messageEl = document.getElementById('confirm-modal-message');
    const actionTextEl = document.getElementById('confirm-modal-action-text');
    const iconEl = document.getElementById('confirm-modal-icon');
    const btnIconEl = document.getElementById('confirm-modal-btn-icon');
    const contentEl = document.getElementById('confirm-modal-content');
    const btnCancel = document.getElementById('btn-cancel-confirm');
    const btnSubmit = document.getElementById('btn-submit-confirm');

    if (!modal) {
        if (onConfirm) onConfirm();
        return;
    }

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (actionTextEl) actionTextEl.textContent = actionText;
    if (iconEl) iconEl.textContent = icon;
    if (btnIconEl) btnIconEl.textContent = icon;

    // テーマに基づいたスタイリング
    if (contentEl && btnSubmit) {
        if (theme === 'success') {
            contentEl.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            contentEl.style.boxShadow = '0 10px 30px rgba(16, 185, 129, 0.25)';
            btnSubmit.style.background = '#10b981';
        } else if (theme === 'warning') {
            contentEl.style.borderColor = 'rgba(245, 158, 11, 0.5)';
            contentEl.style.boxShadow = '0 10px 30px rgba(245, 158, 11, 0.25)';
            btnSubmit.style.background = '#f59e0b';
        } else {
            // default danger
            contentEl.style.borderColor = 'rgba(255, 82, 82, 0.5)';
            contentEl.style.boxShadow = '0 10px 30px rgba(255, 82, 82, 0.25)';
            btnSubmit.style.background = '#ff5252';
        }
    }

    modal.classList.add('active');

    const cleanup = () => {
        modal.classList.remove('active');
        if (btnCancel) btnCancel.removeEventListener('click', handleCancel);
        if (btnSubmit) btnSubmit.removeEventListener('click', handleSubmit);
    };

    const handleCancel = (e) => {
        if (e) e.stopPropagation();
        cleanup();
    };

    const handleSubmit = (e) => {
        if (e) e.stopPropagation();
        cleanup();
        if (onConfirm) onConfirm();
    };

    if (btnCancel) btnCancel.addEventListener('click', handleCancel, { once: true });
    if (btnSubmit) btnSubmit.addEventListener('click', handleSubmit, { once: true });
}

// -------------------------------------------------------------------
// [ISSUE-018] Soul Color（最大5色）共通ヘルパー
// -------------------------------------------------------------------

export const SOUL_COLOR_MAP = {
    '1-red': '#ef4444',
    '2-blue': '#3b82f6',
    '3-yellow': '#facc15',
    '4-green': '#22c55e',
    '5-turquoise': '#06b6d4',
    '6-pink': '#f472b6',
    '7-purple': '#a855f7',
    '8-orange': '#f97316',
    '9-magenta': '#d946ef',
    '11-indigo': '#4f46e5',
    '22-olive': '#84cc16',
    '33-evolved-pink': 'linear-gradient(135deg, #ff66c4 0%, #f43f5e 100%)',
    // 後方互換キー
    'red': '#ef4444',
    'coral': '#f87171',
    'orange': '#f97316',
    'gold': '#fbbf24',
    'yellow': '#facc15',
    'olive': '#84cc16',
    'green': '#22c55e',
    'turquoise': '#06b6d4',
    'blue': '#3b82f6',
    'royal-blue': '#3b82f6',
    'violet': '#a855f7',
    'magenta': '#d946ef',
    'clear': 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)',
};

export const SOUL_COLOR_NAMES = {
    '1-red': '赤',
    '2-blue': '青',
    '3-yellow': '黄',
    '4-green': '緑',
    '5-turquoise': 'ターコイズ',
    '6-pink': 'ピンク',
    '7-purple': '紫',
    '8-orange': 'オレンジ',
    '9-magenta': 'マゼンタピンク',
    '11-indigo': 'インディゴ',
    '22-olive': 'オリーブグリーン',
    '33-evolved-pink': '進化系pink',
    'red': '赤',
    'blue': '青',
    'yellow': '黄',
    'green': '緑',
    'turquoise': 'ターコイズ',
    'pink': 'ピンク',
    'purple': '紫',
    'orange': 'オレンジ',
    'magenta': 'マゼンタピンク',
    'indigo': 'インディゴ',
    'olive': 'オリーブグリーン',
    'clear': 'クリア（未選択）',
};

export function getSoulColorCssValue(color) {
    if (!color || color === 'clear') return 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)';
    if (color.startsWith('#')) return color;
    return SOUL_COLOR_MAP[color] || color;
}

/** HEXコードから直感的で綺麗な日本語色名を判別するヘルパー */
export function getColorNameFromHex(hex) {
    if (!hex || !hex.startsWith('#')) return 'カスタムカラー';
    
    let c = hex.substring(1);
    if (c.length === 3) {
        c = c.split('').map(x => x + x).join('');
    }
    if (c.length !== 6) return 'カスタムカラー';

    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);

    const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
            case gNorm: h = (bNorm - rNorm) / d + 2; break;
            case bNorm: h = (rNorm - gNorm) / d + 4; break;
        }
        h /= 6;
    }

    const hueDeg = Math.round(h * 360);
    const satPct = Math.round(s * 100);
    const lightPct = Math.round(l * 100);

    // 1. 白・黒・グレースケール
    if (lightPct >= 96) return 'ホワイト';
    if (lightPct <= 8) return 'ブラック';

    if (satPct <= 12) {
        if (lightPct >= 80) return 'ライトグレー';
        if (lightPct >= 55) return 'グレー';
        if (lightPct >= 30) return 'ダークグレー';
        return 'チャコール';
    }

    // 2. 有彩色（色相＆明度から自動命名）
    if (hueDeg >= 355 || hueDeg < 11) {
        if (lightPct >= 72) return 'ライトピンク';
        if (lightPct <= 35) return 'ワインレッド';
        return 'レッド';
    }
    if (hueDeg >= 11 && hueDeg < 26) {
        if (lightPct >= 72) return 'サーモンピンク';
        return 'コーラル';
    }
    if (hueDeg >= 26 && hueDeg < 46) {
        if (lightPct >= 72) return 'ライトオレンジ';
        if (lightPct <= 35) return 'ブラウン';
        return 'オレンジ';
    }
    if (hueDeg >= 46 && hueDeg < 66) {
        if (lightPct >= 75) return 'クリームイエロー';
        if (lightPct <= 35) return 'オリーブゴールド';
        return 'イエロー';
    }
    if (hueDeg >= 66 && hueDeg < 86) {
        if (lightPct <= 35) return 'オリーブ';
        return 'ライムグリーン';
    }
    if (hueDeg >= 86 && hueDeg < 141) {
        if (lightPct >= 72) return 'ミントグリーン';
        if (lightPct <= 35) return 'ディープグリーン';
        return 'グリーン';
    }
    if (hueDeg >= 141 && hueDeg < 191) {
        if (lightPct >= 72) return 'ライトターコイズ';
        if (lightPct <= 35) return 'ダークティール';
        return 'ターコイズ';
    }
    if (hueDeg >= 191 && hueDeg < 226) {
        if (lightPct >= 72) return 'スカイブルー';
        if (lightPct <= 35) return 'ネイビー';
        return 'ブルー';
    }
    if (hueDeg >= 226 && hueDeg < 261) {
        if (lightPct >= 72) return 'ラベンダーブルー';
        if (lightPct <= 35) return 'インディゴ';
        return 'ロイヤルブルー';
    }
    if (hueDeg >= 261 && hueDeg < 291) {
        if (lightPct >= 72) return 'ラベンダー';
        if (lightPct <= 35) return 'ダークパープル';
        return 'バイオレット';
    }
    if (hueDeg >= 291 && hueDeg < 331) {
        if (lightPct >= 72) return 'オーキッドピンク';
        if (lightPct <= 35) return 'ディープマゼンタ';
        return 'マゼンタ';
    }
    if (hueDeg >= 331 && hueDeg < 355) {
        if (lightPct >= 72) return 'チェリーピンク';
        if (lightPct <= 35) return 'ダークローズ';
        return 'ローズ';
    }

    return 'カラー';
}

export function getSoulColorName(color) {
    if (!color || color === 'clear') return 'クリア（未選択）';
    if (SOUL_COLOR_NAMES[color]) return SOUL_COLOR_NAMES[color];

    // 設定済みカラーマスター（ユーザー独自登録）から優先検索
    const masters = getColorMasters();
    const match = masters.find(m => m.id === color || m.code.toLowerCase() === color.toLowerCase());
    if (match) return match.name;

    if (color.startsWith('#')) return getColorNameFromHex(color);
    return color;
}

/** 13色のカラーチップHTMLを生成する（選択UI用） */
function buildColorChipsHtml() {
    return SOUL_COLOR_DEFS
        .map(c => `<span class="color-chip ${c.key}" data-color="${c.key}" title="${c.label}"></span>`)
        .join('');
}

/**
 * 選択済みカラーを「上段3色・下段2色」で表示するHTMLを生成する。
 * 色が5色未満のときは、その分だけ詰めて表示する。
 */
function buildSoulColorBadgeHtml(colors, size = 'md') {
    const list = (colors || []).slice(0, MAX_SOUL_COLORS);
    if (list.length === 0) return '';
    const top = list.slice(0, 3);
    const bottom = list.slice(3, 5);
    const dots = arr => arr.map(c => {
        const cssVal = getSoulColorCssValue(c);
        const style = cssVal.includes('gradient') ? `background: ${cssVal};` : `background-color: ${cssVal};`;
        return `<span class="soul-dot" style="${style}"></span>`;
    }).join('');
    return `
        <span class="soul-color-badge ${size === 'sm' ? 'sm' : ''}">
            <span class="soul-color-badge-row">${dots(top)}</span>
            ${bottom.length ? `<span class="soul-color-badge-row">${dots(bottom)}</span>` : ''}
        </span>
    `;
}

/** 顧客の1色目（メインカラー）インジケーター丸ポチHTMLを生成する */
function buildCustomerColorIndicatorHtml(customer) {
    const mainColor = getMainSoulColor(customer);
    const cssVal = getSoulColorCssValue(mainColor);
    const style = cssVal.includes('gradient') ? `background: ${cssVal};` : `background-color: ${cssVal};`;
    return `<span class="customer-color-indicator" style="${style}"></span>`;
}

/**
 * [ISSUE-019] 施術記録の「訴え・処方・メモ」を描画する。
 *
 * 以前は値があるときだけ行を出していたため、旧バージョンで作成された記録
 * （マイグレーションで空文字が入る）では行ごと消え、項目自体が存在しない
 * ように見えていた。未記入でも項目名は必ず表示し、値だけをプレースホルダに
 * 置き換えることで「未記入」であることが分かるようにする。
 */
function buildRecordDetailsHtml(r) {
    const rows = [
        { label: '訴え', value: r.clientComplaint, color: 'var(--accent-warning)' },
        { label: '処方', value: r.prescription, color: 'var(--accent-cyan)' },
        { label: 'メモ', value: r.therapistNote, color: 'var(--accent-purple)' },
    ];
    return rows.map(({ label, value, color }) => {
        const filled = value && value.trim();
        return `
            <div style="font-size: 0.85rem; margin-top: 4px;${filled ? '' : ' opacity: 0.45;'}">
                <span style="color: ${color}; font-weight: 500;">${label}:</span>
                ${filled ? value : '未記入'}
            </div>`;
    }).join('');
}

/**
 * 施術記録（予約）カードの「変更」および「削除」ボタンHTML描画
 */
function buildRecordEditButtonHtml(r) {
    return `
        <div style="display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end;">
            <button class="btn-edit-record" title="記録を変更" style="background: rgba(0, 242, 254, 0.12); border: 1px solid var(--accent-cyan); color: var(--accent-cyan); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                ✏️ <span class="btn-text">変更</span>
            </button>
            <button class="btn-delete-record" title="記録を削除" style="background: rgba(255, 82, 82, 0.12); border: 1px solid #ff5252; color: #ff5252; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                🗑️ <span class="btn-text">削除</span>
            </button>
        </div>
    `;
}

/**
 * 変更・削除ボタンへのイベントハンドラ結び付け
 */
function attachRecordEditHandler(container, customerId, recordId, onRefresh) {
    const btnEdit = container.querySelector('.btn-edit-record');
    if (btnEdit) {
        btnEdit.addEventListener('click', (e) => {
            e.stopPropagation();
            if (onRecordEditRequested) onRecordEditRequested(customerId, recordId);
        });
    }

    const btnDelete = container.querySelector('.btn-delete-record');
    if (btnDelete) {
        btnDelete.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            showConfirmModal({
                title: '予約・施術記録の削除',
                message: 'この予約・施術記録を削除してもよろしいですか？\n※この操作は取り消せません。',
                actionText: '削除する',
                onConfirm: () => {
                    deleteRecord(customerId, recordId);
                    showToast('予約・施術記録を削除しました', 'success');
                    if (onRefresh) {
                        onRefresh();
                    } else {
                        showCustomerDetail(customerId);
                    }
                    renderCalendar();
                }
            });
        });
    }
}

// HSLからHEXへの変換
function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * [ISSUE-NEW] 画像スタイルのハニカム（六角形）カラーパレットSVGを動的生成＆インタラクション設定
 */
function renderHoneycombSvg(wrapper, currentSelectedColor, onSelectColor) {
    if (!wrapper) return;

    const R = 11.5; // メイン六角形の半径
    const rings = 4; // 中心 + 4層（合計61個のセル）
    const centerX = 145;
    const centerY = 92;

    let svgHtml = `<svg viewBox="0 0 290 225" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">`;
    
    // グリッドセル群
    const hexCells = [];
    
    // 六角形の頂点計算関数
    function computeHexPoints(cx, cy, r) {
        const points = [];
        for (let k = 0; k < 6; k++) {
            const angle = (k * 60) * Math.PI / 180;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        }
        return points.join(' ');
    }

    // 1. メインのカラーハニカム（61セル）
    for (let q = -rings; q <= rings; q++) {
        const r1 = Math.max(-rings, -q - rings);
        const r2 = Math.min(rings, -q + rings);
        for (let r = r1; r <= r2; r++) {
            const cx = centerX + 1.5 * R * q;
            const cy = centerY + Math.sqrt(3) * R * (r + q / 2);
            const points = computeHexPoints(cx, cy, R);

            let hexColor = '#ffffff';
            const dx = cx - centerX;
            const dy = cy - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 1.5 * R * rings;

            if (dist > 0.1) {
                let angle = Math.atan2(dy, dx) * (180 / Math.PI);
                if (angle < 0) angle += 360;
                
                // 画像のグラデーションに配置を合わせる（上が青・右が紫・下が赤黄・左が緑）
                let hue = (angle + 240) % 360;
                let normDist = Math.min(1, dist / maxDist);
                
                let sat = Math.round(55 + normDist * 45);
                let light = Math.round(85 - normDist * 50);

                hexColor = hslToHex(hue, sat, light);
            }

            hexCells.push({ cx, cy, hexColor, points, r: R });
        }
    }

    // 2. 下部：白〜黒の10段階グレースケールバー
    const graySteps = [
        '#ffffff', '#e6e6e6', '#cccccc', '#b3b3b3', '#999999',
        '#808080', '#666666', '#4d4d4d', '#333333', '#1a1a1a'
    ];
    const R_gray = 9.0;
    const grayStartY = 192;
    const grayStartX = 34;
    const grayStepX = 15.5;

    graySteps.forEach((gColor, idx) => {
        const cx = grayStartX + idx * grayStepX;
        const cy = grayStartY;
        const points = computeHexPoints(cx, cy, R_gray);
        hexCells.push({ cx, cy, hexColor: gColor, points, r: R_gray });
    });

    // 3. 右下：孤立した大きめの黒色マス (#000000)
    const R_black = 15.0;
    const blackCx = 236;
    const blackCy = 192;
    const blackPoints = computeHexPoints(blackCx, blackCy, R_black);
    hexCells.push({ cx: blackCx, cy: blackCy, hexColor: '#000000', points: blackPoints, r: R_black });

    // 各セルを描画
    hexCells.forEach(cell => {
        // 黒・暗色セルには薄い輪郭線で存在感を見せる
        const strokeAttr = (cell.hexColor === '#000000' || cell.hexColor === '#1a1a1a') ? 'stroke="rgba(255,255,255,0.3)" stroke-width="1"' : '';
        svgHtml += `
            <polygon class="hex-cell" data-color="${cell.hexColor}" data-cx="${cell.cx.toFixed(1)}" data-cy="${cell.cy.toFixed(1)}" data-r="${cell.r}"
                points="${cell.points}" fill="${cell.hexColor}" ${strokeAttr} />
        `;
    });

    // 選択マーカー初期コンテナ
    svgHtml += `
        <g id="hexagon-selection-marker" class="hex-selection-marker" transform="translate(${centerX}, ${centerY})" style="opacity: 0;">
        </g>
    `;

    svgHtml += `</svg>`;
    wrapper.innerHTML = svgHtml;

    // 二重ヘキサゴン枠生成ヘルパー
    function updateMarkerShape(markerElem, radius) {
        if (!markerElem) return;
        const ptsOuter = computeHexPoints(0, 0, radius + 2.5);
        const ptsInner = computeHexPoints(0, 0, radius + 1.0);
        markerElem.innerHTML = `
            <polygon points="${ptsOuter}" fill="none" stroke="#000000" stroke-width="3" />
            <polygon points="${ptsInner}" fill="none" stroke="#ffffff" stroke-width="2" />
        `;
    }

    // イベントバインド
    const svg = wrapper.querySelector('svg');
    if (!svg) return;
    const marker = svg.querySelector('#hexagon-selection-marker');
    const cells = svg.querySelectorAll('.hex-cell');

    cells.forEach(cell => {
        cell.addEventListener('click', () => {
            const color = cell.getAttribute('data-color');
            const cx = cell.getAttribute('data-cx');
            const cy = cell.getAttribute('data-cy');
            const cellR = parseFloat(cell.getAttribute('data-r') || R);

            if (marker) {
                updateMarkerShape(marker, cellR);
                marker.setAttribute('transform', `translate(${cx}, ${cy})`);
                marker.style.opacity = '1';
            }

            if (onSelectColor) {
                onSelectColor(color);
            }
        });
    });

    // 初期選択色に合わせたマーカー位置設定
    if (currentSelectedColor && currentSelectedColor.startsWith('#')) {
        let targetCell = null;
        cells.forEach(c => {
            const col = c.getAttribute('data-color');
            if (col.toLowerCase() === currentSelectedColor.toLowerCase()) {
                targetCell = c;
            }
        });

        if (targetCell && marker) {
            const cx = targetCell.getAttribute('data-cx');
            const cy = targetCell.getAttribute('data-cy');
            const cellR = parseFloat(targetCell.getAttribute('data-r') || R);
            updateMarkerShape(marker, cellR);
            marker.setAttribute('transform', `translate(${cx}, ${cy})`);
            marker.style.opacity = '1';
        }
    }
}

/**
 * HTMLエスケープ処理
 */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m];
    });
}

/**
 * [ISSUE-NEW] カラーチップ群を「5つの独立したスロット」として初期化する。
 * スロットを選択後、ハニカムパレットまたはプリセットからタップしてサンプルを確認し、
 * 「この色で決定」ボタンで適用する二段構えUI。
 */
function initSoulColorSlotSelector(slotsContainer, paletteContainer, initialColors, onChange) {
    let selected = (initialColors || []).slice(0, MAX_SOUL_COLORS);
    while (selected.length < MAX_SOUL_COLORS) selected.push('clear');

    let activeSlotIndex = null;
    let pendingColor = 'red'; // サンプルプレビューで仮表示中のカラー

    const slots = slotsContainer.querySelectorAll('.soul-slot');
    const paletteChips = paletteContainer.querySelectorAll('.color-chip');
    const customColorPicker = document.getElementById('input-custom-color-picker');
    const targetLabel = document.getElementById('palette-target-label');
    const sampleCircle = document.getElementById('sample-color-circle');
    const sampleName = document.getElementById('sample-color-name');
    const sampleCode = document.getElementById('sample-color-code');
    const btnApply = document.getElementById('btn-apply-sample-color');
    const btnClearSlot = document.getElementById('btn-clear-slot');
    const btnClosePalette = document.getElementById('btn-close-palette');

    // モード切り替えタブ要素
    const tabMasters = document.getElementById('tab-palette-masters');
    const tabHoneycomb = document.getElementById('tab-palette-honeycomb');
    const tabPreset = document.getElementById('tab-palette-preset');
    const viewMasters = document.getElementById('masters-palette-view');
    const viewHoneycomb = document.getElementById('honeycomb-palette-view');
    const viewPreset = document.getElementById('preset-palette-view');
    const svgWrapper = document.getElementById('honeycomb-svg-wrapper');
    const modalColorMastersList = document.getElementById('modal-color-masters-list');

    let paletteMode = 'preset'; // 'preset' (Soul Color) | 'honeycomb' | 'masters'

    const renderMasterColorChips = () => {
        if (!modalColorMastersList) return;
        modalColorMastersList.innerHTML = '';

        const masters = getColorMasters();
        if (masters.length === 0) {
            modalColorMastersList.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-secondary); padding: 8px;">設定済みカラーはありません。「カラー設定」タブから登録できます。</div>`;
            return;
        }

        masters.forEach(m => {
            const chip = document.createElement('div');
            chip.className = 'master-color-chip-btn';
            const isActive = m.code === pendingColor;
            
            chip.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: ${isActive ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.06)'};
                border: 1px solid ${isActive ? 'var(--accent-cyan)' : 'var(--border-glass)'};
                border-radius: 20px;
                padding: 5px 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                user-select: none;
            `;
            chip.innerHTML = `
                <span style="width: 14px; height: 14px; border-radius: 50%; background: ${m.code}; display: inline-block; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 0 4px ${m.code}aa;"></span>
                <span style="font-size: 0.8rem; font-weight: 600; color: ${isActive ? 'var(--accent-cyan)' : 'var(--text-primary)'};">${escapeHtml(m.name)}</span>
            `;

            chip.onmouseover = () => {
                if (m.code !== pendingColor) {
                    chip.style.background = 'rgba(0, 242, 254, 0.1)';
                    chip.style.borderColor = 'rgba(0, 242, 254, 0.5)';
                }
            };
            chip.onmouseout = () => {
                if (m.code !== pendingColor) {
                    chip.style.background = 'rgba(255, 255, 255, 0.06)';
                    chip.style.borderColor = 'var(--border-glass)';
                }
            };

            chip.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                pendingColor = m.code;
                render();
            };

            modalColorMastersList.appendChild(chip);
        });
    };

    const inputSoulColorContainer = document.getElementById('input-soul-color-container');

    const renderPresetColorChips = () => {
        if (!inputSoulColorContainer) return;
        inputSoulColorContainer.innerHTML = '';

        SOUL_COLOR_DEFS.forEach(c => {
            const chip = document.createElement('div');
            chip.className = 'preset-color-chip-btn';
            const isActive = c.key === pendingColor || c.code === pendingColor;
            
            chip.title = c.name; // ホバー時に色名ツールチップ表示
            chip.style.cssText = `
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 38px;
                height: 38px;
                background: ${isActive ? 'rgba(0, 242, 254, 0.25)' : 'rgba(255, 255, 255, 0.08)'};
                border: 2px solid ${isActive ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.15)'};
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.2s ease;
                user-select: none;
                font-size: 1.25rem;
                box-shadow: ${isActive ? '0 0 10px rgba(0, 242, 254, 0.4)' : 'none'};
            `;
            chip.innerHTML = `<span style="line-height: 1;">${c.emoji}</span>`;

            chip.onmouseover = () => {
                if (c.key !== pendingColor && c.code !== pendingColor) {
                    chip.style.background = 'rgba(0, 242, 254, 0.15)';
                    chip.style.borderColor = 'rgba(0, 242, 254, 0.6)';
                    chip.style.transform = 'scale(1.1)';
                }
            };
            chip.onmouseout = () => {
                if (c.key !== pendingColor && c.code !== pendingColor) {
                    chip.style.background = 'rgba(255, 255, 255, 0.08)';
                    chip.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    chip.style.transform = 'scale(1)';
                }
            };

            chip.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                pendingColor = c.key;
                render();
            };

            inputSoulColorContainer.appendChild(chip);
        });
    };

    const updateTabModeUi = () => {
        const tabs = [
            { btn: tabPreset, view: viewPreset, mode: 'preset' },
            { btn: tabHoneycomb, view: viewHoneycomb, mode: 'honeycomb' },
            { btn: tabMasters, view: viewMasters, mode: 'masters' }
        ];

        tabs.forEach(t => {
            if (!t.btn || !t.view) return;
            if (paletteMode === t.mode) {
                t.btn.classList.add('active');
                t.btn.style.background = 'rgba(0, 242, 254, 0.2)';
                t.btn.style.color = 'var(--accent-cyan)';
                t.btn.style.borderColor = 'var(--accent-cyan)';
                t.view.style.display = t.mode === 'honeycomb' ? 'flex' : 'block';
            } else {
                t.btn.classList.remove('active');
                t.btn.style.background = 'rgba(255, 255, 255, 0.05)';
                t.btn.style.color = 'var(--text-secondary)';
                t.btn.style.borderColor = 'var(--border-glass)';
                t.view.style.display = 'none';
            }
        });

        if (paletteMode === 'preset') {
            renderPresetColorChips();
        } else if (paletteMode === 'masters') {
            renderMasterColorChips();
        }
    };

    if (tabMasters) tabMasters.onclick = () => { paletteMode = 'masters'; updateTabModeUi(); };
    if (tabHoneycomb) tabHoneycomb.onclick = () => { paletteMode = 'honeycomb'; updateTabModeUi(); };
    if (tabPreset) tabPreset.onclick = () => { paletteMode = 'preset'; updateTabModeUi(); };

    const render = () => {
        // 1. スロット5つの描画
        slots.forEach((slot, idx) => {
            const color = selected[idx];
            const cssVal = getSoulColorCssValue(color);
            
            if (cssVal.includes('gradient')) {
                slot.style.background = cssVal;
                slot.style.backgroundColor = '';
            } else {
                slot.style.background = '';
                slot.style.backgroundColor = cssVal;
            }

            // 選択中のスロットをハイライト
            if (activeSlotIndex === idx) {
                slot.style.boxShadow = '0 0 0 3px var(--accent-cyan)';
                slot.style.borderColor = 'var(--accent-cyan)';
            } else {
                slot.style.boxShadow = 'none';
                slot.style.borderColor = 'var(--border-glass)';
            }

            const span = slot.querySelector('span');
            if (span) {
                span.style.opacity = color === 'clear' ? '1' : '0.3';
            }
        });

        // 2. パレット＆サンプル表示
        if (activeSlotIndex !== null) {
            paletteContainer.style.display = 'block';
            if (targetLabel) targetLabel.textContent = `スロット ${activeSlotIndex + 1} の色を選択中`;

            // サンプルプレビューの描画
            const cssVal = getSoulColorCssValue(pendingColor);
            if (sampleCircle) {
                if (cssVal.includes('gradient')) {
                    sampleCircle.style.background = cssVal;
                    sampleCircle.style.backgroundColor = '';
                } else {
                    sampleCircle.style.background = '';
                    sampleCircle.style.backgroundColor = cssVal;
                }
                sampleCircle.style.boxShadow = `0 0 16px ${cssVal.startsWith('#') ? cssVal : 'rgba(0,242,254,0.4)'}`;
            }

            if (sampleName) sampleName.textContent = getSoulColorName(pendingColor);
            if (sampleCode) sampleCode.textContent = cssVal.startsWith('#') ? cssVal : (SOUL_COLOR_MAP[pendingColor] || pendingColor);

            // チップのアクティブ状態ハイライト
            paletteChips.forEach(chip => {
                const c = chip.getAttribute('data-color');
                if (c === pendingColor) {
                    chip.classList.add('active');
                } else {
                    chip.classList.remove('active');
                }
            });

            // ハニカムSVGのレンダリング
            if (svgWrapper) {
                renderHoneycombSvg(svgWrapper, cssVal, (colorHex) => {
                    pendingColor = colorHex;
                    render();
                });
            }

            updateTabModeUi();
        } else {
            paletteContainer.style.display = 'none';
        }

        if (onChange) onChange(selected.filter(c => c !== 'clear'));
    };

    // スロットタップ
    slots.forEach((slot, idx) => {
        slot.addEventListener('click', () => {
            if (activeSlotIndex === idx) {
                activeSlotIndex = null;
            } else {
                activeSlotIndex = idx;
                pendingColor = selected[idx] !== 'clear' ? selected[idx] : 'red';
            }
            render();
        });
    });

    // プリセットチップタップ（即確定せずサンプル更新）
    paletteChips.forEach(chip => {
        chip.addEventListener('click', () => {
            if (activeSlotIndex === null) return;
            pendingColor = chip.getAttribute('data-color');
            render();
        });
    });

    // カスタムカラーピッカー変更（即確定せずサンプル更新）
    if (customColorPicker) {
        const handleCustomColor = (e) => {
            if (activeSlotIndex === null) return;
            pendingColor = e.target.value;
            render();
        };
        customColorPicker.addEventListener('input', handleCustomColor);
        customColorPicker.addEventListener('change', handleCustomColor);
    }

    // 「✓ この色で決定」ボタンタップ（ここで初めてスロットに反映！）
    if (btnApply) {
        btnApply.onclick = () => {
            if (activeSlotIndex === null) return;
            selected[activeSlotIndex] = pendingColor;

            // 次のスロットへ移動
            if (activeSlotIndex < MAX_SOUL_COLORS - 1) {
                activeSlotIndex++;
                pendingColor = selected[activeSlotIndex] !== 'clear' ? selected[activeSlotIndex] : 'red';
            } else {
                activeSlotIndex = null;
            }
            render();
        };
    }

    // 「色をクリア」ボタン
    if (btnClearSlot) {
        btnClearSlot.onclick = () => {
            if (activeSlotIndex === null) return;
            selected[activeSlotIndex] = 'clear';
            pendingColor = 'clear';
            render();
        };
    }

    // 「✕ 閉じる」ボタン
    if (btnClosePalette) {
        btnClosePalette.onclick = () => {
            activeSlotIndex = null;
            render();
        };
    }

    render();
    return () => selected.filter(c => c !== 'clear');
}

// -------------------------------------------------------------------
// メイン初期化関数
// DOMContentLoaded だけでなく pageshow（bfcache復帰）からも呼び出す
// -------------------------------------------------------------------
function initApp() {
    // DOM要素の取得
    const searchInput = document.getElementById('search-input');
    const checkShowArchived = document.getElementById('check-show-archived');
    const btnAddCustomer = document.getElementById('btn-add-customer');
    const customerListContainer = document.getElementById('customer-list-container');
    const customerDetailView = document.getElementById('customer-detail-view');
    
    // 詳細ビュー要素
    const detailName = document.getElementById('detail-name');
    const detailKana = document.getElementById('detail-kana');
    const detailStatusBadge = document.getElementById('detail-status-badge');
    const btnCloseDetail = document.getElementById('btn-close-detail');
    const btnDetailArchive = document.getElementById('btn-detail-archive');
    const btnDetailArchiveText = document.getElementById('btn-detail-archive-text');
    const btnEditCustomer = document.getElementById('btn-edit-customer'); // [MINOR v1.10.0]
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContentArea = document.getElementById('tab-content-area');
    const addRecordAction = document.getElementById('add-record-action');
    const btnAddRecord = document.getElementById('btn-add-record');

    // 顧客登録モーダル
    const customerModal = document.getElementById('customer-modal');
    const customerModalTitle = document.getElementById('customer-modal-title'); // [MINOR v1.10.0]
    const customerForm = document.getElementById('customer-form');
    const btnCancelCustomer = document.getElementById('btn-cancel-customer');
    const btnSubmitCustomer = document.getElementById('btn-submit-customer');
    const inputMemo = document.getElementById('input-memo');
    const inputInitialConsultation = document.getElementById('input-initial-consultation');

    // レコード追加モーダル
    const recordModal = document.getElementById('record-modal');
    const recordForm = document.getElementById('record-form');
    const btnCancelRecord = document.getElementById('btn-cancel-record');
    const btnSubmitRecord = document.getElementById('btn-submit-record');

    // アプリケーション状態
    let selectedCustomerId = null;
    let editingCustomer = null; // [MINOR v1.10.0] 顧客編集モード用
    let activeTab = 'visit-count';

    // 1. 顧客一覧の描画
    function renderCustomerList(query = '') {
        const showArchived = checkShowArchived ? checkShowArchived.checked : false;
        const allCustomers = getCustomers();
        const customers = allCustomers.filter(c => showArchived ? true : !c.isArchived);
        
        customerListContainer.innerHTML = '';

        const filtered = customers.filter(c => {
            const q = query.toLowerCase();
            return c.name.toLowerCase().includes(q) || (c.kana && c.kana.toLowerCase().includes(q));
        });

        if (filtered.length === 0) {
            customerListContainer.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 20px; grid-column: 1 / -1;">見つかりませんでした。</div>`;
            return;
        }

        filtered.forEach(customer => {
            const card = document.createElement('div');
            // [ISSUE-018] カードの枠色・背景は1色目（メインカラー）を使う
            const mainColor = getMainSoulColor(customer);
            if (mainColor.startsWith('#')) {
                card.className = 'customer-card-grid-item';
                card.style.borderColor = mainColor;
                card.style.boxShadow = `0 0 10px ${mainColor}44`;
            } else {
                card.className = `customer-card-grid-item soul-card-${mainColor}`;
            }
            if (selectedCustomerId === customer.id) {
                card.style.boxShadow = '0 0 16px var(--accent-cyan)';
            }

            // アーカイブ顧客の場合は明確な視覚的強調（高コントラスト破線枠線＆黒黄バッジ）を付与
            if (customer.isArchived) {
                card.style.border = '2px dashed #f59e0b';
                card.style.background = 'rgba(245, 158, 11, 0.08)';
            }

            const archiveBadgeHtml = customer.isArchived 
                ? `<span style="font-size: 0.7rem; background: #f59e0b; color: #000; font-weight: 800; padding: 2px 8px; border-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.4);">📦 アーカイブ中</span>`
                : `<span style="font-size: 0.7rem; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-weight: 600; padding: 2px 8px; border-radius: 4px;">🟢 アクティブ</span>`;

            const archiveBtnHtml = customer.isArchived 
                ? `<button class="btn-unarchive-customer" data-id="${customer.id}" title="アーカイブ解除" style="background: #10b981; border: none; color: #000; font-weight: 800; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                        📤 <span class="btn-text">解除</span>
                   </button>`
                : `<button class="btn-archive-customer" data-id="${customer.id}" title="アーカイブ保管" style="background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; color: #f59e0b; font-weight: 700; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                        📦 <span class="btn-text">アーカイブ</span>
                   </button>`;

            card.innerHTML = `
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 0.75rem; background: rgba(0,0,0,0.2); padding: 3px 8px; border-radius: 6px; color: var(--text-primary); font-weight: 600;">${customer.customerNo || 'NO-NO'}</span>
                        ${archiveBadgeHtml}
                    </div>
                    <h3 style="margin: 8px 0 4px 0; font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">${customer.name}</h3>
                    <p style="margin: 0; font-size: 0.8rem; opacity: 0.8; color: var(--text-primary);">${customer.kana || ''}</p>
                </div>
                <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px;">
                    <span style="font-size: 0.8rem; color: var(--text-primary); opacity: 0.95;">来店: <strong style="font-weight: 700; color: var(--accent-cyan);">${customer.records ? customer.records.length : 0}</strong>回</span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        ${archiveBtnHtml}
                        <span style="font-weight: bold; color: var(--text-primary); font-size: 1.1rem;">&rarr;</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                showCustomerDetail(customer.id);
            });

            const btnArchive = card.querySelector('.btn-archive-customer');
            if (btnArchive) {
                btnArchive.addEventListener('click', (e) => {
                    e.stopPropagation();
                    archiveCustomer(customer.id);
                    showToast(`${customer.name} 様をアーカイブ保管しました`, 'success');
                    if (selectedCustomerId === customer.id) {
                        showCustomerDetail(customer.id);
                    } else {
                        renderCustomerList(searchInput ? searchInput.value : '');
                    }
                });
            }

            const btnUnarchive = card.querySelector('.btn-unarchive-customer');
            if (btnUnarchive) {
                btnUnarchive.addEventListener('click', (e) => {
                    e.stopPropagation();
                    unarchiveCustomer(customer.id);
                    showToast(`${customer.name} 様のアーカイブを解除しました（通常リストへ戻しました）`, 'success');
                    if (selectedCustomerId === customer.id) {
                        showCustomerDetail(customer.id);
                    } else {
                        renderCustomerList(searchInput ? searchInput.value : '');
                    }
                });
            }

            customerListContainer.appendChild(card);
        });
    }

    // 2. 顧客詳細の表示
    function showCustomerDetail(id) {
        selectedCustomerId = id;
        const customers = getCustomers();
        const customer = customers.find(c => c.id === id);

        if (!customer) return;

        detailName.textContent = customer.name;
        detailKana.textContent = `${customer.customerNo || ''} | ${customer.kana || ''}`;
        customerDetailView.style.display = 'flex';

        // 詳細画面のステータスバッジとアーカイブボタンの動的切り替え
        if (detailStatusBadge) {
            if (customer.isArchived) {
                detailStatusBadge.textContent = '📦 アーカイブ保管中';
                detailStatusBadge.style.background = '#f59e0b';
                detailStatusBadge.style.color = '#000';
                detailStatusBadge.style.border = 'none';
            } else {
                detailStatusBadge.textContent = '🟢 通常顧客';
                detailStatusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
                detailStatusBadge.style.color = '#10b981';
                detailStatusBadge.style.border = '1px solid rgba(16, 185, 129, 0.4)';
            }
        }

        if (btnDetailArchive) {
            if (customer.isArchived) {
                btnDetailArchive.style.background = '#10b981';
                btnDetailArchive.style.color = '#000';
                btnDetailArchive.style.border = 'none';
                btnDetailArchive.style.fontWeight = '800';
                if (btnDetailArchiveText) btnDetailArchiveText.textContent = '📤 アーカイブ解除（通常一覧へ戻す）';
            } else {
                btnDetailArchive.style.background = 'rgba(245, 158, 11, 0.15)';
                btnDetailArchive.style.color = '#f59e0b';
                btnDetailArchive.style.border = '1px solid #f59e0b';
                btnDetailArchive.style.fontWeight = '700';
                if (btnDetailArchiveText) btnDetailArchiveText.textContent = '📦 アーカイブ保管';
            }
        }

        const workspaceGrid = document.querySelector('.workspace-grid');
        if (workspaceGrid) {
            workspaceGrid.classList.add('detail-mode');
        }

        // 現在のアクティブタブを描画
        renderTabContent(customer);
        renderCustomerList(searchInput ? searchInput.value : ''); // 一覧側のハイライトも同期
    }

    // 3. タブコンテンツの切り替えと描画
    function renderTabContent(customer) {
        tabContentArea.innerHTML = '';
        const records = customer.records || [];

        // [PATCH v1.9.1] カレンダー直結化に伴い、新規記録追加ボタンは常に非表示にする
        if (addRecordAction) {
            addRecordAction.style.display = 'none';
        }

        switch (activeTab) {
            case 'visit-calendar':
                // 個人カレンダー
                const calendarContainer = document.getElementById('customer-personal-calendar');
                if (calendarContainer) {
                    const clone = calendarContainer.cloneNode(true);
                    clone.style.display = 'block';
                    clone.id = 'personal-calendar-instance';
                    tabContentArea.appendChild(clone);
                    
                    // イベント再バインド
                    const prevBtn = clone.querySelector('#cust-calendar-prev');
                    const nextBtn = clone.querySelector('#cust-calendar-next');
                    
                    if (prevBtn) prevBtn.onclick = () => {
                        currentCustCalendarMonth.setMonth(currentCustCalendarMonth.getMonth() - 1);
                        renderPersonalCalendarInstance(customer, clone);
                    };
                    if (nextBtn) nextBtn.onclick = () => {
                        currentCustCalendarMonth.setMonth(currentCustCalendarMonth.getMonth() + 1);
                        renderPersonalCalendarInstance(customer, clone);
                    };
                    
                    renderPersonalCalendarInstance(customer, clone);
                }
                break;

            case 'visit-count':
                // 施術日（通算回数、来店ペース、第N回来店、来店目的・主訴）
                if (records.length === 0) {
                    tabContentArea.innerHTML = '<p style="color: var(--text-secondary);">来店履歴がありません。</p>';
                } else {
                    // 日付順に並び替え用コピー（古い順）
                    const sortedAsc = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
                    const firstVisit = sortedAsc[0].date;
                    const latestVisit = sortedAsc[sortedAsc.length - 1].date;
                    
                    // ペース計算（初回〜最新の経過日数 ÷ (回数-1)）
                    let avgIntervalText = '初回来店';
                    if (records.length > 1) {
                        const daysDiff = Math.round((new Date(latestVisit) - new Date(firstVisit)) / (1000 * 60 * 60 * 24));
                        const avgDays = Math.round(daysDiff / (records.length - 1));
                        avgIntervalText = avgDays > 0 ? `約 ${avgDays} 日ペース` : '短期連続来店';
                    }

                    // 今日からの経過日数
                    const daysSinceLatest = Math.round((new Date() - new Date(latestVisit)) / (1000 * 60 * 60 * 24));
                    const daysSinceText = daysSinceLatest === 0 ? '本日来店' : `${daysSinceLatest}日前`;

                    // サマリーカード表示
                    const summaryCard = document.createElement('div');
                    summaryCard.style.cssText = 'background: rgba(0, 242, 254, 0.05); border: 1px solid var(--accent-cyan); border-radius: 16px; padding: 16px; margin-bottom: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 12px; text-align: center;';
                    summaryCard.innerHTML = `
                        <div>
                            <span style="font-size: 0.75rem; color: var(--text-secondary); display: block;">通算施術回数</span>
                            <span style="font-size: 1.8rem; font-weight: 800; color: var(--accent-cyan); text-shadow: 0 0 10px rgba(0,242,254,0.3);">${records.length} <span style="font-size: 0.85rem;">回</span></span>
                        </div>
                        <div>
                            <span style="font-size: 0.75rem; color: var(--text-secondary); display: block;">最終施術日</span>
                            <span style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin-top: 4px; display: block;">${latestVisit}</span>
                            <span style="font-size: 0.75rem; color: var(--accent-cyan);">${daysSinceText}</span>
                        </div>
                        <div>
                            <span style="font-size: 0.75rem; color: var(--text-secondary); display: block;">平均施術ペース</span>
                            <span style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin-top: 4px; display: block;">${avgIntervalText}</span>
                        </div>
                    `;
                    tabContentArea.appendChild(summaryCard);

                    // 各来店履歴（最新順）に第N回、日付時間、来店目的・主訴を表示
                    records.forEach((r, idx) => {
                        const visitIndex = records.length - idx; // 第何回目か
                        let intervalBadge = '';
                        if (idx < records.length - 1) {
                            const prevRecordDate = records[idx + 1].date;
                            const diffDays = Math.round((new Date(r.date) - new Date(prevRecordDate)) / (1000 * 60 * 60 * 24));
                            if (diffDays >= 0) {
                                intervalBadge = `<span style="font-size: 0.75rem; background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 10px; color: var(--text-secondary);">前回来店から ${diffDays} 日ぶり</span>`;
                            }
                        } else {
                            intervalBadge = `<span style="font-size: 0.75rem; background: rgba(0,242,254,0.15); padding: 2px 8px; border-radius: 10px; color: var(--accent-cyan); font-weight: 600;">🎉 初回来店</span>`;
                        }

                        const div = document.createElement('div');
                        div.className = 'history-item';
                        div.style.cssText = 'border-left: 4px solid var(--accent-cyan); padding-left: 12px; margin-bottom: 12px;';
                        div.innerHTML = `
                            <div class="history-item-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple)); color: #000; font-weight: 800; font-size: 0.9rem; padding: 4px 14px; border-radius: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">第 ${visitIndex} 回</span>
                                    <span style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">${r.date} ${r.time ? `(${r.time})` : ''}</span>
                                </div>
                                ${intervalBadge}
                            </div>
                            <div class="history-item-body" style="margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
                                <div style="display: flex; align-items: flex-start; gap: 8px; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 8px;">
                                    <span style="font-size: 0.8rem; background: rgba(0, 242, 254, 0.15); color: var(--accent-cyan); font-weight: 600; padding: 2px 6px; border-radius: 4px; white-space: nowrap;">🎯 施術目的・訴え</span>
                                    <span style="font-size: 0.9rem; color: var(--text-primary); font-weight: 500;">${r.clientComplaint || '特記なし（定期メンテナンス）'}</span>
                                </div>
                                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; color: var(--text-secondary); margin-top: 2px;">
                                    <span>施術内容: <strong style="color: var(--text-primary);">${r.type || '一般施術'}</strong></span>
                                    <span style="color: var(--accent-success); font-weight: 600;">${r.amount ? Number(r.amount).toLocaleString() + '円' : ''}</span>
                                </div>
                                ${buildRecordEditButtonHtml(r)}
                            </div>
                        `;
                        attachRecordEditHandler(div, customer.id, r.id, () => showCustomerDetail(customer.id));
                        tabContentArea.appendChild(div);
                    });
                }
                break;

    // ヘルパー: 個人カレンダーインスタンスの描画
    function renderPersonalCalendarInstance(customer, container) {
        const gridBody = container.querySelector('#cust-calendar-grid-body');
        const titleEl = container.querySelector('#cust-calendar-title');
        if (!gridBody || !titleEl) return;

        gridBody.innerHTML = '';
        const year = currentCustCalendarMonth.getFullYear();
        const month = currentCustCalendarMonth.getMonth();
        titleEl.textContent = `${year}年 ${month + 1}月`;

        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            gridBody.innerHTML += '<div class="calendar-day empty"></div>';
        }

        const records = customer.records || [];
        const recordDates = records.map(r => r.date);

        for (let date = 1; date <= lastDate; date++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
            const hasRecord = recordDates.includes(dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            const cell = document.createElement('div');
            cell.className = `calendar-day${hasRecord ? ' has-event' : ''}${isToday ? ' today' : ''}`;
            cell.innerHTML = `
                <span class="day-number">${date}</span>
                ${hasRecord ? `<span class="event-dot" style="background: var(--accent-cyan);"></span>` : ''}
            `;

            if (hasRecord) {
                cell.style.cursor = 'pointer';
                cell.addEventListener('click', () => {
                    window._highlightDate = dateStr;
                    activeTab = 'visit-type';
                    const typeTabBtn = document.querySelector('.tab-btn[data-tab="visit-type"]');
                    if (typeTabBtn) {
                        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                        typeTabBtn.classList.add('active');
                    }
                    renderTabContent(customer);
                });
            }

            gridBody.appendChild(cell);
        }
    }

    // [ISSUE-NEW] 記録フォームの読み取り専用・編集切り替え
    const btnToggleEditRecord = document.getElementById('btn-toggle-edit-record');
    function setRecordFormReadonly(readonly) {
        const inputs = recordForm.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.disabled = readonly;
            input.style.opacity = readonly ? '0.7' : '1';
        });
        if (readonly) {
            recordForm.classList.add('readonly-mode');
            if (btnToggleEditRecord) {
                btnToggleEditRecord.style.display = 'block';
                btnToggleEditRecord.textContent = '✏️ 編集を有効にする';
                btnToggleEditRecord.style.background = 'rgba(0, 242, 254, 0.15)';
            }
            if (btnSubmitRecord) btnSubmitRecord.style.display = 'none';
        } else {
            recordForm.classList.remove('readonly-mode');
            if (btnToggleEditRecord) {
                btnToggleEditRecord.textContent = '🔓 編集モード (ロックする)';
                btnToggleEditRecord.style.background = 'rgba(255, 82, 82, 0.15)';
            }
            if (btnSubmitRecord) btnSubmitRecord.style.display = 'block';
        }
    }

    if (btnToggleEditRecord) {
        btnToggleEditRecord.addEventListener('click', () => {
            const isReadonly = recordForm.classList.contains('readonly-mode');
            setRecordFormReadonly(!isReadonly);
        });
    }

            case 'visit-type':
                // 施術内容の一覧
                if (records.length === 0) {
                    tabContentArea.innerHTML = '<p style="color: var(--text-secondary);">施術記録がありません。</p>';
                } else {
                    const targetDate = window._highlightDate;
                    records.forEach(r => {
                        const div = document.createElement('div');
                        div.className = 'history-item';
                        if (targetDate && r.date === targetDate) {
                            div.style.border = '2px solid var(--accent-cyan)';
                            div.style.boxShadow = '0 0 15px rgba(0, 242, 254, 0.3)';
                            setTimeout(() => {
                                div.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 100);
                        }
                        div.innerHTML = `
                            <div class="history-item-header">
                                <span>来店日</span>
                                <span>${r.date} ${r.time ? `(${r.time})` : ''}</span>
                            </div>
                            <div class="history-item-body">
                                <div style="font-weight: 600; margin-bottom: 6px; color: var(--text-primary);">${r.type}</div>
                                ${buildRecordDetailsHtml(r)}
                                ${buildRecordEditButtonHtml(r)}
                            </div>
                        `;
                        attachRecordEditHandler(div, customer.id, r.id, () => showCustomerDetail(customer.id));
                        tabContentArea.appendChild(div);
                    });
                    window._highlightDate = null; // リセット
                }
                break;

            case 'visit-amount':
                // 金額の一覧（施術内容と金額のみを表示）
                if (records.length === 0) {
                    tabContentArea.innerHTML = '<p style="color: var(--text-secondary);">支払記録がありません。</p>';
                } else {
                    const totalAmount = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                    const avgAmount = Math.round(totalAmount / records.length);

                    // 売上サマリーカード
                    const summaryCard = document.createElement('div');
                    summaryCard.style.cssText = 'background: rgba(0, 230, 118, 0.08); border: 1px solid var(--accent-success); border-radius: 16px; padding: 16px; margin-bottom: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; text-align: center;';
                    summaryCard.innerHTML = `
                        <div>
                            <span style="font-size: 0.75rem; color: var(--text-secondary); display: block;">累計お支払い額</span>
                            <span style="font-size: 1.4rem; font-weight: 700; color: var(--accent-success);">${totalAmount.toLocaleString()} <span style="font-size: 0.85rem;">円</span></span>
                        </div>
                        <div>
                            <span style="font-size: 0.75rem; color: var(--text-secondary); display: block;">平均客単価</span>
                            <span style="font-size: 1.2rem; font-weight: 600; color: var(--text-primary); margin-top: 2px; display: block;">${avgAmount.toLocaleString()} 円</span>
                        </div>
                    `;
                    tabContentArea.appendChild(summaryCard);

                    records.forEach(r => {
                        const div = document.createElement('div');
                        div.className = 'history-item amount';
                        div.style.cssText = 'border-left: 4px solid var(--accent-success); padding: 12px; margin-bottom: 12px; background: rgba(255,255,255,0.02); border-radius: 12px;';
                        div.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-weight: 600; font-size: 0.9rem; color: var(--text-secondary);">${r.date} ${r.time ? `(${r.time})` : ''}</span>
                                <span style="color: var(--accent-success); font-weight: 700; font-size: 1.2rem; background: rgba(0,230,118,0.12); padding: 4px 12px; border-radius: 12px;">${(Number(r.amount) || 0).toLocaleString()} 円</span>
                            </div>
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 0.75rem; background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 6px; color: var(--text-secondary);">施術内容</span>
                                    <span style="font-weight: 700; color: var(--accent-cyan); font-size: 1rem;">${r.type || '一般施術'}</span>
                                </div>
                                ${buildRecordEditButtonHtml(r)}
                            </div>
                        `;
                        attachRecordEditHandler(div, customer.id, r.id, () => showCustomerDetail(customer.id));
                        tabContentArea.appendChild(div);
                    });
                }
                break;

            case 'personal-info':
                // 個人情報の一覧・詳細 (スタティックな閲覧専用UI)
                tabContentArea.innerHTML = `
                    <div class="read-only-personal-info" style="display: flex; flex-direction: column; gap: 16px; padding: 4px 0;">
                        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 120px;">
                                <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">顧客No.</span>
                                <div style="font-size: 0.95rem; font-weight: 500; color: var(--text-primary);">${customer.customerNo || '未設定'}</div>
                            </div>
                            <div style="flex: 1; min-width: 120px;">
                                <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">電話番号</span>
                                <div style="font-size: 0.95rem; font-weight: 500; color: var(--text-primary);">${customer.phone || '未設定'}</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 120px;">
                                <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">生年月日</span>
                                <div style="font-size: 0.95rem; font-weight: 500; color: var(--text-primary);">
                                    ${customer.birthday ? customer.birthday.replace(/-/g, '/') : (customer.birthMonth ? customer.birthMonth + '月' : '未設定')}
                                </div>
                            </div>
                            <div style="flex: 1; min-width: 120px;">
                                <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">紹介者</span>
                                <div style="font-size: 0.95rem; font-weight: 500; color: var(--text-primary);">${customer.referrer || 'なし'}</div>
                            </div>
                        </div>
                        <div>
                            <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 6px;">Soul Color</span>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                ${buildSoulColorBadgeHtml(getSoulColors(customer), 'sm')}
                            </div>
                        </div>
                        <div>
                            <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">初診問診 (体重や病歴など)</span>
                            <div style="font-size: 0.9rem; line-height: 1.6; color: var(--text-primary); background: rgba(255,255,255,0.01); border: 1px solid var(--border-glass); border-radius: 12px; padding: 12px; min-height: 48px; white-space: pre-wrap;">${customer.initialConsultation || '未記入'}</div>
                        </div>
                        <div>
                            <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">特記事項・メモ</span>
                            <div style="font-size: 0.9rem; line-height: 1.6; color: var(--text-primary); background: rgba(255,255,255,0.01); border: 1px solid var(--border-glass); border-radius: 12px; padding: 12px; min-height: 48px; white-space: pre-wrap;">${customer.memo || '未記入'}</div>
                        </div>
                    </div>
                `;
                break;
        }
    }

    // 4. 各種イベント処理

    // [ISSUE-018] 新規登録のカラーセレクター制御（独立5スロット形式）
    const inputSoulColorSlots = document.getElementById('soul-color-slots');
    const inputSoulColorPalette = document.getElementById('soul-color-palette');
    const inputSoulColorPreview = document.getElementById('input-soul-color-preview');
    // モーダルを開き直したときに選択をリセットできるよう、初期化関数を保持しておく
    let getInputSoulColors = () => [];
    let setInputSoulColors = (initial) => {};

    if (inputSoulColorSlots && inputSoulColorPalette) {
        setInputSoulColors = (initial) => {
            getInputSoulColors = initSoulColorSlotSelector(
                inputSoulColorSlots,
                inputSoulColorPalette,
                initial,
                (colors) => {
                    // プレビュー表示はバッジ形式を維持
                    if (inputSoulColorPreview) {
                        inputSoulColorPreview.innerHTML = colors.length
                            ? buildSoulColorBadgeHtml(colors)
                            : '<span style="font-size: 0.8rem; color: var(--text-secondary);">未設定</span>';
                    }
                }
            );
        };
        setInputSoulColors([]);
    }
    // 後方互換性（既存コードでのリセット用）
    const resetInputSoulColors = () => setInputSoulColors([]);

    // [ISSUE-NEW] 施術記録の下書き（オートセーブ）機能
    const draftIndicator = document.getElementById('record-draft-indicator');
    function saveRecordDraft() {
        if (!selectedCustomerId) return;
        const formData = new FormData(recordForm);
        const draft = {};
        formData.forEach((value, key) => draft[key] = value);
        localStorage.setItem(`draft_record_${selectedCustomerId}`, JSON.stringify({
            data: draft,
            timestamp: Date.now()
        }));
        if (draftIndicator) {
            draftIndicator.style.opacity = '1';
            setTimeout(() => { draftIndicator.style.opacity = '0'; }, 2000);
        }
    }

    function loadRecordDraft(customerId) {
        const saved = localStorage.getItem(`draft_record_${customerId}`);
        if (!saved) return;
        try {
            const { data } = JSON.parse(saved);
            Object.keys(data).forEach(key => {
                const el = recordForm.elements[key];
                if (el) el.value = data[key];
            });
        } catch (e) { console.warn('Failed to load draft', e); }
    }

    function clearRecordDraft(customerId) {
        localStorage.removeItem(`draft_record_${customerId}`);
    }

    // フォーム入力時にオートセーブ（デバウンス処理）
    let draftTimer = null;
    if (recordForm) {
        recordForm.addEventListener('input', () => {
            clearTimeout(draftTimer);
            draftTimer = setTimeout(saveRecordDraft, 1000);
        });
    }

    // [ISSUE-NEW] 個人カレンダー描画
    let currentCustCalendarMonth = new Date();
    function renderPersonalCalendar(customer) {
        const gridBody = document.getElementById('cust-calendar-grid-body');
        const titleEl = document.getElementById('cust-calendar-title');
        if (!gridBody || !titleEl) return;

        gridBody.innerHTML = '';
        const year = currentCustCalendarMonth.getFullYear();
        const month = currentCustCalendarMonth.getMonth();
        titleEl.textContent = `${year}年 ${month + 1}月`;

        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        // 空白セル
        for (let i = 0; i < firstDay; i++) {
            gridBody.innerHTML += '<div class="calendar-day empty"></div>';
        }

        const records = customer.records || [];
        const recordDates = records.map(r => r.date);

        for (let date = 1; date <= lastDate; date++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
            const hasRecord = recordDates.includes(dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            const cell = document.createElement('div');
            cell.className = `calendar-day${hasRecord ? ' has-event' : ''}${isToday ? ' today' : ''}`;
            cell.innerHTML = `
                <span class="day-number">${date}</span>
                ${hasRecord ? `<span class="event-dot" style="background: var(--accent-cyan);"></span>` : ''}
            `;

            if (hasRecord) {
                cell.style.cursor = 'pointer';
                cell.addEventListener('click', () => {
                    window._highlightDate = dateStr;
                    activeTab = 'visit-type';
                    const typeTabBtn = document.querySelector('.tab-btn[data-tab="visit-type"]');
                    if (typeTabBtn) {
                        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                        typeTabBtn.classList.add('active');
                    }
                    renderTabContent(customer);
                });
            }

            gridBody.appendChild(cell);
        }
    }

    // 検索インプット
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderCustomerList(e.target.value);
        });
    }

    // アーカイブ表示切り替え
    if (checkShowArchived) {
        checkShowArchived.addEventListener('change', () => {
            renderCustomerList(searchInput ? searchInput.value : '');
        });
    }

    // 詳細ビューを閉じる
    if (btnCloseDetail) {
        btnCloseDetail.addEventListener('click', () => {
            selectedCustomerId = null;
            if (customerDetailView) customerDetailView.style.display = 'none';
            const workspaceGrid = document.querySelector('.workspace-grid');
            if (workspaceGrid) {
                workspaceGrid.classList.remove('detail-mode');
            }
            renderCustomerList(searchInput ? searchInput.value : '');
        });
    }

    // 詳細ビューでのアーカイブ操作
    if (btnDetailArchive) {
        btnDetailArchive.addEventListener('click', () => {
            if (!selectedCustomerId) return;
            const customer = getCustomers().find(c => c.id === selectedCustomerId);
            if (!customer) return;

            if (customer.isArchived) {
                unarchiveCustomer(customer.id);
                showToast(`${customer.name} 様のアーカイブを解除し、通常リストへ戻しました`, 'success');
                showCustomerDetail(customer.id);
                renderCustomerList(searchInput ? searchInput.value : '');
            } else {
                showConfirmModal({
                    title: 'アーカイブ保管',
                    message: `${customer.name} 様をアーカイブ保管しますか？\n（通常一覧から非表示になります。データは保持され、いつでも復元可能です）`,
                    actionText: 'アーカイブする',
                    icon: '📦',
                    theme: 'warning',
                    onConfirm: () => {
                        archiveCustomer(customer.id);
                        showToast(`${customer.name} 様をアーカイブ保管しました`, 'success');
                        showCustomerDetail(customer.id);
                        renderCustomerList(searchInput ? searchInput.value : '');
                    }
                });
            }
        });
    }

    // 詳細ビューでの完全削除操作
    const btnDeleteCustomer = document.getElementById('btn-delete-customer');
    if (btnDeleteCustomer) {
        btnDeleteCustomer.addEventListener('click', () => {
            if (!selectedCustomerId) return;
            const customer = getCustomers().find(c => String(c.id) === String(selectedCustomerId));
            if (!customer) return;

            showConfirmModal({
                title: '顧客データの完全削除',
                message: `${customer.name} 様の顧客データを完全削除（消去）しますか？\n\n※すべての施術記録・履歴もデータベースから完全に消去されます。\n※単に一覧に戻したい場合は、削除ではなく「アーカイブ解除」をご利用ください。\n※この操作は取り消せません。`,
                actionText: '完全に消去する',
                onConfirm: () => {
                    deleteCustomer(customer.id);
                    selectedCustomerId = null;
                    showToast(`${customer.name} 様の顧客データを完全に削除しました`, 'success');
                    if (customerDetailView) customerDetailView.style.display = 'none';
                    const workspaceGrid = document.querySelector('.workspace-grid');
                    if (workspaceGrid) workspaceGrid.classList.remove('detail-mode');
                    renderCustomerList(searchInput ? searchInput.value : '');
                    renderCalendar();
                }
            });
        });
    }

    // タブ切り替えボタンのクリック
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.getAttribute('data-tab');

            const customers = getCustomers();
            const customer = customers.find(c => c.id === selectedCustomerId);
            if (customer) {
                renderTabContent(customer);
            }
        });
    });

    // [MINOR v1.10.0] 顧客モーダルを新規登録モードに戻す
    function resetCustomerModal() {
        editingCustomer = null;
        if (customerForm) customerForm.reset();
        if (customerModalTitle) customerModalTitle.textContent = '新規顧客の登録';
        if (btnSubmitCustomer) btnSubmitCustomer.textContent = '登録する';
        resetInputSoulColors(); // カラー選択リセット
    }

    // [MINOR v1.10.0] 既存顧客を読み込んでモーダルを編集モードで開く
    function openCustomerEditor(id) {
        const customers = getCustomers();
        const customer = customers.find(c => c.id === id);
        if (!customer) return;

        editingCustomer = customer;
        if (customerModalTitle) customerModalTitle.textContent = '顧客情報の編集';
        if (btnSubmitCustomer) btnSubmitCustomer.textContent = '更新する';

        // フォームに値をセット
        const setVal = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value != null ? value : '';
        };
        setVal('input-name', customer.name);
        setVal('input-customer-no', customer.customerNo);
        setVal('input-kana', customer.kana);
        setVal('input-phone', customer.phone);
        setVal('input-birthday', customer.birthday);
        setVal('input-referrer', customer.referrer);
        if (inputInitialConsultation) inputInitialConsultation.value = customer.initialConsultation || '';
        if (inputMemo) inputMemo.value = customer.memo || '';

        // Soul Colorのセット
        if (inputSoulColorSlots && inputSoulColorPalette) {
            setInputSoulColors(getSoulColors(customer));
        }

        if (customerModal) customerModal.classList.add('active');
    }

    if (btnEditCustomer) {
        btnEditCustomer.addEventListener('click', () => {
            if (selectedCustomerId) {
                openCustomerEditor(selectedCustomerId);
            }
        });
    }

    // 顧客登録モーダル表示・非表示
    if (btnAddCustomer) {
        btnAddCustomer.addEventListener('click', () => {
            resetCustomerModal();
            if (customerModal) customerModal.classList.add('active');
        });
    }
    if (btnCancelCustomer) {
        btnCancelCustomer.addEventListener('click', () => {
            if (customerModal) customerModal.classList.remove('active');
            resetCustomerModal();
        });
    }

    // 顧客フォーム送信処理
    if (btnSubmitCustomer) {
        btnSubmitCustomer.addEventListener('click', () => {
            const nameEl = document.getElementById('input-name');
            const name = nameEl ? nameEl.value : '';
            if (!name) {
                showToast('お名前は必須項目です。', 'error');
                return;
            }
            const customerNoEl = document.getElementById('input-customer-no');
            const customerNo = customerNoEl ? customerNoEl.value : '';
            const kanaEl = document.getElementById('input-kana');
            const kana = kanaEl ? kanaEl.value : '';
            const phoneEl = document.getElementById('input-phone');
            const phone = phoneEl ? phoneEl.value : '';
            const birthdayEl = document.getElementById('input-birthday');
            const birthday = birthdayEl ? birthdayEl.value : '';
            const soulColors = getInputSoulColors();
            const referrerEl = document.getElementById('input-referrer');
            const referrer = referrerEl ? referrerEl.value : '';
            const initialConsultation = inputInitialConsultation ? inputInitialConsultation.value : '';
            const memo = inputMemo ? inputMemo.value : '';

            // 編集モードなら更新処理、そうでなければ新規登録
            if (editingCustomer) {
                updateCustomer(editingCustomer.id, {
                    name, kana, phone, memo, customerNo, birthday, soulColors, referrer, initialConsultation
                });
                showToast(`${name} 様の情報を更新しました`, 'success');
            } else {
                const newCust = addCustomer(name, kana, phone, memo, customerNo, birthday, soulColors, referrer, initialConsultation);
                showToast(`${name} 様を登録しました`, 'success');
                selectedCustomerId = newCust.id; // 新規登録後はその顧客を選択状態にする
            }

            if (customerModal) customerModal.classList.remove('active');
            resetCustomerModal();

            renderCustomerList(searchInput ? searchInput.value : '');
            if (selectedCustomerId) {
                showCustomerDetail(selectedCustomerId);
            }
        });
    }

    // -------------------------------------------------------------------
    // [ISSUE-020] 施術記録の編集モード
    // 追加用モーダルを流用し、editingRecord の有無で追加／更新を切り替える
    // -------------------------------------------------------------------
    const recordModalTitle = document.getElementById('record-modal-title');
    let editingRecord = null; // { customerId, recordId } または null（＝新規追加）

    /** モーダルを新規追加モードに戻す。閉じるときは必ずこれを通す */
    function resetRecordModal() {
        editingRecord = null;
        if (recordForm) recordForm.reset();
        if (recordModalTitle) recordModalTitle.textContent = '施術内容・金額の記録';
        if (btnSubmitRecord) btnSubmitRecord.textContent = '記録する';
        
        const selectPlan = document.getElementById('select-plan');
        if (selectPlan) selectPlan.value = '';
    }

    /** 既存記録を読み込んでモーダルを編集モードで開く */
    function openRecordEditor(customerId, recordId) {
        const customer = getCustomers().find(c => c.id === customerId);
        const record = customer && (customer.records || []).find(r => r.id === recordId);
        if (!record) {
            showToast('対象の施術記録が見つかりませんでした。', 'error');
            return;
        }

        editingRecord = { customerId, recordId };

        const setVal = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value != null ? value : '';
        };
        setVal('input-date', record.date);
        setVal('input-time', record.time);
        setVal('input-type', record.type);
        setVal('input-client-complaint', record.clientComplaint);
        setVal('input-prescription', record.prescription);
        setVal('input-therapist-note', record.therapistNote);
        setVal('input-amount', record.amount);

        // [ISSUE-NEW] 下書きがあれば読み込む
        loadRecordDraft(customerId);

        // 既存記録の場合は読み取り専用モードで開始
        setRecordFormReadonly(true);

        // 編集時は対象顧客が確定しているため、顧客選択セレクトは隠す
        if (recordCustomerSelectGroup) recordCustomerSelectGroup.style.display = 'none';
        if (recordModalTitle) recordModalTitle.textContent = '施術記録の編集';
        if (btnSubmitRecord) btnSubmitRecord.textContent = '更新する';
        if (recordModal) recordModal.classList.add('active');
    }

    // 記録カードの編集ボタンから呼ばれるコールバックを登録
    onRecordEditRequested = openRecordEditor;

    if (btnCancelRecord) {
        btnCancelRecord.addEventListener('click', () => {
            if (recordModal) recordModal.classList.remove('active');
            resetRecordModal();
        });
    }

    // レコードフォーム送信処理
    if (btnSubmitRecord) {
        btnSubmitRecord.addEventListener('click', () => {
            const dateEl = document.getElementById('input-date');
            const date = dateEl ? dateEl.value : '';
            const timeEl = document.getElementById('input-time');
            const time = timeEl ? timeEl.value : '';
            const typeEl = document.getElementById('input-type');
            const type = typeEl ? typeEl.value : '';
            const clientComplaintEl = document.getElementById('input-client-complaint');
            const clientComplaint = clientComplaintEl ? clientComplaintEl.value : '';
            const prescriptionEl = document.getElementById('input-prescription');
            const prescription = prescriptionEl ? prescriptionEl.value : '';
            const therapistNoteEl = document.getElementById('input-therapist-note');
            const therapistNote = therapistNoteEl ? therapistNoteEl.value : '';
            const amountEl = document.getElementById('input-amount');
            const amount = amountEl ? amountEl.value : '';

            if (!date || !type || !amount) {
                showToast('来店日、施術内容、金額は必須項目です。', 'error');
                return;
            }

            // [ISSUE-020] 編集モードなら既存記録を更新して終了する
            if (editingRecord) {
                const result = updateRecord(editingRecord.customerId, editingRecord.recordId, {
                    date, type, amount, time, clientComplaint, prescription, therapistNote
                });
                const editedCustomerId = editingRecord.customerId;

                // [ISSUE-NEW] 下書きを消去
                clearRecordDraft(editedCustomerId);

                if (recordModal) recordModal.classList.remove('active');
                resetRecordModal();

                if (!result) {
                    showToast('施術記録の更新に失敗しました。', 'error');
                    return;
                }
                renderCalendar();          // 日付を変更した場合にドットを追従させる
                showCustomerDetail(editedCustomerId);
                return;
            }

            let targetId = selectedCustomerId;
            const isFromCalendar = (recordCustomerSelectGroup && recordCustomerSelectGroup.style.display === 'block');
            if (isFromCalendar && inputRecordCustomerId) {
                targetId = inputRecordCustomerId.value;
            }

            if (!targetId) {
                showToast('対象の顧客が選択されていません。', 'error');
                return;
            }

            const updated = addRecord(targetId, date, type, amount, time, clientComplaint, prescription, therapistNote);
            
            // [ISSUE-NEW] 下書きを消去
            clearRecordDraft(targetId);

            if (recordModal) recordModal.classList.remove('active');
            if (recordForm) recordForm.reset();

            if (updated) {
                if (isFromCalendar) {
                    renderCalendar();
                    // この日の来店記録を再構築して詳細を描画
                    const customers = getCustomers();
                    const dailyVisits = [];
                    customers.forEach(cust => {
                        if (cust.records) {
                            cust.records.forEach(rec => {
                                if (rec.date === date) {
                                    dailyVisits.push({ customer: cust, record: rec });
                                }
                            });
                        }
                    });
                    showCalendarDayDetails(date, dailyVisits);
                } else {
                    showCustomerDetail(selectedCustomerId);
                }
            }
        });
    }

    // テキストエリア自動リサイズ (新規登録モーダルのメモ欄用)
    if (inputMemo) {
        inputMemo.addEventListener('input', () => {
            inputMemo.style.height = 'auto';
            inputMemo.style.height = inputMemo.scrollHeight + 'px';
        });
    }
    if (inputInitialConsultation) {
        inputInitialConsultation.addEventListener('input', () => {
            inputInitialConsultation.style.height = 'auto';
            inputInitialConsultation.style.height = inputInitialConsultation.scrollHeight + 'px';
        });
    }

    // 5. テーマスライダーの制御
    const themeSlider = document.getElementById('theme-slider');
    const root = document.documentElement;
    if (themeSlider) {
        let savedBlend = '0';
        try {
            savedBlend = localStorage.getItem('theme-blend') || '0';
        } catch (e) {
            console.warn('Brave/Browser security policy blocked localStorage read for theme.', e);
        }
        themeSlider.value = savedBlend;
        root.style.setProperty('--theme-blend', savedBlend + '%');

        themeSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            root.style.setProperty('--theme-blend', val + '%');
            try {
                localStorage.setItem('theme-blend', val);
            } catch (err) {
                console.warn('Brave/Browser security policy blocked localStorage write for theme.', err);
            }
        });
    }

    // 6. カレンダー ＆ カラー設定ビュー制御
    const btnViewList = document.getElementById('btn-view-list');
    const btnViewCalendar = document.getElementById('btn-view-calendar');
    const btnViewColorSettings = document.getElementById('btn-view-color-settings');

    const searchContainerSection = document.getElementById('search-container-section');
    const calendarViewContainer = document.getElementById('calendar-view-container');
    const colorSettingsViewContainer = document.getElementById('color-settings-view-container');

    const calendarPrevBtn = document.getElementById('calendar-prev-btn');
    const calendarNextBtn = document.getElementById('calendar-next-btn');
    const calendarMonthTitle = document.getElementById('calendar-month-title');
    const calendarGridBody = document.getElementById('calendar-grid-body');
    const calendarDayDetails = document.getElementById('calendar-day-details');
    const calendarDetailsTitle = document.getElementById('calendar-details-title');
    const calendarVisitsContainer = document.getElementById('calendar-visits-container');
    const btnCalendarAddRecord = document.getElementById('btn-calendar-add-record');
    const recordCustomerSelectGroup = document.getElementById('record-customer-select-group');
    const inputRecordCustomerId = document.getElementById('input-record-customer-id');

    // カラー設定用のDOM要素
    const inputNewColorName = document.getElementById('input-new-color-name');
    const inputNewColorPicker = document.getElementById('input-new-color-picker');
    const inputNewColorCode = document.getElementById('input-new-color-code');
    const btnAddColorMaster = document.getElementById('btn-add-color-master');

    // ピッカーとHEXコードの双方向同期
    if (inputNewColorPicker && inputNewColorCode) {
        inputNewColorPicker.addEventListener('input', (e) => {
            inputNewColorCode.value = e.target.value;
        });
        inputNewColorCode.addEventListener('input', (e) => {
            if (e.target.value.startsWith('#') && (e.target.value.length === 4 || e.target.value.length === 7)) {
                inputNewColorPicker.value = e.target.value;
            }
        });
    }

    function renderColorSettingsView() {
        const grid = document.getElementById('color-masters-grid');
        if (!grid) return;

        const masters = getColorMasters();
        grid.innerHTML = '';

        if (masters.length === 0) {
            grid.innerHTML = `<div style="color: var(--text-secondary); padding: 12px;">登録済みのカラーはありません。</div>`;
            return;
        }

        masters.forEach(m => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid var(--border-glass);
                border-radius: 12px;
                padding: 12px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                transition: all 0.2s ease;
            `;

            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: ${m.code}; border: 2px solid rgba(255,255,255,0.2); box-shadow: 0 0 8px ${m.code}aa; flex-shrink: 0;"></div>
                    <div style="min-width: 0; flex: 1;">
                        <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(m.name)}</div>
                        <div style="font-size: 0.7rem; color: var(--text-secondary); font-family: monospace;">${m.code.toUpperCase()}</div>
                    </div>
                </div>
                <div style="display: flex; gap: 4px; flex-shrink: 0;">
                    <button type="button" class="btn-edit-master" data-id="${m.id}" title="編集" style="background: rgba(255,255,255,0.08); border: none; color: var(--text-secondary); padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 0.75rem;">✏️</button>
                    <button type="button" class="btn-delete-master" data-id="${m.id}" title="削除" style="background: rgba(255,77,77,0.15); border: none; color: #ff6b6b; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 0.75rem;">🗑️</button>
                </div>
            `;

            grid.appendChild(card);
        });

        // 削除ボタン
        grid.querySelectorAll('.btn-delete-master').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const target = masters.find(x => x.id === id);
                if (target) {
                    showConfirmModal({
                        title: 'カラーの削除',
                        message: `カラー「${target.name}」を削除しますか？`,
                        actionText: '削除する',
                        onConfirm: () => {
                            deleteColorMaster(id);
                            showToast(`カラー「${target.name}」を削除しました`, 'success');
                            renderColorSettingsView();
                        }
                    });
                }
            };
        });

        // 編集ボタン
        grid.querySelectorAll('.btn-edit-master').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const target = masters.find(x => x.id === id);
                if (!target) return;

                const newName = prompt('カラー名称を変更:', target.name);
                if (newName === null) return;
                const newCode = prompt('色コード (HEX) を変更:', target.code);
                if (newCode === null) return;

                updateColorMaster(id, newName.trim(), newCode.trim());
                showToast(`カラー「${newName}」を更新しました`, 'success');
                renderColorSettingsView();
            };
        });
    }

    if (btnAddColorMaster) {
        btnAddColorMaster.onclick = () => {
            const name = inputNewColorName ? inputNewColorName.value.trim() : '';
            const code = inputNewColorCode ? inputNewColorCode.value.trim() : '#00f2fe';

            if (!name) {
                showToast('カラー名称を入力してください', 'error');
                return;
            }

            addColorMaster(name, code);
            showToast(`カラー「${name}」を登録しました`, 'success');
            if (inputNewColorName) inputNewColorName.value = '';
            renderColorSettingsView();
        };
    }

    // [MINOR v1.6.0] インライン簡易記録フォーム用のDOM要素
    const inlineRecordCustomerId = document.getElementById('inline-record-customer-id');
    const inlineRecordType = document.getElementById('inline-record-type');
    const inlineRecordAmount = document.getElementById('inline-record-amount');
    const inlineRecordTime = document.getElementById('inline-record-time');
    const inlineRecordComplaint = document.getElementById('inline-record-complaint');
    const inlineRecordPrescription = document.getElementById('inline-record-prescription');
    const inlineRecordNote = document.getElementById('inline-record-note');
    const btnInlineSubmitRecord = document.getElementById('btn-inline-submit-record');

    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth();
    let selectedCalendarDateStr = null;

    const workspaceGrid = document.querySelector('.workspace-grid');

    // 6. メインビュー（一覧 / カレンダー / カラー設定）の切り替え制御
    const activateViewTab = (activeBtn) => {
        [btnViewList, btnViewCalendar, btnViewColorSettings].forEach(btn => {
            if (!btn) return;
            if (btn === activeBtn) {
                btn.classList.add('active-tab-btn');
            } else {
                btn.classList.remove('active-tab-btn');
            }
        });
    };

    if (btnViewList) {
        btnViewList.addEventListener('click', () => {
            activateViewTab(btnViewList);

            if (searchContainerSection) searchContainerSection.style.display = 'flex';
            if (customerListContainer) customerListContainer.style.display = '';
            if (calendarViewContainer) calendarViewContainer.style.display = 'none';
            if (colorSettingsViewContainer) colorSettingsViewContainer.style.display = 'none';

            if (workspaceGrid) {
                workspaceGrid.classList.remove('calendar-mode');
                workspaceGrid.classList.remove('detail-mode');
            }
            if (customerDetailView) customerDetailView.style.display = 'none';
            if (customerModal) customerModal.classList.remove('active');
            selectedCustomerId = null;

            renderCustomerList(searchInput ? searchInput.value : '');
        });
    }

    if (btnViewCalendar) {
        btnViewCalendar.addEventListener('click', () => {
            activateViewTab(btnViewCalendar);

            if (searchContainerSection) searchContainerSection.style.display = 'none';
            if (customerListContainer) customerListContainer.style.display = 'none';
            if (calendarViewContainer) calendarViewContainer.style.display = 'flex';
            if (colorSettingsViewContainer) colorSettingsViewContainer.style.display = 'none';
            if (customerDetailView) customerDetailView.style.display = 'none';
            if (customerModal) customerModal.classList.remove('active');

            if (workspaceGrid) {
                workspaceGrid.classList.remove('detail-mode');
                workspaceGrid.classList.add('calendar-mode');
            }

            renderCalendar();

            if (!selectedCalendarDateStr) {
                const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                selectedCalendarDateStr = todayStr;
            }
            const customers = getCustomers();
            const dailyVisits = [];
            customers.forEach(cust => {
                if (cust.records) {
                    cust.records.forEach(rec => {
                        if (rec.date === selectedCalendarDateStr) {
                            dailyVisits.push({ customer: cust, record: rec });
                        }
                    });
                }
            });
            showCalendarDayDetails(selectedCalendarDateStr, dailyVisits);
        });
    }

    if (btnViewColorSettings) {
        btnViewColorSettings.addEventListener('click', () => {
            activateViewTab(btnViewColorSettings);

            if (searchContainerSection) searchContainerSection.style.display = 'none';
            if (customerListContainer) customerListContainer.style.display = 'none';
            if (calendarViewContainer) calendarViewContainer.style.display = 'none';
            if (colorSettingsViewContainer) colorSettingsViewContainer.style.display = 'block';
            if (customerDetailView) customerDetailView.style.display = 'none';
            if (customerModal) customerModal.classList.remove('active');

            if (workspaceGrid) {
                workspaceGrid.classList.remove('calendar-mode');
                workspaceGrid.classList.remove('detail-mode');
            }

            renderColorSettingsView();
        });
    }

    if (calendarPrevBtn) {
        calendarPrevBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar();
        });
    }

    if (calendarNextBtn) {
        calendarNextBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar();
        });
    }

    function renderCalendar() {
        if (!calendarGridBody) return;
        calendarGridBody.innerHTML = '';
        if (calendarMonthTitle) calendarMonthTitle.textContent = `${currentYear}年 ${currentMonth + 1}月`;

        const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
        const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
        const prevLastDay = new Date(currentYear, currentMonth, 0).getDate();
        const customers = getCustomers();

        // 前月の余白
        for (let i = firstDayIndex; i > 0; i--) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day other-month';
            cell.innerHTML = `<span class="calendar-day-num">${prevLastDay - i + 1}</span>`;
            calendarGridBody.appendChild(cell);
        }

        // 当月の日付
        const today = new Date();
        for (let day = 1; day <= lastDay; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day';

            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            if (today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day) {
                cell.classList.add('today');
            }
            if (selectedCalendarDateStr === dateStr) {
                cell.classList.add('selected');
            }

            cell.innerHTML = `<span class="calendar-day-num">${day}</span>`;

            // この日の来店記録を検索
            const dailyVisits = [];
            customers.forEach(cust => {
                if (cust.records) {
                    cust.records.forEach(rec => {
                        if (rec.date === dateStr) {
                            dailyVisits.push({ customer: cust, record: rec });
                        }
                    });
                }
            });
            if (dailyVisits.length > 0) {
                const indicators = document.createElement('div');
                indicators.className = 'calendar-day-indicators';
                indicators.style.display = 'flex';
                indicators.style.justifyContent = 'center';
                indicators.style.gap = '4px';
                indicators.style.width = '100%';
                indicators.style.marginTop = '4px';

                dailyVisits.slice(0, 3).forEach(visit => {
                    const dotWrap = document.createElement('div');
                    dotWrap.innerHTML = buildCustomerColorIndicatorHtml(visit.customer);
                    const dot = dotWrap.firstElementChild;
                    dot.style.width = '10px';
                    dot.style.height = '10px';
                    dot.style.marginRight = '0';
                    dot.title = visit.customer.name;
                    indicators.appendChild(dot);
                });
                cell.appendChild(indicators);
            }

            cell.addEventListener('click', () => {
                document.querySelectorAll('.calendar-day').forEach(c => c.classList.remove('selected'));
                cell.classList.add('selected');
                selectedCalendarDateStr = dateStr;
                showCalendarDayDetails(dateStr, dailyVisits);
            });

            calendarGridBody.appendChild(cell);
        }

        // 選択中の日付があれば、削除・更新後も最新の記録データで再描画する
        if (selectedCalendarDateStr) {
            const freshCustomers = getCustomers();
            const updatedDailyVisits = [];
            freshCustomers.forEach(cust => {
                if (cust.records) {
                    cust.records.forEach(rec => {
                        if (rec.date === selectedCalendarDateStr) {
                            updatedDailyVisits.push({ customer: cust, record: rec });
                        }
                    });
                }
            });
            showCalendarDayDetails(selectedCalendarDateStr, updatedDailyVisits);
        }
    }

    // [MINOR v1.6.0] インライン簡易記録フォームをクリアする処理
    function resetInlineForm() {
        if (inlineRecordType) inlineRecordType.value = '';
        if (inlineRecordAmount) inlineRecordAmount.value = '';
        if (inlineRecordTime) inlineRecordTime.value = '';
        if (inlineRecordComplaint) inlineRecordComplaint.value = '';
        if (inlineRecordPrescription) inlineRecordPrescription.value = '';
        if (inlineRecordNote) inlineRecordNote.value = '';

        const inlineSelectPlan = document.getElementById('inline-select-plan');
        if (inlineSelectPlan) inlineSelectPlan.value = '';

        // 詳細アコーディオン（details）を閉じる
        const detailsEl = document.querySelector('#calendar-inline-form-container details');
        if (detailsEl) {
            detailsEl.removeAttribute('open');
        }
    }

    function showCalendarDayDetails(dateStr, dailyVisits) {
        if (!calendarDayDetails) return;
        if (calendarDetailsTitle) calendarDetailsTitle.textContent = `${dateStr.replace(/-/g, '/')}の記録`;
        calendarDayDetails.style.display = 'block';

        // [MINOR v1.6.0] インラインフォーム用の対象顧客ドロップダウンを動的に同期する
        if (inlineRecordCustomerId) {
            inlineRecordCustomerId.innerHTML = '';
            const customers = getCustomers();
            customers.forEach(cust => {
                const opt = document.createElement('option');
                opt.value = cust.id;
                opt.textContent = `${cust.name} (${cust.customerNo || ''})`;
                inlineRecordCustomerId.appendChild(opt);
            });
        }
        resetInlineForm(); // 日付切り替え時にフォームを初期化

        if (calendarVisitsContainer) {
            calendarVisitsContainer.innerHTML = '';
            if (dailyVisits.length === 0) {
                calendarVisitsContainer.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 12px;">この日の施術記録はありません。</div>`;
                return;
            }

            dailyVisits.forEach(visit => {
                const item = document.createElement('div');
                item.className = 'calendar-visit-item';
                item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); border-radius: 12px; margin-bottom: 8px;';
                item.innerHTML = `
                    <div class="cal-item-info" style="cursor: pointer; flex: 1;">
                        <div style="font-weight: 600; display: flex; align-items: center; gap: 6px;">
                            ${buildCustomerColorIndicatorHtml(visit.customer)}
                            <span style="color: var(--text-primary); font-size: 0.95rem;">${visit.customer.name}</span>
                            <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-secondary);">${visit.record.time ? `(${visit.record.time})` : ''}</span>
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                            ${visit.record.type} / <strong style="color: var(--accent-success);">${Number(visit.record.amount).toLocaleString()}円</strong>
                        </div>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center; margin-left: 8px;">
                        <button class="btn-cal-edit-rec" title="予約・記録を変更" style="background: rgba(0, 242, 254, 0.12); border: 1px solid var(--accent-cyan); color: var(--accent-cyan); padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 2px;">
                            ✏️ <span class="btn-text">変更</span>
                        </button>
                        <button class="btn-cal-del-rec" title="予約・記録を削除" style="background: rgba(255, 82, 82, 0.12); border: 1px solid #ff5252; color: #ff5252; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 2px;">
                            🗑️ <span class="btn-text">削除</span>
                        </button>
                        <span class="goto-detail" title="顧客詳細へ" style="color: var(--text-secondary); font-weight: bold; cursor: pointer; padding: 2px 4px; font-size: 1.1rem;">&rarr;</span>
                    </div>
                `;

                const btnEdit = item.querySelector('.btn-cal-edit-rec');
                if (btnEdit) {
                    btnEdit.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (onRecordEditRequested) onRecordEditRequested(visit.customer.id, visit.record.id);
                    });
                }

                const btnDel = item.querySelector('.btn-cal-del-rec');
                if (btnDel) {
                    btnDel.addEventListener('click', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        showConfirmModal({
                            title: '予約・施術記録の削除',
                            message: `${visit.customer.name} 様のこの予約・施術記録を削除してもよろしいですか？\n※この操作は取り消せません。`,
                            actionText: '削除する',
                            onConfirm: () => {
                                deleteRecord(visit.customer.id, visit.record.id);
                                showToast('予約・施術記録を削除しました', 'success');
                                item.remove(); // 直ちにリストからDOM削除
                                renderCalendar();
                                if (selectedCustomerId) {
                                    showCustomerDetail(selectedCustomerId);
                                }
                            }
                        });
                    });
                }

                const handleGoToDetail = (e) => {
                    e.stopPropagation();
                    if (searchContainerSection) searchContainerSection.style.display = 'flex';
                    if (customerListContainer) customerListContainer.style.display = '';
                    if (calendarViewContainer) calendarViewContainer.style.display = 'none';
                    if (workspaceGrid) workspaceGrid.classList.remove('calendar-mode');

                    if (btnViewList && btnViewCalendar) {
                        btnViewList.style.background = 'var(--accent-cyan)';
                        btnViewList.style.color = '#000';
                        btnViewList.style.fontWeight = '600';
                        btnViewCalendar.style.background = 'transparent';
                        btnViewCalendar.style.color = 'var(--text-secondary)';
                        btnViewCalendar.style.fontWeight = '500';
                    }

                    showCustomerDetail(visit.customer.id);
                    const visitTypeTabBtn = document.querySelector('[data-tab="visit-type"]');
                    if (visitTypeTabBtn) visitTypeTabBtn.click();
                };

                const clickTarget = item.querySelector('.cal-item-info');
                const gotoDetailBtn = item.querySelector('.goto-detail');
                if (clickTarget) clickTarget.addEventListener('click', handleGoToDetail);
                if (gotoDetailBtn) gotoDetailBtn.addEventListener('click', handleGoToDetail);

                calendarVisitsContainer.appendChild(item);
            });
        }
    }

    // [MINOR v1.6.0] インライン記録フォームの保存処理イベントハンドラ
    if (btnInlineSubmitRecord) {
        btnInlineSubmitRecord.addEventListener('click', () => {
            if (!selectedCalendarDateStr) {
                showToast('日付が選択されていません。', 'error');
                return;
            }
            const customerId = inlineRecordCustomerId ? inlineRecordCustomerId.value : '';
            const type = inlineRecordType ? inlineRecordType.value : '';
            const amount = inlineRecordAmount ? inlineRecordAmount.value : '';

            const time = inlineRecordTime ? inlineRecordTime.value : '';
            const clientComplaint = inlineRecordComplaint ? inlineRecordComplaint.value : '';
            const prescription = inlineRecordPrescription ? inlineRecordPrescription.value : '';
            const therapistNote = inlineRecordNote ? inlineRecordNote.value : '';

            if (!customerId) {
                showToast('顧客を選択してください。', 'error');
                return;
            }
            if (!type) {
                showToast('施術メニューを入力してください。', 'error');
                return;
            }
            if (!amount) {
                showToast('金額を入力してください。', 'error');
                return;
            }

            const updated = addRecord(customerId, selectedCalendarDateStr, type, amount, time, clientComplaint, prescription, therapistNote);
            if (updated) {
                // 保存完了の視覚フィードバック
                const originalText = btnInlineSubmitRecord.textContent;
                btnInlineSubmitRecord.textContent = '保存しました！';
                btnInlineSubmitRecord.style.background = 'var(--accent-success)';
                btnInlineSubmitRecord.style.color = '#fff';
                btnInlineSubmitRecord.disabled = true;

                setTimeout(() => {
                    btnInlineSubmitRecord.textContent = originalText;
                    btnInlineSubmitRecord.style.background = '';
                    btnInlineSubmitRecord.style.color = '';
                    btnInlineSubmitRecord.disabled = false;

                    // フォームをクリアしてリフレッシュ
                    resetInlineForm();
                    renderCalendar();

                    // 該当日の来店データを再取得して表示を更新する
                    const customers = getCustomers();
                    const dailyVisits = [];
                    customers.forEach(cust => {
                        if (cust.records) {
                            cust.records.forEach(rec => {
                                if (rec.date === selectedCalendarDateStr) {
                                    dailyVisits.push({ customer: cust, record: rec });
                                }
                            });
                        }
                    });
                    showCalendarDayDetails(selectedCalendarDateStr, dailyVisits);
                }, 1000);
            }
        });
    }


    if (btnCalendarAddRecord) {
        btnCalendarAddRecord.addEventListener('click', () => {
            if (!selectedCalendarDateStr) return;
            resetRecordModal(); // [ISSUE-020] 直前の編集モードを持ち越さない
            
            // 新規作成時は編集可能モードで開始
            setRecordFormReadonly(false);
            if (btnToggleEditRecord) btnToggleEditRecord.style.display = 'none';

            if (recordCustomerSelectGroup && inputRecordCustomerId) {
                recordCustomerSelectGroup.style.display = 'block';
                inputRecordCustomerId.innerHTML = '';
                const customers = getCustomers();
                customers.forEach(cust => {
                    const opt = document.createElement('option');
                    opt.value = cust.id;
                    opt.textContent = `${cust.name} (${cust.customerNo || ''})`;
                    inputRecordCustomerId.appendChild(opt);
                });
            }
            const dateEl = document.getElementById('input-date');
            if (dateEl) {
                dateEl.value = selectedCalendarDateStr;
                // 日付がセットされたらその顧客の（もしあれば）下書きを読み込む
                if (inputRecordCustomerId && inputRecordCustomerId.value) {
                    loadRecordDraft(inputRecordCustomerId.value);
                }
            }
            if (recordModal) recordModal.classList.add('active');
        });
    }

    // [ISSUE-NEW] カレンダーからの新規登録で顧客を切り替えたら下書きを読み込む
    if (inputRecordCustomerId) {
        inputRecordCustomerId.addEventListener('change', () => {
            loadRecordDraft(inputRecordCustomerId.value);
        });
    }

    // [ISSUE-NEW] 記録フォームの入力時に自動保存
    const recordInputs = ['input-date', 'input-time', 'input-type', 'input-client-complaint', 'input-prescription', 'input-therapist-note', 'input-amount'];
    recordInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                let targetId = selectedCustomerId;
                if (recordCustomerSelectGroup && recordCustomerSelectGroup.style.display === 'block' && inputRecordCustomerId) {
                    targetId = inputRecordCustomerId.value;
                }
                saveRecordDraft(targetId);
            });
        }
    });

    // 💡 使い方デモモーダルの制御
    const btnDemoGuide = document.getElementById('btn-demo-guide');
    const demoGuideModal = document.getElementById('demo-guide-modal');
    const btnCloseDemoModal = document.getElementById('btn-close-demo-modal');
    const btnStartLiveTour = document.getElementById('btn-start-live-tour');
    const btnStopLiveTour = document.getElementById('btn-stop-live-tour');

    const liveCursor = document.getElementById('live-demo-cursor');
    const liveCursorLabel = document.getElementById('live-demo-cursor-label');
    const liveBanner = document.getElementById('live-demo-banner');
    const liveStepText = document.getElementById('live-demo-step-text');

    let isDemoRunning = false;

    // 非同期スリープ & 中断チェック
    const sleep = (ms) => new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(), ms);
        const checkInterval = setInterval(() => {
            if (!isDemoRunning) {
                clearTimeout(timer);
                clearInterval(checkInterval);
                reject(new Error('DEMO_STOPPED'));
            }
        }, 50);
    });

    // 仮想カーソル移動
    const moveCursorTo = async (target, labelText) => {
        if (!target) return;
        let el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return;

        // [DEMO-FIX] ターゲットを見える位置まで強制スクロール
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(400);

        const rect = el.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        if (liveCursor) {
            liveCursor.style.transform = `translate(${x}px, ${y}px)`;
            if (labelText && liveCursorLabel) {
                liveCursorLabel.textContent = labelText;
                
                // [DEMO-FIX] ラベルが画面外やターゲットに重ならないように調整
                // 右端に近い場合は左側に寄せる
                if (x > window.innerWidth * 0.6) {
                    liveCursorLabel.style.left = 'auto';
                    liveCursorLabel.style.right = '30px';
                } else {
                    liveCursorLabel.style.left = '30px';
                    liveCursorLabel.style.right = 'auto';
                }

                // 下端に近い場合や、ターゲットと重なりそうな場合は上側に表示
                if (y > window.innerHeight * 0.7) {
                    liveCursorLabel.style.top = 'auto';
                    liveCursorLabel.style.bottom = '40px';
                } else {
                    liveCursorLabel.style.top = '40px';
                    liveCursorLabel.style.bottom = 'auto';
                }
            }
        }
        if (liveStepText && labelText) {
            liveStepText.textContent = labelText;
        }
        await sleep(800);
    };

    // クリックシミュレーション
    const clickCursor = async (target) => {
        if (!target) return;
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        // リップル波紋
        const ripple = document.createElement('div');
        ripple.className = 'demo-click-ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);

        el.click();
        await sleep(500);
    };

    // タイピングシミュレーション
    const typeInput = async (inputEl, text, labelText) => {
        if (!inputEl) return;
        
        if (labelText) {
            await moveCursorTo(inputEl, labelText);
            await clickCursor(inputEl);
        } else {
            await moveCursorTo(inputEl);
        }

        // [DEMO-FIX] スマホでのキーボード強制表示を徹底的に防ぐ
        const prevInputMode = inputEl.inputMode;
        const prevReadOnly = inputEl.readOnly;
        
        if (inputEl.type === 'date') {
            inputEl.value = text;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
            await sleep(500);
            return;
        }

        inputEl.inputMode = 'none';
        inputEl.readOnly = true; // フォーカス時のキーボード表示を抑制
        
        inputEl.value = '';
        inputEl.focus();
        
        for (let i = 0; i < text.length; i++) {
            inputEl.value += text[i];
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            await sleep(80);
        }
        
        // 状態を戻す
        inputEl.readOnly = prevReadOnly;
        if (prevInputMode) {
            inputEl.inputMode = prevInputMode;
        } else {
            inputEl.removeAttribute('inputmode');
        }
        
        await sleep(300);
    };

    // ドロップダウンリストアニメーション選択
    const selectDropdownOption = async (selectEl, targetOptionIndexOrValue, labelText) => {
        if (!selectEl) return;

        // 1. ドロップダウンの位置に移動してクリック
        await moveCursorTo(selectEl, labelText);
        await clickCursor(selectEl);

        // 対象オプションインデックスの算出
        let targetIndex = 0;
        if (typeof targetOptionIndexOrValue === 'number') {
            targetIndex = targetOptionIndexOrValue;
        } else {
            const options = Array.from(selectEl.options);
            const idx = options.findIndex(opt => opt.value === targetOptionIndexOrValue || opt.text.includes(targetOptionIndexOrValue));
            targetIndex = idx >= 0 ? idx : 0;
        }

        // 2. ドロップダウンリスト風オーバーレイUIの生成
        const rect = selectEl.getBoundingClientRect();
        const menu = document.createElement('div');
        menu.className = 'demo-dropdown-menu';
        menu.style.left = `${rect.left}px`;
        
        // [DEMO-FIX] 画面外にはみ出さないように配置調整
        let top = rect.bottom + 4;
        if (top + 200 > window.innerHeight) {
            top = rect.top - 200 - 4; // 上に表示
        }
        menu.style.top = `${top}px`;
        menu.style.width = `${Math.max(rect.width, 220)}px`;

        const options = Array.from(selectEl.options);
        const itemEls = [];

        options.forEach((opt, idx) => {
            const item = document.createElement('div');
            item.className = `demo-dropdown-item ${idx === selectEl.selectedIndex ? 'selected' : ''}`;
            item.textContent = opt.text;
            menu.appendChild(item);
            itemEls.push(item);
        });

        document.body.appendChild(menu);
        await sleep(400);

        // 3. カーソルを対象オプション項目へ移動し選択クリック
        const targetItemEl = itemEls[targetIndex] || itemEls[0];
        if (targetItemEl) {
            // [DEMO-FIX] ドロップダウン内の項目も必要に応じてスクロール
            targetItemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            await sleep(300);

            itemEls.forEach(el => el.classList.remove('active-hover'));
            targetItemEl.classList.add('active-hover');

            await moveCursorTo(targetItemEl, labelText);
            await sleep(300);
            await clickCursor(targetItemEl);

            // 実際の選択値を適用
            selectEl.selectedIndex = targetIndex;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // 4. クローズ
        await sleep(300);
        menu.remove();
        await sleep(300);
    };

    // ライブツアーの停止
    const stopLiveTour = () => {
        isDemoRunning = false;
        document.body.classList.remove('demo-active');
        if (liveCursor) liveCursor.classList.remove('active');
        if (liveBanner) liveBanner.classList.remove('active');
        document.querySelectorAll('.demo-dropdown-menu').forEach(m => m.remove());
    };

    if (btnStopLiveTour) {
        btnStopLiveTour.addEventListener('click', stopLiveTour);
    }

    // --- 施術プラン選択の連動ロジック ---
    const selectPlan = document.getElementById('select-plan');
    const inlineSelectPlan = document.getElementById('inline-select-plan');
    const planModal = document.getElementById('plan-modal');
    const planListContainer = document.getElementById('plan-list-container');
    const btnAddPlan = document.getElementById('btn-add-new-plan');
    const btnClosePlanModal = document.getElementById('btn-close-plan-modal');
    const newPlanNameInput = document.getElementById('new-plan-name');
    const newPlanAmountInput = document.getElementById('new-plan-amount');
    const newPlanDescriptionInput = document.getElementById('new-plan-description');

    /** プラン一覧（ドロップダウン）を描画更新する */
    function renderPlans() {
        const plans = getPlans();
        const selects = [selectPlan, inlineSelectPlan];

        selects.forEach(select => {
            if (!select) return;
            const currentVal = select.value;
            select.innerHTML = '<option value="">-- プランを選択 --</option>';
            plans.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.name;
                opt.textContent = `${p.name} (${p.amount.toLocaleString()}円)`;
                opt.setAttribute('data-amount', p.amount);
                opt.setAttribute('data-description', p.description || '');
                select.appendChild(opt);
            });
            select.value = currentVal;
        });

        // モーダル内のリストも更新
        if (planListContainer) {
            planListContainer.innerHTML = '';
            plans.forEach(p => {
                const div = document.createElement('div');
                div.className = 'plan-list-item';
                div.style.flexDirection = 'column';
                div.style.alignItems = 'flex-start';
                div.innerHTML = `
                    <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                        <div>
                            <span style="font-weight: 700;">${p.name}</span>
                            <span style="font-size: 0.85rem; color: var(--text-secondary); margin-left: 8px;">${p.amount.toLocaleString()}円</span>
                        </div>
                        <button class="btn-icon btn-delete-plan" data-id="${p.id}" title="削除">🗑️</button>
                    </div>
                    <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.08); width: 100%; line-height: 1.4; white-space: pre-wrap; max-height: 80px; overflow-y: auto;">
                        <span style="opacity: 0.6;">内容:</span> ${p.description || '未設定'}
                    </div>
                `;
                planListContainer.appendChild(div);
            });

            // 削除ボタンイベント
            planListContainer.querySelectorAll('.btn-delete-plan').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    showConfirmModal({
                        title: '施術プランの削除',
                        message: 'このプランを削除してもよろしいですか？',
                        actionText: '削除する',
                        onConfirm: () => {
                            deletePlan(id);
                            showToast('プランを削除しました', 'success');
                            renderPlans();
                        }
                    });
                });
            });
        }
    }

    // 初回描画
    renderPlans();

    // 管理ボタンのイベント（「管理」というクラス名を持つ全てのボタンに紐付ける）
    document.querySelectorAll('.btn-manage-plans').forEach(btn => {
        btn.addEventListener('click', () => {
            if (planModal) planModal.classList.add('active');
        });
    });

    if (btnClosePlanModal) {
        btnClosePlanModal.addEventListener('click', () => {
            if (planModal) planModal.classList.remove('active');
        });
    }

    if (btnAddPlan) {
        btnAddPlan.addEventListener('click', () => {
            const name = newPlanNameInput.value.trim();
            const amount = parseInt(newPlanAmountInput.value, 10);
            const description = newPlanDescriptionInput ? newPlanDescriptionInput.value.trim() : '';
            
            if (!name || isNaN(amount)) {
                showToast('プラン名と金額を正しく入力してください', 'error');
                return;
            }
            addPlan(name, amount, description);
            newPlanNameInput.value = '';
            newPlanAmountInput.value = '';
            if (newPlanDescriptionInput) newPlanDescriptionInput.value = '';
            renderPlans();
        });
    }

    if (selectPlan) {
        selectPlan.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const amount = selectedOption.getAttribute('data-amount');
            const description = selectedOption.getAttribute('data-description');
            const type = e.target.value;
            
            if (type) {
                const inputType = document.getElementById('input-type');
                const inputAmount = document.getElementById('input-amount');
                if (inputType) inputType.value = type;
                if (inputAmount) inputAmount.value = amount || '';
                
                // 施術内容の説明を「内容」フィールド（あれば）またはノートに自動転記するか検討
                // ここでは主訴や施術内容の一部として表示を試みる
            }
        });
    }

    if (inlineSelectPlan) {
        inlineSelectPlan.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const amount = selectedOption.getAttribute('data-amount');
            const description = selectedOption.getAttribute('data-description');
            const type = e.target.value;
            
            if (type) {
                if (inlineRecordType) inlineRecordType.value = type;
                if (inlineRecordAmount) inlineRecordAmount.value = amount || '';
            }
        });
    }

    // ライブツアーの起動メイン処理
    const runLiveTour = async () => {
        if (isDemoRunning) return;
        isDemoRunning = true;
        document.body.classList.add('demo-active');

        if (demoGuideModal) demoGuideModal.classList.remove('active');
        if (liveCursor) liveCursor.classList.add('active');
        if (liveBanner) liveBanner.classList.add('active');

        try {
            // ステップ1: 画面上部の「顧客登録」ボタンをクリック
            await moveCursorTo('#btn-add-customer', '1. 新しい顧客を登録する');
            await clickCursor('#btn-add-customer');
            await sleep(500);

            // ステップ2: フォーム入力 (名前・フリガナ・電話番号・生年月日)
            const nameInput = document.getElementById('input-name');
            const kanaInput = document.getElementById('input-kana');
            const phoneInput = document.getElementById('input-phone');
            const birthdayInput = document.getElementById('input-birthday');
            
            if (nameInput) await typeInput(nameInput, '桜井 結衣 (ツアーデモ)', '2. お名前を入力');
            if (kanaInput) await typeInput(kanaInput, 'サクライ ユイ', 'フリガナを入力');
            if (phoneInput) await typeInput(phoneInput, '090-1234-5678', '電話番号を入力');
            if (birthdayInput) await typeInput(birthdayInput, '1992-07-20', '生年月日を入力');
            await sleep(400);

            // ステップ3: Soul Colorを選択 (5色)
            const colorChips = document.querySelectorAll('.color-chip');
            if (colorChips.length >= 5) {
                await moveCursorTo(colorChips[0], '2. Soul Color を5色選択');
                await clickCursor(colorChips[0]);
                await clickCursor(colorChips[1]);
                await clickCursor(colorChips[2]);
                await clickCursor(colorChips[3]);
                await clickCursor(colorChips[4]);
            }

            // ステップ4: 保存
            const saveBtn = document.getElementById('btn-submit-customer');
            if (saveBtn) {
                await moveCursorTo(saveBtn, '3. 顧客情報を保存');
                await clickCursor(saveBtn);
                await sleep(800);
            }

            // ステップ5: ナビのカレンダータブに移動
            const btnViewCalendar = document.getElementById('btn-view-calendar');
            if (btnViewCalendar) {
                await moveCursorTo(btnViewCalendar, '4. カレンダーで予約を作成');
                await clickCursor(btnViewCalendar);
                await sleep(800);
            }

            // ステップ6: 今日の日付セルをクリック
            const todayCell = document.querySelector('.calendar-day.today') || document.querySelector('.calendar-day:not(.empty)');
            if (todayCell) {
                await moveCursorTo(todayCell, '5. 日付を選択して記録を開始');
                await clickCursor(todayCell);
                await sleep(600);

                // ステップ7: インラインフォームで顧客を選択 (ドロップダウン)
                const inlineCustomerSelect = document.getElementById('inline-record-customer-id');
                if (inlineCustomerSelect) {
                    await selectDropdownOption(inlineCustomerSelect, '桜井 結衣 (ツアーデモ)', '6. 登録した顧客を一覧から選択');
                }

                // ステップ8: プランを選択 (ドロップダウン)
                const inlinePlanSelect = document.getElementById('inline-select-plan');
                if (inlinePlanSelect) {
                    await selectDropdownOption(inlinePlanSelect, 1, '7. 施術プランを選択');
                }

                // ステップ9: 詳細メモ欄（時間帯・訴え・処方・メモ）を展開して記入
                const detailsEl = document.querySelector('#calendar-inline-form-container details');
                const summaryEl = detailsEl ? detailsEl.querySelector('summary') : null;
                if (detailsEl) {
                    await moveCursorTo(summaryEl || detailsEl, '8. 詳細メモ（時間・訴え・処方等）を展開');
                    if (!detailsEl.open) {
                        detailsEl.open = true;
                    }
                    await sleep(600);

                    const inlineTime = document.getElementById('inline-record-time');
                    const inlineComplaint = document.getElementById('inline-record-complaint');
                    const inlinePrescription = document.getElementById('inline-record-prescription');
                    const inlineNote = document.getElementById('inline-record-note');

                    if (inlineTime) {
                        if (inlineTime.tagName && inlineTime.tagName.toLowerCase() === 'select') {
                            await selectDropdownOption(inlineTime, '14:00', '時間帯を選択 (14:00)');
                        } else {
                            await typeInput(inlineTime, '14:00');
                        }
                    }
                    if (inlineComplaint) {
                        await moveCursorTo(inlineComplaint, '9. 顧客の訴え・処方・メモを入力');
                        await typeInput(inlineComplaint, '首と肩の重だるさ、デスクワークの眼精疲労');
                    }
                    if (inlinePrescription) await typeInput(inlinePrescription, 'アロマオイルで肩甲骨と首筋を重点ケア');
                    if (inlineNote) await typeInput(inlineNote, '施術後は首の可動域が広がりスッキリされた様子');
                }

                // ステップ10: 保存
                const inlineSaveBtn = document.getElementById('btn-inline-submit-record');
                if (inlineSaveBtn) {
                    await moveCursorTo(inlineSaveBtn, '10. 施術記録を保存');
                    await clickCursor(inlineSaveBtn);
                    await sleep(1200);
                }
            }

            // ステップ11: 顧客一覧に戻って「確実に」確認
            const btnViewList = document.getElementById('btn-view-list');
            if (btnViewList) {
                await moveCursorTo(btnViewList, '11. 顧客一覧に戻って反映を確認');
                await clickCursor(btnViewList);
                await sleep(1000);

                // カードを見つける
                const cards = Array.from(document.querySelectorAll('.customer-card-grid-item'));
                const lastCard = cards.find(c => c.querySelector('h3')?.textContent.includes('桜井 結衣 (ツアーデモ)')) || cards[cards.length - 1];
                
                if (lastCard) {
                    await moveCursorTo(lastCard, '12. 保存された内容をチェック');
                    await clickCursor(lastCard);
                    await sleep(1200);

                    const tabs = document.querySelectorAll('.tab-btn');
                    if (tabs.length >= 4) {
                        await moveCursorTo(tabs[0], '13. 来店回数・平均ペースを確認');
                        await clickCursor(tabs[0]);
                        await sleep(1500);

                        await moveCursorTo(tabs[1], '14. 顧客専用の施術履歴カレンダーを表示');
                        await clickCursor(tabs[1]);
                        await sleep(1800);

                        await moveCursorTo(tabs[2], '15. 過去の施術名・訴え・処方一覧を確認');
                        await clickCursor(tabs[2]);
                        await sleep(1800);

                        await moveCursorTo(tabs[3], '16. 累計金額・客単価を確認');
                        await clickCursor(tabs[3]);
                        await sleep(2000);
                    }
                }
            }

            // 完了
            await moveCursorTo(liveBanner, '🎉 登録から予約、記録の確認まで完了しました！');
            await sleep(2500);

        } catch (err) {
            if (err.message !== 'DEMO_STOPPED') {
                console.error('Demo error:', err);
            }
        } finally {
            stopLiveTour();
        }
    };

    if (btnStartLiveTour) {
        btnStartLiveTour.addEventListener('click', runLiveTour);
    }

    if (btnDemoGuide && demoGuideModal) {
        btnDemoGuide.addEventListener('click', () => {
            demoGuideModal.classList.add('active');
        });
    }

    if (btnCloseDemoModal && demoGuideModal) {
        btnCloseDemoModal.addEventListener('click', () => {
            demoGuideModal.classList.remove('active');
        });
    }

    if (demoGuideModal) {
        demoGuideModal.addEventListener('click', (e) => {
            if (e.target === demoGuideModal) {
                demoGuideModal.classList.remove('active');
            }
        });
    }

    /**
     * スマホ向け：アイコン長押しでツールチップを表示する
     * 委譲（Delegation）を使用して動的要素にも対応
     */
    function initLongPressTooltips() {
        let longPressTimer = null;
        let activeTooltip = null;

        const cleanupTooltip = () => {
            if (activeTooltip) {
                activeTooltip.remove();
                activeTooltip = null;
            }
        };

        // タッチ開始（イベント委譲）
        document.body.addEventListener('touchstart', (e) => {
            const target = e.target.closest('[title]');
            if (!target) return;

            longPressTimer = setTimeout(() => {
                const title = target.getAttribute('title');
                if (!title) return;

                cleanupTooltip();

                const tooltip = document.createElement('div');
                tooltip.className = 'long-press-tooltip';
                tooltip.textContent = title;
                document.body.appendChild(tooltip);

                const rect = target.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                
                let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
                let top = rect.top - tooltipRect.height - 10;

                left = Math.max(10, Math.min(window.innerWidth - tooltipRect.width - 10, left));
                if (top < 10) top = rect.bottom + 10;

                tooltip.style.left = `${left}px`;
                tooltip.style.top = `${top}px`;
                activeTooltip = tooltip;

                setTimeout(cleanupTooltip, 2000); // 表示時間は少し長めの2秒
            }, 500);
        }, { passive: true });

        // 中断イベント（タイマー解除）
        const cancelTimer = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };

        document.body.addEventListener('touchend', cancelTimer);
        document.body.addEventListener('touchmove', cancelTimer);
        document.body.addEventListener('touchcancel', cancelTimer);
        document.body.addEventListener('click', cleanupTooltip);

        // ツールチップ以外を触ったら消す
        document.addEventListener('touchstart', (e) => {
            if (activeTooltip && !e.target.closest('.long-press-tooltip')) {
                cleanupTooltip();
            }
        }, { passive: true });
    }

    // 初回読み込み
    renderCustomerList();
    initLongPressTooltips();
} // initApp end

// -------------------------------------------------------------------
// エントリポイント：初回表示 + bfcache / 別ページ遷移からの復帰に対応
// -------------------------------------------------------------------

// 既にDOMが構築済みの場合（bfcache等）は即時実行
if (document.readyState === 'loading') {
    // まだパース中なら DOMContentLoaded を待つ
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // interactive / complete ならそのまま起動
    initApp();
}

// bfcache（前後ナビゲーション）で復帰した際にも再描画する
window.addEventListener('pageshow', (event) => {
    // persisted === true はbfcacheからの復帰を意味する
    if (event.persisted) {
        initApp();
    }
});
