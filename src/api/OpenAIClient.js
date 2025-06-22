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

      // Build context from search results with basic length limiting
      var context = '';
      if (searchResults && searchResults.results) {
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

      var systemPrompt = 
        'あなたは企業情報抽出の専門家です。提供された検索結果から、企業の基本情報を正確に抽出してください。\n\n' +
        '**最重要タスク**: 以下の情報は絶対に見落とさずに抽出してください:\n' +
        '1. 電話番号: 「代表」「本社」「お問い合わせ」「TEL」「電話」のキーワードと共に記載された番号を最優先で抽出\n' +
        '2. 支店情報: 「支店」「営業所」「事業所」「支社」「拠点」「オフィス」「工場」「店舗」のキーワードと共に記載された拠点情報を**必ず全て**抽出\n\n' +
        '**支店情報抽出の特別指示**:\n' +
        '- 検索結果を3回読み返して、見落としがないか確認してください\n' +
        '- 「○○支店」「○○営業所」「○○事業所」「○○オフィス」などの表記を全て探してください\n' +
        '- 地名＋「支店」「営業所」「事業所」「支社」「拠点」「オフィス」の組み合わせを見逃さないでください\n' +
        '- 支店一覧、営業所案内、事業所情報、拠点案内、アクセス情報のセクションを重点的に確認してください\n' +
        '- 1つでも支店情報が見つかった場合は、branchesフィールドに必ず含めてください\n\n' +
        '抽出するJSONフィールド:\n' +
        '【基本情報】\n' +
        '- companyName: 企業名（「株式会社」「有限会社」などを含む正式名称）\n' +
        '- officialName: 正式企業名（英語名がある場合は日本語名を優先）\n' +
        '- phone: 電話番号（ハイフンありの形式で、例: 03-1234-5678）\n' +
        '- industryLarge: 業種大分類（「製造業」「サービス業」「建設業」など）\n' +
        '- industryMedium: 業種中分類（より具体的な業種）\n' +
        '- employees: 従業員数（数値のみ、例: 1000）\n' +
        '- establishedYear: 設立年（西暦年、例: 1950）\n' +
        '- capital: 資本金（「100億円」「1,000万円」など単位を含む）\n' +
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
        '【支店情報】- 最重要項目\n' +
        '- branches: 支店情報の配列（**検索結果に支店情報があれば絶対に空配列にしないでください**）\n' +
        '  支店情報抽出の優先順位:\n' +
        '  1. 「○○支店」「○○営業所」「○○事業所」「○○支社」「○○拠点」\n' +
        '  2. 「○○オフィス」「○○センター」「○○工場」\n' +
        '  3. 地名＋「店」「所」「社」「部」の組み合わせ\n' +
        '  \n' +
        '  各支店の情報:\n' +
        '  - name: 支店名（「東京支店」「大阪営業所」「札幌事業所」など、必須）\n' +
        '  - type: 支店種別（「支店」「営業所」「事業所」「支社」「工場」「拠点」など、必須）\n' +
        '  - phone: 支店電話番号（ハイフンありの形式で、なければ空文字）\n' +
        '  - postalCode: 支店郵便番号（「123-4567」形式、なければ空文字）\n' +
        '  - prefecture: 支店都道府県（なければ空文字）\n' +
        '  - city: 支店市区町村（なければ空文字）\n' +
        '  - addressDetail: 支店住所詳細（なければ空文字）\n' +
        '  - employees: 支店従業員数（数値のみ、なければnull）\n' +
        '  - businessHours: 営業時間（なければ空文字）\n' +
        '  - notes: 備考・特記事項（なければ空文字）\n\n' +
        '**重要**: 支店情報の判定ルール:\n' +
        '1. 支店情報が1つでも見つかった場合、branchesは空配列[]ではなく、見つかった支店を含む配列にしてください\n' +
        '2. 支店名だけでも分かれば、他の情報が不完全でも必ずbranchesに含めてください\n' +
        '3. 本社のみの企業の場合は、空配列[]を返してください\n' +
        '4. 検索結果に明確な支店情報がない場合は、無理に作らず空配列[]を返してください\n\n' +
        '**抽出の重要なルール**:\n' +
        '1. 電話番号抽出:\n' +
        '   - 「代表電話」「本社TEL」「お問い合わせ」「電話番号」などのキーワードと共に記載された番号を優先\n' +
        '   - 03-XXXX-XXXX、06-XXXX-XXXX、0120-XXX-XXXなどの形式を探す\n' +
        '   - 複数ある場合は「代表」「本社」が含まれるものを選択\n' +
        '2. 支店情報抽出（最重要）:\n' +
        '   - 検索結果全体を最低3回読み返して支店情報を探してください\n' +
        '   - 「支店一覧」「営業所案内」「事業所情報」「拠点案内」「アクセス」「所在地」などのセクションを重点的に確認\n' +
        '   - 地名＋「支店」「営業所」「事業所」「支社」「拠点」「オフィス」「センター」の組み合わせを全て探す\n' +
        '   - 「東京」「大阪」「名古屋」「福岡」「札幌」「仙台」「広島」などの主要都市名と組み合わせた表記を特に注意深く探す\n' +
        '   - 住所情報の中にも支店名が含まれていることがあるので注意深く確認\n' +
        '   - 小売店舗、販売店、ショールーム、ショップは除外\n' +
        '   - B2B営業の対象となる拠点のみを抽出\n' +
        '   - **重要判定**: 本社以外に営業拠点がない企業も多数存在します。明確な支店情報がない場合は無理に作らず、空配列を返してください\n' +
        '   - 支店情報が見つからない場合でも、「branches: []」として空配列を必ず含めてください\n' +
        '3. 住所分解:\n' +
        '   - 郵便番号、都道府県、市区町村、詳細を正確に分けて抽出\n' +
        '4. 信頼性評価:\n' +
        '   - 電話番号がある: +20点\n' +
        '   - 支店情報がある: +15点\n' +
        '   - 代表者情報がある: +10点\n' +
        '   - 基本情報の完全性で残りを評価\n\n' +
        '**注意事項**:\n' +
        '- 情報が見つからない場合は null を設定\n' +
        '- 支店情報が見つからない場合は空の配列 [] を設定\n' +
        '- 電話番号は必ずハイフン区切りで統一\n' +
        '- 不確実な情報は含めない\n\n' +
        '回答例:\n' +
        '{"companyName":"アフラック生命保険株式会社","officialName":"アフラック生命保険株式会社","phone":"03-6833-1111","industryLarge":"金融・保険業","industryMedium":"生命保険業","employees":4500,"establishedYear":1974,"capital":"100億円","listingStatus":"非上場","postalCode":"163-0456","prefecture":"東京都","city":"新宿区","addressDetail":"西新宿2-1-1 新宿三井ビルディング","representativeName":"古出 眞敏","representativeTitle":"代表取締役社長","philosophy":"「生きるための保険」を通じて、お客様の人生に寄り添う","latestNews":"2024年新商品発売","recruitmentStatus":"新卒・中途採用実施中","website":"https://www.aflac.co.jp","reliabilityScore":95,"branches":[{"name":"大阪支社","type":"支社","phone":"06-1234-5678","postalCode":"530-0001","prefecture":"大阪府","city":"大阪市北区","addressDetail":"梅田1-1-1","employees":200,"businessHours":"9:00-17:00","notes":"関西エリア統括"},{"name":"名古屋営業所","type":"営業所","phone":"052-1234-5678","postalCode":"460-0001","prefecture":"愛知県","city":"名古屋市中区","addressDetail":"栄1-1-1","employees":50,"businessHours":"9:00-17:00","notes":"中部エリア担当"}]}';

      var userPrompt = '企業名: ' + companyName + '\n' +
        (phoneNumber ? '参考電話番号: ' + phoneNumber + '\n' : '') + '\n' +
        '検索結果:\n' + context + '\n\n' +
        '上記の検索結果から、企業の基本情報と支店情報をJSONで抽出してください。\n' +
        '**特に電話番号と支店情報の抽出に注意を払ってください。**';

      var messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      var requestData = buildChatRequest(messages, {
        temperature: 0.1,
        max_tokens: 4000,
        model: 'gpt-4o-mini'
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

      var parsed = parseCompanyInfo(content);
      
      if (parsed.success) {
        Logger.logInfo('Company info extraction successful: ' + companyName, {
          fieldsExtracted: Object.keys(parsed.data).length,
          hasPhone: !!parsed.data.phone,
          hasBranches: parsed.data.branches && parsed.data.branches.length > 0,
          branchCount: parsed.data.branches ? parsed.data.branches.length : 0
        });

        // 支店情報の詳細ログ
        if (parsed.data.branches && Array.isArray(parsed.data.branches) && parsed.data.branches.length > 0) {
          Logger.logInfo('支店情報抽出成功: ' + companyName + ' (' + parsed.data.branches.length + '件)');
          parsed.data.branches.forEach(function(branch, index) {
            Logger.logDebug('支店' + (index + 1) + ': ' + 
              (branch.name || '名称不明') + ' (' + (branch.type || 'タイプ不明') + ')');
          });
        } else {
          Logger.logWarning('支店情報抽出結果: ' + companyName + ' (支店情報なし)');
        }

        return {
          success: true,
          data: parsed.data,
          usage: response.usage,
          model: requestData.model
        };
      } else {
        Logger.logError('OpenAI JSON解析失敗: ' + companyName + ' - ' + parsed.error);
        Logger.logDebug('解析失敗した生レスポンス: ' + content);
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