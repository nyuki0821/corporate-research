/**
 * @fileoverview GasT - Google Apps Script Testing Framework
 * @author Corporate Research Team
 * 
 * シンプルで使いやすいGoogle Apps Script用テストフレームワーク
 */

var GasT = (function() {
  // Private variables
  var _testSuites = [];
  var _currentSuite = null;
  var _currentTest = null;
  var _testResults = [];
  var _config = {
    verbose: true,
    stopOnFirstFailure: false,
    timeout: 30000
  };

  /**
   * テストスイートを定義
   */
  function describe(suiteName, suiteFunction) {
    _currentSuite = {
      name: suiteName,
      tests: [],
      beforeEach: null,
      afterEach: null,
      beforeAll: null,
      afterAll: null
    };
    
    _testSuites.push(_currentSuite);
    suiteFunction();
    _currentSuite = null;
  }

  /**
   * テストケースを定義
   */
  function it(testName, testFunction) {
    if (!_currentSuite) {
      throw new Error('it() must be called inside describe()');
    }
    
    _currentSuite.tests.push({
      name: testName,
      fn: testFunction,
      timeout: _config.timeout
    });
  }

  /**
   * 各テスト前に実行する処理
   */
  function beforeEach(fn) {
    if (_currentSuite) {
      _currentSuite.beforeEach = fn;
    }
  }

  /**
   * 各テスト後に実行する処理
   */
  function afterEach(fn) {
    if (_currentSuite) {
      _currentSuite.afterEach = fn;
    }
  }

  /**
   * スイート開始前に実行する処理
   */
  function beforeAll(fn) {
    if (_currentSuite) {
      _currentSuite.beforeAll = fn;
    }
  }

  /**
   * スイート終了後に実行する処理
   */
  function afterAll(fn) {
    if (_currentSuite) {
      _currentSuite.afterAll = fn;
    }
  }

  /**
   * アサーション関数群
   */
  var expect = function(actual) {
    return {
      toBe: function(expected) {
        if (actual !== expected) {
          throw new Error('Expected ' + JSON.stringify(actual) + ' to be ' + JSON.stringify(expected));
        }
      },
      
      toEqual: function(expected) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error('Expected ' + JSON.stringify(actual) + ' to equal ' + JSON.stringify(expected));
        }
      },
      
      toBeTruthy: function() {
        if (!actual) {
          throw new Error('Expected ' + JSON.stringify(actual) + ' to be truthy');
        }
      },
      
      toBeFalsy: function() {
        if (actual) {
          throw new Error('Expected ' + JSON.stringify(actual) + ' to be falsy');
        }
      },
      
      toContain: function(expected) {
        if (Array.isArray(actual)) {
          if (actual.indexOf(expected) === -1) {
            throw new Error('Expected array to contain ' + JSON.stringify(expected));
          }
        } else if (typeof actual === 'string') {
          if (actual.indexOf(expected) === -1) {
            throw new Error('Expected string to contain ' + expected);
          }
        } else {
          throw new Error('toContain can only be used with arrays or strings');
        }
      },
      
      toThrow: function(expectedError) {
        var threw = false;
        var thrownError = null;
        
        try {
          if (typeof actual === 'function') {
            actual();
          }
        } catch (e) {
          threw = true;
          thrownError = e;
        }
        
        if (!threw) {
          throw new Error('Expected function to throw');
        }
        
        if (expectedError && thrownError.message !== expectedError) {
          throw new Error('Expected error message "' + expectedError + '" but got "' + thrownError.message + '"');
        }
      },
      
      toBeGreaterThan: function(expected) {
        if (actual <= expected) {
          throw new Error('Expected ' + actual + ' to be greater than ' + expected);
        }
      },
      
      toBeLessThan: function(expected) {
        if (actual >= expected) {
          throw new Error('Expected ' + actual + ' to be less than ' + expected);
        }
      },
      
      toHaveLength: function(expected) {
        if (!actual || actual.length !== expected) {
          throw new Error('Expected length to be ' + expected + ' but got ' + (actual ? actual.length : 'undefined'));
        }
      }
    };
  };

  /**
   * テストスイートを実行
   */
  function runSuite(suite) {
    var suiteResult = {
      name: suite.name,
      tests: [],
      passed: 0,
      failed: 0,
      startTime: Date.now()
    };
    
    console.log('\n🧪 テストグループ: ' + suite.name);
    console.log('═'.repeat(50));
    
    try {
      // beforeAll実行
      if (suite.beforeAll) {
        suite.beforeAll();
      }
      
      // 各テストを実行
      suite.tests.forEach(function(test) {
        if (_config.stopOnFirstFailure && suiteResult.failed > 0) {
          return;
        }
        
        var testResult = runTest(test, suite);
        suiteResult.tests.push(testResult);
        
        if (testResult.passed) {
          suiteResult.passed++;
        } else {
          suiteResult.failed++;
        }
      });
      
      // afterAll実行
      if (suite.afterAll) {
        suite.afterAll();
      }
      
    } catch (error) {
      console.error('Suite error: ' + error.message);
    }
    
    suiteResult.endTime = Date.now();
    suiteResult.duration = suiteResult.endTime - suiteResult.startTime;
    
    // スイート結果表示
    console.log('\n' + (suiteResult.failed === 0 ? '✅' : '❌') + ' グループ結果:');
    console.log('  成功: ' + suiteResult.passed + '件');
    console.log('  失敗: ' + suiteResult.failed + '件');
    console.log('  実行時間: ' + suiteResult.duration + 'ミリ秒');
    
    return suiteResult;
  }

  /**
   * 個別テストを実行
   */
  function runTest(test, suite) {
    var result = {
      name: test.name,
      passed: false,
      error: null,
      startTime: Date.now()
    };
    
    try {
      // beforeEach実行
      if (suite.beforeEach) {
        suite.beforeEach();
      }
      
      // テスト実行
      var startTime = Date.now();
      
      test.fn();
      
      // Google Apps ScriptではsetTimeoutが使えないため、
      // 実行時間ベースでタイムアウトをチェック
      var executionTime = Date.now() - startTime;
      if (test.timeout && executionTime > test.timeout) {
        throw new Error('Test timed out after ' + executionTime + 'ms (limit: ' + test.timeout + 'ms)');
      }
      
      result.passed = true;
      console.log('  ✅ ' + test.name);
      
    } catch (error) {
      result.passed = false;
      result.error = error.message;
      console.log('  ❌ ' + test.name);
      console.log('     ' + error.message);
      
    } finally {
      // afterEach実行
      try {
        if (suite.afterEach) {
          suite.afterEach();
        }
      } catch (error) {
        console.error('afterEach error: ' + error.message);
      }
    }
    
    result.endTime = Date.now();
    result.duration = result.endTime - result.startTime;
    
    return result;
  }

  /**
   * すべてのテストを実行
   */
  function run() {
    console.log('🚀 テストスイート実行開始');
    console.log('═'.repeat(60));
    
    _testResults = [];
    var totalPassed = 0;
    var totalFailed = 0;
    var totalDuration = 0;
    
    _testSuites.forEach(function(suite) {
      var suiteResult = runSuite(suite);
      _testResults.push(suiteResult);
      totalPassed += suiteResult.passed;
      totalFailed += suiteResult.failed;
      totalDuration += suiteResult.duration;
    });
    
    // 最終結果表示
    console.log('\n' + '═'.repeat(60));
    console.log('📊 最終結果');
    console.log('═'.repeat(60));
    console.log('総テスト数: ' + (totalPassed + totalFailed) + '件');
    console.log('成功: ' + totalPassed + '件 ✅');
    console.log('失敗: ' + totalFailed + '件' + (totalFailed > 0 ? ' ❌' : ''));
    console.log('実行時間: ' + totalDuration + 'ミリ秒');
    console.log('成功率: ' + Math.round((totalPassed / (totalPassed + totalFailed)) * 100) + '%');
    
    return {
      passed: totalFailed === 0,
      results: _testResults,
      summary: {
        totalTests: totalPassed + totalFailed,
        passed: totalPassed,
        failed: totalFailed,
        duration: totalDuration
      }
    };
  }

  /**
   * テストをクリア
   */
  function clear() {
    _testSuites = [];
    _testResults = [];
    _currentSuite = null;
    _currentTest = null;
  }

  /**
   * 設定を更新
   */
  function configure(config) {
    Object.assign(_config, config);
  }

  // Public API
  return {
    describe: describe,
    it: it,
    expect: expect,
    beforeEach: beforeEach,
    afterEach: afterEach,
    beforeAll: beforeAll,
    afterAll: afterAll,
    run: run,
    clear: clear,
    configure: configure
  };
})(); 