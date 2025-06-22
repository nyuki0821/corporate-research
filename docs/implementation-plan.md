# 費用削減ハイブリッド戦略 実装プラン

## 🚀 Phase 1: 基盤構築（Week 1）

### 目標: 無料ソース統合で80%の費用削減を実現

#### Day 1-2: 法人番号API統合
```javascript
// 1. API登録とキー取得
// https://www.houjin-bangou.nta.go.jp/webapi/

// 2. 基本実装
class CorporateNumberAPI {
  constructor(appId) {
    this.appId = appId;
    this.baseUrl = 'https://api.houjin-bangou.nta.go.jp/4/num';
  }
  
  async search(companyName) {
    const params = {
      id: this.appId,
      name: companyName,
      mode: '2', // 前方一致
      type: '12' // 株式会社等
    };
    
    try {
      const response = await UrlFetchApp.fetch(
        `${this.baseUrl}?${this.buildQuery(params)}`
      );
      
      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        return this.parseResponse(data);
      }
    } catch (error) {
      Logger.log(`Corporate API error: ${error.message}`);
      return null;
    }
  }
  
  parseResponse(data) {
    if (!data.corporations || data.corporations.length === 0) {
      return null;
    }
    
    const corp = data.corporations[0];
    return {
      name: corp.name,
      corporateNumber: corp.corporateNumber,
      address: `${corp.prefectureName}${corp.cityName}${corp.streetNumber}`,
      foundDate: corp.assignmentDate,
      status: corp.process // 法人状態
    };
  }
}
```

#### Day 3-4: Google Places API統合
```javascript
class GooglePlacesAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
    this.monthlyUsage = 0;
    this.freeLimit = 3000;
  }
  
  canUseAPI() {
    return this.monthlyUsage < this.freeLimit;
  }
  
  async searchCompany(companyName) {
    if (!this.canUseAPI()) {
      Logger.log('Google Places API monthly limit reached');
      return null;
    }
    
    try {
      // Text Search
      const searchResult = await this.textSearch(companyName);
      if (!searchResult) return null;
      
      // Place Details
      const details = await this.getPlaceDetails(searchResult.place_id);
      this.monthlyUsage++;
      
      return this.formatResult(details);
      
    } catch (error) {
      Logger.log(`Google Places API error: ${error.message}`);
      return null;
    }
  }
  
  async textSearch(query) {
    const params = {
      query: `${query} 日本`,
      key: this.apiKey,
      language: 'ja',
      region: 'jp'
    };
    
    const response = await UrlFetchApp.fetch(
      `${this.baseUrl}/textsearch/json?${this.buildQuery(params)}`
    );
    
    const data = JSON.parse(response.getContentText());
    return data.results && data.results.length > 0 ? data.results[0] : null;
  }
  
  async getPlaceDetails(placeId) {
    const params = {
      place_id: placeId,
      key: this.apiKey,
      fields: 'name,formatted_phone_number,formatted_address,website,business_status,rating'
    };
    
    const response = await UrlFetchApp.fetch(
      `${this.baseUrl}/details/json?${this.buildQuery(params)}`
    );
    
    const data = JSON.parse(response.getContentText());
    return data.result;
  }
  
  formatResult(details) {
    return {
      name: details.name,
      phone: details.formatted_phone_number,
      address: details.formatted_address,
      website: details.website,
      businessStatus: details.business_status,
      rating: details.rating
    };
  }
}
```

#### Day 5: データ統合ロジック
```javascript
class DataIntegrator {
  constructor() {
    this.corporateAPI = new CorporateNumberAPI(CONFIG.CORPORATE_API_ID);
    this.placesAPI = new GooglePlacesAPI(CONFIG.GOOGLE_PLACES_API_KEY);
  }
  
  async integrateCompanyData(companyName) {
    const results = {
      source: 'free',
      confidence: 0,
      data: {}
    };
    
    // 1. 法人番号API（基本情報）
    const corporateData = await this.corporateAPI.search(companyName);
    if (corporateData) {
      results.data.basic = corporateData;
      results.confidence += 40; // 高信頼度
      Logger.log(`Found corporate data for ${companyName}`);
    }
    
    // 2. Google Places API（連絡先情報）
    const placesData = await this.placesAPI.searchCompany(companyName);
    if (placesData) {
      results.data.contact = placesData;
      results.confidence += 35; // 高信頼度
      Logger.log(`Found places data for ${companyName}`);
    }
    
    // 3. データ品質チェック
    results.quality = this.assessDataQuality(results.data);
    
    return results;
  }
  
  assessDataQuality(data) {
    const score = {
      basic: data.basic ? 25 : 0,
      phone: data.contact?.phone ? 25 : 0,
      address: (data.basic?.address || data.contact?.address) ? 25 : 0,
      website: data.contact?.website ? 25 : 0
    };
    
    const total = Object.values(score).reduce((sum, val) => sum + val, 0);
    return { score, total, sufficient: total >= 50 };
  }
}
```

## 🔧 Phase 2: 高度化（Week 2）

### 目標: 直接スクレイピングで精度向上、95%費用削減達成

#### Day 6-8: 直接Webスクレイピング実装
```javascript
class DirectWebScraper {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (compatible; CompanyResearchBot/1.0)';
    this.timeout = 10000;
  }
  
  async scrapeCompany(companyName) {
    const domains = this.generateDomainCandidates(companyName);
    
    for (const domain of domains) {
      try {
        const result = await this.scrapeDomain(domain);
        if (result && this.isValidResult(result)) {
          Logger.log(`Successfully scraped ${domain}`);
          return { ...result, domain };
        }
      } catch (error) {
        Logger.log(`Failed to scrape ${domain}: ${error.message}`);
        continue;
      }
    }
    
    return null;
  }
  
  generateDomainCandidates(companyName) {
    const cleanName = this.cleanCompanyName(companyName);
    const variations = this.generateNameVariations(cleanName);
    
    const domains = [];
    variations.forEach(name => {
      domains.push(
        `${name}.co.jp`,
        `${name}.com`,
        `www.${name}.co.jp`,
        `www.${name}.com`,
        `${name}.jp`,
        `${name}.ne.jp`
      );
    });
    
    return domains;
  }
  
  cleanCompanyName(name) {
    return name
      .replace(/株式会社|有限会社|合同会社|合資会社|合名会社/g, '')
      .replace(/\s+/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }
  
  generateNameVariations(cleanName) {
    const variations = [cleanName];
    
    // 英語表記の推測
    const englishMap = {
      'ソニー': 'sony',
      'トヨタ': 'toyota',
      'ニッサン': 'nissan',
      // ... 主要企業のマッピング
    };
    
    if (englishMap[cleanName]) {
      variations.push(englishMap[cleanName]);
    }
    
    return variations;
  }
  
  async scrapeDomain(domain) {
    const response = await UrlFetchApp.fetch(`https://${domain}`, {
      method: 'GET',
      headers: { 'User-Agent': this.userAgent },
      muteHttpExceptions: true,
      followRedirects: true
    });
    
    if (response.getResponseCode() !== 200) {
      return null;
    }
    
    const html = response.getContentText();
    return this.extractDataFromHtml(html);
  }
  
  extractDataFromHtml(html) {
    return {
      phone: this.extractPhone(html),
      address: this.extractAddress(html),
      branches: this.extractBranches(html)
    };
  }
  
  extractPhone(html) {
    const patterns = [
      /TEL[:\s]*([0-9\-\(\)\s]{10,})/gi,
      /電話[:\s]*([0-9\-\(\)\s]{10,})/gi,
      /代表[:\s]*([0-9\-\(\)\s]{10,})/gi,
      /(\d{2,4}[-\s]?\d{2,4}[-\s]?\d{4})/g
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return this.cleanPhoneNumber(match[0]);
      }
    }
    
    return null;
  }
  
  cleanPhoneNumber(phone) {
    return phone.replace(/[^0-9\-]/g, '').replace(/^TEL|^電話|^代表/i, '');
  }
  
  extractAddress(html) {
    const patterns = [
      /住所[:\s]*([^\n\r<]{10,})/gi,
      /所在地[:\s]*([^\n\r<]{10,})/gi,
      /〒\d{3}-\d{4}[^\n\r<]{5,}/g
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return match[0].replace(/住所|所在地/gi, '').trim();
      }
    }
    
    return null;
  }
  
  extractBranches(html) {
    const branchIndicators = ['支店', '営業所', '事業所', '拠点', 'オフィス'];
    const branches = [];
    
    for (const indicator of branchIndicators) {
      if (html.includes(indicator)) {
        branches.push({
          type: indicator,
          found: true,
          details: '詳細要確認'
        });
      }
    }
    
    return branches;
  }
  
  isValidResult(result) {
    return result.phone || result.address || result.branches.length > 0;
  }
}
```

#### Day 9-10: 有料ソース最小化ロジック
```javascript
class HybridResearchService {
  constructor() {
    this.integrator = new DataIntegrator();
    this.scraper = new DirectWebScraper();
    this.tavilyClient = new TavilyClient();
    this.openaiClient = new OpenAIClient();
  }
  
  async research(companyName) {
    Logger.log(`Starting hybrid research for: ${companyName}`);
    
    // Phase 1: 無料ソース統合
    let results = await this.integrator.integrateCompanyData(companyName);
    
    // Phase 2: 直接スクレイピング補完
    if (results.quality.total < 75) {
      const scrapedData = await this.scraper.scrapeCompany(companyName);
      if (scrapedData) {
        results = this.mergeScrapedData(results, scrapedData);
      }
    }
    
    // Phase 3: 有料ソース最小補完（必要時のみ）
    if (results.quality.total < 50) {
      results = await this.supplementWithPaidSources(companyName, results);
    }
    
    return this.formatFinalResult(results);
  }
  
  mergeScrapedData(existingResults, scrapedData) {
    if (!existingResults.data.contact) {
      existingResults.data.contact = {};
    }
    
    // 不足データを補完
    if (!existingResults.data.contact.phone && scrapedData.phone) {
      existingResults.data.contact.phone = scrapedData.phone;
      existingResults.confidence += 20;
    }
    
    if (!existingResults.data.basic?.address && scrapedData.address) {
      if (!existingResults.data.basic) existingResults.data.basic = {};
      existingResults.data.basic.address = scrapedData.address;
      existingResults.confidence += 15;
    }
    
    if (scrapedData.branches.length > 0) {
      existingResults.data.branches = scrapedData.branches;
      existingResults.confidence += 10;
    }
    
    // 品質再評価
    existingResults.quality = this.integrator.assessDataQuality(existingResults.data);
    
    return existingResults;
  }
  
  async supplementWithPaidSources(companyName, existingResults) {
    const missingData = this.identifyMissingCriticalData(existingResults);
    
    if (missingData.length === 0) {
      return existingResults;
    }
    
    Logger.log(`Using paid sources for missing data: ${missingData.join(', ')}`);
    
    // 最小限のTavily検索
    for (const dataType of missingData) {
      try {
        const query = this.buildTargetedQuery(companyName, dataType);
        const searchResults = await this.tavilyClient.searchCompany(query, {
          maxResults: 2, // 最小限
          includeRawContent: false
        });
        
        if (searchResults) {
          const extractedData = await this.extractSpecificData(searchResults, dataType);
          existingResults = this.mergeExtractedData(existingResults, extractedData, dataType);
        }
      } catch (error) {
        Logger.log(`Failed to supplement ${dataType}: ${error.message}`);
      }
    }
    
    existingResults.source = 'hybrid';
    return existingResults;
  }
  
  identifyMissingCriticalData(results) {
    const missing = [];
    
    if (!results.data.contact?.phone) {
      missing.push('phone');
    }
    
    if (!results.data.branches || results.data.branches.length === 0) {
      missing.push('branches');
    }
    
    return missing;
  }
  
  buildTargetedQuery(companyName, dataType) {
    const queryMap = {
      phone: `${companyName} 電話番号 代表電話 連絡先`,
      branches: `${companyName} 支店 営業所 事業所 拠点`
    };
    
    return queryMap[dataType] || companyName;
  }
  
  formatFinalResult(results) {
    return {
      companyName: results.data.basic?.name || 'Unknown',
      corporateNumber: results.data.basic?.corporateNumber,
      phone: results.data.contact?.phone,
      address: results.data.basic?.address || results.data.contact?.address,
      website: results.data.contact?.website,
      branches: results.data.branches || [],
      confidence: results.confidence,
      quality: results.quality.total,
      source: results.source,
      timestamp: new Date().toISOString()
    };
  }
}
```

## ⚡ Phase 3: 最適化（Week 3）

### 目標: キャッシュ・監視機能で運用効率最大化

#### Day 11-13: キャッシュシステム実装
```javascript
class CacheManager {
  constructor() {
    this.cache = CacheService.getScriptCache();
    this.longTermCache = PropertiesService.getScriptProperties();
    this.defaultTTL = 24 * 60 * 60; // 24時間
  }
  
  async getCachedCompanyData(companyName) {
    const key = this.generateCacheKey(companyName);
    
    try {
      const cached = this.cache.get(key);
      if (cached) {
        const data = JSON.parse(cached);
        if (this.isCacheValid(data)) {
          Logger.log(`Cache hit for ${companyName}`);
          return data;
        }
      }
    } catch (error) {
      Logger.log(`Cache error: ${error.message}`);
    }
    
    return null;
  }
  
  async setCachedCompanyData(companyName, data) {
    const key = this.generateCacheKey(companyName);
    const cacheData = {
      ...data,
      cachedAt: Date.now(),
      ttl: this.defaultTTL
    };
    
    try {
      this.cache.put(key, JSON.stringify(cacheData), this.defaultTTL);
      Logger.log(`Cached data for ${companyName}`);
    } catch (error) {
      Logger.log(`Cache save error: ${error.message}`);
    }
  }
  
  generateCacheKey(companyName) {
    return `company_${companyName.replace(/\s+/g, '_').toLowerCase()}`;
  }
  
  isCacheValid(cachedData) {
    const now = Date.now();
    const cachedAt = cachedData.cachedAt;
    const ttl = cachedData.ttl * 1000; // 秒をミリ秒に変換
    
    return (now - cachedAt) < ttl;
  }
}
```

#### Day 14-15: 監視・レポート機能
```javascript
class CostMonitor {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      freeSourceUsage: { corporate: 0, places: 0, scraping: 0 },
      paidSourceUsage: { tavily: 0, openai: 0 },
      costs: { total: 0, tavily: 0, openai: 0 },
      successRates: { free: 0, paid: 0, hybrid: 0 }
    };
  }
  
  recordRequest(source, success, cost = 0) {
    this.metrics.totalRequests++;
    
    if (cost > 0) {
      this.metrics.paidSourceUsage[source]++;
      this.metrics.costs[source] += cost;
      this.metrics.costs.total += cost;
    } else {
      this.metrics.freeSourceUsage[source]++;
    }
    
    // 成功率更新
    this.updateSuccessRates(source, success);
  }
  
  generateCostReport() {
    const report = {
      period: this.getCurrentPeriod(),
      summary: {
        totalRequests: this.metrics.totalRequests,
        totalCost: this.metrics.costs.total,
        avgCostPerRequest: this.metrics.costs.total / this.metrics.totalRequests,
        freeSourceRatio: this.calculateFreeSourceRatio()
      },
      breakdown: {
        freeSourceUsage: this.metrics.freeSourceUsage,
        paidSourceUsage: this.metrics.paidSourceUsage,
        costs: this.metrics.costs
      },
      projections: this.calculateMonthlyProjections()
    };
    
    return report;
  }
  
  calculateFreeSourceRatio() {
    const freeTotal = Object.values(this.metrics.freeSourceUsage)
      .reduce((sum, val) => sum + val, 0);
    return freeTotal / this.metrics.totalRequests;
  }
  
  calculateMonthlyProjections() {
    const dailyAvg = this.metrics.costs.total / this.getDaysInCurrentPeriod();
    return {
      monthlyCost: dailyAvg * 30,
      yearlyProjection: dailyAvg * 365,
      savingsVsOldSystem: this.calculateSavings(dailyAvg * 30)
    };
  }
}
```

この詳細な実装プランにより、**段階的に費用を削減しながら品質を向上**させることができるわ！

**重要なポイント:**
- 🆓 **Phase 1で80%削減**: 無料ソースだけで大部分をカバー
- 🔧 **Phase 2で95%削減**: スクレイピングで精度向上
- ⚡ **Phase 3で最適化**: 運用効率とコスト監視

どのPhaseから始めたい？それとも特定の部分について、もっと詳しく知りたい？ 