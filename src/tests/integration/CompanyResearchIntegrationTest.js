/**
 * @fileoverview CompanyResearchService Integration Tests
 * @author Corporate Research Team
 */

// GasTフレームワークが利用可能かチェック
if (typeof GasT !== 'undefined') {
  GasT.describe('CompanyResearchService Integration Tests', function() {
  var mockTavilyClient;
  var mockOpenAIClient;
  var mockSpreadsheetService;
  var mockLogger;
  var originalServices = {};
  
  GasT.beforeAll(function() {
    // オリジナルのサービスを保存
    originalServices.TavilyClient = TavilyClient;
    originalServices.OpenAIClient = OpenAIClient;
    originalServices.SpreadsheetService = SpreadsheetService;
    originalServices.Logger = Logger;
    
    // モックを作成
    mockLogger = MockFactory.createLoggerMock();
    Logger = mockLogger;
  });
  
  GasT.afterAll(function() {
    // オリジナルのサービスを復元
    TavilyClient = originalServices.TavilyClient;
    OpenAIClient = originalServices.OpenAIClient;
    SpreadsheetService = originalServices.SpreadsheetService;
    Logger = originalServices.Logger;
  });
  
  GasT.beforeEach(function() {
    // 各テストごとにモックをリセット
    mockTavilyClient = MockFactory.createTavilyClientMock();
    mockOpenAIClient = MockFactory.createOpenAIClientMock();
    mockSpreadsheetService = MockFactory.createSpreadsheetServiceMock();
    
    TavilyClient = mockTavilyClient;
    OpenAIClient = mockOpenAIClient;
    SpreadsheetService = mockSpreadsheetService;
    
    mockLogger.clearLogs();
  });
  
  GasT.it('should research company successfully with all services', function() {
    // Arrange
    var companyName = 'テスト株式会社';
    var expectedCompanyData = TestDataFactory.createCompany({
      companyName: companyName,
      employees: 500,
      establishedYear: 2010
    });
    
    // TavilyClientのレスポンスをカスタマイズ
    mockTavilyClient.searchCompany = function(name) {
      return Promise.resolve({
        success: true,
        results: [
          {
            title: name + ' - 企業情報',
            content: '従業員数500名、2010年設立の優良企業',
            url: 'https://example.com/company'
          }
        ]
      });
    };
    
    // OpenAIClientのレスポンスをカスタマイズ
    mockOpenAIClient.extractCompanyInfo = function(results) {
      return Promise.resolve({
        success: true,
        data: expectedCompanyData
      });
    };
    
    // Act
    var result = CompanyResearchService.researchCompany(companyName);
    
    // Assert
    GasT.expect(result.success).toBeTruthy();
    GasT.expect(result.data.companyName).toBe(companyName);
    GasT.expect(result.data.employees).toBe(500);
    GasT.expect(result.data.establishedYear).toBe(2010);
  });
  
  GasT.it('should handle Tavily API failure gracefully', function() {
    // Arrange
    mockTavilyClient.searchCompany = function() {
      return Promise.resolve({
        success: false,
        error: 'API rate limit exceeded'
      });
    };
    
    // Act
    var result = CompanyResearchService.researchCompany('テスト企業');
    
    // Assert
    GasT.expect(result.success).toBeFalsy();
    GasT.expect(result.error).toContain('rate limit');
    
    // ログにエラーが記録されているか確認
    var logs = mockLogger.getLogs();
    var errorLogs = logs.filter(function(log) { return log.level === 'ERROR'; });
    GasT.expect(errorLogs.length).toBeGreaterThan(0);
  });
  
  GasT.it('should handle OpenAI extraction failure', function() {
    // Arrange
    mockTavilyClient.searchCompany = function() {
      return Promise.resolve({
        success: true,
        results: [{ title: 'Test', content: 'Content' }]
      });
    };
    
    mockOpenAIClient.extractCompanyInfo = function() {
      return Promise.resolve({
        success: false,
        error: 'Failed to extract information'
      });
    };
    
    // Act
    var result = CompanyResearchService.researchCompany('テスト企業');
    
    // Assert
    GasT.expect(result.success).toBeFalsy();
    GasT.expect(result.error).toContain('extract');
  });
  
  GasT.it('should research detailed company information', function() {
    // Arrange
    var company = TestDataFactory.createCompany();
    var additionalQueries = ['採用情報', '財務情報'];
    
    mockTavilyClient.searchCompanyDetails = function(name, query) {
      return Promise.resolve({
        success: true,
        results: [{
          title: name + ' - ' + query,
          content: query + 'に関する詳細情報'
        }]
      });
    };
    
    // Act
    var result = CompanyResearchService.researchDetailedInfo(company, additionalQueries);
    
    // Assert
    GasT.expect(result.success).toBeTruthy();
    GasT.expect(result.detailedInfo).toBeTruthy();
    GasT.expect(result.detailedInfo['採用情報']).toBeTruthy();
    GasT.expect(result.detailedInfo['財務情報']).toBeTruthy();
  });
  
  GasT.it('should update research statistics', function() {
    // Arrange
    CompanyResearchService.resetStats();
    
    // 成功するリサーチ
    mockTavilyClient.searchCompany = function() {
      return Promise.resolve({
        success: true,
        results: [{ title: 'Test', content: 'Content' }]
      });
    };
    
    // Act
    CompanyResearchService.researchCompany('成功企業1');
    CompanyResearchService.researchCompany('成功企業2');
    
    // 失敗するリサーチ
    mockTavilyClient.searchCompany = function() {
      return Promise.resolve({
        success: false,
        error: 'Error'
      });
    };
    
    CompanyResearchService.researchCompany('失敗企業');
    
    // Assert
    var stats = CompanyResearchService.getResearchStats();
    GasT.expect(stats.totalResearches).toBe(3);
    GasT.expect(stats.successful).toBe(2);
    GasT.expect(stats.failed).toBe(1);
    GasT.expect(stats.successRate).toBeGreaterThan(60);
    GasT.expect(stats.successRate).toBeLessThan(70);
  });
  
  GasT.it('should handle empty search results', function() {
    // Arrange
    mockTavilyClient.searchCompany = function() {
      return Promise.resolve({
        success: true,
        results: []
      });
    };
    
    // Act
    var result = CompanyResearchService.researchCompany('存在しない企業');
    
    // Assert
    GasT.expect(result.success).toBeFalsy();
    GasT.expect(result.error).toContain('見つかりません');
  });
  
  GasT.it('should handle timeout in API calls', function() {
    // Arrange
    mockTavilyClient.searchCompany = function() {
      // タイムアウトをシミュレート
      Utilities.sleep(100); // 短い遅延
      return Promise.resolve({
        success: false,
        error: 'Request timeout'
      });
    };
    
    // Act
    var result = CompanyResearchService.researchCompany('タイムアウト企業');
    
    // Assert
    GasT.expect(result.success).toBeFalsy();
    GasT.expect(result.error).toContain('timeout');
  });
});
} else {
  console.log('⚠️ GasTフレームワークが見つかりません。統合テストをスキップします。');
}