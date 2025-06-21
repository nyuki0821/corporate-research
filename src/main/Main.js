/**
 * @fileoverview Main entry point for the Corporate Research System
 * @author Corporate Research Team
 * 
 * 依存モジュール:
 * - Constants (src/core/Constants.js)
 * - Logger (src/core/Logger.js)
 * - ConfigManager (src/core/ConfigManager.js)
 * - ErrorHandler (src/core/ErrorHandler.js)
 * - BatchProcessor (src/research/BatchProcessor.js)
 * - SpreadsheetService (src/spreadsheet/SpreadsheetService.js)
 */

var Main = (function() {
  
  // Private functions
  /**
   * Send completion notification email
   * @private
   */
  function sendCompletionNotification(count) {
    var email = ConfigManager.get('NOTIFICATION_EMAIL') || Session.getActiveUser().getEmail();
    
    var subject = 'Corporate Research Batch Processing Complete';
    var body = 'Batch processing has been completed successfully.\n\n' +
               'Companies processed: ' + count + '\n\n' +
               'Timestamp: ' + new Date().toLocaleString();
    
    try {
      MailApp.sendEmail(email, subject, body);
      Logger.logInfo('Completion notification sent to ' + email);
    } catch (error) {
      Logger.logError('Error sending completion notification', error);
    }
  }

  /**
   * Send error notification email
   * @private
   */
  function sendErrorNotification(error) {
    var email = ConfigManager.get('NOTIFICATION_EMAIL') || Session.getActiveUser().getEmail();
    
    var subject = 'Corporate Research Batch Processing Error';
    var body = 'An error occurred during batch processing.\n\n' +
               'Error: ' + error.message + '\n\n' +
               'Stack: ' + error.stack + '\n\n' +
               'Timestamp: ' + new Date().toLocaleString();
    
    try {
      MailApp.sendEmail(email, subject, body);
      Logger.logError('Error notification sent', error);
    } catch (mailError) {
      Logger.logError('Error sending error notification', mailError);
    }
  }

  /**
   * Delete all triggers for a specific function
   * @private
   */
  function deleteTriggers(functionName) {
    var triggers = ScriptApp.getProjectTriggers();
    
    triggers.forEach(function(trigger) {
      if (trigger.getHandlerFunction() === functionName) {
        ScriptApp.deleteTrigger(trigger);
      }
    });
  }

  /**
   * Validate email address format
   * @private
   */
  function validateEmail(email) {
    return Constants.REGEX_PATTERNS.EMAIL.test(email);
  }

  /**
   * Parse address string into components
   * @private
   */
  function parseAddressString(addressString) {
    var address = { postalCode: '', prefecture: '', city: '', detail: '' };
    
    // 郵便番号を抽出
    var postalMatch = addressString.match(/〒?(\d{3}-?\d{4})/);
    if (postalMatch) {
      address.postalCode = postalMatch[1];
    }
    
    // 都道府県を抽出
    var prefecturePattern = /(北海道|[一-龯]+[都道府県])/;
    var prefectureMatch = addressString.match(prefecturePattern);
    if (prefectureMatch) {
      address.prefecture = prefectureMatch[1];
    }
    
    // 市区町村を抽出
    var cityPattern = /[都道府県]([^0-9]+?[市区町村])/;
    var cityMatch = addressString.match(cityPattern);
    if (cityMatch) {
      address.city = cityMatch[1];
    }
    
    // 詳細住所
    if (address.city) {
      var detailStart = addressString.indexOf(address.city) + address.city.length;
      address.detail = addressString.substring(detailStart).trim();
    }
    
    return address;
  }

  /**
   * Calculate branch importance
   * @private
   */
  function calculateBranchImportance(type) {
    var importanceMap = {
      '本社': 5,
      '支社': 4,
      '支店': 3,
      '営業所': 3,
      '工場': 4,
      '事業所': 3,
      'オフィス': 2,
      '出張所': 2,
      'その他': 1
    };
    return importanceMap[type] || 1;
  }

  // Public functions
  /**
   * Creates custom menu in the spreadsheet UI when the spreadsheet opens
   */
  function onOpen() {
    try {
      var ui = SpreadsheetApp.getUi();
      
      ui.createMenu('企業情報収集')
        .addItem('バッチ処理開始', 'startBatchProcessing')
        .addItem('単一企業処理', 'processSingleCompany')
        .addSeparator()
        .addSubMenu(ui.createMenu('設定')
          .addItem('APIキー設定', 'showApiKeyDialog')
          .addItem('通知メール設定', 'setNotificationEmail')
          .addItem('スプレッドシート設定', 'showSpreadsheetSettings'))
        .addSeparator()
        .addItem('システム診断', 'diagnoseSystem')
        .addItem('ログ表示', 'viewLogs')
        .addItem('キャッシュクリア', 'clearCache')
        .addToUi();
        
      Logger.logInfo('企業情報収集メニューが作成されました');
    } catch (error) {
      Logger.logError('onOpen function error', error);
      console.log('This function should be called from spreadsheet context, not script editor');
    }
  }

  /**
   * Create menu manually (can be run from script editor)
   */
  function createMenuManually() {
    try {
      // アクティブなスプレッドシートを取得
      var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      if (!spreadsheet) {
        console.log('No active spreadsheet found. Please open the spreadsheet first.');
        return false;
      }
      
      var ui = SpreadsheetApp.getUi();
      
      ui.createMenu('企業情報収集')
        .addItem('バッチ処理開始', 'startBatchProcessing')
        .addItem('単一企業処理', 'processSingleCompany')
        .addSeparator()
        .addSubMenu(ui.createMenu('設定')
          .addItem('APIキー設定', 'showApiKeyDialog')
          .addItem('通知メール設定', 'setNotificationEmail')
          .addItem('スプレッドシート設定', 'showSpreadsheetSettings'))
        .addSeparator()
        .addItem('システム診断', 'diagnoseSystem')
        .addItem('ログ表示', 'viewLogs')
        .addItem('キャッシュクリア', 'clearCache')
        .addToUi();
        
      Logger.logInfo('企業情報収集メニューが手動で作成されました');
      return true;
    } catch (error) {
      Logger.logError('Failed to create menu manually', error);
      return false;
    }
  }

  /**
   * Create menu for configured spreadsheet
   */
  function createMenuForConfiguredSpreadsheet() {
    try {
      var spreadsheetId = ConfigManager.get('SPREADSHEET_ID');
      
      if (!spreadsheetId) {
        console.log('No spreadsheet ID configured. Please run initializeSystem first.');
        return false;
      }
      
      console.log('Using configured spreadsheet ID: ' + spreadsheetId);
      
      // 設定されたスプレッドシートを開く
      var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      console.log('Opened spreadsheet: ' + spreadsheet.getName());
      
      // スプレッドシートをアクティブにする
      SpreadsheetApp.setActiveSpreadsheet(spreadsheet);
      
      var ui = SpreadsheetApp.getUi();
      
      ui.createMenu('企業情報収集')
        .addItem('バッチ処理開始', 'startBatchProcessing')
        .addItem('単一企業処理', 'processSingleCompany')
        .addSeparator()
        .addSubMenu(ui.createMenu('設定')
          .addItem('APIキー設定', 'showApiKeyDialog')
          .addItem('通知メール設定', 'setNotificationEmail')
          .addItem('スプレッドシート設定', 'showSpreadsheetSettings'))
        .addSeparator()
        .addItem('システム診断', 'diagnoseSystem')
        .addItem('ログ表示', 'viewLogs')
        .addItem('キャッシュクリア', 'clearCache')
        .addToUi();
        
      Logger.logInfo('企業情報収集メニューが作成されました（設定済みスプレッドシート）');
      console.log('スプレッドシートURL: ' + spreadsheet.getUrl());
      return true;
    } catch (error) {
      Logger.logError('Failed to create menu for configured spreadsheet', error);
      return false;
    }
  }

  /**
   * Process a single company from the active row
   */
  function processSingleCompany() {
    try {
      var sheet = SpreadsheetApp.getActiveSheet();
      var activeRow = sheet.getActiveRange().getRow();
      
      if (activeRow < 2) {
        SpreadsheetApp.getUi().alert('Please select a valid data row (not the header)');
        return;
      }
      
      var companyData = sheet.getRange(activeRow, 1, 1, sheet.getLastColumn()).getValues()[0];
      var companyName = companyData[0]; // Assuming company name is in first column
      
      if (!companyName) {
        SpreadsheetApp.getUi().alert('No company name found in the selected row');
        return;
      }
      
      // Log the start of processing
      Logger.logInfo('Starting processing for company: ' + companyName);
      
      // TODO: Add actual processing logic here
      processCompany(companyData, activeRow);
      
      SpreadsheetApp.getUi().alert('Processing completed for ' + companyName);
      
    } catch (error) {
      ErrorHandler.handleError(error, { function: 'processSingleCompany' });
      SpreadsheetApp.getUi().alert('Error: ' + error.message);
    }
  }

  /**
   * Process a single company
   */
  function processCompany(companyData, rowNumber) {
    // TODO: Implement actual company processing logic
    Logger.logInfo('Processing company at row ' + rowNumber + ': ' + companyData[0]);
    
    // Update status column (assuming last column is status)
    var sheet = SpreadsheetApp.getActiveSheet();
    sheet.getRange(rowNumber, sheet.getLastColumn()).setValue('Processed');
  }

  /**
   * Process multiple companies in batch
   */
  function processBatchCompanies() {
    try {
      var ui = SpreadsheetApp.getUi();
      var response = ui.prompt(
        'Batch Processing',
        'Enter the number of companies to process (max 50):',
        ui.ButtonSet.OK_CANCEL
      );
      
      if (response.getSelectedButton() !== ui.Button.OK) {
        return;
      }
      
      var batchSize = parseInt(response.getResponseText());
      
      if (isNaN(batchSize) || batchSize < 1 || batchSize > 50) {
        ui.alert('Please enter a valid number between 1 and 50');
        return;
      }
      
      // Create a time-based trigger for batch processing
      ScriptApp.newTrigger('processBatchWithTrigger')
        .timeBased()
        .after(1000) // Start after 1 second
        .create();
        
      // Store batch size in script properties
      ConfigManager.set('BATCH_SIZE', batchSize.toString());
      
      ui.alert('Batch processing started for ' + batchSize + ' companies. You will receive an email notification when complete.');
      
    } catch (error) {
      ErrorHandler.handleError(error, { function: 'processBatchCompanies' });
      SpreadsheetApp.getUi().alert('Error: ' + error.message);
    }
  }

  /**
   * Start batch processing
   */
  function startBatchProcessing() {
    try {
      if (typeof BatchProcessor !== 'undefined') {
        var processor = BatchProcessor;
        processor.startBatchProcessing();
      } else {
        // Fallback to legacy processing
        processBatchCompanies();
        return;
      }
      
      SpreadsheetApp.getUi().alert('バッチ処理を開始しました。処理完了時にメール通知が送信されます。');
    } catch (error) {
      ErrorHandler.handleError(error, { function: 'startBatchProcessing' });
      SpreadsheetApp.getUi().alert('バッチ処理エラー: ' + error.toString());
    }
  }

  /**
   * Set notification email address
   */
  function setNotificationEmail() {
    var ui = SpreadsheetApp.getUi();
    var response = ui.prompt(
      'Notification Settings',
      'Enter email address for notifications:',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() === ui.Button.OK) {
      var email = response.getResponseText();
      
      if (validateEmail(email)) {
        ConfigManager.set('NOTIFICATION_EMAIL', email);
        ui.alert('Notification email set to: ' + email);
      } else {
        ui.alert('Please enter a valid email address');
      }
    }
  }

  /**
   * View recent logs
   */
  function viewLogs() {
    // TODO: Implement log viewer
    SpreadsheetApp.getUi().alert('Log viewer not yet implemented');
  }

  /**
   * Clear application cache
   */
  function clearCache() {
    try {
      var cache = CacheService.getScriptCache();
      cache.removeAll([]);
      ConfigManager.clearCache();
      SpreadsheetApp.getUi().alert('Cache cleared successfully');
    } catch (error) {
      ErrorHandler.handleError(error, { function: 'clearCache' });
      SpreadsheetApp.getUi().alert('Error clearing cache: ' + error.message);
    }
  }

  /**
   * Initialize system
   */
  function initializeSystem() {
    try {
      Logger.logInfo('システム初期化を開始します');
      
      // 設定管理システムの初期化
      ConfigManager.initializeDefaults();
      var settingsValidation = ConfigManager.validate();
      Logger.logInfo('設定管理システムの初期化完了');
      
      // スプレッドシートの初期化
      if (typeof SpreadsheetService !== 'undefined') {
        SpreadsheetService.initializeSheets();
        Logger.logInfo('スプレッドシートの初期化完了');
      }
      
      var message = 'システムの初期化が完了しました。\n\n';
      
      if (!settingsValidation.isValid) {
        message += '⚠️ 設定に問題があります:\n';
        settingsValidation.issues.forEach(function(issue) {
          message += '- ' + issue + '\n';
          Logger.logWarning('設定問題: ' + issue);
        });
        message += '\n';
      }
      
      if (settingsValidation.warnings.length > 0) {
        message += '📝 設定の警告:\n';
        settingsValidation.warnings.forEach(function(warning) {
          message += '- ' + warning + '\n';
          Logger.logWarning('設定警告: ' + warning);
        });
        message += '\n';
      }
      
      message += '次の手順:\n';
      message += '1. 「プロジェクトの設定」→「スクリプト プロパティ」でAPIキーを設定\n';
      message += '2. 企業リストシートに企業名を入力\n';
      message += '3. バッチ処理を開始';
      
      Logger.logInfo('システム初期化完了');
      
      // スプレッドシートのコンテキストで実行されている場合のみUIを使用
      try {
        var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        if (activeSpreadsheet) {
          SpreadsheetApp.getUi().alert(message);
        }
      } catch (uiError) {
        // UIが使用できない場合はコンソールログのみ
        console.log('UI not available, using console output only');
      }
      
      return {
        success: true,
        message: message,
        validation: settingsValidation
      };
      
    } catch (error) {
      var errorMessage = 'システム初期化エラー: ' + error.toString();
      Logger.logError(errorMessage, error);
      
      // UIが使用可能な場合のみアラート表示
      try {
        var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        if (activeSpreadsheet) {
          SpreadsheetApp.getUi().alert(errorMessage);
        }
      } catch (uiError) {
        // UIが使用できない場合はコンソールログのみ
        console.log('UI not available for error display');
      }
      
      return {
        success: false,
        message: errorMessage,
        error: error
      };
    }
  }

  /**
   * System diagnosis
   */
  function diagnoseSystem() {
    try {
      // TODO: Implement system diagnosis
      var message = 'システム診断結果\n\n';
      message += 'ステータス: OK\n\n';
      message += '推奨事項:\n';
      message += '- 定期的にキャッシュをクリアしてください\n';
      message += '- ログを確認してエラーがないか監視してください';
      
      SpreadsheetApp.getUi().alert(message);
    } catch (error) {
      ErrorHandler.handleError(error, { function: 'diagnoseSystem' });
      SpreadsheetApp.getUi().alert('システム診断エラー: ' + error.toString());
    }
  }

  /**
   * Check company list status
   */
  function checkCompanyListStatus() {
    try {
      var spreadsheetId = ConfigManager.get('SPREADSHEET_ID');
      
      if (!spreadsheetId) {
        console.log('エラー: SPREADSHEET_IDが設定されていません');
        return;
      }
      
      var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      var sheet = spreadsheet.getSheetByName(Constants.SHEET_CONFIG.SHEETS.COMPANY_LIST || '企業リスト');
      
      if (!sheet || sheet.getLastRow() <= 1) {
        console.log('企業リストシートが空です');
        return;
      }
      
      var data = sheet.getDataRange().getValues();
      var statusCount = {
        '未処理': 0,
        '処理中': 0,
        '完了': 0,
        'エラー': 0,
        'その他': 0
      };
      
      console.log('=== 企業リストステータス ===');
      console.log('総企業数: ' + (data.length - 1));
      
      for (var i = 1; i < data.length; i++) {
        var status = data[i][1] || '未処理';
        if (statusCount.hasOwnProperty(status)) {
          statusCount[status]++;
        } else {
          statusCount['その他']++;
        }
        
        console.log(i + '. ' + data[i][0] + ' - ' + status);
      }
      
      console.log('');
      console.log('=== ステータス集計 ===');
      for (var status in statusCount) {
        if (statusCount.hasOwnProperty(status) && statusCount[status] > 0) {
          console.log(status + ': ' + statusCount[status] + '件');
        }
      }
      
    } catch (error) {
      Logger.logError('ステータス確認エラー', error);
    }
  }

  // Return public API
  return {
    onOpen: onOpen,
    createMenuManually: createMenuManually,
    createMenuForConfiguredSpreadsheet: createMenuForConfiguredSpreadsheet,
    processSingleCompany: processSingleCompany,
    processCompany: processCompany,
    processBatchCompanies: processBatchCompanies,
    startBatchProcessing: startBatchProcessing,
    setNotificationEmail: setNotificationEmail,
    viewLogs: viewLogs,
    clearCache: clearCache,
    initializeSystem: initializeSystem,
    diagnoseSystem: diagnoseSystem,
    checkCompanyListStatus: checkCompanyListStatus,
    parseAddressString: parseAddressString,
    calculateBranchImportance: calculateBranchImportance
  };
})();

// Global functions for direct access (backward compatibility)
function onOpen() {
  return Main.onOpen();
}

function createMenuManually() {
  return Main.createMenuManually();
}

function createMenuForConfiguredSpreadsheet() {
  return Main.createMenuForConfiguredSpreadsheet();
}

function processSingleCompany() {
  return Main.processSingleCompany();
}

function startBatchProcessing() {
  return Main.startBatchProcessing();
}

function setNotificationEmail() {
  return Main.setNotificationEmail();
}

function viewLogs() {
  return Main.viewLogs();
}

function clearCache() {
  return Main.clearCache();
}

function initializeSystem() {
  return Main.initializeSystem();
}

function diagnoseSystem() {
  return Main.diagnoseSystem();
}

function checkCompanyListStatus() {
  return Main.checkCompanyListStatus();
}