import type { Content } from './index';

export const PROJECT_ID: string;
export const DATASET: string;
export const CONTENT_API: string;
export const CONTENT_QUERY: string;
export function shapeContent(result: unknown, pulledAt?: string): Content;
export function fetchContent(init?: RequestInit): Promise<Content>;
