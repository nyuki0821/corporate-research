import logging
import time
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from .tavily_client import TavilySearchClient
from .openai_client import OpenAIProcessor
from .data_processor import DataProcessor

logger = logging.getLogger(__name__)

class CompanyInfoWorkflow:
    """Orchestrate the company information collection workflow"""
    
    def __init__(self, config):
        self.config = config
        self.tavily_client = TavilySearchClient(config)
        self.openai_processor = OpenAIProcessor(config)
        self.data_processor = DataProcessor(config)
        
        # Initialize LangChain components for workflow management
        self.llm = ChatOpenAI(
            temperature=0.1,
            model_name="gpt-4o-mini",
            api_key=config.openai_api_key
        )
        
        # Quality check chain
        self.quality_check_chain = self._create_quality_check_chain()
        
    def _create_quality_check_chain(self) -> LLMChain:
        """Create a LangChain chain for quality checking results"""
        prompt = PromptTemplate(
            input_variables=["company_data"],
            template="""以下の企業データの品質をチェックし、改善点を提案してください:

{company_data}

以下の観点で評価してください：
1. データの完全性（欠損フィールドの有無）
2. データの一貫性（矛盾する情報の有無）
3. データの信頼性（情報源の信頼度）
4. 改善のための追加検索クエリの提案

JSON形式で回答してください:
{{
    "completeness_score": 0.0-1.0,
    "consistency_score": 0.0-1.0,
    "reliability_score": 0.0-1.0,
    "missing_fields": [],
    "inconsistencies": [],
    "suggested_queries": []
}}"""
        )
        
        return LLMChain(llm=self.llm, prompt=prompt)
    
    def process_single_company(self, company_name: str) -> Dict[str, Any]:
        """
        Process information for a single company
        
        Args:
            company_name: Name of the company to process
            
        Returns:
            Structured company information
        """
        start_time = time.time()
        logger.info(f"Starting processing for company: {company_name}")
        
        try:
            # Step 1: Search for company information
            search_results = self.tavily_client.search_company_info(company_name)
            
            # Step 2: Extract structured information
            extracted_info = self.openai_processor.extract_company_info(
                company_name, 
                search_results.get('search_results', [])
            )
            
            # Step 3: Clean and validate data
            cleaned_data = self.data_processor.validate_and_clean(extracted_info)
            
            # Step 4: Enrich data
            enriched_data = self.data_processor.enrich_data(cleaned_data)
            
            # Step 5: Quality check (optional, for high-value processing)
            if self.config.PROCESSING_TIMEOUT > 45:  # Only if we have enough time
                quality_result = self._perform_quality_check(enriched_data)
                enriched_data['quality_metrics'] = quality_result
            
            # Add processing metadata
            processing_time = time.time() - start_time
            enriched_data['processing_time'] = f"{processing_time:.2f}s"
            
            logger.info(f"Successfully processed {company_name} in {processing_time:.2f}s")
            return enriched_data
            
        except Exception as e:
            logger.error(f"Error processing company {company_name}: {str(e)}")
            # Return error result
            error_result = {field: None for field in self.config.OUTPUT_FIELDS}
            error_result['company_name'] = company_name
            error_result['reliability_score'] = 0.0
            error_result['error'] = str(e)
            error_result['processing_time'] = f"{time.time() - start_time:.2f}s"
            return error_result
    
    def _perform_quality_check(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Perform quality check on extracted data"""
        try:
            # Convert data to string for LangChain
            data_str = str(data)
            
            # Run quality check
            result = self.quality_check_chain.run(company_data=data_str)
            
            # Parse result (assuming JSON response)
            import json
            return json.loads(result)
        except Exception as e:
            logger.warning(f"Quality check failed: {str(e)}")
            return {
                "completeness_score": 0.5,
                "consistency_score": 0.5,
                "reliability_score": 0.5,
                "error": str(e)
            }
    
    def process_batch(self, company_names: List[str]) -> List[Dict[str, Any]]:
        """
        Process a batch of companies
        
        Args:
            company_names: List of company names to process
            
        Returns:
            List of structured company information
        """
        logger.info(f"Processing batch of {len(company_names)} companies")
        results = []
        
        # Determine optimal number of workers based on rate limits
        # We need to balance between Tavily and OpenAI rate limits
        max_workers = min(
            5,  # Maximum concurrent workers
            self.config.TAVILY_API_RATE_LIMIT // 4,  # Each company might need 4 Tavily requests
            self.config.OPENAI_API_RATE_LIMIT // 2   # Each company needs 1-2 OpenAI requests
        )
        
        logger.info(f"Using {max_workers} concurrent workers")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_company = {
                executor.submit(self.process_single_company, company_name): company_name
                for company_name in company_names
            }
            
            # Process results as they complete
            for future in as_completed(future_to_company):
                company_name = future_to_company[future]
                try:
                    result = future.result(timeout=self.config.PROCESSING_TIMEOUT)
                    results.append(result)
                except Exception as e:
                    logger.error(f"Failed to process {company_name}: {str(e)}")
                    # Add error result
                    error_result = {field: None for field in self.config.OUTPUT_FIELDS}
                    error_result['company_name'] = company_name
                    error_result['reliability_score'] = 0.0
                    error_result['error'] = str(e)
                    results.append(error_result)
        
        # Sort results to maintain order
        results.sort(key=lambda x: company_names.index(x.get('company_name', '')))
        
        # Calculate batch statistics
        success_count = sum(1 for r in results if r.get('reliability_score', 0) > 0.5)
        logger.info(f"Batch processing completed: {success_count}/{len(results)} successful")
        
        return results
    
    def validate_workflow(self) -> Dict[str, bool]:
        """
        Validate that all components of the workflow are properly configured
        
        Returns:
            Dictionary with validation results
        """
        validations = {}
        
        # Check API keys
        validations['tavily_api_key'] = bool(self.config.tavily_api_key)
        validations['openai_api_key'] = bool(self.config.openai_api_key)
        
        # Test Tavily connection
        try:
            test_result = self.tavily_client.client.search("test", max_results=1)
            validations['tavily_connection'] = True
        except Exception as e:
            logger.error(f"Tavily connection test failed: {str(e)}")
            validations['tavily_connection'] = False
        
        # Test OpenAI connection
        try:
            test_response = self.llm.invoke("test")
            validations['openai_connection'] = True
        except Exception as e:
            logger.error(f"OpenAI connection test failed: {str(e)}")
            validations['openai_connection'] = False
        
        # Check configuration
        validations['batch_size_valid'] = 1 <= self.config.BATCH_SIZE <= 50
        validations['timeout_valid'] = 10 <= self.config.PROCESSING_TIMEOUT <= 300
        
        return validations