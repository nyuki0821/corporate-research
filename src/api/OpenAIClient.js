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

      // Build context from search results with basic length limiting
      var context = '';
      
      // searchResultsが文字列の場合（buildSearchContextで既に処理済み）
      if (typeof searchResults === 'string') {
        context = searchResults;
        Logger.logInfo('Using pre-built context string', {
          contextLength: context.length
        });
      } 
      // searchResultsがオブジェクトの場合（後方互換性のため）
      else if (searchResults && searchResults.results) {
        var maxContextLength = 80000; // 約100,000トークン相当（安全マージン）
        var currentLength = 0;
        var processedResults = [];
        
        for (var i = 0; i < searchResults.results.length; i++) {
          var result = searchResults.results[i];
          var content = result.content || '';
          
          // 各結果の最大長を制限
          var maxResultLength = 10000; // 1つの結果あたりの最大長
          if (content.length > maxResultLength) {
            content = content.substring(0, maxResultLength);
          }
          
          var resultText = 'タイトル: ' + (result.title || '') + '\nURL: ' + (result.url || '') + '\n内容: ' + content;
          
          // コンテキスト長制限チェック
          if (currentLength + resultText.length > maxContextLength) {
            break;
          }
          
          processedResults.push(resultText);
          currentLength += resultText.length;
        }
        
        context = processedResults.join('\n\n');
        
        Logger.logInfo('コンテンツ制限適用: ' + companyName, {
          originalResults: searchResults.results.length,
          processedResults: processedResults.length,
          contextLength: context.length
        });
      }
      
      // コンテキストが空の場合の警告
      if (!context || context.trim().length === 0) {
        Logger.logWarning('Empty context for company: ' + companyName);
        throw new Error('No search context available for analysis');
      }

      var systemPrompt = 
        'あなたは企業情報抽出の専門家です。検索結果から企業の基本情報を抽出してください。\n\n' +
        '**最重要タスク**: 検索結果を詳細に読み、利用可能なすべての企業情報を抽出すること。\n\n' +
        '**抽出手順**:\n' +
        '1. 各検索結果を順番に読む\n' +
        '2. 企業情報に関連するキーワードを探す\n' +
        '3. 見つけた情報を該当するフィールドに記入\n' +
        '4. 複数の情報源で確認できた情報は信頼性が高い\n\n' +
        '**具体的な抽出パターン**:\n' +
        '【住所情報】\n' +
        '- "本社住所：京都府京都市中京区..." → prefecture: "京都府", city: "京都市中京区"\n' +
        '- "所在地：東京都渋谷区..." → prefecture: "東京都", city: "渋谷区"\n' +
        '- "〒150-0001 東京都..." → postalCode: "150-0001", prefecture: "東京都"\n\n' +
        '【企業基本情報】\n' +
        '- "設立：2010年4月" → establishedYear: 2010\n' +
        '- "創業2015年" → establishedYear: 2015\n' +
        '- "資本金：1,000万円" → capital: "1,000万円"\n' +
        '- "資本金1億円" → capital: "1億円"\n' +
        '- "従業員数：50名" → employees: 50\n' +
        '- "社員数100人" → employees: 100\n\n' +
        '【事業内容】\n' +
        '- "事業内容：健康診断やストレスチェック..." → industryLarge: "医療・福祉", industryMedium: "健康管理サービス"\n' +
        '- "営業支援・営業代行サービス" → industryLarge: "サービス業", industryMedium: "営業支援サービス"\n' +
        '- "ソフトウェア開発" → industryLarge: "情報通信業", industryMedium: "ソフトウェア業"\n\n' +
        '【代表者情報】\n' +
        '- "代表取締役社長：山田太郎" → representativeName: "山田太郎", representativeTitle: "代表取締役社長"\n' +
        '- "CEO 田中花子" → representativeName: "田中花子", representativeTitle: "CEO"\n\n' +
        '**電話番号からの地域推測ルール**:\n' +
        '- 03: 東京都\n' +
        '- 06: 大阪府\n' +
        '- 052: 愛知県名古屋市\n' +
        '- 045: 神奈川県横浜市\n' +
        '- 075: 京都府京都市\n' +
        '- 092: 福岡県福岡市\n' +
        '- 011: 北海道札幌市\n' +
        '- 022: 宮城県仙台市\n' +
        '- 050: IP電話（地域不明）\n' +
        '- 070/080/090: 携帯電話（地域不明）\n\n' +
        '**重要な抽出ルール**:\n' +
        '1. 検索結果に記載されているすべての情報を見逃さない\n' +
        '2. 求人サイトの情報も企業情報源として活用（給与情報は除く）\n' +
        '3. 電話番号から都道府県を推測（075→京都府、050→地域不明）\n' +
        '4. 事業内容から業種を判断\n' +
        '5. 空欄を恐れず、見つからない情報は空文字にする\n\n' +
        '抽出するJSONフィールド:\n' +
        '【基本情報】\n' +
        '- companyName: 企業名（「株式会社」「有限会社」などを含む正式名称）\n' +
        '- officialName: 正式企業名（英語名がある場合は日本語名を優先）\n' +
        '- phone: 電話番号（ハイフンありの形式で、例: 03-1234-5678）\n' +
        '- industryLarge: 業種大分類（「製造業」「サービス業」「建設業」「情報通信業」など）\n' +
        '- industryMedium: 業種中分類（より具体的な業種）\n' +
        '- employees: 従業員数（数値のみ、例: 1000、不明な場合は推測値でも可）\n' +
        '- establishedYear: 設立年（西暦年、例: 1950、不明な場合は推測値でも可）\n' +
        '- capital: 資本金（「100億円」「1,000万円」など単位を含む、不明な場合は「非公開」）\n' +
        '- listingStatus: 上場区分（「東証プライム」「東証スタンダード」「非上場」など、不明な場合は「非上場」と推測）\n' +
        '- postalCode: 本社郵便番号（「123-4567」形式、電話番号から推測可能な場合は推測）\n' +
        '- prefecture: 本社都道府県（電話番号の市外局番から推測可能）\n' +
        '- city: 本社市区町村（電話番号から推測可能な場合は推測）\n' +
        '- addressDetail: 本社住所詳細（番地、ビル名、階数など）\n' +
        '- representativeName: 代表者名（社長、CEO、代表取締役の氏名）\n' +
        '- representativeTitle: 代表者役職（「代表取締役社長」「CEO」など、不明な場合は「代表取締役」と推測）\n' +
        '- philosophy: 企業理念（企業理念、ミッション、ビジョン、経営方針など）\n' +
        '- latestNews: 最新ニュース（最近のプレスリリース、発表、ニュースなど）\n' +
        '- recruitmentStatus: 採用状況（「新卒採用実施中」「中途採用あり」「通年採用」など、不明な場合は「不明」）\n' +
        '- website: 企業URL（公式ホームページのURL）\n' +
        '- reliabilityScore: 信頼性スコア（1-100、情報の完全性と信頼性に基づく）\n\n' +
        '【支店情報】- 最重要項目\n' +
        '- branches: 支店情報の配列（**検索結果に支店情報があれば絶対に空配列にしないでください**）\n\n' +
        '**フィールド記入ルール**:\n' +
        '1. 明確に記載されている情報 → 積極的に抽出して記入\n' +
        '2. 文脈から合理的に判断できる情報 → 抽出して記入\n' +
        '3. 電話番号から都道府県が特定できる場合 → prefecture に記入\n' +
        '4. 業界・業種が明確な場合 → industryLarge/industryMedium に記入\n' +
        '5. 上場区分の記載がない場合 → 「非上場」と記入\n' +
        '6. 曖昧な情報や推測 → 空文字("")またはnull\n\n' +
        '**抽出の重要なルール**:\n' +
        '- 検索結果に記載されている情報は積極的に抽出\n' +
        '- 文脈から合理的に判断できる情報も抽出\n' +
        '- 電話番号は必ずハイフン区切りで統一\n' +
        '- 根拠のない推測は避ける\n' +
        '- 信頼性スコアは抽出できた情報の量と質に基づいて設定（多くの情報を抽出できた場合は高く）\n\n' +
        '回答例（バランス重視）:\n' +
        '{"companyName":"株式会社サンプル","officialName":"株式会社サンプル","phone":"03-1234-5678","industryLarge":"情報通信業","industryMedium":"ソフトウェア業","employees":50,"establishedYear":2010,"capital":"1,000万円","listingStatus":"非上場","postalCode":"150-0001","prefecture":"東京都","city":"渋谷区","addressDetail":"渋谷1-1-1","representativeName":"山田太郎","representativeTitle":"代表取締役","philosophy":"","latestNews":"","recruitmentStatus":"","website":"https://sample.co.jp","reliabilityScore":75,"branches":[]}';

              var userPrompt = '企業名: ' + companyName + '\n' +
          (phoneNumber ? '参考電話番号: ' + phoneNumber + '\n' : '') + '\n' +
          '検索結果:\n' + context + '\n\n' +
          '上記の検索結果を詳細に読み、企業の基本情報をJSONで抽出してください。\n\n' +
          '**抽出指示**:\n' +
          '1. 各検索結果を丁寧に読み、企業情報を探してください\n' +
          '2. 例えば「本社住所：京都府京都市中京区」という記載があれば、prefecture: "京都府", city: "京都市中京区"として抽出\n' +
          '3. 「事業内容：健康診断やストレスチェック」という記載があれば、industryLarge: "医療・福祉"として抽出\n' +
          '4. 検索結果に明確に記載されている情報はすべて抽出してください\n' +
          '5. 見つからない情報は空文字("")またはnullにしてください';

      var messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      var requestData = buildChatRequest(messages, {
        temperature: 0.1,
        max_tokens: 4000,
        model: 'gpt-4o'  // より強力なモデルに変更
      });

      Logger.logDebug('Sending OpenAI request for: ' + companyName);

      var response = ApiBase.post(_baseUrl + '/chat/completions', requestData, {
        headers: buildHeaders(),
        timeout: ConfigManager.getNumber('EXTRACTION_TIMEOUT_MS', 60000)
      });

      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error('Invalid OpenAI response structure');
      }

      var content = response.choices[0].message.content;
      Logger.logDebug('OpenAI response received for: ' + companyName);
      
      // レスポンス内容を詳細にログ出力
      Logger.logDebug('Raw OpenAI response content', {
        companyName: companyName,
        responseLength: response.choices[0].message.content.length,
        responsePreview: response.choices[0].message.content.substring(0, 500) + '...'
      });

      var extractedData = parseCompanyInfo(content);
      
      if (extractedData) {
        Logger.logInfo('Company info extraction successful: ' + companyName, {
          fieldsExtracted: Object.keys(extractedData).length,
          hasPhone: !!extractedData.phone,
          hasBranches: extractedData.branches && extractedData.branches.length > 0,
          branchCount: extractedData.branches ? extractedData.branches.length : 0
        });

        // 抽出されたデータの詳細をログ出力
        Logger.logDebug('Detailed extracted data for: ' + companyName, {
          companyName: extractedData.companyName,
          phone: extractedData.phone,
          industryLarge: extractedData.industryLarge,
          industryMedium: extractedData.industryMedium,
          employees: extractedData.employees,
          establishedYear: extractedData.establishedYear,
          capital: extractedData.capital,
          prefecture: extractedData.prefecture,
          city: extractedData.city,
          representativeName: extractedData.representativeName,
          reliabilityScore: extractedData.reliabilityScore
        });

        // 支店情報の詳細ログ
        if (extractedData.branches && Array.isArray(extractedData.branches) && extractedData.branches.length > 0) {
          Logger.logInfo('支店情報抽出成功: ' + companyName + ' (' + extractedData.branches.length + '件)');
          extractedData.branches.forEach(function(branch, index) {
            Logger.logDebug('支店' + (index + 1) + ': ' + 
              (branch.name || '名称不明') + ' (' + (branch.type || 'タイプ不明') + ')');
          });
        } else {
          Logger.logWarning('支店情報抽出結果: ' + companyName + ' (支店情報なし)');
        }

        return {
          success: true,
          data: extractedData,
          usage: response.usage,
          model: requestData.model
        };
      } else {
        Logger.logError('OpenAI JSON解析失敗: ' + companyName + ' - ' + extractedData.error);
        Logger.logDebug('解析失敗した生レスポンス: ' + content);
        return {
          success: false,
          error: extractedData.error,
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