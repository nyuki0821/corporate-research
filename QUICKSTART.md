# 🚀 企業情報収集システム クイックスタートガイド

## 📋 必要な準備

### 1. APIキーの取得
- **OpenAI API Key**: [OpenAI Platform](https://platform.openai.com/api-keys) から取得
- **Tavily API Key**: [Tavily](https://tavily.com/) から取得

### 2. 環境変数の設定

#### Windows (コマンドプロンプト)
```cmd
set OPENAI_API_KEY=your-openai-api-key
set TAVILY_API_KEY=your-tavily-api-key
```

#### Mac/Linux (ターミナル)
```bash
export OPENAI_API_KEY='your-openai-api-key'
export TAVILY_API_KEY='your-tavily-api-key'
```

#### .envファイルを使用する場合
プロジェクトルートに `.env` ファイルを作成:
```
OPENAI_API_KEY=your-openai-api-key
TAVILY_API_KEY=your-tavily-api-key
```

### 3. Google Sheetsの準備

1. 新しいGoogle Sheetsを作成
2. 以下の形式でデータを準備:
   - **A列**: 企業名
   - **B列**: 電話番号

例:
| A列 | B列 |
|-----|-----|
| 株式会社〇〇 | 03-1234-5678 |
| △△株式会社 | 06-9876-5432 |

3. URLからSpreadsheet IDを取得
   - URL例: `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`
   - ID: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

## 🎯 使用方法

### 方法1: 簡単起動（推奨）

```bash
python run.py
```

メニューから選択:
- `1` → コマンドライン インターフェース
- `2` → Web インターフェース

### 方法2: CLI直接起動

#### 対話式モード（推奨）
```bash
python cli.py --interactive
```

#### コマンドライン引数で実行
```bash
python cli.py --spreadsheet-id YOUR_SHEET_ID --input-range "Sheet1!A2:B" --output-range "Sheet1!C2:Z"
```

### 方法3: Web UI直接起動

```bash
python web_ui.py
```

ブラウザで http://localhost:5000 にアクセス

## 📊 出力データ

収集される情報:
- 正式企業名
- 業種（大分類・中分類）
- 従業員数
- 設立年
- 資本金
- 上場区分
- 本社所在地
- 代表者情報
- 経営理念・ビジョン
- 最新ニュース
- 採用情報
- 信頼性スコア

## ❓ トラブルシューティング

### APIキーエラーが出る場合
環境変数が正しく設定されているか確認:
```bash
echo $OPENAI_API_KEY
echo $TAVILY_API_KEY
```

### Google Sheetsにアクセスできない場合
- Spreadsheet IDが正しいか確認
- シートが公開されているか、適切な権限があるか確認

### 処理が遅い場合
- バッチサイズを調整（環境変数 `BATCH_SIZE` を小さく設定）
- ネットワーク接続を確認

## 📞 サポート

問題が解決しない場合は、エラーメッセージと共に開発者にお問い合わせください。