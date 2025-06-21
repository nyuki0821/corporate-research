/**
 * Corporate Research System - 初期セットアップガイド
 * Google Apps Script エディタで実行してください
 */

function startSystemSetup() {
  console.log('🚀 Corporate Research System - セットアップ開始');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('このガイドに従ってシステムを設定してください:');
  console.log('');
  console.log('1️⃣ まず runInitializationTest() を実行してシステムの状態を確認');
  console.log('2️⃣ APIキーを設定（下記の setupApiKeysGuide() 参照）');
  console.log('3️⃣ testApiConnectivity() でAPI接続をテスト');
  console.log('4️⃣ createSampleSpreadsheet() でスプレッドシートを準備');
  console.log('5️⃣ setupTriggers() で自動処理を設定');
  console.log('6️⃣ testSampleCompanyResearch() で実際の企業調査をテスト');
  console.log('');
  console.log('💡 各ステップで問題が発生した場合は showHelp() を実行してください');
  console.log('');
  console.log('次の関数を実行してください: runInitializationTest()');
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
  
  // 4. トリガー確認
  try {
    var triggerStatus = TriggerManager.getTriggerStatus();
    if (triggerStatus.success && triggerStatus.triggerCount > 0) {
      setupChecklist.push({ item: 'トリガー設定', status: '✅' });
    } else {
      setupChecklist.push({ item: 'トリガー設定', status: '❌', error: 'トリガー未設定' });
    }
  } catch (e) {
    setupChecklist.push({ item: 'トリガー設定', status: '❌', error: e.message });
  }
  
  // 結果表示
  console.log('セットアップ状況:');
  var completedItems = 0;
  setupChecklist.forEach(function(check) {
    console.log(' ', check.status, check.item);
    if (check.error) {
      console.log('     エラー:', check.error);
    }
    if (check.status === '✅') {
      completedItems++;
    }
  });
  
  console.log('\n完了状況:', completedItems + '/' + setupChecklist.length);
  
  if (completedItems === setupChecklist.length) {
    console.log('🎉 セットアップ完了！システムを使用する準備ができました');
    console.log('\n次にできること:');
    console.log('• testSampleCompanyResearch() - 企業調査テスト');
    console.log('• startBatchProcessing() - バッチ処理開始');
    console.log('• runQuickTest() - クイックテスト実行');
  } else {
    console.log('⚠️ セットアップが完了していません');
    console.log('\n不足している項目を確認して設定してください');
    console.log('詳細は setupApiKeysGuide() または showHelp() を参照');
  }
  
  return {
    completed: completedItems,
    total: setupChecklist.length,
    checklist: setupChecklist,
    isComplete: completedItems === setupChecklist.length
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
  
  // ステップ5: トリガー設定
  console.log('\nStep 5/5: トリガー設定');
  setupTriggers();
  
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
    
    // 設定は保持（APIキーなど）
    console.log('設定保持: ✅ (APIキーは保持されます)');
    
    console.log('\n✅ システムリセット完了');
    console.log('runInitializationTest() を実行して再セットアップしてください');
    
  } catch (error) {
    console.log('❌ リセット中にエラー:', error.toString());
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
  console.log('  setupTriggers()             - トリガー設定');
  console.log('');
  console.log('🔧 システム管理関数:');
  console.log('  resetSystem()               - システムリセット');
  console.log('  TriggerManager.getTriggerStatus() - トリガー状況確認');
  console.log('  ConfigManager.validate()    - 設定検証');
  console.log('');
  console.log('💡 まずは startSystemSetup() を実行してください！');
}