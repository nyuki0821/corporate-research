import functions_framework
import logging
import json
from typing import Dict, Any
from modules.workflow import CompanyInfoWorkflow
from modules.sheets_client import SheetsClient
from config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@functions_framework.http
def collect_company_info(request):
    """
    Cloud Function entry point for collecting company information.
    
    Expected request body:
    {
        "spreadsheet_id": "Google Sheets ID",
        "input_range": "Sheet range with company names (e.g., 'Sheet1!A2:A')",
        "output_range": "Sheet range for output (e.g., 'Sheet1!B2:M')"
    }
    """
    try:
        # Parse request
        request_json = request.get_json()
        if not request_json:
            return json.dumps({"error": "No JSON body provided"}), 400
        
        spreadsheet_id = request_json.get('spreadsheet_id')
        input_range = request_json.get('input_range')
        output_range = request_json.get('output_range')
        
        if not all([spreadsheet_id, input_range, output_range]):
            return json.dumps({
                "error": "Missing required parameters: spreadsheet_id, input_range, output_range"
            }), 400
        
        logger.info(f"Processing request for spreadsheet: {spreadsheet_id}")
        
        # Initialize clients
        config = Config()
        sheets_client = SheetsClient(config)
        workflow = CompanyInfoWorkflow(config)
        
        # Get company names from Google Sheets
        company_names = sheets_client.read_company_names(spreadsheet_id, input_range)
        if not company_names:
            return json.dumps({"message": "No company names found in the specified range"}), 200
        
        logger.info(f"Found {len(company_names)} companies to process")
        
        # Process companies in batches
        results = []
        batch_size = config.BATCH_SIZE
        
        for i in range(0, len(company_names), batch_size):
            batch = company_names[i:i + batch_size]
            logger.info(f"Processing batch {i // batch_size + 1}: {len(batch)} companies")
            
            batch_results = workflow.process_batch(batch)
            results.extend(batch_results)
        
        # Write results back to Google Sheets
        rows_updated = sheets_client.write_results(spreadsheet_id, output_range, results)
        
        response = {
            "message": "Company information collection completed",
            "companies_processed": len(results),
            "rows_updated": rows_updated,
            "success_rate": sum(1 for r in results if r['reliability_score'] > 0.7) / len(results) if results else 0
        }
        
        logger.info(f"Processing completed: {response}")
        return json.dumps(response), 200
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return json.dumps({"error": str(e)}), 500


@functions_framework.http
def health_check(request):
    """Health check endpoint"""
    return json.dumps({"status": "healthy", "service": "corporate-info-collector"}), 200