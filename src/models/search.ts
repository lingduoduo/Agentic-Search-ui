export interface SourceDocumentView {
  id: string;
  citation: string;
  title: string;
  content: string;
  url: string | null;
  score: number;
  metadata: Record<string, unknown>;
}

export interface SendSearchMessageBody {
  search_query: string;
  num_hits?: number;
}

// Mirrors SearchDocWithContent in
// src/internal/servers/query_and_chat/models.py — no document_id field.
export interface SearchDocView {
  title: string | null;
  url: string | null;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

// Mirrors SearchFullResponse in
// src/internal/servers/query_and_chat/models.py.
export interface SearchFullResponse {
  all_executed_queries: string[];
  search_docs: SearchDocView[];
  llm_selected_doc_ids?: string[] | null;
  error?: string | null;
}

// Mirrors the GET /api/search-domains payload in
// src/internal/servers/web/app.py. Order is the registry's order.
export interface SearchDomainOption {
  name: string;
  description: string;
  // Descriptive source families, not a list of integrated providers.
  typical_sources?: string[];
  // Hosts a category's restricted web search runs against; empty for suffix-only categories.
  source_sites?: string[];
  // The family it is grouped under (a SearchDomainFamily key); empty for "web".
  category?: string;
  // Seeded public-data tools that answer inside this category, e.g. "search_arxiv".
  tools?: string[];
}

// One entry of the payload's `categories`: the families, in display order.
export interface SearchDomainFamily {
  category: string;
  name: string;
}

export type SearchSourceProvider = "auto" | "retrieval" | "google" | "serpapi" | "browser" | "all";
