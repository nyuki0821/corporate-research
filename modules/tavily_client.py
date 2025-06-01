import logging
import time
from typing import List, Dict, Any
from tavily import TavilyClient
from tenacity import retry, wait_exponential, stop_after_attempt

logger = logging.getLogger(__name__)

class TavilySearchClient:
    """Client for Tavily API web search operations"""
    
    def __init__(self, config):
        self.config = config
        self.client = TavilyClient(api_key=config.tavily_api_key)
        self.last_request_time = 0
        self.rate_limit = config.TAVILY_API_RATE_LIMIT
        
    def _rate_limit_wait(self):
        """Implement rate limiting to avoid API limits"""
        current_time = time.time()
        time_since_last_request = current_time - self.last_request_time
        min_interval = 60.0 / self.rate_limit  # Convert to seconds between requests
        
        if time_since_last_request < min_interval:
            wait_time = min_interval - time_since_last_request
            logger.debug(f"Rate limiting: waiting {wait_time:.2f} seconds")
            time.sleep(wait_time)
        
        self.last_request_time = time.time()
    
    @retry(
        wait=wait_exponential(multiplier=1, min=4, max=10),
        stop=stop_after_attempt(3)
    )
    def search_company_info(self, company_name: str) -> Dict[str, Any]:
        """
        Search for company information using Tavily API
        
        Args:
            company_name: Name of the company to search
            
        Returns:
            Dictionary containing search results
        """
        self._rate_limit_wait()
        
        try:
            logger.info(f"Searching for company: {company_name}")
            
            # Primary search query
            search_query = f"{company_name} 企業情報 会社概要 事業内容"
            
            response = self.client.search(
                query=search_query,
                search_depth="advanced",
                max_results=10,
                include_domains=[],  # Search all domains
                exclude_domains=[],
                include_raw_content=True
            )
            
            # Extract relevant information
            results = {
                'company_name': company_name,
                'search_results': response.get('results', []),
                'search_query': search_query,
                'timestamp': time.time()
            }
            
            # Additional searches for specific information
            additional_searches = [
                f"{company_name} 採用情報 求人",
                f"{company_name} ニュース プレスリリース",
                f"{company_name} 経営理念 ビジョン"
            ]
            
            for query in additional_searches:
                self._rate_limit_wait()
                try:
                    additional_response = self.client.search(
                        query=query,
                        search_depth="basic",
                        max_results=5
                    )
                    results['search_results'].extend(additional_response.get('results', []))
                except Exception as e:
                    logger.warning(f"Additional search failed for query '{query}': {str(e)}")
            
            logger.info(f"Found {len(results['search_results'])} results for {company_name}")
            return results
            
        except Exception as e:
            logger.error(f"Error searching for company {company_name}: {str(e)}")
            raise
    
    def batch_search(self, company_names: List[str]) -> List[Dict[str, Any]]:
        """
        Search for multiple companies
        
        Args:
            company_names: List of company names to search
            
        Returns:
            List of search results
        """
        results = []
        
        for i, company_name in enumerate(company_names):
            try:
                logger.info(f"Processing company {i+1}/{len(company_names)}: {company_name}")
                result = self.search_company_info(company_name)
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to search for {company_name}: {str(e)}")
                # Add error result
                results.append({
                    'company_name': company_name,
                    'search_results': [],
                    'error': str(e),
                    'timestamp': time.time()
                })
        
        return results