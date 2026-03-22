// MedAxis Africa — CNIE Hashing Utility
// Uses the Web Crypto API (available in all modern browsers and Vite/Node).
// The same SHA-256 logic must be used consistently on the frontend whenever
// a raw CNIE needs to be converted to a hash for API lookups.

export const hashCNIE = async (cnie) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(cnie.toUpperCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};
