# サーバーデプロイメントガイド

このガイドでは、企業情報収集システムをサーバーにデプロイする方法を説明します。

## 目次

1. [デプロイメントオプション](#デプロイメントオプション)
2. [環境設定](#環境設定)
3. [Google Cloud Functions](#google-cloud-functions)
4. [Dockerデプロイメント](#dockerデプロイメント)
5. [Linux サーバー (systemd)](#linux-サーバー-systemd)
6. [セキュリティ設定](#セキュリティ設定)
7. [モニタリング](#モニタリング)

## デプロイメントオプション

### 1. Google Cloud Functions (サーバーレス)
- **メリット**: 自動スケーリング、メンテナンス不要、従量課金
- **推奨**: 不定期な使用、バースト的な負荷

### 2. Docker コンテナ
- **メリット**: ポータブル、環境の一貫性、簡単なデプロイ
- **推奨**: クラウドプラットフォーム、Kubernetes環境

### 3. 従来のLinuxサーバー
- **メリット**: 完全な制御、カスタマイズ可能
- **推奨**: オンプレミス環境、専用サーバー

## 環境設定

### 必要な環境変数

```bash
# API キー
TAVILY_API_KEY=your_tavily_api_key
OPENAI_API_KEY=your_openai_api_key

# Google Cloud設定
GCP_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# 処理設定
BATCH_SIZE=10
PROCESSING_TIMEOUT=30
MAX_RETRIES=3
```

### 環境変数の設定方法

1. `.env.example` を `.env` にコピー
2. 各値を実際の値に置き換え
3. 本番環境では環境変数管理システムを使用

## Google Cloud Functions

### 前提条件
- Google Cloud プロジェクト
- gcloud CLI インストール済み
- 適切な権限（Cloud Functions Developer、Secret Manager Admin）

### デプロイ手順

1. **Google Cloud にログイン**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Secret Manager でAPIキーを設定**
   ```bash
   # Tavily API キー
   echo -n "your-tavily-api-key" | gcloud secrets create tavily-api-key --data-file=-
   
   # OpenAI API キー
   echo -n "your-openai-api-key" | gcloud secrets create openai-api-key --data-file=-
   
   # Google Sheets 認証情報（オプション）
   gcloud secrets create google-sheets-credentials --data-file=path/to/credentials.json
   ```

3. **デプロイスクリプトを実行**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

4. **動作確認**
   ```bash
   # ヘルスチェック
   curl https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/health_check
   ```

## Dockerデプロイメント

### 単一コンテナでの起動

1. **イメージをビルド**
   ```bash
   docker build -t corporate-research:latest .
   ```

2. **コンテナを起動**
   ```bash
   docker run -d \
     --name corporate-research \
     -p 8080:8080 \
     -e TAVILY_API_KEY=your_key \
     -e OPENAI_API_KEY=your_key \
     -v $(pwd)/credentials:/app/credentials:ro \
     corporate-research:latest
   ```

### Docker Compose での起動

1. **環境変数を設定**
   ```bash
   cp .env.example .env
   # .env ファイルを編集して実際の値を設定
   ```

2. **サービスを起動**
   ```bash
   docker-compose up -d
   ```

3. **ログを確認**
   ```bash
   docker-compose logs -f web
   ```

4. **停止**
   ```bash
   docker-compose down
   ```

### Kubernetesへのデプロイ

1. **イメージをレジストリにプッシュ**
   ```bash
   docker tag corporate-research:latest gcr.io/YOUR_PROJECT/corporate-research:latest
   docker push gcr.io/YOUR_PROJECT/corporate-research:latest
   ```

2. **Kubernetesマニフェストを適用**
   ```bash
   kubectl apply -f k8s/
   ```

## Linux サーバー (systemd)

### 前提条件
- Ubuntu 20.04+ または CentOS 8+
- Python 3.11+
- nginx (リバースプロキシ用)

### セットアップ手順

1. **アプリケーション用ユーザーを作成**
   ```bash
   sudo useradd -m -s /bin/bash corporate-research
   sudo mkdir -p /opt/corporate-research
   sudo chown corporate-research:corporate-research /opt/corporate-research
   ```

2. **アプリケーションをデプロイ**
   ```bash
   sudo su - corporate-research
   cd /opt/corporate-research
   git clone https://github.com/nyuki0821/corporate-research.git .
   ```

3. **Python仮想環境をセットアップ**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   pip install flask flask-cors python-dotenv
   ```

4. **環境変数を設定**
   ```bash
   cp .env.example .env
   # .env を編集
   chmod 600 .env
   ```

5. **systemdサービスをインストール**
   ```bash
   sudo cp systemd/corporate-research.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable corporate-research
   sudo systemctl start corporate-research
   ```

6. **Nginxを設定**
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/corporate-research
   sudo ln -s /etc/nginx/sites-available/corporate-research /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

7. **ステータスを確認**
   ```bash
   sudo systemctl status corporate-research
   curl http://localhost:8080/api/health
   ```

## セキュリティ設定

### 1. HTTPS の設定

Let's Encrypt を使用した無料SSL証明書：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 2. ファイアウォール設定

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 3. API認証（推奨）

環境変数に認証トークンを追加：

```bash
API_AUTH_TOKEN=your-secure-token
```

### 4. レート制限

Nginx設定で既に実装済み（10リクエスト/秒）

## モニタリング

### ヘルスチェック

```bash
# ローカル
curl http://localhost:8080/api/health

# 本番環境
curl https://your-domain.com/api/health
```

### ログの確認

**Docker:**
```bash
docker logs corporate-research
docker-compose logs -f web
```

**systemd:**
```bash
sudo journalctl -u corporate-research -f
```

**アプリケーションログ:**
```bash
tail -f /opt/corporate-research/logs/app.log
```

### メトリクス監視（推奨）

1. **Prometheus + Grafana**
   - `/metrics` エンドポイントを追加
   - Prometheusでスクレイピング
   - Grafanaでダッシュボード作成

2. **Google Cloud Monitoring** (GCF使用時)
   - 自動的にメトリクスを収集
   - カスタムメトリクスも追加可能

3. **Sentry** (エラートラッキング)
   ```bash
   SENTRY_DSN=your-sentry-dsn
   ```

## トラブルシューティング

### よくある問題

1. **APIキーエラー**
   - 環境変数が正しく設定されているか確認
   - Secret Managerの権限を確認（GCF）

2. **メモリ不足**
   - `BATCH_SIZE`を減らす
   - コンテナ/VMのメモリを増やす

3. **タイムアウト**
   - `PROCESSING_TIMEOUT`を増やす
   - nginx/プロキシのタイムアウトも調整

4. **接続エラー**
   - ファイアウォール設定を確認
   - ポートが正しく開いているか確認

### サポート

問題が解決しない場合は、[GitHubのIssue](https://github.com/nyuki0821/corporate-research/issues)で報告してください。