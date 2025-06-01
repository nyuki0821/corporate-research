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