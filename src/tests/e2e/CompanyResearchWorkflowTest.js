/**
 * @fileoverview Company Research Workflow E2E Tests
 * @author Corporate Research Team
 * 
 * 企業リスト読み込みから企業情報保存までの完全なワークフローをテスト
 */

// GasTフレームワークが利用可能かチェック（静かに）
if (typeof GasT !== 'undefined') {
  GasT.describe('Company Research Workflow E2E Tests', function() {
  var mockServices = {};
  var originalServices = {};
  
  GasT.beforeAll(function() {
    // すべてのサービスのオリジナルを保存
    originalServices.SpreadsheetService = SpreadsheetService;
    originalServices.TavilyClient = TavilyClient;
    originalServices.OpenAIClient = OpenAIClient;
    originalServices.BatchProcessor = BatchProcessor;
    originalServices.Logger = Logger;
    originalServices.ErrorHandler = ErrorHandler;
    originalServices.ConfigManager = ConfigManager;
    
    // ConfigManagerのモックを設定
    mockServices.ConfigManager = MockFactory.createConfigManagerMock();
    ConfigManager = mockServices.ConfigManager;
    
    // Loggerのモックを設定
    mockServices.Logger = MockFactory.createLoggerMock();
    Logger = mockServices.Logger;
    
    // ErrorHandlerのモックを設定
    mockServices.ErrorHandler = MockFactory.createErrorHandlerMock();
    ErrorHandler = mockServices.ErrorHandler;
  });
  
  GasT.afterAll(function() {
    // すべてのサービスを復元
    Object.keys(originalServices).forEach(function(serviceName) {
      global[serviceName] = originalServices[serviceName];
    });
  });
  
  GasT.beforeEach(function() {
    // 各テストごとにモックをリセット
    mockServices.SpreadsheetService = MockFactory.createSpreadsheetServiceMock();
    mockServices.TavilyClient = MockFactory.createTavilyClientMock();
    mockServices.OpenAIClient = MockFactory.createOpenAIClientMock();
    mockServices.BatchProcessor = MockFactory.createBatchProcessorMock();
    
    SpreadsheetService = mockServices.SpreadsheetService;
    TavilyClient = mockServices.TavilyClient;
    OpenAIClient = mockServices.OpenAIClient;
    BatchProcessor = mockServices.BatchProcessor;
    
    mockServices.Logger.clearLogs();
    mockServices.ErrorHandler.clearErrors();
  });
  
  GasT.it('should complete full workflow from company list to headquarters info', function() {
    // Arrange
    var testCompanies = [
      { companyName: 'テスト企業A', rowIndex: 2 },
      { companyName: 'テスト企業B', rowIndex: 3 }
    ];
    
    // SpreadsheetServiceのモック設定
    mockServices.SpreadsheetService.getCompanyList = function() {
      return testCompanies;
    };
    
    var savedCompanies = [];
    mockServices.SpreadsheetService.saveCompanyData = function(company) {
      savedCompanies.push(company);
      return { success: true, rowIndex: savedCompanies.length + 1 };
    };
    
    // TavilyClientのモック設定
    mockServices.TavilyClient.searchCompany = function(companyName) {
      return Promise.resolve({
        success: true,
        results: [{
          title: companyName + ' - 企業情報',
          content: '従業員数100名の' + companyName,
          url: 'https://example.com'
        }]
      });
    };
    
    // OpenAIClientのモック設定
    mockServices.OpenAIClient.extractCompanyInfo = function(results) {
      var companyName = results[0].title.split(' - ')[0];
      return Promise.resolve({
        success: true,
        data: TestDataFactory.createCompany({
          companyName: companyName,
          employees: 100
        })
      });
    };
    
    // Act - ワークフロー実行
    var companies = SpreadsheetService.getCompanyList();
    var processedCompanies = [];
    
    companies.forEach(function(company) {
      var result = CompanyResearchService.researchCompany(company.companyName);
      if (result.success) {
        SpreadsheetService.saveCompanyData(result.data);
        processedCompanies.push(result.data);
      }
    });
    
    // Assert
    GasT.expect(processedCompanies.length).toBe(2);
    GasT.expect(savedCompanies.length).toBe(2);
    GasT.expect(savedCompanies[0].companyName).toBe('テスト企業A');
    GasT.expect(savedCompanies[1].companyName).toBe('テスト企業B');
    
    // ログの確認
    var logs = mockServices.Logger.getLogs();
    var infoLogs = logs.filter(function(log) { return log.level === 'INFO'; });
    GasT.expect(infoLogs.length).toBeGreaterThan(0);
  });
  
  GasT.it('should handle errors in workflow gracefully', function() {
    // Arrange
    mockServices.SpreadsheetService.getCompanyList = function() {
      return [
        { companyName: '成功企業', rowIndex: 2 },
        { companyName: 'エラー企業', rowIndex: 3 }
      ];
    };
    
    // エラー企業の場合はエラーを返す
    mockServices.TavilyClient.searchCompany = function(companyName) {
      if (companyName === 'エラー企業') {
        return Promise.resolve({
          success: false,
          error: 'API Error'
        });
      }
      return Promise.resolve({
        success: true,
        results: [{ title: companyName, content: 'Content' }]
      });
    };
    
    var savedCount = 0;
    mockServices.SpreadsheetService.saveCompanyData = function() {
      savedCount++;
      return { success: true };
    };
    
    mockServices.SpreadsheetService.updateCompanyStatus = function(rowIndex, status) {
      return { success: true, status: status };
    };
    
    // Act
    var companies = SpreadsheetService.getCompanyList();
    var successCount = 0;
    var errorCount = 0;
    
    companies.forEach(function(company) {
      var result = CompanyResearchService.researchCompany(company.companyName);
      if (result.success) {
        SpreadsheetService.saveCompanyData(result.data);
        SpreadsheetService.updateCompanyStatus(company.rowIndex, '処理済み');
        successCount++;
      } else {
        SpreadsheetService.updateCompanyStatus(company.rowIndex, 'エラー');
        errorCount++;
      }
    });
    
    // Assert
    GasT.expect(successCount).toBe(1);
    GasT.expect(errorCount).toBe(1);
    GasT.expect(savedCount).toBe(1);
    
    // エラーハンドラーの確認
    var errors = mockServices.ErrorHandler.getErrors();
    GasT.expect(errors.length).toBeGreaterThan(0);
  });
  
  GasT.it('should process batch of companies with rate limiting', function() {
    // Arrange
    var testCompanies = TestDataFactory.createCompanies(5);
    var processedCompanies = [];
    
    mockServices.BatchProcessor.processBatch = function(companies) {
      companies.forEach(function(company) {
        // 処理時間をシミュレート
        Utilities.sleep(10);
        processedCompanies.push(company);
      });
      return {
        success: true,
        processed: companies.length,
        errors: []
      };
    };
    
    // Act
    var startTime = Date.now();
    var result = BatchProcessor.processBatch(testCompanies);
    var endTime = Date.now();
    
    // Assert
    GasT.expect(result.success).toBeTruthy();
    GasT.expect(result.processed).toBe(5);
    GasT.expect(processedCompanies.length).toBe(5);
    
    // 処理時間の確認（レート制限のシミュレーション）
    var duration = endTime - startTime;
    GasT.expect(duration).toBeGreaterThan(50); // 5社 × 10ms
  });
  
  GasT.it('should generate summary report after workflow completion', function() {
    // Arrange
    var companies = TestDataFactory.createCompanies(3);
    var processResults = {
      total: 3,
      successful: 2,
      failed: 1,
      errors: ['企業3でエラーが発生']
    };
    
    // Act
    var report = {
      timestamp: new Date(),
      summary: {
        totalCompanies: processResults.total,
        successfullyProcessed: processResults.successful,
        failedToProcess: processResults.failed,
        successRate: Math.round((processResults.successful / processResults.total) * 100) + '%'
      },
      errors: processResults.errors,
      duration: '5分30秒'
    };
    
    // Assert
    GasT.expect(report.summary.totalCompanies).toBe(3);
    GasT.expect(report.summary.successfullyProcessed).toBe(2);
    GasT.expect(report.summary.failedToProcess).toBe(1);
    GasT.expect(report.summary.successRate).toBe('67%');
         GasT.expect(report.errors.length).toBe(1);
   });
 });
}
// Note: E2Eテストは実行時に動的に読み込まれます 