import logging
import re
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class DataProcessor:
    """Process and validate company information data"""
    
    def __init__(self, config):
        self.config = config
        
    def validate_and_clean(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and clean company data
        
        Args:
            data: Raw company data dictionary
            
        Returns:
            Cleaned and validated data
        """
        cleaned_data = {}
        
        # Process each field with specific validation
        cleaned_data['company_name'] = self._clean_company_name(data.get('company_name'))
        cleaned_data['industry_classification'] = self._clean_text(data.get('industry_classification'))
        cleaned_data['employee_count'] = self._clean_employee_count(data.get('employee_count'))
        cleaned_data['establishment_year'] = self._clean_year(data.get('establishment_year'))
        cleaned_data['capital'] = self._clean_capital(data.get('capital'))
        cleaned_data['listing_status'] = self._clean_listing_status(data.get('listing_status'))
        cleaned_data['headquarters_location'] = self._clean_location(data.get('headquarters_location'))
        cleaned_data['executive_info'] = self._clean_text(data.get('executive_info'))
        cleaned_data['business_philosophy'] = self._clean_text(data.get('business_philosophy'), max_length=500)
        cleaned_data['latest_news'] = self._clean_text(data.get('latest_news'), max_length=500)
        cleaned_data['recruitment_status'] = self._clean_recruitment_status(data.get('recruitment_status'))
        cleaned_data['reliability_score'] = self._validate_score(data.get('reliability_score'))
        
        # Add processing metadata
        cleaned_data['processed_at'] = datetime.utcnow().isoformat()
        
        return cleaned_data
    
    def _clean_company_name(self, name: Optional[str]) -> str:
        """Clean and standardize company name"""
        if not name:
            return ""
        
        # Remove extra whitespace
        name = ' '.join(name.split())
        
        # Standardize common company suffixes
        replacements = {
            '（株）': '株式会社',
            '(株)': '株式会社',
            '（有）': '有限会社',
            '(有)': '有限会社',
        }
        
        for old, new in replacements.items():
            name = name.replace(old, new)
        
        return name.strip()
    
    def _clean_text(self, text: Optional[str], max_length: Optional[int] = None) -> str:
        """Clean general text fields"""
        if not text:
            return ""
        
        # Convert to string if not already
        text = str(text)
        
        # Remove excessive whitespace
        text = ' '.join(text.split())
        
        # Remove control characters
        text = ''.join(char for char in text if ord(char) >= 32)
        
        # Truncate if needed
        if max_length and len(text) > max_length:
            text = text[:max_length-3] + "..."
        
        return text.strip()
    
    def _clean_employee_count(self, count: Optional[Any]) -> str:
        """Clean and standardize employee count"""
        if not count:
            return ""
        
        count_str = str(count)
        
        # Extract numbers from various formats
        # e.g., "1,234人", "約1000名", "1000-2000", etc.
        numbers = re.findall(r'[\d,]+', count_str)
        
        if numbers:
            # Remove commas and convert to int
            numbers = [int(n.replace(',', '')) for n in numbers]
            
            if len(numbers) == 1:
                return f"{numbers[0]:,}名"
            elif len(numbers) == 2:
                return f"{numbers[0]:,}〜{numbers[1]:,}名"
        
        # Return original if no numbers found
        return count_str
    
    def _clean_year(self, year: Optional[Any]) -> str:
        """Clean and validate establishment year"""
        if not year:
            return ""
        
        year_str = str(year)
        
        # Extract 4-digit year
        match = re.search(r'(19|20)\d{2}', year_str)
        if match:
            return match.group(0)
        
        # Handle Japanese era years (e.g., 平成10年)
        # This is a simplified conversion
        if '昭和' in year_str:
            match = re.search(r'昭和(\d+)', year_str)
            if match:
                showa_year = int(match.group(1))
                return str(1925 + showa_year)
        elif '平成' in year_str:
            match = re.search(r'平成(\d+)', year_str)
            if match:
                heisei_year = int(match.group(1))
                return str(1988 + heisei_year)
        elif '令和' in year_str:
            match = re.search(r'令和(\d+)', year_str)
            if match:
                reiwa_year = int(match.group(1))
                return str(2018 + reiwa_year)
        
        return year_str
    
    def _clean_capital(self, capital: Optional[Any]) -> str:
        """Clean and standardize capital amount"""
        if not capital:
            return ""
        
        capital_str = str(capital)
        
        # Extract number and unit
        match = re.search(r'([\d,\.]+)\s*(億|万|千)?\s*(円|円)?', capital_str)
        if match:
            number = match.group(1).replace(',', '')
            unit = match.group(2) or ''
            
            try:
                amount = float(number)
                if unit == '億':
                    amount *= 100000000
                elif unit == '万':
                    amount *= 10000
                elif unit == '千':
                    amount *= 1000
                
                # Format with appropriate unit
                if amount >= 100000000:
                    return f"{amount/100000000:.1f}億円"
                elif amount >= 10000:
                    return f"{amount/10000:.0f}万円"
                else:
                    return f"{amount:.0f}円"
            except ValueError:
                pass
        
        return capital_str
    
    def _clean_listing_status(self, status: Optional[str]) -> str:
        """Clean and standardize listing status"""
        if not status:
            return "非上場"
        
        status = str(status).strip()
        
        # Standardize common variations
        standardizations = {
            '東証一部': '東証プライム',
            '東証1部': '東証プライム',
            '東証二部': '東証スタンダード',
            '東証2部': '東証スタンダード',
            'マザーズ': '東証グロース',
            'JASDAQ': '東証スタンダード',
            'ジャスダック': '東証スタンダード',
        }
        
        for old, new in standardizations.items():
            if old in status:
                return new
        
        # Check if it's listed
        if any(keyword in status for keyword in ['東証', '上場', '証券取引所']):
            return status
        
        return "非上場"
    
    def _clean_location(self, location: Optional[str]) -> str:
        """Clean and standardize location"""
        if not location:
            return ""
        
        location = str(location).strip()
        
        # Extract prefecture if present
        prefectures = [
            '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
            '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
            '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
            '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
            '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
            '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
            '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
        ]
        
        for prefecture in prefectures:
            if prefecture in location:
                # Try to extract city as well
                city_match = re.search(f'{prefecture}(.+?)(市|区|町|村)', location)
                if city_match:
                    return f"{prefecture}{city_match.group(0)}"
                return prefecture
        
        return location
    
    def _clean_recruitment_status(self, status: Optional[str]) -> str:
        """Clean and standardize recruitment status"""
        if not status:
            return "不明"
        
        status = str(status).lower()
        
        if any(keyword in status for keyword in ['あり', '有り', '募集', '採用中', 'yes', 'true']):
            return "あり"
        elif any(keyword in status for keyword in ['なし', '無し', '募集なし', 'no', 'false']):
            return "なし"
        else:
            return "不明"
    
    def _validate_score(self, score: Optional[Any]) -> float:
        """Validate and normalize reliability score"""
        if score is None:
            return 0.0
        
        try:
            score_float = float(score)
            # Ensure score is between 0 and 1
            return max(0.0, min(1.0, score_float))
        except (ValueError, TypeError):
            return 0.0
    
    def enrich_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enrich data with additional derived information
        
        Args:
            data: Cleaned company data
            
        Returns:
            Enriched data
        """
        enriched = data.copy()
        
        # Add company size classification based on employees
        employee_str = data.get('employee_count', '')
        if employee_str:
            # Extract first number
            match = re.search(r'\d+', employee_str.replace(',', ''))
            if match:
                count = int(match.group(0))
                if count >= 1000:
                    enriched['company_size'] = '大企業'
                elif count >= 300:
                    enriched['company_size'] = '中企業'
                elif count >= 50:
                    enriched['company_size'] = '小企業'
                else:
                    enriched['company_size'] = '零細企業'
        
        # Add age of company
        year_str = data.get('establishment_year', '')
        if year_str and year_str.isdigit():
            current_year = datetime.now().year
            age = current_year - int(year_str)
            enriched['company_age'] = f"{age}年"
        
        return enriched
    
    def batch_process(self, data_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Process a batch of company data
        
        Args:
            data_list: List of raw company data
            
        Returns:
            List of processed company data
        """
        processed = []
        
        for data in data_list:
            try:
                cleaned = self.validate_and_clean(data)
                enriched = self.enrich_data(cleaned)
                processed.append(enriched)
            except Exception as e:
                logger.error(f"Error processing data for {data.get('company_name', 'Unknown')}: {str(e)}")
                # Add error record
                error_record = {field: None for field in self.config.OUTPUT_FIELDS}
                error_record['company_name'] = data.get('company_name', 'Unknown')
                error_record['reliability_score'] = 0.0
                error_record['error'] = str(e)
                processed.append(error_record)
        
        return processed