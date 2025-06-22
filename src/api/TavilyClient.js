/**
 * @fileoverview Tavily AI API client for the Corporate Research System
 * @author Corporate Research Team
 * 
 * 依存モジュール:
 * - Logger (src/core/Logger.js)
 * - ConfigManager (src/core/ConfigManager.js)
 * - ErrorHandler (src/core/ErrorHandler.js)
 * - ApiBase (src/api/ApiBase.js)
 */

var TavilyClient = (function() {
  // Private variables
  var _baseUrl = 'https://api.tavily.com';
  var _apiKey = null;

  // Private functions
  /**
   * Get API key
   * @private
   */
  function getApiKey() {
    if (!_apiKey) {
      _apiKey = ConfigManager.get('TAVILY_API_KEY');
      if (!_apiKey) {
        throw new Error('Tavily API key not configured');
      }
    }
    return _apiKey;
  }

  /**
   * Build search options
   * @private
   */
  function buildSearchOptions(options) {
    var defaults = {
      search_depth: 'advanced',
      include_answer: true,
      include_images: false,
      include_raw_content: false,
      max_results: ConfigManager.getNumber('MAX_SEARCH_RESULTS', 10),
      include_domains: [],
      exclude_domains: []
    };

    // Merge with provided options
    var searchOptions = Object.assign({}, defaults);
    if (options) {
      Object.keys(options).forEach(function(key) {
        if (options[key] !== undefined) {
          searchOptions[key] = options[key];
        }
      });
    }

    return searchOptions;
  }

  /**
   * Format search results
   * @private
   */
  function formatSearchResults(response) {
    if (!response || !response.results) {
      return {
        success: false,
        error: 'Invalid response format',
        results: []
      };
    }

    var formattedResults = response.results.map(function(result) {
      return {
        title: result.title || '',
        url: result.url || '',
        content: result.content || '',
        score: result.score || 0,
        published_date: result.published_date || null
      };
    });

    return {
      success: true,
      query: response.query || '',
      answer: response.answer || '',
      results: formattedResults,
      response_time: response.response_time || 0
    };
  }

  // Public functions
  /**
   * Search for company information
   */
  function searchCompany(companyName, options) {
    try {
      var apiKey = getApiKey();
      var searchOptions = buildSearchOptions(options);
      
      // Build search query for company
      var query = companyName + ' 会社 企業情報 本社 設立 資本金 従業員数';
      if (options && options.additionalTerms) {
        query += ' ' + options.additionalTerms;
      }

      Logger.logDebug('Searching company with Tavily: ' + companyName);

      var requestPayload = Object.assign({
        api_key: apiKey,
        query: query
      }, searchOptions);

      var requestOptions = {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: ConfigManager.getNumber('SEARCH_TIMEOUT_MS', 30000),
        useCache: true,
        cacheExpiration: Constants.CACHE_CONFIG.DURATION.LONG
      };

      var response = ApiBase.post(_baseUrl + '/search', requestPayload, requestOptions);
      var formatted = formatSearchResults(response);
      
      if (formatted.success) {
        Logger.logInfo('Tavily search completed for: ' + companyName, {
          resultCount: formatted.results.length,
          responseTime: formatted.response_time
        });
      } else {
        Logger.logWarning('Tavily search failed for: ' + companyName, {
          error: formatted.error
        });
      }
      
      return formatted;

    } catch (error) {
      Logger.logError('Tavily API error for company: ' + companyName, error);
      ErrorHandler.handleError(error, {
        function: 'searchCompany',
        companyName: companyName,
        apiService: 'Tavily'
      });
      
      throw error;
    }
  }

  /**
   * Search for specific company information
   */
  function searchCompanyDetails(companyName, searchType) {
    var searchQueries = {
      'financial': companyName + ' 財務情報 売上 利益 決算',
      'news': companyName + ' 最新ニュース 発表 プレスリリース',
      'recruitment': companyName + ' 採用情報 新卒採用 中途採用',
      'branches': companyName + ' 支店 営業所 店舗 拠点',
      'corporate': companyName + ' 企業理念 経営方針 代表者'
    };

    var query = searchQueries[searchType] || searchQueries['corporate'];
    
    try {
      var apiKey = getApiKey();
      
      Logger.logDebug('Searching company details with Tavily: ' + companyName + ' (' + searchType + ')');

      var requestPayload = {
        api_key: apiKey,
        query: query,
        search_depth: 'advanced',
        include_answer: true,
        max_results: 5
      };

      var requestOptions = {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: ConfigManager.getNumber('SEARCH_TIMEOUT_MS', 30000),
        useCache: true,
        cacheExpiration: Constants.CACHE_CONFIG.DURATION.MEDIUM
      };

      var response = ApiBase.post(_baseUrl + '/search', requestPayload, requestOptions);
      var formatted = formatSearchResults(response);
      return formatted;

    } catch (error) {
      Logger.logError('Exception in Tavily searchCompanyDetails', error);
      throw error;
    }
  }

  /**
   * Search for company by phone number
   */
  function searchByPhoneNumber(phoneNumber) {
    try {
      if (!phoneNumber || phoneNumber.trim() === '') {
        return {
          success: false,
          error: 'Phone number not provided',
          results: []
        };
      }

      var query = phoneNumber + ' 会社 企業 法人';
      var apiKey = getApiKey();
      
      Logger.logDebug('Searching by phone number with Tavily: ' + phoneNumber);

      var requestPayload = {
        api_key: apiKey,
        query: query,
        search_depth: 'basic',
        include_answer: true,
        max_results: 5
      };

      var requestOptions = {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: ConfigManager.getNumber('SEARCH_TIMEOUT_MS', 30000),
        useCache: true,
        cacheExpiration: Constants.CACHE_CONFIG.DURATION.LONG
      };

      var response = ApiBase.post(_baseUrl + '/search', requestPayload, requestOptions);
      var formatted = formatSearchResults(response);
      return formatted;

    } catch (error) {
      Logger.logError('Exception in Tavily searchByPhoneNumber', error);
      throw error;
    }
  }

  /**
   * Get API usage statistics
   */
  function getApiStats() {
    var baseStats = ApiBase.getStats();
    return {
      totalRequests: baseStats.requestCount,
      lastRequestTime: baseStats.lastRequestTime,
      apiProvider: 'Tavily',
      baseUrl: _baseUrl
    };
  }

  /**
   * Test API connection
   */
  function testConnection() {
    try {
      var apiKey = getApiKey();
      
      Logger.logInfo('Testing Tavily API connection');

      var requestPayload = {
        api_key: apiKey,
        query: 'test',
        max_results: 1
      };

      var requestOptions = {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000,
        useCache: false
      };

      var response = ApiBase.post(_baseUrl + '/search', requestPayload, requestOptions);
      Logger.logInfo('Tavily API connection test successful');
      return {
        success: true,
        message: 'API connection successful',
        provider: 'Tavily'
      };

    } catch (error) {
      Logger.logError('Tavily API connection test failed', error);
      return {
        success: false,
        error: error.message,
        provider: 'Tavily'
      };
    }
  }

  // Return public API
  return {
    searchCompany: searchCompany,
    searchCompanyDetails: searchCompanyDetails,
    searchByPhoneNumber: searchByPhoneNumber,
    getApiStats: getApiStats,
    testConnection: testConnection
  };
})();