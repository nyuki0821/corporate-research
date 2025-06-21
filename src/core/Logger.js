/**
 * @fileoverview Logging utility functions for the Corporate Research System
 * @author Corporate Research Team
 * 
 * 依存モジュール:
 * - Constants (src/core/Constants.js)
 * - ConfigManager (src/core/ConfigManager.js)
 */

var Logger = (function() {
  // Private variables
  var _logSheet = null;
  var _cache = CacheService.getScriptCache();
  var _initializationAttempted = false;
  
  // Private functions
  /**
   * Initialize the log sheet
   * @private
   */
  function initializeLogSheet() {
    // 既に初期化を試行済みでかつ失敗している場合は、エラーログを繰り返さない
    if (_initializationAttempted && !_logSheet) {
      return;
    }
    
    _initializationAttempted = true;
    
    try {
      var spreadsheet = null;
      
      // 1. まずConfigManagerからスプレッドシートIDを取得を試みる
      try {
        if (typeof ConfigManager !== 'undefined') {
          var spreadsheetId = ConfigManager.get('SPREADSHEET_ID');
          
          if (spreadsheetId) {
            spreadsheet = SpreadsheetApp.openById(spreadsheetId);
          }
        }
      } catch (e) {
        // Silent failure - will try other methods
      }
      
      // 2. SpreadsheetServiceを使用してターゲットスプレッドシートを取得
      if (!spreadsheet && typeof SpreadsheetService !== 'undefined') {
        try {
          spreadsheet = SpreadsheetService.getTargetSpreadsheet();
        } catch (e) {
          // Silent failure - will try other methods
        }
      }
      
      // 3. フォールバック: アクティブスプレッドシートを使用
      if (!spreadsheet) {
        try {
          spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        } catch (e) {
          // Silent failure - ログシートなしで動作
        }
      }
      
      if (!spreadsheet) {
        // ログシートが利用できない場合は静かに無効化
        _logSheet = null;
        return;
      }
      
      // ログシートを取得または作成
      _logSheet = spreadsheet.getSheetByName(Constants.SHEET_CONFIG.SHEETS.LOGS);
      
      if (!_logSheet) {
        _logSheet = spreadsheet.insertSheet(Constants.SHEET_CONFIG.SHEETS.LOGS);
        setupLogSheetHeaders();
      }
      
    } catch (error) {
      // エラーは一度だけ表示
      if (!_initializationAttempted) {
        console.error('Failed to initialize log sheet:', error);
      }
      // ログシートの初期化に失敗してもシステムを停止させない
      _logSheet = null;
    }
  }
  
  /**
   * Set up log sheet headers
   * @private
   */
  function setupLogSheetHeaders() {
    var headers = ['Timestamp', 'Level', 'Function', 'Message', 'Details', 'User'];
    _logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format headers
    var headerRange = _logSheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f0f0f0');
    headerRange.setBorder(true, true, true, true, true, true);
    
    // Set column widths
    _logSheet.setColumnWidth(1, 150); // Timestamp
    _logSheet.setColumnWidth(2, 80);  // Level
    _logSheet.setColumnWidth(3, 150); // Function
    _logSheet.setColumnWidth(4, 300); // Message
    _logSheet.setColumnWidth(5, 400); // Details
    _logSheet.setColumnWidth(6, 150); // User
    
    // Freeze header row
    _logSheet.setFrozenRows(1);
  }
  
  /**
   * Format console message
   * @private
   */
  function formatConsoleMessage(timestamp, level, functionName, message, details) {
    var formattedTime = Utilities.formatDate(timestamp, 'Asia/Tokyo', Constants.LOG_CONFIG.FORMAT.TIMESTAMP);
    var consoleMessage = formattedTime + Constants.LOG_CONFIG.FORMAT.SEPARATOR + level + Constants.LOG_CONFIG.FORMAT.SEPARATOR;
    
    if (functionName) {
      consoleMessage += functionName + Constants.LOG_CONFIG.FORMAT.SEPARATOR;
    }
    
    consoleMessage += message;
    
    if (details) {
      consoleMessage += Constants.LOG_CONFIG.FORMAT.SEPARATOR + JSON.stringify(details);
    }
    
    return consoleMessage;
  }
  
  /**
   * Log to spreadsheet
   * @private
   */
  function logToSheet(timestamp, level, functionName, message, details, user) {
    try {
      var formattedTime = Utilities.formatDate(timestamp, 'Asia/Tokyo', Constants.LOG_CONFIG.FORMAT.TIMESTAMP);
      var detailsString = details ? JSON.stringify(details).substring(0, Constants.LOG_CONFIG.FORMAT.MAX_MESSAGE_LENGTH) : '';
      
      // Truncate message if too long
      var truncatedMessage = message.length > Constants.LOG_CONFIG.FORMAT.MAX_MESSAGE_LENGTH 
        ? message.substring(0, Constants.LOG_CONFIG.FORMAT.MAX_MESSAGE_LENGTH) + '...' 
        : message;
      
      var logRow = [formattedTime, level, functionName, truncatedMessage, detailsString, user];
      
      // Insert at row 2 (after header) to show most recent logs first
      _logSheet.insertRowAfter(1);
      var newRow = _logSheet.getRange(2, 1, 1, logRow.length);
      newRow.setValues([logRow]);
      
      // Apply formatting based on log level
      applyLogFormatting(newRow, level);
      
      // Limit total number of log entries
      var maxRows = Constants.LOG_CONFIG.SETTINGS.MAX_ENTRIES + 1; // +1 for header
      if (_logSheet.getLastRow() > maxRows) {
        _logSheet.deleteRows(maxRows + 1, _logSheet.getLastRow() - maxRows);
      }
      
    } catch (error) {
      console.error('Failed to log to sheet:', error);
    }
  }
  
  /**
   * Apply formatting to log row based on level
   * @private
   */
  function applyLogFormatting(range, level) {
    switch (level) {
      case Constants.LOG_CONFIG.LEVELS.ERROR:
        range.setBackground('#ffebee');
        range.setFontColor('#c62828');
        break;
      case Constants.LOG_CONFIG.LEVELS.WARNING:
        range.setBackground('#fff3e0');
        range.setFontColor('#ef6c00');
        break;
      case Constants.LOG_CONFIG.LEVELS.INFO:
        range.setBackground('#e8f5e9');
        range.setFontColor('#2e7d32');
        break;
      case Constants.LOG_CONFIG.LEVELS.DEBUG:
        range.setBackground('#f3f4f6');
        range.setFontColor('#6b7280');
        break;
    }
  }
  
  /**
   * Cache recent logs
   * @private
   */
  function cacheLog(timestamp, level, functionName, message, details, user) {
    try {
      var cacheKey = 'recent_logs';
      var recentLogs = _cache.get(cacheKey);
      
      if (recentLogs) {
        recentLogs = JSON.parse(recentLogs);
      } else {
        recentLogs = [];
      }
      
      recentLogs.unshift({
        timestamp: timestamp.toISOString(),
        level: level,
        functionName: functionName,
        message: message,
        details: details,
        user: user
      });
      
      // Keep only last 100 logs in cache
      if (recentLogs.length > 100) {
        recentLogs = recentLogs.slice(0, 100);
      }
      
      _cache.put(cacheKey, JSON.stringify(recentLogs), Constants.CACHE_CONFIG.DURATION.MEDIUM);
      
    } catch (error) {
      console.error('Failed to cache log:', error);
    }
  }
  
  /**
   * Schedule cleanup of old logs
   * @private
   */
  function scheduleCleanup() {
    try {
      var lastCleanup = _cache.get('last_log_cleanup');
      var now = new Date().getTime();
      var dayInMs = 24 * 60 * 60 * 1000;
      
      if (!lastCleanup || now - parseInt(lastCleanup) > dayInMs) {
        cleanupOldLogs();
        _cache.put('last_log_cleanup', now.toString(), Constants.CACHE_CONFIG.DURATION.LONG);
      }
    } catch (error) {
      console.error('Failed to schedule cleanup:', error);
    }
  }
  
  /**
   * Clean up old log entries
   * @private
   */
  function cleanupOldLogs() {
    try {
      if (!_logSheet) return;
      
      var cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - Constants.LOG_CONFIG.SETTINGS.CLEANUP_DAYS);
      
      var dataRange = _logSheet.getDataRange();
      var values = dataRange.getValues();
      
      // Find rows to delete (starting from bottom)
      for (var i = values.length - 1; i >= 1; i--) { // Skip header row
        var timestamp = values[i][0];
        
        if (timestamp instanceof Date && timestamp < cutoffDate) {
          _logSheet.deleteRow(i + 1); // +1 because rows are 1-indexed
        }
      }
      
      console.log('Log cleanup completed. Removed entries older than ' + Constants.LOG_CONFIG.SETTINGS.CLEANUP_DAYS + ' days.');
      
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }
  
  /**
   * Get the name of the calling function
   * @private
   */
  function getCallingFunctionName() {
    try {
      var stack = new Error().stack;
      var stackLines = stack.split('\n');
      
      // Find the calling function (skip this function and the log function)
      for (var i = 3; i < stackLines.length; i++) {
        var match = stackLines[i].match(/at\s+(\w+)/);
        if (match && match[1] !== 'Object') {
          return match[1];
        }
      }
    } catch (error) {
      // Fallback if stack trace parsing fails
    }
    
    return '';
  }
  
  // Public functions
  /**
   * Log a message
   * @param {string} level - Log level (ERROR, WARNING, INFO, DEBUG)
   * @param {string} message - Log message
   * @param {Object} details - Additional details object
   * @param {string} functionName - Name of the calling function
   */
  function log(level, message, details, functionName) {
    try {
      if (!details) details = null;
      if (!functionName) functionName = '';
      
      var timestamp = new Date();
      var user = Session.getActiveUser().getEmail();
      
      // Initialize log sheet if needed
      if (!_initializationAttempted) {
        initializeLogSheet();
      }
      
      // Console logging
      if (Constants.LOG_CONFIG.SETTINGS.LOG_TO_CONSOLE) {
        var consoleMessage = formatConsoleMessage(timestamp, level, functionName, message, details);
        
        switch (level) {
          case Constants.LOG_CONFIG.LEVELS.ERROR:
            console.error(consoleMessage);
            break;
          case Constants.LOG_CONFIG.LEVELS.WARNING:
            console.warn(consoleMessage);
            break;
          default:
            console.log(consoleMessage);
        }
      }
      
      // Sheet logging (ログシートが利用できない場合はスキップ)
      if (Constants.LOG_CONFIG.SETTINGS.LOG_TO_SHEET && _logSheet) {
        logToSheet(timestamp, level, functionName, message, details, user);
      }
      
      // Cache recent logs for quick access
      cacheLog(timestamp, level, functionName, message, details, user);
      
      // Auto-cleanup old logs if needed
      if (Constants.LOG_CONFIG.SETTINGS.AUTO_CLEANUP) {
        scheduleCleanup();
      }
      
    } catch (error) {
      console.error('Logging failed:', error);
    }
  }
  
  /**
   * Log an error message
   */
  function logError(message, error, functionName) {
    var details = error instanceof Error ? {
      message: error.message,
      stack: Constants.LOG_CONFIG.SETTINGS.INCLUDE_STACK_TRACE ? error.stack : undefined
    } : error;
    
    log(Constants.LOG_CONFIG.LEVELS.ERROR, message, details, functionName || getCallingFunctionName());
  }
  
  /**
   * Log a warning message
   */
  function logWarning(message, details, functionName) {
    log(Constants.LOG_CONFIG.LEVELS.WARNING, message, details, functionName || getCallingFunctionName());
  }
  
  /**
   * Log an info message
   */
  function logInfo(message, details, functionName) {
    log(Constants.LOG_CONFIG.LEVELS.INFO, message, details, functionName || getCallingFunctionName());
  }
  
  /**
   * Log a debug message
   */
  function logDebug(message, details, functionName) {
    log(Constants.LOG_CONFIG.LEVELS.DEBUG, message, details, functionName || getCallingFunctionName());
  }
  
  /**
   * Get recent logs from cache
   */
  function getRecentLogs(count) {
    if (!count) count = 50;
    
    try {
      var recentLogs = _cache.get('recent_logs');
      
      if (recentLogs) {
        var logs = JSON.parse(recentLogs);
        return logs.slice(0, count);
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get recent logs:', error);
      return [];
    }
  }
  
  /**
   * Export logs to email
   */
  function exportLogs(email, startDate, endDate) {
    try {
      if (!_logSheet) {
        throw new Error('Log sheet not initialized');
      }
      
      var dataRange = _logSheet.getDataRange();
      var values = dataRange.getValues();
      var headers = values[0];
      
      var filteredLogs = [headers];
      
      for (var i = 1; i < values.length; i++) {
        var timestamp = values[i][0];
        
        if (timestamp instanceof Date) {
          if ((!startDate || timestamp >= startDate) && (!endDate || timestamp <= endDate)) {
            filteredLogs.push(values[i]);
          }
        }
      }
      
      // Create CSV content
      var csvContent = filteredLogs.map(function(row) {
        return row.map(function(cell) { return '"' + cell + '"'; }).join(',');
      }).join('\n');
      
      // Create blob
      var blob = Utilities.newBlob(csvContent, 'text/csv', 'corporate_research_logs.csv');
      
      // Send email
      var subject = 'Corporate Research System - Log Export';
      var body = 'Please find attached the exported logs from the Corporate Research System.\n\n' +
                 'Export Date: ' + new Date().toLocaleString() + '\n' +
                 'Total Entries: ' + (filteredLogs.length - 1) + '\n' +
                 (startDate ? 'Start Date: ' + startDate.toLocaleString() + '\n' : '') +
                 (endDate ? 'End Date: ' + endDate.toLocaleString() + '\n' : '');
      
      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: body,
        attachments: [blob]
      });
      
      logInfo('Logs exported to ' + email, {
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        entryCount: filteredLogs.length - 1
      }, 'exportLogs');
      
    } catch (error) {
      logError('Failed to export logs', error, 'exportLogs');
      throw error;
    }
  }
  
  /**
   * Create a new performance timer
   */
  function startTimer(name) {
    return new PerformanceTimer(name);
  }
  
  /**
   * Performance timer constructor
   * @private
   */
  function PerformanceTimer(name) {
    this.name = name;
    this.startTime = new Date().getTime();
    this.marks = [];
  }
  
  PerformanceTimer.prototype.mark = function(label) {
    var elapsed = new Date().getTime() - this.startTime;
    this.marks.push({ label: label, elapsed: elapsed });
    logDebug('Performance mark: ' + label, { elapsed: elapsed + 'ms' }, this.name);
  };
  
  PerformanceTimer.prototype.end = function() {
    var totalElapsed = new Date().getTime() - this.startTime;
    
    var details = {
      totalElapsed: totalElapsed + 'ms',
      marks: this.marks.map(function(m) { return m.label + ': ' + m.elapsed + 'ms'; }).join(', ')
    };
    
    logInfo('Performance timer completed: ' + this.name, details, this.name);
    
    return totalElapsed;
  };
  
  // Return public API
  return {
    log: log,
    logError: logError,
    logWarning: logWarning,
    logInfo: logInfo,
    logDebug: logDebug,
    getRecentLogs: getRecentLogs,
    exportLogs: exportLogs,
    startTimer: startTimer
  };
})();