/**
 * @fileoverview OpenAI API client for the Corporate Research System
 * @author Corporate Research Team
 * 
 * 依存モジュール:
 * - Logger (src/core/Logger.js)
 * - ConfigManager (src/core/ConfigManager.js)
 * - ErrorHandler (src/core/ErrorHandler.js)
 * - ApiBase (src/api/ApiBase.js)
 */

var OpenAIClient = (function() {
  // Private variables
  var _baseUrl = 'https://api.openai.com/v1';
  var _apiKey = null;

  // Private functions
  /**
   * Get API key
   * @private
   */
  function getApiKey() {
    if (!_apiKey) {
      _apiKey = ConfigManager.get('OPENAI_API_KEY');
      if (!_apiKey) {
        throw new Error('OpenAI API key not configured');
      }
    }
    return _apiKey;
  }

  /**
   * Build headers for API requests
   * @private
   */
  function buildHeaders() {
    return {
      'Authorization': 'Bearer ' + getApiKey(),
      'Content-Type': 'application/json'
    };
  }

  /**
   * Format chat completion request
   * @private
   */
  function buildChatRequest(messages, options) {
    var defaults = {
      model: 'gpt-4o-mini',
      max_tokens: 4000,
      temperature: 0.1,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    };

    var request = Object.assign({}, defaults);
    if (options) {
      Object.keys(options).forEach(function(key) {
        if (options[key] !== undefined) {
          request[key] = options[key];
        }
      });
    }

    request.messages = messages;
    return request;
  }

  /**
   * Parse company information from AI response
   * @private
   */
  function parseCompanyInfo(responseText) {
    try {
      // Try to parse as JSON first
      var parsed = JSON.parse(responseText);
      return {
        success: true,
        data: parsed
      };
    } catch (error) {
      // If JSON parsing fails, try to extract structured data
      Logger.logWarning('Failed to parse JSON response, attempting text extraction');
      
      return {
        success: false,
        error: 'Failed to parse structured data from response',
        rawText: responseText
      };
    }
  }

  // Public functions
  /**
   * Extract company information from search results
   */
  function extractCompanyInfo(companyName, searchResults, phoneNumber) {
    try {
      Logger.logDebug('Extracting company info with OpenAI: ' + companyName);

      // Build context from search results
      var context = '';
      if (searchResults && searchResults.results) {
        context = searchResults.results.map(function(result) {
          return 'タイトル: ' + result.title + '\n内容: ' + result.content;
        }).join('\n\n');
      }

      var systemPrompt = `あなたは企業情報抽出の専門家です。提供された検索結果から企業の基本情報を抽出し、構造化されたJSONで回答してください。

抽出する項目:
- companyName: 企業名
- officialName: 正式企業名
- phone: 電話番号
- industryLarge: 業種大分類
- industryMedium: 業種中分類
- employees: 従業員数（数値）
- establishedYear: 設立年（数値）
- capital: 資本金（文字列、単位含む）
- listingStatus: 上場区分
- postalCode: 本社郵便番号
- prefecture: 本社都道府県
- city: 本社市区町村
- addressDetail: 本社住所詳細
- representativeName: 代表者名
- representativeTitle: 代表者役職
- philosophy: 企業理念
- latestNews: 最新ニュース
- recruitmentStatus: 採用状況
- website: 企業URL
- reliabilityScore: 信頼性スコア（1-100）

情報が見つからない場合は null を設定してください。
信頼性スコアは情報の完全性と信頼性に基づいて設定してください。`;

      var userPrompt = `企業名: ${companyName}
${phoneNumber ? '電話番号: ' + phoneNumber : ''}

検索結果:
${context}

上記の情報から企業の基本情報をJSONで抽出してください。`;

      var messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      var requestData = buildChatRequest(messages, {
        model: 'gpt-4o-mini',
        max_tokens: 2000,
        temperature: 0.1
      });

      var requestOptions = {
        headers: buildHeaders(),
        timeout: ConfigManager.getNumber('EXTRACTION_TIMEOUT_MS', 60000),
        useCache: true,
        cacheExpiration: Constants.CACHE_CONFIG.DURATION.MEDIUM
      };

      var response = ApiBase.post(_baseUrl + '/chat/completions', requestData, requestOptions);
      
      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response choices returned from OpenAI');
      }

      var content = response.choices[0].message.content;
      var parsed = parseCompanyInfo(content);

      if (parsed.success) {
        Logger.logInfo('Company info extracted successfully: ' + companyName, {
          fieldsExtracted: Object.keys(parsed.data).length,
          reliabilityScore: parsed.data.reliabilityScore
        });

        return {
          success: true,
          data: parsed.data,
          usage: response.usage,
          model: requestData.model
        };
      } else {
        Logger.logWarning('Failed to extract structured company info: ' + companyName);
        return {
          success: false,
          error: parsed.error,
          rawResponse: content,
          usage: response.usage
        };
      }

    } catch (error) {
      Logger.logError('OpenAI API error for company: ' + companyName, error);
      ErrorHandler.handleError(error, {
        function: 'extractCompanyInfo',
        companyName: companyName,
        apiService: 'OpenAI'
      });
      
      throw error;
    }
  }

  /**
   * Analyze and improve company information
   */
  function analyzeCompanyInfo(companyData, additionalContext) {
    return new Promise(function(resolve, reject) {
      try {
        Logger.logDebug('Analyzing company info with OpenAI: ' + companyData.companyName);

        var systemPrompt = `あなたは企業分析の専門家です。提供された企業情報を分析し、データの品質向上と補完を行ってください。

以下の観点で分析してください:
1. データの一貫性チェック
2. 欠損情報の推定（可能な場合）
3. 業種分類の適切性
4. 信頼性スコアの再評価
5. 追加で有用な情報の提案

改善されたデータを元のJSON構造で返してください。`;

        var userPrompt = `企業情報:
${JSON.stringify(companyData, null, 2)}

${additionalContext ? '追加情報:\n' + additionalContext : ''}

上記の情報を分析し、改善されたJSONデータを返してください。`;

        var messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ];

        var requestData = buildChatRequest(messages, {
          model: 'gpt-4o-mini',
          max_tokens: 2000,
          temperature: 0.1
        });

        var requestOptions = {
          headers: buildHeaders(),
          timeout: ConfigManager.getNumber('EXTRACTION_TIMEOUT_MS', 60000),
          useCache: false // Don't cache analysis results
        };

        ApiBase.post(_baseUrl + '/chat/completions', requestData, requestOptions)
          .then(function(response) {
            if (!response.choices || response.choices.length === 0) {
              throw new Error('No response choices returned from OpenAI');
            }

            var content = response.choices[0].message.content;
            var parsed = parseCompanyInfo(content);

            if (parsed.success) {
              Logger.logInfo('Company analysis completed: ' + companyData.companyName);
              resolve({
                success: true,
                data: parsed.data,
                usage: response.usage
              });
            } else {
              Logger.logWarning('Company analysis parsing failed: ' + companyData.companyName);
              resolve({
                success: false,
                error: parsed.error,
                originalData: companyData,
                rawResponse: content
              });
            }
          })
          .catch(reject);

      } catch (error) {
        Logger.logError('Exception in OpenAI analyzeCompanyInfo', error);
        reject(error);
      }
    });
  }

  /**
   * Generate company research summary
   */
  function generateSummary(companyData, sourceUrls) {
    return new Promise(function(resolve, reject) {
      try {
        var systemPrompt = `あなたは企業レポート作成の専門家です。提供された企業情報をもとに、簡潔で有用な企業サマリーを作成してください。

サマリーには以下を含めてください:
- 企業の概要
- 主要な特徴
- 業界での位置づけ
- 注目すべきポイント

300文字以内で、わかりやすく記述してください。`;

        var userPrompt = `企業名: ${companyData.companyName || '未指定'}
業種: ${companyData.industryLarge || '不明'} - ${companyData.industryMedium || '不明'}
従業員数: ${companyData.employees || '不明'}
設立年: ${companyData.establishedYear || '不明'}
上場区分: ${companyData.listingStatus || '不明'}
代表者: ${companyData.representativeName || '不明'} (${companyData.representativeTitle || '不明'})

企業理念: ${companyData.philosophy || '情報なし'}
最新情報: ${companyData.latestNews || '情報なし'}

上記の情報をもとに、企業サマリーを作成してください。`;

        var messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ];

        var requestData = buildChatRequest(messages, {
          model: 'gpt-4o-mini',
          max_tokens: 500,
          temperature: 0.3
        });

        var requestOptions = {
          headers: buildHeaders(),
          timeout: 30000,
          useCache: true,
          cacheExpiration: Constants.CACHE_CONFIG.DURATION.SHORT
        };

        ApiBase.post(_baseUrl + '/chat/completions', requestData, requestOptions)
          .then(function(response) {
            if (!response.choices || response.choices.length === 0) {
              throw new Error('No response choices returned from OpenAI');
            }

            var summary = response.choices[0].message.content.trim();
            
            Logger.logInfo('Company summary generated: ' + (companyData.companyName || 'Unknown'));
            resolve({
              success: true,
              summary: summary,
              usage: response.usage
            });
          })
          .catch(reject);

      } catch (error) {
        Logger.logError('Exception in OpenAI generateSummary', error);
        reject(error);
      }
    });
  }

  /**
   * Test API connection
   */
  function testConnection() {
    try {
      Logger.logInfo('Testing OpenAI API connection');

      var messages = [
        { role: 'user', content: 'Hello, please respond with "API connection successful"' }
      ];

      var requestData = buildChatRequest(messages, {
        model: 'gpt-4o-mini',
        max_tokens: 50,
        temperature: 0
      });

      var requestOptions = {
        headers: buildHeaders(),
        timeout: 10000,
        useCache: false
      };

      var response = ApiBase.post(_baseUrl + '/chat/completions', requestData, requestOptions);
      Logger.logInfo('OpenAI API connection test successful');
      return {
        success: true,
        message: 'API connection successful',
        provider: 'OpenAI',
        model: requestData.model
      };

    } catch (error) {
      Logger.logError('OpenAI API connection test failed', error);
      return {
        success: false,
        error: error.message,
        provider: 'OpenAI'
      };
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
      apiProvider: 'OpenAI',
      baseUrl: _baseUrl
    };
  }

  // Return public API
  return {
    extractCompanyInfo: extractCompanyInfo,
    analyzeCompanyInfo: analyzeCompanyInfo,
    generateSummary: generateSummary,
    testConnection: testConnection,
    getApiStats: getApiStats
  };
})();