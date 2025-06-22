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
   * Extract potential domain from company name
   * @private
   */
  function extractDomainFromCompanyName(companyName) {
    // Remove common company suffixes and convert to potential domain
    var cleanName = companyName
      .replace(/株式会社|有限会社|合同会社|合資会社|一般社団法人|公益社団法人/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();
    
    // Try common domain patterns
    var possibleDomains = [
      cleanName + '.co.jp',
      cleanName + '.com',
      cleanName + '.jp'
    ];
    
    return possibleDomains[0]; // Return the most likely domain
  }

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
      include_raw_content: true,
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
      // Combine content and raw_content for more comprehensive information
      var combinedContent = result.content || '';
      if (result.raw_content && result.raw_content !== result.content) {
        combinedContent += '\n\n--- Raw Content ---\n' + result.raw_content;
      }
      
      return {
        title: result.title || '',
        url: result.url || '',
        content: combinedContent,
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
      var query = companyName + ' 会社概要 企業情報 本社 設立 資本金 従業員数 代表取締役 電話番号 企業理念 -求人 -転職 -採用 -doda -mynavi';
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
    searchByPhoneNumber: searchByPhoneNumber,
    getApiStats: getApiStats,
    testConnection: testConnection
  };
})();