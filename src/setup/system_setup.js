/**
 * Corporate Research System - 初期セットアップガイド
 * Google Apps Script エディタで実行してください
 */

function startSystemSetup() {
  console.log('🚀 Corporate Research System セットアップガイド');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('📋 セットアップ手順:');
  console.log('1️⃣ runInitializationTest() でシステム確認');
  console.log('2️⃣ setupApiKeysGuide() でAPIキー設定ガイド表示');
  console.log('3️⃣ testApiConnectivity() でAPI接続テスト');
  console.log('4️⃣ createSampleSpreadsheet() でスプレッドシート作成');
  console.log('5️⃣ initializeManualControlSystem() で手動制御システム初期化');
  console.log('6️⃣ completeSetupProcess() でセットアップ完了確認');
  console.log('');
  console.log('💡 まずは runInitializationTest() を実行してください！');
  console.log('');
  console.log('🆘 ヘルプが必要な場合は showAdvancedHelp() を実行してください');
}

function setupApiKeysGuide() {
  console.log('🔑 APIキー設定ガイド');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('【方法1: Google Apps Script エディタで設定（推奨）】');
  console.log('1. 左側のメニューから「プロジェクトの設定」をクリック');
  console.log('2. 「スクリプト プロパティ」セクションまでスクロール');
  console.log('3. 「スクリプト プロパティを追加」をクリック');
  console.log('4. 以下のプロパティを追加:');
  console.log('');
  console.log('   プロパティ名: TAVILY_API_KEY');
  console.log('   値: あなたのTavily APIキー');
  console.log('');
  console.log('   プロパティ名: OPENAI_API_KEY');
  console.log('   値: あなたのOpenAI APIキー');
  console.log('');
  console.log('   プロパティ名: NOTIFICATION_EMAIL');
  console.log('   値: 通知を受け取るメールアドレス');
  console.log('');
  console.log('【方法2: プログラムで設定】');
  console.log('以下の関数を使用してAPIキーを設定できます:');
  console.log('');
  console.log('ConfigManager.set("TAVILY_API_KEY", "your_tavily_key_here");');
  console.log('ConfigManager.set("OPENAI_API_KEY", "your_openai_key_here");');
  console.log('ConfigManager.set("NOTIFICATION_EMAIL", "your_email@example.com");');
  console.log('');
  console.log('【APIキーの取得方法】');
  console.log('• Tavily API: https://tavily.com でアカウント作成後、APIキーを取得');
  console.log('• OpenAI API: https://platform.openai.com/api-keys でAPIキーを作成');
  console.log('');
  console.log('設定完了後、testApiConnectivity() を実行してください');
}

function checkSystemStatus() {
  console.log('📊 システム状況確認');
  console.log('═══════════════════════════════════════════════');
  
  try {
    // 1. モジュール確認
    var modules = ['Logger', 'ConfigManager', 'ErrorHandler', 'SpreadsheetService', 
                   'BatchProcessor', 'CompanyResearchService', 'TavilyClient', 
                   'OpenAIClient', 'Company', 'TriggerManager'];
    
    console.log('1. モジュール状況:');
    var loadedCount = 0;
    modules.forEach(function(moduleName) {
      try {
        if (typeof eval(moduleName) !== 'undefined') {
          console.log('   ✅', moduleName);
          loadedCount++;
        } else {
          console.log('   ❌', moduleName, '- 未読み込み');
        }
      } catch (e) {
        console.log('   ❌', moduleName, '- エラー');
      }
    });
    console.log('   読み込み済み:', loadedCount + '/' + modules.length);
    
    // 2. 設定確認
    console.log('\n2. 設定状況:');
    var importantKeys = ['TAVILY_API_KEY', 'OPENAI_API_KEY', 'NOTIFICATION_EMAIL'];
    importantKeys.forEach(function(key) {
      var value = ConfigManager.get(key);
      var status = value && value.trim() !== '' ? '✅ 設定済み' : '❌ 未設定';
      console.log('   ' + key + ':', status);
    });
    
    // 3. スプレッドシート確認
    console.log('\n3. スプレッドシート状況:');
    try {
      var info = SpreadsheetService.getSpreadsheetInfo();
      if (info) {
        console.log('   ✅ スプレッドシート接続済み');
        console.log('   名前:', info.name);
        
        var companies = SpreadsheetService.getCompanyList();
        console.log('   企業データ:', companies.length + '社');
      } else {
        console.log('   ❌ スプレッドシート未設定');
      }
    } catch (e) {
      console.log('   ❌ スプレッドシートエラー:', e.message);
    }
    
    // 4. トリガー確認
    console.log('\n4. トリガー状況:');
    try {
      var triggerStatus = TriggerManager.getTriggerStatus();
      console.log('   アクティブトリガー:', triggerStatus.triggerCount + '個');
    } catch (e) {
      console.log('   ❌ トリガー確認エラー:', e.message);
    }
    
    console.log('\n状況確認完了');
    
  } catch (error) {
    console.log('❌ システム状況確認中にエラー:', error.toString());
  }
}

function completeSetupProcess() {
  console.log('🎯 セットアップ完了チェック');
  console.log('═══════════════════════════════════════════════');
  
  var setupChecklist = [];
  
  // 1. モジュール確認
  try {
    runModuleLoadingTest();
    setupChecklist.push({ item: 'モジュール読み込み', status: '✅' });
  } catch (e) {
    setupChecklist.push({ item: 'モジュール読み込み', status: '❌', error: e.message });
  }
  
  // 2. 設定確認
  try {
    var validation = ConfigManager.validate();
    var hasApiKeys = ConfigManager.get('TAVILY_API_KEY') && ConfigManager.get('OPENAI_API_KEY');
    
    if (validation.isValid && hasApiKeys) {
      setupChecklist.push({ item: '設定・APIキー', status: '✅' });
    } else {
      setupChecklist.push({ item: '設定・APIキー', status: '❌', error: 'APIキーが不足' });
    }
  } catch (e) {
    setupChecklist.push({ item: '設定・APIキー', status: '❌', error: e.message });
  }
  
  // 3. スプレッドシート確認
  try {
    var info = SpreadsheetService.getSpreadsheetInfo();
    if (info) {
      setupChecklist.push({ item: 'スプレッドシート', status: '✅' });
    } else {
      setupChecklist.push({ item: 'スプレッドシート', status: '❌', error: '未設定' });
    }
  } catch (e) {
    setupChecklist.push({ item: 'スプレッドシート', status: '❌', error: e.message });
  }
  
  // 4. 手動制御システム確認（トリガーの代わり）
  try {
    var manualControlTest = TriggerManager.testManualControlSystem();
    if (manualControlTest.success) {
      setupChecklist.push({ item: '手動制御システム', status: '✅' });
    } else {
      setupChecklist.push({ item: '手動制御システム', status: '❌', error: manualControlTest.error });
    }
  } catch (e) {
    setupChecklist.push({ item: '手動制御システム', status: '❌', error: e.message });
  }
  
  // 5. 自動トリガー確認（存在しないことを確認）
  try {
    var triggerStatus = TriggerManager.getTriggerStatus();
    if (triggerStatus.success && triggerStatus.triggerCount === 0) {
      setupChecklist.push({ item: '自動トリガー無効化', status: '✅' });
    } else if (triggerStatus.success && triggerStatus.triggerCount > 0) {
      setupChecklist.push({ item: '自動トリガー無効化', status: '⚠️', error: triggerStatus.triggerCount + '個の自動トリガーが残存' });
    } else {
      setupChecklist.push({ item: '自動トリガー無効化', status: '❌', error: triggerStatus.error });
    }
  } catch (e) {
    setupChecklist.push({ item: '自動トリガー無効化', status: '❌', error: e.message });
  }
  
  // 結果表示
  var passedChecks = 0;
  var warningChecks = 0;
  
  console.log('');
  setupChecklist.forEach(function(check) {
    console.log(check.status + ' ' + check.item);
    if (check.error) {
      console.log('    ' + check.error);
    }
    if (check.status === '✅') passedChecks++;
    if (check.status === '⚠️') warningChecks++;
  });
  
  var totalChecks = setupChecklist.length;
  var completionRate = Math.round((passedChecks / totalChecks) * 100);
  
  console.log('\n📊 セットアップ完了率: ' + completionRate + '%');
  console.log('   ✅ 成功: ' + passedChecks + '/' + totalChecks);
  if (warningChecks > 0) {
    console.log('   ⚠️ 警告: ' + warningChecks + '/' + totalChecks);
  }
  
  if (completionRate >= 80) {
    console.log('\n🎉 セットアップ完了！');
    console.log('');
    console.log('🎮 手動制御システムが有効になりました');
    console.log('📝 スプレッドシートのメニューから各機能を手動実行できます：');
    console.log('   • バッチ処理の開始・停止');
    console.log('   • プロセス状況の確認');
    console.log('   • システムメンテナンス');
    console.log('   • エラー監視・パフォーマンスチェック');
    console.log('');
    console.log('🚀 企業情報収集システムの使用準備が完了しました！');
  } else {
    console.log('\n⚠️ セットアップが未完了です');
    console.log('上記のエラーを解決してから再度実行してください');
  }
  
  return {
    completionRate: completionRate,
    passed: passedChecks,
    total: totalChecks,
    warnings: warningChecks,
    checklist: setupChecklist
  };
}

// 便利なショートカット関数
function quickSetup() {
  console.log('⚡ クイックセットアップ');
  console.log('すべての基本設定を順番に実行します...\n');
  
  // ステップ1: 初期化テスト
  console.log('Step 1/5: システム初期化テスト');
  runInitializationTest();
  
  // ステップ2: API設定ガイド表示
  console.log('\nStep 2/5: APIキー設定ガイド');
  setupApiKeysGuide();
  
  console.log('\n⏸️ APIキーを設定してから続行してください');
  console.log('設定後、 continueQuickSetup() を実行してください');
}

function continueQuickSetup() {
  console.log('⚡ クイックセットアップ続行');
  
  // ステップ3: API接続テスト
  console.log('Step 3/5: API接続テスト');
  testApiConnectivity();
  
  // ステップ4: スプレッドシート作成
  console.log('\nStep 4/5: スプレッドシート準備');
  createSampleSpreadsheet();
  
  // ステップ5: 手動制御システム初期化
  console.log('\nStep 5/5: 手動制御システム初期化');
  initializeManualControlSystem();
  
  // 完了チェック
  console.log('\n最終確認...');
  Utilities.sleep(1000);
  completeSetupProcess();
}

function resetSystem() {
  console.log('🔄 システムリセット');
  console.log('═══════════════════════════════════════════════');
  console.log('⚠️ 警告: すべてのトリガーとキャッシュがクリアされます');
  
  try {
    // トリガー削除
    var triggerResult = TriggerManager.deleteAllTriggers();
    console.log('トリガー削除:', triggerResult.success ? '✅' : '❌', 
                '(' + (triggerResult.deletedCount || 0) + '個削除)');
    
    // キャッシュクリア
    CacheService.getScriptCache().removeAll([]);
    console.log('キャッシュクリア: ✅');
    
    // プロセス状態リセット
    var processResult = TriggerManager.stopAllProcesses();
    console.log('プロセス停止:', processResult.success ? '✅' : '❌');
    
    // 設定は保持（APIキーなど）
    console.log('設定保持: ✅ (APIキーは保持されます)');
    
    console.log('\n✅ システムリセット完了');
    console.log('runInitializationTest() を実行して再セットアップしてください');
    
  } catch (error) {
    console.log('❌ リセット中にエラー:', error.toString());
  }
}

// 新しい手動制御システム初期化関数
function initializeManualControlSystem() {
  console.log('🎮 手動制御システム初期化');
  console.log('═══════════════════════════════════════════════');
  
  try {
    // 手動制御システムのテスト
    var testResult = TriggerManager.testManualControlSystem();
    
    if (testResult.success) {
      console.log('✅ 手動制御システム: 正常');
      console.log('   プロセス数:', testResult.processCount);
    } else {
      console.log('❌ 手動制御システム: エラー -', testResult.error);
      return false;
    }
    
    // プロセス状態の初期化
    var statusResult = TriggerManager.getAllProcessStatus();
    if (statusResult.success) {
      console.log('✅ プロセス状態管理: 正常');
      console.log('   管理対象プロセス:', statusResult.processCount + '個');
    } else {
      console.log('❌ プロセス状態管理: エラー -', statusResult.error);
      return false;
    }
    
    // 既存の自動トリガーを削除
    var triggerStatus = TriggerManager.getTriggerStatus();
    if (triggerStatus.success && triggerStatus.triggerCount > 0) {
      console.log('⚠️ 既存の自動トリガーを削除中...');
      var deleteResult = TriggerManager.deleteAllTriggers();
      if (deleteResult.success) {
        console.log('✅ 自動トリガー削除完了:', deleteResult.deletedCount + '個削除');
      } else {
        console.log('❌ 自動トリガー削除エラー:', deleteResult.error);
      }
    } else {
      console.log('✅ 自動トリガーなし（手動制御モード）');
    }
    
    console.log('\n🎉 手動制御システム初期化完了！');
    console.log('');
    console.log('📝 使用方法:');
    console.log('• スプレッドシートメニューから各機能を手動実行');
    console.log('• バッチ処理: 「バッチ処理」→「バッチ処理開始」');
    console.log('• 状況確認: 「バッチ処理」→「処理状況確認」');
    console.log('• システム管理: 「システム管理」から各機能を実行');
    
    return true;
    
  } catch (error) {
    console.log('❌ 手動制御システム初期化エラー:', error.toString());
    return false;
  }
}

// ヘルプ機能の拡張
function showAdvancedHelp() {
  console.log('📚 Corporate Research System - 詳細ヘルプ');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('🚀 初期セットアップ関数:');
  console.log('  startSystemSetup()          - セットアップガイド表示');
  console.log('  quickSetup()                - クイックセットアップ開始');
  console.log('  continueQuickSetup()        - クイックセットアップ続行');
  console.log('  setupApiKeysGuide()         - APIキー設定ガイド');
  console.log('  completeSetupProcess()      - セットアップ完了チェック');
  console.log('');
  console.log('📊 システム確認関数:');
  console.log('  checkSystemStatus()         - システム状況確認');
  console.log('  runInitializationTest()     - 初期化テスト');
  console.log('  runQuickTest()              - クイックテスト');
  console.log('  runSystemTests()            - 完全システムテスト');
  console.log('');
  console.log('🧪 個別テスト関数:');
  console.log('  testApiConnectivity()       - API接続テスト');
  console.log('  testSampleCompanyResearch() - 企業調査テスト');
  console.log('  createSampleSpreadsheet()   - サンプルスプレッドシート作成');
  console.log('  initializeManualControlSystem() - 手動制御システム初期化');
  console.log('');
  console.log('🎮 手動制御関数:');
  console.log('  TriggerManager.startBatchProcessing() - バッチ処理開始');
  console.log('  TriggerManager.stopBatchProcessing()  - バッチ処理停止');
  console.log('  TriggerManager.getAllProcessStatus()  - プロセス状況確認');
  console.log('  TriggerManager.stopAllProcesses()     - 全プロセス停止');
  console.log('');
  console.log('🔧 システム管理関数:');
  console.log('  resetSystem()               - システムリセット');
  console.log('  TriggerManager.executeSystemMaintenance() - システムメンテナンス');
  console.log('  TriggerManager.executeErrorMonitoring()   - エラー監視');
  console.log('  TriggerManager.executePerformanceCheck()  - パフォーマンスチェック');
  console.log('');
  console.log('💡 まずは startSystemSetup() を実行してください！');
  console.log('🎮 時間ベースの自動実行は廃止され、すべて手動制御になりました');
}