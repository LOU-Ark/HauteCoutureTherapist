/**
 * @param {object} options
 * @param {string} options.pageId
 * @param {string} options.chatStatePrefix
 * @param {{ enabled: boolean, url: string }} options.bridge
 */
export function createSessionBridgePersistence({ pageId, chatStatePrefix, bridge }) {
    const stateKey = chatStatePrefix + encodeURIComponent(pageId);

    return {
        load() {
            try {
                const saved = localStorage.getItem(stateKey);
                if (saved) {
                    return JSON.parse(saved);
                }
            } catch (e) {
                /* ignore */
            }
            return null;
        },

        save(partial) {
            try {
                const current = this.load() || {};
                const next = {
                    context: partial.context ?? current.context ?? [],
                    messages: partial.messages ?? current.messages ?? [],
                };
                localStorage.setItem(stateKey, JSON.stringify(next));

                if (bridge.enabled && partial.messages) {
                    fetch(bridge.url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: pageId, messages: partial.messages }),
                    }).catch((err) => {
                        console.error('Bridge sync failed', err);
                        console.warn('⚠️ [Aurora Bridge] ログサーバーに接続できません。バックグラウンドの node サーバーが起動しているか確認してください。');
                    });
                }
            } catch (e) {
                console.error('Persistence save failed', e);
            }
        },
    };
}
