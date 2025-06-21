/**
 * @fileoverview System test suite for the Corporate Research System
 * @author Corporate Research Team
 * 
 * 依存モジュール:
 * - Logger (src/core/Logger.js)
 * - ConfigManager (src/core/ConfigManager.js)
 * - ErrorHandler (src/core/ErrorHandler.js)
 * - All service modules
 */

var SystemTest = (function() {
  // Private variables
  var _testResults = [];
  var _currentTest = null;

  // Private functions
  /**
   * Start a test
   * @private
   */
  function startTest(testName, description) {
    _currentTest = {
      name: testName,
      description: description,
      startTime: Date.now(),
      status: 'RUNNING'
    };
    
    Logger.logInfo('Starting test: ' + testName);
    console.log('🧪 Test: ' + testName + ' - ' + description);
  }

  /**
   * End a test
   * @private
   */
  function endTest(success, message, details) {
    if (!_currentTest) return;
    
    _currentTest.endTime = Date.now();
    _currentTest.duration = _currentTest.endTime - _currentTest.startTime;
    _currentTest.status = success ? 'PASSED' : 'FAILED';
    _currentTest.message = message || '';
    _currentTest.details = details || {};
    
    _testResults.push(Object.assign({}, _currentTest));
    
    var emoji = success ? '✅' : '❌';
    var status = success ? 'PASSED' : 'FAILED';
    
    console.log(emoji + ' ' + _currentTest.name + ': ' + status + ' (' + _currentTest.duration + 'ms)');
    if (message) {
      console.log('   ' + message);
    }
    
    Logger.logInfo('Test completed: ' + _currentTest.name, {
      status: status,
      duration: _currentTest.duration,
      message: message
    });
    
    _currentTest = null;
  }

  // Public test functions
  /**
   * Test module loading
   */
  function testModuleLoading() {
    startTest('ModuleLoading', 'Testing if all modules load correctly');
    
    try {
      var modules = [
        'Constants', 'Logger', 'ConfigManager', 'ErrorHandler',
        'SpreadsheetService', 'BatchProcessor', 'CompanyResearchService',
        'TavilyClient', 'OpenAIClient', 'ApiBase', 'Company', 'TriggerManager'
      ];
      
      var loadedModules = [];
      var missingModules = [];
      
      modules.forEach(function(moduleName) {
        if (typeof eval(moduleName) !== 'undefined') {
          loadedModules.push(moduleName);
        } else {
          missingModules.push(moduleName);
        }
      });
      
      if (missingModules.length === 0) {
        endTest(true, 'All modules loaded successfully', {
          loadedModules: loadedModules,
          count: loadedModules.length
        });
      } else {
        endTest(false, 'Some modules are missing: ' + missingModules.join(', '), {
          loadedModules: loadedModules,
          missingModules: missingModules
        });
      }
      
    } catch (error) {
      endTest(false, 'Error during module loading test: ' + error.message);
    }
  }

  /**
   * Test configuration
   */
  function testConfiguration() {
    startTest('Configuration', 'Testing configuration management');
    
    try {
      // Test configuration validation
      var validation = ConfigManager.validate();
      
      var testKey = 'TEST_KEY_' + Date.now();
      var testValue = 'test_value';
      
      // Test setting and getting
      ConfigManager.set(testKey, testValue);
      var retrievedValue = ConfigManager.get(testKey);
      
      // Clean up
      ConfigManager.deleteProperty(testKey);
      
      if (retrievedValue === testValue) {
        endTest(true, 'Configuration system working correctly', {
          validation: validation,
          setGetTest: 'PASSED'
        });
      } else {
        endTest(false, 'Configuration set/get test failed', {
          expected: testValue,
          actual: retrievedValue
        });
      }
      
    } catch (error) {
      endTest(false, 'Configuration test error: ' + error.message);
    }
  }

  /**
   * Test logging system
   */
  function testLogging() {
    startTest('Logging', 'Testing logging functionality');
    
    try {
      var testMessage = 'Test log message ' + Date.now();
      
      // Test different log levels
      Logger.logInfo(testMessage);
      Logger.logWarning('Test warning message');
      Logger.logDebug('Test debug message');
      
      // Test timer
      var timer = Logger.startTimer('TestTimer');
      timer.mark('TestMark');
      timer.end();
      
      endTest(true, 'Logging system working correctly');
      
    } catch (error) {
      endTest(false, 'Logging test error: ' + error.message);
    }
  }

  /**
   * Test error handling
   */
  function testErrorHandling() {
    startTest('ErrorHandling', 'Testing error handling system');
    
    try {
      var testError = new Error('Test error for error handling');
      var context = { testContext: true, timestamp: Date.now() };
      
      var result = ErrorHandler.handleError(testError, context);
      
      if (result && result.id && result.type) {
        endTest(true, 'Error handling system working correctly', {
          errorId: result.id,
          errorType: result.type,
          severity: result.severity.label
        });
      } else {
        endTest(false, 'Error handling returned invalid result', result);
      }
      
    } catch (error) {
      endTest(false, 'Error handling test failed: ' + error.message);
    }
  }

  /**
   * Test spreadsheet service
   */
  function testSpreadsheetService() {
    startTest('SpreadsheetService', 'Testing spreadsheet operations');
    
    try {
      // Test getting spreadsheet info
      var info = SpreadsheetService.getSpreadsheetInfo();
      
      // Test getting company list (should not error even if empty)
      var companies = SpreadsheetService.getCompanyList();
      
      endTest(true, 'Spreadsheet service working correctly', {
        hasSpreadsheet: !!info,
        companyCount: companies ? companies.length : 0
      });
      
    } catch (error) {
      endTest(false, 'Spreadsheet service test error: ' + error.message);
    }
  }

  /**
   * Test API clients (connection only)
   */
  function testApiClients() {
    startTest('ApiClients', 'Testing API client connectivity');
    
    var promises = [];
    var results = {};
    
    // Test API clients if keys are configured
    var tavilyKey = ConfigManager.get('TAVILY_API_KEY');
    var openaiKey = ConfigManager.get('OPENAI_API_KEY');
    
    if (tavilyKey && tavilyKey.trim() !== '') {
      promises.push(
        TavilyClient.testConnection()
          .then(function(result) {
            results.tavily = result;
          })
          .catch(function(error) {
            results.tavily = { success: false, error: error.message };
          })
      );
    } else {
      results.tavily = { success: false, error: 'API key not configured' };
    }
    
    if (openaiKey && openaiKey.trim() !== '') {
      promises.push(
        OpenAIClient.testConnection()
          .then(function(result) {
            results.openai = result;
          })
          .catch(function(error) {
            results.openai = { success: false, error: error.message };
          })
      );
    } else {
      results.openai = { success: false, error: 'API key not configured' };
    }
    
    if (promises.length > 0) {
      Promise.all(promises)
        .then(function() {
          var successCount = 0;
          var totalCount = Object.keys(results).length;
          
          Object.keys(results).forEach(function(key) {
            if (results[key].success) {
              successCount++;
            }
          });
          
          if (successCount === totalCount) {
            endTest(true, 'All API clients connected successfully', results);
          } else {
            endTest(false, 'Some API clients failed to connect (' + successCount + '/' + totalCount + ')', results);
          }
        })
        .catch(function(error) {
          endTest(false, 'API client test error: ' + error.message, results);
        });
    } else {
      endTest(false, 'No API keys configured for testing', results);
    }
  }

  /**
   * Test batch processor
   */
  function testBatchProcessor() {
    startTest('BatchProcessor', 'Testing batch processing functionality');
    
    try {
      var status = BatchProcessor.getProcessingStatus();
      
      // Test creating mock data
      var mockCompanies = [
        {
          rowIndex: 999,
          name: 'テスト企業',
          phone: '',
          status: '未処理'
        }
      ];
      
      // Don't actually run the batch, just test the interface
      if (status && typeof status.isProcessing !== 'undefined') {
        endTest(true, 'Batch processor interface working correctly', {
          currentStatus: status,
          mockDataCreated: true
        });
      } else {
        endTest(false, 'Batch processor returned invalid status', status);
      }
      
    } catch (error) {
      endTest(false, 'Batch processor test error: ' + error.message);
    }
  }

  /**
   * Test company model
   */
  function testCompanyModel() {
    startTest('CompanyModel', 'Testing Company model functionality');
    
    try {
      var testData = {
        id: 'TEST_COMP_' + Date.now(),
        companyName: 'テスト株式会社',
        phone: '03-1234-5678',
        industryLarge: 'サービス業',
        employees: 100,
        establishedYear: 2000,
        prefecture: '東京都',
        city: '千代田区'
      };
      
      var company = new Company(testData);
      
      // Test validation
      var validation = company.validate();
      
      // Test methods
      var displayName = company.getDisplayName();
      var completion = company.getCompletionPercentage();
      var hasBasicInfo = company.hasCompleteBasicInfo();
      var spreadsheetRow = company.toHeadquartersSpreadsheetRow();
      
      if (company.isValid() && validation.isValid) {
        endTest(true, 'Company model working correctly', {
          displayName: displayName,
          completion: completion + '%',
          hasBasicInfo: hasBasicInfo,
          rowLength: spreadsheetRow.length
        });
      } else {
        endTest(false, 'Company model validation failed', {
          isValid: company.isValid(),
          validation: validation
        });
      }
      
    } catch (error) {
      endTest(false, 'Company model test error: ' + error.message);
    }
  }

  /**
   * Test trigger management
   */
  function testTriggerManagement() {
    startTest('TriggerManagement', 'Testing trigger management system');
    
    try {
      // Test getting trigger status
      var status = TriggerManager.getTriggerStatus();
      
      // Test trigger system
      var testResult = TriggerManager.testTriggerSystem();
      
      if (status.success && testResult.success) {
        endTest(true, 'Trigger management system working correctly', {
          currentTriggers: status.triggerCount,
          testResult: testResult.message
        });
      } else {
        endTest(false, 'Trigger management test failed', {
          statusResult: status,
          testResult: testResult
        });
      }
      
    } catch (error) {
      endTest(false, 'Trigger management test error: ' + error.message);
    }
  }

  /**
   * Run all tests
   */
  function runAllTests() {
    Logger.logInfo('Starting comprehensive system test suite');
    console.log('🚀 Starting Corporate Research System Test Suite');
    console.log('═══════════════════════════════════════════════');
    
    _testResults = [];
    
    try {
      // Core system tests
      testModuleLoading();
      testConfiguration();
      testLogging();
      testErrorHandling();
      
      // Service tests
      testSpreadsheetService();
      testBatchProcessor();
      testCompanyModel();
      testTriggerManagement();
      
      // API tests (async)
      testApiClients();
      
      // Wait a bit for async tests to complete
      Utilities.sleep(2000);
      
      // Generate final report
      generateTestReport();
      
    } catch (error) {
      Logger.logError('Error during test suite execution', error);
      console.log('❌ Test suite execution failed: ' + error.message);
    }
  }

  /**
   * Generate test report
   */
  function generateTestReport() {
    var totalTests = _testResults.length;
    var passedTests = _testResults.filter(function(test) { return test.status === 'PASSED'; }).length;
    var failedTests = totalTests - passedTests;
    var successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('📊 TEST REPORT');
    console.log('═══════════════════════════════════════════════');
    console.log('Total Tests: ' + totalTests);
    console.log('Passed: ' + passedTests + ' ✅');
    console.log('Failed: ' + failedTests + (failedTests > 0 ? ' ❌' : ' ✅'));
    console.log('Success Rate: ' + successRate + '%');
    console.log('');
    
    if (failedTests > 0) {
      console.log('Failed Tests:');
      _testResults.forEach(function(test) {
        if (test.status === 'FAILED') {
          console.log('❌ ' + test.name + ': ' + test.message);
        }
      });
      console.log('');
    }
    
    console.log('Detailed Results:');
    _testResults.forEach(function(test) {
      var emoji = test.status === 'PASSED' ? '✅' : '❌';
      console.log(emoji + ' ' + test.name + ' (' + test.duration + 'ms)');
      if (test.message) {
        console.log('   ' + test.message);
      }
    });
    
    Logger.logInfo('System test suite completed', {
      totalTests: totalTests,
      passedTests: passedTests,
      failedTests: failedTests,
      successRate: successRate
    });
    
    return {
      summary: {
        totalTests: totalTests,
        passedTests: passedTests,
        failedTests: failedTests,
        successRate: successRate
      },
      results: _testResults
    };
  }

  /**
   * Get test results
   */
  function getTestResults() {
    return {
      results: _testResults,
      summary: {
        total: _testResults.length,
        passed: _testResults.filter(function(test) { return test.status === 'PASSED'; }).length,
        failed: _testResults.filter(function(test) { return test.status === 'FAILED'; }).length
      }
    };
  }

  // Return public API
  return {
    runAllTests: runAllTests,
    testModuleLoading: testModuleLoading,
    testConfiguration: testConfiguration,
    testLogging: testLogging,
    testErrorHandling: testErrorHandling,
    testSpreadsheetService: testSpreadsheetService,
    testApiClients: testApiClients,
    testBatchProcessor: testBatchProcessor,
    testCompanyModel: testCompanyModel,
    testTriggerManagement: testTriggerManagement,
    generateTestReport: generateTestReport,
    getTestResults: getTestResults
  };
})();

// Global test functions for easy access
function runSystemTests() {
  return SystemTest.runAllTests();
}

function runModuleLoadingTest() {
  return SystemTest.testModuleLoading();
}

function getSystemTestResults() {
  return SystemTest.getTestResults();
}