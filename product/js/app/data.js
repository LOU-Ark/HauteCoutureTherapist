// セラピスト向け顧客管理アプリ：データ管理モジュール (Core Logic)

// [ISSUE-018] Soul Color は最大5色まで登録できる（上段3色・下段2色で表示）
export const MAX_SOUL_COLORS = 5;

// 選択可能なソウルカラー（表示順）。UI側のチップ生成もこの定義を正本とする。
export const SOUL_COLOR_DEFS = [
    { key: 'red', label: 'レッド' },
    { key: 'coral', label: 'コーラル' },
    { key: 'orange', label: 'オレンジ' },
    { key: 'gold', label: 'ゴールド' },
    { key: 'yellow', label: 'イエロー' },
    { key: 'olive', label: 'オリーブ' },
    { key: 'green', label: 'グリーン' },
    { key: 'turquoise', label: 'ターコイズ' },
    { key: 'blue', label: 'ブルー' },
    { key: 'royal-blue', label: 'ロイヤルブルー' },
    { key: 'violet', label: 'バイオレット' },
    { key: 'magenta', label: 'マゼンタ' },
    { key: 'clear', label: 'クリア' },
];

/**
 * 顧客のソウルカラー配列を取得する（常に配列を返す）。
 * 旧スキーマ（単一 soulColor）のデータにも安全に対応する。
 */
export function getSoulColors(customer) {
    if (!customer) return [];
    if (Array.isArray(customer.soulColors)) return customer.soulColors;
    return customer.soulColor && customer.soulColor !== 'clear' ? [customer.soulColor] : [];
}

/**
 * [ISSUE-020] 施術記録の一意IDを発番する。
 * 記録の編集は配列インデックスではなくこのIDで対象を特定する。
 */
export function generateRecordId() {
    return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * メインカラー（1色目）を返す。
 * 顧客カードの枠色・背景グラデーションおよびカレンダーの日付ドットに使用する。
 */
export function getMainSoulColor(customer) {
    return getSoulColors(customer)[0] || 'clear';
}

// 初期デモデータ
const INITIAL_CUSTOMERS = [
    {
        id: "1",
        customerNo: "C-0001",
        name: "山田 花子",
        kana: "ヤマダ ハナコ",
        phone: "090-1234-5678",
        birthday: "1990-05-15",
        birthMonth: "05",
        soulColor: "violet",
        soulColors: ["violet", "turquoise", "magenta", "blue", "coral"],
        referrer: "佐藤 健太",
        initialConsultation: "体重 52kg。過去に大きな病歴はなし。アトピー肌のためオイルの刺激に注意が必要。",
        memo: "肩こりがひどい。強めの施術を希望。",
        isArchived: false,
        records: [
            {
                id: "r-demo-1",
                date: "2026-07-10",
                type: "アロママッサージ 60分",
                amount: 8000,
                time: "14:00 - 15:00",
                clientComplaint: "最近、仕事が忙しくて肩と首がバキバキに凝っている。頭痛も少しある。",
                prescription: "バイオレットの癒しエネルギーを取り入れたアロママッサージ。首と肩のリンパを重点的に流す。",
                therapistNote: "施術中、首の付け根あたりがかなり硬く、念入りにほぐした。施術後はスッキリした表情をされていた。"
            }
        ]
    },
    {
        id: "2",
        customerNo: "C-0002",
        name: "佐藤 健太",
        kana: "サトウ ケンタ",
        phone: "080-9876-5432",
        birthday: "1985-11-20",
        birthMonth: "11",
        soulColor: "gold",
        soulColors: ["gold", "olive", "orange", "royal-blue", "yellow"],
        referrer: "Web検索",
        initialConsultation: "デスクワークによる腰痛と背中の張りが主訴。",
        memo: "姿勢改善アドバイスに関心あり。",
        isArchived: false,
        records: [
            {
                id: "r-demo-2",
                date: "2026-07-15",
                type: "整体・骨盤矯正 60分",
                amount: 9000,
                time: "11:00 - 12:00",
                clientComplaint: "長時間のPC作業で腰が痛む。",
                prescription: "骨盤調整と腰背部のほぐし。",
                therapistNote: "骨盤の右上がりが顕著。日常のストレッチを指導。"
            }
        ]
    }
];

export function saveCustomers(customers) {
    try {
        localStorage.setItem('therapist_customers', JSON.stringify(customers));
    } catch (e) {
        console.warn('LocalStorage write blocked.', e);
    }
}

export function getCustomers() {
    let data = null;
    try {
        data = localStorage.getItem('therapist_customers');
    } catch (e) {
        console.warn('LocalStorage read blocked.', e);
    }
    if (!data) {
        saveCustomers(INITIAL_CUSTOMERS);
        return INITIAL_CUSTOMERS;
    }
    try {
        const customers = JSON.parse(data);
        let updated = false;
        if (!Array.isArray(customers) || customers.length === 0) {
            saveCustomers(INITIAL_CUSTOMERS);
            return INITIAL_CUSTOMERS;
        }
        customers.forEach(c => {
            if (c.isArchived === undefined) {
                c.isArchived = false;
                updated = true;
            }
            if (c.records) {
                c.records.forEach(r => {
                    if (!r.id) {
                        r.id = generateRecordId();
                        updated = true;
                    }
                });
            }
        });
        if (updated) {
            saveCustomers(customers);
        }
        return customers;
    } catch (e) {
        return INITIAL_CUSTOMERS;
    }
}

export function addCustomer(name, kana = '', phone = '', memo = '', customerNo = '', birthday = '', soulColors = [], referrer = '', initialConsultation = '', birthMonth = '') {
    const customers = getCustomers();
    const newCustomer = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        customerNo: customerNo || `C-${(customers.length + 1).toString().padStart(4, '0')}`,
        name,
        kana,
        phone,
        birthday,
        birthMonth: birthMonth || (birthday ? birthday.split('-')[1] : ''),
        soulColor: soulColors[0] || 'clear',
        soulColors: Array.isArray(soulColors) ? soulColors : [],
        referrer,
        initialConsultation,
        memo,
        isArchived: false,
        records: []
    };
    customers.unshift(newCustomer);
    saveCustomers(customers);
    return newCustomer;
}

export function updateCustomer(id, updatedFields) {
    const customers = getCustomers();
    const index = customers.findIndex(c => c.id === id);
    if (index !== -1) {
        customers[index] = { ...customers[index], ...updatedFields };
        saveCustomers(customers);
        return customers[index];
    }
    return null;
}

export function archiveCustomer(id) {
    return updateCustomer(id, { isArchived: true });
}

export function unarchiveCustomer(id) {
    return updateCustomer(id, { isArchived: false });
}

export function deleteCustomer(id) {
    const customers = getCustomers();
    const filtered = customers.filter(c => String(c.id) !== String(id));
    saveCustomers(filtered);
    return true;
}

export function addRecord(customerId, date, type, amount, time = '', clientComplaint = '', prescription = '', therapistNote = '') {
    const customers = getCustomers();
    const customer = customers.find(c => String(c.id) === String(customerId));
    if (!customer) return null;
    if (!customer.records) customer.records = [];
    const newRecord = {
        id: generateRecordId(),
        date,
        type,
        amount: parseInt(amount, 10) || 0,
        time,
        clientComplaint,
        prescription,
        therapistNote
    };
    customer.records.unshift(newRecord);
    saveCustomers(customers);
    return newRecord;
}

export function updateRecord(customerId, recordId, updatedFields) {
    const customers = getCustomers();
    const customer = customers.find(c => String(c.id) === String(customerId));
    if (!customer || !customer.records) return null;
    const recordIndex = customer.records.findIndex(r => String(r.id) === String(recordId));
    if (recordIndex !== -1) {
        customer.records[recordIndex] = {
            ...customer.records[recordIndex],
            ...updatedFields
        };
        saveCustomers(customers);
        return customer.records[recordIndex];
    }
    return null;
}

export function deleteRecord(customerId, recordId) {
    const customers = getCustomers();
    const customer = customers.find(c => String(c.id) === String(customerId));
    if (!customer || !customer.records) return false;
    const initialLen = customer.records.length;
    customer.records = customer.records.filter(r => String(r.id) !== String(recordId));
    if (customer.records.length !== initialLen) {
        saveCustomers(customers);
        return true;
    }
    return false;
}

// プラン管理
const INITIAL_PLANS = [
    { id: 'p1', name: 'プランA', amount: 1000, description: '基本コース（30分）' },
    { id: 'p2', name: 'プランB', amount: 2000, description: '標準コース（60分）' },
    { id: 'p3', name: 'プランC', amount: 5000, description: '充実コース（90分）' },
    { id: 'p4', name: 'プランD', amount: 10000, description: 'プレミアムコース（120分）' },
];

export function getPlans() {
    let data = null;
    try {
        data = localStorage.getItem('therapist_plans');
    } catch (e) {
        console.warn('LocalStorage read blocked.', e);
    }

    if (!data) {
        return INITIAL_PLANS;
    }
    try {
        const plans = JSON.parse(data);
        return Array.isArray(plans) && plans.length > 0 ? plans : INITIAL_PLANS;
    } catch (e) {
        return INITIAL_PLANS;
    }
}

export function savePlans(plans) {
    try {
        localStorage.setItem('therapist_plans', JSON.stringify(plans));
    } catch (e) {
        console.warn('LocalStorage write blocked.', e);
    }
}

export function addPlan(name, amount, description = '') {
    const plans = getPlans();
    const newPlan = {
        id: `p-${Date.now().toString(36)}`,
        name,
        amount: parseInt(amount, 10) || 0,
        description
    };
    plans.push(newPlan);
    savePlans(plans);
    return newPlan;
}

export function updatePlan(id, name, amount, description) {
    const plans = getPlans();
    const index = plans.findIndex(p => p.id === id);
    if (index !== -1) {
        plans[index] = { 
            ...plans[index], 
            name, 
            amount: parseInt(amount, 10) || 0,
            description: description !== undefined ? description : plans[index].description
        };
        savePlans(plans);
        return plans[index];
    }
    return null;
}

export function deletePlan(id) {
    const plans = getPlans();
    const filtered = plans.filter(p => p.id !== id);
    savePlans(filtered);
    return filtered;
}
