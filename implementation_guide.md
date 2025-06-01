# 企業情報自動収集システム実装手順書

## 目次
1. [前提準備](#1-前提準備)
2. [Google Cloud Platform設定](#2-google-cloud-platform設定)
3. [外部APIサービス設定](#3-外部apiサービス設定)
4. [開発環境構築](#4-開発環境構築)
5. [Google Sheets設定](#5-google-sheets設定)
6. [Cloud Functions実装準備](#6-cloud-functions実装準備)
7. [実装・テスト手順](#7-実装テスト手順)
8. [デプロイ・運用設定](#8-デプロイ運用設定)
9. [トラブルシューティング](#9-トラブルシューティング)

---

## 1. 前提準備

### 1.1 必要なアカウント
- **Googleアカウント** (Google Cloud Platform、Google Sheetsで使用)
- **OpenAI アカウント** (GPT-4o-mini API使用)
- **Tavily アカウント** (Tavily API使用)

### 1.2 必要なツール
- **ブラウザ** (Chrome推奨)
- **テキストエディタ** (VS Code推奨)
- **Python 3.9以上** (ローカル開発・テスト用)

### 1.3 事前知識
- 基本的なPythonプログラミング
- JSON形式の理解
- Google Sheetsの基本操作

---

## 2. Google Cloud Platform設定

### 2.1 GCPアカウント設定

#### Step 1: GCPプロジェクト作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 右上の「プロジェクトを選択」をクリック
3. 「新しいプロジェクト」をクリック
4. プロジェクト名を入力 (例: `corporate-info-collector`)
5. 「作成」をクリック

#### Step 2: 請求先アカウント設定
1. 左メニューから「お支払い」を選択
2. 「請求先アカウントをリンク」をクリック
3. クレジットカード情報を登録
   - **注意**: 無料利用枠があるため、小規模利用では課金されません

#### Step 3: 必要なAPIを有効化
1. 左メニューから「APIとサービス」→「ライブラリ」を選択
2. 以下のAPIを検索して有効化:
   - **Cloud Functions API**
   - **Cloud Build API**
   - **Google Sheets API**
   - **Cloud Storage API**
   - **Cloud Logging API**
   - **Secret Manager API**

各APIで以下の手順を実行:
- APIを検索
- 該当APIをクリック
- 「有効にする」をクリック

### 2.2 認証設定

#### Step 1: サービスアカウント作成
1. 左メニューから「IAMと管理」→「サービスアカウント」を選択
2. 「サービスアカウントを作成」をクリック
3. サービスアカウント名を入力 (例: `corporate-collector-sa`)
4. 「作成して続行」をクリック
5. 以下のロールを追加:
   - `Cloud Functions Developer`
   - `Storage Admin`
   - `Logs Writer`
   - `Secret Manager Secret Accessor`
6. 「完了」をクリック

#### Step 2: サービスアカウントキー作成
1. 作成したサービスアカウントをクリック
2. 「キー」タブを選択
3. 「キーを追加」→「新しいキーを作成」をクリック
4. JSONを選択して「作成」をクリック
5. ダウンロードされたJSONファイルを安全な場所に保存
   - **重要**: このファイルは外部に漏らさないでください

### 2.3 Cloud Storage設定

#### Step 1: バケット作成
1. 左メニューから「Cloud Storage」→「バケット」を選択
2. 「バケットを作成」をクリック
3. バケット名を入力 (例: `corporate-collector-logs-{プロジェクトID}`)
4. ロケーション: `asia-northeast1` (東京)を選択
5. ストレージクラス: `Standard`を選択
6. 「作成」をクリック

---

## 3. 外部APIサービス設定

### 3.1 OpenAI API設定

#### Step 1: OpenAIアカウント作成・ログイン
1. [OpenAI Platform](https://platform.openai.com/) にアクセス
2. アカウント作成またはログイン

#### Step 2: APIキー取得
1. 右上のプロフィールアイコンをクリック
2. 「API keys」を選択
3. 「Create new secret key」をクリック
4. キー名を入力 (例: `corporate-collector`)
5. 生成されたAPIキーをコピーして安全に保存
   - **重要**: このキーは一度しか表示されません

#### Step 3: 使用量制限設定
1. 左メニューから「Settings」→「Limits」を選択
2. 月間使用量制限を設定 (例: $50)
3. 「Save」をクリック

### 3.2 Tavily API設定

#### Step 1: Tavilyアカウント作成
1. [Tavily](https://www.tavily.com/) にアクセス
2. 「Sign Up」でアカウント作成
3. メール認証を完了

#### Step 2: APIキー取得
1. ダッシュボードにログイン
2. 「API Keys」セクションを確認
3. デフォルトで生成されているAPIキーをコピー
4. 必要に応じて新しいキーを生成

#### Step 3: 利用プラン確認
1. 「Billing」または「Usage」を確認
2. 無料プランの制限を把握
3. 必要に応じて有料プランにアップグレード

---

## 4. 開発環境構築

### 4.1 Google Cloud SDK インストール

#### Windows の場合:
1. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) からインストーラーをダウンロード
2. インストーラーを実行
3. コマンドプロンプトまたはPowerShellで認証:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

#### Mac の場合:
```bash
# Homebrewを使用
brew install --cask google-cloud-sdk

# 認証
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

#### Linux の場合:
```bash
# パッケージソースを追加
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

# インストール
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
sudo apt-get update && sudo apt-get install google-cloud-sdk

# 認証
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 4.2 ローカル開発環境構築

#### Step 1: プロジェクトディレクトリ作成
```bash
mkdir corporate-info-collector
cd corporate-info-collector
```

#### Step 2: Python仮想環境作成
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

#### Step 3: 必要パッケージのインストール
```bash
pip install --upgrade pip
pip install functions-framework
pip install google-cloud-functions
pip install google-auth
pip install google-auth-oauthlib
pip install google-auth-httplib2
pip install google-api-python-client
pip install openai
pip install langchain
pip install langchain-openai
pip install requests
pip install beautifulsoup4
pip install pandas
```

---

## 5. Google Sheets設定

### 5.1 入力用スプレッドシート作成

#### Step 1: スプレッドシート作成
1. [Google Sheets](https://sheets.google.com/) にアクセス
2. 「空白のスプレッドシート」を作成
3. 「企業情報収集_入力」という名前をつける

#### Step 2: 入力シート設定
**シート名**: `input_data`

**列構成**:
| A列 | B列 | C列 | D列 |
|-----|-----|-----|-----|
| 企業名 | 電話番号 | 処理状況 | 備考 |

**サンプルデータ**:
```
企業名          | 電話番号        | 処理状況 | 備考
株式会社〇〇    | 03-1234-5678   | 未処理   |
△△株式会社    | 06-9876-5432   | 未処理   |
```

### 5.2 出力用スプレッドシート作成

#### Step 1: 出力スプレッドシート作成
1. 新しいスプレッドシートを作成
2. 「企業情報収集_結果」という名前をつける

#### Step 2: 結果シート設定
**シート名**: `output_data`

**列構成**:
| 列 | 項目名 | データ型 |
|----|--------|----------|
| A | 企業名 | テキスト |
| B | 電話番号 | テキスト |
| C | 正式企業名 | テキスト |
| D | 業種_大分類 | テキスト |
| E | 業種_中分類 | テキスト |
| F | 従業員数 | 数値 |
| G | 設立年 | 数値 |
| H | 資本金 | 数値 |
| I | 上場区分 | テキスト |
| J | 本社所在地 | テキスト |
| K | 代表者名 | テキスト |
| L | 代表者役職 | テキスト |
| M | 企業理念 | テキスト |
| N | 最新ニュース | テキスト |
| O | 採用状況 | テキスト |
| P | 信頼性スコア | 数値 |
| Q | 処理日時 | 日時 |
| R | 処理結果 | テキスト |
| S | エラー内容 | テキスト |
| T | 情報ソースURL | テキスト |

### 5.3 Sheets API設定

#### Step 1: Google Sheets API用認証設定
1. Google Cloud Consoleで「APIとサービス」→「認証情報」を選択
2. 作成済みサービスアカウントの詳細を開く
3. 先ほどダウンロードしたJSONファイルのパスを確認

#### Step 2: スプレッドシート権限設定
1. 作成したスプレッドシートを開く
2. 右上の「共有」をクリック
3. サービスアカウントのメールアドレスを入力
4. 権限を「編集者」に設定
5. 「送信」をクリック

**サービスアカウントメールアドレス**:
- JSONファイル内の `client_email` フィールドの値
- 形式: `サービスアカウント名@プロジェクトID.iam.gserviceaccount.com`

#### Step 3: スプレッドシートID取得
スプレッドシートのURLから以下の部分をコピー:
```
https://docs.google.com/spreadsheets/d/[このIDをコピー]/edit#gid=0
```

---

## 6. Cloud Functions実装準備

### 6.1 Secret Manager設定（機密情報を安全に管理）

**Secret Managerとは？**
APIキーやパスワードなどの機密情報を安全に保存・管理するGoogleのサービスです。コードに直接書かずに済むため、セキュリティが向上します。

#### Step 1: Secret Manager基本操作（Cloud Consoleでの操作）

**方法1: Cloud Console（GUI）での操作（推奨）**
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 左メニューから「Security」→「Secret Manager」を選択
3. 初回の場合「Secret Manager APIを有効にする」をクリック

**OpenAI APIキーの保存**:
1. 「シークレットを作成」をクリック
2. シークレット名: `openai-api-key`
3. シークレットの値: 先ほど取得したOpenAI APIキーをペースト
4. 「シークレットを作成」をクリック

**Tavily APIキーの保存**:
1. 「シークレットを作成」をクリック
2. シークレット名: `tavily-api-key`
3. シークレットの値: Tavily APIキーをペースト
4. 「シークレットを作成」をクリック

**Google Sheets認証情報の保存**:
1. 「シークレットを作成」をクリック
2. シークレット名: `google-sheets-credentials`
3. 「ファイルをアップロード」を選択
4. 先ほどダウンロードしたサービスアカウントのJSONファイルを選択
5. 「シークレットを作成」をクリック

**方法2: コマンドライン（上級者向け）**
```bash
# OpenAI APIキーを保存
echo -n "your-actual-openai-api-key-here" | gcloud secrets create openai-api-key --data-file=-

# Tavily APIキーを保存
echo -n "your-actual-tavily-api-key-here" | gcloud secrets create tavily-api-key --data-file=-

# Google Sheets認証情報を保存
gcloud secrets create google-sheets-credentials --data-file="C:\path\to\your\service-account.json"
```

#### Step 2: Secret Managerへのアクセス権限設定

**Cloud Consoleでの操作**:
1. 「IAMと管理」→「IAM」を選択
2. 作成したサービスアカウントを見つける
3. 右端の編集ペンアイコンをクリック
4. 「別のロールを追加」をクリック
5. `Secret Manager Secret Accessor` を選択
6. 「保存」をクリック

**コマンドラインでの操作**:
```bash
# YOUR_PROJECT_IDとYOUR_SERVICE_ACCOUNT_EMAILを実際の値に置き換えてください
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:YOUR_SERVICE_ACCOUNT_EMAIL" \
    --role="roles/secretmanager.secretAccessor"
```

### 6.2 プロジェクト構造作成（コードを整理して管理しやすくする）

**なぜプロジェクト構造が重要？**
- コードを機能ごとに分割して管理しやすくする
- テストやデバッグが容易になる
- チーム開発や将来の拡張に対応しやすい

#### Step 1: ローカルでのディレクトリ構造作成

**Windows（コマンドプロンプト）での操作**:
```cmd
# プロジェクトフォルダを作成
mkdir corporate-info-collector
cd corporate-info-collector

# 各フォルダとファイルを作成
mkdir modules
mkdir tests
echo. > main.py
echo. > requirements.txt
echo. > config.py
echo. > deploy.sh
echo. > modules\__init__.py
echo. > modules\tavily_client.py
echo. > modules\openai_client.py
echo. > modules\sheets_client.py
echo. > modules\data_processor.py
echo. > modules\workflow.py
echo. > tests\__init__.py
echo. > tests\test_basic.py
```

**Mac/Linux（ターミナル）での操作**:
```bash
# プロジェクトフォルダを作成
mkdir corporate-info-collector
cd corporate-info-collector

# 各フォルダとファイルを作成
mkdir modules tests
touch main.py requirements.txt config.py deploy.sh
touch modules/__init__.py modules/{tavily_client,openai_client,sheets_client,data_processor,workflow}.py
touch tests/__init__.py tests/test_basic.py
```

**作成されるフォルダ構造の説明**:
```
corporate-info-collector/           # プロジェクトのルートフォルダ
├── main.py                        # Cloud Functionsのメイン関数（入り口）
├── requirements.txt               # 使用するPythonライブラリのリスト
├── config.py                     # 設定値をまとめたファイル
├── deploy.sh                     # デプロイ用のスクリプト
├── modules/                      # 機能別のPythonモジュール
│   ├── __init__.py              # Pythonパッケージとして認識させるファイル
│   ├── tavily_client.py         # Tavily APIとの通信処理
│   ├── openai_client.py         # OpenAI APIとの通信処理
│   ├── sheets_client.py         # Google Sheetsとの通信処理
│   ├── data_processor.py        # データの加工・変換処理
│   └── workflow.py              # LangChainワークフローの処理
└── tests/                       # テスト用ファイル
    ├── __init__.py
    └── test_basic.py            # 基本的なテストケース
```

#### Step 2: requirements.txt の詳細設定

**requirements.txt ファイルに以下を記述**:
```txt
# Cloud Functions基盤
functions-framework==3.*

# Google Cloud サービス
google-cloud-secret-manager==2.*
google-api-python-client==2.*
google-auth==2.*
google-auth-oauthlib==2.*
google-auth-httplib2==2.*
google-cloud-storage==2.*

# AI・機械学習
openai==1.*
langchain==0.*
langchain-openai==0.*

# データ処理
requests==2.*
beautifulsoup4==4.*
pandas==2.*

# ユーティリティ
python-dateutil==2.*
pytz==2023.*
```

**各ライブラリの役割**:
- `functions-framework`: Cloud Functionsをローカルで実行するため
- `google-cloud-*`: Google Cloudの各サービスとの連携
- `openai`: OpenAI APIの利用
- `langchain`: LLMアプリケーションの構築フレームワーク
- `requests`: HTTP通信
- `beautifulsoup4`: HTML解析
- `pandas`: データ処理

### 6.3 設定ファイルの詳細設定

#### Step 1: config.py ファイルの作成

**config.py に以下を記述**:
```python
"""
設定値をまとめたファイル
環境変数や固定値を一元管理
"""
import os

# Google Cloud設定
PROJECT_ID = os.environ.get('GCP_PROJECT', 'your-project-id')
REGION = 'asia-northeast1'

# Google Sheets設定
INPUT_SHEET_ID = os.environ.get('INPUT_SHEET_ID', '')
OUTPUT_SHEET_ID = os.environ.get('OUTPUT_SHEET_ID', '')
INPUT_SHEET_NAME = 'input_data'
OUTPUT_SHEET_NAME = 'output_data'

# Cloud Storage設定
BUCKET_NAME = f'{PROJECT_ID}-corporate-collector-logs'

# Secret Manager設定（機密情報の名前）
OPENAI_SECRET_NAME = 'openai-api-key'
TAVILY_SECRET_NAME = 'tavily-api-key'
GOOGLE_CREDS_SECRET_NAME = 'google-sheets-credentials'

# API設定
OPENAI_MODEL = 'gpt-4o-mini'
MAX_COMPANIES_PER_BATCH = 50
REQUEST_TIMEOUT = 30

# ログ設定
LOG_LEVEL = 'INFO'
```

**設定ファイルの役割**:
- 環境によって変わる値（プロジェクトIDなど）を管理
- 固定の設定値を一か所に集約
- コードの変更なしに設定を調整可能

#### Step 2: 環境変数設定ファイルの作成

**ローカル開発用の .env ファイル作成**:
```bash
# .env ファイル（ローカル開発時のみ使用）
# 本番環境では Cloud Functions の環境変数で設定

# Google Cloud
GCP_PROJECT=your-actual-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account.json

# Google Sheets（実際のIDに置き換える）
INPUT_SHEET_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
OUTPUT_SHEET_ID=1ZyXwVuTsRqPoNmLkJiHgFeDcBa9876543210

# 開発設定
DEBUG=true
LOG_LEVEL=DEBUG
```

**注意事項**:
- `.env` ファイルは絶対にGitにコミットしない
- `.gitignore` ファイルに `.env` を追加する

#### Step 3: .gitignore ファイルの作成

**プロジェクトルートに .gitignore ファイルを作成**:
```
# 機密情報
.env
*.json
service-account-*.json

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# ログファイル
*.log
logs/
```

### 6.4 ローカル開発環境の最終確認

#### Step 1: 仮想環境でのパッケージインストール
```bash
# 仮想環境をアクティベート（前回作成済み）
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# パッケージのインストール
pip install -r requirements.txt

# インストール確認
pip list
```

#### Step 2: 基本的な接続テスト用ファイル作成

**test_connections.py ファイルを作成**:
```python
"""
基本的な接続テスト
各サービスへの接続が正常に行えるかチェック
"""
import os
from google.cloud import secretmanager
from googleapiclient.discovery import build
from google.oauth2 import service_account

def test_secret_manager():
    """Secret Managerへの接続テスト"""
    try:
        client = secretmanager.SecretManagerServiceClient()
        project_id = "your-project-id"  # 実際のプロジェクトIDに変更
        
        # シークレット一覧取得テスト
        parent = f"projects/{project_id}"
        secrets = client.list_secrets(request={"parent": parent})
        
        print("Secret Manager接続成功!")
        for secret in secrets:
            print(f"シークレット名: {secret.name}")
        return True
    except Exception as e:
        print(f"Secret Manager接続エラー: {e}")
        return False

def test_sheets_api():
    """Google Sheets APIへの接続テスト"""
    try:
        # サービスアカウントファイルのパスを指定
        credentials = service_account.Credentials.from_service_account_file(
            'path/to/your/service-account.json',  # 実際のパスに変更
            scopes=['https://www.googleapis.com/auth/spreadsheets']
        )
        
        service = build('sheets', 'v4', credentials=credentials)
        print("Google Sheets API接続成功!")
        return True
    except Exception as e:
        print(f"Google Sheets API接続エラー: {e}")
        return False

if __name__ == "__main__":
    print("=== 接続テスト開始 ===")
    test_secret_manager()
    test_sheets_api()
    print("=== 接続テスト完了 ===")
```

#### Step 3: 基本的なmain.py の骨格作成

**main.py に基本構造を記述**:
```python
"""
Cloud Functions のメイン関数
HTTPリクエストを受け取って企業情報収集を実行
"""
import json
import logging
from flask import Request
import functions_framework

# ローカルモジュールのインポート
from modules.workflow import CorporateInfoWorkflow
from config import *

# ログ設定
logging.basicConfig(level=getattr(logging, LOG_LEVEL))
logger = logging.getLogger(__name__)

@functions_framework.http
def main(request: Request):
    """
    Cloud Functions のエントリーポイント
    HTTPリクエストを受け取って処理を実行
    """
    try:
        # リクエスト内容の確認
        if request.method == 'POST':
            request_json = request.get_json(silent=True)
        else:
            request_json = {}
        
        logger.info(f"処理開始: {request_json}")
        
        # テストモードの場合
        if request_json and request_json.get('test', False):
            return {'status': 'success', 'message': 'テスト成功!'}
        
        # ワークフロー実行（後で実装）
        workflow = CorporateInfoWorkflow()
        result = workflow.process_companies()
        
        return {
            'status': 'success',
            'message': '処理完了',
            'result': result
        }
        
    except Exception as e:
        logger.error(f"エラー発生: {str(e)}")
        return {
            'status': 'error',
            'message': str(e)
        }, 500

# ローカル実行用
if __name__ == "__main__":
    # ローカルでテスト実行する場合
    from flask import Flask, request
    app = Flask(__name__)
    
    @app.route('/', methods=['POST', 'GET'])
    def local_main():
        return main(request)
    
    app.run(debug=True, port=8080)
```

これで Cloud Functions の実装準備が完了です。次のステップでは、各モジュールの実装に進むことができます。

**確認項目**:
- [ ] Secret Manager にすべての機密情報が保存されている
- [ ] プロジェクト構造が正しく作成されている
- [ ] requirements.txt に必要なライブラリが記載されている
- [ ] 設定ファイルが適切に作成されている
- [ ] ローカル環境で基本的な動作確認ができる

---

## 7. 実装・テスト手順

### 7.1 段階的実装アプローチ

#### Phase 1: 基本機能実装
1. **Google Sheets接続テスト**
   - サービスアカウント認証
   - シート読み書き機能

2. **外部API接続テスト**
   - Tavily API接続
   - OpenAI API接続

3. **基本ワークフロー実装**
   - 1社分の情報取得
   - データ構造化
   - 結果出力

#### Phase 2: エラーハンドリング実装
1. **API制限対応**
   - レート制限検知
   - 自動リトライ機能

2. **データ品質チェック**
   - 必須項目チェック
   - 異常値検知

#### Phase 3: バッチ処理実装
1. **複数企業処理**
   - 並列処理制御
   - 進捗管理

2. **ログ・監視機能**
   - 処理状況ログ
   - エラー通知

### 7.2 ローカルテスト手順

#### Step 1: ローカル環境でのテスト
```bash
# ローカルでCloud Functionsをエミュレート
functions-framework --target=main --debug
```

#### Step 2: 単体テスト実行
```bash
# テスト実行
python -m pytest tests/ -v
```

#### Step 3: APIテスト
```bash
# ローカルのCloud Functionsにリクエスト送信
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"test": true, "company_count": 1}'
```

---

## 8. デプロイ・運用設定

### 8.1 Cloud Functionsデプロイ

#### Step 1: デプロイスクリプト作成 (deploy.sh)
```bash
#!/bin/bash

PROJECT_ID="your-project-id"
FUNCTION_NAME="corporate-info-collector"
REGION="asia-northeast1"

gcloud functions deploy $FUNCTION_NAME \
  --gen2 \
  --runtime=python311 \
  --region=$REGION \
  --source=. \
  --entry-point=main \
  --trigger-http \
  --allow-unauthenticated \
  --timeout=540s \
  --memory=1GB \
  --max-instances=10 \
  --set-env-vars="PROJECT_ID=$PROJECT_ID" \
  --project=$PROJECT_ID
```

#### Step 2: デプロイ実行
```bash
# 実行権限付与
chmod +x deploy.sh

# デプロイ実行
./deploy.sh
```

### 8.2 Cloud Scheduler設定（週次自動実行）

#### Step 1: Cloud Scheduler有効化
```bash
gcloud services enable cloudscheduler.googleapis.com
```

#### Step 2: スケジュールジョブ作成
```bash
gcloud scheduler jobs create http weekly-corporate-collection \
  --schedule="0 9 * * 1" \
  --uri="https://asia-northeast1-YOUR_PROJECT_ID.cloudfunctions.net/corporate-info-collector" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"batch_mode": true}' \
  --time-zone="Asia/Tokyo"
```

### 8.3 監視・アラート設定

#### Step 1: ログベースメトリクス作成
1. Cloud Consoleで「Logging」→「ログベースのメトリクス」を選択
2. 「メトリクスを作成」をクリック
3. メトリクス名: `corporate_collector_errors`
4. フィルタ: `resource.type="cloud_function" AND severity>=ERROR`

#### Step 2: アラートポリシー設定
1. Cloud Consoleで「Monitoring」→「アラート」を選択
2. 「ポリシーを作成」をクリック
3. 条件設定:
   - リソースタイプ: Cloud Function
   - メトリクス: エラーカウント
   - しきい値: 5分間で5回以上

---

## 9. トラブルシューティング

### 9.1 よくある問題と解決方法

#### 認証エラー
**問題**: `Authentication failed`
**解決策**:
1. サービスアカウントキーの確認
2. APIの有効化確認
3. IAM権限の確認

#### API制限エラー
**問題**: `Rate limit exceeded`
**解決策**:
1. リトライロジックの実装
2. API使用量の監視
3. プランのアップグレード検討

#### Cloud Functions タイムアウト
**問題**: `Function timeout`
**解決策**:
1. タイムアウト時間の延長（最大540秒）
2. 処理の分割
3. 非同期処理の導入

#### メモリ不足
**問題**: `Memory limit exceeded`
**解決策**:
1. メモリ割り当ての増加
2. データ処理の最適化
3. バッチサイズの調整

### 9.2 ログ確認方法

#### Cloud Functionsログ確認
```bash
# 最新のログを確認
gcloud functions logs read corporate-info-collector --limit=50

# エラーログのみ確認
gcloud functions logs read corporate-info-collector --limit=20 --filter="severity>=ERROR"
```

#### Cloud Loggingでの詳細確認
1. Cloud Consoleで「Logging」→「ログエクスプローラ」を選択
2. フィルタ設定:
```
resource.type="cloud_function"
resource.labels.function_name="corporate-info-collector"
```

### 9.3 パフォーマンス最適化

#### API呼び出し最適化
- バッチ処理での並列数制御
- キャッシュ機能の実装
- 不要なAPI呼び出しの削減

#### コスト最適化
- 適切なメモリ設定
- 実行時間の最小化
- 無駄なログ出力の削減

---

## 10. 運用開始チェックリスト

### 10.1 デプロイ前チェック
- [ ] すべてのAPIキーが正しく設定されている
- [ ] サービスアカウント権限が適切に設定されている
- [ ] スプレッドシートの共有設定が正しい
- [ ] ローカルテストが正常に完了している
- [ ] Secret Managerに機密情報が保存されている

### 10.2 デプロイ後チェック
- [ ] Cloud Functionsが正常にデプロイされている
- [ ] 手動実行テストが成功している
- [ ] ログが適切に出力されている
- [ ] 監視・アラートが設定されている
- [ ] スケジュール実行が設定されている

### 10.3 運用開始後チェック
- [ ] 週次実行が正常に動作している
- [ ] エラー率が許容範囲内である
- [ ] データ品質が要求水準を満たしている
- [ ] コストが予算内に収まっている

---

**📝 注意事項**
- APIキーやサービスアカウントキーは絶対に外部に漏らさないでください
- 本番運用前には必ず小規模テストを実施してください
- 定期的にログとコストを確認してください
- スクレイピング対象サイトの利用規約を遵守してください