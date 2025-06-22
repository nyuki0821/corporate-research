/**
 * @fileoverview Company Model Unit Tests
 * @author Corporate Research Team
 */

// GasTフレームワークが利用可能かチェック
if (typeof GasT !== 'undefined') {
  GasT.describe('Company Model Unit Tests', function() {
  
  GasT.it('should create company with default values', function() {
    // Arrange
    var data = {
      companyName: 'テスト株式会社'
    };
    
    // Act
    var company = new Company(data);
    
    // Assert
    GasT.expect(company.companyName).toBe('テスト株式会社');
    GasT.expect(company.status).toBe('未処理');
    GasT.expect(company.id).toBeTruthy();
  });
  
  GasT.it('should create company with all properties', function() {
    // Arrange
    var testData = TestDataFactory.createCompany();
    
    // Act
    var company = new Company(testData);
    
    // Assert
    GasT.expect(company.companyName).toBe(testData.companyName);
    GasT.expect(company.phone).toBe(testData.phone);
    GasT.expect(company.employees).toBe(testData.employees);
    GasT.expect(company.establishedYear).toBe(testData.establishedYear);
  });
  
  GasT.it('should validate required fields', function() {
    // Arrange
    var company = new Company({});
    
    // Act
    var validation = company.validate();
    
    // Assert
    GasT.expect(validation.isValid).toBeFalsy();
    GasT.expect(validation.missingFields).toContain('companyName');
  });
  
  GasT.it('should validate company with all required fields', function() {
    // Arrange
    var company = new Company({
      companyName: 'テスト企業'
    });
    
    // Act
    var validation = company.validate();
    
    // Assert
    GasT.expect(validation.isValid).toBeTruthy();
    GasT.expect(validation.missingFields.length).toBe(0);
  });
  
  GasT.it('should calculate completion percentage correctly', function() {
    // Arrange
    var company1 = new Company({ companyName: 'テスト1' });
    var company2 = new Company({
      companyName: 'テスト2',
      phone: '03-1234-5678',
      employees: 100,
      establishedYear: 2000,
      capital: 10000000
    });
    
    // Act
    var completion1 = company1.getCompletionPercentage();
    var completion2 = company2.getCompletionPercentage();
    
    // Assert
    GasT.expect(completion1).toBeLessThan(completion2);
    GasT.expect(completion2).toBeGreaterThan(50);
  });
  
  GasT.it('should get display name correctly', function() {
    // Arrange
    var company1 = new Company({ companyName: 'テスト企業' });
    var company2 = new Company({ companyName: 'テスト企業', id: 'COMP123' });
    
    // Act
    var displayName1 = company1.getDisplayName();
    var displayName2 = company2.getDisplayName();
    
    // Assert
    GasT.expect(displayName1).toBe('テスト企業');
    GasT.expect(displayName2).toBe('テスト企業 (COMP123)');
  });
  
  GasT.it('should check if has complete basic info', function() {
    // Arrange
    var incompleteCompany = new Company({
      companyName: 'テスト企業',
      phone: '03-1234-5678'
    });
    
    var completeCompany = new Company({
      companyName: 'テスト企業',
      phone: '03-1234-5678',
      employees: 100,
      establishedYear: 2000,
      capital: 10000000,
      revenue: 50000000
    });
    
    // Act & Assert
    GasT.expect(incompleteCompany.hasCompleteBasicInfo()).toBeFalsy();
    GasT.expect(completeCompany.hasCompleteBasicInfo()).toBeTruthy();
  });
  
  GasT.it('should convert to headquarters spreadsheet row', function() {
    // Arrange
    var company = new Company({
      companyName: 'テスト株式会社',
      phone: '03-1234-5678',
      industryLarge: 'サービス業',
      employees: 500,
      establishedYear: 2010,
      headquarters: {
        prefecture: '東京都',
        city: '千代田区'
      }
    });
    
    // Act
    var row = company.toHeadquartersSpreadsheetRow();
    
    // Assert
    GasT.expect(row[0]).toBe('テスト株式会社'); // 企業名
    GasT.expect(row[1]).toBe('03-1234-5678'); // 電話番号
    GasT.expect(row[5]).toBe('サービス業'); // 業種大分類
    GasT.expect(row[8]).toBe(500); // 従業員数
    GasT.expect(row[9]).toBe(2010); // 設立年
    GasT.expect(row[13]).toBe('東京都'); // 都道府県
    GasT.expect(row[14]).toBe('千代田区'); // 市区町村
  });
  
  GasT.it('should handle missing headquarters data', function() {
    // Arrange
    var company = new Company({
      companyName: 'テスト企業'
    });
    
    // Act
    var row = company.toHeadquartersSpreadsheetRow();
    
    // Assert
    GasT.expect(row[0]).toBe('テスト企業');
    GasT.expect(row[13]).toBe(''); // 都道府県（空文字）
    GasT.expect(row[14]).toBe(''); // 市区町村（空文字）
  });
  
  GasT.it('should update properties correctly', function() {
    // Arrange
    var company = new Company({
      companyName: '旧名称'
    });
    
    // Act
    company.companyName = '新名称';
    company.employees = 1000;
    
    // Assert
    GasT.expect(company.companyName).toBe('新名称');
    GasT.expect(company.employees).toBe(1000);
  });
  
  GasT.it('should handle invalid data types', function() {
    // Arrange & Act
    var company = new Company({
      companyName: 'テスト企業',
      employees: '文字列', // 数値であるべき
      establishedYear: '二千年' // 数値であるべき
    });
    
    // Assert
    GasT.expect(company.employees).toBe('文字列');
    GasT.expect(company.establishedYear).toBe('二千年');
    // バリデーションで検出されるべき
    var validation = company.validate();
    GasT.expect(validation.warnings.length).toBeGreaterThan(0);
  });
});
} else {
  console.log('⚠️ GasTフレームワークが見つかりません。Companyテストをスキップします。');
}