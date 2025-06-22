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
      
      // 電話番号がある場合は、それを活用した精密検索
      var phoneNumber = options && options.phoneNumber ? options.phoneNumber : '';
      
      // 検索クエリの構築（公式サイト最優先）
      var queries = [];
      
      // 1. 公式サイト専用検索（最優先）
      queries.push(companyName + ' 公式サイト ホームページ official site -求人 -転職 -採用');
      
      // 2. 企業名と電話番号の組み合わせ（最も精密）
      if (phoneNumber) {
        queries.push(companyName + ' ' + phoneNumber + ' 会社概要 企業情報 -求人 -転職');
      }
      
      // 3. 企業名と基本情報キーワード
      queries.push(companyName + ' 会社概要 企業情報 本社 設立 資本金 従業員数 代表取締役 -求人 -転職');
      
      // 4. 企業名と所在地情報
      queries.push(companyName + ' 本社所在地 住所 アクセス 連絡先 -求人 -転職');

      Logger.logDebug('Executing official-site-priority search for: ' + companyName, {
        phoneNumber: phoneNumber,
        queryCount: queries.length,
        strategy: 'official-site-first'
      });

      var allResults = [];
      var totalResponseTime = 0;
      var officialSiteFound = false;
      var officialSiteUrl = '';

      // 各クエリを実行（公式サイト優先戦略）
      for (var i = 0; i < queries.length; i++) {
        try {
          var requestPayload = Object.assign({
            api_key: apiKey,
            query: queries[i],
            search_depth: 'advanced',
            max_results: i === 0 ? 8 : 6, // 公式サイト検索は多めに取得
            include_domains: [], // 信頼できるドメインがあれば追加
            exclude_domains: ['doda.jp', 'mynavi.jp', 'rikunabi.com', 'indeed.com', 'careercross.com'] // 求人サイトを除外
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
          
          if (formatted.success && formatted.results) {
            // 結果を処理
            formatted.results.forEach(function(result) {
              // 重複チェック
              var isDuplicate = allResults.some(function(existing) {
                return existing.url === result.url;
              });
              
              if (!isDuplicate) {
                // 公式サイトかどうかをより厳密にチェック
                var isOfficial = false;
                var companyNameClean = companyName.toLowerCase().replace(/株式会社|有限会社|合同会社|合資会社/g, '').trim();
                
                if (result.url && result.title) {
                  var urlLower = result.url.toLowerCase();
                  var titleLower = result.title.toLowerCase();
                  
                  // 公式サイト判定条件を強化
                  isOfficial = (
                    // URLに企業名が含まれる（.co.jp, .com, .jpドメイン）
                    (urlLower.includes(companyNameClean) && (urlLower.includes('.co.jp') || urlLower.includes('.com') || urlLower.includes('.jp'))) ||
                    // タイトルに「公式」「official」「ホームページ」が含まれる
                    titleLower.includes('公式') ||
                    titleLower.includes('official') ||
                    titleLower.includes('ホームページ') ||
                    // 企業の.co.jpドメインで会社概要ページ
                    (urlLower.includes('.co.jp') && (urlLower.includes('company') || urlLower.includes('about') || urlLower.includes('profile')))
                  );
                }
                
                if (isOfficial) {
                  officialSiteFound = true;
                  officialSiteUrl = result.url;
                  result.isOfficial = true;
                  result.priority = 1; // 最高優先度
                  Logger.logInfo('Official site found: ' + result.url + ' for ' + companyName);
                } else {
                  result.priority = i === 0 ? 2 : 3; // 公式サイト検索からの結果は優先度高め
                }
                
                // ソースURL情報を明確に記録
                result.sourceType = i === 0 ? 'official-search' : 'general-search';
                result.queryIndex = i;
                result.searchQuery = queries[i];
                
                allResults.push(result);
              }
            });
            
            totalResponseTime += formatted.response_time || 0;
          }
          
          // 公式サイトが見つかった場合の早期終了戦略
          if (officialSiteFound && i === 0) {
            // 公式サイト検索で見つかった場合、基本情報検索のみ追加実行
            Logger.logInfo('Official site found in first search, executing one more targeted search');
            i = 1; // 次の検索（電話番号 or 基本情報）のみ実行
            if (!phoneNumber) {
              i = 2; // 電話番号がない場合は基本情報検索へ
            }
          } else if (officialSiteFound && i >= 2) {
            // 2回目以降で公式サイトが見つかった場合は終了
            Logger.logInfo('Official site found, terminating remaining searches for efficiency');
            break;
          }
          
          // レート制限対策
          if (i < queries.length - 1) {
            Utilities.sleep(300); // 少し短縮
          }
        } catch (queryError) {
          Logger.logWarning('Search query failed: ' + queries[i], queryError);
        }
      }

      // 結果を優先度と信頼性順にソート
      allResults.sort(function(a, b) {
        // 1. 公式サイトを最優先
        if (a.isOfficial && !b.isOfficial) return -1;
        if (!a.isOfficial && b.isOfficial) return 1;
        
        // 2. 優先度順
        if (a.priority !== b.priority) return a.priority - b.priority;
        
        // 3. 検索クエリのインデックス順
        return a.queryIndex - b.queryIndex;
      });

      var result = {
        success: true,
        query: queries[0],
        results: allResults,
        response_time: totalResponseTime,
        officialSiteFound: officialSiteFound,
        officialSiteUrl: officialSiteUrl,
        searchStrategy: 'official-site-priority'
      };
      
      Logger.logInfo('Official-site-priority search completed for: ' + companyName, {
        resultCount: result.results.length,
        responseTime: result.response_time,
        officialSiteFound: officialSiteFound,
        officialSiteUrl: officialSiteUrl,
        queriesExecuted: i + 1,
        strategy: 'official-site-first'
      });
      
      return result;

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
   * Search for latest news about the company
   */
  function searchLatestNews(companyName, options) {
    try {
      var apiKey = getApiKey();
      
      // ニュース専用の検索クエリ
      var queries = [
        companyName + ' 最新ニュース プレスリリース 発表 ' + new Date().getFullYear(),
        companyName + ' 新サービス 新製品 業績 決算発表',
        companyName + ' 提携 買収 M&A 出資'
      ];

      Logger.logDebug('Searching latest news for: ' + companyName, {
        queryCount: queries.length
      });

      var allResults = [];
      var totalResponseTime = 0;

      // 各クエリを実行
      for (var i = 0; i < queries.length; i++) {
        try {
          var requestPayload = {
            api_key: apiKey,
            query: queries[i],
            search_depth: 'advanced',
            max_results: 5,
            include_answer: false,
            include_raw_content: true,
            // 信頼できるニュースソースを優先
            include_domains: [],
            exclude_domains: ['doda.jp', 'mynavi.jp', 'rikunabi.com'] // 求人サイトを除外
          };

          var requestOptions = {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: ConfigManager.getNumber('SEARCH_TIMEOUT_MS', 30000),
            useCache: true,
            cacheExpiration: Constants.CACHE_CONFIG.DURATION.SHORT // ニュースは短めのキャッシュ
          };

          var response = ApiBase.post(_baseUrl + '/search', requestPayload, requestOptions);
          var formatted = formatSearchResults(response);
          
          if (formatted.success && formatted.results) {
            formatted.results.forEach(function(result) {
              // 重複チェック
              var isDuplicate = allResults.some(function(existing) {
                return existing.url === result.url;
              });
              
              if (!isDuplicate) {
                // ニュースの日付情報を保持
                result.category = 'news';
                allResults.push(result);
              }
            });
            
            totalResponseTime += formatted.response_time || 0;
          }
          
          // レート制限対策
          if (i < queries.length - 1) {
            Utilities.sleep(300);
          }
        } catch (queryError) {
          Logger.logWarning('News search query failed: ' + queries[i], queryError);
        }
      }

      // 日付順にソート（新しいものから）
      allResults.sort(function(a, b) {
        if (a.published_date && b.published_date) {
          return new Date(b.published_date) - new Date(a.published_date);
        }
        return 0;
      });

      var result = {
        success: true,
        category: 'news',
        results: allResults.slice(0, 10), // 最大10件に制限
        response_time: totalResponseTime
      };
      
      Logger.logInfo('News search completed for: ' + companyName, {
        resultCount: result.results.length,
        responseTime: result.response_time
      });
      
      return result;

    } catch (error) {
      Logger.logError('News search error for company: ' + companyName, error);
      throw error;
    }
  }

  /**
   * Search for recruitment information about the company
   */
  function searchRecruitmentInfo(companyName, options) {
    try {
      var apiKey = getApiKey();
      
      // 採用情報専用の検索クエリ
      var queries = [
        companyName + ' 採用情報 募集要項 キャリア採用',
        companyName + ' 新卒採用 中途採用 求人',
        companyName + ' 採用サイト 採用ページ careers'
      ];

      Logger.logDebug('Searching recruitment info for: ' + companyName, {
        queryCount: queries.length
      });

      var allResults = [];
      var totalResponseTime = 0;

      // 各クエリを実行
      for (var i = 0; i < queries.length; i++) {
        try {
          var requestPayload = {
            api_key: apiKey,
            query: queries[i],
            search_depth: 'advanced',
            max_results: 5,
            include_answer: false,
            include_raw_content: true,
            // 採用情報は求人サイトも含める
            include_domains: [],
            exclude_domains: [] // 採用情報検索では除外しない
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
          
          if (formatted.success && formatted.results) {
            formatted.results.forEach(function(result) {
              // 重複チェック
              var isDuplicate = allResults.some(function(existing) {
                return existing.url === result.url;
              });
              
              if (!isDuplicate) {
                // 採用情報のカテゴリを設定
                result.category = 'recruitment';
                
                // 公式採用ページかどうかをチェック（企業ドメインベースで厳密に判定）
                var isOfficialRecruitment = false;
                if (result.url) {
                  var urlLower = result.url.toLowerCase();
                  var companyNameClean = companyName.toLowerCase().replace(/株式会社|有限会社|合同会社|合資会社/g, '').trim();
                  
                  // 企業の公式ドメインかどうかを厳密にチェック
                  isOfficialRecruitment = (
                    // 企業名が含まれるドメインで採用関連ページ (.co.jp, .com, .jp)
                    (urlLower.includes(companyNameClean) && 
                     (urlLower.includes('.co.jp') || urlLower.includes('.com') || urlLower.includes('.jp')) &&
                     (urlLower.includes('career') || urlLower.includes('recruit') || urlLower.includes('採用'))) ||
                    // 企業の.co.jpドメインで採用ページ
                    (urlLower.includes('.co.jp') && 
                     urlLower.includes(companyNameClean) &&
                     (urlLower.includes('career') || urlLower.includes('recruit') || urlLower.includes('採用')))
                  );
                }
                
                result.isOfficialRecruitment = isOfficialRecruitment;
                
                allResults.push(result);
              }
            });
            
            totalResponseTime += formatted.response_time || 0;
          }
          
          // レート制限対策
          if (i < queries.length - 1) {
            Utilities.sleep(300);
          }
        } catch (queryError) {
          Logger.logWarning('Recruitment search query failed: ' + queries[i], queryError);
        }
      }

      // 公式採用ページを優先してソート
      allResults.sort(function(a, b) {
        if (a.isOfficialRecruitment && !b.isOfficialRecruitment) return -1;
        if (!a.isOfficialRecruitment && b.isOfficialRecruitment) return 1;
        return 0;
      });

      var result = {
        success: true,
        category: 'recruitment',
        results: allResults.slice(0, 10), // 最大10件に制限
        response_time: totalResponseTime
      };
      
      Logger.logInfo('Recruitment search completed for: ' + companyName, {
        resultCount: result.results.length,
        responseTime: result.response_time
      });
      
      return result;

    } catch (error) {
      Logger.logError('Recruitment search error for company: ' + companyName, error);
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
    searchLatestNews: searchLatestNews,
    searchRecruitmentInfo: searchRecruitmentInfo,
    getApiStats: getApiStats,
    testConnection: testConnection
  };
})();