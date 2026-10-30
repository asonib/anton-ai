import { env } from './env';

/**
 * "Top AI repos" panel (top right of the chat screen): the 10 most-starred public AI projects on GitHub.
 *
 * Each category is the union of a few GitHub topics. `AiRepoService` runs one search per topic
 * (`topic:<t> archived:false`, sorted by stars), caches every topic separately, merges + de-duplicates
 * the results and keeps the top `count`. Because every topic query is itself sorted by stars, the merged
 * top 10 is the true top 10 of the union (as long as `perTopic` comfortably exceeds `count` after
 * exclusions). Categories share topics, so switching tabs mostly hits the cache.
 *
 * Unauthenticated GitHub search allows 10 requests/minute — keep the number of distinct topics small,
 * or set GITHUB_TOKEN.
 */

export interface AiRepoCategory {
  /** kebab-case id sent as `?category=` */
  id: string;
  name: string;
  /** GitHub topics OR-ed together (one search request each). */
  topics: readonly string[];
}

export const AI_REPO_CATEGORIES: readonly AiRepoCategory[] = [
  { id: 'all', name: 'All AI', topics: ['artificial-intelligence', 'ai', 'machine-learning', 'deep-learning', 'llm'] },
  { id: 'llm', name: 'LLMs', topics: ['llm', 'large-language-models'] },
  { id: 'agents', name: 'Agents', topics: ['ai-agents', 'ai-agent'] },
  { id: 'ml', name: 'ML frameworks', topics: ['machine-learning', 'deep-learning'] },
];

export const DEFAULT_AI_REPO_CATEGORY = 'all';

/**
 * Repos that are reading lists / courses rather than projects. Matched against `name` and `description`.
 * GitHub's top-starred AI repos include many "awesome" lists, which aren't what the panel is for.
 */
export const AI_REPO_EXCLUDE_PATTERNS: readonly RegExp[] = [/^awesome[-_]?/i, /\bcurated list\b/i, /\bawesome list\b/i];

/**
 * Shown only when GitHub can't be reached and nothing is cached (offline, rate limited, blocked proxy).
 * Star counts are unknown here on purpose — they would go stale — so `stars` is null and the UI says
 * the list is a snapshot.
 */
export interface FallbackAiRepo {
  fullName: string;
  description: string;
  language: string | null;
  categories: readonly string[];
}

export const FALLBACK_AI_REPOS: readonly FallbackAiRepo[] = [
  { fullName: 'tensorflow/tensorflow', description: 'An open source machine learning framework for everyone.', language: 'C++', categories: ['all', 'ml'] },
  { fullName: 'huggingface/transformers', description: 'State-of-the-art pretrained models for text, vision, audio and multimodal tasks.', language: 'Python', categories: ['all', 'llm', 'ml'] },
  { fullName: 'pytorch/pytorch', description: 'Tensors and dynamic neural networks in Python with strong GPU acceleration.', language: 'Python', categories: ['all', 'ml'] },
  { fullName: 'ollama/ollama', description: 'Get up and running with large language models locally.', language: 'Go', categories: ['all', 'llm'] },
  { fullName: 'langchain-ai/langchain', description: 'Build context-aware reasoning applications and agents.', language: 'Python', categories: ['all', 'llm', 'agents'] },
  { fullName: 'Significant-Gravitas/AutoGPT', description: 'A platform for building, deploying and running autonomous AI agents.', language: 'Python', categories: ['all', 'agents'] },
  { fullName: 'AUTOMATIC1111/stable-diffusion-webui', description: 'Stable Diffusion web UI.', language: 'Python', categories: ['all'] },
  { fullName: 'ggml-org/llama.cpp', description: 'LLM inference in C/C++.', language: 'C++', categories: ['all', 'llm'] },
  { fullName: 'open-webui/open-webui', description: 'User-friendly AI interface (supports Ollama, OpenAI API, …).', language: 'JavaScript', categories: ['all', 'llm'] },
  { fullName: 'langgenius/dify', description: 'Open-source platform for building LLM apps and agentic workflows.', language: 'TypeScript', categories: ['all', 'llm', 'agents'] },
  { fullName: 'vllm-project/vllm', description: 'A high-throughput and memory-efficient inference and serving engine for LLMs.', language: 'Python', categories: ['llm'] },
  { fullName: 'microsoft/autogen', description: 'A programming framework for agentic AI.', language: 'Python', categories: ['agents'] },
  { fullName: 'crewAIInc/crewAI', description: 'Framework for orchestrating role-playing, autonomous AI agents.', language: 'Python', categories: ['agents'] },
  { fullName: 'browser-use/browser-use', description: 'Make websites accessible for AI agents.', language: 'Python', categories: ['agents'] },
  { fullName: 'run-llama/llama_index', description: 'The leading framework for building LLM-powered agents over your data.', language: 'Python', categories: ['llm', 'agents'] },
  { fullName: 'keras-team/keras', description: 'Deep learning for humans.', language: 'Python', categories: ['ml'] },
  { fullName: 'scikit-learn/scikit-learn', description: 'Machine learning in Python.', language: 'Python', categories: ['ml'] },
  { fullName: 'jax-ml/jax', description: 'Composable transformations of Python+NumPy programs.', language: 'Python', categories: ['ml'] },
  { fullName: 'microsoft/DeepSpeed', description: 'Deep learning optimization library for distributed training and inference.', language: 'Python', categories: ['ml'] },
  { fullName: 'Lightning-AI/pytorch-lightning', description: 'Pretrain, finetune and deploy AI models on multiple GPUs and TPUs.', language: 'Python', categories: ['ml'] },
  { fullName: 'microsoft/semantic-kernel', description: 'Integrate cutting-edge LLM technology quickly and easily into your apps.', language: 'C#', categories: ['agents'] },
  { fullName: 'openai/openai-agents-python', description: 'A lightweight framework for multi-agent workflows.', language: 'Python', categories: ['agents'] },
  { fullName: 'mlc-ai/mlc-llm', description: 'Universal LLM deployment engine with ML compilation.', language: 'Python', categories: ['llm'] },
];

export const aiRepoSettings = Object.freeze({
  apiUrl: env.GITHUB_API_URL.replace(/\/+$/, ''),
  token: env.GITHUB_TOKEN,
  cacheTtlMs: env.AI_REPOS_CACHE_TTL_MS,
  timeoutMs: env.AI_REPOS_TIMEOUT_MS,
  /** Repos returned per category. */
  count: 10,
  /** Results requested per topic (headroom for exclusions + de-duplication). Max 100. */
  perTopic: 30,
  /** Topics shown per repo card. */
  maxTopics: 6,
  userAgent: 'anton-ai',
});

export type AiRepoSettings = typeof aiRepoSettings;
