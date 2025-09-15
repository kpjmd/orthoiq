import { Agent, AgentContext, AgentResult, AgentTask, AgentEnrichment } from './types';
import { createAgentTask, updateAgentTask, getAgentTask } from './database';

export class AgentOrchestrator {
  private agents: Map<string, Agent> = new Map();
  private taskQueue: AgentTask[] = [];
  private isProcessing = false;

  constructor() {
    this.startTaskProcessor();
  }

  /**
   * Register an agent with the orchestrator
   */
  registerAgent(agent: Agent) {
    this.agents.set(agent.name, agent);
    console.log(`Agent registered: ${agent.name}`);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentName: string) {
    this.agents.delete(agentName);
    console.log(`Agent unregistered: ${agentName}`);
  }

  /**
   * Get all available agents
   */
  getAvailableAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Find agents that can handle a given context
   */
  findCapableAgents(context: AgentContext): Agent[] {
    return this.getAvailableAgents().filter(agent => agent.canHandle(context));
  }

  /**
   * Execute agents synchronously and return enriched response
   */
  async executeAgents(context: AgentContext, requestedAgents?: string[]): Promise<{
    originalContext: AgentContext;
    enrichments: AgentEnrichment[];
    totalCost: number;
    errors: string[];
  }> {
    const enrichments: AgentEnrichment[] = [];
    let totalCost = 0;
    const errors: string[] = [];

    // Determine which agents to run
    let agentsToRun: Agent[];
    if (requestedAgents && requestedAgents.length > 0) {
      agentsToRun = requestedAgents
        .map(name => this.agents.get(name))
        .filter((agent): agent is Agent => agent !== undefined);
    } else {
      agentsToRun = this.findCapableAgents(context);
    }

    console.log(`Running ${agentsToRun.length} agents for question: ${context.question.substring(0, 50)}...`);

    // Execute each agent
    for (const agent of agentsToRun) {
      try {
        console.log(`Executing agent: ${agent.name}`);
        const result = await agent.execute(context);
        
        if (result.success && result.enrichments) {
          enrichments.push(...result.enrichments);
        }
        
        if (result.cost) {
          totalCost += result.cost;
        }
        
        if (!result.success && result.error) {
          errors.push(`${agent.name}: ${result.error}`);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${agent.name}: ${errorMessage}`);
        console.error(`Agent ${agent.name} failed:`, error);
      }
    }

    return {
      originalContext: context,
      enrichments,
      totalCost,
      errors
    };
  }

  /**
   * Queue an agent task for background processing
   */
  async queueAgentTask(agentName: string, context: AgentContext): Promise<string> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new Error(`Agent not found: ${agentName}`);
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const task: AgentTask = {
      id: taskId,
      agentName,
      context,
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0
    };

    // Save to database
    await createAgentTask(task);
    
    // Add to in-memory queue
    this.taskQueue.push(task);
    
    console.log(`Queued task ${taskId} for agent ${agentName}`);
    
    return taskId;
  }

  /**
   * Get the status and result of a queued task
   */
  async getTaskStatus(taskId: string): Promise<AgentTask | null> {
    return await getAgentTask(taskId);
  }

  /**
   * Background task processor
   */
  private startTaskProcessor() {
    setInterval(async () => {
      if (this.isProcessing || this.taskQueue.length === 0) {
        return;
      }

      this.isProcessing = true;
      
      try {
        const task = this.taskQueue.shift();
        if (!task) {
          this.isProcessing = false;
          return;
        }

        await this.processTask(task);
      } catch (error) {
        console.error('Task processor error:', error);
      }
      
      this.isProcessing = false;
    }, 1000); // Check every second
  }

  /**
   * Process a single task
   */
  private async processTask(task: AgentTask) {
    const agent = this.agents.get(task.agentName);
    if (!agent) {
      console.error(`Agent not found for task: ${task.agentName}`);
      task.status = 'failed';
      task.result = { success: false, error: 'Agent not found' };
      await updateAgentTask(task);
      return;
    }

    try {
      console.log(`Processing task ${task.id} with agent ${task.agentName}`);
      
      task.status = 'running';
      task.startedAt = new Date();
      await updateAgentTask(task);

      const result = await agent.execute(task.context);
      
      task.status = result.success ? 'completed' : 'failed';
      task.result = result;
      task.completedAt = new Date();
      await updateAgentTask(task);
      
      console.log(`Task ${task.id} ${task.status}`);
      
    } catch (error) {
      console.error(`Task ${task.id} failed:`, error);
      
      task.retryCount += 1;
      
      if (task.retryCount < 3) {
        // Retry the task
        task.status = 'pending';
        this.taskQueue.push(task);
      } else {
        // Max retries reached
        task.status = 'failed';
        task.result = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
        task.completedAt = new Date();
      }
      
      await updateAgentTask(task);
    }
  }

  /**
   * Estimate total cost for running agents on a context
   */
  estimateCost(context: AgentContext, requestedAgents?: string[]): number {
    let agentsToEstimate: Agent[];
    
    if (requestedAgents && requestedAgents.length > 0) {
      agentsToEstimate = requestedAgents
        .map(name => this.agents.get(name))
        .filter((agent): agent is Agent => agent !== undefined);
    } else {
      agentsToEstimate = this.findCapableAgents(context);
    }

    return agentsToEstimate.reduce((total, agent) => {
      return total + agent.estimateCost(context);
    }, 0);
  }

  /**
   * Get agent performance statistics
   */
  async getAgentStats(agentName: string): Promise<{
    totalTasks: number;
    successRate: number;
    averageExecutionTime: number;
    totalCost: number;
  }> {
    // This would query the database for historical task data
    // For now, return placeholder data
    return {
      totalTasks: 0,
      successRate: 0,
      averageExecutionTime: 0,
      totalCost: 0
    };
  }

  /**
   * Clear completed tasks from memory queue
   * (Database tasks remain for audit trail)
   */
  clearCompletedTasks() {
    const initialLength = this.taskQueue.length;
    this.taskQueue = this.taskQueue.filter(task => 
      task.status === 'pending' || task.status === 'running'
    );
    console.log(`Cleared ${initialLength - this.taskQueue.length} completed tasks from memory`);
  }
}

// Global instance
export const agentOrchestrator = new AgentOrchestrator();