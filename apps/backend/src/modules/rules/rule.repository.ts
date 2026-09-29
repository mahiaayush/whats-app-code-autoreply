import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../database/prisma.client.js';
import type { IntentType, LanguageCode } from '@property-ai/shared-types';

export interface ShortcutRecord {
  id: string;
  command: string;
  name: string;
  description: string;
  targetIntent: IntentType;
  naturalLanguagePhrases: string[];
  responseTemplate: string | null;
  enabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateRecord {
  id: string;
  slug: string;
  name: string;
  intent: IntentType;
  language: LanguageCode;
  templateText: string;
  requiredPlaceholders: string[];
  isActive: boolean;
  version: number;
}

export class RuleRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrismaClient();
  }

  /**
   * Get all active shortcuts sorted by priority ascending (highest priority first)
   */
  async getActiveShortcuts(): Promise<ShortcutRecord[]> {
    const list = await this.prisma.shortcut.findMany({
      where: { enabled: true },
      orderBy: { priority: 'asc' },
    });
    return list as ShortcutRecord[];
  }

  /**
   * Get all shortcuts with optional filtering
   */
  async findAllShortcuts(options?: { enabledOnly?: boolean }): Promise<ShortcutRecord[]> {
    const where = options?.enabledOnly ? { enabled: true } : {};
    const list = await this.prisma.shortcut.findMany({
      where,
      orderBy: { priority: 'asc' },
    });
    return list as ShortcutRecord[];
  }

  /**
   * Find a shortcut by exact command (e.g. "/price")
   */
  async findByCommand(command: string): Promise<ShortcutRecord | null> {
    const formatted = command.startsWith('/') ? command.toLowerCase() : `/${command.toLowerCase()}`;
    const shortcut = await this.prisma.shortcut.findUnique({
      where: { command: formatted },
    });
    return shortcut as ShortcutRecord | null;
  }

  /**
   * Find a shortcut by UUID
   */
  async findById(id: string): Promise<ShortcutRecord | null> {
    const shortcut = await this.prisma.shortcut.findUnique({
      where: { id },
    });
    return shortcut as ShortcutRecord | null;
  }

  /**
   * Create a new shortcut rule
   */
  async createShortcut(data: {
    command: string;
    name: string;
    description: string;
    targetIntent: string;
    naturalLanguagePhrases?: string[];
    responseTemplate?: string;
    enabled?: boolean;
    priority?: number;
  }): Promise<ShortcutRecord> {
    const formatted = data.command.startsWith('/')
      ? data.command.toLowerCase()
      : `/${data.command.toLowerCase()}`;

    const created = await this.prisma.shortcut.create({
      data: {
        command: formatted,
        name: data.name,
        description: data.description,
        targetIntent: data.targetIntent,
        naturalLanguagePhrases: data.naturalLanguagePhrases || [],
        responseTemplate: data.responseTemplate,
        enabled: data.enabled ?? true,
        priority: data.priority ?? 100,
      },
    });
    return created as ShortcutRecord;
  }

  /**
   * Update an existing shortcut
   */
  async updateShortcut(
    id: string,
    data: {
      name?: string;
      description?: string;
      targetIntent?: string;
      naturalLanguagePhrases?: string[];
      responseTemplate?: string | null;
      enabled?: boolean;
      priority?: number;
    },
  ): Promise<ShortcutRecord> {
    const updated = await this.prisma.shortcut.update({
      where: { id },
      data,
    });
    return updated as ShortcutRecord;
  }

  /**
   * Delete a shortcut by ID
   */
  async deleteShortcut(id: string): Promise<boolean> {
    await this.prisma.shortcut.delete({
      where: { id },
    });
    return true;
  }

  /**
   * Find multilingual response template for an intent and language
   */
  async findTemplate(intent: string, language: string): Promise<TemplateRecord | null> {
    const template = await this.prisma.template.findFirst({
      where: {
        intent,
        language,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });
    return template as TemplateRecord | null;
  }

  /**
   * Find template by slug
   */
  async findTemplateBySlug(slug: string): Promise<TemplateRecord | null> {
    const template = await this.prisma.template.findUnique({
      where: { slug },
    });
    return template as TemplateRecord | null;
  }
}
