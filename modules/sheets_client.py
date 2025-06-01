import logging
from typing import List, Dict, Any, Optional
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from tenacity import retry, wait_exponential, stop_after_attempt

logger = logging.getLogger(__name__)

class SheetsClient:
    """Client for Google Sheets API operations"""
    
    def __init__(self, config):
        self.config = config
        self.service = self._initialize_service()
        
    def _initialize_service(self):
        """Initialize Google Sheets API service"""
        try:
            # In Cloud Functions, default credentials are automatically available
            # For local development, use GOOGLE_APPLICATION_CREDENTIALS
            scopes = ['https://www.googleapis.com/auth/spreadsheets']
            credentials = service_account.Credentials.from_service_account_info(
                self.config.google_sheets_credentials,
                scopes=scopes
            ) if self.config.google_sheets_credentials else None
            
            service = build('sheets', 'v4', credentials=credentials)
            return service
        except Exception as e:
            logger.error(f"Failed to initialize Google Sheets service: {str(e)}")
            raise
    
    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3)
    )
    def read_company_names(self, spreadsheet_id: str, range_name: str) -> List[str]:
        """
        Read company names from Google Sheets
        
        Args:
            spreadsheet_id: The ID of the spreadsheet
            range_name: The A1 notation of the range to read (e.g., 'Sheet1!A2:A')
            
        Returns:
            List of company names
        """
        try:
            logger.info(f"Reading company names from {spreadsheet_id} range {range_name}")
            
            result = self.service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=range_name
            ).execute()
            
            values = result.get('values', [])
            
            # Extract company names (flatten if necessary)
            company_names = []
            for row in values:
                if row and row[0]:  # Check if row exists and has a value
                    company_name = str(row[0]).strip()
                    if company_name:
                        company_names.append(company_name)
            
            logger.info(f"Found {len(company_names)} company names")
            return company_names
            
        except HttpError as e:
            logger.error(f"Google Sheets API error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error reading company names: {str(e)}")
            raise
    
    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3)
    )
    def write_results(self, spreadsheet_id: str, range_name: str, 
                     results: List[Dict[str, Any]]) -> int:
        """
        Write results back to Google Sheets
        
        Args:
            spreadsheet_id: The ID of the spreadsheet
            range_name: The A1 notation of the range to write (e.g., 'Sheet1!B2:M')
            results: List of company information dictionaries
            
        Returns:
            Number of rows updated
        """
        try:
            logger.info(f"Writing {len(results)} results to {spreadsheet_id} range {range_name}")
            
            # Convert results to rows format
            rows = []
            for result in results:
                row = []
                # Follow the order defined in OUTPUT_FIELDS
                for field in self.config.OUTPUT_FIELDS:
                    value = result.get(field, '')
                    # Convert None to empty string for sheets
                    if value is None:
                        value = ''
                    # Convert numbers to strings to avoid formatting issues
                    elif isinstance(value, (int, float)):
                        value = str(value)
                    row.append(value)
                rows.append(row)
            
            # Prepare the update body
            body = {
                'values': rows
            }
            
            # Update the sheet
            result = self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=range_name,
                valueInputOption='USER_ENTERED',  # Allow Google Sheets to parse input
                body=body
            ).execute()
            
            updated_rows = result.get('updatedRows', 0)
            logger.info(f"Successfully updated {updated_rows} rows")
            
            return updated_rows
            
        except HttpError as e:
            logger.error(f"Google Sheets API error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error writing results: {str(e)}")
            raise
    
    def append_results(self, spreadsheet_id: str, range_name: str,
                      results: List[Dict[str, Any]]) -> int:
        """
        Append results to the end of existing data
        
        Args:
            spreadsheet_id: The ID of the spreadsheet
            range_name: The A1 notation of the range (e.g., 'Sheet1!A:M')
            results: List of company information dictionaries
            
        Returns:
            Number of rows appended
        """
        try:
            logger.info(f"Appending {len(results)} results to {spreadsheet_id}")
            
            # Convert results to rows format
            rows = []
            for result in results:
                row = []
                for field in self.config.OUTPUT_FIELDS:
                    value = result.get(field, '')
                    if value is None:
                        value = ''
                    elif isinstance(value, (int, float)):
                        value = str(value)
                    row.append(value)
                rows.append(row)
            
            body = {
                'values': rows
            }
            
            # Append to the sheet
            result = self.service.spreadsheets().values().append(
                spreadsheetId=spreadsheet_id,
                range=range_name,
                valueInputOption='USER_ENTERED',
                insertDataOption='INSERT_ROWS',
                body=body
            ).execute()
            
            updates = result.get('updates', {})
            updated_rows = updates.get('updatedRows', 0)
            logger.info(f"Successfully appended {updated_rows} rows")
            
            return updated_rows
            
        except Exception as e:
            logger.error(f"Error appending results: {str(e)}")
            raise
    
    def clear_range(self, spreadsheet_id: str, range_name: str) -> bool:
        """
        Clear a specific range in the spreadsheet
        
        Args:
            spreadsheet_id: The ID of the spreadsheet
            range_name: The A1 notation of the range to clear
            
        Returns:
            True if successful
        """
        try:
            logger.info(f"Clearing range {range_name} in {spreadsheet_id}")
            
            self.service.spreadsheets().values().clear(
                spreadsheetId=spreadsheet_id,
                range=range_name
            ).execute()
            
            logger.info("Successfully cleared range")
            return True
            
        except Exception as e:
            logger.error(f"Error clearing range: {str(e)}")
            raise