/**
 * @fileoverview Base API client for the Corporate Research System
 * @author Corporate Research Team
 * 
 * 依存モジュール:
 * - Logger (src/core/Logger.js)
 * - ConfigManager (src/core/ConfigManager.js)
 * - ErrorHandler (src/core/ErrorHandler.js)
 * - Constants (src/core/Constants.js)
 */

var ApiBase = (function() {
  // Private variables
  var _requestCount = 0;
  var _lastRequestTime = 0;
  var _cache = CacheService.getScriptCache();

  // Private functions
  /**
   * Apply rate limiting
   * @private
   */
  function applyRateLimit(delayMs) {
    if (!delayMs) delayMs = ConfigManager.getNumber('RATE_LIMIT_DELAY', 1000);
    
    var now = Date.now();
    var timeSinceLastRequest = now - _lastRequestTime;
    
    if (timeSinceLastRequest < delayMs) {
      var waitTime = delayMs - timeSinceLastRequest;
      Logger.logDebug('Rate limiting: waiting ' + waitTime + 'ms');
      Utilities.sleep(waitTime);
    }
    
    _lastRequestTime = Date.now();
    _requestCount++;
  }

  /**
   * Get from cache
   * @private
   */
  function getFromCache(cacheKey) {
    try {
      var cached = _cache.get(cacheKey);
      if (cached) {
        Logger.logDebug('Cache hit for key: ' + cacheKey);
        return JSON.parse(cached);
      }
    } catch (error) {
      Logger.logWarning('Cache retrieval failed for key: ' + cacheKey, error);
    }
    return null;
  }

  /**
   * Save to cache
   * @private
   */
  function saveToCache(cacheKey, data, expirationInSeconds) {
    try {
      if (!expirationInSeconds) {
        expirationInSeconds = Constants.CACHE_CONFIG.DURATION.MEDIUM;
      }
      
      _cache.put(cacheKey, JSON.stringify(data), expirationInSeconds);
      Logger.logDebug('Cached data for key: ' + cacheKey);
    } catch (error) {
      Logger.logWarning('Cache save failed for key: ' + cacheKey, error);
    }
  }

  /**
   * Build query string
   * @private
   */
  function buildQueryString(params) {
    var parts = [];
    for (var key in params) {
      if (params.hasOwnProperty(key) && params[key] !== null && params[key] !== undefined) {
        parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
      }
    }
    return parts.length > 0 ? '?' + parts.join('&') : '';
  }

  /**
   * Handle API response
   * @private
   */
  function handleResponse(response, url) {
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    Logger.logDebug('API Response', {
      url: url,
      status: responseCode,
      responseLength: responseText.length
    });
    
    // Handle different response codes
    if (responseCode >= 200 && responseCode < 300) {
      try {
        return JSON.parse(responseText);
      } catch (error) {
        Logger.logError('Failed to parse JSON response', error);
        throw new Error('Invalid JSON response from API');
      }
    } else if (responseCode === 429) {
      throw new Error('Rate limit exceeded (429)');
    } else if (responseCode >= 400 && responseCode < 500) {
      throw new Error('Client error (' + responseCode + '): ' + responseText);
    } else if (responseCode >= 500) {
      throw new Error('Server error (' + responseCode + '): ' + responseText);
    } else {
      throw new Error('Unexpected response code (' + responseCode + '): ' + responseText);
    }
  }

  /**
   * Execute API request with retry logic
   * @private
   */
  function executeWithRetry(requestFunction, maxRetries, retryDelay) {
    if (!maxRetries) maxRetries = ConfigManager.getNumber('MAX_RETRY_COUNT', 3);
    if (!retryDelay) retryDelay = ConfigManager.getNumber('RETRY_DELAY_MS', 1000);
    
    var attempt = 0;
    
    while (attempt < maxRetries) {
      attempt++;
      
      try {
        var result = requestFunction();
        return result; // 成功時は結果を直接返す
      } catch (error) {
        Logger.logWarning('API request failed (attempt ' + attempt + '/' + maxRetries + ')', error);
        
        if (attempt >= maxRetries) {
          Logger.logError('API request failed after ' + maxRetries + ' attempts', error);
          throw error; // 最大試行回数に達した場合はエラーを投げる
        }
        
        // Check if error is retryable
        var isRetryable = ErrorHandler.isRetryable(ErrorHandler.errorTypes.API_ERROR) ||
                         error.message.indexOf('Rate limit') !== -1 ||
                         error.message.indexOf('Server error') !== -1 ||
                         error.message.indexOf('timeout') !== -1;
        
        if (!isRetryable) {
          Logger.logError('Non-retryable error, aborting', error);
          throw error; // リトライ不可能なエラーの場合は即座に投げる
        }
        
        // Calculate delay with exponential backoff
        var delay = retryDelay * Math.pow(2, attempt - 1);
        Logger.logDebug('Retrying in ' + delay + 'ms');
        
        // Google Apps ScriptではsetTimeoutの代わりにUtilities.sleepを使用
        Utilities.sleep(delay);
      }
    }
  }

  // Public functions
  /**
   * Make HTTP GET request
   */
  function get(url, params, options) {
    if (!options) options = {};
    
    // Build URL with query parameters
    var fullUrl = url + buildQueryString(params || {});
    
    // Check cache first (if enabled)
    var cacheKey = null;
    if (options.useCache !== false) {
      cacheKey = 'GET_' + fullUrl.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 200);
      var cached = getFromCache(cacheKey);
      if (cached) {
        return cached; // 同期的に返す
      }
    }
    
    try {
      var data = executeWithRetry(function() {
        applyRateLimit(options.rateLimitDelay);
        
        var requestOptions = {
          method: 'GET',
          headers: options.headers || {},
          muteHttpExceptions: true
        };
        
        // Add timeout if specified
        if (options.timeout) {
          requestOptions.timeout = options.timeout;
        }
        
        Logger.logDebug('Making GET request to: ' + fullUrl);
        var response = UrlFetchApp.fetch(fullUrl, requestOptions);
        var responseData = handleResponse(response, fullUrl);
        
        // Cache successful response
        if (cacheKey && options.useCache !== false) {
          saveToCache(cacheKey, responseData, options.cacheExpiration);
        }
        
        return responseData;
      }, options.maxRetries, options.retryDelay);
      
      return data;
    } catch (error) {
      Logger.logError('GET request failed: ' + fullUrl, error);
      throw error;
    }
  }

  /**
   * Make HTTP POST request
   */
  function post(url, payload, options) {
    if (!options) options = {};
    
    try {
      var data = executeWithRetry(function() {
        applyRateLimit(options.rateLimitDelay);
        
        var requestOptions = {
          method: 'POST',
          headers: options.headers || {},
          muteHttpExceptions: true
        };
        
        // Set payload
        if (payload) {
          if (typeof payload === 'object') {
            requestOptions.payload = JSON.stringify(payload);
            if (!requestOptions.headers['Content-Type']) {
              requestOptions.headers['Content-Type'] = 'application/json';
            }
          } else {
            requestOptions.payload = payload;
          }
        }
        
        // Add timeout if specified
        if (options.timeout) {
          requestOptions.timeout = options.timeout;
        }
        
        Logger.logDebug('Making POST request to: ' + url);
        var response = UrlFetchApp.fetch(url, requestOptions);
        return handleResponse(response, url);
      }, options.maxRetries, options.retryDelay);
      
      return data;
    } catch (error) {
      Logger.logError('POST request failed: ' + url, error);
      throw error;
    }
  }

  /**
   * Make HTTP PUT request
   */
  function put(url, payload, options) {
    if (!options) options = {};
    options.method = 'PUT';
    return post(url, payload, options);
  }

  /**
   * Make HTTP DELETE request
   */
  function deleteRequest(url, options) {
    if (!options) options = {};
    
    try {
      var data = executeWithRetry(function() {
        applyRateLimit(options.rateLimitDelay);
        
        var requestOptions = {
          method: 'DELETE',
          headers: options.headers || {},
          muteHttpExceptions: true
        };
        
        // Add timeout if specified
        if (options.timeout) {
          requestOptions.timeout = options.timeout;
        }
        
        Logger.logDebug('Making DELETE request to: ' + url);
        var response = UrlFetchApp.fetch(url, requestOptions);
        return handleResponse(response, url);
      }, options.maxRetries, options.retryDelay);
      
      return data;
    } catch (error) {
      Logger.logError('DELETE request failed: ' + url, error);
      throw error;
    }
  }

  /**
   * Get request statistics
   */
  function getStats() {
    return {
      requestCount: _requestCount,
      lastRequestTime: _lastRequestTime
    };
  }

  /**
   * Reset request statistics
   */
  function resetStats() {
    _requestCount = 0;
    _lastRequestTime = 0;
  }

  /**
   * Clear cache
   */
  function clearCache() {
    try {
      _cache.removeAll([]);
      Logger.logInfo('API cache cleared');
    } catch (error) {
      Logger.logWarning('Failed to clear API cache', error);
    }
  }

  // Return public API
  return {
    get: get,
    post: post,
    put: put,
    delete: deleteRequest,
    getStats: getStats,
    resetStats: resetStats,
    clearCache: clearCache
  };
})();