import logging
import time
import json
from typing import Dict, Any, List, Optional
from openai import OpenAI
from tenacity import retry, wait_exponential, stop_after_attempt

logger = logging.getLogger(__name__)

class OpenAIProcessor:
    """Client for OpenAI GPT-4o-mini to process and structure company information"""
    
    def __init__(self, config):
        self.config = config
        self.client = OpenAI(api_key=config.openai_api_key)
        self.model = "gpt-4o-mini"
        self.last_request_time = 0
        self.rate_limit = config.OPENAI_API_RATE_LIMIT
        
    def _rate_limit_wait(self):
        """Implement rate limiting to avoid API limits"""
        current_time = time.time()
        time_since_last_request = current_time - self.last_request_time
        min_interval = 60.0 / self.rate_limit
        
        if time_since_last_request < min_interval:
            wait_time = min_interval - time_since_last_request
            logger.debug(f"Rate limiting: waiting {wait_time:.2f} seconds")
            time.sleep(wait_time)
        
        self.last_request_time = time.time()
    
    def _create_extraction_prompt(self, company_name: str, search_results: List[Dict]) -> str:
        """Create a prompt for extracting structured information from search results"""
        
        # Combine search results into text
        search_text = ""
        for i, result in enumerate(search_results[:10]):  # Limit to top 10 results
            search_text += f"\n\n--- Result {i+1} ---\n"
            search_text += f"Title: {result.get('title', '')}\n"
            search_text += f"URL: {result.get('url', '')}\n"
            search_text += f"Content: {result.get('content', '')[:1000]}...\n"  # Limit content length
        
        prompt = f"""以下の検索結果から、{company_name}に関する情報を抽出し、構造化されたJSONデータを生成してください。

検索結果:
{search_text}

以下のフィールドを含むJSONオブジェクトを生成してください:
- company_name: 企業名（正式名称）
- industry_classification: 業界分類（例：製造業、IT、小売業など）
- employee_count: 従業員数（数値または範囲）
- establishment_year: 設立年（西暦4桁）
- capital: 資本金（金額と単位）
- listing_status: 上場区分（東証プライム、東証スタンダード、東証グロース、非上場など）
- headquarters_location: 本社所在地（都道府県と市区町村）
- executive_info: 代表者情報（役職と氏名）
- business_philosophy: 経営理念・ビジョン（要約）
- latest_news: 最新ニュース・プレスリリース（最新のもの1-2件を要約）
- recruitment_status: 採用情報の有無（あり/なし/不明）
- reliability_score: データ信頼性スコア（0.0-1.0の範囲で、情報の充実度と信頼性を評価）

情報が見つからない場合は、そのフィールドにnullを設定してください。
必ず有効なJSONオブジェクトのみを返してください。"""
        
        return prompt
    
    @retry(
        wait=wait_exponential(multiplier=1, min=4, max=10),
        stop=stop_after_attempt(3)
    )
    def extract_company_info(self, company_name: str, search_results: List[Dict]) -> Dict[str, Any]:
        """
        Extract structured company information from search results using GPT-4o-mini
        
        Args:
            company_name: Name of the company
            search_results: List of search results from Tavily
            
        Returns:
            Structured company information
        """
        self._rate_limit_wait()
        
        try:
            logger.info(f"Extracting information for company: {company_name}")
            
            prompt = self._create_extraction_prompt(company_name, search_results)
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "あなたは企業情報を抽出し構造化する専門家です。検索結果から正確な情報を抽出し、指定されたJSON形式で返してください。"
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,  # Low temperature for consistent extraction
                max_tokens=2000,
                response_format={"type": "json_object"}
            )
            
            # Parse the response
            result_text = response.choices[0].message.content
            result = json.loads(result_text)
            
            # Ensure all required fields are present
            for field in self.config.OUTPUT_FIELDS:
                if field not in result:
                    result[field] = None
            
            # Validate and adjust reliability score
            if 'reliability_score' not in result or result['reliability_score'] is None:
                result['reliability_score'] = self._calculate_reliability_score(result)
            else:
                result['reliability_score'] = max(0.0, min(1.0, float(result['reliability_score'])))
            
            logger.info(f"Successfully extracted information for {company_name}")
            return result
            
        except Exception as e:
            logger.error(f"Error extracting information for {company_name}: {str(e)}")
            # Return a default structure with error information
            return self._create_error_result(company_name, str(e))
    
    def _calculate_reliability_score(self, data: Dict[str, Any]) -> float:
        """Calculate reliability score based on data completeness"""
        total_fields = len(self.config.OUTPUT_FIELDS) - 1  # Exclude reliability_score itself
        filled_fields = sum(1 for field in self.config.OUTPUT_FIELDS 
                          if field != 'reliability_score' and data.get(field) is not None)
        
        return round(filled_fields / total_fields, 2)
    
    def _create_error_result(self, company_name: str, error: str) -> Dict[str, Any]:
        """Create an error result structure"""
        result = {field: None for field in self.config.OUTPUT_FIELDS}
        result['company_name'] = company_name
        result['reliability_score'] = 0.0
        result['error'] = error
        return result
    
    def process_batch(self, search_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Process a batch of search results
        
        Args:
            search_results: List of search results from Tavily
            
        Returns:
            List of structured company information
        """
        processed_results = []
        
        for search_result in search_results:
            company_name = search_result.get('company_name', '')
            results = search_result.get('search_results', [])
            
            if not results:
                logger.warning(f"No search results for {company_name}")
                processed_results.append(self._create_error_result(company_name, "No search results"))
            else:
                extracted_info = self.extract_company_info(company_name, results)
                processed_results.append(extracted_info)
        
        return processed_results