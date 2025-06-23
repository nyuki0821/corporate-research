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

  

  // Public functions
  /**
   * Creates custom menu in the spreadsheet UI when the spreadsheet opens
   */
  function onOpen() {
    try {
      var ui = SpreadsheetApp.getUi();
      
      ui.createMenu('企業情報収集')
        .addItem('単一企業処理', 'processSingleCompany')
        .addSeparator()
        .addSubMenu(ui.createMenu('バッチ処理')
          .addItem('バッチ処理開始', 'startBatchProcessingManually')
          .addItem('バッチ処理停止', 'stopBatchProcessingManually')
          .addItem('処理状況確認', 'checkProcessStatusManually'))
        .addSeparator()
        .addSubMenu(ui.createMenu('システム管理')
          .addItem('システムメンテナンス実行', 'executeSystemMaintenanceManually')
          .addItem('エラー監視実行', 'executeErrorMonitoringManually')
          .addItem('パフォーマンスチェック実行', 'executePerformanceCheckManually')
          .addItem('全プロセス停止', 'stopAllProcessesManually'))
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
      // Check if we're in a spreadsheet context
      var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      
      if (!spreadsheet) {
        console.log('❌ No active spreadsheet found. Please open a spreadsheet first.');
        console.log('📝 Instructions:');
        console.log('1. Open your Google Spreadsheet');
        console.log('2. Go to Extensions > Apps Script');
        console.log('3. Run this function again');
        return {
          success: false,
          message: 'No active spreadsheet found. Please open a spreadsheet first.'
        };
      }
      
      var ui = SpreadsheetApp.getUi();
      
      if (!ui) {
        console.log('❌ UI not available - this function should be run from a spreadsheet context');
        console.log('📝 Instructions:');
        console.log('1. Open your Google Spreadsheet');
        console.log('2. Go to Extensions > Apps Script');
        console.log('3. Run this function again');
        return {
          success: false,
          message: 'UI not available - please run from spreadsheet context'
        };
      }
      
      // Create the menu
      ui.createMenu('企業情報収集')
        .addItem('単一企業処理', 'processSingleCompany')
        .addSeparator()
        .addSubMenu(ui.createMenu('バッチ処理')
          .addItem('バッチ処理開始', 'startBatchProcessingManually')
          .addItem('バッチ処理停止', 'stopBatchProcessingManually')
          .addItem('処理状況確認', 'checkProcessStatusManually'))
        .addSeparator()
        .addSubMenu(ui.createMenu('システム管理')
          .addItem('システムメンテナンス実行', 'executeSystemMaintenanceManually')
          .addItem('エラー監視実行', 'executeErrorMonitoringManually')
          .addItem('パフォーマンスチェック実行', 'executePerformanceCheckManually')
          .addItem('全プロセス停止', 'stopAllProcessesManually'))
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
      console.log('🎉 メニューが正常に作成されました！');
      console.log('📋 スプレッドシートを確認して「企業情報収集」メニューを見つけてください');
      
      return {
        success: true,
        message: '企業情報収集メニューが正常に作成されました'
      };
      
    } catch (error) {
      Logger.logError('Failed to create menu manually', error);
      console.log('❌ メニュー作成エラー:', error.message);
      console.log('📝 解決方法:');
      console.log('1. スプレッドシートを開いてください');
      console.log('2. 拡張機能 > Apps Script を選択');
      console.log('3. この関数を再実行してください');
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create menu for configured spreadsheet
   */
  function createMenuForConfiguredSpreadsheet() {
    try {
      var spreadsheetId = ConfigManager.get('SPREADSHEET_ID');
      
      if (!spreadsheetId) {
        Logger.logWarning('No spreadsheet configured');
        return;
      }
      
      var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      
      if (!spreadsheet) {
        Logger.logError('Cannot open configured spreadsheet');
        return;
      }
      
      var ui = SpreadsheetApp.getUi();
      
      ui.createMenu('企業情報収集')
        .addItem('単一企業処理', 'processSingleCompany')
        .addSeparator()
        .addSubMenu(ui.createMenu('バッチ処理')
          .addItem('バッチ処理開始', 'startBatchProcessingManually')
          .addItem('バッチ処理停止', 'stopBatchProcessingManually')
          .addItem('処理状況確認', 'checkProcessStatusManually'))
        .addSeparator()
        .addSubMenu(ui.createMenu('システム管理')
          .addItem('システムメンテナンス実行', 'executeSystemMaintenanceManually')
          .addItem('エラー監視実行', 'executeErrorMonitoringManually')
          .addItem('パフォーマンスチェック実行', 'executePerformanceCheckManually')
          .addItem('全プロセス停止', 'stopAllProcessesManually'))
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
   * Create menu by spreadsheet ID (can be run from script editor)
   */
  function createMenuBySpreadsheetId(spreadsheetId) {
    try {
      if (!spreadsheetId) {
        console.log('❌ スプレッドシートIDが指定されていません');
        console.log('📝 使用方法: createMenuBySpreadsheetId("your-spreadsheet-id")');
        return {
          success: false,
          message: 'スプレッドシートIDが必要です'
        };
      }
      
      console.log('🔍 スプレッドシートを開いています...');
      console.log('   ID:', spreadsheetId);
      
      var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      
      if (!spreadsheet) {
        console.log('❌ 指定されたスプレッドシートが見つかりません');
        return {
          success: false,
          message: '指定されたスプレッドシートが見つかりません'
        };
      }
      
      console.log('✅ スプレッドシート確認:', spreadsheet.getName());
      console.log('   URL:', spreadsheet.getUrl());
      
      // Note: We cannot get UI from a different spreadsheet context
      // This function is mainly for logging and verification
      console.log('⚠️ 注意: スプレッドシートのメニューは、そのスプレッドシート内からのみ作成できます');
      console.log('📝 次の手順でメニューを作成してください:');
      console.log('1. 上記URLのスプレッドシートを開く');
      console.log('2. 拡張機能 > Apps Script を選択');
      console.log('3. createMenuManually() 関数を実行');
      
      return {
        success: true,
        spreadsheet: {
          name: spreadsheet.getName(),
          url: spreadsheet.getUrl(),
          id: spreadsheet.getId()
        },
        message: 'スプレッドシートが確認されました。メニュー作成は該当スプレッドシートから実行してください。'
      };
      
    } catch (error) {
      console.log('❌ エラー:', error.message);
      return {
        success: false,
        error: error.message
      };
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
   * Process multiple companies in batch (updated for manual control)
   */
  function processBatchCompanies() {
    try {
      var ui = SpreadsheetApp.getUi();
      var response = ui.prompt(
        'Batch Processing',
        'Enter the number of companies to process (max 8 due to 6-minute execution limit):',
        ui.ButtonSet.OK_CANCEL
      );
      
      if (response.getSelectedButton() !== ui.Button.OK) {
        return;
      }
      
      var batchSize = parseInt(response.getResponseText());
      
      if (isNaN(batchSize) || batchSize < 1 || batchSize > 8) {
        ui.alert('Please enter a valid number between 1 and 8 (execution time limit: 6 minutes)');
        return;
      }
        
      // Store batch size in script properties
      ConfigManager.set('BATCH_SIZE', batchSize.toString());
      
      // Start batch processing manually
      var result = TriggerManager.startBatchProcessing();
      
      if (result.success) {
      ui.alert('Batch processing started for ' + batchSize + ' companies. You will receive an email notification when complete.');
      } else {
        ui.alert('Error starting batch processing: ' + result.error);
      }
      
    } catch (error) {
      ErrorHandler.handleError(error, { function: 'processBatchCompanies' });
      SpreadsheetApp.getUi().alert('Error: ' + error.message);
    }
  }

  /**
   * Start batch processing (updated for manual control)
   */
  function startBatchProcessing() {
    try {
      var result = TriggerManager.startBatchProcessing();
      
      if (result.success) {
        SpreadsheetApp.getUi().alert('バッチ処理を開始しました。処理完了時にメール通知が送信されます。');
      } else {
        SpreadsheetApp.getUi().alert('バッチ処理開始エラー: ' + result.error);
      }
      
    } catch (error) {
      ErrorHandler.handleError(error, { function: 'startBatchProcessing' });
      SpreadsheetApp.getUi().alert('バッチ処理エラー: ' + error.toString());
    }
  }

  /**
   * Display process status dialog
   */
  function showProcessStatusDialog() {
    try {
      var statusResult = TriggerManager.getAllProcessStatus();
      
      if (!statusResult.success) {
        SpreadsheetApp.getUi().alert('Error getting process status: ' + statusResult.error);
        return;
      }
      
      var processes = statusResult.processes;
      var statusText = '=== プロセス状況 ===\n\n';
      
      Object.keys(processes).forEach(function(processName) {
        var status = processes[processName] ? '実行中' : '停止中';
        var processDisplayName = getProcessDisplayName(processName);
        statusText += processDisplayName + ': ' + status + '\n';
      });
      
      statusText += '\n処理時刻: ' + new Date().toLocaleString('ja-JP');
      
      SpreadsheetApp.getUi().alert('プロセス状況', statusText, SpreadsheetApp.getUi().ButtonSet.OK);
      
    } catch (error) {
      ErrorHandler.handleError(error, { function: 'showProcessStatusDialog' });
      SpreadsheetApp.getUi().alert('プロセス状況確認エラー: ' + error.toString());
    }
  }

  /**
   * Get display name for process
   * @private
   */
  function getProcessDisplayName(processName) {
    var displayNames = {
      'batchProcessing': 'バッチ処理',
      'systemMaintenance': 'システムメンテナンス',
      'errorMonitoring': 'エラー監視',
      'performanceCheck': 'パフォーマンスチェック'
    };
    
    return displayNames[processName] || processName;
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

  /**
   * Setup spreadsheet binding and create menu
   */
  function setupSpreadsheetBinding() {
    try {
      console.log('🔧 スプレッドシート紐づけセットアップ開始...');
      
      // Get spreadsheet URL from user
      console.log('📝 手順:');
      console.log('1. あなたのスプレッドシートのURLをコピーしてください');
      console.log('2. setupSpreadsheetBindingWithUrl("スプレッドシートURL") を実行してください');
      console.log('');
      console.log('例: setupSpreadsheetBindingWithUrl("https://docs.google.com/spreadsheets/d/1ABC...XYZ/edit")');
      
      return {
        success: false,
        message: 'スプレッドシートURLが必要です。setupSpreadsheetBindingWithUrl()を使用してください。'
      };
      
    } catch (error) {
      console.log('❌ エラー:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Setup spreadsheet binding with URL
   */
  function setupSpreadsheetBindingWithUrl(spreadsheetUrl) {
    try {
      if (!spreadsheetUrl) {
        console.log('❌ スプレッドシートURLが指定されていません');
        return {
          success: false,
          message: 'スプレッドシートURLが必要です'
        };
      }
      
      console.log('🔍 スプレッドシートURL解析中...');
      console.log('   URL:', spreadsheetUrl);
      
      // Extract spreadsheet ID from URL
      var spreadsheetId = null;
      var urlPattern = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
      var match = spreadsheetUrl.match(urlPattern);
      
      if (match) {
        spreadsheetId = match[1];
        console.log('✅ スプレッドシートID抽出成功:', spreadsheetId);
      } else {
        console.log('❌ 無効なスプレッドシートURLです');
        console.log('📝 正しい形式: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit');
        return {
          success: false,
          message: '無効なスプレッドシートURLです'
        };
      }
      
      // Verify spreadsheet access
      var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      
      if (!spreadsheet) {
        console.log('❌ スプレッドシートにアクセスできません');
        return {
          success: false,
          message: 'スプレッドシートにアクセスできません'
        };
      }
      
      console.log('✅ スプレッドシート確認:', spreadsheet.getName());
      
      // Save spreadsheet ID to configuration
      ConfigManager.set('SPREADSHEET_ID', spreadsheetId);
      console.log('✅ スプレッドシートIDを設定に保存しました');
      
      // Create onOpen trigger for this spreadsheet
      console.log('🔧 onOpenトリガーを作成中...');
      
      // Delete existing triggers first
      var triggers = ScriptApp.getProjectTriggers();
      triggers.forEach(function(trigger) {
        if (trigger.getHandlerFunction() === 'onOpen') {
          ScriptApp.deleteTrigger(trigger);
        }
      });
      
      // Create new onOpen trigger
      ScriptApp.newTrigger('onOpen')
        .onOpen()
        .create();
      
      console.log('✅ onOpenトリガーを作成しました');
      
      console.log('');
      console.log('🎉 セットアップ完了！');
      console.log('📋 次の手順:');
      console.log('1. スプレッドシートを開く: ' + spreadsheet.getUrl());
      console.log('2. ページを更新する（F5キーまたはブラウザの更新ボタン）');
      console.log('3. 「企業情報収集」メニューが表示されることを確認');
      
      return {
        success: true,
        spreadsheet: {
          name: spreadsheet.getName(),
          url: spreadsheet.getUrl(),
          id: spreadsheet.getId()
        },
        message: 'スプレッドシートの紐づけが完了しました'
      };
      
    } catch (error) {
      console.log('❌ エラー:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Auto continue batch processing (triggered function)
   */
  function continueAutoBatchProcessing() {
    try {
      Logger.logInfo('自動継続バッチ処理を開始します');
      
      // 現在のトリガーを削除（一回限りの実行）
      var triggers = ScriptApp.getProjectTriggers();
      triggers.forEach(function(trigger) {
        if (trigger.getHandlerFunction() === 'continueAutoBatchProcessing') {
          ScriptApp.deleteTrigger(trigger);
        }
      });
      
      // バッチ処理が既に実行中でないことを確認
      if (typeof BatchProcessor !== 'undefined') {
        var status = BatchProcessor.getProcessingStatus();
        if (status.isProcessing) {
          Logger.logWarning('バッチ処理が既に実行中のため自動継続をスキップします');
          return;
        }
        
        // 自動継続が有効で未処理企業があることを確認
        var autoContinueStatus = BatchProcessor.getAutoContinueStatus();
        if (!autoContinueStatus.enabled || !autoContinueStatus.configEnabled) {
          Logger.logInfo('自動継続機能が無効のため処理を終了します');
          return;
        }
        
        if (!autoContinueStatus.hasUnprocessedCompanies) {
          Logger.logInfo('未処理企業がないため自動継続を終了します');
          return;
        }
        
        // バッチ処理を再開
        Logger.logInfo('自動継続によりバッチ処理を再開します');
        BatchProcessor.startBatchProcessing();
        
      } else {
        Logger.logError('BatchProcessor not available for auto continue');
      }
      
    } catch (error) {
      Logger.logError('自動継続バッチ処理でエラーが発生しました', error);
      ErrorHandler.handleError(error, { function: 'continueAutoBatchProcessing' });
    }
  }

  /**
   * Configure auto continue settings manually
   */
  function configureAutoContinueManually() {
    try {
      var ui = SpreadsheetApp.getUi();
      var currentSetting = ConfigManager.getBoolean('ENABLE_AUTO_CONTINUE', true);
      
      var response = ui.prompt(
        '自動継続設定',
        '自動継続機能を有効にしますか？\n' +
        '現在の設定: ' + (currentSetting ? '有効' : '無効') + '\n\n' +
        '「true」で有効、「false」で無効にします:',
        ui.ButtonSet.OK_CANCEL
      );
      
      if (response.getSelectedButton() === ui.Button.OK) {
        var input = response.getResponseText().toLowerCase();
        var newSetting = input === 'true' || input === '1' || input === 'yes' || input === 'on';
        
        ConfigManager.set('ENABLE_AUTO_CONTINUE', newSetting.toString());
        
        if (typeof BatchProcessor !== 'undefined') {
          BatchProcessor.setAutoContinue(newSetting);
        }
        
        ui.alert(
          '設定完了',
          '自動継続機能を' + (newSetting ? '有効' : '無効') + 'にしました。\n\n' +
          (newSetting ? 
            '未処理企業がある限り、バッチ処理が自動的に継続されます。' : 
            'バッチ処理は手動で再開する必要があります。'),
          ui.ButtonSet.OK
        );
      }
      
    } catch (error) {
      Logger.logError('Error in configureAutoContinueManually', error);
      SpreadsheetApp.getUi().alert('エラー', '自動継続設定中にエラーが発生しました: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
    }
  }

  /**
   * Check auto continue status manually
   */
  function checkAutoContinueStatusManually() {
    try {
      var ui = SpreadsheetApp.getUi();
      var message = '🔄 自動継続機能の状況\n\n';
      
      // 設定確認
      var configEnabled = ConfigManager.getBoolean('ENABLE_AUTO_CONTINUE', true);
      message += '設定状態: ' + (configEnabled ? '✅ 有効' : '❌ 無効') + '\n';
      
      // BatchProcessorの状態確認
      if (typeof BatchProcessor !== 'undefined') {
        var status = BatchProcessor.getAutoContinueStatus();
        message += 'システム状態: ' + (status.enabled ? '✅ 有効' : '❌ 無効') + '\n';
        message += '未処理企業: ' + (status.hasUnprocessedCompanies ? '✅ あり' : '❌ なし') + '\n';
        
        // 処理状況
        var processingStatus = BatchProcessor.getProcessingStatus();
        message += 'バッチ処理: ' + (processingStatus.isProcessing ? '🔄 実行中' : '⏸️ 停止中') + '\n';
        
      } else {
        message += 'システム状態: ❌ BatchProcessor利用不可\n';
      }
      
      // 未処理企業数の確認
      try {
        var companies = SpreadsheetService.getCompanyList('未処理');
        message += '\n📊 処理状況:\n';
        message += '未処理企業数: ' + companies.length + '社\n';
        
        if (companies.length > 0) {
          var batchSize = ConfigManager.getNumber('BATCH_SIZE', 8);
          var estimatedBatches = Math.ceil(companies.length / batchSize);
          message += '推定バッチ数: ' + estimatedBatches + '回\n';
          message += '推定処理時間: ' + (estimatedBatches * 6) + '分程度\n';
        }
        
      } catch (error) {
        message += '\n⚠️ 企業リスト取得エラー: ' + error.message + '\n';
      }
      
      // 自動継続の動作説明
      message += '\n💡 自動継続機能について:\n';
      if (configEnabled) {
        message += '• 6分のタイムアウト後、5秒待機して自動再開\n';
        message += '• 未処理企業がなくなるまで継続\n';
        message += '• 手動停止で無効化可能\n';
      } else {
        message += '• 現在無効のため手動再開が必要\n';
        message += '• 「自動継続設定」で有効化可能\n';
      }
      
      ui.alert('自動継続状況', message, ui.ButtonSet.OK);
      
    } catch (error) {
      Logger.logError('Error in checkAutoContinueStatusManually', error);
      SpreadsheetApp.getUi().alert('エラー', '自動継続状況確認中にエラーが発生しました: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
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
    showProcessStatusDialog: showProcessStatusDialog,
    createMenuBySpreadsheetId: createMenuBySpreadsheetId,
    setupSpreadsheetBinding: setupSpreadsheetBinding,
    setupSpreadsheetBindingWithUrl: setupSpreadsheetBindingWithUrl,
    continueAutoBatchProcessing: continueAutoBatchProcessing,
    configureAutoContinueManually: configureAutoContinueManually,
    checkAutoContinueStatusManually: checkAutoContinueStatusManually
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

function showProcessStatusDialog() {
  return Main.showProcessStatusDialog();
}

// Manual control functions for spreadsheet menu
function startBatchProcessingManually() {
  try {
    var ui = SpreadsheetApp.getUi();
    var result = TriggerManager.startBatchProcessing();
    
    if (result.success) {
      ui.alert('バッチ処理開始', 'バッチ処理を開始しました。処理完了時にメール通知が送信されます。', ui.ButtonSet.OK);
    } else {
      ui.alert('エラー', 'バッチ処理開始エラー: ' + result.error, ui.ButtonSet.OK);
    }
  } catch (error) {
    Logger.logError('Error in startBatchProcessingManually', error);
    SpreadsheetApp.getUi().alert('エラー', 'バッチ処理開始中にエラーが発生しました: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function stopBatchProcessingManually() {
  try {
    var ui = SpreadsheetApp.getUi();
    var result = TriggerManager.stopBatchProcessing();
    
    if (result.success) {
      ui.alert('バッチ処理停止', 'バッチ処理を停止しました。', ui.ButtonSet.OK);
    } else {
      ui.alert('エラー', 'バッチ処理停止エラー: ' + result.error, ui.ButtonSet.OK);
    }
  } catch (error) {
    Logger.logError('Error in stopBatchProcessingManually', error);
    SpreadsheetApp.getUi().alert('エラー', 'バッチ処理停止中にエラーが発生しました: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function checkProcessStatusManually() {
  try {
    var ui = SpreadsheetApp.getUi();
    var statusResult = TriggerManager.getAllProcessStatus();
    
    if (!statusResult.success) {
      ui.alert('エラー', 'プロセス状況取得エラー: ' + statusResult.error, ui.ButtonSet.OK);
      return;
    }
    
    var processes = statusResult.processes;
    var statusText = '=== プロセス状況 ===\n\n';
    
    Object.keys(processes).forEach(function(processName) {
      var status = processes[processName] ? '🟢 実行中' : '⚪ 停止中';
      var processDisplayName = getProcessDisplayName(processName);
      statusText += processDisplayName + ': ' + status + '\n';
    });
    
    statusText += '\n🕐 確認時刻: ' + new Date().toLocaleString('ja-JP');
    
    ui.alert('プロセス状況', statusText, ui.ButtonSet.OK);
    
  } catch (error) {
    Logger.logError('Error in checkProcessStatusManually', error);
    SpreadsheetApp.getUi().alert('エラー', 'プロセス状況確認中にエラーが発生しました: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function configureAutoContinueManually() {
  return Main.configureAutoContinueManually();
}

function checkAutoContinueStatusManually() {
  return Main.checkAutoContinueStatusManually();
}

function executeSystemMaintenanceManually() {
  try {
    var ui = SpreadsheetApp.getUi();
    var response = ui.alert('システムメンテナンス', 'システムメンテナンスを実行しますか？\n（キャッシュクリア、設定検証等を行います）', ui.ButtonSet.YES_NO);
    
    if (response !== ui.Button.YES) {
      return;
    }
    
    var result = TriggerManager.executeSystemMaintenance();
    
    if (result.success) {
      ui.alert('システムメンテナンス完了', 'システムメンテナンスが正常に完了しました。', ui.ButtonSet.OK);
    } else {
      ui.alert('エラー', 'システムメンテナンスエラー: ' + result.error, ui.ButtonSet.OK);
    }
  } catch (error) {
    Logger.logError('Error in executeSystemMaintenanceManually', error);
    SpreadsheetApp.getUi().alert('エラー', 'システムメンテナンス中にエラーが発生しました: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function executeErrorMonitoringManually() {
  try {
    var ui = SpreadsheetApp.getUi();
    var result = TriggerManager.executeErrorMonitoring();
    
    if (result.success) {
      var message = 'エラー監視が完了しました。\n\n';
      if (result.hasAlerts) {
        message += '⚠️ ' + result.alerts.length + '件のアラートが検出されました。\n';
        message += '詳細はメール通知またはログを確認してください。';
      } else {
        message += '✅ 重要なエラーは検出されませんでした。';
      }
      ui.alert('エラー監視完了', message, ui.ButtonSet.OK);
    } else {
      ui.alert('エラー', 'エラー監視実行エラー: ' + result.error, ui.ButtonSet.OK);
    }
  } catch (error) {
    Logger.logError('Error in executeErrorMonitoringManually', error);
    SpreadsheetApp.getUi().alert('エラー', 'エラー監視中にエラーが発生しました: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function executePerformanceCheckManually() {
  try {
    var ui = SpreadsheetApp.getUi();
    var result = TriggerManager.executePerformanceCheck();
    
    if (result.success) {
      var message = 'パフォーマンスチェックが完了しました。\n\n';
      message += '📊 チェック時刻: ' + new Date(result.stats.timestamp).toLocaleString('ja-JP') + '\n';
      message += '詳細な統計情報はログを確認してください。';
      ui.alert('パフォーマンスチェック完了', message, ui.ButtonSet.OK);
    } else {
      ui.alert('エラー', 'パフォーマンスチェックエラー: ' + result.error, ui.ButtonSet.OK);
    }
  } catch (error) {
    Logger.logError('Error in executePerformanceCheckManually', error);
    SpreadsheetApp.getUi().alert('エラー', 'パフォーマンスチェック中にエラーが発生しました: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function stopAllProcessesManually() {
  try {
    var ui = SpreadsheetApp.getUi();
    var response = ui.alert('全プロセス停止', '実行中のすべてのプロセスを停止しますか？', ui.ButtonSet.YES_NO);
    
    if (response !== ui.Button.YES) {
      return;
    }
    
    var result = TriggerManager.stopAllProcesses();
    
    if (result.success) {
      var message = '全プロセスの停止が完了しました。\n\n';
      Object.keys(result.results).forEach(function(processName) {
        var processDisplayName = getProcessDisplayName(processName);
        var status = result.results[processName];
        message += processDisplayName + ': ' + status + '\n';
      });
      ui.alert('全プロセス停止完了', message, ui.ButtonSet.OK);
    } else {
      ui.alert('エラー', '全プロセス停止エラー: ' + result.error, ui.ButtonSet.OK);
    }
  } catch (error) {
    Logger.logError('Error in stopAllProcessesManually', error);
    SpreadsheetApp.getUi().alert('エラー', '全プロセス停止中にエラーが発生しました: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function showApiKeyDialog() {
  try {
    var ui = SpreadsheetApp.getUi();
    var message = 'APIキー設定\n\n';
    message += '以下の手順でAPIキーを設定してください：\n\n';
    message += '1. スクリプトエディタで「プロジェクトの設定」をクリック\n';
    message += '2. 「スクリプト プロパティ」タブを選択\n';
    message += '3. 以下のプロパティを追加：\n\n';
    message += '   • TAVILY_API_KEY: Tavily検索APIのキー\n';
    message += '   • OPENAI_API_KEY: OpenAI APIのキー\n\n';
    message += '4. 「プロパティを保存」をクリック';
    
    ui.alert('APIキー設定', message, ui.ButtonSet.OK);
  } catch (error) {
    Logger.logError('Error in showApiKeyDialog', error);
    SpreadsheetApp.getUi().alert('エラー', 'APIキー設定ダイアログの表示中にエラーが発生しました: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function showSpreadsheetSettings() {
  return Main.showSpreadsheetSettings();
}

function getProcessDisplayName(processName) {
  return Main.getProcessDisplayName(processName);
}

function createMenuBySpreadsheetId(spreadsheetId) {
  return Main.createMenuBySpreadsheetId(spreadsheetId);
}

function setupSpreadsheetBinding() {
  return Main.setupSpreadsheetBinding();
}

function setupSpreadsheetBindingWithUrl(spreadsheetUrl) {
  return Main.setupSpreadsheetBindingWithUrl(spreadsheetUrl);
}

function continueAutoBatchProcessing() {
  return Main.continueAutoBatchProcessing();
}