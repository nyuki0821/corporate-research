import os
from google.cloud import secretmanager

class Config:
    """Configuration management for the Corporate Information Collection System"""
    
    def __init__(self):
        # Google Cloud settings
        self.PROJECT_ID = os.environ.get('GCP_PROJECT', 'your-project-id')
        self.REGION = os.environ.get('GCP_REGION', 'asia-northeast1')
        
        # Processing settings
        self.BATCH_SIZE = int(os.environ.get('BATCH_SIZE', '10'))
        self.PROCESSING_TIMEOUT = int(os.environ.get('PROCESSING_TIMEOUT', '30'))  # seconds per company
        self.MAX_RETRIES = int(os.environ.get('MAX_RETRIES', '3'))
        
        # API settings
        self.TAVILY_API_RATE_LIMIT = int(os.environ.get('TAVILY_RATE_LIMIT', '60'))  # requests per minute
        self.OPENAI_API_RATE_LIMIT = int(os.environ.get('OPENAI_RATE_LIMIT', '60'))  # requests per minute
        
        # Secret Manager client
        self._secret_client = None
        
    @property
    def secret_client(self):
        """Lazy initialization of Secret Manager client"""
        if self._secret_client is None:
            self._secret_client = secretmanager.SecretManagerServiceClient()
        return self._secret_client
    
    def get_secret(self, secret_id: str) -> str:
        """
        Retrieve a secret from Google Secret Manager
        
        Args:
            secret_id: The ID of the secret to retrieve
            
        Returns:
            The secret value as a string
        """
        try:
            name = f"projects/{self.PROJECT_ID}/secrets/{secret_id}/versions/latest"
            response = self.secret_client.access_secret_version(request={"name": name})
            return response.payload.data.decode("UTF-8")
        except Exception as e:
            # Fallback to environment variables for local development
            env_key = secret_id.upper().replace('-', '_')
            return os.environ.get(env_key, '')
    
    @property
    def tavily_api_key(self) -> str:
        """Get Tavily API key from Secret Manager"""
        return self.get_secret('tavily-api-key')
    
    @property
    def openai_api_key(self) -> str:
        """Get OpenAI API key from Secret Manager"""
        return self.get_secret('openai-api-key')
    
    @property
    def google_sheets_credentials(self) -> dict:
        """Get Google Sheets service account credentials"""
        # In production, this would come from the service account attached to the Cloud Function
        # For local development, you can use GOOGLE_APPLICATION_CREDENTIALS environment variable
        return {}
    
    # Output field mappings (from documentation)
    OUTPUT_FIELDS = [
        'company_name',           # 企業名
        'industry_classification', # 業界分類
        'employee_count',         # 従業員数
        'establishment_year',     # 設立年
        'capital',               # 資本金
        'listing_status',        # 上場区分
        'headquarters_location',  # 本社所在地
        'executive_info',        # 代表者情報
        'business_philosophy',   # 経営理念・ビジョン
        'latest_news',           # 最新ニュース・プレスリリース
        'recruitment_status',    # 採用情報の有無
        'reliability_score'      # データ信頼性スコア
    ]