/**
 * @fileoverview Error handling utility for the Corporate Research System
 * @author Corporate Research Team
 * 
 * 依存モジュール:
 * - Logger (src/core/Logger.js)
 * - Constants (src/core/Constants.js)
 * - ConfigManager (src/core/ConfigManager.js)
 */

var ErrorHandler = (function() {
  // Private variables
  var _errorTypes = {
    API_ERROR: 'API_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    DATA_ERROR: 'DATA_ERROR',
    PERMISSION_ERROR: 'PERMISSION_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    SYSTEM_ERROR: 'SYSTEM_ERROR'
  };

  var _severityLevels = {
    CRITICAL: { level: 5, label: 'クリティカル', notify: true },
    HIGH: { level: 4, label: '高', notify: true },
    MEDIUM: { level: 3, label: '中', notify: false },
    LOW: { level: 2, label: '低', notify: false },
    INFO: { level: 1, label: '情報', notify: false }
  };

  var _retryableErrors = [
    _errorTypes.NETWORK_ERROR,
    _errorTypes.TIMEOUT_ERROR,
    _errorTypes.API_ERROR
  ];

  var _errorStats = {
    total: 0,
    byType: {},
    bySeverity: {},
    lastReset: new Date()
  };

  // Private functions
  /**
   * Standardize error
   * @private
   */
  function standardizeError(error, context) {
    var message = '';
    var stack = '';
    var name = '';
    var code = '';
    
    if (error instanceof Error) {
      message = error.message || 'Unknown error';
      stack = error.stack || '';
      name = error.name || 'Error';
      code = error.code || '';
    } else if (typeof error === 'string') {
      message = error;
      name = 'StringError';
    } else if (typeof error === 'object' && error !== null) {
      message = error.message || error.toString();
      name = error.name || 'ObjectError';
      code = error.code || '';
    } else {
      message = 'Unknown error type';
      name = 'UnknownError';
    }

    return {
      message: message,
      stack: stack,
      name: name,
      code: code,
      raw: error
    };
  }

  /**
   * Classify error
   * @private
   */
  function classifyError(errorInfo) {
    var message = errorInfo.message.toLowerCase();
    var name = errorInfo.name.toLowerCase();
    var code = errorInfo.code;

    // API関連エラー
    if (message.indexOf('api') !== -1 || message.indexOf('http') !== -1 || 
        (code >= 400 && code < 600)) {
      return {
        type: _errorTypes.API_ERROR,
        category: 'external_service',
        description: 'APIサービスのエラー'
      };
    }

    // ネットワーク関連エラー
    if (message.indexOf('network') !== -1 || message.indexOf('connection') !== -1 ||
        message.indexOf('timeout') !== -1 || message.indexOf('dns') !== -1) {
      return {
        type: _errorTypes.NETWORK_ERROR,
        category: 'infrastructure',
        description: 'ネットワーク接続のエラー'
      };
    }

    // タイムアウトエラー
    if (message.indexOf('timeout') !== -1 || message.indexOf('time out') !== -1 ||
        message.indexOf('exceeded') !== -1) {
      return {
        type: _errorTypes.TIMEOUT_ERROR,
        category: 'performance',
        description: '処理時間制限エラー'
      };
    }

    // 権限エラー
    if (message.indexOf('permission') !== -1 || message.indexOf('unauthorized') !== -1 ||
        message.indexOf('forbidden') !== -1 || code === 403) {
      return {
        type: _errorTypes.PERMISSION_ERROR,
        category: 'security',
        description: '権限・認証エラー'
      };
    }

    // データ関連エラー
    if (message.indexOf('data') !== -1 || message.indexOf('parse') !== -1 ||
        message.indexOf('json') !== -1 || message.indexOf('format') !== -1) {
      return {
        type: _errorTypes.DATA_ERROR,
        category: 'data_processing',
        description: 'データ処理エラー'
      };
    }

    // バリデーションエラー
    if (message.indexOf('validation') !== -1 || message.indexOf('invalid') !== -1 ||
        message.indexOf('required') !== -1 || message.indexOf('missing') !== -1) {
      return {
        type: _errorTypes.VALIDATION_ERROR,
        category: 'input_validation',
        description: '入力値検証エラー'
      };
    }

    // その他のシステムエラー
    return {
      type: _errorTypes.SYSTEM_ERROR,
      category: 'system',
      description: 'システム内部エラー'
    };
  }

  /**
   * Determine severity
   * @private
   */
  function determineSeverity(classification, context) {
    // 処理中の企業数による重要度調整
    var isHighVolumeProcessing = context.batchSize && context.batchSize > 10;
    
    // エラータイプ別の基本重要度
    switch (classification.type) {
      case _errorTypes.PERMISSION_ERROR:
        return _severityLevels.CRITICAL;
        
      case _errorTypes.API_ERROR:
        if (context.apiErrorCode >= 500) {
          return _severityLevels.HIGH;
        } else if (context.apiErrorCode === 429) {
          return _severityLevels.MEDIUM;
        }
        return _severityLevels.HIGH;
        
      case _errorTypes.NETWORK_ERROR:
      case _errorTypes.TIMEOUT_ERROR:
        return isHighVolumeProcessing ? 
          _severityLevels.HIGH : _severityLevels.MEDIUM;
        
      case _errorTypes.DATA_ERROR:
        return context.isCriticalData ? 
          _severityLevels.HIGH : _severityLevels.MEDIUM;
        
      case _errorTypes.VALIDATION_ERROR:
        return _severityLevels.LOW;
        
      default:
        return _severityLevels.MEDIUM;
    }
  }

  /**
   * Get error solution
   * @private
   */
  function getSolution(errorType, errorInfo) {
    var solutions = {};
    
    solutions[_errorTypes.API_ERROR] = {
      immediate: 'APIキーの確認、リトライ実行',
      preventive: 'API制限の監視、予備APIキーの準備',
      contact: 'API提供元サポート'
    };
    
    solutions[_errorTypes.NETWORK_ERROR] = {
      immediate: 'ネットワーク接続の確認、リトライ実行',
      preventive: 'ネットワーク監視の強化',
      contact: 'ネットワーク管理者'
    };
    
    solutions[_errorTypes.TIMEOUT_ERROR] = {
      immediate: 'バッチサイズの削減、処理時間の最適化',
      preventive: 'パフォーマンス監視、アルゴリズム改善',
      contact: 'システム管理者'
    };
    
    solutions[_errorTypes.PERMISSION_ERROR] = {
      immediate: '権限設定の確認、認証情報の更新',
      preventive: '権限管理の定期チェック',
      contact: 'システム管理者'
    };
    
    solutions[_errorTypes.DATA_ERROR] = {
      immediate: 'データ形式の確認、入力値の検証',
      preventive: 'データ検証ルールの強化',
      contact: 'データ管理者'
    };
    
    solutions[_errorTypes.VALIDATION_ERROR] = {
      immediate: '入力値の修正、フォーマット確認',
      preventive: '入力ガイドラインの整備',
      contact: 'ユーザーサポート'
    };

    return solutions[errorType] || {
      immediate: 'ログの詳細確認、システム再起動',
      preventive: 'システム監視の強化',
      contact: 'システム管理者'
    };
  }

  /**
   * Generate error ID
   * @private
   */
  function generateErrorId() {
    var timestamp = Date.now();
    var random = Math.random().toString(36).substr(2, 9);
    return 'ERR_' + timestamp + '_' + random;
  }

  /**
   * Get log level from severity
   * @private
   */
  function getLogLevel(severity) {
    switch (severity.level) {
      case 5: return 'ERROR';
      case 4: return 'ERROR';
      case 3: return 'WARNING';
      case 2: return 'INFO';
      default: return 'DEBUG';
    }
  }

  /**
   * Format error message
   * @private
   */
  function formatErrorMessage(errorInfo) {
    var parts = [
      '[' + errorInfo.type + ']',
      errorInfo.message
    ];

    if (errorInfo.context.companyName) {
      parts.push('(Company: ' + errorInfo.context.companyName + ')');
    }

    if (errorInfo.context.batchId) {
      parts.push('(Batch: ' + errorInfo.context.batchId + ')');
    }

    return parts.join(' ');
  }

  /**
   * Update error statistics
   * @private
   */
  function updateErrorStats(errorInfo) {
    _errorStats.total++;
    
    // タイプ別統計
    if (!_errorStats.byType[errorInfo.type]) {
      _errorStats.byType[errorInfo.type] = 0;
    }
    _errorStats.byType[errorInfo.type]++;
    
    // 重要度別統計
    var severityLabel = errorInfo.severity.label;
    if (!_errorStats.bySeverity[severityLabel]) {
      _errorStats.bySeverity[severityLabel] = 0;
    }
    _errorStats.bySeverity[severityLabel]++;
  }

  /**
   * Send error notification
   * @private
   */
  function sendErrorNotification(errorInfo) {
    try {
      var notificationEmail = ConfigManager.get('NOTIFICATION_EMAIL');
      var enableNotifications = ConfigManager.getBoolean('ENABLE_NOTIFICATIONS');
      
      if (!enableNotifications || !notificationEmail) {
        return;
      }

      var subject = '[' + errorInfo.severity.label + '] 企業情報収集システム エラー通知';
      var body = createErrorNotificationBody(errorInfo);
      
      MailApp.sendEmail(notificationEmail, subject, body);
      
      Logger.logInfo('Error notification sent for error ID: ' + errorInfo.id);
      
    } catch (notificationError) {
      Logger.logError('Failed to send error notification', notificationError);
    }
  }

  /**
   * Create error notification body
   * @private
   */
  function createErrorNotificationBody(errorInfo) {
    var contextLines = [];
    for (var key in errorInfo.context) {
      if (errorInfo.context.hasOwnProperty(key)) {
        contextLines.push(key + ': ' + errorInfo.context[key]);
      }
    }

    return '企業情報収集システムでエラーが発生しました。\n\n' +
           '【エラー情報】\n' +
           'エラーID: ' + errorInfo.id + '\n' +
           '発生時刻: ' + errorInfo.timestamp + '\n' +
           '重要度: ' + errorInfo.severity.label + '\n' +
           'エラータイプ: ' + errorInfo.type + '\n' +
           'メッセージ: ' + errorInfo.message + '\n\n' +
           '【コンテキスト】\n' +
           contextLines.join('\n') + '\n\n' +
           '【推奨対応】\n' +
           '即座の対応: ' + errorInfo.solution.immediate + '\n' +
           '予防策: ' + errorInfo.solution.preventive + '\n' +
           '連絡先: ' + errorInfo.solution.contact + '\n\n' +
           '【詳細】\n' +
           'リトライ可能: ' + (errorInfo.retryable ? 'はい' : 'いいえ') + '\n' +
           '分類: ' + errorInfo.category + '\n\n' +
           'システムの詳細ログをご確認ください。';
  }

  /**
   * Record error to spreadsheet
   * @private
   */
  function recordErrorToSpreadsheet(errorInfo) {
    try {
      var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      if (!spreadsheet) return;
      
      var sheet = spreadsheet.getSheetByName(Constants.SHEET_CONFIG.SHEETS.LOGS);
      if (!sheet) return;

      var rowData = [
        errorInfo.timestamp,
        getLogLevel(errorInfo.severity),
        '[ERROR] ' + errorInfo.message,
        Session.getActiveUser().getEmail(),
        JSON.stringify({
          errorId: errorInfo.id,
          type: errorInfo.type,
          severity: errorInfo.severity.label,
          context: errorInfo.context,
          solution: errorInfo.solution
        })
      ];

      sheet.appendRow(rowData);
      
    } catch (recordError) {
      Logger.logError('Failed to record error to spreadsheet', recordError);
    }
  }

  // Public functions
  /**
   * Handle error
   */
  function handleError(error, context) {
    if (!context) context = {};
    
    try {
      // エラー情報の標準化
      var standardizedError = standardizeError(error, context);
      
      // エラーを分類
      var classification = classifyError(standardizedError);
      
      // 重要度を判定
      var severity = determineSeverity(classification, context);
      
      // エラー情報を統合
      var errorInfo = {
        message: standardizedError.message,
        stack: standardizedError.stack,
        name: standardizedError.name,
        code: standardizedError.code,
        raw: standardizedError.raw,
        type: classification.type,
        category: classification.category,
        severity: severity,
        timestamp: new Date(),
        context: context,
        id: generateErrorId(),
        retryable: isRetryable(classification.type),
        solution: getSolution(classification.type, standardizedError)
      };

      // ログに記録
      logError(errorInfo);
      
      // 統計を更新
      updateErrorStats(errorInfo);
      
      // 通知が必要な場合は送信
      if (severity.notify) {
        sendErrorNotification(errorInfo);
      }
      
      // スプレッドシートに記録
      recordErrorToSpreadsheet(errorInfo);
      
      return errorInfo;
      
    } catch (handlingError) {
      // エラーハンドリング自体でエラーが発生した場合
      console.error('Error handling failed:', handlingError);
      Logger.logError('Error handling failed', handlingError);
      
      return {
        message: 'エラー処理中にエラーが発生しました',
        originalError: error.toString(),
        handlingError: handlingError.toString(),
        timestamp: new Date(),
        severity: _severityLevels.CRITICAL
      };
    }
  }

  /**
   * Log error
   */
  function logError(errorInfo) {
    var logLevel = getLogLevel(errorInfo.severity);
    var logMessage = formatErrorMessage(errorInfo);
    
    Logger.log(logLevel, logMessage, {
      errorId: errorInfo.id,
      type: errorInfo.type,
      severity: errorInfo.severity.label,
      context: errorInfo.context
    });
  }

  /**
   * Check if error is retryable
   */
  function isRetryable(errorType) {
    return _retryableErrors.indexOf(errorType) !== -1;
  }

  /**
   * Reset error statistics
   */
  function resetErrorStats() {
    _errorStats = {
      total: 0,
      byType: {},
      bySeverity: {},
      lastReset: new Date()
    };
  }

  /**
   * Get error statistics
   */
  function getErrorStats() {
    var stats = {
      total: _errorStats.total,
      byType: {},
      bySeverity: {},
      lastReset: _errorStats.lastReset
    };
    
    // Deep copy objects
    for (var type in _errorStats.byType) {
      if (_errorStats.byType.hasOwnProperty(type)) {
        stats.byType[type] = _errorStats.byType[type];
      }
    }
    
    for (var severity in _errorStats.bySeverity) {
      if (_errorStats.bySeverity.hasOwnProperty(severity)) {
        stats.bySeverity[severity] = _errorStats.bySeverity[severity];
      }
    }
    
    return stats;
  }

  /**
   * Monitor critical errors
   */
  function monitorCriticalErrors() {
    var criticalThreshold = 5; // 1時間以内のクリティカルエラー閾値
    var highThreshold = 10;    // 1時間以内の高重要度エラー閾値
    
    var alerts = [];
    
    if (_errorStats.bySeverity['クリティカル'] >= criticalThreshold) {
      alerts.push({
        level: 'CRITICAL',
        message: 'クリティカルエラーが' + criticalThreshold + '件以上発生しています',
        action: '即座にシステム管理者に連絡してください'
      });
    }
    
    if (_errorStats.bySeverity['高'] >= highThreshold) {
      alerts.push({
        level: 'HIGH',
        message: '高重要度エラーが' + highThreshold + '件以上発生しています',
        action: 'システムの状態を確認してください'
      });
    }
    
    return {
      hasAlerts: alerts.length > 0,
      alerts: alerts,
      timestamp: new Date()
    };
  }

  // Return public API
  return {
    handleError: handleError,
    isRetryable: isRetryable,
    resetErrorStats: resetErrorStats,
    getErrorStats: getErrorStats,
    monitorCriticalErrors: monitorCriticalErrors,
    errorTypes: _errorTypes,
    severityLevels: _severityLevels
  };
})();