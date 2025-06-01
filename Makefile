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