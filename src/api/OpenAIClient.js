
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
      // If JSON parsing fails, try to extract JSON from markdown code blocks
      Logger.logWarning('Failed to parse JSON response, attempting text extraction');
      
      try {
        // Remove markdown code blocks (```json ... ``` or ``` ... ```)
        var cleanedText = responseText
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();
        
        // Try parsing the cleaned text
        var parsed = JSON.parse(cleanedText);
        Logger.logInfo('Successfully extracted JSON from markdown code block');
        return {
          success: true,
          data: parsed
        };
      } catch (secondError) {
        // If still fails, try to extract JSON-like content using regex
        try {
          var jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            var parsed = JSON.parse(jsonMatch[0]);
            Logger.logInfo('Successfully extracted JSON using regex');
            return {
              success: true,
              data: parsed
            };
          }
        } catch (thirdError) {
          // Final fallback - log the raw response for debugging
          Logger.logError('All JSON parsing attempts failed', {
            originalError: error.message,
            secondError: secondError.message,
            thirdError: thirdError.message,
            rawText: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')
          });
        }
      }
      
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

      var systemPrompt = 'あなたは企業情報抽出の専門家です。提供された検索結果から企業の基本情報と支店情報を抽出し、構造化されたJSONで回答してください。\n\n' +
        '重要: レスポンスは有効なJSONオブジェクトのみを返してください。マークダウンのコードブロック（```）や説明文は一切含めないでください。\n\n' +
        '抽出する項目と抽出のコツ:\n' +
        '【基本情報】\n' +
        '- companyName: 企業名\n' +
        '- officialName: 正式企業名（株式会社、有限会社等を含む正式名称）\n' +
        '- phone: 電話番号（代表電話、本社電話、お問い合わせ電話など。ハイフンありの形式で）\n' +
        '- industryLarge: 業種大分類（製造業、サービス業、小売業、金融業など）\n' +
        '- industryMedium: 業種中分類（より具体的な業種分類）\n' +
        '- employees: 従業員数（数値のみ、単位なし）\n' +
        '- establishedYear: 設立年（数値のみ、西暦4桁）\n' +
        '- capital: 資本金（「○億円」「○万円」など単位を含む文字列）\n' +
        '- listingStatus: 上場区分（「東証プライム」「東証スタンダード」「非上場」など）\n' +
        '- postalCode: 本社郵便番号（「123-4567」形式）\n' +
        '- prefecture: 本社都道府県（「東京都」「大阪府」など）\n' +
        '- city: 本社市区町村（「千代田区」「大阪市」など）\n' +
        '- addressDetail: 本社住所詳細（番地、ビル名、階数など）\n' +
        '- representativeName: 代表者名（社長、CEO、代表取締役の氏名）\n' +
        '- representativeTitle: 代表者役職（「代表取締役社長」「CEO」など）\n' +
        '- philosophy: 企業理念（企業理念、ミッション、ビジョン、経営方針など）\n' +
        '- latestNews: 最新ニュース（最近のプレスリリース、発表、ニュースなど）\n' +
        '- recruitmentStatus: 採用状況（「新卒採用実施中」「中途採用あり」「通年採用」など）\n' +
        '- website: 企業URL（公式ホームページのURL）\n' +
        '- reliabilityScore: 信頼性スコア（1-100、情報の完全性と信頼性に基づく）\n\n' +
        '【支店情報】\n' +
        '- branches: 支店情報の配列（以下の形式で）\n' +
        '  - name: 支店名（「東京支店」「大阪営業所」など）\n' +
        '  - type: 支店種別（「支店」「営業所」「事業所」「支社」「工場」など）\n' +
        '  - phone: 支店電話番号（ハイフンありの形式で）\n' +
        '  - postalCode: 支店郵便番号（「123-4567」形式）\n' +
        '  - prefecture: 支店都道府県\n' +
        '  - city: 支店市区町村\n' +
        '  - addressDetail: 支店住所詳細\n' +
        '  - employees: 支店従業員数（数値のみ）\n' +
        '  - businessHours: 営業時間\n' +
        '  - notes: 備考・特記事項\n\n' +
        '抽出の重要なポイント:\n' +
        '1. 電話番号は「代表」「本社」「お問い合わせ」などの記載があるものを優先\n' +
        '2. 住所は郵便番号、都道府県、市区町村、詳細を分けて抽出\n' +
        '3. 代表者情報は最新の情報を抽出（就任年月も参考に）\n' +
        '4. 資本金は「資本金」「資本」の記載から抽出\n' +
        '5. 企業理念は「理念」「ミッション」「ビジョン」「方針」から抽出\n' +
        '6. 採用情報は「採用」「求人」「リクルート」の記載から抽出\n\n' +
        '支店情報の抽出条件:\n' +
        '- 営業先として重要な「支店」「営業所」「事業所」「支社」「工場」「オフィス」を抽出\n' +
        '- 小売店舗、販売店、ショールーム、ショップは除外\n' +
        '- B2B営業の対象となる拠点のみを抽出\n' +
        '- 各支店の電話番号、住所、担当エリア、営業時間があれば抽出\n' +
        '- 支店情報が見つからない場合は空の配列 [] を設定\n\n' +
        '情報が見つからない場合は null を設定してください。\n' +
        '信頼性スコアは情報の完全性と信頼性に基づいて設定してください。\n\n' +
        '回答例:\n' +
        '{"companyName":"大和ハウス工業株式会社","officialName":"大和ハウス工業株式会社","phone":"06-6346-2111","industryLarge":"建設業","industryMedium":"住宅建設業","employees":16192,"establishedYear":1947,"capital":"1622億1,684万212円","listingStatus":"東証プライム","postalCode":"530-8241","prefecture":"大阪府","city":"大阪市北区","addressDetail":"梅田3丁目3番5号","representativeName":"大友 浩嗣","representativeTitle":"代表取締役社長","philosophy":"共に生きる。共に創る。","latestNews":null,"recruitmentStatus":"新卒採用実施中","website":"https://www.daiwahouse.co.jp","reliabilityScore":91,"branches":[{"name":"東京支店","type":"支店","phone":"03-1234-5678","postalCode":"100-0001","prefecture":"東京都","city":"千代田区","addressDetail":"丸の内1-1-1","employees":150,"businessHours":"9:00-18:00","notes":"関東エリア担当"},{"name":"名古屋営業所","type":"営業所","phone":"052-1234-5678","postalCode":"460-0001","prefecture":"愛知県","city":"名古屋市中区","addressDetail":"栄1-1-1","employees":80,"businessHours":"9:00-17:30","notes":"中部エリア担当"}]}';

      var userPrompt = '企業名: ' + companyName + '\n' +
        (phoneNumber ? '電話番号: ' + phoneNumber + '\n' : '') + '\n' +
        '検索結果:\n' + context + '\n\n' +
        '上記の情報から企業の基本情報をJSONで抽出してください。';

      var messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      var requestData = buildChatRequest(messages, {
        model: 'gpt-4o-mini',
        max_tokens: 2000,
        temperature: 0.1,
        response_format: { type: 'json_object' }
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
   * Generate company news summary from multiple sources
   */
  function generateNewsSummary(companyName, newsResults) {
    try {
      Logger.logDebug('Generating news summary with OpenAI: ' + companyName);

      // Build context from news search results
      var context = '';
      var sourceUrls = [];
      
      if (newsResults && newsResults.results) {
        context = newsResults.results.map(function(result, index) {
          sourceUrls.push(result.url);
          return 'ソース' + (index + 1) + ':\n' +
                 'タイトル: ' + result.title + '\n' +
                 'URL: ' + result.url + '\n' +
                 '内容: ' + result.content + '\n';
        }).join('\n');
      }

      var systemPrompt = 'あなたは企業ニュース分析の専門家です。複数のニュースソースから企業の最新情報をまとめ、営業活動に役立つサマリーを作成してください。\n\n' +
        '重要: レスポンスは有効なJSONオブジェクトのみを返してください。マークダウンのコードブロック（```）や説明文は一切含めないでください。\n\n' +
        'サマリーの作成指針:\n' +
        '1. 営業活動に関連する重要な情報を優先（新製品、新サービス、業績、組織変更、提携など）\n' +
        '2. 複数ソースの情報を統合し、重複を避ける\n' +
        '3. 日付が新しい情報を優先\n' +
        '4. 客観的で簡潔な表現を使用\n' +
        '5. 営業先としての魅力度や注意点があれば含める\n\n' +
        'JSONフォーマット:\n' +
        '{\n' +
        '  "summary": "統合されたニュースサマリー（200文字以内）",\n' +
        '  "keyPoints": ["重要ポイント1", "重要ポイント2", "重要ポイント3"],\n' +
        '  "businessImpact": "営業活動への影響（ポジティブ/ニュートラル/ネガティブ）",\n' +
        '  "lastUpdated": "最新情報の日付（YYYY-MM-DD形式、不明な場合はnull）",\n' +
        '  "sourceCount": ソース数,\n' +
        '  "sourceUrls": ["参考URL1", "参考URL2", "参考URL3"]\n' +
        '}';

      var userPrompt = '企業名: ' + companyName + '\n\n' +
        'ニュース情報:\n' + context + '\n\n' +
        '上記の情報から営業活動に役立つニュースサマリーをJSONで作成してください。';

      var messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      var requestData = buildChatRequest(messages, {
        model: 'gpt-4o-mini',
        max_tokens: 1000,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      var requestOptions = {
        headers: buildHeaders(),
        timeout: ConfigManager.getNumber('EXTRACTION_TIMEOUT_MS', 60000),
        useCache: true,
        cacheExpiration: Constants.CACHE_CONFIG.DURATION.SHORT // ニュースは短時間キャッシュ
      };

      var response = ApiBase.post(_baseUrl + '/chat/completions', requestData, requestOptions);
      
      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response choices returned from OpenAI');
      }

      var content = response.choices[0].message.content;
      var parsed = parseCompanyInfo(content);

      if (parsed.success) {
        Logger.logInfo('News summary generated successfully: ' + companyName, {
          keyPointsCount: parsed.data.keyPoints ? parsed.data.keyPoints.length : 0,
          sourceCount: parsed.data.sourceCount || 0
        });

        return {
          success: true,
          data: parsed.data,
          usage: response.usage,
          model: requestData.model
        };
      } else {
        Logger.logWarning('Failed to generate news summary: ' + companyName);
        return {
          success: false,
          error: parsed.error,
          rawResponse: content,
          usage: response.usage
        };
      }

    } catch (error) {
      Logger.logError('OpenAI API error for news summary: ' + companyName, error);
      ErrorHandler.handleError(error, {
        function: 'generateNewsSummary',
        companyName: companyName,
        apiService: 'OpenAI'
      });
      
      throw error;
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

  /**
   * Generate recruitment summary using OpenAI
   */
  function generateRecruitmentSummary(companyName, recruitmentResults) {
    try {
      if (!recruitmentResults || !recruitmentResults.results || recruitmentResults.results.length === 0) {
        Logger.logDebug('No recruitment results provided for summarization');
        return {
          success: false,
          error: 'No recruitment data available'
        };
      }

      Logger.logDebug('Generating recruitment summary for: ' + companyName);

      var context = '';
      var sourceUrls = [];

      recruitmentResults.results.forEach(function(result) {
        if (result.content) {
          context += result.title + '\n' + result.content + '\n\n';
        }
        if (result.url) {
          sourceUrls.push(result.url);
        }
      });

      if (context.trim() === '') {
        return {
          success: false,
          error: 'No recruitment content available'
        };
      }

      var systemPrompt = 
        'あなたは企業の採用情報を分析し、営業活動に役立つサマリーを作成する専門家です。\n' +
        '以下の採用情報を分析し、営業担当者が企業にアプローチする際に有用な情報をまとめてください。\n\n' +
        '回答は以下のJSON形式で提供してください：\n' +
        '{\n' +
        '  "summary": "採用状況の概要（100文字程度）",\n' +
        '  "recruitmentTypes": ["新卒採用", "中途採用", "通年採用", "アルバイト・パート", "インターン", "契約社員"],\n' +
        '  "targetPositions": ["営業", "エンジニア", "事務", "管理職", "専門職"],\n' +
        '  "companyGrowth": "拡大中/安定/縮小/不明",\n' +
        '  "businessOpportunity": "高/中/低",\n' +
        '  "keyInsights": ["営業に役立つ洞察1", "営業に役立つ洞察2", "営業に役立つ洞察3"],\n' +
        '  "sourceCount": 情報ソース数,\n' +
        '  "lastUpdated": "YYYY-MM-DD",\n' +
        '  "recruitmentUrl": "採用ページのURL（あれば）"\n' +
        '}\n\n' +
        '分析のポイント：\n' +
        '1. 採用の積極性から企業の成長性を判断\n' +
        '2. 募集職種から事業拡大の方向性を推測\n' +
        '3. 営業担当者が企業にアプローチする際の話題提供\n' +
        '4. 企業の人材ニーズから潜在的なビジネス機会を評価\n' +
        '5. 採用メッセージから企業文化や方針を読み取る\n\n' +
        '営業活動への活用例：\n' +
        '- 「積極的に採用されているようですが、業務効率化のご提案はいかがですか？」\n' +
        '- 「エンジニア採用を強化されているとのことですが、開発環境の改善をお手伝いできます」\n' +
        '- 「事業拡大に伴う採用活動、順調でしょうか？人事システムのご相談も承ります」';

      var userPrompt = '企業名: ' + companyName + '\n\n' +
        '採用情報:\n' + context + '\n\n' +
        '上記の採用情報を分析し、営業活動に役立つサマリーをJSONで提供してください。';

      var messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      var requestData = buildChatRequest(messages, {
        model: 'gpt-4o-mini',
        max_tokens: 1000,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      var requestOptions = {
        headers: buildHeaders(),
        timeout: ConfigManager.getNumber('EXTRACTION_TIMEOUT_MS', 60000),
        useCache: true,
        cacheExpiration: Constants.CACHE_CONFIG.DURATION.SHORT
      };

      var response = ApiBase.post(_baseUrl + '/chat/completions', requestData, requestOptions);
      
      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response choices returned from OpenAI');
      }

      var content = response.choices[0].message.content;
      var parsed = parseCompanyInfo(content);

      if (parsed.success) {
        Logger.logInfo('Recruitment summary generated successfully: ' + companyName, {
          sourceCount: sourceUrls.length
        });

        return {
          success: true,
          data: {
            summary: parsed.data.summary || '',
            recruitmentTypes: parsed.data.recruitmentTypes || [],
            targetPositions: parsed.data.targetPositions || [],
            companyGrowth: parsed.data.companyGrowth || '不明',
            businessOpportunity: parsed.data.businessOpportunity || '中',
            keyInsights: parsed.data.keyInsights || [],
            sourceCount: sourceUrls.length,
            lastUpdated: parsed.data.lastUpdated || new Date().toISOString().split('T')[0],
            recruitmentUrl: parsed.data.recruitmentUrl || '',
            sourceUrls: sourceUrls
          },
          usage: response.usage,
          model: requestData.model
        };
      } else {
        Logger.logWarning('Failed to generate recruitment summary: ' + companyName);
        return {
          success: false,
          error: parsed.error,
          rawResponse: content,
          usage: response.usage
        };
      }

    } catch (error) {
      Logger.logError('OpenAI API error for recruitment summary: ' + companyName, error);
      ErrorHandler.handleError(error, {
        function: 'generateRecruitmentSummary',
        companyName: companyName,
        apiService: 'OpenAI'
      });
      
      throw error;
    }
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