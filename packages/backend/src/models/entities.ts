import { z } from 'zod';

/**
 * Data object models and Zod schemas representing database entities
 * All schemas use snake_case for consistency between API and database
 */

export const UserDatabaseInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  created_at: z.coerce.date()
});

export type UserDatabaseInfo = z.infer<typeof UserDatabaseInfoSchema>;

export const PageSchema = z.object({
  id: z.string(),
  title: z.string().max(255),
  created_at: z.coerce.date()
});

export type Page = z.infer<typeof PageSchema>;

export const BlockSchema = z.object({
  id: z.string(),
  content: z.string(),
  position: z.number(),
  type: z.string(),
  page_id: z.string().nullable(),
  parent_block_id: z.string().nullable(),
  created_at: z.coerce.date()
}).refine(
  (data) => {
    // Either page_id or parent_block_id should be specified, but not both
    const hasPageId = data.page_id !== null;
    const hasParentBlockId = data.parent_block_id !== null;

    return (hasPageId && !hasParentBlockId) || (!hasPageId && hasParentBlockId);
  },
  {
    message: "A block must be associated with either a page_id or a parent_block_id, but not both.",
    path: ["page_id", "parent_block_id"] // This sets the field name for the error
  }
);

export type Block = z.infer<typeof BlockSchema>;

export const WorkspaceSchema = z.object({
  id: z.number(),
  name: z.string().max(255),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format')
});

export type Workspace = z.infer<typeof WorkspaceSchema>;
