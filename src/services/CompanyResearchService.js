function CompanyResearchService() {
  
  /**
   * 企業情報を研究・収集するメイン関数
   * @param {string} companyName - 企業名
   * @param {string} phoneNumber - 電話番号（オプション）
   * @returns {Object} 研究結果
   */
  function researchCompany(companyName, phoneNumber) {
    var startTime = Date.now(); // 処理開始時間を記録
    
    try {
      Logger.logInfo('Starting company research for: ' + companyName, {
        phoneNumber: phoneNumber
      });

      // 1. 検索実行（改善されたマルチクエリ検索）
      var searchResults = performEnhancedSearch(companyName, phoneNumber);
      
      // 2. 検索結果の検証（緩和された基準）
      var validationResult = validateSearchResults(searchResults, companyName);
      if (!validationResult.isValid) {
        Logger.logWarning('Search results validation failed for: ' + companyName, validationResult);
        // 検索結果が少なくても処理を継続
      }

      // 3. AI分析実行（改善されたプロンプト）
      var extractedData = performAIAnalysis(companyName, phoneNumber, searchResults);
      
      // 4. 最新ニュースと採用情報の検索・サマリー生成
      var newsAndRecruitmentData = searchNewsAndRecruitment(companyName, extractedData);
      
      // 5. データ品質向上処理
      var enhancedData = enhanceDataQuality(extractedData, companyName, phoneNumber);
      
      // 6. ニュースと採用情報をマージ
      enhancedData.latestNews = newsAndRecruitmentData.newsSummary;
      enhancedData.recruitmentStatus = newsAndRecruitmentData.recruitmentSummary;
      
      // 7. 結果の検証と最終処理
      var finalResult = finalizeBatchResult(enhancedData, searchResults);
      
      // 処理結果のサマリー
      Logger.logInfo('企業情報抽出完了', {
        companyName: finalResult.companyName,
        sourceCount: searchResults.length,
        reliabilityScore: finalResult.reliabilityScore,
        newsCount: finalResult.latestNews ? 1 : 0,
        recruitmentCount: finalResult.recruitmentStatus ? 1 : 0,
        processingTimeMs: Date.now() - startTime
      });

      return {
        success: true,
        data: finalResult,
        searchResults: searchResults,
        message: 'Research completed successfully'
      };

    } catch (error) {
      Logger.logError('Company research failed for: ' + companyName, error);
      
      return {
        success: false,
        data: null,
        error: error.message || error.toString(),
        message: 'Research failed: ' + (error.message || error.toString())
      };
    }
  }

  /**
   * 改善されたマルチクエリ検索を実行
   */
  function performEnhancedSearch(companyName, phoneNumber) {
    try {
      var searchOptions = {
        max_results: 10, // 品質重視で結果数を適正化
        search_depth: 'advanced',
        include_answer: false,
        include_raw_content: true,
        phoneNumber: phoneNumber // 電話番号を直接渡す
      };

      var searchResults = TavilyClient.searchCompany(companyName, searchOptions);
      
      if (!searchResults.success || !searchResults.results) {
        throw new Error('Search failed or returned no results');
      }

      Logger.logInfo('Enhanced search completed', {
        companyName: companyName,
        resultCount: searchResults.results.length,
        totalQueries: searchResults.queriesExecuted || 1
      });

      return searchResults;

    } catch (error) {
      Logger.logError('Enhanced search failed for: ' + companyName, error);
      throw error;
    }
  }

  /**
   * 検索結果の検証（緩和された基準）
   */
  function validateSearchResults(searchResults, companyName) {
    if (!searchResults || !searchResults.results) {
      return {
        isValid: false,
        reason: 'No search results available'
      };
    }

    var results = searchResults.results;
    var totalContentLength = results.reduce(function(sum, result) {
      return sum + (result.content ? result.content.length : 0);
    }, 0);

    // 緩和された検証基準
    var minResults = 1; // 最低1件
    var minContentLength = 50; // 最低50文字

    if (results.length < minResults) {
      return {
        isValid: false,
        reason: 'Insufficient search results: ' + results.length + ' (minimum: ' + minResults + ')'
      };
    }

    if (totalContentLength < minContentLength) {
      return {
        isValid: false,
        reason: 'Insufficient content length: ' + totalContentLength + ' (minimum: ' + minContentLength + ')'
      };
    }

    return {
      isValid: true,
      resultCount: results.length,
      contentLength: totalContentLength
    };
  }

  /**
   * AI分析実行（改善されたプロンプト使用）
   */
  function performAIAnalysis(companyName, phoneNumber, searchResults) {
    try {
      // 検索結果をコンテキストに変換
      var context = buildSearchContext(searchResults.results);
      
      Logger.logDebug('AI analysis context prepared', {
        companyName: companyName,
        contextLength: context.length,
        resultCount: searchResults.results.length
      });

      // OpenAI分析実行（改善されたプロンプト使用）
      var analysisResult = OpenAIClient.extractCompanyInfo(companyName, context, phoneNumber);
      
      if (!analysisResult.success) {
        throw new Error('AI analysis failed: ' + analysisResult.error);
      }

      var extractedData = analysisResult.data;
      
      // ソースURL情報を追加
      extractedData.sourceUrls = analysisResult.sourceUrls || [];
      extractedData.officialSiteUrl = analysisResult.officialSiteUrl || '';
      extractedData.primarySourceUrl = analysisResult.primarySourceUrl || '';
      
      Logger.logInfo('AI analysis completed', {
        companyName: companyName,
        fieldsExtracted: Object.keys(extractedData).filter(function(key) {
          return extractedData[key] !== null && extractedData[key] !== '' && extractedData[key] !== undefined;
        }).length,
        reliabilityScore: extractedData.reliabilityScore,
        sourceUrlCount: extractedData.sourceUrls.length,
        officialSiteFound: !!extractedData.officialSiteUrl
      });

      return extractedData;

    } catch (error) {
      Logger.logError('AI analysis failed for: ' + companyName, error);
      throw error;
    }
  }

  /**
   * 検索結果からコンテキストを構築（コンテキスト長制限付き）
   */
  function buildSearchContext(results) {
    if (!results || results.length === 0) {
      return '';
    }

    // コンテキスト長制限（約80,000文字 = 約100,000トークン相当、安全マージン込み）
    var MAX_CONTEXT_LENGTH = 80000;
    var MAX_RESULT_LENGTH = 8000; // 1つの検索結果あたりの最大長
    var currentLength = 0;
    var processedResults = [];

    // 検索結果の概要をログ出力
    Logger.logDebug('Building search context from results', {
      resultCount: results.length,
      totalContentLength: results.reduce(function(sum, r) { return sum + (r.content ? r.content.length : 0); }, 0),
      urls: results.slice(0, 5).map(function(r) { return r.url; })
    });

    // 最初の結果の内容をサンプルとしてログ出力（デバッグ用）
    if (results.length > 0 && results[0].content) {
      Logger.logDebug('Sample search result content', {
        url: results[0].url,
        title: results[0].title,
        contentPreview: results[0].content.substring(0, 500) + '...'
      });
    }

    // 検索結果を処理（公式サイトを優先）
    var sortedResults = results.slice().sort(function(a, b) {
      if (a.isOfficial && !b.isOfficial) return -1;
      if (!a.isOfficial && b.isOfficial) return 1;
      return 0;
    });

    for (var i = 0; i < sortedResults.length; i++) {
      var result = sortedResults[i];
      var content = result.content || '';
      var title = result.title || '';
      var url = result.url || '';
      
      // 公式サイトかどうかを明示
      var siteType = result.isOfficial ? '[公式サイト] ' : '';
      
      // コンテンツ長を制限
      if (content.length > MAX_RESULT_LENGTH) {
        // 重要な情報が含まれやすい前半部分を優先的に保持
        content = content.substring(0, MAX_RESULT_LENGTH) + '...[内容省略]';
      }
      
      var resultText = '=== 検索結果 ' + (i + 1) + ' ' + siteType + '===\n' +
                      'タイトル: ' + title + '\n' +
                      'URL: ' + url + '\n' +
                      'コンテンツ:\n' + content + '\n';
      
      // コンテキスト長制限チェック
      if (currentLength + resultText.length > MAX_CONTEXT_LENGTH) {
        Logger.logInfo('コンテキスト長制限により検索結果を切り詰めました', {
          originalResults: results.length,
          processedResults: processedResults.length,
          finalContextLength: currentLength,
          maxContextLength: MAX_CONTEXT_LENGTH
        });
        break;
      }
      
      processedResults.push(resultText);
      currentLength += resultText.length;
    }

    var finalContext = processedResults.join('\n');
    
    Logger.logInfo('Search context built successfully', {
      originalResults: results.length,
      processedResults: processedResults.length,
      finalContextLength: finalContext.length,
      compressionRatio: Math.round((finalContext.length / results.reduce(function(sum, r) { 
        return sum + (r.content ? r.content.length : 0); 
      }, 0)) * 100) + '%'
    });

    return finalContext;
  }

  /**
   * データ品質向上処理
   */
  function enhanceDataQuality(extractedData, companyName, phoneNumber) {
    try {
      var enhanced = Object.assign({}, extractedData);
      
      // 基本情報の補完
      if (!enhanced.companyName && companyName) {
        enhanced.companyName = companyName;
      }
      
      if (!enhanced.officialName && companyName) {
        enhanced.officialName = companyName;
      }

      // 電話番号の処理
      if (phoneNumber && typeof phoneNumber === 'number') {
        phoneNumber = phoneNumber.toString();
      }
      
      if (phoneNumber && !enhanced.phone) {
        enhanced.phone = formatPhoneNumber(phoneNumber);
      }

      // 電話番号から地域情報を推測（確実な場合のみ）
      if (enhanced.phone && !enhanced.prefecture) {
        var locationInfo = inferLocationFromPhone(enhanced.phone);
        if (locationInfo.prefecture && locationInfo.prefecture !== '不明') {
          enhanced.prefecture = locationInfo.prefecture;
          if (locationInfo.city && !enhanced.city) {
            enhanced.city = locationInfo.city;
          }
        }
      }

      // 電話番号から地域情報を補完（OpenAIが抽出できなかった場合のみ）
      if (enhanced.phone && !enhanced.prefecture) {
        var locationInfo = inferLocationFromPhone(enhanced.phone);
        if (locationInfo.prefecture && locationInfo.prefecture !== '不明') {
          enhanced.prefecture = locationInfo.prefecture;
          if (locationInfo.city && !enhanced.city) {
            enhanced.city = locationInfo.city;
          }
        }
      }

      // デフォルト値の設定（最小限）
      if (!enhanced.listingStatus) {
        enhanced.listingStatus = '非上場';  // これは一般的事実
      }

      // 信頼性スコアの調整（事実重視）
      if (enhanced.reliabilityScore) {
        // 推測を減らしたので、実際の抽出情報に基づくスコアを維持
        enhanced.reliabilityScore = enhanced.reliabilityScore;
      } else {
        // スコアが未設定の場合は低めに設定
        enhanced.reliabilityScore = 20;
      }



      return enhanced;

    } catch (error) {
      Logger.logError('Data quality enhancement failed', error);
      return extractedData; // 元のデータを返す
    }
  }

  /**
   * 電話番号から地域情報を推測
   */
  function inferLocationFromPhone(phoneNumber) {
    if (!phoneNumber) return {};
    
    var phone = phoneNumber.replace(/[-\s]/g, '');
    
    var areaCodeMap = {
      '03': { prefecture: '東京都', city: '' },
      '06': { prefecture: '大阪府', city: '' },
      '052': { prefecture: '愛知県', city: '名古屋市' },
      '045': { prefecture: '神奈川県', city: '横浜市' },
      '075': { prefecture: '京都府', city: '京都市' },
      '092': { prefecture: '福岡県', city: '福岡市' },
      '011': { prefecture: '北海道', city: '札幌市' },
      '022': { prefecture: '宮城県', city: '仙台市' }
    };

    for (var areaCode in areaCodeMap) {
      if (phone.startsWith(areaCode)) {
        return areaCodeMap[areaCode];
      }
    }

    return {};
  }

  /**
   * 企業名から業種を推測
   */
  function inferIndustryFromName(companyName) {
    if (!companyName) return {};
    
    var name = companyName.toLowerCase();
    
    var industryMap = [
      { keywords: ['システム', 'it', 'テック', 'ソフト', 'プログラム'], large: '情報通信業', medium: 'ソフトウェア業' },
      { keywords: ['コンサル', 'アドバイザー', 'コンサルティング'], large: '専門・技術サービス業', medium: 'コンサルティング業' },
      { keywords: ['商事', 'トレーディング', '商社'], large: '卸売業', medium: '総合商社' },
      { keywords: ['サービス'], large: 'サービス業', medium: 'その他サービス業' },
      { keywords: ['エネルギー', '電力', 'エナジー', 'energy'], large: '電気・ガス・熱供給・水道業', medium: '電気業' },
      { keywords: ['建設', '建築', '工務'], large: '建設業', medium: '総合建設業' },
      { keywords: ['製造', '工業', 'manufacturing'], large: '製造業', medium: 'その他製造業' }
    ];

    for (var i = 0; i < industryMap.length; i++) {
      var industry = industryMap[i];
      for (var j = 0; j < industry.keywords.length; j++) {
        if (name.indexOf(industry.keywords[j]) !== -1) {
          return { large: industry.large, medium: industry.medium };
        }
      }
    }

    return {};
  }

  /**
   * 業種に基づく従業員数推測
   */
  function estimateEmployeeCount(industryLarge) {
    var estimateMap = {
      '情報通信業': 25,
      '専門・技術サービス業': 15,
      'サービス業': 30,
      '電気・ガス・熱供給・水道業': 50,
      '建設業': 40,
      '製造業': 60,
      '卸売業': 35
    };

    return estimateMap[industryLarge] || 25;
  }

  /**
   * 電話番号のフォーマット
   */
  function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    
    var phone = phoneNumber.toString().replace(/[-\s]/g, '');
    
    // 一般的なフォーマットに変換
    if (phone.match(/^0\d{9,10}$/)) {
      if (phone.length === 10) {
        return phone.substring(0, 2) + '-' + phone.substring(2, 6) + '-' + phone.substring(6);
      } else if (phone.length === 11) {
        return phone.substring(0, 3) + '-' + phone.substring(3, 7) + '-' + phone.substring(7);
      }
    }
    
    return phone;
  }

  /**
   * バッチ結果の最終処理
   */
  function finalizeBatchResult(extractedData, searchResults) {
    try {
      var result = Object.assign({}, extractedData);
      
      // 必須フィールドの確認
      var requiredFields = ['companyName', 'officialName'];
      requiredFields.forEach(function(field) {
        if (!result[field]) {
          result[field] = '';
        }
      });

      // 数値フィールドの処理
      if (result.reliabilityScore && typeof result.reliabilityScore === 'string') {
        var score = parseFloat(result.reliabilityScore);
        result.reliabilityScore = isNaN(score) ? 20 : score;
      }

      if (result.employees && typeof result.employees === 'string') {
        var employees = parseInt(result.employees);
        result.employees = isNaN(employees) ? null : employees;
      }

      if (result.establishedYear && typeof result.establishedYear === 'string') {
        var year = parseInt(result.establishedYear);
        result.establishedYear = isNaN(year) ? null : year;
      }



      return result;

    } catch (error) {
      Logger.logError('Batch result finalization failed', error);
      return extractedData;
    }
  }

  /**
   * 最新ニュースと採用情報を検索してサマリーを生成
   */
  function searchNewsAndRecruitment(companyName, extractedData) {
    try {
      Logger.logInfo('Searching news and recruitment info for: ' + companyName);
      
      var result = {
        newsSummary: '',
        recruitmentSummary: ''
      };
      
      // 並列で検索を実行
      var newsSearch = null;
      var recruitmentSearch = null;
      
      try {
        // 最新ニュースの検索
        newsSearch = TavilyClient.searchLatestNews(companyName);
      } catch (error) {
        Logger.logWarning('News search failed for: ' + companyName, error);
      }
      
      try {
        // 採用情報の検索
        recruitmentSearch = TavilyClient.searchRecruitmentInfo(companyName);
      } catch (error) {
        Logger.logWarning('Recruitment search failed for: ' + companyName, error);
      }
      
      // ニュースのサマリー生成
      if (newsSearch && newsSearch.success && newsSearch.results.length > 0) {
        result.newsSummary = generateNewsSummary(newsSearch.results, companyName);
      }
      
      // 採用情報のサマリー生成
      if (recruitmentSearch && recruitmentSearch.success && recruitmentSearch.results.length > 0) {
        result.recruitmentSummary = generateRecruitmentSummary(recruitmentSearch.results, companyName);
      }
      
      Logger.logInfo('News and recruitment search completed for: ' + companyName, {
        hasNews: !!result.newsSummary,
        hasRecruitment: !!result.recruitmentSummary
      });
      
      return result;
      
    } catch (error) {
      Logger.logError('News and recruitment search failed for: ' + companyName, error);
      return {
        newsSummary: '',
        recruitmentSummary: ''
      };
    }
  }
  
  /**
   * 最新ニュース検索結果からサマリーを生成
   */
  function generateNewsSummary(newsResults, companyName) {
    try {
      if (!newsResults || newsResults.length === 0) {
        return '';
      }
      
      // 最大3件のニュースを取得（公式サイトを優先）
      var topNews = newsResults.slice(0, 3);
      
      // OpenAIでサマリー生成
      var newsContext = topNews.map(function(news, index) {
        var label = news.isOfficial ? '【公式発表】' : '【ニュース' + (index + 1) + '】';
        return label + '\n' +
               'タイトル: ' + news.title + '\n' +
               '内容: ' + (news.content ? news.content.substring(0, 400) + '...' : '') + '\n' +
               'URL: ' + news.url;
      }).join('\n\n');
      
      var summaryResult = OpenAIClient.generateNewsSummary(companyName, newsContext);
      
      if (summaryResult.success && summaryResult.summary) {
        // サマリーに参照URLを追加
        var summaryWithUrls = summaryResult.summary;
        
        // 公式サイトのURLを優先して表示
        var officialUrls = topNews.filter(function(news) { return news.isOfficial; }).map(function(news) { return news.url; });
        var otherUrls = topNews.filter(function(news) { return !news.isOfficial; }).map(function(news) { return news.url; });
        
        var allUrls = officialUrls.concat(otherUrls).filter(function(url) { return url; });
        
        if (allUrls.length > 0) {
          summaryWithUrls += '\n\n【参照URL】';
          allUrls.forEach(function(url, index) {
            var prefix = officialUrls.indexOf(url) !== -1 ? '[公式] ' : '';
            summaryWithUrls += '\n' + prefix + url;
          });
        }
        
        return summaryWithUrls;
      }
      
      // OpenAIが失敗した場合の簡易サマリー
      var fallbackSummary = '最新ニュース: ';
      var officialNews = topNews.find(function(news) { return news.isOfficial; });
      
      if (officialNews) {
        fallbackSummary += officialNews.title;
        fallbackSummary += '\n\n【参照URL】\n[公式] ' + officialNews.url;
      } else if (topNews[0]) {
        fallbackSummary += topNews[0].title;
        fallbackSummary += '\n\n【参照URL】\n' + topNews[0].url;
      }
      
      return fallbackSummary;
      
    } catch (error) {
      Logger.logError('News summary generation failed', error);
      return '';
    }
  }
  
  /**
   * 採用情報検索結果からサマリーを生成
   */
  function generateRecruitmentSummary(recruitmentResults, companyName) {
    try {
      if (!recruitmentResults || recruitmentResults.length === 0) {
        return '';
      }
      
      // 最大3件の採用情報を取得（公式採用ページを優先）
      var topRecruitment = recruitmentResults.slice(0, 3);
      
      // OpenAIでサマリー生成
      var recruitmentContext = topRecruitment.map(function(rec, index) {
        var label = rec.isOfficialRecruitment ? '【公式採用ページ】' : '【採用情報' + (index + 1) + '】';
        return label + '\n' +
               'タイトル: ' + rec.title + '\n' +
               '内容: ' + (rec.content ? rec.content.substring(0, 400) + '...' : '') + '\n' +
               'URL: ' + rec.url;
      }).join('\n\n');
      
      var summaryResult = OpenAIClient.generateRecruitmentSummary(companyName, recruitmentContext);
      
      if (summaryResult.success && summaryResult.summary) {
        // サマリーに参照URLを追加
        var summaryWithUrls = summaryResult.summary;
        
        // 公式採用ページのURLを優先して表示
        var officialUrls = topRecruitment.filter(function(rec) { return rec.isOfficialRecruitment; }).map(function(rec) { return rec.url; });
        var otherUrls = topRecruitment.filter(function(rec) { return !rec.isOfficialRecruitment; }).map(function(rec) { return rec.url; });
        
        var allUrls = officialUrls.concat(otherUrls).filter(function(url) { return url; });
        
        if (allUrls.length > 0) {
          summaryWithUrls += '\n\n【参照URL】';
          allUrls.forEach(function(url, index) {
            var prefix = officialUrls.indexOf(url) !== -1 ? '[公式] ' : '';
            summaryWithUrls += '\n' + prefix + url;
          });
        }
        
        return summaryWithUrls;
      }
      
      // OpenAIが失敗した場合の簡易サマリー
      var fallbackSummary = '採用情報: ';
      var officialPage = topRecruitment.find(function(rec) { return rec.isOfficialRecruitment; });
      
      if (officialPage) {
        fallbackSummary += '採用ページあり';
        fallbackSummary += '\n\n【参照URL】\n[公式] ' + officialPage.url;
      } else if (topRecruitment[0]) {
        fallbackSummary += topRecruitment[0].title;
        fallbackSummary += '\n\n【参照URL】\n' + topRecruitment[0].url;
      }
      
      return fallbackSummary;
      
    } catch (error) {
      Logger.logError('Recruitment summary generation failed', error);
      return '';
    }
  }

  // 公開メソッド
  return {
    researchCompany: researchCompany
  };
}

// グローバルスコープに公開
var CompanyResearchService = CompanyResearchService(); 