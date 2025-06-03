#!/usr/bin/env python3
"""
インターフェースの動作確認テスト
"""

import os
import sys

def test_imports():
    """必要なモジュールがインポートできるか確認"""
    print("📦 モジュールのインポートテスト...")
    
    try:
        import flask
        print("✓ Flask: OK")
    except ImportError:
        print("✗ Flask: インストールが必要です (pip install flask)")
        
    try:
        import colorama
        print("✓ Colorama: OK")
    except ImportError:
        print("✗ Colorama: インストールが必要です (pip install colorama)")
        
    try:
        from modules.workflow import CompanyInfoWorkflow
        print("✓ Workflow モジュール: OK")
    except ImportError as e:
        print(f"✗ Workflow モジュール: {e}")
        
    try:
        from modules.sheets_client import SheetsClient
        print("✓ Sheets Client モジュール: OK")
    except ImportError as e:
        print(f"✗ Sheets Client モジュール: {e}")

def test_config():
    """設定の確認"""
    print("\n🔧 設定の確認...")
    
    # 環境変数のチェック
    env_vars = {
        'OPENAI_API_KEY': os.environ.get('OPENAI_API_KEY'),
        'TAVILY_API_KEY': os.environ.get('TAVILY_API_KEY'),
        'GCP_PROJECT': os.environ.get('GCP_PROJECT', 'Not set (using default)'),
    }
    
    for key, value in env_vars.items():
        if value and value != 'Not set (using default)':
            # APIキーは一部だけ表示
            if 'KEY' in key:
                display_value = value[:8] + '...' if len(value) > 8 else value
            else:
                display_value = value
            print(f"✓ {key}: {display_value}")
        else:
            print(f"✗ {key}: {value}")

def test_cli():
    """CLIの基本テスト"""
    print("\n🖥️  CLIインターフェースのテスト...")
    
    try:
        from cli import CorporateResearchCLI
        cli = CorporateResearchCLI()
        print("✓ CLI インスタンス作成: OK")
        
        # 設定ファイルのパスを確認
        print(f"  設定ファイルパス: {cli.config_file}")
        
    except Exception as e:
        print(f"✗ CLI テストエラー: {e}")

def test_web():
    """Web UIの基本テスト"""
    print("\n🌐 Web UIのテスト...")
    
    try:
        from web_ui import app
        print("✓ Flask アプリケーション: OK")
        print(f"  ルート数: {len(app.url_map._rules)}")
        
        # テンプレートディレクトリの確認
        if os.path.exists('templates/index.html'):
            print("✓ テンプレートファイル: OK")
        else:
            print("✗ テンプレートファイル: 見つかりません")
            
    except Exception as e:
        print(f"✗ Web UI テストエラー: {e}")

def main():
    print("="*50)
    print("企業情報収集システム - インターフェーステスト")
    print("="*50)
    
    test_imports()
    test_config()
    test_cli()
    test_web()
    
    print("\n" + "="*50)
    print("テスト完了")
    print("="*50)
    
    # 問題がある場合のアドバイス
    if not os.environ.get('OPENAI_API_KEY') or not os.environ.get('TAVILY_API_KEY'):
        print("\n⚠️  APIキーが設定されていません。")
        print("以下のコマンドで環境変数を設定してください:")
        print("export OPENAI_API_KEY='your-key-here'")
        print("export TAVILY_API_KEY='your-key-here'")

if __name__ == '__main__':
    main()