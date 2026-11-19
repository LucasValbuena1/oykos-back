import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export const DEFAULT_MODEL = 'claude-sonnet-5-5';

/** Envoltura delgada sobre el SDK de Anthropic: pide una respuesta estructurada con una herramienta. */
@Injectable()
export class ClaudeClient {
  private readonly logger = new Logger(ClaudeClient.name);
  private client?: Anthropic;

  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return !!this.config.get<string>('ANTHROPIC_API_KEY');
  }

  /** Llama a Claude obligándolo a responder con la herramienta `tool`, y devuelve su input. */
  async structured<T>(params: {
    system: string;
    content: Anthropic.MessageParam['content'];
    tool: {
      name: string;
      description: string;
      input_schema: Anthropic.Tool['input_schema'];
    };
    maxTokens?: number;
  }): Promise<T> {
    this.client ??= new Anthropic({
      apiKey: this.config.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
    const res = await this.client.messages.create({
      model: this.config.get<string>('ANTHROPIC_MODEL') || DEFAULT_MODEL,
      max_tokens: params.maxTokens ?? 1024,
      system: params.system,
      tools: [params.tool],
      tool_choice: { type: 'tool', name: params.tool.name },
      messages: [{ role: 'user', content: params.content }],
    });
    const block = res.content.find((b) => b.type === 'tool_use');
    if (!block || block.type !== 'tool_use') {
      this.logger.warn('Claude no devolvió la herramienta esperada');
      throw new Error('no tool_use');
    }
    return block.input as T;
  }
}
