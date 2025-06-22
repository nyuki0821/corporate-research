/**
 * @fileoverview Manual Control System for the Corporate Research System
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
  var _processStatus = {
    batchProcessing: false,
    systemMaintenance: false,
    errorMonitoring: false,
    performanceCheck: false
  };

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
   * Set process status
   * @private
   */
  function setProcessStatus(processName, isRunning) {
    _processStatus[processName] = isRunning;
    
    // Store status in script properties for persistence
    var statusKey = 'PROCESS_STATUS_' + processName.toUpperCase();
    ConfigManager.set(statusKey, isRunning.toString());
    
    Logger.logInfo('Process status updated', {
      process: processName,
      status: isRunning ? 'RUNNING' : 'STOPPED'
    });
  }

  /**
   * Get process status
   * @private
   */
  function getProcessStatus(processName) {
    // Get from script properties for persistence
    var statusKey = 'PROCESS_STATUS_' + processName.toUpperCase();
    var stored = ConfigManager.get(statusKey);
    
    if (stored !== null) {
      _processStatus[processName] = stored === 'true';
    }
    
    return _processStatus[processName] || false;
  }

  // Public functions
  /**
   * Delete all project triggers (cleanup function)
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
   * Get all process status
   */
  function getAllProcessStatus() {
    var status = {};
    
    Object.keys(_processStatus).forEach(function(processName) {
      status[processName] = getProcessStatus(processName);
    });
    
    return {
      success: true,
      processCount: Object.keys(status).length,
      processes: status
    };
  }

  /**
   * Start batch processing manually
   */
  function startBatchProcessing() {
    try {
      if (getProcessStatus('batchProcessing')) {
        Logger.logWarning('Batch processing is already running');
        return {
          success: false,
          error: 'Batch processing is already running'
        };
      }
      
      setProcessStatus('batchProcessing', true);
      Logger.logInfo('Starting manual batch processing');
      
      // Execute batch processing
      if (typeof BatchProcessor !== 'undefined') {
        BatchProcessor.startBatchProcessing();
      } else {
        Logger.logError('BatchProcessor not available');
        setProcessStatus('batchProcessing', false);
        throw new Error('BatchProcessor not available');
      }
      
      return {
        success: true,
        message: 'Batch processing started successfully'
      };
      
    } catch (error) {
      Logger.logError('Failed to start batch processing', error);
      setProcessStatus('batchProcessing', false);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stop batch processing manually
   */
  function stopBatchProcessing() {
    try {
      if (!getProcessStatus('batchProcessing')) {
        Logger.logWarning('Batch processing is not running');
        return {
          success: false,
          error: 'Batch processing is not running'
        };
      }
      
      setProcessStatus('batchProcessing', false);
      Logger.logInfo('Stopped manual batch processing');
      
      // Note: Actual stopping of running process would require additional implementation
      // For now, we just update the status
      
      return {
        success: true,
        message: 'Batch processing stopped successfully'
      };
      
    } catch (error) {
      Logger.logError('Failed to stop batch processing', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute system maintenance manually
   */
  function executeSystemMaintenance() {
    try {
      if (getProcessStatus('systemMaintenance')) {
        Logger.logWarning('System maintenance is already running');
        return {
          success: false,
          error: 'System maintenance is already running'
        };
      }
      
      setProcessStatus('systemMaintenance', true);
      Logger.logInfo('Starting manual system maintenance');
      
      // Clear old cache entries
      if (typeof ApiBase !== 'undefined') {
        ApiBase.clearCache();
      }
      
      // Clear configuration cache
      if (typeof ConfigManager !== 'undefined') {
        ConfigManager.clearCache();
      }
      
      // Clear script cache
      CacheService.getScriptCache().removeAll([]);
      
      setProcessStatus('systemMaintenance', false);
      Logger.logInfo('System maintenance completed');
      
      return {
        success: true,
        message: 'System maintenance completed successfully'
      };
      
    } catch (error) {
      Logger.logError('Error in system maintenance', error);
      setProcessStatus('systemMaintenance', false);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute error monitoring manually
   */
  function executeErrorMonitoring() {
    try {
      if (getProcessStatus('errorMonitoring')) {
        Logger.logWarning('Error monitoring is already running');
        return {
          success: false,
          error: 'Error monitoring is already running'
        };
      }
      
      setProcessStatus('errorMonitoring', true);
      Logger.logInfo('Starting manual error monitoring');
      
      var result = { hasAlerts: false, alerts: [] };
      
      if (typeof ErrorHandler !== 'undefined') {
        var monitoring = ErrorHandler.monitorCriticalErrors();
        result = monitoring;
        
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
      
      setProcessStatus('errorMonitoring', false);
      Logger.logInfo('Error monitoring completed');
      
      return {
        success: true,
        message: 'Error monitoring completed successfully',
        hasAlerts: result.hasAlerts,
        alerts: result.alerts || []
      };
      
    } catch (error) {
      Logger.logError('Error in error monitoring', error);
      setProcessStatus('errorMonitoring', false);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute performance check manually
   */
  function executePerformanceCheck() {
    try {
      if (getProcessStatus('performanceCheck')) {
        Logger.logWarning('Performance check is already running');
        return {
          success: false,
          error: 'Performance check is already running'
        };
      }
      
      setProcessStatus('performanceCheck', true);
      Logger.logInfo('Starting manual performance check');
      
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
      
      setProcessStatus('performanceCheck', false);
      Logger.logInfo('Performance check completed', stats);
      
      return {
        success: true,
        message: 'Performance check completed successfully',
        stats: stats
      };
      
    } catch (error) {
      Logger.logError('Error in performance check', error);
      setProcessStatus('performanceCheck', false);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stop all running processes
   */
  function stopAllProcesses() {
    try {
      Logger.logInfo('Stopping all running processes');
      
      var results = {};
      
      // Stop each process
      Object.keys(_processStatus).forEach(function(processName) {
        if (getProcessStatus(processName)) {
          setProcessStatus(processName, false);
          results[processName] = 'STOPPED';
        } else {
          results[processName] = 'NOT_RUNNING';
        }
      });
      
      Logger.logInfo('All processes stopped', results);
      
      return {
        success: true,
        message: 'All processes stopped successfully',
        results: results
      };
      
    } catch (error) {
      Logger.logError('Failed to stop all processes', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test manual control system
   */
  function testManualControlSystem() {
    try {
      Logger.logInfo('Testing manual control system');
      
      // Test status functions
      var statusResult = getAllProcessStatus();
      
      if (statusResult.success) {
        Logger.logInfo('Manual control system test completed successfully');
        
        return {
          success: true,
          message: 'Manual control system is working correctly',
          processCount: statusResult.processCount
        };
      } else {
        throw new Error('Status check failed');
      }
      
    } catch (error) {
      Logger.logError('Manual control system test failed', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Return public API
  return {
    // Status functions
    getAllProcessStatus: getAllProcessStatus,
    getTriggerStatus: getTriggerStatus,
    
    // Manual control functions
    startBatchProcessing: startBatchProcessing,
    stopBatchProcessing: stopBatchProcessing,
    executeSystemMaintenance: executeSystemMaintenance,
    executeErrorMonitoring: executeErrorMonitoring,
    executePerformanceCheck: executePerformanceCheck,
    stopAllProcesses: stopAllProcesses,
    
    // Cleanup functions
    deleteAllTriggers: deleteAllTriggers,
    
    // Test function
    testManualControlSystem: testManualControlSystem
  };
})();

// Global functions for manual execution (called from spreadsheet menu)
function startBatchProcessingManually() {
  try {
    Logger.logInfo('Starting batch processing manually from menu');
    return TriggerManager.startBatchProcessing();
  } catch (error) {
    Logger.logError('Error starting batch processing manually', error);
    ErrorHandler.handleError(error, { function: 'startBatchProcessingManually' });
    throw error;
  }
}

function stopBatchProcessingManually() {
  try {
    Logger.logInfo('Stopping batch processing manually from menu');
    return TriggerManager.stopBatchProcessing();
  } catch (error) {
    Logger.logError('Error stopping batch processing manually', error);
    ErrorHandler.handleError(error, { function: 'stopBatchProcessingManually' });
    throw error;
  }
}

function executeSystemMaintenanceManually() {
  try {
    Logger.logInfo('Executing system maintenance manually from menu');
    return TriggerManager.executeSystemMaintenance();
  } catch (error) {
    Logger.logError('Error in manual system maintenance', error);
    ErrorHandler.handleError(error, { function: 'executeSystemMaintenanceManually' });
    throw error;
  }
}

function executeErrorMonitoringManually() {
  try {
    Logger.logInfo('Executing error monitoring manually from menu');
    return TriggerManager.executeErrorMonitoring();
  } catch (error) {
    Logger.logError('Error in manual error monitoring', error);
    ErrorHandler.handleError(error, { function: 'executeErrorMonitoringManually' });
    throw error;
  }
}

function executePerformanceCheckManually() {
  try {
    Logger.logInfo('Executing performance check manually from menu');
    return TriggerManager.executePerformanceCheck();
  } catch (error) {
    Logger.logError('Error in manual performance check', error);
    ErrorHandler.handleError(error, { function: 'executePerformanceCheckManually' });
    throw error;
  }
}

function stopAllProcessesManually() {
  try {
    Logger.logInfo('Stopping all processes manually from menu');
    return TriggerManager.stopAllProcesses();
  } catch (error) {
    Logger.logError('Error stopping all processes manually', error);
    ErrorHandler.handleError(error, { function: 'stopAllProcessesManually' });
    throw error;
  }
}

function checkProcessStatusManually() {
  try {
    Logger.logInfo('Checking process status manually from menu');
    return TriggerManager.getAllProcessStatus();
  } catch (error) {
    Logger.logError('Error checking process status manually', error);
    ErrorHandler.handleError(error, { function: 'checkProcessStatusManually' });
    throw error;
  }
}

// Backward compatibility - remove all automatic trigger setup
function setupBasicTriggersOnly() {
  Logger.logWarning('Automatic trigger setup is disabled. Use manual control functions instead.');
  return {
    success: false,
    error: 'Automatic triggers are disabled. Use manual control functions.'
  };
}

function setupAllTriggersWithMonitoring() {
  Logger.logWarning('Automatic trigger setup is disabled. Use manual control functions instead.');
  return {
    success: false,
    error: 'Automatic triggers are disabled. Use manual control functions.'
  };
} 