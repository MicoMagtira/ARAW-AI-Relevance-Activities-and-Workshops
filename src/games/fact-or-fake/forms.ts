// Tiny and content-free on purpose: the route entry imports it without pulling in any item bank.
export const isFormId = (v: string): v is 'form_A' | 'form_B' => v === 'form_A' || v === 'form_B';
