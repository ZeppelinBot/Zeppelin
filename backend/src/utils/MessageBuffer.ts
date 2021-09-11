import { StrictMessageContent } from "../utils";
import Timeout = NodeJS.Timeout;

type ConsumeFn = (part: StrictMessageContent) => void;

type ContentType = "mixed" | "plain" | "embeds";

export type MessageBufferContent = Pick<StrictMessageContent, "content" | "embeds">;

type Chunk = {
  type: ContentType;
  content: MessageBufferContent;
};

export interface MessageBufferOpts {
  consume?: ConsumeFn;
  timeout?: number;
}

const MAX_CHARS_PER_MESSAGE = 2000;
const MAX_EMBEDS_PER_MESSAGE = 10;

/**
 * Allows buffering and automatic partitioning of message contents. Useful for e.g. high volume log channels, message chunking, etc.
 */
export class MessageBuffer {
  protected autoConsumeFn: ConsumeFn | null = null;

  protected timeoutMs: number | null = null;

  protected chunk: Chunk | null = null;

  protected chunkTimeout: Timeout | null = null;

  protected finalizedChunks: MessageBufferContent[] = [];

  constructor(opts: MessageBufferOpts = {}) {
    if (opts.consume) {
      this.autoConsumeFn = opts.consume;
    }

    if (opts.timeout) {
      this.timeoutMs = opts.timeout;
    }
  }

  push(content: MessageBufferContent): void {
    let contentType: ContentType;
    if (content.content && !content.embeds?.length) {
      contentType = "plain";
    } else if (content.embeds?.length && !content.content) {
      contentType = "embeds";
    } else {
      contentType = "mixed";
    }

    // Plain text can't be merged with mixed or embeds
    if (contentType === "plain" && this.chunk && this.chunk.type !== "plain") {
      this.startNewChunk(contentType);
    }
    // Mixed can't be merged at all
    if (contentType === "mixed" && this.chunk) {
      this.startNewChunk(contentType);
    }

    if (!this.chunk) this.startNewChunk(contentType);
    const chunk = this.chunk!;

    if (content.content) {
      if (chunk.content.content && chunk.content.content.length + content.content.length > MAX_CHARS_PER_MESSAGE) {
        this.startNewChunk(contentType);
      }

      if (chunk.content.content == null) chunk.content.content = "";
      chunk.content.content += content.content;
    }

    if (content.embeds) {
      if (chunk.content.embeds && chunk.content.embeds.length + content.embeds.length > MAX_EMBEDS_PER_MESSAGE) {
        this.startNewChunk(contentType);
      }

      if (chunk.content.embeds == null) chunk.content.embeds = [];
      chunk.content.embeds.push(...content.embeds);
    }
  }

  protected startNewChunk(type: ContentType): void {
    if (this.chunk) {
      this.finalizeChunk();
    }
    this.chunk = {
      type,
      content: {},
    };
    if (this.timeoutMs) {
      this.chunkTimeout = setTimeout(() => this.finalizeChunk(), this.timeoutMs);
    }
  }

  protected finalizeChunk(): void {
    if (!this.chunk) return;
    const chunk = this.chunk;
    this.chunk = null;

    if (this.chunkTimeout) {
      clearTimeout(this.chunkTimeout);
      this.chunkTimeout = null;
    }

    // Discard empty chunks
    if (!chunk.content.content && !chunk.content.embeds?.length) return;

    if (this.autoConsumeFn) {
      this.autoConsumeFn(chunk.content);
      return;
    }

    this.finalizedChunks.push(chunk.content);
  }

  consume(): StrictMessageContent[] {
    return Array.from(this.finalizedChunks);
    this.finalizedChunks = [];
  }

  finalizeAndConsume(): StrictMessageContent[] {
    this.finalizeChunk();
    return this.consume();
  }
}
