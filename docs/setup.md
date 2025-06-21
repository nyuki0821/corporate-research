# セットアップガイド - Google Apps Script with clasp

## 必要な環境

- Node.js (v14以上)
- npm
- Google アカウント

## 1. 初期セットアップ

### 1.1 Node.js依存関係のインストール

```bash
npm install
```

### 1.2 Google Apps Script CLIツール（clasp）の設定

```bash
# Google アカウントでログイン
npm run login

# または直接
npx clasp login
```

## 2. プロジェクト作成

### 2.1 新しいGoogle Apps Scriptプロジェクトを作成

```bash
# 自動でプロジェクト作成
npm run create

# または手動で
npx clasp create --type standalone --title "企業情報収集システム"
```

### 2.2 .clasp.jsonファイルの設定

プロジェクト作成後、`.clasp.json`ファイルが自動生成されます。

### 2.3 コードのプッシュ

```bash
# すべてのファイルをGoogle Apps Scriptにプッシュ
npm run push

# またはファイル変更を監視してリアルタイムプッシュ
npm run watch
```

## 3. システム初期化

### 3.1 Google Apps Scriptエディタを開く

```bash
npm run open
```

### 3.2 スクリプトプロパティの設定

Google Apps Scriptエディタで：

1. 「プロジェクトの設定」をクリック
2. 「スクリプト プロパティ」セクションで以下を追加：

#### 必須設定

| プロパティ | 値 | 説明 |
|------------|-----|------|
| `TAVILY_API_KEY` | あなたのAPIキー | Tavily AI APIキー |
| `OPENAI_API_KEY` | あなたのAPIキー | OpenAI APIキー |

#### スプレッドシート設定

| プロパティ | 値 | 説明 |
|------------|-----|------|
| `SPREADSHEET_ID` | スプレッドシートID | 連携するスプレッドシートのID（空の場合は自動作成） |
| `AUTO_CREATE_SPREADSHEET` | true | スプレッドシートが存在しない場合の自動作成 |
| `SPREADSHEET_NAME` | 企業情報収集システム | 新規作成時のスプレッドシート名 |

#### 通知設定

| プロパティ | 値 | 説明 |
|------------|-----|------|
| `NOTIFICATION_EMAIL` | メールアドレス | 通知先メール |
| `ENABLE_NOTIFICATIONS` | true | 通知有効化 |

#### バッチ処理設定

| プロパティ | 値 | 説明 |
|------------|-----|------|
| `BATCH_SIZE` | 20 | バッチサイズ |
| `MAX_RETRY_COUNT` | 3 | 最大リトライ回数 |
| `RETRY_DELAY_MS` | 1000 | リトライ間隔（ミリ秒） |

### 3.3 システム初期化の実行

```bash
# システム初期化
npm run init:system
```

または、Google Apps Scriptエディタで `initializeSystem` 関数を実行

## 4. スプレッドシート設定

### 4.1 自動作成を使用する場合

1. `SPREADSHEET_ID` を空のままにする
2. `AUTO_CREATE_SPREADSHEET` を `true` に設定
3. システム初期化を実行すると自動でスプレッドシートが作成される

### 4.2 既存スプレッドシートを使用する場合

1. 使用したいスプレッドシートのIDを取得
   - スプレッドシートのURLから：`https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
2. `SPREADSHEET_ID` にIDを設定
3. システム初期化を実行

### 4.3 メニューから設定する場合

1. スプレッドシートを開く
2. 「企業情報収集」→「設定」→「スプレッドシート設定」
3. 現在の設定を確認し、必要に応じて変更

## 5. 使用方法

### 5.1 基本的な使用方法

1. **スプレッドシートに企業名を入力**
   - 生成されたスプレッドシートの「企業リスト」シートを開く
   - 「企業名」列に処理したい企業名を入力

2. **バッチ処理の実行**
   ```bash
   # コマンドラインから実行
   npm run start:batch
   ```
   
   または、Google Apps Scriptエディタのメニュー「企業情報収集」→「バッチ処理開始」

### 5.2 メニュー機能

システムでは以下のメニューが利用可能です：

- **バッチ処理開始**: 未処理企業の一括処理
- **単一企業処理**: 選択した企業の個別処理
- **設定**:
  - APIキー設定: APIキーの設定
  - 通知メール設定: 通知先メールの設定
  - スプレッドシート設定: スプレッドシートの管理
- **システム診断**: システム状態の確認
- **ログ表示**: 最新ログの表示
- **キャッシュクリア**: システムキャッシュのクリア

### 5.3 テスト実行

```bash
# ユニットテスト実行
npm run test:unit

# 統合テスト実行
npm run test:integration

# 全テスト実行
npm run test:all
```

### 5.4 システム診断

```bash
# システム状態診断
npm run diagnose
```

## 6. 開発ワークフロー

### 6.1 ローカル開発

```bash
# ファイル変更の監視（リアルタイムプッシュ）
npm run watch
```

### 6.2 ログ確認

```bash
# 実行ログの確認
npm run logs
```

### 6.3 最新版の取得

```bash
# Google Apps Scriptから最新版を取得
npm run pull
```

## 7. デプロイメント

### 7.1 新しいバージョンのデプロイ

```bash
# 新しいバージョンとしてデプロイ
npm run deploy
```

### 7.2 本番環境設定

1. **トリガーの設定**
   - Google Apps Scriptエディタで「トリガー」を設定
   - 定期実行やスプレッドシート変更時の自動実行を設定

2. **権限の確認**
   - 必要な権限がすべて許可されていることを確認
   - スプレッドシート、Gmail、外部URL接続の権限

## 8. トラブルシューティング

### 8.1 よくある問題

**問題**: `clasp login` でエラーが発生
**解決**: 
```bash
# Google Apps Script APIを有効化
# https://script.google.com/home/usersettings でAPIを有効にする
```

**問題**: プッシュ時にnode_modulesエラー
**解決**:
```bash
# .claspignoreファイルを確認
# rootDirがsrcフォルダに設定されているか確認
```

**問題**: スプレッドシートが見つからない
**解決**:
```bash
# スプレッドシートID設定を確認
# メニューから「スプレッドシート設定」で再設定
```

**問題**: 権限エラー
**解決**:
```bash
# Google Apps Scriptエディタで権限を再承認
npm run open
# 初回実行時に権限を許可
```

### 8.2 デバッグ方法

```bash
# 詳細ログの確認
npm run logs -- --json

# システム診断
npm run diagnose
```

## 9. ファイル構造

```
corporate_research/
├── README.md              # メインドキュメント
├── setup.md              # このファイル
├── package.json           # プロジェクト設定
├── .clasp.json           # clasp設定（自動生成）
├── .claspignore          # プッシュ除外ファイル設定
├── docs/                 # ドキュメント
│   ├── REQUIREMENTS.md   # 要件定義書
│   └── ARCHITECTURE.md   # アーキテクチャ設計書
└── src/                  # ソースコード（Google Apps Scriptにプッシュされる）
    ├── appsscript.json   # Google Apps Script設定
    ├── main.gs           # メインエントリーポイント
    ├── api/              # API クライアント
    │   ├── apiBase.gs    # API基底クラス
    │   ├── openaiClient.gs    # OpenAI API
    │   └── tavilyClient.gs    # Tavily API
    ├── config/           # 設定管理
    │   ├── constants.gs  # 定数定義
    │   └── settings.gs   # 設定管理
    ├── models/           # データモデル
    │   └── company.gs    # 企業・支店モデル
    ├── services/         # サービス層
    │   ├── batchProcessor.gs          # バッチ処理
    │   ├── companyResearchService.gs  # 企業調査
    │   ├── notificationService.gs     # メール通知
    │   └── spreadsheetService.gs      # スプレッドシート操作
    └── utils/            # ユーティリティ
        ├── branchClassifier.gs        # 支店分類
        ├── companyNameNormalizer.gs   # 企業名正規化
        ├── errorHandler.gs            # エラー処理
        ├── logger.gs                  # ログ管理
        └── reliabilityScorer.gs       # 信頼性スコア
```

## 10. 便利なコマンド

```bash
# プロジェクト情報の確認
npx clasp list

# 現在のバージョン確認
npx clasp versions

# 特定のバージョンをプル
npx clasp pull --versionNumber 1

# ファイルの状態確認
npx clasp status
```

これで clasp を使った開発環境が整います！