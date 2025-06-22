/**
 * @fileoverview Production Environment Tests
 * @author Corporate Research Team
 * 
 * 本番環境での実際のAPI・データを使用したテストスイート
 * 開発環境のモックテストとは異なり、実際のAPIキーとデータを使用
 */

var ProductionTests = (function() {
  
  /**
   * API設定の確認
   */
  function checkApiConfiguration() {
    console.log('=== API設定確認 ===');
    
    var results = {
      tavilyKey: false,
      openaiKey: false,
      notificationEmail: false,
      spreadsheetId: false,
      batchSize: false
    };
    
    try {
      // 必須APIキー確認
      var tavilyKey = ConfigManager.get('TAVILY_API_KEY');
      results.tavilyKey = tavilyKey && tavilyKey.trim() !== '';
      console.log('Tavily APIキー:', results.tavilyKey ? '設定済み ✅' : '未設定 ❌');
      
      var openaiKey = ConfigManager.get('OPENAI_API_KEY');
      results.openaiKey = openaiKey && openaiKey.trim() !== '';
      console.log('OpenAI APIキー:', results.openaiKey ? '設定済み ✅' : '未設定 ❌');
      
      // その他設定確認
      var notificationEmail = ConfigManager.get('NOTIFICATION_EMAIL');
      results.notificationEmail = notificationEmail && notificationEmail.trim() !== '';
      console.log('通知メール:', notificationEmail || '未設定');
      
      var batchSize = ConfigManager.getNumber('BATCH_SIZE', 20);
      results.batchSize = batchSize > 0;
      console.log('バッチサイズ:', batchSize);
      
      // スプレッドシート確認
      var spreadsheetId = ConfigManager.get('SPREADSHEET_ID');
      results.spreadsheetId = spreadsheetId && spreadsheetId.trim() !== '';
      console.log('スプレッドシートID:', results.spreadsheetId ? '設定済み ✅' : '未設定 ❌');
      
      return results;
    } catch (error) {
      console.error('❌ 設定確認エラー:', error.toString());
      return results;
    }
  }
  
  /**
   * 実際のAPIとの接続確認
   */
  function testRealApiConnections() {
    console.log('🔌 実際のAPI接続テスト開始');
    
    try {
      var results = {
        tavily: { success: false, error: null },
        openai: { success: false, error: null }
      };
      
      // Tavily API接続テスト
      console.log('--- Tavily API接続テスト ---');
      try {
        var tavilyResult = TavilyClient.testConnection();
        results.tavily = tavilyResult;
        console.log('Tavily結果:', tavilyResult.success ? '✅ 成功' : '❌ 失敗');
        if (!tavilyResult.success) {
          console.log('Tavilyエラー:', tavilyResult.error);
        }
      } catch (error) {
        results.tavily = { success: false, error: error.toString() };
        console.log('Tavily例外:', error.toString());
      }
      
      // OpenAI API接続テスト  
      console.log('--- OpenAI API接続テスト ---');
      try {
        var openaiResult = OpenAIClient.testConnection();
        results.openai = openaiResult;
        console.log('OpenAI結果:', openaiResult.success ? '✅ 成功' : '❌ 失敗');
        if (!openaiResult.success) {
          console.log('OpenAIエラー:', openaiResult.error);
        }
      } catch (error) {
        results.openai = { success: false, error: error.toString() };
        console.log('OpenAI例外:', error.toString());
      }
      
      var allSuccess = results.tavily.success && results.openai.success;
      
      if (allSuccess) {
        console.log('✅ 全API接続成功');
      } else {
        console.log('❌ API接続に問題があります');
      }
      
      return {
        success: allSuccess,
        results: results
      };
      
    } catch (error) {
      console.error('❌ API接続テストエラー:', error.toString());
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  /**
   * 1社での実証テスト
   */
  function testSingleCompanyResearch() {
    console.log('🏢 単一企業調査テスト開始');
    
    try {
      // 実在する大手企業でテスト（確実に情報が取得できる企業を選択）
      var companyName = 'トヨタ自動車株式会社';
      
      console.log('調査対象:', companyName);
      console.log('調査開始...');
      
      var startTime = Date.now();
      var result = CompanyResearchService.researchCompany(companyName);
      var duration = Date.now() - startTime;
      
      if (result.success) {
        console.log('✅ 調査成功！');
        console.log('企業名:', result.company.companyName || '取得できませんでした');
        console.log('本社所在地:', (result.company.prefecture || '') + (result.company.city || ''));
        console.log('信頼性スコア:', (result.company.reliabilityScore || 0) + '%');
        console.log('処理時間:', duration + 'ms');
        console.log('取得フィールド数:', Object.keys(result.company).length);
        
        return {
          success: true,
          company: result.company,
          duration: duration,
          fieldCount: Object.keys(result.company).length
        };
      } else {
        console.log('❌ 調査失敗:', result.error);
        return {
          success: false,
          error: result.error,
          duration: duration
        };
      }
      
    } catch (error) {
      console.error('❌ エラー発生:', error.toString());
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  /**
   * 3-5社での小規模バッチ処理テスト
   */
  function testSmallBatchProcessing() {
    console.log('📦 小規模バッチ処理テスト開始');
    
    try {
      // テスト用企業リスト（実在企業）
      var testCompanies = [
        'ソニーグループ株式会社',
        '株式会社ファーストリテイリング', 
        '任天堂株式会社'
      ];
      
      console.log('バッチ処理対象:', testCompanies.length + '社');
      
      var startTime = Date.now();
      
      // 実際のBatchProcessorを使用（同期版のヘルパー関数を使用）
      var results = processSpecificCompanies(testCompanies);
      
      var successCount = results.filter(function(r) { return r.success; }).length;
      var failCount = results.filter(function(r) { return !r.success; }).length;
      
      var duration = Date.now() - startTime;
      
      console.log('✅ バッチ処理完了');
      console.log('成功:', successCount + '社');
      console.log('失敗:', failCount + '社');
      console.log('処理時間:', duration + 'ms');
      console.log('平均処理時間:', Math.round(duration / testCompanies.length) + 'ms/社');
      
      return {
        success: successCount > 0,
        totalCompanies: testCompanies.length,
        successCount: successCount,
        failCount: failCount,
        duration: duration,
        averageTime: Math.round(duration / testCompanies.length),
        results: results
      };
      
    } catch (error) {
      console.error('❌ バッチ処理エラー:', error.toString());
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  /**
   * スプレッドシートから実際の企業リストを読み込んでテスト
   */
  function testRealSpreadsheetProcessing() {
    console.log('📊 実際のスプレッドシート処理テスト');
    
    try {
      // 実際のスプレッドシートから企業リスト取得
      var companies = SpreadsheetService.getCompanyList('未処理');
      console.log('処理対象企業数:', companies.length);
      
      if (companies.length === 0) {
        console.log('⚠️ 処理対象企業がありません');
        console.log('企業リストシートに企業名を入力してください');
        return {
          success: false,
          error: '処理対象企業がありません'
        };
      }
      
      // 安全のため最初の2社だけ処理
      var testCount = Math.min(2, companies.length);
      console.log('テスト処理対象:', testCount + '社');
      
      // バッチサイズを一時的に小さく設定
      var originalBatchSize = ConfigManager.getNumber('BATCH_SIZE', 20);
      ConfigManager.set('BATCH_SIZE', testCount.toString());
      
      try {
        var startTime = Date.now();
        
        // 実際のバッチ処理実行（少数企業のみ）
        var testCompanies = companies.slice(0, testCount);
        var processedResults = [];
        
        for (var i = 0; i < testCompanies.length; i++) {
          var company = testCompanies[i];
          console.log('スプレッドシート処理中 (' + (i + 1) + '/' + testCount + '):', company.companyName);
          
          try {
            var result = CompanyResearchService.researchCompany(company.companyName);
            
            if (result.success) {
              // スプレッドシートに結果を保存
              SpreadsheetService.saveCompanyInfo(result.company);
              processedResults.push({
                success: true,
                rowIndex: company.rowIndex,
                companyName: company.companyName,
                company: result.company
              });
            } else {
              processedResults.push({
                success: false,
                rowIndex: company.rowIndex,
                companyName: company.companyName,
                error: result.error
              });
            }
          } catch (error) {
            processedResults.push({
              success: false,
              rowIndex: company.rowIndex,
              companyName: company.companyName,
              error: error.toString()
            });
          }
        }
        
        var duration = Date.now() - startTime;
        var successCount = processedResults.filter(function(r) { return r.success; }).length;
        
        console.log('✅ スプレッドシート処理テスト完了');
        console.log('処理企業数:', testCount);
        console.log('成功企業数:', successCount);
        console.log('処理時間:', duration + 'ms');
        
        return {
          success: true,
          processedCount: testCount,
          successCount: successCount,
          duration: duration,
          results: processedResults
        };
        
      } finally {
        // バッチサイズを元に戻す
        ConfigManager.set('BATCH_SIZE', originalBatchSize.toString());
      }
      
    } catch (error) {
      console.error('❌ スプレッドシート処理エラー:', error.toString());
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  /**
   * 本番環境テストの推奨実行順序
   */
  function runProductionTests() {
    console.log('🚀 本番環境テスト実行開始');
    console.log('================================');
    
    var results = {
      configuration: { success: false, data: null },
      apiConnection: { success: false, data: null },
      singleCompany: { success: false, data: null },
      smallBatch: { success: false, data: null },
      spreadsheetTest: { success: false, data: null }
    };
    
    var startTime = Date.now();
    
    try {
      // Step 1: 設定確認
      console.log('\n📋 Step 1: 設定確認');
      var configResult = checkApiConfiguration();
      results.configuration.success = configResult.tavilyKey && configResult.openaiKey && configResult.spreadsheetId;
      results.configuration.data = configResult;
      
      if (!results.configuration.success) {
        console.log('❌ 必須設定が不足しています。テストを中止します。');
        return results;
      }
      
      // Step 2: API接続テスト
      console.log('\n🔌 Step 2: API接続テスト');
      var apiResult = testRealApiConnections();
      results.apiConnection.success = apiResult.success;
      results.apiConnection.data = apiResult;
      
      if (!results.apiConnection.success) {
        console.log('❌ API接続に失敗しました。設定を確認してください。');
        return results;
      }
      
      // Step 3: 単一企業テスト
      console.log('\n🏢 Step 3: 単一企業テスト');
      var singleResult = testSingleCompanyResearch();
      results.singleCompany.success = singleResult.success;
      results.singleCompany.data = singleResult;
      
      if (!results.singleCompany.success) {
        console.log('❌ 単一企業テストに失敗しました。');
        return results;
      }
      
      // Step 4: 小規模バッチテスト
      console.log('\n📦 Step 4: 小規模バッチテスト');
      var batchResult = testSmallBatchProcessing();
      results.smallBatch.success = batchResult.success;
      results.smallBatch.data = batchResult;
      
      if (!results.smallBatch.success) {
        console.log('❌ バッチ処理テストに失敗しました。');
        return results;
      }
      
      // Step 5: スプレッドシートテスト
      console.log('\n📊 Step 5: スプレッドシート処理テスト');
      var spreadsheetResult = testRealSpreadsheetProcessing();
      results.spreadsheetTest.success = spreadsheetResult.success;
      results.spreadsheetTest.data = spreadsheetResult;
      
    } catch (error) {
      console.error('❌ 本番テスト実行エラー:', error.toString());
      results.error = error.toString();
    }
    
    var totalDuration = Date.now() - startTime;
    
    // 結果サマリー
    console.log('\n🎯 本番環境テスト結果');
    console.log('================================');
    console.log('設定確認:', results.configuration.success ? '✅' : '❌');
    console.log('API接続:', results.apiConnection.success ? '✅' : '❌');
    console.log('単一企業調査:', results.singleCompany.success ? '✅' : '❌');
    console.log('バッチ処理:', results.smallBatch.success ? '✅' : '❌');
    console.log('スプレッドシート処理:', results.spreadsheetTest.success ? '✅' : '❌');
    console.log('総実行時間:', totalDuration + 'ms');
    
    var allSuccess = Object.keys(results).every(function(key) {
      return key === 'error' || results[key].success === true;
    });
    
    if (allSuccess) {
      console.log('\n🎉 全ての本番環境テストが成功しました！');
      console.log('本格的な運用を開始できます。');
    } else {
      console.log('\n⚠️ 一部のテストで問題が発生しました。');
      console.log('問題を解決してから運用を開始してください。');
    }
    
    results.summary = {
      allSuccess: allSuccess,
      totalDuration: totalDuration,
      timestamp: new Date()
    };
    
    return results;
  }
  
  // BatchProcessor用のヘルパー関数（同期版）
  function processSpecificCompanies(companyNames) {
    var results = [];
    
    for (var i = 0; i < companyNames.length; i++) {
      var companyName = companyNames[i];
      try {
        var result = CompanyResearchService.researchCompany(companyName);
        results.push({
          success: result.success,
          companyName: companyName,
          company: result.success ? result.company : null,
          error: result.success ? null : result.error
        });
      } catch (error) {
        results.push({
          success: false,
          companyName: companyName,
          company: null,
          error: error.toString()
        });
      }
      
      // レート制限対策
      if (i < companyNames.length - 1) {
        Utilities.sleep(1000);
      }
    }
    
    return results;
  }
  
  // Public API
  return {
    checkApiConfiguration: checkApiConfiguration,
    testRealApiConnections: testRealApiConnections,
    testSingleCompanyResearch: testSingleCompanyResearch,
    testSmallBatchProcessing: testSmallBatchProcessing,
    testRealSpreadsheetProcessing: testRealSpreadsheetProcessing,
    runProductionTests: runProductionTests,
    processSpecificCompanies: processSpecificCompanies
  };
})();

// グローバル関数として公開（READMEで説明したとおり）
function checkApiConfiguration() {
  return ProductionTests.checkApiConfiguration();
}

function testRealApiConnections() {
  return ProductionTests.testRealApiConnections();
}

function testSingleCompanyResearch() {
  return ProductionTests.testSingleCompanyResearch();
}

function testSmallBatchProcessing() {
  return ProductionTests.testSmallBatchProcessing();
}

function testRealSpreadsheetProcessing() {
  return ProductionTests.testRealSpreadsheetProcessing();
}

function runProductionTests() {
  return ProductionTests.runProductionTests();
} 