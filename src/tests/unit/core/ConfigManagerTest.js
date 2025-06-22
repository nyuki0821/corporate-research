/**
 * @fileoverview ConfigManager Unit Tests
 * @author Corporate Research Team
 */

// GasTフレームワークが利用可能かチェック
if (typeof GasT !== 'undefined') {
  GasT.describe('ConfigManager Unit Tests', function() {
  var originalPropertiesService;
  var mockPropertiesService;
  
  GasT.beforeAll(function() {
    // PropertiesServiceをモックに置き換え
    originalPropertiesService = PropertiesService;
    mockPropertiesService = MockFactory.createPropertiesServiceMock();
    PropertiesService = mockPropertiesService;
  });
  
  GasT.afterAll(function() {
    // オリジナルのPropertiesServiceを復元
    PropertiesService = originalPropertiesService;
  });
  
  GasT.beforeEach(function() {
    // 各テストの前にプロパティをクリア
    var scriptProps = mockPropertiesService.getScriptProperties();
    var props = scriptProps.getProperties();
    Object.keys(props).forEach(function(key) {
      scriptProps.deleteProperty(key);
    });
  });
  
  GasT.it('should get property value', function() {
    // Arrange
    var testKey = 'TEST_KEY';
    var testValue = 'test_value';
    mockPropertiesService.getScriptProperties().setProperty(testKey, testValue);
    
    // Act
    var result = ConfigManager.get(testKey);
    
    // Assert
    GasT.expect(result).toBe(testValue);
  });
  
  GasT.it('should return null for non-existent property', function() {
    // Act
    var result = ConfigManager.get('NON_EXISTENT_KEY');
    
    // Assert
    GasT.expect(result).toBe(null);
  });
  
  GasT.it('should set property value', function() {
    // Arrange
    var testKey = 'NEW_TEST_KEY';
    var testValue = 'new_test_value';
    
    // Act
    ConfigManager.set(testKey, testValue);
    
    // Assert
    var storedValue = mockPropertiesService.getScriptProperties().getProperty(testKey);
    GasT.expect(storedValue).toBe(testValue);
  });
  
  GasT.it('should get all properties', function() {
    // Arrange
    var testProps = {
      KEY1: 'value1',
      KEY2: 'value2',
      KEY3: 'value3'
    };
    mockPropertiesService.getScriptProperties().setProperties(testProps);
    
    // Act
    var result = ConfigManager.getAll();
    
    // Assert
    GasT.expect(result.KEY1).toBe('value1');
    GasT.expect(result.KEY2).toBe('value2');
    GasT.expect(result.KEY3).toBe('value3');
  });
  
  GasT.it('should validate required API keys', function() {
    // Arrange - APIキーが設定されていない状態
    
    // Act
    var validation = ConfigManager.validate();
    
    // Assert
    GasT.expect(validation.isValid).toBeFalsy();
    GasT.expect(validation.errors.length).toBeGreaterThan(0);
  });
  
  GasT.it('should pass validation with all required keys', function() {
    // Arrange
    mockPropertiesService.getScriptProperties().setProperties({
      TAVILY_API_KEY: 'test_tavily_key',
      OPENAI_API_KEY: 'test_openai_key'
    });
    
    // Act
    var validation = ConfigManager.validate();
    
    // Assert
    GasT.expect(validation.isValid).toBeTruthy();
    GasT.expect(validation.errors.length).toBe(0);
  });
  
  GasT.it('should delete property', function() {
    // Arrange
    var testKey = 'DELETE_TEST_KEY';
    var testValue = 'delete_test_value';
    mockPropertiesService.getScriptProperties().setProperty(testKey, testValue);
    
    // Act
    ConfigManager.deleteProperty(testKey);
    
    // Assert
    var result = mockPropertiesService.getScriptProperties().getProperty(testKey);
    GasT.expect(result).toBe(null);
  });
  
  GasT.it('should handle numeric values', function() {
    // Arrange
    var testKey = 'NUMERIC_KEY';
    var testValue = 12345;
    
    // Act
    ConfigManager.set(testKey, testValue);
    var result = ConfigManager.get(testKey);
    
    // Assert
    GasT.expect(result).toBe('12345'); // PropertiesServiceは文字列として保存
  });
  
  GasT.it('should handle boolean values', function() {
    // Arrange
    var testKey = 'BOOLEAN_KEY';
    var testValue = true;
    
    // Act
    ConfigManager.set(testKey, testValue);
    var result = ConfigManager.get(testKey);
    
    // Assert
    GasT.expect(result).toBe('true'); // PropertiesServiceは文字列として保存
  });
  
  GasT.it('should handle empty string values', function() {
    // Arrange
    var testKey = 'EMPTY_KEY';
    var testValue = '';
    
    // Act
    ConfigManager.set(testKey, testValue);
    var result = ConfigManager.get(testKey);
    
    // Assert
         GasT.expect(result).toBe('');
   });
 });
} else {
  console.log('⚠️ GasTフレームワークが見つかりません。ConfigManagerテストをスキップします。');
} 