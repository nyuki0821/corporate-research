/**
 * @fileoverview Production Environment Tests
 * @author Corporate Research Team
 * 
 * 本番環境での実際のAPI・データを使用したテストスイート
 * 開発環境のモックテストとは異なり、実際のAPIキーとデータを使用
 */

var ProductionTests = (function() {
  
  /**
   * API設定の確認
   */
  function checkApiConfiguration() {
    console.log('=== API設定確認 ===');
    
    var results = {
      tavilyKey: false,
      openaiKey: false,
      notificationEmail: false,
      spreadsheetId: false,
      batchSize: false
    };
    
    try {
      // 必須APIキー確認
      var tavilyKey = ConfigManager.get('TAVILY_API_KEY');
      results.tavilyKey = tavilyKey && tavilyKey.trim() !== '';
      console.log('Tavily APIキー:', results.tavilyKey ? '設定済み ✅' : '未設定 ❌');
      
      var openaiKey = ConfigManager.get('OPENAI_API_KEY');
      results.openaiKey = openaiKey && openaiKey.trim() !== '';
      console.log('OpenAI APIキー:', results.openaiKey ? '設定済み ✅' : '未設定 ❌');
      
      // その他設定確認
      var notificationEmail = ConfigManager.get('NOTIFICATION_EMAIL');
      results.notificationEmail = notificationEmail && notificationEmail.trim() !== '';
      console.log('通知メール:', notificationEmail || '未設定');
      
      var batchSize = ConfigManager.getNumber('BATCH_SIZE', 20);
      results.batchSize = batchSize > 0;
      console.log('バッチサイズ:', batchSize);
      
      // スプレッドシート確認
      var spreadsheetId = ConfigManager.get('SPREADSHEET_ID');
      results.spreadsheetId = spreadsheetId && spreadsheetId.trim() !== '';
      console.log('スプレッドシートID:', results.spreadsheetId ? '設定済み ✅' : '未設定 ❌');
      
      return results;
    } catch (error) {
      console.error('❌ 設定確認エラー:', error.toString());
      return results;
    }
  }
  
  /**
   * 実際のAPIとの接続確認
   */
  function testRealApiConnections() {
    console.log('🔌 実際のAPI接続テスト開始');
    
    try {
      var results = {
        tavily: { success: false, error: null },
        openai: { success: false, error: null }
      };
      
      // Tavily API接続テスト
      console.log('--- Tavily API接続テスト ---');
      try {
        var tavilyResult = TavilyClient.testConnection();
        results.tavily = tavilyResult;
        console.log('Tavily結果:', tavilyResult.success ? '✅ 成功' : '❌ 失敗');
        if (!tavilyResult.success) {
          console.log('Tavilyエラー:', tavilyResult.error);
        }
      } catch (error) {
        results.tavily = { success: false, error: error.toString() };
        console.log('Tavily例外:', error.toString());
      }
      
      // OpenAI API接続テスト  
      console.log('--- OpenAI API接続テスト ---');
      try {
        var openaiResult = OpenAIClient.testConnection();
        results.openai = openaiResult;
        console.log('OpenAI結果:', openaiResult.success ? '✅ 成功' : '❌ 失敗');
        if (!openaiResult.success) {
          console.log('OpenAIエラー:', openaiResult.error);
        }
      } catch (error) {
        results.openai = { success: false, error: error.toString() };
        console.log('OpenAI例外:', error.toString());
      }
      
      var allSuccess = results.tavily.success && results.openai.success;
      
      if (allSuccess) {
        console.log('✅ 全API接続成功');
      } else {
        console.log('❌ API接続に問題があります');
      }
      
      return {
        success: allSuccess,
        results: results
      };
      
    } catch (error) {
      console.error('❌ API接続テストエラー:', error.toString());
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  /**
   * 1社での実証テスト
   */
  function testSingleCompanyResearch() {
    console.log('🏢 単一企業調査テスト開始');
    
    try {
      // 営業先として重要な支店・営業所を持つ企業でテスト
      var companyName = '大和ハウス工業株式会社';
      
      console.log('調査対象:', companyName);
      console.log('調査開始...');
      
      var startTime = Date.now();
      var result = CompanyResearchService.researchCompany(companyName);
      var duration = Date.now() - startTime;
      
      if (result.success) {
        console.log('✅ 調査成功！');
        console.log('企業名:', result.company.companyName || '取得できませんでした');
        console.log('本社所在地:', (result.company.prefecture || '') + (result.company.city || ''));
        console.log('信頼性スコア:', (result.company.reliabilityScore || 0) + '%');
        console.log('処理時間:', duration + 'ms');
        console.log('取得フィールド数:', Object.keys(result.company).length);
        
        // 詳細なカラム検証を実行
        var validation = validateCompanyDataColumns(result.company);
        console.log('\n📊 カラム検証結果:');
        console.log('本社情報シート完成度:', validation.headquarters.completionRate + '%');
        console.log('取得済みフィールド:', validation.headquarters.completedFields + '/' + validation.headquarters.totalFields);
        
        if (validation.headquarters.missingFields.length > 0) {
          console.log('❌ 未取得フィールド:', validation.headquarters.missingFields.join(', '));
        }
        
        if (result.branches && result.branches.length > 0) {
          console.log('支店情報:', result.branches.length + '件取得');
          
          // 支店情報の詳細を表示
          result.branches.forEach(function(branch, index) {
            console.log('  支店' + (index + 1) + ':', branch.name, '(' + branch.type + ')');
            if (branch.prefecture && branch.city) {
              console.log('    所在地:', branch.prefecture + branch.city);
            }
            if (branch.phone) {
              console.log('    電話番号:', branch.phone);
            }
          });
        } else {
          console.log('支店情報: 取得なし');
        }

        // ニュースサマリーの表示
        if (result.newsSummary) {
          console.log('\n=== 最新ニュースサマリー ===');
          console.log('概要:', result.newsSummary.summary);
          console.log('営業への影響:', result.newsSummary.businessImpact);
          console.log('情報ソース数:', result.newsSummary.sourceCount + '件');
          
          if (result.newsSummary.keyPoints && result.newsSummary.keyPoints.length > 0) {
            console.log('重要ポイント:');
            result.newsSummary.keyPoints.forEach(function(point, index) {
              console.log('  ' + (index + 1) + '. ' + point);
            });
          }
          
          if (result.newsSummary.lastUpdated) {
            console.log('最終更新:', result.newsSummary.lastUpdated);
          }
        }

        if (result.recruitmentSummary) {
          console.log('\n=== 採用情報サマリー ===');
          console.log('概要:', result.recruitmentSummary.summary);
          console.log('企業成長性:', result.recruitmentSummary.companyGrowth);
          console.log('営業機会:', result.recruitmentSummary.businessOpportunity);
          console.log('情報ソース数:', result.recruitmentSummary.sourceCount + '件');
          
          if (result.recruitmentSummary.recruitmentTypes && result.recruitmentSummary.recruitmentTypes.length > 0) {
            console.log('採用種別:', result.recruitmentSummary.recruitmentTypes.join(', '));
          }
          
          if (result.recruitmentSummary.targetPositions && result.recruitmentSummary.targetPositions.length > 0) {
            console.log('募集職種:', result.recruitmentSummary.targetPositions.join(', '));
          }
          
          if (result.recruitmentSummary.keyInsights && result.recruitmentSummary.keyInsights.length > 0) {
            console.log('営業活用ポイント:');
            result.recruitmentSummary.keyInsights.forEach(function(insight, index) {
              console.log('  ' + (index + 1) + '. ' + insight);
            });
          }
          
          if (result.recruitmentSummary.recruitmentUrl) {
            console.log('採用ページ:', result.recruitmentSummary.recruitmentUrl);
          }
          
          if (result.recruitmentSummary.lastUpdated) {
            console.log('最終更新:', result.recruitmentSummary.lastUpdated);
          }
        }
        
        // 詳細レポートを表示（支店情報とニュースサマリーも含める）
        displayDetailedValidationReport(validation, result.branches, result.newsSummary, result.recruitmentSummary);
        
        return {
          success: true,
          company: result.company,
          duration: duration,
          fieldCount: Object.keys(result.company).length,
          validation: validation
        };
      } else {
        console.log('❌ 調査失敗:', result.error);
        return {
          success: false,
          error: result.error,
          duration: duration
        };
      }
      
    } catch (error) {
      console.error('❌ エラー発生:', error.toString());
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  /**
   * 3-5社での小規模バッチ処理テスト
   */
  function testSmallBatchProcessing() {
    console.log('📦 小規模バッチ処理テスト開始');
    
    try {
      // テスト用企業リスト（教育業界の中堅企業）
      var testCompanies = [
        '株式会社ベネッセホールディングス',
        '株式会社学研ホールディングス',
        '株式会社栄光ホールディングス'
      ];
      
      console.log('バッチ処理対象:', testCompanies.length + '社');
      
      var startTime = Date.now();
      
      // 実際のBatchProcessorを使用（同期版のヘルパー関数を使用）
      var results = processSpecificCompanies(testCompanies);
      
      var successCount = results.filter(function(r) { return r.success; }).length;
      var failCount = results.filter(function(r) { return !r.success; }).length;
      
      var duration = Date.now() - startTime;
      
      console.log('✅ バッチ処理完了');
      console.log('成功:', successCount + '社');
      console.log('失敗:', failCount + '社');
      console.log('処理時間:', duration + 'ms');
      console.log('平均処理時間:', Math.round(duration / testCompanies.length) + 'ms/社');
      
      // 各企業の詳細結果を表示
      console.log('\n📊 各企業の詳細結果:');
      console.log('================================');
      
      results.forEach(function(result, index) {
        console.log('\n🏢 企業' + (index + 1) + ': ' + result.companyName);
        
        if (result.success && result.company) {
          var company = result.company;
          
          // 基本情報
          console.log('✅ 調査成功！');
          console.log('企業名:', company.companyName || 'N/A');
          console.log('本社所在地:', (company.prefecture || '') + (company.city || ''));
          console.log('信頼性スコア:', (company.reliabilityScore || 0) + '%');
          console.log('取得フィールド数:', getFieldCount(company));
          
          // カラム検証
          var validation = validateCompanyDataColumns(company);
          console.log('\n📊 カラム検証結果:');
          console.log('本社情報シート完成度:', validation.headquarters.completionRate + '%');
          console.log('取得済みフィールド:', validation.headquarters.completedFields + '/' + validation.headquarters.totalFields);
          
          if (validation.headquarters.missingFields.length > 0) {
            console.log('❌ 未取得フィールド:', validation.headquarters.missingFields.join(', '));
          }
          
          // 支店情報
          if (result.branches && result.branches.length > 0) {
            console.log('支店情報:', result.branches.length + '件取得');
            result.branches.forEach(function(branch, branchIndex) {
              console.log('  支店' + (branchIndex + 1) + ':', branch.name + ' (' + branch.type + ')');
              if (branch.prefecture && branch.city) {
                console.log('    所在地:', branch.prefecture + branch.city);
              }
              if (branch.phone) {
                console.log('    電話番号:', branch.phone);
              }
            });
          } else {
            console.log('支店情報: 取得されませんでした');
          }
          
          // ニュースサマリー
          if (result.newsSummary) {
            console.log('\n=== 最新ニュースサマリー ===');
            console.log('概要:', result.newsSummary.summary);
            console.log('営業への影響:', result.newsSummary.businessImpact);
            console.log('情報ソース数:', result.newsSummary.sourceCount + '件');
            
            if (result.newsSummary.keyPoints && result.newsSummary.keyPoints.length > 0) {
              console.log('重要ポイント:');
              result.newsSummary.keyPoints.forEach(function(point, pointIndex) {
                console.log('  ' + (pointIndex + 1) + '. ' + point);
              });
            }
          }
          
          // 採用情報サマリー
          if (result.recruitmentSummary) {
            console.log('\n=== 採用情報サマリー ===');
            console.log('概要:', result.recruitmentSummary.summary);
            console.log('企業成長性:', result.recruitmentSummary.companyGrowth);
            console.log('営業機会:', result.recruitmentSummary.businessOpportunity);
            console.log('情報ソース数:', result.recruitmentSummary.sourceCount + '件');
            
            if (result.recruitmentSummary.recruitmentTypes && result.recruitmentSummary.recruitmentTypes.length > 0) {
              console.log('採用種別:', result.recruitmentSummary.recruitmentTypes.join(', '));
            }
            
            if (result.recruitmentSummary.targetPositions && result.recruitmentSummary.targetPositions.length > 0) {
              console.log('募集職種:', result.recruitmentSummary.targetPositions.join(', '));
            }
            
            if (result.recruitmentSummary.keyInsights && result.recruitmentSummary.keyInsights.length > 0) {
              console.log('営業活用ポイント:');
              result.recruitmentSummary.keyInsights.forEach(function(insight, insightIndex) {
                console.log('  ' + (insightIndex + 1) + '. ' + insight);
              });
            }
          }
          
        } else {
          console.log('❌ 調査失敗');
          console.log('エラー:', result.error || 'Unknown error');
        }
        
        console.log('--------------------------------');
      });
      
      return {
        success: successCount > 0,
        totalCompanies: testCompanies.length,
        successCount: successCount,
        failCount: failCount,
        duration: duration,
        averageTime: Math.round(duration / testCompanies.length),
        results: results
      };
      
    } catch (error) {
      console.error('❌ バッチ処理エラー:', error.toString());
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  /**
   * スプレッドシートから実際の企業リストを読み込んでテスト
   */
  function testRealSpreadsheetProcessing() {
    console.log('📊 実際のスプレッドシート処理テスト');
    
    try {
      // 実際のスプレッドシートから企業リスト取得
      var companies = SpreadsheetService.getCompanyList('未処理');
      console.log('処理対象企業数:', companies.length);
      
      if (companies.length === 0) {
        console.log('⚠️ 処理対象企業がありません');
        console.log('企業リストシートに企業名を入力してください');
        return {
          success: false,
          error: '処理対象企業がありません'
        };
      }
      
      // 安全のため最初の2社だけ処理
      var testCount = Math.min(2, companies.length);
      console.log('テスト処理対象:', testCount + '社');
      
      // バッチサイズを一時的に小さく設定
      var originalBatchSize = ConfigManager.getNumber('BATCH_SIZE', 20);
      ConfigManager.set('BATCH_SIZE', testCount.toString());
      
      try {
        var startTime = Date.now();
        
        // 実際のバッチ処理実行（少数企業のみ）
        var testCompanies = companies.slice(0, testCount);
        var processedResults = [];
        
        for (var i = 0; i < testCompanies.length; i++) {
          var company = testCompanies[i];
          console.log('スプレッドシート処理中 (' + (i + 1) + '/' + testCount + '):', company.companyName);
          
          try {
            var result = CompanyResearchService.researchCompany(company.companyName);
            
            if (result.success) {
              // スプレッドシートに結果を保存
              SpreadsheetService.saveCompanyInfo(result.company);
              processedResults.push({
                success: true,
                rowIndex: company.rowIndex,
                companyName: company.companyName,
                company: result.company
              });
            } else {
              processedResults.push({
                success: false,
                rowIndex: company.rowIndex,
                companyName: company.companyName,
                error: result.error
              });
            }
          } catch (error) {
            processedResults.push({
              success: false,
              rowIndex: company.rowIndex,
              companyName: company.companyName,
              error: error.toString()
            });
          }
        }
        
        var duration = Date.now() - startTime;
        var successCount = processedResults.filter(function(r) { return r.success; }).length;
        
        console.log('✅ スプレッドシート処理テスト完了');
        console.log('処理企業数:', testCount);
        console.log('成功企業数:', successCount);
        console.log('処理時間:', duration + 'ms');
        
        return {
          success: true,
          processedCount: testCount,
          successCount: successCount,
          duration: duration,
          results: processedResults
        };
        
      } finally {
        // バッチサイズを元に戻す
        ConfigManager.set('BATCH_SIZE', originalBatchSize.toString());
      }
      
    } catch (error) {
      console.error('❌ スプレッドシート処理エラー:', error.toString());
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  /**
   * 本番環境テストの推奨実行順序
   */
  function runProductionTests() {
    console.log('🚀 本番環境テスト実行開始');
    console.log('================================');
    
    var results = {
      configuration: { success: false, data: null },
      apiConnection: { success: false, data: null },
      singleCompany: { success: false, data: null },
      smallBatch: { success: false, data: null },
      spreadsheetTest: { success: false, data: null }
    };
    
    var startTime = Date.now();
    
    try {
      // Step 1: 設定確認
      console.log('\n📋 Step 1: 設定確認');
      var configResult = checkApiConfiguration();
      results.configuration.success = configResult.tavilyKey && configResult.openaiKey && configResult.spreadsheetId;
      results.configuration.data = configResult;
      
      if (!results.configuration.success) {
        console.log('❌ 必須設定が不足しています。テストを中止します。');
        return results;
      }
      
      // Step 2: API接続テスト
      console.log('\n🔌 Step 2: API接続テスト');
      var apiResult = testRealApiConnections();
      results.apiConnection.success = apiResult.success;
      results.apiConnection.data = apiResult;
      
      if (!results.apiConnection.success) {
        console.log('❌ API接続に失敗しました。設定を確認してください。');
        return results;
      }
      
      // Step 3: 単一企業テスト
      console.log('\n🏢 Step 3: 単一企業テスト');
      var singleResult = testSingleCompanyResearch();
      results.singleCompany.success = singleResult.success;
      results.singleCompany.data = singleResult;
      
      if (!results.singleCompany.success) {
        console.log('❌ 単一企業テストに失敗しました。');
        return results;
      }
      
      // Step 4: 小規模バッチテスト
      console.log('\n📦 Step 4: 小規模バッチテスト');
      var batchResult = testSmallBatchProcessing();
      results.smallBatch.success = batchResult.success;
      results.smallBatch.data = batchResult;
      
      if (!results.smallBatch.success) {
        console.log('❌ バッチ処理テストに失敗しました。');
        return results;
      }
      
      // Step 5: スプレッドシートテスト
      console.log('\n📊 Step 5: スプレッドシート処理テスト');
      var spreadsheetResult = testRealSpreadsheetProcessing();
      results.spreadsheetTest.success = spreadsheetResult.success;
      results.spreadsheetTest.data = spreadsheetResult;
      
    } catch (error) {
      console.error('❌ 本番テスト実行エラー:', error.toString());
      results.error = error.toString();
    }
    
    var totalDuration = Date.now() - startTime;
    
    // 結果サマリー
    console.log('\n🎯 本番環境テスト結果');
    console.log('================================');
    console.log('設定確認:', results.configuration.success ? '✅' : '❌');
    console.log('API接続:', results.apiConnection.success ? '✅' : '❌');
    console.log('単一企業調査:', results.singleCompany.success ? '✅' : '❌');
    console.log('バッチ処理:', results.smallBatch.success ? '✅' : '❌');
    console.log('スプレッドシート処理:', results.spreadsheetTest.success ? '✅' : '❌');
    console.log('総実行時間:', totalDuration + 'ms');
    
    var allSuccess = Object.keys(results).every(function(key) {
      return key === 'error' || results[key].success === true;
    });
    
    if (allSuccess) {
      console.log('\n🎉 全ての本番環境テストが成功しました！');
      console.log('本格的な運用を開始できます。');
    } else {
      console.log('\n⚠️ 一部のテストで問題が発生しました。');
      console.log('問題を解決してから運用を開始してください。');
    }
    
    results.summary = {
      allSuccess: allSuccess,
      totalDuration: totalDuration,
      timestamp: new Date()
    };
    
    return results;
  }
  
  /**
   * 企業データのフィールド数をカウント
   * @private
   */
  function getFieldCount(company) {
    if (!company) return 0;
    
    var fields = [
      'companyName', 'officialName', 'phone', 'industryLarge', 'industryMedium',
      'employees', 'establishedYear', 'capital', 'listingStatus',
      'postalCode', 'prefecture', 'city', 'addressDetail',
      'representativeName', 'representativeTitle',
      'philosophy', 'latestNews', 'recruitmentStatus', 'website'
    ];
    
    var count = 0;
    fields.forEach(function(field) {
      if (company[field] && company[field] !== null && company[field] !== '') {
        count++;
      }
    });
    
    return count;
  }

  /**
   * 企業データのカラム検証を実行
   * @private
   */
  function validateCompanyDataColumns(company) {
    // 本社情報シートのカラム定義（Constants.SHEET_CONFIG.HEADQUARTERS_COLUMNSに基づく）
    var headquartersFields = [
      { key: 'id', name: '企業ID', required: true },
      { key: 'companyName', name: '企業名', required: true },
      { key: 'officialName', name: '正式企業名', required: false },
      { key: 'phone', name: '電話番号', required: false },
      { key: 'industryLarge', name: '業種大分類', required: false },
      { key: 'industryMedium', name: '業種中分類', required: false },
      { key: 'employees', name: '従業員数', required: false },
      { key: 'establishedYear', name: '設立年', required: false },
      { key: 'capital', name: '資本金', required: false },
      { key: 'listingStatus', name: '上場区分', required: false },
      { key: 'postalCode', name: '本社郵便番号', required: false },
      { key: 'prefecture', name: '本社都道府県', required: false },
      { key: 'city', name: '本社市区町村', required: false },
      { key: 'addressDetail', name: '本社住所詳細', required: false },
      { key: 'representativeName', name: '代表者名', required: false },
      { key: 'representativeTitle', name: '代表者役職', required: false },
      { key: 'philosophy', name: '企業理念', required: false },
      { key: 'latestNews', name: '最新ニュース', required: false },
      { key: 'recruitmentStatus', name: '採用状況', required: false },
      { key: 'website', name: '企業URL', required: false },
      { key: 'reliabilityScore', name: '信頼性スコア', required: false },
      { key: 'processedAt', name: '処理日時', required: false },
      { key: 'processingResult', name: '処理結果', required: false },
      { key: 'errorMessage', name: 'エラー内容', required: false },
      { key: 'sourceUrls', name: '情報ソースURL', required: false }
    ];

    var validation = {
      headquarters: {
        totalFields: headquartersFields.length,
        completedFields: 0,
        requiredFields: 0,
        completedRequiredFields: 0,
        completionRate: 0,
        requiredCompletionRate: 0,
        missingFields: [],
        missingRequiredFields: [],
        fieldDetails: []
      },
      branches: {
        available: false,
        count: 0,
        completionRate: 0,
        fieldDetails: []
      }
    };

    // 本社情報の検証
    headquartersFields.forEach(function(field) {
      var value = company[field.key];
      var hasValue = value !== null && value !== undefined && value !== '';
      
      if (field.required) {
        validation.headquarters.requiredFields++;
        if (hasValue) {
          validation.headquarters.completedRequiredFields++;
        } else {
          validation.headquarters.missingRequiredFields.push(field.name);
        }
      }

      if (hasValue) {
        validation.headquarters.completedFields++;
      } else {
        validation.headquarters.missingFields.push(field.name);
      }

      validation.headquarters.fieldDetails.push({
        key: field.key,
        name: field.name,
        required: field.required,
        hasValue: hasValue,
        value: hasValue ? (typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value) : null
      });
    });

    // 完成度計算
    validation.headquarters.completionRate = Math.round(
      (validation.headquarters.completedFields / validation.headquarters.totalFields) * 100
    );
    
    if (validation.headquarters.requiredFields > 0) {
      validation.headquarters.requiredCompletionRate = Math.round(
        (validation.headquarters.completedRequiredFields / validation.headquarters.requiredFields) * 100
      );
    }

    // 支店情報の検証（もし存在する場合）
    if (company.branches && Array.isArray(company.branches) && company.branches.length > 0) {
      validation.branches.available = true;
      validation.branches.count = company.branches.length;
      
      var branchFields = ['name', 'type', 'phone', 'address', 'prefecture', 'city'];
      var totalBranchFields = branchFields.length * company.branches.length;
      var completedBranchFields = 0;

      company.branches.forEach(function(branch, index) {
        branchFields.forEach(function(field) {
          var value = branch[field];
          if (value !== null && value !== undefined && value !== '') {
            completedBranchFields++;
          }
        });
      });

      validation.branches.completionRate = Math.round(
        (completedBranchFields / totalBranchFields) * 100
      );
    }

    return validation;
  }

  /**
   * 詳細な検証レポートを表示
   * @private
   */
  function displayDetailedValidationReport(validation, branches, newsSummary, recruitmentSummary) {
    console.log('\n📋 詳細カラム検証レポート:');
    console.log('================================');
    
    console.log('\n【本社情報シート】');
    console.log('総フィールド数:', validation.headquarters.totalFields);
    console.log('取得済みフィールド数:', validation.headquarters.completedFields);
    console.log('完成度:', validation.headquarters.completionRate + '%');
    
    if (validation.headquarters.requiredFields > 0) {
      console.log('必須フィールド完成度:', validation.headquarters.requiredCompletionRate + '%');
    }

    // 取得済みフィールドの詳細
    console.log('\n✅ 取得済みフィールド:');
    validation.headquarters.fieldDetails
      .filter(function(field) { return field.hasValue; })
      .forEach(function(field) {
        var valueDisplay = field.value;
        if (typeof valueDisplay === 'object' && valueDisplay !== null) {
          valueDisplay = JSON.stringify(valueDisplay);
        }
        console.log('  • ' + field.name + ': ' + valueDisplay);
      });

    // 未取得フィールドの詳細
    if (validation.headquarters.missingFields.length > 0) {
      console.log('\n❌ 未取得フィールド:');
      validation.headquarters.fieldDetails
        .filter(function(field) { return !field.hasValue; })
        .forEach(function(field) {
          var marker = field.required ? '【必須】' : '';
          console.log('  • ' + field.name + ' ' + marker);
        });
    }

    // 支店情報
    console.log('\n【支店情報シート】');
    if (branches && branches.length > 0) {
      console.log('支店数:', branches.length);
      console.log('支店情報: 取得成功');
      
      branches.forEach(function(branch, index) {
        console.log('\n支店' + (index + 1) + '詳細:');
        console.log('  • 支店名:', branch.name);
        console.log('  • 種別:', branch.type);
        if (branch.phone) console.log('  • 電話番号:', branch.phone);
        if (branch.postalCode) console.log('  • 郵便番号:', branch.postalCode);
        if (branch.prefecture && branch.city) {
          console.log('  • 所在地:', branch.prefecture + branch.city);
        }
        if (branch.addressDetail) console.log('  • 住所詳細:', branch.addressDetail);
        if (branch.businessHours) console.log('  • 営業時間:', branch.businessHours);
        if (branch.employees) console.log('  • 従業員数:', branch.employees);
        if (branch.notes) console.log('  • 備考:', branch.notes);
      });
    } else {
      console.log('支店情報: 取得されませんでした');
    }

    // ニュースサマリー情報
    console.log('\n【最新ニュースサマリー】');
    if (newsSummary) {
      console.log('ニュースサマリー: 取得成功');
      console.log('概要:', newsSummary.summary);
      console.log('営業への影響:', newsSummary.businessImpact);
      console.log('情報ソース数:', newsSummary.sourceCount);
      
      if (newsSummary.keyPoints && newsSummary.keyPoints.length > 0) {
        console.log('\n重要ポイント:');
        newsSummary.keyPoints.forEach(function(point, index) {
          console.log('  ' + (index + 1) + '. ' + point);
        });
      }
      
      if (newsSummary.lastUpdated) {
        console.log('最終更新日:', newsSummary.lastUpdated);
      }
      
      if (newsSummary.sourceUrls && newsSummary.sourceUrls.length > 0) {
        console.log('\n参考URL:');
        newsSummary.sourceUrls.slice(0, 3).forEach(function(url, index) {
          console.log('  ' + (index + 1) + '. ' + url);
        });
      }
    } else {
      console.log('ニュースサマリー: 取得されませんでした');
    }

    // 採用情報サマリー
    console.log('\n【採用情報サマリー】');
    if (recruitmentSummary) {
      console.log('採用サマリー: 取得成功');
      console.log('概要:', recruitmentSummary.summary);
      console.log('企業成長性:', recruitmentSummary.companyGrowth);
      console.log('営業機会:', recruitmentSummary.businessOpportunity);
      console.log('情報ソース数:', recruitmentSummary.sourceCount);
      
      if (recruitmentSummary.recruitmentTypes && recruitmentSummary.recruitmentTypes.length > 0) {
        console.log('採用種別:', recruitmentSummary.recruitmentTypes.join(', '));
      }
      
      if (recruitmentSummary.targetPositions && recruitmentSummary.targetPositions.length > 0) {
        console.log('募集職種:', recruitmentSummary.targetPositions.join(', '));
      }
      
      if (recruitmentSummary.keyInsights && recruitmentSummary.keyInsights.length > 0) {
        console.log('\n営業活用ポイント:');
        recruitmentSummary.keyInsights.forEach(function(insight, index) {
          console.log('  ' + (index + 1) + '. ' + insight);
        });
      }
      
      if (recruitmentSummary.recruitmentUrl) {
        console.log('採用ページ:', recruitmentSummary.recruitmentUrl);
      }
      
      if (recruitmentSummary.lastUpdated) {
        console.log('最終更新日:', recruitmentSummary.lastUpdated);
      }
      
      if (recruitmentSummary.sourceUrls && recruitmentSummary.sourceUrls.length > 0) {
        console.log('\n参考URL:');
        recruitmentSummary.sourceUrls.slice(0, 3).forEach(function(url, index) {
          console.log('  ' + (index + 1) + '. ' + url);
        });
      }
    } else {
      console.log('採用サマリー: 取得されませんでした');
    }

    console.log('\n================================');
  }

  // BatchProcessor用のヘルパー関数（同期版）
  function processSpecificCompanies(companyNames) {
    var results = [];
    
    for (var i = 0; i < companyNames.length; i++) {
      var companyName = companyNames[i];
      try {
        var result = CompanyResearchService.researchCompany(companyName);
        results.push({
          success: result.success,
          companyName: companyName,
          company: result.success ? result.company : null,
          branches: result.success ? result.branches : null,
          newsSummary: result.success ? result.newsSummary : null,
          recruitmentSummary: result.success ? result.recruitmentSummary : null,
          error: result.success ? null : result.error
        });
      } catch (error) {
        results.push({
          success: false,
          companyName: companyName,
          company: null,
          branches: null,
          newsSummary: null,
          recruitmentSummary: null,
          error: error.toString()
        });
      }
      
      // レート制限対策
      if (i < companyNames.length - 1) {
        Utilities.sleep(1000);
      }
    }
    
    return results;
  }
  
  // Public API
  return {
    checkApiConfiguration: checkApiConfiguration,
    testRealApiConnections: testRealApiConnections,
    testSingleCompanyResearch: testSingleCompanyResearch,
    testSmallBatchProcessing: testSmallBatchProcessing,
    testRealSpreadsheetProcessing: testRealSpreadsheetProcessing,
    runProductionTests: runProductionTests,
    processSpecificCompanies: processSpecificCompanies
  };
})();

// グローバル関数として公開（READMEで説明したとおり）
function checkApiConfiguration() {
  return ProductionTests.checkApiConfiguration();
}

function testRealApiConnections() {
  return ProductionTests.testRealApiConnections();
}

function testSingleCompanyResearch() {
  return ProductionTests.testSingleCompanyResearch();
}

function testSmallBatchProcessing() {
  return ProductionTests.testSmallBatchProcessing();
}

function testRealSpreadsheetProcessing() {
  return ProductionTests.testRealSpreadsheetProcessing();
}

function runProductionTests() {
  return ProductionTests.runProductionTests();
} 