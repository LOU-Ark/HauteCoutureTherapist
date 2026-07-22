const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ログ保存処理関数
const handleSaveLog = (req, res) => {
    const { url, chatLog, messages } = req.body;
    const logData = chatLog || messages;
    if (!url || !logData) {
        return res.status(400).json({ error: 'Missing url or chatLog/messages' });
    }

    try {
        let relativePath = 'unknown';
        try {
            const parsedUrl = new URL(url, `http://localhost:${PORT}`);
            const pathname = parsedUrl.pathname;
            
            if (pathname.includes('01_Requirements')) {
                relativePath = '01_Requirements';
            } else if (pathname.includes('02_Planning')) {
                relativePath = '02_Planning';
            } else if (pathname.includes('03_Implementation')) {
                relativePath = '03_Implementation';
            } else if (pathname.includes('99_Portal')) {
                relativePath = '99_Portal';
            } else {
                const segments = pathname.split('/').filter(Boolean);
                if (segments.length > 0) {
                    relativePath = segments[segments.length - 2] || segments[0];
                }
            }
        } catch (e) {
            console.error('URLのパースに失敗しました:', e);
        }

        const logDir = path.join(__dirname, '../management/03_Implementation/chat_logs', relativePath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const logPath = path.join(logDir, 'chat_history.json');
        fs.writeFileSync(logPath, JSON.stringify(logData, null, 2), 'utf8');
        console.log(`ログを保存しました: ${logPath}`);
        return res.json({ status: 'ok', path: logPath });
    } catch (err) {
        console.error('ログの保存中にエラーが発生しました:', err);
        return res.status(500).json({ error: 'Failed to save log' });
    }
};

// ログ保存用エンドポイント
app.post('/api/save_log', handleSaveLog);
app.post('/save_history', handleSaveLog);
app.post('/api/save_history', handleSaveLog);

// Ollama または AI プロキシ用の簡易ダミーまたはプロキシエンドポイント
app.post('/api/chat', async (req, res) => {
    res.json({ message: "Bridge connection successful" });
});

// 静的ファイルの配信 (プロジェクトルート配下)
const rootDir = path.join(__dirname, '..');
app.use(express.static(rootDir, { index: 'index.html' }));

// フォールバック処理: 静的ファイルに当てはまらない全てのキャッチオールリクエスト
app.use((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        return res.status(405).send('Method Not Allowed');
    }

    // 安全にパスを解決
    const reqPath = path.normalize(req.path).replace(/^(\.\.[\/\\])+/, '');
    const requestedPath = path.join(rootDir, reqPath);

    // ディレクトリトラバーサル防止
    if (!requestedPath.startsWith(rootDir)) {
        return res.status(403).send('Forbidden');
    }

    if (fs.existsSync(requestedPath)) {
        const stat = fs.statSync(requestedPath);
        if (stat.isFile()) {
            return res.sendFile(requestedPath);
        } else if (stat.isDirectory()) {
            const indexPath = path.join(requestedPath, 'index.html');
            if (fs.existsSync(indexPath)) {
                return res.sendFile(indexPath);
            }
        }
    }

    // デフォルトのゲートウェイ
    const defaultIndex = path.join(rootDir, 'index.html');
    if (fs.existsSync(defaultIndex)) {
        res.sendFile(defaultIndex);
    } else {
        res.status(404).send('Not Found');
    }
});

// 起動とエラーハンドリング (0.0.0.0:3000)
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bridge server running on http://0.0.0.0:${PORT}`);
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`[CRITICAL] ポート ${PORT} は既に使用されています。プロセスを終了します。`);
        process.exit(1);
    } else {
        console.error('サーバー起動時にエラーが発生しました:', error);
        process.exit(1);
    }
});
