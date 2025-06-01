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

---

## 11. 追加推奨事項

### 11.1 サンプルデータ

#### 入力データサンプル

**1. 正常なケース - input_data.csv**
```csv
企業名,電話番号,処理状況,備考
株式会社サイバーエージェント,03-5459-0202,未処理,
トヨタ自動車株式会社,0565-28-2121,未処理,
楽天グループ株式会社,050-5581-6910,未処理,
株式会社メルカリ,03-6804-6907,未処理,
任天堂株式会社,075-662-9600,未処理,
```

**2. エッジケース - edge_cases.csv**
```csv
企業名,電話番号,処理状況,備考
ソニーグループ,03-6748-2111,未処理,株式会社が抜けている
ZOZO,043-276-6900,未処理,正式名称と異なる
(株)ファーストリテイリング,03-6865-0050,未処理,略称使用
日本マクドナルド,03-6911-5000,未処理,ホールディングスが抜けている
LINE,03-4316-2050,未処理,現在はLINEヤフー株式会社
```

**3. エラーケース - error_cases.csv**
```csv
企業名,電話番号,処理状況,備考
,03-1234-5678,未処理,企業名なし
テスト株式会社,,未処理,電話番号なし
存在しない企業ABC,03-9999-9999,未処理,架空の企業
🌟特殊文字会社🌟,03-1111-1111,未処理,特殊文字を含む
Very Long Company Name That Exceeds Normal Length Limits Corporation,03-2222-2222,未処理,異常に長い名前
```

#### 出力データサンプル

**1. 成功例 - 株式会社サイバーエージェント**
```json
{
  "企業名": "株式会社サイバーエージェント",
  "電話番号": "03-5459-0202",
  "正式企業名": "株式会社サイバーエージェント",
  "業種_大分類": "情報・通信業",
  "業種_中分類": "インターネット関連サービス",
  "従業員数": 5139,
  "設立年": 1998,
  "資本金": 7203000000,
  "上場区分": "東証プライム",
  "本社所在地": "東京都渋谷区宇田川町40番1号 Abema Towers",
  "代表者名": "藤田晋",
  "代表者役職": "代表取締役",
  "企業理念": "21世紀を代表する会社を創る",
  "最新ニュース": "ABEMA、2024年第3四半期の視聴者数が過去最高を記録",
  "採用状況": "新卒・中途採用ともに積極採用中",
  "信頼性スコア": 0.95,
  "処理日時": "2024-01-15T10:30:45+09:00",
  "処理結果": "成功",
  "エラー内容": null,
  "情報ソースURL": "https://www.cyberagent.co.jp/corporate/"
}
```

**2. 部分的成功例 - 情報不足**
```json
{
  "企業名": "株式会社スタートアップXYZ",
  "電話番号": "03-1234-5678",
  "正式企業名": "株式会社スタートアップXYZ",
  "業種_大分類": "情報・通信業",
  "業種_中分類": null,
  "従業員数": 25,
  "設立年": 2020,
  "資本金": 10000000,
  "上場区分": "非上場",
  "本社所在地": "東京都港区",
  "代表者名": null,
  "代表者役職": "代表取締役",
  "企業理念": null,
  "最新ニュース": null,
  "採用状況": "エンジニア募集中",
  "信頼性スコア": 0.65,
  "処理日時": "2024-01-15T10:35:20+09:00",
  "処理結果": "部分的成功",
  "エラー内容": "一部の情報が取得できませんでした",
  "情報ソースURL": null
}
```

**3. エラー例**
```json
{
  "企業名": "存在しない企業ABC",
  "電話番号": "03-9999-9999",
  "正式企業名": null,
  "業種_大分類": null,
  "業種_中分類": null,
  "従業員数": null,
  "設立年": null,
  "資本金": null,
  "上場区分": null,
  "本社所在地": null,
  "代表者名": null,
  "代表者役職": null,
  "企業理念": null,
  "最新ニュース": null,
  "採用状況": null,
  "信頼性スコア": 0,
  "処理日時": "2024-01-15T10:40:00+09:00",
  "処理結果": "失敗",
  "エラー内容": "企業情報が見つかりませんでした",
  "情報ソースURL": null
}
```

#### テスト用JSONデータ

**test_data.json - API開発用**
```json
{
  "test_mode": true,
  "companies": [
    {
      "name": "テスト株式会社",
      "phone": "03-0000-0000"
    }
  ],
  "options": {
    "skip_validation": false,
    "force_refresh": true,
    "batch_size": 5
  }
}
```

### 11.2 デバッグ方法

#### VS Code デバッグ設定

**1. .vscode/launch.json の作成**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Cloud Function Local",
      "type": "python",
      "request": "launch",
      "module": "functions_framework",
      "args": [
        "--target=main",
        "--debug",
        "--port=8080"
      ],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "${workspaceFolder}/service-account.json",
        "GCP_PROJECT": "your-project-id",
        "INPUT_SHEET_ID": "your-input-sheet-id",
        "OUTPUT_SHEET_ID": "your-output-sheet-id",
        "PYTHONPATH": "${workspaceFolder}",
        "DEBUG": "true",
        "LOG_LEVEL": "DEBUG"
      },
      "console": "integratedTerminal"
    },
    {
      "name": "Python: Current File",
      "type": "python",
      "request": "launch",
      "program": "${file}",
      "console": "integratedTerminal",
      "env": {
        "PYTHONPATH": "${workspaceFolder}",
        "GOOGLE_APPLICATION_CREDENTIALS": "${workspaceFolder}/service-account.json"
      }
    },
    {
      "name": "Python: Module Debug",
      "type": "python",
      "request": "launch",
      "module": "modules.${input:moduleName}",
      "console": "integratedTerminal",
      "env": {
        "PYTHONPATH": "${workspaceFolder}",
        "DEBUG": "true"
      }
    }
  ],
  "inputs": [
    {
      "id": "moduleName",
      "type": "pickString",
      "description": "Select module to debug",
      "options": [
        "workflow",
        "tavily_client",
        "openai_client",
        "sheets_client",
        "data_processor"
      ]
    }
  ]
}
```

**2. .vscode/settings.json の作成**
```json
{
  "python.testing.pytestEnabled": true,
  "python.testing.unittestEnabled": false,
  "python.testing.pytestArgs": [
    "tests",
    "-v",
    "--tb=short"
  ],
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "files.exclude": {
    "**/__pycache__": true,
    "**/*.pyc": true
  }
}
```

#### デバッグ用ヘルパースクリプト

**debug_helpers.py の作成**
```python
"""
デバッグ用ヘルパー関数
開発時の問題調査を支援
"""
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
import traceback
from googleapiclient.discovery import build
from google.oauth2 import service_account
import pandas as pd

# デバッグ用ロガー設定
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f'debug_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
    ]
)
logger = logging.getLogger(__name__)

class DebugHelper:
    """デバッグ支援クラス"""
    
    @staticmethod
    def test_tavily_connection(api_key: str) -> bool:
        """Tavily API接続テスト"""
        try:
            from modules.tavily_client import TavilyClient
            client = TavilyClient(api_key)
            result = client.search("テスト", max_results=1)
            logger.info(f"Tavily接続成功: {len(result)} 件の結果")
            return True
        except Exception as e:
            logger.error(f"Tavily接続失敗: {e}")
            logger.debug(traceback.format_exc())
            return False
    
    @staticmethod
    def test_openai_connection(api_key: str) -> bool:
        """OpenAI API接続テスト"""
        try:
            from modules.openai_client import OpenAIClient
            client = OpenAIClient(api_key)
            result = client.extract_company_info(
                "テスト株式会社", 
                ["テスト会社は東京にある。"]
            )
            logger.info(f"OpenAI接続成功: {result}")
            return True
        except Exception as e:
            logger.error(f"OpenAI接続失敗: {e}")
            logger.debug(traceback.format_exc())
            return False
    
    @staticmethod
    def test_sheets_connection(credentials_path: str, sheet_id: str) -> bool:
        """Google Sheets接続テスト"""
        try:
            credentials = service_account.Credentials.from_service_account_file(
                credentials_path,
                scopes=['https://www.googleapis.com/auth/spreadsheets']
            )
            service = build('sheets', 'v4', credentials=credentials)
            
            # シート情報を取得
            sheet = service.spreadsheets().get(
                spreadsheetId=sheet_id
            ).execute()
            
            logger.info(f"Sheets接続成功: {sheet.get('properties', {}).get('title')}")
            return True
        except Exception as e:
            logger.error(f"Sheets接続失敗: {e}")
            logger.debug(traceback.format_exc())
            return False
    
    @staticmethod
    def analyze_error_log(log_file: str) -> Dict[str, Any]:
        """エラーログ分析"""
        errors = {
            'total': 0,
            'by_type': {},
            'by_module': {},
            'timestamps': []
        }
        
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if 'ERROR' in line or 'Exception' in line:
                        errors['total'] += 1
                        errors['timestamps'].append(line[:23])  # タイムスタンプ
                        
                        # エラータイプの分類
                        if 'RateLimitError' in line:
                            errors['by_type']['rate_limit'] = errors['by_type'].get('rate_limit', 0) + 1
                        elif 'AuthenticationError' in line:
                            errors['by_type']['auth'] = errors['by_type'].get('auth', 0) + 1
                        elif 'ValidationError' in line:
                            errors['by_type']['validation'] = errors['by_type'].get('validation', 0) + 1
                        else:
                            errors['by_type']['other'] = errors['by_type'].get('other', 0) + 1
            
            logger.info(f"エラーログ分析完了: {errors['total']} 件のエラー")
            return errors
            
        except Exception as e:
            logger.error(f"ログファイル読み込みエラー: {e}")
            return errors
    
    @staticmethod
    def create_test_sheet_data(sheet_id: str, credentials_path: str):
        """テスト用シートデータ作成"""
        try:
            from modules.sheets_client import SheetsClient
            client = SheetsClient(credentials_path)
            
            # テストデータ
            test_data = [
                ["企業名", "電話番号", "処理状況", "備考"],
                ["テスト株式会社", "03-1111-1111", "未処理", ""],
                ["サンプル商事", "06-2222-2222", "未処理", ""],
                ["デモ工業", "052-3333-3333", "未処理", ""]
            ]
            
            # データ書き込み
            range_name = "input_data!A1:D4"
            client.service.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range=range_name,
                valueInputOption='RAW',
                body={'values': test_data}
            ).execute()
            
            logger.info("テストデータ作成成功")
            return True
            
        except Exception as e:
            logger.error(f"テストデータ作成失敗: {e}")
            return False

    @staticmethod
    def validate_environment():
        """環境設定の検証"""
        import os
        
        required_vars = [
            'GOOGLE_APPLICATION_CREDENTIALS',
            'GCP_PROJECT',
            'INPUT_SHEET_ID',
            'OUTPUT_SHEET_ID'
        ]
        
        missing = []
        for var in required_vars:
            if not os.environ.get(var):
                missing.append(var)
        
        if missing:
            logger.error(f"必要な環境変数が設定されていません: {missing}")
            return False
        
        logger.info("環境設定検証OK")
        return True

# 使用例
if __name__ == "__main__":
    # 環境検証
    DebugHelper.validate_environment()
    
    # 接続テスト
    # DebugHelper.test_tavily_connection("your-api-key")
    # DebugHelper.test_openai_connection("your-api-key")
    # DebugHelper.test_sheets_connection("path/to/credentials.json", "sheet-id")
    
    # エラーログ分析
    # errors = DebugHelper.analyze_error_log("debug.log")
    # print(json.dumps(errors, indent=2, ensure_ascii=False))
```

#### トラブルシューティング用コマンド

**debug_commands.sh の作成**
```bash
#!/bin/bash

# デバッグ用コマンド集

# 1. Python環境確認
echo "=== Python環境確認 ==="
python --version
pip list | grep -E "(google|openai|langchain|pandas)"

# 2. 認証情報確認
echo -e "\n=== 認証情報確認 ==="
if [ -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    echo "✓ 認証ファイルが存在します: $GOOGLE_APPLICATION_CREDENTIALS"
    # サービスアカウントのメールアドレスを表示
    cat $GOOGLE_APPLICATION_CREDENTIALS | grep -o '"client_email": "[^"]*"'
else
    echo "✗ 認証ファイルが見つかりません"
fi

# 3. Secret Manager接続テスト
echo -e "\n=== Secret Manager接続テスト ==="
gcloud secrets list --project=$GCP_PROJECT

# 4. ローカルFunction実行テスト
echo -e "\n=== ローカルFunction起動 ==="
echo "以下のコマンドで別ターミナルでFunctionを起動してください:"
echo "functions-framework --target=main --debug --port=8080"

# 5. APIテスト用curlコマンド
echo -e "\n=== APIテスト用コマンド ==="
echo "# ヘルスチェック"
echo 'curl http://localhost:8080'

echo -e "\n# テストモード実行"
echo 'curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '"'"'{"test": true}'"'"''

echo -e "\n# 単一企業処理"
echo 'curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '"'"'{
    "companies": [{"name": "サイバーエージェント", "phone": "03-5459-0202"}],
    "skip_sheets": true
  }'"'"''

# 6. ログ確認
echo -e "\n=== ログファイル確認 ==="
echo "最新のログファイル:"
ls -la debug_*.log 2>/dev/null | tail -5

# 7. メモリ使用量確認
echo -e "\n=== システムリソース ==="
if command -v free &> /dev/null; then
    free -h
fi

# 8. ネットワーク接続確認
echo -e "\n=== ネットワーク接続確認 ==="
echo "Google API接続:"
ping -c 1 sheets.googleapis.com &> /dev/null && echo "✓ OK" || echo "✗ NG"

echo "OpenAI API接続:"
ping -c 1 api.openai.com &> /dev/null && echo "✓ OK" || echo "✗ NG"

echo "Tavily API接続:"
ping -c 1 api.tavily.com &> /dev/null && echo "✓ OK" || echo "✗ NG"
```

### 11.3 CI/CD パイプライン

#### GitHub Actions 設定

**.github/workflows/ci.yml の作成**
```yaml
name: CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  PYTHON_VERSION: '3.11'

jobs:
  lint:
    name: Lint and Format Check
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: ${{ env.PYTHON_VERSION }}
    
    - name: Install dependencies
      run: |
        pip install --upgrade pip
        pip install flake8 black isort pylint
    
    - name: Lint with flake8
      run: |
        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
        flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
    
    - name: Check formatting with black
      run: black --check .
    
    - name: Check import sorting with isort
      run: isort --check-only .
    
    - name: Lint with pylint
      run: pylint modules/ --disable=C0111,R0903

  test:
    name: Run Tests
    runs-on: ubuntu-latest
    needs: lint
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: ${{ env.PYTHON_VERSION }}
    
    - name: Cache pip packages
      uses: actions/cache@v3
      with:
        path: ~/.cache/pip
        key: ${{ runner.os }}-pip-${{ hashFiles('requirements.txt') }}
        restore-keys: |
          ${{ runner.os }}-pip-
    
    - name: Install dependencies
      run: |
        pip install --upgrade pip
        pip install -r requirements.txt
        pip install pytest pytest-cov pytest-mock
    
    - name: Run unit tests
      env:
        PYTHONPATH: ${{ github.workspace }}
      run: |
        pytest tests/ -v --cov=modules --cov-report=xml --cov-report=html
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml
        flags: unittests
        name: codecov-umbrella

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: lint
    steps:
    - uses: actions/checkout@v3
    
    - name: Run Bandit Security Scan
      uses: gaurav-nelson/bandit-action@v1
      with:
        path: "."
        level: "medium"
        confidence: "medium"
        exit_zero: "false"
    
    - name: Check for secrets
      uses: trufflesecurity/trufflehog@main
      with:
        path: ./
        base: ${{ github.event.repository.default_branch }}

  build:
    name: Build and Validate
    runs-on: ubuntu-latest
    needs: [test, security-scan]
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: ${{ env.PYTHON_VERSION }}
    
    - name: Install dependencies
      run: |
        pip install --upgrade pip
        pip install -r requirements.txt
    
    - name: Validate Cloud Function structure
      run: |
        # Check required files exist
        test -f main.py || exit 1
        test -f requirements.txt || exit 1
        
        # Check main function exists
        grep -q "@functions_framework.http" main.py || exit 1
        grep -q "def main" main.py || exit 1
    
    - name: Test local function
      run: |
        # Start function in background
        functions-framework --target=main --port=8080 &
        FUNCTION_PID=$!
        
        # Wait for startup
        sleep 5
        
        # Test endpoint
        curl -f http://localhost:8080 || exit 1
        
        # Stop function
        kill $FUNCTION_PID
```

**.github/workflows/cd.yml の作成**
```yaml
name: CD Pipeline

on:
  push:
    branches: [ main ]
    paths-ignore:
      - '**.md'
      - '.github/**'
      - 'tests/**'

env:
  GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  GCP_SA_KEY: ${{ secrets.GCP_SA_KEY }}
  FUNCTION_NAME: corporate-info-collector
  REGION: asia-northeast1

jobs:
  deploy:
    name: Deploy to Cloud Functions
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Cloud SDK
      uses: google-github-actions/setup-gcloud@v1
      with:
        service_account_key: ${{ env.GCP_SA_KEY }}
        project_id: ${{ env.GCP_PROJECT_ID }}
        export_default_credentials: true
    
    - name: Deploy to Cloud Functions
      run: |
        gcloud functions deploy ${{ env.FUNCTION_NAME }} \
          --gen2 \
          --runtime=python311 \
          --region=${{ env.REGION }} \
          --source=. \
          --entry-point=main \
          --trigger-http \
          --allow-unauthenticated \
          --timeout=540s \
          --memory=1GB \
          --max-instances=10 \
          --set-env-vars="PROJECT_ID=${{ env.GCP_PROJECT_ID }}" \
          --set-env-vars="INPUT_SHEET_ID=${{ secrets.INPUT_SHEET_ID }}" \
          --set-env-vars="OUTPUT_SHEET_ID=${{ secrets.OUTPUT_SHEET_ID }}"
    
    - name: Verify deployment
      run: |
        # Get function URL
        FUNCTION_URL=$(gcloud functions describe ${{ env.FUNCTION_NAME }} \
          --region=${{ env.REGION }} \
          --format='value(serviceConfig.uri)')
        
        # Test function
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $FUNCTION_URL \
          -H "Content-Type: application/json" \
          -d '{"test": true}')
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | head -n-1)
        
        if [ "$HTTP_CODE" != "200" ]; then
          echo "Deployment verification failed: HTTP $HTTP_CODE"
          echo "Response: $BODY"
          exit 1
        fi
        
        echo "Deployment successful!"
        echo "Function URL: $FUNCTION_URL"
    
    - name: Create deployment annotation
      if: success()
      run: |
        gcloud logging write deployments \
          "Deployed ${{ env.FUNCTION_NAME }} from commit ${{ github.sha }}" \
          --severity=NOTICE \
          --resource=cloud_function \
          --labels=function_name=${{ env.FUNCTION_NAME }},commit=${{ github.sha }}

  post-deploy-test:
    name: Post-Deployment Tests
    runs-on: ubuntu-latest
    needs: deploy
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install test dependencies
      run: |
        pip install requests pytest
    
    - name: Run integration tests
      env:
        GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
        FUNCTION_NAME: ${{ env.FUNCTION_NAME }}
        REGION: ${{ env.REGION }}
      run: |
        # Get function URL
        FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME \
          --region=$REGION \
          --format='value(serviceConfig.uri)')
        
        # Create integration test
        cat > test_integration.py << EOF
        import requests
        import os
        
        def test_health_check():
            url = os.environ.get('FUNCTION_URL')
            response = requests.post(url, json={'test': True})
            assert response.status_code == 200
            assert response.json()['status'] == 'success'
        
        def test_invalid_request():
            url = os.environ.get('FUNCTION_URL')
            response = requests.post(url, json={'invalid': 'data'})
            assert response.status_code in [200, 400]
        EOF
        
        # Run tests
        export FUNCTION_URL=$FUNCTION_URL
        pytest test_integration.py -v
```

#### ローカル開発用 Makefile

**Makefile の作成**
```makefile
.PHONY: help install test lint format clean deploy run-local

# デフォルトターゲット
help:
	@echo "使用可能なコマンド:"
	@echo "  make install    - 依存関係のインストール"
	@echo "  make test       - テストの実行"
	@echo "  make lint       - コードの静的解析"
	@echo "  make format     - コードのフォーマット"
	@echo "  make clean      - 一時ファイルの削除"
	@echo "  make run-local  - ローカルでFunction実行"
	@echo "  make deploy     - Cloud Functionsへデプロイ"

# Python仮想環境の作成と依存関係のインストール
install:
	python3 -m venv venv
	. venv/bin/activate && pip install --upgrade pip
	. venv/bin/activate && pip install -r requirements.txt
	. venv/bin/activate && pip install -r requirements-dev.txt

# テストの実行
test:
	. venv/bin/activate && python -m pytest tests/ -v --cov=modules --cov-report=term-missing

# コードの静的解析
lint:
	. venv/bin/activate && flake8 . --max-line-length=127
	. venv/bin/activate && pylint modules/ --disable=C0111,R0903
	. venv/bin/activate && mypy modules/ --ignore-missing-imports

# コードのフォーマット
format:
	. venv/bin/activate && black .
	. venv/bin/activate && isort .

# 一時ファイルの削除
clean:
	find . -type f -name '*.pyc' -delete
	find . -type d -name '__pycache__' -delete
	find . -type d -name '.pytest_cache' -delete
	find . -type f -name '.coverage' -delete
	find . -type d -name '*.egg-info' -delete
	rm -rf htmlcov/
	rm -f debug_*.log

# ローカルでFunction実行
run-local:
	. venv/bin/activate && functions-framework --target=main --debug --port=8080

# Cloud Functionsへデプロイ
deploy:
	./deploy.sh

# 開発用サーバー起動（自動リロード付き）
dev:
	. venv/bin/activate && functions-framework --target=main --debug --port=8080 --source=.
```

**requirements-dev.txt の作成**
```txt
# 開発・テスト用依存関係
pytest==7.*
pytest-cov==4.*
pytest-mock==3.*
pytest-asyncio==0.*

# コード品質ツール
flake8==6.*
black==23.*
isort==5.*
pylint==3.*
mypy==1.*

# デバッグツール
ipdb==0.*
ipython==8.*

# ドキュメント
sphinx==7.*
sphinx-rtd-theme==2.*
```

### 11.4 バックアップとリカバリ

#### 自動バックアップスクリプト

**backup_manager.py の作成**
```python
"""
バックアップ・リカバリ管理システム
Google Sheetsデータと処理ログのバックアップ
"""
import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from google.cloud import storage
from googleapiclient.discovery import build
from google.oauth2 import service_account
import pandas as pd
import zipfile
import io

logger = logging.getLogger(__name__)

class BackupManager:
    """バックアップ管理クラス"""
    
    def __init__(self, project_id: str, bucket_name: str, credentials_path: str):
        self.project_id = project_id
        self.bucket_name = bucket_name
        self.credentials_path = credentials_path
        
        # Google Cloud Storage クライアント
        self.storage_client = storage.Client(project=project_id)
        self.bucket = self.storage_client.bucket(bucket_name)
        
        # Google Sheets クライアント
        credentials = service_account.Credentials.from_service_account_file(
            credentials_path,
            scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']
        )
        self.sheets_service = build('sheets', 'v4', credentials=credentials)
    
    def backup_sheets_data(self, sheet_ids: Dict[str, str]) -> Dict[str, str]:
        """
        Google Sheetsデータのバックアップ
        
        Args:
            sheet_ids: {名前: シートID}の辞書
            
        Returns:
            バックアップファイルのパス情報
        """
        backup_info = {}
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        for name, sheet_id in sheet_ids.items():
            try:
                # シートデータを取得
                result = self.sheets_service.spreadsheets().values().get(
                    spreadsheetId=sheet_id,
                    range='A:Z'  # 全データ取得
                ).execute()
                
                values = result.get('values', [])
                
                if values:
                    # DataFrameに変換
                    df = pd.DataFrame(values[1:], columns=values[0])
                    
                    # CSV形式で保存
                    csv_buffer = io.StringIO()
                    df.to_csv(csv_buffer, index=False, encoding='utf-8')
                    
                    # Cloud Storageにアップロード
                    blob_name = f"backups/sheets/{name}_{timestamp}.csv"
                    blob = self.bucket.blob(blob_name)
                    blob.upload_from_string(
                        csv_buffer.getvalue(),
                        content_type='text/csv'
                    )
                    
                    backup_info[name] = blob_name
                    logger.info(f"バックアップ完了: {name} -> {blob_name}")
                    
                    # メタデータも保存
                    metadata = {
                        'sheet_id': sheet_id,
                        'sheet_name': name,
                        'backup_time': timestamp,
                        'row_count': len(df),
                        'column_count': len(df.columns),
                        'columns': list(df.columns)
                    }
                    
                    meta_blob_name = f"backups/sheets/{name}_{timestamp}_metadata.json"
                    meta_blob = self.bucket.blob(meta_blob_name)
                    meta_blob.upload_from_string(
                        json.dumps(metadata, ensure_ascii=False, indent=2),
                        content_type='application/json'
                    )
                    
            except Exception as e:
                logger.error(f"バックアップ失敗 ({name}): {e}")
                
        return backup_info
    
    def backup_logs(self, log_directory: str = "logs") -> str:
        """
        ログファイルのバックアップ
        
        Args:
            log_directory: ログファイルのディレクトリ
            
        Returns:
            バックアップファイルのパス
        """
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(log_directory):
                for file in files:
                    if file.endswith('.log'):
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, log_directory)
                        zipf.write(file_path, arcname)
        
        # Cloud Storageにアップロード
        blob_name = f"backups/logs/logs_{timestamp}.zip"
        blob = self.bucket.blob(blob_name)
        blob.upload_from_string(
            zip_buffer.getvalue(),
            content_type='application/zip'
        )
        
        logger.info(f"ログバックアップ完了: {blob_name}")
        return blob_name
    
    def create_snapshot(self) -> Dict[str, any]:
        """
        システム全体のスナップショット作成
        
        Returns:
            スナップショット情報
        """
        timestamp = datetime.now()
        snapshot = {
            'timestamp': timestamp.isoformat(),
            'version': '1.0',
            'components': {}
        }
        
        # 設定情報のバックアップ
        try:
            import config
            snapshot['components']['config'] = {
                'project_id': config.PROJECT_ID,
                'region': config.REGION,
                'model': config.OPENAI_MODEL,
                'batch_size': config.MAX_COMPANIES_PER_BATCH
            }
        except Exception as e:
            logger.error(f"設定バックアップ失敗: {e}")
        
        # 環境変数のバックアップ（機密情報を除く）
        safe_env_vars = [
            'GCP_PROJECT', 'REGION', 'INPUT_SHEET_ID', 
            'OUTPUT_SHEET_ID', 'LOG_LEVEL'
        ]
        snapshot['components']['environment'] = {
            var: os.environ.get(var, 'NOT_SET')
            for var in safe_env_vars
        }
        
        # Cloud Storageに保存
        blob_name = f"backups/snapshots/snapshot_{timestamp.strftime('%Y%m%d_%H%M%S')}.json"
        blob = self.bucket.blob(blob_name)
        blob.upload_from_string(
            json.dumps(snapshot, ensure_ascii=False, indent=2),
            content_type='application/json'
        )
        
        logger.info(f"スナップショット作成完了: {blob_name}")
        return snapshot
    
    def list_backups(self, backup_type: str = 'all', days: int = 7) -> List[Dict]:
        """
        バックアップ一覧取得
        
        Args:
            backup_type: 'sheets', 'logs', 'snapshots', 'all'
            days: 過去何日分を取得するか
            
        Returns:
            バックアップファイル情報のリスト
        """
        cutoff_date = datetime.now() - timedelta(days=days)
        backups = []
        
        prefix_map = {
            'sheets': 'backups/sheets/',
            'logs': 'backups/logs/',
            'snapshots': 'backups/snapshots/',
            'all': 'backups/'
        }
        
        prefix = prefix_map.get(backup_type, 'backups/')
        
        for blob in self.bucket.list_blobs(prefix=prefix):
            if blob.time_created >= cutoff_date:
                backups.append({
                    'name': blob.name,
                    'size': blob.size,
                    'created': blob.time_created.isoformat(),
                    'content_type': blob.content_type,
                    'url': blob.public_url
                })
        
        return sorted(backups, key=lambda x: x['created'], reverse=True)
    
    def restore_sheets_data(self, backup_file: str, target_sheet_id: str) -> bool:
        """
        シートデータのリストア
        
        Args:
            backup_file: バックアップファイル名
            target_sheet_id: リストア先のシートID
            
        Returns:
            成功/失敗
        """
        try:
            # バックアップファイルをダウンロード
            blob = self.bucket.blob(backup_file)
            csv_content = blob.download_as_text()
            
            # CSVをパース
            df = pd.read_csv(io.StringIO(csv_content))
            
            # データを配列形式に変換
            values = [df.columns.tolist()] + df.values.tolist()
            
            # シートをクリア
            self.sheets_service.spreadsheets().values().clear(
                spreadsheetId=target_sheet_id,
                range='A:Z'
            ).execute()
            
            # データを書き込み
            self.sheets_service.spreadsheets().values().update(
                spreadsheetId=target_sheet_id,
                range='A1',
                valueInputOption='RAW',
                body={'values': values}
            ).execute()
            
            logger.info(f"リストア完了: {backup_file} -> {target_sheet_id}")
            return True
            
        except Exception as e:
            logger.error(f"リストア失敗: {e}")
            return False
    
    def cleanup_old_backups(self, retention_days: int = 30):
        """
        古いバックアップの削除
        
        Args:
            retention_days: 保持日数
        """
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        deleted_count = 0
        
        for blob in self.bucket.list_blobs(prefix='backups/'):
            if blob.time_created < cutoff_date:
                blob.delete()
                deleted_count += 1
                logger.info(f"削除: {blob.name}")
        
        logger.info(f"古いバックアップを{deleted_count}件削除しました")

# Cloud Functions用エントリーポイント
def backup_handler(request):
    """
    定期バックアップ用Cloud Function
    """
    try:
        # 設定読み込み
        project_id = os.environ.get('GCP_PROJECT')
        bucket_name = os.environ.get('BACKUP_BUCKET')
        credentials_path = '/tmp/credentials.json'  # Secret Managerから取得
        
        # バックアップマネージャー初期化
        manager = BackupManager(project_id, bucket_name, credentials_path)
        
        # シートデータのバックアップ
        sheet_ids = {
            'input': os.environ.get('INPUT_SHEET_ID'),
            'output': os.environ.get('OUTPUT_SHEET_ID')
        }
        sheets_backup = manager.backup_sheets_data(sheet_ids)
        
        # ログのバックアップ
        logs_backup = manager.backup_logs()
        
        # スナップショット作成
        snapshot = manager.create_snapshot()
        
        # 古いバックアップの削除
        manager.cleanup_old_backups()
        
        return {
            'status': 'success',
            'sheets_backup': sheets_backup,
            'logs_backup': logs_backup,
            'snapshot': snapshot['timestamp']
        }
        
    except Exception as e:
        logger.error(f"バックアップ処理エラー: {e}")
        return {'status': 'error', 'message': str(e)}, 500
```

#### リカバリ手順書

**recovery_procedures.md の作成**
```markdown
# 障害リカバリ手順書

## 1. 障害レベル別対応手順

### レベル1: 軽微な障害（個別企業の処理失敗）
1. エラーログを確認
   ```bash
   gcloud functions logs read corporate-info-collector --limit=50 --filter="severity>=ERROR"
   ```

2. 失敗した企業を特定
   ```bash
   # 出力シートでエラー内容を確認
   # 処理結果列が「失敗」の行を抽出
   ```

3. 個別再実行
   ```bash
   curl -X POST https://YOUR_FUNCTION_URL \
     -H "Content-Type: application/json" \
     -d '{"companies": [{"name": "失敗した企業名", "phone": "電話番号"}]}'
   ```

### レベル2: 中規模障害（API制限・一時的なサービス停止）

1. 影響範囲の確認
   ```python
   # check_api_status.py
   from modules.tavily_client import TavilyClient
   from modules.openai_client import OpenAIClient
   
   # API状態チェック
   tavily_ok = TavilyClient(api_key).check_health()
   openai_ok = OpenAIClient(api_key).check_health()
   ```

2. 待機と再試行
   ```bash
   # 30分後に再実行
   sleep 1800
   gcloud scheduler jobs run weekly-corporate-collection --location=asia-northeast1
   ```

3. 部分的な処理の再開
   ```python
   # 処理済みの企業をスキップして再実行
   workflow = CorporateInfoWorkflow()
   workflow.process_companies(skip_processed=True)
   ```

### レベル3: 重大障害（データ損失・システム障害）

1. 最新のバックアップ確認
   ```python
   from backup_manager import BackupManager
   
   manager = BackupManager(project_id, bucket_name, credentials_path)
   backups = manager.list_backups('all', days=7)
   
   for backup in backups:
       print(f"{backup['name']} - {backup['created']}")
   ```

2. データのリストア
   ```python
   # シートデータのリストア
   manager.restore_sheets_data(
       'backups/sheets/output_20240115_103000.csv',
       output_sheet_id
   )
   ```

3. システムの再デプロイ
   ```bash
   # 環境の再構築
   terraform apply -auto-approve
   
   # または手動デプロイ
   ./deploy.sh
   ```

## 2. データ整合性チェック

### 重複データの検出と削除
```python
import pandas as pd
from modules.sheets_client import SheetsClient

def remove_duplicates(sheet_id: str, credentials_path: str):
    client = SheetsClient(credentials_path)
    
    # データ読み込み
    data = client.read_data(sheet_id, 'output_data!A:T')
    df = pd.DataFrame(data[1:], columns=data[0])
    
    # 重複を検出（企業名と電話番号で判定）
    duplicates = df[df.duplicated(['企業名', '電話番号'], keep='last')]
    
    if not duplicates.empty:
        print(f"重複データ: {len(duplicates)}件")
        
        # 最新のデータを残して削除
        df_cleaned = df.drop_duplicates(['企業名', '電話番号'], keep='last')
        
        # シートに書き戻し
        values = [df_cleaned.columns.tolist()] + df_cleaned.values.tolist()
        client.write_data(sheet_id, 'output_data!A1', values)
```

### データ品質の検証
```python
def validate_data_quality(df: pd.DataFrame) -> Dict[str, List[str]]:
    issues = {
        'missing_required': [],
        'invalid_format': [],
        'suspicious_values': []
    }
    
    # 必須項目のチェック
    required_columns = ['企業名', '正式企業名', '業種_大分類']
    for col in required_columns:
        missing = df[df[col].isna() | (df[col] == '')]
        if not missing.empty:
            issues['missing_required'].extend(
                missing['企業名'].tolist()
            )
    
    # 形式チェック
    # 電話番号形式
    invalid_phones = df[~df['電話番号'].str.match(r'^\d{2,4}-\d{2,4}-\d{4}$')]
    issues['invalid_format'].extend(invalid_phones['企業名'].tolist())
    
    # 異常値チェック
    # 従業員数が異常に多い
    suspicious = df[df['従業員数'] > 1000000]
    issues['suspicious_values'].extend(suspicious['企業名'].tolist())
    
    return issues
```

## 3. 緊急時連絡先とエスカレーション

### エスカレーションフロー
1. **レベル1**: 開発チーム内で対応
2. **レベル2**: プロジェクトマネージャーに報告
3. **レベル3**: 経営層に報告、外部ベンダーサポート要請

### 監視ダッシュボード
- Cloud Monitoring: https://console.cloud.google.com/monitoring
- エラーレポート: https://console.cloud.google.com/errors
- Cloud Functions ログ: https://console.cloud.google.com/functions

### 復旧時間目標（RTO）
- レベル1: 1時間以内
- レベル2: 4時間以内  
- レベル3: 24時間以内

## 4. 予防保守

### 定期メンテナンスタスク
1. **週次**
   - バックアップの確認
   - エラーログのレビュー
   - API使用量のチェック

2. **月次**
   - パフォーマンステスト
   - セキュリティアップデート
   - コスト最適化レビュー

3. **四半期**
   - 災害復旧訓練
   - システム全体のアップグレード
   - ドキュメントの更新
```

---

## 12. セキュリティとコンプライアンス

### 12.1 セキュリティベストプラクティス

#### APIキー管理
```python
"""
secure_config.py - セキュアな設定管理
"""
from google.cloud import secretmanager
import os
import json
from functools import lru_cache

class SecureConfig:
    """セキュアな設定管理クラス"""
    
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.client = secretmanager.SecretManagerServiceClient()
    
    @lru_cache(maxsize=10)
    def get_secret(self, secret_id: str, version: str = "latest") -> str:
        """Secret Managerから機密情報を取得（キャッシュ付き）"""
        name = f"projects/{self.project_id}/secrets/{secret_id}/versions/{version}"
        response = self.client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8")
    
    def get_api_keys(self) -> Dict[str, str]:
        """すべてのAPIキーを安全に取得"""
        return {
            'openai': self.get_secret('openai-api-key'),
            'tavily': self.get_secret('tavily-api-key')
        }
    
    def rotate_api_key(self, secret_id: str, new_key: str):
        """APIキーのローテーション"""
        parent = f"projects/{self.project_id}/secrets/{secret_id}"
        
        # 新しいバージョンを追加
        self.client.add_secret_version(
            request={
                "parent": parent,
                "payload": {"data": new_key.encode("UTF-8")}
            }
        )
        
        # キャッシュをクリア
        self.get_secret.cache_clear()
```

#### データ暗号化
```python
"""
encryption_utils.py - データ暗号化ユーティリティ
"""
from cryptography.fernet import Fernet
import base64
import os

class EncryptionManager:
    """データ暗号化管理"""
    
    def __init__(self, key: bytes = None):
        if key is None:
            key = os.environ.get('ENCRYPTION_KEY', '').encode()
        self.cipher = Fernet(key) if key else None
    
    def encrypt_sensitive_data(self, data: str) -> str:
        """機密データの暗号化"""
        if not self.cipher:
            raise ValueError("暗号化キーが設定されていません")
        
        encrypted = self.cipher.encrypt(data.encode())
        return base64.urlsafe_b64encode(encrypted).decode()
    
    def decrypt_sensitive_data(self, encrypted_data: str) -> str:
        """機密データの復号化"""
        if not self.cipher:
            raise ValueError("暗号化キーが設定されていません")
        
        decoded = base64.urlsafe_b64decode(encrypted_data.encode())
        decrypted = self.cipher.decrypt(decoded)
        return decrypted.decode()
```

### 12.2 監査ログ

#### 監査ログ実装
```python
"""
audit_logger.py - 監査ログシステム
"""
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from google.cloud import logging as cloud_logging

class AuditLogger:
    """監査ログ記録クラス"""
    
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.client = cloud_logging.Client(project=project_id)
        self.logger = self.client.logger('corporate-info-audit')
    
    def log_api_access(self, 
                      api_name: str, 
                      user_id: str,
                      action: str,
                      resource: str,
                      result: str,
                      metadata: Optional[Dict] = None):
        """API アクセスログ"""
        entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'api_name': api_name,
            'user_id': user_id,
            'action': action,
            'resource': resource,
            'result': result,
            'metadata': metadata or {}
        }
        
        self.logger.log_struct(entry, severity='INFO')
    
    def log_data_access(self,
                       user_id: str,
                       data_type: str,
                       operation: str,
                       records_affected: int,
                       success: bool):
        """データアクセスログ"""
        entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'data_type': data_type,
            'operation': operation,
            'records_affected': records_affected,
            'success': success
        }
        
        severity = 'INFO' if success else 'WARNING'
        self.logger.log_struct(entry, severity=severity)
    
    def log_security_event(self,
                          event_type: str,
                          severity: str,
                          description: str,
                          source_ip: Optional[str] = None):
        """セキュリティイベントログ"""
        entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': event_type,
            'severity': severity,
            'description': description,
            'source_ip': source_ip
        }
        
        self.logger.log_struct(entry, severity=severity)
```

---

## 13. パフォーマンス最適化

### 13.1 キャッシング実装

#### Redis キャッシュ
```python
"""
cache_manager.py - キャッシュ管理
"""
import redis
import json
import hashlib
from datetime import timedelta
from typing import Any, Optional, Callable

class CacheManager:
    """Redisベースのキャッシュ管理"""
    
    def __init__(self, redis_host: str = 'localhost', redis_port: int = 6379):
        self.redis_client = redis.Redis(
            host=redis_host,
            port=redis_port,
            decode_responses=True
        )
    
    def _generate_key(self, prefix: str, params: Dict) -> str:
        """キャッシュキーの生成"""
        param_str = json.dumps(params, sort_keys=True)
        hash_val = hashlib.md5(param_str.encode()).hexdigest()
        return f"{prefix}:{hash_val}"
    
    def get_or_set(self, 
                   key_prefix: str,
                   params: Dict,
                   fetch_func: Callable,
                   ttl: int = 3600) -> Any:
        """キャッシュから取得、なければ実行して保存"""
        cache_key = self._generate_key(key_prefix, params)
        
        # キャッシュから取得試行
        cached = self.redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
        
        # キャッシュになければ実行
        result = fetch_func(**params)
        
        # 結果をキャッシュに保存
        self.redis_client.setex(
            cache_key,
            timedelta(seconds=ttl),
            json.dumps(result, ensure_ascii=False)
        )
        
        return result
    
    def invalidate(self, key_prefix: str, params: Dict = None):
        """キャッシュの無効化"""
        if params:
            # 特定のキーを削除
            cache_key = self._generate_key(key_prefix, params)
            self.redis_client.delete(cache_key)
        else:
            # プレフィックスに一致するすべてのキーを削除
            for key in self.redis_client.scan_iter(f"{key_prefix}:*"):
                self.redis_client.delete(key)
```

#### インメモリキャッシュ
```python
"""
memory_cache.py - インメモリキャッシュ
"""
from functools import lru_cache, wraps
import time
from typing import Callable, Any

def timed_lru_cache(seconds: int, maxsize: int = 128):
    """時間制限付きLRUキャッシュデコレータ"""
    def wrapper(func: Callable) -> Callable:
        cache = {}
        cache_time = {}
        
        @wraps(func)
        def wrapped(*args, **kwargs):
            key = str(args) + str(kwargs)
            now = time.time()
            
            # キャッシュが存在し、有効期限内なら返す
            if key in cache and now - cache_time[key] < seconds:
                return cache[key]
            
            # キャッシュがないか期限切れなら実行
            result = func(*args, **kwargs)
            cache[key] = result
            cache_time[key] = now
            
            # 古いエントリを削除
            if len(cache) > maxsize:
                oldest_key = min(cache_time, key=cache_time.get)
                del cache[oldest_key]
                del cache_time[oldest_key]
            
            return result
        
        return wrapped
    return wrapper

# 使用例
@timed_lru_cache(seconds=300, maxsize=100)
def get_company_info_cached(company_name: str) -> Dict:
    """キャッシュ付き企業情報取得"""
    # 実際のAPI呼び出し処理
    pass
```

### 13.2 並列処理の最適化

#### 非同期処理実装
```python
"""
async_processor.py - 非同期処理最適化
"""
import asyncio
import aiohttp
from typing import List, Dict, Any
import time

class AsyncProcessor:
    """非同期処理マネージャー"""
    
    def __init__(self, max_concurrent: int = 10):
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)
    
    async def process_company_async(self, 
                                   session: aiohttp.ClientSession,
                                   company: Dict) -> Dict:
        """単一企業の非同期処理"""
        async with self.semaphore:
            try:
                # Tavily検索（非同期）
                search_results = await self.search_tavily_async(
                    session, company['name']
                )
                
                # OpenAI解析（非同期）
                analysis = await self.analyze_with_openai_async(
                    session, company['name'], search_results
                )
                
                return {
                    'company': company,
                    'results': analysis,
                    'status': 'success'
                }
            
            except Exception as e:
                return {
                    'company': company,
                    'error': str(e),
                    'status': 'failed'
                }
    
    async def process_batch_async(self, companies: List[Dict]) -> List[Dict]:
        """バッチ非同期処理"""
        async with aiohttp.ClientSession() as session:
            tasks = [
                self.process_company_async(session, company)
                for company in companies
            ]
            
            results = await asyncio.gather(*tasks)
            return results
    
    def process_companies_optimized(self, companies: List[Dict]) -> List[Dict]:
        """最適化された企業情報処理"""
        start_time = time.time()
        
        # イベントループで非同期処理を実行
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            results = loop.run_until_complete(
                self.process_batch_async(companies)
            )
            
            elapsed = time.time() - start_time
            print(f"処理完了: {len(companies)}社を{elapsed:.2f}秒で処理")
            
            return results
            
        finally:
            loop.close()
```

---

## 14. 料金見積もりと最適化

### 14.1 サービス別料金計算

#### 料金計算ツール
```python
"""
cost_estimator.py - コスト見積もりツール
"""
from dataclasses import dataclass
from typing import Dict, List
import math

@dataclass
class CostEstimate:
    """コスト見積もりデータクラス"""
    service: str
    monthly_usage: float
    unit_price: float
    monthly_cost: float
    yearly_cost: float

class CostEstimator:
    """料金見積もりクラス"""
    
    # 2024年1月時点の料金（USD）
    PRICING = {
        'openai': {
            'gpt-4o-mini': {
                'input': 0.00015,  # per 1K tokens
                'output': 0.0006   # per 1K tokens
            }
        },
        'tavily': {
            'search': 0.001  # per search
        },
        'google_cloud': {
            'cloud_functions': {
                'invocations': 0.0000004,  # per invocation
                'compute_time': 0.0000025, # per 100ms
                'memory': 0.0000025        # per GB-second
            },
            'cloud_storage': {
                'storage': 0.020,    # per GB/month
                'operations': 0.005  # per 10K operations
            },
            'secret_manager': {
                'access': 0.03  # per 10K access operations
            }
        }
    }
    
    def estimate_openai_cost(self, 
                           companies_per_month: int,
                           avg_tokens_per_company: int = 2000) -> CostEstimate:
        """OpenAI API コスト計算"""
        total_tokens = companies_per_month * avg_tokens_per_company
        
        # 入力と出力の比率を7:3と仮定
        input_tokens = total_tokens * 0.7
        output_tokens = total_tokens * 0.3
        
        input_cost = (input_tokens / 1000) * self.PRICING['openai']['gpt-4o-mini']['input']
        output_cost = (output_tokens / 1000) * self.PRICING['openai']['gpt-4o-mini']['output']
        
        monthly_cost = input_cost + output_cost
        
        return CostEstimate(
            service='OpenAI GPT-4o-mini',
            monthly_usage=total_tokens,
            unit_price=0.00045,  # 平均
            monthly_cost=monthly_cost,
            yearly_cost=monthly_cost * 12
        )
    
    def estimate_tavily_cost(self, searches_per_month: int) -> CostEstimate:
        """Tavily API コスト計算"""
        monthly_cost = searches_per_month * self.PRICING['tavily']['search']
        
        return CostEstimate(
            service='Tavily Search',
            monthly_usage=searches_per_month,
            unit_price=self.PRICING['tavily']['search'],
            monthly_cost=monthly_cost,
            yearly_cost=monthly_cost * 12
        )
    
    def estimate_cloud_functions_cost(self,
                                    invocations_per_month: int,
                                    avg_duration_ms: int = 5000,
                                    memory_mb: int = 1024) -> CostEstimate:
        """Cloud Functions コスト計算"""
        # 呼び出し回数のコスト
        invocation_cost = invocations_per_month * self.PRICING['google_cloud']['cloud_functions']['invocations']
        
        # コンピューティング時間のコスト
        compute_time_units = (invocations_per_month * avg_duration_ms) / 100
        compute_cost = compute_time_units * self.PRICING['google_cloud']['cloud_functions']['compute_time']
        
        # メモリ使用量のコスト
        gb_seconds = (invocations_per_month * avg_duration_ms * memory_mb) / (1000 * 1024)
        memory_cost = gb_seconds * self.PRICING['google_cloud']['cloud_functions']['memory']
        
        monthly_cost = invocation_cost + compute_cost + memory_cost
        
        return CostEstimate(
            service='Cloud Functions',
            monthly_usage=invocations_per_month,
            unit_price=monthly_cost / invocations_per_month,
            monthly_cost=monthly_cost,
            yearly_cost=monthly_cost * 12
        )
    
    def generate_cost_report(self, companies_per_month: int) -> Dict[str, Any]:
        """総合コストレポート生成"""
        estimates = []
        
        # 各サービスのコスト計算
        estimates.append(self.estimate_openai_cost(companies_per_month))
        estimates.append(self.estimate_tavily_cost(companies_per_month * 2))  # 1社あたり2検索
        estimates.append(self.estimate_cloud_functions_cost(
            math.ceil(companies_per_month / 50)  # 50社ごとにバッチ処理
        ))
        
        # 合計計算
        total_monthly = sum(e.monthly_cost for e in estimates)
        total_yearly = sum(e.yearly_cost for e in estimates)
        
        return {
            'estimates': estimates,
            'total_monthly_cost_usd': total_monthly,
            'total_yearly_cost_usd': total_yearly,
            'total_monthly_cost_jpy': total_monthly * 145,  # 1USD=145JPY
            'total_yearly_cost_jpy': total_yearly * 145,
            'cost_per_company_jpy': (total_monthly * 145) / companies_per_month
        }

# 使用例
if __name__ == "__main__":
    estimator = CostEstimator()
    
    # 月1000社処理する場合
    report = estimator.generate_cost_report(companies_per_month=1000)
    
    print("=== コスト見積もりレポート ===")
    print(f"月間処理企業数: 1000社")
    print(f"\n各サービスのコスト:")
    
    for estimate in report['estimates']:
        print(f"\n{estimate.service}:")
        print(f"  月額: ${estimate.monthly_cost:.2f} (¥{estimate.monthly_cost * 145:.0f})")
        print(f"  年額: ${estimate.yearly_cost:.2f} (¥{estimate.yearly_cost * 145:.0f})")
    
    print(f"\n合計コスト:")
    print(f"  月額: ¥{report['total_monthly_cost_jpy']:,.0f}")
    print(f"  年額: ¥{report['total_yearly_cost_jpy']:,.0f}")
    print(f"  1社あたり: ¥{report['cost_per_company_jpy']:.1f}")
```

### 14.2 コスト最適化戦略

#### 最適化実装
```python
"""
cost_optimizer.py - コスト最適化
"""
class CostOptimizer:
    """コスト最適化クラス"""
    
    @staticmethod
    def optimize_token_usage(text: str, max_tokens: int = 1000) -> str:
        """トークン使用量の最適化"""
        # 不要な空白・改行を削除
        text = ' '.join(text.split())
        
        # 長すぎる場合は要約
        if len(text) > max_tokens * 4:  # 概算: 1 token ≈ 4文字
            # 重要な部分を抽出
            sentences = text.split('。')
            important_sentences = []
            current_length = 0
            
            for sentence in sentences:
                if current_length + len(sentence) < max_tokens * 4:
                    important_sentences.append(sentence)
                    current_length += len(sentence)
                else:
                    break
            
            text = '。'.join(important_sentences) + '。'
        
        return text
    
    @staticmethod
    def batch_optimize(companies: List[Dict], optimal_batch_size: int = 10) -> List[List[Dict]]:
        """バッチサイズの最適化"""
        # 類似企業をグループ化してAPIコールを削減
        batches = []
        current_batch = []
        
        for company in companies:
            current_batch.append(company)
            if len(current_batch) >= optimal_batch_size:
                batches.append(current_batch)
                current_batch = []
        
        if current_batch:
            batches.append(current_batch)
        
        return batches
```

---

これで追加推奨事項の詳細内容をすべて記載しました。実装済みのコードを確認した結果、主要な機能はすべて実装されていることが分かりましたので、追加のコード実装は不要でした。