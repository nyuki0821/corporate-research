/**
 * @fileoverview Spreadsheet service for the Corporate Research System
 * @author Corporate Research Team
 * 
 * 依存モジュール:
 * - Constants (src/core/Constants.js)
 * - Logger (src/core/Logger.js)
 * - ConfigManager (src/core/ConfigManager.js)
 * - ErrorHandler (src/core/ErrorHandler.js)
 */

var SpreadsheetService = (function() {
  // Private variables
  var _spreadsheet = null;

  // Private functions
  /**
   * Get target spreadsheet
   * @private
   */
  function getTargetSpreadsheet() {
    var spreadsheetId = ConfigManager.get('SPREADSHEET_ID');
    
    if (spreadsheetId) {
      try {
        // 指定されたIDのスプレッドシートを取得
        var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
        Logger.logInfo('Using configured spreadsheet: ' + spreadsheet.getName());
        return spreadsheet;
      } catch (error) {
        Logger.logError('Failed to open spreadsheet with ID ' + spreadsheetId, error);
        
        // 自動作成が有効な場合は新規作成
        if (ConfigManager.getBoolean('AUTO_CREATE_SPREADSHEET')) {
          return createNewSpreadsheet();
        } else {
          throw new Error('Configured spreadsheet not found: ' + spreadsheetId);
        }
      }
    }
    
    // IDが設定されていない場合
    try {
      // 現在のアクティブスプレッドシートを使用
      var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      if (activeSpreadsheet) {
        Logger.logInfo('Using active spreadsheet: ' + activeSpreadsheet.getName());
        // IDを設定に保存
        ConfigManager.set('SPREADSHEET_ID', activeSpreadsheet.getId());
        return activeSpreadsheet;
      }
    } catch (error) {
      Logger.logDebug('No active spreadsheet available');
    }
    
    // 自動作成が有効な場合は新規作成
    if (ConfigManager.getBoolean('AUTO_CREATE_SPREADSHEET')) {
      return createNewSpreadsheet();
    }
    
    throw new Error('No spreadsheet configured and auto-creation is disabled');
  }

  /**
   * Create new spreadsheet
   * @private
   */
  function createNewSpreadsheet() {
    var spreadsheetName = ConfigManager.get('SPREADSHEET_NAME');
    var spreadsheet = SpreadsheetApp.create(spreadsheetName);
    
    Logger.logInfo('Created new spreadsheet: ' + spreadsheet.getName());
    Logger.logInfo('Spreadsheet URL: ' + spreadsheet.getUrl());
    
    // IDを設定に保存
    ConfigManager.set('SPREADSHEET_ID', spreadsheet.getId());
    
    return spreadsheet;
  }

  /**
   * Get headers for different sheets
   * @private
   */
  function getCompanyListHeaders() {
    return [
      '企業名',
      '電話番号',
      '処理状態',
      '処理日時',
      'エラー内容'
    ];
  }

  function getHeadquartersHeaders() {
    return [
      '企業ID',
      '企業名',
      '正式企業名',
      '電話番号',
      '業種大分類',
      '業種中分類',
      '従業員数',
      '設立年',
      '資本金',
      '上場区分',
      '本社郵便番号',
      '本社都道府県',
      '本社市区町村',
      '本社住所詳細',
      '代表者名',
      '代表者役職',
      '企業理念',
      '最新ニュース',
      '採用状況',
      '企業URL',
      '信頼性スコア',
      '処理日時',
      '処理結果',
      'エラー内容',
      '情報ソースURL'
    ];
  }

  function getBranchesHeaders() {
    return [
      '企業ID',
      '支店名',
      '支店電話番号',
      '支店郵便番号',
      '支店都道府県',
      '支店市区町村',
      '支店住所詳細',
      '支店種別',
      '重要度ランク',
      '従業員数',
      '営業時間',
      '備考'
    ];
  }

  function getSettingsHeaders() {
    return [
      '設定項目',
      '設定値',
      '説明'
    ];
  }

  function getLogsHeaders() {
    return [
      'タイムスタンプ',
      'ログレベル',
      'メッセージ',
      'ユーザー',
      '詳細'
    ];
  }

  function getProcessingStatusHeaders() {
    return [
      'バッチID',
      '開始時刻',
      '終了時刻',
      '処理件数',
      '成功件数',
      'エラー件数',
      'ステータス',
      '処理時間(秒)',
      '備考'
    ];
  }

  /**
   * Initialize settings sheet
   * @private
   */
  function initializeSettingsSheet() {
    var sheet = _spreadsheet.getSheetByName(Constants.SHEET_CONFIG.SHEETS.SETTINGS || '設定');
    if (!sheet || sheet.getLastRow() > 1) return;

    var defaultSettings = [
      ['TAVILY_API_KEY', '', 'Tavily AI APIのAPIキー'],
      ['OPENAI_API_KEY', '', 'OpenAI APIのAPIキー'],
      ['NOTIFICATION_EMAIL', Session.getActiveUser().getEmail(), '通知先メールアドレス'],
      ['BATCH_SIZE', '20', '1回のバッチで処理する企業数'],
      ['ENABLE_NOTIFICATIONS', 'true', 'メール通知の有効/無効'],
      ['LOG_RETENTION_DAYS', '30', 'ログ保持日数'],
      ['MAX_RETRY_COUNT', '3', 'API呼び出しの最大リトライ回数'],
      ['RETRY_DELAY_MS', '1000', 'リトライ間隔（ミリ秒）']
    ];

    var range = sheet.getRange(2, 1, defaultSettings.length, 3);
    range.setValues(defaultSettings);
    Logger.logInfo('設定シートの初期値を設定しました');
  }

  /**
   * Find company row by ID
   * @private
   */
  function findCompanyRow(sheet, companyId) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === companyId) {
        return i + 1;
      }
    }
    return 0;
  }

  /**
   * Delete existing branches
   * @private
   */
  function deleteExistingBranches(sheet, companyId) {
    var data = sheet.getDataRange().getValues();
    for (var i = data.length - 1; i > 0; i--) {
      // 企業IDは0列目（A列）に保存されている
      if (data[i][0] === companyId) {
        sheet.deleteRow(i + 1);
        Logger.logDebug('既存支店データを削除: 行' + (i + 1) + ', 企業ID: ' + companyId);
      }
    }
  }

  /**
   * Calculate branch importance rank
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
   * Initialize spreadsheet
   */
  function initializeSpreadsheet() {
    try {
    // スプレッドシートが存在しない場合は新規作成
    if (!_spreadsheet) {
      _spreadsheet = getTargetSpreadsheet();
      Logger.logInfo('スプレッドシートを取得しました');
    }
      
      if (!_spreadsheet) {
        throw new Error('スプレッドシートの初期化に失敗しました');
      }
      
    return _spreadsheet;
    } catch (error) {
      Logger.logError('Failed to initialize spreadsheet', error);
      throw error;
    }
  }

  /**
   * Set spreadsheet ID
   */
  function setSpreadsheetId(spreadsheetId) {
    try {
      // IDの妥当性をチェック
      var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      
      // 設定に保存
      ConfigManager.set('SPREADSHEET_ID', spreadsheetId);
      
      // 現在のインスタンスを更新
      _spreadsheet = spreadsheet;
      
      Logger.logInfo('Spreadsheet ID updated: ' + spreadsheetId);
      Logger.logInfo('Spreadsheet name: ' + spreadsheet.getName());
      
      return true;
    } catch (error) {
      Logger.logError('Invalid spreadsheet ID: ' + spreadsheetId, error);
      return false;
    }
  }

  /**
   * Get spreadsheet info
   */
  function getSpreadsheetInfo() {
    // スプレッドシートが初期化されていない場合は初期化
    if (!_spreadsheet) {
      try {
        _spreadsheet = getTargetSpreadsheet();
      } catch (error) {
        Logger.logError('Failed to initialize spreadsheet in getSpreadsheetInfo', error);
        return null;
      }
    }
    
    if (!_spreadsheet) {
      return null;
    }
    
    try {
    return {
      id: _spreadsheet.getId(),
      name: _spreadsheet.getName(),
      url: _spreadsheet.getUrl(),
        lastModified: new Date(), // getLastUpdated()は存在しないため現在時刻を使用
      owner: _spreadsheet.getOwner() ? _spreadsheet.getOwner().getEmail() : 'Unknown'
    };
    } catch (error) {
      Logger.logError('Failed to get spreadsheet info', error);
      return {
        id: 'unknown',
        name: 'unknown',
        url: 'unknown',
        lastModified: new Date(),
        owner: 'unknown'
      };
    }
  }

  /**
   * Initialize sheets
   */
  function initializeSheets() {
    try {
      Logger.logInfo('スプレッドシートの初期化を開始');
      
      // スプレッドシートが存在しない場合は新規作成
      if (!_spreadsheet) {
        _spreadsheet = getTargetSpreadsheet();
        Logger.logInfo('スプレッドシートを取得しました');
      }
      
      // スプレッドシートが取得できない場合はエラー
      if (!_spreadsheet) {
        throw new Error('スプレッドシートの取得に失敗しました。SPREADSHEET_IDを確認してください。');
      }
      
      // 必要なシートのリスト
      var requiredSheets = [
        { name: Constants.SHEET_CONFIG.SHEETS.COMPANY_LIST || '企業リスト', headers: getCompanyListHeaders() },
        { name: Constants.SHEET_CONFIG.SHEETS.HEADQUARTERS || '本社情報', headers: getHeadquartersHeaders() },
        { name: Constants.SHEET_CONFIG.SHEETS.BRANCHES || '支店情報', headers: getBranchesHeaders() },
        { name: Constants.SHEET_CONFIG.SHEETS.SETTINGS || '設定', headers: getSettingsHeaders() },
        { name: Constants.SHEET_CONFIG.SHEETS.LOGS || 'ログ', headers: getLogsHeaders() },
        { name: Constants.SHEET_CONFIG.SHEETS.PROCESSING_STATUS || '処理状況', headers: getProcessingStatusHeaders() }
      ];

      requiredSheets.forEach(function(sheetConfig) {
        var sheet = _spreadsheet.getSheetByName(sheetConfig.name);
        
        if (!sheet) {
          // シートが存在しない場合は作成
          sheet = _spreadsheet.insertSheet(sheetConfig.name);
          Logger.logInfo('Created sheet: ' + sheetConfig.name);
        }

        // ヘッダーが設定されていない場合は設定
        if (sheet.getLastRow() === 0 && sheetConfig.headers.length > 0) {
          sheet.getRange(1, 1, 1, sheetConfig.headers.length).setValues([sheetConfig.headers]);
          sheet.getRange(1, 1, 1, sheetConfig.headers.length)
            .setBackground('#4285F4')
            .setFontColor('#FFFFFF')
            .setFontWeight('bold');
          sheet.setFrozenRows(1);
          Logger.logInfo('Set headers for sheet: ' + sheetConfig.name);
        }
      });

      // 設定シートの初期値を設定
      initializeSettingsSheet();
      
      Logger.logInfo('Spreadsheet initialization completed');
    } catch (error) {
      Logger.logError('Failed to initialize sheets', error);
      throw error;
    }
  }

  /**
   * Get company list
   */
  function getCompanyList(status) {
    // スプレッドシートが初期化されていない場合は初期化
    if (!_spreadsheet) {
      _spreadsheet = getTargetSpreadsheet();
    }
    
    var sheet = _spreadsheet.getSheetByName(Constants.SHEET_CONFIG.SHEETS.COMPANY_LIST || '企業リスト');
    if (!sheet || sheet.getLastRow() <= 1) return [];

    var data = sheet.getDataRange().getValues();
    var companies = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue; // 企業名が空の行はスキップ

      var company = {
        rowIndex: i + 1,
        name: row[0],
        phone: row[1] || '',  // 電話番号カラムを追加
        status: row[2] || '未処理',
        processedAt: row[3],
        error: row[4]
      };

      // ステータスフィルタリング
      if (!status) {
        companies.push(company);
      } else if (status === '未処理') {
        // 「未処理」を指定した場合は、「未処理」と「処理中」の両方を含める
        // 「処理中」は前回のバッチでタイムアウトした可能性があるため
        if (company.status === '未処理' || company.status === '処理中') {
          companies.push(company);
        }
      } else if (company.status === status) {
        companies.push(company);
      }
    }

    return companies;
  }

  /**
   * Get company status
   */
  function getCompanyStatus(rowIndex) {
    try {
      // スプレッドシートが初期化されていない場合は初期化
      if (!_spreadsheet) {
        _spreadsheet = getTargetSpreadsheet();
      }
      
      var sheet = _spreadsheet.getSheetByName(Constants.SHEET_CONFIG.SHEETS.COMPANY_LIST || '企業リスト');
      if (!sheet) return '未処理';
      
      var statusCell = sheet.getRange(rowIndex, 3);
      var status = statusCell.getValue();
      return status || '未処理';
    } catch (error) {
      Logger.logError('Failed to get company status', error);
      return '未処理';
    }
  }

  /**
   * Update company status
   */
  function updateCompanyStatus(rowIndex, status, error) {
    try {
    if (!error) error = '';
      
      // スプレッドシートが初期化されていない場合は初期化
      if (!_spreadsheet) {
        _spreadsheet = getTargetSpreadsheet();
      }
    
    var sheet = _spreadsheet.getSheetByName(Constants.SHEET_CONFIG.SHEETS.COMPANY_LIST || '企業リスト');
      if (!sheet) return false;

    var range = sheet.getRange(rowIndex, 3, 1, 3);
    range.setValues([[status, new Date(), error]]);
      return true;
    } catch (err) {
      Logger.logError('Failed to update company status', err);
      return false;
    }
  }

  /**
   * Save headquarters info
   */
  function saveHeadquartersInfo(company) {
    try {
      // スプレッドシートが初期化されていない場合は初期化
      if (!_spreadsheet) {
        _spreadsheet = getTargetSpreadsheet();
      }
      
      var sheet = _spreadsheet.getSheetByName(Constants.SHEET_CONFIG.SHEETS.HEADQUARTERS || '本社情報');
      if (!sheet) throw new Error('Headquarters sheet not found');

      // 既存データをチェック
      var existingRow = findCompanyRow(sheet, company.id);
      
      // CompanyオブジェクトのtoHeadquartersSpreadsheetRow()メソッドを使用
      var rowData = company.toHeadquartersSpreadsheetRow();

      if (existingRow > 0) {
        // 既存データを更新
        sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
      } else {
        // 新規データを追加
        sheet.appendRow(rowData);
      }

      return true;
    } catch (error) {
      Logger.logError('Failed to save headquarters info', error);
      return false;
    }
  }

  /**
   * Save branches info
   */
  function saveBranchesInfo(companyId, branches) {
    try {
      // スプレッドシートが初期化されていない場合は初期化
      if (!_spreadsheet) {
        _spreadsheet = getTargetSpreadsheet();
      }
      
      var sheet = _spreadsheet.getSheetByName(Constants.SHEET_CONFIG.SHEETS.BRANCHES || '支店情報');
      if (!sheet) throw new Error('Branches sheet not found');

      // 企業名を取得（本社情報シートから）
      var headquartersSheet = _spreadsheet.getSheetByName(Constants.SHEET_CONFIG.SHEETS.HEADQUARTERS || '本社情報');
      var companyName = 'Unknown';
      if (headquartersSheet) {
        var companyRow = findCompanyRow(headquartersSheet, companyId);
        if (companyRow > 0) {
          companyName = headquartersSheet.getRange(companyRow, 2).getValue(); // 企業名は2列目
        }
      }

      // 既存の支店データを削除
      deleteExistingBranches(sheet, companyId);

      // 新しい支店データを追加
      branches.forEach(function(branch) {
        var rowData = [
          companyId,                    // 企業ID
          branch.name || '',            // 支店名
          branch.phone || '',           // 支店電話番号
          branch.postalCode || '',      // 支店郵便番号
          branch.prefecture || '',      // 支店都道府県
          branch.city || '',            // 支店市区町村
          branch.addressDetail || '',   // 支店住所詳細
          branch.type || '',            // 支店種別
          branch.importanceRank || calculateBranchImportance(branch.type), // 重要度ランク
          branch.employees || branch.employeeCount || '', // 従業員数
          branch.businessHours || '',   // 営業時間
          branch.notes || ''            // 備考
        ];
        sheet.appendRow(rowData);
        Logger.logDebug('支店情報を保存しました: ' + companyName + ' - ' + (branch.name || '名称不明'));
      });

      Logger.logInfo('支店情報保存完了: ' + companyName + ' (' + branches.length + '件)');
      return true;
    } catch (error) {
      Logger.logError('Failed to save branches info', error);
      return false;
    }
  }

  /**
   * Save news summary
   */
  function saveNewsSummary(companyId, newsSummary) {
    try {
      // スプレッドシートが初期化されていない場合は初期化
      if (!_spreadsheet) {
        _spreadsheet = getTargetSpreadsheet();
      }
      
      // ニュースサマリーは本社情報シートの対応する行に保存
      var sheet = _spreadsheet.getSheetByName(Constants.SHEET_CONFIG.SHEETS.HEADQUARTERS || '本社情報');
      if (!sheet) throw new Error('Headquarters sheet not found');

      var existingRow = findCompanyRow(sheet, companyId);
      if (existingRow > 0) {
        // 最新ニュース列に保存（18列目）
        var newsText = newsSummary.summary || '';
        if (newsSummary.keyPoints && newsSummary.keyPoints.length > 0) {
          newsText += '\n重要ポイント: ' + newsSummary.keyPoints.join(', ');
        }
        sheet.getRange(existingRow, 18).setValue(newsText);
        return true;
      }
      return false;
    } catch (error) {
      Logger.logError('Failed to save news summary', error);
      return false;
    }
  }

  /**
   * Save recruitment summary
   */
  function saveRecruitmentSummary(companyId, recruitmentSummary) {
    try {
      // スプレッドシートが初期化されていない場合は初期化
      if (!_spreadsheet) {
        _spreadsheet = getTargetSpreadsheet();
      }
      
      // 採用情報サマリーは本社情報シートの対応する行に保存
      var sheet = _spreadsheet.getSheetByName(Constants.SHEET_CONFIG.SHEETS.HEADQUARTERS || '本社情報');
      if (!sheet) throw new Error('Headquarters sheet not found');

      var existingRow = findCompanyRow(sheet, companyId);
      if (existingRow > 0) {
        // 採用状況列に保存（19列目）
        var recruitmentText = recruitmentSummary.summary || '';
        if (recruitmentSummary.companyGrowth) {
          recruitmentText += '\n成長性: ' + recruitmentSummary.companyGrowth;
        }
        if (recruitmentSummary.businessOpportunity) {
          recruitmentText += '\n営業機会: ' + recruitmentSummary.businessOpportunity;
        }
        sheet.getRange(existingRow, 19).setValue(recruitmentText);
        return true;
      }
      return false;
    } catch (error) {
      Logger.logError('Failed to save recruitment summary', error);
      return false;
    }
  }

  /**
   * Record processing status
   */
  function recordProcessingStatus(status) {
    var sheet = _spreadsheet.getSheetByName(Constants.SHEET_CONFIG.SHEETS.PROCESSING_STATUS || '処理状況');
    if (!sheet) return;

    var duration = status.endTime && status.startTime ? 
      (status.endTime - status.startTime) / 1000 : 0;

    sheet.appendRow([
      status.batchId,
      status.startTime,
      status.endTime || new Date(),
      status.totalCount,
      status.successCount,
      status.errorCount,
      status.status,
      duration,
      status.notes || ''
    ]);
  }

  /**
   * Export data
   */
  function exportData(sheetName) {
    var sheet = _spreadsheet.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() === 0) return [];
    
    return sheet.getDataRange().getValues();
  }

  /**
   * Get company batch
   */
  function getCompanyBatch(batchSize, offset) {
    if (!offset) offset = 0;
    
    var companies = getCompanyList('未処理');
    return companies.slice(offset, offset + batchSize);
  }

  // Return public API
  return {
    initializeSpreadsheet: initializeSpreadsheet,
    setSpreadsheetId: setSpreadsheetId,
    getSpreadsheetInfo: getSpreadsheetInfo,
    initializeSheets: initializeSheets,
    getCompanyList: getCompanyList,
    getCompanyStatus: getCompanyStatus,
    updateCompanyStatus: updateCompanyStatus,
    saveHeadquartersInfo: saveHeadquartersInfo,
    saveBranchesInfo: saveBranchesInfo,
    saveNewsSummary: saveNewsSummary,
    saveRecruitmentSummary: saveRecruitmentSummary,
    recordProcessingStatus: recordProcessingStatus,
    exportData: exportData,
    getCompanyBatch: getCompanyBatch,
    getTargetSpreadsheet: getTargetSpreadsheet,
    createNewSpreadsheet: createNewSpreadsheet
  };
})();