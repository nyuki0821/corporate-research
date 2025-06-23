/**
 * @fileoverview Configuration management for the Corporate Research System
 * @author Corporate Research Team
 * 
 * 依存モジュール:
 * - Constants (src/core/Constants.js)
 * - Logger (src/core/Logger.js)
 */

var ConfigManager = (function() {
  // Private variables
  var _properties = PropertiesService.getScriptProperties();
  var _cache = null;
  var _cacheTimestamp = null;
  var CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュ
  
  // Default configuration values
  var _defaults = {
    // スプレッドシート設定
    'SPREADSHEET_ID': '', // 連携するスプレッドシートのID
    'AUTO_CREATE_SPREADSHEET': 'true', // スプレッドシートが存在しない場合の自動作成
    'SPREADSHEET_NAME': '企業情報収集システム', // 新規作成時のスプレッドシート名
    
    // API設定
    'TAVILY_API_KEY': '',
    'OPENAI_API_KEY': '',
    'OPENAI_MODEL': 'gpt-4o-mini',
    'OPENAI_MAX_TOKENS': '4000',
    'OPENAI_TEMPERATURE': '0.1',
    'OPENAI_TIMEOUT_MS': '60000',
    
    // バッチ処理設定
    'BATCH_SIZE': '8', // Google Apps Script 6分制限に対応（1社40秒×8社=320秒）
    'MAX_RETRY_COUNT': '3',
    'RETRY_DELAY_MS': '1000',
    'PROCESSING_DELAY_MS': '2000',
    'ENABLE_AUTO_CONTINUE': 'true', // 未処理企業がある限り自動継続
    'AUTO_CONTINUE_DELAY_MS': '5000', // 自動継続時の待機時間（5秒）
    
    // 通知設定
    'NOTIFICATION_EMAIL': '',
    'ENABLE_NOTIFICATIONS': 'true',
    'NOTIFY_BATCH_COMPLETE': 'true',
    'NOTIFY_BATCH_ERROR': 'true',
    'NOTIFY_SYSTEM_ALERT': 'true',
    'NOTIFY_DAILY_REPORT': 'false',
    'NOTIFY_WEEKLY_REPORT': 'false',
    
    // システム設定
    'LOG_RETENTION_DAYS': '30',
    'ERROR_THRESHOLD': '5',
    'BATCH_SIZE_THRESHOLD': '8', // 実行時間制限に合わせて調整
    'ENABLE_DEBUG_MODE': 'false',
    
    // 検索・抽出設定
    'MAX_SEARCH_RESULTS': '10',
    'SEARCH_TIMEOUT_MS': '30000',
    'EXTRACTION_TIMEOUT_MS': '60000',
    'ENABLE_DETAILED_SEARCH': 'true',
    'INCLUDE_FINANCIALS': 'false',

    
    // データ品質設定
    'MIN_RELIABILITY_SCORE': '60',
    'ENABLE_MULTIPLE_COMPANY_DETECTION': 'true',
    'ENABLE_AUTO_NORMALIZATION': 'true',
    'ENABLE_AUTO_PROCESSING': 'false',
    'AUTO_PROCESSING_INTERVAL': '60',
    'ENABLE_DETAILED_LOGGING': 'true',
    'ENABLE_FINANCIAL_DATA': 'false',
    'ENABLE_NEWS_SUMMARY': 'true',
    'ENABLE_RECRUITMENT_SUMMARY': 'true',
    'ENABLE_COMPANY_PHILOSOPHY': 'true',
    'CONTEXT_LENGTH_LIMIT': '80000'
  };

  // Private functions
  /**
   * Get configuration from cache or properties
   * @private
   */
  function loadConfig(forceRefresh) {
    if (!forceRefresh && _cache && _cacheTimestamp && (Date.now() - _cacheTimestamp < CACHE_DURATION)) {
      return _cache;
    }

    try {
      var allProperties = _properties.getProperties();
      var config = {};
      
      // Merge defaults with actual properties
      Object.keys(_defaults).forEach(function(key) {
        config[key] = allProperties[key] || _defaults[key];
      });
      
      // Also include any additional properties not in defaults
      Object.keys(allProperties).forEach(function(key) {
        if (!config.hasOwnProperty(key)) {
          config[key] = allProperties[key];
        }
      });
      
      _cache = config;
      _cacheTimestamp = Date.now();
      
      return config;
    } catch (error) {
      Logger.logError('設定の読み込みに失敗しました', error, 'loadConfig');
      return _defaults;
    }
  }

  /**
   * Validate email address
   * @private
   */
  function isValidEmail(email) {
    return Constants.REGEX_PATTERNS.EMAIL.test(email);
  }

  /**
   * Initialize default settings if not exist
   * @private
   */
  function initializeDefaults() {
    try {
      var currentProperties = _properties.getProperties();
      var updates = {};
      
      Object.keys(_defaults).forEach(function(key) {
        if (!currentProperties.hasOwnProperty(key)) {
          updates[key] = _defaults[key];
        }
      });
      
      if (Object.keys(updates).length > 0) {
        _properties.setProperties(updates);
        _cache = null; // Clear cache to force reload
      }
    } catch (error) {
      Logger.logError('デフォルト設定の初期化に失敗しました', error, 'initializeDefaults');
    }
  }

  // Public functions
  /**
   * Get all configuration
   */
  function getConfig(forceRefresh) {
    return loadConfig(forceRefresh);
  }

  /**
   * Get a specific configuration value
   */
  function get(key, defaultValue) {
    var config = loadConfig(false);
    if (config.hasOwnProperty(key)) {
      return config[key];
    }
    return defaultValue !== undefined ? defaultValue : '';
  }

  /**
   * Set a configuration value
   */
  function set(key, value) {
    try {
      _properties.setProperty(key, String(value));
      
      // Update cache
      if (_cache) {
        _cache[key] = String(value);
      }
      
      Logger.logInfo('設定を更新しました', { key: key, value: value }, 'set');
    } catch (error) {
      Logger.logError('設定の保存に失敗しました', error, 'set');
      throw error;
    }
  }

  /**
   * Set multiple configuration values
   */
  function setMultiple(settings) {
    try {
      var properties = {};
      Object.keys(settings).forEach(function(key) {
        properties[key] = String(settings[key]);
      });
      
      _properties.setProperties(properties);
      _cache = null; // Clear cache to force reload
      
      Logger.logInfo('複数の設定を更新しました', { count: Object.keys(settings).length }, 'setMultiple');
    } catch (error) {
      Logger.logError('複数設定の保存に失敗しました', error, 'setMultiple');
      throw error;
    }
  }

  /**
   * Delete a configuration value
   */
  function deleteProperty(key) {
    try {
      _properties.deleteProperty(key);
      
      // Update cache
      if (_cache && _cache.hasOwnProperty(key)) {
        delete _cache[key];
      }
      
      Logger.logInfo('設定を削除しました', { key: key }, 'deleteProperty');
    } catch (error) {
      Logger.logError('設定の削除に失敗しました', error, 'deleteProperty');
      throw error;
    }
  }

  /**
   * Get configuration as boolean
   */
  function getBoolean(key, defaultValue) {
    var value = get(key, defaultValue);
    return String(value).toLowerCase() === 'true';
  }

  /**
   * Get configuration as number
   */
  function getNumber(key, defaultValue) {
    var value = get(key, defaultValue);
    var number = parseInt(value);
    return isNaN(number) ? (defaultValue || 0) : number;
  }

  /**
   * Validate all configuration
   */
  function validate() {
    var issues = [];
    var warnings = [];
    var config = loadConfig(false);
    
    // Check required settings
    var requiredSettings = ['TAVILY_API_KEY', 'OPENAI_API_KEY'];
    requiredSettings.forEach(function(key) {
      var value = config[key];
      if (!value || value.trim() === '') {
        issues.push(key + ' が設定されていません');
      }
    });

    // Check numeric settings
    var numericSettings = [
      'BATCH_SIZE', 'MAX_RETRY_COUNT', 'RETRY_DELAY_MS', 
      'LOG_RETENTION_DAYS', 'ERROR_THRESHOLD'
    ];
    numericSettings.forEach(function(key) {
      var value = config[key];
      if (value && isNaN(parseInt(value))) {
        issues.push(key + ' は数値である必要があります');
      }
    });

    // Check boolean settings
    var booleanSettings = [
      'ENABLE_NOTIFICATIONS', 'NOTIFY_BATCH_COMPLETE', 'NOTIFY_BATCH_ERROR'
    ];
    booleanSettings.forEach(function(key) {
      var value = String(config[key]).toLowerCase();
      if (value !== 'true' && value !== 'false') {
        warnings.push(key + ' は true または false である必要があります');
      }
    });

    // Check email address
    var email = config['NOTIFICATION_EMAIL'];
    if (email && !isValidEmail(email)) {
      issues.push('NOTIFICATION_EMAIL が有効なメールアドレスではありません');
    }

    // Check batch size
    var batchSize = parseInt(config['BATCH_SIZE']);
    if (batchSize > 50) {
      warnings.push('BATCH_SIZE が大きすぎます。タイムアウトの可能性があります');
    }

    return {
      isValid: issues.length === 0,
      issues: issues,
      warnings: warnings
    };
  }

  /**
   * Export configuration (with masked sensitive data)
   */
  function exportConfig() {
    var config = loadConfig(false);
    var exportConfig = {};
    
    // Copy all settings
    Object.keys(config).forEach(function(key) {
      exportConfig[key] = config[key];
    });
    
    // Mask sensitive information
    var sensitiveKeys = ['TAVILY_API_KEY', 'OPENAI_API_KEY'];
    sensitiveKeys.forEach(function(key) {
      if (exportConfig[key]) {
        exportConfig[key] = '***MASKED***';
      }
    });
    
    return JSON.stringify(exportConfig, null, 2);
  }

  /**
   * Import configuration
   */
  function importConfig(jsonSettings, skipMasked) {
    if (skipMasked === undefined) skipMasked = true;
    
    try {
      var settings = JSON.parse(jsonSettings);
      var filtered = {};
      
      Object.keys(settings).forEach(function(key) {
        if (skipMasked && settings[key] === '***MASKED***') {
          return; // Skip masked items
        }
        filtered[key] = settings[key];
      });
      
      setMultiple(filtered);
      
      return { 
        success: true, 
        imported: Object.keys(filtered).length 
      };
    } catch (error) {
      Logger.logError('設定のインポートに失敗しました', error, 'importConfig');
      return { 
        success: false, 
        error: error.toString() 
      };
    }
  }

  /**
   * Get configuration statistics
   */
  function getStats() {
    var config = loadConfig(false);
    var validation = validate();
    
    return {
      totalSettings: Object.keys(config).length,
      configuredSettings: Object.keys(config).filter(function(key) {
        return config[key] && config[key].trim() !== '';
      }).length,
      defaultSettings: Object.keys(_defaults).length,
      validationIssues: validation.issues.length,
      validationWarnings: validation.warnings.length,
      isValid: validation.isValid
    };
  }

  /**
   * Clear all configuration
   */
  function clearAll() {
    try {
      _properties.deleteAllProperties();
      _cache = null;
      Logger.logWarning('全ての設定をクリアしました', null, 'clearAll');
    } catch (error) {
      Logger.logError('設定のクリアに失敗しました', error, 'clearAll');
      throw error;
    }
  }

  /**
   * Clear cache
   */
  function clearCache() {
    _cache = null;
    _cacheTimestamp = null;
  }

  // Initialize defaults on first load
  initializeDefaults();

  // Return public API
  return {
    getConfig: getConfig,
    get: get,
    set: set,
    setMultiple: setMultiple,
    deleteProperty: deleteProperty,
    getBoolean: getBoolean,
    getNumber: getNumber,
    validate: validate,
    exportConfig: exportConfig,
    importConfig: importConfig,
    getStats: getStats,
    clearAll: clearAll,
    clearCache: clearCache,
    initializeDefaults: initializeDefaults
  };
})();