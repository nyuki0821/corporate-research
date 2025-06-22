/**
 * @fileoverview Manual Control System Test Suite
 * @author Corporate Research Team
 * 
 * 手動制御システムのテスト用ファイル
 */

var ManualControlTest = (function() {
  
  /**
   * Run comprehensive manual control system test
   */
  function runManualControlTests() {
    console.log('🧪 手動制御システム テスト開始');
    console.log('═══════════════════════════════════════════════');
    
    var testResults = [];
    
    try {
      // Test 1: システム初期化確認
      console.log('\n1️⃣ システム初期化テスト...');
      var initTest = testSystemInitialization();
      testResults.push(initTest);
      console.log(initTest.success ? '✅ 成功' : '❌ 失敗: ' + initTest.error);
      
      // Test 2: プロセス状態管理テスト
      console.log('\n2️⃣ プロセス状態管理テスト...');
      var statusTest = testProcessStatusManagement();
      testResults.push(statusTest);
      console.log(statusTest.success ? '✅ 成功' : '❌ 失敗: ' + statusTest.error);
      
      // Test 3: 手動制御API テスト
      console.log('\n3️⃣ 手動制御API テスト...');
      var apiTest = testManualControlAPI();
      testResults.push(apiTest);
      console.log(apiTest.success ? '✅ 成功' : '❌ 失敗: ' + apiTest.error);
      
      // Test 4: スプレッドシートメニュー関数テスト
      console.log('\n4️⃣ スプレッドシートメニュー関数テスト...');
      var menuTest = testSpreadsheetMenuFunctions();
      testResults.push(menuTest);
      console.log(menuTest.success ? '✅ 成功' : '❌ 失敗: ' + menuTest.error);
      
      // Test 5: 自動トリガー無効化確認
      console.log('\n5️⃣ 自動トリガー無効化確認...');
      var triggerTest = testAutoTriggerDisabled();
      testResults.push(triggerTest);
      console.log(triggerTest.success ? '✅ 成功' : '❌ 失敗: ' + triggerTest.error);
      
      // 結果サマリー
      var passedTests = testResults.filter(function(test) { return test.success; }).length;
      var totalTests = testResults.length;
      
      console.log('\n📊 テスト結果サマリー');
      console.log('═══════════════════════════════════════════════');
      console.log('成功: ' + passedTests + '/' + totalTests + ' (' + Math.round((passedTests / totalTests) * 100) + '%)');
      
      if (passedTests === totalTests) {
        console.log('🎉 すべてのテストが成功！手動制御システムは正常に動作しています');
      } else {
        console.log('⚠️ 一部のテストが失敗しました。詳細を確認してください');
      }
      
      return {
        success: passedTests === totalTests,
        passed: passedTests,
        total: totalTests,
        results: testResults
      };
      
    } catch (error) {
      console.log('❌ テスト実行中にエラー:', error.toString());
      return {
        success: false,
        error: error.message,
        results: testResults
      };
    }
  }
  
  /**
   * Test system initialization
   */
  function testSystemInitialization() {
    try {
      // TriggerManagerが存在することを確認
      if (typeof TriggerManager === 'undefined') {
        throw new Error('TriggerManager が定義されていません');
      }
      
      // 手動制御システムのテスト
      var testResult = TriggerManager.testManualControlSystem();
      if (!testResult.success) {
        throw new Error('手動制御システムテスト失敗: ' + testResult.error);
      }
      
      return {
        name: 'システム初期化',
        success: true,
        message: '手動制御システムが正常に初期化されています'
      };
      
    } catch (error) {
      return {
        name: 'システム初期化',
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test process status management
   */
  function testProcessStatusManagement() {
    try {
      // プロセス状態取得テスト
      var statusResult = TriggerManager.getAllProcessStatus();
      if (!statusResult.success) {
        throw new Error('プロセス状態取得失敗: ' + statusResult.error);
      }
      
      // 期待されるプロセスが存在することを確認
      var expectedProcesses = ['batchProcessing', 'systemMaintenance', 'errorMonitoring', 'performanceCheck'];
      var processes = statusResult.processes;
      
      expectedProcesses.forEach(function(processName) {
        if (!(processName in processes)) {
          throw new Error('期待されるプロセス ' + processName + ' が見つかりません');
        }
      });
      
      return {
        name: 'プロセス状態管理',
        success: true,
        message: expectedProcesses.length + '個のプロセスが正常に管理されています'
      };
      
    } catch (error) {
      return {
        name: 'プロセス状態管理',
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test manual control API
   */
  function testManualControlAPI() {
    try {
      var apiTests = [];
      
      // システムメンテナンス実行テスト
      var maintenanceResult = TriggerManager.executeSystemMaintenance();
      apiTests.push({
        name: 'システムメンテナンス',
        success: maintenanceResult.success,
        error: maintenanceResult.error
      });
      
      // エラー監視実行テスト
      var errorMonitorResult = TriggerManager.executeErrorMonitoring();
      apiTests.push({
        name: 'エラー監視',
        success: errorMonitorResult.success,
        error: errorMonitorResult.error
      });
      
      // パフォーマンスチェック実行テスト
      var perfCheckResult = TriggerManager.executePerformanceCheck();
      apiTests.push({
        name: 'パフォーマンスチェック',
        success: perfCheckResult.success,
        error: perfCheckResult.error
      });
      
      var failedTests = apiTests.filter(function(test) { return !test.success; });
      
      if (failedTests.length > 0) {
        var errorMessages = failedTests.map(function(test) { return test.name + ': ' + test.error; });
        throw new Error('API テスト失敗: ' + errorMessages.join(', '));
      }
      
      return {
        name: '手動制御API',
        success: true,
        message: apiTests.length + '個のAPI関数が正常に動作しています'
      };
      
    } catch (error) {
      return {
        name: '手動制御API',
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test spreadsheet menu functions
   */
  function testSpreadsheetMenuFunctions() {
    try {
      // スプレッドシートメニュー関数の存在確認
      var menuFunctions = [
        'startBatchProcessingManually',
        'stopBatchProcessingManually',
        'checkProcessStatusManually',
        'executeSystemMaintenanceManually',
        'executeErrorMonitoringManually',
        'executePerformanceCheckManually',
        'stopAllProcessesManually'
      ];
      
      var missingFunctions = [];
      
      menuFunctions.forEach(function(functionName) {
        if (typeof eval(functionName) !== 'function') {
          missingFunctions.push(functionName);
        }
      });
      
      if (missingFunctions.length > 0) {
        throw new Error('メニュー関数が見つかりません: ' + missingFunctions.join(', '));
      }
      
      return {
        name: 'スプレッドシートメニュー関数',
        success: true,
        message: menuFunctions.length + '個のメニュー関数が定義されています'
      };
      
    } catch (error) {
      return {
        name: 'スプレッドシートメニュー関数',
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test that automatic triggers are disabled
   */
  function testAutoTriggerDisabled() {
    try {
      // 現在のトリガー状況を確認
      var triggerStatus = TriggerManager.getTriggerStatus();
      if (!triggerStatus.success) {
        throw new Error('トリガー状況取得失敗: ' + triggerStatus.error);
      }
      
      // 時間ベースのトリガーが存在しないことを確認
      var timeBasedTriggers = triggerStatus.triggers.filter(function(trigger) {
        return trigger.triggerType === 'TIME_BASED';
      });
      
      if (timeBasedTriggers.length > 0) {
        var triggerFunctions = timeBasedTriggers.map(function(trigger) { return trigger.handlerFunction; });
        throw new Error('時間ベースのトリガーが残存しています: ' + triggerFunctions.join(', '));
      }
      
      // 古い自動実行関数が無効化されていることを確認
      var legacyFunctions = ['setupBasicTriggersOnly', 'setupAllTriggersWithMonitoring'];
      var activeLegacyFunctions = [];
      
      legacyFunctions.forEach(function(functionName) {
        try {
          var result = eval(functionName + '()');
          if (result && result.success) {
            activeLegacyFunctions.push(functionName);
          }
        } catch (e) {
          // 関数が存在しないか、エラーを返すことが期待される
        }
      });
      
      if (activeLegacyFunctions.length > 0) {
        throw new Error('古い自動実行関数が有効です: ' + activeLegacyFunctions.join(', '));
      }
      
      return {
        name: '自動トリガー無効化',
        success: true,
        message: '自動トリガーが正常に無効化されています'
      };
      
    } catch (error) {
      return {
        name: '自動トリガー無効化',
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Quick test for basic functionality
   */
  function runQuickTest() {
    console.log('⚡ 手動制御システム クイックテスト');
    console.log('═══════════════════════════════════════════════');
    
    try {
      // 基本的な動作確認
      var statusResult = TriggerManager.getAllProcessStatus();
      var testResult = TriggerManager.testManualControlSystem();
      
      if (statusResult.success && testResult.success) {
        console.log('✅ 手動制御システムは正常に動作しています');
        console.log('   プロセス管理: ' + statusResult.processCount + '個のプロセス');
        console.log('   制御システム: 正常');
        
        return {
          success: true,
          message: '手動制御システムが正常に動作しています'
        };
      } else {
        var errors = [];
        if (!statusResult.success) errors.push('プロセス状態: ' + statusResult.error);
        if (!testResult.success) errors.push('制御システム: ' + testResult.error);
        
        throw new Error(errors.join(', '));
      }
      
    } catch (error) {
      console.log('❌ 手動制御システムに問題があります: ' + error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Return public API
  return {
    runManualControlTests: runManualControlTests,
    runQuickTest: runQuickTest,
    testSystemInitialization: testSystemInitialization,
    testProcessStatusManagement: testProcessStatusManagement,
    testManualControlAPI: testManualControlAPI,
    testSpreadsheetMenuFunctions: testSpreadsheetMenuFunctions,
    testAutoTriggerDisabled: testAutoTriggerDisabled
  };
})();

// Global functions for easy access
function testManualControlSystem() {
  return ManualControlTest.runManualControlTests();
}

function quickTestManualControl() {
  return ManualControlTest.runQuickTest();
} 