#!/usr/bin/env python3
"""
Corporate Research Web UI - 企業情報収集システムのWebインターフェース

使用方法:
    python web_ui.py
    
ブラウザで http://localhost:5000 にアクセス
"""

from flask import Flask, render_template, request, jsonify, session, Response
import json
import os
import time
import threading
import queue
import uuid
from datetime import datetime
from typing import Dict, Any, List

from modules.workflow import CompanyInfoWorkflow
from modules.sheets_client import SheetsClient
from config import Config

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'corporate-research-secret-key')

# 処理状態を管理
processing_status = {}
processing_queues = {}

class ProcessingStatus:
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.status = 'pending'
        self.progress = 0
        self.total = 0
        self.current_company = ''
        self.messages = []
        self.results = []
        self.error = None
        self.start_time = time.time()
        
    def to_dict(self):
        elapsed_time = time.time() - self.start_time
        return {
            'task_id': self.task_id,
            'status': self.status,
            'progress': self.progress,
            'total': self.total,
            'current_company': self.current_company,
            'messages': self.messages[-10:],  # 最新10件のメッセージ
            'elapsed_time': f"{int(elapsed_time)}秒",
            'error': self.error
        }

def process_companies_background(task_id: str, spreadsheet_id: str, 
                               input_range: str, output_range: str):
    """バックグラウンドで企業情報を処理"""
    status = processing_status[task_id]
    
    try:
        status.status = 'initializing'
        status.messages.append("システムを初期化中...")
        
        # 設定とクライアントの初期化
        config = Config()
        sheets_client = SheetsClient(config)
        workflow = CompanyInfoWorkflow(config)
        
        # APIキーの確認
        if not config.tavily_api_key or not config.openai_api_key:
            raise Exception("APIキーが設定されていません")
        
        # 企業リストの取得
        status.messages.append("Google Sheetsから企業リストを取得中...")
        company_data = sheets_client.read_company_names(spreadsheet_id, input_range)
        
        if not company_data:
            raise Exception("指定された範囲に企業名が見つかりませんでした")
        
        status.total = len(company_data)
        status.messages.append(f"{len(company_data)}社の企業を検出しました")
        status.status = 'processing'
        
        # バッチ処理
        results = []
        batch_size = config.BATCH_SIZE
        
        for i in range(0, len(company_data), batch_size):
            batch = company_data[i:i + batch_size]
            batch_num = i // batch_size + 1
            total_batches = (len(company_data) + batch_size - 1) // batch_size
            
            status.messages.append(f"バッチ {batch_num}/{total_batches} を処理中...")
            
            # 各企業の処理
            for j, company_info in enumerate(batch):
                company_name = company_info.get('name', 'Unknown')
                status.current_company = company_name
                status.progress = i + j + 1
                
                # 実際の処理
                result = workflow.process_single_company(company_name)
                results.append(result)
                
                if result.get('reliability_score', 0) > 0.7:
                    status.messages.append(f"✓ {company_name} の処理が完了しました")
                else:
                    status.messages.append(f"✗ {company_name} の処理に失敗しました")
        
        status.results = results
        
        # 結果をGoogle Sheetsに書き込み
        status.messages.append("結果をGoogle Sheetsに書き込み中...")
        rows_updated = sheets_client.write_results(spreadsheet_id, output_range, results)
        
        # 処理完了
        success_count = sum(1 for r in results if r.get('reliability_score', 0) > 0.7)
        success_rate = (success_count / len(results) * 100) if results else 0
        
        status.status = 'completed'
        status.messages.append(f"処理が完了しました！")
        status.messages.append(f"成功率: {success_rate:.1f}% ({success_count}/{len(results)})")
        status.messages.append(f"更新行数: {rows_updated}")
        
    except Exception as e:
        status.status = 'error'
        status.error = str(e)
        status.messages.append(f"エラー: {str(e)}")

@app.route('/')
def index():
    """メインページ"""
    return render_template('index.html')

@app.route('/api/start_processing', methods=['POST'])
def start_processing():
    """処理開始API"""
    data = request.json
    
    # 入力検証
    spreadsheet_id = data.get('spreadsheet_id')
    input_range = data.get('input_range')
    output_range = data.get('output_range')
    
    if not all([spreadsheet_id, input_range, output_range]):
        return jsonify({'error': '必須パラメータが不足しています'}), 400
    
    # タスクIDの生成
    task_id = str(uuid.uuid4())
    
    # 処理状態の初期化
    processing_status[task_id] = ProcessingStatus(task_id)
    
    # バックグラウンド処理の開始
    thread = threading.Thread(
        target=process_companies_background,
        args=(task_id, spreadsheet_id, input_range, output_range)
    )
    thread.start()
    
    return jsonify({'task_id': task_id})

@app.route('/api/status/<task_id>')
def get_status(task_id):
    """処理状態の取得API"""
    if task_id not in processing_status:
        return jsonify({'error': 'タスクが見つかりません'}), 404
    
    return jsonify(processing_status[task_id].to_dict())

@app.route('/api/download_results/<task_id>')
def download_results(task_id):
    """結果のダウンロードAPI"""
    if task_id not in processing_status:
        return jsonify({'error': 'タスクが見つかりません'}), 404
    
    status = processing_status[task_id]
    if status.status != 'completed':
        return jsonify({'error': '処理が完了していません'}), 400
    
    # CSV形式で結果を返す
    csv_content = "企業名,業種,従業員数,設立年,資本金,上場区分,本社所在地,代表者名,信頼性スコア\n"
    for result in status.results:
        csv_content += f"{result.get('company_name', '')},{result.get('industry_classification', '')},{result.get('employee_count', '')},{result.get('establishment_year', '')},{result.get('capital', '')},{result.get('listing_status', '')},{result.get('headquarters_location', '')},{result.get('executive_info', '')},{result.get('reliability_score', '')}\n"
    
    return Response(
        csv_content,
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename=corporate_research_{task_id}.csv"}
    )

# テンプレートを作成
os.makedirs('templates', exist_ok=True)

with open('templates/index.html', 'w', encoding='utf-8') as f:
    f.write('''<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>企業情報収集システム</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #555;
        }
        input[type="text"] {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            box-sizing: border-box;
        }
        input[type="text"]:focus {
            outline: none;
            border-color: #3498db;
        }
        .help-text {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
        }
        button {
            background-color: #3498db;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        button:hover {
            background-color: #2980b9;
        }
        button:disabled {
            background-color: #bdc3c7;
            cursor: not-allowed;
        }
        .progress-container {
            display: none;
            margin-top: 30px;
            padding: 20px;
            background-color: #ecf0f1;
            border-radius: 4px;
        }
        .progress-bar {
            width: 100%;
            height: 30px;
            background-color: #ddd;
            border-radius: 15px;
            overflow: hidden;
            margin-bottom: 10px;
        }
        .progress-fill {
            height: 100%;
            background-color: #3498db;
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        .status-message {
            margin-top: 10px;
            padding: 10px;
            background-color: #fff;
            border-radius: 4px;
            max-height: 200px;
            overflow-y: auto;
        }
        .message-item {
            padding: 5px 0;
            border-bottom: 1px solid #eee;
            font-size: 14px;
        }
        .error {
            color: #e74c3c;
            font-weight: bold;
        }
        .success {
            color: #27ae60;
            font-weight: bold;
        }
        .info-box {
            background-color: #e8f4f8;
            border-left: 4px solid #3498db;
            padding: 15px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏢 企業情報収集システム</h1>
        
        <div class="info-box">
            <strong>使い方:</strong> Google SheetsのIDと範囲を指定して、企業情報を自動収集します。
            収集した情報は指定した出力範囲に自動的に書き込まれます。
        </div>
        
        <form id="processingForm">
            <div class="form-group">
                <label for="spreadsheet_id">Google Sheets ID</label>
                <input type="text" id="spreadsheet_id" name="spreadsheet_id" required 
                       placeholder="例: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms">
                <div class="help-text">Google SheetsのURLから抽出できるIDを入力してください</div>
            </div>
            
            <div class="form-group">
                <label for="input_range">入力範囲（企業名と電話番号）</label>
                <input type="text" id="input_range" name="input_range" required 
                       placeholder="例: Sheet1!A2:B">
                <div class="help-text">企業名（A列）と電話番号（B列）が含まれる範囲</div>
            </div>
            
            <div class="form-group">
                <label for="output_range">出力範囲</label>
                <input type="text" id="output_range" name="output_range" required 
                       placeholder="例: Sheet1!C2:Z">
                <div class="help-text">収集した情報を書き込む範囲</div>
            </div>
            
            <button type="submit" id="submitButton">処理を開始</button>
        </form>
        
        <div id="progressContainer" class="progress-container">
            <h3>処理状況</h3>
            <div class="progress-bar">
                <div id="progressFill" class="progress-fill" style="width: 0%">0%</div>
            </div>
            <div id="currentCompany"></div>
            <div id="elapsedTime"></div>
            <div id="statusMessage" class="status-message"></div>
            <button id="downloadButton" style="display: none; margin-top: 10px;">結果をダウンロード</button>
        </div>
    </div>
    
    <script>
        let currentTaskId = null;
        let statusCheckInterval = null;
        
        document.getElementById('processingForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                spreadsheet_id: document.getElementById('spreadsheet_id').value,
                input_range: document.getElementById('input_range').value,
                output_range: document.getElementById('output_range').value
            };
            
            // 処理開始
            document.getElementById('submitButton').disabled = true;
            document.getElementById('progressContainer').style.display = 'block';
            document.getElementById('statusMessage').innerHTML = '';
            
            try {
                const response = await fetch('/api/start_processing', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    currentTaskId = data.task_id;
                    startStatusChecking();
                } else {
                    throw new Error(data.error || '処理の開始に失敗しました');
                }
            } catch (error) {
                alert('エラー: ' + error.message);
                document.getElementById('submitButton').disabled = false;
                document.getElementById('progressContainer').style.display = 'none';
            }
        });
        
        function startStatusChecking() {
            statusCheckInterval = setInterval(async () => {
                try {
                    const response = await fetch(`/api/status/${currentTaskId}`);
                    const status = await response.json();
                    
                    updateProgressDisplay(status);
                    
                    if (status.status === 'completed' || status.status === 'error') {
                        clearInterval(statusCheckInterval);
                        document.getElementById('submitButton').disabled = false;
                        
                        if (status.status === 'completed') {
                            document.getElementById('downloadButton').style.display = 'block';
                        }
                    }
                } catch (error) {
                    console.error('Status check error:', error);
                }
            }, 1000);
        }
        
        function updateProgressDisplay(status) {
            // プログレスバー更新
            const percentage = status.total > 0 ? (status.progress / status.total * 100) : 0;
            document.getElementById('progressFill').style.width = percentage + '%';
            document.getElementById('progressFill').textContent = Math.round(percentage) + '%';
            
            // 現在処理中の企業
            if (status.current_company) {
                document.getElementById('currentCompany').textContent = 
                    `処理中: ${status.current_company}`;
            }
            
            // 経過時間
            document.getElementById('elapsedTime').textContent = 
                `経過時間: ${status.elapsed_time}`;
            
            // メッセージ更新
            const messageContainer = document.getElementById('statusMessage');
            messageContainer.innerHTML = status.messages.map(msg => {
                let className = 'message-item';
                if (msg.includes('エラー') || msg.includes('✗')) {
                    className += ' error';
                } else if (msg.includes('✓') || msg.includes('完了')) {
                    className += ' success';
                }
                return `<div class="${className}">${msg}</div>`;
            }).join('');
            
            // 自動スクロール
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }
        
        document.getElementById('downloadButton').addEventListener('click', () => {
            window.location.href = `/api/download_results/${currentTaskId}`;
        });
        
        // ローカルストレージから以前の設定を復元
        window.addEventListener('load', () => {
            const savedConfig = localStorage.getItem('corporateResearchConfig');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                document.getElementById('spreadsheet_id').value = config.spreadsheet_id || '';
                document.getElementById('input_range').value = config.input_range || '';
                document.getElementById('output_range').value = config.output_range || '';
            }
        });
        
        // 設定を保存
        document.getElementById('processingForm').addEventListener('input', () => {
            const config = {
                spreadsheet_id: document.getElementById('spreadsheet_id').value,
                input_range: document.getElementById('input_range').value,
                output_range: document.getElementById('output_range').value
            };
            localStorage.setItem('corporateResearchConfig', JSON.stringify(config));
        });
    </script>
</body>
</html>''')

if __name__ == '__main__':
    print("企業情報収集システム Web UI")
    print("ブラウザで http://localhost:5000 にアクセスしてください")
    print("終了するには Ctrl+C を押してください")
    app.run(debug=True, host='0.0.0.0', port=5000)