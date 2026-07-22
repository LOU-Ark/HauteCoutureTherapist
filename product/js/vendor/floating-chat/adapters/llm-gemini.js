/**
 * @param {object} options
 * @param {string} options.model
 * @param {string} options.sdkUrl
 * @param {() => string[]} options.getApiKeys
 * @param {object} options.i18n
 */
export function createGeminiProvider({ model, sdkUrl, getApiKeys, i18n }) {
    return async function generateReply({ userText, contextItems }) {
        const keys = getApiKeys();
        if (keys.length === 0) {
            return { text: i18n.noApiKey };
        }

        let lastError = null;
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            try {
                const { GoogleGenAI } = await import(sdkUrl);
                const ai = new GoogleGenAI({ apiKey: key });

                let systemContext = '';
                (contextItems || []).forEach((c) => {
                    if (c.content) {
                        systemContext += `\n---\n# ${c.name}\n${c.content}\n`;
                    }
                });

                // セラピスト向け顧客管理(Therapist CRM)操作ガイドペルソナおよび回答ルールの設定
                const systemInstruction = 
                    `【ペルソナ・役割】\n` +
                    `あなたは「セラピストCRM 操作ガイド Agent」です。セラピスト向け顧客管理Webアプリの使い方や機能、具体的な操作手順を分かりやすく丁寧に案内するアシスタントです。\n\n` +
                    `【アプリの基本機能・仕様】\n` +
                    `1. 👥 新規顧客の登録: 画面上部の「＋ 顧客登録」ボタンを押し、名前（必須）、よみがな、電話番号、誕生日、Soul Color（最大5色選択）、紹介者、初診問診メモ、特記事項を入力して登録します。\n` +
                    `2. 🎨 Soul Color（ソウルカラー）: 13色のカラーチップから1〜5色選択できます。1色目がメインカラーとなり、カードの枠色・グラデーションおよびカレンダーのドット色に反映されます。\n` +
                    `3. 📅 カレンダー機能: 「📅 カレンダー」タブで月間表示に切り替わります。日付セルをクリックすると、下部にその日の施術記録一覧と「✍️ この日の記録を追加（インラインフォーム）」が表示され、施術メニュー・金額・時間・訴え・処方・メモを入力して保存できます。保存後は対象日にカラー付ドットが付きます。\n` +
                    `4. 📋 顧客カルテ詳細: 顧客カードをクリックすると右側に詳細カルテが開きます。「来店回数」「施術内容」「金額」「個人情報」の4タブで履歴を確認できます。\n\n` +
                    `【回答ルール】\n` +
                    `- 日本語で回答してください。\n` +
                    `- 回答は読みやすいMarkdown形式（箇条書きや太字を活用）で記述してください。\n` +
                    `- セラピストがすぐに操作できるよう、ステップバイステップで簡潔・具体的に説明してください。\n`;

                let prompt = userText;
                if (systemContext) {
                    prompt = `${systemInstruction}\n【参照用ナレッジ】\n${systemContext}\n---\n上記の情報を十分に踏まえ、開発者の質問に200字程度で回答してください。\n\n質問: ${userText}`;
                } else {
                    prompt = `${systemInstruction}\n上記の役割と制約に従って、開発者の質問に200字程度で回答してください。\n\n質問: ${userText}`;
                }

                const response = await ai.models.generateContent({
                    model,
                    contents: prompt,
                });

                return { text: response.text || i18n.emptyReply };
            } catch (e) {
                console.warn(`[Key Rotation] API key slot ${i + 1} failed, trying next key. Error:`, e);
                lastError = e;
                continue;
            }
        }

        console.error('[Key Rotation] All API key slots failed.');
        if (lastError?.message?.includes('403')) {
            return { text: i18n.invalidApiKey };
        }
        return { text: `AI通信エラー (全スロット失敗): ${lastError?.message || 'Unknown Error'}` };
    };
}
