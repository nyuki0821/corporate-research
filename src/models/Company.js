/**
 * @fileoverview Company data model for the Corporate Research System
 * @author Corporate Research Team
 * 
 * 依存モジュール:
 * - Constants (src/core/Constants.js)
 * - Logger (src/core/Logger.js)
 */

var Company = (function() {
  
  /**
   * Generate unique company ID
   * @private
   */
  function generateCompanyId(companyName) {
    var timestamp = Date.now();
    var hash = (companyName || 'UNKNOWN').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 10);
    return 'COMP_' + hash + '_' + timestamp;
  }
  
  /**
   * Company constructor
   * @param {Object} data - Company data
   */
  function Company(data) {
    // Required fields
    this.id = data.id || generateCompanyId(data.companyName || '');
    this.companyName = data.companyName || '';
    
    // Basic information
    this.officialName = data.officialName || '';
    this.phone = data.phone || '';
    this.industryLarge = data.industryLarge || '';
    this.industryMedium = data.industryMedium || '';
    this.employees = data.employees || null;
    this.establishedYear = data.establishedYear || null;
    this.capital = data.capital || '';
    this.listingStatus = data.listingStatus || '';
    
    // Address information
    this.postalCode = data.postalCode || '';
    this.prefecture = data.prefecture || '';
    this.city = data.city || '';
    this.addressDetail = data.addressDetail || '';
    
    // Representative information
    this.representativeName = data.representativeName || '';
    this.representativeTitle = data.representativeTitle || '';
    
    // Corporate information
    this.philosophy = data.philosophy || '';
    this.latestNews = data.latestNews || '';
    this.recruitmentStatus = data.recruitmentStatus || '';
    this.website = data.website || '';
    
    // News summary information (optional extended data)
    this.newsSummary = data.newsSummary || null;
    
    // Recruitment summary information (optional extended data)
    this.recruitmentSummary = data.recruitmentSummary || null;
    
    // Source URL information - 基本情報用とニュース・採用情報用を分離
    this.sourceUrls = data.sourceUrls || [];           // 基本企業情報のソースURL
    this.officialSiteUrl = data.officialSiteUrl || '';  // 公式サイトURL
    this.primarySourceUrl = data.primarySourceUrl || ''; // 主要ソースURL
    
    // ニュース・採用情報のソースURLは各カラム内に含める（sourceUrlsとは分離）
    
    // Quality and processing information
    this.reliabilityScore = data.reliabilityScore || 20;
    this.processedAt = data.processedAt || null;
    this.processingResult = data.processingResult || null;
    this.errorMessage = data.errorMessage || null;
    
    // Extended metadata (optional)
    this.lastUpdated = data.lastUpdated || null;
    this.dataVersion = data.dataVersion || '1.0';
    this.tags = data.tags || [];
    this.notes = data.notes || '';
  }

  // Static methods
  Company.createFromData = function(data) {
    return new Company(data);
  };

  Company.createEmpty = function(companyName, id) {
    return new Company({
      id: id || 'COMP_' + Date.now(),
      companyName: companyName || '',
      processedAt: new Date().toISOString(),
      processingResult: 'INITIALIZED'
    });
  };

  // Instance methods
  Company.prototype.isValid = function() {
    return this.companyName && this.companyName.trim() !== '' && this.id && this.id.trim() !== '';
  };

  Company.prototype.getFullAddress = function() {
    var parts = [];
    
    if (this.postalCode) parts.push('〒' + this.postalCode);
    if (this.prefecture) parts.push(this.prefecture);
    if (this.city) parts.push(this.city);
    if (this.addressDetail) parts.push(this.addressDetail);
    
    return parts.join(' ');
  };

  Company.prototype.getDisplayName = function() {
    return this.officialName || this.companyName || 'Unknown Company';
  };

  Company.prototype.getRepresentativeInfo = function() {
    if (this.representativeName && this.representativeTitle) {
      return this.representativeTitle + ' ' + this.representativeName;
    } else if (this.representativeName) {
      return this.representativeName;
    } else if (this.representativeTitle) {
      return this.representativeTitle;
    }
    return '';
  };

  Company.prototype.hasCompleteBasicInfo = function() {
    var requiredFields = [
      'companyName', 'industryLarge', 'employees', 
      'establishedYear', 'prefecture', 'city'
    ];
    
    var self = this;
    return requiredFields.every(function(field) {
      return self[field] && self[field] !== null && self[field] !== '';
    });
  };

  Company.prototype.getCompletionPercentage = function() {
    var allFields = [
      'companyName', 'officialName', 'phone', 'industryLarge', 'industryMedium',
      'employees', 'establishedYear', 'capital', 'listingStatus',
      'postalCode', 'prefecture', 'city', 'addressDetail',
      'representativeName', 'representativeTitle',
      'philosophy', 'latestNews', 'recruitmentStatus', 'website'
    ];
    
    var completedFields = 0;
    var self = this;
    
    allFields.forEach(function(field) {
      if (self[field] && self[field] !== null && self[field] !== '') {
        completedFields++;
      }
    });
    
    return Math.round((completedFields / allFields.length) * 100);
  };

  Company.prototype.toHeadquartersSpreadsheetRow = function() {
    // 基本企業情報用のソースURLを適切にフォーマット（公式サイト優先）
    // 最新ニュースと採用情報のソースURLは各カラム内に含めるため、ここでは基本情報のみ
    var formattedBasicInfoSourceUrls = '';
    if (this.officialSiteUrl) {
      formattedBasicInfoSourceUrls = '[公式] ' + this.officialSiteUrl;
      // 他のソースURLがある場合は追加
      var otherUrls = this.sourceUrls.filter(function(url) {
        return url !== this.officialSiteUrl;
      }.bind(this));
      if (otherUrls.length > 0) {
        formattedBasicInfoSourceUrls += '; ' + otherUrls.slice(0, 3).join('; '); // 最大3つまで
      }
    } else if (this.sourceUrls && this.sourceUrls.length > 0) {
      // 公式サイトがない場合は、最大4つのソースURLを表示
      formattedBasicInfoSourceUrls = this.sourceUrls.slice(0, 4).join('; ');
    } else if (this.primarySourceUrl) {
      formattedBasicInfoSourceUrls = this.primarySourceUrl;
    }

    // Map to headquarters sheet columns based on Constants.SHEET_CONFIG.HEADQUARTERS_COLUMNS
    var rowData = [
      this.id,                          // 企業ID
      this.companyName,                 // 企業名
      this.officialName,                // 正式企業名
      this.phone,                       // 電話番号
      this.industryLarge,               // 業種大分類
      this.industryMedium,              // 業種中分類
      this.employees,                   // 従業員数
      this.establishedYear,             // 設立年
      this.capital,                     // 資本金
      this.listingStatus,               // 上場区分
      this.postalCode,                  // 本社郵便番号
      this.prefecture,                  // 本社都道府県
      this.city,                        // 本社市区町村
      this.addressDetail,               // 本社住所詳細
      this.representativeName,          // 代表者名
      this.representativeTitle,         // 代表者役職
      this.philosophy,                  // 企業理念
      this.latestNews,                  // 最新ニュース（ソースURL含む）
      this.recruitmentStatus,           // 採用状況（ソースURL含む）
      this.website,                     // 企業URL
      parseFloat(this.reliabilityScore) || 0,  // 信頼性スコア（数値として明示）
      this.processedAt,                 // 処理日時
      this.processingResult,            // 処理結果
      this.errorMessage,                // エラー内容
      formattedBasicInfoSourceUrls      // 基本企業情報の参照先URL（25列目）
    ];
    
    // デバッグ用：実際に保存されるデータをログ出力
    if (typeof Logger !== 'undefined') {
      Logger.logDebug('Company spreadsheet row data', {
        id: this.id,
        companyName: this.companyName,
        phone: this.phone,
        prefecture: this.prefecture,
        reliabilityScore: parseFloat(this.reliabilityScore) || 0,
        basicInfoSourceUrlCount: this.sourceUrls ? this.sourceUrls.length : 0,
        officialSiteFound: !!this.officialSiteUrl,
        formattedBasicInfoSourceUrls: formattedBasicInfoSourceUrls,
        latestNewsHasUrls: !!(this.latestNews && this.latestNews.includes('【参照URL】')),
        recruitmentStatusHasUrls: !!(this.recruitmentStatus && this.recruitmentStatus.includes('【参照URL】')),
        nonNullFields: rowData.filter(function(field) {
          return field !== null && field !== undefined && field !== '';
        }).length,
        totalFields: rowData.length
      });
    }
    
    return rowData;
  };

  Company.prototype.toJSON = function() {
    var data = {};
    var self = this;
    
    Object.keys(this).forEach(function(key) {
      data[key] = self[key];
    });
    
    return data;
  };

  Company.prototype.clone = function() {
    return new Company(this.toJSON());
  };

  Company.prototype.update = function(newData) {
    var self = this;
    
    Object.keys(newData).forEach(function(key) {
      if (newData[key] !== undefined) {
        self[key] = newData[key];
      }
    });
    
    this.processedAt = new Date().toISOString();
  };

  Company.prototype.markAsProcessed = function(result, errorMessage) {
    this.processingResult = result || 'SUCCESS';
    this.errorMessage = errorMessage || '';
    this.processedAt = new Date().toISOString();
  };

  Company.prototype.markAsError = function(errorMessage) {
    this.processingResult = 'ERROR';
    this.errorMessage = errorMessage || 'Unknown error';
    this.processedAt = new Date().toISOString();
  };

  Company.prototype.isProcessed = function() {
    return this.processingResult === 'SUCCESS';
  };

  Company.prototype.hasError = function() {
    return this.processingResult === 'ERROR';
  };

  Company.prototype.getSearchTerms = function() {
    var terms = [];
    
    if (this.companyName) terms.push(this.companyName);
    if (this.officialName && this.officialName !== this.companyName) {
      terms.push(this.officialName);
    }
    if (this.phone) terms.push(this.phone);
    if (this.prefecture && this.city) {
      terms.push(this.prefecture + ' ' + this.city);
    }
    
    return terms;
  };

  Company.prototype.validate = function() {
    var errors = [];
    var warnings = [];
    
    // Required field validation
    if (!this.companyName || this.companyName.trim() === '') {
      errors.push('Company name is required');
    }
    
    if (!this.id || this.id.trim() === '') {
      errors.push('Company ID is required');
    }
    
    // Data quality validation
    if (this.employees && (isNaN(this.employees) || this.employees < 0)) {
      warnings.push('Invalid employee count');
    }
    
    if (this.establishedYear && (isNaN(this.establishedYear) || this.establishedYear < 1800 || this.establishedYear > new Date().getFullYear())) {
      warnings.push('Invalid established year');
    }
    
    if (this.website && !Constants.REGEX_PATTERNS.URL.test(this.website)) {
      warnings.push('Invalid website URL format');
    }
    
    if (this.phone && !Constants.REGEX_PATTERNS.PHONE_JP.test(this.phone)) {
      warnings.push('Invalid phone number format');
    }
    
    if (this.postalCode && !Constants.REGEX_PATTERNS.POSTAL_CODE_JP.test(this.postalCode)) {
      warnings.push('Invalid postal code format');
    }
    
    if (this.reliabilityScore && (this.reliabilityScore < 0 || this.reliabilityScore > 100)) {
      warnings.push('Reliability score should be between 0 and 100');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      completionPercentage: this.getCompletionPercentage()
    };
  };

  Company.prototype.toString = function() {
    return '[Company] ' + this.getDisplayName() + ' (' + this.id + ')';
  };

  // Return constructor
  return Company;
})();

// For backward compatibility, also create a factory function
function createCompany(data) {
  return new Company(data);
}