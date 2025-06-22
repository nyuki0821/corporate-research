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
      model: ConfigManager.get('OPENAI_MODEL', 'gpt-4o-mini'),
      max_tokens: ConfigManager.getNumber('OPENAI_MAX_TOKENS', 4000),
      temperature: ConfigManager.getNumber('OPENAI_TEMPERATURE', 0.1),
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
  function parseCompanyInfo(content) {
    try {
      // 生のレスポンスをログ出力（最初の1000文字）
      Logger.logDebug('Raw OpenAI response (first 1000 chars)', {
        content: content.substring(0, 1000),
        totalLength: content.length
      });

      // まず直接JSONとしてパースを試みる
      var parsed = JSON.parse(content);
      
      // パース成功した場合の詳細ログ
      Logger.logDebug('Successfully parsed company data', {
        companyName: parsed.companyName,
        phone: parsed.phone,
        industryLarge: parsed.industryLarge,
        industryMedium: parsed.industryMedium,
        employees: parsed.employees,
        establishedYear: parsed.establishedYear,
        capital: parsed.capital,
        prefecture: parsed.prefecture,
        city: parsed.city,
        reliabilityScore: parsed.reliabilityScore
      });
      
      return parsed;
    } catch (e) {
      Logger.logWarning('Failed to parse JSON response, attempting text extraction');
      
      // コードブロックからJSONを抽出
      var jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          var extracted = JSON.parse(jsonMatch[1]);
          Logger.logInfo('Successfully extracted JSON from markdown code block');
          
          // 抽出したデータの詳細ログ
          Logger.logDebug('Extracted company data from markdown', {
            companyName: extracted.companyName,
            phone: extracted.phone,
            industryLarge: extracted.industryLarge,
            industryMedium: extracted.industryMedium,
            employees: extracted.employees,
            establishedYear: extracted.establishedYear,
            capital: extracted.capital,
            prefecture: extracted.prefecture,
            city: extracted.city,
            reliabilityScore: extracted.reliabilityScore
          });
          
          return extracted;
        } catch (parseError) {
          Logger.logError('Failed to parse extracted JSON', parseError);
        }
      }
      
      // 最後の手段: テキストから直接抽出を試みる
      var fallbackData = {
        companyName: extractField(content, 'companyName'),
        phone: extractField(content, 'phone'),
        // ... 他のフィールド
      };
      
      Logger.logWarning('Using fallback text extraction', fallbackData);
      return fallbackData;
    }
  }

  // Public functions
  /**
   * Extract company information from search results
   */
  function extractCompanyInfo(companyName, searchResults, phoneNumber) {
    try {
      Logger.logDebug('Extracting company info with OpenAI: ' + companyName);

      // Build context from search results with strict length limiting
      var context = '';
      var MAX_CONTEXT_LENGTH = 75000; // より厳格な制限（約90,000トークン相当）
      var sourceUrls = []; // ソースURL記録用
      var officialSiteUrl = ''; // 公式サイトURL
      
      // searchResultsが文字列の場合（buildSearchContextで既に処理済み）
      if (typeof searchResults === 'string') {
        context = searchResults;
        
        // コンテキスト長の二重チェック
        if (context.length > MAX_CONTEXT_LENGTH) {
          Logger.logWarning('Context too long, truncating: ' + companyName, {
            originalLength: context.length,
            maxLength: MAX_CONTEXT_LENGTH
          });
          context = context.substring(0, MAX_CONTEXT_LENGTH) + '\n\n[コンテンツ制限により省略]';
        }
      }
      // searchResultsがオブジェクトの場合（後方互換性のため）
      else if (searchResults && searchResults.results) {
        var currentLength = 0;
        var processedResults = [];
        
        // 公式サイトURLを特定
        var officialSite = searchResults.results.find(function(r) { return r.isOfficial; });
        if (officialSite) {
          officialSiteUrl = officialSite.url;
        }
        
        for (var i = 0; i < searchResults.results.length; i++) {
          var result = searchResults.results[i];
          var content = result.content || '';
          var url = result.url || '';
          
          // ソースURLを記録（重複除去）
          if (url && sourceUrls.indexOf(url) === -1) {
            sourceUrls.push(url);
          }
          
          // 各結果の最大長を制限
          var maxResultLength = 8000; // より厳格な制限
          if (content.length > maxResultLength) {
            content = content.substring(0, maxResultLength) + '...[省略]';
          }
          
          var siteType = result.isOfficial ? '[公式サイト] ' : '';
          var resultText = '=== 検索結果 ' + (i + 1) + ' ' + siteType + '===\n' +
                          'タイトル: ' + (result.title || '') + '\n' +
                          'URL: ' + url + '\n' +
                          '内容: ' + content + '\n';
          
          // コンテキスト長制限チェック
          if (currentLength + resultText.length > MAX_CONTEXT_LENGTH) {
            Logger.logInfo('Context length limit reached, stopping at result ' + (i + 1));
            break;
          }
          
          processedResults.push(resultText);
          currentLength += resultText.length;
        }
        
        context = processedResults.join('\n');
        
        Logger.logInfo('コンテンツ制限適用: ' + companyName, {
          originalResults: searchResults.results.length,
          processedResults: processedResults.length,
          contextLength: context.length,
          maxAllowed: MAX_CONTEXT_LENGTH,
          sourceUrlCount: sourceUrls.length,
          officialSiteFound: !!officialSiteUrl
        });
      }
      
      // 最終的なコンテキスト長チェック
      if (!context || context.trim().length === 0) {
        Logger.logWarning('Empty context for company: ' + companyName);
        throw new Error('No search context available for analysis');
      }
      
      if (context.length > MAX_CONTEXT_LENGTH) {
        Logger.logWarning('Final context still too long, emergency truncation: ' + companyName);
        context = context.substring(0, MAX_CONTEXT_LENGTH) + '\n\n[緊急省略]';
      }

      // 推定トークン数を計算（1トークン ≈ 1.3文字で概算）
      var estimatedTokens = Math.ceil(context.length / 1.3);
      var maxTokens = 128000; // OpenAI GPT-4の制限
      var responseTokens = 3000; // レスポンス用トークン
      var availableTokens = maxTokens - responseTokens;
      
      Logger.logInfo('OpenAI request token estimation: ' + companyName, {
        contextLength: context.length,
        estimatedTokens: estimatedTokens,
        maxTokens: maxTokens,
        availableTokens: availableTokens,
        withinLimit: estimatedTokens <= availableTokens
      });

      if (estimatedTokens > availableTokens) {
        Logger.logWarning('Estimated tokens exceed limit, truncating context: ' + companyName);
        var safeLength = Math.floor(availableTokens * 1.3);
        context = context.substring(0, safeLength) + '\n\n[トークン制限により省略]';
      }

      // OpenAI APIに送信するプロンプト（ソースURL記録を含む）
      var systemPrompt = 
        'あなたは企業情報抽出の専門家です。検索結果から企業の正確な情報を抽出し、JSON形式で回答してください。\n\n' +
        '**重要な抽出ルール**:\n' +
        '1. 公式サイトの情報を最優先で使用してください\n' +
        '2. 情報が見つからない場合は null を返してください\n' +
        '3. 推測や憶測は避け、明確に記載されている情報のみ抽出してください\n' +
        '4. 数値は単位付きの文字列として抽出してください\n' +
        '5. 住所は都道府県、市区町村、詳細住所に分割してください\n' +
        '6. 代表者情報は最新のものを優先してください\n\n' +
        '**JSON形式で以下のフィールドを抽出**:\n' +
        '{\n' +
        '  "companyName": "企業名（正規化済み）",\n' +
        '  "officialName": "正式企業名（登記名称）",\n' +
        '  "phone": "電話番号",\n' +
        '  "industryLarge": "業種大分類",\n' +
        '  "industryMedium": "業種中分類",\n' +
        '  "employees": "従業員数（単位含む）",\n' +
        '  "establishedYear": "設立年",\n' +
        '  "capital": "資本金（単位含む）",\n' +
        '  "listingStatus": "上場区分",\n' +
        '  "postalCode": "郵便番号",\n' +
        '  "prefecture": "都道府県",\n' +
        '  "city": "市区町村",\n' +
        '  "addressDetail": "住所詳細",\n' +
        '  "representativeName": "代表者名",\n' +
        '  "representativeTitle": "代表者役職",\n' +
        '  "philosophy": "企業理念・ミッション",\n' +
        '  "website": "公式ウェブサイトURL",\n' +
        '  "reliabilityScore": 85\n' +
        '}';

      var userPrompt = '企業名: ' + companyName + '\n';
      if (phoneNumber) {
        userPrompt += '電話番号: ' + phoneNumber + '\n';
      }
      userPrompt += '\n検索結果:\n' + context;

      var requestBody = {
        model: ConfigManager.get('OPENAI_MODEL', 'gpt-4o-mini'),
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: responseTokens,
        temperature: ConfigManager.getNumber('OPENAI_TEMPERATURE', 0.1),
        response_format: { type: 'json_object' }
      };

      Logger.logDebug('Sending request to OpenAI API for: ' + companyName);

      var response = ApiBase.post(_baseUrl + '/chat/completions', requestBody, {
        headers: {
          'Authorization': 'Bearer ' + getApiKey(),
          'Content-Type': 'application/json'
        },
        timeout: ConfigManager.getNumber('OPENAI_TIMEOUT_MS', 60000),
        useCache: false
      });

      Logger.logDebug('Received response from OpenAI API for: ' + companyName);

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response from OpenAI API');
      }

      var content = response.choices[0].message.content;
      var parsedData = parseCompanyInfo(content, companyName);

      if (!parsedData) {
        throw new Error('Failed to parse company information');
      }

      // ソースURL情報を追加
      parsedData.sourceUrls = sourceUrls;
      parsedData.officialSiteUrl = officialSiteUrl;
      parsedData.primarySourceUrl = officialSiteUrl || (sourceUrls.length > 0 ? sourceUrls[0] : '');

      Logger.logInfo('Company info extraction completed: ' + companyName, {
        extractedFields: Object.keys(parsedData).length,
        reliabilityScore: parsedData.reliabilityScore,
        sourceUrlCount: sourceUrls.length,
        officialSiteFound: !!officialSiteUrl,
        primarySource: parsedData.primarySourceUrl
      });

      return {
        success: true,
        data: parsedData,
        sourceUrls: sourceUrls,
        officialSiteUrl: officialSiteUrl,
        primarySourceUrl: parsedData.primarySourceUrl
      };

    } catch (error) {
      Logger.logError('OpenAI API error for company: ' + companyName, error);
      ErrorHandler.handleError(error, {
        function: 'extractCompanyInfo',
        companyName: companyName,
        apiService: 'OpenAI'
      });
      
      return {
        success: false,
        error: error.message,
        sourceUrls: sourceUrls || [],
        officialSiteUrl: officialSiteUrl || '',
        primarySourceUrl: ''
      };
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
          max_tokens: 2000
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
   * Generate news summary from search results
   */
  function generateNewsSummary(companyName, newsContext) {
    try {
      Logger.logDebug('Generating news summary for: ' + companyName);

      var systemPrompt = 
        'あなたは営業戦略分析の専門家です。企業の最新ニュースから、営業活動に役立つ示唆をまとめてください。\n\n' +
        '**営業視点でのサマリー作成ルール**:\n' +
        '1. 営業機会につながる情報を最優先で抽出（新サービス、事業拡大、投資、提携など）\n' +
        '2. 企業の成長性や変化を示す具体的な事実を含める（売上、従業員数、拠点数など）\n' +
        '3. アプローチタイミングの示唆を含める（新規事業開始時、システム刷新時など）\n' +
        '4. 競合他社との差別化ポイントがあれば言及\n' +
        '5. 200文字以内で営業担当者が即座に活用できる形でまとめる\n' +
        '6. ニュースがない場合は「営業に活用できる最新情報なし」と記載\n\n' +
        '**営業活用の観点**:\n' +
        '- 新規事業・サービス開始 → システム導入やサポート需要の可能性\n' +
        '- 業績好調・資金調達 → 投資余力があり新規導入に前向きな可能性\n' +
        '- 組織拡大・採用強化 → 人事システムや研修サービス需要の可能性\n' +
        '- M&A・提携 → システム統合やインフラ整備需要の可能性\n' +
        '- 認証取得・受賞 → 品質向上意識が高く、システム改善に積極的な可能性\n\n' +
        '**出力形式**: 営業視点のサマリーのみを出力してください。参照URLは含めないでください。';

      var userPrompt = '企業名: ' + companyName + '\n\n' +
                      'ニュース情報:\n' + newsContext + '\n\n' +
                      '上記から営業活動に役立つ示唆をサマリーしてください。';

      var requestBody = {
        model: ConfigManager.get('OPENAI_MODEL', 'gpt-4o-mini'),
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 300,
        temperature: ConfigManager.getNumber('OPENAI_TEMPERATURE', 0.2)
      };

      var response = ApiBase.post(_baseUrl + '/chat/completions', requestBody, {
        headers: {
          'Authorization': 'Bearer ' + getApiKey(),
          'Content-Type': 'application/json'
        },
        timeout: ConfigManager.getNumber('OPENAI_TIMEOUT_MS', 30000),
        useCache: false
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response from OpenAI API');
      }

      var summary = response.choices[0].message.content.trim();
      
      // ソースURLを抽出（newsContextから）
      var sourceUrls = [];
      var urlMatches = newsContext.match(/URL: (https?:\/\/[^\s\n]+)/g);
      if (urlMatches) {
        sourceUrls = urlMatches.map(function(match) {
          return match.replace('URL: ', '');
        }).filter(function(url, index, self) {
          return self.indexOf(url) === index; // 重複除去
        });
      }

      Logger.logInfo('News summary generated for: ' + companyName, {
        summaryLength: summary.length,
        sourceUrlCount: sourceUrls.length
      });

      return {
        success: true,
        summary: summary,
        sourceUrls: sourceUrls
      };

    } catch (error) {
      Logger.logError('News summary generation failed for: ' + companyName, error);
      return {
        success: false,
        error: error.message,
        sourceUrls: []
      };
    }
  }

  /**
   * Generate recruitment summary from search results
   */
  function generateRecruitmentSummary(companyName, recruitmentContext) {
    try {
      Logger.logDebug('Generating recruitment summary for: ' + companyName);

      var systemPrompt = 
        'あなたは営業戦略分析の専門家です。企業の採用情報から、営業活動に役立つ示唆をまとめてください。\n\n' +
        '**営業視点での採用情報サマリー作成ルール**:\n' +
        '1. 企業の成長性を示す採用動向を最優先で抽出（大量採用、新職種採用、拠点拡大など）\n' +
        '2. 営業機会につながる採用領域を特定（IT人材、管理部門、営業職など）\n' +
        '3. 組織課題や成長段階を推測できる情報を含める\n' +
        '4. アプローチすべきタイミングの示唆を含める（組織拡大期、新規事業立ち上げ期など）\n' +
        '5. 200文字以内で営業担当者が即座に活用できる形でまとめる\n' +
        '6. 採用情報がない場合は「営業に活用できる採用情報なし」と記載\n\n' +
        '**営業活用の観点**:\n' +
        '- IT・エンジニア採用 → システム導入への前向きさ、技術革新への意欲\n' +
        '- 管理部門採用 → 業務効率化システム需要、内部統制強化の可能性\n' +
        '- 営業職採用 → CRM・営業支援ツール需要、売上拡大への意欲\n' +
        '- 大量採用 → 人事システム・研修サービス需要、組織拡大期\n' +
        '- 新拠点・海外展開 → インフラ整備、システム統合需要\n\n' +
        '**出力形式**: 営業視点のサマリーのみを出力してください。参照URLは含めないでください。';

      var userPrompt = '企業名: ' + companyName + '\n\n' +
                      '採用情報:\n' + recruitmentContext + '\n\n' +
                      '上記から営業活動に役立つ示唆をサマリーしてください。';

      var requestBody = {
        model: ConfigManager.get('OPENAI_MODEL', 'gpt-4o-mini'),
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 300,
        temperature: ConfigManager.getNumber('OPENAI_TEMPERATURE', 0.2)
      };

      var response = ApiBase.post(_baseUrl + '/chat/completions', requestBody, {
        headers: {
          'Authorization': 'Bearer ' + getApiKey(),
          'Content-Type': 'application/json'
        },
        timeout: ConfigManager.getNumber('OPENAI_TIMEOUT_MS', 30000),
        useCache: false
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response from OpenAI API');
      }

      var summary = response.choices[0].message.content.trim();
      
      // ソースURLを抽出（recruitmentContextから）
      var sourceUrls = [];
      var urlMatches = recruitmentContext.match(/URL: (https?:\/\/[^\s\n]+)/g);
      if (urlMatches) {
        sourceUrls = urlMatches.map(function(match) {
          return match.replace('URL: ', '');
        }).filter(function(url, index, self) {
          return self.indexOf(url) === index; // 重複除去
        });
      }

      Logger.logInfo('Recruitment summary generated for: ' + companyName, {
        summaryLength: summary.length,
        sourceUrlCount: sourceUrls.length
      });

      return {
        success: true,
        summary: summary,
        sourceUrls: sourceUrls
      };

    } catch (error) {
      Logger.logError('Recruitment summary generation failed for: ' + companyName, error);
      return {
        success: false,
        error: error.message,
        sourceUrls: []
      };
    }
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
    generateNewsSummary: generateNewsSummary,
    generateRecruitmentSummary: generateRecruitmentSummary,
    testConnection: testConnection,
    getApiStats: getApiStats
  };
})();