/**
 * @fileoverview Trigger management system for the Corporate Research System
 * @author Corporate Research Team
 * 
 * 依存モジュール:
 * - Logger (src/core/Logger.js)
 * - ConfigManager (src/core/ConfigManager.js)
 * - ErrorHandler (src/core/ErrorHandler.js)
 * - Constants (src/core/Constants.js)
 */

var TriggerManager = (function() {
  // Private variables
  var _activeTriggers = [];

  // Private functions
  /**
   * Get all project triggers
   * @private
   */
  function getAllTriggers() {
    return ScriptApp.getProjectTriggers();
  }

  /**
   * Delete trigger by function name
   * @private
   */
  function deleteTriggersByFunction(functionName) {
    var triggers = getAllTriggers();
    var deletedCount = 0;
    
    triggers.forEach(function(trigger) {
      if (trigger.getHandlerFunction() === functionName) {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
        Logger.logDebug('Deleted trigger for function: ' + functionName);
      }
    });
    
    return deletedCount;
  }

  /**
   * Create time-based trigger
   * @private
   */
  function createTimeTrigger(functionName, intervalMinutes, startTime) {
    try {
      var trigger;
      
      if (intervalMinutes) {
        // Recurring trigger
        trigger = ScriptApp.newTrigger(functionName)
          .timeBased()
          .everyMinutes(intervalMinutes)
          .create();
      } else if (startTime) {
        // One-time trigger
        trigger = ScriptApp.newTrigger(functionName)
          .timeBased()
          .at(startTime)
          .create();
      } else {
        throw new Error('Either intervalMinutes or startTime must be provided');
      }
      
      Logger.logInfo('Created time trigger for function: ' + functionName);
      return trigger;
    } catch (error) {
      Logger.logError('Failed to create time trigger for: ' + functionName, error);
      throw error;
    }
  }

  /**
   * Create daily trigger
   * @private
   */
  function createDailyTrigger(functionName, hour, minute) {
    try {
      var trigger = ScriptApp.newTrigger(functionName)
        .timeBased()
        .everyDays(1)
        .atHour(hour || 0)
        .nearMinute(minute || 0)
        .create();
      
      Logger.logInfo('Created daily trigger for function: ' + functionName + ' at ' + (hour || 0) + ':' + (minute || 0));
      return trigger;
    } catch (error) {
      Logger.logError('Failed to create daily trigger for: ' + functionName, error);
      throw error;
    }
  }

  /**
   * Create weekly trigger
   * @private
   */
  function createWeeklyTrigger(functionName, dayOfWeek, hour, minute) {
    try {
      var trigger = ScriptApp.newTrigger(functionName)
        .timeBased()
        .onWeekDay(dayOfWeek || ScriptApp.WeekDay.SUNDAY)
        .atHour(hour || 0)
        .nearMinute(minute || 0)
        .create();
      
      Logger.logInfo('Created weekly trigger for function: ' + functionName);
      return trigger;
    } catch (error) {
      Logger.logError('Failed to create weekly trigger for: ' + functionName, error);
      throw error;
    }
  }

  // Public functions
  /**
   * Setup all basic triggers
   */
  function setupBasicTriggers() {
    try {
      Logger.logInfo('Setting up basic triggers for Corporate Research System');
      
      var setupTriggers = [];
      
      // 1. Batch processing trigger (every 4 hours)
      deleteTriggersByFunction('executeBatchProcessing');
      var batchTrigger = createTimeTrigger('executeBatchProcessing', 240); // 4 hours
      setupTriggers.push({ function: 'executeBatchProcessing', type: 'recurring', trigger: batchTrigger });
      
      // 2. System maintenance trigger (daily at 3:00 AM)
      deleteTriggersByFunction('executeSystemMaintenance');
      var maintenanceTrigger = createDailyTrigger('executeSystemMaintenance', 3, 0);
      setupTriggers.push({ function: 'executeSystemMaintenance', type: 'daily', trigger: maintenanceTrigger });
      
      // 3. Cache cleanup trigger (daily at 2:00 AM)
      deleteTriggersByFunction('executeCacheCleanup');
      var cacheCleanupTrigger = createDailyTrigger('executeCacheCleanup', 2, 0);
      setupTriggers.push({ function: 'executeCacheCleanup', type: 'daily', trigger: cacheCleanupTrigger });
      
      // 4. Configuration validation trigger (weekly on Sunday at 1:00 AM)
      deleteTriggersByFunction('executeConfigValidation');
      var configTrigger = createWeeklyTrigger('executeConfigValidation', ScriptApp.WeekDay.SUNDAY, 1, 0);
      setupTriggers.push({ function: 'executeConfigValidation', type: 'weekly', trigger: configTrigger });
      
      Logger.logInfo('Basic triggers setup completed', { 
        triggerCount: setupTriggers.length 
      });
      
      return {
        success: true,
        triggers: setupTriggers,
        count: setupTriggers.length
      };
      
    } catch (error) {
      Logger.logError('Failed to setup basic triggers', error);
      ErrorHandler.handleError(error, { function: 'setupBasicTriggers' });
      
      return {
        success: false,
        error: error.message,
        triggers: []
      };
    }
  }

  /**
   * Setup monitoring triggers
   */
  function setupMonitoringTriggers() {
    try {
      Logger.logInfo('Setting up monitoring triggers');
      
      var setupTriggers = [];
      
      // Error monitoring trigger (every 2 hours)
      deleteTriggersByFunction('executeErrorMonitoring');
      var errorMonitorTrigger = createTimeTrigger('executeErrorMonitoring', 120);
      setupTriggers.push({ function: 'executeErrorMonitoring', type: 'recurring', trigger: errorMonitorTrigger });
      
      // Performance monitoring trigger (daily at 6:00 AM)
      deleteTriggersByFunction('executePerformanceCheck');
      var perfTrigger = createDailyTrigger('executePerformanceCheck', 6, 0);
      setupTriggers.push({ function: 'executePerformanceCheck', type: 'daily', trigger: perfTrigger });
      
      Logger.logInfo('Monitoring triggers setup completed', { 
        triggerCount: setupTriggers.length 
      });
      
      return {
        success: true,
        triggers: setupTriggers,
        count: setupTriggers.length
      };
      
    } catch (error) {
      Logger.logError('Failed to setup monitoring triggers', error);
      return {
        success: false,
        error: error.message,
        triggers: []
      };
    }
  }

  /**
   * Setup all triggers (basic + monitoring)
   */
  function setupAllTriggers() {
    try {
      Logger.logInfo('Setting up all triggers for Corporate Research System');
      
      var basicResult = setupBasicTriggers();
      var monitoringResult = setupMonitoringTriggers();
      
      var totalTriggers = (basicResult.triggers || []).concat(monitoringResult.triggers || []);
      
      Logger.logInfo('All triggers setup completed', {
        totalTriggers: totalTriggers.length,
        basicSuccess: basicResult.success,
        monitoringSuccess: monitoringResult.success
      });
      
      return {
        success: basicResult.success && monitoringResult.success,
        basic: basicResult,
        monitoring: monitoringResult,
        totalCount: totalTriggers.length,
        allTriggers: totalTriggers
      };
      
    } catch (error) {
      Logger.logError('Failed to setup all triggers', error);
      ErrorHandler.handleError(error, { function: 'setupAllTriggers' });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete all project triggers
   */
  function deleteAllTriggers() {
    try {
      var triggers = getAllTriggers();
      var deletedCount = 0;
      
      triggers.forEach(function(trigger) {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
      });
      
      Logger.logInfo('Deleted all triggers', { count: deletedCount });
      
      return {
        success: true,
        deletedCount: deletedCount
      };
      
    } catch (error) {
      Logger.logError('Failed to delete all triggers', error);
      
      return {
        success: false,
        error: error.message,
        deletedCount: 0
      };
    }
  }

  /**
   * Get trigger status
   */
  function getTriggerStatus() {
    try {
      var triggers = getAllTriggers();
      var triggerInfo = [];
      
      triggers.forEach(function(trigger) {
        var info = {
          handlerFunction: trigger.getHandlerFunction(),
          triggerId: trigger.getUniqueId(),
          eventType: trigger.getEventType().toString(),
          source: trigger.getTriggerSource().toString()
        };
        
        if (trigger.getEventType() === ScriptApp.EventType.CLOCK) {
          // This is a time-based trigger
          info.triggerType = 'TIME_BASED';
        } else {
          info.triggerType = 'OTHER';
        }
        
        triggerInfo.push(info);
      });
      
      return {
        success: true,
        triggerCount: triggers.length,
        triggers: triggerInfo
      };
      
    } catch (error) {
      Logger.logError('Failed to get trigger status', error);
      
      return {
        success: false,
        error: error.message,
        triggerCount: 0,
        triggers: []
      };
    }
  }

  /**
   * Schedule one-time batch processing
   */
  function scheduleBatchProcessing(delayMinutes) {
    try {
      if (!delayMinutes) delayMinutes = 1;
      
      var startTime = new Date();
      startTime.setMinutes(startTime.getMinutes() + delayMinutes);
      
      // Delete any existing scheduled batch processing
      deleteTriggersByFunction('executeBatchProcessing');
      
      var trigger = createTimeTrigger('executeBatchProcessing', null, startTime);
      
      Logger.logInfo('Scheduled batch processing', { 
        startTime: startTime.toISOString(),
        delayMinutes: delayMinutes
      });
      
      return {
        success: true,
        scheduledTime: startTime,
        trigger: trigger
      };
      
    } catch (error) {
      Logger.logError('Failed to schedule batch processing', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test trigger system
   */
  function testTriggerSystem() {
    try {
      Logger.logInfo('Testing trigger system');
      
      // Create a test trigger
      var testTime = new Date();
      testTime.setMinutes(testTime.getMinutes() + 1);
      
      var testTrigger = createTimeTrigger('testTriggerFunction', null, testTime);
      
      // Immediately delete it (just testing creation)
      ScriptApp.deleteTrigger(testTrigger);
      
      Logger.logInfo('Trigger system test completed successfully');
      
      return {
        success: true,
        message: 'Trigger system is working correctly'
      };
      
    } catch (error) {
      Logger.logError('Trigger system test failed', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Return public API
  return {
    setupBasicTriggers: setupBasicTriggers,
    setupMonitoringTriggers: setupMonitoringTriggers,
    setupAllTriggers: setupAllTriggers,
    deleteAllTriggers: deleteAllTriggers,
    getTriggerStatus: getTriggerStatus,
    scheduleBatchProcessing: scheduleBatchProcessing,
    testTriggerSystem: testTriggerSystem
  };
})();

// Global functions for trigger execution
function executeBatchProcessing() {
  try {
    Logger.logInfo('Executing scheduled batch processing');
    
    if (typeof BatchProcessor !== 'undefined') {
      BatchProcessor.startBatchProcessing();
    } else {
      Logger.logError('BatchProcessor not available');
    }
  } catch (error) {
    Logger.logError('Error in scheduled batch processing', error);
    ErrorHandler.handleError(error, { function: 'executeBatchProcessing' });
  }
}

function executeSystemMaintenance() {
  try {
    Logger.logInfo('Executing system maintenance');
    
    // Clear old cache entries
    if (typeof ApiBase !== 'undefined') {
      ApiBase.clearCache();
    }
    
    // Clear configuration cache
    if (typeof ConfigManager !== 'undefined') {
      ConfigManager.clearCache();
    }
    
    Logger.logInfo('System maintenance completed');
  } catch (error) {
    Logger.logError('Error in system maintenance', error);
    ErrorHandler.handleError(error, { function: 'executeSystemMaintenance' });
  }
}

function executeCacheCleanup() {
  try {
    Logger.logInfo('Executing cache cleanup');
    
    var cache = CacheService.getScriptCache();
    cache.removeAll([]);
    
    Logger.logInfo('Cache cleanup completed');
  } catch (error) {
    Logger.logError('Error in cache cleanup', error);
    ErrorHandler.handleError(error, { function: 'executeCacheCleanup' });
  }
}

function executeConfigValidation() {
  try {
    Logger.logInfo('Executing configuration validation');
    
    if (typeof ConfigManager !== 'undefined') {
      var validation = ConfigManager.validate();
      
      if (!validation.isValid) {
        Logger.logWarning('Configuration validation failed', validation);
        
        // Send notification if email is configured
        var email = ConfigManager.get('NOTIFICATION_EMAIL');
        if (email) {
          MailApp.sendEmail(
            email,
            '[Corporate Research] Configuration Issues Detected',
            'Configuration validation found issues:\n\n' + validation.issues.join('\n')
          );
        }
      } else {
        Logger.logInfo('Configuration validation passed');
      }
    }
  } catch (error) {
    Logger.logError('Error in configuration validation', error);
    ErrorHandler.handleError(error, { function: 'executeConfigValidation' });
  }
}

function executeErrorMonitoring() {
  try {
    Logger.logInfo('Executing error monitoring');
    
    if (typeof ErrorHandler !== 'undefined') {
      var monitoring = ErrorHandler.monitorCriticalErrors();
      
      if (monitoring.hasAlerts) {
        Logger.logWarning('Critical errors detected', monitoring);
        
        var email = ConfigManager.get('NOTIFICATION_EMAIL');
        if (email) {
          var alertMessages = monitoring.alerts.map(function(alert) {
            return '- ' + alert.level + ': ' + alert.message + ' (' + alert.action + ')';
          }).join('\n');
          
          MailApp.sendEmail(
            email,
            '[Corporate Research] Critical Error Alert',
            'Critical errors detected in the system:\n\n' + alertMessages
          );
        }
      }
    }
  } catch (error) {
    Logger.logError('Error in error monitoring', error);
    ErrorHandler.handleError(error, { function: 'executeErrorMonitoring' });
  }
}

function executePerformanceCheck() {
  try {
    Logger.logInfo('Executing performance check');
    
    // Check API statistics
    var stats = {
      timestamp: new Date(),
      components: {}
    };
    
    if (typeof TavilyClient !== 'undefined') {
      stats.components.tavily = TavilyClient.getApiStats();
    }
    
    if (typeof OpenAIClient !== 'undefined') {
      stats.components.openai = OpenAIClient.getApiStats();
    }
    
    if (typeof CompanyResearchService !== 'undefined') {
      stats.components.research = CompanyResearchService.getResearchStats();
    }
    
    Logger.logInfo('Performance check completed', stats);
  } catch (error) {
    Logger.logError('Error in performance check', error);
    ErrorHandler.handleError(error, { function: 'executePerformanceCheck' });
  }
}

function testTriggerFunction() {
  Logger.logInfo('Test trigger function executed successfully');
}

// Backward compatibility functions
function setupBasicTriggersOnly() {
  return TriggerManager.setupBasicTriggers();
}

function setupAllTriggersWithMonitoring() {
  return TriggerManager.setupAllTriggers();
}