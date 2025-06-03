#!/usr/bin/env python3
"""
Corporate Research CLI - 企業情報収集システムのコマンドラインインターフェース

使用例:
    python cli.py --spreadsheet-id YOUR_SHEET_ID --input-range "Sheet1!A2:B" --output-range "Sheet1!C2:Z"
    python cli.py --config config.json
    python cli.py --interactive
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from typing import Dict, Any, List
import logging
from pathlib import Path

from modules.workflow import CompanyInfoWorkflow
from modules.sheets_client import SheetsClient
from config import Config

# カラー出力用のANSIコード
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'

# シンプルなプログレスバー
def show_progress(current: int, total: int, message: str = ""):
    percentage = (current / total) * 100 if total > 0 else 0
    bar_length = 40
    filled_length = int(bar_length * current / total) if total > 0 else 0
    bar = '█' * filled_length + '-' * (bar_length - filled_length)
    
    sys.stdout.write(f'\r{Colors.CYAN}進捗: |{bar}| {percentage:.1f}% {message}{Colors.END}')
    sys.stdout.flush()
    
    if current == total:
        print()  # 改行

class CorporateResearchCLI:
    def __init__(self):
        self.config_file = Path.home() / '.corporate_research_config.json'
        self.logger = self._setup_logger()
        
    def _setup_logger(self):
        """ロガーの設定"""
        logger = logging.getLogger('CorporateResearchCLI')
        logger.setLevel(logging.INFO)
        
        # コンソールハンドラー
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)
        
        # フォーマッター
        formatter = logging.Formatter('[%(asctime)s] %(levelname)s: %(message)s', 
                                    datefmt='%Y-%m-%d %H:%M:%S')
        ch.setFormatter(formatter)
        
        logger.addHandler(ch)
        return logger
    
    def save_config(self, config: Dict[str, Any]):
        """設定をファイルに保存"""
        with open(self.config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        self.logger.info(f"設定を保存しました: {self.config_file}")
    
    def load_config(self) -> Dict[str, Any]:
        """設定をファイルから読み込み"""
        if self.config_file.exists():
            with open(self.config_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    
    def interactive_mode(self):
        """対話式モード"""
        print(f"\n{Colors.HEADER}{Colors.BOLD}=== 企業情報収集システム ==={Colors.END}\n")
        
        # 保存された設定を読み込み
        saved_config = self.load_config()
        
        # Google Sheets ID
        default_sheet_id = saved_config.get('spreadsheet_id', '')
        spreadsheet_id = input(f"Google Sheets ID [{default_sheet_id}]: ").strip()
        if not spreadsheet_id:
            spreadsheet_id = default_sheet_id
        
        if not spreadsheet_id:
            print(f"{Colors.RED}エラー: Google Sheets IDが必要です{Colors.END}")
            return
        
        # 入力範囲
        default_input = saved_config.get('input_range', 'Sheet1!A2:B')
        input_range = input(f"入力範囲 (企業名と電話番号) [{default_input}]: ").strip()
        if not input_range:
            input_range = default_input
        
        # 出力範囲
        default_output = saved_config.get('output_range', 'Sheet1!C2:Z')
        output_range = input(f"出力範囲 [{default_output}]: ").strip()
        if not output_range:
            output_range = default_output
        
        # 設定を保存するか確認
        save = input("\nこの設定を保存しますか？ (y/n) [y]: ").strip().lower()
        if save != 'n':
            self.save_config({
                'spreadsheet_id': spreadsheet_id,
                'input_range': input_range,
                'output_range': output_range
            })
        
        # 処理実行
        print(f"\n{Colors.YELLOW}処理を開始します...{Colors.END}\n")
        self.run_collection(spreadsheet_id, input_range, output_range)
    
    def run_collection(self, spreadsheet_id: str, input_range: str, output_range: str):
        """企業情報収集を実行"""
        start_time = time.time()
        
        try:
            # 設定とクライアントの初期化
            config = Config()
            sheets_client = SheetsClient(config)
            workflow = CompanyInfoWorkflow(config)
            
            # APIキーの確認
            if not config.tavily_api_key or not config.openai_api_key:
                print(f"{Colors.RED}エラー: APIキーが設定されていません{Colors.END}")
                print("\n以下の環境変数を設定してください:")
                print("  - TAVILY_API_KEY: Tavily APIキー")
                print("  - OPENAI_API_KEY: OpenAI APIキー")
                return
            
            # 企業名リストの取得
            print(f"{Colors.BLUE}Google Sheetsから企業リストを取得中...{Colors.END}")
            company_data = sheets_client.read_company_names(spreadsheet_id, input_range)
            
            if not company_data:
                print(f"{Colors.YELLOW}指定された範囲に企業名が見つかりませんでした{Colors.END}")
                return
            
            print(f"{Colors.GREEN}✓ {len(company_data)}社の企業を検出しました{Colors.END}\n")
            
            # バッチ処理
            results = []
            batch_size = config.BATCH_SIZE
            total_batches = (len(company_data) + batch_size - 1) // batch_size
            
            for i in range(0, len(company_data), batch_size):
                batch = company_data[i:i + batch_size]
                batch_num = i // batch_size + 1
                
                print(f"{Colors.CYAN}バッチ {batch_num}/{total_batches} を処理中...{Colors.END}")
                
                # 各企業の処理
                batch_results = []
                for j, company_info in enumerate(batch):
                    company_name = company_info.get('name', 'Unknown')
                    show_progress(j + 1, len(batch), f"- {company_name}")
                    
                    # 実際の処理
                    result = workflow.process_single_company(company_name)
                    batch_results.append(result)
                
                results.extend(batch_results)
                
                # 成功率の表示
                success_count = sum(1 for r in batch_results if r.get('reliability_score', 0) > 0.7)
                print(f"{Colors.GREEN}✓ バッチ完了: {success_count}/{len(batch_results)}社成功{Colors.END}\n")
            
            # 結果をGoogle Sheetsに書き込み
            print(f"{Colors.BLUE}結果をGoogle Sheetsに書き込み中...{Colors.END}")
            rows_updated = sheets_client.write_results(spreadsheet_id, output_range, results)
            
            # 処理完了
            elapsed_time = time.time() - start_time
            minutes = int(elapsed_time // 60)
            seconds = int(elapsed_time % 60)
            
            success_total = sum(1 for r in results if r.get('reliability_score', 0) > 0.7)
            success_rate = (success_total / len(results) * 100) if results else 0
            
            print(f"\n{Colors.GREEN}{Colors.BOLD}=== 処理完了 ==={Colors.END}")
            print(f"処理時間: {minutes}分{seconds}秒")
            print(f"処理企業数: {len(results)}社")
            print(f"成功率: {success_rate:.1f}% ({success_total}/{len(results)})")
            print(f"更新行数: {rows_updated}")
            
            # エラーがあった企業のリスト
            failed_companies = [r for r in results if r.get('reliability_score', 0) <= 0.7]
            if failed_companies:
                print(f"\n{Colors.YELLOW}処理に失敗した企業:{Colors.END}")
                for company in failed_companies[:5]:  # 最初の5社のみ表示
                    print(f"  - {company.get('company_name', 'Unknown')}: {company.get('error', 'エラー詳細なし')}")
                if len(failed_companies) > 5:
                    print(f"  ... 他{len(failed_companies) - 5}社")
            
        except Exception as e:
            self.logger.error(f"処理中にエラーが発生しました: {str(e)}")
            print(f"{Colors.RED}エラー: {str(e)}{Colors.END}")

def main():
    parser = argparse.ArgumentParser(
        description='企業情報収集システムのコマンドラインインターフェース',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用例:
  # 対話式モードで実行
  python cli.py --interactive
  
  # パラメータを指定して実行
  python cli.py --spreadsheet-id YOUR_SHEET_ID --input-range "Sheet1!A2:B" --output-range "Sheet1!C2:Z"
  
  # 設定ファイルを使用
  python cli.py --config config.json
        """
    )
    
    parser.add_argument('-i', '--interactive', action='store_true',
                       help='対話式モードで実行')
    parser.add_argument('-s', '--spreadsheet-id', type=str,
                       help='Google Sheets ID')
    parser.add_argument('-in', '--input-range', type=str,
                       help='入力範囲 (例: Sheet1!A2:B)')
    parser.add_argument('-out', '--output-range', type=str,
                       help='出力範囲 (例: Sheet1!C2:Z)')
    parser.add_argument('-c', '--config', type=str,
                       help='設定ファイルのパス')
    
    args = parser.parse_args()
    
    cli = CorporateResearchCLI()
    
    if args.interactive or (not args.spreadsheet_id and not args.config):
        # 対話式モード
        cli.interactive_mode()
    elif args.config:
        # 設定ファイルから読み込み
        try:
            with open(args.config, 'r', encoding='utf-8') as f:
                config = json.load(f)
            cli.run_collection(
                config['spreadsheet_id'],
                config['input_range'],
                config['output_range']
            )
        except Exception as e:
            print(f"{Colors.RED}設定ファイルの読み込みエラー: {str(e)}{Colors.END}")
    else:
        # コマンドライン引数から実行
        if not all([args.spreadsheet_id, args.input_range, args.output_range]):
            parser.error('--spreadsheet-id, --input-range, --output-range は必須です')
        
        cli.run_collection(args.spreadsheet_id, args.input_range, args.output_range)

if __name__ == '__main__':
    main()