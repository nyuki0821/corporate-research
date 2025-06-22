/**
 * @fileoverview Test Setup - Google Apps Scriptでのテスト実行セットアップ
 * @author Corporate Research Team
 * 
 * このファイルは、Google Apps Scriptでテストを実行するための
 * 依存関係とセットアップを管理します。
 */

/**
 * テストの初期化とセットアップ
 */
function initializeTests() {
  console.log('🔧 テスト環境を初期化中...');
  
  // 必要なグローバル変数が存在するかチェック
  var missingDependencies = [];
  
  var requiredGlobals = [
    'GasT', 'TestDataFactory', 'MockFactory',
    'ConfigManager', 'Logger', 'ErrorHandler',
    'Company', 'TavilyClient', 'OpenAIClient'
  ];
  
  requiredGlobals.forEach(function(globalName) {
    if (typeof eval(globalName) === 'undefined') {
      missingDependencies.push(globalName);
    }
  });
  
  if (missingDependencies.length > 0) {
    console.error('❌ 以下の依存関係が見つかりません:');
    missingDependencies.forEach(function(dep) {
      console.error('  - ' + dep);
    });
    throw new Error('テスト実行に必要な依存関係が不足しています');
  }
  
  console.log('✅ テスト環境の初期化完了');
  return true;
}

/**
 * テスト環境をチェック
 */
function checkTestEnvironment() {
  console.log('🔍 テスト環境をチェック中...');
  
  var report = {
    framework: false,
    factories: false,
    services: false,
    models: false,
    overall: false
  };
  
  // フレームワークチェック
  try {
    if (typeof GasT !== 'undefined' && typeof GasT.describe === 'function') {
      report.framework = true;
      console.log('✅ GasT フレームワーク: OK');
    } else {
      console.log('❌ GasT フレームワーク: NG');
    }
  } catch (e) {
    console.log('❌ GasT フレームワーク: エラー - ' + e.message);
  }
  
  // ファクトリーチェック
  try {
    if (typeof TestDataFactory !== 'undefined' && typeof MockFactory !== 'undefined') {
      report.factories = true;
      console.log('✅ テストファクトリー: OK');
    } else {
      console.log('❌ テストファクトリー: NG');
    }
  } catch (e) {
    console.log('❌ テストファクトリー: エラー - ' + e.message);
  }
  
  // サービスチェック
  try {
    var services = ['ConfigManager', 'Logger', 'ErrorHandler', 'TavilyClient', 'OpenAIClient'];
    var missingServices = services.filter(function(service) {
      return typeof eval(service) === 'undefined';
    });
    
    if (missingServices.length === 0) {
      report.services = true;
      console.log('✅ サービス: OK');
    } else {
      console.log('❌ サービス: NG - 不足: ' + missingServices.join(', '));
    }
  } catch (e) {
    console.log('❌ サービス: エラー - ' + e.message);
  }
  
  // モデルチェック
  try {
    if (typeof Company !== 'undefined') {
      report.models = true;
      console.log('✅ モデル: OK');
    } else {
      console.log('❌ モデル: NG');
    }
  } catch (e) {
    console.log('❌ モデル: エラー - ' + e.message);
  }
  
  report.overall = report.framework && report.factories && report.services && report.models;
  
  console.log('\n📊 テスト環境チェック結果:');
  console.log('  フレームワーク: ' + (report.framework ? '✅' : '❌'));
  console.log('  ファクトリー: ' + (report.factories ? '✅' : '❌'));
  console.log('  サービス: ' + (report.services ? '✅' : '❌'));
  console.log('  モデル: ' + (report.models ? '✅' : '❌'));
  console.log('  総合評価: ' + (report.overall ? '✅ 準備完了' : '❌ 設定が必要'));
  
  return report;
}

/**
 * セーフテスト実行 - 依存関係をチェックしてからテストを実行
 */
function runTestsSafely() {
  try {
    console.log('🚀 セーフテスト実行を開始...');
    
    // 環境チェック
    var envCheck = checkTestEnvironment();
    if (!envCheck.overall) {
      throw new Error('テスト環境が準備できていません');
    }
    
    // テスト初期化
    initializeTests();
    
    // クイックテストを実行
    console.log('\n⚡ クイックテストを実行中...');
    return runQuickTestsSafe();
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
    console.error('💡 解決方法:');
    console.error('  1. 全ファイルがGoogle Apps Scriptにプッシュされているか確認');
    console.error('  2. clasp push を実行してファイルを同期');
    console.error('  3. Google Apps Scriptエディタでファイル一覧を確認');
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * セーフなクイックテスト実行
 */
function runQuickTestsSafe() {
  if (typeof GasT === 'undefined') {
    console.error('❌ GasTフレームワークが見つかりません');
    return { success: false, error: 'GasT framework not found' };
  }
  
  GasT.clear();
  
  // 基本的なテストのみ実行
  GasT.describe('Quick Environment Test', function() {
    GasT.it('should have GasT framework available', function() {
      GasT.expect(typeof GasT).toBe('object');
      GasT.expect(typeof GasT.describe).toBe('function');
      GasT.expect(typeof GasT.it).toBe('function');
      GasT.expect(typeof GasT.expect).toBe('function');
    });
    
    GasT.it('should have test factories available', function() {
      GasT.expect(typeof TestDataFactory).toBe('object');
      GasT.expect(typeof MockFactory).toBe('object');
    });
    
    GasT.it('should create test data successfully', function() {
      var company = TestDataFactory.createCompany();
      GasT.expect(company.companyName).toBeTruthy();
    });
    
    GasT.it('should create mock services successfully', function() {
      var mockConfig = MockFactory.createConfigManagerMock();
      GasT.expect(typeof mockConfig.get).toBe('function');
    });
  });
  
  return GasT.run();
}

/**
 * テストファイル読み込み状況を確認
 */
function checkTestFileLoading() {
  console.log('📁 テストファイル読み込み状況を確認中...');
  
  var testFiles = [
    'GasT',
    'TestDataFactory', 
    'MockFactory',
    'ConfigManagerTest',
    'CompanyTest',
    'TavilyClientTest'
  ];
  
  var loadedFiles = [];
  var missingFiles = [];
  
  testFiles.forEach(function(fileName) {
    try {
      // ファイルが読み込まれているかチェック
      // Google Apps Scriptでは、グローバル変数の存在で判断
      if (fileName.endsWith('Test')) {
        // テストファイルは関数として存在するかチェック
        var testFunctionName = 'run' + fileName.replace('Test', 'Tests');
        if (typeof eval(testFunctionName) !== 'undefined') {
          loadedFiles.push(fileName);
        } else {
          missingFiles.push(fileName);
        }
      } else {
        // フレームワーク・ファクトリーファイルはオブジェクトとして存在するかチェック
        if (typeof eval(fileName) !== 'undefined') {
          loadedFiles.push(fileName);
        } else {
          missingFiles.push(fileName);
        }
      }
    } catch (e) {
      missingFiles.push(fileName + ' (エラー: ' + e.message + ')');
    }
  });
  
  console.log('\n📊 ファイル読み込み状況:');
  console.log('✅ 読み込み済み (' + loadedFiles.length + '件):');
  loadedFiles.forEach(function(file) {
    console.log('  - ' + file);
  });
  
  if (missingFiles.length > 0) {
    console.log('\n❌ 未読み込み (' + missingFiles.length + '件):');
    missingFiles.forEach(function(file) {
      console.log('  - ' + file);
    });
    
    console.log('\n💡 解決方法:');
    console.log('  1. clasp push でファイルをアップロード');
    console.log('  2. Google Apps Scriptエディタでファイル一覧を確認');
    console.log('  3. ファイル名が正しいか確認');
  }
  
  return {
    loaded: loadedFiles,
    missing: missingFiles,
    success: missingFiles.length === 0
  };
}

// Google Apps Scriptから直接実行可能な関数
function testEnvironmentCheck() {
  return checkTestEnvironment();
}

function testFileCheck() {
  return checkTestFileLoading();
}

function runSafeTests() {
  return runTestsSafely();
} 