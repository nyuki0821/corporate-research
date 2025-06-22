/**
 * @fileoverview Company research service for the Corporate Research System
 * @author Corporate Research Team
 * 
 * 依存モジュール:
 * - Logger (src/core/Logger.js)
 * - ConfigManager (src/core/ConfigManager.js)
 * - ErrorHandler (src/core/ErrorHandler.js)
 * - Constants (src/core/Constants.js)
 * - TavilyClient (src/api/TavilyClient.js)
 * - OpenAIClient (src/api/OpenAIClient.js)
 * - Company (src/models/Company.js)
 */

var CompanyResearchService = (function() {
  // Private variables
  var _researchCount = 0;
  var _researchStats = {
    successful: 0,
    failed: 0,
    avgDuration: 0,
    lastReset: new Date()
  };

  // Private functions
  /**
   * Generate unique company ID
   * @private
   */
  function generateCompanyId(companyName) {
    var timestamp = Date.now();
    var hash = companyName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return 'COMP_' + hash + '_' + timestamp;
  }

  /**
   * Normalize company name
   * @private
   */
  function normalizeCompanyName(companyName) {
    if (!companyName) return '';
    
    // Remove common company suffixes/prefixes for better search
    var normalized = companyName
      .replace(/株式会社|有限会社|合同会社|合資会社|合名会社/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return normalized;
  }

  /**
   * Validate search results
   * @private
   */
  function validateSearchResults(results, targetCompanyName) {
    if (!results || !results.results || results.results.length === 0) {
      return {
        isValid: false,
        reason: 'No search results found',
        confidence: 0
      };
    }

    var normalizedTarget = normalizeCompanyName(targetCompanyName).toLowerCase();
    var relevantResults = 0;
    var totalRelevance = 0;

    results.results.forEach(function(result) {
      var titleRelevance = 0;
      var contentRelevance = 0;

      // Check title relevance
      if (result.title && result.title.toLowerCase().indexOf(normalizedTarget) !== -1) {
        titleRelevance = 0.8;
      }

      // Check content relevance
      if (result.content && result.content.toLowerCase().indexOf(normalizedTarget) !== -1) {
        contentRelevance = 0.6;
      }

      var resultRelevance = Math.max(titleRelevance, contentRelevance);
      if (resultRelevance > 0) {
        relevantResults++;
        totalRelevance += resultRelevance;
      }
    });

    var confidence = relevantResults > 0 ? (totalRelevance / results.results.length) : 0;

    return {
      isValid: relevantResults > 0,
      confidence: confidence,
      relevantResults: relevantResults,
      totalResults: results.results.length,
      reason: relevantResults > 0 ? 'Valid results found' : 'No relevant results found'
    };
  }

  /**
   * Calculate reliability score
   * @private
   */
  function calculateReliabilityScore(companyData, searchValidation, extractionSuccess) {
    var baseScore = 50;
    var score = baseScore;

    // Search result validation impact (0-25 points)
    if (searchValidation.isValid) {
      score += Math.round(searchValidation.confidence * 25);
    }

    // Extraction success impact (0-15 points)
    if (extractionSuccess) {
      score += 15;
    }

    // Data completeness impact (0-10 points)
    var completenessFields = [
      'companyName', 'phone', 'industryLarge', 'employees', 
      'establishedYear', 'capital', 'prefecture', 'city'
    ];
    
    var completedFields = 0;
    completenessFields.forEach(function(field) {
      if (companyData[field] && companyData[field] !== null && companyData[field] !== '') {
        completedFields++;
      }
    });
    
    score += Math.round((completedFields / completenessFields.length) * 10);

    // Ensure score is within bounds
    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Update research statistics
   * @private
   */
  function updateStats(success, duration) {
    _researchCount++;
    
    if (success) {
      _researchStats.successful++;
    } else {
      _researchStats.failed++;
    }

    // Update average duration
    if (duration) {
      var totalDuration = _researchStats.avgDuration * (_researchCount - 1) + duration;
      _researchStats.avgDuration = totalDuration / _researchCount;
    }
  }

  /**
   * Create company object from extracted data
   * @private
   */
  function createCompanyObject(extractedData, companyId, sourceUrls) {
    // Check if Company model exists
    if (typeof Company === 'undefined') {
      // Fallback: create simple object
      Logger.logWarning('Company model not available, using simple object');
      return Object.assign({
        id: companyId,
        sourceUrls: sourceUrls || []
      }, extractedData);
    }

    // Use Company model
    return new Company(Object.assign({
      id: companyId
    }, extractedData));
  }

  // Public functions
  /**
   * Research company information
   */
  function researchCompany(companyName, phoneNumber) {
    var startTime = Date.now();
    
    try {
      if (!companyName || companyName.trim() === '') {
        throw new Error('Company name is required');
      }

      // 電話番号を文字列に変換（数値の場合もあるため）
      if (phoneNumber !== null && phoneNumber !== undefined && phoneNumber !== '') {
        phoneNumber = String(phoneNumber).trim();
      } else {
        phoneNumber = '';
      }

      Logger.logInfo('Starting research for company: ' + companyName);

      var companyId = generateCompanyId(companyName);
      var searchResults = [];
      
      // Search using company name
      var companySearchResult = TavilyClient.searchCompany(companyName, {
        additionalTerms: '本社 設立 従業員数 資本金 代表取締役 電話番号 郵便番号 企業理念 支店 営業所 事業所 支社',
        max_results: 10
      });
      searchResults.push(companySearchResult);

      // Search using phone number if provided
      if (phoneNumber && phoneNumber !== '') {
        var phoneSearchResult = TavilyClient.searchByPhoneNumber(phoneNumber);
        searchResults.push(phoneSearchResult);
      }

      // Combine search results
      var combinedResults = {
        success: true,
        results: []
      };

      searchResults.forEach(function(searchResult) {
        if (searchResult.success && searchResult.results) {
          combinedResults.results = combinedResults.results.concat(searchResult.results);
        }
      });

      // Validate search results
      var validation = validateSearchResults(combinedResults, companyName);
      
      // 検索結果が少ない場合でも処理を続行（緩和されたバリデーション）
      if (!validation.isValid && combinedResults.results.length === 0) {
        Logger.logWarning('No search results found for: ' + companyName, validation);
        
        updateStats(false, Date.now() - startTime);
        return {
          success: false,
          error: 'No search results found',
          validation: validation,
          companyName: companyName
        };
      } else if (!validation.isValid && combinedResults.results.length > 0) {
        // 検索結果はあるが関連性が低い場合は警告を出して処理続行
        Logger.logWarning('Search results have low relevance but proceeding: ' + companyName, validation);
        validation.isValid = true; // 処理続行のためtrueに設定
        validation.confidence = Math.max(validation.confidence, 0.3); // 最低限の信頼度を設定
      }

      Logger.logInfo('Search completed for: ' + companyName, {
        totalResults: combinedResults.results.length,
        confidence: validation.confidence
      });

      // Extract company information using AI (single extraction for both headquarters and branches)
      var extractionResult = OpenAIClient.extractCompanyInfo(companyName, combinedResults, phoneNumber);
      
      if (!extractionResult.success) {
        Logger.logWarning('Information extraction failed for: ' + companyName);
        
        updateStats(false, Date.now() - startTime);
        return {
          success: false,
          error: 'Failed to extract company information',
          extractionResult: extractionResult,
          searchValidation: validation
        };
      }

      // Calculate reliability score
      var reliabilityScore = calculateReliabilityScore(
        extractionResult.data,
        validation,
        extractionResult.success
      );

      // OpenAIが返した信頼性スコアが数値でない場合は計算値で上書き
      var openaiReliabilityScore = extractionResult.data.reliabilityScore;
      if (typeof openaiReliabilityScore !== 'number' || 
          isNaN(openaiReliabilityScore) || 
          openaiReliabilityScore < 0 || 
          openaiReliabilityScore > 100) {
        Logger.logWarning('OpenAI信頼性スコアが無効、計算値で上書き: ' + openaiReliabilityScore + ' → ' + reliabilityScore);
      } else {
        // OpenAIの値が有効な場合はそれを使用
        reliabilityScore = openaiReliabilityScore;
      }

      // Add metadata to extracted data
      var enhancedData = Object.assign({}, extractionResult.data, {
        id: companyId,
        reliabilityScore: reliabilityScore,
        processedAt: new Date().toISOString(),
        processingResult: 'SUCCESS',
        sourceUrls: combinedResults.results.map(function(r) { return r.url; }).slice(0, 5)
      });

      // Extract branch information from the main extraction result
      var branches = [];
      if (extractionResult.data.branches && Array.isArray(extractionResult.data.branches)) {
        Logger.logInfo('支店情報抽出: ' + companyName + ' (' + extractionResult.data.branches.length + '件)');
        
        branches = extractionResult.data.branches.map(function(branch, index) {
          Logger.logDebug('支店' + (index + 1) + ': ' + 
            (branch.name || '名称不明') + ' (' + (branch.type || 'タイプ不明') + ') - ' +
            (branch.prefecture || '') + (branch.city || '') + ' ' +
            (branch.phone || '電話番号なし'));
            
          return {
            companyId: companyId,
            name: branch.name || '',
            type: branch.type || 'その他',
            phone: branch.phone || '',
            postalCode: branch.postalCode || '',
            prefecture: branch.prefecture || '',
            city: branch.city || '',
            addressDetail: branch.addressDetail || '',
            employees: branch.employees || null,
            businessHours: branch.businessHours || '',
            notes: branch.notes || ''
          };
        });
        
        Logger.logInfo('支店情報処理完了: ' + companyName + ' (' + branches.length + '件)');
      } else {
        Logger.logInfo('支店情報なし: ' + companyName);
      }

      // Create company object
      var company = createCompanyObject(
        enhancedData,
        companyId,
        enhancedData.sourceUrls
      );

      var duration = Date.now() - startTime;
      updateStats(true, duration);

      Logger.logInfo('Research completed successfully for: ' + companyName, {
        duration: duration + 'ms',
        reliabilityScore: reliabilityScore,
        fieldsExtracted: Object.keys(extractionResult.data).length,
        branchCount: branches.length
      });

      return {
        success: true,
        company: company,
        branches: branches,
        searchValidation: validation,
        extractionResult: extractionResult,
        processingTime: duration,
        metadata: {
          searchResultCount: combinedResults.results.length,
          confidence: validation.confidence,
          reliabilityScore: reliabilityScore,
          branchCount: branches.length
        }
      };

    } catch (error) {
      updateStats(false, Date.now() - startTime);
      Logger.logError('Exception in researchCompany', error);
      ErrorHandler.handleError(error, {
        function: 'researchCompany',
        companyName: companyName,
        stage: 'general'
      });
      
      throw error;
    }
  }

  /**
   * Research detailed company information
   */
  function researchDetailedInfo(companyName, researchTypes) {
    return new Promise(function(resolve, reject) {
      try {
        if (!researchTypes || researchTypes.length === 0) {
          researchTypes = ['financial', 'news', 'recruitment', 'corporate'];
        }

        Logger.logInfo('Starting detailed research for: ' + companyName);

        var detailPromises = researchTypes.map(function(type) {
          return TavilyClient.searchCompanyDetails(companyName, type)
            .then(function(result) {
              return { type: type, result: result };
            })
            .catch(function(error) {
              Logger.logWarning('Detailed search failed for type ' + type, error);
              return { type: type, result: null, error: error };
            });
        });

        Promise.all(detailPromises)
          .then(function(detailResults) {
            var consolidatedInfo = {
              companyName: companyName,
              researchTypes: researchTypes,
              details: {},
              errors: []
            };

            detailResults.forEach(function(detail) {
              if (detail.result && detail.result.success) {
                consolidatedInfo.details[detail.type] = detail.result;
              } else {
                consolidatedInfo.errors.push({
                  type: detail.type,
                  error: detail.error || 'Unknown error'
                });
              }
            });

            Logger.logInfo('Detailed research completed for: ' + companyName, {
              successfulTypes: Object.keys(consolidatedInfo.details).length,
              failedTypes: consolidatedInfo.errors.length
            });

            resolve({
              success: true,
              data: consolidatedInfo
            });
          })
          .catch(reject);

      } catch (error) {
        Logger.logError('Exception in researchDetailedInfo', error);
        reject(error);
      }
    });
  }

  /**
   * Get research statistics
   */
  function getResearchStats() {
    return Object.assign({}, _researchStats, {
      totalResearches: _researchCount,
      successRate: _researchCount > 0 ? (_researchStats.successful / _researchCount) * 100 : 0
    });
  }

  /**
   * Reset research statistics
   */
  function resetStats() {
    _researchCount = 0;
    _researchStats = {
      successful: 0,
      failed: 0,
      avgDuration: 0,
      lastReset: new Date()
    };
  }

  /**
   * Test research functionality
   */
  function testResearch() {
    return new Promise(function(resolve, reject) {
      try {
        Logger.logInfo('Testing research functionality');

        var testCompanyName = 'ユニクロ';
        
        researchCompany(testCompanyName)
          .then(function(result) {
            Logger.logInfo('Research test completed successfully');
            resolve({
              success: true,
              testCompany: testCompanyName,
              result: result
            });
          })
          .catch(function(error) {
            Logger.logError('Research test failed', error);
            resolve({
              success: false,
              testCompany: testCompanyName,
              error: error.message
            });
          });

      } catch (error) {
        Logger.logError('Exception in research test', error);
        resolve({
          success: false,
          error: error.message
        });
      }
    });
  }

  // Return public API
  return {
    researchCompany: researchCompany,
    researchDetailedInfo: researchDetailedInfo,
    getResearchStats: getResearchStats,
    resetStats: resetStats,
    testResearch: testResearch
  };
})();