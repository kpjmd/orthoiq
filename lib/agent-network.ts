import { Agent, AgentContext, AgentResult, AgentTask, AgentEnrichment } from './types';
import { agentOrchestrator } from './agentOrchestrator';
import { createAgentTask, updateAgentTask, getAgentTask } from './database';
import EventEmitter from 'events';

/**
 * Agent Network Service
 * Manages distributed agent coordination, discovery, and inter-agent communication
 */

interface AgentNode {
  agent: Agent;
  status: 'active' | 'inactive' | 'busy' | 'error';
  lastHealthCheck: Date;
  currentLoad: number;
  maxLoad: number;
  capabilities: string[];
  performance: AgentPerformanceMetrics;
}

interface AgentPerformanceMetrics {
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  lastExecutionTime?: number;
  errorCount: number;
}

interface NetworkMessage {
  id: string;
  from: string;
  to: string;
  type: 'request' | 'response' | 'broadcast' | 'health' | 'discovery';
  payload: any;
  timestamp: Date;
}

interface TaskRoute {
  taskId: string;
  sourceAgent: string;
  targetAgent: string;
  reason: string;
  timestamp: Date;
}

export class AgentNetworkManager extends EventEmitter {
  private nodes: Map<string, AgentNode> = new Map();
  private messageQueue: NetworkMessage[] = [];
  private taskRoutes: Map<string, TaskRoute[]> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private loadBalancerEnabled: boolean = true;
  private networkId: string;

  constructor(networkId: string = 'default') {
    super();
    this.networkId = networkId;
    this.initializeNetwork();
  }

  /**
   * Initialize the agent network
   */
  private initializeNetwork() {
    console.log(`Initializing Agent Network: ${this.networkId}`);
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Set up message processing
    this.startMessageProcessor();
    
    // Register with global orchestrator
    this.syncWithOrchestrator();
  }

  /**
   * Register an agent in the network
   */
  async registerAgent(agent: Agent, capabilities: string[] = [], maxLoad: number = 10): Promise<void> {
    const node: AgentNode = {
      agent,
      status: 'active',
      lastHealthCheck: new Date(),
      currentLoad: 0,
      maxLoad,
      capabilities: [...capabilities, agent.name],
      performance: {
        totalExecutions: 0,
        successRate: 1.0,
        averageExecutionTime: 0,
        errorCount: 0
      }
    };

    this.nodes.set(agent.name, node);
    
    // Register with orchestrator
    agentOrchestrator.registerAgent(agent);
    
    // Broadcast agent discovery
    await this.broadcastMessage({
      type: 'discovery',
      payload: {
        agentName: agent.name,
        capabilities: node.capabilities,
        status: 'joined'
      }
    });

    this.emit('agent:registered', agent.name);
    console.log(`Agent ${agent.name} registered in network ${this.networkId}`);
  }

  /**
   * Unregister an agent from the network
   */
  async unregisterAgent(agentName: string): Promise<void> {
    const node = this.nodes.get(agentName);
    if (!node) {
      throw new Error(`Agent ${agentName} not found in network`);
    }

    // Mark as inactive
    node.status = 'inactive';
    
    // Wait for current tasks to complete
    await this.waitForAgentTasks(agentName);
    
    // Remove from network
    this.nodes.delete(agentName);
    agentOrchestrator.unregisterAgent(agentName);
    
    // Broadcast departure
    await this.broadcastMessage({
      type: 'discovery',
      payload: {
        agentName,
        status: 'departed'
      }
    });

    this.emit('agent:unregistered', agentName);
    console.log(`Agent ${agentName} unregistered from network ${this.networkId}`);
  }

  /**
   * Execute a task with intelligent routing
   */
  async executeTask(context: AgentContext, options: {
    preferredAgent?: string;
    requiredCapabilities?: string[];
    maxRetries?: number;
    timeout?: number;
  } = {}): Promise<AgentResult> {
    const taskId = `network_task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Find suitable agents
    const candidates = this.findSuitableAgents(context, options);
    
    if (candidates.length === 0) {
      return {
        success: false,
        error: 'No suitable agents available for this task'
      };
    }

    // Select best agent based on load and performance
    const selectedAgent = this.selectBestAgent(candidates, options.preferredAgent);
    
    if (!selectedAgent) {
      return {
        success: false,
        error: 'All suitable agents are at capacity'
      };
    }

    // Route task to selected agent
    this.recordTaskRoute(taskId, 'network', selectedAgent.agent.name, 'load_balanced');
    
    // Execute with monitoring
    return await this.executeWithMonitoring(selectedAgent, context, taskId, options);
  }

  /**
   * Find agents suitable for a given context
   */
  private findSuitableAgents(context: AgentContext, options: {
    requiredCapabilities?: string[];
  }): AgentNode[] {
    const candidates: AgentNode[] = [];
    
    for (const node of this.nodes.values()) {
      // Check if agent is available
      if (node.status !== 'active' && node.status !== 'busy') {
        continue;
      }
      
      // Check if agent can handle context
      if (!node.agent.canHandle(context)) {
        continue;
      }
      
      // Check required capabilities
      if (options.requiredCapabilities) {
        const hasAllCapabilities = options.requiredCapabilities.every(
          cap => node.capabilities.includes(cap)
        );
        if (!hasAllCapabilities) {
          continue;
        }
      }
      
      candidates.push(node);
    }
    
    return candidates;
  }

  /**
   * Select the best agent based on load and performance
   */
  private selectBestAgent(candidates: AgentNode[], preferredAgent?: string): AgentNode | null {
    // Check for preferred agent first
    if (preferredAgent) {
      const preferred = candidates.find(n => n.agent.name === preferredAgent);
      if (preferred && preferred.currentLoad < preferred.maxLoad) {
        return preferred;
      }
    }
    
    // Sort by score (lower is better)
    const scored = candidates
      .filter(node => node.currentLoad < node.maxLoad)
      .map(node => ({
        node,
        score: this.calculateAgentScore(node)
      }))
      .sort((a, b) => a.score - b.score);
    
    return scored.length > 0 ? scored[0].node : null;
  }

  /**
   * Calculate agent score for load balancing
   */
  private calculateAgentScore(node: AgentNode): number {
    const loadFactor = node.currentLoad / node.maxLoad;
    const performanceFactor = 1 - node.performance.successRate;
    const timeFactor = node.performance.averageExecutionTime / 10000; // Normalize to seconds
    
    // Weighted score (lower is better)
    return (loadFactor * 0.5) + (performanceFactor * 0.3) + (timeFactor * 0.2);
  }

  /**
   * Execute task with monitoring and metrics
   */
  private async executeWithMonitoring(
    node: AgentNode, 
    context: AgentContext, 
    taskId: string,
    options: { timeout?: number; maxRetries?: number } = {}
  ): Promise<AgentResult> {
    const startTime = Date.now();
    node.currentLoad++;
    
    if (node.currentLoad >= node.maxLoad) {
      node.status = 'busy';
    }
    
    try {
      // Set timeout if specified
      const timeoutPromise = options.timeout 
        ? new Promise<AgentResult>((_, reject) => 
            setTimeout(() => reject(new Error('Task timeout')), options.timeout)
          )
        : null;
      
      // Execute task
      const executionPromise = node.agent.execute(context);
      
      const result = timeoutPromise 
        ? await Promise.race([executionPromise, timeoutPromise])
        : await executionPromise;
      
      // Update metrics
      const executionTime = Date.now() - startTime;
      this.updateAgentMetrics(node, true, executionTime);
      
      this.emit('task:completed', {
        taskId,
        agent: node.agent.name,
        duration: executionTime,
        success: result.success
      });
      
      return result;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateAgentMetrics(node, false, executionTime);
      
      // Handle retry logic
      if (options.maxRetries && options.maxRetries > 0) {
        console.log(`Retrying task ${taskId} (${options.maxRetries} retries left)`);
        return await this.executeTask(context, {
          ...options,
          maxRetries: options.maxRetries - 1
        });
      }
      
      this.emit('task:failed', {
        taskId,
        agent: node.agent.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Task execution failed'
      };
      
    } finally {
      node.currentLoad--;
      if (node.status === 'busy' && node.currentLoad < node.maxLoad) {
        node.status = 'active';
      }
    }
  }

  /**
   * Update agent performance metrics
   */
  private updateAgentMetrics(node: AgentNode, success: boolean, executionTime: number) {
    const metrics = node.performance;
    
    metrics.totalExecutions++;
    metrics.lastExecutionTime = executionTime;
    
    if (!success) {
      metrics.errorCount++;
    }
    
    // Update success rate
    metrics.successRate = (metrics.totalExecutions - metrics.errorCount) / metrics.totalExecutions;
    
    // Update average execution time
    metrics.averageExecutionTime = 
      (metrics.averageExecutionTime * (metrics.totalExecutions - 1) + executionTime) / 
      metrics.totalExecutions;
  }

  /**
   * Broadcast a message to all agents in the network
   */
  private async broadcastMessage(message: Partial<NetworkMessage>): Promise<void> {
    const fullMessage: NetworkMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      from: 'network_manager',
      to: 'all',
      type: message.type || 'broadcast',
      payload: message.payload,
      timestamp: new Date()
    };
    
    this.messageQueue.push(fullMessage);
    this.emit('message:broadcast', fullMessage);
  }

  /**
   * Send a message to a specific agent
   */
  async sendMessage(to: string, payload: any, type: NetworkMessage['type'] = 'request'): Promise<void> {
    const message: NetworkMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      from: 'network_manager',
      to,
      type,
      payload,
      timestamp: new Date()
    };
    
    this.messageQueue.push(message);
    this.emit('message:sent', message);
  }

  /**
   * Process queued messages
   */
  private startMessageProcessor() {
    setInterval(() => {
      if (this.messageQueue.length === 0) return;
      
      const message = this.messageQueue.shift();
      if (!message) return;
      
      // Process message based on type
      switch (message.type) {
        case 'health':
          this.handleHealthMessage(message);
          break;
        case 'discovery':
          this.handleDiscoveryMessage(message);
          break;
        default:
          // Handle other message types
          this.emit('message:received', message);
      }
    }, 100);
  }

  /**
   * Handle health check messages
   */
  private handleHealthMessage(message: NetworkMessage) {
    const node = this.nodes.get(message.from);
    if (node) {
      node.lastHealthCheck = new Date();
      if (message.payload.status) {
        node.status = message.payload.status;
      }
    }
  }

  /**
   * Handle discovery messages
   */
  private handleDiscoveryMessage(message: NetworkMessage) {
    console.log(`Discovery message from ${message.from}:`, message.payload);
    this.emit('discovery', message);
  }

  /**
   * Start health monitoring for all agents
   */
  private startHealthMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      const now = Date.now();
      
      for (const [agentName, node] of this.nodes.entries()) {
        const timeSinceLastCheck = now - node.lastHealthCheck.getTime();
        
        // Mark as error if no health check in 60 seconds
        if (timeSinceLastCheck > 60000 && node.status !== 'error') {
          node.status = 'error';
          this.emit('agent:unhealthy', agentName);
          console.warn(`Agent ${agentName} is unhealthy (no health check for ${timeSinceLastCheck}ms)`);
        }
        
        // Try to recover agents in error state
        if (node.status === 'error' && timeSinceLastCheck > 60000) {
          await this.attemptAgentRecovery(agentName);
        }
      }
    }, 5000);
  }

  /**
   * Attempt to recover an agent in error state
   */
  private async attemptAgentRecovery(agentName: string) {
    const node = this.nodes.get(agentName);
    if (!node) return;
    
    try {
      // Try a simple health check
      const testContext: AgentContext = {
        question: 'health_check',
        fid: 'system',
        userTier: 'basic'
      };
      
      const result = await node.agent.execute(testContext);
      
      if (result.success) {
        node.status = 'active';
        node.lastHealthCheck = new Date();
        this.emit('agent:recovered', agentName);
        console.log(`Agent ${agentName} recovered`);
      }
    } catch (error) {
      console.error(`Failed to recover agent ${agentName}:`, error);
    }
  }

  /**
   * Wait for an agent's tasks to complete
   */
  private async waitForAgentTasks(agentName: string, timeout: number = 30000): Promise<void> {
    const node = this.nodes.get(agentName);
    if (!node) return;
    
    const startTime = Date.now();
    
    while (node.currentLoad > 0) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for agent ${agentName} tasks to complete`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Record task routing for audit trail
   */
  private recordTaskRoute(taskId: string, source: string, target: string, reason: string) {
    const route: TaskRoute = {
      taskId,
      sourceAgent: source,
      targetAgent: target,
      reason,
      timestamp: new Date()
    };
    
    if (!this.taskRoutes.has(taskId)) {
      this.taskRoutes.set(taskId, []);
    }
    
    this.taskRoutes.get(taskId)?.push(route);
  }

  /**
   * Sync with the global orchestrator
   */
  private syncWithOrchestrator() {
    // Get existing agents from orchestrator
    const existingAgents = agentOrchestrator.getAvailableAgents();
    
    for (const agent of existingAgents) {
      if (!this.nodes.has(agent.name)) {
        // Add agent to network if not already present
        this.registerAgent(agent, [], 10).catch(error => {
          console.error(`Failed to sync agent ${agent.name}:`, error);
        });
      }
    }
  }

  /**
   * Get network statistics
   */
  getNetworkStats(): {
    totalAgents: number;
    activeAgents: number;
    totalLoad: number;
    totalCapacity: number;
    averageSuccessRate: number;
    messageQueueSize: number;
  } {
    let activeAgents = 0;
    let totalLoad = 0;
    let totalCapacity = 0;
    let totalSuccessRate = 0;
    
    for (const node of this.nodes.values()) {
      if (node.status === 'active' || node.status === 'busy') {
        activeAgents++;
      }
      totalLoad += node.currentLoad;
      totalCapacity += node.maxLoad;
      totalSuccessRate += node.performance.successRate;
    }
    
    return {
      totalAgents: this.nodes.size,
      activeAgents,
      totalLoad,
      totalCapacity,
      averageSuccessRate: this.nodes.size > 0 ? totalSuccessRate / this.nodes.size : 0,
      messageQueueSize: this.messageQueue.length
    };
  }

  /**
   * Get agent-specific statistics
   */
  getAgentStats(agentName: string): AgentNode | null {
    return this.nodes.get(agentName) || null;
  }

  /**
   * Get task routing history
   */
  getTaskRoutes(taskId: string): TaskRoute[] {
    return this.taskRoutes.get(taskId) || [];
  }

  /**
   * Enable or disable load balancing
   */
  setLoadBalancing(enabled: boolean) {
    this.loadBalancerEnabled = enabled;
    console.log(`Load balancing ${enabled ? 'enabled' : 'disabled'} for network ${this.networkId}`);
  }

  /**
   * Shutdown the network
   */
  async shutdown(): Promise<void> {
    console.log(`Shutting down Agent Network: ${this.networkId}`);
    
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Unregister all agents
    for (const agentName of this.nodes.keys()) {
      await this.unregisterAgent(agentName);
    }
    
    // Clear message queue
    this.messageQueue = [];
    
    // Clear task routes
    this.taskRoutes.clear();
    
    this.emit('network:shutdown');
  }
}

// Factory function to create network instances
export function createAgentNetwork(networkId?: string): AgentNetworkManager {
  return new AgentNetworkManager(networkId);
}

// Global default network instance
export const defaultAgentNetwork = new AgentNetworkManager('default');