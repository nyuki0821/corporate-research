/**
 * @fileoverview Performance Tests
 * @author Corporate Research Team
 * 
 * システムのパフォーマンスと処理能力をテスト
 */

// GasTフレームワークが利用可能かチェック
if (typeof GasT !== 'undefined') {
  GasT.describe('Performance Tests', function() {
  var mockServices = {};
  var originalServices = {};
  
  GasT.beforeAll(function() {
    // サービスのオリジナルを保存
    originalServices.Logger = Logger;
    originalServices.ConfigManager = ConfigManager;
    
    // モックを設定
    mockServices.Logger = MockFactory.createLoggerMock();
    mockServices.ConfigManager = MockFactory.createConfigManagerMock();
    
    Logger = mockServices.Logger;
    ConfigManager = mockServices.ConfigManager;
  });
  
  GasT.afterAll(function() {
    // オリジナルを復元
    Logger = originalServices.Logger;
    ConfigManager = originalServices.ConfigManager;
  });
  
  GasT.it('should process 100 companies within acceptable time limit', function() {
    // Arrange
    var companies = TestDataFactory.createCompanies(100);
    var startTime = Date.now();
    var processedCount = 0;
    
    // Act
    companies.forEach(function(company) {
      // 軽量な処理をシミュレート
      var validation = new Company(company).validate();
      if (validation.isValid) {
        processedCount++;
      }
    });
    
    var endTime = Date.now();
    var duration = endTime - startTime;
    
    // Assert
    GasT.expect(processedCount).toBe(100);
    GasT.expect(duration).toBeLessThan(5000); // 5秒以内
    
    console.log('100社の処理時間: ' + duration + 'ms');
  });
  
  GasT.it('should handle concurrent API requests efficiently', function() {
    // Arrange
    var mockTavilyClient = MockFactory.createTavilyClientMock();
    var requestCount = 10;
    var startTime = Date.now();
    var responses = [];
    
    // 並列リクエストをシミュレート
    mockTavilyClient.searchCompany = function(companyName) {
      // API遅延をシミュレート
      Utilities.sleep(50);
      return Promise.resolve({
        success: true,
        results: [{ title: companyName }]
      });
    };
    
    // Act
    for (var i = 0; i < requestCount; i++) {
      var response = mockTavilyClient.searchCompany('企業' + i);
      responses.push(response);
    }
    
    // すべてのPromiseが解決するまで待つ
    Promise.all(responses);
    
    var endTime = Date.now();
    var duration = endTime - startTime;
    
    // Assert
    GasT.expect(responses.length).toBe(requestCount);
    GasT.expect(duration).toBeGreaterThan(500); // 最低500ms（10 × 50ms）
    GasT.expect(duration).toBeLessThan(1000); // 1秒以内
    
    console.log(requestCount + '件の並列APIリクエスト処理時間: ' + duration + 'ms');
  });
  
  GasT.it('should efficiently handle large spreadsheet operations', function() {
    // Arrange
    var mockSpreadsheetService = MockFactory.createSpreadsheetServiceMock();
    var rowCount = 1000;
    var columnCount = 25;
    var testData = TestDataFactory.createRangeValues(rowCount, columnCount);
    
    // Act
    var startTime = Date.now();
    
    // 大量データの読み込みをシミュレート
    mockSpreadsheetService.getRange = function() {
      return {
        getValues: function() {
          return testData;
        }
      };
    };
    
    var range = mockSpreadsheetService.getRange('TestRange');
    var values = range.getValues();
    
    // データ処理をシミュレート
    var processedRows = 0;
    values.forEach(function(row) {
      if (row[0]) { // 最初のセルが空でない場合
        processedRows++;
      }
    });
    
    var endTime = Date.now();
    var duration = endTime - startTime;
    
    // Assert
    GasT.expect(processedRows).toBe(rowCount);
    GasT.expect(duration).toBeLessThan(2000); // 2秒以内
    
    console.log(rowCount + '行のスプレッドシート処理時間: ' + duration + 'ms');
  });
  
  GasT.it('should maintain performance with error handling', function() {
    // Arrange
    var mockErrorHandler = MockFactory.createErrorHandlerMock();
    var operationCount = 50;
    var errorRate = 0.2; // 20%のエラー率
    
    // Act
    var startTime = Date.now();
    var successCount = 0;
    var errorCount = 0;
    
    for (var i = 0; i < operationCount; i++) {
      try {
        if (Math.random() < errorRate) {
          throw new Error('Simulated error ' + i);
        }
        successCount++;
      } catch (error) {
        mockErrorHandler.handleError(error, { operation: i });
        errorCount++;
      }
    }
    
    var endTime = Date.now();
    var duration = endTime - startTime;
    
    // Assert
    GasT.expect(successCount + errorCount).toBe(operationCount);
    GasT.expect(errorCount).toBeGreaterThan(5); // 少なくとも5つのエラー
    GasT.expect(errorCount).toBeLessThan(15); // 15未満のエラー
    GasT.expect(duration).toBeLessThan(1000); // 1秒以内
    
    console.log('エラーハンドリング込みの処理時間: ' + duration + 'ms');
    console.log('成功: ' + successCount + ', エラー: ' + errorCount);
  });
  
  GasT.it('should test memory usage with large datasets', function() {
    // Arrange
    var largeDatasets = [];
    var datasetCount = 10;
    var startMemory = 0; // Google Apps Scriptでは正確なメモリ使用量は取得できない
    
    // Act
    var startTime = Date.now();
    
    // 大量のデータセットを作成
    for (var i = 0; i < datasetCount; i++) {
      var dataset = TestDataFactory.createCompanies(100);
      largeDatasets.push(dataset);
    }
    
    // データセットを処理
    var totalCompanies = 0;
    largeDatasets.forEach(function(dataset) {
      dataset.forEach(function(company) {
        if (company.companyName) {
          totalCompanies++;
        }
      });
    });
    
    // メモリをクリア（ガベージコレクションを促す）
    largeDatasets = null;
    
    var endTime = Date.now();
    var duration = endTime - startTime;
    
    // Assert
    GasT.expect(totalCompanies).toBe(datasetCount * 100);
    GasT.expect(duration).toBeLessThan(5000); // 5秒以内
    
    console.log('大量データセット処理時間: ' + duration + 'ms');
    console.log('処理した企業数: ' + totalCompanies);
  });
  
  GasT.it('should test rate limiting effectiveness', function() {
    // Arrange
    var requestTimes = [];
    var requestCount = 20;
    var minInterval = 100; // 最小間隔100ms
    
    // Act
    for (var i = 0; i < requestCount; i++) {
      var requestTime = Date.now();
      requestTimes.push(requestTime);
      
      // レート制限をシミュレート
      if (i > 0) {
        var interval = requestTime - requestTimes[i - 1];
        if (interval < minInterval) {
          Utilities.sleep(minInterval - interval);
        }
      }
    }
    
    // 実際の間隔を計算
    var intervals = [];
    for (var j = 1; j < requestTimes.length; j++) {
      intervals.push(requestTimes[j] - requestTimes[j - 1]);
    }
    
    var avgInterval = intervals.reduce(function(sum, interval) {
      return sum + interval;
    }, 0) / intervals.length;
    
    // Assert
    GasT.expect(intervals.length).toBe(requestCount - 1);
    intervals.forEach(function(interval) {
      GasT.expect(interval).toBeGreaterThan(minInterval - 10); // 許容誤差10ms
    });
    
    console.log('平均リクエスト間隔: ' + Math.round(avgInterval) + 'ms');
  });
});
}
// Note: パフォーマンステストは実行時に動的に読み込まれます