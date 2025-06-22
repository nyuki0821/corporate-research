/**
 * @fileoverview Menu Setup and Troubleshooting for Corporate Research System
 * @author Corporate Research Team
 * 
 * スプレッドシートメニューの設定とトラブルシューティング用ファイル
 */

var MenuSetup = (function() {
  
  /**
   * Force create menu with detailed logging
   */
  function forceCreateMenu() {
    try {
      console.log('🔧 強制メニュー作成開始...');
      
      // アクティブなスプレッドシートを取得
      var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      if (!spreadsheet) {
        throw new Error('アクティブなスプレッドシートが見つかりません');
      }
      
      console.log('✅ スプレッドシート確認:', spreadsheet.getName());
      console.log('   ID:', spreadsheet.getId());
      
      // UIを取得
      var ui = SpreadsheetApp.getUi();
      if (!ui) {
        throw new Error('スプレッドシートUIが利用できません');
      }
      
      console.log('✅ UI確認: 利用可能');
      
      // 既存のメニューを削除（もしあれば）
      try {
        ui.createMenu('企業情報収集').addToUi();
      } catch (e) {
        console.log('⚠️ 既存メニューの削除:', e.message);
      }
      
      // 新しいメニューを作成
      var menu = ui.createMenu('企業情報収集');
      
      // 単一企業処理
      menu.addItem('単一企業処理', 'processSingleCompany');
      menu.addSeparator();
      
      // バッチ処理サブメニュー
      var batchMenu = ui.createMenu('バッチ処理');
      batchMenu.addItem('バッチ処理開始', 'startBatchProcessingManually');
      batchMenu.addItem('バッチ処理停止', 'stopBatchProcessingManually');
      batchMenu.addItem('処理状況確認', 'checkProcessStatusManually');
      menu.addSubMenu(batchMenu);
      
      menu.addSeparator();
      
      // システム管理サブメニュー
      var systemMenu = ui.createMenu('システム管理');
      systemMenu.addItem('システムメンテナンス実行', 'executeSystemMaintenanceManually');
      systemMenu.addItem('エラー監視実行', 'executeErrorMonitoringManually');
      systemMenu.addItem('パフォーマンスチェック実行', 'executePerformanceCheckManually');
      systemMenu.addItem('全プロセス停止', 'stopAllProcessesManually');
      menu.addSubMenu(systemMenu);
      
      menu.addSeparator();
      
      // 設定サブメニュー
      var settingsMenu = ui.createMenu('設定');
      settingsMenu.addItem('APIキー設定', 'showApiKeyDialog');
      settingsMenu.addItem('通知メール設定', 'setNotificationEmail');
      settingsMenu.addItem('スプレッドシート設定', 'showSpreadsheetSettings');
      menu.addSubMenu(settingsMenu);
      
      menu.addSeparator();
      
      // その他メニュー
      menu.addItem('システム診断', 'diagnoseSystem');
      menu.addItem('ログ表示', 'viewLogs');
      menu.addItem('キャッシュクリア', 'clearCache');
      
      // メニューを追加
      menu.addToUi();
      
      console.log('🎉 メニュー作成完了！');
      console.log('スプレッドシートを更新して「企業情報収集」メニューを確認してください');
      
      return {
        success: true,
        message: 'メニューが正常に作成されました'
      };
      
    } catch (error) {
      console.log('❌ メニュー作成エラー:', error.toString());
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Diagnose menu issues
   */
  function diagnoseMenuIssues() {
    console.log('🔍 メニュー問題診断開始');
    console.log('═══════════════════════════════════════════════');
    
    var issues = [];
    var checks = [];
    
    try {
      // 1. スプレッドシート確認
      console.log('\n1️⃣ スプレッドシート確認...');
      try {
        var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        if (spreadsheet) {
          checks.push({ name: 'アクティブスプレッドシート', status: '✅', details: spreadsheet.getName() });
          console.log('   ✅ アクティブスプレッドシート:', spreadsheet.getName());
          console.log('   ID:', spreadsheet.getId());
        } else {
          issues.push('アクティブなスプレッドシートが見つかりません');
          checks.push({ name: 'アクティブスプレッドシート', status: '❌', details: '見つかりません' });
        }
      } catch (e) {
        issues.push('スプレッドシートアクセスエラー: ' + e.message);
        checks.push({ name: 'アクティブスプレッドシート', status: '❌', details: e.message });
      }
      
      // 2. UI確認
      console.log('\n2️⃣ UI確認...');
      try {
        var ui = SpreadsheetApp.getUi();
        if (ui) {
          checks.push({ name: 'スプレッドシートUI', status: '✅', details: '利用可能' });
          console.log('   ✅ スプレッドシートUI: 利用可能');
        } else {
          issues.push('スプレッドシートUIが利用できません');
          checks.push({ name: 'スプレッドシートUI', status: '❌', details: '利用不可' });
        }
      } catch (e) {
        issues.push('UIアクセスエラー: ' + e.message);
        checks.push({ name: 'スプレッドシートUI', status: '❌', details: e.message });
      }
      
      // 3. メニュー関数確認
      console.log('\n3️⃣ メニュー関数確認...');
      var menuFunctions = [
        'startBatchProcessingManually',
        'stopBatchProcessingManually',
        'checkProcessStatusManually',
        'executeSystemMaintenanceManually',
        'showApiKeyDialog',
        'diagnoseSystem'
      ];
      
      var missingFunctions = [];
      menuFunctions.forEach(function(functionName) {
        try {
          if (typeof eval(functionName) === 'function') {
            console.log('   ✅', functionName);
          } else {
            console.log('   ❌', functionName, '- 関数が定義されていません');
            missingFunctions.push(functionName);
          }
        } catch (e) {
          console.log('   ❌', functionName, '- エラー:', e.message);
          missingFunctions.push(functionName);
        }
      });
      
      if (missingFunctions.length > 0) {
        issues.push('メニュー関数が見つかりません: ' + missingFunctions.join(', '));
        checks.push({ name: 'メニュー関数', status: '❌', details: missingFunctions.length + '個の関数が見つかりません' });
      } else {
        checks.push({ name: 'メニュー関数', status: '✅', details: menuFunctions.length + '個の関数が利用可能' });
      }
      
      // 4. onOpen関数確認
      console.log('\n4️⃣ onOpen関数確認...');
      try {
        if (typeof onOpen === 'function') {
          checks.push({ name: 'onOpen関数', status: '✅', details: '定義済み' });
          console.log('   ✅ onOpen関数: 定義済み');
        } else {
          issues.push('onOpen関数が定義されていません');
          checks.push({ name: 'onOpen関数', status: '❌', details: '未定義' });
        }
      } catch (e) {
        issues.push('onOpen関数確認エラー: ' + e.message);
        checks.push({ name: 'onOpen関数', status: '❌', details: e.message });
      }
      
      // 5. Main.js確認
      console.log('\n5️⃣ Main.js確認...');
      try {
        if (typeof Main !== 'undefined' && typeof Main.onOpen === 'function') {
          checks.push({ name: 'Main.js', status: '✅', details: '正常にロード済み' });
          console.log('   ✅ Main.js: 正常にロード済み');
        } else {
          issues.push('Main.jsが正しくロードされていません');
          checks.push({ name: 'Main.js', status: '❌', details: 'ロードエラー' });
        }
      } catch (e) {
        issues.push('Main.js確認エラー: ' + e.message);
        checks.push({ name: 'Main.js', status: '❌', details: e.message });
      }
      
      // 結果表示
      console.log('\n📊 診断結果');
      console.log('═══════════════════════════════════════════════');
      
      if (issues.length === 0) {
        console.log('🎉 問題は見つかりませんでした！');
        console.log('forceCreateMenu() を実行してメニューを強制作成してください');
      } else {
        console.log('⚠️ 以下の問題が見つかりました:');
        issues.forEach(function(issue, index) {
          console.log((index + 1) + '. ' + issue);
        });
      }
      
      return {
        success: issues.length === 0,
        issues: issues,
        checks: checks
      };
      
    } catch (error) {
      console.log('❌ 診断中にエラー:', error.toString());
      return {
        success: false,
        error: error.message,
        issues: issues,
        checks: checks
      };
    }
  }
  
  /**
   * Reset and recreate menu
   */
  function resetAndRecreateMenu() {
    console.log('🔄 メニューリセット・再作成');
    console.log('═══════════════════════════════════════════════');
    
    try {
      // 診断実行
      console.log('Step 1: 問題診断...');
      var diagnosis = diagnoseMenuIssues();
      
      if (!diagnosis.success && diagnosis.issues.length > 0) {
        console.log('⚠️ 問題が検出されました。解決後に再実行してください');
        return diagnosis;
      }
      
      // 強制メニュー作成
      console.log('\nStep 2: 強制メニュー作成...');
      var createResult = forceCreateMenu();
      
      if (createResult.success) {
        console.log('✅ メニューリセット・再作成完了！');
      } else {
        console.log('❌ メニュー作成に失敗:', createResult.error);
      }
      
      return createResult;
      
    } catch (error) {
      console.log('❌ リセット中にエラー:', error.toString());
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Return public API
  return {
    forceCreateMenu: forceCreateMenu,
    diagnoseMenuIssues: diagnoseMenuIssues,
    resetAndRecreateMenu: resetAndRecreateMenu
  };
})();

// Global functions for easy access
function forceCreateMenu() {
  return MenuSetup.forceCreateMenu();
}

function diagnoseMenuIssues() {
  return MenuSetup.diagnoseMenuIssues();
}

function resetAndRecreateMenu() {
  return MenuSetup.resetAndRecreateMenu();
} 