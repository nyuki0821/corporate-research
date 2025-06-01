import unittest
from unittest.mock import Mock, patch, MagicMock
import json
from config import Config
from modules.data_processor import DataProcessor
from modules.tavily_client import TavilySearchClient
from modules.openai_client import OpenAIProcessor
from modules.sheets_client import SheetsClient
from modules.workflow import CompanyInfoWorkflow

class TestDataProcessor(unittest.TestCase):
    """Test cases for DataProcessor"""
    
    def setUp(self):
        self.config = Mock()
        self.config.OUTPUT_FIELDS = [
            'company_name', 'industry_classification', 'employee_count',
            'establishment_year', 'capital', 'listing_status',
            'headquarters_location', 'executive_info', 'business_philosophy',
            'latest_news', 'recruitment_status', 'reliability_score'
        ]
        self.processor = DataProcessor(self.config)
    
    def test_clean_company_name(self):
        """Test company name cleaning"""
        test_cases = [
            ('（株）テスト会社', '株式会社テスト会社'),
            ('テスト  会社', 'テスト 会社'),
            ('(有)サンプル', '有限会社サンプル'),
            ('', ''),
            (None, '')
        ]
        
        for input_name, expected in test_cases:
            result = self.processor._clean_company_name(input_name)
            self.assertEqual(result, expected)
    
    def test_clean_employee_count(self):
        """Test employee count cleaning"""
        test_cases = [
            ('1,234人', '1,234名'),
            ('約1000名', '1,000名'),
            ('1000-2000', '1,000〜2,000名'),
            ('', ''),
            (None, '')
        ]
        
        for input_count, expected in test_cases:
            result = self.processor._clean_employee_count(input_count)
            self.assertEqual(result, expected)
    
    def test_clean_year(self):
        """Test year cleaning"""
        test_cases = [
            ('2020年', '2020'),
            ('平成10年設立', '1998'),
            ('昭和50年', '1975'),
            ('令和2年', '2020'),
            ('', ''),
            (None, '')
        ]
        
        for input_year, expected in test_cases:
            result = self.processor._clean_year(input_year)
            self.assertEqual(result, expected)
    
    def test_clean_capital(self):
        """Test capital cleaning"""
        test_cases = [
            ('1億円', '1.0億円'),
            ('5000万円', '5000万円'),
            ('10,000千円', '1000万円'),
            ('', ''),
            (None, '')
        ]
        
        for input_capital, expected in test_cases:
            result = self.processor._clean_capital(input_capital)
            self.assertEqual(result, expected)
    
    def test_validate_score(self):
        """Test score validation"""
        test_cases = [
            (0.8, 0.8),
            (1.5, 1.0),
            (-0.5, 0.0),
            ('0.5', 0.5),
            (None, 0.0),
            ('invalid', 0.0)
        ]
        
        for input_score, expected in test_cases:
            result = self.processor._validate_score(input_score)
            self.assertEqual(result, expected)

class TestTavilyClient(unittest.TestCase):
    """Test cases for TavilyClient"""
    
    def setUp(self):
        self.config = Mock()
        self.config.tavily_api_key = 'test-key'
        self.config.TAVILY_API_RATE_LIMIT = 60
        
    @patch('modules.tavily_client.TavilyClient')
    def test_search_company_info(self, mock_tavily):
        """Test company search functionality"""
        # Mock Tavily response
        mock_client = Mock()
        mock_client.search.return_value = {
            'results': [
                {
                    'title': 'Test Company - About Us',
                    'url': 'https://example.com/about',
                    'content': 'Test Company is a leading provider...'
                }
            ]
        }
        mock_tavily.return_value = mock_client
        
        client = TavilySearchClient(self.config)
        client.client = mock_client
        
        result = client.search_company_info('Test Company')
        
        self.assertEqual(result['company_name'], 'Test Company')
        self.assertIn('search_results', result)
        self.assertIn('timestamp', result)
        mock_client.search.assert_called()

class TestOpenAIProcessor(unittest.TestCase):
    """Test cases for OpenAIProcessor"""
    
    def setUp(self):
        self.config = Mock()
        self.config.openai_api_key = 'test-key'
        self.config.OPENAI_API_RATE_LIMIT = 60
        self.config.OUTPUT_FIELDS = [
            'company_name', 'industry_classification', 'employee_count',
            'establishment_year', 'capital', 'listing_status',
            'headquarters_location', 'executive_info', 'business_philosophy',
            'latest_news', 'recruitment_status', 'reliability_score'
        ]
    
    @patch('modules.openai_client.OpenAI')
    def test_extract_company_info(self, mock_openai):
        """Test information extraction"""
        # Mock OpenAI response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = json.dumps({
            'company_name': 'Test Company',
            'industry_classification': 'IT',
            'employee_count': '1000',
            'establishment_year': '2000',
            'capital': '1億円',
            'listing_status': '東証プライム',
            'headquarters_location': '東京都',
            'executive_info': '代表取締役 山田太郎',
            'business_philosophy': 'イノベーションを通じて社会に貢献',
            'latest_news': '新サービスをリリース',
            'recruitment_status': 'あり',
            'reliability_score': 0.9
        })
        
        mock_client = Mock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_openai.return_value = mock_client
        
        processor = OpenAIProcessor(self.config)
        processor.client = mock_client
        
        search_results = [
            {
                'title': 'Test Company',
                'content': 'Company information...'
            }
        ]
        
        result = processor.extract_company_info('Test Company', search_results)
        
        self.assertEqual(result['company_name'], 'Test Company')
        self.assertEqual(result['industry_classification'], 'IT')
        self.assertEqual(result['reliability_score'], 0.9)

class TestSheetsClient(unittest.TestCase):
    """Test cases for SheetsClient"""
    
    def setUp(self):
        self.config = Mock()
        self.config.google_sheets_credentials = {}
        self.config.OUTPUT_FIELDS = ['company_name', 'industry_classification']
    
    @patch('modules.sheets_client.build')
    def test_read_company_names(self, mock_build):
        """Test reading company names from sheets"""
        # Mock Google Sheets API response
        mock_service = Mock()
        mock_values = Mock()
        mock_values.get.return_value.execute.return_value = {
            'values': [['Company A'], ['Company B'], ['Company C']]
        }
        mock_service.spreadsheets.return_value.values.return_value = mock_values
        mock_build.return_value = mock_service
        
        client = SheetsClient(self.config)
        client.service = mock_service
        
        result = client.read_company_names('test-sheet-id', 'Sheet1!A2:A')
        
        self.assertEqual(len(result), 3)
        self.assertEqual(result[0], 'Company A')
        self.assertEqual(result[2], 'Company C')
    
    @patch('modules.sheets_client.build')
    def test_write_results(self, mock_build):
        """Test writing results to sheets"""
        # Mock Google Sheets API
        mock_service = Mock()
        mock_values = Mock()
        mock_values.update.return_value.execute.return_value = {
            'updatedRows': 2
        }
        mock_service.spreadsheets.return_value.values.return_value = mock_values
        mock_build.return_value = mock_service
        
        client = SheetsClient(self.config)
        client.service = mock_service
        
        results = [
            {'company_name': 'Company A', 'industry_classification': 'IT'},
            {'company_name': 'Company B', 'industry_classification': '製造業'}
        ]
        
        rows_updated = client.write_results('test-sheet-id', 'Sheet1!B2:C', results)
        
        self.assertEqual(rows_updated, 2)
        mock_values.update.assert_called_once()

class TestWorkflow(unittest.TestCase):
    """Test cases for CompanyInfoWorkflow"""
    
    def setUp(self):
        self.config = Mock()
        self.config.tavily_api_key = 'test-key'
        self.config.openai_api_key = 'test-key'
        self.config.TAVILY_API_RATE_LIMIT = 60
        self.config.OPENAI_API_RATE_LIMIT = 60
        self.config.PROCESSING_TIMEOUT = 30
        self.config.OUTPUT_FIELDS = ['company_name', 'reliability_score']
    
    @patch('modules.workflow.TavilySearchClient')
    @patch('modules.workflow.OpenAIProcessor')
    @patch('modules.workflow.DataProcessor')
    @patch('modules.workflow.ChatOpenAI')
    def test_process_single_company(self, mock_chat, mock_data_proc, mock_openai_proc, mock_tavily):
        """Test processing a single company"""
        # Setup mocks
        mock_tavily_instance = Mock()
        mock_tavily_instance.search_company_info.return_value = {
            'search_results': [{'title': 'Test', 'content': 'Content'}]
        }
        mock_tavily.return_value = mock_tavily_instance
        
        mock_openai_instance = Mock()
        mock_openai_instance.extract_company_info.return_value = {
            'company_name': 'Test Company',
            'reliability_score': 0.8
        }
        mock_openai_proc.return_value = mock_openai_instance
        
        mock_data_instance = Mock()
        mock_data_instance.validate_and_clean.return_value = {
            'company_name': 'Test Company',
            'reliability_score': 0.8
        }
        mock_data_instance.enrich_data.return_value = {
            'company_name': 'Test Company',
            'reliability_score': 0.8,
            'company_size': '大企業'
        }
        mock_data_proc.return_value = mock_data_instance
        
        workflow = CompanyInfoWorkflow(self.config)
        result = workflow.process_single_company('Test Company')
        
        self.assertEqual(result['company_name'], 'Test Company')
        self.assertEqual(result['reliability_score'], 0.8)
        self.assertIn('processing_time', result)

class TestMainFunction(unittest.TestCase):
    """Test cases for main Cloud Function"""
    
    @patch('main.Config')
    @patch('main.SheetsClient')
    @patch('main.CompanyInfoWorkflow')
    def test_collect_company_info_success(self, mock_workflow_class, mock_sheets_class, mock_config_class):
        """Test successful company info collection"""
        from main import collect_company_info
        
        # Setup mocks
        mock_config = Mock()
        mock_config.BATCH_SIZE = 10
        mock_config_class.return_value = mock_config
        
        mock_sheets = Mock()
        mock_sheets.read_company_names.return_value = ['Company A', 'Company B']
        mock_sheets.write_results.return_value = 2
        mock_sheets_class.return_value = mock_sheets
        
        mock_workflow = Mock()
        mock_workflow.process_batch.return_value = [
            {'company_name': 'Company A', 'reliability_score': 0.8},
            {'company_name': 'Company B', 'reliability_score': 0.9}
        ]
        mock_workflow_class.return_value = mock_workflow
        
        # Create mock request
        mock_request = Mock()
        mock_request.get_json.return_value = {
            'spreadsheet_id': 'test-sheet-id',
            'input_range': 'Sheet1!A2:A',
            'output_range': 'Sheet1!B2:M'
        }
        
        # Call function
        response, status_code = collect_company_info(mock_request)
        response_data = json.loads(response)
        
        # Assertions
        self.assertEqual(status_code, 200)
        self.assertEqual(response_data['companies_processed'], 2)
        self.assertEqual(response_data['rows_updated'], 2)
        self.assertIn('success_rate', response_data)

if __name__ == '__main__':
    unittest.main()