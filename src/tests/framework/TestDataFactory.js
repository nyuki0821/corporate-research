/**
 * @fileoverview Test Data Factory - テストデータ生成ユーティリティ
 * @author Corporate Research Team
 */

var TestDataFactory = (function() {
  
  /**
   * 企業データを生成
   */
  function createCompany(overrides) {
    var defaults = {
      id: 'TEST_COMP_' + Date.now(),
      companyName: 'テスト株式会社',
      phone: '03-' + Math.floor(Math.random() * 9000 + 1000) + '-' + Math.floor(Math.random() * 9000 + 1000),
      industryLarge: 'サービス業',
      industryMiddle: 'ITサービス',
      industrySmall: 'ソフトウェア開発',
      employees: Math.floor(Math.random() * 1000) + 50,
      establishedYear: 2000 + Math.floor(Math.random() * 24),
      capital: Math.floor(Math.random() * 100000000) + 1000000,
      revenue: Math.floor(Math.random() * 1000000000) + 10000000,
      representativeName: '山田太郎',
      representativeTitle: '代表取締役社長',
      headquarters: {
        postalCode: '100-0001',
        prefecture: '東京都',
        city: '千代田区',
        address: '千代田1-1-1',
        building: 'テストビル10F'
      },
      website: 'https://test-company.example.com',
      email: 'info@test-company.example.com',
      description: 'テスト用の企業説明文です。',
      businessSummary: 'ソフトウェア開発を主軸とした事業を展開しています。',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return Object.assign({}, defaults, overrides || {});
  }

  /**
   * 複数の企業データを生成
   */
  function createCompanies(count, overridesArray) {
    var companies = [];
    for (var i = 0; i < count; i++) {
      var overrides = overridesArray && overridesArray[i] ? overridesArray[i] : {};
      overrides.companyName = overrides.companyName || 'テスト企業' + (i + 1);
      companies.push(createCompany(overrides));
    }
    return companies;
  }

  /**
   * 支店データを生成
   */
  function createBranch(overrides) {
    var defaults = {
      id: 'BRANCH_' + Date.now(),
      branchName: 'テスト支店',
      branchType: '支店',
      postalCode: '530-0001',
      prefecture: '大阪府',
      city: '大阪市北区',
      address: '梅田1-1-1',
      building: 'テストビル5F',
      phone: '06-' + Math.floor(Math.random() * 9000 + 1000) + '-' + Math.floor(Math.random() * 9000 + 1000),
      fax: '06-' + Math.floor(Math.random() * 9000 + 1000) + '-' + Math.floor(Math.random() * 9000 + 1000),
      employees: Math.floor(Math.random() * 100) + 10,
      establishedDate: new Date(2010 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 12), 1)
    };
    
    return Object.assign({}, defaults, overrides || {});
  }

  /**
   * APIレスポンスデータを生成（Tavily）
   */
  function createTavilyResponse(overrides) {
    var defaults = {
      success: true,
      results: [
        {
          title: 'テスト企業 - 企業情報',
          url: 'https://example.com/company/test',
          content: 'テスト株式会社は、東京都千代田区に本社を置くIT企業です。従業員数は500名。',
          score: 0.95
        }
      ],
      query: 'テスト企業',
      response_time: 1.234
    };
    
    return Object.assign({}, defaults, overrides || {});
  }

  /**
   * APIレスポンスデータを生成（OpenAI）
   */
  function createOpenAIResponse(overrides) {
    var defaults = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              companyName: 'テスト株式会社',
              employees: 500,
              establishedYear: 2010,
              businessSummary: 'IT関連サービスの提供'
            })
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150
      }
    };
    
    return Object.assign({}, defaults, overrides || {});
  }

  /**
   * スプレッドシートのレンジデータを生成
   */
  function createRangeValues(rows, cols, fillValue) {
    var values = [];
    for (var i = 0; i < rows; i++) {
      var row = [];
      for (var j = 0; j < cols; j++) {
        if (fillValue !== undefined) {
          row.push(fillValue);
        } else {
          row.push('Cell_' + i + '_' + j);
        }
      }
      values.push(row);
    }
    return values;
  }

  /**
   * エラーレスポンスを生成
   */
  function createErrorResponse(type, message) {
    var errorTypes = {
      'NETWORK': { code: 'NETWORK_ERROR', message: message || 'ネットワークエラーが発生しました' },
      'TIMEOUT': { code: 'TIMEOUT_ERROR', message: message || 'タイムアウトしました' },
      'API': { code: 'API_ERROR', message: message || 'APIエラーが発生しました' },
      'VALIDATION': { code: 'VALIDATION_ERROR', message: message || '検証エラーが発生しました' },
      'NOT_FOUND': { code: 'NOT_FOUND', message: message || 'リソースが見つかりません' }
    };
    
    var error = errorTypes[type] || errorTypes['API'];
    return {
      success: false,
      error: error,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 設定データを生成
   */
  function createConfig(overrides) {
    var defaults = {
      TAVILY_API_KEY: 'test_tavily_key_' + Date.now(),
      OPENAI_API_KEY: 'test_openai_key_' + Date.now(),
      NOTIFICATION_EMAIL: 'test@example.com',
      BATCH_SIZE: 10,
      API_TIMEOUT: 30000,
      RETRY_COUNT: 3,
      RETRY_DELAY: 1000,
      LOG_LEVEL: 'INFO',
      ENABLE_CACHE: true,
      CACHE_DURATION: 3600000
    };
    
    return Object.assign({}, defaults, overrides || {});
  }

  /**
   * ランダムな日本語文字列を生成
   */
  function generateJapaneseText(length) {
    var chars = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
    var result = '';
    for (var i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * ランダムな電話番号を生成
   */
  function generatePhoneNumber(prefix) {
    prefix = prefix || '03';
    return prefix + '-' + 
           Math.floor(Math.random() * 9000 + 1000) + '-' + 
           Math.floor(Math.random() * 9000 + 1000);
  }

  /**
   * ランダムな郵便番号を生成
   */
  function generatePostalCode() {
    return Math.floor(Math.random() * 900 + 100) + '-' + 
           Math.floor(Math.random() * 9000 + 1000);
  }

  // Public API
  return {
    createCompany: createCompany,
    createCompanies: createCompanies,
    createBranch: createBranch,
    createTavilyResponse: createTavilyResponse,
    createOpenAIResponse: createOpenAIResponse,
    createRangeValues: createRangeValues,
    createErrorResponse: createErrorResponse,
    createConfig: createConfig,
    generateJapaneseText: generateJapaneseText,
    generatePhoneNumber: generatePhoneNumber,
    generatePostalCode: generatePostalCode
  };
})(); 