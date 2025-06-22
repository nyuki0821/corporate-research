/**
 * @fileoverview Mock Factory - モックオブジェクト生成ユーティリティ
 * @author Corporate Research Team
 */

var MockFactory = (function() {
  
  /**
   * SpreadsheetServiceのモックを作成
   */
  function createSpreadsheetServiceMock(overrides) {
    var mock = {
      getSpreadsheetInfo: function() {
        return {
          id: 'mock_spreadsheet_id',
          name: 'テストスプレッドシート',
          sheets: ['企業リスト', '本社情報', '支店情報']
        };
      },
      
      getCompanyList: function() {
        return TestDataFactory.createCompanies(5);
      },
      
      saveCompanyData: function(company) {
        return {
          success: true,
          rowIndex: Math.floor(Math.random() * 100) + 1
        };
      },
      
      updateCompanyStatus: function(rowIndex, status) {
        return {
          success: true,
          status: status
        };
      },
      
      clearRange: function(rangeName) {
        return {
          success: true,
          clearedCells: 100
        };
      },
      
      getRange: function(rangeName) {
        return {
          getValues: function() {
            return TestDataFactory.createRangeValues(10, 5);
          },
          setValues: function(values) {
            return true;
          },
          clear: function() {
            return true;
          }
        };
      }
    };
    
    return Object.assign(mock, overrides || {});
  }

  /**
   * TavilyClientのモックを作成
   */
  function createTavilyClientMock(overrides) {
    var mock = {
      searchCompany: function(companyName) {
        return Promise.resolve(TestDataFactory.createTavilyResponse({
          query: companyName
        }));
      },
      
      searchCompanyDetails: function(companyName, additionalQuery) {
        return Promise.resolve(TestDataFactory.createTavilyResponse({
          query: companyName + ' ' + additionalQuery,
          results: [
            {
              title: companyName + ' - 詳細情報',
              url: 'https://example.com/company/details',
              content: '詳細な企業情報...',
              score: 0.98
            }
          ]
        }));
      },
      
      searchByPhoneNumber: function(phoneNumber) {
        return Promise.resolve(TestDataFactory.createTavilyResponse({
          query: phoneNumber,
          results: [
            {
              title: '電話番号検索結果',
              url: 'https://example.com/phone',
              content: '該当する企業情報...',
              score: 0.85
            }
          ]
        }));
      },
      
      testConnection: function() {
        return Promise.resolve({
          success: true,
          message: 'API connection successful',
          provider: 'Tavily'
        });
      },
      
      getApiStats: function() {
        return {
          totalCalls: 100,
          successfulCalls: 95,
          failedCalls: 5,
          averageResponseTime: 1.5
        };
      }
    };
    
    return Object.assign(mock, overrides || {});
  }

  /**
   * OpenAIClientのモックを作成
   */
  function createOpenAIClientMock(overrides) {
    var mock = {
      extractCompanyInfo: function(searchResults) {
        return Promise.resolve({
          success: true,
          data: TestDataFactory.createCompany(),
          usage: {
            prompt_tokens: 100,
            completion_tokens: 150,
            total_tokens: 250
          }
        });
      },
      
      generateSummary: function(companyData, sourceUrls) {
        return Promise.resolve({
          success: true,
          summary: '企業概要: ' + companyData.companyName + 'は優良企業です。',
          usage: {
            prompt_tokens: 50,
            completion_tokens: 100,
            total_tokens: 150
          }
        });
      },
      
      testConnection: function() {
        return Promise.resolve({
          success: true,
          message: 'API connection successful',
          provider: 'OpenAI'
        });
      }
    };
    
    return Object.assign(mock, overrides || {});
  }

  /**
   * ConfigManagerのモックを作成
   */
  function createConfigManagerMock(overrides) {
    var mockConfig = TestDataFactory.createConfig();
    
    var mock = {
      get: function(key) {
        return mockConfig[key] || '';
      },
      
      set: function(key, value) {
        mockConfig[key] = value;
        return true;
      },
      
      getNumber: function(key, defaultValue) {
        var value = mockConfig[key];
        if (value === null || value === undefined || value === '') {
          return defaultValue || 0;
        }
        var num = parseInt(value, 10);
        return isNaN(num) ? (defaultValue || 0) : num;
      },
      
      getBoolean: function(key, defaultValue) {
        var value = mockConfig[key];
        if (value === null || value === undefined || value === '') {
          return defaultValue || false;
        }
        if (typeof value === 'boolean') {
          return value;
        }
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true';
        }
        return defaultValue || false;
      },
      
      getAll: function() {
        return mockConfig;
      },
      
      validate: function() {
        return {
          isValid: true,
          errors: [],
          warnings: []
        };
      },
      
      deleteProperty: function(key) {
        delete mockConfig[key];
        return true;
      }
    };
    
    return Object.assign(mock, overrides || {});
  }

  /**
   * Loggerのモックを作成
   */
  function createLoggerMock(overrides) {
    var logs = [];
    
    var mock = {
      logInfo: function(message, data) {
        logs.push({ level: 'INFO', message: message, data: data, timestamp: new Date() });
      },
      
      logWarning: function(message, data) {
        logs.push({ level: 'WARNING', message: message, data: data, timestamp: new Date() });
      },
      
      logError: function(message, error, data) {
        logs.push({ level: 'ERROR', message: message, error: error, data: data, timestamp: new Date() });
      },
      
      logDebug: function(message, data) {
        logs.push({ level: 'DEBUG', message: message, data: data, timestamp: new Date() });
      },
      
      startTimer: function(name) {
        var startTime = Date.now();
        return {
          mark: function(label) {
            logs.push({ level: 'TIMER', name: name, label: label, elapsed: Date.now() - startTime });
          },
          end: function() {
            logs.push({ level: 'TIMER', name: name, duration: Date.now() - startTime });
          }
        };
      },
      
      getLogs: function() {
        return logs;
      },
      
      clearLogs: function() {
        logs = [];
      }
    };
    
    return Object.assign(mock, overrides || {});
  }

  /**
   * BatchProcessorのモックを作成
   */
  function createBatchProcessorMock(overrides) {
    var processingStatus = {
      isProcessing: false,
      currentBatch: 0,
      totalBatches: 0,
      processedCount: 0,
      errorCount: 0
    };
    
    var mock = {
      startBatchProcessing: function(options) {
        processingStatus.isProcessing = true;
        processingStatus.totalBatches = options && options.batchCount || 10;
        return {
          success: true,
          batchId: 'BATCH_' + Date.now()
        };
      },
      
      stopBatchProcessing: function() {
        processingStatus.isProcessing = false;
        return {
          success: true
        };
      },
      
      getProcessingStatus: function() {
        return processingStatus;
      },
      
      processBatch: function(companies) {
        processingStatus.processedCount += companies.length;
        return {
          success: true,
          processed: companies.length,
          errors: []
        };
      }
    };
    
    return Object.assign(mock, overrides || {});
  }

  /**
   * ErrorHandlerのモックを作成
   */
  function createErrorHandlerMock(overrides) {
    var errors = [];
    
    var mock = {
      handleError: function(error, context) {
        var errorRecord = {
          id: 'ERROR_' + Date.now(),
          type: error.name || 'Error',
          message: error.message,
          context: context,
          timestamp: new Date(),
          severity: {
            level: 'HIGH',
            label: 'エラー'
          }
        };
        
        errors.push(errorRecord);
        return errorRecord;
      },
      
      getErrors: function() {
        return errors;
      },
      
      clearErrors: function() {
        errors = [];
      },
      
      getErrorCount: function() {
        return errors.length;
      }
    };
    
    return Object.assign(mock, overrides || {});
  }

  /**
   * UrlFetchAppのモックを作成
   */
  function createUrlFetchAppMock(responses) {
    responses = responses || {};
    
    return {
      fetch: function(url, options) {
        var response = responses[url] || {
          getResponseCode: function() { return 200; },
          getContentText: function() { return JSON.stringify({ success: true }); },
          getHeaders: function() { return {}; }
        };
        
        if (typeof response === 'function') {
          return response(url, options);
        }
        
        return response;
      }
    };
  }

  /**
   * PropertiesServiceのモックを作成
   */
  function createPropertiesServiceMock() {
    var scriptProperties = {};
    
    return {
      getScriptProperties: function() {
        return {
          getProperty: function(key) {
            return scriptProperties[key] || null;
          },
          setProperty: function(key, value) {
            scriptProperties[key] = value;
            return this;
          },
          deleteProperty: function(key) {
            delete scriptProperties[key];
            return this;
          },
          getProperties: function() {
            return Object.assign({}, scriptProperties);
          },
          setProperties: function(properties) {
            Object.assign(scriptProperties, properties);
            return this;
          }
        };
      }
    };
  }

  // Public API
  return {
    createSpreadsheetServiceMock: createSpreadsheetServiceMock,
    createTavilyClientMock: createTavilyClientMock,
    createOpenAIClientMock: createOpenAIClientMock,
    createConfigManagerMock: createConfigManagerMock,
    createLoggerMock: createLoggerMock,
    createBatchProcessorMock: createBatchProcessorMock,
    createErrorHandlerMock: createErrorHandlerMock,
    createUrlFetchAppMock: createUrlFetchAppMock,
    createPropertiesServiceMock: createPropertiesServiceMock
  };
})(); 