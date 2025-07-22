// Monitoring and structured logging utilities

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  requestId?: string;
  userId?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface MetricEntry {
  timestamp: string;
  name: string;
  value: number;
  labels?: Record<string, string>;
}

class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatLog(level: LogEntry['level'], message: string, metadata?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message: `[${this.context}] ${message}`,
      ...metadata
    };
  }

  info(message: string, metadata?: Record<string, any>) {
    const entry = this.formatLog('info', message, metadata);
    console.log(JSON.stringify(entry));
    return entry;
  }

  warn(message: string, metadata?: Record<string, any>) {
    const entry = this.formatLog('warn', message, metadata);
    console.warn(JSON.stringify(entry));
    return entry;
  }

  error(message: string, error?: Error | unknown, metadata?: Record<string, any>) {
    const entry = this.formatLog('error', message, {
      ...metadata,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    });
    console.error(JSON.stringify(entry));
    return entry;
  }
}

class Metrics {
  private static instance: Metrics;
  private metrics: MetricEntry[] = [];

  static getInstance(): Metrics {
    if (!Metrics.instance) {
      Metrics.instance = new Metrics();
    }
    return Metrics.instance;
  }

  record(name: string, value: number, labels?: Record<string, string>) {
    const entry: MetricEntry = {
      timestamp: new Date().toISOString(),
      name,
      value,
      labels
    };
    
    this.metrics.push(entry);
    
    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log metric in structured format
    console.log(JSON.stringify({
      type: 'metric',
      ...entry
    }));
  }

  getMetrics(): MetricEntry[] {
    return [...this.metrics];
  }

  getMetricsSummary(timeWindow?: number): Record<string, any> {
    const now = Date.now();
    const windowMs = timeWindow || 3600000; // 1 hour default
    
    const recentMetrics = this.metrics.filter(m => 
      now - new Date(m.timestamp).getTime() < windowMs
    );

    const summary: Record<string, any> = {};
    
    recentMetrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          count: 0,
          sum: 0,
          avg: 0,
          min: Number.MAX_VALUE,
          max: Number.MIN_VALUE,
          latest: null
        };
      }
      
      const s = summary[metric.name];
      s.count++;
      s.sum += metric.value;
      s.min = Math.min(s.min, metric.value);
      s.max = Math.max(s.max, metric.value);
      s.avg = s.sum / s.count;
      s.latest = metric.timestamp;
    });

    return summary;
  }
}

// Performance monitoring decorator
export function withTiming<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  metricName: string,
  logger?: Logger
): T {
  return (async (...args: any[]) => {
    const start = Date.now();
    const metrics = Metrics.getInstance();
    
    try {
      const result = await fn(...args);
      const duration = Date.now() - start;
      
      metrics.record(`${metricName}_duration`, duration);
      metrics.record(`${metricName}_success`, 1);
      
      if (logger) {
        logger.info(`${metricName} completed`, { duration });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      metrics.record(`${metricName}_duration`, duration);
      metrics.record(`${metricName}_error`, 1);
      
      if (logger) {
        logger.error(`${metricName} failed`, error, { duration });
      }
      
      throw error;
    }
  }) as T;
}

// Create logger instances
export const createLogger = (context: string) => new Logger(context);
export const getMetrics = () => Metrics.getInstance();

// Common loggers
export const apiLogger = createLogger('API');
export const dbLogger = createLogger('DATABASE');
export const claudeLogger = createLogger('CLAUDE');
export const frameLogger = createLogger('FRAME');

// Health check utilities
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  details?: Record<string, any>;
}

export async function checkServiceHealth(
  name: string,
  healthCheck: () => Promise<boolean>,
  timeout: number = 5000
): Promise<HealthStatus> {
  const start = Date.now();
  
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), timeout);
    });
    
    const result = await Promise.race([healthCheck(), timeoutPromise]);
    const duration = Date.now() - start;
    
    getMetrics().record(`health_check_${name}`, duration);
    
    return {
      status: result ? 'healthy' : 'unhealthy',
      message: result ? `${name} is healthy (${duration}ms)` : `${name} health check failed`,
      details: { duration }
    };
  } catch (error) {
    const duration = Date.now() - start;
    getMetrics().record(`health_check_${name}_error`, 1);
    
    return {
      status: 'unhealthy',
      message: `${name} health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { duration, error: error instanceof Error ? error.message : error }
    };
  }
}