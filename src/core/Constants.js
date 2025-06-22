/**
 * @fileoverview Configuration constants for the Corporate Research System
 * @author Corporate Research Team
 */

var Constants = (function() {
  // API Configuration
  var API_CONFIG = {
    // API endpoints
    ENDPOINTS: {
      COMPANY_SEARCH: 'https://api.example.com/v1/company/search',
      COMPANY_DETAIL: 'https://api.example.com/v1/company/detail',
      NEWS_SEARCH: 'https://api.example.com/v1/news/search',
      
      // External service endpoints
      GOOGLE_PLACES: 'https://maps.googleapis.com/maps/api/place',
      YAHOO_FINANCE: 'https://finance.yahoo.com/quote'
    },
    
    // API request configuration
    REQUEST: {
      TIMEOUT: 30000, // 30 seconds
      MAX_RETRIES: 3,
      RETRY_DELAY: 1000, // 1 second
      RATE_LIMIT_DELAY: 1000 // 1 second between requests
    },
    
    // API response configuration
    RESPONSE: {
      MAX_SIZE: 10 * 1024 * 1024, // 10MB
      DEFAULT_PAGE_SIZE: 100,
      MAX_PAGE_SIZE: 500
    }
  };

  // Spreadsheet Configuration
  var SHEET_CONFIG = {
    // Sheet names
    SHEETS: {
      COMPANY_LIST: '企業リスト',
      HEADQUARTERS: '本社情報',
      COMPANIES: 'Companies',
      FINANCIAL: 'Financial Data',
      LOGS: 'Logs',
      SETTINGS: 'Settings',
      PROCESSING_STATUS: '処理状況'
    },
    
    // Column mappings for Headquarters sheet (本社情報)
    HEADQUARTERS_COLUMNS: {
      COMPANY_ID: 1,           // 企業ID
      COMPANY_NAME: 2,         // 企業名
      OFFICIAL_NAME: 3,        // 正式企業名
      PHONE: 4,                // 電話番号
      INDUSTRY_LARGE: 5,       // 業種大分類
      INDUSTRY_MEDIUM: 6,      // 業種中分類
      EMPLOYEES: 7,            // 従業員数
      ESTABLISHED_YEAR: 8,     // 設立年
      CAPITAL: 9,              // 資本金
      LISTING_STATUS: 10,      // 上場区分
      POSTAL_CODE: 11,         // 本社郵便番号
      PREFECTURE: 12,          // 本社都道府県
      CITY: 13,                // 本社市区町村
      ADDRESS_DETAIL: 14,      // 本社住所詳細
      REPRESENTATIVE_NAME: 15, // 代表者名
      REPRESENTATIVE_TITLE: 16,// 代表者役職
      PHILOSOPHY: 17,          // 企業理念
      LATEST_NEWS: 18,         // 最新ニュース
      RECRUITMENT_STATUS: 19,  // 採用状況
      WEBSITE: 20,             // 企業URL
      RELIABILITY_SCORE: 21,   // 信頼性スコア
      PROCESSED_AT: 22,        // 処理日時
      PROCESSING_RESULT: 23,   // 処理結果
      ERROR_MESSAGE: 24,       // エラー内容
      SOURCE_URL: 25           // 情報ソースURL
    },

    // Column mappings for Companies sheet (Legacy - for compatibility)
    COMPANY_COLUMNS: {
      NAME: 1,
      ID: 2,
      REGISTRATION_NUMBER: 3,
      ADDRESS: 4,
      PHONE: 5,
      WEBSITE: 6,
      INDUSTRY: 7,
      EMPLOYEES: 8,
      CAPITAL: 9,
      FOUNDED: 10,
      STATUS: 11,
      LAST_UPDATED: 12,
      ERROR_MESSAGE: 13
    },
    

    
    // Column mappings for Financial sheet
    FINANCIAL_COLUMNS: {
      COMPANY_NAME: 1,
      COMPANY_ID: 2,
      FISCAL_YEAR: 3,
      REVENUE: 4,
      PROFIT: 5,
      ASSETS: 6,
      LIABILITIES: 7,
      EQUITY: 8,
      CASH_FLOW: 9,
      LAST_UPDATED: 10
    },
    
    // Data validation rules
    VALIDATION: {
      DATE_FORMAT: 'yyyy-MM-dd',
      NUMBER_FORMAT: '#,##0',
      CURRENCY_FORMAT: '¥#,##0',
      PERCENTAGE_FORMAT: '0.00%'
    }
  };

  // Cache Configuration
  var CACHE_CONFIG = {
    // Cache duration in seconds
    DURATION: {
      SHORT: 300, // 5 minutes
      MEDIUM: 3600, // 1 hour
      LONG: 86400, // 24 hours
      MAX: 21600 // 6 hours (Google Apps Script maximum)
    },
    
    // Cache key prefixes
    KEYS: {
      COMPANY: 'company_',
      FINANCIAL: 'financial_',
      API_TOKEN: 'api_token_',
      SETTINGS: 'settings_'
    }
  };

  // Processing Configuration
  var PROCESSING_CONFIG = {
    // Batch processing settings
    BATCH: {
      DEFAULT_SIZE: 10,
      MAX_SIZE: 50,
      MIN_SIZE: 1,
      CHUNK_SIZE: 5, // Process in chunks to avoid timeout
      DELAY_BETWEEN_CHUNKS: 2000 // 2 seconds
    },
    
    // Execution time limits
    EXECUTION: {
      MAX_RUNTIME: 300000, // 5 minutes (leaving 1 minute buffer)
      WARNING_THRESHOLD: 240000, // 4 minutes
      CHECK_INTERVAL: 10000 // Check every 10 seconds
    },
    
    // Error handling
    ERRORS: {
      MAX_CONSECUTIVE_ERRORS: 5,
      ERROR_NOTIFICATION_THRESHOLD: 10,
      RETRY_MULTIPLIER: 2 // Exponential backoff multiplier
    }
  };

  // Notification Configuration
  var NOTIFICATION_CONFIG = {
    // Email templates
    TEMPLATES: {
      SUBJECT_PREFIX: '[Corporate Research]',
      FOOTER: '\n\n---\nThis is an automated message from the Corporate Research System.\nDo not reply to this email.'
    },
    
    // Notification types
    TYPES: {
      SUCCESS: 'success',
      ERROR: 'error',
      WARNING: 'warning',
      INFO: 'info'
    },
    
    // Notification settings
    SETTINGS: {
      BATCH_SUMMARY: true,
      ERROR_DETAILS: true,
      INCLUDE_LOGS: false,
      MAX_LOG_LINES: 100
    }
  };

  // Log Configuration
  var LOG_CONFIG = {
    // Log levels
    LEVELS: {
      ERROR: 'ERROR',
      WARNING: 'WARNING',
      INFO: 'INFO',
      DEBUG: 'DEBUG'
    },
    
    // Log settings
    SETTINGS: {
      MAX_ENTRIES: 1000,
      AUTO_CLEANUP: true,
      CLEANUP_DAYS: 30,
      INCLUDE_STACK_TRACE: true,
      LOG_TO_SHEET: true,
      LOG_TO_CONSOLE: true
    },
    
    // Log format
    FORMAT: {
      TIMESTAMP: 'yyyy-MM-dd HH:mm:ss',
      SEPARATOR: ' | ',
      MAX_MESSAGE_LENGTH: 1000
    }
  };

  // Property Keys
  var PROPERTY_KEYS = {
    // Script properties (shared across all users)
    SCRIPT: {
      API_KEY: 'API_KEY',
      API_SECRET: 'API_SECRET',
      WEBHOOK_URL: 'WEBHOOK_URL',
      ENVIRONMENT: 'ENVIRONMENT'
    },
    
    // User properties (per user)
    USER: {
      NOTIFICATION_EMAIL: 'NOTIFICATION_EMAIL',
      PREFERRED_LANGUAGE: 'PREFERRED_LANGUAGE',
      TIMEZONE: 'TIMEZONE',
      DATE_FORMAT: 'DATE_FORMAT'
    },
    
    // Document properties (per spreadsheet)
    DOCUMENT: {
      LAST_SYNC: 'LAST_SYNC',
      SYNC_ENABLED: 'SYNC_ENABLED',
      AUTO_PROCESS: 'AUTO_PROCESS',
      PROCESS_SCHEDULE: 'PROCESS_SCHEDULE'
    }
  };

  // Status Values
  var STATUS = {
    // Processing status
    PROCESSING: {
      PENDING: 'Pending',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      FAILED: 'Failed',
      SKIPPED: 'Skipped',
      QUEUED: 'Queued'
    },
    
    // Data status
    DATA: {
      VALID: 'Valid',
      INVALID: 'Invalid',
      MISSING: 'Missing',
      OUTDATED: 'Outdated',
      DUPLICATE: 'Duplicate'
    },
    
    // Company status
    COMPANY: {
      ACTIVE: 'Active',
      INACTIVE: 'Inactive',
      DISSOLVED: 'Dissolved',
      MERGED: 'Merged',
      BANKRUPT: 'Bankrupt',
      UNKNOWN: 'Unknown'
    }
  };

  // Regular Expressions
  var REGEX_PATTERNS = {
    // Validation patterns
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    PHONE_JP: /^(\+81|0)\d{1,4}-?\d{1,4}-?\d{4}$/,
    POSTAL_CODE_JP: /^\d{3}-?\d{4}$/,
    COMPANY_REGISTRATION_JP: /^\d{4}-\d{2}-\d{6}$/,
    
    // Data extraction patterns
    NUMERIC: /[\d,]+\.?\d*/g,
    CURRENCY: /[¥$€£]\s?[\d,]+\.?\d*/g,
    DATE_ISO: /\d{4}-\d{2}-\d{2}/g,
    DATE_JP: /\d{4}年\d{1,2}月\d{1,2}日/g
  };

  // Default Values
  var DEFAULTS = {
    // Default values for missing data
    UNKNOWN_VALUE: 'N/A',
    ZERO_VALUE: 0,
    EMPTY_ARRAY: [],
    EMPTY_OBJECT: {},
    
    // Default settings
    LANGUAGE: 'ja',
    TIMEZONE: 'Asia/Tokyo',
    DATE_FORMAT: 'yyyy-MM-dd',
    NUMBER_FORMAT: '#,##0',
    
    // Default limits
    MAX_RESULTS: 1000,
    PAGE_SIZE: 100,
    TIMEOUT: 30000
  };

  // Return public API
  return {
    API_CONFIG: API_CONFIG,
    SHEET_CONFIG: SHEET_CONFIG,
    CACHE_CONFIG: CACHE_CONFIG,
    PROCESSING_CONFIG: PROCESSING_CONFIG,
    NOTIFICATION_CONFIG: NOTIFICATION_CONFIG,
    LOG_CONFIG: LOG_CONFIG,
    PROPERTY_KEYS: PROPERTY_KEYS,
    STATUS: STATUS,
    REGEX_PATTERNS: REGEX_PATTERNS,
    DEFAULTS: DEFAULTS
  };
})();