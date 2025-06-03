#!/usr/bin/env python3
"""
Corporate Research System Launcher
企業情報収集システムの起動スクリプト

使用方法:
    python run.py          # 選択メニューを表示
    python run.py cli      # CLIモードで起動
    python run.py web      # Webインターフェースを起動
"""

import sys
import os
import subprocess

def show_menu():
    """メニューを表示"""
    print("\n" + "="*50)
    print("🏢 企業情報収集システム")
    print("="*50)
    print("\nどのモードで起動しますか？\n")
    print("1. コマンドライン インターフェース (CLI)")
    print("2. Web インターフェース")
    print("3. 終了")
    print("\n" + "-"*50)
    
    choice = input("選択してください (1-3): ")
    return choice

def check_requirements():
    """必要な環境変数をチェック"""
    missing_vars = []
    
    if not os.environ.get('TAVILY_API_KEY'):
        missing_vars.append('TAVILY_API_KEY')
    if not os.environ.get('OPENAI_API_KEY'):
        missing_vars.append('OPENAI_API_KEY')
    
    if missing_vars:
        print("\n⚠️  警告: 以下の環境変数が設定されていません:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\n処理を実行するには、これらのAPIキーを設定してください。")
        print("例: export TAVILY_API_KEY='your-api-key'")
        return False
    
    return True

def run_cli():
    """CLIモードを起動"""
    print("\n📟 コマンドライン インターフェースを起動します...\n")
    subprocess.run([sys.executable, "cli.py", "--interactive"])

def run_web():
    """Webインターフェースを起動"""
    print("\n🌐 Web インターフェースを起動します...")
    print("ブラウザで http://localhost:5000 にアクセスしてください")
    print("終了するには Ctrl+C を押してください\n")
    subprocess.run([sys.executable, "web_ui.py"])

def main():
    """メイン関数"""
    # .envファイルがあれば読み込む
    if os.path.exists('.env'):
        from dotenv import load_dotenv
        load_dotenv()
    
    # コマンドライン引数をチェック
    if len(sys.argv) > 1:
        mode = sys.argv[1].lower()
        if mode == 'cli':
            check_requirements()
            run_cli()
        elif mode == 'web':
            check_requirements()
            run_web()
        else:
            print(f"不明なモード: {mode}")
            print("使用方法: python run.py [cli|web]")
            sys.exit(1)
    else:
        # メニューを表示
        while True:
            choice = show_menu()
            
            if choice == '1':
                if check_requirements():
                    run_cli()
                input("\nEnterキーを押してメニューに戻る...")
            elif choice == '2':
                if check_requirements():
                    run_web()
                break
            elif choice == '3':
                print("\n終了します。")
                break
            else:
                print("\n無効な選択です。もう一度お試しください。")

if __name__ == '__main__':
    main()