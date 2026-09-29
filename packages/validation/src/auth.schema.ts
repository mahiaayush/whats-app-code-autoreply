import { z } from 'zod';

export const LoginRequestSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginRequestDto = z.infer<typeof LoginRequestSchema>;

export const ExtensionAuthHeaderSchema = z.object({
  'x-extension-key': z.string().min(1, 'Extension API key is required'),
});

export type ExtensionAuthHeaderDto = z.infer<typeof ExtensionAuthHeaderSchema>;
