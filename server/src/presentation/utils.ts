import z from "zod";

// Helper para adicionar exemplos aos schemas Zod
export function withExamples<T extends z.ZodType<any>>(
  zodSchema: T,
  examples: any[]
) {
  const schemaWithExamples = zodSchema as T & { _examples?: any[] };
  (schemaWithExamples as any)._examples = examples;
  return schemaWithExamples;
}
