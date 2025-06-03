# Corporate Information Collection System

企業情報を自動収集・構造化するGoogle Cloud Functions ベースのシステム

## 概要

このシステムは、営業代行業務における企業情報収集作業を自動化し、週次66-100時間の手作業を大幅に削減します。Tavily API で企業情報を検索し、OpenAI GPT-4o-mini で構造化したデータを Google Sheets に出力します。

### 主な機能

- **バッチ処理**: Google Sheets から企業名・電話番号を読み取り、一括処理
- **自動情報収集**: Tavily API を使用した包括的な企業情報検索
- **AI構造化**: GPT-4o-mini による非構造化データの構造化
- **品質管理**: データの完全性・一貫性チェックと信頼性スコアリング
- **重複検出**: 企業名・電話番号による重複チェック機能
- **並列処理**: 複数企業の同時処理によるパフォーマンス最適化
- **エラーハンドリング**: 取得失敗企業の識別・ログ出力

## システム構成

### 技術スタック

- **実行基盤**: Google Cloud Functions (サーバーレス)
- **言語**: Python 3.11
- **AI/ML**: 
  - OpenAI GPT-4o-mini (情報構造化)
  - LangChain (ワークフロー管理)
- **検索**: Tavily API
- **データI/O**: Google Sheets API
- **ストレージ**: Google Cloud Storage (ログ・一時ファイル)
- **認証**: Google Secret Manager

### アーキテクチャ

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Google Sheets  │────▶│ Cloud Functions │────▶│  Google Sheets  │
│  (入力データ)   │     │   (処理エンジン) │     │  (出力データ)   │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              ┌─────▼─────┐           ┌──────▼──────┐
              │ Tavily API │           │ OpenAI API  │
              │ (企業検索)  │           │ (構造化処理) │
              └───────────┘           └─────────────┘
```

### ワークフロー構成

**Phase 1: 企業特定フェーズ**
- Tavily APIによる企業検索（企業名 + 電話番号）
- GPT-4o-miniによる正しい企業の特定・検証
- 信頼性スコアの算出

**Phase 2: 情報抽出フェーズ**
- 企業詳細情報の検索・取得
- GPT-4o-miniによる非構造化データの構造化
- データ検証・補完処理

**Phase 3: 出力フェーズ**
- 重複チェック・名寄せ処理
- データ品質チェック
- Google Sheets APIへの結果出力

## 収集データ項目

### 基本企業情報
- **企業名** (正式名称)
- **業種** (日本標準産業分類：大分類・中分類)
- **従業員数** (数値または範囲)
- **設立年** (西暦4桁)
- **資本金** (金額と単位)
- **上場区分** (東証プライム/スタンダード/グロース/非上場、市場区分)

### 組織情報
- **本社所在地** (都道府県・市区町村)
- **代表者情報** (役職・氏名)
- **代表者年齢** (取得可能な場合)
- **支社・営業所の有無**

### 事業活動情報
- **経営理念・ビジョン**
- **事業方針**
- **最新ニュース・プレスリリース** (直近1年)
- **採用情報の有無・採用活動状況**
- **新商品・サービス展開状況**

### データ品質
- **信頼性スコア** (0.0-1.0)
- **処理日時**
- **エラー情報** (該当する場合)
- **情報ソースURL**

## セットアップ

### 前提条件

- Google Cloud Platform アカウント
- OpenAI API アカウント
- Tavily API アカウント
- Python 3.9 以上

### 1. 環境変数の設定

```bash
# .env ファイルを作成
GCP_PROJECT=your-project-id
BATCH_SIZE=10
PROCESSING_TIMEOUT=30
TAVILY_RATE_LIMIT=60
OPENAI_RATE_LIMIT=60
```

### 2. Secret Manager の設定

Google Cloud Console で以下のシークレットを作成：

- `openai-api-key`: OpenAI API キー
- `tavily-api-key`: Tavily API キー
- `google-sheets-credentials`: サービスアカウント認証情報 (必要な場合)

### 3. 依存関係のインストール

```bash
pip install -r requirements.txt
```

### 4. デプロイ

#### Google Cloud Functions へのデプロイ

```bash
chmod +x deploy.sh
./deploy.sh
```

#### サーバーへのデプロイ

詳細なサーバーデプロイメントオプションについては、[SERVER_DEPLOYMENT.md](./SERVER_DEPLOYMENT.md) を参照してください。

**利用可能なデプロイオプション:**
- Docker コンテナ
- Linux systemd サービス
- Kubernetes
- スタンドアロンサーバー

**簡単セットアップ:**
```bash
# セットアップスクリプトを実行
sudo bash scripts/setup_server.sh
```

## 使用方法

### Cloud Functions エンドポイント

#### メインエンドポイント: `/collect_company_info`

HTTP POST リクエストで企業情報収集を実行します。

**リクエストボディ**:
```json
{
    "spreadsheet_id": "Google Sheets ID",
    "input_range": "Sheet1!A2:A",
    "output_range": "Sheet1!B2:M"
}
```

**レスポンス**:
```json
{
    "message": "Company information collection completed",
    "companies_processed": 50,
    "rows_updated": 50,
    "success_rate": 0.92
}
```

#### ヘルスチェック: `/health_check`

システムの稼働状況を確認します。

**レスポンス**:
```json
{
    "status": "healthy",
    "service": "corporate-info-collector"
}
```

### Google Sheets の準備

#### 入力シート
企業名・電話番号リストを含むシートを準備：

| A列 | B列 | C列 | D列 |
|-----|-----|-----|-----|
| 企業名 | 電話番号 | 処理状況 | 備考 |
| 株式会社〇〇 | 03-1234-5678 | 未処理 | |
| △△株式会社 | 06-9876-5432 | 未処理 | |

#### 出力フィールド
システムは以下の順序でデータを出力：

1. 企業名（元データ）
2. 電話番号（元データ）
3. 正式企業名
4. 業種_大分類
5. 業種_中分類
6. 従業員数
7. 設立年
8. 資本金
9. 上場区分
10. 本社所在地
11. 代表者名
12. 代表者役職
13. 代表者年齢
14. 企業理念
15. 事業方針
16. 最新ニュース
17. 採用状況
18. 新商品・サービス
19. 支社・営業所
20. 信頼性スコア
21. 処理日時
22. 処理結果
23. エラー内容
24. 情報ソースURL

## 開発

### ローカルテスト

```bash
# Cloud Functions エミュレータを起動
functions-framework --target=collect_company_info --debug

# 別ターミナルでテストリクエスト送信
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheet_id": "your-sheet-id",
    "input_range": "Sheet1!A2:A10",
    "output_range": "Sheet1!B2:M10"
  }'
```

### プロジェクト構造

```
corporate-research/
├── main.py                 # Cloud Functions エントリーポイント
├── config.py              # 設定管理
├── modules/               # 機能モジュール
│   ├── workflow.py        # ワークフロー管理
│   ├── sheets_client.py   # Google Sheets 連携
│   ├── tavily_client.py   # Tavily API クライアント
│   ├── openai_client.py   # OpenAI API クライアント
│   └── data_processor.py  # データ処理・検証
├── tests/                 # テストコード
├── requirements.txt       # 依存関係
└── deploy.sh             # デプロイスクリプト
```

## パフォーマンス

- **処理速度**: 1社あたり平均30秒以内
- **バッチ処理**: 300社を2時間以内で処理
- **バッチサイズ**: デフォルト10社（最大50社まで設定可能）
- **並列処理**: 最大5ワーカー（API制限に基づく自動調整）
- **成功率**: 通常90%以上

## 制限事項

- Cloud Functions タイムアウト: 最大9分（540秒）
- Tavily API: レート制限あり（デフォルト60リクエスト/分）
- OpenAI API: レート制限あり（デフォルト60リクエスト/分）
- 処理対象: 日本国内企業を想定
- メモリ: 最大1GB
- 最大インスタンス数: 10

## トラブルシューティング

### よくある問題

1. **認証エラー**
   - Secret Manager の権限を確認
   - サービスアカウントの権限を確認
   - APIの有効化を確認

2. **API制限エラー**
   - レート制限設定を調整
   - バッチサイズを縮小
   - リトライロジックの実装確認

3. **タイムアウト**
   - PROCESSING_TIMEOUT を調整
   - バッチサイズを縮小
   - 処理の分割を検討

4. **メモリ不足**
   - メモリ割り当ての増加
   - データ処理の最適化
   - バッチサイズの調整

### ログ確認

```bash
# Cloud Functions のログ確認
gcloud functions logs read collect_company_info --limit=50

# エラーログのみ確認
gcloud functions logs read collect_company_info --limit=20 --filter="severity>=ERROR"
```

## 監視・運用

### Cloud Scheduler 設定

週次自動実行の設定：

```bash
gcloud scheduler jobs create http weekly-corporate-collection \
  --schedule="0 9 * * 1" \
  --uri="https://asia-northeast1-YOUR_PROJECT_ID.cloudfunctions.net/collect_company_info" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"batch_mode": true}' \
  --time-zone="Asia/Tokyo"
```

### アラート設定

Cloud Monitoring でエラー監視：
- エラー率が5分間で5回以上発生時にアラート
- 処理時間が設定値を超過時にアラート

## セキュリティ・コンプライアンス

- APIキーは Google Secret Manager で安全に管理
- サービスアカウントは最小権限の原則に従って設定
- 収集対象サイトの利用規約を遵守
- 適切なアクセス頻度の維持

## 今後の拡張計画

- 収集データ項目のカスタマイズ機能
- 他の企業データベースAPI との連携
- リアルタイム処理モードの追加
- 多言語対応（海外企業情報の収集）
- ダッシュボード機能の直接統合

## ライセンス

MIT License
