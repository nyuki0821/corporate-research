/**
 * Corporate Research System - 統合セットアップガイド
 * Google Apps Script エディタで実行してください
 */

var SetupGuide = (function() {
  
  // セットアップガイドの表示
  function showWelcome() {
    console.log('🚀 Corporate Research System - セットアップ開始');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('このガイドに従ってシステムを設定してください:');
    console.log('');
    console.log('1️⃣ runInitializationTest() - システム状態確認');
    console.log('2️⃣ setupApiKeys() - APIキー設定');
    console.log('3️⃣ testApiConnectivity() - API接続テスト');
    console.log('4️⃣ createSampleSpreadsheet() - スプレッドシート準備');
    console.log('5️⃣ setupTriggers() - 自動処理設定');
    console.log('6️⃣ runCompleteTest() - 完全テスト実行');
    console.log('');
    console.log('💡 問題が発生した場合は SetupGuide.showHelp() を実行');
  }

  // APIキー設定ガイド
  function showApiKeyGuide() {
    console.log('🔑 APIキー設定ガイド');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('【Google Apps Script エディタで設定（推奨）】');
    console.log('1. 左側メニュー「プロジェクトの設定」をクリック');
    console.log('2. 「スクリプト プロパティ」で以下を追加:');
    console.log('   TAVILY_API_KEY = あなたのTavily APIキー');
    console.log('   OPENAI_API_KEY = あなたのOpenAI APIキー');
    console.log('   NOTIFICATION_EMAIL = 通知用メールアドレス');
    console.log('');
    console.log('【プログラムで設定】');
    console.log('ConfigManager.set("TAVILY_API_KEY", "your_key");');
    console.log('ConfigManager.set("OPENAI_API_KEY", "your_key");');
    console.log('');
    console.log('【APIキー取得】');
    console.log('• Tavily: https://tavily.com');
    console.log('• OpenAI: https://platform.openai.com/api-keys');
  }

  // システム状況確認
  function checkStatus() {
    console.log('📊 システム状況確認');
    console.log('═══════════════════════════════════════════════');
    
    var status = {
      modules: 0,
      config: false,
      spreadsheet: false,
      triggers: 0
    };
    
    // モジュール確認
    var modules = ['Logger', 'ConfigManager', 'ErrorHandler', 'SpreadsheetService', 
                   'BatchProcessor', 'CompanyResearchService', 'TavilyClient', 
                   'OpenAIClient', 'Company', 'TriggerManager'];
    
    console.log('1. モジュール状況:');
    modules.forEach(function(moduleName) {
      try {
        if (typeof eval(moduleName) !== 'undefined') {
          console.log('   ✅', moduleName);
          status.modules++;
        } else {
          console.log('   ❌', moduleName);
        }
      } catch (e) {
        console.log('   ❌', moduleName, '- エラー');
      }
    });
    
    // 設定確認
    console.log('\n2. 設定状況:');
    try {
      var hasKeys = ConfigManager.get('TAVILY_API_KEY') && ConfigManager.get('OPENAI_API_KEY');
      status.config = hasKeys;
      console.log('   APIキー:', hasKeys ? '✅ 設定済み' : '❌ 未設定');
    } catch (e) {
      console.log('   APIキー: ❌ エラー');
    }
    
    // スプレッドシート確認
    console.log('\n3. スプレッドシート状況:');
    try {
      var info = SpreadsheetService.getSpreadsheetInfo();
      status.spreadsheet = !!info;
      console.log('   接続:', info ? '✅ 接続済み' : '❌ 未設定');
    } catch (e) {
      console.log('   接続: ❌ エラー');
    }
    
    // トリガー確認
    console.log('\n4. トリガー状況:');
    try {
      var triggerStatus = TriggerManager.getTriggerStatus();
      status.triggers = triggerStatus.triggerCount || 0;
      console.log('   アクティブトリガー:', status.triggers + '個');
    } catch (e) {
      console.log('   アクティブトリガー: ❌ エラー');
    }
    
    // 全体評価
    var score = 0;
    if (status.modules >= 8) score += 25;
    if (status.config) score += 25;
    if (status.spreadsheet) score += 25;
    if (status.triggers > 0) score += 25;
    
    console.log('\n📋 セットアップ進捗:', score + '%');
    
    if (score === 100) {
      console.log('🎉 セットアップ完了！');
    } else {
      console.log('⚠️ 未完了の項目があります');
    }
    
    return status;
  }

  // クイックセットアップ
  function quickSetup() {
    console.log('⚡ クイックセットアップ実行');
    console.log('');
    
    try {
      // Step 1: システム確認
      console.log('Step 1/3: システム確認...');
      runInitializationTest();
      
      // Step 2: ガイド表示
      console.log('\nStep 2/3: APIキー設定ガイド');
      showApiKeyGuide();
      
      console.log('\nStep 3/3: 設定完了後の指示');
      console.log('APIキー設定後、以下を実行してください:');
      console.log('1. testApiConnectivity()');
      console.log('2. createSampleSpreadsheet()');
      console.log('3. setupTriggers()');
      console.log('4. SetupGuide.verifyComplete()');
      
    } catch (error) {
      console.log('❌ クイックセットアップエラー:', error.toString());
    }
  }

  // セットアップ完了確認
  function verifyComplete() {
    console.log('🔍 セットアップ完了確認');
    console.log('═══════════════════════════════════════════════');
    
    var checks = [];
    
    // 1. モジュール確認
    try {
      runModuleLoadingTest();
      checks.push({ name: 'モジュール読み込み', status: true });
    } catch (e) {
      checks.push({ name: 'モジュール読み込み', status: false, error: e.message });
    }
    
    // 2. API接続確認
    try {
      testApiConnectivity();
      checks.push({ name: 'API接続', status: true });
    } catch (e) {
      checks.push({ name: 'API接続', status: false, error: e.message });
    }
    
    // 3. スプレッドシート確認
    try {
      var info = SpreadsheetService.getSpreadsheetInfo();
      checks.push({ name: 'スプレッドシート', status: !!info });
    } catch (e) {
      checks.push({ name: 'スプレッドシート', status: false, error: e.message });
    }
    
    // 4. トリガー確認
    try {
      var status = TriggerManager.getTriggerStatus();
      checks.push({ name: 'トリガー', status: status.triggerCount > 0 });
    } catch (e) {
      checks.push({ name: 'トリガー', status: false, error: e.message });
    }
    
    // 結果表示
    var passedChecks = 0;
    checks.forEach(function(check) {
      var emoji = check.status ? '✅' : '❌';
      console.log(emoji + ' ' + check.name);
      if (check.error) {
        console.log('    エラー: ' + check.error);
      }
      if (check.status) passedChecks++;
    });
    
    console.log('\n完了率: ' + Math.round((passedChecks / checks.length) * 100) + '%');
    
    if (passedChecks === checks.length) {
      console.log('🎉 セットアップ完了！システム使用可能です');
      console.log('\n次にできること:');
      console.log('• testSampleCompanyResearch() - 企業調査テスト');
      console.log('• runCompleteSystemTest() - 完全システムテスト');
    } else {
      console.log('⚠️ セットアップが未完了です');
    }
    
    return {
      completed: passedChecks === checks.length,
      checks: checks,
      completionRate: Math.round((passedChecks / checks.length) * 100)
    };
  }

  // ヘルプ表示
  function showHelp() {
    console.log('📚 Corporate Research System - セットアップヘルプ');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('🚀 基本セットアップ:');
    console.log('  SetupGuide.showWelcome()    - ウェルカムガイド');
    console.log('  SetupGuide.quickSetup()     - クイックセットアップ');
    console.log('  SetupGuide.showApiKeyGuide() - APIキー設定ガイド');
    console.log('');
    console.log('📊 状況確認:');
    console.log('  SetupGuide.checkStatus()    - システム状況確認');
    console.log('  SetupGuide.verifyComplete() - セットアップ完了確認');
    console.log('');
    console.log('🧪 テスト実行:');
    console.log('  runInitializationTest()     - 初期化テスト');
    console.log('  testApiConnectivity()       - API接続テスト');
    console.log('  createSampleSpreadsheet()   - スプレッドシート作成');
    console.log('  setupTriggers()             - トリガー設定');
    console.log('');
    console.log('💡 まずは SetupGuide.showWelcome() から始めてください！');
  }

  // 公開API
  return {
    showWelcome: showWelcome,
    showApiKeyGuide: showApiKeyGuide,
    checkStatus: checkStatus,
    quickSetup: quickSetup,
    verifyComplete: verifyComplete,
    showHelp: showHelp
  };
})();

// 便利なグローバル関数
function startSystemSetup() {
  return SetupGuide.showWelcome();
}

function setupApiKeysGuide() {
  return SetupGuide.showApiKeyGuide();
}

function checkSystemStatus() {
  return SetupGuide.checkStatus();
}

function quickSetup() {
  return SetupGuide.quickSetup();
}

function showSetupHelp() {
  return SetupGuide.showHelp();
}