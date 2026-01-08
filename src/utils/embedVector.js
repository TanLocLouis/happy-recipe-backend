import { pipeline } from '@xenova/transformers';

// Function to generate an embedding using Hugging Face API
// This is an async function that will use the 'feature-extraction' pipeline from the 'Xenova/paraphrase-multilingual-MiniLM-L12-v2' model
export async function extractFeatures(text) {
    try {
        // Create the extractor pipeline with the 'Xenova/paraphrase-multilingual-MiniLM-L12-v2' model
        const extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
        
        // Run the extractor on a list of input sentences with additional options
        const response = await extractor(
            [text],
            { pooling: 'mean', normalize: true }
        );

        // Return the embedding vector
        return Array.from(response.data);
    } catch (error) {
        console.error('Error during feature extraction:', error);
    }
}

// Cosine similarity function
export function cosineSimilarity(vec1, vec2) {
  const dotProduct = vec1.reduce((sum, val, i) => sum + (val * vec2[i]), 0);
  const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + (val * val), 0));
  const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + (val * val), 0));
  return dotProduct / (magnitude1 * magnitude2);
}

