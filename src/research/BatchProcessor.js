/**
 * @fileoverview Batch processing service for the Corporate Research System
 * @author Corporate Research Team
 * 
 * 依存モジュール:
 * - Logger (src/core/Logger.js)
 * - ConfigManager (src/core/ConfigManager.js)
 * - ErrorHandler (src/core/ErrorHandler.js)
 * - Constants (src/core/Constants.js)
 * - SpreadsheetService (src/spreadsheet/SpreadsheetService.js)
 * - CompanyResearchService (src/research/CompanyResearchService.js)
 */

var BatchProcessor = (function() {
  // Private variables
  var _currentBatch = null;
  var _isProcessing = false;
  var _processingStats = {
    total: 0,
    processed: 0,
    successful: 0,
    errors: 0,
    startTime: null,
    endTime: null
  };

  // Private functions
  /**
   * Initialize processing stats
   * @private
   */
  function initializeStats(totalCount) {
    _processingStats = {
      total: totalCount,
      processed: 0,
      successful: 0,
      errors: 0,
      startTime: new Date(),
      endTime: null
    };
  }

  /**
   * Update processing stats
   * @private
   */
  function updateStats(success) {
    _processingStats.processed++;
    if (success) {
      _processingStats.successful++;
    } else {
      _processingStats.errors++;
    }
  }

  /**
   * Finalize processing stats
   * @private
   */
  function finalizeStats() {
    _processingStats.endTime = new Date();
    var duration = (_processingStats.endTime - _processingStats.startTime) / 1000;
    
    Logger.logInfo('バッチ処理完了', {
      total: _processingStats.total,
      successful: _processingStats.successful,
      errors: _processingStats.errors,
      duration: duration + '秒'
    });
    
    // Record to spreadsheet
    if (typeof SpreadsheetService !== 'undefined') {
      SpreadsheetService.recordProcessingStatus({
        batchId: generateBatchId(),
        startTime: _processingStats.startTime,
        endTime: _processingStats.endTime,
        totalCount: _processingStats.total,
        successCount: _processingStats.successful,
        errorCount: _processingStats.errors,
        status: _processingStats.errors > 0 ? 'PARTIAL_SUCCESS' : 'SUCCESS',
        notes: ''
      });
    }
  }

  /**
   * Generate batch ID
   * @private
   */
  function generateBatchId() {
    var timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    var random = Math.random().toString(36).substr(2, 6);
    return 'BATCH_' + timestamp + '_' + random;
  }

  /**
   * Process single company
   * @private
   */
  function processSingleCompany(company) {
    return new Promise(function(resolve, reject) {
      try {
        Logger.logInfo('Processing company: ' + company.name, { rowIndex: company.rowIndex });
        
        // Update status to processing
        if (typeof SpreadsheetService !== 'undefined') {
          SpreadsheetService.updateCompanyStatus(company.rowIndex, '処理中');
        }
        
        // Check if research service exists
        if (typeof CompanyResearchService === 'undefined') {
          // Fallback: simulate processing for testing
          Logger.logWarning('CompanyResearchService not available, using mock processing');
          
          // Google Apps ScriptではsetTimeoutの代わりにUtilities.sleepを使用
          Utilities.sleep(1000); // Simulate processing time
          
          // Mock successful processing
          if (typeof SpreadsheetService !== 'undefined') {
            SpreadsheetService.updateCompanyStatus(company.rowIndex, '完了（テスト）', '');
          }
          
          updateStats(true);
          resolve({
            success: true,
            company: company,
            data: { name: company.name, mockData: true }
          });
          
          return;
        }
        
        // Use actual research service
        try {
          var result = CompanyResearchService.researchCompany(company.name, company.phone);
          
          if (result.success) {
            // トランザクション的な保存処理
            try {
              if (typeof SpreadsheetService !== 'undefined') {
                // 1. まず処理中ステータスに更新（既に処理中の場合はスキップ）
                var currentStatus = SpreadsheetService.getCompanyStatus(company.rowIndex);
                if (currentStatus !== '処理中') {
                  SpreadsheetService.updateCompanyStatus(company.rowIndex, '処理中', '');
                }
                
                // 2. すべてのデータ保存を実行
                var saveSuccess = true;
                var saveError = null;
                
                try {
                  // 本社情報を保存
                  if (!SpreadsheetService.saveHeadquartersInfo(result.company)) {
                    throw new Error('Failed to save headquarters info');
                  }
                  Logger.logInfo('本社情報保存完了: ' + company.name);
                  
                  // 支店情報を保存（存在する場合）
                  if (result.branches && result.branches.length > 0) {
                    Logger.logInfo('支店情報を保存中: ' + company.name + ' (' + result.branches.length + '件)');
                    
                    // 支店情報の詳細をログ出力
                    result.branches.forEach(function(branch, index) {
                      Logger.logDebug('支店' + (index + 1) + ': ' + 
                        (branch.name || '名称不明') + ' (' + (branch.type || 'タイプ不明') + ') - ' +
                        (branch.prefecture || '') + (branch.city || '') + ' ' +
                        (branch.phone || '電話番号なし'));
                    });
                    
                    if (!SpreadsheetService.saveBranchesInfo(result.company.id, result.branches)) {
                      throw new Error('Failed to save branches info');
                    }
                    Logger.logInfo('支店情報保存完了: ' + company.name + ' (' + result.branches.length + '件)');
                  } else {
                    Logger.logInfo('支店情報なし: ' + company.name + ' (抽出されませんでした)');
                  }
                  
                } catch (saveErr) {
                  saveSuccess = false;
                  saveError = saveErr;
                }
                
                // 3. 保存結果に応じてステータスを更新
                if (saveSuccess) {
                  SpreadsheetService.updateCompanyStatus(company.rowIndex, '完了', '');
                  Logger.logInfo('Company data saved successfully: ' + company.name);
                } else {
                  SpreadsheetService.updateCompanyStatus(company.rowIndex, 'エラー', 'データ保存失敗: ' + saveError.message);
                  throw saveError;
                }
              }
              
              updateStats(true);
              resolve({
                success: true,
                company: company,
                data: result
              });
              
            } catch (saveError) {
              Logger.logError('Failed to save company data: ' + company.name, saveError);
              
              // 保存エラーの場合はステータスをエラーに設定
              if (typeof SpreadsheetService !== 'undefined') {
                SpreadsheetService.updateCompanyStatus(company.rowIndex, 'エラー', 'データ保存エラー: ' + saveError.message);
              }
              
              updateStats(false);
              resolve({
                success: false,
                company: company,
                error: saveError
              });
            }
            
          } else {
            throw new Error(result.error || 'Research failed');
          }
        } catch (error) {
          Logger.logError('Company processing failed: ' + company.name, error);
          
          // Update status to error
          if (typeof SpreadsheetService !== 'undefined') {
            SpreadsheetService.updateCompanyStatus(company.rowIndex, 'エラー', error.message);
          }
          
          updateStats(false);
          resolve({
            success: false,
            company: company,
            error: error
          });
        }
          
      } catch (error) {
        Logger.logError('Exception in processSingleCompany', error);
        
        if (typeof SpreadsheetService !== 'undefined') {
          SpreadsheetService.updateCompanyStatus(company.rowIndex, 'エラー', error.message);
        }
        
        updateStats(false);
        resolve({
          success: false,
          company: company,
          error: error
        });
      }
    });
  }

  /**
   * Process companies with delay to avoid rate limiting
   * @private
   */
  function processWithDelay(companies, delayMs) {
    return new Promise(function(resolve, reject) {
      var results = [];
      var currentIndex = 0;
      
      function processNext() {
        if (currentIndex >= companies.length) {
          resolve(results);
          return;
        }
        
        var company = companies[currentIndex];
        currentIndex++;
        
        processSingleCompany(company)
          .then(function(result) {
            results.push(result);
            
            // Log progress
            var progress = Math.round((currentIndex / companies.length) * 100);
            Logger.logInfo('バッチ進行状況: ' + progress + '% (' + currentIndex + '/' + companies.length + ')');
            
            // Continue with delay
            if (currentIndex < companies.length) {
              // Google Apps ScriptではsetTimeoutの代わりにUtilities.sleepを使用
              Utilities.sleep(delayMs);
              processNext();
            } else {
              resolve(results);
            }
          })
          .catch(function(error) {
            Logger.logError('Critical error in batch processing', error);
            reject(error);
          });
      }
      
      processNext();
    });
  }

  /**
   * Send notification
   * @private
   */
  function sendNotification(results) {
    var successCount = results.filter(function(r) { return r.success; }).length;
    var errorCount = results.filter(function(r) { return !r.success; }).length;
    
    var notificationEmail = ConfigManager.get('NOTIFICATION_EMAIL');
    var enableNotifications = ConfigManager.getBoolean('ENABLE_NOTIFICATIONS');
    
    if (!enableNotifications || !notificationEmail) {
      return;
    }
    
    var subject = '[Corporate Research] バッチ処理完了通知';
    var body = 'バッチ処理が完了しました。\n\n' +
               '処理結果:\n' +
               '- 総件数: ' + results.length + '\n' +
               '- 成功: ' + successCount + '\n' +
               '- エラー: ' + errorCount + '\n' +
               '- 処理時間: ' + ((_processingStats.endTime - _processingStats.startTime) / 1000) + '秒\n\n' +
               '詳細はスプレッドシートをご確認ください。';
    
    try {
      MailApp.sendEmail(notificationEmail, subject, body);
      Logger.logInfo('Notification sent to: ' + notificationEmail);
    } catch (error) {
      Logger.logError('Failed to send notification', error);
    }
  }

  // Public functions
  /**
   * Start batch processing
   */
  function startBatchProcessing() {
    if (_isProcessing) {
      throw new Error('Batch processing is already running');
    }
    
    try {
      _isProcessing = true;
      Logger.logInfo('バッチ処理を開始します');
      
      // Get unprocessed companies
      var companies = SpreadsheetService.getCompanyList('未処理');
      var batchSize = ConfigManager.getNumber('BATCH_SIZE', 20);
      
      if (companies.length === 0) {
        Logger.logInfo('処理対象の企業がありません');
        _isProcessing = false;
        return;
      }
      
      // Limit to batch size
      var targetCompanies = companies.slice(0, batchSize);
      
      Logger.logInfo('バッチ処理対象: ' + targetCompanies.length + '社');
      
      // Process batch
      processBatch(targetCompanies, 0)
        .then(function(results) {
          Logger.logInfo('バッチ処理が正常に完了しました');
          sendNotification(results);
        })
        .catch(function(error) {
          Logger.logError('バッチ処理でエラーが発生しました', error);
          ErrorHandler.handleError(error, { function: 'startBatchProcessing' });
        })
        .finally(function() {
          _isProcessing = false;
        });
        
    } catch (error) {
      _isProcessing = false;
      Logger.logError('バッチ処理の開始でエラーが発生しました', error);
      throw error;
    }
  }

  /**
   * Process batch of companies
   */
  function processBatch(companies, offset) {
    if (!companies || companies.length === 0) {
      return Promise.resolve([]);
    }
    
    return new Promise(function(resolve, reject) {
      try {
        Logger.logInfo('バッチ処理開始', { 
          count: companies.length, 
          offset: offset || 0 
        });
        
        initializeStats(companies.length);
        
        var processingDelay = ConfigManager.getNumber('PROCESSING_DELAY_MS', 2000);
        
        processWithDelay(companies, processingDelay)
          .then(function(results) {
            finalizeStats();
            resolve(results);
          })
          .catch(function(error) {
            finalizeStats();
            reject(error);
          });
          
      } catch (error) {
        Logger.logError('Error in processBatch', error);
        reject(error);
      }
    });
  }

  /**
   * Get current processing status
   */
  function getProcessingStatus() {
    return {
      isProcessing: _isProcessing,
      stats: Object.assign({}, _processingStats),
      currentBatch: _currentBatch
    };
  }

  /**
   * Stop current processing
   */
  function stopProcessing() {
    if (_isProcessing) {
      Logger.logWarning('Batch processing stopped by user');
      _isProcessing = false;
      finalizeStats();
      return true;
    }
    return false;
  }

  /**
   * Process specific companies by names
   */
  function processSpecificCompanies(companyNames) {
    return new Promise(function(resolve, reject) {
      try {
        if (!companyNames || companyNames.length === 0) {
          resolve([]);
          return;
        }
        
        var companies = SpreadsheetService.getCompanyList();
        var targetCompanies = companies.filter(function(company) {
          return companyNames.indexOf(company.name) !== -1;
        });
        
        if (targetCompanies.length === 0) {
          Logger.logWarning('No matching companies found');
          resolve([]);
          return;
        }
        
        Logger.logInfo('Processing specific companies: ' + targetCompanies.map(function(c) { return c.name; }).join(', '));
        
        processBatch(targetCompanies, 0)
          .then(resolve)
          .catch(reject);
          
      } catch (error) {
        Logger.logError('Error in processSpecificCompanies', error);
        reject(error);
      }
    });
  }

  // Return public API
  return {
    startBatchProcessing: startBatchProcessing,
    processBatch: processBatch,
    getProcessingStatus: getProcessingStatus,
    stopProcessing: stopProcessing,
    processSpecificCompanies: processSpecificCompanies
  };
})();