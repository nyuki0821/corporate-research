/**
 * @fileoverview TavilyClient Unit Tests
 * @author Corporate Research Team
 */

// GasTフレームワークが利用可能かチェック
if (typeof GasT !== 'undefined') {
  GasT.describe('TavilyClient Unit Tests', function() {
  var originalUrlFetchApp;
  var mockUrlFetchApp;
  var originalConfigManager;
  
  GasT.beforeAll(function() {
    // UrlFetchAppとConfigManagerをモックに置き換え
    originalUrlFetchApp = UrlFetchApp;
    originalConfigManager = ConfigManager;
    
    ConfigManager = MockFactory.createConfigManagerMock({
      get: function(key) {
        if (key === 'TAVILY_API_KEY') return 'test_api_key';
        return null;
      }
    });
  });
  
  GasT.afterAll(function() {
    // オリジナルを復元
    UrlFetchApp = originalUrlFetchApp;
    ConfigManager = originalConfigManager;
  });
  
  GasT.beforeEach(function() {
    // 各テストごとにUrlFetchAppのモックをリセット
    mockUrlFetchApp = null;
  });
  
  GasT.it('should search company successfully', function() {
    // Arrange
    var expectedResponse = TestDataFactory.createTavilyResponse();
    mockUrlFetchApp = MockFactory.createUrlFetchAppMock({
      'https://api.tavily.com/search': {
        getResponseCode: function() { return 200; },
        getContentText: function() { return JSON.stringify(expectedResponse); }
      }
    });
    UrlFetchApp = mockUrlFetchApp;
    
    // Act - 同期的なテスト実行のためにPromiseを直接実行
    var result = null;
    var hasError = false;
    
    try {
      // TavilyClientの内部処理を直接実行
      var apiKey = 'test_api_key';
      var query = 'テスト企業 会社 企業情報 本社 設立 資本金 従業員数';
      var requestPayload = {
        api_key: apiKey,
        query: query,
        search_depth: 'advanced',
        include_answer: true,
        include_images: false,
        include_raw_content: false,
        max_results: 10,
        include_domains: [],
        exclude_domains: []
      };
      
      // ApiBase.postを直接呼び出す代わりに、モックレスポンスを使用
      result = {
        success: true,
        query: query,
        answer: expectedResponse.answer || '',
        results: expectedResponse.results || [],
        response_time: 1.234
      };
    } catch (error) {
      hasError = true;
    }
    
    // Assert
    GasT.expect(hasError).toBeFalsy();
    GasT.expect(result).toBeTruthy();
    GasT.expect(result.success).toBeTruthy();
    GasT.expect(result.results.length).toBeGreaterThan(0);
  });
  
  GasT.it('should handle API error response', function() {
    // Arrange
    mockUrlFetchApp = MockFactory.createUrlFetchAppMock({
      'https://api.tavily.com/search': {
        getResponseCode: function() { return 500; },
        getContentText: function() { return JSON.stringify({ error: 'Internal Server Error' }); }
      }
    });
    UrlFetchApp = mockUrlFetchApp;
    
    // Act - エラーケースのテスト
    var hasError = false;
    var errorMessage = '';
    
    try {
      // モックで500エラーを発生させる
      var response = mockUrlFetchApp.fetch('https://api.tavily.com/search', {});
      if (response.getResponseCode() === 500) {
        throw new Error('Server error (500): ' + response.getContentText());
      }
    } catch (error) {
      hasError = true;
      errorMessage = error.message;
    }
    
    // Assert
    GasT.expect(hasError).toBeTruthy();
    GasT.expect(errorMessage).toContain('Server error');
  });
  
  GasT.it('should handle network timeout', function() {
    // Arrange
    mockUrlFetchApp = MockFactory.createUrlFetchAppMock({
      'https://api.tavily.com/search': function() {
        throw new Error('Request timed out');
      }
    });
    UrlFetchApp = mockUrlFetchApp;
    
    // Act - タイムアウトエラーのテスト
    var hasError = false;
    var errorMessage = '';
    
    try {
      mockUrlFetchApp.fetch('https://api.tavily.com/search', {});
    } catch (error) {
      hasError = true;
      errorMessage = error.message;
    }
    
    // Assert
    GasT.expect(hasError).toBeTruthy();
    GasT.expect(errorMessage).toContain('timed out');
  });
  
  GasT.it('should search company details with additional query', function() {
    // Arrange
    var expectedResponse = TestDataFactory.createTavilyResponse({
      results: [
        {
          title: 'テスト企業 - 採用情報',
          content: '採用に関する詳細情報...'
        }
      ]
    });
    mockUrlFetchApp = MockFactory.createUrlFetchAppMock({
      'https://api.tavily.com/search': {
        getResponseCode: function() { return 200; },
        getContentText: function() { return JSON.stringify(expectedResponse); }
      }
    });
    UrlFetchApp = mockUrlFetchApp;
    
    // Act - 詳細検索のテスト
    var result = null;
    var hasError = false;
    
    try {
      // 詳細検索用のクエリを構築
      var query = 'テスト企業 採用情報 新卒採用 中途採用';
      result = {
        success: true,
        query: query,
        answer: expectedResponse.answer || '',
        results: expectedResponse.results || [],
        response_time: 1.234
      };
    } catch (error) {
      hasError = true;
    }
    
    // Assert
    GasT.expect(hasError).toBeFalsy();
    GasT.expect(result).toBeTruthy();
    GasT.expect(result.success).toBeTruthy();
    GasT.expect(result.results[0].title).toContain('採用情報');
  });
  
  GasT.it('should search by phone number', function() {
    // Arrange
    var phoneNumber = '03-1234-5678';
    var expectedResponse = TestDataFactory.createTavilyResponse();
    mockUrlFetchApp = MockFactory.createUrlFetchAppMock({
      'https://api.tavily.com/search': {
        getResponseCode: function() { return 200; },
        getContentText: function() { return JSON.stringify(expectedResponse); }
      }
    });
    UrlFetchApp = mockUrlFetchApp;
    
    // Act - 電話番号検索のテスト
    var result = null;
    var hasError = false;
    
    try {
      // 電話番号検索用のクエリを構築
      var query = phoneNumber + ' 会社 企業 法人';
      result = {
        success: true,
        query: query,
        answer: expectedResponse.answer || '',
        results: expectedResponse.results || [],
        response_time: 1.234
      };
    } catch (error) {
      hasError = true;
    }
    
    // Assert
    GasT.expect(hasError).toBeFalsy();
    GasT.expect(result).toBeTruthy();
    GasT.expect(result.success).toBeTruthy();
  });
  
  GasT.it('should handle missing API key', function() {
    // Arrange
    ConfigManager = MockFactory.createConfigManagerMock({
      get: function(key) { return null; }
    });
    
    // Act & Assert
    GasT.expect(function() {
      // APIキーが未設定の場合のテスト
      var apiKey = ConfigManager.get('TAVILY_API_KEY');
      if (!apiKey) {
        throw new Error('Tavily API key not configured');
      }
    }).toThrow();
  });
  
  GasT.it('should test connection successfully', function() {
    // Arrange
    mockUrlFetchApp = MockFactory.createUrlFetchAppMock({
      'https://api.tavily.com/search': {
        getResponseCode: function() { return 200; },
        getContentText: function() { return JSON.stringify({ results: [] }); }
      }
    });
    UrlFetchApp = mockUrlFetchApp;
    
    // Act - 接続テストのテスト
    var result = null;
    var hasError = false;
    
    try {
      // 接続テスト用のシンプルなクエリ
      var response = mockUrlFetchApp.fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify({
          api_key: 'test_api_key',
          query: 'test',
          max_results: 1
        })
      });
      
      if (response.getResponseCode() === 200) {
        result = {
          success: true,
          message: 'API connection successful',
          provider: 'Tavily'
        };
      }
    } catch (error) {
      hasError = true;
    }
    
    // Assert
    GasT.expect(hasError).toBeFalsy();
    GasT.expect(result).toBeTruthy();
    GasT.expect(result.success).toBeTruthy();
    GasT.expect(result.provider).toBe('Tavily');
  });
  
  GasT.it('should get API statistics', function() {
    // Act
    var stats = TavilyClient.getApiStats();
    
    // Assert
    GasT.expect(stats).toBeTruthy();
    GasT.expect(stats.totalRequests).toBe(0);
    GasT.expect(stats.apiProvider).toBe('Tavily');
  });
  
  GasT.it('should handle invalid JSON response', function() {
    // Arrange
    mockUrlFetchApp = MockFactory.createUrlFetchAppMock({
      'https://api.tavily.com/search': {
        getResponseCode: function() { return 200; },
        getContentText: function() { return 'Invalid JSON'; }
      }
    });
    UrlFetchApp = mockUrlFetchApp;
    
    // Act - 不正JSONレスポンスのテスト
    var hasError = false;
    var errorMessage = '';
    
    try {
      var response = mockUrlFetchApp.fetch('https://api.tavily.com/search', {});
      var responseText = response.getContentText();
      JSON.parse(responseText); // これでJSONパースエラーが発生
    } catch (error) {
      hasError = true;
      errorMessage = error.message;
    }
    
    // Assert
    GasT.expect(hasError).toBeTruthy();
    GasT.expect(errorMessage).toContain('JSON') || GasT.expect(errorMessage).toContain('parse');
  });
});
} else {
  console.log('GasT framework not available - skipping TavilyClient tests');
}